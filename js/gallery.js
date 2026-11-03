/* gallery.js — an auto-advancing strip of photographs at the foot of the
   campus page. One list below is the whole content model: add a line to
   PHOTOS and a new photograph appears everywhere it needs to.

   It keeps itself polite. The strip only moves when the page is visible,
   holds still while a pointer or the keyboard is on it, and does nothing
   at all for someone who has asked for reduced motion. */

(function () {
  "use strict";

  var gallery = document.querySelector("[data-gallery]");
  if (!gallery) { return; }

  /* Add a photograph here: the file (in images/), its real pixel size so
     the frame reserves the space, what it shows for a screen reader, one
     caption line, and where the wide frame should crop it from. */
  var PHOTOS = [
    { src: "images/campus-swans.webp", w: 1000, h: 1334, pos: "center",
      alt: "Two black swans swimming on a lake beside modern glass buildings",
      caption: "The black swans on the lake between the buildings." },
    { src: "images/campus-swans-night.webp", w: 1000, h: 1334, pos: "center",
      alt: "Black swans on a dark pond at dusk, with lit windows reflecting on the water",
      caption: "The same lake, after dark." },
    { src: "images/campus-sunset.webp", w: 1280, h: 960, pos: "center",
      alt: "Silhouetted people on a rocky shore under a pink and orange sunset sky",
      caption: "The water and the sky, doing most of the work." },
    { src: "images/campus-goat.webp", w: 1000, h: 1334, pos: "center",
      alt: "A black goat standing on a paved campus walkway at night",
      caption: "A goat on the walkway. It was not in any official material." },
    { src: "images/campus-meteor.webp", w: 1000, h: 1334, pos: "center",
      alt: "A starry night sky with a meteor streaking across it",
      caption: "A shooting star over the campus, on a clear night." },
    { src: "images/campus-sky.webp", w: 1600, h: 900, pos: "center",
      alt: "A blue sky filled with white cumulus clouds above the edge of a building",
      caption: "The sky does most of the scenery around here." }
  ];

  var CREDIT = "Photo: the author.";
  var INTERVAL = 6000;   /* ms; under five seconds feels like it is chasing you */

  var track = gallery.querySelector("[data-track]");
  var captionEl = gallery.querySelector("[data-caption]");
  var creditEl = gallery.querySelector("[data-credit]");
  var countEl = gallery.querySelector("[data-count]");
  var prevBtn = gallery.querySelector("[data-prev]");
  var nextBtn = gallery.querySelector("[data-next]");
  var playBtn = gallery.querySelector("[data-play]");

  var index = 0;
  var playing = true;
  var timer = null;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Build the slides. Only the first is out in the open; the others are
     hidden from the screen reader until they move into view. */
  PHOTOS.forEach(function (p, i) {
    var li = document.createElement("li");
    li.className = "gallery__slide";
    li.setAttribute("aria-roledescription", "slide");
    li.setAttribute("aria-label", (i + 1) + " of " + PHOTOS.length);
    li.setAttribute("aria-hidden", i === 0 ? "false" : "true");

    var img = document.createElement("img");
    img.src = p.src;
    img.width = p.w;
    img.height = p.h;
    img.alt = p.alt;
    img.loading = i === 0 ? "eager" : "lazy";
    img.decoding = "async";
    img.style.objectPosition = p.pos;
    li.appendChild(img);

    track.appendChild(li);
  });

  var slides = Array.prototype.slice.call(track.children);

  function preload(i) {
    var img = new Image();
    img.src = PHOTOS[i].src;
    img.decoding = "async";
  }

  function goTo(i, instant) {
    index = (i + PHOTOS.length) % PHOTOS.length;

    /* The jump back from the last slide to the first should not rewind
       across every slide in between, so that one move skips the animation. */
    if (instant) { track.style.transition = "none"; }
    track.style.transform = "translateX(-" + index * 100 + "%)";
    if (instant) { void track.offsetWidth; track.style.transition = ""; }

    var p = PHOTOS[index];
    captionEl.textContent = p.caption;
    creditEl.textContent = CREDIT;
    countEl.textContent = (index + 1) + " / " + PHOTOS.length;

    slides.forEach(function (s, k) {
      s.setAttribute("aria-hidden", k === index ? "false" : "true");
    });

    preload((index + 1) % PHOTOS.length);
  }

  function stop() {
    if (timer) { window.clearTimeout(timer); timer = null; }
  }

  function schedule() {
    stop();
    if (!playing || reduce || document.hidden) { return; }
    timer = window.setTimeout(function () {
      goTo(index + 1, false);
      schedule();
    }, INTERVAL);
  }

  function setPlaying(on) {
    playing = on;
    playBtn.textContent = on ? "Pause" : "Play";
    playBtn.setAttribute("aria-label", on ? "Pause the slideshow" : "Play the slideshow");
    if (on) { schedule(); } else { stop(); }
  }

  nextBtn.addEventListener("click", function () { goTo(index + 1, false); schedule(); });
  prevBtn.addEventListener("click", function () { goTo(index - 1, false); schedule(); });
  playBtn.addEventListener("click", function () { setPlaying(!playing); });

  /* Hold still while the reader is actually touching it. */
  gallery.addEventListener("mouseenter", stop);
  gallery.addEventListener("mouseleave", function () { if (playing) { schedule(); } });
  gallery.addEventListener("focusin", stop);
  gallery.addEventListener("focusout", function (e) {
    if (!gallery.contains(e.relatedTarget) && playing) { schedule(); }
  });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { stop(); }
    else if (playing) { schedule(); }
  });

  /* Boot. */
  gallery.hidden = false;
  goTo(0, true);
  preload(1);
  if (!reduce) { schedule(); }
})();
