/* ============================================================
   HoTechOlution — runtime interactions
   The page is pre-rendered per language (/ for EN, /de/ for DE).
   This script only handles dynamic UI: cycler, mobile menu, pricing
   calculator, scroll/reveal, language route switch, phone reveal.
   ============================================================ */
(function () {
  "use strict";

  // Runtime strings inlined by build.mjs on pre-rendered pages: window.HTO_STRINGS = {...}.
  // On non-prerendered pages (legal pages, product landing pages) HTO_STRINGS is undefined;
  // we then take the lang from <html lang="..."> and use defaults for the rest.
  var docLang = (document.documentElement.lang || "en").substring(0, 2).toLowerCase();
  var DEFAULTS = {
    en: {
      cycle: ["Solution", "Evolution", "Revolution"],
      perMo: "/mo",
      roomsUnit: "rooms / property",
      propsUnit: "properties",
      propUnitOne: "property",
      tierLight: "Light",
      tierEnt: "Enterprise",
      tierSingle: "Single tier",
      bmdName: "BMD Connector",
      phoneReveal: "Reveal phone number"
    },
    de: {
      cycle: ["Solution", "Evolution", "Revolution"],
      perMo: "/Mon.",
      roomsUnit: "Zimmer / Betrieb",
      propsUnit: "Betriebe",
      propUnitOne: "Betrieb",
      tierLight: "Light",
      tierEnt: "Enterprise",
      tierSingle: "Einheitstarif",
      bmdName: "BMD Connector",
      phoneReveal: "Telefonnummer anzeigen"
    }
  };
  var S = window.HTO_STRINGS || DEFAULTS[docLang] || DEFAULTS.en;
  var lang = (S.lang || docLang || "en").substring(0, 2).toLowerCase();

  /* ---------- hero cycler ---------- */
  var cyclerEl = document.getElementById("cycler");
  var cycleIdx = 0, cycleSpans = [];

  function rebuildCycler() {
    if (!cyclerEl) return;
    var words = S.cycle;
    cyclerEl.innerHTML = "";
    cycleSpans = words.map(function (w, i) {
      var span = document.createElement("span");
      span.textContent = w;
      if (i === 0) span.classList.add("in");
      cyclerEl.appendChild(span);
      return span;
    });
    cycleIdx = 0;
    var longest = words.reduce(function (a, b) { return b.length > a.length ? b : a; }, "");
    cyclerEl.style.minWidth = (longest.length * 0.62 + 0.5) + "em";
  }

  function tickCycler() {
    if (!cycleSpans.length) return;
    var cur = cycleSpans[cycleIdx];
    cur.classList.remove("in");
    cur.classList.add("out");
    cycleIdx = (cycleIdx + 1) % cycleSpans.length;
    var nxt = cycleSpans[cycleIdx];
    nxt.classList.remove("out");
    void nxt.offsetWidth;
    nxt.classList.add("in");
    setTimeout(function () {
      cycleSpans.forEach(function (s, i) { if (i !== cycleIdx) s.classList.remove("out"); });
    }, 520);
  }

  rebuildCycler();
  if (!window.matchMedia || !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    setInterval(tickCycler, 2200);
  }

  /* ---------- pricing calculator ---------- */
  var slider = document.getElementById("roomSlider");
  var roomNum = document.getElementById("roomNum");
  var roomUnit = document.getElementById("roomUnit");
  var propSlider = document.getElementById("propSlider");
  var propNum = document.getElementById("propNum");
  var propUnit = document.getElementById("propUnit");
  var resultsEl = document.getElementById("calcResults");

  function eur(n) {
    return "€" + Math.round(n).toLocaleString(lang === "de" ? "de-DE" : "en-US");
  }

  function buildCalc() {
    if (!slider || !resultsEl) return;
    var rooms = parseInt(slider.value, 10);
    var props = propSlider ? parseInt(propSlider.value, 10) : 1;
    if (roomNum) roomNum.textContent = rooms;
    if (roomUnit) roomUnit.textContent = S.roomsUnit;
    if (propNum) propNum.textContent = props;
    if (propUnit) propUnit.textContent = props === 1 ? S.propUnitOne : S.propsUnit;

    var totalRooms = rooms * props;

    // Tiers are chosen by SIZE, not by cheapest price.
    // Stay on Light while within both room AND property caps; above either, Enterprise.
    var gimsi = (rooms <= 60 && props <= 3)
      ? { tier: S.tierLight, price: 49 * props }
      : { tier: S.tierEnt,   price: 0.90 * totalRooms };

    var gcb = (rooms <= 30 && props <= 2)
      ? { tier: S.tierLight, price: 29 * props }
      : { tier: S.tierEnt,   price: 1.50 * totalRooms };

    var bmd = { tier: S.tierSingle, price: 20 * props };

    var rows = [
      { name: "GIMSI", color: "var(--periwinkle)", o: gimsi },
      { name: "GoClearBalance", color: "var(--coral)", o: gcb },
      { name: S.bmdName, color: "var(--green)", o: bmd }
    ];

    resultsEl.innerHTML = rows.map(function (r) {
      return '<div class="calc-line">' +
        '<span class="cdot" style="background:' + r.color + '"></span>' +
        '<div><div class="cname">' + r.name + '</div><div class="ctier">' + r.o.tier + '</div></div>' +
        '<div class="cprice">' + eur(r.o.price) + '<small>' + S.perMo + '</small></div>' +
        '</div>';
    }).join("");
  }

  if (slider) slider.addEventListener("input", buildCalc);
  if (propSlider) propSlider.addEventListener("input", buildCalc);
  buildCalc();

  /* ---------- language route switch (URL-based, no localStorage) ---------- */
  // Pages can override the route logic by setting `data-lang-href` on the button —
  // useful for legal pages where the EN/DE counterparts have different filenames
  // (e.g. impressum.html ↔ impressum-en.html).
  document.querySelectorAll("[data-lang-btn]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var explicit = btn.getAttribute("data-lang-href");
      if (explicit) {
        if (btn.getAttribute("data-lang-btn") === lang) return;
        window.location.href = explicit;
        return;
      }
      var target = btn.getAttribute("data-lang-btn");
      if (target === lang) return;
      var path = window.location.pathname;
      var hash = window.location.hash || "";
      var next;
      if (target === "de") {
        next = path.startsWith("/de/") ? path : "/de" + (path.startsWith("/") ? path : "/" + path);
        if (!next.endsWith("/")) next = next.replace(/[^/]*$/, "");
      } else {
        next = path.startsWith("/de/") ? path.substring(3) : path;
        if (!next.startsWith("/")) next = "/" + next;
      }
      window.location.href = next + hash;
    });
  });

  /* ---------- nav scroll state ---------- */
  var nav = document.getElementById("nav");
  function onScroll() { if (nav) nav.classList.toggle("scrolled", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- mobile menu (with aria) ---------- */
  var burger = document.getElementById("burger");
  var menu = document.getElementById("mobileMenu");
  if (burger && menu) {
    burger.addEventListener("click", function () {
      var open = menu.classList.toggle("open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    menu.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        menu.classList.remove("open");
        burger.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------- aria-pressed on language buttons ---------- */
  document.querySelectorAll("[data-lang-btn]").forEach(function (btn) {
    btn.setAttribute("aria-pressed", btn.getAttribute("data-lang-btn") === lang ? "true" : "false");
  });

  /* ---------- phone reveal (keeps the number out of static HTML) ---------- */
  // Number split & assembled at click time. Never appears in markup, sitemap, or the JSON-LD.
  var phoneBtn = document.getElementById("phoneReveal");
  if (phoneBtn) {
    phoneBtn.addEventListener("click", function () {
      var parts = ["+43", "676", "919", "55", "42"];
      var pretty = parts.join(" ");
      var dialable = "+" + parts.join("").replace(/^\+/, "");
      // dialable: "+436769195542"
      var tel = "+" + parts.join("").replace(/[^0-9]/g, "");
      phoneBtn.classList.add("revealed");
      phoneBtn.innerHTML = '<a href="tel:' + tel + '">' + pretty + '</a>';
    });
  }

  /* ---------- reveal-on-scroll ---------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
  document.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });
})();
