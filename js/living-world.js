/**
 * living-world.js - Living simulation layer for Mahjong
 *
 * Provides meta-progression, between-session messaging, seasonal events,
 * narrative story arcs, and a unified world manager.
 *
 * Exports: root.MJ.LivingWorld
 */
(function(root) {
  'use strict';

  root.MJ = root.MJ || {};

  // =========================================================================
  // PlayerReputation - Meta-progression system for the human player
  // =========================================================================

  class PlayerReputation {
    constructor() {
      this.load();
    }

    load() {
      try {
        var d = JSON.parse(localStorage.getItem('mj_reputation'));
        if (d) { Object.assign(this, d); return; }
      } catch (e) { /* ignore */ }
      this.level = 1;
      this.title = 'Novice';
      this.xp = 0;
      this.totalGames = 0;
      this.totalWins = 0;
      this.highestScore = 0;
      this.longestStreak = 0;
      this.currentStreak = 0;
      this.favoritePattern = null;
      this.unlockedVenues = ['home'];
      this.unlockedCharacters = ['mei', 'kenji', 'yuki'];
      this.unlockedRuleVariants = ['standard'];
      this.milestones = [];
    }

    save() {
      try {
        localStorage.setItem('mj_reputation', JSON.stringify(this));
      } catch (e) { /* ignore */ }
    }

    addXP(amount, reason) {
      this.xp += amount;
      var needed = this.level * 50;
      if (this.xp >= needed) {
        this.xp -= needed;
        this.level = Math.min(20, this.level + 1);
        this.title = this.getTitleForLevel(this.level);
        this.checkUnlocks();
        return { levelUp: true, newLevel: this.level, newTitle: this.title };
      }
      this.save();
      return { levelUp: false };
    }

    recordGame(result) {
      this.totalGames++;
      if (result.won) {
        this.totalWins++;
        this.currentStreak++;
        this.longestStreak = Math.max(this.longestStreak, this.currentStreak);
      } else {
        this.currentStreak = 0;
      }
      if (result.score > this.highestScore) {
        this.highestScore = result.score;
      }

      // XP: base for playing + bonus for winning + bonus for score + streak
      var xp = 5;
      if (result.won) xp += 10;
      xp += Math.floor((result.score || 0) / 5);
      if (this.currentStreak >= 3) xp += 5;

      return this.addXP(xp, result.won ? 'win' : 'game');
    }

    getTitleForLevel(level) {
      var titles = [
        'Novice', 'Beginner', 'Apprentice', 'Student', 'Enthusiast',
        'Player', 'Skilled Player', 'Competitor', 'Strategist', 'Tactician',
        'Expert', 'Veteran', 'Master', 'Grand Master', 'Champion',
        'Legend', 'Sage', 'Enlightened', 'Transcendent', 'Dragon of Mahjong'
      ];
      return titles[Math.min(level - 1, titles.length - 1)];
    }

    checkUnlocks() {
      if (this.level >= 3 && this.unlockedVenues.indexOf('cafe') === -1) {
        this.unlockedVenues.push('cafe');
        this.milestones.push({
          type: 'venue', name: 'Sakura Caf\u00e9', level: 3, date: Date.now()
        });
      }
      if (this.level >= 5 && this.unlockedRuleVariants.indexOf('riichi_only') === -1) {
        this.unlockedRuleVariants.push('riichi_only');
        this.milestones.push({
          type: 'variant', name: 'Riichi-Only Mode', level: 5, date: Date.now()
        });
      }
      if (this.level >= 8 && this.unlockedVenues.indexOf('tournament_hall') === -1) {
        this.unlockedVenues.push('tournament_hall');
        this.milestones.push({
          type: 'venue', name: 'Tournament Hall', level: 8, date: Date.now()
        });
      }
      if (this.level >= 10 && this.unlockedCharacters.indexOf('dragon_master') === -1) {
        this.unlockedCharacters.push('dragon_master');
        this.milestones.push({
          type: 'character', name: 'The Dragon Master', level: 10, date: Date.now()
        });
      }
      if (this.level >= 15 && this.unlockedVenues.indexOf('rooftop') === -1) {
        this.unlockedVenues.push('rooftop');
        this.milestones.push({
          type: 'venue', name: 'Midnight Rooftop', level: 15, date: Date.now()
        });
      }
      this.save();
    }

    getProgress() {
      return {
        level: this.level,
        title: this.title,
        xp: this.xp,
        xpNeeded: this.level * 50,
        totalGames: this.totalGames,
        totalWins: this.totalWins,
        winRate: this.totalGames > 0
          ? ((this.totalWins / this.totalGames) * 100).toFixed(1) + '%'
          : '0%',
        highestScore: this.highestScore,
        currentStreak: this.currentStreak,
        longestStreak: this.longestStreak,
        unlockedVenues: this.unlockedVenues,
        unlockedCharacters: this.unlockedCharacters,
        recentMilestones: this.milestones.slice(-5)
      };
    }
  }

  // =========================================================================
  // BetweenGameMessages - Characters "message" the player between sessions
  // =========================================================================

  class BetweenGameMessages {
    constructor() {
      this.lastPlayed = parseInt(localStorage.getItem('mj_last_played') || '0', 10);
    }

    getWelcomeBack() {
      var now = Date.now();
      var hoursAway = (now - this.lastPlayed) / 3600000;
      this.lastPlayed = now;
      localStorage.setItem('mj_last_played', String(now));

      if (hoursAway < 1) return null;

      var messages = [];

      if (hoursAway > 72) {
        var daysAway = Math.floor(hoursAway / 24);
        messages.push({
          from: 'yuki',
          text: "It's been " + daysAway + ' days. The tiles have been waiting.',
          emotion: 'warm'
        });
        messages.push({
          from: 'kenji',
          text: 'Finally! I was getting bored beating the other two.',
          emotion: 'excited'
        });
        messages.push({
          from: 'mei',
          text: 'Welcome back! I saved a seat for you.',
          emotion: 'happy'
        });
      } else if (hoursAway > 24) {
        messages.push({
          from: 'mei',
          text: 'Hey! Ready for another round?',
          emotion: 'neutral'
        });
        messages.push({
          from: 'kenji',
          text: Math.floor(hoursAway) + " hours? I thought you'd given up!",
          emotion: 'competitive'
        });
      } else if (hoursAway > 4) {
        messages.push({
          from: 'yuki',
          text: 'Good to see you again.',
          emotion: 'serene'
        });
      }

      return messages.length > 0 ? messages : null;
    }
  }

  // =========================================================================
  // SeasonalEvents - Calendar-based game events
  // =========================================================================

  class SeasonalEvents {
    getActiveEvents() {
      var now = new Date();
      var month = now.getMonth();
      var day = now.getDate();
      var hour = now.getHours();
      var dayOfWeek = now.getDay();

      var events = [];

      // Friday night Mahjong
      if (dayOfWeek === 5 && hour >= 18) {
        events.push({
          id: 'friday_night',
          name: 'Friday Night Mahjong',
          description: 'Weekend vibes! Bonus XP for all games.',
          xpMultiplier: 1.5,
          icon: '\uD83C\uDF19'  // moon
        });
      }

      // Seasonal themes
      if (month >= 2 && month <= 4) {
        events.push({
          id: 'spring',
          name: 'Cherry Blossom Season',
          description: 'Flower tiles are worth double!',
          flowerMultiplier: 2,
          icon: '\uD83C\uDF38'  // cherry blossom
        });
      }
      if (month >= 5 && month <= 7) {
        events.push({
          id: 'summer',
          name: 'Summer Festival',
          description: 'Dragon pongs give bonus XP.',
          icon: '\uD83C\uDF86'  // fireworks
        });
      }
      if (month >= 8 && month <= 10) {
        events.push({
          id: 'autumn',
          name: 'Moon Viewing',
          description: 'Concealed hands score extra.',
          icon: '\uD83C\uDF15'  // full moon
        });
      }
      if (month === 11 || month <= 1) {
        events.push({
          id: 'winter',
          name: 'New Year Mahjong',
          description: 'All scores doubled!',
          scoreMultiplier: 2,
          icon: '\uD83C\uDF8D'  // pine decoration
        });
      }

      // Monthly tournament (first weekend of the month)
      if (day <= 7 && (dayOfWeek === 0 || dayOfWeek === 6)) {
        events.push({
          id: 'monthly_tourney',
          name: 'Monthly Tournament',
          description: 'Play 4 games for ranking!',
          icon: '\uD83C\uDFC6'  // trophy
        });
      }

      // Character birthdays
      if (month === 3 && day === 15) {
        events.push({
          id: 'mei_birthday',
          name: "Mei's Birthday!",
          description: 'Mei is especially cheerful today.',
          icon: '\uD83C\uDF82'  // cake
        });
      }
      if (month === 7 && day === 22) {
        events.push({
          id: 'kenji_birthday',
          name: "Kenji's Birthday!",
          description: 'Kenji challenges you to a best-of-3!',
          icon: '\uD83C\uDF82'
        });
      }
      if (month === 10 && day === 3) {
        events.push({
          id: 'yuki_birthday',
          name: "Yuki's Birthday!",
          description: 'Yuki shares a story about Takeshi.',
          icon: '\uD83C\uDF82'
        });
      }

      return events;
    }
  }

  // =========================================================================
  // NarrativeEngine - Story arcs and character development
  // =========================================================================

  class NarrativeEngine {
    constructor() {
      this.load();
    }

    load() {
      try {
        this.state = JSON.parse(localStorage.getItem('mj_narrative')) || {};
      } catch (e) {
        this.state = {};
      }
    }

    save() {
      try {
        localStorage.setItem('mj_narrative', JSON.stringify(this.state));
      } catch (e) { /* ignore */ }
    }

    checkStoryTriggers(reputation, personalities) {
      var triggers = [];

      // Arc 1: Kenji's Challenge (relationship level 3+, 10+ games)
      if (!this.state.kenji_challenge_started &&
          personalities.kenji &&
          personalities.kenji.relationshipLevel >= 3 &&
          reputation.totalGames >= 10) {
        this.state.kenji_challenge_started = true;
        triggers.push({
          type: 'story',
          id: 'kenji_challenge',
          title: "Kenji's Challenge",
          text: "Hey, I've been thinking... you're getting pretty good. " +
                'How about a best-of-5 showdown? Winner gets bragging rights forever.',
          from: 'kenji',
          choices: ['Accept the challenge', 'Maybe later']
        });
        this.save();
      }

      // Arc 2: Yuki's Memory (relationship level 4+, 20+ games)
      if (!this.state.yuki_memory_shared &&
          personalities.yuki &&
          personalities.yuki.relationshipLevel >= 4 &&
          reputation.totalGames >= 20) {
        this.state.yuki_memory_shared = true;
        triggers.push({
          type: 'story',
          id: 'yuki_memory',
          title: 'A Sunday Memory',
          text: 'You know... Takeshi and I had a Sunday ritual. Every week, ' +
                'rain or shine. The same table, the same tea, the same love ' +
                "for the game. He always said that Mahjong isn't about the " +
                "tiles \u2014 it's about the people you share them with. " +
                'I think he would have liked you.',
          from: 'yuki'
        });
        this.save();
      }

      // Arc 3: Mei's Discovery (player reaches level 5)
      if (!this.state.mei_strategy_talk &&
          reputation.level >= 5) {
        this.state.mei_strategy_talk = true;
        triggers.push({
          type: 'story',
          id: 'mei_strategy',
          title: 'The Pattern Behind the Pattern',
          text: "I've been analyzing our game data \u2014 yes, I do that, " +
                'occupational hazard \u2014 and I noticed something interesting ' +
                "about your play style. You're developing a signature approach. " +
                "My grandmother called it 'finding your own wind.' I think " +
                "you're finding yours.",
          from: 'mei'
        });
        this.save();
      }

      // Arc 4: Group milestone (50+ total games)
      if (!this.state.group_milestone_50 && reputation.totalGames >= 50) {
        this.state.group_milestone_50 = true;
        triggers.push({
          type: 'story',
          id: 'group_50',
          title: 'Fifty Games Together',
          text: "Can you believe we've played fifty games together? " +
                "That's a lot of tiles. A lot of stories. " +
                "Here's to fifty more.",
          from: 'all'
        });
        this.save();
      }

      return triggers;
    }

    getActiveArcs() {
      var arcs = [];
      if (this.state.kenji_challenge_started && !this.state.kenji_challenge_complete) {
        arcs.push({
          id: 'kenji_challenge',
          progress: this.state.kenji_challenge_wins || 0,
          total: 5
        });
      }
      return arcs;
    }
  }

  // =========================================================================
  // WorldManager - Ties everything together
  // =========================================================================

  class WorldManager {
    constructor() {
      this.reputation = new PlayerReputation();
      this.messages = new BetweenGameMessages();
      this.events = new SeasonalEvents();
      this.narrative = new NarrativeEngine();
    }

    onGameStart() {
      var welcomeBack = this.messages.getWelcomeBack();
      var activeEvents = this.events.getActiveEvents();
      return { welcomeBack: welcomeBack, activeEvents: activeEvents };
    }

    onRoundEnd(result, personalities) {
      var repResult = this.reputation.recordGame(result);
      var storyTriggers = this.narrative.checkStoryTriggers(
        this.reputation, personalities
      );
      return { repResult: repResult, storyTriggers: storyTriggers };
    }

    getWorldState() {
      return {
        reputation: this.reputation.getProgress(),
        events: this.events.getActiveEvents(),
        arcs: this.narrative.getActiveArcs()
      };
    }
  }

  // =========================================================================
  // Export
  // =========================================================================

  root.MJ.LivingWorld = {
    PlayerReputation: PlayerReputation,
    BetweenGameMessages: BetweenGameMessages,
    SeasonalEvents: SeasonalEvents,
    NarrativeEngine: NarrativeEngine,
    WorldManager: WorldManager
  };

})(typeof window !== 'undefined' ? window : global);
