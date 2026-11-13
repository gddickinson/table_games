// Games page: the five games (intro-screen cards + README table), their docs, and screenshots committed in the repo.
import { route, api, app, esc, list } from './core.js';

route('games', async () => {
  const [g, docs] = await Promise.all([api('/games'), api('/docs')]);
  const title = Object.fromEntries(docs.map(d => [d.slug, d.title]));
  const card = x => `
    <section class="panel game-card" id="g-${x.id}">
      <div>
        <h2><span class="ic" aria-hidden="true">${x.icon}</span>${esc(x.name)}</h2>
        <p class="mute">${esc(x.blurb)}</p>
        <p>${esc(x.description)}</p>
        <dl>${list(Object.entries(x.stats), ([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`)}<dt>How the AI plays</dt><dd>${esc(x.ai)}</dd></dl>
        <p class="small">Read: ${list(x.docs, s => `<a href="#/docs/${s}">${esc(title[s] || s)}</a>`, ' · ')}</p>
      </div>
      <div>${x.shot ? `<img src="shots/${x.shot}" alt="${esc(x.name)} in play (screenshot committed in the repo)" loading="lazy">`
        : `<p class="mute small">No screenshot of ${esc(x.name)} is committed in the repo; <a href="#/play">play it</a>.</p>`}</div>
    </section>`;
  app().innerHTML = `
  <p class="kicker">Games</p>
  <h1>Five games, one table</h1>
  <p class="lead">Every game shares the same AI characters, whose mood and memory carry from one game to the next, and a
  persistent learning system that tunes each AI's weights from its results.</p>
  ${list(g.games, card)}
  <h2>More screenshots</h2>
  <div class="shots">${list(g.shots.slice(0, 3), s => `<figure><img src="shots/${s.file}" alt="${esc(s.caption)}" loading="lazy">
    <figcaption>${esc(s.caption)}</figcaption></figure>`)}</div>`;
});
