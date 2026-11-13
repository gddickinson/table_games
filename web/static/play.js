// Play page: the real game (repo index.html) in a frame, with a link to open it on its own.
import { route, app } from './core.js';

route('play', () => {
  app().innerHTML = `
  <div class="play-bar">
    <h1>Play</h1>
    <span class="small mute">Everything runs in your browser. Progress, coins and the AI's learning are saved in local storage.</span>
    <a class="btn alt" href="game/" target="_blank" rel="noopener">Open the game full window</a>
  </div>
  <iframe class="game-frame" src="game/" title="Table Game Simulator: the game"></iframe>
  <p class="small mute">The LLM tutor answers with scripted responses until you add an Anthropic or OpenAI API key in the
  game's Settings (stored only in your browser); multiplayer and cloud sync need the servers in <code>server/</code> and
  <code>python/</code> (see About).</p>`;
});
