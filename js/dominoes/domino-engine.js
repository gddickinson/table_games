/**
 * domino-engine.js - Game engine for 4-player Block Dominoes
 * Shuffle 28 tiles, deal 7 each, play matching tiles on chain ends.
 * Round ends when someone empties hand or all 4 players pass (blocked).
 * Exports as root.MJ.Dominoes.Engine
 */
(function(exports) {
  'use strict';
  var root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};
  root.MJ.Dominoes = root.MJ.Dominoes || {};

  var Tiles = function() { return root.MJ.Dominoes.Tiles; };

  // Phases
  var PHASE = {
    WAITING: 'waiting',
    PLAYING: 'playing',
    ROUND_OVER: 'round_over'
  };

  /**
   * DominoEngine constructor.
   */
  function DominoEngine() {
    this.players = [];        // [{tiles:[], score:0, passed:false, name:''}]
    this.chain = [];          // [{tile, placedLeft:bool}] — order of play
    this.leftEnd = -1;        // value at left end of chain
    this.rightEnd = -1;       // value at right end of chain
    this.currentPlayer = 0;
    this.phase = PHASE.WAITING;
    this.consecutivePasses = 0;
    this.winner = -1;
    this.turnHistory = [];

    this._onRoundEnd = [];
    this._onStateChange = [];
    this._onTilePlay = [];
    this._onPass = [];
  }

  /**
   * Initialize players and deal tiles.
   */
  DominoEngine.prototype.start = function(playerNames) {
    var T = Tiles();
    var allTiles = T.shuffle(T.createSet());

    this.players = [];
    this.chain = [];
    this.leftEnd = -1;
    this.rightEnd = -1;
    this.consecutivePasses = 0;
    this.winner = -1;
    this.turnHistory = [];
    this.phase = PHASE.PLAYING;

    var names = playerNames || ['Player', 'Kenji', 'Mei', 'Yuki'];
    for (var i = 0; i < 4; i++) {
      this.players.push({
        tiles: allTiles.slice(i * 7, (i + 1) * 7),
        score: 0,
        passed: false,
        name: names[i] || ('Player ' + (i + 1))
      });
    }

    // Find who has the highest double — they start
    this.currentPlayer = this._findFirstPlayer();
    this._fireStateChange();
    return this.currentPlayer;
  };

  /**
   * Find the player with the highest double.
   * If no one has a double, highest pip tile holder starts.
   */
  DominoEngine.prototype._findFirstPlayer = function() {
    var T = Tiles();
    // Check from double-6 down to double-0
    for (var d = 6; d >= 0; d--) {
      for (var p = 0; p < 4; p++) {
        for (var t = 0; t < this.players[p].tiles.length; t++) {
          var tile = this.players[p].tiles[t];
          if (tile.high === d && tile.low === d) {
            return p;
          }
        }
      }
    }
    // No doubles found — player with highest pip total tile
    var bestPlayer = 0;
    var bestPips = -1;
    for (var p2 = 0; p2 < 4; p2++) {
      for (var t2 = 0; t2 < this.players[p2].tiles.length; t2++) {
        var pips = T.getTotalPips(this.players[p2].tiles[t2]);
        if (pips > bestPips) {
          bestPips = pips;
          bestPlayer = p2;
        }
      }
    }
    return bestPlayer;
  };

  /**
   * Play a tile on left or right end of chain.
   * end: 'left' or 'right'
   * Returns true if valid play.
   */
  DominoEngine.prototype.playTile = function(playerIdx, tileUid, end) {
    if (this.phase !== PHASE.PLAYING) return false;
    if (playerIdx !== this.currentPlayer) return false;

    var T = Tiles();
    var player = this.players[playerIdx];
    var tile = T.findByUid(player.tiles, tileUid);
    if (!tile) return false;

    // First tile in chain — no end restriction
    if (this.chain.length === 0) {
      this.chain.push({ tile: tile, placedLeft: false });
      this.leftEnd = tile.low;
      this.rightEnd = tile.high;
      player.tiles = T.removeByUid(player.tiles, tileUid);
      this.consecutivePasses = 0;
      player.passed = false;
      this.turnHistory.push({ player: playerIdx, tile: tile, end: 'first' });
      this._fireTilePlay(playerIdx, tile, 'first');
      this._checkRoundEnd(playerIdx);
      if (this.phase === PHASE.PLAYING) this._advanceTurn();
      this._fireStateChange();
      return true;
    }

    // Check which end we're playing on
    var targetEnd = (end === 'left') ? this.leftEnd : this.rightEnd;
    if (!T.canPlay(tile, targetEnd)) return false;

    var newEndValue = T.getPlayableEnd(tile, targetEnd);

    if (end === 'left') {
      this.chain.unshift({ tile: tile, placedLeft: true });
      this.leftEnd = newEndValue;
    } else {
      this.chain.push({ tile: tile, placedLeft: false });
      this.rightEnd = newEndValue;
    }

    player.tiles = T.removeByUid(player.tiles, tileUid);
    this.consecutivePasses = 0;
    player.passed = false;
    this.turnHistory.push({ player: playerIdx, tile: tile, end: end });
    this._fireTilePlay(playerIdx, tile, end);
    this._checkRoundEnd(playerIdx);
    if (this.phase === PHASE.PLAYING) this._advanceTurn();
    this._fireStateChange();
    return true;
  };

  /**
   * Check if a specific player can play any tile.
   */
  DominoEngine.prototype.canPlayerPlay = function(playerIdx) {
    var playable = this.getPlayableTiles(playerIdx);
    return playable.length > 0;
  };

  /**
   * Player passes (only valid if they have no playable tile).
   */
  DominoEngine.prototype.pass = function(playerIdx) {
    if (this.phase !== PHASE.PLAYING) return false;
    if (playerIdx !== this.currentPlayer) return false;
    // Should not pass if they can play, but we allow it (UI should prevent)

    var player = this.players[playerIdx];
    player.passed = true;
    this.consecutivePasses++;
    this.turnHistory.push({ player: playerIdx, tile: null, end: null });
    this._firePass(playerIdx);

    if (this.isBlocked()) {
      this._endRound('blocked');
    } else {
      this._advanceTurn();
    }
    this._fireStateChange();
    return true;
  };

  /**
   * Check if the game is blocked (all 4 players passed consecutively).
   */
  DominoEngine.prototype.isBlocked = function() {
    return this.consecutivePasses >= 4;
  };

  /**
   * Get which tiles a player can play.
   * Returns [{tile, ends:['left','right']}]
   */
  DominoEngine.prototype.getPlayableTiles = function(playerIdx) {
    var T = Tiles();
    var player = this.players[playerIdx];
    var result = [];

    if (this.chain.length === 0) {
      // First play — all tiles are playable
      for (var i = 0; i < player.tiles.length; i++) {
        result.push({ tile: player.tiles[i], ends: ['first'] });
      }
      return result;
    }

    for (var j = 0; j < player.tiles.length; j++) {
      var tile = player.tiles[j];
      var ends = [];
      if (T.canPlay(tile, this.leftEnd)) ends.push('left');
      if (T.canPlay(tile, this.rightEnd)) ends.push('right');
      // If both ends are the same value and tile matches, deduplicate
      if (this.leftEnd === this.rightEnd && ends.length === 2) {
        ends = ['left'];
      }
      if (ends.length > 0) {
        result.push({ tile: tile, ends: ends });
      }
    }
    return result;
  };

  /**
   * Get score for a player (sum of remaining pips — lower is better).
   */
  DominoEngine.prototype.getScore = function(playerIdx) {
    var T = Tiles();
    var sum = 0;
    var tiles = this.players[playerIdx].tiles;
    for (var i = 0; i < tiles.length; i++) {
      sum += T.getTotalPips(tiles[i]);
    }
    return sum;
  };

  /**
   * Get the winner index. -1 if game still in progress.
   */
  DominoEngine.prototype.getWinner = function() {
    return this.winner;
  };

  /**
   * Get current game state snapshot.
   */
  DominoEngine.prototype.getState = function() {
    return {
      players: this.players.map(function(p, i) {
        return {
          name: p.name,
          tileCount: p.tiles.length,
          score: this.getScore(i),
          passed: p.passed
        };
      }.bind(this)),
      chain: this.chain.slice(),
      leftEnd: this.leftEnd,
      rightEnd: this.rightEnd,
      currentPlayer: this.currentPlayer,
      phase: this.phase,
      winner: this.winner,
      consecutivePasses: this.consecutivePasses
    };
  };

  // --- Internal helpers ---

  DominoEngine.prototype._advanceTurn = function() {
    this.currentPlayer = (this.currentPlayer + 1) % 4;
  };

  DominoEngine.prototype._checkRoundEnd = function(playerIdx) {
    if (this.players[playerIdx].tiles.length === 0) {
      this._endRound('empty', playerIdx);
    }
  };

  DominoEngine.prototype._endRound = function(reason, winnerIdx) {
    this.phase = PHASE.ROUND_OVER;

    if (reason === 'empty') {
      this.winner = winnerIdx;
    } else {
      // Blocked — lowest pip count wins
      var lowestPips = Infinity;
      var lowestPlayer = 0;
      for (var i = 0; i < 4; i++) {
        var pips = this.getScore(i);
        if (pips < lowestPips) {
          lowestPips = pips;
          lowestPlayer = i;
        }
      }
      this.winner = lowestPlayer;
    }

    for (var j = 0; j < this._onRoundEnd.length; j++) {
      this._onRoundEnd[j]({
        winner: this.winner,
        reason: reason,
        scores: [this.getScore(0), this.getScore(1), this.getScore(2), this.getScore(3)]
      });
    }
  };

  // --- Event callbacks ---

  DominoEngine.prototype.onRoundEnd = function(cb) {
    if (typeof cb === 'function') this._onRoundEnd.push(cb);
  };

  DominoEngine.prototype.onStateChange = function(cb) {
    if (typeof cb === 'function') this._onStateChange.push(cb);
  };

  DominoEngine.prototype.onTilePlay = function(cb) {
    if (typeof cb === 'function') this._onTilePlay.push(cb);
  };

  DominoEngine.prototype.onPass = function(cb) {
    if (typeof cb === 'function') this._onPass.push(cb);
  };

  DominoEngine.prototype._fireStateChange = function() {
    var state = this.getState();
    for (var i = 0; i < this._onStateChange.length; i++) {
      this._onStateChange[i](state);
    }
  };

  DominoEngine.prototype._fireTilePlay = function(playerIdx, tile, end) {
    for (var i = 0; i < this._onTilePlay.length; i++) {
      this._onTilePlay[i]({ player: playerIdx, tile: tile, end: end });
    }
  };

  DominoEngine.prototype._firePass = function(playerIdx) {
    for (var i = 0; i < this._onPass.length; i++) {
      this._onPass[i]({ player: playerIdx });
    }
  };

  root.MJ.Dominoes.Engine = Object.freeze({
    DominoEngine: DominoEngine,
    PHASE: PHASE
  });

  console.log('[Dominoes] Engine module loaded');
})(typeof window !== 'undefined' ? window : global);
