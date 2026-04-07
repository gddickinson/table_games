/*  character-learning.js — Characters that learn and adapt to the human player's patterns
 *  Exports: root.MJ.CharacterLearning
 */
(function(exports) {
  'use strict';
  var root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  // ---------------------------------------------------------------------------
  // CharacterLearning — builds a model of the human player over time
  // ---------------------------------------------------------------------------
  class CharacterLearning {
    constructor(characterId) {
      this.characterId = characterId;
      this.playerModel = this.load();
    }

    load() {
      try {
        var d = JSON.parse(localStorage.getItem('mj_charlearn_' + this.characterId));
        return d || this.defaultModel();
      } catch (e) { return this.defaultModel(); }
    }

    save() {
      try {
        localStorage.setItem(
          'mj_charlearn_' + this.characterId,
          JSON.stringify(this.playerModel)
        );
      } catch (e) { /* storage unavailable */ }
    }

    defaultModel() {
      return {
        observations: {
          prefersFlush: 0,          // -1 to 1 (negative = rarely, positive = often)
          prefersConcealed: 0,      // tendency to keep hand closed
          claimsMelds: 0,           // frequency of claiming discards
          foldsToRiichi: 0,         // does player fold when opponent declares riichi?
          riichiFrequency: 0,       // how often they declare riichi themselves
          avgShanten: 3,            // typical shanten at discard time
          favoredSuit: null,        // which suit they gravitate toward ('m','p','s')
          dealInRate: 0.2,          // how often they deal into a winning hand
          aggressiveness: 0.5,      // overall aggression level 0-1
          skillLevel: 0.5,          // estimated skill 0-1
          tenpaiSpeed: 0.5,         // how quickly they reach tenpai
          defensiveDiscards: 0.5,   // frequency of safe-tile discards under pressure
          winRate: 0.25             // observed win rate
        },
        sampleCount: 0,
        roundsObserved: 0,
        winsObserved: 0,
        dealInsObserved: 0,
        lastUpdated: 0,
        commentary: []  // insight tags the character has already noticed
      };
    }

    // -----------------------------------------------------------------------
    // observe — watch a player action and update the model
    // -----------------------------------------------------------------------
    observe(action, data) {
      var m = this.playerModel;
      var alpha = Math.max(0.05, 0.2 / (1 + m.sampleCount * 0.01)); // decaying learning rate
      m.sampleCount++;
      data = data || {};

      switch (action) {
        case 'discard':
          // Early discard of off-suit tiles hints at flush play
          if (data.tile && data.turn !== undefined && data.turn < 5) {
            if (data.suitConcentration !== undefined && data.suitConcentration > 0.6) {
              m.observations.prefersFlush =
                m.observations.prefersFlush * (1 - alpha) + alpha;
            } else {
              m.observations.prefersFlush =
                m.observations.prefersFlush * (1 - alpha * 0.3);
            }
          }
          // Track favored suit
          if (data.handSuits) {
            var max = 0; var best = null;
            for (var suit in data.handSuits) {
              if (data.handSuits[suit] > max) { max = data.handSuits[suit]; best = suit; }
            }
            if (best && max > 6) m.observations.favoredSuit = best;
          }
          // Track shanten
          if (data.shanten !== undefined) {
            m.observations.avgShanten =
              m.observations.avgShanten * (1 - alpha) + data.shanten * alpha;
          }
          // Defensive discard detection
          if (data.isSafeTile && data.underPressure) {
            m.observations.defensiveDiscards =
              m.observations.defensiveDiscards * (1 - alpha) + alpha;
          }
          break;

        case 'claim':
          m.observations.claimsMelds =
            m.observations.claimsMelds * (1 - alpha) + alpha;
          m.observations.prefersConcealed =
            m.observations.prefersConcealed * (1 - alpha);
          break;

        case 'pass_claim':
          m.observations.claimsMelds =
            m.observations.claimsMelds * (1 - alpha);
          if (data.concealed) {
            m.observations.prefersConcealed =
              m.observations.prefersConcealed * (1 - alpha) + alpha;
          }
          break;

        case 'riichi':
          m.observations.riichiFrequency =
            m.observations.riichiFrequency * (1 - alpha) + alpha;
          // Riichi is inherently aggressive
          m.observations.aggressiveness =
            Math.min(1, m.observations.aggressiveness + 0.03);
          break;

        case 'fold':
          m.observations.foldsToRiichi =
            m.observations.foldsToRiichi * (1 - alpha) + alpha;
          m.observations.aggressiveness =
            Math.max(0, m.observations.aggressiveness - 0.02);
          break;

        case 'push_against_riichi':
          m.observations.foldsToRiichi =
            m.observations.foldsToRiichi * (1 - alpha);
          m.observations.aggressiveness =
            Math.min(1, m.observations.aggressiveness + 0.04);
          break;

        case 'deal_in':
          m.dealInsObserved++;
          m.observations.dealInRate =
            m.observations.dealInRate * (1 - alpha) + alpha;
          m.observations.aggressiveness =
            Math.min(1, m.observations.aggressiveness + 0.02);
          break;

        case 'win':
          m.winsObserved++;
          if (data.score !== undefined && data.score >= 25) {
            m.observations.aggressiveness =
              Math.min(1, m.observations.aggressiveness + 0.05);
          }
          if (data.concealed) {
            m.observations.prefersConcealed =
              Math.min(1, m.observations.prefersConcealed + 0.05);
          }
          if (data.turnCount !== undefined && data.turnCount < 10) {
            m.observations.tenpaiSpeed =
              m.observations.tenpaiSpeed * (1 - alpha) + alpha;
          }
          break;

        case 'round_end':
          m.roundsObserved++;
          break;

        case 'tsumo':
          m.winsObserved++;
          m.observations.prefersConcealed =
            Math.min(1, m.observations.prefersConcealed + 0.03);
          break;
      }

      // Derived: skill estimate from deal-in rate, win rate, and defensive play
      if (m.roundsObserved > 0) {
        m.observations.winRate = m.winsObserved / m.roundsObserved;
      }
      m.observations.skillLevel = Math.min(1, Math.max(0,
        (1 - m.observations.dealInRate) * 0.4 +
        m.observations.winRate * 0.3 +
        m.observations.defensiveDiscards * 0.3
      ));

      m.lastUpdated = Date.now();
      this.save();

      // Periodically check for new character insights
      return this.checkForInsight(action, data);
    }

    // -----------------------------------------------------------------------
    // checkForInsight — generate commentary tags when patterns emerge
    // -----------------------------------------------------------------------
    checkForInsight(action, data) {
      var m = this.playerModel;
      if (m.sampleCount < 8) return [];  // need some data first
      if (m.sampleCount % 10 !== 0) return []; // check every 10 observations

      var insights = [];

      if (m.observations.prefersFlush > 0.5 && m.commentary.indexOf('flush_lover') === -1) {
        m.commentary.push('flush_lover');
        insights.push('flush_tendency');
      }
      if (m.observations.prefersConcealed > 0.6 && m.commentary.indexOf('concealed_player') === -1) {
        m.commentary.push('concealed_player');
        insights.push('concealed_tendency');
      }
      if (m.observations.dealInRate > 0.35 && m.commentary.indexOf('reckless') === -1) {
        m.commentary.push('reckless');
        insights.push('reckless_play');
      }
      if (m.observations.foldsToRiichi > 0.7 && m.commentary.indexOf('cautious') === -1) {
        m.commentary.push('cautious');
        insights.push('overly_cautious');
      }
      if (m.observations.aggressiveness > 0.75 && m.commentary.indexOf('aggressive') === -1) {
        m.commentary.push('aggressive');
        insights.push('aggressive_play');
      }
      if (m.observations.claimsMelds > 0.6 && m.commentary.indexOf('open_player') === -1) {
        m.commentary.push('open_player');
        insights.push('open_tendency');
      }
      if (m.observations.riichiFrequency > 0.5 && m.commentary.indexOf('riichi_lover') === -1) {
        m.commentary.push('riichi_lover');
        insights.push('riichi_tendency');
      }
      if (m.observations.skillLevel > 0.75 && m.commentary.indexOf('skilled') === -1) {
        m.commentary.push('skilled');
        insights.push('skilled_player');
      }
      if (m.observations.tenpaiSpeed > 0.7 && m.commentary.indexOf('speed_demon') === -1) {
        m.commentary.push('speed_demon');
        insights.push('fast_tenpai');
      }

      if (insights.length) this.save();
      return insights;
    }

    // -----------------------------------------------------------------------
    // getInsightComment — character-voiced observation about the player
    // -----------------------------------------------------------------------
    getInsightComment(characterId) {
      var m = this.playerModel;
      var comments = {
        mei: {
          flush_tendency:    "I've noticed you really like going for flushes. I'm going to watch for that now.",
          concealed_tendency: "You keep your hand closed a lot. Smart -- but sometimes claiming is worth it.",
          reckless_play:     "You deal in a bit too often. Try checking the discard pool before throwing dangerous tiles.",
          overly_cautious:   "You fold every time someone declares riichi. Sometimes it's worth pushing if you're close.",
          aggressive_play:   "You play quite aggressively. I admire the courage, but the math says to be careful sometimes.",
          open_tendency:     "You claim a lot of tiles. Open hands are fast, but they limit your scoring potential.",
          riichi_tendency:   "You love declaring riichi! It's exciting, but it also tells everyone where you stand.",
          skilled_player:    "Your play is really solid. I need to step up my game against you.",
          fast_tenpai:       "You reach tenpai so quickly! Your tile efficiency must be excellent."
        },
        kenji: {
          flush_tendency:    "You always go for the flush! I see you. I'll be ready next time.",
          concealed_tendency: "Playing it close to the vest, huh? I respect that. But you're missing some claims.",
          reckless_play:     "Dude, you keep dealing in! Check the discards!",
          overly_cautious:   "Every time someone says riichi you fold like a lawn chair! Have some courage!",
          aggressive_play:   "Hey, an aggressive player! I like it. Finally someone who isn't afraid to push.",
          open_tendency:     "Claiming everything in sight, huh? I do that too. We're kindred spirits!",
          riichi_tendency:   "Another riichi?! You're a riichi machine! I love it, but I'm onto you now.",
          skilled_player:    "Okay, you're actually really good. I'm not gonna go easy anymore.",
          fast_tenpai:       "How are you in tenpai already?! That's not fair!"
        },
        yuki: {
          flush_tendency:    "Your affinity for single-suit hands reminds me of Takeshi. He loved the elegance of a pure flush.",
          concealed_tendency: "Patience is a virtue, and you have it in abundance. Your concealed play is maturing.",
          reckless_play:     "The brave and the reckless look similar, but the outcome is very different. Consider defense more.",
          overly_cautious:   "Defense has its place, but a life spent only avoiding loss is no life at all.",
          aggressive_play:   "You play with fire. Beautiful to watch, but fire doesn't distinguish friend from foe.",
          open_tendency:     "You open your hand freely. There is wisdom in speed, but also in mystery.",
          riichi_tendency:   "You declare riichi with such conviction. Takeshi was the same -- always announcing his intent to the world.",
          skilled_player:    "You've grown into a formidable player. It has been a privilege to watch.",
          fast_tenpai:       "Such speed to tenpai. You read the tiles like a poem -- each one in its place before I've finished the first line."
        }
      };

      var charComments = comments[characterId] || comments.mei;
      // Return the most recent un-spoken insight
      for (var i = m.commentary.length - 1; i >= 0; i--) {
        var tag = m.commentary[i];
        if (charComments[tag]) return charComments[tag];
      }
      return null;
    }

    // -----------------------------------------------------------------------
    // getCounterStrategy — AI adjusts its play based on observed tendencies
    // -----------------------------------------------------------------------
    getCounterStrategy() {
      var obs = this.playerModel.observations;
      var strategy = {};

      // If they love flushes, watch for suit concentration in their discards
      if (obs.prefersFlush > 0.5) {
        strategy.watchSuitConcentration = true;
        strategy.blockFlushSuit = obs.favoredSuit || null;
      }

      // If they always fold to riichi, declare more liberally to push them out
      if (obs.foldsToRiichi > 0.6) {
        strategy.bluffRiichi = true;
        strategy.riichiThreshold = -0.1; // lower the bar for riichi
      }

      // If they deal in a lot, push harder -- they will feed us tiles
      if (obs.dealInRate > 0.3) {
        strategy.pushMore = true;
        strategy.aggressionBoost = 0.15;
      }

      // If they keep hands concealed, expect hidden tenpai and play safer
      if (obs.prefersConcealed > 0.6) {
        strategy.expectConcealedHands = true;
        strategy.extraDefense = 0.1;
      }

      // If they claim a lot, their hand is readable -- exploit the information
      if (obs.claimsMelds > 0.6) {
        strategy.readOpenHand = true;
      }

      // Against skilled players, tighten up and avoid loose plays
      if (obs.skillLevel > 0.7) {
        strategy.playTight = true;
        strategy.aggressionBoost = (strategy.aggressionBoost || 0) - 0.1;
      }

      // Fast players demand faster responses
      if (obs.tenpaiSpeed > 0.65) {
        strategy.prioritizeSpeed = true;
      }

      return strategy;
    }

    // -----------------------------------------------------------------------
    // getModelSummary — expose a snapshot for debugging or UI display
    // -----------------------------------------------------------------------
    getModelSummary() {
      var m = this.playerModel;
      var result = {};
      for (var key in m.observations) {
        if (m.observations.hasOwnProperty(key)) {
          result[key] = m.observations[key];
        }
      }
      result.sampleCount = m.sampleCount;
      result.roundsObserved = m.roundsObserved;
      result.winsObserved = m.winsObserved;
      result.insightsDiscovered = m.commentary.length;
      return result;
    }

    // -----------------------------------------------------------------------
    // reset — clear all learned data for this character
    // -----------------------------------------------------------------------
    reset() {
      this.playerModel = this.defaultModel();
      this.save();
    }
  }

  // Public API
  root.MJ.CharacterLearning = CharacterLearning;

})(typeof window !== 'undefined' ? window : global);
