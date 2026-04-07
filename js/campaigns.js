(function(exports) {
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  // ---------------------------------------------------------------------------
  // Storage key
  // ---------------------------------------------------------------------------

  var STORAGE_KEY = 'mj_campaigns';

  // ---------------------------------------------------------------------------
  // Campaign Definitions
  // ---------------------------------------------------------------------------

  var CAMPAIGNS = {
    dragon_path: {
      id: 'dragon_path',
      name: 'The Dragon Path',
      description: 'Master the three great dragons and claim their power.',
      icon: '\uD83D\uDC09',
      stages: [
        {
          id: 'dp_1',
          name: 'First Flame',
          description: 'Win a hand with any Dragon Pong.',
          reward: { xp: 20 },
          condition: {
            type: 'win_with_dragon_pong',
            count: 1
          }
        },
        {
          id: 'dp_2',
          name: 'Twin Dragons',
          description: 'Win with 2 different Dragon Pongs in one game (across rounds).',
          reward: { xp: 30 },
          condition: {
            type: 'distinct_dragon_pongs_in_game',
            count: 2
          }
        },
        {
          id: 'dp_3',
          name: "Dragon's Breath",
          description: 'Score 30+ points in a single hand with Dragon Pong.',
          reward: { xp: 40 },
          condition: {
            type: 'score_with_dragon_pong',
            minScore: 30
          }
        },
        {
          id: 'dp_4',
          name: 'Small Three Dragons',
          description: 'Win with Small Three Dragons (Xiao San Yuan).',
          reward: { xp: 60 },
          condition: {
            type: 'win_with_yaku',
            yaku: 'xiao_san_yuan'
          }
        },
        {
          id: 'dp_5',
          name: 'The Dragon Master',
          description: 'Win with Big Three Dragons (Da San Yuan).',
          reward: { xp: 100, title: 'Dragon Master' },
          condition: {
            type: 'win_with_yaku',
            yaku: 'da_san_yuan'
          }
        }
      ]
    },

    defensive_mastery: {
      id: 'defensive_mastery',
      name: 'Defensive Mastery',
      description: 'Learn to guard yourself and outlast your opponents.',
      icon: '\uD83D\uDEE1\uFE0F',
      stages: [
        {
          id: 'dm_1',
          name: 'Safe Haven',
          description: 'Complete 3 rounds without dealing in.',
          reward: { xp: 15 },
          condition: {
            type: 'rounds_without_dealing_in',
            count: 3
          }
        },
        {
          id: 'dm_2',
          name: 'Wall of Steel',
          description: 'Fold to riichi 3 times in one game.',
          reward: { xp: 20 },
          condition: {
            type: 'fold_to_riichi_in_game',
            count: 3
          }
        },
        {
          id: 'dm_3',
          name: 'Reading the Wind',
          description: 'Win after an opponent declares riichi.',
          reward: { xp: 30 },
          condition: {
            type: 'win_after_opponent_riichi',
            count: 1
          }
        },
        {
          id: 'dm_4',
          name: 'Perfect Game',
          description: 'Win a 4-round game without dealing in once.',
          reward: { xp: 50 },
          condition: {
            type: 'win_game_no_deal_in',
            rounds: 4
          }
        },
        {
          id: 'dm_5',
          name: 'The Fortress',
          description: 'Win 10 rounds total without dealing in.',
          reward: { xp: 80, title: 'Iron Wall' },
          condition: {
            type: 'cumulative_rounds_no_deal_in',
            count: 10
          }
        }
      ]
    },

    art_of_mahjong: {
      id: 'art_of_mahjong',
      name: 'The Art of Mahjong',
      description: 'Pursue beauty and perfection in every hand you build.',
      icon: '\uD83C\uDFA8',
      stages: [
        {
          id: 'am_1',
          name: 'First Brushstroke',
          description: 'Win with All Sequences (Ping Hu).',
          reward: { xp: 15 },
          condition: {
            type: 'win_with_yaku',
            yaku: 'pinfu'
          }
        },
        {
          id: 'am_2',
          name: 'Pure Vision',
          description: 'Win with a flush (any type).',
          reward: { xp: 25 },
          condition: {
            type: 'win_with_flush',
            count: 1
          }
        },
        {
          id: 'am_3',
          name: 'Hidden Strength',
          description: 'Win with a fully concealed hand.',
          reward: { xp: 20 },
          condition: {
            type: 'win_concealed',
            count: 1
          }
        },
        {
          id: 'am_4',
          name: 'Grand Design',
          description: 'Score 50+ points in one hand.',
          reward: { xp: 50 },
          condition: {
            type: 'score_in_hand',
            minScore: 50
          }
        },
        {
          id: 'am_5',
          name: 'Masterpiece',
          description: 'Win with a hand worth 80+ points.',
          reward: { xp: 100, title: 'Artist' },
          condition: {
            type: 'score_in_hand',
            minScore: 80
          }
        }
      ]
    }
  };

  // ---------------------------------------------------------------------------
  // Persistence helpers
  // ---------------------------------------------------------------------------

  function loadProgress() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('[Campaigns] Failed to load progress:', e);
    }
    return {};
  }

  function saveProgress(progress) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (e) {
      console.warn('[Campaigns] Failed to save progress:', e);
    }
  }

  // ---------------------------------------------------------------------------
  // CampaignManager
  // ---------------------------------------------------------------------------

  function CampaignManager() {
    this._campaigns = JSON.parse(JSON.stringify(CAMPAIGNS));
    this._progress = loadProgress();
    this._listeners = [];
  }

  /**
   * Register a callback that fires whenever a stage is completed.
   * callback(campaignId, stageId, reward)
   */
  CampaignManager.prototype.on = function(eventName, callback) {
    this._listeners.push({ event: eventName, fn: callback });
  };

  CampaignManager.prototype._emit = function(eventName, data) {
    this._listeners.forEach(function(l) {
      if (l.event === eventName) {
        try { l.fn(data); } catch (e) { console.error(e); }
      }
    });
  };

  // ---- Core API -------------------------------------------------------------

  /**
   * Return all campaigns with current progress merged in.
   * @returns {object[]}
   */
  CampaignManager.prototype.getCampaigns = function() {
    var self = this;
    return Object.keys(this._campaigns).map(function(id) {
      return self.getCampaign(id);
    });
  };

  /**
   * Return a single campaign with progress merged in.
   * @param {string} id
   * @returns {object|null}
   */
  CampaignManager.prototype.getCampaign = function(id) {
    var campaign = this._campaigns[id];
    if (!campaign) return null;

    var progress = this._progress[id] || {};
    var completedStages = progress.completed || [];
    var totalXP = progress.totalXP || 0;

    var stages = campaign.stages.map(function(stage, index) {
      var isCompleted = completedStages.indexOf(stage.id) !== -1;
      var isActive = !isCompleted && (index === 0 || completedStages.indexOf(campaign.stages[index - 1].id) !== -1);

      return {
        id: stage.id,
        name: stage.name,
        description: stage.description,
        reward: stage.reward,
        condition: stage.condition,
        completed: isCompleted,
        active: isActive,
        locked: !isCompleted && !isActive
      };
    });

    var completedCount = completedStages.length;
    var totalCount = campaign.stages.length;

    return {
      id: campaign.id,
      name: campaign.name,
      description: campaign.description,
      icon: campaign.icon,
      stages: stages,
      completedCount: completedCount,
      totalCount: totalCount,
      progressPercent: Math.round((completedCount / totalCount) * 100),
      totalXP: totalXP,
      isComplete: completedCount === totalCount
    };
  };

  /**
   * Get the currently active (next to complete) stage for a campaign.
   * @param {string} campaignId
   * @returns {object|null}
   */
  CampaignManager.prototype.getActiveStage = function(campaignId) {
    var campaign = this.getCampaign(campaignId);
    if (!campaign) return null;

    for (var i = 0; i < campaign.stages.length; i++) {
      if (campaign.stages[i].active) {
        return campaign.stages[i];
      }
    }
    return null; // all completed
  };

  /**
   * Mark a stage as completed. Awards XP and persists progress.
   * @param {string} campaignId
   * @param {string} stageId
   * @returns {{ xp: number, title?: string }|null} the reward, or null if
   *          already completed or invalid
   */
  CampaignManager.prototype.completeStage = function(campaignId, stageId) {
    var campaign = this._campaigns[campaignId];
    if (!campaign) return null;

    // Find the stage definition
    var stageDef = null;
    for (var i = 0; i < campaign.stages.length; i++) {
      if (campaign.stages[i].id === stageId) {
        stageDef = campaign.stages[i];
        break;
      }
    }
    if (!stageDef) return null;

    // Initialise progress bucket
    if (!this._progress[campaignId]) {
      this._progress[campaignId] = { completed: [], totalXP: 0 };
    }
    var prog = this._progress[campaignId];

    // Already completed?
    if (prog.completed.indexOf(stageId) !== -1) return null;

    prog.completed.push(stageId);
    prog.totalXP += stageDef.reward.xp;

    saveProgress(this._progress);

    this._emit('stage_complete', {
      campaignId: campaignId,
      stageId: stageId,
      reward: stageDef.reward
    });

    return JSON.parse(JSON.stringify(stageDef.reward));
  };

  // ---- Progress checker -----------------------------------------------------

  /**
   * Check whether a game event advances any active campaign stage.
   *
   * Call this from the game loop whenever a relevant event fires (win, round
   * end, etc.).  The method inspects every active stage's condition against the
   * supplied event data and auto-completes stages that are satisfied.
   *
   * @param {string} event — event type, e.g. 'hand_won', 'round_end', 'game_end'
   * @param {object} data  — event payload with contextual info
   * @returns {object[]}   — array of { campaignId, stageId, reward } for any
   *                          stages completed by this event
   */
  CampaignManager.prototype.checkProgress = function(event, data) {
    var self = this;
    var completions = [];

    Object.keys(this._campaigns).forEach(function(cid) {
      var active = self.getActiveStage(cid);
      if (!active) return;

      var met = self._evaluateCondition(active.condition, event, data);
      if (met) {
        var reward = self.completeStage(cid, active.id);
        if (reward) {
          completions.push({
            campaignId: cid,
            stageId: active.id,
            reward: reward
          });
        }
      }
    });

    return completions;
  };

  /**
   * Internal: evaluate a single condition against an event + data.
   */
  CampaignManager.prototype._evaluateCondition = function(condition, event, data) {
    if (!condition || !data) return false;

    switch (condition.type) {

      // --- Dragon Path ---
      case 'win_with_dragon_pong':
        return event === 'hand_won' && data.hasDragonPong === true;

      case 'distinct_dragon_pongs_in_game':
        return event === 'hand_won' &&
               Array.isArray(data.distinctDragonPongs) &&
               data.distinctDragonPongs.length >= condition.count;

      case 'score_with_dragon_pong':
        return event === 'hand_won' &&
               data.hasDragonPong === true &&
               typeof data.score === 'number' &&
               data.score >= condition.minScore;

      case 'win_with_yaku':
        return event === 'hand_won' &&
               Array.isArray(data.yaku) &&
               data.yaku.indexOf(condition.yaku) !== -1;

      // --- Defensive Mastery ---
      case 'rounds_without_dealing_in':
        return event === 'round_end' &&
               typeof data.consecutiveRoundsNoDealIn === 'number' &&
               data.consecutiveRoundsNoDealIn >= condition.count;

      case 'fold_to_riichi_in_game':
        return event === 'round_end' &&
               typeof data.foldToRiichiCount === 'number' &&
               data.foldToRiichiCount >= condition.count;

      case 'win_after_opponent_riichi':
        return event === 'hand_won' &&
               data.opponentInRiichi === true;

      case 'win_game_no_deal_in':
        return event === 'game_end' &&
               data.playerWon === true &&
               data.dealtIn === false &&
               typeof data.roundsPlayed === 'number' &&
               data.roundsPlayed >= condition.rounds;

      case 'cumulative_rounds_no_deal_in':
        return event === 'round_end' &&
               typeof data.totalRoundsNoDealIn === 'number' &&
               data.totalRoundsNoDealIn >= condition.count;

      // --- Art of Mahjong ---
      case 'win_with_flush':
        return event === 'hand_won' && data.hasFlush === true;

      case 'win_concealed':
        return event === 'hand_won' && data.concealed === true;

      case 'score_in_hand':
        return event === 'hand_won' &&
               typeof data.score === 'number' &&
               data.score >= condition.minScore;

      default:
        return false;
    }
  };

  // ---------------------------------------------------------------------------
  // UI Builder
  // ---------------------------------------------------------------------------

  /**
   * Build a DOM element showing all campaigns, progress bars, and stage details.
   * @returns {HTMLElement}
   */
  CampaignManager.prototype.buildCampaignUI = function() {
    var campaigns = this.getCampaigns();

    var container = document.createElement('div');
    container.className = 'campaign-container';
    container.style.cssText = 'display:flex;flex-direction:column;gap:24px;padding:16px;max-width:720px;margin:0 auto;';

    var heading = document.createElement('h2');
    heading.textContent = 'Campaigns';
    heading.style.cssText = 'margin:0 0 4px 0;font-size:1.5em;color:#f0e6d3;';
    container.appendChild(heading);

    campaigns.forEach(function(campaign) {
      var card = _buildCampaignCard(campaign);
      container.appendChild(card);
    });

    return container;
  };

  function _buildCampaignCard(campaign) {
    var card = document.createElement('div');
    card.className = 'campaign-card';
    card.style.cssText = [
      'background:#1a1a2e',
      'border:1px solid #333',
      'border-radius:12px',
      'padding:20px',
      'color:#ddd'
    ].join(';');

    // Header row: icon + name + progress %
    var header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:8px;';

    var icon = document.createElement('span');
    icon.textContent = campaign.icon;
    icon.style.cssText = 'font-size:1.6em;';
    header.appendChild(icon);

    var title = document.createElement('h3');
    title.textContent = campaign.name;
    title.style.cssText = 'margin:0;flex:1;font-size:1.15em;color:#fff;';
    header.appendChild(title);

    var pct = document.createElement('span');
    pct.textContent = campaign.progressPercent + '%';
    pct.style.cssText = 'font-size:0.9em;color:' + (campaign.isComplete ? '#4f4' : '#aaa') + ';';
    header.appendChild(pct);

    card.appendChild(header);

    // Description
    var desc = document.createElement('p');
    desc.textContent = campaign.description;
    desc.style.cssText = 'margin:0 0 12px 0;font-size:0.85em;color:#999;';
    card.appendChild(desc);

    // Progress bar
    var barOuter = document.createElement('div');
    barOuter.style.cssText = [
      'width:100%',
      'height:8px',
      'background:#333',
      'border-radius:4px',
      'overflow:hidden',
      'margin-bottom:16px'
    ].join(';');

    var barInner = document.createElement('div');
    var barColor = campaign.isComplete ? '#4f4' : '#4a8';
    barInner.style.cssText = [
      'width:' + campaign.progressPercent + '%',
      'height:100%',
      'background:' + barColor,
      'border-radius:4px',
      'transition:width 0.4s ease'
    ].join(';');
    barOuter.appendChild(barInner);
    card.appendChild(barOuter);

    // Stages list
    var stageList = document.createElement('div');
    stageList.style.cssText = 'display:flex;flex-direction:column;gap:10px;';

    campaign.stages.forEach(function(stage) {
      var row = _buildStageRow(stage);
      stageList.appendChild(row);
    });

    card.appendChild(stageList);

    // XP summary
    if (campaign.totalXP > 0) {
      var xpRow = document.createElement('div');
      xpRow.style.cssText = 'margin-top:12px;text-align:right;font-size:0.85em;color:#cf9;';
      xpRow.textContent = 'Total XP earned: ' + campaign.totalXP;
      card.appendChild(xpRow);
    }

    return card;
  }

  function _buildStageRow(stage) {
    var row = document.createElement('div');
    row.className = 'campaign-stage';

    var borderColor = stage.completed ? '#4f4' : stage.active ? '#fc3' : '#444';
    var bgColor = stage.completed ? '#1a2e1a' : stage.active ? '#2e2a1a' : '#1a1a1a';

    row.style.cssText = [
      'display:flex',
      'align-items:center',
      'gap:10px',
      'padding:10px 12px',
      'border-radius:8px',
      'border:1px solid ' + borderColor,
      'background:' + bgColor,
      'opacity:' + (stage.locked ? '0.5' : '1')
    ].join(';');

    // Status indicator
    var status = document.createElement('span');
    if (stage.completed) {
      status.textContent = '\u2713';
      status.style.cssText = 'color:#4f4;font-size:1.2em;min-width:22px;text-align:center;';
    } else if (stage.active) {
      status.textContent = '\u25B6';
      status.style.cssText = 'color:#fc3;font-size:1em;min-width:22px;text-align:center;';
    } else {
      status.textContent = '\u25CB';
      status.style.cssText = 'color:#666;font-size:1em;min-width:22px;text-align:center;';
    }
    row.appendChild(status);

    // Text block
    var textBlock = document.createElement('div');
    textBlock.style.cssText = 'flex:1;';

    var nameEl = document.createElement('div');
    nameEl.textContent = stage.name;
    nameEl.style.cssText = 'font-weight:bold;font-size:0.95em;color:' + (stage.completed ? '#afa' : '#eee') + ';';
    textBlock.appendChild(nameEl);

    var descEl = document.createElement('div');
    descEl.textContent = stage.description;
    descEl.style.cssText = 'font-size:0.8em;color:#aaa;margin-top:2px;';
    textBlock.appendChild(descEl);

    row.appendChild(textBlock);

    // Reward badge
    var rewardBadge = document.createElement('span');
    var rewardText = stage.reward.xp + ' XP';
    if (stage.reward.title) {
      rewardText += ' + "' + stage.reward.title + '"';
    }
    rewardBadge.textContent = rewardText;
    rewardBadge.style.cssText = [
      'display:inline-block',
      'padding:3px 8px',
      'border-radius:4px',
      'font-size:0.75em',
      'background:' + (stage.completed ? '#253' : '#223'),
      'color:' + (stage.completed ? '#8f8' : '#8af'),
      'white-space:nowrap'
    ].join(';');
    row.appendChild(rewardBadge);

    return row;
  }

  // ---------------------------------------------------------------------------
  // Reset (for testing / debug)
  // ---------------------------------------------------------------------------

  CampaignManager.prototype.resetProgress = function(campaignId) {
    if (campaignId) {
      delete this._progress[campaignId];
    } else {
      this._progress = {};
    }
    saveProgress(this._progress);
  };

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------

  root.MJ.Campaigns = new CampaignManager();
  root.MJ.CampaignManager = CampaignManager;
  root.MJ.CAMPAIGN_DATA = CAMPAIGNS;

})(typeof window !== 'undefined' ? window : global);
