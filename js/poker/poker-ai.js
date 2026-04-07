/**
 * poker-ai.js - Poker AI with personality-driven decision making
 * Exports under root.MJ.Poker.AI
 */
(function(exports) {
    const root = typeof window !== 'undefined' ? window : exports;
    root.MJ = root.MJ || {};
    root.MJ.Poker = root.MJ.Poker || {};

    var Cards = root.MJ.Poker.Cards;
    var HandEval = root.MJ.Poker.HandEval;

    // Pre-flop hand tier rankings
    // Tier 1: Premium hands, Tier 2: Strong, Tier 3: Playable, Tier 4: Speculative
    var STARTING_HAND_TIERS = {
        // Pairs
        'AA': 1, 'KK': 1, 'QQ': 1, 'JJ': 1,
        'TT': 2, '99': 2, '88': 3, '77': 3,
        '66': 4, '55': 4, '44': 4, '33': 4, '22': 4,
        // Suited broadway
        'AKs': 1, 'AQs': 1, 'AJs': 2, 'ATs': 2,
        'KQs': 2, 'KJs': 2, 'KTs': 3,
        'QJs': 2, 'QTs': 3,
        'JTs': 3,
        // Offsuit broadway
        'AKo': 1, 'AQo': 2, 'AJo': 3, 'ATo': 3,
        'KQo': 3, 'KJo': 3, 'KTo': 4,
        'QJo': 3, 'QTo': 4,
        'JTo': 4,
        // Suited connectors
        'T9s': 3, '98s': 3, '87s': 4, '76s': 4, '65s': 4, '54s': 4,
        // Suited aces
        'A9s': 3, 'A8s': 3, 'A7s': 4, 'A6s': 4, 'A5s': 3, 'A4s': 4, 'A3s': 4, 'A2s': 4
    };

    /**
     * Get a canonical starting hand key from two hole cards.
     */
    function getStartingHandKey(cards) {
        var c1 = cards[0];
        var c2 = cards[1];
        var r1 = c1.rank === '10' ? 'T' : c1.rank;
        var r2 = c2.rank === '10' ? 'T' : c2.rank;

        // Pair
        if (c1.value === c2.value) {
            return r1 + r2;
        }

        var high = c1.value > c2.value ? r1 : r2;
        var low = c1.value > c2.value ? r2 : r1;
        var suited = c1.suit === c2.suit ? 's' : 'o';

        return high + low + suited;
    }

    /**
     * Get the starting hand tier (1-4, or 5 for unranked/trash).
     */
    function getStartingHandTier(cards) {
        var key = getStartingHandKey(cards);
        return STARTING_HAND_TIERS[key] || 5;
    }

    // Personality profiles
    var PERSONALITY_PROFILES = {
        kenji: {
            aggression: 0.8,      // How often to raise vs call
            bluffFrequency: 0.35, // How often to bluff
            foldThreshold: 0.15,  // How bad a hand must be to fold
            tiltFactor: 0.2,      // Randomness / emotionality
            positionAwareness: 0.4,
            name: 'Kenji'
        },
        mei: {
            aggression: 0.3,
            bluffFrequency: 0.08,
            foldThreshold: 0.4,
            tiltFactor: 0.05,
            positionAwareness: 0.9,
            name: 'Mei'
        },
        yuki: {
            aggression: 0.55,
            bluffFrequency: 0.2,
            foldThreshold: 0.28,
            tiltFactor: 0.1,
            positionAwareness: 0.75,
            name: 'Yuki'
        }
    };

    var DEFAULT_PROFILE = {
        aggression: 0.5,
        bluffFrequency: 0.15,
        foldThreshold: 0.3,
        tiltFactor: 0.1,
        positionAwareness: 0.5,
        name: 'Default'
    };

    /**
     * Calculate pot odds.
     * @param {number} callAmount
     * @param {number} potSize
     * @returns {number} Ratio (0-1) of call to total
     */
    function calculatePotOdds(callAmount, potSize) {
        if (callAmount <= 0) return 0;
        return callAmount / (potSize + callAmount);
    }

    /**
     * Estimate hand strength via Monte Carlo simulation.
     * @param {Card[]} holeCards
     * @param {Card[]} community
     * @param {number} numOpponents
     * @returns {number} Win probability 0-1
     */
    function calculateHandStrength(holeCards, community, numOpponents) {
        if (!holeCards || holeCards.length < 2) return 0.5;

        var trials = 100;
        var wins = 0;
        var ties = 0;

        var knownCards = holeCards.concat(community);
        var communityNeeded = 5 - community.length;

        for (var t = 0; t < trials; t++) {
            // Build a temporary deck without known cards
            var tempDeck = new Cards.Deck();
            tempDeck.removeCards(knownCards);
            tempDeck.shuffle();

            // Deal remaining community cards
            var simCommunity = community.slice();
            for (var c = 0; c < communityNeeded; c++) {
                simCommunity.push(tempDeck.cards.shift());
            }

            // Evaluate our hand
            var ourHand = HandEval.getBestHand(holeCards, simCommunity);
            if (!ourHand) continue;

            // Simulate opponents
            var weWin = true;
            var isTie = false;
            for (var o = 0; o < numOpponents; o++) {
                if (tempDeck.cards.length < 2) break;
                var oppCards = [tempDeck.cards.shift(), tempDeck.cards.shift()];
                var oppHand = HandEval.getBestHand(oppCards, simCommunity);
                if (!oppHand) continue;

                var cmp = HandEval.compareHands(ourHand, oppHand);
                if (cmp < 0) {
                    weWin = false;
                    break;
                } else if (cmp === 0) {
                    isTie = true;
                }
            }

            if (weWin && !isTie) {
                wins++;
            } else if (weWin && isTie) {
                ties++;
            }
        }

        return (wins + ties * 0.5) / trials;
    }

    /**
     * Determine if the AI should bluff based on personality.
     * @param {Object} profile
     * @param {number} potSize
     * @param {string} position - 'early', 'middle', 'late'
     * @returns {boolean}
     */
    function shouldBluff(profile, potSize, position) {
        var base = profile.bluffFrequency;

        // Increase bluff frequency in late position
        if (position === 'late') {
            base += 0.1;
        } else if (position === 'early') {
            base -= 0.05;
        }

        // Bluff more with bigger pots (more to gain)
        if (potSize > 100) {
            base += 0.05;
        }

        // Tilt factor adds randomness
        base += (Math.random() - 0.5) * profile.tiltFactor;

        return Math.random() < Math.max(0, Math.min(1, base));
    }

    /**
     * Get position category.
     */
    function getPosition(playerIndex, dealerIndex, numPlayers) {
        var pos = (playerIndex - dealerIndex + numPlayers) % numPlayers;
        var third = numPlayers / 3;
        if (pos <= third) return 'early';
        if (pos <= third * 2) return 'middle';
        return 'late';
    }

    /**
     * Main AI decision function.
     * @param {Object} player - Player state
     * @param {Object} gameState - Full game state from engine
     * @param {string} personalityKey - 'mei', 'kenji', 'yuki'
     * @returns {{type: string, amount?: number}}
     */
    function decideAction(player, gameState, personalityKey) {
        var profile = PERSONALITY_PROFILES[personalityKey] || DEFAULT_PROFILE;
        var phase = gameState.phase;
        var callAmount = gameState.currentBet - player.bet;
        var potSize = gameState.pot;
        var numOpponents = 0;

        for (var i = 0; i < gameState.players.length; i++) {
            if (gameState.players[i].id !== player.id && !gameState.players[i].folded) {
                numOpponents++;
            }
        }

        var position = getPosition(player.id, gameState.dealerIndex, gameState.players.length);

        // Pre-flop strategy
        if (phase === 'pre_flop') {
            return preFlopDecision(player, gameState, profile, callAmount, potSize, position);
        }

        // Post-flop strategy
        return postFlopDecision(player, gameState, profile, callAmount, potSize, position, numOpponents);
    }

    /**
     * Pre-flop decision based on starting hand chart.
     */
    function preFlopDecision(player, gameState, profile, callAmount, potSize, position) {
        var tier = getStartingHandTier(player.cards);

        // Adjust tier thresholds based on personality
        var playTier = 3; // Default: play tier 1-3
        if (profile.aggression > 0.6) {
            playTier = 4; // Aggressive: play more hands
        } else if (profile.foldThreshold > 0.35) {
            playTier = 2; // Cautious: play fewer hands
        }

        // Position adjustment
        if (position === 'late') {
            playTier += 1;
        } else if (position === 'early' && profile.positionAwareness > 0.5) {
            playTier -= 1;
        }

        // Fold trash hands
        if (tier > playTier && tier > 3) {
            // Consider bluffing with trash
            if (shouldBluff(profile, potSize, position) && callAmount < gameState.bigBlind * 3) {
                return { type: 'raise', amount: gameState.currentBet + gameState.bigBlind * 2 };
            }
            return { type: 'fold' };
        }

        // Premium hands: raise
        if (tier <= 1) {
            var raiseAmt = gameState.currentBet + gameState.bigBlind * 3;
            if (callAmount > gameState.bigBlind * 10) {
                // Someone raised big, just call with non-AA
                if (player.cards[0].value === 14 && player.cards[1].value === 14) {
                    return { type: 'allin' };
                }
                return { type: 'call' };
            }
            return { type: 'raise', amount: Math.min(raiseAmt, player.chips + player.bet) };
        }

        // Strong hands
        if (tier <= 2) {
            if (callAmount <= 0) {
                if (Math.random() < profile.aggression) {
                    return { type: 'raise', amount: gameState.currentBet + gameState.bigBlind * 2 };
                }
                return { type: 'check' };
            }
            if (callAmount <= gameState.bigBlind * 6) {
                return { type: 'call' };
            }
            return { type: 'fold' };
        }

        // Playable hands
        if (tier <= playTier) {
            if (callAmount <= 0) {
                return { type: 'check' };
            }
            if (callAmount <= gameState.bigBlind * 3) {
                return { type: 'call' };
            }
            return { type: 'fold' };
        }

        return { type: 'fold' };
    }

    /**
     * Post-flop decision using hand strength and pot odds.
     */
    function postFlopDecision(player, gameState, profile, callAmount, potSize, position, numOpponents) {
        var community = gameState.communityCards;
        var handStrength = calculateHandStrength(player.cards, community, numOpponents);

        // Get actual hand evaluation if possible
        var currentHand = null;
        if (community.length >= 3) {
            currentHand = HandEval.getBestHand(player.cards, community);
        }

        var potOdds = calculatePotOdds(callAmount, potSize);
        var handRank = currentHand ? currentHand.rank : 0;

        // Strong hand: bet or raise
        if (handStrength > 0.75 || handRank >= 4) {
            if (callAmount <= 0) {
                // Bet for value
                var betSize = Math.floor(potSize * (0.5 + profile.aggression * 0.3));
                betSize = Math.max(betSize, gameState.bigBlind);
                return { type: 'raise', amount: Math.min(player.bet + betSize, player.chips + player.bet) };
            }
            // Call or raise
            if (Math.random() < profile.aggression && player.chips > callAmount * 2) {
                return { type: 'raise', amount: Math.min(gameState.currentBet + Math.floor(potSize * 0.6), player.chips + player.bet) };
            }
            return { type: 'call' };
        }

        // Medium hand: call if odds are right, sometimes bet
        if (handStrength > 0.45 || handRank >= 1) {
            if (callAmount <= 0) {
                // Consider betting
                if (Math.random() < profile.aggression * 0.6) {
                    var betSize = Math.floor(potSize * 0.4);
                    betSize = Math.max(betSize, gameState.bigBlind);
                    return { type: 'raise', amount: Math.min(player.bet + betSize, player.chips + player.bet) };
                }
                return { type: 'check' };
            }

            // Call if pot odds are favorable
            if (handStrength > potOdds + 0.05) {
                return { type: 'call' };
            }

            // Personality-based call
            if (Math.random() < (1 - profile.foldThreshold) * 0.5) {
                return { type: 'call' };
            }

            return { type: 'fold' };
        }

        // Weak hand: bluff or fold
        if (callAmount <= 0) {
            if (shouldBluff(profile, potSize, position)) {
                var bluffSize = Math.floor(potSize * (0.5 + Math.random() * 0.3));
                bluffSize = Math.max(bluffSize, gameState.bigBlind);
                return { type: 'raise', amount: Math.min(player.bet + bluffSize, player.chips + player.bet) };
            }
            return { type: 'check' };
        }

        // Small call with drawing potential
        if (callAmount <= gameState.bigBlind * 2 && handStrength > 0.3) {
            if (Math.random() < (1 - profile.foldThreshold)) {
                return { type: 'call' };
            }
        }

        // Bluff raise occasionally
        if (shouldBluff(profile, potSize, position) && player.chips > callAmount * 3) {
            return { type: 'raise', amount: Math.min(gameState.currentBet + Math.floor(potSize * 0.7), player.chips + player.bet) };
        }

        return { type: 'fold' };
    }

    // Export
    root.MJ.Poker.AI = {
        decideAction: decideAction,
        calculatePotOdds: calculatePotOdds,
        calculateHandStrength: calculateHandStrength,
        shouldBluff: shouldBluff,
        getStartingHandTier: getStartingHandTier,
        getStartingHandKey: getStartingHandKey,
        PERSONALITY_PROFILES: PERSONALITY_PROFILES
    };

})(typeof window !== 'undefined' ? window : global);
