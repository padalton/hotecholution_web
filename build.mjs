// HoTechOlution build: pre-render /index.html (EN) and /de/index.html (DE)
// from the source `index.html` template using the dictionary in `i18n.mjs`.
// Zero npm runtime deps; uses Node's stdlib only.
import { readFile, writeFile, mkdir, cp, rm, stat } from "node:fs/promises";
import path from "node:path";
import { I18N, runtimeStrings } from "./i18n.mjs";

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const DIST = path.join(ROOT, "dist");
const SITE_URL = "https://hotecholution.com";

const FALLBACK = I18N.en;

const t = (dict, key) => dict[key] ?? FALLBACK[key] ?? key;

const escapeHtml = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const escapeJson = (s) => JSON.stringify(s);

// ---------- main ----------
async function build() {
  await rm(DIST, { recursive: true, force: true });
  await mkdir(path.join(DIST, "de"), { recursive: true });

  const template = await readFile(path.join(ROOT, "index.html"), "utf8");

  // Emit runtime-strings as external files so the CSP can stay strict
  // (`script-src 'self'`, no inline). app.js reads window.HTO_STRINGS.
  for (const lang of ["en", "de"]) {
    const body = `window.HTO_STRINGS = ${escapeJson(runtimeStrings(lang))};\n`;
    await writeFile(path.join(DIST, `strings-${lang}.js`), body);
  }

  await writeFile(path.join(DIST, "index.html"), renderPage(template, "en"));
  await writeFile(path.join(DIST, "de", "index.html"), renderPage(template, "de"));

  // Copy static assets
  await safeCopy("styles.css", "styles.css");
  await safeCopy("app.js", "app.js");
  await safeCopy("assets", "assets");
  await safeCopy("_headers", "_headers");
  await safeCopy("robots.txt", "robots.txt");
  await safeCopy("sitemap.xml", "sitemap.xml");
  await safeCopy("llms.txt", "llms.txt");
  await safeCopy("llms-full.txt", "llms-full.txt");
  await safeCopy("impressum.html", "impressum.html");
  await safeCopy("impressum-en.html", "impressum-en.html");
  await safeCopy("datenschutz.html", "datenschutz.html");
  await safeCopy("privacy-policy.html", "privacy-policy.html");

  // Product landing pages — copied verbatim, no i18n substitution.
  // Source layout:    products/<slug>/index.html        →  dist/products/<slug>/index.html
  //                   de/products/<slug>/index.html     →  dist/de/products/<slug>/index.html
  await safeCopy("products", "products");
  await safeCopy("de/products", "de/products");

  console.log("✓ Build complete → " + DIST);
}

async function safeCopy(src, dest) {
  const from = path.join(ROOT, src);
  const to = path.join(DIST, dest);
  try {
    await stat(from);
  } catch {
    console.warn("  (skip, missing) " + src);
    return;
  }
  await cp(from, to, { recursive: true });
}

// ---------- per-page rendering ----------
function renderPage(html, lang) {
  const dict = I18N[lang];

  // 1. Substitute data-i18n element text content (replicates runtime applyLang's
  //    textContent semantics — any children get clobbered, same as runtime).
  html = html.replace(
    /<([a-z][a-z0-9]*)\b([^>]*?)\bdata-i18n="([^"]+)"([^>]*?)>([\s\S]*?)<\/\1>/gi,
    (match, tag, before, key, after, _inner) => {
      const v = t(dict, key);
      if (typeof v !== "string") return match;
      return `<${tag}${before}data-i18n="${key}"${after}>${escapeHtml(v)}</${tag}>`;
    }
  );

  // 2. <html lang="...">
  html = html.replace(/<html\s+lang="[^"]*"/i, `<html lang="${lang}"`);

  // 3. <body data-lang="...">
  html = html.replace(/<body([^>]*?)\s+data-lang="[^"]*"/i, `<body$1 data-lang="${lang}"`);

  // 4. <title>
  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(t(dict, "meta.title"))}</title>`);

  // 5. <meta name="description">
  html = html.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${escapeHtml(t(dict, "meta.description"))}" />`
  );

  // 6. lang toggle: active class + aria-pressed (two instances: nav + mobile menu)
  if (lang === "de") {
    html = html.replace(
      /<button\s+data-lang-btn="en"\s+class="active"\s+aria-pressed="true">/gi,
      '<button data-lang-btn="en" aria-pressed="false">'
    );
    html = html.replace(
      /<button\s+data-lang-btn="de"\s+aria-pressed="false">/gi,
      '<button data-lang-btn="de" class="active" aria-pressed="true">'
    );
  }

  // 7. Inject external strings tag before app.js. Both are deferred, so they
  //    execute in document order — strings populate window.HTO_STRINGS, then
  //    app.js reads it. Kept external (not inline) so script-src 'self' holds.
  html = html.replace(
    /<script\s+src="\/?app\.js"[^>]*><\/script>/i,
    `<script src="/strings-${lang}.js" defer></script>\n<script src="/app.js" defer></script>`
  );

  return html;
}

build().catch((e) => {
  console.error(e);
  process.exit(1);
});
