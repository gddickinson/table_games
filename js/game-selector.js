/**
 * game-selector.js - Game selection lobby UI for the multi-game table simulator.
 *
 * Provides a full-screen overlay where the player can browse, filter,
 * and launch registered table games. Includes category tabs, search,
 * lock/unlock status, and "coming soon" teasers for future games.
 *
 * Exports: root.MJ.GameSelector = { GameSelector }
 */
(function(exports) {
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  // ---------------------------------------------------------------------------
  // Style constants
  // ---------------------------------------------------------------------------

  var CATEGORY_GRADIENTS = {
    tile: 'linear-gradient(135deg, #1a6b3c, #2d9b5e)',
    card: 'linear-gradient(135deg, #6b1a2a, #9b3d4e)',
    dice: 'linear-gradient(135deg, #1a3c6b, #3d5e9b)'
  };

  var CATEGORY_LABELS = {
    tile: 'Tile Game',
    card: 'Card Game',
    dice: 'Dice Game'
  };

  var LOCKED_GRADIENT = 'linear-gradient(135deg, #3a3a3a, #5a5a5a)';

  // ---------------------------------------------------------------------------
  // GameSelector
  // ---------------------------------------------------------------------------

  class GameSelector {
    /**
     * @param {object} framework - A GameFramework instance.
     */
    constructor(framework) {
      this.framework = framework;
      this.overlay = null;
      this.activeCategory = 'all';
      this.searchQuery = '';
      this._onSelectCallback = null;
    }

    /**
     * Register a callback for when a game is selected.
     * Callback receives the gameId string.
     * @param {Function} callback
     */
    onSelect(callback) {
      this._onSelectCallback = callback;
    }

    /**
     * Show the game selection overlay.
     * @param {number} [playerLevel=1] - Current player level (for unlock checks).
     * @param {object} [playerInfo]    - Optional player info { name, title, coins, level }.
     */
    show(playerLevel, playerInfo) {
      var self = this;
      var level = playerLevel || 1;
      var info = playerInfo || {};

      // Remove existing overlay if open
      if (this.overlay) this.hide();

      // Create overlay container
      var overlay = document.createElement('div');
      overlay.className = 'game-selector-overlay';
      overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;' +
        'background:rgba(0,0,0,0.92);z-index:10000;display:flex;flex-direction:column;' +
        'align-items:center;overflow-y:auto;font-family:sans-serif;color:#fff;';

      // Header
      var header = document.createElement('div');
      header.style.cssText = 'width:100%;max-width:960px;padding:24px 16px 0;box-sizing:border-box;';
      header.innerHTML = '<h1 style="margin:0 0 4px;font-size:28px;">Game Lobby</h1>' +
        '<p style="margin:0 0 16px;color:#aaa;font-size:14px;">Choose a table game to play</p>';
      overlay.appendChild(header);

      // Search bar
      var searchBar = document.createElement('div');
      searchBar.style.cssText = 'width:100%;max-width:960px;padding:0 16px;box-sizing:border-box;';
      var searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.placeholder = 'Search games...';
      searchInput.style.cssText = 'width:100%;padding:10px 14px;border-radius:8px;border:1px solid #444;' +
        'background:#1a1a1a;color:#fff;font-size:14px;outline:none;box-sizing:border-box;';
      searchInput.addEventListener('input', function() {
        self.searchQuery = this.value.toLowerCase();
        self._renderCards(grid, level);
      });
      searchBar.appendChild(searchInput);
      overlay.appendChild(searchBar);

      // Category tabs
      var tabBar = document.createElement('div');
      tabBar.style.cssText = 'width:100%;max-width:960px;padding:12px 16px;box-sizing:border-box;' +
        'display:flex;gap:8px;flex-wrap:wrap;';
      var categories = ['all', 'tile', 'card', 'dice'];
      var categoryLabels = { all: 'All Games', tile: 'Tile Games', card: 'Card Games', dice: 'Dice Games' };
      var tabButtons = {};

      categories.forEach(function(cat) {
        var btn = document.createElement('button');
        btn.textContent = categoryLabels[cat] || cat;
        btn.style.cssText = 'padding:6px 16px;border-radius:20px;border:1px solid #555;' +
          'background:' + (cat === 'all' ? '#fff' : 'transparent') + ';' +
          'color:' + (cat === 'all' ? '#000' : '#ccc') + ';' +
          'cursor:pointer;font-size:13px;transition:all 0.2s;';
        btn.addEventListener('click', function() {
          self.activeCategory = cat;
          // Update tab styling
          categories.forEach(function(c) {
            tabButtons[c].style.background = c === cat ? '#fff' : 'transparent';
            tabButtons[c].style.color = c === cat ? '#000' : '#ccc';
          });
          self._renderCards(grid, level);
        });
        tabBar.appendChild(btn);
        tabButtons[cat] = btn;
      });
      overlay.appendChild(tabBar);

      // Grid container
      var grid = document.createElement('div');
      grid.style.cssText = 'width:100%;max-width:960px;padding:8px 16px 24px;box-sizing:border-box;' +
        'display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px;';
      overlay.appendChild(grid);

      // Render initial cards
      this._renderCards(grid, level);

      // Player info bar at the bottom
      var infoBar = document.createElement('div');
      infoBar.style.cssText = 'width:100%;max-width:960px;padding:16px;box-sizing:border-box;' +
        'display:flex;justify-content:space-between;align-items:center;' +
        'border-top:1px solid #333;margin-top:auto;flex-shrink:0;';
      var playerName = info.name || 'Player';
      var playerTitle = info.title || 'Beginner';
      var playerCoins = info.coins != null ? info.coins : 0;
      infoBar.innerHTML =
        '<div>' +
        '  <span style="font-size:16px;font-weight:bold;">' + this._escapeHtml(playerName) + '</span>' +
        '  <span style="color:#aaa;font-size:13px;margin-left:8px;">' + this._escapeHtml(playerTitle) + '</span>' +
        '</div>' +
        '<div style="display:flex;gap:16px;align-items:center;">' +
        '  <span style="color:#ffcc00;">Level ' + level + '</span>' +
        '  <span style="color:#ffd700;">\uD83E\uDE99 ' + playerCoins.toLocaleString() + '</span>' +
        '</div>';
      overlay.appendChild(infoBar);

      // Close button
      var closeBtn = document.createElement('button');
      closeBtn.textContent = '\u2715';
      closeBtn.style.cssText = 'position:fixed;top:16px;right:16px;width:36px;height:36px;' +
        'border-radius:50%;border:none;background:rgba(255,255,255,0.15);color:#fff;' +
        'font-size:18px;cursor:pointer;z-index:10001;display:flex;align-items:center;' +
        'justify-content:center;transition:background 0.2s;';
      closeBtn.addEventListener('mouseenter', function() { this.style.background = 'rgba(255,255,255,0.3)'; });
      closeBtn.addEventListener('mouseleave', function() { this.style.background = 'rgba(255,255,255,0.15)'; });
      closeBtn.addEventListener('click', function() { self.hide(); });
      overlay.appendChild(closeBtn);

      document.body.appendChild(overlay);
      this.overlay = overlay;

      // Focus search
      searchInput.focus();
    }

    /**
     * Hide and destroy the overlay.
     */
    hide() {
      if (this.overlay) {
        this.overlay.remove();
        this.overlay = null;
      }
    }

    /**
     * Whether the overlay is currently visible.
     * @returns {boolean}
     */
    isVisible() {
      return !!this.overlay;
    }

    // -------------------------------------------------------------------------
    // Card rendering
    // -------------------------------------------------------------------------

    /**
     * Render game cards into the grid container.
     * @private
     * @param {HTMLElement} grid
     * @param {number} playerLevel
     */
    _renderCards(grid, playerLevel) {
      var self = this;
      grid.innerHTML = '';

      // Collect registered games
      var games = this.framework.getGameList(playerLevel);

      // Add "coming soon" entries that aren't already registered
      var registeredIds = {};
      games.forEach(function(g) { registeredIds[g.id] = true; });
      var comingSoon = this.getComingSoon().filter(function(g) { return !registeredIds[g.id]; });
      comingSoon.forEach(function(g) { g._comingSoon = true; g.unlocked = false; });

      var allGames = games.concat(comingSoon);

      // Filter by category
      if (this.activeCategory !== 'all') {
        allGames = allGames.filter(function(g) { return g.category === self.activeCategory; });
      }

      // Filter by search query
      if (this.searchQuery) {
        allGames = allGames.filter(function(g) {
          return (g.name || '').toLowerCase().indexOf(self.searchQuery) !== -1 ||
            (g.description || '').toLowerCase().indexOf(self.searchQuery) !== -1 ||
            (g.category || '').toLowerCase().indexOf(self.searchQuery) !== -1;
        });
      }

      // Sort: unlocked first, then by name
      allGames.sort(function(a, b) {
        if (a.unlocked && !b.unlocked) return -1;
        if (!a.unlocked && b.unlocked) return 1;
        if (a._comingSoon && !b._comingSoon) return 1;
        if (!a._comingSoon && b._comingSoon) return -1;
        return (a.name || '').localeCompare(b.name || '');
      });

      if (allGames.length === 0) {
        var empty = document.createElement('div');
        empty.style.cssText = 'grid-column:1/-1;text-align:center;padding:48px;color:#666;font-size:16px;';
        empty.textContent = 'No games found.';
        grid.appendChild(empty);
        return;
      }

      allGames.forEach(function(game) {
        grid.appendChild(self.buildGameCard(game, game.unlocked));
      });
    }

    /**
     * Build a single game card element.
     *
     * @param {object} game - Game info object.
     * @param {boolean} unlocked - Whether the player can access this game.
     * @returns {HTMLElement}
     */
    buildGameCard(game, unlocked) {
      var self = this;
      var isComingSoon = !!game._comingSoon;
      var gradient = unlocked ? (CATEGORY_GRADIENTS[game.category] || CATEGORY_GRADIENTS.card) : LOCKED_GRADIENT;

      var card = document.createElement('div');
      card.style.cssText = 'background:' + gradient + ';border-radius:12px;padding:20px;' +
        'cursor:' + (unlocked && !isComingSoon ? 'pointer' : 'default') + ';' +
        'transition:transform 0.2s, box-shadow 0.2s;position:relative;overflow:hidden;' +
        'min-height:180px;display:flex;flex-direction:column;justify-content:space-between;' +
        ((!unlocked || isComingSoon) ? 'opacity:0.7;filter:saturate(0.4);' : '');

      if (unlocked && !isComingSoon) {
        card.addEventListener('mouseenter', function() {
          this.style.transform = 'translateY(-4px)';
          this.style.boxShadow = '0 8px 24px rgba(0,0,0,0.4)';
        });
        card.addEventListener('mouseleave', function() {
          this.style.transform = 'translateY(0)';
          this.style.boxShadow = 'none';
        });
      }

      // Icon
      var iconDiv = document.createElement('div');
      iconDiv.style.cssText = 'font-size:42px;margin-bottom:8px;';
      iconDiv.textContent = game.icon || '\uD83C\uDFB2';
      card.appendChild(iconDiv);

      // Name
      var nameDiv = document.createElement('div');
      nameDiv.style.cssText = 'font-size:20px;font-weight:bold;margin-bottom:4px;';
      nameDiv.textContent = game.name || game.id;
      card.appendChild(nameDiv);

      // Description
      var descDiv = document.createElement('div');
      descDiv.style.cssText = 'font-size:13px;color:rgba(255,255,255,0.8);margin-bottom:12px;line-height:1.4;';
      descDiv.textContent = game.description || '';
      card.appendChild(descDiv);

      // Bottom row: category badge + player count + button
      var bottomRow = document.createElement('div');
      bottomRow.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;';

      // Category badge
      var badge = document.createElement('span');
      badge.style.cssText = 'padding:2px 10px;border-radius:10px;font-size:11px;' +
        'background:rgba(255,255,255,0.2);color:rgba(255,255,255,0.9);text-transform:uppercase;letter-spacing:0.5px;';
      badge.textContent = CATEGORY_LABELS[game.category] || game.category || 'Game';
      bottomRow.appendChild(badge);

      // Player count
      if (game.minPlayers || game.maxPlayers) {
        var playersSpan = document.createElement('span');
        playersSpan.style.cssText = 'font-size:12px;color:rgba(255,255,255,0.7);';
        var min = game.minPlayers || 1;
        var max = game.maxPlayers || min;
        playersSpan.textContent = min === max ? (min + 'P') : (min + '-' + max + 'P');
        bottomRow.appendChild(playersSpan);
      }

      // Spacer
      var spacer = document.createElement('span');
      spacer.style.cssText = 'flex:1;';
      bottomRow.appendChild(spacer);

      // Action button / label
      if (isComingSoon) {
        var comingLabel = document.createElement('span');
        comingLabel.style.cssText = 'padding:4px 12px;border-radius:6px;font-size:12px;' +
          'background:rgba(255,255,255,0.15);color:rgba(255,255,255,0.7);font-style:italic;';
        comingLabel.textContent = 'Coming Soon';
        bottomRow.appendChild(comingLabel);
      } else if (!unlocked) {
        var lockLabel = document.createElement('span');
        lockLabel.style.cssText = 'padding:4px 12px;border-radius:6px;font-size:12px;' +
          'background:rgba(255,255,255,0.15);color:rgba(255,255,255,0.7);';
        lockLabel.textContent = '\uD83D\uDD12 Level ' + (game.unlockLevel || '?');
        bottomRow.appendChild(lockLabel);
      } else {
        var playBtn = document.createElement('button');
        playBtn.textContent = 'Play';
        playBtn.style.cssText = 'padding:6px 20px;border-radius:6px;border:none;' +
          'background:rgba(255,255,255,0.9);color:#111;font-size:13px;font-weight:bold;' +
          'cursor:pointer;transition:background 0.2s;';
        playBtn.addEventListener('mouseenter', function() { this.style.background = '#fff'; });
        playBtn.addEventListener('mouseleave', function() { this.style.background = 'rgba(255,255,255,0.9)'; });
        playBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          self._selectGame(game.id);
        });
        bottomRow.appendChild(playBtn);
      }

      card.appendChild(bottomRow);

      // Clicking the whole card (if unlocked) also selects
      if (unlocked && !isComingSoon) {
        card.addEventListener('click', function() {
          self._selectGame(game.id);
        });
      }

      return card;
    }

    // -------------------------------------------------------------------------
    // Coming soon
    // -------------------------------------------------------------------------

    /**
     * Return a list of "coming soon" games to tease future additions.
     * @returns {object[]}
     */
    getComingSoon() {
      return [
        { id: 'blackjack', name: 'Blackjack', icon: '\uD83C\uDCCF', description: 'Beat the dealer to 21', category: 'card', unlockLevel: 3, minPlayers: 1, maxPlayers: 7 },
        { id: 'rummy', name: 'Rummy', icon: '\uD83C\uDCA1', description: 'Form melds and go out first', category: 'card', unlockLevel: 5, minPlayers: 2, maxPlayers: 6 },
        { id: 'dominoes', name: 'Dominoes', icon: '\uD83C\uDC63', description: 'Match and place domino tiles', category: 'tile', unlockLevel: 7, minPlayers: 2, maxPlayers: 4 },
        { id: 'backgammon', name: 'Backgammon', icon: '\uD83C\uDFB2', description: 'Ancient race and strategy game', category: 'dice', unlockLevel: 8, minPlayers: 2, maxPlayers: 2 },
        { id: 'bridge', name: 'Bridge', icon: '\u2660\uFE0F', description: 'Classic partnership card game', category: 'card', unlockLevel: 10, minPlayers: 4, maxPlayers: 4 },
        { id: 'cribbage', name: 'Cribbage', icon: '\uD83C\uDCA0', description: 'Classic scoring card game', category: 'card', unlockLevel: 12, minPlayers: 2, maxPlayers: 3 }
      ];
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    /**
     * Handle selecting a game.
     * @private
     * @param {string} gameId
     */
    _selectGame(gameId) {
      if (this._onSelectCallback) {
        this._onSelectCallback(gameId);
      }
      this.hide();
    }

    /**
     * Escape HTML special characters to prevent injection.
     * @private
     * @param {string} str
     * @returns {string}
     */
    _escapeHtml(str) {
      if (!str) return '';
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
  }

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------

  root.MJ.GameSelector = {
    GameSelector: GameSelector
  };

})(typeof window !== 'undefined' ? window : global);
