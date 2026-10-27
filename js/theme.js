/* theme.js — dark / light mode
   One of the things on this site that responds to the user.
   No server, no database: the choice is kept in localStorage. */

(function () {
  "use strict";

  var STORAGE_KEY = "danzhou-theme";
  var root = document.documentElement;

  /* 1) Apply the saved theme as early as possible.
     The same line is inlined in <head> to avoid a white flash; this is the fallback. */
  function apply(theme) {
    if (theme === "dark") {
      root.setAttribute("data-theme", "dark");
    } else {
      root.removeAttribute("data-theme");
    }
  }

  var saved = null;
  try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) { /* throws in private mode — ignore */ }
  apply(saved);

  /* 2) Wire up the button */
  function init() {
    var btn = document.querySelector(".theme-toggle");
    if (!btn) { return; }

    function label() {
      var dark = root.getAttribute("data-theme") === "dark";
      btn.textContent = dark ? "☀ Light" : "☾ Dark";
      /* No aria-pressed here: the visible label already flips between Dark and
         Light, so a pressed state would announce "Light, pressed" — contradictory.
         Naming the button after what it will do gives one clear announcement. */
      btn.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
    }

    btn.addEventListener("click", function () {
      var dark = root.getAttribute("data-theme") === "dark";
      var next = dark ? "light" : "dark";
      apply(next);
      try { localStorage.setItem(STORAGE_KEY, next); } catch (e) { /* ignore */ }
      label();
    });

    label();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
