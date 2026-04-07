/**
 * game-framework.js - Abstract game framework for multi-game table game simulator.
 *
 * Provides a game registration and switching system so multiple table games
 * (Mahjong, Poker, Blackjack, etc.) can share the same personality system,
 * memories, economy, achievements, and other cross-cutting concerns.
 *
 * Exports: root.MJ.GameFramework = { GameFramework, GameDialogueAdapter, IGameEngine }
 */
(function(exports) {
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  // ---------------------------------------------------------------------------
  // IGameEngine — Interface contract for game engines (duck-typed)
  // ---------------------------------------------------------------------------

  /**
   * All game engines must implement these methods. JavaScript doesn't enforce
   * interfaces, so this serves as documentation and a validation helper.
   *
   * Required methods:
   *   init(container, options)    — set up the game in a DOM container
   *   start()                     — begin a new game/round
   *   cleanup()                   — tear down, remove DOM elements
   *   getState()                  — return current game state object
   *   setSharedSystems(systems)   — receive shared personality/economy/world refs
   *   onRoundEnd(callback)        — register a round-end handler
   *   getPlayerCount()            — return number of players in current game
   *   getHumanSeatIndex()         — return which seat index is the human player
   *   isGameOver()                — return boolean indicating if game has ended
   *   getScores()                 — return array/object of player scores
   */
  var IGameEngine = {
    requiredMethods: [
      'init',
      'start',
      'cleanup',
      'getState',
      'setSharedSystems',
      'onRoundEnd',
      'getPlayerCount',
      'getHumanSeatIndex',
      'isGameOver',
      'getScores'
    ],

    /**
     * Validate that a given engine instance implements all required methods.
     * @param {object} engine - The engine instance to validate.
     * @returns {{ valid: boolean, missing: string[] }}
     */
    validate: function(engine) {
      if (!engine) return { valid: false, missing: this.requiredMethods.slice() };
      var missing = [];
      for (var i = 0; i < this.requiredMethods.length; i++) {
        var method = this.requiredMethods[i];
        if (typeof engine[method] !== 'function') {
          missing.push(method);
        }
      }
      return { valid: missing.length === 0, missing: missing };
    },

    /**
     * Return a human-readable description of the interface for documentation.
     * @returns {string}
     */
    describe: function() {
      return 'IGameEngine requires: ' + this.requiredMethods.join(', ');
    }
  };

  // ---------------------------------------------------------------------------
  // GameFramework — Central registry and switcher for table games
  // ---------------------------------------------------------------------------

  class GameFramework {
    constructor() {
      /** @type {Object.<string, object>} Map of gameId -> gameConfig */
      this.registeredGames = {};

      /** @type {object|null} Currently active game engine instance */
      this.activeGame = null;

      /** @type {string|null} ID of the currently active game */
      this.activeGameId = null;

      /** @type {object} Shared system references (personality, world, economy, etc.) */
      this.sharedSystems = {};

      /** @type {Function[]} Listeners for game switch events */
      this._switchListeners = [];

      /** @type {Function[]} Listeners for game registration events */
      this._registerListeners = [];

      /** @type {object} Per-game statistics tracking */
      this._gameStats = {};
    }

    // -------------------------------------------------------------------------
    // Game registration
    // -------------------------------------------------------------------------

    /**
     * Register a game engine with the framework.
     *
     * @param {object} gameConfig - Game configuration object:
     *   - id {string}            — Unique identifier ('mahjong', 'poker', etc.)
     *   - name {string}          — Display name
     *   - description {string}   — Short description
     *   - icon {string}          — Emoji icon
     *   - minPlayers {number}    — Minimum number of players
     *   - maxPlayers {number}    — Maximum number of players
     *   - engine {Function|null} — Constructor for game engine (implements IGameEngine)
     *   - renderer {Function}    — Constructor for game renderer (optional)
     *   - aiAdapter {Function}   — Constructor for AI adapter (optional)
     *   - tutorialSteps {Array}  — Tutorial step definitions (optional)
     *   - scoringInfo {string}   — Scoring description (optional)
     *   - category {string}      — 'tile', 'card', or 'dice'
     *   - unlockLevel {number}   — Player level required to unlock (default 1)
     *   - features {string[]}    — List of supported features (optional)
     * @returns {boolean} True if registration succeeded.
     */
    registerGame(gameConfig) {
      if (!gameConfig || !gameConfig.id) {
        console.warn('[GameFramework] Cannot register game without an id.');
        return false;
      }

      if (this.registeredGames[gameConfig.id]) {
        console.warn('[GameFramework] Game "' + gameConfig.id + '" is already registered. Overwriting.');
      }

      // Apply defaults
      var config = Object.assign({
        name: gameConfig.id,
        description: '',
        icon: '🎮',
        minPlayers: 2,
        maxPlayers: 4,
        engine: null,
        renderer: null,
        aiAdapter: null,
        tutorialSteps: [],
        scoringInfo: '',
        category: 'card',
        unlockLevel: 1,
        features: [],
        registeredAt: Date.now()
      }, gameConfig);

      this.registeredGames[config.id] = config;

      // Initialize stats for this game if not already present
      if (!this._gameStats[config.id]) {
        this._gameStats[config.id] = {
          timesPlayed: 0,
          totalPlayTime: 0,
          lastPlayed: null
        };
      }

      // Notify registration listeners
      for (var i = 0; i < this._registerListeners.length; i++) {
        try {
          this._registerListeners[i](config);
        } catch (e) {
          console.error('[GameFramework] Registration listener error:', e);
        }
      }

      return true;
    }

    /**
     * Unregister a game by its id.
     * If this game is currently active, it will be cleaned up first.
     * @param {string} gameId
     * @returns {boolean}
     */
    unregisterGame(gameId) {
      if (!this.registeredGames[gameId]) return false;
      if (this.activeGameId === gameId) {
        this.stopActiveGame();
      }
      delete this.registeredGames[gameId];
      return true;
    }

    /**
     * Check if a game is registered.
     * @param {string} gameId
     * @returns {boolean}
     */
    hasGame(gameId) {
      return !!this.registeredGames[gameId];
    }

    /**
     * Get the config for a registered game.
     * @param {string} gameId
     * @returns {object|null}
     */
    getGameConfig(gameId) {
      return this.registeredGames[gameId] || null;
    }

    // -------------------------------------------------------------------------
    // Game switching
    // -------------------------------------------------------------------------

    /**
     * Switch to a different game.
     * Cleans up the current game (if any) and instantiates the new one.
     *
     * @param {string} gameId - The game to switch to.
     * @param {object} [options] - Options to pass to the new engine's init method.
     * @returns {boolean} True if the switch succeeded.
     */
    switchGame(gameId, options) {
      var config = this.registeredGames[gameId];
      if (!config) {
        console.warn('[GameFramework] Unknown game: "' + gameId + '"');
        return false;
      }

      if (!config.engine) {
        console.warn('[GameFramework] Game "' + gameId + '" has no engine assigned.');
        return false;
      }

      // Clean up previous game
      var previousGameId = this.activeGameId;
      if (this.activeGame) {
        this._recordPlayTime(previousGameId);
        try {
          this.activeGame.cleanup();
        } catch (e) {
          console.error('[GameFramework] Error cleaning up game "' + previousGameId + '":', e);
        }
      }

      // Instantiate new engine
      this.activeGameId = gameId;
      try {
        this.activeGame = new config.engine();
      } catch (e) {
        console.error('[GameFramework] Error instantiating engine for "' + gameId + '":', e);
        this.activeGame = null;
        this.activeGameId = null;
        return false;
      }

      // Pass shared systems to the new engine
      if (typeof this.activeGame.setSharedSystems === 'function') {
        this.activeGame.setSharedSystems(this.sharedSystems);
      }

      // Track stats
      if (this._gameStats[gameId]) {
        this._gameStats[gameId].timesPlayed++;
        this._gameStats[gameId].lastPlayed = Date.now();
        this._gameStats[gameId]._startTime = Date.now();
      }

      // Notify switch listeners
      for (var i = 0; i < this._switchListeners.length; i++) {
        try {
          this._switchListeners[i](gameId, previousGameId, config);
        } catch (e) {
          console.error('[GameFramework] Switch listener error:', e);
        }
      }

      return true;
    }

    /**
     * Stop and clean up the active game without switching to another.
     */
    stopActiveGame() {
      if (this.activeGame) {
        this._recordPlayTime(this.activeGameId);
        try {
          this.activeGame.cleanup();
        } catch (e) {
          console.error('[GameFramework] Error cleaning up active game:', e);
        }
      }
      this.activeGame = null;
      this.activeGameId = null;
    }

    /**
     * Get the currently active game engine instance.
     * @returns {object|null}
     */
    getActiveGame() {
      return this.activeGame;
    }

    /**
     * Get the ID of the currently active game.
     * @returns {string|null}
     */
    getActiveGameId() {
      return this.activeGameId;
    }

    // -------------------------------------------------------------------------
    // Game listing and discovery
    // -------------------------------------------------------------------------

    /**
     * List all registered games with unlock status based on player level.
     *
     * @param {number} [playerLevel=1] - The player's current level.
     * @returns {object[]} Array of game info objects (engine/renderer/aiAdapter stripped).
     */
    getGameList(playerLevel) {
      var level = playerLevel || 1;
      var self = this;
      return Object.values(this.registeredGames).map(function(g) {
        var info = Object.assign({}, g);
        info.unlocked = level >= (g.unlockLevel || 1);
        info.stats = self._gameStats[g.id] || null;
        // Don't expose class constructors
        delete info.engine;
        delete info.renderer;
        delete info.aiAdapter;
        return info;
      });
    }

    /**
     * Get games filtered by category.
     * @param {string} category - 'tile', 'card', or 'dice'
     * @param {number} [playerLevel=1]
     * @returns {object[]}
     */
    getGamesByCategory(category, playerLevel) {
      return this.getGameList(playerLevel).filter(function(g) {
        return g.category === category;
      });
    }

    /**
     * Get all available categories from registered games.
     * @returns {string[]}
     */
    getCategories() {
      var cats = {};
      Object.values(this.registeredGames).forEach(function(g) {
        if (g.category) cats[g.category] = true;
      });
      return Object.keys(cats);
    }

    /**
     * Get the total number of registered games.
     * @returns {number}
     */
    getGameCount() {
      return Object.keys(this.registeredGames).length;
    }

    // -------------------------------------------------------------------------
    // Shared systems
    // -------------------------------------------------------------------------

    /**
     * Set shared systems that all game engines will receive.
     * These typically include personality, economy, world, achievements, etc.
     *
     * @param {object} systems - Map of system name to system instance.
     */
    setSharedSystems(systems) {
      this.sharedSystems = systems || {};
      // If there's an active game, update it too
      if (this.activeGame && typeof this.activeGame.setSharedSystems === 'function') {
        this.activeGame.setSharedSystems(this.sharedSystems);
      }
    }

    /**
     * Add a single shared system by name.
     * @param {string} name
     * @param {object} system
     */
    addSharedSystem(name, system) {
      this.sharedSystems[name] = system;
      if (this.activeGame && typeof this.activeGame.setSharedSystems === 'function') {
        this.activeGame.setSharedSystems(this.sharedSystems);
      }
    }

    /**
     * Get a shared system by name.
     * @param {string} name
     * @returns {object|undefined}
     */
    getSharedSystem(name) {
      return this.sharedSystems[name];
    }

    // -------------------------------------------------------------------------
    // Event listeners
    // -------------------------------------------------------------------------

    /**
     * Register a listener for game switch events.
     * Callback receives (newGameId, previousGameId, newGameConfig).
     * @param {Function} callback
     */
    onGameSwitch(callback) {
      if (typeof callback === 'function') {
        this._switchListeners.push(callback);
      }
    }

    /**
     * Register a listener for game registration events.
     * Callback receives (gameConfig).
     * @param {Function} callback
     */
    onGameRegistered(callback) {
      if (typeof callback === 'function') {
        this._registerListeners.push(callback);
      }
    }

    /**
     * Remove a switch listener.
     * @param {Function} callback
     */
    offGameSwitch(callback) {
      this._switchListeners = this._switchListeners.filter(function(fn) {
        return fn !== callback;
      });
    }

    /**
     * Remove a registration listener.
     * @param {Function} callback
     */
    offGameRegistered(callback) {
      this._registerListeners = this._registerListeners.filter(function(fn) {
        return fn !== callback;
      });
    }

    // -------------------------------------------------------------------------
    // Statistics helpers
    // -------------------------------------------------------------------------

    /**
     * Get statistics for a specific game.
     * @param {string} gameId
     * @returns {object|null}
     */
    getGameStats(gameId) {
      return this._gameStats[gameId] || null;
    }

    /**
     * Get aggregate stats across all games.
     * @returns {object}
     */
    getAllStats() {
      var total = { timesPlayed: 0, totalPlayTime: 0, gamesRegistered: 0 };
      var ids = Object.keys(this._gameStats);
      total.gamesRegistered = Object.keys(this.registeredGames).length;
      for (var i = 0; i < ids.length; i++) {
        var s = this._gameStats[ids[i]];
        total.timesPlayed += s.timesPlayed;
        total.totalPlayTime += s.totalPlayTime;
      }
      return total;
    }

    /**
     * Record play time for a game that is being stopped.
     * @private
     * @param {string} gameId
     */
    _recordPlayTime(gameId) {
      if (!gameId || !this._gameStats[gameId]) return;
      var stats = this._gameStats[gameId];
      if (stats._startTime) {
        stats.totalPlayTime += Date.now() - stats._startTime;
        delete stats._startTime;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Auto-register Mahjong as the default game
  // ---------------------------------------------------------------------------

  GameFramework.prototype.registerMahjong = function() {
    this.registerGame({
      id: 'mahjong',
      name: 'Mahjong',
      description: 'Classic Chinese tile game for 4 players',
      icon: '\uD83C\uDC04',
      minPlayers: 4,
      maxPlayers: 4,
      category: 'tile',
      unlockLevel: 1,
      engine: null, // will be set by main.js using existing game system
      renderer: null,
      aiAdapter: null,
      tutorialSteps: [],
      scoringInfo: 'Japanese Riichi scoring with yaku, dora, and han/fu calculation.',
      features: ['riichi', 'dora', 'flowers', 'furiten']
    });
  };

  // ---------------------------------------------------------------------------
  // GameDialogueAdapter — Maps game events to personality triggers
  // ---------------------------------------------------------------------------

  class GameDialogueAdapter {
    /**
     * @param {string} gameId - The game this adapter is created for.
     */
    constructor(gameId) {
      this.gameId = gameId;

      /** @type {Object.<string, object>} Per-game dialogue banks */
      this.dialogueBanks = {};

      /**
       * Universal event mapping.
       * Keys are "{gameId}_{gameEvent}", values are universal trigger names.
       */
      this._universalMap = {
        // Mahjong events
        'mahjong_tsumo': 'won',
        'mahjong_ron': 'won',
        'mahjong_deal_in': 'lost',
        'mahjong_riichi': 'opponent_action',
        'mahjong_pong': 'opponent_action',
        'mahjong_chi': 'opponent_action',
        'mahjong_kan': 'opponent_action',
        'mahjong_ippatsu': 'big_win',
        'mahjong_yakuman': 'big_win',
        'mahjong_tenpai': 'near_miss',
        'mahjong_noten': 'lost',
        'mahjong_draw': 'idle',
        'mahjong_furiten': 'near_miss',

        // Poker events
        'poker_win_pot': 'won',
        'poker_fold': 'lost',
        'poker_big_pot': 'big_win',
        'poker_bluff_success': 'big_win',
        'poker_bad_beat': 'near_miss',
        'poker_all_in': 'opponent_action',
        'poker_raise': 'opponent_action',
        'poker_check': 'idle',
        'poker_call': 'opponent_action',
        'poker_river_save': 'near_miss',

        // Blackjack events
        'blackjack_21': 'big_win',
        'blackjack_bust': 'lost',
        'blackjack_win': 'won',
        'blackjack_push': 'near_miss',
        'blackjack_dealer_bust': 'won',
        'blackjack_insurance': 'opponent_action',

        // Generic events (pass through)
        'game_start': 'game_start',
        'game_end': 'game_end',
        'won': 'won',
        'lost': 'lost',
        'big_win': 'big_win',
        'near_miss': 'near_miss',
        'opponent_action': 'opponent_action',
        'idle': 'idle'
      };
    }

    /**
     * Map a game-specific event to a universal personality trigger.
     *
     * @param {string} gameEvent - Game-specific event name.
     * @param {string} [gameId] - Override the game ID (defaults to constructor gameId).
     * @returns {string} Universal trigger name, or the original event if no mapping exists.
     */
    mapEvent(gameEvent, gameId) {
      var gid = gameId || this.gameId;
      var key = gid + '_' + gameEvent;

      // Check game-prefixed mapping first
      if (this._universalMap[key]) {
        return this._universalMap[key];
      }

      // Check if event is already a universal event
      if (this._universalMap[gameEvent]) {
        return this._universalMap[gameEvent];
      }

      // No mapping found; return original event as fallback
      return gameEvent;
    }

    /**
     * Register additional event mappings for a game.
     *
     * @param {string} gameId - The game these mappings belong to.
     * @param {Object.<string, string>} mappings - Map of gameEvent -> universalTrigger.
     */
    addEventMappings(gameId, mappings) {
      var keys = Object.keys(mappings);
      for (var i = 0; i < keys.length; i++) {
        this._universalMap[gameId + '_' + keys[i]] = mappings[keys[i]];
      }
    }

    /**
     * Get game-specific dialogue for a character and trigger.
     *
     * @param {string} characterId - The character to get dialogue for.
     * @param {string} trigger - The dialogue trigger (universal or game-specific).
     * @param {string} [gameId] - The game to look up dialogue for (defaults to this.gameId).
     * @returns {string[]|null} Array of dialogue strings, or null to fall back to universal.
     */
    getDialogue(characterId, trigger, gameId) {
      var gid = gameId || this.gameId;
      var banks = this.dialogueBanks[gid];
      if (banks && banks[characterId] && banks[characterId][trigger]) {
        var lines = banks[characterId][trigger];
        return Array.isArray(lines) ? lines : [lines];
      }
      return null; // fall back to universal personality dialogue
    }

    /**
     * Get a random dialogue line for a character and trigger.
     *
     * @param {string} characterId
     * @param {string} trigger
     * @param {string} [gameId]
     * @returns {string|null}
     */
    getRandomDialogue(characterId, trigger, gameId) {
      var lines = this.getDialogue(characterId, trigger, gameId);
      if (!lines || lines.length === 0) return null;
      return lines[Math.floor(Math.random() * lines.length)];
    }

    /**
     * Register dialogue banks for a specific game.
     * Banks are structured as: { characterId: { trigger: [lines...] } }
     *
     * @param {string} gameId - The game these dialogues belong to.
     * @param {object} banks - The dialogue banks object.
     */
    registerDialogue(gameId, banks) {
      this.dialogueBanks[gameId] = banks;
    }

    /**
     * Merge additional dialogue into existing banks for a game.
     * Does not overwrite existing entries; adds new characters/triggers only.
     *
     * @param {string} gameId
     * @param {object} banks
     */
    mergeDialogue(gameId, banks) {
      if (!this.dialogueBanks[gameId]) {
        this.dialogueBanks[gameId] = banks;
        return;
      }

      var existing = this.dialogueBanks[gameId];
      var charIds = Object.keys(banks);
      for (var i = 0; i < charIds.length; i++) {
        var cid = charIds[i];
        if (!existing[cid]) {
          existing[cid] = banks[cid];
        } else {
          var triggers = Object.keys(banks[cid]);
          for (var j = 0; j < triggers.length; j++) {
            var t = triggers[j];
            if (!existing[cid][t]) {
              existing[cid][t] = banks[cid][t];
            } else if (Array.isArray(existing[cid][t]) && Array.isArray(banks[cid][t])) {
              existing[cid][t] = existing[cid][t].concat(banks[cid][t]);
            }
          }
        }
      }
    }

    /**
     * List all registered game IDs that have dialogue banks.
     * @returns {string[]}
     */
    getRegisteredGames() {
      return Object.keys(this.dialogueBanks);
    }

    /**
     * List all characters with dialogue for a given game.
     * @param {string} gameId
     * @returns {string[]}
     */
    getCharacters(gameId) {
      var banks = this.dialogueBanks[gameId];
      return banks ? Object.keys(banks) : [];
    }
  }

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------

  root.MJ.GameFramework = {
    GameFramework: GameFramework,
    GameDialogueAdapter: GameDialogueAdapter,
    IGameEngine: IGameEngine
  };

})(typeof window !== 'undefined' ? window : global);
