// Home page: hero, counts from /api/info (computed from the repo), cards to the pages, the AI characters.
import { route, api, app, esc, list } from './core.js';

route('home', async () => {
  const [info, g] = await Promise.all([api('/info'), api('/games')]);
  app().innerHTML = `
  <section class="hero split">
    <div>
      <p class="kicker">Mahjong · Hold'em · Blackjack · Dominoes · Dragon's Lair</p>
      <h1 class="glow">Table Game Simulator</h1>
      <p class="lead">A living multi-game table game simulator with AI opponents who have persistent personalities, memories,
      and emotions that carry across games. Built entirely in vanilla JavaScript: the full game runs right here in your browser.</p>
      <a class="btn" href="#/play">Play now</a><a class="btn alt" href="#/games">The games</a><a class="btn alt" href="#/lab">Card lab</a>
    </div>
    <div class="hero-shot"><img src="shots/screenshots-final/01_01_intro_screen.png"
      alt="The game's selection screen (a screenshot committed in the repo) with cards for Mahjong, Texas Hold'em, Blackjack and Dominoes"></div>
  </section>
  <div class="tiles">
    <div class="tile"><b>${info.games}</b><span>games on the table</span></div>
    <div class="tile"><b>${info.characters}</b><span>core AI characters</span></div>
    <div class="tile"><b>${info.js_modules}</b><span>JavaScript modules</span></div>
    <div class="tile"><b>${(info.js_lines / 1000).toFixed(0)}k</b><span>lines of game JavaScript</span></div>
    <div class="tile"><b>${info.docs}</b><span>rulebooks and guides (${info.doc_lines.toLocaleString('en')} lines)</span></div>
  </div>
  <div class="grid">
    <a class="card" href="#/play"><b>Play</b><small>the real game, unchanged</small><span>Pick a game on the intro screen; saves stay in your browser's local storage.</span></a>
    <a class="card" href="#/games"><b>Games</b><small>five games, one table</small><span>What each game implements and how its AI plays, with screenshots from the repo.</span></a>
    <a class="card" href="#/lab"><b>Card lab</b><small>the game's own evaluators</small><span>Rank any poker hand and look up the Blackjack AI's basic strategy chart.</span></a>
    <a class="card" href="#/docs"><b>Docs</b><small>${info.docs} documents</small><span>Rulebooks, strategy guides, the Mahjong tutorial and history, the Dragon's Lair campaign.</span></a>
  </div>
  <h2>The characters</h2>
  <p class="mute">Three AI opponents whose personalities persist across all games (from the README).</p>
  <div class="chars">${list(g.characters, c => `<div class="card"><b><span class="ic" aria-hidden="true">${c.icon}</span>${esc(c.name)}</b>
    <span>${esc(c.text)}</span></div>`)}</div>
  <h2>How this site works</h2>
  <div class="flow">
    <div>The game is the repo's own front end (<code>index.html</code>, ${info.scripts_in_index} scripts from <code>js/</code>,
      <code>css/</code>, <code>docs/</code>), served unchanged under <code>game/</code> so it keeps its own look.</div>
    <div>The Card lab loads the game's real <code>poker/hand-eval.js</code> and <code>blackjack/blackjack-ai.js</code>;
      a node test checks them against hand-worked cases.</div>
    <div>The counts above, the game list and the documents come from the repository files through a small API, exported to
      JSON for this static site.</div>
  </div>`;
});
