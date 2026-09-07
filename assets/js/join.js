/* =============================================================================
   eMED — provider join request
   Vanilla JS, no dependencies, no build step. Classic script, same as app.js.

   What this file is responsible for, and nothing more: collecting the minimum
   a provider must give us so the eMED team can identify them, find the
   facility and get in touch. It creates no account, asks for no credential,
   and never mentions passwords, licences or documents.

   01 Data · 02 Schema · 03 State · 04 Helpers · 05 Fields · 06 Combobox
   07 Photo · 08 Validation · 09 Steps · 10 Review · 11 Stage · 12 Map
   13 Submit · 14 Boot
   ============================================================================= */
(function () {
  'use strict';

  var API = window.EMED || null;
  if (!API) return; /* app.js did not load — the page still renders statically */

  var t = API.t;
  var applyI18n = API.applyI18n;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ------------------------------------------------------------- 01 Data */

  /* The six provider types this page accepts. An individual doctor is not one
     of them: a doctor practises inside a clinic or a medical centre, so the
     facility joins and its doctors are listed under it. Ordered by scale —
     clinic, centre, hospital — then the supporting services. Insurance
     companies and TPAs are deliberately absent: separate entry points. */
  var TYPES = [
    { id: 'clinic',   icon: 'i-clinic' },
    { id: 'center',   icon: 'i-building' },
    { id: 'hospital', icon: 'i-hospital' },
    { id: 'pharmacy', icon: 'i-pharmacy' },
    { id: 'lab',      icon: 'i-lab' },
    { id: 'imaging',  icon: 'i-imaging' }
  ];

  /* Dial codes. The default is the first entry; reorder it if the product's
     primary market changes. Nothing else in the file assumes a country. */
  var COUNTRIES = [
    { d: '+970', ar: 'فلسطين', en: 'Palestine' },
    { d: '+972', ar: 'إسرائيل', en: 'Israel' },
    { d: '+962', ar: 'الأردن', en: 'Jordan' },
    { d: '+20',  ar: 'مصر', en: 'Egypt' },
    { d: '+966', ar: 'السعودية', en: 'Saudi Arabia' },
    { d: '+971', ar: 'الإمارات', en: 'United Arab Emirates' },
    { d: '+974', ar: 'قطر', en: 'Qatar' },
    { d: '+965', ar: 'الكويت', en: 'Kuwait' },
    { d: '+973', ar: 'البحرين', en: 'Bahrain' },
    { d: '+968', ar: 'عُمان', en: 'Oman' },
    { d: '+961', ar: 'لبنان', en: 'Lebanon' },
    { d: '+963', ar: 'سوريا', en: 'Syria' },
    { d: '+964', ar: 'العراق', en: 'Iraq' },
    { d: '+90',  ar: 'تركيا', en: 'Türkiye' },
    { d: '+44',  ar: 'المملكة المتحدة', en: 'United Kingdom' },
    { d: '+1',   ar: 'الولايات المتحدة / كندا', en: 'United States / Canada' }
  ];

  /* TODO (product): confirm the coverage list with the product owner and
     replace this table wholesale if eMED launches elsewhere. `c` is the map
     centre used to move the map when a governorate is picked — it is a
     convenience only; the pin the provider confirms is what gets submitted. */
  var GOVERNORATES = [
    { id: 'jerusalem', ar: 'القدس', en: 'Jerusalem', c: [31.7784, 35.2066],
      areas: { ar: ['القدس', 'بيت حنينا', 'شعفاط', 'صور باهر', 'العيزرية', 'أبو ديس', 'الرام'],
               en: ['Jerusalem', 'Beit Hanina', 'Shuafat', 'Sur Baher', 'Al-Eizariya', 'Abu Dis', 'Ar-Ram'] } },
    { id: 'ramallah', ar: 'رام الله والبيرة', en: 'Ramallah & Al-Bireh', c: [31.9038, 35.2034],
      areas: { ar: ['رام الله', 'البيرة', 'بيتونيا', 'بيرزيت', 'الطيرة', 'عين مصباح'],
               en: ['Ramallah', 'Al-Bireh', 'Beitunia', 'Birzeit', 'Al-Tira', 'Ein Misbah'] } },
    { id: 'bethlehem', ar: 'بيت لحم', en: 'Bethlehem', c: [31.7054, 35.2024],
      areas: { ar: ['بيت لحم', 'بيت ساحور', 'بيت جالا', 'الدوحة', 'الخضر'],
               en: ['Bethlehem', 'Beit Sahour', 'Beit Jala', 'Ad-Doha', 'Al-Khader'] } },
    { id: 'hebron', ar: 'الخليل', en: 'Hebron', c: [31.5326, 35.0998],
      areas: { ar: ['الخليل', 'دورا', 'يطا', 'حلحول', 'بيت أمر', 'إذنا'],
               en: ['Hebron', 'Dura', 'Yatta', 'Halhul', 'Beit Ummar', 'Idhna'] } },
    { id: 'nablus', ar: 'نابلس', en: 'Nablus', c: [32.2211, 35.2544],
      areas: { ar: ['نابلس', 'رفيديا', 'بيت فوريك', 'حوارة', 'بيتا', 'عصيرة الشمالية'],
               en: ['Nablus', 'Rafidia', 'Beit Furik', 'Huwara', 'Beita', 'Asira ash-Shamaliya'] } },
    { id: 'jenin', ar: 'جنين', en: 'Jenin', c: [32.4614, 35.2961],
      areas: { ar: ['جنين', 'قباطية', 'يعبد', 'عرابة', 'اليامون'],
               en: ['Jenin', 'Qabatiya', 'Yabad', 'Arraba', 'Al-Yamun'] } },
    { id: 'tulkarm', ar: 'طولكرم', en: 'Tulkarm', c: [32.3104, 35.0286],
      areas: { ar: ['طولكرم', 'عنبتا', 'دير الغصون', 'بلعا', 'عتيل'],
               en: ['Tulkarm', 'Anabta', 'Deir al-Ghusun', 'Baqa', 'Attil'] } },
    { id: 'qalqilya', ar: 'قلقيلية', en: 'Qalqilya', c: [32.1896, 34.9706],
      areas: { ar: ['قلقيلية', 'عزون', 'حبلة', 'جيوس'],
               en: ['Qalqilya', 'Azzun', 'Habla', 'Jayyus'] } },
    { id: 'salfit', ar: 'سلفيت', en: 'Salfit', c: [32.0850, 35.1800],
      areas: { ar: ['سلفيت', 'بديا', 'ديراستيا', 'كفر الديك', 'بيت أمين'],
               en: ['Salfit', 'Biddya', 'Deir Istiya', 'Kafr ad-Dik', 'Beit Amin'] } },
    { id: 'tubas', ar: 'طوباس', en: 'Tubas', c: [32.3211, 35.3689],
      areas: { ar: ['طوباس', 'طمون', 'عقابة', 'تياسير'],
               en: ['Tubas', 'Tammun', 'Aqqaba', 'Tayasir'] } },
    { id: 'jericho', ar: 'أريحا والأغوار', en: 'Jericho & Al-Aghwar', c: [31.8563, 35.4600],
      areas: { ar: ['أريحا', 'العوجا', 'الجفتلك', 'فصايل'],
               en: ['Jericho', 'Al-Auja', 'Al-Jiftlik', 'Fasayil'] } },
    { id: 'gaza', ar: 'غزة', en: 'Gaza', c: [31.5017, 34.4668],
      areas: { ar: ['غزة', 'الرمال', 'الشجاعية', 'الزيتون', 'تل الهوا'],
               en: ['Gaza', 'Ar-Rimal', 'Shujaiya', 'Az-Zaytoun', 'Tal al-Hawa'] } },
    { id: 'north-gaza', ar: 'شمال غزة', en: 'North Gaza', c: [31.5500, 34.5020],
      areas: { ar: ['جباليا', 'بيت لاهيا', 'بيت حانون'],
               en: ['Jabalia', 'Beit Lahia', 'Beit Hanoun'] } },
    { id: 'deir-al-balah', ar: 'دير البلح', en: 'Deir al-Balah', c: [31.4180, 34.3510],
      areas: { ar: ['دير البلح', 'النصيرات', 'البريج', 'المغازي', 'الزوايدة'],
               en: ['Deir al-Balah', 'Nuseirat', 'Bureij', 'Maghazi', 'Az-Zawayda'] } },
    { id: 'khan-younis', ar: 'خان يونس', en: 'Khan Younis', c: [31.3400, 34.3060],
      areas: { ar: ['خان يونس', 'بني سهيلا', 'عبسان', 'خزاعة'],
               en: ['Khan Younis', 'Bani Suheila', 'Abasan', 'Khuzaa'] } },
    { id: 'rafah', ar: 'رفح', en: 'Rafah', c: [31.2870, 34.2500],
      areas: { ar: ['رفح', 'تل السلطان', 'الشوكة'],
               en: ['Rafah', 'Tal as-Sultan', 'Ash-Shoka'] } }
  ];

  /* Specialties come from the project's own dataset (EMED_I18N.suggestions),
     filtered to the entries already marked as specialties. No taxonomy is
     invented here — the combobox also accepts free text. */
  function specialties() {
    var s = (window.EMED_I18N && window.EMED_I18N.suggestions) || { ar: [], en: [] };
    var lang = API.getLang();
    var src = s[lang] || s.ar || [];
    var ref = s.ar || [];
    return src.filter(function (item, i) {
      var kind = (ref[i] || item).k;
      return kind === 'تخصص' || kind === 'Specialty';
    }).map(function (item) { return item.t; });
  }

  /* ----------------------------------------------------------- 02 Schema */

  /* One base shape, extended per type — six forms, one definition.
     kind: text | tel | email | url | radio | combo | photo */
  function f(id, kind, labelKey, extra) {
    var field = { id: id, kind: kind, labelKey: labelKey, required: true, half: false };
    if (extra) Object.keys(extra).forEach(function (k) { field[k] = extra[k]; });
    return field;
  }

  var LINK_FIELD = f('official_url', 'url', 'j.f.link', {
    required: false, placeholderKey: 'j.p.link', hintKey: 'j.h.link', autocomplete: 'url'
  });
  var PHOTO_FIELD = f('photo', 'photo', 'j.f.photo', { required: false });
  function emailField(labelKey) {
    return f('email', 'email', labelKey, {
      half: true, placeholderKey: 'j.p.email', hintKey: 'j.h.email', autocomplete: 'email'
    });
  }
  function phoneField(id, labelKey, opts) {
    var extra = { half: true, autocomplete: 'tel' };
    if (opts) Object.keys(opts).forEach(function (k) { extra[k] = opts[k]; });
    return f(id, 'tel', labelKey, extra);
  }
  function nameField(id, labelKey) {
    return f(id, 'text', labelKey, { placeholderKey: 'j.p.name', autocomplete: 'organization' });
  }

  function extras() {
    return { key: 'extra', titleKey: 'j.g.extra', noteKey: 'j.g.extraNote', icon: 'i-layers',
             optional: true, fields: [LINK_FIELD, PHOTO_FIELD] };
  }

  /* A clinic and a medical centre are the same form; only the word for the
     place changes. They used to be one type with a radio asking which — the
     type cards ask that now, so the question is not repeated here. */
  function ambulatory(nameKey, iconId) {
    return [
      { key: 'facility', titleKey: 'j.g.facility', icon: iconId, fields: [
        nameField('facility_name', nameKey),
        phoneField('facility_phone', 'j.f.phone'),
        emailField('j.f.facilityEmail')
      ] },
      { key: 'contact', titleKey: 'j.g.contact', noteKey: 'j.g.contactNote', icon: 'i-user', fields: [
        f('contact_name', 'text', 'j.f.contactName', { half: true, placeholderKey: 'j.p.contactName', autocomplete: 'name' }),
        phoneField('contact_phone', 'j.f.contactPhone')
      ] },
      extras()
    ];
  }

  var SCHEMA = {
    hospital: [
      { key: 'facility', titleKey: 'j.g.facility', icon: 'i-hospital', fields: [
        nameField('facility_name', 'j.f.hospitalName'),
        phoneField('facility_phone', 'j.f.phone'),
        emailField('j.f.facilityEmail')
      ] },
      { key: 'contact', titleKey: 'j.g.contact', noteKey: 'j.g.contactNote', icon: 'i-user', fields: [
        f('contact_name', 'text', 'j.f.contactName', { half: true, placeholderKey: 'j.p.contactName', autocomplete: 'name' }),
        f('contact_role', 'text', 'j.f.contactRole', { half: true, placeholderKey: 'j.p.contactRole', autocomplete: 'organization-title' }),
        phoneField('contact_phone', 'j.f.contactPhone')
      ] },
      extras()
    ],
    clinic: ambulatory('j.f.clinicName', 'i-clinic'),
    center: ambulatory('j.f.centerName', 'i-building'),
    pharmacy: [
      { key: 'facility', titleKey: 'j.g.facility', icon: 'i-pharmacy', fields: [
        nameField('facility_name', 'j.f.pharmacyName'),
        phoneField('facility_phone', 'j.f.pharmacyPhone'),
        emailField('j.f.facilityEmail')
      ] },
      { key: 'contact', titleKey: 'j.g.contact', noteKey: 'j.g.contactNote', icon: 'i-user', fields: [
        f('contact_name', 'text', 'j.f.contactName', { half: true, placeholderKey: 'j.p.contactName', autocomplete: 'name' }),
        phoneField('contact_phone', 'j.f.contactPhoneAlt', { required: false })
      ] },
      extras()
    ],
    lab: [
      { key: 'facility', titleKey: 'j.g.facility', icon: 'i-lab', fields: [
        nameField('facility_name', 'j.f.labName'),
        phoneField('facility_phone', 'j.f.phone'),
        emailField('j.f.facilityEmail')
      ] },
      { key: 'contact', titleKey: 'j.g.contact', noteKey: 'j.g.contactNote', icon: 'i-user', fields: [
        f('contact_name', 'text', 'j.f.contactName', { placeholderKey: 'j.p.contactName', autocomplete: 'name' })
      ] },
      extras()
    ],
    imaging: [
      { key: 'facility', titleKey: 'j.g.facility', icon: 'i-imaging', fields: [
        nameField('facility_name', 'j.f.imagingName'),
        phoneField('facility_phone', 'j.f.phone'),
        emailField('j.f.facilityEmail')
      ] },
      { key: 'contact', titleKey: 'j.g.contact', noteKey: 'j.g.contactNote', icon: 'i-user', fields: [
        f('contact_name', 'text', 'j.f.contactName', { placeholderKey: 'j.p.contactName', autocomplete: 'name' })
      ] },
      extras()
    ]
  };

  /* The location step is identical for every type — only its lead changes. */
  var LOCATION_FIELDS = [
    f('governorate', 'select', 'j.f.governorate', { half: true, placeholderKey: 'j.o.governorate' }),
    f('city', 'combo', 'j.f.city', { half: true, placeholderKey: 'j.p.city', source: 'city' }),
    f('street', 'text', 'j.f.street', { placeholderKey: 'j.p.street', hintKey: 'j.h.street', autocomplete: 'street-address' })
  ];

  function groupsFor(type) { return SCHEMA[type] || []; }
  function fieldsFor(type) {
    var out = [];
    groupsFor(type).forEach(function (g) { out = out.concat(g.fields); });
    return out;
  }
  function fieldById(type, id) {
    var all = fieldsFor(type).concat(LOCATION_FIELDS);
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
    return null;
  }

  /* ------------------------------------------------------------ 03 State */

  var STORE = 'emed:join';

  var state = {
    step: 1,
    type: null,
    data: {},          /* field id -> string; phones also keep <id>_cc */
    geo: null,         /* { lat, lng } once the provider confirms the pin  */
    geoLabel: '',      /* human label if reverse geocoding answered        */
    photoName: '',
    submitting: false
  };
  var photoFile = null;   /* never persisted */

  function save() {
    try {
      sessionStorage.setItem(STORE, JSON.stringify({
        step: state.step, type: state.type, data: state.data,
        geo: state.geo, geoLabel: state.geoLabel
      }));
    } catch (e) { /* private mode — the form still works, just not across reloads */ }
  }
  function restore() {
    try {
      var raw = sessionStorage.getItem(STORE);
      if (!raw) return;
      var v = JSON.parse(raw);
      if (!v || !v.type || !SCHEMA[v.type]) return;
      state.type = v.type;
      state.data = v.data || {};
      state.geo = v.geo || null;
      state.geoLabel = v.geoLabel || '';
      state.step = Math.min(Math.max(v.step || 1, 1), 4);
    } catch (e) { /* corrupt payload — start clean */ }
  }
  function clearSaved() { try { sessionStorage.removeItem(STORE); } catch (e) {} }

  /* ---------------------------------------------------------- 04 Helpers */

  function el(tag, cls, attrs) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (attrs[k] !== null && attrs[k] !== undefined) node.setAttribute(k, attrs[k]);
    });
    return node;
  }
  function icon(id, cls) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'icon' + (cls ? ' ' + cls : ''));
    svg.setAttribute('aria-hidden', 'true');
    var use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#' + id);
    svg.appendChild(use);
    return svg;
  }
  function i18nText(node, key) { node.setAttribute('data-i18n', key); node.textContent = t(key); return node; }

  /* Selection is styled with :has(). Mirror it onto a class as well so the
     choice is still visible where :has() is not supported. */
  function markChecked(scope, sel) {
    $$(sel, scope).forEach(function (label) {
      var input = $('input', label);
      label.classList.toggle('is-selected', !!(input && input.checked));
    });
  }
  function govById(id) {
    for (var i = 0; i < GOVERNORATES.length; i++) if (GOVERNORATES[i].id === id) return GOVERNORATES[i];
    return null;
  }
  function govLabel(id) { var g = govById(id); return g ? g[API.getLang()] || g.ar : ''; }
  function digits(v) { return String(v || '').replace(/[^\d]/g, ''); }

  /* ----------------------------------------------------------- 05 Fields */

  function ccSelect(id, value) {
    var sel = el('select', 'jphone__cc', {
      id: 'f_' + id + '_cc', name: id + '_cc',
      'aria-label': t('j.h.countryCode'), 'data-i18n-attr': 'aria-label:j.h.countryCode'
    });
    COUNTRIES.forEach(function (c) {
      var o = el('option', null, { value: c.d });
      o.textContent = c.d;
      o.setAttribute('data-ar', c.ar);
      o.setAttribute('data-en', c.en);
      o.title = c[API.getLang()] || c.ar;
      sel.appendChild(o);
    });
    sel.value = value || COUNTRIES[0].d;
    return sel;
  }

  function buildField(field) {
    var id = field.id;
    var wrap = el('div', 'jfield' + (field.half ? ' jfield--half' : ''), { 'data-field': id });
    var inputId = 'f_' + id;
    var hintId = field.hintKey ? 'h_' + id : null;
    var errId = 'e_' + id;

    /* --- label ---------------------------------------------------------- */
    var isGroup = field.kind === 'radio';
    var label = el(isGroup ? 'span' : 'label', 'jfield__label', isGroup ? null : { for: inputId });
    var labelText = el('span', null);
    i18nText(labelText, field.labelKey);
    label.appendChild(labelText);
    if (!field.required) {
      var opt = el('span', 'jfield__opt');
      i18nText(opt, 'j.optional');
      label.appendChild(opt);
    }

    var describedBy = [];
    if (hintId) describedBy.push(hintId);
    describedBy.push(errId);
    var described = describedBy.join(' ');

    var control = el('div', 'jfield__control');
    var input = null;

    if (field.kind === 'tel') {
      var phone = el('div', 'jphone');
      var cc = ccSelect(id, state.data[id + '_cc']);
      input = el('input', 'jinput jphone__num', {
        id: inputId, name: id, type: 'tel', inputmode: 'tel',
        autocomplete: field.autocomplete || 'tel',
        placeholder: t('j.p.phone'), 'data-i18n-attr': 'placeholder:j.p.phone',
        'aria-describedby': described
      });
      input.value = state.data[id] || '';
      cc.addEventListener('change', function () { state.data[id + '_cc'] = cc.value; save(); paintStage(); });
      state.data[id + '_cc'] = cc.value;
      phone.appendChild(cc);
      phone.appendChild(input);
      control.appendChild(phone);

    } else if (field.kind === 'radio') {
      var seg = el('div', 'jseg', { role: 'radiogroup', 'aria-labelledby': 'lbl_' + id, 'aria-describedby': errId });
      label.id = 'lbl_' + id;
      field.options.forEach(function (o) {
        var optLabel = el('label', 'jseg__opt');
        var radio = el('input', 'sr-only', { type: 'radio', name: id, value: o.v, id: inputId + '_' + o.v });
        if (state.data[id] === o.v) radio.checked = true;
        var mark = el('span', 'jseg__mark');
        mark.appendChild(icon('i-check'));
        var txt = el('span', 'jseg__text');
        i18nText(txt, o.k);
        optLabel.appendChild(radio);
        optLabel.appendChild(mark);
        optLabel.appendChild(txt);
        radio.addEventListener('change', function () {
          state.data[id] = o.v;
          clearError(id);
          save();
          paintStage();
          markChecked(seg, '.jseg__opt');
        });
        seg.appendChild(optLabel);
      });
      markChecked(seg, '.jseg__opt');
      control.appendChild(seg);

    } else if (field.kind === 'select') {
      input = el('select', 'jinput jselect', {
        id: inputId, name: id, 'aria-describedby': described
      });
      renderGovOptions(input, state.data[id] || '');
      input.addEventListener('change', function () {
        state.data[id] = input.value;
        clearError(id);
        onGovernorateChange(input.value);
        save();
        paintStage();
      });
      var wrapSel = el('div', 'jselect-wrap');
      wrapSel.appendChild(input);
      wrapSel.appendChild(icon('i-chevron-down', 'jselect__chev'));
      control.appendChild(wrapSel);

    } else if (field.kind === 'combo') {
      var box = el('div', 'jcombo');
      input = el('input', 'jinput jcombo__input', {
        id: inputId, name: id, type: 'text', autocomplete: 'off',
        role: 'combobox', 'aria-expanded': 'false', 'aria-controls': 'list_' + id,
        'aria-autocomplete': 'list', 'aria-describedby': described,
        placeholder: t(field.placeholderKey), 'data-i18n-attr': 'placeholder:' + field.placeholderKey
      });
      input.value = state.data[id] || '';
      var list = el('ul', 'jcombo__list', { id: 'list_' + id, role: 'listbox', hidden: 'hidden' });
      list.setAttribute('aria-label', t(field.labelKey));
      list.setAttribute('data-i18n-attr', 'aria-label:' + field.labelKey);
      box.appendChild(input);
      box.appendChild(icon('i-chevron-down', 'jcombo__chev'));
      box.appendChild(list);
      control.appendChild(box);
      makeCombobox(input, list, field);

    } else if (field.kind === 'photo') {
      control.appendChild(buildPhoto(inputId, described));

    } else {
      input = el('input', 'jinput', {
        id: inputId, name: id,
        type: field.kind === 'email' ? 'email' : field.kind === 'url' ? 'url' : 'text',
        inputmode: field.kind === 'email' ? 'email' : field.kind === 'url' ? 'url' : null,
        autocomplete: field.autocomplete || 'off',
        'aria-describedby': described
      });
      if (field.placeholderKey) {
        input.placeholder = t(field.placeholderKey);
        input.setAttribute('data-i18n-attr', 'placeholder:' + field.placeholderKey);
      }
      input.value = state.data[id] || '';
      control.appendChild(input);
    }

    if (input && field.kind !== 'select') {
      input.addEventListener('input', function () {
        state.data[id] = input.value;
        if (wrap.classList.contains('is-invalid')) validateField(field, true);
        save();
        paintStage();
      });
      input.addEventListener('blur', function () {
        /* format problems surface on blur; "required" waits for Continue so
           tabbing through the form never turns it red */
        if (String(input.value || '').trim() !== '' || wrap.classList.contains('is-invalid')) {
          validateField(field, true);
        }
      });
    }

    wrap.appendChild(label);
    wrap.appendChild(control);

    if (field.hintKey) {
      var hint = el('p', 'jfield__hint', { id: hintId });
      i18nText(hint, field.hintKey);
      wrap.appendChild(hint);
    }
    var err = el('p', 'jfield__error', { id: errId, hidden: 'hidden' });
    wrap.appendChild(err);

    return wrap;
  }

  function renderGovOptions(select, value) {
    var lang = API.getLang();
    select.textContent = '';
    var ph = el('option', null, { value: '' });
    ph.textContent = t('j.o.governorate');
    select.appendChild(ph);
    GOVERNORATES.forEach(function (g) {
      var o = el('option', null, { value: g.id });
      o.textContent = g[lang] || g.ar;
      select.appendChild(o);
    });
    select.value = value || '';
  }

  function renderGroups(container, groups) {
    container.textContent = '';
    groups.forEach(function (g) {
      var sec = el('fieldset', 'jgroup' + (g.optional ? ' jgroup--soft' : ''), { 'data-group': g.key });
      var head = el('legend', 'jgroup__head');
      var ic = el('span', 'jgroup__icon', { 'aria-hidden': 'true' });
      ic.appendChild(icon(g.icon));
      var texts = el('div', null);
      var h = el('span', 'jgroup__title');
      i18nText(h, g.titleKey);
      texts.appendChild(h);
      if (g.noteKey) {
        var n = el('span', 'jgroup__note');
        i18nText(n, g.noteKey);
        texts.appendChild(n);
      }
      head.appendChild(ic);
      head.appendChild(texts);
      sec.appendChild(head);

      var grid = el('div', 'jgrid');
      g.fields.forEach(function (field) { grid.appendChild(buildField(field)); });
      sec.appendChild(grid);
      container.appendChild(sec);
    });
    applyI18n(container);
  }

  /* --------------------------------------------------------- 06 Combobox */

  function comboItems(field) {
    if (field.source === 'specialty') return specialties();
    if (field.source === 'city') {
      var g = govById(state.data.governorate);
      if (!g) return [];
      return g.areas[API.getLang()] || g.areas.ar;
    }
    return [];
  }

  function makeCombobox(input, list, field) {
    var open = false;
    var active = -1;
    var items = [];

    function render(filter) {
      var all = comboItems(field);
      var q = String(filter || '').trim().toLowerCase();
      items = q ? all.filter(function (v) { return v.toLowerCase().indexOf(q) !== -1; }) : all;
      list.textContent = '';
      if (!items.length) { close(); return; }
      items.forEach(function (v, i) {
        var li = el('li', 'jcombo__opt', { role: 'option', id: list.id + '_o' + i, 'aria-selected': 'false' });
        li.textContent = v;
        li.addEventListener('mousedown', function (e) { e.preventDefault(); choose(i); });
        list.appendChild(li);
      });
      show();
    }
    function show() {
      if (open) return;
      open = true; active = -1;
      list.hidden = false;
      input.setAttribute('aria-expanded', 'true');
    }
    function close() {
      if (!open) return;
      open = false; active = -1;
      list.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
    }
    function mark(i) {
      $$('.jcombo__opt', list).forEach(function (li, n) {
        var on = n === i;
        li.classList.toggle('is-active', on);
        li.setAttribute('aria-selected', on ? 'true' : 'false');
        if (on) {
          input.setAttribute('aria-activedescendant', li.id);
          if (li.scrollIntoView) li.scrollIntoView({ block: 'nearest' });
        }
      });
      active = i;
    }
    function choose(i) {
      input.value = items[i];
      state.data[field.id] = items[i];
      clearError(field.id);
      close();
      save();
      paintStage();
    }

    input.addEventListener('input', function () { render(input.value); });
    input.addEventListener('focus', function () { if (!input.value) render(''); });
    input.addEventListener('blur', function () { window.setTimeout(close, 90); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!open) { render(input.value); return; }
        mark(active + 1 >= items.length ? 0 : active + 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!open) return;
        mark(active - 1 < 0 ? items.length - 1 : active - 1);
      } else if (e.key === 'Enter') {
        if (open && active >= 0) { e.preventDefault(); choose(active); }
      } else if (e.key === 'Escape') {
        if (open) { e.stopPropagation(); close(); }
      }
    });
  }

  /* ------------------------------------------------------------ 07 Photo */

  var MAX_PHOTO = 8 * 1024 * 1024;

  function buildPhoto(inputId, described) {
    var root = el('div', 'jphoto');
    var input = el('input', 'sr-only jphoto__input', {
      id: inputId, name: 'photo', type: 'file', accept: 'image/jpeg,image/png,image/webp,image/*',
      'aria-describedby': described
    });
    var drop = el('label', 'jphoto__drop', { for: inputId });
    var dIcon = el('span', 'jphoto__drop-icon', { 'aria-hidden': 'true' });
    dIcon.appendChild(icon('i-camera'));
    var cta = el('span', 'jphoto__cta');
    i18nText(cta, 'j.ph.cta');
    var hint = el('span', 'jphoto__hint');
    i18nText(hint, 'j.ph.hint');
    drop.appendChild(dIcon); drop.appendChild(cta); drop.appendChild(hint);

    var preview = el('div', 'jphoto__preview', { hidden: 'hidden' });
    var img = el('img', 'jphoto__img', { alt: t('j.ph.preview'), 'data-i18n-attr': 'alt:j.ph.preview' });
    var meta = el('div', 'jphoto__meta');
    var nameEl = el('p', 'jphoto__name');
    var acts = el('div', 'jphoto__acts');
    var replace = el('button', 'jphoto__act', { type: 'button' });
    replace.appendChild(icon('i-image'));
    replace.appendChild(i18nText(el('span'), 'j.ph.replace'));
    var remove = el('button', 'jphoto__act jphoto__act--danger', { type: 'button' });
    remove.appendChild(icon('i-trash'));
    remove.appendChild(i18nText(el('span'), 'j.ph.remove'));
    acts.appendChild(replace); acts.appendChild(remove);
    meta.appendChild(nameEl); meta.appendChild(acts);
    preview.appendChild(img); preview.appendChild(meta);

    var error = el('p', 'jfield__error jphoto__error', { hidden: 'hidden' });

    function accept(file) {
      error.hidden = true;
      if (!file) return;
      if (!/^image\//.test(file.type)) { error.textContent = t('j.ph.badType'); error.hidden = false; return; }
      if (file.size > MAX_PHOTO) { error.textContent = t('j.ph.tooLarge'); error.hidden = false; return; }
      photoFile = file;
      state.photoName = file.name;
      if (img.src && img.src.indexOf('blob:') === 0) URL.revokeObjectURL(img.src);
      img.src = URL.createObjectURL(file);
      nameEl.textContent = file.name;
      drop.hidden = true;
      preview.hidden = false;
      paintStage();
    }

    /* a file can carry an image type and still not decode — show the name
       rather than a broken-image glyph */
    img.addEventListener('error', function () { root.classList.add('is-undecodable'); });
    img.addEventListener('load', function () { root.classList.remove('is-undecodable'); });

    input.addEventListener('change', function () { accept(input.files && input.files[0]); });
    replace.addEventListener('click', function () { input.click(); });
    remove.addEventListener('click', function () {
      if (img.src && img.src.indexOf('blob:') === 0) URL.revokeObjectURL(img.src);
      photoFile = null; state.photoName = ''; input.value = '';
      img.removeAttribute('src');
      preview.hidden = true; drop.hidden = false;
      paintStage();
      drop.focus();
    });

    ['dragenter', 'dragover'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('is-over'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('is-over'); });
    });
    drop.addEventListener('drop', function (e) {
      var dt = e.dataTransfer;
      if (dt && dt.files && dt.files.length) accept(dt.files[0]);
    });

    root.appendChild(input);
    root.appendChild(drop);
    root.appendChild(preview);
    root.appendChild(error);

    /* a file input cannot be repopulated from storage — restore the label only */
    if (photoFile) accept(photoFile);
    return root;
  }

  /* ------------------------------------------------------- 08 Validation */

  var RE_EMAIL = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;
  var RE_URL = /^(https?:\/\/)?([\w-]+\.)+[A-Za-z]{2,}(\/[^\s]*)?$/;

  function errorFor(field) {
    var v = String(state.data[field.id] || '').trim();
    if (!v) return field.required ? (field.kind === 'radio' || field.kind === 'select' ? 'j.err.select' : 'j.err.required') : null;
    if (field.kind === 'email' && !RE_EMAIL.test(v)) return 'j.err.email';
    if (field.kind === 'tel') { var d = digits(v); if (d.length < 6 || d.length > 15) return 'j.err.phone'; }
    if (field.kind === 'url' && !RE_URL.test(v)) return 'j.err.url';
    return null;
  }

  function showError(id, key) {
    var wrap = $('[data-field="' + id + '"]');
    if (!wrap) return;
    var err = $('#e_' + id, wrap);
    wrap.classList.add('is-invalid');
    if (err) { err.setAttribute('data-i18n', key); err.textContent = t(key); err.hidden = false; }
    var ctl = $('.jinput, [role="radiogroup"]', wrap);
    if (ctl && ctl.classList.contains('jinput')) ctl.setAttribute('aria-invalid', 'true');
  }
  function clearError(id) {
    var wrap = $('[data-field="' + id + '"]');
    if (!wrap) return;
    var err = $('#e_' + id, wrap);
    wrap.classList.remove('is-invalid');
    if (err) { err.hidden = true; err.removeAttribute('data-i18n'); err.textContent = ''; }
    var ctl = $('.jinput', wrap);
    if (ctl) ctl.removeAttribute('aria-invalid');
  }
  function validateField(field, paint) {
    var key = errorFor(field);
    if (key && paint) showError(field.id, key);
    if (!key) clearError(field.id);
    return !key;
  }

  function validateStep(step) {
    var bad = [];
    if (step === 1) {
      if (!state.type) {
        var te = $('#typeError');
        te.setAttribute('data-i18n', 'j.err.select');
        te.textContent = t('j.err.select');
        te.hidden = false;
        bad.push('provider_type');
      }
    } else if (step === 2) {
      fieldsFor(state.type).forEach(function (field) {
        if (!validateField(field, true)) bad.push(field.id);
      });
    } else if (step === 3) {
      LOCATION_FIELDS.forEach(function (field) {
        if (!validateField(field, true)) bad.push(field.id);
      });
      var mapErr = $('#mapErrorMsg');
      if (!state.geo) {
        mapErr.setAttribute('data-i18n', 'j.err.map');
        mapErr.textContent = t('j.err.map');
        mapErr.hidden = false;
        bad.push('map');
      } else {
        mapErr.hidden = true;
      }
    }
    return bad;
  }

  /* the live region is the only channel a screen-reader user has for "the
     Continue button did nothing because three fields are unfinished" */
  function announce(message) {
    var node = $('#stepStatus');
    if (!node) return;
    node.textContent = '';
    window.setTimeout(function () { node.textContent = message; }, 60);
  }

  function focusFirstInvalid(ids) {
    if (!ids.length) return;
    var id = ids[0];
    var node = id === 'map' ? $('#mapViewport')
             : id === 'provider_type' ? $('#typeGroup input')
             : $('#f_' + id) || $('[data-field="' + id + '"] input');
    if (node && node.focus) node.focus();
    if (node && node.scrollIntoView) node.scrollIntoView({ block: 'center', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  }

  /* ------------------------------------------------------------ 09 Steps */

  var LAST_STEP = 4;

  function stepEl(n) { return $('.jstep[data-step="' + n + '"]'); }

  function goTo(step, opts) {
    var options = opts || {};
    var from = state.step;
    if (step === from && !options.force) return;

    state.step = step;
    save();

    $$('.jstep').forEach(function (s) {
      var on = Number(s.getAttribute('data-step')) === step;
      s.hidden = !on;
      s.classList.toggle('is-in', on);
    });

    if (step === 2) renderStep2();
    if (step === 3) enterLocation();
    if (step === 4) renderReview();

    paintProgress();
    paintActions();
    paintStage();
    /* past the first step the pitch has done its job — on small screens the
       form takes the space back */
    document.body.classList.toggle('is-past-intro', step > 1);

    if (!options.silent) {
      var heading = $('.jstep__title', stepEl(step));
      if (heading) heading.focus({ preventScroll: true });
      announce(t('j.step.' + ['type', 'info', 'location', 'review'][step - 1]));
      if (!options.keepScroll) {
        var top = $('.join__col').getBoundingClientRect().top + window.scrollY - 88;
        window.scrollTo({ top: Math.max(top, 0), behavior: reduceMotion.matches ? 'auto' : 'smooth' });
      }
    }
  }

  function paintProgress() {
    $$('.jprog__item').forEach(function (li) {
      var n = Number(li.getAttribute('data-step'));
      var done = n < state.step;
      var current = n === state.step;

      li.classList.toggle('is-current', current);
      li.classList.toggle('is-done', done);
      if (current) li.setAttribute('aria-current', 'step');
      else li.removeAttribute('aria-current');

      /* finished steps are reachable again; unfinished ones are not */
      var btn = $('.jprog__btn', li);
      if (btn) {
        btn.disabled = !done;
        btn.setAttribute('aria-label', done ? t('j.step.back') + ': ' + $('.jprog__label', li).textContent : '');
        if (!done) btn.removeAttribute('aria-label');
      }
      var spoken = $('[data-step-state]', li);
      if (spoken) spoken.textContent = done ? t('j.step.done') : current ? t('j.step.current') : '';
    });
    var fill = $('#progFill');
    if (fill) fill.style.setProperty('--p', ((state.step - 1) / (LAST_STEP - 1)).toFixed(3));
  }

  function paintActions() {
    var back = $('#btnBack');
    var next = $('#btnNext');
    var submit = $('#btnSubmit');
    var label = $('#btnNextLabel');

    /* On step 1 the action stays out of the way until a choice is made —
       nothing to continue to, so nothing to press. */
    var armed = state.step !== 1 || !!state.type;

    back.hidden = state.step === 1;
    next.hidden = state.step === LAST_STEP || !armed;
    submit.hidden = state.step !== LAST_STEP;
    $('#formActions').hidden = !armed && state.step === 1;

    /* and it names the choice back to the reader */
    var key = state.step === 1 && state.type ? 'j.nextAs.' + state.type : 'j.next';
    label.setAttribute('data-i18n', key);
    label.textContent = t(key);
    next.classList.toggle('is-revealed', armed && state.step === 1);
  }

  function renderStep2() {
    if (!state.type) return;
    var title = $('#s2Title');
    title.setAttribute('data-i18n', 'j.s2.' + state.type);
    title.textContent = t('j.s2.' + state.type);
    renderGroups($('#stepFields'), groupsFor(state.type));
  }

  function enterLocation() {
    if (!$('#locFields').childNodes.length) {
      var grid = $('#locFields');
      LOCATION_FIELDS.forEach(function (field) { grid.appendChild(buildField(field)); });
      applyI18n(grid);
    }
    var lead = $('#s3Lead');
    lead.setAttribute('data-i18n', 'j.loc.lead');
    lead.textContent = t('j.loc.lead');
    ensureMap();
  }

  function onGovernorateChange(id) {
    var cityInput = $('#f_city');
    if (cityInput) { cityInput.value = ''; state.data.city = ''; }
    var g = govById(id);
    if (g && map) map.setView({ lat: g.c[0], lng: g.c[1] }, 12, true);
  }

  /* ----------------------------------------------------------- 10 Review */

  function reviewRows() {
    var rows = [];
    rows.push({ labelKey: 'j.rev.type', value: t('j.type.' + state.type), step: 1, focus: null });

    fieldsFor(state.type).forEach(function (field) {
      if (field.kind === 'photo') {
        if (photoFile) rows.push({ labelKey: field.labelKey, value: state.photoName || t('j.rev.photoSet'), step: 2, focus: field.id });
        return;
      }
      var v = String(state.data[field.id] || '').trim();
      if (!v && !field.required) return;
      if (field.kind === 'tel') v = (state.data[field.id + '_cc'] || '') + ' ' + v;
      if (field.kind === 'radio') {
        var opt = field.options.filter(function (o) { return o.v === v; })[0];
        v = opt ? t(opt.k) : v;
      }
      var ltr = field.kind === 'tel' || field.kind === 'email' || field.kind === 'url';
      rows.push({ labelKey: field.labelKey, value: v || t('j.rev.empty'), step: 2, focus: field.id, empty: !v, ltr: ltr && !!v });
    });

    var loc = [govLabel(state.data.governorate), state.data.city, state.data.street]
      .filter(function (v) { return String(v || '').trim(); }).join('، ');
    rows.push({ labelKey: 'j.rev.location', value: loc || t('j.rev.empty'), step: 3, focus: 'governorate', empty: !loc });
    rows.push({ labelKey: 'j.loc.mapTitle', value: state.geoLabel || t('j.rev.coords'), step: 3, focus: 'map', pin: true });
    return rows;
  }

  function renderReview() {
    var body = $('#reviewBody');
    body.textContent = '';
    reviewRows().forEach(function (row) {
      var item = el('div', 'jrev__row' + (row.empty ? ' is-empty' : ''));
      var label = el('span', 'jrev__label');
      i18nText(label, row.labelKey);
      var value = el('span', 'jrev__value' + (row.ltr ? ' is-ltr' : ''));
      if (row.pin) value.appendChild(icon('i-check', 'jrev__pin'));
      value.appendChild(document.createTextNode(row.value));
      var edit = el('button', 'jrev__edit', { type: 'button' });
      edit.appendChild(icon('i-edit'));
      var editText = el('span');
      i18nText(editText, 'j.rev.edit');
      edit.appendChild(editText);
      edit.setAttribute('aria-label', t('j.rev.editAria') + ': ' + t(row.labelKey));
      edit.addEventListener('click', function () {
        goTo(row.step);
        window.setTimeout(function () {
          var node = row.focus === 'map' ? $('#mapViewport') : $('#f_' + row.focus);
          if (node && node.focus) node.focus();
          if (node && node.scrollIntoView) node.scrollIntoView({ block: 'center', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
        }, 60);
      });
      item.appendChild(label);
      item.appendChild(value);
      item.appendChild(edit);
      body.appendChild(item);
    });
    applyI18n(body);
  }

  /* ------------------------------------------------------------ 11 Stage */

  /* The stage answers the one question the form cannot: what am I joining?
     It is the same eMED system for every provider — only the profile it
     assembles changes shape. Nothing here claims a capability the product
     does not already have. */
  var STAGE = {
    clinic:   { icon: 'i-clinic',      caps: ['specialties', 'services', 'hours'] },
    center:   { icon: 'i-building',    caps: ['specialties', 'services', 'hours'] },
    hospital: { icon: 'i-hospital',    caps: ['departments', 'services', 'hours'] },
    pharmacy: { icon: 'i-pharmacy',    caps: ['location', 'hours'] },
    lab:      { icon: 'i-lab',         caps: ['services', 'hours'] },
    imaging:  { icon: 'i-imaging',     caps: ['services', 'hours'] }
  };

  function typeIcon(type) { return (STAGE[type] || {}).icon || 'i-building'; }

  function setKeyed(node, key, fallbackText) {
    if (key) { node.setAttribute('data-i18n', key); node.textContent = t(key); }
    else { node.removeAttribute('data-i18n'); node.textContent = fallbackText; }
  }

  function paintStage() {
    var type = state.type;
    var stage = STAGE[type];

    setKeyed($('#stageTitle'), type ? 'j.stage.' + type : 'j.stage.default');
    setKeyed($('#stageSub'), type ? 'j.stage.' + type + 'Sub' : 'j.stage.defaultSub');

    var ic = typeIcon(type);
    $$('#cardAvatar use, .jnet__node:first-child use').forEach(function (use) {
      use.setAttribute('href', '#' + ic);
    });

    /* Every type is a facility now, so the card is always the place itself. */
    var name = (state.data.facility_name || '').trim();
    var placeholder = type ? 'j.card.' + type : 'j.card.default';

    var nameEl = $('#cardName');
    setKeyed(nameEl, name ? null : placeholder, name);
    nameEl.classList.toggle('is-empty', !name);

    var typeEl = $('#cardType');
    setKeyed(typeEl, type ? 'j.type.' + type : null, '');
    if (!type) typeEl.textContent = '';

    /* rows: only what has actually been typed */
    var rows = $('#cardRows');
    rows.textContent = '';
    function addRow(labelKey, value, iconId, ltr) {
      if (!value) return;
      var dt = el('dt', 'pcard__k');
      dt.appendChild(icon(iconId));
      dt.appendChild(i18nText(el('span'), labelKey));
      var dd = el('dd', 'pcard__v' + (ltr ? ' is-ltr' : ''));
      dd.textContent = value;
      rows.appendChild(dt); rows.appendChild(dd);
    }
    addRow('j.card.contact', state.data.contact_name, 'i-user');

    var phone = String(state.data.facility_phone || '').trim();
    if (phone) addRow('j.card.phone', (state.data.facility_phone_cc || '') + ' ' + phone, 'i-phone', true);

    /* what a profile of this type carries */
    var caps = $('#cardCaps');
    caps.textContent = '';
    ((stage && stage.caps) || []).forEach(function (cap) {
      caps.appendChild(i18nText(el('li', 'pcard__cap'), 'j.cap.' + cap));
    });

    var locBits = [state.data.city, govLabel(state.data.governorate)]
      .filter(function (v) { return String(v || '').trim(); });
    var cardMap = $('#cardMap');
    setKeyed($('#cardMapLabel'),
             locBits.length ? null : 'j.card.pendingLoc',
             locBits.join('، ') || t('j.rev.coords'));
    cardMap.classList.toggle('is-set', !!(locBits.length || state.geo));
    cardMap.classList.toggle('is-pinned', !!state.geo);

    setKeyed($('#netYou'), 'j.net.facility');
    setKeyed($('#netPatients'), 'j.net.discover');

    $('#joinStage').classList.toggle('has-type', !!type);
  }

  /* -------------------------------------------------------------- 12 Map */

  /* A minimal slippy map: raster tiles, drag to move, pinch/wheel/buttons to
     zoom, pin fixed at the centre. No library — the page has no build step
     and no dependencies, and this keeps that true.

     TODO (deploy): OpenStreetMap's public tile server is fine for low volume
     but is not a production CDN. Point TILE_URL at eMED's licensed tile
     provider before launch, and keep the attribution line accurate. */
  var TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  var TILE = 256;
  var MIN_Z = 6, MAX_Z = 18;
  var DEFAULT_VIEW = { lat: 31.9200, lng: 35.1500, z: 8 };

  var map = null;

  function createMap(viewport, layer) {
    var center = { lat: DEFAULT_VIEW.lat, lng: DEFAULT_VIEW.lng };
    var zoom = DEFAULT_VIEW.z;
    var tiles = {};
    var loaded = 0, errors = 0, announced = false;
    var w = 0, h = 0;
    var pointers = {};
    var dragging = false, moved = false, pinchStart = 0, pinchZoom = 0;
    var last = null;
    var listeners = { move: [], ready: [], fail: [], gesture: [] };
    var anim = null;

    function emit(name, arg) { listeners[name].forEach(function (cb) { cb(arg); }); }

    function project(lat, lng, z) {
      var scale = TILE * Math.pow(2, z);
      var x = (lng + 180) / 360 * scale;
      var s = Math.max(Math.min(Math.sin(lat * Math.PI / 180), 0.9999), -0.9999);
      var y = (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * scale;
      return { x: x, y: y };
    }
    function unproject(x, y, z) {
      var scale = TILE * Math.pow(2, z);
      var lng = x / scale * 360 - 180;
      var n = Math.PI * (1 - 2 * y / scale);
      var lat = 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
      return { lat: lat, lng: lng };
    }

    function measure() {
      var r = viewport.getBoundingClientRect();
      w = r.width; h = r.height;
    }

    /* Tiles are placed relative to the current view origin, never in absolute
       world pixels: at zoom 18 those run to ~2.7e7 px, where the engine's
       layout precision collapses and every tile lands on the same spot. */
    function place(img, tx, ty, originX, originY) {
      img.style.transform = 'translate3d(' + Math.round(tx * TILE - originX) + 'px,' +
                            Math.round(ty * TILE - originY) + 'px,0)';
    }

    function render() {
      if (!w || !h) measure();
      if (!w || !h) return;
      var p = project(center.lat, center.lng, zoom);
      var originX = p.x - w / 2;
      var originY = p.y - h / 2;

      var n = Math.pow(2, zoom);
      var x0 = Math.floor(originX / TILE) - 1, x1 = Math.floor((originX + w) / TILE) + 1;
      var y0 = Math.max(0, Math.floor(originY / TILE) - 1), y1 = Math.min(n - 1, Math.floor((originY + h) / TILE) + 1);
      var keep = {};

      for (var ty = y0; ty <= y1; ty++) {
        for (var tx = x0; tx <= x1; tx++) {
          var wrapped = ((tx % n) + n) % n;
          var key = zoom + '/' + tx + '/' + ty;
          keep[key] = true;
          if (tiles[key]) { place(tiles[key], tx, ty, originX, originY); continue; }
          var img = new Image();
          img.className = 'jmap__tile';
          img.alt = '';
          img.decoding = 'async';
          img.dataset.tx = tx;
          img.dataset.ty = ty;
          place(img, tx, ty, originX, originY);
          img.addEventListener('load', function () {
            this.classList.add('is-loaded');
            loaded++;
            if (!announced) { announced = true; emit('ready'); }
          });
          img.addEventListener('error', function () {
            errors++;
            this.remove();
            if (loaded === 0 && errors >= 3 && !announced) { announced = true; emit('fail'); }
          });
          img.src = TILE_URL.replace('{z}', zoom).replace('{x}', wrapped).replace('{y}', ty);
          tiles[key] = img;
          layer.appendChild(img);
        }
      }
      Object.keys(tiles).forEach(function (key) {
        if (keep[key]) return;
        if (tiles[key].parentNode) tiles[key].remove();
        delete tiles[key];
      });
    }

    function panBy(dx, dy) {
      var p = project(center.lat, center.lng, zoom);
      var next = unproject(p.x + dx, p.y + dy, zoom);
      center = { lat: Math.max(Math.min(next.lat, 85), -85), lng: next.lng };
      render();
      emit('move');
    }

    function setZoom(z, anchor) {
      var nz = Math.max(MIN_Z, Math.min(MAX_Z, z));
      if (nz === zoom) return;
      if (anchor) {
        var p = project(center.lat, center.lng, zoom);
        var ax = p.x + (anchor.x - w / 2);
        var ay = p.y + (anchor.y - h / 2);
        var f = Math.pow(2, nz - zoom);
        var nx = ax * f - (anchor.x - w / 2);
        var ny = ay * f - (anchor.y - h / 2);
        center = unproject(nx, ny, nz);
      }
      zoom = nz;
      /* tiles are keyed by zoom, so drop the old level */
      Object.keys(tiles).forEach(function (k) {
        if (k.indexOf(zoom + '/') !== 0) { if (tiles[k].parentNode) tiles[k].remove(); delete tiles[k]; }
      });
      render();
      emit('move');
    }

    function setView(next, z, animate) {
      if (anim) { cancelAnimationFrame(anim); anim = null; }
      var targetZ = z === undefined || z === null ? zoom : Math.max(MIN_Z, Math.min(MAX_Z, z));
      if (!animate || reduceMotion.matches) {
        center = { lat: next.lat, lng: next.lng };
        if (targetZ !== zoom) {
          Object.keys(tiles).forEach(function (k) { if (tiles[k].parentNode) tiles[k].remove(); delete tiles[k]; });
          zoom = targetZ;
        }
        render(); emit('move');
        return;
      }
      var from = { lat: center.lat, lng: center.lng };
      var startZ = zoom;
      var t0 = performance.now();
      var dur = 420;
      (function frame(now) {
        var k = Math.min(1, (now - t0) / dur);
        var e = 1 - Math.pow(1 - k, 3);
        center = { lat: from.lat + (next.lat - from.lat) * e, lng: from.lng + (next.lng - from.lng) * e };
        var z2 = Math.round(startZ + (targetZ - startZ) * e);
        if (z2 !== zoom) {
          Object.keys(tiles).forEach(function (key) { if (tiles[key].parentNode) tiles[key].remove(); delete tiles[key]; });
          zoom = z2;
        }
        render();
        if (k < 1) anim = requestAnimationFrame(frame);
        else { anim = null; emit('move'); }
      })(performance.now());
    }

    /* --- pointer handling ------------------------------------------------ */
    function pointerCount() { return Object.keys(pointers).length; }
    function pinchDistance() {
      var ks = Object.keys(pointers);
      var a = pointers[ks[0]], b = pointers[ks[1]];
      return Math.hypot(a.x - b.x, a.y - b.y);
    }

    /* A map must never swallow the page. On touch, one finger scrolls the
       page (CSS touch-action) and two move the map; with a mouse, the wheel
       only zooms while Ctrl/Cmd is held. Both cases explain themselves. */
    function isTouch(e) { return e.pointerType === 'touch'; }

    viewport.addEventListener('pointerdown', function (e) {
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      if (isTouch(e) && pointerCount() === 1) { emit('gesture', 'twoFingers'); return; }
      viewport.setPointerCapture(e.pointerId);
      if (pointerCount() === 1) { dragging = true; moved = false; last = { x: e.clientX, y: e.clientY }; viewport.classList.add('is-grabbing'); }
      if (pointerCount() === 2) {
        pinchStart = pinchDistance(); pinchZoom = zoom;
        dragging = true; moved = false; last = null;
        emit('gesture', null);
      }
    });

    viewport.addEventListener('pointermove', function (e) {
      if (!pointers[e.pointerId]) return;
      var prev = pointers[e.pointerId];
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY };

      /* two fingers: pinch to zoom, and drag with the midpoint */
      if (pointerCount() === 2 && isTouch(e)) {
        var dxm = e.clientX - prev.x, dym = e.clientY - prev.y;
        if (Math.abs(dxm) + Math.abs(dym) > 1) { moved = true; panBy(-dxm / 2, -dym / 2); }
      }

      if (pointerCount() === 2 && pinchStart > 0) {
        var ratio = pinchDistance() / pinchStart;
        var target = Math.round(pinchZoom + Math.log(ratio) / Math.LN2);
        if (target !== zoom) setZoom(target, null);
        moved = true;
        return;
      }
      if (!dragging || !last) return;
      var dx = e.clientX - last.x, dy = e.clientY - last.y;
      if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
      last = { x: e.clientX, y: e.clientY };
      panBy(-dx, -dy);
    });

    function release(e) {
      delete pointers[e.pointerId];
      if (pointerCount() < 2) pinchStart = 0;
      if (pointerCount() === 0) { dragging = false; last = null; viewport.classList.remove('is-grabbing'); }
    }
    viewport.addEventListener('pointerup', function (e) {
      var wasMoved = moved;
      var wasTouch = isTouch(e);
      var hadTwo = pointerCount() >= 2;
      release(e);
      if (wasTouch && !hadTwo) return;   /* a one-finger touch never re-centres */
      if (!wasMoved) {
        /* a tap re-centres: that is how the pin gets dragged to a spot */
        var r = viewport.getBoundingClientRect();
        var p = project(center.lat, center.lng, zoom);
        var next = unproject(p.x + (e.clientX - r.left - w / 2), p.y + (e.clientY - r.top - h / 2), zoom);
        setView(next, null, true);
      }
    });
    viewport.addEventListener('pointercancel', release);
    viewport.addEventListener('pointerleave', function (e) { if (pointers[e.pointerId]) release(e); });

    viewport.addEventListener('wheel', function (e) {
      if (!(e.ctrlKey || e.metaKey)) { emit('gesture', 'ctrlZoom'); return; }
      e.preventDefault();
      var r = viewport.getBoundingClientRect();
      setZoom(zoom + (e.deltaY < 0 ? 1 : -1), { x: e.clientX - r.left, y: e.clientY - r.top });
    }, { passive: false });

    viewport.addEventListener('dblclick', function (e) {
      var r = viewport.getBoundingClientRect();
      setZoom(zoom + 1, { x: e.clientX - r.left, y: e.clientY - r.top });
    });

    viewport.addEventListener('keydown', function (e) {
      var stepPx = e.shiftKey ? 160 : 60;
      if (e.key === 'ArrowUp') { e.preventDefault(); panBy(0, -stepPx); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); panBy(0, stepPx); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); panBy(-stepPx, 0); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); panBy(stepPx, 0); }
      else if (e.key === '+' || e.key === '=') { e.preventDefault(); setZoom(zoom + 1); }
      else if (e.key === '-' || e.key === '_') { e.preventDefault(); setZoom(zoom - 1); }
    });

    window.addEventListener('resize', function () { measure(); render(); }, { passive: true });

    return {
      render: function () { measure(); render(); },
      setView: setView,
      zoomBy: function (d) { setZoom(zoom + d); },
      getCenter: function () { return { lat: center.lat, lng: center.lng }; },
      getZoom: function () { return zoom; },
      on: function (name, cb) { if (listeners[name]) listeners[name].push(cb); },
      retry: function () {
        announced = false; loaded = 0; errors = 0;
        Object.keys(tiles).forEach(function (k) { if (tiles[k].parentNode) tiles[k].remove(); delete tiles[k]; });
        measure(); render();
      },
      hasTiles: function () { return loaded > 0; }
    };
  }

  var mapReadyTimer = null;

  function ensureMap() {
    if (map) { map.render(); return; }
    var viewport = $('#mapViewport');
    var layer = $('#mapLayer');
    map = createMap(viewport, layer);

    map.on('ready', function () {
      $('#mapLoading').hidden = true;
      $('#mapError').hidden = true;
      $('#mapRoot').classList.add('is-ready');
      if (mapReadyTimer) { clearTimeout(mapReadyTimer); mapReadyTimer = null; }
    });
    map.on('fail', mapFailed);
    map.on('gesture', showGesture);
    map.on('move', function () {
      if (!state.geo) return;
      /* the pin left the confirmed spot — ask for a fresh confirmation */
      var c = map.getCenter();
      if (Math.abs(c.lat - state.geo.lat) > 1e-6 || Math.abs(c.lng - state.geo.lng) > 1e-6) setConfirmed(false);
    });

    /* restore a previously confirmed pin, otherwise open on the governorate */
    if (state.geo) {
      map.setView(state.geo, 16, false);
      setConfirmed(true, true);
    } else {
      var g = govById(state.data.governorate);
      if (g) map.setView({ lat: g.c[0], lng: g.c[1] }, 12, false);
      else map.render();
    }

    mapReadyTimer = window.setTimeout(function () {
      if (!map.hasTiles()) mapFailed();
    }, 9000);

    wireMapControls();
  }

  function mapFailed() {
    $('#mapLoading').hidden = true;
    $('#mapError').hidden = false;
    $('#mapRoot').classList.add('is-broken');
  }

  function setConfirmed(on, silent) {
    var chip = $('#mapConfirmed');
    var btn = $('#mapConfirm');
    var label = $('#mapConfirmLabel');
    if (on) {
      chip.hidden = false;
      btn.classList.add('is-confirmed');
      label.setAttribute('data-i18n', 'j.loc.reconfirm');
      label.textContent = t('j.loc.reconfirm');
      $('#mapRoot').classList.add('is-set');
      $('#mapErrorMsg').hidden = true;
      var note = $('#mapConfirmedNote');
      if (state.geoLabel) { note.removeAttribute('data-i18n'); note.textContent = state.geoLabel; }
      else { note.setAttribute('data-i18n', 'j.loc.confirmedNote'); note.textContent = t('j.loc.confirmedNote'); }
    } else {
      state.geo = null;
      state.geoLabel = '';
      chip.hidden = true;
      btn.classList.remove('is-confirmed');
      label.setAttribute('data-i18n', 'j.loc.confirm');
      label.textContent = t('j.loc.confirm');
      $('#mapRoot').classList.remove('is-set');
      if (!silent) save();
    }
    paintStage();
  }

  function mapHint(key, isError) {
    var node = $('#mapHint');
    if (!key) { node.textContent = ''; node.removeAttribute('data-i18n'); node.classList.remove('is-error'); return; }
    node.setAttribute('data-i18n', key);
    node.textContent = t(key);
    node.classList.toggle('is-error', !!isError);
  }

  var gestureTimer = null;
  function showGesture(kind) {
    var node = $('#mapGesture');
    if (!node) return;
    if (gestureTimer) { clearTimeout(gestureTimer); gestureTimer = null; }
    if (!kind) { node.classList.remove('is-on'); return; }
    node.setAttribute('data-i18n', 'j.loc.' + kind);
    node.textContent = t('j.loc.' + kind);
    node.classList.add('is-on');
    gestureTimer = window.setTimeout(function () { node.classList.remove('is-on'); }, 1900);
  }

  function locateMe() {
    if (!navigator.geolocation) { mapHint('j.loc.locateFail', true); return; }
    mapHint('j.loc.locating');
    $('#mapLocate').classList.add('is-busy');
    navigator.geolocation.getCurrentPosition(function (pos) {
      $('#mapLocate').classList.remove('is-busy');
      mapHint(null);
      var c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      if (map) map.setView(c, 16, true);
      /* if the tiles never came up, the coordinates alone still let them
         finish — confirm straight away in that case */
      if (map && !map.hasTiles()) { state.geo = c; setConfirmed(true); save(); }
    }, function () {
      $('#mapLocate').classList.remove('is-busy');
      mapHint('j.loc.locateFail', true);
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  }

  /* Nominatim is free and needs no key, but it is rate limited and is not a
     production geocoder. TODO (deploy): point both calls at eMED's own
     geocoding service. Failures degrade quietly — the pin still works. */
  var GEOCODE = 'https://nominatim.openstreetmap.org/search';
  var REVERSE = 'https://nominatim.openstreetmap.org/reverse';

  function wireMapControls() {
    $('#mapZoomIn').addEventListener('click', function () { map.zoomBy(1); });
    $('#mapZoomOut').addEventListener('click', function () { map.zoomBy(-1); });
    $('#mapLocate').addEventListener('click', locateMe);
    $('#mapLocateAlt').addEventListener('click', locateMe);
    $('#mapRetry').addEventListener('click', function () {
      $('#mapError').hidden = true;
      $('#mapLoading').hidden = false;
      $('#mapRoot').classList.remove('is-broken');
      map.retry();
      mapReadyTimer = window.setTimeout(function () { if (!map.hasTiles()) mapFailed(); }, 9000);
    });

    $('#mapConfirm').addEventListener('click', function () {
      var c = map.getCenter();
      state.geo = { lat: Number(c.lat.toFixed(6)), lng: Number(c.lng.toFixed(6)) };
      setConfirmed(true);
      save();
      reverseLabel(state.geo);
    });

    var search = $('#mapSearch');
    var results = $('#mapResults');
    var timer = null;
    var active = -1;
    var hits = [];

    function closeResults() {
      results.hidden = true;
      results.textContent = '';
      search.setAttribute('aria-expanded', 'false');
      search.removeAttribute('aria-activedescendant');
      active = -1;
    }
    function state1(key) {
      results.textContent = '';
      var li = el('li', 'jmap__result jmap__result--state');
      i18nText(li, key);
      results.appendChild(li);
      results.hidden = false;
      search.setAttribute('aria-expanded', 'true');
    }
    function pick(i) {
      var hit = hits[i];
      if (!hit) return;
      closeResults();
      search.value = hit.label;
      map.setView({ lat: hit.lat, lng: hit.lng }, 16, true);
    }
    function markResult(i) {
      $$('.jmap__result', results).forEach(function (li, n) {
        var on = n === i;
        li.classList.toggle('is-active', on);
        li.setAttribute('aria-selected', on ? 'true' : 'false');
        if (on) search.setAttribute('aria-activedescendant', li.id);
      });
      active = i;
    }

    search.addEventListener('input', function () {
      var q = search.value.trim();
      if (timer) clearTimeout(timer);
      if (q.length < 3) { closeResults(); return; }
      state1('j.loc.searching');
      timer = window.setTimeout(function () {
        var url = GEOCODE + '?format=jsonv2&limit=6&accept-language=' + API.getLang() +
                  '&q=' + encodeURIComponent(q);
        fetch(url, { headers: { 'Accept': 'application/json' } })
          .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
          .then(function (json) {
            hits = (json || []).map(function (r) {
              return { label: r.display_name, lat: Number(r.lat), lng: Number(r.lon) };
            });
            if (!hits.length) { state1('j.loc.noResults'); return; }
            results.textContent = '';
            hits.forEach(function (hit, i) {
              var li = el('li', 'jmap__result', { role: 'option', id: 'mres' + i, 'aria-selected': 'false' });
              li.appendChild(icon('i-pin'));
              li.appendChild(el('span', 'jmap__result-text')).textContent = hit.label;
              li.addEventListener('mousedown', function (e) { e.preventDefault(); pick(i); });
              results.appendChild(li);
            });
            results.hidden = false;
            search.setAttribute('aria-expanded', 'true');
          })
          .catch(function () { state1('j.loc.noResults'); });
      }, 520);
    });

    search.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeResults(); return; }
      if (results.hidden || !hits.length) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); markResult(active + 1 >= hits.length ? 0 : active + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); markResult(active - 1 < 0 ? hits.length - 1 : active - 1); }
      else if (e.key === 'Enter') { e.preventDefault(); if (active >= 0) pick(active); }
    });
    search.addEventListener('blur', function () { window.setTimeout(closeResults, 120); });
  }

  function reverseLabel(geo) {
    var url = REVERSE + '?format=jsonv2&zoom=18&accept-language=' + API.getLang() +
              '&lat=' + geo.lat + '&lon=' + geo.lng;
    fetch(url, { headers: { 'Accept': 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function (json) {
        if (!json || !json.display_name) return;
        state.geoLabel = String(json.display_name).split(',').slice(0, 3).join('،');
        save();
        var note = $('#mapConfirmedNote');
        if (state.geo && note) { note.removeAttribute('data-i18n'); note.textContent = state.geoLabel; }
      })
      .catch(function () { /* a label is a nicety; the coordinates are the data */ });
  }

  /* ----------------------------------------------------------- 13 Submit */

  /* TODO (deploy): point this at the real join-request endpoint. While it is
     null the form completes locally so the journey can be reviewed end to
     end, and the payload is logged for inspection. No account is created
     either way — this request only reaches the eMED onboarding team. */
  var ENDPOINT = null;

  function buildPayload() {
    var phoneOf = function (id) {
      var v = String(state.data[id] || '').trim();
      return v ? { country_code: state.data[id + '_cc'] || COUNTRIES[0].d, number: v } : null;
    };
    var payload = {
      provider_type: state.type,
      submitted_at: new Date().toISOString(),
      language: API.getLang(),
      facility: {
        name: state.data.facility_name || '',
        phone: phoneOf('facility_phone'),
        email: state.data.email || ''
      },
      contact: {
        name: state.data.contact_name || '',
        role: state.data.contact_role || '',
        phone: phoneOf('contact_phone')
      },
      location: {
        governorate: state.data.governorate || '',
        governorate_label: govLabel(state.data.governorate),
        city: state.data.city || '',
        street: state.data.street || '',
        lat: state.geo ? state.geo.lat : null,
        lng: state.geo ? state.geo.lng : null
      },
      official_url: state.data.official_url || '',
      has_photo: !!photoFile
    };
    return payload;
  }

  function send(payload) {
    if (!ENDPOINT) {
      /* ?submit=fail exercises the failure state without a backend */
      var fail = false;
      try { fail = new URL(window.location.href).searchParams.get('submit') === 'fail'; } catch (e) {}
      return new Promise(function (resolve, reject) {
        window.setTimeout(function () {
          if (fail) { reject(new Error('simulated')); return; }
          /* no reference number is invented — the success state omits it */
          resolve({});
        }, 1400);
      });
    }
    var body = new FormData();
    body.append('request', JSON.stringify(payload));
    if (photoFile) body.append('photo', photoFile, photoFile.name);
    return fetch(ENDPOINT, { method: 'POST', body: body })
      .then(function (r) { return r.ok ? r.json().catch(function () { return {}; }) : Promise.reject(new Error(r.status)); });
  }

  function setSubmitting(on) {
    state.submitting = on;
    var btn = $('#btnSubmit');
    var label = $('#btnSubmitLabel');
    btn.disabled = on;
    btn.setAttribute('aria-busy', on ? 'true' : 'false');
    btn.classList.toggle('is-busy', on);
    label.setAttribute('data-i18n', on ? 'j.submitting' : 'j.submit');
    label.textContent = t(on ? 'j.submitting' : 'j.submit');
    $('#btnBack').disabled = on;
  }

  function submitRequest() {
    if (state.submitting) return;

    /* re-check every step, not only the one on screen */
    var bad = validateStep(1).concat(validateStep(2)).concat(validateStep(3));
    if (bad.length) {
      var step = state.type ? (validateStep(2).length ? 2 : 3) : 1;
      goTo(step);
      window.setTimeout(function () { focusFirstInvalid(bad); }, 80);
      return;
    }

    $('#submitError').hidden = true;
    setSubmitting(true);

    send(buildPayload()).then(function (res) {
      setSubmitting(false);
      showSuccess(res && (res.reference || res.request_number));
    }).catch(function () {
      setSubmitting(false);
      var alertBox = $('#submitError');
      alertBox.hidden = false;
      $('#btnSubmitLabel').setAttribute('data-i18n', 'j.fail.retry');
      $('#btnSubmitLabel').textContent = t('j.fail.retry');
      alertBox.scrollIntoView({ block: 'center', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    });
  }

  function showSuccess(reference) {
    clearSaved();
    $('#joinForm').hidden = true;
    $('.jprog').hidden = true;
    $('.join__intro').hidden = true;
    var panel = $('#successPanel');
    panel.hidden = false;
    if (reference) {
      $('#doneRefValue').textContent = reference;
      $('#doneRef').hidden = false;
    }
    $('#joinStage').classList.add('is-done');
    window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    window.setTimeout(function () { $('#doneTitle').focus({ preventScroll: true }); }, 120);
  }

  /* ------------------------------------------------------------- 14 Boot */

  function renderTypes() {
    var group = $('#typeGroup');
    var legend = $('legend', group);
    group.textContent = '';
    if (legend) group.appendChild(legend);

    TYPES.forEach(function (type) {
      var label = el('label', 'jtype', { 'data-type': type.id });
      /* name from the title alone, sentence as the description — otherwise a
         screen reader reads the whole card as one run-on name */
      var input = el('input', 'sr-only jtype__input', {
        type: 'radio', name: 'provider_type', value: type.id, id: 'type_' + type.id,
        'aria-labelledby': 'tt_' + type.id, 'aria-describedby': 'td_' + type.id
      });
      if (state.type === type.id) input.checked = true;

      var art = el('span', 'jtype__art', { 'aria-hidden': 'true' });
      art.appendChild(icon(type.icon, 'jtype__icon'));
      var check = el('span', 'jtype__check', { 'aria-hidden': 'true' });
      check.appendChild(icon('i-check'));

      var body = el('span', 'jtype__body');
      var title = el('span', 'jtype__title', { id: 'tt_' + type.id });
      i18nText(title, 'j.type.' + type.id);
      var desc = el('span', 'jtype__desc', { id: 'td_' + type.id });
      i18nText(desc, 'j.type.' + type.id + 'Desc');
      body.appendChild(title);
      body.appendChild(desc);

      label.appendChild(input);
      label.appendChild(art);
      label.appendChild(body);
      label.appendChild(check);

      input.addEventListener('change', function () {
        markChecked(group, '.jtype');
        chooseType(type.id);
      });
      group.appendChild(label);
    });
    markChecked(group, '.jtype');
    applyI18n(group);
  }

  /* Warn only about what would actually be lost: fields the current type owns
     that the next one does not. Shared fields (name, phone, email, location)
     survive the switch, so switching after typing a name asks nothing. */
  function wouldLose(from, to) {
    if (!from || from === to) return false;
    var keep = {};
    fieldsFor(to).forEach(function (field) { keep[field.id] = true; });
    LOCATION_FIELDS.forEach(function (field) { keep[field.id] = true; });
    return fieldsFor(from).some(function (field) {
      if (keep[field.id]) return false;
      if (field.kind === 'photo') return !!photoFile;
      return String(state.data[field.id] || '').trim() !== '';
    });
  }

  function applyType(next) {
    /* drop only what the old type owned; location and shared fields stay */
    var keepIds = {};
    fieldsFor(next).forEach(function (field) { keepIds[field.id] = true; });
    LOCATION_FIELDS.forEach(function (field) { keepIds[field.id] = true; });
    Object.keys(state.data).forEach(function (key) {
      var base = key.replace(/_cc$/, '');
      if (!keepIds[base]) delete state.data[key];
    });
    if (!keepIds.photo) { photoFile = null; state.photoName = ''; }
    state.type = next;
    $('#typeError').hidden = true;
    save();
    paintStage();
    /* the details step may already be built from the previous type */
    if (state.step === 2) renderStep2();
    if (state.step === 3) enterLocation();
  }

  /* Choosing a type never jumps a step by itself. The reader confirms with
     the Continue action, which only appears once a choice exists. */
  function chooseType(next) {
    if (wouldLose(state.type, next)) { openSwitchModal(next); return; }
    applyType(next);
    paintActions();
  }

  var modalReturn = null;
  function openSwitchModal(next) {
    var modal = $('#switchModal');
    modalReturn = document.activeElement;
    modal.hidden = false;
    requestAnimationFrame(function () { modal.classList.add('is-open'); });
    $('#swTitle').focus({ preventScroll: true });

    function close(apply) {
      modal.classList.remove('is-open');
      var finish = function () { modal.hidden = true; };
      if (reduceMotion.matches) finish(); else window.setTimeout(finish, 220);
      document.removeEventListener('keydown', onKey);
      $('#swConfirm').removeEventListener('click', onConfirm);
      $('#swCancel').removeEventListener('click', onCancel);
      $('#switchScrim').removeEventListener('click', onCancel);

      if (apply) {
        applyType(next);
        renderTypes();
        paintActions();
      } else {
        renderTypes(); /* put the radio back on the type that is still current */
        if (modalReturn && modalReturn.focus) modalReturn.focus();
      }
    }
    function onConfirm() { close(true); }
    function onCancel() { close(false); }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(false); return; }
      if (e.key !== 'Tab') return;
      var items = $$('button', modal);
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    $('#swConfirm').addEventListener('click', onConfirm);
    $('#swCancel').addEventListener('click', onCancel);
    $('#switchScrim').addEventListener('click', onCancel);
    document.addEventListener('keydown', onKey);
  }

  function onNext() {
    var bad = validateStep(state.step);
    if (bad.length) {
      announce(bad.length === 1 ? t('j.err.summaryOne')
                                : bad.length + ' ' + t('j.err.summaryMany'));
      focusFirstInvalid(bad);
      return;
    }
    goTo(Math.min(state.step + 1, LAST_STEP));
  }

  function boot() {
    restore();
    renderTypes();

    $('#btnNext').addEventListener('click', onNext);
    $$('.jprog__btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var n = Number(btn.getAttribute('data-goto'));
        if (n < state.step) goTo(n);
      });
    });
    $('#btnBack').addEventListener('click', function () { goTo(Math.max(state.step - 1, 1)); });
    $('#joinForm').addEventListener('submit', function (e) {
      e.preventDefault();
      submitRequest();
    });
    /* Enter inside a text field advances instead of submitting mid-journey */
    $('#joinForm').addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      var tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'textarea') return;
      if (state.step !== LAST_STEP && tag === 'input') { e.preventDefault(); onNext(); }
    });

    document.addEventListener('emed:langchange', function () {
      /* app.js has already re-run applyI18n over the whole document; only the
         nodes whose text is data, not a key, need rebuilding */
      var gov = $('#f_governorate');
      if (gov) renderGovOptions(gov, state.data.governorate);
      $$('.jphone__cc option').forEach(function (o) {
        o.title = o.getAttribute('data-' + API.getLang()) || o.title;
      });
      if (state.step === 4) renderReview();
      paintStage();
    });

    goTo(state.step, { silent: true, force: true });
    paintStage();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
