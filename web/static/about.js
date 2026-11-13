// About page: what the project is, how to run the game, the web app and the tests, and credits (from the README).
import { route, app, isStatic } from './core.js';

route('about', () => {
  app().innerHTML = `
  <p class="kicker">About</p>
  <h1>Table Game Simulator</h1>
  <p class="lead">A living multi-game table game simulator with AI opponents who have persistent personalities, memories, and
  emotions that carry across games. Built entirely in vanilla JavaScript: no frameworks, no build tools required.</p>

  <h2>This web version</h2>
  <p>The <a href="#/play">Play</a> page is the repo's own game (<code>index.html</code> with <code>js/</code>,
  <code>css/</code> and <code>docs/</code>), unchanged, so it keeps its own look. Around it, this site adds a games
  overview, a <a href="#/lab">Card lab</a> that drives the game's own poker evaluator and Blackjack strategy code, and a
  library of the game's documents. ${isStatic() ? 'This static site needs no server.' : 'This local app serves the game at /game/.'}</p>
  <div class="callout">While building this site, a bug was fixed: the service worker was registered as <code>/sw.js</code>
  and pre-cached absolute paths, so offline play failed (with a 404 in the console) whenever the game was served from
  anywhere but the root of a domain, such as GitHub Pages. See SESSION_LOG.md.</div>

  <h2>Play locally</h2>
  <pre>open index.html                     # no installation needed
python3 -m http.server 8080         # or serve it: http://localhost:8080</pre>

  <h2>Run the web app</h2>
  <pre>pip install -r requirements-web.txt
python run_web.py                   # http://127.0.0.1:8251 (game at /game/)</pre>
  <p>Build the static site (what GitHub Pages serves) with <code>python scripts/build_static.py</code>; run the web tests
  with <code>python -m pytest -q tests</code> (they include the node tests of the Card lab and the docs renderer).</p>

  <h2>Tests and headless play (from the README)</h2>
  <pre>node js/test-modules.js             # Mahjong module tests
node run-poker-test.js              # Poker AI tests
node run-headless.js --games 10 --verbose
node run-poker-headless.js 100</pre>

  <h2>Optional servers</h2>
  <p>Multiplayer and cloud sync need a server: <code>cd server &amp;&amp; npm install &amp;&amp; node app.js</code>
  (Express + SQLite) or <code>python3 python/server.py</code>, then connect from Settings, Multiplayer. The LLM tutor works
  offline with scripted responses; for full conversations enter an Anthropic or OpenAI API key under Settings, LLM API
  Configuration (stored in your browser's local storage).</p>

  <h2>Credits</h2>
  <p>Built with Claude Code (Anthropic). No external dependencies: pure vanilla JavaScript, CSS, and HTML. MIT licence.
  Source: <a href="https://github.com/gddickinson/table_games" target="_blank" rel="noopener">github.com/gddickinson/table_games</a>.</p>`;
});
