/**
 * accessibility.js - Accessibility features for Mahjong game
 * Screen reader support, high contrast mode, keyboard-only navigation
 */
(function(exports) {
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  // ── CSS injection ──────────────────────────────────────────────────
  const ACCESSIBILITY_CSS = `
    /* High Contrast Mode */
    body.high-contrast {
      background: #000 !important;
      color: #fff !important;
    }
    body.high-contrast .mj-tile:not(.face-down) {
      background: #fff !important;
      border: 2px solid #000 !important;
      color: #000 !important;
      font-weight: bold !important;
    }
    body.high-contrast .mj-tile.face-down {
      background: #333 !important;
      border: 2px solid #888 !important;
    }
    body.high-contrast .game-board {
      background: #111 !important;
    }
    body.high-contrast .mj-tile.suit-bamboo:not(.face-down) {
      border-color: #00cc00 !important;
    }
    body.high-contrast .mj-tile.suit-circles:not(.face-down) {
      border-color: #0088ff !important;
    }
    body.high-contrast .mj-tile.suit-characters:not(.face-down) {
      border-color: #ff4444 !important;
    }
    body.high-contrast .mj-tile.suit-wind:not(.face-down),
    body.high-contrast .mj-tile.suit-dragon:not(.face-down) {
      border-color: #ffaa00 !important;
    }
    body.high-contrast button,
    body.high-contrast .btn {
      background: #222 !important;
      color: #fff !important;
      border: 2px solid #fff !important;
    }
    body.high-contrast button:hover,
    body.high-contrast .btn:hover {
      background: #444 !important;
    }
    body.high-contrast button:focus,
    body.high-contrast .btn:focus {
      outline: 3px solid #ff0 !important;
      outline-offset: 2px !important;
    }
    body.high-contrast .score-display,
    body.high-contrast .info-panel,
    body.high-contrast .sidebar {
      background: #111 !important;
      color: #fff !important;
      border: 2px solid #888 !important;
    }
    body.high-contrast a {
      color: #88ccff !important;
      text-decoration: underline !important;
    }
    body.high-contrast select,
    body.high-contrast input {
      background: #222 !important;
      color: #fff !important;
      border: 2px solid #fff !important;
    }
    body.high-contrast .player-label {
      color: #fff !important;
      font-weight: bold !important;
    }
    body.high-contrast .discard-area {
      background: #1a1a1a !important;
      border: 1px solid #666 !important;
    }
    body.high-contrast .meld-area {
      background: #0a0a0a !important;
    }
    body.high-contrast * {
      text-shadow: none !important;
      background-image: none !important;
    }

    /* Large Text Mode */
    body.large-text {
      font-size: 130% !important;
    }
    body.large-text .mj-tile {
      font-size: 130% !important;
    }
    body.large-text button,
    body.large-text .btn {
      font-size: 130% !important;
      padding: 0.6em 1em !important;
    }

    /* Reduced Motion */
    body.reduced-motion *,
    body.reduced-motion *::before,
    body.reduced-motion *::after {
      animation: none !important;
      animation-duration: 0s !important;
      transition: none !important;
      transition-duration: 0s !important;
    }

    /* Accessibility Panel */
    .a11y-panel {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #2a2a2a;
      color: #eee;
      border-radius: 12px;
      padding: 24px;
      z-index: 10000;
      min-width: 340px;
      max-width: 420px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      font-family: sans-serif;
    }
    .a11y-panel h2 {
      margin: 0 0 16px 0;
      font-size: 1.3em;
      border-bottom: 1px solid #555;
      padding-bottom: 8px;
    }
    .a11y-panel .a11y-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid #333;
    }
    .a11y-panel .a11y-row:last-child {
      border-bottom: none;
    }
    .a11y-panel .a11y-label {
      font-size: 0.95em;
    }
    .a11y-panel .a11y-desc {
      font-size: 0.75em;
      color: #aaa;
      margin-top: 2px;
    }
    .a11y-toggle {
      position: relative;
      width: 48px;
      height: 26px;
      flex-shrink: 0;
    }
    .a11y-toggle input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    .a11y-toggle .slider {
      position: absolute;
      cursor: pointer;
      top: 0; left: 0; right: 0; bottom: 0;
      background: #555;
      border-radius: 26px;
      transition: background 0.2s;
    }
    .a11y-toggle .slider::before {
      content: '';
      position: absolute;
      height: 20px;
      width: 20px;
      left: 3px;
      bottom: 3px;
      background: #fff;
      border-radius: 50%;
      transition: transform 0.2s;
    }
    .a11y-toggle input:checked + .slider {
      background: #4caf50;
    }
    .a11y-toggle input:checked + .slider::before {
      transform: translateX(22px);
    }
    .a11y-toggle input:focus + .slider {
      outline: 2px solid #88ccff;
      outline-offset: 2px;
    }
    .a11y-panel .a11y-close {
      margin-top: 16px;
      width: 100%;
      padding: 10px;
      background: #444;
      color: #fff;
      border: 1px solid #666;
      border-radius: 6px;
      cursor: pointer;
      font-size: 1em;
    }
    .a11y-panel .a11y-close:hover {
      background: #555;
    }

    /* Screen reader only utility */
    .sr-only {
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0,0,0,0) !important;
      white-space: nowrap !important;
      border: 0 !important;
    }

    /* Aria live region */
    .a11y-live-region {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0,0,0,0);
      white-space: nowrap;
      border: 0;
    }
  `;

  // ── Keyboard navigation map ────────────────────────────────────────
  const KEYBOARD_MAP = {
    'ArrowLeft':  { action: 'select_prev_tile', description: 'Select previous tile in hand' },
    'ArrowRight': { action: 'select_next_tile', description: 'Select next tile in hand' },
    'ArrowUp':    { action: 'raise_tile', description: 'Raise selected tile (prepare to discard)' },
    'ArrowDown':  { action: 'lower_tile', description: 'Lower raised tile' },
    'Enter':      { action: 'confirm', description: 'Confirm action / Discard raised tile' },
    'Space':      { action: 'confirm', description: 'Confirm action / Discard raised tile' },
    'Escape':     { action: 'cancel', description: 'Cancel / Close dialog' },
    'p':          { action: 'pong', description: 'Declare Pong' },
    'c':          { action: 'chow', description: 'Declare Chow' },
    'k':          { action: 'kong', description: 'Declare Kong' },
    'w':          { action: 'win', description: 'Declare Win' },
    'r':          { action: 'riichi', description: 'Declare Riichi' },
    'x':          { action: 'pass', description: 'Pass on claim' },
    's':          { action: 'sort_hand', description: 'Sort hand' },
    'n':          { action: 'new_game', description: 'New game' },
    'u':          { action: 'undo', description: 'Undo last action' },
    'h':          { action: 'hint', description: 'Show hint' },
    'Tab':        { action: 'cycle_focus', description: 'Cycle focus between game areas' },
    '?':          { action: 'show_help', description: 'Show keyboard shortcuts' },
    'a':          { action: 'open_accessibility', description: 'Open accessibility settings' },
    '1':          { action: 'select_tile_1', description: 'Select 1st tile' },
    '2':          { action: 'select_tile_2', description: 'Select 2nd tile' },
    '3':          { action: 'select_tile_3', description: 'Select 3rd tile' },
    '4':          { action: 'select_tile_4', description: 'Select 4th tile' },
    '5':          { action: 'select_tile_5', description: 'Select 5th tile' },
    '6':          { action: 'select_tile_6', description: 'Select 6th tile' },
    '7':          { action: 'select_tile_7', description: 'Select 7th tile' },
    '8':          { action: 'select_tile_8', description: 'Select 8th tile' },
    '9':          { action: 'select_tile_9', description: 'Select 9th tile' },
    '0':          { action: 'select_tile_10', description: 'Select 10th tile' },
  };

  // ── Tile name helpers ──────────────────────────────────────────────
  const SUIT_NAMES = {
    bamboo: 'Bamboo',
    circles: 'Circles',
    characters: 'Characters',
    bam: 'Bamboo',
    pin: 'Circles',
    man: 'Characters',
    wan: 'Characters'
  };

  const HONOR_NAMES = {
    'east': 'East Wind',
    'south': 'South Wind',
    'west': 'West Wind',
    'north': 'North Wind',
    'red': 'Red Dragon',
    'green': 'Green Dragon',
    'white': 'White Dragon',
    'chun': 'Red Dragon',
    'hatsu': 'Green Dragon',
    'haku': 'White Dragon'
  };

  const WIND_NAMES = ['East', 'South', 'West', 'North'];

  /**
   * Produce a human-readable name for a tile object.
   * Supports various tile formats found in the codebase.
   */
  function getTileName(tile) {
    if (!tile) return 'Unknown tile';
    // If tile has a suit and value
    if (tile.suit && tile.value !== undefined) {
      var suitLower = tile.suit.toLowerCase();
      if (suitLower === 'wind') {
        var windName = WIND_NAMES[tile.value] || tile.value;
        return windName + ' Wind';
      }
      if (suitLower === 'dragon') {
        if (tile.value === 0 || tile.value === 'red' || tile.value === 'chun') return 'Red Dragon';
        if (tile.value === 1 || tile.value === 'green' || tile.value === 'hatsu') return 'Green Dragon';
        if (tile.value === 2 || tile.value === 'white' || tile.value === 'haku') return 'White Dragon';
        return tile.value + ' Dragon';
      }
      if (suitLower === 'flower') {
        return 'Flower ' + (tile.value + 1);
      }
      var suitName = SUIT_NAMES[suitLower] || tile.suit;
      return (tile.value + 1) + ' of ' + suitName;
    }
    // Fallback for string-based tile IDs
    if (typeof tile === 'string') {
      return tile.replace(/_/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); });
    }
    if (tile.name) return tile.name;
    if (tile.id) return tile.id;
    return 'Unknown tile';
  }

  // ── Storage key ────────────────────────────────────────────────────
  var STORAGE_KEY = 'mj_accessibility_settings';

  // ── AccessibilityManager ───────────────────────────────────────────
  function AccessibilityManager() {
    this.settings = {
      highContrast: false,
      screenReader: false,
      largeText: false,
      reducedMotion: false
    };
    this._liveRegion = null;
    this._styleInjected = false;
    this._panelEl = null;
    this._keyboardHandler = null;
    this._init();
  }

  AccessibilityManager.prototype._init = function() {
    this._injectStyles();
    this._loadSettings();
    this._detectMediaPreferences();
    this._applySettings();
    this._ensureLiveRegion();
  };

  /**
   * Inject the accessibility CSS into the document head.
   */
  AccessibilityManager.prototype._injectStyles = function() {
    if (this._styleInjected) return;
    if (typeof document === 'undefined') return;
    var style = document.createElement('style');
    style.setAttribute('data-mj-accessibility', 'true');
    style.textContent = ACCESSIBILITY_CSS;
    document.head.appendChild(style);
    this._styleInjected = true;
  };

  /**
   * Detect user OS-level accessibility preferences.
   */
  AccessibilityManager.prototype._detectMediaPreferences = function() {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    try {
      var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (motionQuery.matches && !this._hasStoredSettings()) {
        this.settings.reducedMotion = true;
      }
      motionQuery.addEventListener('change', function(e) {
        this.setReducedMotion(e.matches);
      }.bind(this));
    } catch (e) { /* media query not supported */ }

    try {
      var contrastQuery = window.matchMedia('(prefers-contrast: more)');
      if (contrastQuery.matches && !this._hasStoredSettings()) {
        this.settings.highContrast = true;
      }
      contrastQuery.addEventListener('change', function(e) {
        this.setHighContrast(e.matches);
      }.bind(this));
    } catch (e) { /* media query not supported */ }
  };

  AccessibilityManager.prototype._hasStoredSettings = function() {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEY) !== null;
  };

  /**
   * Load persisted settings from localStorage.
   */
  AccessibilityManager.prototype._loadSettings = function() {
    if (typeof localStorage === 'undefined') return;
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        var parsed = JSON.parse(stored);
        for (var key in parsed) {
          if (this.settings.hasOwnProperty(key)) {
            this.settings[key] = parsed[key];
          }
        }
      }
    } catch (e) { /* ignore parse errors */ }
  };

  /**
   * Persist current settings to localStorage.
   */
  AccessibilityManager.prototype._saveSettings = function() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch (e) { /* storage full or unavailable */ }
  };

  /**
   * Apply all current settings to the DOM.
   */
  AccessibilityManager.prototype._applySettings = function() {
    if (typeof document === 'undefined') return;
    var body = document.body;
    if (!body) return;
    this._toggleClass(body, 'high-contrast', this.settings.highContrast);
    this._toggleClass(body, 'large-text', this.settings.largeText);
    this._toggleClass(body, 'reduced-motion', this.settings.reducedMotion);
    if (this.settings.screenReader) {
      this.injectAriaLabels();
    }
  };

  AccessibilityManager.prototype._toggleClass = function(el, className, enabled) {
    if (enabled) {
      el.classList.add(className);
    } else {
      el.classList.remove(className);
    }
  };

  /**
   * Ensure the aria-live region exists in the DOM.
   */
  AccessibilityManager.prototype._ensureLiveRegion = function() {
    if (typeof document === 'undefined') return;
    if (this._liveRegion && document.body.contains(this._liveRegion)) return;
    this._liveRegion = document.createElement('div');
    this._liveRegion.setAttribute('aria-live', 'polite');
    this._liveRegion.setAttribute('aria-atomic', 'true');
    this._liveRegion.setAttribute('role', 'status');
    this._liveRegion.className = 'a11y-live-region';
    this._liveRegion.id = 'mj-a11y-live';
    if (document.body) {
      document.body.appendChild(this._liveRegion);
    }
  };

  // ── Public API ─────────────────────────────────────────────────────

  /**
   * Toggle high contrast mode.
   */
  AccessibilityManager.prototype.setHighContrast = function(enabled) {
    this.settings.highContrast = !!enabled;
    if (typeof document !== 'undefined' && document.body) {
      this._toggleClass(document.body, 'high-contrast', this.settings.highContrast);
    }
    this._saveSettings();
    this.announceAction(enabled ? 'High contrast mode enabled' : 'High contrast mode disabled');
  };

  /**
   * Toggle screen reader support. Adds aria labels to game elements.
   */
  AccessibilityManager.prototype.setScreenReader = function(enabled) {
    this.settings.screenReader = !!enabled;
    if (enabled) {
      this.injectAriaLabels();
    }
    this._saveSettings();
    this.announceAction(enabled ? 'Screen reader support enabled' : 'Screen reader support disabled');
  };

  /**
   * Toggle large text mode (130% font size increase).
   */
  AccessibilityManager.prototype.setLargeText = function(enabled) {
    this.settings.largeText = !!enabled;
    if (typeof document !== 'undefined' && document.body) {
      this._toggleClass(document.body, 'large-text', this.settings.largeText);
    }
    this._saveSettings();
    this.announceAction(enabled ? 'Large text enabled' : 'Large text disabled');
  };

  /**
   * Toggle reduced motion (disables all CSS animations/transitions).
   */
  AccessibilityManager.prototype.setReducedMotion = function(enabled) {
    this.settings.reducedMotion = !!enabled;
    if (typeof document !== 'undefined' && document.body) {
      this._toggleClass(document.body, 'reduced-motion', this.settings.reducedMotion);
    }
    this._saveSettings();
    this.announceAction(enabled ? 'Reduced motion enabled' : 'Reduced motion disabled');
  };

  /**
   * Push an announcement to the aria-live region for screen readers.
   */
  AccessibilityManager.prototype.announceAction = function(text) {
    this._ensureLiveRegion();
    if (!this._liveRegion) return;
    // Clear and re-set to ensure screen readers pick up the change
    this._liveRegion.textContent = '';
    var region = this._liveRegion;
    setTimeout(function() {
      region.textContent = text;
    }, 50);
  };

  /**
   * Returns the full keyboard navigation map.
   */
  AccessibilityManager.prototype.getKeyboardMap = function() {
    return JSON.parse(JSON.stringify(KEYBOARD_MAP));
  };

  /**
   * Inject aria-label attributes on game elements for screen reader support.
   */
  AccessibilityManager.prototype.injectAriaLabels = function() {
    if (typeof document === 'undefined') return;

    // Label tiles
    var tiles = document.querySelectorAll('.mj-tile');
    for (var i = 0; i < tiles.length; i++) {
      var tileEl = tiles[i];
      tileEl.setAttribute('role', 'img');
      if (tileEl.classList.contains('face-down')) {
        tileEl.setAttribute('aria-label', 'Face-down tile');
        continue;
      }
      var tileData = tileEl._tileData || tileEl.dataset;
      if (tileData) {
        var name = getTileName(tileData);
        tileEl.setAttribute('aria-label', name);
      }
    }

    // Label player hand areas
    var handAreas = document.querySelectorAll('.player-hand, .hand-tiles, [data-hand]');
    for (var h = 0; h < handAreas.length; h++) {
      var handEl = handAreas[h];
      var playerName = handEl.dataset.player || 'Player';
      handEl.setAttribute('role', 'list');
      handEl.setAttribute('aria-label', playerName + ' hand tiles');
      var handTiles = handEl.querySelectorAll('.mj-tile');
      for (var t = 0; t < handTiles.length; t++) {
        handTiles[t].setAttribute('role', 'listitem');
      }
    }

    // Label discard areas
    var discardAreas = document.querySelectorAll('.discard-area, .discards, [data-discards]');
    for (var d = 0; d < discardAreas.length; d++) {
      var discardEl = discardAreas[d];
      var dPlayer = discardEl.dataset.player || '';
      var windLabel = dPlayer ? ('Player ' + dPlayer) : 'Discard';
      discardEl.setAttribute('role', 'list');
      discardEl.setAttribute('aria-label', windLabel + ' discards');
    }

    // Label meld areas
    var meldAreas = document.querySelectorAll('.meld-area, .melds, [data-melds]');
    for (var m = 0; m < meldAreas.length; m++) {
      var meldEl = meldAreas[m];
      meldEl.setAttribute('role', 'list');
      meldEl.setAttribute('aria-label', 'Open melds');
      var meldGroups = meldEl.querySelectorAll('.meld-group, .meld');
      for (var mg = 0; mg < meldGroups.length; mg++) {
        var group = meldGroups[mg];
        var meldType = group.dataset.type || 'Meld';
        var meldTiles = group.querySelectorAll('.mj-tile');
        var tileNames = [];
        for (var mt = 0; mt < meldTiles.length; mt++) {
          tileNames.push(meldTiles[mt].getAttribute('aria-label') || 'tile');
        }
        var meldLabel = meldType.charAt(0).toUpperCase() + meldType.slice(1);
        if (tileNames.length > 0) {
          meldLabel += ' of ' + tileNames[0];
        }
        group.setAttribute('role', 'listitem');
        group.setAttribute('aria-label', 'Open ' + meldLabel);
      }
    }

    // Label buttons
    var buttons = document.querySelectorAll('button, .btn, [role="button"]');
    for (var b = 0; b < buttons.length; b++) {
      var btn = buttons[b];
      if (!btn.getAttribute('aria-label') && btn.textContent.trim()) {
        btn.setAttribute('aria-label', btn.textContent.trim());
      }
    }

    // Label score displays
    var scores = document.querySelectorAll('.score-display, .player-score, [data-score]');
    for (var sc = 0; sc < scores.length; sc++) {
      scores[sc].setAttribute('role', 'status');
      if (!scores[sc].getAttribute('aria-label')) {
        scores[sc].setAttribute('aria-label', 'Score: ' + (scores[sc].textContent || '').trim());
      }
    }

    // Label the game board
    var board = document.querySelector('.game-board, #game-board, .mahjong-table');
    if (board) {
      board.setAttribute('role', 'application');
      board.setAttribute('aria-label', 'Mahjong game board');
    }
  };

  /**
   * Build and display the accessibility settings panel.
   * Returns the panel DOM element.
   */
  AccessibilityManager.prototype.buildAccessibilityUI = function() {
    if (typeof document === 'undefined') return null;
    // Remove existing panel if present
    if (this._panelEl && this._panelEl.parentNode) {
      this._panelEl.parentNode.removeChild(this._panelEl);
    }

    var self = this;
    var panel = document.createElement('div');
    panel.className = 'a11y-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Accessibility Settings');
    panel.setAttribute('tabindex', '-1');

    var title = document.createElement('h2');
    title.textContent = 'Accessibility Settings';
    panel.appendChild(title);

    var features = [
      {
        key: 'highContrast',
        label: 'High Contrast',
        desc: 'White text on black, thick borders, no gradients',
        setter: 'setHighContrast'
      },
      {
        key: 'screenReader',
        label: 'Screen Reader Support',
        desc: 'Adds aria labels and live announcements',
        setter: 'setScreenReader'
      },
      {
        key: 'largeText',
        label: 'Large Text',
        desc: 'Increases all font sizes by 30%',
        setter: 'setLargeText'
      },
      {
        key: 'reducedMotion',
        label: 'Reduced Motion',
        desc: 'Disables all animations and transitions',
        setter: 'setReducedMotion'
      }
    ];

    features.forEach(function(feature) {
      var row = document.createElement('div');
      row.className = 'a11y-row';

      var labelContainer = document.createElement('div');
      var labelEl = document.createElement('div');
      labelEl.className = 'a11y-label';
      labelEl.textContent = feature.label;
      labelContainer.appendChild(labelEl);

      var descEl = document.createElement('div');
      descEl.className = 'a11y-desc';
      descEl.textContent = feature.desc;
      labelContainer.appendChild(descEl);
      row.appendChild(labelContainer);

      var toggle = document.createElement('label');
      toggle.className = 'a11y-toggle';

      var checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = self.settings[feature.key];
      checkbox.setAttribute('aria-label', feature.label);
      checkbox.addEventListener('change', function() {
        self[feature.setter](checkbox.checked);
      });

      var slider = document.createElement('span');
      slider.className = 'slider';

      toggle.appendChild(checkbox);
      toggle.appendChild(slider);
      row.appendChild(toggle);
      panel.appendChild(row);
    });

    // Keyboard shortcuts info
    var kbRow = document.createElement('div');
    kbRow.className = 'a11y-row';
    kbRow.style.flexDirection = 'column';
    kbRow.style.alignItems = 'flex-start';
    var kbLabel = document.createElement('div');
    kbLabel.className = 'a11y-label';
    kbLabel.textContent = 'Keyboard Shortcuts';
    kbLabel.style.marginBottom = '6px';
    kbRow.appendChild(kbLabel);

    var shortcuts = [
      ['Arrow keys', 'Navigate tiles'],
      ['Enter/Space', 'Confirm action'],
      ['P/C/K/W', 'Pong/Chow/Kong/Win'],
      ['R', 'Riichi'],
      ['X', 'Pass'],
      ['S', 'Sort hand'],
      ['?', 'Show all shortcuts']
    ];
    shortcuts.forEach(function(sc) {
      var line = document.createElement('div');
      line.className = 'a11y-desc';
      line.textContent = sc[0] + ' -- ' + sc[1];
      kbRow.appendChild(line);
    });
    panel.appendChild(kbRow);

    // Close button
    var closeBtn = document.createElement('button');
    closeBtn.className = 'a11y-close';
    closeBtn.textContent = 'Close';
    closeBtn.setAttribute('aria-label', 'Close accessibility settings');
    closeBtn.addEventListener('click', function() {
      if (panel.parentNode) {
        panel.parentNode.removeChild(panel);
      }
      self._panelEl = null;
    });
    panel.appendChild(closeBtn);

    // Handle Escape key to close
    panel.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        closeBtn.click();
        e.stopPropagation();
      }
    });

    document.body.appendChild(panel);
    panel.focus();
    this._panelEl = panel;
    return panel;
  };

  /**
   * Get the current settings object.
   */
  AccessibilityManager.prototype.getSettings = function() {
    return JSON.parse(JSON.stringify(this.settings));
  };

  /**
   * Reset all settings to defaults.
   */
  AccessibilityManager.prototype.resetSettings = function() {
    this.setHighContrast(false);
    this.setScreenReader(false);
    this.setLargeText(false);
    this.setReducedMotion(false);
  };

  /**
   * Utility: generate a tile name from a tile object (exposed for external use).
   */
  AccessibilityManager.prototype.getTileName = getTileName;

  // ── Export ─────────────────────────────────────────────────────────
  root.MJ.Accessibility = AccessibilityManager;

})(typeof window !== 'undefined' ? window : global);
