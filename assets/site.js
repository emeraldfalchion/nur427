/* ============================================================
   site.js — shared per-page bootstrap for every page.
   Responsibilities:
     • the top navigation bar (single source of truth = SITE below),
       active-page highlighting, and the prev/next footer links
     • site chrome shared by all pages: dark-mode toggle, reading
       progress bar, back-to-top button, and the site search
     • an auto "On this page" table of contents on long content pages,
       collapsible sections, and page tabs

   Desktop: Home + one top-level item per group; each group's pages
   appear in a hover dropdown. Mobile: a hamburger toggles a slide-
   down menu; tapping a group expands its pages.

   TO ADD A NEW PAGE:
     1. Create the .html file (copy templates/topic-page.html, or the
        closest existing page once there is one).
     2. Add one entry to the matching group's `items` array below.
   Everything else (menu, active state, prev/next) updates itself.
   The site search reads a prebuilt index from data/search-index.js;
   rebuild it after content changes (see CLAUDE.md).
   ============================================================ */
/* Prefix for every localStorage key this site writes (flashcard progress,
   and anything a later study tool saves). It is different for each course so
   two study guides opened in the same browser never collide. site.js loads
   before study.js on every page, so setting it here is enough. */
window.STORE_PREFIX = "nur427";

const SITE = {
  brand: "NUR427",              // big text, top-left of the nav bar
  /* The small line under the brand. Empty means no line is drawn. Text here
     widens the brand block, which leaves less room for the day menus. */
  course: "",

  home: { id: "home", title: "Home", file: "index.html" },

  /* ---- ONE ENTRY PER PAGE. This is the only place pages are listed. ----
     Adding an entry here wires up: the desktop dropdown, the mobile
     accordion, the "you are here" highlight, and the prev/next footer
     links. Groups run in teaching order, Day 1 first, and the order
     inside a group is the order the pages appear.
       id    - a short unique name for the page
       num   - the little number badge in the dropdown
       title - display name; use &amp; for an ampersand
       file  - the filename, relative to this folder

     A day looks like this:

       {
         label: "Day 1",
         items: [
           { id: "day1-first-topic",  num: "1", title: "First Topic",  file: "day1-first-topic.html" },
           { id: "day1-second-topic", num: "2", title: "Second Topic", file: "day1-second-topic.html" },
         ]
       },
  */
  groups: [
    {
      label: "Day 1",
      items: [
        { id: "day1-respiratory", num: "1", title: "Respiratory and Progressive Issues in Critical Care", file: "day1-respiratory.html" },
        { id: "day1-oxygen-therapy", num: "2", title: "Oxygen Therapy and Mechanical Ventilation", file: "day1-oxygen-therapy.html" },
        { id: "day1-hematologic", num: "3", title: "Hematologic Issues in Critical Care", file: "day1-hematologic.html" },
        { id: "day1-acute-pancreatitis", num: "4", title: "Acute Pancreatitis", file: "day1-acute-pancreatitis.html" },
      ]
    },
    {
      label: "Day 2",
      items: [
        { id: "day2-cardiovascular", num: "1", title: "Cardiovascular Critical Care Issues", file: "day2-cardiovascular.html" },
        { id: "day2-rhythms-pacemakers", num: "2", title: "Rhythms &amp; Pacemaker Review", file: "day2-rhythms-pacemakers.html" },
        { id: "day2-acute-kidney-injury", num: "3", title: "Acute Kidney Injury", file: "day2-acute-kidney-injury.html" },
        { id: "day2-nutrition", num: "4", title: "Nutrition", file: "day2-nutrition.html" },
      ]
    },
    {
      label: "Day 3",
      items: [
        { id: "day3-gastrointestinal", num: "1", title: "GI Critical Care Issues", file: "day3-gastrointestinal.html" },
        { id: "day3-liver-failure", num: "2", title: "Hepatic Failure", file: "day3-liver-failure.html" },
        { id: "day3-neuro-assessment-icp", num: "3", title: "Neuro Assessment and Increased ICP", file: "day3-neuro-assessment-icp.html" },
        { id: "day3-brain-injury-stroke", num: "4", title: "Brain Injury and Stroke", file: "day3-brain-injury-stroke.html" },
        { id: "day3-spinal-cord-injury", num: "5", title: "Spinal Cord Injury", file: "day3-spinal-cord-injury.html" },
      ]
    },
    {
      label: "Day 4",
      items: [
        { id: "day4-hemodynamics", num: "1", title: "Hemodynamics", file: "day4-hemodynamics.html" },
        { id: "day4-shock-sepsis-mods", num: "2", title: "Shock, Sepsis, MODS", file: "day4-shock-sepsis-mods.html" },
      ]
    },
    /* Review pages: what the lectures say to bring forward from earlier
       courses, one page per subject. This group stays LAST, after the
       final day. */
    {
      label: "Review",
      items: [
        { id: "review-respiratory", num: "1", title: "Respiratory", file: "review-respiratory.html" },
        { id: "review-respiratory-diseases", num: "2", title: "Respiratory Diseases", file: "review-respiratory-diseases.html" },
        { id: "review-chest-tubes", num: "3", title: "Chest Tubes", file: "review-chest-tubes.html" },
        { id: "review-abgs", num: "4", title: "ABGs", file: "review-abgs.html" },
        { id: "review-hematology", num: "5", title: "Hematology", file: "review-hematology.html" },
        { id: "review-transfusions", num: "6", title: "Transfusions", file: "review-transfusions.html" },
        { id: "review-cardiovascular", num: "7", title: "Cardiovascular", file: "review-cardiovascular.html" },
        { id: "review-heart-disease", num: "8", title: "Heart Disease", file: "review-heart-disease.html" },
        { id: "review-dysrhythmias", num: "9", title: "Dysrhythmias", file: "review-dysrhythmias.html" },
        { id: "review-renal", num: "10", title: "Renal", file: "review-renal.html" },
        { id: "review-gi", num: "11", title: "GI", file: "review-gi.html" },
        { id: "review-neuro", num: "12", title: "Neuro", file: "review-neuro.html" },
      ]
    },
  ]
};

// Cache-bust token read off our own <script src="assets/site.js?v=…">, so
// anything loaded lazily below shares the page's version without a second
// hardcoded string to keep in sync.
const SITE_VER = (function () {
  const s = document.currentScript || document.querySelector('script[src*="assets/site.js"]');
  const m = s && /[?&]v=([^&]+)/.exec(s.src || "");
  return m ? m[1] : "";
})();

(function () {
  // ---- Small helpers -------------------------------------------
  const isMobile = () => window.matchMedia("(max-width:899px)").matches;
  const slugify = s => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  // localStorage that degrades to memory when the browser blocks it
  // (e.g. some file:// contexts) so features never throw.
  const store = (() => {
    const mem = {};
    return {
      get(k) { try { return localStorage.getItem(k); } catch (e) { return k in mem ? mem[k] : null; } },
      set(k, v) { try { localStorage.setItem(k, v); } catch (e) { mem[k] = v; } }
    };
  })();

  // Theme is applied by an inline <head> script on every page (no flash);
  // this file handles the toggle and carries the theme across page links so
  // it persists even where file:// blocks a shared localStorage.
  function withTheme(href) {
    const theme = document.documentElement.getAttribute("data-theme");
    let hash = "", h = href;
    const hi = h.indexOf("#"); if (hi >= 0) { hash = h.slice(hi); h = h.slice(0, hi); }
    const qi = h.indexOf("?");
    const path = qi >= 0 ? h.slice(0, qi) : h;
    const params = new URLSearchParams(qi >= 0 ? h.slice(qi + 1) : "");
    if (theme === "dark") params.set("theme", "dark"); else params.delete("theme");
    const qs = params.toString();
    return path + (qs ? "?" + qs : "") + hash;
  }
  document.addEventListener("click", e => {
    const a = e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    const href = a.getAttribute("href");
    if (!href || href.charAt(0) === "#" || /^[a-z]+:/i.test(href)) return;
    if (!/\.html($|[?#])/.test(href)) return;
    a.setAttribute("href", withTheme(href));
  }, true);

  // ---- Which page are we on? (infer from filename) --------------
  const path = location.pathname.split("/").pop() || "index.html";
  const file = path === "" ? "index.html" : path;

  // Flatten the ordered list of pages for prev/next.
  const flat = [];
  SITE.groups.forEach(g => g.items.forEach(it => flat.push(it)));
  const current = flat.find(it => it.file === file) || null;

  // ---- Build the top nav ---------------------------------------
  let items = `<li class="top-item">
      <a class="toplink ${file === "index.html" ? "is-active" : ""}" href="index.html"${file === "index.html" ? ' aria-current="page"' : ""}>Home</a>
    </li>`;

  SITE.groups.forEach(g => {
    const groupActive = g.items.some(it => it.file === file) ? "is-active" : "";
    let sub = "";
    g.items.forEach(it => {
      const active = it.file === file ? "is-active" : "";
      sub += `<li><a class="droplink ${active}" data-page="${it.id}" href="${it.file}"${active ? ' aria-current="page"' : ""}>
        <span class="num">${it.num}</span><span>${it.title}</span></a></li>`;
    });
    items += `<li class="top-item has-dropdown">
      <a class="toplink ${groupActive}" href="#" aria-haspopup="true" aria-expanded="false">${g.label}<span class="caret" aria-hidden="true">▾</span></a>
      <ul class="dropdown">${sub}</ul>
    </li>`;
  });

  const header = document.createElement("header");
  header.className = "topnav";
  header.innerHTML = `
    <div class="topnav__inner">
      <a class="brand" href="index.html">
        <span class="brand__name">${SITE.brand}</span>
        ${SITE.course ? `<span class="brand__sub">${SITE.course}</span>` : ""}
      </a>
      <nav class="topnav__menu" aria-label="Primary">
        <ul class="menu">${items}</ul>
      </nav>
      <div class="nav-utils">
        <button type="button" class="nav-icon" data-act="search" aria-label="Search the study guide" title="Search (press /)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </button>
        <button type="button" class="nav-icon" data-act="theme" aria-label="Toggle dark mode" title="Toggle dark mode">
          <svg class="ico-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
          <svg class="ico-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
        </button>
      </div>
      <button class="nav-toggle" aria-label="Open menu" aria-expanded="false">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>
    </div>`;

  document.body.insertBefore(header, document.body.firstChild);

  // ---- Reading progress bar (top of viewport) ------------------
  const progress = document.createElement("div");
  progress.className = "read-progress";
  progress.innerHTML = '<span></span>';
  document.body.appendChild(progress);
  const progressFill = progress.firstChild;

  // ---- Back-to-top button --------------------------------------
  const toTop = document.createElement("button");
  toTop.type = "button";
  toTop.className = "to-top";
  toTop.setAttribute("aria-label", "Back to top");
  toTop.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg>';
  toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  document.body.appendChild(toTop);

  function onScroll() {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    const top = h.scrollTop || document.body.scrollTop;
    const pct = max > 0 ? top / max : 0;
    progressFill.style.width = (pct * 100).toFixed(2) + "%";
    toTop.classList.toggle("show", top > 600);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  onScroll();

  // ---- Does the full nav fit? ----------------------------------
  // Below 900px the stylesheet's media query collapses the nav to a hamburger.
  // Above that, whether the day groups FIT depends on how many there are, and
  // a fixed breakpoint goes stale every time a day is added. So measure instead:
  // lay the nav out at full width, and if it does not fit, set .nav-compact on
  // <html>, which styles.css treats exactly like the mobile query. Adding a
  // day to SITE.groups needs no change here or in the stylesheet.
  const root = document.documentElement;
  const navInner = header.querySelector(".topnav__inner");
  function fitNav() {
    root.classList.remove("nav-compact");
    if (isMobile()) return;                     // the media query owns this range
    if (navInner.scrollWidth > navInner.clientWidth + 1) root.classList.add("nav-compact");
    else header.classList.remove("open");       // back to the full bar: no stale open menu
  }
  fitNav();
  window.addEventListener("resize", fitNav, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitNav);
  // The hamburger layout is in force: narrow screen, or a nav that does not fit.
  const navCompact = () => isMobile() || root.classList.contains("nav-compact");

  // ---- Nav interactions ----------------------------------------
  const toggle = header.querySelector(".nav-toggle");
  const closeMenu = () => { header.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); };

  toggle.addEventListener("click", () => {
    const open = header.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });

  // On mobile (hamburger visible), tapping a group heading expands
  // its sub-menu instead of following the "#" link.
  header.querySelectorAll(".has-dropdown > .toplink").forEach(a => {
    a.addEventListener("click", e => {
      e.preventDefault();
      if (navCompact()) {
        const li = a.parentElement;
        const expanded = li.classList.toggle("expanded");
        a.setAttribute("aria-expanded", expanded ? "true" : "false");
      }
    });
    // keep aria-expanded honest for desktop hover/focus users
    const li = a.parentElement;
    li.addEventListener("mouseenter", () => { if (!navCompact()) a.setAttribute("aria-expanded", "true"); });
    li.addEventListener("mouseleave", () => { if (!navCompact()) a.setAttribute("aria-expanded", "false"); });
    li.addEventListener("focusin", () => { if (!navCompact()) a.setAttribute("aria-expanded", "true"); });
    li.addEventListener("focusout", () => { if (!navCompact()) a.setAttribute("aria-expanded", "false"); });
  });

  // Tapping a real page link (or the brand/Home) closes the mobile menu.
  header.querySelectorAll('.droplink, .brand, .top-item > a.toplink[href="index.html"]').forEach(a => {
    a.addEventListener("click", closeMenu);
  });

  document.addEventListener("keydown", e => { if (e.key === "Escape") closeMenu(); });

  // ---- Dark-mode toggle ----------------------------------------
  header.querySelector('[data-act="theme"]').addEventListener("click", () => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    store.set("theme", next);
    onScroll(); // heights can shift slightly
  });

  // ---- Section anchors, collapsible sections, TOC & top controls
  const contentRoot = document.getElementById("content");
  if (contentRoot) {
    const headings = Array.from(contentRoot.querySelectorAll("h2.block"));
    const used = {};
    headings.forEach(h => {
      if (!h.id) {
        let base = slugify(h.textContent) || "section";
        let id = base, n = 2;
        while (used[id]) id = base + "-" + n++;
        used[id] = true;
        h.id = id;
      }
    });

    function setCollapsed(sec, collapsed) {
      sec.h.classList.toggle("collapsed", collapsed);
      sec.body.classList.toggle("section-collapsed", collapsed);
      sec.h.setAttribute("aria-expanded", collapsed ? "false" : "true");
    }

    // Wrap each main section so its heading can collapse it.
    const sections = [];
    headings.forEach(h => {
      const body = document.createElement("div");
      body.className = "section-body";
      let el = h.nextElementSibling;
      while (el && !(el.matches && el.matches("h2.block, nav.page-flip, footer.site-foot"))) {
        const nxt = el.nextElementSibling;
        body.appendChild(el);
        el = nxt;
      }
      if (!body.childNodes.length) return;
      h.after(body);
      h.classList.add("section-h");
      h.setAttribute("role", "button");
      h.setAttribute("tabindex", "0");
      h.setAttribute("aria-expanded", "true");
      const caret = document.createElement("span");
      caret.className = "sec-caret";
      caret.setAttribute("aria-hidden", "true");
      caret.textContent = "▾";
      h.appendChild(caret);
      const sec = { h, body };
      sections.push(sec);
      const toggle = () => setCollapsed(sec, !h.classList.contains("collapsed"));
      h.addEventListener("click", toggle);
      h.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
    });

    /* ---- Tabbed pages ------------------------------------------
       A page may split its h2.block sections into panels, each a
         <div class="tab-panel" id="tab-second" data-tab-label="Second Tab">
       and the tab strip is BUILT HERE from those labels, the same way
       the nav is built from SITE — there is no tab markup on the page
       to hand-edit. Adding a tab is one wrapper div and one attribute.
       `data-tab-end` marks a panel that isn't one of the sequence: its
       button takes the accent colour. It sits at the END of the strip,
       right after the others, simply because the panel is last in the page.
       Pages with no .tab-panel are completely unaffected.            */
    const panels = Array.from(contentRoot.querySelectorAll(".tab-panel[data-tab-label]"));
    const tabbed = panels.length > 1;
    const headingsIn = p => headings.filter(h => p.contains(h));
    const visibleSections = () =>
      tabbed ? sections.filter(s => !s.h.closest(".tab-panel[hidden]")) : sections;

    // "On this page" TOC (long pages only), always a single column.
    // On a tabbed page it lists only the ACTIVE panel's sections — the box
    // has to describe what is actually on screen.
    function tocList(hs) {
      return hs.filter(h => !h.hasAttribute("data-toc-skip")).map(h => {
        const label = (h.firstChild ? h.firstChild.textContent : h.textContent).trim();
        return `<li><a href="#${h.id}">${label}</a></li>`;
      }).join("");
    }
    let details = null;
    if (headings.length >= 3) {
      details = document.createElement("details");
      details.className = "page-toc";
      if (!isMobile()) details.open = true;
      details.innerHTML = `<summary>On this page</summary><nav aria-label="On this page"><ul>${tocList(headings)}</ul></nav>`;
      // Delegated, because the list is re-rendered on every tab change.
      details.addEventListener("click", e => {
        if (isMobile() && e.target.closest("nav a")) details.open = false;
      });
    }

    // Collapse/expand-all button, placed directly under the TOC.
    let cbtn = null;
    if (sections.length) {
      cbtn = document.createElement("button");
      cbtn.type = "button";
      cbtn.className = "def-btn page-toc-collapse-btn";
      cbtn.textContent = "Collapse all headings";
      let collapsedMode = false;
      cbtn.addEventListener("click", () => {
        collapsedMode = !collapsedMode;
        visibleSections().forEach(sec => setCollapsed(sec, collapsedMode));
        cbtn.textContent = collapsedMode ? "Expand all headings" : "Collapse all headings";
      });
    }

    // Build the tab strip (buttons only — the panels are already in the page).
    let tabBar = null;
    const tabBtns = [];
    if (tabbed) {
      tabBar = document.createElement("div");
      tabBar.className = "tab-bar";
      tabBar.setAttribute("role", "tablist");
      tabBar.setAttribute("aria-label", "Page sections");
      panels.forEach((p, i) => {
        if (!p.id) p.id = "tab-panel-" + (i + 1);
        const b = document.createElement("button");
        b.type = "button";
        b.id = p.id + "-tab";
        b.className = "tab-btn" + (p.hasAttribute("data-tab-end") ? " tab-btn-end" : "");
        b.setAttribute("role", "tab");
        b.setAttribute("aria-controls", p.id);
        b.textContent = p.getAttribute("data-tab-label");
        p.setAttribute("role", "tabpanel");
        p.setAttribute("aria-labelledby", b.id);
        p.tabIndex = 0;
        b.addEventListener("click", () => selectTab(i));
        b.addEventListener("keydown", e => {
          const n = panels.length;
          let j = -1;
          if (e.key === "ArrowRight") j = (i + 1) % n;
          else if (e.key === "ArrowLeft") j = (i - 1 + n) % n;
          else if (e.key === "Home") j = 0;
          else if (e.key === "End") j = n - 1;
          if (j < 0) return;
          e.preventDefault();
          selectTab(j);
          tabBtns[j].focus();
        });
        tabBar.appendChild(b);
        tabBtns.push(b);
      });
    }

    function selectTab(idx) {
      panels.forEach((p, i) => {
        const on = i === idx;
        p.hidden = !on;
        tabBtns[i].classList.toggle("is-active", on);
        tabBtns[i].setAttribute("aria-selected", on ? "true" : "false");
        tabBtns[i].tabIndex = on ? 0 : -1;
      });
      const hs = headingsIn(panels[idx]);
      if (details) {
        details.querySelector("nav ul").innerHTML = tocList(hs);
        details.hidden = hs.length < 3;   // same "long pages only" bar, per tab
      }
      if (cbtn) cbtn.hidden = hs.length < 2;  // nothing to collapse *all* of
      // study.js freezes table column widths by measuring them, and a table
      // in a hidden panel measures 0. Tell it to re-measure what just appeared.
      document.dispatchEvent(new CustomEvent("tabchange", { detail: { panel: panels[idx] } }));
    }

    // Which tab owns a given element id, or -1.
    function tabOf(id) {
      const t = id && document.getElementById(id);
      const owner = t && t.closest(".tab-panel[data-tab-label]");
      return owner ? panels.indexOf(owner) : -1;
    }

    // Top block: the tab strip, then the TOC, then a row of page-wide buttons.
    // study.js adds "Hide all answers" to that row (.page-tools).
    const top = document.createElement("div");
    top.className = "page-top";
    if (tabBar) top.appendChild(tabBar);
    if (details) top.appendChild(details);
    if (cbtn) {
      const tools = document.createElement("div");
      tools.className = "page-tools";
      tools.appendChild(cbtn);
      top.appendChild(tools);
    }
    if (top.childNodes.length) {
      const anchorEl = contentRoot.querySelector(".page-head");
      if (anchorEl) anchorEl.insertAdjacentElement("afterend", top);
      else {
        const inner = contentRoot.querySelector(".page-inner") || contentRoot;
        inner.insertBefore(top, inner.firstChild);
      }
    }

    if (tabbed) {
      /* A link into a section that lives in another tab — a search result, a
         cross-reference from another page — has to open that tab before the
         browser can scroll to it. */
      const startId = decodeURIComponent((location.hash || "").slice(1));
      const start = tabOf(startId);
      selectTab(start < 0 ? 0 : start);
      if (start > 0) {
        const t = document.getElementById(startId);
        if (t) setTimeout(() => t.scrollIntoView(), 0);
      }
      window.addEventListener("hashchange", () => {
        const id = decodeURIComponent((location.hash || "").slice(1));
        const i = tabOf(id);
        if (i >= 0 && panels[i].hidden) {
          selectTab(i);
          const t = document.getElementById(id);
          if (t) t.scrollIntoView();
        }
      });
    }
  }

  // ---- Site search ---------------------------------------------
  (function search() {
    const btn = header.querySelector('[data-act="search"]');
    if (!btn) return;

    /* The index grows with every topic page and soon outweighs the rest of
       the site's CSS+JS put together, while most page views never search. So
       it is NOT included by the pages; it is fetched the first time the
       search is opened. */
    const INDEX_SRC = "data/search-index.js" + (SITE_VER ? "?v=" + SITE_VER : "");
    let entries = null, loading = null;

    // Flatten the grouped index into one entry per keyword.
    function buildEntries() {
      const raw = window.SEARCH_INDEX || [];
      const out = [];
      raw.forEach(pg => (pg.secs || []).forEach(sec => (sec.k || []).forEach(kw => {
        out.push({
          f: pg.f, t: pg.t, s: sec.s, a: sec.a, kw,
          hay: (kw + " " + sec.s + " " + pg.t).toLowerCase(),
          kwl: kw.toLowerCase()
        });
      })));
      return out;
    }

    function loadIndex() {
      if (entries) return Promise.resolve();
      if (loading) return loading;
      loading = new Promise(resolve => {
        if (window.SEARCH_INDEX) { entries = buildEntries(); resolve(); return; }
        const s = document.createElement("script");
        s.src = INDEX_SRC;
        s.onload = () => { entries = buildEntries(); resolve(); };
        s.onerror = () => { entries = []; resolve(); };
        document.head.appendChild(s);
      });
      return loading;
    }

    const overlay = document.createElement("div");
    overlay.className = "search-overlay";
    overlay.innerHTML = `
      <div class="search-box" role="dialog" aria-modal="true" aria-label="Search the study guide">
        <div class="search-head">
          <svg class="search-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="search" class="search-input" placeholder="Search topics, terms, sections…" autocomplete="off" aria-label="Search">
          <button type="button" class="search-close" aria-label="Close search">✕</button>
        </div>
        <div class="search-results" role="listbox"></div>
        <p class="search-hint">Type at least 2 letters · ↑↓ to move · Enter opens · Esc closes</p>
      </div>`;
    document.body.appendChild(overlay);

    const input = overlay.querySelector(".search-input");
    const results = overlay.querySelector(".search-results");
    let matches = [], sel = 0;

    const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    // Show a windowed snippet around the match (entries may be full sentences).
    function mark(text, q) {
      const i = text.toLowerCase().indexOf(q);
      if (i < 0) return esc(text.length > 100 ? text.slice(0, 100) + "\u2026" : text);
      const pad = 48;
      const start = Math.max(0, i - pad), end = Math.min(text.length, i + q.length + pad);
      const pre = (start > 0 ? "\u2026" : "") + text.slice(start, i);
      const post = text.slice(i + q.length, end) + (end < text.length ? "\u2026" : "");
      return esc(pre) + "<mark>" + esc(text.slice(i, i + q.length)) + "</mark>" + esc(post);
    }

    function open() {
      overlay.classList.add("show");
      input.value = "";
      render("");
      setTimeout(() => input.focus(), 30);
      loadIndex();                       // warm it while she starts typing
    }
    function close() { overlay.classList.remove("show"); }

    function render(q) {
      q = q.trim().toLowerCase();
      if (q.length < 2) {
        matches = [];
        results.innerHTML = '<p class="search-empty">Start typing to search every page.</p>';
        return;
      }
      if (!entries) {                    // still fetching — re-render when it lands
        matches = [];
        results.innerHTML = '<p class="search-empty">Loading search index…</p>';
        loadIndex().then(() => { if (overlay.classList.contains("show")) render(input.value); });
        return;
      }
      const scored = [];
      for (const e of entries) {
        const idx = e.hay.indexOf(q);
        if (idx < 0) continue;
        let score = 3;
        if (e.kwl === q) score = 0;
        else if (e.kwl.startsWith(q)) score = 1;
        else if (e.kwl.indexOf(q) >= 0) score = 2;
        scored.push({ e, score });
      }
      scored.sort((a, b) => a.score - b.score || a.e.kw.length - b.e.kw.length);
      matches = scored.slice(0, 25).map(x => x.e);
      sel = 0;
      if (!matches.length) {
        results.innerHTML = '<p class="search-empty">No matches. Try a shorter or different term.</p>';
        return;
      }
      results.innerHTML = matches.map((e, i) => {
        const href = e.f + (e.a ? "#" + e.a : "");
        const crumb = e.t + (e.s && e.s !== e.kw ? " › " + e.s : "");
        return `<a class="search-hit${i === 0 ? " is-sel" : ""}" href="${href}" role="option" data-i="${i}">
          <span class="hit-kw">${mark(e.kw, q)}</span>
          <span class="hit-crumb">${esc(crumb)}</span></a>`;
      }).join("");
    }

    function updateSel() {
      const hits = results.querySelectorAll(".search-hit");
      hits.forEach((h, i) => h.classList.toggle("is-sel", i === sel));
      const cur = hits[sel];
      if (cur) cur.scrollIntoView({ block: "nearest" });
    }

    btn.addEventListener("click", open);
    overlay.querySelector(".search-close").addEventListener("click", close);
    overlay.addEventListener("click", e => { if (e.target === overlay) close(); });
    input.addEventListener("input", () => render(input.value));
    input.addEventListener("keydown", e => {
      if (e.key === "ArrowDown") { e.preventDefault(); if (matches.length) { sel = (sel + 1) % matches.length; updateSel(); } }
      else if (e.key === "ArrowUp") { e.preventDefault(); if (matches.length) { sel = (sel - 1 + matches.length) % matches.length; updateSel(); } }
      else if (e.key === "Enter") { const cur = matches[sel]; if (cur) location.href = withTheme(cur.f + (cur.a ? "#" + cur.a : "")); }
    });

    document.addEventListener("keydown", e => {
      if (e.key === "Escape") { close(); return; }
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target.tagName || "")) || e.target.isContentEditable;
      if (!typing && e.key === "/") { e.preventDefault(); open(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) { e.preventDefault(); open(); }
    });
  })();

  // ---- Prev / next footer links --------------------------------
  const holder = document.querySelector("[data-page-flip]");
  if (holder && current) {
    const idx = flat.indexOf(current);
    const prev = idx > 0 ? flat[idx - 1] : null;
    const next = idx < flat.length - 1 ? flat[idx + 1] : null;
    let html = "";
    if (prev) html += `<a class="prev" href="${prev.file}"><span class="dir">← Previous</span><span class="ttl">${prev.title}</span></a>`;
    if (next) html += `<a class="next" href="${next.file}"><span class="dir">Next →</span><span class="ttl">${next.title}</span></a>`;
    holder.innerHTML = html;
  }
})();
