// Entry point: lazy page modules, footer mode text, router.
import { start, lazy, route, app, isStatic, $ } from './core.js';

const PAGES = { 'home.js': ['home'], 'play.js': ['play'], 'games.js': ['games'], 'lab.js': ['lab'], 'docs.js': ['docs'],
  'about.js': ['about'] };
lazy(Object.fromEntries(Object.entries(PAGES).flatMap(([file, names]) => names.map(n => [n, () => import('./' + file)]))));

route('notfound', () => { app().innerHTML = '<h1>Not found</h1><p><a href="#/">Back to the start</a></p>'; });

// The play page uses a wider main column for the game.
window.addEventListener('hashchange', () => app().classList.toggle('wide', location.hash.startsWith('#/play')));
app().classList.toggle('wide', location.hash.startsWith('#/play'));

$('#mode').textContent = isStatic()
  ? 'static site: the game runs entirely in your browser'
  : 'local app: game at /game/, facts from the repo at /api';
start();
