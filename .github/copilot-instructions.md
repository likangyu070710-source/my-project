# Copilot Instructions — 《新生在儋州怎么活下来》/ "How to Survive Danzhou"

A four-page static website for **BiUH Web Technologies 2026**: a survival guide written by a
student for the students arriving in Danzhou this September.

## Project shape (do not change without reason)

- **Plain HTML + CSS + JavaScript.** No framework, no bundler, no npm, no build step, no tests.
- **No server and no database** — the course explicitly forbids requiring them. Everything must
  work by double-clicking `index.html` or serving the folder statically.
- Four pages, one shared stylesheet, two small scripts. Do not add new tooling, dependencies,
  CDNs, or generated output. Prefer editing the existing files.

```
index.html            home: what the site is, who it is for
arrive.html           registration and settling in
campus.html           campus and nearby (place filter lives here)
danzhou.html          life in Danzhou
css/style.css         the single stylesheet shared by all four pages
js/theme.js           dark/light mode toggle
js/filter.js          campus place filter
images/               og image, favicons, and their HTML sources
```

## Non-negotiable course rules

These come from the tutor's brief and are enforced when grading — respect them in every edit:

- **Nothing is a placeholder.** No lorem ipsum, no "TBD", no vague "maybe/possibly" text. Real,
  specific content only. If something is uncertain, it should be cut, not faked.
- **Semantic HTML.** Use `header` / `nav` / `main` / `section` / `article` / `aside` / `footer`
  / `table` as appropriate, with `aria-*` where it helps.
- **Responsive and phone-usable.** Fluid grids, `clamp()` typography, real `@media` breakpoints.
- **At least one interaction** that responds to the user (the theme toggle and the place filter).
- **Every page must be explainable.** The author must be able to justify any line in the defence.
  So keep code simple and comment *why*, not just *what*.
- **Content TODOs** are marked `TODO(your words)` in the HTML. When filling one, replace the
  whole comment and write real prose — never leave the marker behind.

## Language and writing conventions

- **Site copy is English** (the reader is an international student). CSS/JS/HTML comments are
  **Chinese** — match the surrounding file, don't switch a file's comment language.
- The English copy uses plain, direct sentences; no marketing tone, no "Welcome to my website".
- Keep filenames, ids, classes and `data-*` attributes in English.

## CSS conventions (`css/style.css`)

- **One stylesheet for all pages.** Never add a second `<link rel="stylesheet">` or inline styles.
- The file is organised in numbered sections — keep new rules inside the right one:
  1 变量 → 2 基础 → 3 布局 → 4 组件 → 5 页面专属 → 6 响应式细节.
- **All colours go through the CSS custom properties** defined in `:root`. Never hard-code a hex
  value in a rule; if a new colour is needed, add a variable in `:root` **and** its dark-mode
  counterpart in `html[data-theme="dark"]`.
- Dark mode is driven purely by `html[data-theme="dark"]` overriding those variables — do not
  write theme-specific selectors like `.dark .card` or use `prefers-color-scheme` for it.
- Class names are lower-case, hyphenated, and component-scoped (e.g. `site-header`, `theme-toggle`,
  `filter-status`, `filter-btn`). Reuse existing classes before inventing new ones.
- `box-sizing: border-box` is global; `img` is already `max-width:100%`. Don't repeat these.
- Use `rem`/`em`/`clamp()` for type and spacing, consistent with the existing file.

## JavaScript conventions (`js/*.js`)

- **Vanilla, dependency-free, no modules.** Each file is wrapped in an IIFE with `"use strict"`,
  exactly like the existing scripts.
- **Every script must degrade gracefully**: query for elements, `return` early if absent (a page
  that doesn't use the component simply has no matching elements), and guard storage/URL APIs in
  `try/catch` (private browsing, file:// protocol).
- **Init pattern**: run on `DOMContentLoaded` if `document.readyState === "loading"`, otherwise run
  immediately. Follow the existing helpers in `theme.js` / `filter.js`.
- **Accessibility is part of the behaviour**, not an extra: update `aria-pressed` / `aria-current`
  and announce results in a live region (see `.filter-status`) rather than only changing visuals.
- Theme persistence uses the localStorage key **`danzhou-theme`**; it is also re-applied by the
  inline `<script>` in each page's `<head>` to avoid a flash of the wrong theme. If you touch the
  theme logic, keep that inline snippet and `js/theme.js` in agreement.
- The place filter keys off the `data-cat` attribute on items and `data-filter` on buttons, and
  supports deep-linking with `?cat=<filter>`. Preserve those attribute names.

## Assets (`images/`)

- Files are referenced by exact name in the HTML: `og-image.jpg` (1200×630, <100 KB),
  `favicon-32.png`, `favicon-192.png`, `apple-touch-icon.png`.
- Icons are **PNG only** (JPEG can't be transparent and blurs small). Icons are a single letter or
  shape, designed at 512×512 and downscaled — never upscaled.
- `og-source.html` and `icon-source.html` are the HTML sources used to regenerate the images; the
  palette there must stay in sync with `:root` in `css/style.css`.

## Working with this project

- **Preview locally** with a static server so relative paths and caching behave like production:
  ```powershell
  python -m http.server 8000
  # then open http://localhost:8000/
  ```
- **Deploy** by pushing to GitHub and enabling Pages (branch `main`, folder `/ (root)`); live URLs
  follow `https://<user>.github.io/<repo>/` and are already referenced in the page metadata.
- When adding a page, copy the shared skeleton from `index.html`: the same `<head>` (charset,
  viewport, OG tags, icons, stylesheet, theme snippet), the same header/nav, the same footer, and
  add the link to the nav on **all** four pages, marking the current one with `aria-current="page"`.
- Keep the git history meaningful and staged (the "process" is graded) — don't squash unrelated
  changes into one commit.
