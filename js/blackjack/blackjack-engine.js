/**
 * blackjack-engine.js - Complete Blackjack game engine
 * 4 players (1 human + 3 AI) each playing against the dealer.
 * 6-deck shoe, reshuffle when < 60 cards remain.
 * Exports under root.MJ.Blackjack.Engine
 */
(function(exports) {
    var root = typeof window !== 'undefined' ? window : exports;
    root.MJ = root.MJ || {};
    root.MJ.Blackjack = root.MJ.Blackjack || {};

    var BJCards = function() { return root.MJ.Blackjack.Cards; };

    // Game phases
    var PHASE = {
        WAITING: 'waiting',
        BETTING: 'betting',
        DEALING: 'dealing',
        PLAYER_TURN: 'player_turn',
        DEALER_TURN: 'dealer_turn',
        SETTLING: 'settling',
        HAND_OVER: 'hand_over'
    };

    // Player actions
    var ACTION = {
        HIT: 'hit',
        STAND: 'stand',
        DOUBLE: 'double',
        SPLIT: 'split',
        INSURANCE: 'insurance'
    };

    /**
     * Create a player object.
     */
    function createPlayer(id, name, chips, isHuman) {
        return {
            id: id,
            name: name,
            chips: chips,
            isHuman: isHuman || false,
            personality: null,
            hands: [],        // array of hand objects (supports splits)
            activeHandIndex: 0,
            insurance: 0,
            done: false
        };
    }

    /**
     * Create a hand object (each player can have multiple after splitting).
     */
    function createHand(bet) {
        return {
            cards: [],
            bet: bet || 0,
            stood: false,
            busted: false,
            doubled: false,
            isBlackjack: false,
            result: null,     // 'win', 'lose', 'push', 'blackjack'
            payout: 0
        };
    }

    /**
     * BlackjackEngine - manages a full blackjack table.
     */
    function BlackjackEngine() {
        this.players = [];
        this.dealer = { cards: [], busted: false, value: 0 };
        this.shoe = null;
        this.phase = PHASE.WAITING;
        this.currentPlayerIndex = 0;
        this.handNumber = 0;
        this.sharedSystems = null;

        this._stateCallbacks = [];
        this._actionCallbacks = [];
        this._roundEndCallbacks = [];
    }

    /**
     * Initialize the engine.
     * @param {Object} options - {buyIn, playerCount}
     */
    BlackjackEngine.prototype.init = function(options) {
        options = options || {};
        var buyIn = options.buyIn || 1000;
        var playerCount = options.playerCount || 4;

        var names = ['You', 'Mei', 'Kenji', 'Yuki'];
        var personalities = [null, 'mei', 'kenji', 'yuki'];

        this.players = [];
        for (var i = 0; i < playerCount; i++) {
            var p = createPlayer(i, names[i] || ('Player ' + (i + 1)), buyIn, i === 0);
            p.personality = personalities[i] || null;
            this.players.push(p);
        }

        this.shoe = BJCards().createShoe(6);
        this.handNumber = 0;
        this.phase = PHASE.WAITING;
    };

    BlackjackEngine.prototype.setSharedSystems = function(systems) {
        this.sharedSystems = systems;
    };

    BlackjackEngine.prototype.onStateChange = function(cb) { this._stateCallbacks.push(cb); };
    BlackjackEngine.prototype.onActionNeeded = function(cb) { this._actionCallbacks.push(cb); };
    BlackjackEngine.prototype.onRoundEnd = function(cb) { this._roundEndCallbacks.push(cb); };

    BlackjackEngine.prototype._fireStateChange = function() {
        var state = this.getState();
        for (var i = 0; i < this._stateCallbacks.length; i++) {
            this._stateCallbacks[i](state);
        }
    };

    BlackjackEngine.prototype._fireActionNeeded = function(actions) {
        for (var i = 0; i < this._actionCallbacks.length; i++) {
            this._actionCallbacks[i](actions);
        }
    };

    BlackjackEngine.prototype._fireRoundEnd = function(results) {
        for (var i = 0; i < this._roundEndCallbacks.length; i++) {
            this._roundEndCallbacks[i](results);
        }
    };

    /**
     * Check if shoe needs reshuffling.
     */
    BlackjackEngine.prototype._checkReshuffle = function() {
        if (this.shoe.remaining() < 60) {
            this.shoe.reset();
            console.log('[Blackjack] Shoe reshuffled');
        }
    };

    /**
     * Start a new round: place bets, deal cards.
     * @param {number[]} bets - array of bet amounts per player index
     */
    BlackjackEngine.prototype.start = function(bets) {
        this._checkReshuffle();
        this.handNumber++;

        bets = bets || [];

        // Reset players
        for (var i = 0; i < this.players.length; i++) {
            var p = this.players[i];
            p.hands = [];
            p.activeHandIndex = 0;
            p.insurance = 0;
            p.done = false;

            var bet = bets[i] || 10;
            bet = Math.min(bet, p.chips);
            if (bet <= 0) {
                p.done = true;
                p.hands.push(createHand(0));
                continue;
            }

            p.chips -= bet;
            p.hands.push(createHand(bet));
        }

        // Reset dealer
        this.dealer = { cards: [], busted: false, value: 0 };

        // Deal: 2 cards to each player, then 2 to dealer
        this.phase = PHASE.DEALING;
        for (var round = 0; round < 2; round++) {
            for (var i = 0; i < this.players.length; i++) {
                if (!this.players[i].done) {
                    this.players[i].hands[0].cards = this.players[i].hands[0].cards.concat(this.shoe.deal(1));
                }
            }
            this.dealer.cards = this.dealer.cards.concat(this.shoe.deal(1));
        }

        // Check for natural blackjacks
        var cards = BJCards();
        for (var i = 0; i < this.players.length; i++) {
            if (!this.players[i].done && this.players[i].hands[0].cards.length === 2) {
                if (cards.isBlackjack(this.players[i].hands[0].cards)) {
                    this.players[i].hands[0].isBlackjack = true;
                    this.players[i].done = true;
                }
            }
        }

        // Start player turns
        this.phase = PHASE.PLAYER_TURN;
        this.currentPlayerIndex = 0;
        this._advanceToNextPlayer();
    };

    /**
     * Advance to the next player who needs to act.
     */
    BlackjackEngine.prototype._advanceToNextPlayer = function() {
        while (this.currentPlayerIndex < this.players.length) {
            var p = this.players[this.currentPlayerIndex];
            if (!p.done) {
                this._fireStateChange();
                this._promptPlayer(this.currentPlayerIndex);
                return;
            }
            this.currentPlayerIndex++;
        }

        // All players done, dealer plays
        this.dealerPlay();
    };

    /**
     * Prompt a player for action.
     */
    BlackjackEngine.prototype._promptPlayer = function(playerIndex) {
        var p = this.players[playerIndex];
        var actions = this._getValidActions(playerIndex);

        if (p.isHuman) {
            this._fireActionNeeded(actions);
            this._fireStateChange();
        } else {
            this._fireStateChange();
            // AI acts after a delay
            var self = this;
            setTimeout(function() {
                var BJAI = root.MJ.Blackjack.AI;
                if (BJAI && BJAI.decideAction) {
                    var hand = p.hands[p.activeHandIndex];
                    var dealerUpcard = self.dealer.cards[0];
                    var action = BJAI.decideAction(hand, dealerUpcard, p.personality);
                    self._handleAction(playerIndex, action);
                } else {
                    // Fallback: simple strategy
                    var cards = BJCards();
                    var val = cards.calculateHandValue(p.hands[p.activeHandIndex].cards).value;
                    self._handleAction(playerIndex, val < 17 ? ACTION.HIT : ACTION.STAND);
                }
            }, 800);
        }
    };

    /**
     * Get valid actions for a player.
     */
    BlackjackEngine.prototype._getValidActions = function(playerIndex) {
        var p = this.players[playerIndex];
        var hand = p.hands[p.activeHandIndex];
        var actions = [ACTION.HIT, ACTION.STAND];

        // Double down: only on first two cards, must have chips for it
        if (hand.cards.length === 2 && !hand.doubled && p.chips >= hand.bet) {
            actions.push(ACTION.DOUBLE);
        }

        // Split: only if two cards of same rank and chips available
        if (hand.cards.length === 2 && p.hands.length < 4 &&
            hand.cards[0].rank === hand.cards[1].rank && p.chips >= hand.bet) {
            actions.push(ACTION.SPLIT);
        }

        // Insurance: dealer shows Ace, first action of the hand
        if (this.dealer.cards[0] && this.dealer.cards[0].rank === 'A' &&
            hand.cards.length === 2 && p.insurance === 0 && p.chips >= Math.floor(hand.bet / 2)) {
            actions.push(ACTION.INSURANCE);
        }

        return actions;
    };

    /**
     * Handle a player action (hit, stand, double, split).
     * @param {number} playerIndex
     * @param {string} action
     */
    BlackjackEngine.prototype.hit = function(playerIndex) {
        this._handleAction(playerIndex, ACTION.HIT);
    };

    BlackjackEngine.prototype.stand = function(playerIndex) {
        this._handleAction(playerIndex, ACTION.STAND);
    };

    BlackjackEngine.prototype.doubleDown = function(playerIndex) {
        this._handleAction(playerIndex, ACTION.DOUBLE);
    };

    BlackjackEngine.prototype.split = function(playerIndex) {
        this._handleAction(playerIndex, ACTION.SPLIT);
    };

    /**
     * Handle a player's action on their current hand.
     */
    BlackjackEngine.prototype._handleAction = function(playerIndex, action) {
        var p = this.players[playerIndex];
        var hand = p.hands[p.activeHandIndex];
        var cards = BJCards();

        switch (action) {
            case ACTION.HIT:
                hand.cards = hand.cards.concat(this.shoe.deal(1));
                if (cards.isBust(hand.cards)) {
                    hand.busted = true;
                    this._advanceHand(playerIndex);
                } else {
                    this._promptPlayer(playerIndex);
                }
                break;

            case ACTION.STAND:
                hand.stood = true;
                this._advanceHand(playerIndex);
                break;

            case ACTION.DOUBLE:
                p.chips -= hand.bet;
                hand.bet *= 2;
                hand.doubled = true;
                hand.cards = hand.cards.concat(this.shoe.deal(1));
                if (cards.isBust(hand.cards)) {
                    hand.busted = true;
                }
                hand.stood = true;
                this._advanceHand(playerIndex);
                break;

            case ACTION.SPLIT:
                var splitCard = hand.cards.pop();
                p.chips -= hand.bet;
                var newHand = createHand(hand.bet);
                newHand.cards.push(splitCard);

                // Deal one card to each split hand
                hand.cards = hand.cards.concat(this.shoe.deal(1));
                newHand.cards = newHand.cards.concat(this.shoe.deal(1));

                p.hands.splice(p.activeHandIndex + 1, 0, newHand);
                this._promptPlayer(playerIndex);
                break;

            case ACTION.INSURANCE:
                var insuranceBet = Math.floor(hand.bet / 2);
                p.chips -= insuranceBet;
                p.insurance = insuranceBet;
                // Continue with normal play after insurance
                this._promptPlayer(playerIndex);
                break;

            default:
                this._promptPlayer(playerIndex);
                break;
        }
    };

    /**
     * Advance to the next hand for a player, or the next player.
     */
    BlackjackEngine.prototype._advanceHand = function(playerIndex) {
        var p = this.players[playerIndex];
        p.activeHandIndex++;

        if (p.activeHandIndex < p.hands.length) {
            // More split hands to play
            this._promptPlayer(playerIndex);
        } else {
            // Player done
            p.done = true;
            this.currentPlayerIndex++;
            this._advanceToNextPlayer();
        }
    };

    /**
     * Dealer plays according to house rules: hit on 16, stand on 17.
     */
    BlackjackEngine.prototype.dealerPlay = function() {
        this.phase = PHASE.DEALER_TURN;
        var cards = BJCards();

        // Dealer hits until value >= 17
        while (true) {
            var handVal = cards.calculateHandValue(this.dealer.cards);
            if (handVal.value >= 17) {
                break;
            }
            this.dealer.cards = this.dealer.cards.concat(this.shoe.deal(1));
        }

        var finalVal = cards.calculateHandValue(this.dealer.cards);
        this.dealer.value = finalVal.value;
        this.dealer.busted = finalVal.value > 21;

        this._fireStateChange();
        this.settle();
    };

    /**
     * Settle all bets: compare each player's hand against the dealer.
     */
    BlackjackEngine.prototype.settle = function() {
        this.phase = PHASE.SETTLING;
        var cards = BJCards();
        var dealerVal = cards.calculateHandValue(this.dealer.cards).value;
        var dealerBlackjack = cards.isBlackjack(this.dealer.cards);
        var results = [];

        for (var i = 0; i < this.players.length; i++) {
            var p = this.players[i];

            // Settle insurance first
            if (p.insurance > 0) {
                if (dealerBlackjack) {
                    p.chips += p.insurance * 3; // 2:1 on insurance + original bet returned
                }
                // Otherwise insurance is lost (already deducted)
            }

            for (var h = 0; h < p.hands.length; h++) {
                var hand = p.hands[h];
                if (hand.bet === 0) continue;

                var playerVal = cards.calculateHandValue(hand.cards).value;

                if (hand.busted) {
                    hand.result = 'lose';
                    hand.payout = 0;
                } else if (hand.isBlackjack && !dealerBlackjack) {
                    // Blackjack pays 3:2
                    hand.result = 'blackjack';
                    hand.payout = Math.floor(hand.bet * 2.5);
                    p.chips += hand.payout;
                } else if (hand.isBlackjack && dealerBlackjack) {
                    // Both blackjack: push
                    hand.result = 'push';
                    hand.payout = hand.bet;
                    p.chips += hand.payout;
                } else if (dealerBlackjack) {
                    hand.result = 'lose';
                    hand.payout = 0;
                } else if (this.dealer.busted) {
                    // Dealer bust, player wins 2:1
                    hand.result = 'win';
                    hand.payout = hand.bet * 2;
                    p.chips += hand.payout;
                } else if (playerVal > dealerVal) {
                    hand.result = 'win';
                    hand.payout = hand.bet * 2;
                    p.chips += hand.payout;
                } else if (playerVal === dealerVal) {
                    hand.result = 'push';
                    hand.payout = hand.bet;
                    p.chips += hand.payout;
                } else {
                    hand.result = 'lose';
                    hand.payout = 0;
                }

                results.push({
                    playerId: p.id,
                    playerName: p.name,
                    handIndex: h,
                    result: hand.result,
                    payout: hand.payout,
                    bet: hand.bet,
                    playerValue: playerVal,
                    dealerValue: dealerVal
                });
            }
        }

        this.phase = PHASE.HAND_OVER;
        this._fireStateChange();
        this._fireRoundEnd({
            results: results,
            dealerCards: this.dealer.cards.slice(),
            dealerValue: dealerVal,
            dealerBusted: this.dealer.busted,
            handNumber: this.handNumber
        });
    };

    /**
     * Get the complete game state for rendering.
     */
    BlackjackEngine.prototype.getState = function() {
        var playerStates = [];
        for (var i = 0; i < this.players.length; i++) {
            var p = this.players[i];
            playerStates.push({
                id: p.id,
                name: p.name,
                chips: p.chips,
                hands: p.hands.slice(),
                activeHandIndex: p.activeHandIndex,
                insurance: p.insurance,
                done: p.done,
                isHuman: p.isHuman,
                personality: p.personality
            });
        }

        return {
            players: playerStates,
            dealer: {
                cards: this.dealer.cards.slice(),
                busted: this.dealer.busted,
                value: this.dealer.value
            },
            phase: this.phase,
            currentPlayerIndex: this.currentPlayerIndex,
            handNumber: this.handNumber,
            shoeRemaining: this.shoe ? this.shoe.remaining() : 0
        };
    };

    // Export
    root.MJ.Blackjack.Engine = {
        BlackjackEngine: BlackjackEngine,
        PHASE: PHASE,
        ACTION: ACTION,
        createPlayer: createPlayer,
        createHand: createHand
    };

})(typeof window !== 'undefined' ? window : global);
