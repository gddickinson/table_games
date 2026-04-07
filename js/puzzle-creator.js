/**
 * puzzle-creator.js — Player-created Mahjong puzzles with sharing
 * Full puzzle editor, library browser, import/export, and auto-solve.
 * Exports: root.MJ.PuzzleCreator
 */
(function (exports) {
  'use strict';
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  const Constants = () => root.MJ.Constants;
  const Tile = () => root.MJ.Tile;
  const Hand = () => root.MJ.Hand;
  const AIE = () => root.MJ.AIEngine;
  const TileRenderer = () => root.MJ.TileRenderer;

  const STORAGE_KEY = 'mj_user_puzzles';
  const RATINGS_KEY = 'mj_puzzle_ratings';

  // All 34 unique tile types in compact notation
  const TILE_CODES = [
    'c1','c2','c3','c4','c5','c6','c7','c8','c9',
    'b1','b2','b3','b4','b5','b6','b7','b8','b9',
    'p1','p2','p3','p4','p5','p6','p7','p8','p9',
    'w1','w2','w3','w4',
    'd1','d2','d3'
  ];

  const SUIT_MAP = {
    c: 'characters', b: 'bamboo', p: 'circles', w: 'wind', d: 'dragon'
  };

  const SUIT_REVERSE = {
    characters: 'c', bamboo: 'b', circles: 'p', wind: 'w', dragon: 'd'
  };

  // ── Compact format helpers ──

  function tileToCode(tile) {
    return (SUIT_REVERSE[tile.suit] || 'x') + tile.rank;
  }

  function codeToTile(code) {
    const suit = SUIT_MAP[code[0]];
    const rank = parseInt(code.substring(1), 10);
    return suit ? { suit: suit, rank: rank } : null;
  }

  function handToCompact(tiles) {
    return tiles.map(tileToCode).join('');
  }

  function compactToHand(str) {
    const tiles = [];
    for (var i = 0; i < str.length; i += 2) {
      var code = str.substring(i, i + 2);
      var tile = codeToTile(code);
      if (tile) tiles.push(tile);
    }
    return tiles;
  }

  function generateId() {
    return 'pzl_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
  }

  // ── Built-in puzzle library ──

  var BUILTIN_PUZZLES = [
    {
      id: 'builtin_bd_01',
      type: 'best_discard',
      title: 'Drop the Orphan',
      description: 'One tile has no connections. Find and discard it.',
      difficulty: 1,
      hand: 'b1b2b3c4c5c6p7p8p9w1w1d3b5',
      melds: [],
      answer: 'd3',
      hint: 'Look for isolated honor tiles with no pairs.',
      author: 'MJ Team',
      builtin: true
    },
    {
      id: 'builtin_bd_02',
      type: 'best_discard',
      title: 'Efficiency Choice',
      description: 'Which discard maximizes your winning tiles?',
      difficulty: 3,
      hand: 'b2b3b4c3c4c5p6p7p8c7c8w2w2',
      melds: [],
      answer: 'c7',
      hint: 'Consider which partial meld has the fewest remaining outs.',
      author: 'MJ Team',
      builtin: true
    },
    {
      id: 'builtin_iw_01',
      type: 'identify_waits',
      title: 'Simple Sequence Wait',
      description: 'Identify all tiles that would complete this hand.',
      difficulty: 1,
      hand: 'b1b2b3c4c5c6p7p8p9w1w1b5b6',
      melds: [],
      answer: 'b4,b7',
      hint: 'Look at the incomplete sequence.',
      author: 'MJ Team',
      builtin: true
    },
    {
      id: 'builtin_cp_01',
      type: 'claim_or_pass',
      title: 'To Pon or Not to Pon',
      description: 'An opponent discards this tile. Should you claim it?',
      difficulty: 2,
      hand: 'b1b2b3c4c5c6p7p8p9w1w1d2d2',
      melds: [],
      offeredTile: 'd2',
      answer: 'pass',
      hint: 'Calling pon would break your concealed hand and reduce yaku.',
      author: 'MJ Team',
      builtin: true
    }
  ];

  // ── PuzzleCreator class ──

  function PuzzleCreator() {
    this._container = null;
    this._currentPuzzle = null;
    this._selectedTiles = [];
    this._selectedMelds = [];
    this._currentMeld = [];
    this._puzzleType = 'best_discard';
    this._answerTile = null;
    this._offeredTile = null;
    this._answerWaits = [];
    this._claimAnswer = 'claim';
  }

  // ── UI Builder: Full-screen puzzle editor ──

  PuzzleCreator.prototype.buildCreatorUI = function (parentEl) {
    var self = this;
    this._container = parentEl || document.createElement('div');
    this._container.className = 'puzzle-creator-screen';

    var html = '<div class="puzzle-creator">';

    // Header
    html += '<div class="pc-header"><h2>Puzzle Creator</h2>';
    html += '<button class="pc-close-btn" data-action="close">&#x2715;</button></div>';

    // Metadata inputs
    html += '<div class="pc-meta">';
    html += '<input type="text" id="pc-title" placeholder="Puzzle Title" maxlength="80">';
    html += '<textarea id="pc-desc" placeholder="Description..." rows="2" maxlength="300"></textarea>';
    html += '<div class="pc-row">';
    html += '<label>Difficulty: </label>';
    html += '<select id="pc-difficulty">';
    for (var d = 1; d <= 5; d++) {
      html += '<option value="' + d + '">' + '\u2605'.repeat(d) + '</option>';
    }
    html += '</select>';
    html += '<label> Type: </label>';
    html += '<select id="pc-type">';
    html += '<option value="best_discard">Best Discard</option>';
    html += '<option value="identify_waits">Identify Waits</option>';
    html += '<option value="claim_or_pass">Claim or Pass</option>';
    html += '</select>';
    html += '</div>';
    html += '<textarea id="pc-hint" placeholder="Hint / Explanation..." rows="2" maxlength="500"></textarea>';
    html += '</div>';

    // Tile palette
    html += '<div class="pc-palette"><h3>Tile Palette</h3><div class="pc-palette-tiles">';
    TILE_CODES.forEach(function (code) {
      html += '<div class="pc-tile-btn" data-code="' + code + '" title="' + code + '">';
      html += '<span class="pc-tile-label">' + code + '</span>';
      html += '</div>';
    });
    html += '</div></div>';

    // Hand area: 13 slots
    html += '<div class="pc-hand-area"><h3>Hand (13 tiles)</h3>';
    html += '<div class="pc-hand-slots" id="pc-hand-slots">';
    for (var i = 0; i < 13; i++) {
      html += '<div class="pc-slot" data-slot="' + i + '"></div>';
    }
    html += '</div>';
    html += '<button class="pc-btn" data-action="clear-hand">Clear Hand</button>';
    html += '</div>';

    // Meld area
    html += '<div class="pc-meld-area"><h3>Open Melds</h3>';
    html += '<div class="pc-melds-list" id="pc-melds-list"></div>';
    html += '<div class="pc-meld-builder" id="pc-meld-builder">';
    html += '<span>Building meld: </span><span id="pc-meld-tiles"></span>';
    html += '<button class="pc-btn pc-btn-sm" data-action="add-meld">Add Meld</button>';
    html += '<button class="pc-btn pc-btn-sm" data-action="clear-meld-builder">Clear</button>';
    html += '</div></div>';

    // Answer area (changes based on type)
    html += '<div class="pc-answer-area" id="pc-answer-area">';
    html += this._buildAnswerUI('best_discard');
    html += '</div>';

    // Action buttons
    html += '<div class="pc-actions">';
    html += '<button class="pc-btn pc-btn-primary" data-action="test">Test Puzzle</button>';
    html += '<button class="pc-btn pc-btn-primary" data-action="save">Save</button>';
    html += '<button class="pc-btn" data-action="share">Share</button>';
    html += '<button class="pc-btn" data-action="auto-solve">Auto-Solve</button>';
    html += '<button class="pc-btn" data-action="library">Library</button>';
    html += '</div>';

    html += '</div>';
    this._container.innerHTML = html;

    // Render SVG tiles in palette
    this._renderPaletteTiles();

    // Bind events
    this._bindEvents();

    return this._container;
  };

  PuzzleCreator.prototype._buildAnswerUI = function (type) {
    var html = '<h3>Answer</h3>';
    if (type === 'best_discard') {
      html += '<p>Click a tile in your hand to set it as the correct discard.</p>';
      html += '<div id="pc-answer-display">No answer set</div>';
    } else if (type === 'identify_waits') {
      html += '<p>Waits will be auto-calculated from the hand.</p>';
      html += '<div id="pc-answer-display">Set a tenpai hand to see waits</div>';
    } else if (type === 'claim_or_pass') {
      html += '<p>Set the offered tile and correct action:</p>';
      html += '<div class="pc-row">';
      html += '<label>Offered tile: </label>';
      html += '<span id="pc-offered-tile">None</span>';
      html += '<button class="pc-btn pc-btn-sm" data-action="set-offered">Set from palette</button>';
      html += '</div>';
      html += '<div class="pc-row">';
      html += '<label>Correct answer: </label>';
      html += '<select id="pc-claim-answer">';
      html += '<option value="claim">Claim</option>';
      html += '<option value="pass">Pass</option>';
      html += '</select>';
      html += '</div>';
      html += '<div id="pc-answer-display"></div>';
    }
    return html;
  };

  PuzzleCreator.prototype._renderPaletteTiles = function () {
    var renderer = TileRenderer();
    if (!renderer) return;
    var btns = this._container.querySelectorAll('.pc-tile-btn');
    btns.forEach(function (btn) {
      var code = btn.getAttribute('data-code');
      var tile = codeToTile(code);
      if (tile && renderer.renderTileSVG) {
        var svg = renderer.renderTileSVG(tile, { width: 36, height: 48 });
        if (typeof svg === 'string') {
          btn.innerHTML = svg;
        } else if (svg instanceof Element) {
          btn.innerHTML = '';
          btn.appendChild(svg);
        }
      }
    });
  };

  PuzzleCreator.prototype._renderSlotTile = function (slotEl, code) {
    var renderer = TileRenderer();
    var tile = codeToTile(code);
    if (tile && renderer && renderer.renderTileSVG) {
      var svg = renderer.renderTileSVG(tile, { width: 36, height: 48 });
      if (typeof svg === 'string') {
        slotEl.innerHTML = svg;
      } else if (svg instanceof Element) {
        slotEl.innerHTML = '';
        slotEl.appendChild(svg);
      }
    } else {
      slotEl.textContent = code;
    }
    slotEl.setAttribute('data-code', code);
  };

  PuzzleCreator.prototype._bindEvents = function () {
    var self = this;
    var settingOffered = false;

    this._container.addEventListener('click', function (e) {
      var target = e.target.closest('[data-action]');
      var paletteBtn = e.target.closest('.pc-tile-btn');
      var slotEl = e.target.closest('.pc-slot');

      // Palette tile click — add to hand or meld builder
      if (paletteBtn) {
        var code = paletteBtn.getAttribute('data-code');
        if (settingOffered) {
          self._offeredTile = code;
          settingOffered = false;
          var offeredEl = self._container.querySelector('#pc-offered-tile');
          if (offeredEl) offeredEl.textContent = code;
          return;
        }
        if (self._selectedTiles.length < 13) {
          self._selectedTiles.push(code);
          self._updateHandSlots();
        }
        return;
      }

      // Hand slot click — set as answer for best_discard or remove
      if (slotEl) {
        var slotCode = slotEl.getAttribute('data-code');
        if (!slotCode) return;
        if (self._puzzleType === 'best_discard') {
          self._answerTile = slotCode;
          self._updateAnswerDisplay();
          self._highlightAnswerSlot();
        } else {
          // Remove tile from hand
          var idx = parseInt(slotEl.getAttribute('data-slot'), 10);
          if (idx >= 0 && idx < self._selectedTiles.length) {
            self._selectedTiles.splice(idx, 1);
            self._updateHandSlots();
          }
        }
        return;
      }

      if (!target) return;
      var action = target.getAttribute('data-action');

      switch (action) {
        case 'close':
          self._container.innerHTML = '';
          break;
        case 'clear-hand':
          self._selectedTiles = [];
          self._answerTile = null;
          self._updateHandSlots();
          self._updateAnswerDisplay();
          break;
        case 'add-meld':
          if (self._currentMeld.length >= 3) {
            self._selectedMelds.push(self._currentMeld.slice());
            self._currentMeld = [];
            self._updateMeldDisplay();
          }
          break;
        case 'clear-meld-builder':
          self._currentMeld = [];
          self._updateMeldBuilderDisplay();
          break;
        case 'set-offered':
          settingOffered = true;
          break;
        case 'test':
          self._testPuzzle();
          break;
        case 'save':
          self._saveCurrent();
          break;
        case 'share':
          self._shareCurrent();
          break;
        case 'auto-solve':
          self._autoSolveCurrent();
          break;
        case 'library':
          self.buildPuzzleLibraryUI(self._container);
          break;
      }
    });

    // Type selector change
    var typeSelect = this._container.querySelector('#pc-type');
    if (typeSelect) {
      typeSelect.addEventListener('change', function () {
        self._puzzleType = typeSelect.value;
        var answerArea = self._container.querySelector('#pc-answer-area');
        if (answerArea) answerArea.innerHTML = self._buildAnswerUI(self._puzzleType);
        if (self._puzzleType === 'identify_waits') {
          self._computeWaits();
        }
      });
    }
  };

  PuzzleCreator.prototype._updateHandSlots = function () {
    var slots = this._container.querySelectorAll('.pc-slot');
    var self = this;
    slots.forEach(function (slot, i) {
      if (i < self._selectedTiles.length) {
        self._renderSlotTile(slot, self._selectedTiles[i]);
      } else {
        slot.innerHTML = '';
        slot.removeAttribute('data-code');
      }
    });
    if (this._puzzleType === 'identify_waits') {
      this._computeWaits();
    }
  };

  PuzzleCreator.prototype._updateMeldDisplay = function () {
    var list = this._container.querySelector('#pc-melds-list');
    if (!list) return;
    var html = '';
    this._selectedMelds.forEach(function (meld, i) {
      html += '<div class="pc-meld">' + meld.join(' ') +
        ' <button class="pc-btn pc-btn-sm" data-action="remove-meld" data-meld-idx="' + i + '">x</button></div>';
    });
    list.innerHTML = html;
    this._updateMeldBuilderDisplay();
  };

  PuzzleCreator.prototype._updateMeldBuilderDisplay = function () {
    var el = this._container.querySelector('#pc-meld-tiles');
    if (el) el.textContent = this._currentMeld.join(' ') || '(empty)';
  };

  PuzzleCreator.prototype._updateAnswerDisplay = function () {
    var el = this._container.querySelector('#pc-answer-display');
    if (!el) return;
    if (this._puzzleType === 'best_discard') {
      el.textContent = this._answerTile ? 'Answer: ' + this._answerTile : 'No answer set';
    } else if (this._puzzleType === 'identify_waits') {
      el.textContent = this._answerWaits.length > 0
        ? 'Waits: ' + this._answerWaits.join(', ')
        : 'Set a tenpai hand to see waits';
    }
  };

  PuzzleCreator.prototype._highlightAnswerSlot = function () {
    var slots = this._container.querySelectorAll('.pc-slot');
    var ans = this._answerTile;
    slots.forEach(function (slot) {
      slot.classList.toggle('pc-slot-answer', slot.getAttribute('data-code') === ans);
    });
  };

  PuzzleCreator.prototype._computeWaits = function () {
    this._answerWaits = [];
    if (this._selectedTiles.length < 13) return;
    var hand = compactToHand(this._selectedTiles.join(''));
    var aie = AIE();
    if (!aie) return;
    // Try removing each tile and checking if remaining is tenpai
    var waitsSet = {};
    for (var i = 0; i < 34; i++) {
      var testTile = codeToTile(TILE_CODES[i]);
      if (!testTile) continue;
      var testHand = hand.concat([testTile]);
      // Check if this forms a complete hand
      var handObj = Hand();
      if (handObj && handObj.isComplete && handObj.isComplete(testHand)) {
        waitsSet[TILE_CODES[i]] = true;
      }
    }
    this._answerWaits = Object.keys(waitsSet);
    this._updateAnswerDisplay();
  };

  // ── Puzzle assembly ──

  PuzzleCreator.prototype._assemblePuzzle = function () {
    var titleEl = this._container.querySelector('#pc-title');
    var descEl = this._container.querySelector('#pc-desc');
    var diffEl = this._container.querySelector('#pc-difficulty');
    var hintEl = this._container.querySelector('#pc-hint');

    var puzzle = {
      id: generateId(),
      type: this._puzzleType,
      title: titleEl ? titleEl.value.trim() : 'Untitled',
      description: descEl ? descEl.value.trim() : '',
      difficulty: diffEl ? parseInt(diffEl.value, 10) : 1,
      hand: this._selectedTiles.join(''),
      melds: this._selectedMelds.map(function (m) { return m.join(''); }),
      hint: hintEl ? hintEl.value.trim() : '',
      author: 'Player',
      created: Date.now()
    };

    if (this._puzzleType === 'best_discard') {
      puzzle.answer = this._answerTile || '';
    } else if (this._puzzleType === 'identify_waits') {
      puzzle.answer = this._answerWaits.join(',');
    } else if (this._puzzleType === 'claim_or_pass') {
      puzzle.offeredTile = this._offeredTile || '';
      var claimSel = this._container.querySelector('#pc-claim-answer');
      puzzle.answer = claimSel ? claimSel.value : 'pass';
    }

    return puzzle;
  };

  // ── Validation ──

  PuzzleCreator.prototype.validatePuzzle = function (puzzle) {
    var errors = [];
    if (!puzzle.title || puzzle.title.length === 0) {
      errors.push('Title is required.');
    }
    if (!puzzle.hand || puzzle.hand.length === 0) {
      errors.push('Hand is required.');
    }
    var tiles = compactToHand(puzzle.hand);
    var expectedCount = 13 - (puzzle.melds ? puzzle.melds.length * 3 : 0);
    if (tiles.length !== 13 && tiles.length !== expectedCount) {
      errors.push('Hand should have 13 tiles (or fewer with melds). Got ' + tiles.length + '.');
    }
    if (puzzle.type === 'best_discard') {
      if (!puzzle.answer) {
        errors.push('Best discard puzzles require a correct answer tile.');
      } else {
        var answerInHand = false;
        var ansTile = puzzle.answer;
        for (var i = 0; i < puzzle.hand.length; i += 2) {
          if (puzzle.hand.substring(i, i + 2) === ansTile) {
            answerInHand = true;
            break;
          }
        }
        if (!answerInHand) {
          errors.push('Answer tile must be in the hand.');
        }
      }
    }
    if (puzzle.type === 'claim_or_pass') {
      if (!puzzle.offeredTile) {
        errors.push('Claim or pass puzzles require an offered tile.');
      }
      if (puzzle.answer !== 'claim' && puzzle.answer !== 'pass') {
        errors.push('Claim or pass answer must be "claim" or "pass".');
      }
    }
    if (puzzle.type === 'identify_waits') {
      if (!puzzle.answer || puzzle.answer.length === 0) {
        errors.push('No waits found. Ensure the hand is in tenpai.');
      }
    }
    // Check tile counts don't exceed 4
    var counts = {};
    tiles.forEach(function (t) {
      var key = tileToCode(t);
      counts[key] = (counts[key] || 0) + 1;
      if (counts[key] > 4) {
        errors.push('Tile ' + key + ' appears more than 4 times.');
      }
    });

    return { valid: errors.length === 0, errors: errors };
  };

  // ── Save / Load ──

  PuzzleCreator.prototype.savePuzzle = function (puzzle) {
    var puzzles = this.loadPuzzles();
    var existing = puzzles.findIndex(function (p) { return p.id === puzzle.id; });
    if (existing >= 0) {
      puzzles[existing] = puzzle;
    } else {
      puzzles.push(puzzle);
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(puzzles));
    } catch (e) {
      console.warn('PuzzleCreator: Failed to save puzzle', e);
    }
    return puzzle;
  };

  PuzzleCreator.prototype.loadPuzzles = function () {
    try {
      var data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.warn('PuzzleCreator: Failed to load puzzles', e);
      return [];
    }
  };

  // ── Import / Export ──

  PuzzleCreator.prototype.importPuzzle = function (json) {
    try {
      var puzzle = typeof json === 'string' ? JSON.parse(json) : json;
      if (!puzzle.id) puzzle.id = generateId();
      puzzle.imported = true;
      puzzle.importedAt = Date.now();
      var validation = this.validatePuzzle(puzzle);
      if (!validation.valid) {
        return { success: false, errors: validation.errors };
      }
      this.savePuzzle(puzzle);
      return { success: true, puzzle: puzzle };
    } catch (e) {
      return { success: false, errors: ['Invalid JSON: ' + e.message] };
    }
  };

  PuzzleCreator.prototype.exportPuzzle = function (puzzleId) {
    var puzzles = this.loadPuzzles();
    var puzzle = puzzles.find(function (p) { return p.id === puzzleId; });
    if (!puzzle) return null;
    // Compact format: strip internal fields
    var compact = {
      type: puzzle.type,
      hand: puzzle.hand,
      melds: puzzle.melds || [],
      answer: puzzle.answer,
      title: puzzle.title,
      desc: puzzle.description || '',
      difficulty: puzzle.difficulty,
      author: puzzle.author || 'Player'
    };
    if (puzzle.offeredTile) compact.offeredTile = puzzle.offeredTile;
    if (puzzle.hint) compact.hint = puzzle.hint;
    return JSON.stringify(compact);
  };

  // ── Auto-solve ──

  PuzzleCreator.prototype.autoSolve = function (puzzle) {
    var tiles = compactToHand(puzzle.hand);
    var aie = AIE();
    if (!aie) return { answer: null, reason: 'AIEngine not available' };

    if (puzzle.type === 'best_discard') {
      // Use AI to pick the best discard
      try {
        var result = aie.chooseBestDiscard
          ? aie.chooseBestDiscard(tiles, puzzle.melds || [])
          : null;
        if (result && result.tile) {
          return { answer: tileToCode(result.tile), reason: result.reason || 'AI analysis' };
        }
        // Fallback: try evaluateDiscards
        if (aie.evaluateDiscards) {
          var evals = aie.evaluateDiscards(tiles);
          if (evals && evals.length > 0) {
            evals.sort(function (a, b) { return b.score - a.score; });
            return { answer: tileToCode(evals[0].tile), reason: 'Highest efficiency score' };
          }
        }
      } catch (e) {
        return { answer: null, reason: 'AI error: ' + e.message };
      }
    }

    if (puzzle.type === 'identify_waits') {
      var waits = [];
      for (var i = 0; i < 34; i++) {
        var testTile = codeToTile(TILE_CODES[i]);
        var testHand = tiles.concat([testTile]);
        var handMod = Hand();
        if (handMod && handMod.isComplete && handMod.isComplete(testHand)) {
          waits.push(TILE_CODES[i]);
        }
      }
      return { answer: waits.join(','), reason: 'Exhaustive search of all 34 tile types' };
    }

    if (puzzle.type === 'claim_or_pass') {
      // Basic heuristic: if claiming improves shanten, claim
      if (puzzle.offeredTile && aie.calculateShanten) {
        var offered = codeToTile(puzzle.offeredTile);
        var currentShanten = aie.calculateShanten(tiles);
        var withClaim = tiles.concat([offered]);
        // Try each discard after claiming
        var bestShanten = 99;
        for (var j = 0; j < withClaim.length; j++) {
          var reduced = withClaim.slice(0, j).concat(withClaim.slice(j + 1));
          var s = aie.calculateShanten(reduced);
          if (s < bestShanten) bestShanten = s;
        }
        if (bestShanten < currentShanten) {
          return { answer: 'claim', reason: 'Claiming improves shanten from ' + currentShanten + ' to ' + bestShanten };
        }
        return { answer: 'pass', reason: 'Claiming does not improve shanten (' + currentShanten + ')' };
      }
    }

    return { answer: null, reason: 'Unable to solve' };
  };

  // ── Test puzzle (interactive) ──

  PuzzleCreator.prototype._testPuzzle = function () {
    var puzzle = this._assemblePuzzle();
    var validation = this.validatePuzzle(puzzle);
    if (!validation.valid) {
      alert('Puzzle validation failed:\n' + validation.errors.join('\n'));
      return;
    }
    // Simple test: show the puzzle and let user answer
    var answer = prompt(
      'TEST: ' + puzzle.title + '\nType: ' + puzzle.type +
      '\nHand: ' + puzzle.hand +
      '\n\nEnter your answer:'
    );
    if (answer === null) return;
    answer = answer.trim().toLowerCase();
    var correct = puzzle.answer.toLowerCase();
    if (answer === correct) {
      alert('Correct! The answer is: ' + puzzle.answer);
    } else {
      alert('Incorrect. Your answer: ' + answer + '\nCorrect answer: ' + puzzle.answer);
    }
  };

  PuzzleCreator.prototype._saveCurrent = function () {
    var puzzle = this._assemblePuzzle();
    var validation = this.validatePuzzle(puzzle);
    if (!validation.valid) {
      alert('Cannot save:\n' + validation.errors.join('\n'));
      return;
    }
    this.savePuzzle(puzzle);
    alert('Puzzle saved: ' + puzzle.title);
  };

  PuzzleCreator.prototype._shareCurrent = function () {
    var puzzle = this._assemblePuzzle();
    var validation = this.validatePuzzle(puzzle);
    if (!validation.valid) {
      alert('Cannot share:\n' + validation.errors.join('\n'));
      return;
    }
    this.savePuzzle(puzzle);
    var json = this.exportPuzzle(puzzle.id);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(json).then(function () {
        alert('Puzzle JSON copied to clipboard!');
      }).catch(function () {
        prompt('Copy this JSON to share:', json);
      });
    } else {
      prompt('Copy this JSON to share:', json);
    }
  };

  PuzzleCreator.prototype._autoSolveCurrent = function () {
    var puzzle = this._assemblePuzzle();
    var result = this.autoSolve(puzzle);
    if (result.answer) {
      alert('AI Answer: ' + result.answer + '\nReason: ' + result.reason);
      if (this._puzzleType === 'best_discard') {
        this._answerTile = result.answer;
        this._updateAnswerDisplay();
        this._highlightAnswerSlot();
      } else if (this._puzzleType === 'identify_waits') {
        this._answerWaits = result.answer.split(',');
        this._updateAnswerDisplay();
      }
    } else {
      alert('Auto-solve failed: ' + result.reason);
    }
  };

  // ── Puzzle Library ──

  PuzzleCreator.prototype.getPuzzleLibrary = function () {
    var userPuzzles = this.loadPuzzles();
    return BUILTIN_PUZZLES.concat(userPuzzles);
  };

  PuzzleCreator.prototype.buildPuzzleLibraryUI = function (parentEl) {
    var self = this;
    var container = parentEl || document.createElement('div');
    var puzzles = this.getPuzzleLibrary();
    var ratings = this._loadRatings();

    var html = '<div class="pc-library">';
    html += '<div class="pc-header"><h2>Puzzle Library</h2>';
    html += '<button class="pc-btn" data-action="back-to-creator">Create New</button>';
    html += '<button class="pc-btn" data-action="import">Import</button>';
    html += '</div>';

    if (puzzles.length === 0) {
      html += '<p>No puzzles yet. Create one!</p>';
    } else {
      html += '<div class="pc-puzzle-list">';
      puzzles.forEach(function (p) {
        var starStr = '\u2605'.repeat(p.difficulty || 1) + '\u2606'.repeat(5 - (p.difficulty || 1));
        var rating = ratings[p.id];
        var ratingStr = rating ? ' | Rated: ' + '\u2605'.repeat(rating) : '';
        html += '<div class="pc-puzzle-item" data-id="' + p.id + '">';
        html += '<div class="pc-puzzle-info">';
        html += '<strong>' + (p.title || 'Untitled') + '</strong>';
        html += '<span class="pc-puzzle-meta">' + (p.type || '').replace('_', ' ') + ' | ' + starStr + ratingStr + '</span>';
        html += '<span class="pc-puzzle-desc">' + (p.description || p.desc || '') + '</span>';
        html += '<span class="pc-puzzle-author">by ' + (p.author || 'Unknown') + '</span>';
        html += '</div>';
        html += '<div class="pc-puzzle-actions">';
        html += '<button class="pc-btn pc-btn-sm" data-action="play" data-id="' + p.id + '">Play</button>';
        if (!p.builtin) {
          html += '<button class="pc-btn pc-btn-sm" data-action="edit" data-id="' + p.id + '">Edit</button>';
          html += '<button class="pc-btn pc-btn-sm" data-action="delete" data-id="' + p.id + '">Delete</button>';
        }
        html += '<button class="pc-btn pc-btn-sm" data-action="share-puzzle" data-id="' + p.id + '">Share</button>';
        html += '<select class="pc-rate-select" data-id="' + p.id + '">';
        html += '<option value="">Rate</option>';
        for (var r = 1; r <= 5; r++) {
          html += '<option value="' + r + '"' + (rating === r ? ' selected' : '') + '>' + '\u2605'.repeat(r) + '</option>';
        }
        html += '</select>';
        html += '</div></div>';
      });
      html += '</div>';
    }
    html += '</div>';
    container.innerHTML = html;

    // Bind library events
    container.addEventListener('click', function (e) {
      var target = e.target.closest('[data-action]');
      if (!target) return;
      var action = target.getAttribute('data-action');
      var id = target.getAttribute('data-id');

      if (action === 'back-to-creator') {
        self.buildCreatorUI(container);
      } else if (action === 'import') {
        var json = prompt('Paste puzzle JSON:');
        if (json) {
          var result = self.importPuzzle(json);
          if (result.success) {
            alert('Imported: ' + result.puzzle.title);
            self.buildPuzzleLibraryUI(container);
          } else {
            alert('Import failed:\n' + result.errors.join('\n'));
          }
        }
      } else if (action === 'play') {
        self._playPuzzle(id, container);
      } else if (action === 'edit') {
        self._editPuzzle(id, container);
      } else if (action === 'delete') {
        if (confirm('Delete this puzzle?')) {
          self._deletePuzzle(id);
          self.buildPuzzleLibraryUI(container);
        }
      } else if (action === 'share-puzzle') {
        var json2 = self.exportPuzzle(id);
        if (json2) {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(json2).then(function () {
              alert('Copied to clipboard!');
            });
          } else {
            prompt('Copy:', json2);
          }
        }
      }
    });

    container.addEventListener('change', function (e) {
      var sel = e.target.closest('.pc-rate-select');
      if (sel) {
        var id = sel.getAttribute('data-id');
        var val = parseInt(sel.value, 10);
        if (val >= 1 && val <= 5) {
          self.ratePuzzle(id, val);
        }
      }
    });

    return container;
  };

  PuzzleCreator.prototype._playPuzzle = function (puzzleId, container) {
    var allPuzzles = this.getPuzzleLibrary();
    var puzzle = allPuzzles.find(function (p) { return p.id === puzzleId; });
    if (!puzzle) return;

    var answer = prompt(
      puzzle.title + '\n' + (puzzle.description || puzzle.desc || '') +
      '\nType: ' + puzzle.type.replace('_', ' ') +
      '\nHand: ' + puzzle.hand +
      (puzzle.hint ? '\nHint: ' + puzzle.hint : '') +
      '\n\nEnter your answer:'
    );
    if (answer === null) return;
    answer = answer.trim().toLowerCase();
    var correct = (puzzle.answer || '').toLowerCase();
    if (answer === correct) {
      alert('Correct!');
    } else {
      alert('Incorrect.\nYour answer: ' + answer + '\nCorrect: ' + puzzle.answer +
        (puzzle.hint ? '\n\nExplanation: ' + puzzle.hint : ''));
    }
  };

  PuzzleCreator.prototype._editPuzzle = function (puzzleId, container) {
    var puzzles = this.loadPuzzles();
    var puzzle = puzzles.find(function (p) { return p.id === puzzleId; });
    if (!puzzle) return;

    this.buildCreatorUI(container);
    // Populate fields
    this._puzzleType = puzzle.type;
    this._selectedTiles = [];
    for (var i = 0; i < puzzle.hand.length; i += 2) {
      this._selectedTiles.push(puzzle.hand.substring(i, i + 2));
    }
    this._selectedMelds = (puzzle.melds || []).map(function (m) {
      var tiles = [];
      for (var j = 0; j < m.length; j += 2) tiles.push(m.substring(j, j + 2));
      return tiles;
    });
    this._answerTile = puzzle.type === 'best_discard' ? puzzle.answer : null;
    this._offeredTile = puzzle.offeredTile || null;
    this._claimAnswer = puzzle.type === 'claim_or_pass' ? puzzle.answer : 'claim';
    if (puzzle.type === 'identify_waits') {
      this._answerWaits = puzzle.answer ? puzzle.answer.split(',') : [];
    }

    var titleEl = this._container.querySelector('#pc-title');
    var descEl = this._container.querySelector('#pc-desc');
    var diffEl = this._container.querySelector('#pc-difficulty');
    var typeEl = this._container.querySelector('#pc-type');
    var hintEl = this._container.querySelector('#pc-hint');

    if (titleEl) titleEl.value = puzzle.title || '';
    if (descEl) descEl.value = puzzle.description || puzzle.desc || '';
    if (diffEl) diffEl.value = puzzle.difficulty || 1;
    if (typeEl) typeEl.value = puzzle.type;
    if (hintEl) hintEl.value = puzzle.hint || '';

    this._updateHandSlots();
    this._updateMeldDisplay();
    this._updateAnswerDisplay();
  };

  PuzzleCreator.prototype._deletePuzzle = function (puzzleId) {
    var puzzles = this.loadPuzzles();
    puzzles = puzzles.filter(function (p) { return p.id !== puzzleId; });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(puzzles));
    } catch (e) {
      console.warn('PuzzleCreator: Failed to delete puzzle', e);
    }
  };

  // ── Ratings ──

  PuzzleCreator.prototype.ratePuzzle = function (puzzleId, rating) {
    var ratings = this._loadRatings();
    ratings[puzzleId] = Math.max(1, Math.min(5, rating));
    try {
      localStorage.setItem(RATINGS_KEY, JSON.stringify(ratings));
    } catch (e) {
      console.warn('PuzzleCreator: Failed to save rating', e);
    }
  };

  PuzzleCreator.prototype._loadRatings = function () {
    try {
      var data = localStorage.getItem(RATINGS_KEY);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  };

  // ── Export ──
  root.MJ.PuzzleCreator = new PuzzleCreator();

})(typeof window !== 'undefined' ? window : this);
