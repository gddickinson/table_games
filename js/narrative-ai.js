/**
 * narrative-ai.js — Dynamic story arc generation from game history
 * Analyzes player patterns and generates personalized narrative arcs
 * that unfold across multiple game sessions.
 * Exports: root.MJ.NarrativeAI
 */
(function (exports) {
  'use strict';
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  const STORAGE_KEY = 'mj_narrative_arcs';
  const HISTORY_KEY = 'mj_narrative_history';

  // ── Character names for template filling ──

  var CHARACTERS = {
    kenji: { name: 'Kenji', personality: 'competitive', rival: true },
    yuki: { name: 'Yuki', personality: 'supportive', encourager: true },
    hana: { name: 'Hana', personality: 'analytical', mentor: true },
    takeshi: { name: 'Takeshi', personality: 'stoic', veteran: true }
  };

  // ── Story Templates ──

  var STORY_TEMPLATES = {

    rival_challenge: {
      id: 'rival_challenge',
      trigger: function (h) { return h.recentWinRate > 0.4; },
      priority: 3,
      cooldownGames: 30,
      parts: [
        {
          from: '{challenger}',
          text: '{challenger} has noticed your winning streak. "You think you\'re hot stuff? Let\'s settle this \u2014 best of 3, right now."',
          mood: 'fired_up'
        },
        {
          from: '{challenger}',
          text: '{challenger} is {emotion} after game 1. "{reaction}"',
          mood: 'intense',
          advanceOn: 'game_complete'
        },
        {
          from: '{challenger}',
          text: 'Final game. {challenger} says: "{final_words}"',
          mood: 'climax',
          advanceOn: 'game_complete'
        },
        {
          from: '{challenger}',
          text: '{challenger} {outcome_reaction}. "I\'ll get you next time," {challenger} says with a {outcome_expression}.',
          mood: 'resolution'
        }
      ],
      variables: {
        challenger: 'Kenji',
        emotion: 'frustrated',
        reaction: 'Lucky! That was pure luck!',
        final_words: 'Okay, I admit it. You\'re good.',
        outcome_reaction: 'shakes your hand firmly',
        outcome_expression: 'grudging grin'
      },
      dynamicVariables: function (gameResult, partIndex) {
        var vars = {};
        if (partIndex === 1) {
          if (gameResult && gameResult.playerWon) {
            vars.emotion = 'frustrated';
            vars.reaction = 'Lucky break! Don\'t get cocky!';
          } else {
            vars.emotion = 'smugly confident';
            vars.reaction = 'Ha! That\'s more like it. One more to go.';
          }
        }
        if (partIndex === 3) {
          if (gameResult && gameResult.playerWon) {
            vars.outcome_reaction = 'slaps the table, then laughs';
            vars.outcome_expression = 'grudging grin';
          } else {
            vars.outcome_reaction = 'pumps a fist in the air';
            vars.outcome_expression = 'triumphant smirk';
          }
        }
        return vars;
      }
    },

    encouragement: {
      id: 'encouragement',
      trigger: function (h) { return h.recentWinRate < 0.15 && h.recentGames >= 5; },
      priority: 4,
      cooldownGames: 15,
      parts: [
        {
          from: 'Yuki',
          text: 'Yuki slides a cup of tea across the table. "Tough run lately, huh? I remember when I first started \u2014 I lost fourteen games in a row."',
          mood: 'warm'
        },
        {
          from: 'Yuki',
          text: '"You know what helped me? Focusing on just one thing each game. This round, try watching what everyone discards. Don\'t worry about winning."',
          mood: 'encouraging',
          advanceOn: 'game_complete'
        },
        {
          from: 'Yuki',
          text: 'Yuki smiles. "See? You\'re already reading the table better. {progress_note}"',
          mood: 'proud',
          advanceOn: 'game_complete'
        }
      ],
      variables: {
        progress_note: 'Keep it up \u2014 the wins will come.'
      },
      dynamicVariables: function (gameResult) {
        if (gameResult && gameResult.playerWon) {
          return { progress_note: 'And look \u2014 a win! I knew you had it in you!' };
        }
        return { progress_note: 'Every game you play makes you stronger. I can see it.' };
      }
    },

    time_bond: {
      id: 'time_bond',
      trigger: function (h) { return h.nightGames > 5; },
      priority: 2,
      cooldownGames: 40,
      parts: [
        {
          from: 'Hana',
          text: 'Hana adjusts her glasses. "You know, I\'ve noticed you tend to play at night. There\'s something about the quiet hours that sharpens the mind."',
          mood: 'observant'
        },
        {
          from: 'Hana',
          text: '"I used to study game theory until 3 AM when I was in university. The patterns make more sense when the world is asleep, don\'t you think?"',
          mood: 'nostalgic',
          advanceOn: 'game_complete'
        },
        {
          from: 'Hana',
          text: 'Hana nods approvingly at your play. "Your {time_skill} is improving. Night owls play a different game \u2014 more patient, more deliberate."',
          mood: 'analytical',
          advanceOn: 'game_complete'
        }
      ],
      variables: {
        time_skill: 'defensive reading'
      },
      dynamicVariables: function (gameResult) {
        var skills = ['tile efficiency', 'defensive reading', 'push-pull judgment', 'meld timing'];
        return { time_skill: skills[Math.floor(Math.random() * skills.length)] };
      }
    },

    morning_routine: {
      id: 'morning_routine',
      trigger: function (h) { return h.morningGames > 5; },
      priority: 2,
      cooldownGames: 40,
      parts: [
        {
          from: 'Takeshi',
          text: 'Takeshi is already seated when you arrive. "Early bird, huh? I respect that. The morning air keeps the head clear."',
          mood: 'respectful'
        },
        {
          from: 'Takeshi',
          text: '"I\'ve been playing morning games for forty years. It\'s like meditation. You shuffle, you deal, and the day makes sense."',
          mood: 'reflective',
          advanceOn: 'game_complete'
        },
        {
          from: 'Takeshi',
          text: 'Takeshi raises his tea. "To the morning game. May it always bring clarity."',
          mood: 'warm',
          advanceOn: 'game_complete'
        }
      ],
      variables: {},
      dynamicVariables: function () { return {}; }
    },

    special_bond: {
      id: 'special_bond',
      trigger: function (h) { return h.favoriteCharacter && h.gamesWithFavorite > 20; },
      priority: 5,
      cooldownGames: 50,
      parts: [
        {
          from: '{favorite}',
          text: '{favorite} seems unusually thoughtful today. "We\'ve played a lot of games together, haven\'t we? More than I play with most people."',
          mood: 'sincere'
        },
        {
          from: '{favorite}',
          text: '"I wanted to show you something." {favorite} reveals a {keepsake}. "{keepsake_story}"',
          mood: 'intimate',
          advanceOn: 'game_complete'
        },
        {
          from: '{favorite}',
          text: '{favorite} plays with unusual focus. "This game is for you. Watch closely \u2014 I\'m going to show you my best move."',
          mood: 'determined',
          advanceOn: 'game_complete'
        },
        {
          from: '{favorite}',
          text: '"{bond_conclusion}" {favorite} says. You feel your bond has deepened.',
          mood: 'heartfelt'
        }
      ],
      variables: {
        favorite: 'Yuki',
        keepsake: 'worn mahjong tile',
        keepsake_story: 'My grandmother gave me this. It\'s from her first set. She said it brought her luck.',
        bond_conclusion: 'Thanks for being someone I can share this with.'
      },
      dynamicVariables: function (gameResult, partIndex, data) {
        var charName = data.favoriteCharacter || 'Yuki';
        charName = charName.charAt(0).toUpperCase() + charName.slice(1);
        var vars = { favorite: charName };
        var keepsakes = {
          kenji: { item: 'faded tournament bracket', story: 'This is from my first tournament. I came in dead last, but I loved every second.' },
          yuki: { item: 'worn mahjong tile', story: 'My grandmother gave me this. It\'s from her first set.' },
          hana: { item: 'dog-eared strategy notebook', story: 'I\'ve been writing in this for ten years. Every lesson, every insight.' },
          takeshi: { item: 'cracked bamboo tile', story: 'This tile survived the fire that took my first parlor. I carry it everywhere.' }
        };
        var charKey = (data.favoriteCharacter || 'yuki').toLowerCase();
        if (keepsakes[charKey]) {
          vars.keepsake = keepsakes[charKey].item;
          vars.keepsake_story = keepsakes[charKey].story;
        }
        return vars;
      }
    },

    reunion: {
      id: 'reunion',
      trigger: function (h) { return h.daysSinceLastPlay > 7; },
      priority: 4,
      cooldownGames: 0,
      parts: [
        {
          from: '{greeter}',
          text: '{greeter} looks up with surprise. "Hey! It\'s been {days} days! I was starting to wonder if you\'d found a better table."',
          mood: 'happy'
        },
        {
          from: '{greeter}',
          text: '"While you were gone, {absence_news}. But enough about that \u2014 let\'s play! I\'ve been itching for a real match."',
          mood: 'excited',
          advanceOn: 'game_complete'
        },
        {
          from: '{greeter}',
          text: '"Good to have you back. {return_note}"',
          mood: 'warm'
        }
      ],
      variables: {
        greeter: 'Kenji',
        days: '7',
        absence_news: 'Hana won the club tournament',
        return_note: 'The table feels right again.'
      },
      dynamicVariables: function (gameResult, partIndex, data) {
        var greeters = ['Kenji', 'Yuki', 'Hana', 'Takeshi'];
        var news = [
          'Kenji finally beat his losing streak',
          'Yuki taught a beginner class',
          'Hana published a strategy article',
          'Takeshi organized a mini tournament',
          'we rearranged the tables',
          'the cherry blossoms bloomed outside the window'
        ];
        return {
          greeter: greeters[Math.floor(Math.random() * greeters.length)],
          days: String(data.daysSinceLastPlay || 7),
          absence_news: news[Math.floor(Math.random() * news.length)],
          return_note: gameResult && gameResult.playerWon
            ? 'And you haven\'t lost your touch!'
            : 'Take your time getting back into the groove.'
        };
      }
    }
  };

  // ── NarrativeAI class ──

  function NarrativeAI() {
    this._activeArcs = [];
    this._completedArcIds = [];
    this._loadState();
  }

  // ── State persistence ──

  NarrativeAI.prototype._loadState = function () {
    try {
      var data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        var state = JSON.parse(data);
        this._activeArcs = state.activeArcs || [];
        this._completedArcIds = state.completedArcIds || [];
      }
    } catch (e) {
      console.warn('NarrativeAI: Failed to load state', e);
    }
  };

  NarrativeAI.prototype._saveState = function () {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        activeArcs: this._activeArcs,
        completedArcIds: this._completedArcIds
      }));
    } catch (e) {
      console.warn('NarrativeAI: Failed to save state', e);
    }
  };

  // ── Template filling ──

  NarrativeAI.prototype.fillTemplate = function (template, gameData) {
    if (!template || typeof template !== 'string') return '';
    var result = template;
    if (gameData) {
      var keys = Object.keys(gameData);
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var placeholder = '{' + key + '}';
        while (result.indexOf(placeholder) !== -1) {
          result = result.replace(placeholder, String(gameData[key]));
        }
      }
    }
    return result;
  };

  // ── Analyze game history for trigger data ──

  NarrativeAI.prototype._analyzeHistory = function (gameHistory, relationships, personality) {
    var h = {
      totalGames: 0,
      recentGames: 0,
      recentWins: 0,
      recentWinRate: 0,
      nightGames: 0,
      morningGames: 0,
      favoriteCharacter: null,
      gamesWithFavorite: 0,
      daysSinceLastPlay: 0
    };

    if (!gameHistory || !Array.isArray(gameHistory)) return h;

    h.totalGames = gameHistory.length;
    var now = Date.now();
    var recentCutoff = now - 10 * 24 * 60 * 60 * 1000; // last 10 days
    var charCounts = {};

    gameHistory.forEach(function (game) {
      var ts = game.timestamp || game.date || 0;
      if (typeof ts === 'string') ts = new Date(ts).getTime();

      if (ts > recentCutoff) {
        h.recentGames++;
        if (game.playerWon || game.result === 'win') h.recentWins++;
      }

      // Time of day analysis
      var date = new Date(ts);
      var hour = date.getHours();
      if (hour >= 22 || hour < 5) h.nightGames++;
      if (hour >= 5 && hour < 10) h.morningGames++;

      // Character tracking
      var opponents = game.opponents || game.characters || [];
      opponents.forEach(function (c) {
        var name = typeof c === 'string' ? c : c.name || c.id;
        if (name) {
          charCounts[name] = (charCounts[name] || 0) + 1;
        }
      });
    });

    h.recentWinRate = h.recentGames > 0 ? h.recentWins / h.recentGames : 0;

    // Favorite character
    var maxChar = null;
    var maxCount = 0;
    Object.keys(charCounts).forEach(function (name) {
      if (charCounts[name] > maxCount) {
        maxCount = charCounts[name];
        maxChar = name;
      }
    });
    h.favoriteCharacter = maxChar;
    h.gamesWithFavorite = maxCount;

    // Days since last play
    if (gameHistory.length > 0) {
      var lastGame = gameHistory[gameHistory.length - 1];
      var lastTs = lastGame.timestamp || lastGame.date || 0;
      if (typeof lastTs === 'string') lastTs = new Date(lastTs).getTime();
      h.daysSinceLastPlay = Math.floor((now - lastTs) / (24 * 60 * 60 * 1000));
    }

    // Merge in relationship data
    if (relationships) {
      h.relationships = relationships;
    }
    if (personality) {
      h.personality = personality;
    }

    return h;
  };

  // ── Generate a new arc ──

  NarrativeAI.prototype.generateArc = function (gameHistory, relationships, personality) {
    var analysis = this._analyzeHistory(gameHistory, relationships, personality);
    var candidates = [];

    var self = this;
    var activeIds = this._activeArcs.map(function (a) { return a.templateId; });

    Object.keys(STORY_TEMPLATES).forEach(function (key) {
      var template = STORY_TEMPLATES[key];
      // Skip if already active or on cooldown
      if (activeIds.indexOf(template.id) >= 0) return;

      // Check cooldown from completed arcs
      var lastCompleted = self._completedArcIds.filter(function (entry) {
        return entry.id === template.id;
      });
      if (lastCompleted.length > 0 && template.cooldownGames > 0) {
        var last = lastCompleted[lastCompleted.length - 1];
        var gamesSince = analysis.totalGames - (last.atGame || 0);
        if (gamesSince < template.cooldownGames) return;
      }

      // Check trigger
      try {
        if (template.trigger(analysis)) {
          candidates.push({ key: key, template: template, priority: template.priority || 1 });
        }
      } catch (e) {
        // Trigger evaluation failed; skip
      }
    });

    if (candidates.length === 0) return null;

    // Pick highest priority (or random among tied)
    candidates.sort(function (a, b) { return b.priority - a.priority; });
    var best = candidates[0];

    // Build initial variables
    var vars = Object.assign({}, best.template.variables);
    if (best.template.dynamicVariables) {
      var dynamic = best.template.dynamicVariables(null, 0, analysis);
      Object.assign(vars, dynamic);
    }

    var arc = {
      id: 'arc_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 4),
      templateId: best.template.id,
      templateKey: best.key,
      currentPart: 0,
      variables: vars,
      startedAt: Date.now(),
      startedAtGame: analysis.totalGames,
      gamesPlayed: 0,
      completed: false
    };

    this._activeArcs.push(arc);
    this._saveState();

    // Return the first part text
    var firstPart = best.template.parts[0];
    return {
      arcId: arc.id,
      from: this.fillTemplate(firstPart.from, vars),
      text: this.fillTemplate(firstPart.text, vars),
      mood: firstPart.mood,
      partIndex: 0,
      totalParts: best.template.parts.length
    };
  };

  // ── Check for new arcs ──

  NarrativeAI.prototype.checkForNewArc = function (gameHistory, relationships, personality) {
    // Only generate a new arc if we have fewer than 2 active
    if (this._activeArcs.length >= 2) return null;
    return this.generateArc(gameHistory, relationships, personality);
  };

  // ── Get active narratives ──

  NarrativeAI.prototype.getActiveNarratives = function () {
    return this._activeArcs.filter(function (a) { return !a.completed; }).map(function (arc) {
      var template = STORY_TEMPLATES[arc.templateKey];
      if (!template) return null;
      var part = template.parts[arc.currentPart];
      if (!part) return null;
      return {
        arcId: arc.id,
        templateId: arc.templateId,
        from: arc.variables ? arc.variables.favorite || arc.variables.challenger || arc.variables.greeter || part.from : part.from,
        currentPart: arc.currentPart,
        totalParts: template.parts.length,
        mood: part.mood,
        startedAt: arc.startedAt,
        gamesPlayed: arc.gamesPlayed
      };
    }).filter(Boolean);
  };

  // ── Advance a narrative ──

  NarrativeAI.prototype.advanceNarrative = function (arcId, gameResult) {
    var arcIndex = -1;
    for (var i = 0; i < this._activeArcs.length; i++) {
      if (this._activeArcs[i].id === arcId) {
        arcIndex = i;
        break;
      }
    }
    if (arcIndex < 0) return null;

    var arc = this._activeArcs[arcIndex];
    var template = STORY_TEMPLATES[arc.templateKey];
    if (!template) return null;

    arc.gamesPlayed++;

    // Check if current part requires a game to advance
    var currentPart = template.parts[arc.currentPart];
    if (currentPart && currentPart.advanceOn === 'game_complete') {
      arc.currentPart++;
    } else if (arc.currentPart === 0) {
      // First part auto-advances after being shown
      arc.currentPart++;
    }

    // Apply dynamic variables based on game result
    if (template.dynamicVariables) {
      var dynamic = template.dynamicVariables(gameResult, arc.currentPart, arc.variables);
      Object.assign(arc.variables, dynamic);
    }

    // Check if arc is complete
    if (arc.currentPart >= template.parts.length) {
      arc.completed = true;
      this._completedArcIds.push({
        id: arc.templateId,
        atGame: arc.startedAtGame + arc.gamesPlayed
      });
      this._activeArcs.splice(arcIndex, 1);
      this._saveState();
      return {
        arcId: arc.id,
        completed: true,
        text: 'Story arc complete.',
        mood: 'resolution'
      };
    }

    this._saveState();

    var nextPart = template.parts[arc.currentPart];
    return {
      arcId: arc.id,
      from: this.fillTemplate(nextPart.from, arc.variables),
      text: this.fillTemplate(nextPart.text, arc.variables),
      mood: nextPart.mood,
      partIndex: arc.currentPart,
      totalParts: template.parts.length,
      completed: false
    };
  };

  // ── Expose templates for external inspection ──

  NarrativeAI.prototype.getTemplates = function () {
    return STORY_TEMPLATES;
  };

  // ── Reset (for testing) ──

  NarrativeAI.prototype.reset = function () {
    this._activeArcs = [];
    this._completedArcIds = [];
    this._saveState();
  };

  // ── Export ──
  root.MJ.NarrativeAI = new NarrativeAI();

})(typeof window !== 'undefined' ? window : this);
