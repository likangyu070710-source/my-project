/* filter.js — filtering the campus places
   Used on campus.html.
   Each card carries data-cat; the buttons show and hide by category and the
   result count is announced live. Client-side only — no server involved. */

(function () {
  "use strict";

  function init() {
    var bar = document.querySelector(".filters");
    var list = document.querySelector("[data-filter-list]");
    if (!bar || !list) { return; }

    var buttons = Array.prototype.slice.call(bar.querySelectorAll("button"));
    var items = Array.prototype.slice.call(list.querySelectorAll("[data-cat]"));
    var status = document.querySelector(".filter-status");

    function apply(cat) {
      var shown = 0;

      items.forEach(function (item) {
        var cats = (item.getAttribute("data-cat") || "").split(/\s+/);
        var match = cat === "all" || cats.indexOf(cat) !== -1;
        item.hidden = !match;
        if (match) { shown += 1; }
      });

      buttons.forEach(function (b) {
        b.setAttribute("aria-pressed", b.getAttribute("data-filter") === cat ? "true" : "false");
      });

      if (status) {
        var noun = shown === 1 ? " place" : " places";
        status.textContent = cat === "all"
          ? "Showing all " + shown + " places"
          : "Showing " + shown + noun + " in " + labelOf(cat);
      }

      /* Write the current category back into the address bar, so a refresh, a
         back button or a shared link returns the same view. replaceState keeps
         it out of the history stack. */
      try {
        var url = new URL(window.location.href);
        if (cat === "all") { url.searchParams.delete("cat"); }
        else { url.searchParams.set("cat", cat); }
        window.history.replaceState(null, "", url);
      } catch (e) { /* replaceState is blocked on file:// — ignore */ }
    }

    function labelOf(cat) {
      var b = buttons.filter(function (x) { return x.getAttribute("data-filter") === cat; })[0];
      return b ? b.textContent.trim() : cat;
    }

    bar.addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-filter]");
      if (!btn) { return; }
      apply(btn.getAttribute("data-filter"));
    });

    /* A URL parameter can open a category directly, e.g. campus.html?cat=food */
    var initial = "all";
    try {
      var p = new URLSearchParams(window.location.search).get("cat");
      if (p && buttons.some(function (b) { return b.getAttribute("data-filter") === p; })) {
        initial = p;
      }
    } catch (e) { /* ignore */ }

    apply(initial);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
