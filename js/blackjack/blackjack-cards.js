/**
 * blackjack-cards.js - Card utilities for Blackjack
 * Reuses poker Card/Deck but adds Blackjack-specific value calculation.
 * Exports under root.MJ.Blackjack.Cards
 */
(function(exports) {
    var root = typeof window !== 'undefined' ? window : exports;
    root.MJ = root.MJ || {};
    root.MJ.Blackjack = root.MJ.Blackjack || {};

    var PokerCards = root.MJ.Poker && root.MJ.Poker.Cards;

    // Blackjack card values: Ace=1 or 11, Face=10, Number=face value
    var BJ_VALUES = {
        '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
        '8': 8, '9': 9, '10': 10, 'J': 10, 'Q': 10, 'K': 10, 'A': 11
    };

    /**
     * Calculate the best Blackjack hand value.
     * @param {Card[]} cards
     * @returns {{value: number, soft: boolean}} soft = has a usable ace counted as 11
     */
    function calculateHandValue(cards) {
        var total = 0;
        var aces = 0;

        for (var i = 0; i < cards.length; i++) {
            var v = BJ_VALUES[cards[i].rank] || 0;
            total += v;
            if (cards[i].rank === 'A') {
                aces++;
            }
        }

        // Reduce aces from 11 to 1 until total <= 21
        while (total > 21 && aces > 0) {
            total -= 10;
            aces--;
        }

        return {
            value: total,
            soft: aces > 0 // at least one ace still counted as 11
        };
    }

    /**
     * Check if a hand is bust (value > 21).
     * @param {Card[]} cards
     * @returns {boolean}
     */
    function isBust(cards) {
        return calculateHandValue(cards).value > 21;
    }

    /**
     * Check if a hand is a natural blackjack (exactly 2 cards totaling 21).
     * @param {Card[]} cards
     * @returns {boolean}
     */
    function isBlackjack(cards) {
        return cards.length === 2 && calculateHandValue(cards).value === 21;
    }

    /**
     * Create a multi-deck shoe.
     * @param {number} numDecks - Number of standard 52-card decks (default 6)
     * @returns {{cards: Card[], deal: function, remaining: function, shuffle: function}}
     */
    function createShoe(numDecks) {
        numDecks = numDecks || 6;
        var cards = [];
        var Card = PokerCards ? PokerCards.Card : null;
        var SUITS = PokerCards ? PokerCards.SUITS : ['hearts', 'diamonds', 'clubs', 'spades'];
        var RANKS = PokerCards ? PokerCards.RANKS : ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];

        for (var d = 0; d < numDecks; d++) {
            for (var s = 0; s < SUITS.length; s++) {
                for (var r = 0; r < RANKS.length; r++) {
                    if (Card) {
                        cards.push(new Card(SUITS[s], RANKS[r]));
                    } else {
                        cards.push({ suit: SUITS[s], rank: RANKS[r] });
                    }
                }
            }
        }

        // Fisher-Yates shuffle
        function shuffle() {
            for (var i = cards.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                var tmp = cards[i];
                cards[i] = cards[j];
                cards[j] = tmp;
            }
        }

        shuffle();

        return {
            cards: cards,
            deal: function(count) {
                return cards.splice(0, count);
            },
            remaining: function() {
                return cards.length;
            },
            shuffle: shuffle,
            reset: function() {
                cards.length = 0;
                for (var d = 0; d < numDecks; d++) {
                    for (var s = 0; s < SUITS.length; s++) {
                        for (var r = 0; r < RANKS.length; r++) {
                            if (Card) {
                                cards.push(new Card(SUITS[s], RANKS[r]));
                            } else {
                                cards.push({ suit: SUITS[s], rank: RANKS[r] });
                            }
                        }
                    }
                }
                shuffle();
            }
        };
    }

    // Export
    root.MJ.Blackjack.Cards = {
        BJ_VALUES: BJ_VALUES,
        calculateHandValue: calculateHandValue,
        isBust: isBust,
        isBlackjack: isBlackjack,
        createShoe: createShoe
    };

})(typeof window !== 'undefined' ? window : global);
