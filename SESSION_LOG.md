# SESSION_LOG

## 2026-11-13: web interface and GitHub Pages site (branch `web-interface`)
- Added `web/` (FastAPI + house-style ES-module shell), `run_web.py` (port 8251), `scripts/build_static.py`,
  `scripts/screenshots.py`, `tests/test_web.py`, `requirements-web.txt`, `.github/workflows/pages.yml`.
- The site is the real game: `index.html`, `js/`, `css/`, `docs/` served unchanged at `/game/` (and copied to
  `site/game/`). Shell pages: Home, Play (game in a frame), Games, Card lab (drives the game's own
  `poker/hand-eval.js` and `blackjack/blackjack-ai.js`), Docs (14 Markdown docs, search), About.
- Node tests: `web/static/lab_logic.test.mjs` loads the real game scripts and checks hand-worked poker categories,
  a hand-counted outs case (23) and that the chart reproduces `HARD/SOFT/PAIR_STRATEGY` exactly;
  `web/static/markdown.test.mjs` renders all 14 docs without losing headings or text.
- **Fix** (separate commit): the service worker was registered as `/sw.js` and pre-cached absolute paths, and the
  manifest started at `/index.html`; from any sub-path (GitHub Pages, a sub-folder) registration 404'd with a console
  error and offline play never installed. Paths are now relative; cache renamed `mahjong-v2`. Test:
  `tests/test_pwa_paths.py`.
- README: added the web section, and Dragon's Lair (present in the code and intro screen) to the games table and
  architecture tree.
- Existing node suites still pass: `node js/test-modules.js` 25/25, `node run-poker-test.js` 18/18.
