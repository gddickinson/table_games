/**
 * domino-hints.js - Hint overlay for Dominoes showing optimal play
 * Analyzes playable tiles, ranks them, and provides natural language advice.
 * Exports under root.MJ.Dominoes.Hints
 */
(function(exports) {
    'use strict';
    var root = typeof window !== 'undefined' ? window : exports;
    root.MJ = root.MJ || {};
    root.MJ.Dominoes = root.MJ.Dominoes || {};

    var AI = function() { return root.MJ.Dominoes.AI; };
    var Tiles = function() { return root.MJ.Dominoes.Tiles; };

    // Total tile count in a double-six set
    var TOTAL_TILES = 28;
    var MAX_PIP = 6;

    // -----------------------------------------------------------------------
    // DominoHints class
    // -----------------------------------------------------------------------
    function DominoHints() {
        this.enabled = true;
        this.level = 2; // 0=off, 1=basic, 2=full
    }

    /**
     * Set hint level: 0=off, 1=basic, 2=full (with tile counting)
     */
    DominoHints.prototype.setLevel = function(level) {
        this.level = Math.max(0, Math.min(2, level));
        this.enabled = this.level > 0;
    };

    /**
     * Get all playable options for the player's tiles against the current board ends.
     */
    function getPlayableOptions(playerTiles, gameState) {
        var aiRef = AI();
        if (aiRef && aiRef.getPlayableOptions) {
            return aiRef.getPlayableOptions(playerTiles, gameState);
        }

        // Fallback: compute playable options locally
        var options = [];
        var leftEnd = gameState.leftEnd;
        var rightEnd = gameState.rightEnd;

        for (var i = 0; i < playerTiles.length; i++) {
            var t = playerTiles[i];
            var a = t.a !== undefined ? t.a : t.pips ? t.pips[0] : 0;
            var b = t.b !== undefined ? t.b : t.pips ? t.pips[1] : 0;

            if (a === leftEnd || b === leftEnd) {
                options.push({ tile: t, end: 'left' });
            }
            if (leftEnd !== rightEnd && (a === rightEnd || b === rightEnd)) {
                options.push({ tile: t, end: 'right' });
            }
        }
        return options;
    }

    /**
     * Count how many values in the player's remaining hand match a given pip value.
     */
    function countMatchingPips(tiles, pipValue) {
        var count = 0;
        for (var i = 0; i < tiles.length; i++) {
            var a = tiles[i].a !== undefined ? tiles[i].a : 0;
            var b = tiles[i].b !== undefined ? tiles[i].b : 0;
            if (a === pipValue || b === pipValue) count++;
        }
        return count;
    }

    /**
     * Check if a tile is a double.
     */
    function isDouble(tile) {
        var a = tile.a !== undefined ? tile.a : tile.pips ? tile.pips[0] : -1;
        var b = tile.b !== undefined ? tile.b : tile.pips ? tile.pips[1] : -1;
        return a === b;
    }

    /**
     * Total pips on a tile.
     */
    function tilePips(tile) {
        var a = tile.a !== undefined ? tile.a : tile.pips ? tile.pips[0] : 0;
        var b = tile.b !== undefined ? tile.b : tile.pips ? tile.pips[1] : 0;
        return a + b;
    }

    /**
     * Score a play option based on strategic value.
     * Higher score = better play.
     */
    function scorePlay(tile, end, playerTiles, gameState) {
        var score = 0;
        var a = tile.a !== undefined ? tile.a : 0;
        var b = tile.b !== undefined ? tile.b : 0;

        // Prefer playing doubles early (they are harder to play later)
        if (isDouble(tile)) {
            score += 15;
        }

        // Prefer playing high-pip tiles (reduce points if stuck)
        score += tilePips(tile) * 0.5;

        // Prefer plays that keep the most future options open
        var playedVal = (end === 'left') ? (a === gameState.leftEnd ? b : a)
                                          : (a === gameState.rightEnd ? b : a);
        var remaining = [];
        for (var i = 0; i < playerTiles.length; i++) {
            if (playerTiles[i] !== tile) remaining.push(playerTiles[i]);
        }
        var futureMatches = countMatchingPips(remaining, playedVal);
        score += futureMatches * 3;

        // Prefer plays that create ends matching more of our tiles
        var leftAfter = end === 'left' ? playedVal : gameState.leftEnd;
        var rightAfter = end === 'right' ? playedVal : gameState.rightEnd;
        var endMatches = countMatchingPips(remaining, leftAfter) + countMatchingPips(remaining, rightAfter);
        score += endMatches * 2;

        // Slight preference for blocking opponent values (if we know what they passed on)
        if (gameState.passedValues) {
            for (var j = 0; j < gameState.passedValues.length; j++) {
                if (playedVal !== gameState.passedValues[j]) {
                    score += 1;
                }
            }
        }

        return Math.round(score * 100) / 100;
    }

    /**
     * Build a natural language reason for the recommended play.
     */
    function buildReason(tile, end, score, playerTiles, gameState, isTop) {
        var a = tile.a !== undefined ? tile.a : 0;
        var b = tile.b !== undefined ? tile.b : 0;
        var tileStr = '[' + a + '|' + b + ']';

        if (!isTop) {
            return 'Play ' + tileStr + ' on the ' + end + ' (score: ' + score + ')';
        }

        if (isDouble(tile)) {
            return 'Play ' + tileStr + ' \u2014 doubles are harder to play later, get rid of it now.';
        }

        var remaining = playerTiles.filter(function(t) { return t !== tile; });
        var playedVal = (end === 'left') ? (a === gameState.leftEnd ? b : a)
                                          : (a === gameState.rightEnd ? b : a);
        var futureMatches = countMatchingPips(remaining, playedVal);

        if (futureMatches >= 2) {
            return 'Play ' + tileStr + ' on the ' + end +
                   ' \u2014 this keeps the most options for your remaining tiles.';
        }

        if (gameState.passedValues && gameState.passedValues.length > 0) {
            return 'Play ' + tileStr + ' \u2014 blocks the value your opponent is likely waiting for.';
        }

        if (tilePips(tile) >= 8) {
            return 'Play ' + tileStr + ' \u2014 get rid of high-pip tiles to reduce risk if stuck.';
        }

        return 'Play ' + tileStr + ' on the ' + end + ' \u2014 best available option.';
    }

    /**
     * Get a full hint for the current domino situation.
     * @param {Array} playerTiles - Player's current tiles
     * @param {Object} gameState - { leftEnd, rightEnd, playedTiles, passedValues, ... }
     * @returns {Object|null} { bestPlay, reason, alternatives }
     */
    DominoHints.prototype.getHint = function(playerTiles, gameState) {
        if (!this.enabled || this.level === 0) return null;

        var options = getPlayableOptions(playerTiles, gameState);
        if (options.length === 0) {
            return {
                bestPlay: null,
                reason: 'No playable tiles \u2014 you must pass.',
                alternatives: []
            };
        }

        // Score and rank all options
        var scored = [];
        for (var i = 0; i < options.length; i++) {
            var opt = options[i];
            var s = scorePlay(opt.tile, opt.end, playerTiles, gameState);
            scored.push({ tile: opt.tile, end: opt.end, score: s });
        }
        scored.sort(function(a, b) { return b.score - a.score; });

        var best = scored[0];
        var reason = this.level >= 2
            ? buildReason(best.tile, best.end, best.score, playerTiles, gameState, true)
            : 'Recommended: play this tile on the ' + best.end + '.';

        var alternatives = [];
        for (var j = 1; j < scored.length; j++) {
            alternatives.push({
                tile: scored[j].tile,
                end: scored[j].end,
                score: scored[j].score
            });
        }

        return {
            bestPlay: { tile: best.tile, end: best.end },
            reason: reason,
            alternatives: alternatives
        };
    };

    /**
     * Get tile counting hints for advanced play.
     * @param {Object} gameState - { playedTiles, ... }
     * @returns {Object|null} { messages: string[] }
     */
    DominoHints.prototype.getTileCountHint = function(gameState) {
        if (!this.enabled || this.level < 2) return null;

        var played = gameState.playedTiles || [];
        var pipCounts = {};
        for (var v = 0; v <= MAX_PIP; v++) {
            pipCounts[v] = 0;
        }

        // Count how many tiles featuring each pip value have been played
        for (var i = 0; i < played.length; i++) {
            var a = played[i].a !== undefined ? played[i].a : 0;
            var b = played[i].b !== undefined ? played[i].b : 0;
            pipCounts[a]++;
            if (a !== b) pipCounts[b]++;
        }

        // Each pip value appears on (MAX_PIP + 1) tiles in a double-six set
        var messages = [];
        for (var p = 0; p <= MAX_PIP; p++) {
            var totalWithPip = MAX_PIP + 1; // 7 tiles contain each pip value
            var remaining = totalWithPip - pipCounts[p];
            if (remaining === 0) {
                messages.push('All ' + p + '-tiles have been played. Nobody can play a ' + p + '.');
            } else if (remaining === 1) {
                messages.push('Only one ' + p + ' remains unplayed. If you have it, you control that end.');
            }
        }

        if (messages.length === 0) {
            messages.push(played.length + ' of ' + TOTAL_TILES + ' tiles played. ' +
                         (TOTAL_TILES - played.length) + ' remaining.');
        }

        return { messages: messages };
    };

    /**
     * Render a hint badge DOM element near the player's hand.
     * @param {Object} bestPlay - { tile, end }
     * @returns {HTMLElement|null}
     */
    DominoHints.prototype.renderHintBadge = function(bestPlay) {
        if (!this.enabled || this.level === 0) return null;
        if (typeof document === 'undefined') return null;

        if (!bestPlay || !bestPlay.tile) {
            var passBadge = document.createElement('div');
            passBadge.className = 'domino-hint-badge domino-hint-pass';
            passBadge.style.cssText = [
                'display:inline-block', 'padding:4px 12px', 'border-radius:12px',
                'font-weight:bold', 'font-size:13px', 'color:#fff',
                'background:#e74c3c', 'text-align:center', 'pointer-events:none',
                'box-shadow:0 2px 6px rgba(0,0,0,0.3)'
            ].join(';');
            passBadge.textContent = 'Must Pass';
            return passBadge;
        }

        var t = bestPlay.tile;
        var a = t.a !== undefined ? t.a : 0;
        var b = t.b !== undefined ? t.b : 0;
        var label = 'Best: [' + a + '|' + b + '] \u2192 ' +
                    bestPlay.end.charAt(0).toUpperCase() + bestPlay.end.slice(1);

        var badge = document.createElement('div');
        badge.className = 'domino-hint-badge';
        badge.style.cssText = [
            'display:inline-block', 'padding:4px 12px', 'border-radius:12px',
            'font-weight:bold', 'font-size:13px', 'color:#fff',
            'background:#27ae60', 'text-align:center', 'pointer-events:none',
            'letter-spacing:0.5px', 'box-shadow:0 2px 6px rgba(0,0,0,0.3)'
        ].join(';');
        badge.textContent = label;
        return badge;
    };

    /**
     * Evaluate the player's play after they act.
     * @param {Object} playerPlay - { tile, end } what the player did
     * @param {Object} bestPlay - { tile, end } what was optimal
     * @returns {Object} { correct, message }
     */
    DominoHints.prototype.evaluatePlay = function(playerPlay, bestPlay) {
        if (!this.enabled) return { correct: true, message: '' };

        if (!bestPlay || !bestPlay.tile) {
            return { correct: true, message: 'No choice available.' };
        }

        var pTile = playerPlay && playerPlay.tile;
        var bTile = bestPlay.tile;
        if (!pTile) {
            return { correct: false, message: 'You passed, but you had a playable tile.' };
        }

        var pA = pTile.a !== undefined ? pTile.a : 0;
        var pB = pTile.b !== undefined ? pTile.b : 0;
        var bA = bTile.a !== undefined ? bTile.a : 0;
        var bB = bTile.b !== undefined ? bTile.b : 0;

        var sameTile = (pA === bA && pB === bB) || (pA === bB && pB === bA);
        var sameEnd = playerPlay.end === bestPlay.end;

        if (sameTile && sameEnd) {
            return { correct: true, message: 'Good play! That was optimal.' };
        }
        if (sameTile) {
            return {
                correct: false,
                message: 'Right tile, but playing on the ' + bestPlay.end + ' was better.'
            };
        }
        return {
            correct: false,
            message: 'Better option: [' + bA + '|' + bB + '] on the ' + bestPlay.end +
                     ' would have been stronger.'
        };
    };

    // -----------------------------------------------------------------------
    // Export
    // -----------------------------------------------------------------------
    root.MJ.Dominoes.Hints = new DominoHints();
    root.MJ.Dominoes.Hints.DominoHints = DominoHints;

    console.log('[Dominoes] Hints module loaded');
})(typeof window !== 'undefined' ? window : global);
