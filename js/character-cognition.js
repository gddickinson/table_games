/**
 * character-cognition.js — Deep character learning across all games
 *
 * Characters form generalized BELIEFS from experiences, not just stats.
 * They learn LESSONS that transfer between games.
 * They develop THEORIES about the player and other characters.
 * They remember SPECIFIC MOMENTS that shaped their understanding.
 */
(function (exports) {
  'use strict';
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  class CharacterCognition {
    constructor(characterId) {
      this.characterId = characterId;
      this.load();
    }

    load() {
      try {
        const d = JSON.parse(localStorage.getItem(`mj_cognition_${this.characterId}`));
        if (d) {
          this.beliefs = d.beliefs;
          this.lessons = d.lessons || [];
          this.keyMemories = d.keyMemories || [];
          this.theories = d.theories || [];
          this.patterns = d.patterns || { winAfterLoss: 0, loseAfterWin: 0, improvesOverTime: 0, worsensUnderPressure: 0, samples: 0 };
          this.totalInteractions = d.totalInteractions || 0;
          return;
        }
      } catch (e) {}

      // === BELIEF SYSTEM ===
      // Beliefs are generalized conclusions from experience
      // They evolve as evidence accumulates
      this.beliefs = {
        about_player: {
          // "The player is aggressive" — confidence 0-1, evidence count
          aggressive:   { value: 0.5, confidence: 0, evidence: 0 },
          patient:      { value: 0.5, confidence: 0, evidence: 0 },
          strategic:    { value: 0.5, confidence: 0, evidence: 0 },
          emotional:    { value: 0.5, confidence: 0, evidence: 0 },
          lucky:        { value: 0.5, confidence: 0, evidence: 0 },
          improving:    { value: 0.5, confidence: 0, evidence: 0 },
          trustworthy:  { value: 0.5, confidence: 0, evidence: 0 }, // do they bluff?
          competitive:  { value: 0.5, confidence: 0, evidence: 0 }
        },
        about_games: {
          // "Poker rewards aggression more than Mahjong"
          poker_favors_aggression: { value: 0.5, confidence: 0, evidence: 0 },
          mahjong_favors_patience: { value: 0.5, confidence: 0, evidence: 0 },
          bluffing_works:          { value: 0.5, confidence: 0, evidence: 0 },
          defense_matters:         { value: 0.5, confidence: 0, evidence: 0 },
          position_is_power:       { value: 0.5, confidence: 0, evidence: 0 }
        },
        about_self: {
          // "I play best when I'm calm"
          best_when_calm:      { value: 0.5, confidence: 0, evidence: 0 },
          tend_to_tilt:        { value: 0.5, confidence: 0, evidence: 0 },
          good_at_reading:     { value: 0.5, confidence: 0, evidence: 0 },
          need_more_patience:  { value: 0.5, confidence: 0, evidence: 0 }
        }
      };

      // === LESSONS LEARNED ===
      // Specific insights derived from game experiences
      // Each lesson has: text, source game, confidence, times reinforced
      this.lessons = [];

      // === KEY MEMORIES ===
      // Specific moments that were significant — not just stats
      // Each: {game, description, emotion, significance, timestamp, referenced: 0}
      this.keyMemories = [];

      // === THEORIES ===
      // Predictions/hypotheses about the player
      // Each: {text, basis, confidence, tested, correct}
      this.theories = [];

      // === GENERALIZATION ENGINE ===
      // Tracks patterns across games to form generalizations
      this.patterns = {
        winAfterLoss: 0,         // player bounces back after losses
        loseAfterWin: 0,         // player gets complacent
        improvesOverTime: 0,     // player gets better as session continues
        worsensUnderPressure: 0, // player plays worse with high stakes
        samples: 0
      };

      this.totalInteractions = 0;
    }

    save() {
      try {
        localStorage.setItem(`mj_cognition_${this.characterId}`, JSON.stringify({
          beliefs: this.beliefs,
          lessons: this.lessons.slice(-50),       // keep last 50 lessons
          keyMemories: this.keyMemories.slice(-30), // keep last 30 memories
          theories: this.theories.slice(-20),
          patterns: this.patterns,
          totalInteractions: this.totalInteractions
        }));
      } catch (e) {}
    }

    // -------------------------------------------------------------------------
    // processEvent — main learning entry point, called after every significant
    //                game event
    // event: { game, type, data, playerAction, outcome, context }
    // -------------------------------------------------------------------------
    processEvent(event) {
      this.totalInteractions++;

      // Update beliefs based on evidence
      this.updateBeliefs(event);

      // Check for new lessons
      this.checkForLessons(event);

      // Store significant memories
      this.storeMemoryIfSignificant(event);

      // Update theories
      this.updateTheories(event);

      // Track cross-game patterns
      this.updatePatterns(event);

      // Save periodically
      if (this.totalInteractions % 5 === 0) this.save();
    }

    // -------------------------------------------------------------------------
    // updateBeliefs — nudge beliefs toward or away from poles based on evidence
    // -------------------------------------------------------------------------
    updateBeliefs(event) {
      const alpha = 0.05; // slow belief change
      const bp = this.beliefs.about_player;

      if (event.playerAction === 'raise' || event.playerAction === 'allin' || event.playerAction === 'riichi') {
        this.nudgeBelief(bp.aggressive, true, alpha);
      }
      if (event.playerAction === 'fold' || event.playerAction === 'pass') {
        this.nudgeBelief(bp.patient, true, alpha);
        this.nudgeBelief(bp.aggressive, false, alpha);
      }
      if (event.type === 'bluff_success') {
        this.nudgeBelief(bp.trustworthy, false, alpha);
        this.nudgeBelief(this.beliefs.about_games.bluffing_works, true, alpha);
      }
      if (event.type === 'big_win' || event.type === 'comeback') {
        this.nudgeBelief(bp.strategic, true, alpha);
      }
      if (event.outcome === 'win' && event.data && event.data.score > 20) {
        this.nudgeBelief(bp.competitive, true, alpha);
      }
      // Track if player is improving over time
      if (event.type === 'session_summary' && event.data) {
        if (event.data.recentWinRate > event.data.overallWinRate) {
          this.nudgeBelief(bp.improving, true, alpha * 2);
        }
      }
    }

    nudgeBelief(belief, positive, alpha) {
      belief.evidence++;
      belief.confidence = Math.min(1, belief.evidence / 50); // confidence grows with evidence
      belief.value = belief.value * (1 - alpha) + (positive ? 1 : 0) * alpha;
    }

    // -------------------------------------------------------------------------
    // checkForLessons — generate new lessons when evidence passes thresholds
    // -------------------------------------------------------------------------
    checkForLessons(event) {
      const bp = this.beliefs.about_player;
      const bg = this.beliefs.about_games;

      // "The player bluffs frequently" — learned after enough evidence
      if (bp.trustworthy.evidence >= 10 && bp.trustworthy.value < 0.35) {
        this.addLesson(
          'This player bluffs often — I should call more against their bets.',
          event.game, 'bluff_awareness'
        );
      }

      if (bp.aggressive.evidence >= 15 && bp.aggressive.value > 0.7) {
        this.addLesson(
          'The player is very aggressive across all games — their raises don\'t always mean strength.',
          event.game, 'aggression_read'
        );
      }

      if (bp.patient.evidence >= 15 && bp.patient.value > 0.7) {
        this.addLesson(
          'The player is patient — when they finally act, they usually have something good.',
          event.game, 'patience_read'
        );
      }

      if (bp.improving.evidence >= 10 && bp.improving.value > 0.6) {
        this.addLesson(
          'The player is getting better over time — I need to keep adapting.',
          event.game, 'improvement_notice'
        );
      }

      // Cross-game lessons
      if (bg.bluffing_works.evidence >= 8 && bg.bluffing_works.value > 0.6) {
        this.addLesson(
          'Bluffing works well at this table — opponents fold too much.',
          event.game, 'bluff_meta'
        );
      }

      if (bg.defense_matters.evidence >= 8 && bg.defense_matters.value > 0.6) {
        this.addLesson(
          'Defense is crucial — I\'ve been losing by not folding enough.',
          event.game, 'defense_meta'
        );
      }
    }

    addLesson(text, game, id) {
      // Don't add duplicate lessons — reinforce existing ones instead
      const existing = this.lessons.find(l => l.id === id);
      if (existing) {
        existing.reinforced = (existing.reinforced || 0) + 1;
        existing.lastReinforced = Date.now();
        return;
      }
      this.lessons.push({
        id: id,
        text: text,
        game: game,
        confidence: 0.5,
        reinforced: 0,
        timestamp: Date.now(),
        lastReinforced: Date.now()
      });
    }

    // -------------------------------------------------------------------------
    // storeMemoryIfSignificant — only keep genuinely notable moments
    // -------------------------------------------------------------------------
    storeMemoryIfSignificant(event) {
      const dominated = event.type === 'big_win' || event.type === 'big_loss' ||
        event.type === 'comeback' || event.type === 'bluff_success' ||
        event.type === 'bluff_caught' || event.type === 'perfect_read' ||
        event.type === 'milestone';

      if (!dominated) return;

      this.keyMemories.push({
        game: event.game,
        description: this.describeEvent(event),
        emotion: this.getEmotionForEvent(event),
        significance: event.data && event.data.score ? Math.min(1, event.data.score / 50) : 0.5,
        timestamp: Date.now(),
        referenced: 0
      });
    }

    describeEvent(event) {
      const descs = {
        big_win:      `Won big in ${event.game}${event.data && event.data.score ? ' (' + event.data.score + ' pts)' : ''}`,
        big_loss:     `Lost badly in ${event.game}`,
        comeback:     `Made an incredible comeback in ${event.game}`,
        bluff_success: `Successfully bluffed in ${event.game}`,
        bluff_caught: `Got caught bluffing in ${event.game}`,
        perfect_read: `Read the opponent perfectly in ${event.game}`,
        milestone:    event.data && event.data.description ? event.data.description : 'Reached a milestone'
      };
      return descs[event.type] || `Something happened in ${event.game}`;
    }

    getEmotionForEvent(event) {
      const emotions = {
        big_win: 'triumphant',
        big_loss: 'frustrated',
        comeback: 'excited',
        bluff_success: 'satisfied',
        bluff_caught: 'embarrassed',
        perfect_read: 'proud'
      };
      return emotions[event.type] || 'neutral';
    }

    // -------------------------------------------------------------------------
    // updateTheories — form and prune hypotheses about the player
    // -------------------------------------------------------------------------
    updateTheories(event) {
      const bp = this.beliefs.about_player;

      if (bp.aggressive.confidence > 0.5 && bp.patient.confidence > 0.5) {
        if (bp.aggressive.value > 0.6 && bp.patient.value < 0.4) {
          this.addTheory(
            'This player will raise with marginal hands — I can trap them.',
            'aggression_trap'
          );
        }
        if (bp.patient.value > 0.6 && bp.aggressive.value < 0.4) {
          this.addTheory(
            'This player only bets with strong hands — I should fold to their raises.',
            'passive_respect'
          );
        }
      }

      // Theory: player tilts after losses
      if (bp.emotional.confidence > 0.4 && bp.emotional.value > 0.6) {
        this.addTheory(
          'This player plays emotionally after losses — I can exploit their tilt.',
          'tilt_exploit'
        );
      }

      // Theory: player is improving and I need to keep up
      if (bp.improving.confidence > 0.4 && bp.improving.value > 0.65) {
        this.addTheory(
          'The player is improving faster than expected — old counter-strategies may not work.',
          'improvement_warning'
        );
      }

      // Theory: player is lucky (high variance outcomes)
      if (bp.lucky.confidence > 0.3 && bp.lucky.value > 0.65) {
        this.addTheory(
          'This player seems to get favorable draws often — don\'t over-adjust to variance.',
          'luck_awareness'
        );
      }
    }

    addTheory(text, id) {
      if (this.theories.some(t => t.id === id)) return;
      this.theories.push({
        id: id,
        text: text,
        confidence: 0.5,
        tested: 0,
        correct: 0,
        timestamp: Date.now()
      });
    }

    // -------------------------------------------------------------------------
    // updatePatterns — track cross-game behavioral patterns
    // -------------------------------------------------------------------------
    updatePatterns(event) {
      this.patterns.samples++;
      if (event.type === 'win_after_loss') this.patterns.winAfterLoss++;
      if (event.type === 'loss_after_win') this.patterns.loseAfterWin++;
      if (event.type === 'session_improvement') this.patterns.improvesOverTime++;
      if (event.type === 'pressure_loss') this.patterns.worsensUnderPressure++;
    }

    // -------------------------------------------------------------------------
    // getReflection — what the character is "thinking" right now
    // Used for chat, LLM prompts, and decision-making
    // -------------------------------------------------------------------------
    getReflection(currentGame) {
      const bp = this.beliefs.about_player;
      const reflections = [];

      // High-confidence beliefs
      if (bp.aggressive.confidence > 0.4 && bp.aggressive.value > 0.65) {
        reflections.push('I know this player is aggressive.');
      }
      if (bp.trustworthy.confidence > 0.3 && bp.trustworthy.value < 0.4) {
        reflections.push('I don\'t trust their bets — they bluff too much.');
      }
      if (bp.improving.confidence > 0.3 && bp.improving.value > 0.6) {
        reflections.push('They\'re getting better. I need to stay sharp.');
      }
      if (bp.patient.confidence > 0.4 && bp.patient.value > 0.65) {
        reflections.push('This player waits for good hands. When they move, I should be wary.');
      }
      if (bp.competitive.confidence > 0.3 && bp.competitive.value > 0.65) {
        reflections.push('They really hate losing. That competitive fire changes how they play.');
      }

      // Recent lessons
      const recentLessons = this.lessons
        .filter(l => Date.now() - l.lastReinforced < 3600000) // last hour
        .slice(-2);
      for (const l of recentLessons) {
        reflections.push('I learned: ' + l.text);
      }

      // Key memory
      if (this.keyMemories.length > 0) {
        const recent = this.keyMemories[this.keyMemories.length - 1];
        if (Date.now() - recent.timestamp < 1800000) { // last 30 min
          reflections.push('I remember: ' + recent.description);
          recent.referenced++;
        }
      }

      // Active theory
      if (this.theories.length > 0) {
        const sorted = this.theories.slice().sort((a, b) => b.confidence - a.confidence);
        reflections.push('My theory: ' + sorted[0].text);
      }

      return reflections;
    }

    // -------------------------------------------------------------------------
    // getWeightAdjustments — how thinking ACTUALLY AFFECTS GAMEPLAY
    // Returns numeric adjustments for AI weight tuning
    // -------------------------------------------------------------------------
    getWeightAdjustments() {
      const bp = this.beliefs.about_player;
      const adj = { aggression: 0, defense: 0, bluffFreq: 0, callFreq: 0 };

      // If I believe the player bluffs a lot, call more
      if (bp.trustworthy.confidence > 0.3 && bp.trustworthy.value < 0.4) {
        adj.callFreq += 0.1 * bp.trustworthy.confidence;
      }

      // If player is aggressive, tighten up and trap
      if (bp.aggressive.confidence > 0.3 && bp.aggressive.value > 0.6) {
        adj.defense += 0.05 * bp.aggressive.confidence;
        adj.aggression -= 0.05; // play tighter, let them hang themselves
      }

      // If player is patient, bluff more (they'll fold marginal hands)
      if (bp.patient.confidence > 0.3 && bp.patient.value > 0.6) {
        adj.bluffFreq += 0.05 * bp.patient.confidence;
      }

      // If player is competitive, be more cautious — they push hard
      if (bp.competitive.confidence > 0.3 && bp.competitive.value > 0.65) {
        adj.defense += 0.03 * bp.competitive.confidence;
      }

      // If player is improving, increase overall play quality
      if (bp.improving.confidence > 0.3 && bp.improving.value > 0.6) {
        adj.defense += 0.02;
        adj.aggression += 0.02; // play slightly sharper all around
      }

      // Self-awareness: if I tend to tilt, play tighter
      if (this.beliefs.about_self.tend_to_tilt.value > 0.6) {
        adj.aggression -= 0.03;
        adj.defense += 0.03;
      }

      // If I believe defense matters, bias toward safety
      if (this.beliefs.about_games.defense_matters.confidence > 0.3 &&
          this.beliefs.about_games.defense_matters.value > 0.6) {
        adj.defense += 0.04;
      }

      return adj;
    }

    // -------------------------------------------------------------------------
    // buildCognitivePrompt — LLM prompt section describing cognitive state
    // -------------------------------------------------------------------------
    buildCognitivePrompt() {
      const bp = this.beliefs.about_player;
      const sections = [];

      sections.push('WHAT I BELIEVE ABOUT THE PLAYER:');
      if (bp.aggressive.confidence > 0.3) {
        sections.push(`  Aggressive: ${(bp.aggressive.value * 100).toFixed(0)}% (${bp.aggressive.confidence > 0.5 ? 'confident' : 'uncertain'})`);
      }
      if (bp.patient.confidence > 0.3) {
        sections.push(`  Patient: ${(bp.patient.value * 100).toFixed(0)}%`);
      }
      if (bp.trustworthy.confidence > 0.3) {
        sections.push(`  Trustworthy (doesn't bluff): ${(bp.trustworthy.value * 100).toFixed(0)}%`);
      }
      if (bp.improving.confidence > 0.3) {
        sections.push(`  Improving over time: ${(bp.improving.value * 100).toFixed(0)}%`);
      }
      if (bp.competitive.confidence > 0.3) {
        sections.push(`  Competitive: ${(bp.competitive.value * 100).toFixed(0)}%`);
      }
      if (bp.strategic.confidence > 0.3) {
        sections.push(`  Strategic: ${(bp.strategic.value * 100).toFixed(0)}%`);
      }

      if (this.lessons.length > 0) {
        sections.push('\nLESSONS I\'VE LEARNED:');
        for (const l of this.lessons.slice(-5)) {
          sections.push(`  - ${l.text} (from ${l.game}, reinforced ${l.reinforced}x)`);
        }
      }

      if (this.theories.length > 0) {
        sections.push('\nMY CURRENT THEORIES:');
        for (const t of this.theories.slice(-3)) {
          sections.push(`  - ${t.text}`);
        }
      }

      if (this.keyMemories.length > 0) {
        sections.push('\nKEY MEMORIES:');
        for (const m of this.keyMemories.slice(-3)) {
          sections.push(`  - ${m.description} (felt ${m.emotion})`);
        }
      }

      // Self-beliefs
      const bs = this.beliefs.about_self;
      const selfLines = [];
      if (bs.tend_to_tilt.value > 0.6) selfLines.push('I tend to tilt under pressure.');
      if (bs.good_at_reading.value > 0.6) selfLines.push('I\'m good at reading opponents.');
      if (bs.need_more_patience.value > 0.6) selfLines.push('I need to be more patient.');
      if (bs.best_when_calm.value > 0.6) selfLines.push('I play my best when calm.');
      if (selfLines.length > 0) {
        sections.push('\nSELF-AWARENESS:');
        for (const line of selfLines) sections.push(`  - ${line}`);
      }

      // Pattern observations
      if (this.patterns.samples > 10) {
        const pLines = [];
        if (this.patterns.winAfterLoss > this.patterns.samples * 0.15) {
          pLines.push('The player tends to bounce back after losses.');
        }
        if (this.patterns.loseAfterWin > this.patterns.samples * 0.15) {
          pLines.push('The player sometimes gets complacent after wins.');
        }
        if (pLines.length > 0) {
          sections.push('\nPATTERNS OBSERVED:');
          for (const line of pLines) sections.push(`  - ${line}`);
        }
      }

      return sections.join('\n');
    }

    // -------------------------------------------------------------------------
    // getStats — snapshot for debugging or UI display
    // -------------------------------------------------------------------------
    getStats() {
      return {
        totalInteractions: this.totalInteractions,
        beliefs: Object.fromEntries(
          Object.entries(this.beliefs.about_player).map(([k, v]) => [
            k,
            { value: v.value.toFixed(2), confidence: v.confidence.toFixed(2) }
          ])
        ),
        lessonsLearned: this.lessons.length,
        keyMemories: this.keyMemories.length,
        theories: this.theories.length,
        patterns: { ...this.patterns }
      };
    }

    // -------------------------------------------------------------------------
    // reset — clear all cognitive data for this character
    // -------------------------------------------------------------------------
    reset() {
      localStorage.removeItem(`mj_cognition_${this.characterId}`);
      this.load();
    }
  }

  // Public API
  root.MJ.CharacterCognition = Object.freeze({ CharacterCognition: CharacterCognition });

  if (typeof console !== 'undefined') console.log('[CharacterCognition] Module loaded');
})(typeof window !== 'undefined' ? window : global);
