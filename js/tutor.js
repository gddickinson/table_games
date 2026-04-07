/**
 * tutor.js — Adaptive tutoring engine with skill tracking and lessons
 * Tracks player skill level and provides progressive teaching.
 */
(function (exports) {
  'use strict';
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  const SKILL_AREAS = {
    TILE_KNOWLEDGE: 'tile_knowledge',
    MELD_FORMATION: 'meld_formation',
    WINNING_HANDS: 'winning_hands',
    CLAIMING: 'claiming',
    TILE_EFFICIENCY: 'tile_efficiency',
    DEFENSE: 'defense',
    SCORING: 'scoring',
    RIICHI: 'riichi',
    HAND_READING: 'hand_reading',
    STRATEGY: 'strategy'
  };

  const SKILL_STAGES = ['novice', 'beginner', 'intermediate', 'advanced', 'expert'];

  /** Lesson definitions — progressive curriculum */
  const LESSONS = [
    // Stage 1: Novice
    { id: 'tiles_intro', stage: 'novice', area: 'tile_knowledge', title: 'Meet the Tiles',
      content: 'Mahjong uses 136 tiles in 3 number suits (1-9) plus honor tiles (winds and dragons). Each tile appears 4 times.',
      quiz: 'How many unique tile types are there?', answer: '34' },
    { id: 'suits_learn', stage: 'novice', area: 'tile_knowledge', title: 'The Three Suits',
      content: 'Characters (萬) are red-labeled, Bamboo (竹) are green, Circles (筒) are blue. Each suit has tiles numbered 1-9.',
      quiz: 'What color labels do Bamboo tiles have?', answer: 'green' },
    { id: 'honors_learn', stage: 'novice', area: 'tile_knowledge', title: 'Honor Tiles',
      content: 'Winds (East, South, West, North) and Dragons (Red, Green, White) are honor tiles. They cannot form sequences — only triplets.',
      quiz: 'Can you make a sequence with wind tiles?', answer: 'no' },
    { id: 'melds_intro', stage: 'novice', area: 'meld_formation', title: 'Building Melds',
      content: 'A meld is a group of 3 tiles: either a SEQUENCE (like 2-3-4 of Bamboo) or a TRIPLET (like three 5 of Circles). A KONG is 4 identical tiles.',
      quiz: 'Is 3-5-7 of Circles a valid sequence?', answer: 'no' },
    { id: 'winning_intro', stage: 'novice', area: 'winning_hands', title: 'Winning Hand Shape',
      content: 'To win, you need: 4 melds (groups of 3) + 1 pair (2 identical tiles) = 14 tiles total. This is the fundamental pattern!',
      quiz: 'How many total tiles in a winning hand?', answer: '14' },
    { id: 'turn_flow', stage: 'novice', area: 'meld_formation', title: 'How a Turn Works',
      content: 'Each turn: Draw one tile from the wall → Look at your hand → Discard one tile face-up. Other players can claim your discard!',
      quiz: 'After drawing, what must you always do?', answer: 'discard' },

    // Stage 2: Beginner
    { id: 'claiming_basics', stage: 'beginner', area: 'claiming', title: 'Claiming Discards',
      content: 'CHOW: claim a sequence from the player to your left only. PONG: claim a triplet from anyone. WIN: claim a winning tile from anyone. Priority: Win > Pong > Chow.',
      quiz: 'Who can you claim a Pong from?', answer: 'anyone' },
    { id: 'open_vs_closed', stage: 'beginner', area: 'claiming', title: 'Open vs Closed Hands',
      content: 'When you claim a tile, that meld becomes OPEN (visible). Open hands score less and cannot declare Riichi. Keep your hand closed when possible!',
      quiz: 'Can you declare Riichi with an open meld?', answer: 'no' },
    { id: 'shanten_intro', stage: 'beginner', area: 'tile_efficiency', title: 'Shanten — Distance to Winning',
      content: 'Shanten counts how many tiles you need to become ready (tenpai). 3-shanten means 3 good draws away. 0-shanten = tenpai = one tile from winning!',
      quiz: 'What does 0 shanten mean?', answer: 'tenpai' },
    { id: 'scoring_basics', stage: 'beginner', area: 'scoring', title: 'How Scoring Works',
      content: 'Points come from patterns in your winning hand. Dragon Pong = 10pts, All Sequences = 5pts, Self-Draw = 5pts. Higher patterns = more points!',
      quiz: 'How many points is a Dragon Pong worth?', answer: '10' },
    { id: 'riichi_intro', stage: 'beginner', area: 'riichi', title: 'Declaring Riichi',
      content: 'When tenpai (0 shanten) with a closed hand, you can declare Riichi for +10 bonus points! But you cannot change your hand after declaring.',
      quiz: 'How many bonus points does Riichi give?', answer: '10' },

    // Stage 3: Intermediate
    { id: 'efficiency', stage: 'intermediate', area: 'tile_efficiency', title: 'Tile Efficiency',
      content: 'Ukeire = how many tiles in the wall would improve your hand. Discard the tile that leaves the most useful draws. Middle tiles (3-7) are more versatile than edges (1,9).',
      quiz: 'Are middle tiles or edge tiles more versatile?', answer: 'middle' },
    { id: 'defense_basics', stage: 'intermediate', area: 'defense', title: 'Defensive Play',
      content: 'When opponents seem close to winning, play safe! Tiles they already discarded (genbutsu) are 100% safe. Terminal tiles (1,9) and honors are generally safer.',
      quiz: 'What is a genbutsu tile?', answer: 'a tile the opponent already discarded' },
    { id: 'suji_safety', stage: 'intermediate', area: 'defense', title: 'Suji — Number Safety',
      content: 'If an opponent discarded 4, then 1 is "suji-safe" (because they wouldn\'t wait on 1-2-3 if they threw the 4). Suji pairs: 1-4, 2-5, 3-6, 4-7, 5-8, 6-9.',
      quiz: 'If opponent discarded 7, which tile is suji-safe?', answer: '4' },
    { id: 'when_to_fold', stage: 'intermediate', area: 'defense', title: 'When to Fold',
      content: 'If opponents declare Riichi or have many open melds AND your hand is far from ready (high shanten), FOLD! Discard safe tiles only. Losing fewer points is winning.',
      quiz: 'Should you fold if you are 3-shanten and opponent declared Riichi?', answer: 'yes' },
    { id: 'flush_strategy', stage: 'intermediate', area: 'strategy', title: 'Going for Flush',
      content: 'Collecting tiles from ONE suit (Pure Flush = 50pts, Mixed Flush = 25pts) is a powerful strategy. Discard other suits early to build concentration.',
      quiz: 'How many points for a Pure One Suit hand?', answer: '50' },

    // Stage 4: Advanced
    { id: 'hand_reading', stage: 'advanced', area: 'hand_reading', title: 'Reading Opponents',
      content: 'Watch what opponents discard and call. If they call Pong on a dragon, they have yakuhai. If they discard many of one suit, they might be collecting another. Tedashi (from hand) vs tsumogiri (draw-discard) reveals intent.',
      quiz: 'What does it mean when an opponent discards only from one suit?', answer: 'they may be collecting another suit' },
    { id: 'push_fold', stage: 'advanced', area: 'strategy', title: 'Push vs Fold Decision',
      content: 'Consider: your hand value × win probability vs deal-in cost × deal-in probability. Push when your hand is valuable and close to winning. Fold when your hand is weak and opponents are dangerous.',
      quiz: 'When should you push instead of fold?', answer: 'when hand value is high and close to winning' },
    { id: 'scoring_mastery', stage: 'advanced', area: 'scoring', title: 'Maximizing Score',
      content: 'Don\'t just win — win BIG. All Triplets (30pts), Big Three Dragons (88pts), All Honors (80pts). Sometimes waiting one more turn for a better win is worth it.',
      quiz: 'How many points for Big Three Dragons?', answer: '88' },
    { id: 'value_hand', stage: 'advanced', area: 'strategy', title: 'Hand Value Planning',
      content: 'Plan your hand from the start. Dragon pairs → try for Dragon Pong. One dominant suit → aim for flush. All triplets forming → go for All Triplets. Adapt as tiles come in.',
      quiz: 'If you have two dragon pairs early, what should you aim for?', answer: 'dragon pongs' }
  ];

  class TutorEngine {
    constructor() {
      this.skills = this.loadSkills();
      this.completedLessons = this.loadCompleted();
      this.currentStage = this.calculateStage();
      this.mistakeHistory = [];
      this.sessionStats = { hintsUsed: 0, goodPlays: 0, mistakes: 0, roundsPlayed: 0 };
    }

    loadSkills() {
      try {
        const saved = localStorage.getItem('mj_tutor_skills');
        if (saved) return JSON.parse(saved);
      } catch (e) {}
      const skills = {};
      for (const area of Object.values(SKILL_AREAS)) {
        skills[area] = { level: 0, correct: 0, total: 0, lastPracticed: null };
      }
      return skills;
    }

    loadCompleted() {
      try {
        const saved = localStorage.getItem('mj_tutor_completed');
        if (saved) return new Set(JSON.parse(saved));
      } catch (e) {}
      return new Set();
    }

    save() {
      try {
        localStorage.setItem('mj_tutor_skills', JSON.stringify(this.skills));
        localStorage.setItem('mj_tutor_completed', JSON.stringify([...this.completedLessons]));
      } catch (e) {}
    }

    calculateStage() {
      const skillValues = Object.values(this.skills);
      const avgLevel = skillValues.reduce((s, sk) => s + sk.level, 0) / skillValues.length;
      if (avgLevel < 1) return 'novice';
      if (avgLevel < 2) return 'beginner';
      if (avgLevel < 3) return 'intermediate';
      if (avgLevel < 4) return 'advanced';
      return 'expert';
    }

    /** Get the next recommended lesson */
    getNextLesson() {
      const stage = this.currentStage;
      // First: incomplete lessons at current stage
      for (const lesson of LESSONS) {
        if (lesson.stage === stage && !this.completedLessons.has(lesson.id)) return lesson;
      }
      // Then: next stage
      const stageIdx = SKILL_STAGES.indexOf(stage);
      if (stageIdx < SKILL_STAGES.length - 1) {
        const nextStage = SKILL_STAGES[stageIdx + 1];
        for (const lesson of LESSONS) {
          if (lesson.stage === nextStage && !this.completedLessons.has(lesson.id)) return lesson;
        }
      }
      return null; // all done
    }

    /** Get all lessons organized by stage */
    getLessonsByStage() {
      const byStage = {};
      for (const lesson of LESSONS) {
        if (!byStage[lesson.stage]) byStage[lesson.stage] = [];
        byStage[lesson.stage].push({
          ...lesson, completed: this.completedLessons.has(lesson.id)
        });
      }
      return byStage;
    }

    /** Complete a lesson */
    completeLesson(lessonId) {
      this.completedLessons.add(lessonId);
      const lesson = LESSONS.find(l => l.id === lessonId);
      if (lesson) {
        this.recordSkill(lesson.area, true);
      }
      this.currentStage = this.calculateStage();
      this.save();
    }

    /** Record a skill-building event */
    recordSkill(area, correct) {
      if (!this.skills[area]) return;
      this.skills[area].total++;
      if (correct) this.skills[area].correct++;
      this.skills[area].level = Math.min(5,
        Math.floor((this.skills[area].correct / Math.max(1, this.skills[area].total)) * 5));
      this.skills[area].lastPracticed = Date.now();
      this.save();
    }

    /** Record a play decision for tracking */
    recordPlay(quality) {
      if (quality === 'optimal' || quality === 'acceptable') {
        this.sessionStats.goodPlays++;
        this.recordSkill(SKILL_AREAS.TILE_EFFICIENCY, true);
      } else {
        this.sessionStats.mistakes++;
        this.recordSkill(SKILL_AREAS.TILE_EFFICIENCY, false);
        this.mistakeHistory.push({ time: Date.now(), quality });
      }
    }

    /** Get contextual teaching message based on game state */
    getTeachingMoment(event, data) {
      const stage = this.currentStage;
      switch (event) {
        case 'round_start':
          if (stage === 'novice') return 'New round! Look at your tiles and try to find pairs and potential sequences.';
          if (stage === 'beginner') return 'Check your hand: any pairs of dragons or your seat wind? Those are easy bonus points!';
          return null;

        case 'drew_tile':
          if (stage === 'novice') return 'You drew a tile. Does it help form a group? If not, discard your least useful tile.';
          return null;

        case 'can_win':
          return 'You can WIN! Press W or click "Declare Win" to claim victory!';

        case 'tenpai':
          if (stage === 'beginner') return 'You are TENPAI (one tile away)! Consider declaring Riichi for +10 bonus points.';
          return null;

        case 'claim_available':
          if (stage === 'novice') return `You can claim this tile! ${data.type === 'pong' ? 'A Pong (triplet) is almost always worth claiming.' : 'Consider if this claim helps your hand.'}`;
          if (stage === 'beginner') return `Claim available: ${data.type}. Remember: claiming opens your hand, which reduces scoring options.`;
          return null;

        case 'dealt_in':
          if (stage === 'intermediate') return 'You dealt into someone\'s hand! Watch for danger signs: Riichi declarations, open melds, and safe tile patterns.';
          return 'You dealt in! Next time, check if discarded tiles are safe (genbutsu) first.';

        case 'round_end':
          if (this.sessionStats.mistakes > this.sessionStats.goodPlays && stage !== 'novice')
            return 'Tip: Use the hint button (?) to see which tiles are best to discard.';
          return null;

        default: return null;
      }
    }

    /** Get skill summary for display */
    getSkillSummary() {
      return {
        stage: this.currentStage,
        stageIndex: SKILL_STAGES.indexOf(this.currentStage),
        skills: { ...this.skills },
        completedLessons: this.completedLessons.size,
        totalLessons: LESSONS.length,
        session: { ...this.sessionStats }
      };
    }

    getRecommendedDifficulty() {
      const s = this.currentStage;
      if (s === 'novice') return 'beginner';
      if (s === 'beginner') return 'basic';
      if (s === 'intermediate') return 'intermediate';
      return 'advanced';
    }

    reset() {
      for (const area of Object.values(SKILL_AREAS)) {
        this.skills[area] = { level: 0, correct: 0, total: 0, lastPracticed: null };
      }
      this.completedLessons.clear();
      this.currentStage = 'novice';
      this.save();
    }
  }

  root.MJ.Tutor = Object.freeze({
    TutorEngine, SKILL_AREAS, SKILL_STAGES, LESSONS
  });
  if (typeof console !== 'undefined') console.log('[Mahjong] Tutor module loaded');
})(typeof window !== 'undefined' ? window : global);
