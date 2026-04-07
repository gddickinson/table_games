/**
 * character-quests.js - Unique quests per character that unlock special abilities
 * Each character has 3 quests unlocked at relationship levels 2, 3, and 4
 */
(function(exports) {
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  // ── Storage key ────────────────────────────────────────────────────
  var STORAGE_KEY = 'mj_character_quests';

  // ── Quest definitions ──────────────────────────────────────────────
  var QUEST_DEFINITIONS = {
    mei: [
      {
        id: 'mei_lv2_data_collection',
        characterId: 'mei',
        title: 'Data Collection',
        description: 'Win 5 hands with efficiency of 80% or higher compared to AI optimal play.',
        unlockLevel: 2,
        requirement: {
          type: 'win_with_efficiency',
          count: 5,
          threshold: 80
        },
        reward: {
          type: 'unlock_overlay',
          id: 'efficiency_overlay',
          title: 'Efficiency Overlay',
          description: 'Mei shares her tile analysis spreadsheet. A persistent efficiency overlay is now available during gameplay.',
          bonusText: 'Mei adjusts her glasses and slides a neatly organized spreadsheet across the table. "I\'ve been tracking your play patterns. Here, this should help you see what I see."'
        }
      },
      {
        id: 'mei_lv3_grandmothers_recipe',
        characterId: 'mei',
        title: 'Grandmother\'s Recipe',
        description: 'Win a hand with a full flush in the bamboo suit -- grandmother\'s favorite.',
        unlockLevel: 3,
        requirement: {
          type: 'win_with_flush',
          suit: 'bamboo',
          count: 1
        },
        reward: {
          type: 'permanent_bonus',
          id: 'mei_hand_value_bonus',
          bonusValue: 5,
          title: 'Grandmother\'s Blessing',
          description: '+5 permanent hand value bonus when Mei is at the table.',
          bonusText: 'Mei\'s eyes soften. "My grandmother taught me mahjong with bamboo tiles. She said the bamboo bends but never breaks, just like a good player." She pauses. "I think she would have liked you."'
        }
      },
      {
        id: 'mei_lv4_perfect_analysis',
        characterId: 'mei',
        title: 'Perfect Analysis',
        description: 'Achieve a 90%+ accuracy on your play report card.',
        unlockLevel: 4,
        requirement: {
          type: 'accuracy_report',
          threshold: 90
        },
        reward: {
          type: 'unlock_co_analyst',
          id: 'mei_co_analyst',
          title: 'Co-Analyst',
          description: 'Mei becomes a permanent co-analyst, commenting on your tile efficiency mid-game.',
          bonusText: 'Mei stands up and bows deeply. "Your analysis surpasses my models. From now on, let me assist you in real time. Two minds are better than one -- especially when one has a spreadsheet."'
        }
      }
    ],
    kenji: [
      {
        id: 'kenji_lv2_poker_face',
        characterId: 'kenji',
        title: 'Poker Face',
        description: 'Declare Riichi 3 times in a single game.',
        unlockLevel: 2,
        requirement: {
          type: 'riichi_in_game',
          count: 3
        },
        reward: {
          type: 'permanent_bonus',
          id: 'kenji_riichi_bonus',
          bonusValue: 2,
          title: 'Bluffing Technique',
          description: 'Kenji teaches his bluffing technique. Riichi bonus +2 when Kenji is present.',
          bonusText: 'Kenji grins and flicks a tile across the table. "Not bad! Most people chicken out after one riichi. Three? Now that\'s guts. Let me show you something..."'
        }
      },
      {
        id: 'kenji_lv3_all_in',
        characterId: 'kenji',
        title: 'All In',
        description: 'Win a hand worth 30 or more points.',
        unlockLevel: 3,
        requirement: {
          type: 'win_with_points',
          threshold: 30
        },
        reward: {
          type: 'unlock_venue',
          id: 'kenjis_ramen',
          title: 'Kenji\'s Ramen',
          description: 'Kenji invites you to the ramen shop. New venue unlocked: "Kenji\'s Ramen".',
          bonusText: 'Kenji slams the table (enthusiastically). "THAT\'S what I\'m talking about! Big hands, big wins! Come on, I\'m buying you ramen. I know a place -- best tonkotsu in the city."'
        }
      },
      {
        id: 'kenji_lv4_the_comeback',
        characterId: 'kenji',
        title: 'The Comeback',
        description: 'Win a game after being in last place at the start of round 3.',
        unlockLevel: 4,
        requirement: {
          type: 'comeback_victory',
          lastPlaceRound: 3
        },
        reward: {
          type: 'character_improvement',
          id: 'kenji_respect',
          relationshipBonus: 1,
          title: 'Kenji\'s Eternal Respect',
          description: 'Kenji gains +1 relationship and becomes less tilty permanently.',
          bonusText: 'Kenji stares at the final scores in disbelief, then breaks into a wide smile. "I\'ve been playing for years and I\'ve never seen a comeback like that. You\'ve earned my respect -- for real this time. No more trash talk. Well... maybe a little."'
        }
      }
    ],
    yuki: [
      {
        id: 'yuki_lv2_patient_path',
        characterId: 'yuki',
        title: 'The Patient Path',
        description: 'Play 10 rounds without claiming any tiles (fully concealed hands only).',
        unlockLevel: 2,
        requirement: {
          type: 'concealed_rounds',
          count: 10
        },
        reward: {
          type: 'story_text',
          id: 'yuki_haiku',
          title: 'Haiku of Patience',
          description: 'Yuki shares a haiku about patience.',
          bonusText: 'Yuki closes her eyes and speaks softly:\n\n"Still water reflects\nThe moon that rushing rivers\nCannot hope to hold"\n\nShe opens her eyes. "Patience is not passivity. It is the deepest form of strategy."'
        }
      },
      {
        id: 'yuki_lv3_reading_the_wind',
        characterId: 'yuki',
        title: 'Reading the Wind',
        description: 'Successfully fold 5 times when an opponent is tenpai (they win and you did not deal in).',
        unlockLevel: 3,
        requirement: {
          type: 'successful_folds',
          count: 5
        },
        reward: {
          type: 'unlock_ability',
          id: 'better_danger_hints',
          title: 'Hand Reading',
          description: 'Yuki teaches hand-reading. You now receive better danger tile hints.',
          bonusText: 'Yuki nods approvingly. "You see it now, don\'t you? The shape of their hand in the tiles they discard. Takeshi called it \'reading the wind.\' The tiles whisper their secrets to those patient enough to listen."'
        }
      },
      {
        id: 'yuki_lv4_takeshis_hand',
        characterId: 'yuki',
        title: 'Takeshi\'s Hand',
        description: 'Win with the specific hand pattern Takeshi loved: All Triplets.',
        unlockLevel: 4,
        requirement: {
          type: 'win_with_yaku',
          yaku: 'all_triplets',
          count: 1
        },
        reward: {
          type: 'permanent_bonus',
          id: 'takeshi_charm',
          bonusValue: 1,
          bonusType: 'flower',
          title: 'Takeshi\'s Lucky Charm',
          description: 'Yuki gives you Takeshi\'s lucky tile charm. +1 flower bonus permanently.',
          bonusText: 'Yuki reaches into her sleeve and produces a small jade tile charm, worn smooth by years of handling. Her voice wavers slightly. "This was Takeshi\'s. He carried it in every game. I think... I think he would want you to have it." She places it in your palm. "Play well. For both of us."'
        }
      }
    ]
  };

  // ── CharacterQuests class ──────────────────────────────────────────
  function CharacterQuests() {
    this._progress = {};
    this._completed = {};
    this._rewards = {};
    this._listeners = [];
    this._loadState();
  }

  /**
   * Load quest state from localStorage.
   */
  CharacterQuests.prototype._loadState = function() {
    if (typeof localStorage === 'undefined') return;
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        var data = JSON.parse(stored);
        this._progress = data.progress || {};
        this._completed = data.completed || {};
        this._rewards = data.rewards || {};
      }
    } catch (e) { /* ignore */ }
  };

  /**
   * Save quest state to localStorage.
   */
  CharacterQuests.prototype._saveState = function() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        progress: this._progress,
        completed: this._completed,
        rewards: this._rewards
      }));
    } catch (e) { /* storage unavailable */ }
  };

  /**
   * Get quest definitions for a character, along with their current status.
   * @param {string} characterId - 'mei', 'kenji', or 'yuki'
   * @returns {Array} quests with status info
   */
  CharacterQuests.prototype.getQuests = function(characterId) {
    var defs = QUEST_DEFINITIONS[characterId];
    if (!defs) return [];

    var self = this;
    return defs.map(function(def) {
      var questId = def.id;
      var progress = self._progress[questId] || 0;
      var isCompleted = !!self._completed[questId];
      var isUnlocked = self._isQuestUnlocked(characterId, def.unlockLevel);
      var target = self._getQuestTarget(def);

      return {
        id: questId,
        characterId: def.characterId,
        title: def.title,
        description: def.description,
        unlockLevel: def.unlockLevel,
        requirement: def.requirement,
        reward: def.reward,
        progress: progress,
        target: target,
        completed: isCompleted,
        unlocked: isUnlocked,
        progressPercent: target > 0 ? Math.min(100, Math.round((progress / target) * 100)) : 0
      };
    });
  };

  /**
   * Check if a quest is unlocked based on character relationship level.
   */
  CharacterQuests.prototype._isQuestUnlocked = function(characterId, requiredLevel) {
    // Check if MJ.CharacterRelations or similar system is available
    if (root.MJ && root.MJ.CharacterRelations) {
      try {
        var relations = root.MJ.CharacterRelations;
        if (typeof relations.getRelationshipLevel === 'function') {
          return relations.getRelationshipLevel(characterId) >= requiredLevel;
        }
        if (typeof relations.getLevel === 'function') {
          return relations.getLevel(characterId) >= requiredLevel;
        }
      } catch (e) { /* fallback */ }
    }
    // If no relations system, check if there is character growth data
    if (root.MJ && root.MJ.CharacterGrowth) {
      try {
        var growth = root.MJ.CharacterGrowth;
        if (typeof growth.getLevel === 'function') {
          return growth.getLevel(characterId) >= requiredLevel;
        }
      } catch (e) { /* fallback */ }
    }
    // Default: only level-2 quests are unlocked if we cannot determine relationship
    return requiredLevel <= 2;
  };

  /**
   * Get the numerical target for a quest requirement.
   */
  CharacterQuests.prototype._getQuestTarget = function(def) {
    var req = def.requirement;
    switch (req.type) {
      case 'win_with_efficiency': return req.count;
      case 'win_with_flush': return req.count;
      case 'accuracy_report': return 1;
      case 'riichi_in_game': return req.count;
      case 'win_with_points': return 1;
      case 'comeback_victory': return 1;
      case 'concealed_rounds': return req.count;
      case 'successful_folds': return req.count;
      case 'win_with_yaku': return req.count;
      default: return 1;
    }
  };

  /**
   * Check quest progress against a game event.
   * Call this whenever a relevant game event occurs.
   *
   * @param {string} event - Event type, e.g. 'hand_won', 'riichi_declared', 'round_ended', etc.
   * @param {Object} data - Event data with relevant fields
   * @returns {Array} List of quests that were just completed
   */
  CharacterQuests.prototype.checkProgress = function(event, data) {
    var newlyCompleted = [];
    var allCharIds = Object.keys(QUEST_DEFINITIONS);

    for (var c = 0; c < allCharIds.length; c++) {
      var charId = allCharIds[c];
      var quests = QUEST_DEFINITIONS[charId];

      for (var q = 0; q < quests.length; q++) {
        var def = quests[q];
        var questId = def.id;

        // Skip completed quests
        if (this._completed[questId]) continue;

        // Skip locked quests
        if (!this._isQuestUnlocked(charId, def.unlockLevel)) continue;

        // Initialize progress if needed
        if (this._progress[questId] === undefined) {
          this._progress[questId] = 0;
        }

        var matched = this._checkRequirement(def.requirement, event, data);
        if (matched) {
          this._progress[questId] += 1;
          var target = this._getQuestTarget(def);

          if (this._progress[questId] >= target) {
            var completed = this.completeQuest(charId, questId);
            if (completed) {
              newlyCompleted.push(completed);
            }
          }
        }
      }
    }

    if (newlyCompleted.length > 0 || this._hasProgressChanged) {
      this._saveState();
    }
    this._hasProgressChanged = false;

    return newlyCompleted;
  };

  /**
   * Check if a specific event matches a quest requirement.
   */
  CharacterQuests.prototype._checkRequirement = function(req, event, data) {
    data = data || {};

    switch (req.type) {
      case 'win_with_efficiency':
        if (event === 'hand_won' && data.efficiency !== undefined) {
          return data.efficiency >= req.threshold;
        }
        return false;

      case 'win_with_flush':
        if (event === 'hand_won' && data.yaku) {
          var hasFlush = data.yaku.indexOf('chinitsu') >= 0 ||
                         data.yaku.indexOf('full_flush') >= 0;
          var matchesSuit = !req.suit || data.flushSuit === req.suit;
          return hasFlush && matchesSuit;
        }
        return false;

      case 'accuracy_report':
        if (event === 'report_card' && data.accuracy !== undefined) {
          return data.accuracy >= req.threshold;
        }
        return false;

      case 'riichi_in_game':
        if (event === 'riichi_declared') {
          // Track per-game riichi count
          var gameId = data.gameId || 'current';
          if (!this._riichiCounts) this._riichiCounts = {};
          if (!this._riichiCounts[gameId]) this._riichiCounts[gameId] = 0;
          this._riichiCounts[gameId] += 1;
          return this._riichiCounts[gameId] >= req.count;
        }
        if (event === 'game_start') {
          // Reset riichi counter for new game
          this._riichiCounts = {};
          return false;
        }
        return false;

      case 'win_with_points':
        if (event === 'hand_won' && data.points !== undefined) {
          return data.points >= req.threshold;
        }
        return false;

      case 'comeback_victory':
        if (event === 'game_won' && data.wasLastPlace && data.lastPlaceRound !== undefined) {
          return data.lastPlaceRound >= req.lastPlaceRound;
        }
        return false;

      case 'concealed_rounds':
        if (event === 'round_ended' && data.isConcealed) {
          this._hasProgressChanged = true;
          return true;
        }
        return false;

      case 'successful_folds':
        if (event === 'round_ended' && data.foldedSuccessfully) {
          this._hasProgressChanged = true;
          return true;
        }
        return false;

      case 'win_with_yaku':
        if (event === 'hand_won' && data.yaku) {
          var yakuName = req.yaku.replace(/_/g, '');
          return data.yaku.some(function(y) {
            var normalizedY = y.replace(/[_\s]/g, '').toLowerCase();
            return normalizedY === yakuName ||
                   normalizedY === 'toitoi' ||
                   normalizedY === 'alltriplets';
          });
        }
        return false;

      default:
        return false;
    }
  };

  /**
   * Mark a quest as complete and apply its rewards.
   * @param {string} charId - Character ID
   * @param {string} questId - Quest ID
   * @returns {Object|null} Completed quest info with reward, or null if already completed
   */
  CharacterQuests.prototype.completeQuest = function(charId, questId) {
    if (this._completed[questId]) return null;

    // Find the quest definition
    var def = null;
    var quests = QUEST_DEFINITIONS[charId] || [];
    for (var i = 0; i < quests.length; i++) {
      if (quests[i].id === questId) {
        def = quests[i];
        break;
      }
    }
    if (!def) return null;

    this._completed[questId] = {
      completedAt: Date.now(),
      characterId: charId
    };

    // Store the reward for the game systems to query
    this._rewards[def.reward.id] = {
      questId: questId,
      characterId: charId,
      reward: def.reward,
      unlockedAt: Date.now()
    };

    // Apply immediate reward effects
    this._applyReward(def.reward, charId);

    this._saveState();

    // Notify listeners
    var completionInfo = {
      questId: questId,
      characterId: charId,
      title: def.title,
      reward: def.reward
    };

    for (var l = 0; l < this._listeners.length; l++) {
      try {
        this._listeners[l]('quest_complete', completionInfo);
      } catch (e) {
        console.error('[CharacterQuests] Listener error:', e);
      }
    }

    return completionInfo;
  };

  /**
   * Apply a quest reward to the game state.
   */
  CharacterQuests.prototype._applyReward = function(reward, charId) {
    switch (reward.type) {
      case 'character_improvement':
        // Apply relationship bonus
        if (reward.relationshipBonus && root.MJ && root.MJ.CharacterRelations) {
          try {
            var relations = root.MJ.CharacterRelations;
            if (typeof relations.addRelationship === 'function') {
              relations.addRelationship(charId, reward.relationshipBonus);
            }
          } catch (e) { /* system not available */ }
        }
        break;

      case 'unlock_venue':
        // Notify venue system if available
        if (root.MJ && root.MJ.Venues) {
          try {
            if (typeof root.MJ.Venues.unlock === 'function') {
              root.MJ.Venues.unlock(reward.id);
            }
          } catch (e) { /* system not available */ }
        }
        break;

      default:
        // Other reward types (overlay, ability, bonus, story) are
        // applied by game systems querying hasReward()
        break;
    }
  };

  /**
   * Get all currently active (unlocked but not completed) quests across all characters.
   * @returns {Array}
   */
  CharacterQuests.prototype.getActiveQuests = function() {
    var active = [];
    var allCharIds = Object.keys(QUEST_DEFINITIONS);

    for (var c = 0; c < allCharIds.length; c++) {
      var charQuests = this.getQuests(allCharIds[c]);
      for (var q = 0; q < charQuests.length; q++) {
        if (charQuests[q].unlocked && !charQuests[q].completed) {
          active.push(charQuests[q]);
        }
      }
    }

    return active;
  };

  /**
   * Check if a specific reward has been unlocked.
   * @param {string} rewardId
   * @returns {boolean}
   */
  CharacterQuests.prototype.hasReward = function(rewardId) {
    return !!this._rewards[rewardId];
  };

  /**
   * Get reward data for a specific reward.
   * @param {string} rewardId
   * @returns {Object|null}
   */
  CharacterQuests.prototype.getReward = function(rewardId) {
    return this._rewards[rewardId] || null;
  };

  /**
   * Get all unlocked rewards.
   * @returns {Object}
   */
  CharacterQuests.prototype.getAllRewards = function() {
    return JSON.parse(JSON.stringify(this._rewards));
  };

  /**
   * Register a listener for quest events.
   * @param {Function} fn - callback(eventType, data)
   */
  CharacterQuests.prototype.onQuestEvent = function(fn) {
    if (typeof fn === 'function') {
      this._listeners.push(fn);
    }
  };

  /**
   * Remove a quest event listener.
   * @param {Function} fn
   */
  CharacterQuests.prototype.offQuestEvent = function(fn) {
    this._listeners = this._listeners.filter(function(l) { return l !== fn; });
  };

  /**
   * Build and return a DOM element showing quests for a character.
   * @param {string} characterId
   * @returns {HTMLElement|null}
   */
  CharacterQuests.prototype.buildQuestUI = function(characterId) {
    if (typeof document === 'undefined') return null;

    var quests = this.getQuests(characterId);
    if (quests.length === 0) return null;

    var container = document.createElement('div');
    container.className = 'quest-panel';
    container.style.cssText = 'background:#2a2a2a;color:#eee;border-radius:10px;padding:16px;' +
      'font-family:sans-serif;max-width:400px;';

    var charName = characterId.charAt(0).toUpperCase() + characterId.slice(1);
    var header = document.createElement('h3');
    header.textContent = charName + '\'s Quests';
    header.style.cssText = 'margin:0 0 12px 0;font-size:1.2em;border-bottom:1px solid #555;padding-bottom:6px;';
    container.appendChild(header);

    for (var i = 0; i < quests.length; i++) {
      var quest = quests[i];
      var questEl = document.createElement('div');
      questEl.className = 'quest-item';
      questEl.style.cssText = 'margin-bottom:14px;padding:10px;border-radius:6px;' +
        'background:' + (quest.completed ? '#1a3a1a' : quest.unlocked ? '#1a1a2a' : '#1a1a1a') + ';' +
        'border:1px solid ' + (quest.completed ? '#4a8a4a' : quest.unlocked ? '#4a4a8a' : '#333') + ';' +
        'opacity:' + (quest.unlocked ? '1' : '0.5') + ';';

      // Quest header row
      var titleRow = document.createElement('div');
      titleRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;';

      var titleEl = document.createElement('div');
      titleEl.style.cssText = 'font-weight:bold;font-size:0.95em;';
      titleEl.textContent = (quest.completed ? '[DONE] ' : '') + quest.title;
      titleRow.appendChild(titleEl);

      var levelBadge = document.createElement('span');
      levelBadge.style.cssText = 'font-size:0.75em;color:#aaa;background:#333;padding:2px 6px;border-radius:8px;';
      levelBadge.textContent = 'Lv' + quest.unlockLevel;
      titleRow.appendChild(levelBadge);

      questEl.appendChild(titleRow);

      // Description
      var descEl = document.createElement('div');
      descEl.style.cssText = 'font-size:0.8em;color:#bbb;margin-bottom:6px;';
      descEl.textContent = quest.description;
      questEl.appendChild(descEl);

      if (quest.unlocked && !quest.completed) {
        // Progress bar
        var progressContainer = document.createElement('div');
        progressContainer.style.cssText = 'background:#333;border-radius:4px;height:8px;overflow:hidden;margin-bottom:4px;';

        var progressBar = document.createElement('div');
        progressBar.style.cssText = 'height:100%;border-radius:4px;transition:width 0.3s;' +
          'background:linear-gradient(90deg, #4a7aff, #7a4aff);' +
          'width:' + quest.progressPercent + '%;';
        progressContainer.appendChild(progressBar);
        questEl.appendChild(progressContainer);

        // Progress text
        var progressText = document.createElement('div');
        progressText.style.cssText = 'font-size:0.75em;color:#999;text-align:right;';
        progressText.textContent = quest.progress + ' / ' + quest.target + ' (' + quest.progressPercent + '%)';
        questEl.appendChild(progressText);
      }

      if (quest.completed) {
        // Show reward
        var rewardEl = document.createElement('div');
        rewardEl.style.cssText = 'font-size:0.8em;color:#8c8;margin-top:4px;' +
          'padding:6px;background:#1a2a1a;border-radius:4px;border:1px solid #3a5a3a;';
        rewardEl.textContent = 'Reward: ' + quest.reward.title + ' -- ' + quest.reward.description;
        questEl.appendChild(rewardEl);
      }

      if (!quest.unlocked) {
        // Locked message
        var lockedEl = document.createElement('div');
        lockedEl.style.cssText = 'font-size:0.8em;color:#888;font-style:italic;';
        lockedEl.textContent = 'Reach relationship level ' + quest.unlockLevel + ' to unlock';
        questEl.appendChild(lockedEl);
      }

      container.appendChild(questEl);
    }

    return container;
  };

  /**
   * Reset all quest progress (for testing or new save).
   */
  CharacterQuests.prototype.resetAll = function() {
    this._progress = {};
    this._completed = {};
    this._rewards = {};
    this._riichiCounts = {};
    this._saveState();
  };

  /**
   * Get the raw quest definitions (read-only).
   * @returns {Object}
   */
  CharacterQuests.prototype.getDefinitions = function() {
    return JSON.parse(JSON.stringify(QUEST_DEFINITIONS));
  };

  /**
   * Check if all quests for a character are completed.
   * @param {string} characterId
   * @returns {boolean}
   */
  CharacterQuests.prototype.isCharacterComplete = function(characterId) {
    var defs = QUEST_DEFINITIONS[characterId];
    if (!defs) return false;
    for (var i = 0; i < defs.length; i++) {
      if (!this._completed[defs[i].id]) return false;
    }
    return true;
  };

  /**
   * Get completion summary across all characters.
   * @returns {Object}
   */
  CharacterQuests.prototype.getSummary = function() {
    var summary = {};
    var charIds = Object.keys(QUEST_DEFINITIONS);
    for (var c = 0; c < charIds.length; c++) {
      var charId = charIds[c];
      var defs = QUEST_DEFINITIONS[charId];
      var completedCount = 0;
      for (var q = 0; q < defs.length; q++) {
        if (this._completed[defs[q].id]) completedCount++;
      }
      summary[charId] = {
        total: defs.length,
        completed: completedCount,
        allDone: completedCount === defs.length
      };
    }
    return summary;
  };

  // ── Export ─────────────────────────────────────────────────────────
  root.MJ.CharacterQuests = CharacterQuests;

})(typeof window !== 'undefined' ? window : global);
