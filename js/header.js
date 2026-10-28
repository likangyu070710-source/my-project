/* header.js — keep --header-offset honest.
   The stylesheet guesses the sticky header's height (5rem, or 7rem on a
   phone) so that #hash jumps clear it. Any change to the header — the
   search button, a taller theme button — silently breaks that guess, and
   then every anchor lands under the header.

   This file measures the real height and writes it onto <html>, which
   overrides the guess. It must keep running after the search feature was
   added: on a phone the header is about 114.8px, while the 7rem guess is
   only 112px — without this measurement every jump is clipped by ~3px. */

(function () {
  "use strict";

  var header = document.querySelector(".site-header");
  if (!header) { return; }

  function measure() {
    var h = Math.ceil(header.getBoundingClientRect().height);
    document.documentElement.style.setProperty("--header-offset", h + "px");
  }

  measure();

  if (window.ResizeObserver) {
    new ResizeObserver(measure).observe(header);
  }
  window.addEventListener("resize", measure);
})();
