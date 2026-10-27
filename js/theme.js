/* theme.js — 深色 / 浅色切换
   满足课程要求："at least one thing that responds to the user"
   同时也满足 "Behaviour" 判据：不依赖服务器或数据库，纯前端。 */

(function () {
  "use strict";

  var STORAGE_KEY = "danzhou-theme";
  var root = document.documentElement;

  /* 1) 尽早应用已保存的主题。
     这段同时被内联在 <head> 里（避免加载时闪白），此处作为兜底。 */
  function apply(theme) {
    if (theme === "dark") {
      root.setAttribute("data-theme", "dark");
    } else {
      root.removeAttribute("data-theme");
    }
  }

  var saved = null;
  try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) { /* 隐私模式下忽略 */ }
  apply(saved);

  /* 2) 绑定按钮 */
  function init() {
    var btn = document.querySelector(".theme-toggle");
    if (!btn) { return; }

    function label() {
      var dark = root.getAttribute("data-theme") === "dark";
      btn.textContent = dark ? "☀ Light" : "☾ Dark";
      /* 这里不用 aria-pressed：可见文字本来就在"Dark / Light"之间变，
         再配一个 aria-pressed 会让读屏念出"Light，已按下"这种自相矛盾的状态。
         改成把按钮名写成"点了会发生什么"，读屏听到的就是一个明确的操作 */
      btn.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
    }

    btn.addEventListener("click", function () {
      var dark = root.getAttribute("data-theme") === "dark";
      var next = dark ? "light" : "dark";
      apply(next);
      try { localStorage.setItem(STORAGE_KEY, next); } catch (e) { /* 忽略 */ }
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
