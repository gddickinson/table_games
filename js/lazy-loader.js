/**
 * lazy-loader.js — Lazy loading for non-critical game modules
 *
 * Separates scripts into critical (loaded eagerly via index.html) and lazy
 * (loaded on demand via dynamic <script> injection).  Provides preloading
 * during idle time so modules are ready when needed.
 */
(function (exports) {
  'use strict';
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  // -------------------------------------------------------------------------
  // Module manifest
  // -------------------------------------------------------------------------

  /** Modules that must be loaded synchronously at startup. */
  const CRITICAL = [
    'constants', 'tile', 'wall', 'hand', 'scoring', 'player',
    'ai-engine', 'ai-learning', 'ai', 'game-state', 'game-flow',
    'tile-renderer', 'renderer', 'input-handler', 'main',
    'intro-screen', 'sound'
  ];

  /** Modules that can be loaded on demand. key -> script path */
  const LAZY = {
    'tile-editor':      'js/tile-editor.js',
    'mod-system':       'js/mod-system.js',
    'replay-theater':   'js/replay-theater.js',
    'spectator':        'js/spectator.js',
    'spectator-stream': 'js/spectator-stream.js',
    'puzzle-creator':   'js/puzzle-creator.js',
    'community':        'js/community.js',
    'cloud-sync':       'js/cloud-sync.js',
    'native-app':       'js/native-app.js',
    'ai-evolution':     'js/ai-evolution.js',
    'music-advanced':   'js/music-advanced.js',
    'stats-dashboard':  'js/stats-dashboard.js'
  };

  // -------------------------------------------------------------------------
  // LazyLoader
  // -------------------------------------------------------------------------

  class LazyLoader {
    constructor() {
      /** Set of module IDs that have finished loading. */
      this.loaded = new Set();
      /** Map of module ID -> Promise for modules currently being loaded. */
      this.loading = new Map();
      /** Optional callback invoked after each successful load. */
      this.onLoad = null;
    }

    /**
     * Load a lazy module by ID.  Returns a promise that resolves to true on
     * success.  If the module is already loaded the promise resolves
     * immediately.  If the ID is unknown (not in LAZY), resolves to false.
     */
    load(moduleId) {
      if (this.loaded.has(moduleId)) {
        return Promise.resolve(true);
      }
      if (this.loading.has(moduleId)) {
        return this.loading.get(moduleId);
      }

      var src = LAZY[moduleId];
      if (!src) {
        return Promise.resolve(false);
      }

      var self = this;
      var promise = new Promise(function (resolve, reject) {
        var script = document.createElement('script');
        script.src = src;
        script.async = true;

        script.onload = function () {
          self.loaded.add(moduleId);
          self.loading.delete(moduleId);
          if (typeof self.onLoad === 'function') {
            self.onLoad(moduleId);
          }
          resolve(true);
        };

        script.onerror = function () {
          self.loading.delete(moduleId);
          reject(new Error('LazyLoader: failed to load ' + src));
        };

        document.head.appendChild(script);
      });

      this.loading.set(moduleId, promise);
      return promise;
    }

    /**
     * Load multiple modules in parallel.  Returns a promise that resolves to
     * an object mapping each module ID to its load result (true/false/Error).
     */
    loadMany(moduleIds) {
      var self = this;
      var entries = moduleIds.map(function (id) {
        return self.load(id)
          .then(function (ok) { return { id: id, ok: ok }; })
          .catch(function (err) { return { id: id, ok: false, error: err }; });
      });
      return Promise.all(entries).then(function (results) {
        var map = {};
        results.forEach(function (r) { map[r.id] = r.ok; });
        return map;
      });
    }

    /** Check whether a module has finished loading. */
    isLoaded(moduleId) {
      return this.loaded.has(moduleId);
    }

    /** Check whether a module is currently being loaded. */
    isLoading(moduleId) {
      return this.loading.has(moduleId);
    }

    /** Return the list of all available lazy module IDs. */
    availableModules() {
      return Object.keys(LAZY);
    }

    /**
     * Preload all lazy modules in the background using requestIdleCallback
     * (falls back to setTimeout on unsupported browsers).
     */
    preloadInBackground() {
      var self = this;
      var ids = Object.keys(LAZY);
      var idx = 0;

      function loadNext(deadline) {
        // Load one at a time during idle periods to avoid network contention
        while (idx < ids.length && (typeof deadline === 'undefined' || deadline.timeRemaining() > 10)) {
          self.load(ids[idx]).catch(function () { /* ignore preload failures */ });
          idx++;
        }
        if (idx < ids.length) {
          scheduleNext();
        }
      }

      function scheduleNext() {
        if (typeof requestIdleCallback === 'function') {
          requestIdleCallback(loadNext, { timeout: 5000 });
        } else {
          setTimeout(function () { loadNext(); }, 200);
        }
      }

      scheduleNext();
    }
  }

  // Expose statics for inspection
  LazyLoader.CRITICAL = CRITICAL;
  LazyLoader.LAZY = LAZY;

  root.MJ.LazyLoader = LazyLoader;
})(typeof exports !== 'undefined' ? exports : this);
