/* ============================================================
   study.js — interactive study tools shared by every topic page:
     • hide/show self-quiz: one eye button per table and per card, a
       click on a hidden row or card to reveal just that one, and a
       "Hide all answers" button that turns the whole page into a quiz
     • the lecture-diagram lightbox
     • glossary terms: a pop-up definition on hover, focus or tap
     • mobile stacked-table labels
     • flashcards (flip, self-grade "Got it/Review", drill-missed, count),
       for any page that carries a .flash-grid
   Runs against the whole page, so each topic page just includes
   this file — no per-page wiring needed.
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {

  /* ---- Flashcards: flip, self-grade, and "review missed" ----
     Each card can be graded "Got it" / "Review" from its back. The
     status is saved (per card, keyed by a hash of its question) so it
     survives reloads, and a "Review missed" toggle drills just the
     cards still marked for review. Falls back to in-memory state if
     the browser blocks localStorage (e.g. some file:// contexts). */
  const FC_KEY = (window.STORE_PREFIX || "study") + "-fc";
  const fcMem = {};
  const fcLoad = () => { try { return JSON.parse(localStorage.getItem(FC_KEY)) || {}; } catch (e) { return fcMem; } };
  const fcSave = m => { try { localStorage.setItem(FC_KEY, JSON.stringify(m)); } catch (e) { Object.assign(fcMem, m); } };
  const fcStatus = fcLoad();
  const pageId = (location.pathname.split("/").pop() || "index.html");
  function fcHash(text) {
    let h = 0;
    for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
    return pageId + ":" + h;
  }

  document.querySelectorAll(".flash-grid").forEach(grid => {
    const cards = Array.from(grid.querySelectorAll(".flash-card"));

    function paint(card) {
      const st = fcStatus[card.dataset.fckey];
      card.classList.toggle("fc-known", st === "known");
      card.classList.toggle("fc-review", st === "review");
    }
    function remaining() { return cards.filter(c => fcStatus[c.dataset.fckey] === "review").length; }

    // Wire each card: stable key, status marker, and grade buttons.
    cards.forEach(card => {
      const front = card.querySelector(".flash-front");
      const back = card.querySelector(".flash-back");
      card.dataset.fckey = fcHash((front ? front.textContent : "").trim());
      if (front && !front.querySelector(".fc-mark")) {
        front.insertAdjacentHTML("beforeend", '<span class="fc-mark" aria-hidden="true"></span>');
      }
      if (back && !back.querySelector(".fc-grade")) {
        const grade = document.createElement("div");
        grade.className = "fc-grade";
        grade.innerHTML =
          '<button type="button" class="fc-g fc-g-known" data-g="known">✓ Got it</button>' +
          '<button type="button" class="fc-g fc-g-review" data-g="review">↻ Review</button>';
        back.appendChild(grade);
        grade.querySelectorAll(".fc-g").forEach(b => {
          b.addEventListener("click", e => {
            e.stopPropagation();
            fcStatus[card.dataset.fckey] = b.dataset.g;
            fcSave(fcStatus);
            paint(card);
            card.classList.remove("flipped");
            card.setAttribute("aria-pressed", "false");
            refreshToolbar();
            if (grid.classList.contains("fc-drilling")) applyDrill(true);
          });
        });
      }
      paint(card);
      // Reachable by keyboard as well as tap/click: Enter or Space flips.
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.setAttribute("aria-label", "Flashcard — activate to reveal the answer");
      card.setAttribute("aria-pressed", "false");
      const flip = () => {
        const on = card.classList.toggle("flipped");
        card.setAttribute("aria-pressed", on ? "true" : "false");
      };
      card.addEventListener("click", e => {
        if (e.target.closest(".fc-grade")) return;
        flip();
      });
      card.addEventListener("keydown", e => {
        if (e.target.closest(".fc-grade")) return;
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); }
      });
    });

    function applyDrill(on) {
      grid.classList.toggle("fc-drilling", on);
      cards.forEach(c => c.classList.toggle("fc-hide", on && fcStatus[c.dataset.fckey] !== "review"));
    }

    // Toolbar: existing shuffle / flip-all-back live in the HTML; we add
    // an All / Missed toggle switch (placed first), the count, and a reset.
    const toolbar = grid.previousElementSibling && grid.previousElementSibling.classList.contains("flash-toolbar")
      ? grid.previousElementSibling
      : document.querySelector(`.flash-toolbar[data-for="${grid.id}"]`);
    let allBtn = null, missBtn = null, remainEl = null, resetBtn = null, countEl = null;

    function setMode(mode) {
      const missed = mode === "missed";
      applyDrill(missed);
      if (allBtn) allBtn.classList.toggle("active", !missed);
      if (missBtn) missBtn.classList.toggle("active", missed);
    }
    function refreshToolbar() {
      const rem = remaining();
      if (countEl) countEl.textContent = cards.length + " cards";
      if (remainEl) remainEl.textContent = rem;
      if (missBtn) missBtn.disabled = rem === 0 && !grid.classList.contains("fc-drilling");
      if (rem === 0 && grid.classList.contains("fc-drilling")) setMode("all");
      if (resetBtn) resetBtn.hidden = !cards.some(c => fcStatus[c.dataset.fckey]);
    }

    if (toolbar) {
      countEl = toolbar.querySelector(".flash-count");
      const sw = document.createElement("div");
      sw.className = "fc-switch";
      sw.setAttribute("role", "group");
      sw.setAttribute("aria-label", "Show all cards or only the ones marked for review");
      sw.innerHTML =
        '<button type="button" class="active" data-mode="all">Show all</button>' +
        '<button type="button" data-mode="missed">Show missed <span class="fc-remain">0</span></button>';
      allBtn = sw.querySelector('[data-mode="all"]');
      missBtn = sw.querySelector('[data-mode="missed"]');
      remainEl = sw.querySelector(".fc-remain");
      sw.addEventListener("click", e => {
        const b = e.target.closest("button");
        if (!b || b.disabled) return;
        e.stopPropagation();
        setMode(b.dataset.mode);
      });
      resetBtn = document.createElement("button");
      resetBtn.type = "button";
      resetBtn.className = "flash-btn alt fc-reset-btn";
      resetBtn.textContent = "Reset progress";
      resetBtn.hidden = true;
      resetBtn.addEventListener("click", e => {
        e.stopPropagation();
        cards.forEach(c => { delete fcStatus[c.dataset.fckey]; paint(c); c.classList.remove("fc-hide"); });
        fcSave(fcStatus);
        setMode("all");
        refreshToolbar();
      });
      // switch goes first (before shuffle); reset goes just after the count
      toolbar.insertBefore(sw, toolbar.firstChild);
      if (countEl) toolbar.insertBefore(resetBtn, countEl.nextSibling); else toolbar.appendChild(resetBtn);
    }
    refreshToolbar();

    // Shuffle / flip-all-back buttons (declared in the page HTML).
    toolbar && toolbar.querySelectorAll(".flash-btn[data-action]").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        const unflip = c => { c.classList.remove("flipped"); c.setAttribute("aria-pressed", "false"); };
        if (btn.dataset.action === "reset") {
          cards.forEach(unflip);
        } else if (btn.dataset.action === "shuffle") {
          const order = Array.from(grid.children);
          for (let i = order.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [order[i], order[j]] = [order[j], order[i]];
          }
          order.forEach(c => { unflip(c); grid.appendChild(c); });
        }
      });
    });
  });

  /* ---- Mobile stacked-table labels ----
     Copy each column header onto its cells (data-label) so the
     mobile CSS can render each row as a labeled card. Cells marked
     .term act as the card title and are skipped. */
  document.querySelectorAll(".table-wrap table").forEach(table => {
    const headerCells = table.querySelectorAll("thead th");
    if (!headerCells.length) return;
    const headerTexts = Array.from(headerCells).map(th => th.textContent.trim());
    table.querySelectorAll("tbody tr").forEach(row => {
      const cells = Array.from(row.children).filter(c => c.tagName === "TD");
      cells.forEach((td, i) => {
        if (td.classList.contains("term")) return;
        if (headerTexts[i]) td.setAttribute("data-label", headerTexts[i]);
      });
    });
  });

  /* ---- Definition hide/show self-quiz ----
     Each table gets ONE eye button, in the top-right of its header
     row, that hides/reveals the whole table's answers at once.
       - Default ("glossary" tables — a named term in column 1 with
         its definition/description in the rest of the row): column 1
         stays visible, columns 2+ are hidden together.
       - data-hide-mode="all" ("checklist" tables — the row is a single
         fact that only makes sense recalled as a whole, e.g. a step +
         its rationale): the entire row, including column 1, is hidden.
     A table can opt out entirely with data-nohide.

     With a table hidden, clicking a hidden cell reveals THAT ROW and no
     other, so one answer can be checked without spoiling the rest. */

  /* Everything on the page whose answers can be hidden: one entry per table
     and one per card. The "Hide all answers" button drives them all. */
  const quizzables = [];
  let syncQuizButton = () => {};

  document.querySelectorAll(".table-wrap table").forEach(table => {
    if (table.hasAttribute("data-nohide")) return;
    const hideAll = table.getAttribute("data-hide-mode") === "all";
    const headRow = table.querySelector("thead tr");
    const lastTh = headRow && headRow.lastElementChild;
    if (!lastTh) return;

    const targets = [];
    table.querySelectorAll("tbody tr").forEach(tr => {
      const cells = Array.from(tr.children).filter(c => c.tagName === "TD");
      const rowTargets = hideAll ? cells : cells.slice(1);
      rowTargets.forEach(td => {
        td.classList.add("def-cell");
        td.innerHTML = '<span class="def-text">' + td.innerHTML + "</span>";
        targets.push(td);
      });
    });
    if (!targets.length) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "th-eye";
    btn.setAttribute("aria-label", "Show or hide this table's answers");
    btn.innerHTML = '<span class="icon-eye icon-show-w"></span><span class="icon-eye icon-hide-w"></span>';
    lastTh.classList.add("th-eye-cell");
    lastTh.appendChild(btn);

    const anyHidden = () => targets.some(td => td.classList.contains("def-hidden"));
    const paint = () => {
      const hidden = anyHidden();
      btn.querySelector(".icon-show-w").style.display = hidden ? "none" : "inline-block";
      btn.querySelector(".icon-hide-w").style.display = hidden ? "inline-block" : "none";
      btn.setAttribute("aria-pressed", hidden ? "true" : "false");
    };
    const set = hidden => { targets.forEach(td => td.classList.toggle("def-hidden", hidden)); paint(); };
    // The eye shows everything if anything is hidden, and hides everything otherwise.
    btn.addEventListener("click", () => { set(!anyHidden()); syncQuizButton(); });
    table.addEventListener("click", e => {
      const td = e.target.closest && e.target.closest("td.def-hidden");
      if (!td || !table.contains(td)) return;
      Array.from(td.parentElement.children).forEach(c => c.classList.remove("def-hidden"));
      paint();
      syncQuizButton();
    });
    quizzables.push({ set, allHidden: () => targets.every(td => td.classList.contains("def-hidden")) });
  });

  /* ---- Card hide/show ----
     A card with a heading gets the same eye. The h4 stays as the prompt and
     everything under it is masked, either from its eye or by clicking the
     masked area to reveal it. The body keeps its size while hidden, so cards
     that sit side by side never jump. A card opts out with data-nohide. A
     card with no h4 has no prompt to leave showing, so it is left alone. */
  const EYE =
    '<svg class="eye-on" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>' +
    '<svg class="eye-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

  document.querySelectorAll(".card").forEach(card => {
    if (card.hasAttribute("data-nohide") || card.closest(".flash-grid")) return;
    const h4 = Array.from(card.children).find(c => c.tagName === "H4");
    if (!h4) return;
    const body = document.createElement("div");
    body.className = "card-body";
    while (h4.nextSibling) body.appendChild(h4.nextSibling);
    if (!body.textContent.trim()) { while (body.firstChild) card.appendChild(body.firstChild); return; }
    card.appendChild(body);
    card.classList.add("has-eye");

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "card-eye";
    btn.setAttribute("aria-label", "Show or hide this card's answers");
    btn.setAttribute("aria-pressed", "false");
    btn.innerHTML = EYE;
    card.insertBefore(btn, h4);

    const hidden = () => card.classList.contains("quiz-hidden");
    const set = on => { card.classList.toggle("quiz-hidden", on); btn.setAttribute("aria-pressed", on ? "true" : "false"); };
    btn.addEventListener("click", () => { set(!hidden()); syncQuizButton(); });
    body.addEventListener("click", () => { if (hidden()) { set(false); syncQuizButton(); } });
    quizzables.push({ set, allHidden: hidden });
  });

  /* ---- "Hide all answers": the whole page as a self-test ----
     One button in the row under the "On this page" box. It hides every
     table's and every card's answers at once, and reads "Show all answers"
     once nothing is left showing. Progressions, timelines and callouts are
     not masked. */
  if (quizzables.length) {
    let tools = document.querySelector(".page-tools");
    if (!tools) {
      let top = document.querySelector(".page-top");
      const head = document.querySelector(".page-head");
      if (!top && head) {
        top = document.createElement("div");
        top.className = "page-top";
        head.insertAdjacentElement("afterend", top);
      }
      if (top) {
        tools = document.createElement("div");
        tools.className = "page-tools";
        top.appendChild(tools);
      }
    }
    if (tools) {
      const qbtn = document.createElement("button");
      qbtn.type = "button";
      qbtn.className = "def-btn page-quiz-btn";
      const allHidden = () => quizzables.every(q => q.allHidden());
      syncQuizButton = () => {
        const on = allHidden();
        qbtn.innerHTML = EYE + "<span>" + (on ? "Show all answers" : "Hide all answers") + "</span>";
        qbtn.classList.toggle("is-on", on);
        qbtn.setAttribute("aria-pressed", on ? "true" : "false");
      };
      qbtn.addEventListener("click", () => {
        const hide = !allHidden();
        quizzables.forEach(q => q.set(hide));
        syncQuizButton();
      });
      syncQuizButton();
      tools.appendChild(qbtn);
    }
  }

  /* ---- Lightbox: opens a table/section's stored diagram(s) ----
     A .fig-trigger button reveals the matching hidden .fig-store
     element (by id) inside a centered overlay, so lecture diagrams
     don't take up page space until the reader wants to see them.

     MUST run after the table hide/show pass above. That rewrites
     td.innerHTML to wrap each cell in a .def-text span, which replaces
     every child node in that cell — silently dropping any listener
     already bound to it. Wiring the triggers afterwards means a
     .fig-trigger placed inside a table cell still works. */
  const figTriggers = document.querySelectorAll(".fig-trigger");
  if (figTriggers.length) {
    const lightbox = document.createElement("div");
    lightbox.className = "lightbox-overlay";
    lightbox.innerHTML =
      '<div class="lightbox-box" role="dialog" aria-modal="true">' +
      '<button type="button" class="lightbox-close" aria-label="Close">✕</button>' +
      '<div class="lightbox-body"></div></div>';
    document.body.appendChild(lightbox);
    const lbBody = lightbox.querySelector(".lightbox-body");

    function closeLightbox() {
      lightbox.classList.remove("show");
      lbBody.innerHTML = "";
    }
    lightbox.addEventListener("click", e => { if (e.target === lightbox) closeLightbox(); });
    lightbox.querySelector(".lightbox-close").addEventListener("click", closeLightbox);
    document.addEventListener("keydown", e => { if (e.key === "Escape") closeLightbox(); });

    figTriggers.forEach(btn => {
      btn.addEventListener("click", () => {
        const source = document.getElementById(btn.dataset.lightboxTarget);
        if (!source) return;
        lbBody.innerHTML = source.innerHTML;
        /* The store is hidden, so its images carry loading="lazy" and never
           download while the page sits there. The CLONES we just made are
           what the reader is about to look at, so force them to load now:
           a lazy image inserted into the overlay can otherwise sit forever
           with an empty currentSrc and render as a blank box. Keep both
           halves — the lazy attribute in the store is what stops a large
           photo loading on every page view. */
        lbBody.querySelectorAll("img[loading='lazy']").forEach(img => {
          img.removeAttribute("loading");
          img.src = img.src;
        });
        lightbox.classList.add("show");
      });
    });
  }

  /* ---- Glossary terms ----
     A <span class="gloss">term</span> shows its definition in a small pop-up.
     The definitions are in data/glossary.js, one entry per term, which the
     page loads ahead of this file. A term finds its entry by its own text, or
     by data-term where the page's wording differs ("compliant" is the entry
     "compliance").

       hover or keyboard focus   shows it, and leaving hides it
       click or tap              pins it open, so it works where there is no
                                 hover. A second click, a click anywhere
                                 else, or Esc closes it.

     The pop-up is ONE element appended to <body>, never inside the page
     content. A definition is not page text: it is not counted, not indexed
     for search, and not masked by the hide/show buttons.

     MUST run after the table hide/show pass, and the listeners are delegated
     from the document, for the reason given at the lightbox above: that pass
     rewrites every cell's innerHTML, which replaces the spans inside it. */
  const OUTSIDE_LABEL = "Added from outside the course lectures";   // the words of every .outside mark
  const glossary = {};
  Object.keys(window.GLOSSARY || {}).forEach(term => {
    glossary[term.toLowerCase()] = { term, def: window.GLOSSARY[term].def, outside: !!window.GLOSSARY[term].outside };
  });
  const glossEntry = el => glossary[(el.getAttribute("data-term") || el.textContent).replace(/\s+/g, " ").trim().toLowerCase()];
  const glossTerms = Array.from(document.querySelectorAll(".gloss")).filter(glossEntry);
  if (glossTerms.length) {
    const pop = document.createElement("div");
    pop.className = "gloss-pop";
    pop.id = "gloss-pop";
    pop.setAttribute("role", "tooltip");
    pop.hidden = true;
    pop.innerHTML = '<span class="gloss-term"></span><span class="gloss-def"></span>';
    document.body.appendChild(pop);
    const popTerm = pop.firstChild, popDef = pop.lastChild;
    let openEl = null, pinned = false;

    glossTerms.forEach(el => {
      el.tabIndex = 0;
      /* iOS Safari sends no click for a tap on an element it does not think is
         clickable, and a listener on the document does not count. This empty
         one does. The real handling is the delegated listener below. */
      el.addEventListener("click", () => {});
    });

    function place(el) {
      // The first line box. A term that wraps onto a second line has a bounding
      // box as wide as its paragraph, and the pop-up would centre on nothing.
      const r = el.getClientRects()[0] || el.getBoundingClientRect();
      const edge = 8, gap = 9;
      pop.style.left = "0px"; pop.style.top = "0px";      // measure it at its natural size
      const pw = pop.offsetWidth, ph = pop.offsetHeight;
      const mid = r.left + r.width / 2;
      const left = Math.max(edge, Math.min(mid - pw / 2, document.documentElement.clientWidth - pw - edge));
      // Above the term when there is room under the sticky nav bar, otherwise below.
      const nav = document.querySelector(".topnav");
      const above = r.top - gap - ph >= (nav ? nav.getBoundingClientRect().bottom : 0) + edge;
      pop.classList.toggle("is-above", above);
      pop.classList.toggle("is-below", !above);
      pop.style.left = (left + window.scrollX) + "px";
      pop.style.top = ((above ? r.top - gap - ph : r.bottom + gap) + window.scrollY) + "px";
      pop.style.setProperty("--gloss-arrow", Math.max(14, Math.min(mid - left, pw - 14)) + "px");
    }
    function hide() {
      if (!openEl) return;
      openEl.classList.remove("is-open");
      openEl.removeAttribute("aria-describedby");
      openEl = null; pinned = false;
      pop.hidden = true;
    }
    function show(el, pin) {
      const entry = glossEntry(el);
      if (openEl !== el) {
        hide();
        popTerm.textContent = entry.term;
        popDef.textContent = entry.def;
        if (entry.outside) {      // a definition from outside the lectures: see .outside in styles.css
          const mark = document.createElement("span");
          mark.className = "outside";
          mark.setAttribute("role", "img");
          mark.setAttribute("aria-label", OUTSIDE_LABEL);
          popDef.appendChild(mark);
        }
        pop.hidden = false;
        place(el);
        el.classList.add("is-open");
        el.setAttribute("aria-describedby", "gloss-pop");
        openEl = el;
      }
      pinned = pin;
    }
    const termAt = e => {
      const el = e.target && e.target.closest ? e.target.closest(".gloss") : null;
      return el && glossEntry(el) ? el : null;
    };

    document.addEventListener("mouseover", e => { const el = termAt(e); if (el && el !== openEl) show(el, false); });
    document.addEventListener("mouseout", e => {
      const el = termAt(e);
      if (el && el === openEl && !pinned && !el.contains(e.relatedTarget)) hide();
    });
    document.addEventListener("focusin", e => { const el = termAt(e); if (el && el !== openEl) show(el, false); });
    document.addEventListener("focusout", e => { const el = termAt(e); if (el && el === openEl) hide(); });
    document.addEventListener("click", e => {
      const el = termAt(e);
      if (!el || (el === openEl && pinned)) hide();
      else show(el, true);
    });
    // A tap outside a term. iOS sends no click for a tap on plain page content.
    document.addEventListener("touchstart", e => { if (!termAt(e)) hide(); }, { passive: true });
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") { hide(); return; }
      const el = termAt(e);
      if (el && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        if (el === openEl) hide(); else show(el, true);
      }
    });
    // The pop-up is placed in page pixels, so a new layout leaves it in the wrong
    // spot. Move it, do not close it: a phone fires resize every time its address
    // bar slides away, and a pinned definition would vanish on the first scroll.
    window.addEventListener("resize", () => { if (openEl) place(openEl); });
  }

  /* ---------- the key to the outside mark ----------
     One line above the page-flip links, on a page with a line or a glossary
     term from outside the lectures. See .outside in styles.css. */
  if (document.querySelector(".page-inner .outside") || glossTerms.some(el => glossEntry(el).outside)) {
    const key = document.createElement("p");
    key.className = "outside-key";
    key.textContent = OUTSIDE_LABEL + ".";
    const inner = document.querySelector(".page-inner");
    const before = inner && inner.querySelector(":scope > .page-flip, :scope > footer.site-foot");
    if (before) inner.insertBefore(key, before); else if (inner) inner.appendChild(key);
  }

  /* ---- Freeze table column widths so masking never reflows ----
     Runs after the eye buttons above are wired in, so the frozen
     widths already account for the button + its padding in the
     header row. Skipped when the header row measures 0 (e.g. the
     page first loads at mobile width, where the stacked-card layout
     hides the header) so we never lock columns to a collapsed width.

     Re-runs on resize, and this is load-bearing: the frozen widths are
     pixels, and under table-layout:fixed a table that later grows wider
     than the sum of its columns hands the surplus to EVERY column in
     proportion — including the term column, which then drifts far past
     the width its text needs. Releasing the freeze and re-measuring lets
     `td.term { width:1%; white-space:nowrap }` shrink it back to exactly
     one line of text at whatever the new viewport is.

     Un-masking before measuring matters too: `.def-hidden .def-text` is
     display:none, so a table measured while masked would collapse to the
     wrong widths. Removing and restoring the class inside one task means
     nothing repaints in between. */
  function freezeTableColumns() {
    document.querySelectorAll(".table-wrap table").forEach(table => {
      const ths = table.querySelectorAll("thead th");
      if (!ths.length) return;

      const masked = Array.from(table.querySelectorAll("td.def-hidden"));
      masked.forEach(td => td.classList.remove("def-hidden"));
      table.style.tableLayout = "";
      ths.forEach(th => { th.style.width = ""; });

      const widths = Array.from(ths).map(th => th.getBoundingClientRect().width);
      masked.forEach(td => td.classList.add("def-hidden"));
      if (widths.some(w => w === 0)) return;

      table.style.tableLayout = "fixed";
      ths.forEach((th, i) => { th.style.width = widths[i] + "px"; });
    });
  }

  freezeTableColumns();

  /* A table inside a hidden tab panel measures 0 and is skipped above, so it
     is still unfrozen when its tab is first opened. site.js fires "tabchange"
     on every tab switch; re-measure whatever just became visible. */
  document.addEventListener("tabchange", () => freezeTableColumns());

  let freezeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(freezeTimer);
    freezeTimer = setTimeout(freezeTableColumns, 120);
  });
});
