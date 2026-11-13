# INTERFACE.md: navigation map of `table_games`

## The game (browser, vanilla JavaScript)
| Path | What it is |
|------|------------|
| `index.html` | entry point: loads every script in `js/` in dependency order (no bundler) |
| `js/*.js` | Mahjong engine (`tile`, `wall`, `hand`, `scoring`, `dora`, `furiten`, `shanten-table`), AI (`ai-engine`, `ai`, `ai-learning`, `difficulty`, `exploitative-ai`), characters and living world (`personality`, `character-*`, `living-world`, `story-arcs`, `economy`, ...), tutoring (`tutor`, `llm-*`, `hint-engine`, `practice-mode`), media (`renderer`, `tile-renderer`, `music`, `voice`, `sound`, `portraits`), UI flow (`intro-screen`, `game-flow`, `main`) |
| `js/poker/` | Texas Hold'em: `cards.js` (Card, Deck), `hand-eval.js` (`MJ.Poker.HandEval`: evaluateHand, getOuts, compareHands), engine, AI v1/v2, learning, UI |
| `js/blackjack/` | `blackjack-cards.js` (hand value), `blackjack-ai.js` (`MJ.Blackjack.AI`: basic-strategy tables, Hi-Lo count, personalities), engine, UI |
| `js/dominoes/` | double-six block dominoes: tiles, engine, AI, learning, UI |
| `js/dragon/` | Dragon's Lair: battle (`dragon-rules/engine/ai/...`) and campaign (`campaign-*`) |
| `css/` | 6 stylesheets |
| `docs/*.md` | 14 rulebooks/guides opened by `js/doc-viewer.js` (and by the web Docs page) |
| `sw.js`, `manifest.json`, `js/service-worker-register.js` | PWA: offline cache (paths relative, so it works from a sub-path) |
| `server/` (Express + SQLite), `python/` (`ai_bridge.py`, `server.py`) | optional multiplayer / cloud sync / Python AI bridge |
| `build.js` | production bundler to `dist/` |
| `run-headless.js`, `run-poker-*.js`, `test-*.js`, `js/test-modules.js` | node and Puppeteer test runners (see README) |

## Web wrapper (`web/`, Python + ES modules)
| Path | What it is |
|------|------------|
| `run_web.py` | starts uvicorn on 127.0.0.1:8251 |
| `web/app.py` | FastAPI: shell at `/`, the game unchanged at `/game/` (whitelist: `content.GAME_FILES`/`GAME_DIRS`), `/shots/` (README screenshots), API `/api/info`, `/api/games`, `/api/docs`, `/api/docs/{slug}`; `STATIC_ENDPOINTS` |
| `web/content.py` | facts from the repo: `GAMES` (intro-screen cards + README), `CHARACTERS` (README), `SHOTS`, `docs_list()`, `doc()`, `code_counts()` |
| `web/static/index.html`, `style.css` (kit), `style_app.css`, `core.js` (kit router/api), `main.js`, `static_api.js` | shell |
| `web/static/home.js`, `play.js`, `games.js`, `lab.js`, `docs.js`, `about.js` | one module per page |
| `web/static/game_scripts.js` | loads the game's own classic scripts (`game/js/...`) into the shell (`gameMJ()`) |
| `web/static/lab_logic.js` | pure helpers for the Card lab over the game's `MJ` (card codes, `pokerHand`, `pokerOuts`, `bjAction`, `strategyChart`) |
| `web/static/markdown.js` | small Markdown renderer for the Docs page |
| `web/static/*.test.mjs` | node tests: `lab_logic.test.mjs` (loads the real game scripts; hand-worked cases; chart == tables), `markdown.test.mjs` |
| `scripts/build_static.py` | static export to `site/`: shell + API JSON + the game copied to `site/game/` + screenshots |
| `scripts/screenshots.py` | Playwright smoke test and README images (`docs/img/`, excluded from the game copy) |
| `tests/test_web.py`, `tests/test_pwa_paths.py` | pytest: endpoints, game whitelist, static build, node tests; PWA path regression |
| `.github/workflows/pages.yml` | builds and publishes the static site on push to `main` |
