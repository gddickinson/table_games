// Service Worker — caches all game assets for offline play
const CACHE_NAME = 'mahjong-v1';

const ASSETS = [
  '/',
  '/index.html',

  // Stylesheets
  '/css/main.css',
  '/css/tiles.css',
  '/css/tutorial.css',
  '/css/animations.css',
  '/css/tutor.css',
  '/css/mobile.css',

  // Core game engine
  '/js/interfaces.js',
  '/js/constants.js',
  '/js/tile.js',
  '/js/wall.js',
  '/js/hand.js',
  '/js/scoring.js',
  '/js/player.js',
  '/js/dora.js',

  // AI, learning, and performance
  '/js/shanten-table.js',
  '/js/ai-engine.js',
  '/js/ai-learning.js',
  '/js/ai.js',
  '/js/difficulty.js',
  '/js/exploitative-ai.js',
  '/js/ai-advanced.js',
  '/js/stats.js',
  '/js/claude-player.js',
  '/js/headless.js',

  // Analysis and hints
  '/js/furiten.js',
  '/js/scoring-preview.js',
  '/js/hand-path.js',
  '/js/hint-engine.js',

  // Tutoring, conversation, achievements
  '/js/tutor.js',
  '/js/llm-tutor.js',
  '/js/llm-config.js',
  '/js/llm-players.js',
  '/js/personality.js',
  '/js/character-learning.js',
  '/js/character-relations.js',
  '/js/living-world.js',
  '/js/achievements.js',
  '/js/practice-mode.js',
  '/js/daily-challenges.js',

  // Media and presentation
  '/js/voice.js',
  '/js/portraits.js',
  '/js/music.js',
  '/js/venues.js',
  '/js/spectator.js',
  '/js/photo-album.js',
  '/js/community.js',

  // Replay and capture
  '/js/replay.js',
  '/js/replay-share.js',
  '/js/screenshot.js',

  // Multiplayer
  '/js/multiplayer.js',

  // Game flow and UI
  '/js/game-state.js',
  '/js/game-flow.js',
  '/js/tile-renderer.js',
  '/js/renderer.js',
  '/js/input-handler.js',
  '/js/tutorial.js',
  '/js/sound.js',
  '/js/main.js',

  // Story and PWA support
  '/js/story-arcs.js',
  '/js/service-worker-register.js'
];

// Install — pre-cache all assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Fetch — serve from cache, fall back to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});

// Activate — remove old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});
