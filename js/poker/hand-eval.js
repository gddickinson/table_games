/**
 * hand-eval.js - Texas Hold'em hand evaluation
 * Exports under root.MJ.Poker.HandEval
 */
(function(exports) {
    const root = typeof window !== 'undefined' ? window : exports;
    root.MJ = root.MJ || {};
    root.MJ.Poker = root.MJ.Poker || {};

    var Cards = root.MJ.Poker.Cards;

    // Hand ranking constants
    var HAND_RANKS = {
        HIGH_CARD: 0,
        PAIR: 1,
        TWO_PAIR: 2,
        THREE_OF_A_KIND: 3,
        STRAIGHT: 4,
        FLUSH: 5,
        FULL_HOUSE: 6,
        FOUR_OF_A_KIND: 7,
        STRAIGHT_FLUSH: 8,
        ROYAL_FLUSH: 9
    };

    var HAND_NAMES = [
        'High Card',
        'Pair',
        'Two Pair',
        'Three of a Kind',
        'Straight',
        'Flush',
        'Full House',
        'Four of a Kind',
        'Straight Flush',
        'Royal Flush'
    ];

    /**
     * Get all C(n, k) combinations from an array.
     */
    function combinations(arr, k) {
        var result = [];
        function recurse(start, combo) {
            if (combo.length === k) {
                result.push(combo.slice());
                return;
            }
            for (var i = start; i < arr.length; i++) {
                combo.push(arr[i]);
                recurse(i + 1, combo);
                combo.pop();
            }
        }
        recurse(0, []);
        return result;
    }

    /**
     * Count occurrences of each rank value in a hand.
     */
    function countRanks(cards) {
        var counts = {};
        for (var i = 0; i < cards.length; i++) {
            var v = cards[i].value;
            counts[v] = (counts[v] || 0) + 1;
        }
        return counts;
    }

    /**
     * Check if 5 cards form a flush.
     */
    function isFlush(cards) {
        var suit = cards[0].suit;
        for (var i = 1; i < cards.length; i++) {
            if (cards[i].suit !== suit) return false;
        }
        return true;
    }

    /**
     * Check if 5 sorted cards form a straight. Returns the high card value or 0.
     * Handles the A-2-3-4-5 (wheel) straight.
     */
    function straightHighCard(cards) {
        var values = [];
        for (var i = 0; i < cards.length; i++) {
            values.push(cards[i].value);
        }
        values.sort(function(a, b) { return b - a; });

        // Remove duplicates
        var unique = [values[0]];
        for (var i = 1; i < values.length; i++) {
            if (values[i] !== values[i - 1]) unique.push(values[i]);
        }
        if (unique.length < 5) return 0;

        // Check normal straight
        if (unique[0] - unique[4] === 4) {
            return unique[0];
        }

        // Check wheel: A-2-3-4-5
        if (unique[0] === 14 && unique[1] === 5 && unique[2] === 4 && unique[3] === 3 && unique[4] === 2) {
            return 5; // 5-high straight
        }

        return 0;
    }

    /**
     * Compute a numeric value for a 5-card hand for comparison.
     * Higher value = better hand.
     * Format: rank * 10^10 + kicker encoding
     */
    function computeHandValue(rank, kickers) {
        // rank is 0-9, each kicker is 2-14
        // We encode up to 5 kickers in descending significance
        var value = rank * 1e10;
        for (var i = 0; i < kickers.length && i < 5; i++) {
            value += kickers[i] * Math.pow(15, 4 - i);
        }
        return value;
    }

    /**
     * Evaluate exactly 5 cards and return {rank, name, value, bestFive}.
     */
    function evaluateFiveCards(cards) {
        var sorted = cards.slice().sort(function(a, b) { return b.value - a.value; });
        var counts = countRanks(sorted);
        var flush = isFlush(sorted);
        var high = straightHighCard(sorted);
        var isStraight = high > 0;

        // Group by count for rank-based hands
        var groups = []; // {count, value}
        for (var v in counts) {
            groups.push({ count: counts[v], value: parseInt(v) });
        }
        // Sort by count desc, then value desc
        groups.sort(function(a, b) {
            if (b.count !== a.count) return b.count - a.count;
            return b.value - a.value;
        });

        var rank, kickers;

        if (flush && isStraight) {
            if (high === 14) {
                rank = HAND_RANKS.ROYAL_FLUSH;
                kickers = [14];
            } else {
                rank = HAND_RANKS.STRAIGHT_FLUSH;
                kickers = [high];
            }
        } else if (groups[0].count === 4) {
            rank = HAND_RANKS.FOUR_OF_A_KIND;
            kickers = [groups[0].value, groups[1].value];
        } else if (groups[0].count === 3 && groups[1].count === 2) {
            rank = HAND_RANKS.FULL_HOUSE;
            kickers = [groups[0].value, groups[1].value];
        } else if (flush) {
            rank = HAND_RANKS.FLUSH;
            kickers = sorted.map(function(c) { return c.value; });
        } else if (isStraight) {
            rank = HAND_RANKS.STRAIGHT;
            kickers = [high];
        } else if (groups[0].count === 3) {
            rank = HAND_RANKS.THREE_OF_A_KIND;
            kickers = [groups[0].value];
            for (var i = 1; i < groups.length; i++) {
                kickers.push(groups[i].value);
            }
        } else if (groups[0].count === 2 && groups[1].count === 2) {
            rank = HAND_RANKS.TWO_PAIR;
            var highPair = Math.max(groups[0].value, groups[1].value);
            var lowPair = Math.min(groups[0].value, groups[1].value);
            kickers = [highPair, lowPair, groups[2].value];
        } else if (groups[0].count === 2) {
            rank = HAND_RANKS.PAIR;
            kickers = [groups[0].value];
            for (var i = 1; i < groups.length; i++) {
                kickers.push(groups[i].value);
            }
        } else {
            rank = HAND_RANKS.HIGH_CARD;
            kickers = sorted.map(function(c) { return c.value; });
        }

        return {
            rank: rank,
            name: HAND_NAMES[rank],
            value: computeHandValue(rank, kickers),
            bestFive: sorted
        };
    }

    /**
     * Evaluate 5-7 cards and return the best 5-card hand.
     * @param {Card[]} cards - 5 to 7 cards
     * @returns {{rank, name, value, bestFive}}
     */
    function evaluateHand(cards) {
        if (cards.length < 5) {
            throw new Error('Need at least 5 cards to evaluate a hand');
        }
        if (cards.length === 5) {
            return evaluateFiveCards(cards);
        }

        var combos = combinations(cards, 5);
        var best = null;
        for (var i = 0; i < combos.length; i++) {
            var result = evaluateFiveCards(combos[i]);
            if (!best || result.value > best.value) {
                best = result;
            }
        }
        return best;
    }

    /**
     * Compare two evaluated hands.
     * @returns {number} 1 if hand1 wins, -1 if hand2 wins, 0 if tie
     */
    function compareHands(hand1, hand2) {
        if (hand1.value > hand2.value) return 1;
        if (hand1.value < hand2.value) return -1;
        return 0;
    }

    /**
     * Get the best hand from 2 hole cards + up to 5 community cards.
     * @param {Card[]} holeCards
     * @param {Card[]} communityCards
     * @returns {{rank, name, value, bestFive}}
     */
    function getBestHand(holeCards, communityCards) {
        var allCards = holeCards.concat(communityCards);
        if (allCards.length < 5) {
            // Not enough for a full hand; evaluate what we have padded conceptually
            // For pre-flop or early streets, return a partial evaluation
            return null;
        }
        return evaluateHand(allCards);
    }

    /**
     * Get human-readable hand name.
     * @param {number} rank - 0-9
     * @returns {string}
     */
    function getHandName(rank) {
        return HAND_NAMES[rank] || 'Unknown';
    }

    /**
     * Calculate drawing outs for hand improvement.
     * Checks how many unseen cards would improve the current hand rank.
     * @param {Card[]} holeCards
     * @param {Card[]} communityCards
     * @returns {{outs: number, draws: string[]}}
     */
    function getOuts(holeCards, communityCards) {
        var knownCards = holeCards.concat(communityCards);
        var currentHand = getBestHand(holeCards, communityCards);
        if (!currentHand) return { outs: 0, draws: [] };

        var currentRank = currentHand.rank;
        var deck = new Cards.Deck();
        deck.removeCards(knownCards);
        var remaining = deck.cards;

        var outs = 0;
        var draws = [];
        var drawSet = {};

        for (var i = 0; i < remaining.length; i++) {
            var testCards = knownCards.concat([remaining[i]]);
            if (testCards.length >= 5) {
                var testHand = evaluateHand(testCards);
                if (testHand.rank > currentRank) {
                    outs++;
                    var drawName = HAND_NAMES[testHand.rank];
                    if (!drawSet[drawName]) {
                        drawSet[drawName] = true;
                        draws.push(drawName);
                    }
                }
            }
        }

        return { outs: outs, draws: draws };
    }

    // Export
    root.MJ.Poker.HandEval = {
        HAND_RANKS: HAND_RANKS,
        HAND_NAMES: HAND_NAMES,
        evaluateHand: evaluateHand,
        compareHands: compareHands,
        getBestHand: getBestHand,
        getHandName: getHandName,
        getOuts: getOuts,
        combinations: combinations
    };

})(typeof window !== 'undefined' ? window : global);
