/* search.js — a header field that searches the whole four-page site.
   Client-side only: the four pages are fetched and parsed in the browser,
   so the index is always whatever the pages currently say — there is no
   second copy of the text that can silently drift out of date.

   The whole file is wrapped in one try/catch: if it breaks it must not
   take theme.js or filter.js down with it. */

(function () {
  "use strict";

  var root = document.querySelector("[data-search]");
  if (!root) { return; }

  var PAGES = ["index.html", "arrive.html", "campus.html", "danzhou.html"];

  var input = root.querySelector(".search__input");
  var toggle = root.querySelector(".search__toggle");
  var clearBtn = root.querySelector(".search__clear");
  var box = root.querySelector(".search__box");
  var panel = root.querySelector(".search__panel");
  var meta = root.querySelector(".s-meta");
  var list = root.querySelector(".s-list");
  var empty = root.querySelector(".s-empty");
  var status = root.querySelector("[data-search-status]");
  var header = document.querySelector(".site-header");

  var HINT = "Searches all four pages. Try a place name, or a word like \u201Cparcel\u201D.";

  /* ---- index state --------------------------------------------------- */
  var indexState = "idle";   /* idle | loading | ready | partial | failed */
  var units = [];            /* every searchable block, in reading order */
  var failures = [];

  /* ---- query state --------------------------------------------------- */
  var matches = [];          /* every unit matching the current query */
  var shown = [];            /* matches, capped at 8 */
  var active = -1;           /* index into shown; -1 = none */
  var composing = false;
  var renderTimer = null;
  var announceTimer = null;
  var lastAnnouncement = "";

  /* ---- text extraction ------------------------------------------------
     A plain textContent glues table cells together ("Offer letterOriginal.")
     because it drops the layout that separated them. This walker puts a
     space on either side of block-level elements instead. */
  var BLOCK = /^(P|LI|TD|TH|TR|DIV|H1|H2|H3|H4|FIGCAPTION|UL|OL|TABLE|SECTION|ARTICLE|BLOCKQUOTE|DD|DT)$/;

  function textOf(node) {
    var out = "";
    (function walk(n) {
      if (n.nodeType === 3) { out += n.nodeValue; return; }
      if (n.nodeType !== 1) { return; }
      var tag = n.tagName;
      if (tag === "SCRIPT" || tag === "STYLE" || tag === "TEMPLATE") { return; }
      if (BLOCK.test(tag)) { out += " "; }
      var kids = n.childNodes;
      for (var i = 0; i < kids.length; i += 1) { walk(kids[i]); }
      if (BLOCK.test(tag)) { out += " "; }
    })(node);
    return out.replace(/\s+/g, " ").trim();
  }

  /* Same text, with the boilerplate every page repeats removed: nav, the
     table of contents, filter controls, photo credits, the fine print. */
  function cleanCopy(node) {
    var clone = node.cloneNode(true);
    var drop = clone.querySelectorAll("nav, aside.toc, footer, .skip, .filters, .filter-status, .credit, .fineprint, script, style");
    for (var i = 0; i < drop.length; i += 1) {
      if (drop[i].parentNode) { drop[i].parentNode.removeChild(drop[i]); }
    }
    return clone;
  }

  /* One page becomes three kinds of unit:
     - the page itself (everything before the first titled section)
     - each section that names itself with aria-labelledby
     - each card whose heading carries an id, so a result can land on it */
  function unitsForPage(file, html) {
    var doc = new DOMParser().parseFromString(html, "text/html");
    var main = doc.querySelector("main");
    if (!main) { return []; }

    var h1 = doc.querySelector("h1");
    var pageName = h1 ? h1.textContent.replace(/\s+/g, " ").trim() : file;
    var out = [];

    var cards = Array.prototype.slice.call(main.querySelectorAll("article.card"));
    cards.forEach(function (card) {
      var h3 = card.querySelector("h3[id]");
      if (!h3) { return; }
      out.push({
        file: file,
        page: pageName,
        anchor: h3.id,
        title: h3.textContent.replace(/\s+/g, " ").trim(),
        text: textOf(cleanCopy(card))
      });
    });

    var sections = Array.prototype.slice.call(main.querySelectorAll("section[aria-labelledby]"));
    sections.forEach(function (sec) {
      var head = doc.getElementById(sec.getAttribute("aria-labelledby"));
      if (!head) { return; }
      var copy = cleanCopy(sec);
      /* The cards below are their own units: subtract them so a query that
         matches a card does not also match the section as a longer blob. */
      var nested = copy.querySelectorAll("article.card");
      for (var i = 0; i < nested.length; i += 1) {
        if (nested[i].parentNode) { nested[i].parentNode.removeChild(nested[i]); }
      }
      out.push({
        file: file,
        page: pageName,
        anchor: head.id,
        title: head.textContent.replace(/\s+/g, " ").trim(),
        text: textOf(copy)
      });
    });

    /* The page itself: what is left once the titled parts are out. */
    var pageCopy = cleanCopy(main);
    var titled = pageCopy.querySelectorAll("section[aria-labelledby], article.card");
    for (var j = 0; j < titled.length; j += 1) {
      if (titled[j].parentNode) { titled[j].parentNode.removeChild(titled[j]); }
    }
    out.unshift({
      file: file,
      page: pageName,
      anchor: "",
      title: pageName,
      text: textOf(pageCopy)
    });

    return out;
  }

  /* ---- fetching ------------------------------------------------------ */

  function buildIndex(done) {
    if (indexState === "loading") { return; }
    if (window.location.protocol === "file:") {
      /* Opening the site straight from a folder blocks fetch. Do not waste
         four requests that are guaranteed to fail. */
      indexState = "failed";
      if (done) { done(); }
      return;
    }

    indexState = "loading";
    var remaining = PAGES.length;

    function oneDone() {
      remaining -= 1;
      if (remaining !== 0) { return; }
      if (failures.length === PAGES.length) { indexState = "failed"; }
      else if (failures.length > 0) { indexState = "partial"; }
      else { indexState = "ready"; }
      if (done) { done(); }
    }

    PAGES.forEach(function (file) {
      fetch(new URL(file, window.location.href).href, { credentials: "same-origin" })
        .then(function (r) {
          if (!r.ok) { throw new Error("http " + r.status); }
          return r.text();
        })
        .then(function (html) {
          var got = unitsForPage(file, html);
          units = units.concat(got);
        })
        .catch(function () { failures.push(file); })
        .then(oneDone);
    });
  }

  function retry() {
    units = [];
    failures = [];
    indexState = "idle";
    buildIndex(render);
  }

  function requestIndex() {
    if (indexState === "idle") { buildIndex(render); }
  }

  /* Prefetch as soon as the page is idle, unless the connection is known to
     be slow — then the four documents would race the hero image for nothing. */
  function prefetch() {
    if (indexState !== "idle") { return; }
    if (window.location.protocol === "file:") { indexState = "failed"; return; }
    var conn = navigator.connection;
    if (conn && (conn.saveData === true || conn.effectiveType === "2g" || conn.effectiveType === "slow-2g")) { return; }
    buildIndex(render);
  }

  /* ---- matching ------------------------------------------------------ */

  var TITLE_W = 100, PAGE_W = 50, BODY_W = 20;

  function hasCJK(s) { return /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/.test(s); }

  function normalize(raw) {
    var s = String(raw);
    try { s = s.normalize("NFKC"); } catch (e) { /* very old engine */ }
    s = s.toLowerCase().replace(/\s+/g, " ").trim();
    if (s.length > 64) { s = s.slice(0, 64); }
    return s;
  }

  /* A token's score inside one piece of text. Latin tokens only count at a
     word start, or half inside a longer word once they are 3+ letters — so
     "an" no longer matches "canteen", while "cel" still finds "parcel". */
  function fieldScore(token, text) {
    var idx = text.indexOf(token);
    if (idx === -1) { return 0; }
    if (!hasCJK(token)) {
      var atWordStart = idx === 0 || !/[a-z0-9]/i.test(text.charAt(idx - 1));
      if (!atWordStart) {
        if (token.length < 3) { return 0; }
        return Math.floor(BODY_W / 2);
      }
    }
    var score = BODY_W;
    var count = 1;
    var from = idx + 1;
    while ((from = text.indexOf(token, from)) !== -1 && count < 3) {
      count += 1;
      from += 1;
    }
    if (count === 2) { score += 10; }
    else if (count >= 3) { score += 20; }
    return score;
  }

  /* Every token must match somewhere (AND); a token's score is its best
     field, with the title worth most. Returns a score, or -1 if any token
     missed. */
  function scoreUnit(u, tokens) {
    var title = u.title.toLowerCase();
    var page = u.page.toLowerCase();
    var body = u.text.toLowerCase();
    var total = 0;

    for (var t = 0; t < tokens.length; t += 1) {
      var tok = tokens[t];
      var best = fieldScore(tok, body);

      if (page.indexOf(tok) !== -1 && best < PAGE_W) { best = PAGE_W; }

      var ti = title.indexOf(tok);
      if (ti !== -1) {
        var s = TITLE_W + (title === tok ? 200 : ti === 0 ? 120 : 40);
        if (s > best) { best = s; }
      }

      if (best <= 0) { return -1; }
      total += best;
    }

    return total;
  }

  function compute(tokens) {
    var out = [];
    for (var i = 0; i < units.length; i += 1) {
      var s = scoreUnit(units[i], tokens);
      if (s > 0) { out.push({ unit: units[i], score: s, order: i }); }
    }
    /* Deterministic: score, then where in the title the hit sits, then the
       site's own reading order. The same query must give the same list
       every time, or the list reorders under the reader's cursor. */
    out.sort(function (a, b) {
      if (b.score !== a.score) { return b.score - a.score; }
      var ap = a.unit.title.toLowerCase().indexOf(tokens[0]);
      var bp = b.unit.title.toLowerCase().indexOf(tokens[0]);
      if (ap !== bp) { return ap - bp; }
      return a.order - b.order;
    });
    return out;
  }

  /* ---- rendering ----------------------------------------------------- */

  function buildSnippet(text, token) {
    var span = document.createElement("span");
    span.className = "s-snippet";

    var lower = text.toLowerCase();
    var hitAt = token ? lower.indexOf(token) : -1;
    var start = hitAt === -1 ? 0 : Math.max(0, hitAt - 16);
    var end = Math.min(text.length, start + 90);

    /* Snap the window to word boundaries, so a Latin snippet does not begin
       or end mid-word. CJK has no spaces, so it is cut by the character. */
    if (!hasCJK(text)) {
      while (start > 0 && start < text.length && text.charAt(start) !== " ") { start += 1; }
      while (end > start && end < text.length && text.charAt(end - 1) !== " ") { end -= 1; }
    }

    var windowText = text.slice(start, end);
    var prefix = start > 0 ? "\u2026" : "";
    var suffix = end < text.length ? "\u2026" : "";

    if (prefix) { span.appendChild(document.createTextNode(prefix)); }

    if (hitAt >= start && hitAt < end) {
      var wl = windowText.toLowerCase();
      var pos = wl.indexOf(token);
      if (pos !== -1) {
        span.appendChild(document.createTextNode(windowText.slice(0, pos)));
        var mk = document.createElement("mark");
        mk.textContent = windowText.slice(pos, pos + token.length);
        span.appendChild(mk);
        span.appendChild(document.createTextNode(windowText.slice(pos + token.length)));
      } else {
        span.appendChild(document.createTextNode(windowText));
      }
    } else {
      span.appendChild(document.createTextNode(windowText));
    }

    if (suffix) { span.appendChild(document.createTextNode(suffix)); }
    return span;
  }

  function buildRow(item, token, index) {
    var li = document.createElement("li");
    li.className = "s-row";
    li.setAttribute("role", "option");
    li.id = "search-opt-" + index;
    li.setAttribute("aria-selected", index === 0 ? "true" : "false");

    var page = document.createElement("span");
    page.className = "s-page";
    page.textContent = item.unit.page;
    li.appendChild(page);

    var title = document.createElement("span");
    title.className = "s-title";
    title.textContent = item.unit.title;
    li.appendChild(title);

    li.appendChild(buildSnippet(item.unit.text, token));
    return li;
  }

  function setActive(i) {
    active = i;
    var rows = list.children;
    for (var k = 0; k < rows.length; k += 1) {
      var on = k === i;
      rows[k].classList.toggle("is-active", on);
      rows[k].setAttribute("aria-selected", on ? "true" : "false");
    }
    if (i === -1) {
      input.removeAttribute("aria-activedescendant");
    } else {
      input.setAttribute("aria-activedescendant", "search-opt-" + i);
    }
  }

  function announce(text) {
    if (!text || text === lastAnnouncement) { return; }
    /* Visual follows the fingers (120ms); speech waits 400ms so typing six
       characters does not queue six sentences. */
    window.clearTimeout(announceTimer);
    announceTimer = window.setTimeout(function () {
      if (text === lastAnnouncement) { return; }
      lastAnnouncement = text;
      status.textContent = text;
    }, 400);
  }

  function showError() {
    meta.textContent = "";
    empty.hidden = false;

    var strong = document.createElement("strong");
    strong.textContent = "Search is unavailable";
    empty.appendChild(strong);

    var span = document.createElement("span");
    span.textContent = "The four page files could not be read. The navigation above still works.";
    empty.appendChild(span);

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "s-retry";
    btn.textContent = "Try again";
    btn.addEventListener("click", retry);
    empty.appendChild(btn);

    announce("Search unavailable");
  }

  function render() {
    var q = normalize(input.value);
    var minLen = hasCJK(q) ? 1 : 2;
    var token = q ? q.split(" ")[0] : "";

    list.textContent = "";
    list.hidden = true;
    empty.textContent = "";
    empty.hidden = true;
    meta.textContent = "";

    /* Failed comes before the empty-query hint: a hint that says "searches
       all four pages" is a lie when none of them could be read. */
    if (indexState === "failed") {
      showError();
      setActive(-1);
      return;
    }

    if (!q) {
      meta.textContent = HINT;
      setActive(-1);
      return;
    }

    if (indexState === "loading") {
      /* Only show the message if it is really taking time; a cached page
         resolves in a few ms and flashing "Reading…" is worse than nothing. */
      window.setTimeout(function () {
        if (indexState === "loading") { meta.textContent = "Reading the four pages\u2026"; }
      }, 150);
      setActive(-1);
      return;
    }

    if (q.length < minLen) {
      meta.textContent = "One more character.";
      setActive(-1);
      return;
    }

    matches = compute(q.split(" "));

    if (!matches.length) {
      meta.textContent = "No matches for \u201C" + q + "\u201D";
      empty.hidden = false;
      var strong = document.createElement("strong");
      strong.textContent = "Try a place name";
      empty.appendChild(strong);
      var hint = document.createElement("span");
      hint.textContent = "Meiyijia, Nada, Xingfu Cheng.";
      empty.appendChild(hint);
      announce("No results for " + q);
      setActive(-1);
      return;
    }

    shown = matches.slice(0, 8);
    list.hidden = false;
    for (var i = 0; i < shown.length; i += 1) {
      list.appendChild(buildRow(shown[i], token, i));
    }

    var count;
    if (matches.length > 8) { count = matches.length + " results \u2014 showing the first 8"; }
    else if (matches.length === 1) { count = "1 result"; }
    else { count = matches.length + " results"; }
    meta.textContent = count;

    /* Show the keys hint on wide screens; it is decoration, the screen
       reader hears the count instead. */
    var keys = document.createElement("span");
    keys.className = "s-keys";
    keys.setAttribute("aria-hidden", "true");
    keys.textContent = "\u2191\u2193 move \u00B7 \u21B5 open";
    meta.appendChild(keys);

    if (indexState === "partial") {
      var note = "Searching " + (PAGES.length - failures.length) + " of " + PAGES.length +
        " pages \u2014 " + failures.join(", ").replace(/\.html/g, "") + " could not be read.";
      announce(note);
    } else {
      announce(matches.length > 8 ? matches.length + " results" : count);
    }

    setActive(0);
  }

  function scheduleRender() {
    window.clearTimeout(renderTimer);
    renderTimer = window.setTimeout(render, 120);
  }

  /* ---- open / close -------------------------------------------------- */

  function narrow() {
    return window.matchMedia("(max-width: 60rem)").matches;
  }

  function setOpen(on) {
    if (on) {
      root.setAttribute("data-open", "");
      if (header) { header.setAttribute("data-search-open", ""); }
      toggle.setAttribute("aria-expanded", "true");
      input.setAttribute("aria-expanded", "true");
      panel.hidden = false;
    } else {
      root.removeAttribute("data-open");
      if (header) { header.removeAttribute("data-search-open"); }
      toggle.setAttribute("aria-expanded", "false");
      input.setAttribute("aria-expanded", "false");
      panel.hidden = true;
      setActive(-1);
    }
  }

  /* Closing because the user chose to leave: on a phone the field itself is
     about to disappear, so focus must return to the button. */
  function close() {
    setOpen(false);
    if (narrow()) { toggle.focus(); }
  }

  function updateClear() {
    clearBtn.hidden = input.value.length === 0;
    box.classList.toggle("has-value", input.value.length > 0);
  }

  /* ---- landing ------------------------------------------------------- */

  function currentFile() {
    var p = window.location.pathname.split("/");
    return p[p.length - 1] || "index.html";
  }

  function focusHeading(el) {
    if (!el.hasAttribute("tabindex")) { el.setAttribute("tabindex", "-1"); }
    try { el.focus({ preventScroll: true }); }
    catch (e) { el.focus(); }
  }

  /* A result can point at a card that the campus filter is hiding. Reset it
     to "All" first, or the reader scrolls to a blank space and thinks the
     search broke. */
  function revealIfFiltered(el) {
    if (!el.closest) { return; }
    var card = el.closest("[data-cat]");
    if (card && card.hidden) {
      var all = document.querySelector('[data-filter="all"]');
      if (all) { all.click(); }
    }
  }

  function goTo(item) {
    if (item.unit.file === currentFile()) {
      var target = item.unit.anchor ? document.getElementById(item.unit.anchor) : null;
      if (target) {
        revealIfFiltered(target);
        focusHeading(target);
        try { target.scrollIntoView({ block: "start" }); } catch (e) { /* very old engine */ }
      }
      setOpen(false);
    } else {
      var url = item.unit.anchor
        ? item.unit.file + "#" + item.unit.anchor
        : item.unit.file;
      window.location.href = new URL(url, window.location.href).href;
    }
  }

  function activate(index, event) {
    var item = shown[index];
    if (!item) { return; }
    if (event && (event.metaKey || event.ctrlKey || event.shiftKey)) {
      var href = item.unit.anchor
        ? item.unit.file + "#" + item.unit.anchor
        : item.unit.file;
      window.open(new URL(href, window.location.href).href, "_blank", "noopener");
      return;
    }
    goTo(item);
  }

  /* ---- events -------------------------------------------------------- */

  input.addEventListener("focus", function () {
    requestIndex();
    setOpen(true);
    render();
  });

  input.addEventListener("input", function () {
    if (composing) { return; }
    updateClear();
    if (!input.value) { render(); }
    else { scheduleRender(); }
  });

  input.addEventListener("compositionstart", function () { composing = true; });
  input.addEventListener("compositionend", function () {
    composing = false;
    /* Safari fires compositionend before the final input event, so read the
       value on the next tick rather than now. */
    window.setTimeout(function () { updateClear(); render(); }, 0);
  });

  input.addEventListener("keydown", function (e) {
    var key = e.key;

    if (key === "ArrowDown") {
      e.preventDefault();
      if (!matches.length) { return; }
      if (active === -1) { setActive(0); }
      else if (active + 1 < shown.length) { setActive(active + 1); }
    } else if (key === "ArrowUp") {
      e.preventDefault();
      if (active === -1) { close(); }
      else if (active === 0) { setActive(-1); }
      else { setActive(active - 1); }
    } else if (key === "Enter") {
      if (matches.length) {
        e.preventDefault();
        activate(active === -1 ? 0 : active, e);
      }
    } else if (key === "Escape") {
      e.preventDefault();
      if (!panel.hidden) { close(); }
      else if (input.value) { input.value = ""; updateClear(); render(); }
    }
    /* Home and End are deliberately left alone: in a search box the common
       next move is "go back and fix a word", not "jump to result 8". */
  });

  input.addEventListener("focusout", function () {
    /* When focus leaves the widget entirely, close it. Rows are not
       focusable, so this only fires on a real exit. */
    window.setTimeout(function () {
      if (!panel.hidden && !root.contains(document.activeElement)) { setOpen(false); }
    }, 0);
  });

  toggle.addEventListener("click", function () {
    if (!panel.hidden) { close(); return; }
    requestIndex();
    setOpen(true);
    input.focus();
  });

  clearBtn.addEventListener("click", function () {
    input.value = "";
    updateClear();
    input.focus();
    render();
  });

  list.addEventListener("mousedown", function (e) {
    /* Without this, the mousedown first blurs the input, the focusout
       closes the panel, and the click then lands on nothing. */
    e.preventDefault();
  });

  list.addEventListener("click", function (e) {
    var row = e.target.closest ? e.target.closest(".s-row") : null;
    if (!row) { return; }
    var i = Array.prototype.indexOf.call(list.children, row);
    activate(i, e);
  });

  document.addEventListener("pointerdown", function (e) {
    if (!panel.hidden && !root.contains(e.target)) { setOpen(false); }
  });

  /* If the URL opened with a #hash that points at a heading, move focus
     there (after the browser's own fragment scroll) so the Tab key carries
     on from the section, not from the top of the page. */
  function focusHashTarget() {
    var hash = window.location.hash;
    if (!hash || hash.length < 2) { return; }
    var target;
    try { target = document.getElementById(hash.slice(1)); } catch (e) { return; }
    if (target && /^(H2|H3)$/i.test(target.tagName)) { focusHeading(target); }
  }

  /* ---- boot ---------------------------------------------------------- */

  root.hidden = false;

  if (window.requestIdleCallback) { window.requestIdleCallback(prefetch); }
  else { window.setTimeout(prefetch, 1200); }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", focusHashTarget);
  } else {
    focusHashTarget();
  }
})();
