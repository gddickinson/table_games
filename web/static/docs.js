// Docs library: the Markdown documents in docs/ (the same files the in-game doc viewer opens), rendered in the house style.
import { route, api, app, esc, list, $ } from './core.js';
import { render } from './markdown.js';

const GROUPS = [['Mahjong', /^(rulebook|tutorial|strategy-guide|history)$/], ['Poker', /^poker-/], ['Blackjack', /^blackjack-/],
  ['Dominoes', /^dominoes-/], ["Dragon's Lair", /^dragon-/], ['The simulator', /^game-help$/]];

route('docs', async args => {
  const docs = await api('/docs');
  const slug = args[0] && docs.some(d => d.slug === args[0]) ? args[0] : 'game-help';
  const sidebar = list(GROUPS, ([name, re]) => `<h3>${esc(name)}</h3>${list(docs.filter(d => re.test(d.slug)), d =>
    `<a href="#/docs/${d.slug}" class="${d.slug === slug ? 'on' : ''}">${esc(d.title)}<small>${d.lines} lines</small></a>`)}`);
  app().innerHTML = `
  <p class="kicker">Docs</p>
  <div class="side">
    <aside class="doc-list panel" aria-label="Documents">
      <label for="q">Search all documents</label><input id="q" type="search" placeholder="e.g. riichi, split, double-six">
      <div id="hits"></div>${sidebar}
    </aside>
    <article class="md" id="doc"><p class="mute">Loading...</p></article>
  </div>`;
  const d = await api('/docs/' + slug);
  const { html } = render(d.markdown);
  // In-page anchors (#getting-started) would change the route, so rewrite them to scroll instead.
  $('#doc').innerHTML = html.replace(/href="#([^/"][^"]*)"/g, `href="#/docs/${slug}" data-anchor="$1"`);
  $('#doc').addEventListener('click', e => {
    const a = e.target.closest('[data-anchor]');
    if (a) { e.preventDefault(); document.getElementById(a.dataset.anchor)?.scrollIntoView({ behavior: 'smooth' }); }
  });

  let timer = 0;
  $('#q').addEventListener('input', e => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const q = e.target.value.trim().toLowerCase();
      if (q.length < 3) { $('#hits').innerHTML = ''; return; }
      const all = await Promise.all(docs.map(x => api('/docs/' + x.slug)));
      const hits = all.map(x => ({ x, n: x.markdown.toLowerCase().split(q).length - 1 })).filter(h => h.n).sort((a, b) => b.n - a.n);
      $('#hits').innerHTML = hits.length ? list(hits, h => `<a href="#/docs/${h.x.slug}">${esc(h.x.title)}<small>${h.n}×</small></a>`)
        : '<p class="small mute">No matches.</p>';
    }, 250);
  });
});
