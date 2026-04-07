/**
 * cross-game-learning.js — Shared learning across all games
 *
 * Transfers emotional state, player observations, and meta-strategies
 * between Mahjong, Poker, Blackjack, and Dominoes.
 *
 * Key insight: if Kenji tilts in Poker, he should play worse in Mahjong too.
 * If the player always bluffs in Poker, characters should expect deception in all games.
 */
(function (exports) {
  'use strict';
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  const STORAGE_KEY = 'mj_cross_learning';

  class CrossGameLearning {
    constructor() { this.load(); }

    load() {
      try {
        const d = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (d) { this.state = d; return; }
      } catch (e) {}
      this.state = {
        // Character emotional carryover
        characterEmotions: { mei: 'neutral', kenji: 'neutral', yuki: 'neutral' },
        characterEmotionIntensity: { mei: 0, kenji: 0, yuki: 0 },
        lastGamePlayed: null,
        lastGameResult: null,

        // Player behavior profile (observed across ALL games)
        playerProfile: {
          aggression: 0.5,     // how aggressive across games (0=passive, 1=aggressive)
          riskTolerance: 0.5,  // willingness to take risks
          patience: 0.5,       // how long they wait for good hands
          bluffTendency: 0.3,  // how often they bluff/deceive
          foldRate: 0.5,       // how easily they give up
          adaptability: 0.5,   // how much they change strategy
          samples: 0
        },

        // Meta-strategy: patterns that work across games
        metaLessons: {
          // "Patience pays" — if patient play wins more across games
          patienceWinRate: 0.5,
          // "Aggression wins" — if aggressive play wins more
          aggressionWinRate: 0.5,
          // "Reading opponents matters" — if adapting to opponents improves results
          adaptiveWinRate: 0.5
        },

        // Character-specific cross-game memories
        characterMemories: {
          mei: { lastSawPlayerBluff: 0, playerAggressionScore: 0.5, gamesObserved: 0 },
          kenji: { lastSawPlayerBluff: 0, playerAggressionScore: 0.5, gamesObserved: 0 },
          yuki: { lastSawPlayerBluff: 0, playerAggressionScore: 0.5, gamesObserved: 0 }
        }
      };
    }

    save() {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state)); } catch (e) {}
    }

    /**
     * Record a game result — called from ANY game's round-end handler
     * @param {string} gameId - 'mahjong', 'poker', 'blackjack', 'dominoes'
     * @param {Object} result - { won, score, aggressive, patient, bluffed, dealtIn, ... }
     */
    recordGameResult(gameId, result) {
      this.state.lastGamePlayed = gameId;
      this.state.lastGameResult = result.won ? 'win' : 'loss';

      const alpha = 0.08; // learning rate
      const pp = this.state.playerProfile;
      pp.samples++;

      // Update player behavior profile
      if (result.aggressive !== undefined) {
        pp.aggression = pp.aggression * (1 - alpha) + (result.aggressive ? 1 : 0) * alpha;
      }
      if (result.patient !== undefined) {
        pp.patience = pp.patience * (1 - alpha) + (result.patient ? 1 : 0) * alpha;
      }
      if (result.bluffed !== undefined) {
        pp.bluffTendency = pp.bluffTendency * (1 - alpha) + (result.bluffed ? 1 : 0) * alpha;
      }
      if (result.folded !== undefined) {
        pp.foldRate = pp.foldRate * (1 - alpha) + (result.folded ? 1 : 0) * alpha;
      }

      // Update meta-lessons
      const ml = this.state.metaLessons;
      if (result.won) {
        if (result.patient) ml.patienceWinRate = ml.patienceWinRate * 0.95 + 0.05;
        if (result.aggressive) ml.aggressionWinRate = ml.aggressionWinRate * 0.95 + 0.05;
      } else {
        if (result.patient) ml.patienceWinRate = ml.patienceWinRate * 0.95;
        if (result.aggressive) ml.aggressionWinRate = ml.aggressionWinRate * 0.95;
      }

      // Update character emotions based on game outcome
      this.updateCharacterEmotions(gameId, result);

      // Update character memories about the player
      for (const charId of ['mei', 'kenji', 'yuki']) {
        const cm = this.state.characterMemories[charId];
        cm.gamesObserved++;
        if (result.bluffed) cm.lastSawPlayerBluff = Date.now();
        cm.playerAggressionScore = cm.playerAggressionScore * (1 - alpha) + pp.aggression * alpha;
      }

      this.save();
    }

    /**
     * Transfer emotions from one game to the next
     * Kenji losing at poker → tilted → plays worse at Mahjong
     */
    updateCharacterEmotions(gameId, result) {
      const emotions = this.state.characterEmotions;
      const intensity = this.state.characterEmotionIntensity;

      // Kenji tilts easily across games
      if (!result.won) {
        intensity.kenji = Math.min(1, (intensity.kenji || 0) + 0.15);
        if (intensity.kenji > 0.5) emotions.kenji = 'tilted';
        else emotions.kenji = 'frustrated';
      } else {
        intensity.kenji = Math.max(0, (intensity.kenji || 0) - 0.1);
        emotions.kenji = intensity.kenji > 0.3 ? 'competitive' : 'confident';
      }

      // Mei gets determined after losses, calm after wins
      if (!result.won) {
        intensity.mei = Math.min(1, (intensity.mei || 0) + 0.08);
        emotions.mei = 'determined';
      } else {
        intensity.mei = Math.max(0, (intensity.mei || 0) - 0.12);
        emotions.mei = 'satisfied';
      }

      // Yuki is unflappable — barely changes
      if (!result.won) {
        intensity.yuki = Math.min(0.4, (intensity.yuki || 0) + 0.03);
        emotions.yuki = 'contemplative';
      } else {
        intensity.yuki = Math.max(0, (intensity.yuki || 0) - 0.05);
        emotions.yuki = 'serene';
      }
    }

    /**
     * Get AI weight modifiers based on cross-game emotional state
     * Called by each game's AI before making decisions
     */
    getEmotionModifiers(characterId) {
      const emotion = this.state.characterEmotions[characterId] || 'neutral';
      const intensity = this.state.characterEmotionIntensity[characterId] || 0;

      const mods = { aggression: 0, defense: 0, riskTolerance: 0, patience: 0 };

      switch (emotion) {
        case 'tilted':
          mods.aggression = 0.15 * intensity;
          mods.defense = -0.2 * intensity;
          mods.patience = -0.15 * intensity;
          mods.riskTolerance = 0.2 * intensity;
          break;
        case 'frustrated':
          mods.aggression = 0.08 * intensity;
          mods.defense = -0.1 * intensity;
          break;
        case 'determined':
          mods.patience = 0.1 * intensity;
          mods.defense = 0.05 * intensity;
          break;
        case 'confident':
          mods.aggression = 0.05 * intensity;
          mods.riskTolerance = 0.05 * intensity;
          break;
        case 'competitive':
          mods.aggression = 0.1 * intensity;
          break;
        case 'satisfied':
        case 'serene':
        case 'contemplative':
        case 'neutral':
          // minimal or no modification
          break;
      }
      return mods;
    }

    /**
     * Get what characters have learned about the player across all games
     */
    getPlayerInsights(characterId) {
      const pp = this.state.playerProfile;
      const cm = this.state.characterMemories[characterId];
      if (!cm || cm.gamesObserved < 5) return null;

      const insights = [];
      if (pp.aggression > 0.65) insights.push('aggressive_player');
      if (pp.aggression < 0.35) insights.push('passive_player');
      if (pp.bluffTendency > 0.4) insights.push('frequent_bluffer');
      if (pp.foldRate > 0.6) insights.push('folds_easily');
      if (pp.patience > 0.65) insights.push('patient_player');

      return { insights, profile: { ...pp }, memories: { ...cm } };
    }

    /**
     * Get a cross-game comment from a character
     * "I noticed you bluff a lot in poker — I'll be watching for that here too."
     */
    getCrossGameComment(characterId, currentGame) {
      const pp = this.state.playerProfile;
      const lastGame = this.state.lastGamePlayed;
      const lastResult = this.state.lastGameResult;
      if (!lastGame || lastGame === currentGame || pp.samples < 3) return null;

      const comments = {
        mei: {
          aggressive_after_loss: 'You tend to play more aggressively after a loss. I\'ve noticed that across our games.',
          bluffer: 'Your bluffing frequency in poker is about ' + Math.round(pp.bluffTendency * 100) + '%. I keep track.',
          patient: 'You\'re a patient player. That serves you well in all these games.',
          after_win: 'You\'re riding a win from ' + lastGame + '. Confidence is good, but don\'t overextend.'
        },
        kenji: {
          aggressive_after_loss: 'You\'re fired up from losing at ' + lastGame + '! I know the feeling!',
          bluffer: 'I KNOW you bluff! I\'ve seen you do it in poker. Don\'t try it here!',
          patient: 'You\'re so patient it drives me CRAZY. Just make a move!',
          after_win: 'Won at ' + lastGame + '? Don\'t get cocky. THIS game is different.'
        },
        yuki: {
          aggressive_after_loss: 'The echoes of ' + lastGame + ' are still with you. Let them go.',
          bluffer: 'Deception travels between games, but so does honesty. Choose wisely.',
          patient: 'Your patience in one game nourishes your play in all games. Beautiful.',
          after_win: 'Victory in ' + lastGame + ' is a memory now. This moment is new.'
        }
      };

      const charComments = comments[characterId];
      if (!charComments) return null;

      if (lastResult === 'loss' && pp.aggression > 0.5) return charComments.aggressive_after_loss;
      if (pp.bluffTendency > 0.35) return charComments.bluffer;
      if (pp.patience > 0.6) return charComments.patient;
      if (lastResult === 'win') return charComments.after_win;
      return null;
    }

    getState() { return { ...this.state }; }

    reset() {
      localStorage.removeItem(STORAGE_KEY);
      this.load();
    }
  }

  root.MJ.CrossGameLearning = Object.freeze({ CrossGameLearning });

  if (typeof console !== 'undefined') console.log('[CrossGameLearning] Module loaded');
})(typeof window !== 'undefined' ? window : global);
