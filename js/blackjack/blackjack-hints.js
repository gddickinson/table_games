/**
 * blackjack-hints.js - Hint overlay for Blackjack showing optimal play
 * Uses basic strategy tables from blackjack-ai.js to recommend actions.
 * Provides natural language explanations and post-hand evaluation.
 * Exports under root.MJ.Blackjack.Hints
 */
(function(exports) {
    'use strict';
    var root = typeof window !== 'undefined' ? window : exports;
    root.MJ = root.MJ || {};
    root.MJ.Blackjack = root.MJ.Blackjack || {};

    var BJAI = function() { return root.MJ.Blackjack.AI; };
    var BJCards = function() { return root.MJ.Blackjack.Cards; };

    // -----------------------------------------------------------------------
    // Action code to human-readable mapping
    // -----------------------------------------------------------------------
    var ACTION_LABELS = {
        'H': 'hit', 'S': 'stand', 'D': 'double', 'P': 'split', 'Dh': 'double'
    };

    var ACTION_DISPLAY = {
        'hit':    { symbol: '\u2192', prefix: 'HIT',    color: '#e6a817' },
        'stand':  { symbol: '\u2713', prefix: 'STAND',  color: '#27ae60' },
        'double': { symbol: '\u2605', prefix: 'DOUBLE', color: '#2980b9' },
        'split':  { symbol: '\u2194', prefix: 'SPLIT',  color: '#8e44ad' }
    };

    // -----------------------------------------------------------------------
    // Approximate EV tables (expected value per unit bet)
    // These are simplified approximations for hint display purposes.
    // Indexed by [playerTotal][dealerUpcardRank]
    // -----------------------------------------------------------------------
    var HARD_EV_HIT = {
        5: -0.12, 6: -0.15, 7: -0.11, 8: -0.02, 9: 0.08, 10: 0.18,
        11: 0.24, 12: -0.25, 13: -0.31, 14: -0.36, 15: -0.42,
        16: -0.47, 17: -0.53, 18: -0.63, 19: -0.75, 20: -0.87
    };

    var HARD_EV_STAND = {
        12: -0.29, 13: -0.25, 14: -0.21, 15: -0.17, 16: -0.15,
        17: -0.11, 18: 0.12, 19: 0.38, 20: 0.64, 21: 0.87
    };

    // Bust probabilities by dealer upcard
    var DEALER_BUST_PROB = {
        '2': 0.354, '3': 0.374, '4': 0.394, '5': 0.417, '6': 0.423,
        '7': 0.262, '8': 0.244, '9': 0.230, '10': 0.214, 'A': 0.116
    };

    // -----------------------------------------------------------------------
    // BlackjackHints class
    // -----------------------------------------------------------------------
    function BlackjackHints() {
        this.enabled = true;
        this.level = 2; // 0=off, 1=basic, 2=full
    }

    /**
     * Set hint level: 0=off, 1=basic (just recommendation), 2=full (EV + explanation)
     */
    BlackjackHints.prototype.setLevel = function(level) {
        this.level = Math.max(0, Math.min(2, level));
        this.enabled = this.level > 0;
    };

    /**
     * Determine if hand is soft (has a usable ace counted as 11).
     */
    function isSoftHand(hand) {
        var total = 0;
        var aces = 0;
        var cards = hand.cards || hand;
        var BJ = BJCards();
        for (var i = 0; i < cards.length; i++) {
            var v = BJ.BJ_VALUES ? BJ.BJ_VALUES[cards[i].rank] : cardValue(cards[i].rank);
            if (cards[i].rank === 'A') { aces++; v = 11; }
            total += v;
        }
        while (total > 21 && aces > 0) { total -= 10; aces--; }
        return aces > 0 && total <= 21;
    }

    /**
     * Get numeric value for a card rank.
     */
    function cardValue(rank) {
        if (rank === 'A') return 11;
        if (rank === 'K' || rank === 'Q' || rank === 'J') return 10;
        return parseInt(rank, 10) || 0;
    }

    /**
     * Calculate hand total.
     */
    function handTotal(hand) {
        var total = 0;
        var aces = 0;
        var cards = hand.cards || hand;
        for (var i = 0; i < cards.length; i++) {
            var v = cardValue(cards[i].rank);
            if (cards[i].rank === 'A') aces++;
            total += v;
        }
        while (total > 21 && aces > 0) { total -= 10; aces--; }
        return total;
    }

    /**
     * Determine if hand is a pair (first two cards same rank).
     */
    function isPair(hand) {
        var cards = hand.cards || hand;
        return cards.length === 2 && cards[0].rank === cards[1].rank;
    }

    /**
     * Normalize dealer upcard rank (face cards -> '10').
     */
    function normUpcard(card) {
        if (!card) return '10';
        var r = card.rank;
        if (r === 'J' || r === 'Q' || r === 'K') return '10';
        return r;
    }

    /**
     * Look up the optimal action from the basic strategy tables.
     */
    function lookupOptimal(hand, dealerUpcard) {
        var AI = BJAI();
        var cards = hand.cards || hand;
        var total = handTotal(hand);
        var upKey = normUpcard(dealerUpcard);
        var action = null;

        // Check pair splitting first
        if (isPair(hand) && AI && AI.PAIR_STRATEGY) {
            var pairRank = cards[0].rank;
            if (pairRank === 'J' || pairRank === 'Q' || pairRank === 'K') pairRank = '10';
            var pairRow = AI.PAIR_STRATEGY[pairRank];
            if (pairRow && pairRow[upKey]) {
                action = pairRow[upKey];
                if (action === 'P') return 'split';
            }
        }

        // Check soft hand
        if (isSoftHand(hand) && AI && AI.SOFT_STRATEGY) {
            var softRow = AI.SOFT_STRATEGY[total];
            if (softRow && softRow[upKey]) {
                action = softRow[upKey];
            }
        }

        // Hard hand
        if (!action && AI && AI.HARD_STRATEGY) {
            var clamped = Math.max(5, Math.min(21, total));
            var hardRow = AI.HARD_STRATEGY[clamped];
            if (hardRow && hardRow[upKey]) {
                action = hardRow[upKey];
            }
        }

        if (!action) action = total >= 17 ? 'S' : 'H';
        return ACTION_LABELS[action] || 'hit';
    }

    /**
     * Estimate EV for a given action.
     */
    function estimateEV(action, total, dealerUpcard, isSoft, canDouble) {
        var upKey = normUpcard(dealerUpcard);
        var bustProb = DEALER_BUST_PROB[upKey] || 0.25;

        if (action === 'stand') {
            if (total >= 17) return (total - 17) * 0.12 + bustProb * 0.8 - 0.2;
            return bustProb * 0.7 - (1 - bustProb) * 0.5;
        }
        if (action === 'hit') {
            if (total <= 11) return 0.15 + (11 - total) * 0.02;
            var bustRisk = Math.max(0, (total - 11)) / 10;
            return -bustRisk * 0.6 + (1 - bustRisk) * 0.1;
        }
        if (action === 'double') {
            var hitEV = estimateEV('hit', total, dealerUpcard, isSoft, false);
            return canDouble ? hitEV * 1.8 : hitEV;
        }
        if (action === 'split') {
            return 0.05 + bustProb * 0.3;
        }
        return 0;
    }

    /**
     * Build a natural language reason for the recommendation.
     */
    function buildReason(recommendation, total, dealerUpcard, isSoft, isPairHand, ev) {
        var upKey = normUpcard(dealerUpcard);
        var dealerVal = upKey === 'A' ? 'Ace' : upKey;
        var evStr = ev >= 0 ? '+' + ev.toFixed(2) : ev.toFixed(2);

        if (recommendation === 'stand') {
            if (total >= 18) {
                return 'Stand \u2014 your ' + total + ' beats the dealer\'s likely total. Hitting risks busting.';
            }
            if (parseInt(upKey, 10) >= 2 && parseInt(upKey, 10) <= 6) {
                return 'Stand \u2014 dealer shows ' + dealerVal + ' and is likely to bust (' +
                       Math.round((DEALER_BUST_PROB[upKey] || 0.35) * 100) + '%). Let them take the risk.';
            }
            return 'Stand \u2014 ' + total + ' is risky to hit. Holding is the lesser evil at ' + evStr + ' EV.';
        }

        if (recommendation === 'hit') {
            if (total <= 11) {
                return 'Hit \u2014 you can\'t bust with ' + total + '. Any card improves your hand.';
            }
            var standEV = estimateEV('stand', total, dealerUpcard, isSoft, false);
            return 'Hit \u2014 ' + total + ' vs dealer ' + dealerVal +
                   ' is tough either way, but hitting is ' + evStr +
                   ' EV vs standing ' + standEV.toFixed(2) + ' EV.';
        }

        if (recommendation === 'double') {
            return 'Double! \u2014 ' + total + ' vs dealer ' + dealerVal +
                   ' is a great double opportunity. ' + evStr + ' EV.';
        }

        if (recommendation === 'split') {
            var singleCard = total / 2;
            if (singleCard === 8) {
                return 'Split 8s \u2014 16 is the worst total. Two hands starting at 8 are much better.';
            }
            if (singleCard === 11) {
                return 'Split Aces \u2014 always split Aces. Two chances at 21 beats a soft 12.';
            }
            return 'Split \u2014 two hands of ' + singleCard + ' give better odds than playing ' + total + '.';
        }

        return recommendation + ' is the optimal play here.';
    }

    /**
     * Get a full hint for the current hand situation.
     * @param {Object|Array} hand - Player hand (cards array or object with .cards)
     * @param {Object} dealerUpcard - Dealer's visible card
     * @returns {Object} { recommendation, reason, confidence, ev }
     */
    BlackjackHints.prototype.getHint = function(hand, dealerUpcard) {
        if (!this.enabled || this.level === 0) return null;

        var total = handTotal(hand);
        var soft = isSoftHand(hand);
        var pair = isPair(hand);
        var recommendation = lookupOptimal(hand, dealerUpcard);
        var canDouble = (hand.cards || hand).length === 2;
        var ev = estimateEV(recommendation, total, dealerUpcard, soft, canDouble);

        // Determine confidence
        var altAction = recommendation === 'hit' ? 'stand' : 'hit';
        var altEV = estimateEV(altAction, total, dealerUpcard, soft, canDouble);
        var evDiff = Math.abs(ev - altEV);
        var confidence = evDiff > 0.15 ? 'strong' : 'marginal';

        var reason = this.level >= 2
            ? buildReason(recommendation, total, dealerUpcard, soft, pair, ev)
            : recommendation.charAt(0).toUpperCase() + recommendation.slice(1) + ' is recommended.';

        return {
            recommendation: recommendation,
            reason: reason,
            confidence: confidence,
            ev: Math.round(ev * 100) / 100
        };
    };

    /**
     * Get a card-counting-based hint for bet sizing.
     * @param {number} runningCount - Current Hi-Lo running count
     * @returns {Object|null} { message, betAdvice }
     */
    BlackjackHints.prototype.getCountHint = function(runningCount) {
        if (!this.enabled || this.level < 2) return null;

        var count = runningCount || 0;
        if (count >= 4) {
            return {
                message: 'Count is +' + count + '. The deck favors the player. Increase your bet.',
                betAdvice: 'increase'
            };
        }
        if (count >= 2) {
            return {
                message: 'Count is +' + count + '. Slightly favorable. Consider a moderate bet.',
                betAdvice: 'moderate'
            };
        }
        if (count <= -3) {
            return {
                message: 'Count is ' + count + '. The deck favors the dealer. Bet minimum.',
                betAdvice: 'minimum'
            };
        }
        if (count <= -1) {
            return {
                message: 'Count is ' + count + '. Slightly unfavorable. Keep bets small.',
                betAdvice: 'small'
            };
        }
        return {
            message: 'Count is neutral (' + count + '). Bet normally.',
            betAdvice: 'normal'
        };
    };

    /**
     * Render a hint badge DOM element for display above the player's hand.
     * @param {string} recommendation - 'hit', 'stand', 'double', 'split'
     * @param {string} confidence - 'strong' or 'marginal'
     * @returns {HTMLElement|null}
     */
    BlackjackHints.prototype.renderHintBadge = function(recommendation, confidence) {
        if (!this.enabled || this.level === 0) return null;
        if (typeof document === 'undefined') return null;

        var display = ACTION_DISPLAY[recommendation] || ACTION_DISPLAY['hit'];
        var badge = document.createElement('div');
        badge.className = 'bj-hint-badge bj-hint-' + recommendation;
        badge.setAttribute('data-confidence', confidence);

        badge.style.cssText = [
            'display:inline-block',
            'padding:4px 12px',
            'border-radius:12px',
            'font-weight:bold',
            'font-size:14px',
            'color:#fff',
            'background:' + display.color,
            'opacity:' + (confidence === 'strong' ? '1' : '0.75'),
            'text-align:center',
            'pointer-events:none',
            'text-transform:uppercase',
            'letter-spacing:1px',
            'box-shadow:0 2px 6px rgba(0,0,0,0.3)'
        ].join(';');

        badge.textContent = display.symbol + ' ' + display.prefix;

        if (confidence === 'marginal') {
            badge.style.border = '1px dashed rgba(255,255,255,0.5)';
        }

        return badge;
    };

    /**
     * Evaluate a player's decision after they act.
     * @param {string} playerAction - What the player did ('hit', 'stand', 'double', 'split')
     * @param {string} optimalAction - What they should have done
     * @param {Object|Array} hand - Player hand at decision time
     * @param {Object} dealerUpcard - Dealer's visible card
     * @returns {Object} { correct, message, evLoss }
     */
    BlackjackHints.prototype.evaluateDecision = function(playerAction, optimalAction, hand, dealerUpcard) {
        if (!this.enabled) {
            return { correct: true, message: '', evLoss: 0 };
        }

        var total = handTotal(hand);
        var soft = isSoftHand(hand);
        var canDouble = (hand.cards || hand).length === 2;

        var playerNorm = (playerAction || '').toLowerCase();
        var optimalNorm = (optimalAction || '').toLowerCase();

        if (playerNorm === optimalNorm) {
            var messages = [
                'Good call! ' + playerNorm.charAt(0).toUpperCase() + playerNorm.slice(1) +
                'ing on ' + total + ' was correct.',
                'Textbook play. Well done!',
                'Perfect \u2014 that\'s exactly what basic strategy says.'
            ];
            return {
                correct: true,
                message: messages[Math.floor(Math.random() * messages.length)],
                evLoss: 0
            };
        }

        var playerEV = estimateEV(playerNorm, total, dealerUpcard, soft, canDouble);
        var optimalEV = estimateEV(optimalNorm, total, dealerUpcard, soft, canDouble);
        var evLoss = Math.max(0, optimalEV - playerEV);
        var upKey = normUpcard(dealerUpcard);

        var msg = 'Mistake: you should have ' + optimalNorm + 'd';
        if (optimalNorm === 'stand') msg = 'Mistake: you should have stood';
        if (optimalNorm === 'hit') msg = 'Mistake: you should have hit';
        msg += ' ' + total + ' vs ' + (upKey === 'A' ? 'Ace' : upKey) + '.';

        if (evLoss > 0) {
            msg += ' That cost you ~' + evLoss.toFixed(2) + ' expected chips.';
        }

        return {
            correct: false,
            message: msg,
            evLoss: Math.round(evLoss * 100) / 100
        };
    };

    // -----------------------------------------------------------------------
    // Export
    // -----------------------------------------------------------------------
    root.MJ.Blackjack.Hints = new BlackjackHints();
    root.MJ.Blackjack.Hints.BlackjackHints = BlackjackHints;

    console.log('[Blackjack] Hints module loaded');
})(typeof window !== 'undefined' ? window : global);
