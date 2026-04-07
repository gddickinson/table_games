/**
 * poker-hints.js - Hint overlay for Poker showing hand strength and pot odds
 * Provides pre-flop and post-flop recommendations with natural language reasoning.
 * Exports under root.MJ.Poker.Hints
 */
(function(exports) {
    'use strict';
    var root = typeof window !== 'undefined' ? window : exports;
    root.MJ = root.MJ || {};
    root.MJ.Poker = root.MJ.Poker || {};

    var HandEval = function() { return root.MJ.Poker.HandEval; };
    var Cards = function() { return root.MJ.Poker.Cards; };
    var PokerAI = function() { return root.MJ.Poker.AI; };

    // -----------------------------------------------------------------------
    // Pre-flop hand tier rankings (mirrored from poker-ai.js for standalone use)
    // -----------------------------------------------------------------------
    var STARTING_HAND_TIERS = {
        'AA': 1, 'KK': 1, 'QQ': 1, 'JJ': 1,
        'TT': 2, '99': 2, '88': 3, '77': 3,
        '66': 4, '55': 4, '44': 4, '33': 4, '22': 4,
        'AKs': 1, 'AQs': 1, 'AJs': 2, 'ATs': 2,
        'KQs': 2, 'KJs': 2, 'KTs': 3,
        'QJs': 2, 'QTs': 3, 'JTs': 3,
        'AKo': 1, 'AQo': 2, 'AJo': 3, 'ATo': 3,
        'KQo': 3, 'KJo': 3, 'KTo': 4,
        'QJo': 3, 'QTo': 4, 'JTo': 4,
        'T9s': 3, '98s': 3, '87s': 4, '76s': 4, '65s': 4, '54s': 4,
        'A9s': 3, 'A8s': 3, 'A7s': 4, 'A6s': 4, 'A5s': 3,
        'A4s': 4, 'A3s': 4, 'A2s': 4
    };

    var RANK_ORDER = '23456789TJQKA';
    var RANK_NAMES = {
        '2': 'Two', '3': 'Three', '4': 'Four', '5': 'Five', '6': 'Six',
        '7': 'Seven', '8': 'Eight', '9': 'Nine', 'T': 'Ten',
        'J': 'Jack', 'Q': 'Queen', 'K': 'King', 'A': 'Ace'
    };

    // -----------------------------------------------------------------------
    // Decision grades
    // -----------------------------------------------------------------------
    var GRADES = {
        A: { label: 'A', description: 'Excellent' },
        B: { label: 'B', description: 'Good' },
        C: { label: 'C', description: 'Questionable' },
        D: { label: 'D', description: 'Mistake' }
    };

    // -----------------------------------------------------------------------
    // PokerHints class
    // -----------------------------------------------------------------------
    function PokerHints() {
        this.enabled = true;
        this.level = 2; // 0=off, 1=basic, 2=full
    }

    /**
     * Set hint level: 0=off, 1=basic, 2=full (pot odds, outs, EV)
     */
    PokerHints.prototype.setLevel = function(level) {
        this.level = Math.max(0, Math.min(2, level));
        this.enabled = this.level > 0;
    };

    // -----------------------------------------------------------------------
    // Utility helpers
    // -----------------------------------------------------------------------

    /**
     * Get canonical starting hand key from two hole cards.
     */
    function getStartingHandKey(cards) {
        if (!cards || cards.length < 2) return null;
        var r1 = cards[0].rank || cards[0].r;
        var r2 = cards[1].rank || cards[1].r;
        var s1 = cards[0].suit || cards[0].s;
        var s2 = cards[1].suit || cards[1].s;
        var i1 = RANK_ORDER.indexOf(r1);
        var i2 = RANK_ORDER.indexOf(r2);

        var high, low;
        if (i1 >= i2) { high = r1; low = r2; }
        else { high = r2; low = r1; }

        if (high === low) return high + low;
        return high + low + (s1 === s2 ? 's' : 'o');
    }

    /**
     * Count outs for common draws.
     */
    function countOuts(holeCards, communityCards) {
        if (!communityCards || communityCards.length === 0) return { outs: 0, draws: [] };

        var allCards = holeCards.concat(communityCards);
        var suits = {};
        var ranks = {};
        var draws = [];
        var outs = 0;

        for (var i = 0; i < allCards.length; i++) {
            var s = allCards[i].suit || allCards[i].s;
            var r = allCards[i].rank || allCards[i].r;
            suits[s] = (suits[s] || 0) + 1;
            ranks[r] = (ranks[r] || 0) + 1;
        }

        // Flush draw (4 to a flush = 9 outs)
        for (var suit in suits) {
            if (suits[suit] === 4) {
                outs += 9;
                draws.push('flush draw (9 outs)');
            }
        }

        // Open-ended straight draw (8 outs)
        var indices = [];
        for (var j = 0; j < allCards.length; j++) {
            var ri = RANK_ORDER.indexOf(allCards[j].rank || allCards[j].r);
            if (ri >= 0 && indices.indexOf(ri) === -1) indices.push(ri);
        }
        indices.sort(function(a, b) { return a - b; });

        var consecutive = 1;
        var maxConsec = 1;
        for (var k = 1; k < indices.length; k++) {
            if (indices[k] === indices[k - 1] + 1) {
                consecutive++;
                if (consecutive > maxConsec) maxConsec = consecutive;
            } else if (indices[k] !== indices[k - 1]) {
                consecutive = 1;
            }
        }

        if (maxConsec === 4) {
            // Check if open-ended (not gutshot)
            var minIdx = indices[0];
            var maxIdx = indices[indices.length - 1];
            if (minIdx > 0 && maxIdx < 12) {
                outs += 8;
                draws.push('open-ended straight draw (8 outs)');
            } else {
                outs += 4;
                draws.push('gutshot straight draw (4 outs)');
            }
        }

        // Overcards to board (3 outs each)
        if (communityCards.length >= 3) {
            var boardMax = 0;
            for (var m = 0; m < communityCards.length; m++) {
                var bri = RANK_ORDER.indexOf(communityCards[m].rank || communityCards[m].r);
                if (bri > boardMax) boardMax = bri;
            }
            for (var n = 0; n < holeCards.length; n++) {
                var hri = RANK_ORDER.indexOf(holeCards[n].rank || holeCards[n].r);
                if (hri > boardMax) {
                    outs += 3;
                    draws.push('overcard ' + (holeCards[n].rank || holeCards[n].r) + ' (3 outs)');
                }
            }
        }

        return { outs: outs, draws: draws };
    }

    /**
     * Calculate pot odds as a percentage.
     */
    function calcPotOdds(callAmount, potSize) {
        if (!callAmount || callAmount <= 0) return 0;
        return callAmount / (potSize + callAmount);
    }

    /**
     * Convert outs to probability of hitting by next card / by river.
     */
    function outsToProbability(outs, cardsTocome) {
        // Rule of 2 (one card) or rule of 4 (two cards)
        if (cardsTocome >= 2) {
            return Math.min(0.99, outs * 4 / 100);
        }
        return Math.min(0.99, outs * 2 / 100);
    }

    /**
     * Estimate hand strength as a 0-1 value.
     */
    function estimateHandStrength(holeCards, communityCards) {
        var HE = HandEval();
        if (HE && HE.evaluate && communityCards && communityCards.length >= 3) {
            var result = HE.evaluate(holeCards.concat(communityCards));
            if (result && typeof result.rank !== 'undefined') {
                // Normalize: rank 0 (high card) -> ~0.1, rank 9 (royal flush) -> 1.0
                return 0.1 + (result.rank / 9) * 0.9;
            }
        }

        // Pre-flop or fallback: use starting hand tiers
        var key = getStartingHandKey(holeCards);
        var tier = STARTING_HAND_TIERS[key];
        if (tier === 1) return 0.85;
        if (tier === 2) return 0.70;
        if (tier === 3) return 0.55;
        if (tier === 4) return 0.40;
        return 0.20;
    }

    /**
     * Get human-readable hand name.
     */
    function getHandName(holeCards, communityCards) {
        var HE = HandEval();
        if (HE && HE.evaluate && communityCards && communityCards.length >= 3) {
            var result = HE.evaluate(holeCards.concat(communityCards));
            if (result && result.name) return result.name;
        }

        var key = getStartingHandKey(holeCards);
        if (!key) return 'Unknown';

        if (key.length === 2 && key[0] === key[1]) {
            return 'Pocket ' + RANK_NAMES[key[0]] + 's';
        }
        var suited = key.length === 3 && key[2] === 's';
        return RANK_NAMES[key[0]] + '-' + RANK_NAMES[key[1]] + (suited ? ' suited' : ' offsuit');
    }

    /**
     * Build pre-flop recommendation.
     */
    function preFlopHint(holeCards, gameState) {
        var key = getStartingHandKey(holeCards);
        var tier = STARTING_HAND_TIERS[key] || 5;
        var handName = getHandName(holeCards, []);
        var strength = estimateHandStrength(holeCards, []);
        var facingBet = gameState.toCall && gameState.toCall > gameState.bigBlind;

        var recommendation, reason, confidence;

        if (tier === 1) {
            recommendation = facingBet ? 'raise' : 'raise';
            reason = 'Raise \u2014 ' + handName + ' is a premium hand. Open to 3x from any position.';
            confidence = 'strong';
        } else if (tier === 2) {
            recommendation = facingBet ? 'call' : 'raise';
            reason = facingBet
                ? 'Call \u2014 ' + handName + ' is strong enough to see a flop.'
                : 'Raise \u2014 ' + handName + ' plays well as an open-raise.';
            confidence = 'strong';
        } else if (tier === 3) {
            recommendation = facingBet ? 'call' : 'raise';
            reason = facingBet
                ? 'Call \u2014 ' + handName + ' is playable in position. Careful if re-raised.'
                : 'Raise \u2014 ' + handName + ' is a decent open from late position.';
            confidence = 'marginal';
        } else if (tier === 4) {
            recommendation = facingBet ? 'fold' : 'call';
            reason = facingBet
                ? 'Fold \u2014 ' + handName + ' is too speculative to call a raise.'
                : 'Call or fold \u2014 ' + handName + ' is speculative. Only play in late position.';
            confidence = 'marginal';
        } else {
            recommendation = 'fold';
            reason = 'Fold \u2014 ' + handName + ' is not worth playing. Wait for a better hand.';
            if (key === '72o' || key === '72') {
                reason = 'Fold \u2014 7-2 offsuit is the worst hand in poker.';
            }
            confidence = 'strong';
        }

        return {
            recommendation: recommendation,
            handStrength: strength,
            handName: handName,
            potOdds: 0,
            drawOuts: 0,
            reason: reason,
            confidence: confidence
        };
    }

    /**
     * Build post-flop recommendation.
     */
    function postFlopHint(holeCards, communityCards, gameState) {
        var strength = estimateHandStrength(holeCards, communityCards);
        var handName = getHandName(holeCards, communityCards);
        var outsInfo = countOuts(holeCards, communityCards);
        var cardsTocome = communityCards.length === 3 ? 2 : communityCards.length === 4 ? 1 : 0;
        var drawProb = outsToProbability(outsInfo.outs, cardsTocome);

        var potSize = gameState.pot || 0;
        var toCall = gameState.toCall || 0;
        var potOdds = calcPotOdds(toCall, potSize);

        var recommendation, reason, confidence;

        // Strong made hand
        if (strength >= 0.7) {
            if (toCall > 0) {
                recommendation = 'raise';
                reason = 'Raise for value \u2014 ' + handName + ' on this board is strong. Bet 60-75% pot.';
                confidence = 'strong';
            } else {
                recommendation = 'raise';
                reason = 'Bet for value \u2014 ' + handName + ' is likely the best hand. Build the pot.';
                confidence = 'strong';
            }
        }
        // Medium hand or draw
        else if (strength >= 0.4 || outsInfo.outs >= 8) {
            if (outsInfo.outs >= 8 && toCall > 0) {
                var hasOdds = drawProb >= potOdds;
                if (hasOdds) {
                    recommendation = 'call';
                    reason = 'Call \u2014 you have a ' + outsInfo.draws[0] +
                             ' (~' + Math.round(drawProb * 100) + '% to hit). Pot odds: ' +
                             Math.round(potOdds * 100) + '%. Good call.';
                    confidence = 'strong';
                } else {
                    recommendation = 'fold';
                    reason = 'Fold \u2014 you have a ' + outsInfo.draws[0] +
                             ' (~' + Math.round(drawProb * 100) + '%) but pot odds (' +
                             Math.round(potOdds * 100) + '%) are insufficient.';
                    confidence = 'marginal';
                }
            } else if (toCall === 0) {
                recommendation = 'check';
                reason = 'Check \u2014 ' + handName + ' has some showdown value but is vulnerable. Keep the pot small.';
                confidence = 'marginal';
            } else if (toCall <= potSize * 0.3) {
                recommendation = 'call';
                reason = 'Call \u2014 ' + handName + ' may still be good. Small bet to call.';
                confidence = 'marginal';
            } else {
                recommendation = 'fold';
                reason = 'Fold \u2014 ' + handName + ' is likely behind facing a large bet with no strong draw.';
                confidence = 'marginal';
            }
        }
        // Weak hand
        else {
            if (toCall === 0) {
                recommendation = 'check';
                reason = 'Check \u2014 ' + handName + ' is weak. See free cards if possible.';
                confidence = 'strong';
            } else {
                recommendation = 'fold';
                reason = 'Fold \u2014 ' + handName + ' is likely behind. Facing a bet with no draw.';
                confidence = 'strong';
            }
        }

        return {
            recommendation: recommendation,
            handStrength: Math.round(strength * 100) / 100,
            handName: handName,
            potOdds: Math.round(potOdds * 100) / 100,
            drawOuts: outsInfo.outs,
            reason: reason,
            confidence: confidence
        };
    }

    /**
     * Get a full hint for the current poker situation.
     * @param {Object} player - { holeCards: [{rank,suit},...], ... }
     * @param {Object} gameState - { communityCards, pot, toCall, bigBlind, ... }
     * @returns {Object|null}
     */
    PokerHints.prototype.getHint = function(player, gameState) {
        if (!this.enabled || this.level === 0) return null;

        var holeCards = player.holeCards || player.cards || [];
        if (holeCards.length < 2) return null;

        var community = gameState.communityCards || gameState.board || [];

        var hint;
        if (community.length === 0) {
            hint = preFlopHint(holeCards, gameState);
        } else {
            hint = postFlopHint(holeCards, community, gameState);
        }

        // At basic level, simplify the reason
        if (this.level === 1) {
            hint.reason = hint.recommendation.charAt(0).toUpperCase() +
                          hint.recommendation.slice(1) + ' is recommended.';
        }

        return hint;
    };

    /**
     * Render a visual hand strength meter.
     * @param {number} handStrength - 0 to 1
     * @returns {HTMLElement|null}
     */
    PokerHints.prototype.renderStrengthMeter = function(handStrength) {
        if (!this.enabled || this.level === 0) return null;
        if (typeof document === 'undefined') return null;

        var pct = Math.round(handStrength * 100);
        var color;
        if (handStrength < 0.3) color = '#e74c3c';       // red
        else if (handStrength < 0.6) color = '#e6a817';   // yellow
        else color = '#27ae60';                            // green

        var container = document.createElement('div');
        container.className = 'poker-strength-meter';
        container.style.cssText = [
            'display:inline-flex', 'align-items:center', 'gap:6px',
            'padding:4px 10px', 'border-radius:8px',
            'background:rgba(0,0,0,0.6)', 'color:#fff',
            'font-size:12px', 'font-weight:bold', 'pointer-events:none'
        ].join(';');

        var barOuter = document.createElement('div');
        barOuter.style.cssText = [
            'width:60px', 'height:8px', 'border-radius:4px',
            'background:rgba(255,255,255,0.2)', 'overflow:hidden'
        ].join(';');

        var barInner = document.createElement('div');
        barInner.style.cssText = [
            'width:' + pct + '%', 'height:100%', 'border-radius:4px',
            'background:' + color, 'transition:width 0.3s ease'
        ].join(';');

        barOuter.appendChild(barInner);

        var label = document.createElement('span');
        label.textContent = 'Hand: ' + pct + '%';
        label.style.color = color;

        container.appendChild(barOuter);
        container.appendChild(label);

        return container;
    };

    /**
     * Render pot odds display showing the math behind the decision.
     * @param {number} callAmount
     * @param {number} potSize
     * @param {number} outs
     * @returns {HTMLElement|null}
     */
    PokerHints.prototype.renderPotOddsDisplay = function(callAmount, potSize, outs) {
        if (!this.enabled || this.level < 2) return null;
        if (typeof document === 'undefined') return null;

        var potOdds = calcPotOdds(callAmount, potSize);
        var potOddsPct = Math.round(potOdds * 100);
        var potRatio = callAmount > 0 ? Math.round(potSize / callAmount) : 0;

        // Assume turn + river for draw odds if outs > 0
        var drawOddsOne = Math.round(outs * 2);
        var drawOddsTwo = Math.min(99, Math.round(outs * 4));

        var decision;
        var decisionColor;
        if (outs === 0) {
            decision = callAmount > 0 ? 'FOLD (no draw)' : 'CHECK';
            decisionColor = callAmount > 0 ? '#e74c3c' : '#e6a817';
        } else if (drawOddsTwo >= potOddsPct) {
            decision = 'CALL';
            decisionColor = '#27ae60';
        } else {
            decision = 'FOLD';
            decisionColor = '#e74c3c';
        }

        var display = document.createElement('div');
        display.className = 'poker-pot-odds-display';
        display.style.cssText = [
            'display:inline-block', 'padding:6px 12px', 'border-radius:8px',
            'background:rgba(0,0,0,0.7)', 'color:#fff',
            'font-size:11px', 'font-family:monospace', 'pointer-events:none',
            'line-height:1.6', 'box-shadow:0 2px 8px rgba(0,0,0,0.4)'
        ].join(';');

        var line1 = 'Pot odds: ' + potRatio + ':1 (' + potOddsPct + '%)';
        var line2 = outs > 0
            ? 'Draw odds: ' + outs + ' outs (' + drawOddsOne + '%/' + drawOddsTwo + '%)'
            : 'Draw odds: no draw detected';
        var line3 = 'Decision: ' + decision;

        display.innerHTML = line1 + '<br>' + line2 +
                            '<br><span style="color:' + decisionColor +
                            ';font-weight:bold">' + line3 + '</span>';

        return display;
    };

    /**
     * Evaluate a player's decision and grade it A-D.
     * @param {string} playerAction - What the player did
     * @param {string} optimalAction - What was recommended
     * @param {number} handStrength - 0 to 1
     * @param {number} potOdds - Pot odds as decimal (0-1)
     * @returns {Object} { grade, message }
     */
    PokerHints.prototype.evaluateDecision = function(playerAction, optimalAction, handStrength, potOdds) {
        if (!this.enabled) return { grade: 'A', message: '' };

        var pNorm = (playerAction || '').toLowerCase();
        var oNorm = (optimalAction || '').toLowerCase();

        // Exact match
        if (pNorm === oNorm) {
            return { grade: 'A', message: 'A: Great play. Exactly what the math says.' };
        }

        // Close matches (call vs check, raise vs allin)
        var closeMatches = {
            'call': ['check'], 'check': ['call'],
            'raise': ['allin'], 'allin': ['raise']
        };
        if (closeMatches[pNorm] && closeMatches[pNorm].indexOf(oNorm) >= 0) {
            return { grade: 'B', message: 'B: Reasonable. ' + oNorm + ' was slightly better, but close.' };
        }

        // Folding when should have played
        if (pNorm === 'fold' && (oNorm === 'call' || oNorm === 'raise' || oNorm === 'check')) {
            if (handStrength >= 0.6) {
                return {
                    grade: 'D',
                    message: 'D: You folded a strong hand. ' + oNorm.charAt(0).toUpperCase() +
                             oNorm.slice(1) + ' was correct with ' + Math.round(handStrength * 100) +
                             '% hand strength.'
                };
            }
            return {
                grade: 'C',
                message: 'C: Overly cautious fold. The pot odds justified a ' + oNorm + '.'
            };
        }

        // Calling/raising when should have folded
        if ((pNorm === 'call' || pNorm === 'raise') && oNorm === 'fold') {
            if (handStrength < 0.25) {
                return {
                    grade: 'D',
                    message: 'D: Throwing chips away. Your hand was too weak to continue.'
                };
            }
            return {
                grade: 'C',
                message: 'C: You ' + pNorm + 'ed with insufficient pot odds. The math says fold.'
            };
        }

        // Calling when should have raised
        if (pNorm === 'call' && oNorm === 'raise') {
            return {
                grade: 'B',
                message: 'B: You had the goods \u2014 raising would have built a bigger pot.'
            };
        }

        // Raising when should have called
        if (pNorm === 'raise' && oNorm === 'call') {
            return {
                grade: 'B',
                message: 'B: The raise was aggressive but a call was safer here.'
            };
        }

        // Generic mismatch
        return {
            grade: 'C',
            message: 'C: ' + oNorm.charAt(0).toUpperCase() + oNorm.slice(1) +
                     ' was the better play in this spot.'
        };
    };

    // -----------------------------------------------------------------------
    // Export
    // -----------------------------------------------------------------------
    root.MJ.Poker.Hints = new PokerHints();
    root.MJ.Poker.Hints.PokerHints = PokerHints;

    console.log('[Poker] Hints module loaded');
})(typeof window !== 'undefined' ? window : global);
