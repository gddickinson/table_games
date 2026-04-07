/**
 * blackjack-ai.js - Blackjack AI using basic strategy with personality modifications
 * Includes simplified Hi-Lo card counting (Mei only).
 * Exports under root.MJ.Blackjack.AI
 */
(function(exports) {
    var root = typeof window !== 'undefined' ? window : exports;
    root.MJ = root.MJ || {};
    root.MJ.Blackjack = root.MJ.Blackjack || {};

    var BJCards = function() { return root.MJ.Blackjack.Cards; };

    // -----------------------------------------------------------------------
    // Basic Strategy Table
    // Keys: player hand description -> dealer upcard rank -> action
    // H=hit, S=stand, D=double(hit if not allowed), P=split, Dh=double(stand if not)
    // -----------------------------------------------------------------------

    // Hard totals (no usable ace, not a pair)
    var HARD_STRATEGY = {
        // Player total: { dealer upcard rank: action }
        5:  { '2':'H','3':'H','4':'H','5':'H','6':'H','7':'H','8':'H','9':'H','10':'H','A':'H' },
        6:  { '2':'H','3':'H','4':'H','5':'H','6':'H','7':'H','8':'H','9':'H','10':'H','A':'H' },
        7:  { '2':'H','3':'H','4':'H','5':'H','6':'H','7':'H','8':'H','9':'H','10':'H','A':'H' },
        8:  { '2':'H','3':'H','4':'H','5':'H','6':'H','7':'H','8':'H','9':'H','10':'H','A':'H' },
        9:  { '2':'H','3':'D','4':'D','5':'D','6':'D','7':'H','8':'H','9':'H','10':'H','A':'H' },
        10: { '2':'D','3':'D','4':'D','5':'D','6':'D','7':'D','8':'D','9':'D','10':'H','A':'H' },
        11: { '2':'D','3':'D','4':'D','5':'D','6':'D','7':'D','8':'D','9':'D','10':'D','A':'D' },
        12: { '2':'H','3':'H','4':'S','5':'S','6':'S','7':'H','8':'H','9':'H','10':'H','A':'H' },
        13: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'H','8':'H','9':'H','10':'H','A':'H' },
        14: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'H','8':'H','9':'H','10':'H','A':'H' },
        15: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'H','8':'H','9':'H','10':'H','A':'H' },
        16: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'H','8':'H','9':'H','10':'H','A':'H' },
        17: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'S','8':'S','9':'S','10':'S','A':'S' },
        18: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'S','8':'S','9':'S','10':'S','A':'S' },
        19: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'S','8':'S','9':'S','10':'S','A':'S' },
        20: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'S','8':'S','9':'S','10':'S','A':'S' },
        21: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'S','8':'S','9':'S','10':'S','A':'S' }
    };

    // Soft totals (has usable ace counted as 11)
    var SOFT_STRATEGY = {
        13: { '2':'H','3':'H','4':'H','5':'D','6':'D','7':'H','8':'H','9':'H','10':'H','A':'H' },
        14: { '2':'H','3':'H','4':'H','5':'D','6':'D','7':'H','8':'H','9':'H','10':'H','A':'H' },
        15: { '2':'H','3':'H','4':'D','5':'D','6':'D','7':'H','8':'H','9':'H','10':'H','A':'H' },
        16: { '2':'H','3':'H','4':'D','5':'D','6':'D','7':'H','8':'H','9':'H','10':'H','A':'H' },
        17: { '2':'H','3':'D','4':'D','5':'D','6':'D','7':'H','8':'H','9':'H','10':'H','A':'H' },
        18: { '2':'Dh','3':'Dh','4':'Dh','5':'Dh','6':'Dh','7':'S','8':'S','9':'H','10':'H','A':'H' },
        19: { '2':'S','3':'S','4':'S','5':'S','6':'Dh','7':'S','8':'S','9':'S','10':'S','A':'S' },
        20: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'S','8':'S','9':'S','10':'S','A':'S' },
        21: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'S','8':'S','9':'S','10':'S','A':'S' }
    };

    // Pair splitting strategy
    var PAIR_STRATEGY = {
        '2': { '2':'P','3':'P','4':'P','5':'P','6':'P','7':'P','8':'H','9':'H','10':'H','A':'H' },
        '3': { '2':'P','3':'P','4':'P','5':'P','6':'P','7':'P','8':'H','9':'H','10':'H','A':'H' },
        '4': { '2':'H','3':'H','4':'H','5':'P','6':'P','7':'H','8':'H','9':'H','10':'H','A':'H' },
        '5': { '2':'D','3':'D','4':'D','5':'D','6':'D','7':'D','8':'D','9':'D','10':'H','A':'H' },
        '6': { '2':'P','3':'P','4':'P','5':'P','6':'P','7':'H','8':'H','9':'H','10':'H','A':'H' },
        '7': { '2':'P','3':'P','4':'P','5':'P','6':'P','7':'P','8':'H','9':'H','10':'H','A':'H' },
        '8': { '2':'P','3':'P','4':'P','5':'P','6':'P','7':'P','8':'P','9':'P','10':'P','A':'P' },
        '9': { '2':'P','3':'P','4':'P','5':'P','6':'P','7':'S','8':'P','9':'P','10':'S','A':'S' },
        '10':{ '2':'S','3':'S','4':'S','5':'S','6':'S','7':'S','8':'S','9':'S','10':'S','A':'S' },
        'J': { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'S','8':'S','9':'S','10':'S','A':'S' },
        'Q': { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'S','8':'S','9':'S','10':'S','A':'S' },
        'K': { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'S','8':'S','9':'S','10':'S','A':'S' },
        'A': { '2':'P','3':'P','4':'P','5':'P','6':'P','7':'P','8':'P','9':'P','10':'P','A':'P' }
    };

    // -----------------------------------------------------------------------
    // Card counting (simplified Hi-Lo)
    // -----------------------------------------------------------------------
    var _runningCount = 0;

    /**
     * Update running count with a visible card.
     * 2-6 = +1, 7-9 = 0, 10/J/Q/K/A = -1
     */
    function updateCount(card) {
        var v = BJCards().BJ_VALUES[card.rank] || 0;
        if (v >= 2 && v <= 6) {
            _runningCount++;
        } else if (v >= 10 || card.rank === 'A') {
            _runningCount--;
        }
    }

    /**
     * Reset the running count (call at shoe reshuffle).
     */
    function resetCount() {
        _runningCount = 0;
    }

    /**
     * Get the current running count.
     */
    function getRunningCount() {
        return _runningCount;
    }

    // -----------------------------------------------------------------------
    // Dealer upcard normalization
    // -----------------------------------------------------------------------
    function normalizeUpcard(card) {
        if (!card) return '10';
        var rank = card.rank;
        if (rank === 'J' || rank === 'Q' || rank === 'K') return '10';
        return rank;
    }

    // -----------------------------------------------------------------------
    // Basic strategy lookup
    // -----------------------------------------------------------------------
    function lookupBasicStrategy(hand, dealerUpcard) {
        var cards = BJCards();
        var handVal = cards.calculateHandValue(hand.cards);
        var upRank = normalizeUpcard(dealerUpcard);
        var total = handVal.value;

        // Check for pairs first
        if (hand.cards.length === 2 && hand.cards[0].rank === hand.cards[1].rank) {
            var pairRank = hand.cards[0].rank;
            if (PAIR_STRATEGY[pairRank] && PAIR_STRATEGY[pairRank][upRank]) {
                return PAIR_STRATEGY[pairRank][upRank];
            }
        }

        // Soft hands
        if (handVal.soft && total >= 13 && total <= 21) {
            if (SOFT_STRATEGY[total] && SOFT_STRATEGY[total][upRank]) {
                return SOFT_STRATEGY[total][upRank];
            }
        }

        // Hard hands
        var lookupTotal = Math.min(Math.max(total, 5), 21);
        if (HARD_STRATEGY[lookupTotal] && HARD_STRATEGY[lookupTotal][upRank]) {
            return HARD_STRATEGY[lookupTotal][upRank];
        }

        // Default: stand on 17+, hit otherwise
        return total >= 17 ? 'S' : 'H';
    }

    // -----------------------------------------------------------------------
    // Personality profiles
    // -----------------------------------------------------------------------
    var PERSONALITY = {
        mei: {
            // Perfect basic strategy player. Uses card counting for bets.
            deviationChance: 0.0,
            doubleReluctance: 0.0,
            splitReluctance: 0.0,
            useCounting: true,
            name: 'Mei'
        },
        kenji: {
            // Deviates from basic strategy, doubles aggressively
            deviationChance: 0.15,
            doubleReluctance: -0.2,   // negative = more eager to double
            splitReluctance: 0.0,
            useCounting: false,
            name: 'Kenji'
        },
        yuki: {
            // Conservative, rarely splits or doubles
            deviationChance: 0.05,
            doubleReluctance: 0.4,
            splitReluctance: 0.5,
            useCounting: false,
            name: 'Yuki'
        }
    };

    // -----------------------------------------------------------------------
    // Main decision function
    // -----------------------------------------------------------------------

    /**
     * Decide what action to take.
     * @param {Object} hand - hand object {cards, bet, stood, doubled, ...}
     * @param {Card} dealerUpcard - dealer's face-up card
     * @param {string} personalityKey - 'mei', 'kenji', 'yuki'
     * @returns {string} 'hit'|'stand'|'double'|'split'
     */
    function decideAction(hand, dealerUpcard, personalityKey) {
        var profile = PERSONALITY[personalityKey] || PERSONALITY.mei;
        var action = lookupBasicStrategy(hand, dealerUpcard);

        // Apply personality deviations
        if (profile.deviationChance > 0 && Math.random() < profile.deviationChance) {
            // Kenji-style deviation: hit when should stand (on borderline hands)
            var cards = BJCards();
            var val = cards.calculateHandValue(hand.cards).value;
            if (action === 'S' && val >= 12 && val <= 16) {
                action = 'H'; // Kenji goes for it
            } else if (action === 'H' && val >= 12 && val <= 14) {
                action = 'S'; // Sometimes gets cautious randomly
            }
        }

        // Map strategy codes to engine actions
        switch (action) {
            case 'H':
                return 'hit';

            case 'S':
                return 'stand';

            case 'D':
                // Double if allowed (first two cards), else hit
                if (hand.cards.length === 2 && !hand.doubled) {
                    if (Math.random() < profile.doubleReluctance) {
                        return 'hit'; // Yuki sometimes skips doubling
                    }
                    return 'double';
                }
                return 'hit';

            case 'Dh':
                // Double if allowed, else stand (soft 18 scenarios)
                if (hand.cards.length === 2 && !hand.doubled) {
                    if (Math.random() < profile.doubleReluctance) {
                        return 'stand';
                    }
                    return 'double';
                }
                return 'stand';

            case 'P':
                // Split
                if (hand.cards.length === 2 && hand.cards[0].rank === hand.cards[1].rank) {
                    if (Math.random() < profile.splitReluctance) {
                        // Fall back to hard total strategy instead of splitting
                        var cards = BJCards();
                        var val = cards.calculateHandValue(hand.cards).value;
                        return val >= 17 ? 'stand' : 'hit';
                    }
                    return 'split';
                }
                return 'hit';

            default:
                return 'hit';
        }
    }

    /**
     * Determine bet size based on personality and card count.
     * @param {string} personalityKey
     * @param {number} baseBet - table minimum
     * @returns {number}
     */
    function decideBet(personalityKey, baseBet) {
        baseBet = baseBet || 10;
        var profile = PERSONALITY[personalityKey] || PERSONALITY.mei;

        if (profile.useCounting) {
            // Mei uses card counting to adjust bets
            var count = _runningCount;
            if (count >= 3) {
                return baseBet * 4;  // High count: bet big
            } else if (count >= 1) {
                return baseBet * 2;
            } else if (count <= -2) {
                return baseBet;      // Low count: minimum bet
            }
            return baseBet;
        }

        // Kenji bets erratically
        if (personalityKey === 'kenji') {
            var multiplier = Math.random() < 0.3 ? (2 + Math.floor(Math.random() * 3)) : 1;
            return baseBet * multiplier;
        }

        // Yuki bets conservatively
        if (personalityKey === 'yuki') {
            return baseBet;
        }

        return baseBet;
    }

    // -----------------------------------------------------------------------
    // Adaptive Learning — loads persisted stats and adjusts strategy
    // -----------------------------------------------------------------------
    var _learnedAdjustments = { bustThreshold: 0, doubleConfidence: 0, standEarly: 0 };

    function loadLearning() {
        try {
            var d = JSON.parse(localStorage.getItem('mj_blackjack_learning'));
            if (!d || !d.handsPlayed || d.handsPlayed < 10) return;
            var bustRate = (d.busts || 0) / d.handsPlayed;
            var winRate = (d.wins || 0) / d.handsPlayed;
            var doubleRate = (d.doubles || 0) / Math.max(1, d.handsPlayed);

            // If busting too much (>35%): stand earlier on borderline hands
            if (bustRate > 0.35) _learnedAdjustments.standEarly = Math.min(2, Math.round((bustRate - 0.3) * 20));
            else _learnedAdjustments.standEarly = 0;

            // If winning well (>48%): more confident with doubles
            if (winRate > 0.48) _learnedAdjustments.doubleConfidence = 0.1;
            else if (winRate < 0.35) _learnedAdjustments.doubleConfidence = -0.15;
            else _learnedAdjustments.doubleConfidence = 0;

            // If busting rarely (<15%): could be too conservative, hit more
            if (bustRate < 0.15 && winRate < 0.4) _learnedAdjustments.bustThreshold = -1;
            else _learnedAdjustments.bustThreshold = 0;
        } catch(e) {}
    }

    function applyLearning(action, handValue, profile) {
        // Apply learned adjustments to the basic strategy decision
        if (_learnedAdjustments.standEarly > 0 && action === 'H') {
            // Stand earlier on 14-15 if busting too much
            var standThreshold = 16 - _learnedAdjustments.standEarly;
            if (handValue >= standThreshold && handValue <= 16) return 'S';
        }
        if (_learnedAdjustments.bustThreshold < 0 && action === 'S') {
            // Hit more if too conservative — but only on 12-13
            if (handValue >= 12 && handValue <= 13) return 'H';
        }
        if (_learnedAdjustments.doubleConfidence !== 0 && action === 'D') {
            // More/less willing to double
            if (_learnedAdjustments.doubleConfidence < 0 && Math.random() < Math.abs(_learnedAdjustments.doubleConfidence)) return 'H';
        }
        return action;
    }

    function getLearningStats() {
        return { ..._learnedAdjustments };
    }

    // Load learning on module init
    loadLearning();

    // Export
    root.MJ.Blackjack.AI = {
        decideAction: function(hand, dealerUpcard, personalityKey) {
            var profile = PERSONALITY[personalityKey] || PERSONALITY.mei;
            var action = decideAction(hand, dealerUpcard, personalityKey);
            // Apply learned adjustments (only for non-Mei — Mei plays perfect strategy)
            if (personalityKey !== 'mei') {
                var cards = BJCards();
                var val = cards ? cards.calculateHandValue(hand.cards).value : 0;
                action = applyLearning(action, val, profile);
            }
            return action;
        },
        decideBet: decideBet,
        lookupBasicStrategy: lookupBasicStrategy,
        updateCount: updateCount,
        resetCount: resetCount,
        getRunningCount: getRunningCount,
        loadLearning: loadLearning,
        getLearningStats: getLearningStats,
        PERSONALITY: PERSONALITY,
        HARD_STRATEGY: HARD_STRATEGY,
        SOFT_STRATEGY: SOFT_STRATEGY,
        PAIR_STRATEGY: PAIR_STRATEGY
    };

})(typeof window !== 'undefined' ? window : global);
