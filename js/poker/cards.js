/**
 * cards.js - Card deck and hand display utilities for Texas Hold'em
 * Exports under root.MJ.Poker.Cards
 */
(function(exports) {
    const root = typeof window !== 'undefined' ? window : exports;
    root.MJ = root.MJ || {};
    root.MJ.Poker = root.MJ.Poker || {};

    const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];

    const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

    const CARD_SYMBOLS = {
        hearts: '\u2665',
        diamonds: '\u2666',
        clubs: '\u2663',
        spades: '\u2660'
    };

    const RANK_VALUES = {
        '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
        '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
    };

    /**
     * Card class representing a single playing card.
     */
    class Card {
        constructor(suit, rank) {
            this.suit = suit;
            this.rank = rank;
            this.value = RANK_VALUES[rank];
        }

        toString() {
            return getCardDisplay(this);
        }

        equals(other) {
            return other && this.suit === other.suit && this.rank === other.rank;
        }

        toJSON() {
            return { suit: this.suit, rank: this.rank, value: this.value };
        }
    }

    /**
     * Deck class for creating, shuffling, and dealing cards.
     */
    class Deck {
        constructor() {
            this.cards = [];
            this.create();
        }

        /**
         * Create a fresh 52-card deck.
         */
        create() {
            this.cards = [];
            for (let s = 0; s < SUITS.length; s++) {
                for (let r = 0; r < RANKS.length; r++) {
                    this.cards.push(new Card(SUITS[s], RANKS[r]));
                }
            }
            return this;
        }

        /**
         * Fisher-Yates shuffle.
         */
        shuffle() {
            const arr = this.cards;
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                const tmp = arr[i];
                arr[i] = arr[j];
                arr[j] = tmp;
            }
            return this;
        }

        /**
         * Deal `count` cards from the top of the deck.
         * @param {number} count
         * @returns {Card[]}
         */
        deal(count) {
            if (count > this.cards.length) {
                throw new Error('Not enough cards in deck to deal ' + count);
            }
            return this.cards.splice(0, count);
        }

        /**
         * Remove specific cards from the deck (used for Monte Carlo).
         * @param {Card[]} cardsToRemove
         */
        removeCards(cardsToRemove) {
            this.cards = this.cards.filter(function(c) {
                return !cardsToRemove.some(function(r) {
                    return c.suit === r.suit && c.rank === r.rank;
                });
            });
            return this;
        }

        /**
         * Number of cards remaining in the deck.
         */
        remaining() {
            return this.cards.length;
        }
    }

    /**
     * Get display string for a card, e.g. "A\u2660", "10\u2665".
     * @param {Card} card
     * @returns {string}
     */
    function getCardDisplay(card) {
        return card.rank + CARD_SYMBOLS[card.suit];
    }

    /**
     * Get the display color for a card.
     * @param {Card} card
     * @returns {string} 'red' or 'black'
     */
    function getCardColor(card) {
        if (card.suit === 'hearts' || card.suit === 'diamonds') {
            return 'red';
        }
        return 'black';
    }

    // Export
    root.MJ.Poker.Cards = {
        SUITS: SUITS,
        RANKS: RANKS,
        RANK_VALUES: RANK_VALUES,
        CARD_SYMBOLS: CARD_SYMBOLS,
        Card: Card,
        Deck: Deck,
        getCardDisplay: getCardDisplay,
        getCardColor: getCardColor
    };

})(typeof window !== 'undefined' ? window : global);
