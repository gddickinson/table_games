/**
 * poker-living.js — Poker integration with living world systems
 *
 * Bridges poker gameplay into the existing living-world layer: achievements,
 * daily challenges, character dialogue triggers, story arcs, reputation
 * tracking, and cross-game character commentary.
 *
 * Exports: root.MJ.Poker.Living
 */
(function(root) {
  'use strict';

  root.MJ = root.MJ || {};
  root.MJ.Poker = root.MJ.Poker || {};

  // =========================================================================
  // Helpers
  // =========================================================================

  function pickRandom(arr) {
    if (!arr || !arr.length) return null;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // =========================================================================
  // PokerLivingWorld
  // =========================================================================

  class PokerLivingWorld {
    constructor() {
      this.pokerStats = null;
      this._loadStats();
    }

    // ── Persistence ───────────────────────────────────────────────

    _loadStats() {
      try {
        var raw = localStorage.getItem('mj_poker_living');
        if (raw) {
          this.pokerStats = JSON.parse(raw);
          return;
        }
      } catch (e) { /* ignore */ }

      this.pokerStats = {
        handsPlayed: 0,
        handsWon: 0,
        bigPots: 0,
        allInWins: 0,
        bluffWins: 0,
        bestHandRank: 0,
        currentStreak: 0,
        longestStreak: 0,
        totalChipsWon: 0,
        totalChipsLost: 0,
        folds: 0,
        consecutiveFolds: 0,
        comebackTriggered: false,
        lowestChipRatio: 1.0
      };
    }

    _saveStats() {
      try {
        localStorage.setItem('mj_poker_living', JSON.stringify(this.pokerStats));
      } catch (e) { /* ignore */ }
    }

    // ── Poker-specific achievements ───────────────────────────────

    getPokerAchievements() {
      return [
        {
          id: 'pk_first_win', name: 'First Pot',
          description: 'Win your first poker hand',
          icon: '\uD83C\uDCCF', category: 'Poker',
          check: function(e, d) { return e === 'poker_hand_end' && d.won; }
        },
        {
          id: 'pk_royal', name: 'Royal Flush!',
          description: 'Hit a Royal Flush',
          icon: '\uD83D\uDC51', category: 'Poker',
          check: function(e, d) { return e === 'poker_hand_end' && d.handRank === 9; }
        },
        {
          id: 'pk_bluff', name: 'Master Bluffer',
          description: 'Win a pot by bluffing (opponent folds to your bet with a weak hand)',
          icon: '\uD83C\uDFAD', category: 'Poker',
          check: function(e, d) { return e === 'poker_bluff_win'; }
        },
        {
          id: 'pk_comeback', name: 'Chip Comeback',
          description: 'Win a game after being down to 10% of starting chips',
          icon: '\uD83D\uDD25', category: 'Poker',
          check: function(e, d) { return e === 'poker_game_end' && d.comeback; }
        },
        {
          id: 'pk_allin_win', name: 'All In Hero',
          description: 'Win an all-in showdown',
          icon: '\uD83D\uDCAA', category: 'Poker',
          check: function(e, d) { return e === 'poker_allin_win'; }
        },
        {
          id: 'pk_streak', name: 'Hot Streak',
          description: 'Win 5 consecutive pots',
          icon: '\uD83D\uDD25', category: 'Poker',
          check: function(e, d) { return e === 'poker_streak' && d.count >= 5; }
        },
        {
          id: 'pk_fullhouse', name: 'Full Boat',
          description: 'Win with a Full House',
          icon: '\uD83D\uDEA2', category: 'Poker',
          check: function(e, d) { return e === 'poker_hand_end' && d.handRank === 6; }
        },
        {
          id: 'pk_straightflush', name: 'Near Perfect',
          description: 'Win with a Straight Flush',
          icon: '\u26A1', category: 'Poker',
          check: function(e, d) { return e === 'poker_hand_end' && d.handRank === 8; }
        },
        {
          id: 'pk_play50', name: 'Card Shark',
          description: 'Play 50 poker hands',
          icon: '\uD83E\uDD88', category: 'Poker',
          check: function(e, d) { return e === 'poker_milestone' && d.handsPlayed >= 50; }
        },
        {
          id: 'pk_play200', name: 'Professional',
          description: 'Play 200 poker hands',
          icon: '\uD83C\uDFB0', category: 'Poker',
          check: function(e, d) { return e === 'poker_milestone' && d.handsPlayed >= 200; }
        }
      ];
    }

    // ── Poker-specific daily challenges ───────────────────────────

    getPokerChallenges() {
      return [
        {
          name: 'Pocket Rockets',
          description: 'Win a hand with pocket Aces',
          xpBonus: 20,
          icon: '\uD83D\uDE80',
          check: function(e, d) {
            return e === 'poker_hand_end' && d.won && d.pocketAces;
          }
        },
        {
          name: 'Steal the Blinds',
          description: 'Win the pot pre-flop (everyone folds)',
          xpBonus: 10,
          icon: '\uD83E\uDD77',
          check: function(e, d) {
            return e === 'poker_preflop_win';
          }
        },
        {
          name: 'Read the Tell',
          description: 'Fold and avoid losing to a stronger hand',
          xpBonus: 15,
          icon: '\uD83D\uDC41\uFE0F',
          check: function(e, d) {
            return e === 'poker_good_fold';
          }
        },
        {
          name: 'Value Town',
          description: 'Win a pot worth 100+ chips',
          xpBonus: 15,
          icon: '\uD83D\uDCB0',
          check: function(e, d) {
            return e === 'poker_hand_end' && d.potWon >= 100;
          }
        },
        {
          name: 'Patience Pays',
          description: 'Fold 10 hands in a row, then win',
          xpBonus: 25,
          icon: '\u231B',
          check: function(e, d) {
            return e === 'poker_patience_win';
          }
        }
      ];
    }

    // ── Poker-specific character dialogue triggers ─────────────────

    getPokerEvents() {
      return {
        'poker_big_pot': {
          mei: 'anxious', kenji: 'excited', yuki: 'philosophical'
        },
        'poker_bad_beat': {
          mei: 'disappointed', kenji: 'tilted', yuki: 'accepting'
        },
        'poker_bluff_caught': {
          mei: 'embarrassed', kenji: 'frustrated', yuki: 'amused'
        },
        'poker_slow_roll': {
          mei: 'disapproving', kenji: 'angry', yuki: 'disappointed'
        },
        'poker_hero_call': {
          mei: 'impressed', kenji: 'shocked', yuki: 'proud'
        }
      };
    }

    /**
     * Get the emotional state a character should adopt for a given poker event.
     * @param {string} eventId — one of the keys from getPokerEvents()
     * @param {string} characterId — 'mei', 'kenji', or 'yuki'
     * @returns {string|null} The emotion string, or null if not found
     */
    getCharacterEmotion(eventId, characterId) {
      var events = this.getPokerEvents();
      if (events[eventId] && events[eventId][characterId]) {
        return events[eventId][characterId];
      }
      return null;
    }

    // ── Poker-specific story arcs ─────────────────────────────────

    getPokerStoryArcs() {
      return [
        {
          id: 'kenji_poker_past',
          trigger: function(data) {
            return data.pokerHandsPlayed >= 20 && data.relationships.kenji >= 3;
          },
          parts: [
            {
              from: 'kenji',
              text: "You know, poker was my life once. Professional circuit, big tournaments, the works. I was good. Maybe too good. I started thinking I was invincible."
            },
            {
              from: 'kenji',
              text: "The night I lost everything \u2014 and I mean EVERYTHING \u2014 I sat in my car for three hours. Couldn't drive. Couldn't think. That's when I decided to open the ramen shop."
            },
            {
              from: 'kenji',
              text: "Mahjong is better. Poker is you against everyone else. Mahjong is four people in conversation. And nobody loses their house over tiles."
            },
            {
              from: 'kenji',
              text: "But I still love the game. Playing with friends, no real stakes? That's the way poker should be. Thanks for playing with me."
            }
          ]
        },
        {
          id: 'yuki_takeshi_poker',
          trigger: function(data) {
            return data.pokerHandsPlayed >= 30 && data.relationships.yuki >= 4;
          },
          parts: [
            {
              from: 'yuki',
              text: "Takeshi hated poker. He said it was 'a game where deception is rewarded.' He preferred Mahjong because the tiles are honest."
            },
            {
              from: 'yuki',
              text: "But I always thought there was beauty in poker too. The courage it takes to bet on uncertainty. The grace of a well-timed fold. It's not deception \u2014 it's faith in your own judgment."
            },
            {
              from: 'yuki',
              text: "I wish I'd told him that. He might have enjoyed it."
            }
          ]
        },
        {
          id: 'mei_probability',
          trigger: function(data) {
            return data.pokerHandsPlayed >= 15 && data.relationships.mei >= 2;
          },
          parts: [
            {
              from: 'mei',
              text: "I've been running the numbers on our poker games. Did you know that Kenji bluffs 35% of the time? That's way above optimal."
            },
            {
              from: 'mei',
              text: "Don't tell him I said that. He thinks he's unpredictable. The data says otherwise."
            },
            {
              from: 'mei',
              text: "But honestly? Sometimes his recklessness works. Probability isn't everything. That's the hardest lesson for a data analyst."
            }
          ]
        }
      ];
    }

    /**
     * Check which story arcs should fire, given current world state.
     * Returns an array of arc objects whose triggers are satisfied and
     * that have not been previously shown.
     *
     * @param {Object} data — { pokerHandsPlayed, relationships: { mei, kenji, yuki } }
     * @param {Object} shownArcs — map of arc id -> boolean (already shown)
     * @returns {Array} Newly triggered arc objects
     */
    checkStoryArcs(data, shownArcs) {
      shownArcs = shownArcs || {};
      var arcs = this.getPokerStoryArcs();
      var triggered = [];
      for (var i = 0; i < arcs.length; i++) {
        if (shownArcs[arcs[i].id]) continue;
        try {
          if (arcs[i].trigger(data)) {
            triggered.push(arcs[i]);
          }
        } catch (e) { /* trigger evaluation failed */ }
      }
      return triggered;
    }

    // ── Poker hand recording & reputation XP/coin rewards ─────────

    /**
     * Record a completed poker hand and compute XP/coin rewards.
     *
     * @param {Object} result — hand result data
     * @param {boolean} result.won — did the player win this hand
     * @param {number}  result.potWon — chips won (0 if lost)
     * @param {number}  result.handRank — hand rank (0=high card .. 9=royal flush)
     * @param {boolean} result.allIn — was the hand an all-in showdown
     * @param {boolean} result.bluffWin — did the player win by bluffing
     * @param {number}  result.chipRatio — player chips / starting chips (for comeback)
     * @returns {Object} { xp, coins, milestoneEvent }
     */
    recordPokerHand(result) {
      var stats = this.pokerStats;
      stats.handsPlayed++;

      // Track streak
      if (result.won) {
        stats.handsWon++;
        stats.currentStreak++;
        if (stats.currentStreak > stats.longestStreak) {
          stats.longestStreak = stats.currentStreak;
        }
        stats.totalChipsWon += (result.potWon || 0);
      } else {
        stats.currentStreak = 0;
      }

      // Track best hand
      if (result.handRank > stats.bestHandRank) {
        stats.bestHandRank = result.handRank;
      }

      // Track big pots
      if (result.potWon >= 100) {
        stats.bigPots++;
      }

      // Track all-in wins
      if (result.allIn && result.won) {
        stats.allInWins++;
      }

      // Track bluff wins
      if (result.bluffWin) {
        stats.bluffWins++;
      }

      // Track folds for patience tracking
      if (result.folded) {
        stats.folds++;
        stats.consecutiveFolds++;
      } else {
        stats.consecutiveFolds = 0;
      }

      // Track chip ratio for comeback detection
      if (typeof result.chipRatio === 'number' && result.chipRatio < stats.lowestChipRatio) {
        stats.lowestChipRatio = result.chipRatio;
      }
      if (stats.lowestChipRatio <= 0.1 && result.won) {
        stats.comebackTriggered = true;
      }

      // Compute rewards
      var xp = 2;
      var coins = 1;
      if (result.won) { xp += 5; coins += 3; }
      if (result.potWon >= 100) { xp += 5; coins += 5; }
      if (result.handRank >= 5) { xp += 3; coins += 2; } // flush or better

      // Check milestones
      var milestoneEvent = null;
      if (stats.handsPlayed === 50 || stats.handsPlayed === 200) {
        milestoneEvent = {
          event: 'poker_milestone',
          data: { handsPlayed: stats.handsPlayed }
        };
      }

      this._saveStats();

      return { xp: xp, coins: coins, milestoneEvent: milestoneEvent };
    }

    // ── Cross-game character comments ─────────────────────────────

    /**
     * Get a character's comment when switching between mahjong and poker.
     *
     * @param {string} characterId — 'mei', 'kenji', or 'yuki'
     * @param {string} lastGamePlayed — 'mahjong' or 'poker'
     * @returns {string|null}
     */
    getCrossGameComment(characterId, lastGamePlayed) {
      var comments = {
        mei: {
          from_mahjong: 'Switching from tiles to cards \u2014 the math is different but the patterns are the same.',
          from_poker: 'Back to Mahjong! I missed the honesty of the tiles.'
        },
        kenji: {
          from_mahjong: 'Time for REAL gambling! Just kidding. Sort of.',
          from_poker: 'Tiles! My old friend. Poker is exciting but Mahjong is home.'
        },
        yuki: {
          from_mahjong: 'A different kind of conversation begins.',
          from_poker: 'The tiles welcome us back.'
        }
      };

      if (!comments[characterId]) return null;
      var key = 'from_' + lastGamePlayed;
      return comments[characterId][key] || null;
    }

    // ── Poker character dialogue banks ─────────────────────────────

    /**
     * Get a situational poker comment from a character.
     *
     * @param {string} characterId — 'mei', 'kenji', or 'yuki'
     * @param {string} situation — e.g. 'big_pot', 'bad_beat', 'won', 'lost', 'all_in'
     * @returns {string|null}
     */
    getPokerDialogue(characterId, situation) {
      var dialogue = {
        mei: {
          big_pot: [
            'That pot is getting dangerously large...',
            'My heart rate just went up. The data scientist in me says fold, but...'
          ],
          bad_beat: [
            'The probability of that was... actually, I\'d rather not calculate it.',
            'Sometimes the math just doesn\'t matter.'
          ],
          won: [
            'The odds were in my favor. This time.',
            'A clean win. No drama needed.'
          ],
          lost: [
            'I need to review my hand selection criteria.',
            'Variance happens. That\'s what I keep telling myself.'
          ],
          all_in: [
            'All in?! My anxiety does NOT approve.',
            'Deep breaths, Mei. It\'s just chips.'
          ]
        },
        kenji: {
          big_pot: [
            'NOW we\'re playing poker!',
            'This is what I live for. Big pots, big decisions.'
          ],
          bad_beat: [
            'You\'ve GOT to be kidding me. THAT card?!',
            'I swear, the poker gods have a grudge against me.'
          ],
          won: [
            'BOOM! Still got it!',
            'Just like the old days. Except without the crushing debt.'
          ],
          lost: [
            'The ramen shop doesn\'t care about bad beats. Neither should I.',
            'Okay. Deep breath. Next hand.'
          ],
          all_in: [
            'ALL IN, BABY! This is where legends are made!',
            'Fortune favors the bold! Let\'s GO!'
          ]
        },
        yuki: {
          big_pot: [
            'A lot rides on this moment. But then, a lot always does.',
            'The pot grows like a story building to its climax.'
          ],
          bad_beat: [
            'The cards owe us nothing. Not even fairness.',
            'Takeshi would say: "The river giveth, the river taketh away."'
          ],
          won: [
            'A small kindness from the cards.',
            'Every win is borrowed from future losses. Enjoy it.'
          ],
          lost: [
            'Losing teaches more than winning ever could.',
            'The cards are honest in their cruelty.'
          ],
          all_in: [
            'All in. The purest expression of conviction.',
            'To risk everything \u2014 there is courage in that, whatever the outcome.'
          ]
        }
      };

      if (!dialogue[characterId] || !dialogue[characterId][situation]) return null;
      return pickRandom(dialogue[characterId][situation]);
    }

    // ── Stat accessors ────────────────────────────────────────────

    getStats() {
      return Object.assign({}, this.pokerStats);
    }

    getStatsSummary() {
      var s = this.pokerStats;
      return {
        handsPlayed: s.handsPlayed,
        handsWon: s.handsWon,
        winRate: s.handsPlayed > 0
          ? ((s.handsWon / s.handsPlayed) * 100).toFixed(1) + '%'
          : '0%',
        bigPots: s.bigPots,
        longestStreak: s.longestStreak,
        bestHandRank: s.bestHandRank,
        totalChipsWon: s.totalChipsWon
      };
    }

    /**
     * Reset all poker living-world stats (for testing / new game).
     */
    resetStats() {
      this.pokerStats = {
        handsPlayed: 0,
        handsWon: 0,
        bigPots: 0,
        allInWins: 0,
        bluffWins: 0,
        bestHandRank: 0,
        currentStreak: 0,
        longestStreak: 0,
        totalChipsWon: 0,
        totalChipsLost: 0,
        folds: 0,
        consecutiveFolds: 0,
        comebackTriggered: false,
        lowestChipRatio: 1.0
      };
      this._saveStats();
    }
  }

  // =========================================================================
  // Export
  // =========================================================================

  root.MJ.Poker.Living = Object.freeze({
    PokerLivingWorld: PokerLivingWorld
  });

  if (typeof console !== 'undefined') {
    console.log('[Mahjong] Poker living-world module loaded');
  }

})(typeof window !== 'undefined' ? window : global);
