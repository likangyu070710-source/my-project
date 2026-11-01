/* machine.js — the useless machine at the foot of the home page.
   One question goes in, one answer that helps nobody comes out.

   It demonstrates itself once, when it first scrolls into view, and then
   waits to be asked: a toy that loops forever on a page someone is trying
   to read is not a toy, it is an obstacle.

   No server, no storage. The whole machine is this file plus the markup
   on the page. */

(function () {
  "use strict";

  var section = document.querySelector("[data-machine-section]");
  if (!section) { return; }

  var box = section.querySelector("[data-machine]");
  var input = section.querySelector(".machine__input");
  var runBtn = section.querySelector("[data-mrun]");
  var qEl = section.querySelector("[data-mq]");
  var sEl = section.querySelector("[data-ms]");
  var aEl = section.querySelector("[data-ma]");

  var QUESTIONS = [
    "Is the canteen still open?",
    "Will the bus actually come?",
    "Do I need my passport tomorrow?",
    "Can I print this before the deadline?",
    "Should I walk to Xingfu Cheng?",
    "Is it going to rain?"
  ];

  var ANSWERS = [
    "Yes. No. Both.",
    "Ask again on a Tuesday.",
    "Approved by nobody.",
    "The answer is 7. It is always 7.",
    "Please hold. Forever.",
    "Yes, but in a different building.",
    "Result withheld for quality reasons.",
    "It depends on the weather you did not ask about."
  ];

  var STATUS = [
    "Consulting the manual.",
    "Asking a colleague.",
    "Reconsidering.",
    "Checking the weather.",
    "Recalibrating.",
    "Nearly. Probably."
  ];

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var state = "idle";
  var timers = [];
  var autoTyping = false;

  /* ---- helpers ---- */

  function later(fn, ms) {
    var id = window.setTimeout(fn, ms);
    timers.push(id);
    return id;
  }

  function clearTimers() {
    for (var i = 0; i < timers.length; i += 1) { window.clearTimeout(timers[i]); }
    timers = [];
  }

  function setState(next) {
    state = next;
    box.setAttribute("data-state", next);
  }

  /* A bag, not a dice: nothing repeats until the list has been used up. */
  function bag(list) {
    var pool = [];
    return function next() {
      if (!pool.length) { pool = list.slice(); }
      var i = Math.floor(Math.random() * pool.length);
      return pool.splice(i, 1)[0];
    };
  }

  var nextQuestion = bag(QUESTIONS);
  var nextAnswer = bag(ANSWERS);

  /* ---- the cycle ---- */

  function typeInto(text, done) {
    if (reduce) {                 /* no per-character animation, same result */
      input.value = text;
      later(done, 260);
      return;
    }

    autoTyping = true;
    input.value = "";
    var i = 1;

    (function step() {
      if (!autoTyping) { return; }
      input.value = text.slice(0, i);
      i += 1;
      if (i > text.length) { autoTyping = false; done(); return; }
      later(step, 24);
    })();
  }

  function runMachine(question) {
    input.value = "";
    qEl.textContent = question;
    setState("thinking");

    var at = 0;
    sEl.textContent = STATUS[0];

    (function cycleStatus() {
      if (state !== "thinking") { return; }
      at = (at + 1) % STATUS.length;
      sEl.textContent = STATUS[at];
      later(cycleStatus, 540);
    })();

    later(function () {
      setState("answering");
      sEl.textContent = "Answer ready.";
      aEl.textContent = nextAnswer();

      later(function () {
        setState("idle");
        sEl.textContent = "Standing by.";
        later(function () { qEl.textContent = "Ready."; }, 600);
      }, 3400);
    }, 2200);
  }

  function startCycle() {
    if (state !== "idle") { return; }
    setState("asking");
    qEl.textContent = "";
    sEl.textContent = "Listening.";

    var question = nextQuestion();
    typeInto(question, function () {
      later(function () { runMachine(question); }, 380);
    });
  }

  function runManual() {
    /* Run always runs: pressing it mid-cycle drops the current one and
       starts again, which is what a visitor expects from a big button. */
    clearTimers();
    autoTyping = false;
    setState("idle");

    var typed = input.value.trim();

    if (typed) {
      runMachine(typed);
      return;
    }

    setState("asking");
    qEl.textContent = "";
    sEl.textContent = "Choosing a question.";

    var question = nextQuestion();
    typeInto(question, function () {
      later(function () { runMachine(question); }, 380);
    });
  }

  /* ---- events ---- */

  runBtn.addEventListener("click", runManual);

  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      runManual();
    }
  });

  input.addEventListener("input", function () {
    autoTyping = false;
  });

  /* ---- boot ---- */

  /* Shown only when the script is here: a machine that cannot run is worse
     than no machine. */
  section.hidden = false;

  var demoed = false;

  function demoOnce() {
    if (demoed) { return; }
    demoed = true;
    later(startCycle, 300);
  }

  if (window.IntersectionObserver) {
    var io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i += 1) {
        if (entries[i].isIntersecting) {
          io.disconnect();
          demoOnce();
        }
      }
    }, { threshold: 0.35 });

    io.observe(box);
  } else {
    demoOnce();
  }
})();
