(function(exports) {
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  // ---------------------------------------------------------------------------
  // Rule Variant Definitions
  // ---------------------------------------------------------------------------

  const VARIANTS = {
    standard: {
      name: 'Standard Chinese',
      description: 'Classic rules with flowers and riichi',
      flowers: true,
      riichi: true,
      dora: true,
      minScore: 1,
      maxPlayers: 4,
      scoringMultiplier: 1,
      dealerBonus: true
    },
    riichi_only: {
      name: 'Riichi Mahjong',
      description: 'Japanese-style riichi focus. No flowers.',
      flowers: false,
      riichi: true,
      dora: true,
      minScore: 1,
      maxPlayers: 4,
      scoringMultiplier: 1,
      dealerBonus: true,
      furitenStrict: true
    },
    hong_kong: {
      name: 'Hong Kong Old Style',
      description: 'Traditional Hong Kong rules. Simple scoring.',
      flowers: true,
      riichi: false,
      dora: false,
      minScore: 3,
      maxPlayers: 4,
      scoringMultiplier: 1,
      dealerBonus: false
    },
    speed: {
      name: 'Speed Mahjong',
      description: 'Fast rounds, fewer tiles, quick decisions.',
      flowers: false,
      riichi: true,
      dora: true,
      minScore: 1,
      maxPlayers: 4,
      scoringMultiplier: 2,
      dealerBonus: false,
      reducedWall: true,
      timerPerTurn: 10
    },
    sanma: {
      name: 'Three-Player (Sanma)',
      description: '3-player variant. Characters suit removed.',
      flowers: false,
      riichi: true,
      dora: true,
      minScore: 1,
      maxPlayers: 3,
      removeSuit: 'characters',
      scoringMultiplier: 1.5,
      dealerBonus: true
    },
    bamboo_only: {
      name: 'Bamboo Garden',
      description: 'Only bamboo + honor tiles. Fast and focused.',
      flowers: false,
      riichi: true,
      dora: false,
      minScore: 1,
      maxPlayers: 4,
      removeSuit: ['characters', 'circles'],
      scoringMultiplier: 2,
      dealerBonus: true
    }
  };

  // ---------------------------------------------------------------------------
  // Suit / tile helpers
  // ---------------------------------------------------------------------------

  const SUIT_RANGES = {
    characters: { prefix: 'man', start: 1, end: 9 },
    circles:    { prefix: 'pin', start: 1, end: 9 },
    bamboo:     { prefix: 'sou', start: 1, end: 9 }
  };

  const HONOR_TILES = [
    'east', 'south', 'west', 'north',
    'chun', 'hatsu', 'haku'
  ];

  const FLOWER_TILES = [
    'flower1', 'flower2', 'flower3', 'flower4',
    'season1', 'season2', 'season3', 'season4'
  ];

  /**
   * Build tile list for a given suit.
   * @param {string} suitName — 'characters' | 'circles' | 'bamboo'
   * @param {object} [opts]
   * @param {boolean} [opts.partial] — if true, only include 1 and 9 (sanma)
   * @returns {string[]}
   */
  function suitTiles(suitName, opts) {
    var info = SUIT_RANGES[suitName];
    if (!info) return [];
    var tiles = [];
    for (var n = info.start; n <= info.end; n++) {
      if (opts && opts.partial && n > 1 && n < 9) continue;
      tiles.push(info.prefix + n);
    }
    return tiles;
  }

  /**
   * Build the full set of unique tile ids that should appear in the wall for a
   * given variant.  Each id appears once; the caller is responsible for
   * duplicating (x4) as needed.
   */
  function buildTileSet(variant) {
    var removeSuits = [];
    if (variant.removeSuit) {
      removeSuits = Array.isArray(variant.removeSuit)
        ? variant.removeSuit
        : [variant.removeSuit];
    }

    var tiles = [];

    // Numbered suits
    Object.keys(SUIT_RANGES).forEach(function(suit) {
      if (removeSuits.indexOf(suit) !== -1) {
        // For sanma, keep 1 and 9 of the removed suit
        if (variant.maxPlayers === 3) {
          tiles = tiles.concat(suitTiles(suit, { partial: true }));
        }
        return;
      }
      tiles = tiles.concat(suitTiles(suit));
    });

    // Honor tiles always included
    tiles = tiles.concat(HONOR_TILES);

    // Flowers
    if (variant.flowers) {
      tiles = tiles.concat(FLOWER_TILES);
    }

    return tiles;
  }

  // ---------------------------------------------------------------------------
  // RuleVariantManager
  // ---------------------------------------------------------------------------

  function RuleVariantManager() {
    this._variants = {};
    // Deep-copy the built-in variants
    var keys = Object.keys(VARIANTS);
    for (var i = 0; i < keys.length; i++) {
      this._variants[keys[i]] = JSON.parse(JSON.stringify(VARIANTS[keys[i]]));
      this._variants[keys[i]].id = keys[i];
    }
  }

  // ---- Public API -----------------------------------------------------------

  /**
   * Return the full config for a variant, or null if unknown.
   * @param {string} id
   * @returns {object|null}
   */
  RuleVariantManager.prototype.getVariant = function(id) {
    return this._variants[id] || null;
  };

  /**
   * Return all variants the player has unlocked.  If unlockedList is null /
   * undefined every variant is returned (treat as "all unlocked").
   *
   * @param {string[]|null} unlockedList — array of variant ids, or null for all
   * @returns {object[]}  Array of variant configs with an extra `locked` flag.
   */
  RuleVariantManager.prototype.getAvailableVariants = function(unlockedList) {
    var self = this;
    var allUnlocked = !unlockedList;

    return Object.keys(this._variants).map(function(id) {
      var v = JSON.parse(JSON.stringify(self._variants[id]));
      v.locked = allUnlocked ? false : unlockedList.indexOf(id) === -1;
      return v;
    });
  };

  /**
   * Modify a live gameState object in-place according to the chosen variant.
   *
   * This is the main integration point: call it right after constructing a new
   * game state but before dealing.
   *
   * @param {string} variantId
   * @param {object} gameState — mutable game state
   * @returns {object} the same gameState, for chaining
   */
  RuleVariantManager.prototype.applyVariant = function(variantId, gameState) {
    var variant = this.getVariant(variantId);
    if (!variant) {
      console.warn('[RuleVariants] Unknown variant: ' + variantId);
      return gameState;
    }

    // Basic flags
    gameState.variantId = variantId;
    gameState.variantName = variant.name;
    gameState.maxPlayers = variant.maxPlayers;
    gameState.minScore = variant.minScore;
    gameState.scoringMultiplier = variant.scoringMultiplier;
    gameState.dealerBonus = variant.dealerBonus;
    gameState.flowersEnabled = variant.flowers;
    gameState.riichiEnabled = variant.riichi;
    gameState.doraEnabled = variant.dora;

    // Strict furiten
    if (variant.furitenStrict) {
      gameState.furitenStrict = true;
    }

    // Speed variant timer
    if (variant.timerPerTurn) {
      gameState.timerPerTurn = variant.timerPerTurn;
    }

    // Reduced wall
    if (variant.reducedWall) {
      gameState.reducedWall = true;
    }

    // Removed suits
    if (variant.removeSuit) {
      gameState.removedSuits = Array.isArray(variant.removeSuit)
        ? variant.removeSuit.slice()
        : [variant.removeSuit];
    }

    // Rebuild wall tile list
    gameState.wallTiles = buildTileSet(variant);

    return gameState;
  };

  /**
   * Return wall-building configuration for a variant.
   *
   * @param {string} variantId
   * @returns {object}  { tiles: string[], copies: number, reduced: boolean }
   */
  RuleVariantManager.prototype.getModifiedWallConfig = function(variantId) {
    var variant = this.getVariant(variantId);
    if (!variant) {
      return { tiles: [], copies: 4, reduced: false };
    }

    var tiles = buildTileSet(variant);
    var copies = 4; // standard duplication
    var reduced = !!variant.reducedWall;

    // In speed mode, cut the dead wall shorter
    if (reduced) {
      copies = 3;
    }

    return {
      tiles: tiles,
      copies: copies,
      reduced: reduced,
      flowers: variant.flowers,
      maxPlayers: variant.maxPlayers
    };
  };

  /**
   * Return a scoring-adjustments object the scoring engine can merge in.
   *
   * @param {string} variantId
   * @returns {object}
   */
  RuleVariantManager.prototype.getModifiedScoringRules = function(variantId) {
    var variant = this.getVariant(variantId);
    if (!variant) {
      return { multiplier: 1, minScore: 1, dealerBonus: true, dora: true };
    }

    return {
      multiplier: variant.scoringMultiplier,
      minScore: variant.minScore,
      dealerBonus: variant.dealerBonus,
      dora: variant.dora,
      riichi: variant.riichi,
      flowers: variant.flowers,
      furitenStrict: !!variant.furitenStrict
    };
  };

  // ---------------------------------------------------------------------------
  // UI Builder
  // ---------------------------------------------------------------------------

  /**
   * Build a DOM element containing variant-selection cards.
   *
   * @param {string[]|null} unlockedList — ids the player has unlocked (null = all)
   * @returns {HTMLElement}
   */
  RuleVariantManager.prototype.buildVariantSelectorUI = function(unlockedList) {
    var variants = this.getAvailableVariants(unlockedList);

    var container = document.createElement('div');
    container.className = 'rv-selector';
    container.style.cssText = 'display:flex;flex-wrap:wrap;gap:16px;padding:16px;';

    var heading = document.createElement('h2');
    heading.textContent = 'Choose a Rule Variant';
    heading.style.cssText = 'width:100%;margin:0 0 8px 0;font-size:1.4em;color:#f0e6d3;';
    container.appendChild(heading);

    variants.forEach(function(v) {
      var card = document.createElement('div');
      card.className = 'rv-card' + (v.locked ? ' rv-locked' : '');
      card.dataset.variantId = v.id;

      card.style.cssText = [
        'position:relative',
        'width:240px',
        'padding:16px',
        'border-radius:10px',
        'background:' + (v.locked ? '#2a2a2a' : '#1e3a1e'),
        'border:2px solid ' + (v.locked ? '#555' : '#4a8'),
        'color:#ddd',
        'cursor:' + (v.locked ? 'not-allowed' : 'pointer'),
        'opacity:' + (v.locked ? '0.6' : '1'),
        'transition:transform 0.15s, box-shadow 0.15s'
      ].join(';');

      // Title
      var title = document.createElement('h3');
      title.textContent = v.name;
      title.style.cssText = 'margin:0 0 6px 0;font-size:1.1em;color:#fff;';
      card.appendChild(title);

      // Description
      var desc = document.createElement('p');
      desc.textContent = v.description;
      desc.style.cssText = 'margin:0 0 10px 0;font-size:0.85em;line-height:1.35;color:#bbb;';
      card.appendChild(desc);

      // Feature badges
      var badges = document.createElement('div');
      badges.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;';

      var features = [];
      if (v.flowers) features.push('Flowers');
      if (v.riichi)  features.push('Riichi');
      if (v.dora)    features.push('Dora');
      if (v.reducedWall) features.push('Reduced Wall');
      if (v.furitenStrict) features.push('Strict Furiten');
      if (v.timerPerTurn) features.push(v.timerPerTurn + 's Timer');
      if (v.maxPlayers === 3) features.push('3 Players');
      if (v.scoringMultiplier !== 1) features.push(v.scoringMultiplier + 'x Score');
      if (v.minScore > 1) features.push('Min ' + v.minScore + ' pts');

      features.forEach(function(f) {
        var badge = document.createElement('span');
        badge.textContent = f;
        badge.style.cssText = [
          'display:inline-block',
          'padding:2px 7px',
          'border-radius:4px',
          'font-size:0.75em',
          'background:#334',
          'color:#9cf'
        ].join(';');
        badges.appendChild(badge);
      });

      card.appendChild(badges);

      // Lock overlay
      if (v.locked) {
        var lock = document.createElement('div');
        lock.className = 'rv-lock-overlay';
        lock.style.cssText = [
          'position:absolute',
          'top:8px',
          'right:8px',
          'font-size:1.4em'
        ].join(';');
        lock.textContent = '\uD83D\uDD12';
        card.appendChild(lock);
      }

      // Hover effect (only for unlocked)
      if (!v.locked) {
        card.addEventListener('mouseenter', function() {
          card.style.transform = 'translateY(-3px)';
          card.style.boxShadow = '0 6px 18px rgba(68,170,136,0.35)';
        });
        card.addEventListener('mouseleave', function() {
          card.style.transform = '';
          card.style.boxShadow = '';
        });
      }

      container.appendChild(card);
    });

    return container;
  };

  // ---------------------------------------------------------------------------
  // Utility: validate variant id
  // ---------------------------------------------------------------------------

  RuleVariantManager.prototype.isValid = function(id) {
    return !!this._variants[id];
  };

  RuleVariantManager.prototype.listIds = function() {
    return Object.keys(this._variants);
  };

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------

  root.MJ.RuleVariants = new RuleVariantManager();
  root.MJ.RuleVariantManager = RuleVariantManager;
  root.MJ.RULE_VARIANTS = VARIANTS;

})(typeof window !== 'undefined' ? window : global);
