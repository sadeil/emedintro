/* =============================================================================
   eMED — behaviour
   Vanilla JS, no dependencies, no build step. Classic script so the page also
   works when opened straight from the filesystem.

   Everything here degrades: with JS disabled the page still renders, reads and
   navigates. Only the enhancements (language switch, suggestions, tabs) go.
   ============================================================================= */
(function () {
  'use strict';

  var DICT = window.EMED_I18N || { ar: {}, en: {}, suggestions: { ar: [], en: [] } };
  var STORE_LANG = 'emed:lang';
  var STORE_RECENT = 'emed:recent';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  function safeGet(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function safeSet(key, val) { try { localStorage.setItem(key, val); } catch (e) { /* private mode */ } }

  /* =========================================================== language ==== */
  var lang = 'ar';

  function t(key) {
    var table = DICT[lang] || {};
    return Object.prototype.hasOwnProperty.call(table, key) ? table[key] : key;
  }

  function applyI18n(root) {
    var scope = root || document;

    $$('[data-i18n]', scope).forEach(function (el) {
      var val = t(el.getAttribute('data-i18n'));
      if (el.hasAttribute('data-year')) val = val.replace('{year}', new Date().getFullYear());
      el.textContent = val;
    });

    $$('[data-i18n-html]', scope).forEach(function (el) {
      el.innerHTML = t(el.getAttribute('data-i18n-html'));
    });

    $$('[data-i18n-attr]', scope).forEach(function (el) {
      el.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
        var bits = pair.split(':');
        if (bits.length === 2) el.setAttribute(bits[0].trim(), t(bits[1].trim()));
      });
    });
  }

  function setLanguage(next, options) {
    var opts = options || {};
    lang = next === 'en' ? 'en' : 'ar';

    var html = document.documentElement;
    html.setAttribute('lang', lang);
    html.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');

    document.title = t('meta.title');
    var desc = $('meta[name="description"]');
    if (desc) desc.setAttribute('content', t('meta.description'));
    var ogT = $('meta[property="og:title"]');
    if (ogT) ogT.setAttribute('content', t('meta.title'));
    var ogD = $('meta[property="og:description"]');
    if (ogD) ogD.setAttribute('content', t('meta.description'));
    var ogL = $('meta[property="og:locale"]');
    if (ogL) ogL.setAttribute('content', lang === 'ar' ? 'ar_AR' : 'en_US');

    applyI18n();
    document.dispatchEvent(new CustomEvent('emed:langchange', { detail: { lang: lang } }));

    if (!opts.silent) {
      safeSet(STORE_LANG, lang);
      try {
        var url = new URL(window.location.href);
        if (lang === 'en') url.searchParams.set('lang', 'en');
        else url.searchParams.delete('lang');
        window.history.replaceState({}, '', url.toString());
      } catch (e) { /* file:// has no manipulable URL — harmless */ }
    }
  }

  function initLanguage() {
    var initial = 'ar';
    try {
      var param = new URL(window.location.href).searchParams.get('lang');
      if (param === 'en' || param === 'ar') initial = param;
      else if (safeGet(STORE_LANG)) initial = safeGet(STORE_LANG);
    } catch (e) {
      if (safeGet(STORE_LANG)) initial = safeGet(STORE_LANG);
    }
    setLanguage(initial, { silent: true });

    $$('#langToggle, [data-lang-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setLanguage(lang === 'ar' ? 'en' : 'ar');
      });
    });
  }

  /* ============================================================= header ==== */
  function initHeader() {
    var header = $('#siteHeader');
    if (!header) return;

    var stuck = false;
    var ticking = false;

    function paintScroll() {
      ticking = false;
      var y = window.scrollY;

      var next = y > 8;
      if (next !== stuck) {
        stuck = next;
        header.classList.toggle('is-stuck', stuck);
      }

      var max = document.documentElement.scrollHeight - window.innerHeight;
      header.style.setProperty('--progress', max > 0 ? Math.min(1, y / max).toFixed(4) : '0');
    }
    var onScroll = function () {
      if (!ticking) { ticking = true; requestAnimationFrame(paintScroll); }
    };
    paintScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    /* highlight the section currently in view */
    var links = $$('.nav__link[data-nav]');
    if (!links.length || !('IntersectionObserver' in window)) return;

    var byId = {};
    links.forEach(function (l) { byId[l.getAttribute('data-nav')] = l; });

    var targets = Object.keys(byId)
      .map(function (id) { return document.getElementById(id); })
      .filter(Boolean);

    var visible = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { visible[e.target.id] = e.isIntersecting ? e.intersectionRatio : 0; });
      var best = null, bestRatio = 0;
      Object.keys(visible).forEach(function (id) {
        if (visible[id] > bestRatio) { bestRatio = visible[id]; best = id; }
      });
      links.forEach(function (l) {
        var on = best !== null && l.getAttribute('data-nav') === best;
        l.classList.toggle('is-active', on);
        if (on) l.setAttribute('aria-current', 'true');
        else l.removeAttribute('aria-current');
      });
      moveIndicator();
    }, { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.25, 0.5, 1] });

    targets.forEach(function (el) { io.observe(el); });

    /* ---- one indicator slides between items instead of six underlines ---- */
    var nav = $('#primaryNav');
    var indicator = $('.nav__indicator', nav);
    if (!indicator) return;
    nav.classList.add('nav--indicator');

    var hovered = null;

    function moveIndicator() {
      var target = hovered || $('.nav__link.is-active', nav);
      if (!target || !nav.offsetParent) { nav.style.setProperty('--nav-o', '0'); return; }
      nav.style.setProperty('--nav-x', target.offsetLeft + 'px');
      nav.style.setProperty('--nav-w', target.offsetWidth + 'px');
      nav.style.setProperty('--nav-o', '1');
    }

    links.forEach(function (l) {
      l.addEventListener('pointerenter', function () { hovered = l; moveIndicator(); });
      l.addEventListener('focus', function () { hovered = l; moveIndicator(); });
    });
    nav.addEventListener('pointerleave', function () { hovered = null; moveIndicator(); });
    nav.addEventListener('focusout', function () { hovered = null; moveIndicator(); });
    window.addEventListener('resize', moveIndicator, { passive: true });
    document.addEventListener('emed:langchange', function () {
      /* labels change width, so re-measure after the reflow */
      requestAnimationFrame(moveIndicator);
    });
    requestAnimationFrame(moveIndicator);
  }

  /* ====================================================== mobile drawer ==== */
  function initDrawer() {
    var toggle = $('#navToggle');
    var closeBtn = $('#navClose');
    var drawer = $('#navDrawer');
    var scrim = $('#navScrim');
    if (!toggle || !drawer || !scrim) return;

    var lastFocused = null;
    var isOpen = false;

    function focusables() {
      return $$('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])', drawer)
        .filter(function (el) { return el.offsetParent !== null; });
    }

    function open() {
      if (isOpen) return;
      isOpen = true;
      lastFocused = document.activeElement;

      drawer.hidden = false;
      scrim.hidden = false;
      /* next frame so the transition has a start state to animate from */
      requestAnimationFrame(function () {
        drawer.classList.add('is-open');
        scrim.classList.add('is-open');
      });

      toggle.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      var first = focusables()[0];
      if (first) first.focus();
      document.addEventListener('keydown', onKeydown);
    }

    function close() {
      if (!isOpen) return;
      isOpen = false;

      drawer.classList.remove('is-open');
      scrim.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKeydown);

      var finish = function () { drawer.hidden = true; scrim.hidden = true; };
      if (reduceMotion.matches) finish();
      else window.setTimeout(finish, 520);

      if (lastFocused && lastFocused.focus) lastFocused.focus();
    }

    function onKeydown(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return;

      var items = focusables();
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];

      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }

    toggle.addEventListener('click', function () { isOpen ? close() : open(); });
    if (closeBtn) closeBtn.addEventListener('click', close);
    scrim.addEventListener('click', close);
    $$('.nav-drawer__link, .nav-drawer__actions a', drawer).forEach(function (a) {
      a.addEventListener('click', close);
    });

    /* the drawer only exists below 1080px — close it if the viewport grows */
    var wide = window.matchMedia('(min-width: 1081px)');
    var onChange = function (e) { if (e.matches) close(); };
    if (wide.addEventListener) wide.addEventListener('change', onChange);
    else if (wide.addListener) wide.addListener(onChange);
  }

  /* ============================================================= search ==== */
  function initSearch() {
    var form = $('#heroSearch');
    var input = $('#q');
    var locInput = $('#loc');
    var box = $('#suggestBox');
    var list = $('#suggestList');
    var status = $('#searchStatus');
    var geoBtn = $('#geoBtn');
    if (!form || !input || !box || !list) return;

    var activeIndex = -1;
    var items = [];
    var debounce = null;

    function readRecent() {
      try { return JSON.parse(safeGet(STORE_RECENT) || '[]'); } catch (e) { return []; }
    }
    function pushRecent(value) {
      var v = String(value || '').trim();
      if (!v) return;
      var list_ = readRecent().filter(function (x) { return x !== v; });
      list_.unshift(v);
      safeSet(STORE_RECENT, JSON.stringify(list_.slice(0, 4)));
    }

    function closeBox() {
      box.classList.remove('is-open');
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      activeIndex = -1;
    }

    function openBox() {
      box.classList.add('is-open');
      input.setAttribute('aria-expanded', 'true');
    }

    function renderState(html) {
      list.innerHTML = '<li>' + html + '</li>';
      items = [];
      activeIndex = -1;
      openBox();
    }

    function renderLoading() {
      renderState('<div class="suggest__state"><div class="suggest__spinner" aria-hidden="true"></div>' +
        escapeHtml(t('search.loading')) + '</div>');
    }

    function renderEmpty() {
      renderState('<div class="suggest__state">' +
        '<svg class="icon" aria-hidden="true"><use href="#i-search"></use></svg>' +
        '<strong style="display:block;color:var(--text-secondary)">' + escapeHtml(t('search.empty')) + '</strong>' +
        '<span style="font-size:var(--fs-xs)">' + escapeHtml(t('search.emptyHint')) + '</span></div>');
      if (status) status.textContent = t('search.empty');
    }

    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
      });
    }

    function renderResults(results, groupLabel) {
      var html = '<li class="suggest__group" role="presentation">' + escapeHtml(groupLabel) + '</li>';
      results.forEach(function (r, i) {
        html += '<li role="presentation">' +
          '<button class="suggest__item" type="button" role="option" id="sg-' + i + '" aria-selected="false" data-value="' + escapeHtml(r.t) + '">' +
          '<svg class="icon" aria-hidden="true"><use href="#' + escapeHtml(r.i || 'i-search') + '"></use></svg>' +
          '<span class="suggest__title">' + escapeHtml(r.t) + '</span>' +
          '<span class="suggest__meta">' + escapeHtml(r.k || '') + '</span>' +
          '</button></li>';
      });
      list.innerHTML = html;
      items = $$('.suggest__item', list);
      activeIndex = -1;
      openBox();
      if (status) status.textContent = results.length + '';

      items.forEach(function (btn) {
        btn.addEventListener('click', function () { choose(btn.getAttribute('data-value')); });
      });
    }

    function choose(value) {
      input.value = value;
      pushRecent(value);
      closeBox();
      input.focus();
    }

    function suggestionsFor(q) {
      var pool = (DICT.suggestions && DICT.suggestions[lang]) || [];
      var needle = q.trim().toLowerCase();
      if (!needle) return [];
      return pool.filter(function (s) { return s.t.toLowerCase().indexOf(needle) !== -1; }).slice(0, 6);
    }

    function showRecentOrNothing() {
      var recent = readRecent();
      if (!recent.length) { closeBox(); return; }
      renderResults(recent.map(function (r) { return { t: r, k: '', i: 'i-clock' }; }), t('search.recent'));
    }

    /* Debounced so it behaves the same way once a live endpoint is wired in
       (see README: replace suggestionsFor() with the real request). */
    function query() {
      var value = input.value;
      window.clearTimeout(debounce);

      if (!value.trim()) { showRecentOrNothing(); return; }

      renderLoading();
      debounce = window.setTimeout(function () {
        var results = suggestionsFor(value);
        if (results.length) renderResults(results, t('search.suggestions'));
        else renderEmpty();
      }, 170);
    }

    function setActive(next) {
      if (!items.length) return;
      if (activeIndex > -1 && items[activeIndex]) {
        items[activeIndex].classList.remove('is-active');
        items[activeIndex].setAttribute('aria-selected', 'false');
      }
      activeIndex = (next + items.length) % items.length;
      var el = items[activeIndex];
      el.classList.add('is-active');
      el.setAttribute('aria-selected', 'true');
      input.setAttribute('aria-activedescendant', el.id);
      el.scrollIntoView({ block: 'nearest' });
    }

    input.addEventListener('input', query);
    input.addEventListener('focus', function () { if (!input.value.trim()) showRecentOrNothing(); });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); if (!box.classList.contains('is-open')) query(); else setActive(activeIndex + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(activeIndex - 1); }
      else if (e.key === 'Enter') {
        if (activeIndex > -1 && items[activeIndex]) { e.preventDefault(); choose(items[activeIndex].getAttribute('data-value')); }
      } else if (e.key === 'Escape') { closeBox(); }
    });

    document.addEventListener('click', function (e) {
      if (!form.contains(e.target)) closeBox();
    });

    form.addEventListener('submit', function (e) {
      /* No results page exists yet — see README for wiring this to /search. */
      e.preventDefault();
      pushRecent(input.value);
      closeBox();
      if (status) status.textContent = t('search.loading');
    });

    /* location detection */
    if (geoBtn && navigator.geolocation) {
      geoBtn.addEventListener('click', function () {
        geoBtn.classList.add('is-busy');
        if (status) status.textContent = t('search.geoBusy');

        navigator.geolocation.getCurrentPosition(function () {
          geoBtn.classList.remove('is-busy');
          /* A reverse-geocoding service would resolve the area name here. */
          if (locInput) {
            locInput.value = t('search.geoValue');
            locInput.setAttribute('data-geo', 'true');
          }
          if (status) status.textContent = t('search.geoDone');
        }, function () {
          geoBtn.classList.remove('is-busy');
          if (status) status.textContent = t('search.geoFail');
          if (locInput) locInput.focus();
        }, { timeout: 8000, maximumAge: 300000 });
      });
    } else if (geoBtn) {
      geoBtn.hidden = true;
    }

    /* one route into the search field, used by the tile and the "/" key */
    function jumpToSearch() {
      var top = $('#top');
      if (top) top.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
      window.setTimeout(function () {
        input.focus();
        if (reduceMotion.matches) return;
        form.classList.add('is-flash');
        window.setTimeout(function () { form.classList.remove('is-flash'); }, 640);
      }, reduceMotion.matches ? 0 : 500);
    }

    var focusBtn = $('#focusSearch');
    if (focusBtn) focusBtn.addEventListener('click', jumpToSearch);

    document.addEventListener('keydown', function (e) {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      var el = document.activeElement;
      var tag = el && el.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (el && el.isContentEditable)) return;
      if (!$('#navDrawer').hidden) return;
      e.preventDefault();
      jumpToSearch();
    });

    document.addEventListener('emed:langchange', closeBox);
  }

  /* ========================================================== ecosystem ==== */
  function initEcosystem() {
    var orbit = $('[data-eco-orbit]');
    var caption = $('#ecoCaption');
    if (!orbit || !caption) return;

    var nodes = $$('.orbit__node', orbit);
    var legend = $$('[data-eco-legend] .eco-legend__btn');
    var lines = $$('.orbit__links line[data-link]');
    var flow = $('.orbit__flow', orbit);
    var capTitle = $('strong', caption);
    var capText = $('span', caption);
    var current = null;

    function select(key, animate) {
      if (key === current) return;
      current = key;

      nodes.concat(legend).forEach(function (btn) {
        var on = btn.getAttribute('data-eco') === key;
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        btn.classList.toggle('is-active', on);
      });

      var lit = null;
      lines.forEach(function (line) {
        var on = line.getAttribute('data-link') === key;
        if (on) lit = line;
        line.classList.toggle('is-lit', on);
        line.classList.toggle('is-dim', !on);
      });

      /* the travelling signal moves to whichever link is selected */
      if (flow && lit) {
        ['x1', 'y1', 'x2', 'y2'].forEach(function (a) {
          flow.setAttribute(a, lit.getAttribute(a));
        });
      }

      function paint() {
        capTitle.setAttribute('data-i18n', 'cat.' + key);
        capText.setAttribute('data-i18n', 'eco.' + key + 'Cap');
        applyI18n(caption);
      }

      if (animate && !reduceMotion.matches) {
        caption.classList.add('is-swapping');
        window.setTimeout(function () {
          paint();
          caption.classList.remove('is-swapping');
        }, 170);
      } else {
        paint();
      }
    }

    nodes.concat(legend).forEach(function (btn) {
      btn.addEventListener('click', function () { select(btn.getAttribute('data-eco'), true); });
    });

    select('doctor', false);

    /* the connections draw themselves the first time the section is reached */
    if ('IntersectionObserver' in window && !reduceMotion.matches) {
      var drawn = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          orbit.classList.add('is-drawn');
          drawn.disconnect();
        });
      }, { threshold: 0.3 });
      drawn.observe(orbit);
    } else {
      orbit.classList.add('is-drawn');
    }

    document.addEventListener('emed:langchange', function () {
      capTitle.setAttribute('data-i18n', 'cat.' + current);
      capText.setAttribute('data-i18n', 'eco.' + current + 'Cap');
    });
  }

  /* ================================================ pointer-lit surfaces ==== */
  function initSpotlight() {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    $$('.cat, .cta-card').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left).toFixed(1) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top).toFixed(1) + 'px');
      });
      el.addEventListener('pointerleave', function () {
        el.style.removeProperty('--mx');
        el.style.removeProperty('--my');
      });
    });
  }

  /* ==================================================== app feature tabs ==== */
  function initAppShowcase() {
    var tablist = $('[data-app-features]');
    var stage = $('[data-app-screens]');
    if (!tablist || !stage) return;

    var tabs = $$('.feature', tablist);
    var screens = $$('.ui-screen', stage);
    var chip = $('#appChip');
    var chipIcons = ['i-search', 'i-building', 'i-calendar', 'i-users', 'i-shield'];
    var DWELL = 6000;
    var timer = null;
    var index = 0;
    var paused = false;

    tablist.style.setProperty('--feature-dwell', DWELL + 'ms');

    function show(next, moveFocus) {
      index = (next + tabs.length) % tabs.length;

      tabs.forEach(function (tab, i) {
        var on = i === index;
        tab.setAttribute('aria-selected', on ? 'true' : 'false');
        tab.tabIndex = on ? 0 : -1;
        if (on && moveFocus) tab.focus();
      });

      screens.forEach(function (screen, i) {
        var on = i === index;
        screen.classList.toggle('is-active', on);
        screen.hidden = !on;
      });

      if (chip) {
        chip.classList.add('is-swapping');
        window.setTimeout(function () {
          var label = $('span', chip);
          var use = $('use', chip);
          if (label) { label.setAttribute('data-i18n', 'app.f' + (index + 1) + 't'); applyI18n(chip); }
          if (use) use.setAttribute('href', '#' + chipIcons[index]);
          chip.classList.remove('is-swapping');
        }, reduceMotion.matches ? 0 : 200);
      }

      /* restart the progress animation on the newly selected tab */
      var fill = $('.feature[aria-selected="true"] .feature__progress i', tablist);
      if (fill) { fill.style.animation = 'none'; void fill.offsetWidth; fill.style.animation = ''; }
    }

    function play() {
      if (reduceMotion.matches || paused) return;
      stop();
      timer = window.setInterval(function () { show(index + 1); }, DWELL);
    }
    function stop() { window.clearInterval(timer); timer = null; }

    function setPaused(next) {
      paused = next;
      tablist.classList.toggle('features-paused', paused);
      if (paused) stop(); else play();
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { show(i); setPaused(true); });
      tab.addEventListener('keydown', function (e) {
        var map = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
        if (e.key === 'Home') { e.preventDefault(); show(0, true); setPaused(true); return; }
        if (e.key === 'End') { e.preventDefault(); show(tabs.length - 1, true); setPaused(true); return; }
        if (!(e.key in map)) return;
        e.preventDefault();
        /* horizontal arrows follow the reading direction */
        var step = map[e.key];
        if (document.documentElement.dir === 'rtl' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) step = -step;
        show(index + step, true);
        setPaused(true);
      });
    });

    var section = $('#app');
    if (section) {
      ['mouseenter', 'focusin'].forEach(function (ev) { section.addEventListener(ev, function () { stop(); }); });
      ['mouseleave', 'focusout'].forEach(function (ev) {
        section.addEventListener(ev, function () { if (!paused) play(); });
      });
    }

    /* only run the carousel while the section is on screen */
    if ('IntersectionObserver' in window && section) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting && !paused) play(); else stop(); });
      }, { threshold: 0.25 }).observe(section);
    } else {
      play();
    }

    show(0);
  }

  /* ====================================================== provider tabs ==== */
  function initProviderTabs() {
    var tablist = $('[data-prov-tabs]');
    var title = $('#provValueTitle');
    var list = $('#provValueList');
    var panel = $('#provPanel');
    if (!tablist || !title || !list || !panel) return;

    var tabs = $$('.segmented__btn', tablist);

    function show(i, moveFocus) {
      var index = (i + tabs.length) % tabs.length;
      var key = tabs[index].getAttribute('data-prov');

      tabs.forEach(function (tab, n) {
        var on = n === index;
        tab.setAttribute('aria-selected', on ? 'true' : 'false');
        tab.tabIndex = on ? 0 : -1;
        if (on && moveFocus) tab.focus();
      });

      panel.setAttribute('aria-labelledby', tabs[index].id);
      title.setAttribute('data-i18n', 'prov.' + key + 'Title');
      $$('span[data-i18n-html]', list).forEach(function (span, n) {
        span.setAttribute('data-i18n-html', 'prov.' + key + (n + 1));
      });
      applyI18n(panel);
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { show(i); });
      tab.addEventListener('keydown', function (e) {
        var map = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 1, ArrowUp: -1 };
        if (e.key === 'Home') { e.preventDefault(); show(0, true); return; }
        if (e.key === 'End') { e.preventDefault(); show(tabs.length - 1, true); return; }
        if (!(e.key in map)) return;
        e.preventDefault();
        var step = map[e.key];
        if (document.documentElement.dir === 'rtl' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) step = -step;
        show(tabs.indexOf(document.activeElement) + step, true);
      });
    });
  }

  /* =========================================================== accordion ==== */
  function initAccordion() {
    $$('[data-accordion]').forEach(function (acc) {
      $$('.acc-trigger', acc).forEach(function (trigger) {
        var panel = document.getElementById(trigger.getAttribute('aria-controls'));
        if (!panel) return;

        trigger.addEventListener('click', function () {
          var open = trigger.getAttribute('aria-expanded') === 'true';
          trigger.setAttribute('aria-expanded', open ? 'false' : 'true');
          panel.classList.toggle('is-open', !open);
        });
      });
    });
  }

  /* ============================================================== reveal ==== */
  function initReveal() {
    var targets = $$('[data-reveal]');
    if (!targets.length) return;

    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
      targets.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    /* siblings that reveal together arrive in sequence, not as a block */
    var groups = new Map();
    targets.forEach(function (el) {
      if (el.hasAttribute('data-reveal-delay')) return;
      var parent = el.parentNode;
      var n = groups.get(parent) || 0;
      groups.set(parent, n + 1);
      if (n > 0) el.style.setProperty('--d', Math.min(n, 6) * 70 + 'ms');
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    targets.forEach(function (el) { io.observe(el); });
  }

  /* ===================================================== hero parallax ==== */
  function initParallax() {
    var stage = $('.hero-stage');
    if (!stage || reduceMotion.matches) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    var layers = $$('.float, .hero-stage__phone', stage);
    var raf = null;
    var tx = 0, ty = 0;

    stage.addEventListener('pointermove', function (e) {
      var rect = stage.getBoundingClientRect();
      tx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      ty = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      if (!raf) raf = requestAnimationFrame(apply);
    });

    stage.addEventListener('pointerleave', function () {
      tx = 0; ty = 0;
      if (!raf) raf = requestAnimationFrame(apply);
    });

    function apply() {
      raf = null;
      layers.forEach(function (el, i) {
        var depth = 4 + i * 2.2;
        /* custom properties, not `translate` — the phone composes this with
           its own -50%/-50% centring offset (see styles.css .hero-stage__phone) */
        el.style.setProperty('--px', (tx * depth).toFixed(2) + 'px');
        el.style.setProperty('--py', (ty * depth).toFixed(2) + 'px');
      });
    }
  }

  /* ======================================= social proof (opt-in reveal) ==== */
  function initProof() {
    var section = $('[data-proof]');
    if (!section) return;

    var values = $$('dt[data-value]', section);
    var complete = values.length > 0 && values.every(function (dt) {
      return String(dt.getAttribute('data-value')).trim() !== '';
    });

    if (!complete) return; /* stays hidden until real numbers are supplied */

    values.forEach(function (dt) { dt.textContent = dt.getAttribute('data-value'); });
    section.hidden = false;
  }

  /* ========================================================= misc links ==== */
  function initPlaceholderLinks() {
    /* Placeholder hrefs must not throw the reader back to the top of the page. */
    document.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a[href="#"]') : null;
      if (a) e.preventDefault();
    });
  }

  /* =============================================================== boot ==== */
  function boot() {
    initLanguage();
    initHeader();
    initDrawer();
    initSearch();
    initEcosystem();
    initSpotlight();
    initAppShowcase();
    initProviderTabs();
    initAccordion();
    initReveal();
    initParallax();
    initProof();
    initPlaceholderLinks();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
