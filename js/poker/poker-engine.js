/**
 * poker-engine.js - Full Texas Hold'em game engine
 * Exports under root.MJ.Poker.Engine
 */
(function(exports) {
    const root = typeof window !== 'undefined' ? window : exports;
    root.MJ = root.MJ || {};
    root.MJ.Poker = root.MJ.Poker || {};

    var Cards = root.MJ.Poker.Cards;
    var HandEval = root.MJ.Poker.HandEval;

    // Game phases
    var PHASE = {
        WAITING: 'waiting',
        PRE_FLOP: 'pre_flop',
        FLOP: 'flop',
        TURN: 'turn',
        RIVER: 'river',
        SHOWDOWN: 'showdown',
        HAND_OVER: 'hand_over'
    };

    // Action types
    var ACTION = {
        FOLD: 'fold',
        CHECK: 'check',
        CALL: 'call',
        RAISE: 'raise',
        ALLIN: 'allin'
    };

    /**
     * Create a player object.
     */
    function createPlayer(id, name, chips, isHuman) {
        return {
            id: id,
            name: name,
            chips: chips,
            cards: [],
            bet: 0,
            totalBetThisHand: 0,
            folded: false,
            allIn: false,
            isDealer: false,
            isHuman: isHuman || false,
            position: id,
            lastAction: null,
            personality: null
        };
    }

    /**
     * PokerEngine - implements IGameEngine interface for Texas Hold'em.
     */
    function PokerEngine() {
        this.container = null;
        this.options = {};
        this.players = [];
        this.deck = null;
        this.communityCards = [];
        this.pot = 0;
        this.sidePots = [];
        this.phase = PHASE.WAITING;
        this.dealerIndex = 0;
        this.currentPlayerIndex = 0;
        this.currentBet = 0;
        this.minRaise = 0;
        this.smallBlind = 5;
        this.bigBlind = 10;
        this.handNumber = 0;
        this.lastAggressor = -1;
        this.actedThisRound = {};
        this.sharedSystems = null;
        this._roundEndCallbacks = [];
        this._actionCallbacks = [];
        this._stateChangeCallbacks = [];
        this._waitingForHuman = false;
    }

    /**
     * Initialize the engine.
     * @param {HTMLElement} container
     * @param {Object} options - {buyIn, smallBlind, bigBlind, playerCount}
     */
    PokerEngine.prototype.init = function(container, options) {
        this.container = container;
        this.options = options || {};

        var buyIn = this.options.buyIn || 1000;
        this.smallBlind = this.options.smallBlind || 5;
        this.bigBlind = this.options.bigBlind || 10;
        var playerCount = this.options.playerCount || 4;

        // Player names - index 0 is always the human
        var names = ['You', 'Mei', 'Kenji', 'Yuki'];
        var personalities = [null, 'mei', 'kenji', 'yuki'];

        this.players = [];
        for (var i = 0; i < playerCount; i++) {
            var p = createPlayer(i, names[i] || ('Player ' + (i + 1)), buyIn, i === 0);
            p.personality = personalities[i] || null;
            this.players.push(p);
        }

        this.dealerIndex = 0;
        this.handNumber = 0;
        this.phase = PHASE.WAITING;
    };

    /**
     * Receive shared personality system for AI dialogue.
     */
    PokerEngine.prototype.setSharedSystems = function(systems) {
        this.sharedSystems = systems;
    };

    /**
     * Register a callback for round end.
     */
    PokerEngine.prototype.onRoundEnd = function(callback) {
        this._roundEndCallbacks.push(callback);
    };

    /**
     * Register a callback for state changes.
     */
    PokerEngine.prototype.onStateChange = function(callback) {
        this._stateChangeCallbacks.push(callback);
    };

    /**
     * Register a callback for when an action is needed from the human.
     */
    PokerEngine.prototype.onActionNeeded = function(callback) {
        this._actionCallbacks.push(callback);
    };

    PokerEngine.prototype._fireStateChange = function() {
        var state = this.getState();
        for (var i = 0; i < this._stateChangeCallbacks.length; i++) {
            this._stateChangeCallbacks[i](state);
        }
    };

    PokerEngine.prototype._fireRoundEnd = function(results) {
        for (var i = 0; i < this._roundEndCallbacks.length; i++) {
            this._roundEndCallbacks[i](results);
        }
    };

    PokerEngine.prototype._fireActionNeeded = function(validActions) {
        for (var i = 0; i < this._actionCallbacks.length; i++) {
            this._actionCallbacks[i](validActions);
        }
    };

    /**
     * Start a new hand.
     */
    PokerEngine.prototype.start = function() {
        this.handNumber++;

        // Remove busted players
        for (var i = this.players.length - 1; i >= 0; i--) {
            if (this.players[i].chips <= 0 && !this.players[i].isHuman) {
                this.players.splice(i, 1);
            }
        }

        // Re-index positions
        for (var i = 0; i < this.players.length; i++) {
            this.players[i].id = i;
            this.players[i].position = i;
        }

        if (this.players.length < 2) return;

        // Reset player states
        for (var i = 0; i < this.players.length; i++) {
            var p = this.players[i];
            p.cards = [];
            p.bet = 0;
            p.totalBetThisHand = 0;
            p.folded = false;
            p.allIn = false;
            p.isDealer = false;
            p.lastAction = null;
        }

        // Rotate dealer
        this.dealerIndex = this.dealerIndex % this.players.length;
        this.players[this.dealerIndex].isDealer = true;

        // Reset table
        this.communityCards = [];
        this.pot = 0;
        this.sidePots = [];
        this.currentBet = 0;
        this.minRaise = this.bigBlind;
        this.lastAggressor = -1;

        // Create and shuffle deck
        this.deck = new Cards.Deck();
        this.deck.shuffle();

        // Post blinds
        this._postBlinds();

        // Deal hole cards
        this.dealHoleCards();

        // Start pre-flop betting
        this.phase = PHASE.PRE_FLOP;
        this._fireStateChange();

        // Start betting after big blind
        var bbIndex = this._getBigBlindIndex();
        this.currentPlayerIndex = (bbIndex + 1) % this.players.length;
        this._skipFoldedAndAllIn();

        this._promptCurrentPlayer();
    };

    /**
     * Get small blind player index.
     */
    PokerEngine.prototype._getSmallBlindIndex = function() {
        if (this.players.length === 2) {
            return this.dealerIndex;
        }
        return (this.dealerIndex + 1) % this.players.length;
    };

    /**
     * Get big blind player index.
     */
    PokerEngine.prototype._getBigBlindIndex = function() {
        if (this.players.length === 2) {
            return (this.dealerIndex + 1) % this.players.length;
        }
        return (this.dealerIndex + 2) % this.players.length;
    };

    /**
     * Post small and big blinds.
     */
    PokerEngine.prototype._postBlinds = function() {
        var sbIndex = this._getSmallBlindIndex();
        var bbIndex = this._getBigBlindIndex();

        this._placeBet(sbIndex, Math.min(this.smallBlind, this.players[sbIndex].chips));
        this._placeBet(bbIndex, Math.min(this.bigBlind, this.players[bbIndex].chips));

        this.currentBet = this.bigBlind;
    };

    /**
     * Place a bet for a player.
     */
    PokerEngine.prototype._placeBet = function(playerIndex, amount) {
        var p = this.players[playerIndex];
        var actual = Math.min(amount, p.chips);
        p.chips -= actual;
        p.bet += actual;
        p.totalBetThisHand += actual;
        if (p.chips === 0) {
            p.allIn = true;
        }
        return actual;
    };

    /**
     * Deal 2 hole cards to each player.
     */
    PokerEngine.prototype.dealHoleCards = function() {
        for (var round = 0; round < 2; round++) {
            for (var i = 0; i < this.players.length; i++) {
                var idx = (this.dealerIndex + 1 + i) % this.players.length;
                if (!this.players[idx].folded) {
                    this.players[idx].cards = this.players[idx].cards.concat(this.deck.deal(1));
                }
            }
        }
    };

    /**
     * Deal community cards.
     * @param {number} count - 3 for flop, 1 for turn/river
     */
    PokerEngine.prototype.dealCommunityCards = function(count) {
        // Burn one card
        this.deck.deal(1);
        var dealt = this.deck.deal(count);
        this.communityCards = this.communityCards.concat(dealt);
    };

    /**
     * Skip folded and all-in players.
     */
    PokerEngine.prototype._skipFoldedAndAllIn = function() {
        var attempts = 0;
        while (attempts < this.players.length) {
            var p = this.players[this.currentPlayerIndex];
            if (!p.folded && !p.allIn) break;
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
            attempts++;
        }
    };

    /**
     * Count active (non-folded) players.
     */
    PokerEngine.prototype._activePlayers = function() {
        var count = 0;
        for (var i = 0; i < this.players.length; i++) {
            if (!this.players[i].folded) count++;
        }
        return count;
    };

    /**
     * Count players who can still act (not folded, not all-in).
     */
    PokerEngine.prototype._actingPlayers = function() {
        var count = 0;
        for (var i = 0; i < this.players.length; i++) {
            if (!this.players[i].folded && !this.players[i].allIn) count++;
        }
        return count;
    };

    /**
     * Prompt the current player for action (human or AI).
     */
    PokerEngine.prototype._promptCurrentPlayer = function() {
        if (this._activePlayers() <= 1) {
            this._awardPotToLastPlayer();
            return;
        }

        var p = this.players[this.currentPlayerIndex];

        if (p.isHuman) {
            this._waitingForHuman = true;
            this._fireActionNeeded(this._getValidActions(this.currentPlayerIndex));
            this._fireStateChange();
        } else {
            this._fireStateChange();
            // AI acts after a short delay for feel
            var self = this;
            setTimeout(function() {
                self._aiAct(self.currentPlayerIndex);
            }, 600);
        }
    };

    /**
     * Get valid actions for a player.
     */
    PokerEngine.prototype._getValidActions = function(playerIndex) {
        var p = this.players[playerIndex];
        var actions = [];

        actions.push(ACTION.FOLD);

        if (p.bet >= this.currentBet) {
            actions.push(ACTION.CHECK);
        } else {
            actions.push(ACTION.CALL);
        }

        // Can raise if they have chips beyond the call amount
        var callAmount = this.currentBet - p.bet;
        if (p.chips > callAmount) {
            actions.push(ACTION.RAISE);
        }

        actions.push(ACTION.ALLIN);

        return {
            actions: actions,
            callAmount: Math.min(callAmount, p.chips),
            minRaise: Math.min(this.currentBet + this.minRaise, p.chips + p.bet),
            maxRaise: p.chips + p.bet,
            pot: this._calculateTotalPot()
        };
    };

    /**
     * AI player decides and acts.
     */
    PokerEngine.prototype._aiAct = function(playerIndex) {
        var PokerAI = root.MJ.Poker.AI;
        var p = this.players[playerIndex];
        var state = this.getState();

        var action;
        if (PokerAI && PokerAI.decideAction) {
            action = PokerAI.decideAction(p, state, p.personality);
        } else {
            // Fallback: simple AI
            var callAmt = this.currentBet - p.bet;
            if (callAmt <= 0) {
                action = { type: ACTION.CHECK };
            } else if (callAmt <= p.chips * 0.1) {
                action = { type: ACTION.CALL };
            } else {
                action = { type: ACTION.FOLD };
            }
        }

        this.handlePlayerAction(action);
    };

    /**
     * Handle a player action from the current player.
     * @param {Object} action - {type: string, amount?: number}
     */
    PokerEngine.prototype.handlePlayerAction = function(action) {
        var pIndex = this.currentPlayerIndex;
        var p = this.players[pIndex];

        if (p.folded || p.allIn) return;

        var callAmount = this.currentBet - p.bet;

        switch (action.type) {
            case ACTION.FOLD:
                p.folded = true;
                p.lastAction = 'Fold';
                break;

            case ACTION.CHECK:
                if (callAmount > 0) {
                    // Can't check, must call or fold; treat as fold
                    p.folded = true;
                    p.lastAction = 'Fold';
                } else {
                    p.lastAction = 'Check';
                }
                break;

            case ACTION.CALL:
                var bet = this._placeBet(pIndex, callAmount);
                p.lastAction = 'Call ' + bet;
                break;

            case ACTION.RAISE:
                var raiseAmount = action.amount || (this.currentBet + this.minRaise);
                var totalBet = raiseAmount - p.bet;
                if (totalBet >= p.chips) {
                    // All-in via raise
                    this._placeBet(pIndex, p.chips);
                    p.lastAction = 'All-In ' + (p.bet);
                } else {
                    this._placeBet(pIndex, totalBet);
                    this.minRaise = p.bet - this.currentBet;
                    if (this.minRaise < this.bigBlind) this.minRaise = this.bigBlind;
                    this.currentBet = p.bet;
                    this.lastAggressor = pIndex;
                    p.lastAction = 'Raise to ' + p.bet;
                    // Reset acted tracking so others must respond
                    this.actedThisRound = {};
                    this.actedThisRound[pIndex] = true;
                }
                break;

            case ACTION.ALLIN:
                var allInAmount = p.chips;
                this._placeBet(pIndex, allInAmount);
                if (p.bet > this.currentBet) {
                    this.minRaise = p.bet - this.currentBet;
                    if (this.minRaise < this.bigBlind) this.minRaise = this.bigBlind;
                    this.currentBet = p.bet;
                    this.lastAggressor = pIndex;
                    this.actedThisRound = {};
                }
                p.lastAction = 'All-In ' + p.bet;
                break;
        }

        this.actedThisRound[pIndex] = true;
        this._waitingForHuman = false;

        // Check if hand is over (one player left)
        if (this._activePlayers() <= 1) {
            this._awardPotToLastPlayer();
            return;
        }

        // Advance to next player
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        this._skipFoldedAndAllIn();

        // Check if betting round is complete
        if (this._isBettingRoundComplete()) {
            this._endBettingRound();
        } else {
            this._promptCurrentPlayer();
        }
    };

    /**
     * Check if the current betting round is complete.
     */
    PokerEngine.prototype._isBettingRoundComplete = function() {
        for (var i = 0; i < this.players.length; i++) {
            var p = this.players[i];
            if (p.folded || p.allIn) continue;
            if (!this.actedThisRound[i]) return false;
            if (p.bet < this.currentBet) return false;
        }
        return true;
    };

    /**
     * End the current betting round, move to the next phase.
     */
    PokerEngine.prototype._endBettingRound = function() {
        // Collect bets into pot
        this._collectBets();

        // If only one active player or all but one are all-in, deal remaining and showdown
        if (this._actingPlayers() <= 1 && this._activePlayers() > 1) {
            // Deal remaining community cards and go to showdown
            this._dealRemainingAndShowdown();
            return;
        }

        switch (this.phase) {
            case PHASE.PRE_FLOP:
                this.phase = PHASE.FLOP;
                this.dealCommunityCards(3);
                break;
            case PHASE.FLOP:
                this.phase = PHASE.TURN;
                this.dealCommunityCards(1);
                break;
            case PHASE.TURN:
                this.phase = PHASE.RIVER;
                this.dealCommunityCards(1);
                break;
            case PHASE.RIVER:
                this.showdown();
                return;
        }

        // Reset for new betting round
        this.currentBet = 0;
        this.minRaise = this.bigBlind;
        this.actedThisRound = {};
        this.lastAggressor = -1;

        // First to act after dealer
        this.currentPlayerIndex = (this.dealerIndex + 1) % this.players.length;
        this._skipFoldedAndAllIn();

        this._fireStateChange();
        this._promptCurrentPlayer();
    };

    /**
     * Collect all bets into the pot, resetting player bets.
     */
    PokerEngine.prototype._collectBets = function() {
        for (var i = 0; i < this.players.length; i++) {
            this.pot += this.players[i].bet;
            this.players[i].bet = 0;
        }
    };

    /**
     * Calculate total pot including current bets.
     */
    PokerEngine.prototype._calculateTotalPot = function() {
        var total = this.pot;
        for (var i = 0; i < this.players.length; i++) {
            total += this.players[i].bet;
        }
        return total;
    };

    /**
     * Deal remaining community cards and proceed to showdown (for all-in scenarios).
     */
    PokerEngine.prototype._dealRemainingAndShowdown = function() {
        while (this.communityCards.length < 5) {
            var count = this.communityCards.length === 0 ? 3 : 1;
            this.dealCommunityCards(count);
        }
        this._collectBets();
        this.showdown();
    };

    /**
     * Award pot to last remaining player when all others folded.
     */
    PokerEngine.prototype._awardPotToLastPlayer = function() {
        this._collectBets();

        var winner = null;
        for (var i = 0; i < this.players.length; i++) {
            if (!this.players[i].folded) {
                winner = this.players[i];
                break;
            }
        }

        if (winner) {
            winner.chips += this.pot;
        }

        this.phase = PHASE.HAND_OVER;

        var results = {
            winners: winner ? [{ player: winner, amount: this.pot, hand: null }] : [],
            pot: this.pot,
            handNumber: this.handNumber
        };

        this.pot = 0;
        this._fireStateChange();
        this._fireRoundEnd(results);

        // Advance dealer for next hand
        this.dealerIndex = (this.dealerIndex + 1) % this.players.length;
    };

    /**
     * Perform showdown: evaluate hands, determine winners, distribute pot.
     */
    PokerEngine.prototype.showdown = function() {
        this.phase = PHASE.SHOWDOWN;
        this._collectBets();

        // Evaluate hands for all active players
        var activePlayers = [];
        for (var i = 0; i < this.players.length; i++) {
            if (!this.players[i].folded) {
                var hand = HandEval.getBestHand(this.players[i].cards, this.communityCards);
                activePlayers.push({
                    player: this.players[i],
                    hand: hand
                });
            }
        }

        // Calculate side pots
        var pots = this._calculateSidePots();
        var results = { winners: [], pot: this.pot, handNumber: this.handNumber, showdownHands: activePlayers };

        // For each pot, determine winner(s)
        for (var p = 0; p < pots.length; p++) {
            var potInfo = pots[p];
            var eligible = activePlayers.filter(function(ap) {
                return potInfo.eligible.indexOf(ap.player.id) !== -1;
            });

            if (eligible.length === 0) continue;

            // Find best hand among eligible
            eligible.sort(function(a, b) {
                return HandEval.compareHands(b.hand, a.hand);
            });

            var bestValue = eligible[0].hand.value;
            var winners = eligible.filter(function(e) { return e.hand.value === bestValue; });
            var share = Math.floor(potInfo.amount / winners.length);

            for (var w = 0; w < winners.length; w++) {
                winners[w].player.chips += share;
                results.winners.push({
                    player: winners[w].player,
                    amount: share,
                    hand: winners[w].hand
                });
            }

            // Remainder goes to first winner (closest to dealer)
            var remainder = potInfo.amount - (share * winners.length);
            if (remainder > 0) {
                winners[0].player.chips += remainder;
            }
        }

        this.phase = PHASE.HAND_OVER;
        this.pot = 0;

        this._fireStateChange();
        this._fireRoundEnd(results);

        // Advance dealer
        this.dealerIndex = (this.dealerIndex + 1) % this.players.length;
    };

    /**
     * Calculate main pot and side pots for all-in scenarios.
     * @returns {Array<{amount, eligible}>}
     */
    PokerEngine.prototype._calculateSidePots = function() {
        // Gather total bets per player this hand
        var playerBets = [];
        for (var i = 0; i < this.players.length; i++) {
            if (!this.players[i].folded) {
                playerBets.push({
                    id: this.players[i].id,
                    totalBet: this.players[i].totalBetThisHand
                });
            }
        }

        // Also count folded players' bets (they contribute to pot but can't win)
        var foldedBets = 0;
        for (var i = 0; i < this.players.length; i++) {
            if (this.players[i].folded) {
                foldedBets += this.players[i].totalBetThisHand;
            }
        }

        if (playerBets.length === 0) {
            return [{ amount: this.pot, eligible: [] }];
        }

        // Sort by total bet ascending
        playerBets.sort(function(a, b) { return a.totalBet - b.totalBet; });

        var pots = [];
        var prevLevel = 0;

        for (var i = 0; i < playerBets.length; i++) {
            var level = playerBets[i].totalBet;
            if (level <= prevLevel) continue;

            var contribution = level - prevLevel;
            var potAmount = 0;
            var eligible = [];

            for (var j = 0; j < playerBets.length; j++) {
                if (playerBets[j].totalBet >= level) {
                    potAmount += contribution;
                    eligible.push(playerBets[j].id);
                } else if (playerBets[j].totalBet > prevLevel) {
                    potAmount += (playerBets[j].totalBet - prevLevel);
                }
            }

            // Add folded bets proportionally to the first pot
            if (pots.length === 0 && foldedBets > 0) {
                potAmount += foldedBets;
                foldedBets = 0;
            }

            pots.push({ amount: potAmount, eligible: eligible });
            prevLevel = level;
        }

        // If there are remaining folded bets and no pots, create one
        if (pots.length === 0) {
            var allIds = playerBets.map(function(pb) { return pb.id; });
            pots.push({ amount: this.pot, eligible: allIds });
        }

        return pots;
    };

    /**
     * Get the complete game state for rendering.
     */
    PokerEngine.prototype.getState = function() {
        var playerStates = [];
        for (var i = 0; i < this.players.length; i++) {
            var p = this.players[i];
            playerStates.push({
                id: p.id,
                name: p.name,
                chips: p.chips,
                cards: p.cards,
                bet: p.bet,
                totalBetThisHand: p.totalBetThisHand,
                folded: p.folded,
                allIn: p.allIn,
                isDealer: p.isDealer,
                isHuman: p.isHuman,
                position: p.position,
                lastAction: p.lastAction,
                personality: p.personality
            });
        }

        return {
            players: playerStates,
            communityCards: this.communityCards.slice(),
            pot: this._calculateTotalPot(),
            phase: this.phase,
            currentPlayerIndex: this.currentPlayerIndex,
            currentBet: this.currentBet,
            dealerIndex: this.dealerIndex,
            smallBlind: this.smallBlind,
            bigBlind: this.bigBlind,
            handNumber: this.handNumber,
            waitingForHuman: this._waitingForHuman,
            validActions: this._waitingForHuman ? this._getValidActions(this.currentPlayerIndex) : null
        };
    };

    /**
     * Calculate the current pot total.
     */
    PokerEngine.prototype.calculatePot = function() {
        return this._calculateTotalPot();
    };

    // Export
    root.MJ.Poker.Engine = {
        PokerEngine: PokerEngine,
        PHASE: PHASE,
        ACTION: ACTION,
        createPlayer: createPlayer
    };

})(typeof window !== 'undefined' ? window : global);
