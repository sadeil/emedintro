# eMED — public website

Arabic-first (RTL) public site for eMED, with a complete English (LTR) version.
Static HTML/CSS/JS. **No build step, no dependencies, no framework.**

```
index.html                     the homepage
join.html                      provider join request
site.webmanifest
assets/css/styles.css          design system + all homepage section styles
assets/css/join.css            join page styles (same tokens, no new ones)
assets/js/i18n.js              every homepage string, ar + en
assets/js/join-i18n.js         every join page string, ar + en
assets/js/app.js               shared behaviour (nav, search, tabs, reveal, i18n)
assets/js/join.js              the join journey (steps, fields, map, submit)
assets/img/                    logo lockups, app icons, OG card, store badges
assets/brand/                  supplied logo artwork (source only — omit from the deploy bundle)
.claude/launch.json            local preview config
```

## Brand assets

The logo was vectorised from `assets/brand/emed-logo-source.png` and lives in
four files. Colours are taken straight from that artwork: teal `#12AEAE`,
navy `#022656`.

| File | Use |
|------|-----|
| `emed-logo.svg` | full lockup, light surfaces (header). Ratio 1756:447 |
| `emed-logo-light.svg` | same lockup reversed — navy knocked out to white, for `.on-dark` (footer, OG card) |
| `emed-mark.svg` | the teal `e` on its own, for square/tight placements |
| `favicon.svg` + `icon-*.png`, `apple-touch-icon.png` | the `e` on a navy tile |

Size the lockup with **height only** — `.logo img` is `width:auto`, and the
height comes from the `--logo-h` custom property so the header, the stuck
header, the footer and each breakpoint can each set their own.

Run locally:

```bash
python -m http.server 5173
```

---

## The join page (`join.html`)

A four-step request — **نوع مقدم الخدمة → المعلومات الأساسية → الموقع →
المراجعة** — that collects the minimum the eMED team needs to identify a
provider, find the facility and get in touch. Roughly a minute or two.

**The copy speaks to the provider, not about them.** "أخبرنا عن عيادتك", not
"بيانات العيادة"; "من يمكننا التواصل معه؟", not "جهة الاتصال"; "حدّد موقعك",
not "يجب إدخال الموقع". Second person throughout, in both languages. eMED is
a **منظومة** everywhere on this page, never a شبكة — keep that consistent if
you add copy.

**Choosing a type never moves the reader.** The Continue action does not exist
until a choice is made; once one is, it appears and names the choice back
("متابعة كطبيب"). The stepper is navigable backwards only: finished steps are
real buttons, the current and unreached ones are disabled.

It is **not** onboarding. It creates no account and asks for no credential.
There is no username, password, licence number, national ID, tax or commercial
registration, bank detail, certificate, CV, doctor roster, service catalogue,
price, insurance contract or opening hour anywhere on it — and none should be
added. Those belong to whatever internal process follows approval.

**Six provider types**, each with its own field set, all built from one schema
in `join.js` §02 rather than six duplicated forms: doctor, hospital, clinic /
medical centre, pharmacy, laboratory, imaging centre. Insurance companies and
TPAs are not among them, matching the rest of the site. A doctor is always
attached to a clinic — the clinic block is mandatory, and the page never asks
whether one exists.

**Shared shape.** `provider_type`, facility name / phone / email, contact
person where the type has one, and a location for all six. Doctors add their
own name, specialty and mobile plus the clinic; organisations add the contact
person's name, role and phone. Optional everywhere: a link to one social media
page (Facebook, LinkedIn, Instagram or another platform) and one facility
photo.

**The stage** (`join.js` §11) is the dark panel beside the form — about 30% of
the desktop width to the form's 70%. It is not decoration: it assembles a live
profile preview as the form is filled in, and its shape follows the chosen
type. A doctor gets a person-inside-a-clinic profile (name, specialty, the
clinic as a row); the five organisation types get the facility itself. The
capability chips under the preview, the three-beat story (منشأتك → منظومة eMED
→ يكتشفك المرضى, or عيادتك → … → يصل إليك المرضى for a doctor) and the panel
headline all change with the type. Below the desktop split the preview drops
away and the panel becomes a short closing note under the form.

Everything the chips name — departments, specialties, services,
opening hours, availability — is a capability eMED already has. Do not add one
that isn't.

**Location** is governorate → city/area → street description → a pin the
provider confirms on a map. Coordinates are stored, never shown as latitude
and longitude fields. The confirmed pin is required; moving the map afterwards
asks for a fresh confirmation.

**The map is hand-built** (`join.js` §12) — raster tiles, drag to pan, pinch /
Ctrl+wheel / buttons to zoom, a search box, "use my location", and a fixed
centre pin. No mapping library, so the site keeps its no-dependency rule. Two
gestures are deliberately not hijacked: one finger scrolls the page (two move
the map) and a bare wheel scrolls the page (Ctrl+wheel zooms). Both explain
themselves with an overlay hint the first time they are tried.

**State** lives in `sessionStorage` under `emed:join`, so going back a step,
or reloading, keeps what was typed. It is cleared on success. The chosen photo
is not stored — a file input cannot be repopulated from storage. Switching
provider type only warns when the switch would actually drop something that
was filled in; shared fields and the location always survive.

**Validation** waits for the reader. Format errors appear on blur, "required"
only when Continue is pressed, and any error clears as soon as the field is
valid. Messages are plain Arabic sentences, associated with their field
through `aria-describedby` / `aria-invalid`.

### Join page TODOs

| # | What | Where |
|---|------|-------|
| 1 | **Submit endpoint.** `ENDPOINT` is `null`, so the journey completes locally and the payload is built but not sent. Point it at the real join-request API; it posts `FormData` with a JSON `request` field and the optional `photo`. | `join.js` §13 |
| 2 | **Request number.** The success state shows one *only* if the response carries `reference` or `request_number`. Nothing is invented — leave it that way. | `showSuccess()` |
| 3 | **Tile provider.** `TILE_URL` uses OpenStreetMap's public tile server, which is fine for review but is not a production CDN and has a usage policy. Swap it for eMED's licensed provider and keep the attribution line honest. | `join.js` §12 |
| 4 | **Geocoding.** Map search and the reverse-geocoded location label call Nominatim. Both fail quietly and neither is required to finish the form. Point them at eMED's own service. | `GEOCODE` / `REVERSE` |
| 5 | **Coverage list.** `GOVERNORATES` carries the Palestinian governorates with a few areas and a map centre each. Confirm it with the product owner, or replace it wholesale if eMED launches elsewhere. `COUNTRIES` likewise sets the default dial code. | `join.js` §01 |
| 6 | **Provider portal link.** There is deliberately none: an unavailable destination is not advertised during onboarding. When the portal ships, an "already on eMED?" exit can be added back to the hero. | — |
| 7 | **Specialties.** The doctor combobox reads the specialties already in `EMED_I18N.suggestions` and accepts free text. Point it at the real specialty dataset when there is one. | `specialties()` |

Append `?submit=fail` to the URL to exercise the failure state: the request is
rejected, the entered data stays put, and the button offers to send again.

### What the join page adds to `app.js`

Two small, backwards-compatible hooks:

- `window.EMED` — `t()`, `applyI18n()`, `getLang()`, `setLanguage()`. The only
  surface `join.js` uses.
- `<html data-title-key data-desc-key>` — a page may name its own keys for
  `<title>` and the meta description. Without them the homepage's `meta.*`
  keys are used exactly as before.

---

## Before this goes live

Everything below is deliberately a placeholder and is marked with a `TODO`
comment at the point of use.

| # | What | Where |
|---|------|-------|
| 1 | **Production origin** for `<link rel="canonical">` and `og:url` (commented out until set). | `index.html` `<head>` |
| 2 | **OG image as PNG.** Export `og-image.svg` at 1200×630 and repoint `og:image`; several crawlers do not rasterise SVG. The card already carries the real lockup. | `index.html` `<head>` |
| 3 | **App Store / Google Play badges and links.** Current badges are correctly-proportioned placeholders — replace with the official artwork from Apple and Google. | `assets/img/badge-*.svg`, `.store-badge` hrefs |
| 4 | **Download QR code** (desktop only block). | `.qr-block` |
| 5 | **Provider portal URL** — still anchors to `#providers`. (The join CTAs now point at `join.html`.) | header, providers section, footer, closing CTA |
| 6 | **Support channels** (email / contact / provider support). | `.support-card` |
| 7 | **Privacy policy and terms pages** — the only two `href="#"` links on the page. | footer, legal column |
| 8 | **Search results page.** The form calls `preventDefault()`; point it at the real `/search` route. | `initSearch()` in `app.js` |
| 9 | **Suggestion endpoint.** `suggestionsFor()` filters a local list; swap for the real request. It is already debounced and renders loading / empty states. | `app.js`, `EMED_I18N.suggestions` |
| 10 | **Reverse geocoding.** "Use my location" gets real coordinates but writes a generic label; resolve it to an area name. | `initSearch()` geolocation handler |

### Sample content

The phone screens and the provider portal preview are **hand-built HTML/CSS
renderings**, not screenshots, because no exported app screens were available.
They use sample provider names (`ui.d1`, `ui.d2`, `ui.d3`, `ui.m1`, `ui.m2` in
`i18n.js`) marked `SAMPLE DATA` in the markup.

Replace them with real exported screenshots when you have them — the markup is
isolated under `.phone` / `.portal` in `styles.css` §19 precisely so it can be
swapped for `<img>` without touching anything else.

---

## Two rules the content follows

**1 · Only real capabilities are described.** The copy covers: discovering
providers, viewing a provider profile (doctors, specialties,
services, opening hours), booking and managing appointments in the app,
managing family members, linking insurance details, seeing in-network
providers, and the digital healthcare services eMED makes available.

Nothing on this page claims telemedicine, prescriptions, medical records, lab
results, payments, claims, medication delivery, AI diagnosis or emergency
services. If a capability is added, add its string to `i18n.js` in **both**
languages — the header comment in that file repeats this rule.

**2 · No unverified trust or compliance claims.** The trust section states only
that provider information is reviewed before publication and that published
privacy/terms policies govern data use. There is no HIPAA, ISO, encryption
standard or credential-verification claim, and `trust.note` says so explicitly.
Do not add one until it has actually been obtained.

### Social proof is switched off

`<section id="proof" data-proof hidden>` stays hidden. `initProof()` in
`app.js` reveals it **only** when every `<dt data-value="…">` holds a value:

```html
<div class="proof-item"><dt data-value="1,240"></dt><dd data-i18n="proof.providers"></dd></div>
```

Fill in verified figures and the section appears. Leave one blank and it stays
hidden. Do not invent numbers.

---

## Language

Arabic (`lang="ar" dir="rtl"`) is the default. English is reachable three ways:
the header toggle, the drawer toggle, or `?lang=en`. The choice persists in
`localStorage` and is reflected in the URL, which matches the `hreflang`
alternates in `<head>`.

Switching updates `lang`, `dir`, `<title>`, the meta description, OG tags, and
every `data-i18n*` node — including content rendered at runtime (provider tab
content, the app chip).

Layout mirrors automatically because the CSS uses logical properties
(`inset-inline-*`, `margin-inline`, `padding-inline`). Two things are mirrored
explicitly: arrow icons (`[dir="rtl"] .icon-arrow`) and the hero connector SVG,
whose path coordinates are drawn for RTL.

**Adding a string:** add the key to *both* `AR` and `EN` in `i18n.js`, then use
`data-i18n="key"` (text), `data-i18n-html="key"` (only when the copy carries
`<em>`/`<strong>`/`<br>`), or `data-i18n-attr="placeholder:key"` (attributes,
semicolon-separated for several).

---

## Design system

All tokens are at the top of `styles.css` (§01). Change them there, not at call
sites.

- **Colour** — teal ramp (`--brand-50…900`) and navy ramp (`--navy-600…900`),
  mapped to semantic roles: `--text-primary/secondary/tertiary`, `--surface*`,
  `--border*`, plus `--success/--warning/--error/--info`. `--brand-600` is the
  primary action colour because it is the lightest teal that holds 5.16:1 with
  white text; `--brand-500` is for fills and gradients only, never for small
  text on white. **Note:** the ramp predates the official logo. The logo's own
  teal `#12AEAE` sits between `--brand-400` and `--brand-500`, and its navy
  `#022656` is darker than `--navy-800` — so the lockup reads slightly brighter
  and slightly deeper than the UI around it. The logo files keep the true brand
  colours; realigning the ramp to them is a design decision that has not been
  taken.
- **Type** — one superfamily, IBM Plex Sans Arabic (covers Latin too), loaded
  non-render-blocking. Sizes are `clamp()`-fluid. Arabic overrides the Latin
  line-height and measure via `html[lang="ar"]`.
- **Space / radius / elevation** — `--s-1…14`, `--r-xs…full`, `--sh-xs…xl`.
  Section rhythm is `--section-y` / `--section-y-lg`.
- **Containers** — `--container` 1200, `--container-wide` 1340 (1400 at ≥1600),
  `--container-narrow` 780, gutter `clamp(20px, 4vw, 48px)`.

### Motion

Reveal-on-scroll, the hero float/parallax, the discover care field and the
app carousel are all gated on `prefers-reduced-motion`, which is honoured
globally in §20 — reduced motion means the page renders fully and statically,
never blank. The app carousel additionally pauses on hover, on focus, on
interaction, and while the section is off screen.

### Breakpoints

Designed against 375 · 390 · 430 · 560 · 700 · 768 · 900 · 1024 · 1080 · 1180 ·
1280 · 1366 · 1440 · 1600+, in `styles.css` §21. The load-bearing ones:

- **1180** — the header drops the portal button (nav still carries the route).
- **1080** — navigation moves into the drawer; all split layouts go single-column.
- **900** — the six discovery categories become a two-up grid.
- **700** — the composed search control unstacks into rows.
- **560** — hero floats reduce to two; category descriptions hide to keep the
  grid two-up and compact rather than a tall stack.

### Accessibility

Semantic landmarks and a single `h1`; the drawer is a real focus-trapped
`role="dialog"` with Escape-to-close and focus restoration; the search field is
a proper `combobox` with `aria-activedescendant` and arrow/Enter/Escape keys;
the app and provider tabs implement the tablist pattern with arrow keys that
follow reading direction; the FAQ is a standard disclosure pattern. Body text
meets
WCAG AA against every surface it sits on. State is never signalled by colour
alone — selected items also change weight, icon fill and `aria-*`.

---

## Not included, deliberately

There is **no section aimed at insurance companies or TPAs**. This site's
audiences are patients, individuals and families on one side, and healthcare
providers — doctors, hospitals, clinics, medical centres, pharmacies,
laboratories, imaging centres — on the other. Insurance appears only where it
touches those journeys: linking your details, seeing in-network providers, and
provider-side insurance connectivity where agreements exist. Enterprise
insurance products (eMED Core, eMED Claims) have their own entry points.

`eMED_Healthcare_Homepage_Sketch_v1.html` is the original review sketch that
this redesign replaces. It is kept for reference — **remove it from the deploy
bundle** so it is not publicly reachable.
