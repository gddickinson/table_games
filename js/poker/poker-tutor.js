/**
 * poker-tutor.js — Poker-specific tutoring engine
 * Provides contextual advice, decision evaluation, hand review, and Q&A.
 * Exports under root.MJ.Poker.Tutor
 */
(function(exports) {
    'use strict';
    var root = typeof window !== 'undefined' ? window : exports;
    root.MJ = root.MJ || {};
    root.MJ.Poker = root.MJ.Poker || {};

    /* ------------------------------------------------------------------ */
    /*  Constants                                                         */
    /* ------------------------------------------------------------------ */

    var HAND_RANKS = {
        HIGH_CARD: 0, PAIR: 1, TWO_PAIR: 2, THREE_OF_A_KIND: 3,
        STRAIGHT: 4, FLUSH: 5, FULL_HOUSE: 6, FOUR_OF_A_KIND: 7,
        STRAIGHT_FLUSH: 8, ROYAL_FLUSH: 9
    };

    var HAND_NAMES = [
        'High Card', 'Pair', 'Two Pair', 'Three of a Kind',
        'Straight', 'Flush', 'Full House', 'Four of a Kind',
        'Straight Flush', 'Royal Flush'
    ];

    /** Premium / strong / playable classification for hole cards. */
    var TIER_PREMIUM   = 1;
    var TIER_STRONG    = 2;
    var TIER_PLAYABLE  = 3;
    var TIER_SPECULATIVE = 4;
    var TIER_TRASH     = 5;

    var TIER_LABELS = {
        1: 'premium',
        2: 'strong',
        3: 'playable',
        4: 'speculative',
        5: 'trash'
    };

    var POSITION_NAMES = {
        btn: 'the Button', sb: 'the Small Blind', bb: 'the Big Blind',
        utg: 'Under the Gun', utg1: 'UTG+1', mp: 'Middle Position',
        hj: 'the Hijack', co: 'the Cutoff'
    };

    /** Per-character scouting reports for the tutor. */
    var CHARACTER_TIPS = {
        mei: {
            summary: 'Mei is tight and math-driven. She rarely bluffs and folds to aggression.',
            tips: [
                'Bluff Mei often — she folds too much (fold threshold ~40%).',
                'Steal her blinds relentlessly from late position.',
                'When Mei raises or re-raises, she has a premium hand. Fold unless you have a monster.',
                'Do not slow-play against Mei. She will not pay you off without a strong hand.',
                'If Mei checks the flop after raising pre-flop, she is giving up. Take the pot.'
            ]
        },
        kenji: {
            summary: 'Kenji is loose and hyper-aggressive. He bluffs constantly and almost never folds.',
            tips: [
                'Do NOT bluff Kenji — he never folds (fold threshold ~15%).',
                'Call him down with medium-strength hands like top pair or even second pair.',
                'Trap him with sets and strong hands by check-raising.',
                'After Kenji loses a big pot he tilts — call him down even lighter.',
                'Let him fire multiple barrels into your strong hands. Do not raise him off his bluffs.'
            ]
        },
        yuki: {
            summary: 'Yuki is balanced and adapts to your play. She is the trickiest opponent.',
            tips: [
                'Play solid fundamental poker — do not get fancy against Yuki.',
                'Mix up your play so she cannot adjust to predictable patterns.',
                'You can bluff Yuki slightly more than a balanced rate, but do not overdo it.',
                'Value bet thinner — Yuki calls with a reasonable range so second pair can be good.',
                'Be patient. You grind edges against Yuki over many hands, not one big pot.'
            ]
        }
    };

    /* ------------------------------------------------------------------ */
    /*  Helper utilities                                                  */
    /* ------------------------------------------------------------------ */

    function rankValue(rank) {
        if (rank === 'A') return 14;
        if (rank === 'K') return 13;
        if (rank === 'Q') return 12;
        if (rank === 'J') return 11;
        return parseInt(rank, 10);
    }

    function isSuited(cards) {
        return cards.length === 2 && cards[0].suit === cards[1].suit;
    }

    function highCard(cards) {
        return Math.max(rankValue(cards[0].rank), rankValue(cards[1].rank));
    }

    function lowCard(cards) {
        return Math.min(rankValue(cards[0].rank), rankValue(cards[1].rank));
    }

    function isPair(cards) {
        return cards.length === 2 && cards[0].rank === cards[1].rank;
    }

    function cardLabel(cards) {
        var hi = highCard(cards);
        var lo = lowCard(cards);
        var names = { 14: 'A', 13: 'K', 12: 'Q', 11: 'J' };
        var hiStr = names[hi] || String(hi);
        var loStr = names[lo] || String(lo);
        if (isPair(cards)) return hiStr + hiStr;
        return hiStr + loStr + (isSuited(cards) ? 's' : 'o');
    }

    /* ------------------------------------------------------------------ */
    /*  Hand tier classification                                          */
    /* ------------------------------------------------------------------ */

    function classifyHand(cards) {
        if (!cards || cards.length < 2) return TIER_TRASH;
        var hi = highCard(cards);
        var lo = lowCard(cards);
        var suited = isSuited(cards);
        var pair = isPair(cards);
        var gap = hi - lo;

        // Premium
        if (pair && hi >= 11) return TIER_PREMIUM;                 // JJ+
        if (hi === 14 && lo === 13 && suited) return TIER_PREMIUM; // AKs

        // Strong
        if (hi === 14 && lo === 13) return TIER_STRONG;            // AKo
        if (hi === 14 && lo === 12) return TIER_STRONG;            // AQs, AQo
        if (pair && hi >= 9) return TIER_STRONG;                   // TT, 99
        if (hi === 13 && lo === 12 && suited) return TIER_STRONG;  // KQs
        if (hi === 14 && lo === 11 && suited) return TIER_STRONG;  // AJs

        // Playable
        if (pair && hi >= 6) return TIER_PLAYABLE;                 // 88-66
        if (hi === 14 && lo >= 10) return TIER_PLAYABLE;           // ATs+
        if (suited && hi >= 11 && gap <= 2) return TIER_PLAYABLE;  // KJs, QJs, KTs, QTs, JTs
        if (hi === 13 && lo === 12) return TIER_PLAYABLE;          // KQo
        if (hi === 14 && lo >= 9 && suited) return TIER_PLAYABLE;  // A9s

        // Speculative
        if (pair) return TIER_SPECULATIVE;                         // 55-22
        if (suited && gap <= 2 && lo >= 5) return TIER_SPECULATIVE; // suited connectors/gappers
        if (hi === 14 && suited) return TIER_SPECULATIVE;          // A2s-A8s
        if (suited && hi >= 10 && gap <= 3) return TIER_SPECULATIVE;

        return TIER_TRASH;
    }

    /* ------------------------------------------------------------------ */
    /*  Equity / outs helpers                                             */
    /* ------------------------------------------------------------------ */

    function countFlushOuts(holeCards, board) {
        if (!board || board.length < 3) return 0;
        var all = holeCards.concat(board);
        var suitCounts = {};
        for (var i = 0; i < all.length; i++) {
            suitCounts[all[i].suit] = (suitCounts[all[i].suit] || 0) + 1;
        }
        for (var s in suitCounts) {
            if (suitCounts[s] === 4) return 9;
        }
        return 0;
    }

    function countStraightOuts(holeCards, board) {
        if (!board || board.length < 3) return 0;
        var all = holeCards.concat(board);
        var values = {};
        for (var i = 0; i < all.length; i++) {
            var v = rankValue(all[i].rank);
            values[v] = true;
            if (v === 14) values[1] = true; // ace low
        }
        var oesd = 0;
        var gutshot = 0;
        // Check all windows of 5 consecutive values
        for (var start = 1; start <= 10; start++) {
            var have = 0;
            var missing = [];
            for (var j = start; j < start + 5; j++) {
                if (values[j]) { have++; } else { missing.push(j); }
            }
            if (have === 4 && missing.length === 1) {
                // Check if the missing card is on the edge (OESD) or interior (gutshot)
                var m = missing[0];
                if (m === start || m === start + 4) { oesd++; } else { gutshot++; }
            }
        }
        if (oesd >= 2) return 8;
        if (oesd >= 1) return 6;
        if (gutshot >= 1) return 4;
        return 0;
    }

    function totalOuts(holeCards, board) {
        var flush = countFlushOuts(holeCards, board);
        var straight = countStraightOuts(holeCards, board);
        // Avoid double-counting suited straight draws
        if (flush > 0 && straight > 0) {
            return flush + straight - 2;
        }
        return flush + straight;
    }

    function outsToEquity(outs, streetsLeft) {
        if (streetsLeft === 2) return Math.min(outs * 4, 100);
        return Math.min(outs * 2, 100);
    }

    function potOdds(potSize, costToCall) {
        if (!costToCall || costToCall <= 0) return 0;
        return Math.round((costToCall / (potSize + costToCall)) * 100);
    }

    /* ------------------------------------------------------------------ */
    /*  PokerTutor class                                                  */
    /* ------------------------------------------------------------------ */

    function PokerTutor() {
        this.hintLevel = 2;         // 0 = off, 1 = minimal, 2 = normal, 3 = verbose
        this.roundDecisions = [];   // record of decisions this hand
        this.handHistories = [];    // completed hand reviews
    }

    /* ---- Public API ---- */

    /**
     * Get contextual advice for the current game phase.
     * @param {object} player  - Player object with .cards (array of {rank, suit})
     * @param {object} state   - Game state with .phase, .board, .pot, .currentBet, .bigBlind, .position, .opponents
     * @returns {string} Advice message
     */
    PokerTutor.prototype.getAdvice = function(player, state) {
        if (this.hintLevel === 0) return '';
        var phase = state.phase || 'pre_flop';
        if (phase === 'pre_flop') {
            return this.preFlopAdvice(player.cards, state);
        }
        return this.postFlopAdvice(player, state);
    };

    /**
     * Pre-flop advice based on hand tier and position.
     */
    PokerTutor.prototype.preFlopAdvice = function(cards, state) {
        var tier = classifyHand(cards);
        var label = cardLabel(cards);
        var tierName = TIER_LABELS[tier];
        var posName = POSITION_NAMES[state.position] || state.position || 'your position';
        var bb = state.bigBlind || 100;
        var advice = [];

        advice.push('You have ' + label + ' \u2014 this is a ' + tierName + ' hand.');

        if (tier === TIER_PREMIUM) {
            advice.push('Raise to ' + (bb * 3) + ' (' + '3x the big blind). This hand is strong from any position.');
            if (state.currentBet && state.currentBet > bb) {
                advice.push('Someone raised ahead of you. Re-raise (3-bet) to about 3x their raise.');
            }
        } else if (tier === TIER_STRONG) {
            if (state.position === 'utg' || state.position === 'utg1') {
                advice.push('From ' + posName + ', open-raise to ' + (bb * 3) + '.');
            } else {
                advice.push('Raise to ' + (Math.round(bb * 2.5)) + ' from ' + posName + '.');
            }
            if (state.currentBet && state.currentBet > bb * 3) {
                advice.push('Facing a big raise, consider just calling and seeing a flop.');
            }
        } else if (tier === TIER_PLAYABLE) {
            if (state.position === 'utg' || state.position === 'utg1') {
                advice.push('This hand is too weak for early position. Fold.');
            } else if (state.position === 'btn' || state.position === 'co') {
                advice.push('Good hand for late position. Raise to steal or see a flop.');
            } else {
                advice.push('Playable from ' + posName + '. Call a small raise or open-raise if folded to you.');
            }
        } else if (tier === TIER_SPECULATIVE) {
            if (state.position === 'btn' || state.position === 'co' || state.position === 'bb') {
                advice.push('Speculative hand \u2014 play cheaply and try to hit big on the flop.');
            } else {
                advice.push('Too speculative for this position. Fold.');
            }
        } else {
            advice.push('This is the kind of hand you should fold every time. Save your chips.');
            if (label === '72o') {
                advice.push('7-2 offsuit is famously the worst hand in poker!');
            }
        }

        return advice.join(' ');
    };

    /**
     * Post-flop advice: analyze hand strength, draws, and board texture.
     */
    PokerTutor.prototype.postFlopAdvice = function(player, state) {
        var cards = player.cards;
        var board = state.board || [];
        var advice = [];

        // Try to use the project's HandEval if available
        var HandEval = root.MJ && root.MJ.Poker && root.MJ.Poker.HandEval;
        var handResult = null;
        if (HandEval && typeof HandEval.evaluate === 'function') {
            handResult = HandEval.evaluate(cards.concat(board));
        }

        if (handResult) {
            var handName = HAND_NAMES[handResult.rank] || 'Unknown';
            advice.push('You currently have: ' + handName + '.');
        }

        // Outs and draws
        var outs = totalOuts(cards, board);
        var streetsLeft = board.length <= 3 ? 2 : 1;
        if (outs > 0) {
            var equity = outsToEquity(outs, streetsLeft);
            advice.push('You have ' + outs + ' outs (~' + equity + '% chance to improve).');

            if (countFlushOuts(cards, board) > 0) {
                advice.push('You have a flush draw with 9 outs.');
            }
            if (countStraightOuts(cards, board) >= 8) {
                advice.push('You have an open-ended straight draw.');
            } else if (countStraightOuts(cards, board) >= 4) {
                advice.push('You have a gutshot straight draw (4 outs).');
            }
        }

        // Pot odds check
        if (state.currentBet && state.currentBet > 0 && state.pot) {
            var po = potOdds(state.pot, state.currentBet);
            advice.push('Pot odds require ~' + po + '% equity to call.');
            if (outs > 0) {
                var eq = outsToEquity(outs, streetsLeft);
                if (eq >= po) {
                    advice.push('Your equity (' + eq + '%) beats the pot odds \u2014 calling is profitable.');
                } else {
                    advice.push('Your equity (' + eq + '%) is below pot odds \u2014 consider folding unless implied odds are good.');
                }
            }
        }

        // Board texture warnings
        if (board.length >= 3) {
            var suitCounts = {};
            for (var i = 0; i < board.length; i++) {
                suitCounts[board[i].suit] = (suitCounts[board[i].suit] || 0) + 1;
            }
            for (var s in suitCounts) {
                if (suitCounts[s] >= 3) {
                    advice.push('The board is very wet \u2014 three or more cards of the same suit. Watch out for flushes.');
                    break;
                }
            }
        }

        if (advice.length === 0) {
            advice.push('Evaluate the board carefully and consider your position before acting.');
        }

        return advice.join(' ');
    };

    /**
     * Evaluate a decision the player just made.
     */
    PokerTutor.prototype.evaluateDecision = function(player, state, action) {
        var tier = classifyHand(player.cards);
        var phase = state.phase || 'pre_flop';
        var result = { action: action, phase: phase, grade: 'B', feedback: '' };

        if (phase === 'pre_flop') {
            if (action === 'fold' && tier <= TIER_STRONG) {
                result.grade = 'D';
                result.feedback = 'You folded a ' + TIER_LABELS[tier] + ' hand. This is almost always too tight.';
            } else if (action === 'fold' && tier === TIER_TRASH) {
                result.grade = 'A';
                result.feedback = 'Good fold! That hand was too weak to play.';
            } else if (action === 'call' && tier === TIER_PREMIUM) {
                result.grade = 'C';
                result.feedback = 'With a premium hand you should raise, not just call. Build the pot!';
            } else if (action === 'raise' && tier <= TIER_STRONG) {
                result.grade = 'A';
                result.feedback = 'Great raise with a strong hand. Well played.';
            } else if (action === 'raise' && tier === TIER_TRASH) {
                var pos = state.position;
                if (pos === 'btn' || pos === 'co') {
                    result.grade = 'B';
                    result.feedback = 'A steal attempt from late position. Risky but can work against tight opponents.';
                } else {
                    result.grade = 'D';
                    result.feedback = 'Raising with a trash hand from early position is very risky. Consider folding.';
                }
            } else {
                result.grade = 'B';
                result.feedback = 'Reasonable play.';
            }
        } else {
            // Post-flop evaluation
            var outs = totalOuts(player.cards, state.board || []);
            if (action === 'call' && state.currentBet && state.pot) {
                var po = potOdds(state.pot, state.currentBet);
                var streetsLeft = (state.board || []).length <= 3 ? 2 : 1;
                var eq = outsToEquity(outs, streetsLeft);
                if (outs > 0 && eq >= po) {
                    result.grade = 'A';
                    result.feedback = 'Good call. You have the pot odds to chase your draw (' + eq + '% equity vs ' + po + '% needed).';
                } else if (outs > 0 && eq < po) {
                    result.grade = 'C';
                    result.feedback = 'Risky call. You\'re getting ' + po + '% pot odds but only have ~' + eq + '% equity.';
                } else {
                    result.grade = 'B';
                    result.feedback = 'Calling without a clear draw. Make sure you have a made hand.';
                }
            } else if (action === 'fold' && outs >= 9) {
                result.grade = 'C';
                result.feedback = 'You folded a strong draw with ' + outs + ' outs. Check the pot odds \u2014 you might have been priced in.';
            } else if (action === 'raise' && outs >= 8) {
                result.grade = 'A';
                result.feedback = 'Nice semi-bluff! Raising with a draw gives you two ways to win.';
            } else {
                result.grade = 'B';
                result.feedback = 'Reasonable play.';
            }
        }

        this.roundDecisions.push(result);
        return result;
    };

    /**
     * Generate a review after a complete hand.
     * @param {Array} handHistory - Array of decision objects from evaluateDecision
     * @returns {object} { overallGrade, summary, decisions }
     */
    PokerTutor.prototype.generateHandReview = function(handHistory) {
        var decisions = handHistory || this.roundDecisions;
        if (!decisions.length) {
            return { overallGrade: '-', summary: 'No decisions to review.', decisions: [] };
        }

        var gradeValues = { 'A': 4, 'B': 3, 'C': 2, 'D': 1, 'F': 0 };
        var gradeLetters = ['F', 'D', 'C', 'B', 'A'];
        var total = 0;
        for (var i = 0; i < decisions.length; i++) {
            total += (gradeValues[decisions[i].grade] || 0);
        }
        var avg = total / decisions.length;
        var overallGrade = gradeLetters[Math.min(Math.round(avg), 4)];

        var summary = '';
        if (overallGrade === 'A') {
            summary = 'Excellent play this hand! You made strong, well-reasoned decisions.';
        } else if (overallGrade === 'B') {
            summary = 'Solid play overall. A few small improvements possible.';
        } else if (overallGrade === 'C') {
            summary = 'Mixed results. Review the feedback below for areas to improve.';
        } else {
            summary = 'Several costly mistakes this hand. Study the feedback and focus on fundamentals.';
        }

        var review = {
            overallGrade: overallGrade,
            summary: summary,
            decisions: decisions.slice()
        };

        this.handHistories.push(review);
        this.roundDecisions = [];
        return review;
    };

    /**
     * Answer poker-specific questions in natural language.
     */
    PokerTutor.prototype.answerQuestion = function(question, player, state) {
        var q = (question || '').toLowerCase();

        // Pot odds questions
        if (q.indexOf('odds') !== -1 || q.indexOf('pot odds') !== -1) {
            if (state && state.pot && state.currentBet) {
                var po = potOdds(state.pot, state.currentBet);
                return 'The pot is ' + state.pot + ' and you need to call ' + state.currentBet +
                    '. That means you need at least ' + po + '% equity to call profitably.';
            }
            return 'Pot odds = Cost to Call / (Pot + Cost to Call). If your chance of winning exceeds the pot odds percentage, calling is profitable.';
        }

        // Should I call / fold
        if (q.indexOf('should i call') !== -1 || q.indexOf('should i fold') !== -1) {
            if (player && player.cards && state) {
                return this.getAdvice(player, state);
            }
            return 'I need to see your cards and the game state to give specific advice. Generally, call if the pot odds justify it and fold if they do not.';
        }

        // Hand ranking questions
        if (q.indexOf('what hand') !== -1 || q.indexOf('hand ranking') !== -1 || q.indexOf('what do i have') !== -1) {
            if (player && player.cards) {
                var label = cardLabel(player.cards);
                var tier = classifyHand(player.cards);
                var msg = 'You hold ' + label + ', a ' + TIER_LABELS[tier] + ' hand.';
                var HandEval = root.MJ && root.MJ.Poker && root.MJ.Poker.HandEval;
                if (HandEval && typeof HandEval.evaluate === 'function' && state && state.board && state.board.length >= 3) {
                    var result = HandEval.evaluate(player.cards.concat(state.board));
                    if (result) {
                        msg += ' With the board, you have ' + (HAND_NAMES[result.rank] || 'an unknown hand') + '.';
                    }
                }
                return msg;
            }
            return 'Hand rankings from best to worst: Royal Flush, Straight Flush, Four of a Kind, Full House, Flush, Straight, Three of a Kind, Two Pair, One Pair, High Card.';
        }

        // Bluffing questions
        if (q.indexOf('bluff') !== -1) {
            if (state && state.opponents) {
                var tips = [];
                for (var i = 0; i < state.opponents.length; i++) {
                    var opp = state.opponents[i];
                    var charId = (opp.characterId || opp.id || '').toLowerCase();
                    if (CHARACTER_TIPS[charId]) {
                        tips.push(CHARACTER_TIPS[charId].tips[0]);
                    }
                }
                if (tips.length > 0) {
                    return 'Bluffing tips for your opponents: ' + tips.join(' ');
                }
            }
            return 'Bluff when in position against few opponents on a scary board. Do not bluff calling stations. Semi-bluff with draws for two ways to win.';
        }

        // Character-specific questions
        if (q.indexOf('mei') !== -1 || q.indexOf('kenji') !== -1 || q.indexOf('yuki') !== -1) {
            var charMatch = q.indexOf('mei') !== -1 ? 'mei' : (q.indexOf('kenji') !== -1 ? 'kenji' : 'yuki');
            var info = CHARACTER_TIPS[charMatch];
            return info.summary + ' ' + info.tips.join(' ');
        }

        // Outs questions
        if (q.indexOf('outs') !== -1 || q.indexOf('draw') !== -1) {
            if (player && player.cards && state && state.board && state.board.length >= 3) {
                var outs = totalOuts(player.cards, state.board);
                if (outs > 0) {
                    var sl = state.board.length <= 3 ? 2 : 1;
                    return 'You have ' + outs + ' outs, giving you roughly ' + outsToEquity(outs, sl) + '% chance to improve.';
                }
                return 'You do not appear to have a significant draw right now.';
            }
            return 'Count your outs (cards that improve your hand), then multiply by 2 per street remaining. 9 outs = flush draw, 8 outs = open-ended straight draw, 4 outs = gutshot.';
        }

        // Position questions
        if (q.indexOf('position') !== -1) {
            return 'Position is crucial in poker. Acting last gives you information about what opponents did. Play tighter in early position and wider in late position (Cutoff and Button).';
        }

        // Default
        return 'I can help with pot odds, hand rankings, bluffing, opponent tips, position, and whether to call or fold. Ask me something specific!';
    };

    /**
     * Get tips for playing against a specific character.
     * @param {string} characterId - 'mei', 'kenji', or 'yuki'
     * @returns {object|null} { summary, tips }
     */
    PokerTutor.prototype.getCharacterTips = function(characterId) {
        var id = (characterId || '').toLowerCase();
        return CHARACTER_TIPS[id] || null;
    };

    /**
     * Set hint verbosity level.
     * @param {number} level - 0 (off), 1 (minimal), 2 (normal), 3 (verbose)
     */
    PokerTutor.prototype.setHintLevel = function(level) {
        this.hintLevel = Math.max(0, Math.min(3, level));
    };

    /**
     * Reset state for a new hand.
     */
    PokerTutor.prototype.resetHand = function() {
        this.roundDecisions = [];
    };

    /* ------------------------------------------------------------------ */
    /*  Export                                                             */
    /* ------------------------------------------------------------------ */

    root.MJ.Poker.Tutor = {
        PokerTutor: PokerTutor,
        classifyHand: classifyHand,
        cardLabel: cardLabel,
        potOdds: potOdds,
        totalOuts: totalOuts,
        outsToEquity: outsToEquity,
        CHARACTER_TIPS: CHARACTER_TIPS,
        TIER_LABELS: TIER_LABELS
    };

})(typeof exports !== 'undefined' ? exports : this);
