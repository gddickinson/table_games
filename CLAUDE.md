# Claude collaboration notes for `table_games`

George's global preferences (`~/.claude/CLAUDE.md`) apply: files under 500 lines for new code, `INTERFACE.md` as the
navigation map, `SESSION_LOG.md` for progress.

## Project navigation

See @INTERFACE.md for the map of the game (`index.html`, `js/`, `css/`, `docs/`) and the web wrapper (`web/`). Read it
before opening source files.

## Notes

- The game is plain browser JavaScript (IIFEs on `window.MJ`); `web/` serves it unchanged at `/game/`. Do not add a
  build step or rewrite game files to suit the shell.
- Many game modules predate the 500-line rule (largest: `js/dragon/campaign-play.js`, 1,850 lines); split them only as
  a deliberate refactor with the node test runners green.
- `node_modules/` is committed (Puppeteer, for the browser test scripts); the web app and the static site never use it.
