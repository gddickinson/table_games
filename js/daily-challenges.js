/**
 * daily-challenges.js — Daily challenge system for Mahjong
 * Rotating objectives with bonus XP, refreshed each day
 * Exports: root.MJ.DailyChallenges
 */
(function(exports) {
  'use strict';
  var root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  var STORAGE_KEY = 'mj_daily';
  var CHALLENGES_PER_DAY = 3;

  // ── Challenge pool ─────────────────────────────────────────────

  var CHALLENGE_POOL = [
    {
      name: 'Dragon Slayer',
      description: 'Win a hand with a Dragon Pong',
      xpBonus: 20,
      icon: '\uD83D\uDC09',
      check: function(event, data) {
        return event === 'round_end' && data.winResult &&
          data.winResult.breakdown.some(function(b) { return b.name.indexOf('Dragon') !== -1; });
      }
    },
    {
      name: 'Speed Demon',
      description: 'Win within 20 turns',
      xpBonus: 15,
      icon: '\u26A1',
      check: function(event, data) {
        return event === 'round_end' && data.winner && data.winner.isHuman &&
          (data.state && data.state.turnCount ? data.state.turnCount : 99) <= 20;
      }
    },
    {
      name: 'Self-Reliant',
      description: 'Win by self-draw (tsumo)',
      xpBonus: 15,
      icon: '\uD83C\uDFAF',
      check: function(event, data) {
        return event === 'round_end' && data.winResult &&
          data.winResult.breakdown.some(function(b) { return b.name.indexOf('Self Drawn') !== -1; });
      }
    },
    {
      name: 'Iron Defense',
      description: 'Complete a round without dealing in',
      xpBonus: 10,
      icon: '\uD83D\uDEE1\uFE0F',
      check: function(event, data) {
        return event === 'round_end' && !data.dealtIn;
      }
    },
    {
      name: 'Riichi Master',
      description: 'Declare Riichi and win',
      xpBonus: 20,
      icon: '\uD83D\uDCE2',
      check: function(event, data) {
        return event === 'round_end' && data.winResult &&
          data.winResult.breakdown.some(function(b) { return b.name.indexOf('Riichi') !== -1; });
      }
    },
    {
      name: 'Big Score',
      description: 'Score 25+ points in a single hand',
      xpBonus: 25,
      icon: '\uD83D\uDCB0',
      check: function(event, data) {
        return event === 'round_end' && data.winResult && data.winResult.total >= 25;
      }
    },
    {
      name: 'Clean Sweep',
      description: 'Win with a fully concealed hand',
      xpBonus: 15,
      icon: '\uD83D\uDD12',
      check: function(event, data) {
        return event === 'round_end' && data.winResult &&
          data.winResult.breakdown.some(function(b) { return b.name.indexOf('Concealed') !== -1; });
      }
    },
    {
      name: 'Flower Power',
      description: 'Collect 3+ flower tiles in one round',
      xpBonus: 10,
      icon: '\uD83C\uDF38',
      check: function(event, data) {
        return event === 'round_end' && data.winner && data.winner.isHuman &&
          (data.winner.flowerTiles ? data.winner.flowerTiles.length : 0) >= 3;
      }
    },
    {
      name: 'Patient Player',
      description: 'Play a full game (4 rounds)',
      xpBonus: 10,
      icon: '\u231B',
      check: function(event) {
        return event === 'game_end';
      }
    },
    {
      name: 'Comeback King',
      description: 'Win after being in last place',
      xpBonus: 30,
      icon: '\uD83D\uDC51',
      check: function(event, data) {
        return event === 'round_end' && data.winner && data.winner.isHuman && data.wasLastPlace;
      }
    },
    {
      name: 'Pure Heart',
      description: 'Win with a flush (all one suit)',
      xpBonus: 25,
      icon: '\uD83D\uDC8E',
      check: function(event, data) {
        return event === 'round_end' && data.winResult &&
          data.winResult.breakdown.some(function(b) {
            return b.name.indexOf('Flush') !== -1 || b.name.indexOf('Pure') !== -1;
          });
      }
    },
    {
      name: 'Chat Friend',
      description: 'Ask the tutor 3 questions',
      xpBonus: 5,
      icon: '\uD83D\uDCAC',
      check: function(event, data) {
        return event === 'chat' && data.count >= 3;
      }
    }
  ];

  // ── Deterministic seeded selection ─────────────────────────────

  function getDaySeed() {
    var now = new Date();
    return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  }

  function seededShuffle(arr, seed) {
    var copy = arr.slice();
    var s = seed;
    for (var i = copy.length - 1; i > 0; i--) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      var j = s % (i + 1);
      var tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  // ── DailyChallengeSystem class ─────────────────────────────────

  class DailyChallengeSystem {
    constructor() {
      this.state = null;
      this.load();
    }

    load() {
      try {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          var d = JSON.parse(raw);
          if (d && d.lastGenerated) {
            this.state = d;
            return;
          }
        }
      } catch (e) {
        // corrupt or unavailable
      }
      this.state = { lastGenerated: '', challenges: [], completedToday: [] };
    }

    save() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      } catch (e) {
        // localStorage unavailable
      }
    }

    /** Get today's challenges, regenerating if the day has changed. */
    getTodaysChallenges() {
      var today = new Date().toDateString();
      if (this.state.lastGenerated !== today) {
        this.state.challenges = this._generateChallenges();
        this.state.lastGenerated = today;
        this.state.completedToday = [];
        this.save();
      }
      var completed = this.state.completedToday;
      return this.state.challenges.map(function(c) {
        return {
          id: c.id,
          name: c.name,
          description: c.description,
          xpBonus: c.xpBonus,
          icon: c.icon,
          completed: completed.indexOf(c.id) !== -1
        };
      });
    }

    _generateChallenges() {
      var seed = getDaySeed();
      var shuffled = seededShuffle(CHALLENGE_POOL, seed);
      var selected = [];
      for (var i = 0; i < CHALLENGES_PER_DAY && i < shuffled.length; i++) {
        selected.push({
          id: 'daily_' + i,
          name: shuffled[i].name,
          description: shuffled[i].description,
          xpBonus: shuffled[i].xpBonus,
          icon: shuffled[i].icon,
          _poolIndex: CHALLENGE_POOL.indexOf(shuffled[i])
        });
      }
      return selected;
    }

    /** Check an event against active challenges. Returns array of newly completed challenges. */
    checkChallenge(event, data) {
      var todayStr = new Date().toDateString();
      if (this.state.lastGenerated !== todayStr) {
        this.getTodaysChallenges(); // refresh if stale
      }

      var newlyCompleted = [];
      var completed = this.state.completedToday;
      var challenges = this.state.challenges;

      for (var i = 0; i < challenges.length; i++) {
        var c = challenges[i];
        if (completed.indexOf(c.id) !== -1) continue;

        var poolEntry = CHALLENGE_POOL[c._poolIndex];
        if (poolEntry && poolEntry.check(event, data)) {
          completed.push(c.id);
          newlyCompleted.push({
            id: c.id,
            name: c.name,
            description: c.description,
            xpBonus: c.xpBonus,
            icon: c.icon
          });
        }
      }

      if (newlyCompleted.length > 0) {
        this.save();
      }
      return newlyCompleted;
    }

    /** Get summary progress for today's challenges. */
    getProgress() {
      var challenges = this.getTodaysChallenges();
      var completedCount = challenges.filter(function(c) { return c.completed; }).length;
      return {
        total: challenges.length,
        completed: completedCount,
        allDone: completedCount === challenges.length,
        challenges: challenges
      };
    }

    /** Calculate total bonus XP earned today. */
    getTodayBonusXP() {
      var challenges = this.getTodaysChallenges();
      var total = 0;
      challenges.forEach(function(c) {
        if (c.completed) total += c.xpBonus;
      });
      return total;
    }

    /** Build a DOM element showing challenge cards. */
    buildChallengeUI() {
      if (typeof document === 'undefined') return null;

      var container = document.createElement('div');
      container.className = 'daily-challenges';
      container.style.cssText = 'padding:12px;';

      var header = document.createElement('div');
      header.style.cssText = 'font-weight:bold;font-size:14px;color:var(--accent, #4fc3f7);margin-bottom:10px;';
      header.textContent = 'Daily Challenges';
      container.appendChild(header);

      var progress = this.getProgress();
      progress.challenges.forEach(function(c) {
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px;margin-bottom:6px;' +
          'border-radius:6px;background:rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.06);' +
          (c.completed ? 'opacity:0.6;' : '');

        var icon = document.createElement('span');
        icon.style.cssText = 'font-size:20px;';
        icon.textContent = c.icon;

        var info = document.createElement('div');
        info.style.cssText = 'flex:1;';

        var name = document.createElement('div');
        name.style.cssText = 'font-size:13px;font-weight:bold;color:#fff;';
        name.textContent = c.name + (c.completed ? ' \u2714' : '');

        var desc = document.createElement('div');
        desc.style.cssText = 'font-size:11px;color:rgba(255,255,255,0.5);';
        desc.textContent = c.description;

        var xp = document.createElement('div');
        xp.style.cssText = 'font-size:12px;color:var(--accent, #4fc3f7);font-weight:bold;white-space:nowrap;';
        xp.textContent = '+' + c.xpBonus + ' XP';

        info.appendChild(name);
        info.appendChild(desc);
        row.appendChild(icon);
        row.appendChild(info);
        row.appendChild(xp);
        container.appendChild(row);
      });

      return container;
    }
  }

  // ── Export ──────────────────────────────────────────────────────

  root.MJ.DailyChallenges = {
    CHALLENGE_POOL: CHALLENGE_POOL,
    DailyChallengeSystem: DailyChallengeSystem
  };

})(typeof window !== 'undefined' ? window : global);
