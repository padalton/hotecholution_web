# CLAUDE.md — orientation for future Claude sessions on this repo

> Read this **before** touching any file. The codebase is small but has several non-obvious rules and a build pipeline that will silently undo your edits if you don't know it exists.

## What this is

The corporate marketing site for **HoTechOlution** — a one-person, apaleo-native SaaS studio in Vienna run by Stefan Wölflinger. Three live products: GIMSI, GoClearBalance, BMD Connector. The site is pure static HTML/CSS/JS, pre-rendered per language at build time, deployed to Cloudflare Pages.

- Production: `https://hotecholution.com` (EN at `/`, DE at `/de/`)
- Local dev: `https://hotecholution-web.ddev.site`
- Production build: `npm run build` → `dist/`
- Deploy: push to `main` → Cloudflare Pages auto-builds & ships

---

## Hard constraints (non-negotiables — do NOT break)

These are content/positioning rules that don't appear in the code. A fresh Claude session will violate them by default unless told.

1. **Zero third-party runtime requests.** Fonts are self-hosted under `/assets/fonts/`. No Google Fonts (not even preconnect). No analytics that set cookies or send PII. No embedded HubSpot/Calendly widgets, no social SDKs, no map embeds. Stefan is a *Geprüfter Datenschutzexperte* — the site itself must reflect that. The strict CSP in `/_headers` enforces this; if you need to add a third-party domain, you must be certain the user is OK with it.
2. **No cookie banner.** The site is engineered to require no consent banner under TTDSG / Austrian DSG. Don't add anything that would change that (analytics with cookies, marketing pixels, etc.).
3. **No DATEV in BMD Connector marketing.** BMD Connector is positioned as an **Austrian-market specialist** for BMD format only. The one place DATEV appears is the "Does BMD Connector support DATEV?" FAQ, framed positively as deliberate specialization. Do not reintroduce "BMD & DATEV" / "BMD or DATEV" anywhere else.
4. **No Wiesener quote.** Stefan is no longer a CTO. The `app.js` and CSS used to have a Wiesener "highly skilled and visionary CTO" testimonial — it was removed. Do not re-add it.
5. **No mention of Stefan's day job at raus.life.** Unrelated to HoTechOlution. Keep off the site.
6. **No teasers for unreleased products.** GuestPrivacy and apaleoReport are in the dossier as future concepts — never on the site. Telegraphing roadmap to competitors is the concern.
7. **v3 prices are authoritative.** BMD €20/hotel/mo single tier · GIMSI €49 Light (≤60 rooms, ≤3 hotels) / €0.90 Enterprise · GoClearBalance €29 Light (≤30 rooms, ≤2 properties) / €1.50 Enterprise. Existing customers grandfathered for life. The live product sites (`gimsi.app`, `bmd.hotecholution.com`) still show older prices — that's their problem to update; do not match them.
8. **Brand voice:** confident, engineer-credible, plain-spoken, anti-hype. No "revolutionize", "unlock potential", "leverage". The Vercel-style "Develop. Preview. Ship." brevity works.
9. **Phone is never in the static HTML.** `app.js` assembles `+436769195542` at click time on the `#phoneReveal` button. The legal pages (Impressum, Datenschutz) are the exception — Austrian §5 ECG requires the phone in the Impressum, so it's visible there only.
10. **Founder framing on product pages** uses a 2-sentence credibility blurb pointing to `/#founder`. Don't move the founder section onto product pages — that's the corporate-site role.

---

## Stack

| | |
|---|---|
| Frontend | Pure static HTML + CSS + JS (vanilla, no framework) |
| Build | Node script (`build.mjs`), zero npm deps |
| i18n | Build-time pre-render from `i18n.mjs` (single dictionary, two languages) |
| Local dev | DDEV (`.ddev/config.yaml`, docroot=`dist`, type=`php` with no PHP code) |
| Hosting | Cloudflare Pages (`_headers` for CSP/HSTS/cache; auto-deploy on push) |
| Mail | Stays at Hetzner — Cloudflare DNS keeps MX records grey-clouded |

---

## Architecture: how the build works (read this carefully)

1. **`i18n.mjs`** exports `I18N.en` and `I18N.de` — the single source of truth for translated strings on the **homepage**.
2. **`index.html`** is a *template*: every translatable element carries `data-i18n="key"` and a placeholder text. The placeholder is just a fallback; the build substitutes the real string from `i18n.mjs`.
   - ⚠️ **Editing the placeholder text in `index.html` does nothing visible** until you also update `i18n.mjs`. The build will overwrite your placeholder edit with the dictionary value.
3. **`build.mjs`** reads `index.html`, walks every `data-i18n` element, and emits two pre-rendered HTML files:
   - `dist/index.html` (EN, `<html lang="en">`)
   - `dist/de/index.html` (DE, `<html lang="de">`)
4. **Product landing pages** (`products/<slug>/index.html` + `de/products/<slug>/index.html`) and **legal pages** (`impressum.html`, `impressum-en.html`, `datenschutz.html`, `privacy-policy.html`) are **standalone files** that don't use `data-i18n`. The build copies them verbatim into `dist/`. To change a product page string, edit the file directly.
5. **Runtime `app.js`** reads `window.HTO_STRINGS` (injected by `build.mjs` into each pre-rendered page) for the small subset of strings that JS needs at runtime (cycler words, calculator labels, phone-reveal label). It falls back to `<html lang>` if HTO_STRINGS is missing (this is how legal pages still get correct German/English UI strings).

### When you edit, ALWAYS rebuild

```bash
npm run build
```

…or DDEV will keep serving stale content from `dist/`.

---

## File layout

```
/
├── index.html                  # Homepage TEMPLATE (data-i18n elements; build substitutes)
├── i18n.mjs                    # Single source of truth for homepage copy (EN + DE)
├── app.js                      # Runtime UI (cycler, mobile menu, calc, lang switch, phone reveal)
├── styles.css                  # All styles. Includes @font-face for self-hosted fonts.
├── build.mjs                   # Pre-render + copy script (no npm deps)
├── package.json                # Just defines `npm run build`
├── _headers                    # Cloudflare Pages: CSP, HSTS, Permissions-Policy, cache
├── robots.txt
├── sitemap.xml                 # Hand-maintained — keep in sync when adding pages
├── llms.txt                    # Short LLM-discoverability summary (~50 lines)
├── llms-full.txt               # Long LLM summary with full product breakdowns
├── impressum.html              # DE Impressum (standalone, §5 ECG-compliant)
├── impressum-en.html           # EN Imprint
├── datenschutz.html            # DE Datenschutzerklärung
├── privacy-policy.html         # EN Privacy Policy
├── products/<slug>/index.html  # EN product landing pages (standalone)
├── de/products/<slug>/index.html # DE product landing pages (standalone)
├── assets/
│   ├── fonts/*.woff2           # Self-hosted SIL OFL fonts (Poppins, IBM Plex)
│   ├── icon-*.{png,avif,webp}  # Product icons in 3 formats (picture-tag fallback chain)
│   ├── stefan.{jpg,avif,webp}  # Founder photo
│   ├── og-card.png             # 1200×630 Open Graph card (shared across all pages)
│   └── favicon.ico, icon-{32,192}.png, apple-touch-icon.png
├── .ddev/                      # Gitignored. Local DDEV config.
├── TEMP/                       # Gitignored. Playwright screenshots, throwaway artifacts.
└── dist/                       # Gitignored. Build output. Served by DDEV and Cloudflare Pages.
```

---

## Recipes — how to change common things

### Change a product price

A price lives in **multiple places**. Update all of them or the JSON-LD will drift from the visible price.

For a homepage price change (e.g., GIMSI Light €49 → €X):

1. `i18n.mjs` — search for the price string in both `I18N.en` and `I18N.de` (e.g., `prod.gimsi.lightnote`, `prod.bmd.note`). The visible homepage card prices are inline in `index.html` (search for `€49`); update those too.
2. `index.html` — search for the price in JSON-LD `Offer` blocks (e.g., `"price": "49"`).
3. `products/<slug>/index.html` AND `de/products/<slug>/index.html` — both the `pricing-amount` in the pricing-card AND the `Offer` blocks in JSON-LD.
4. `app.js` — the pricing calculator has hardcoded numbers in `buildCalc()` (`49 * props`, `0.90 * totalRooms`, etc.). Update if the price changes.
5. `llms.txt` and `llms-full.txt` — search for the price and the per-room/per-hotel units.
6. Rebuild and Lighthouse-check the new price is visible everywhere.

### Add a new product (e.g., a fourth one)

This is a multi-hour job. In rough order:

1. **Decide on slug, English name, German name, v3 pricing.**
2. **Add product icon to `/assets/`** at native ≥256×256 PNG; regenerate AVIF (`avifenc --min 30 --max 50`) and WebP (`magick … -quality 80`) variants.
3. **Add homepage product card** in `index.html` (between the 3 existing `.prod` articles in the Products section). Add corresponding `i18n.mjs` keys for kicker, description, features, pricing notes, trial, link text. Add a JSON-LD `SoftwareApplication` block to the `@graph` in the head.
4. **Update pricing calculator** in `app.js` (`buildCalc()`) to include the new product.
5. **Create product landing pages** at `products/<slug>/index.html` and `de/products/<slug>/index.html`. Use one of the existing pages as the template — they're not generated, copy-paste-edit.
6. **Update sitemap.xml** with both URLs (EN + DE).
7. **Update llms.txt and llms-full.txt** with the new product info.
8. **Update the footer "Products" list** in `i18n.mjs` and `index.html` AND on each of the 6 existing product landing pages AND on each of the 4 legal pages (the footers are duplicated, not centralized).
9. Rebuild, verify all 6 (now 8) product landing pages render, JSON-LD validates.

### Add a new FAQ entry to the homepage

1. `i18n.mjs` — add `faq.qN` / `faq.aN` keys to both `I18N.en` and `I18N.de`.
2. `index.html` — add the `<details class="faq-item">` element AND extend the `FAQPage.mainEntity` JSON-LD array in the head.

### Add a new FAQ entry to a product landing page

Edit the product page directly (it's a standalone file). Add the `<details>` element AND the `FAQPage.mainEntity` entry in the head. Repeat in the DE counterpart.

### Swap a product icon

```bash
cp <new-source.png> assets/icon-<slug>.png
avifenc --min 30 --max 50 assets/icon-<slug>.png assets/icon-<slug>.avif
magick assets/icon-<slug>.png -quality 80 assets/icon-<slug>.webp
npm run build
```

Hero on product pages displays at ~327×327 CSS pixels, so source should be ≥400×400 to look sharp. Product cards on homepage display at 60×60.

### Add a third language

1. Add `I18N.fr` (or whatever) to `i18n.mjs`.
2. Add the language to `build.mjs`'s render loop (currently hardcoded for `en` + `de`).
3. Update `build.mjs`'s lang-toggle button regex to handle three states.
4. Add a third `data-lang-href` per button on legal pages and product landing pages.
5. Update `app.js`'s `DEFAULTS` and language router to handle the new prefix.
6. Update `sitemap.xml` and `<link rel="alternate" hreflang>` blocks on every page.

This is a substantial change — flag it as such before committing.

### Verify GDPR / no-cookie-banner posture is intact

```bash
ddev start
# Open https://hotecholution-web.ddev.site in Chrome DevTools.
# Network panel → reload with cache off → filter "Domains".
# The list MUST contain only `hotecholution-web.ddev.site`.
# Any other domain is a regression.
```

Repeat for `/de/`, `/products/<slug>/`, `/de/products/<slug>/`, `/impressum.html`, `/datenschutz.html`.

---

## Authoritative facts (do not contradict)

- **Address:** Marktgemeindegasse 63/D8, 1230 Vienna, Austria
- **Email:** stefan@hotecholution.com
- **Phone:** +43 676 919 55 42 (assembled in JS at click time; visible only on legal pages by law)
- **Booking link:** https://meetings-eu1.hubspot.com/stefan-woelflinger (plain link, never an iframe)
- **WKO firm directory:** https://firmen.wko.at/stefan-w%C3%B6lflinger/wien/?firmaid=1351eeb1-2c33-4a96-8265-73894fd4a72d
- **WKO firmaid:** 1351eeb1-2c33-4a96-8265-73894fd4a72d
- **Founding date:** 2023-05
- **Legal form:** Einzelunternehmen (sole proprietorship), Kleinunternehmer §6(1)(27) UStG (no VAT charged)
- **GIMSI metrics (use conservatively):** 27+ hotels, 7,000+ offers, 110,000+ reservations, certified in apaleo App Store Aug 2024
- **apaleo facts:** 2,000+ properties, 85,000+ units, 30+ countries (as of 2025; sourced from apaleo's own communications 2024–2025)

---

## Source of truth for company facts

`/mnt/nas/nextcloud/work/HoTechOlution/Master_Informaton_Dossier_HoTechOlution_20260530.md`

Treat this as canonical when in doubt about products, prices, founder credentials, ecosystem facts. **But apply the overlays from §"Hard constraints" above** — the dossier mentions things (raus.life, Wiesener quote, roadmap products) that are deliberately omitted from public materials.

---

## Local dev cheat sheet

```bash
# First time
npm run build && ddev start

# Iterate on copy in i18n.mjs
npm run build  # rebuilds dist/; nginx serves it immediately

# Iterate on legal pages or product landing pages (no i18n substitution)
npm run build  # build still needed to copy the file into dist/

# Iterate on styles.css or app.js
npm run build  # same — build copies them

# Hard reload in browser to bypass cache (or append ?v=N)
```

DDEV serves at `https://hotecholution-web.ddev.site`. If DDEV's TLS prompts a cert warning, run `mkcert -install` once.

---

## Deploy

`git push origin main` → Cloudflare Pages auto-builds and deploys. Preview URLs for any branch / PR are at `*.pages.dev`.

The Cloudflare Pages setup guide (DNS cutover details, env vars, post-deploy validators) lives at:
https://www.notion.so/370fafdaabd580e88c8bc496f05f74b7

---

## Out of scope for this repo

- The three product sites (`gimsi.app`, `goclearbalance.app`, `bmd.hotecholution.com`) — separate codebases.
- Cross-publishing the "Why apaleo" block to those product sites is tracked at:
  https://www.notion.so/370fafdaabd58020811cc75b962cc3aa
