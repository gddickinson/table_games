/**
 * tutor-advanced.js — Advanced tutoring: guided first game, Socratic
 * questioning, post-round report cards, adaptive hints, pattern teaching.
 * See interfaces.js for API documentation
 */
(function (exports) {
  'use strict';
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------
  var LEVEL_KEY = 'mj_tutor_adaptive';

  // ---------------------------------------------------------------------------
  // Guided first-game script
  // ---------------------------------------------------------------------------
  var GUIDED_STEPS = [
    {
      trigger: 'game_start',
      message: "Welcome to your first guided game! I'll walk you through each step. " +
               "Let's start by looking at your hand \u2014 13 tiles at the bottom.",
      pause: true
    },
    {
      trigger: 'first_draw',
      message: "You just drew a tile (it's highlighted with a glow). Now you need " +
               "to discard one tile. Look for isolated tiles that don't connect " +
               "with anything \u2014 those are usually safe to throw away.",
      pause: true
    },
    {
      trigger: 'first_discard_prompt',
      message: "Click a tile once to select it (it lifts up), then click again to " +
               "discard. Or double-click for instant discard. Try it!",
      pause: false
    },
    {
      trigger: 'after_first_discard',
      message: "Great discard! The game continues counter-clockwise. Watch what the " +
               "AI players throw \u2014 their discards tell you what they DON'T need.",
      pause: false
    },
    {
      trigger: 'shanten_explanation',
      message: "See the number below your hand? That's your 'shanten' \u2014 how many " +
               "tiles you need to become ready to win. Lower is better. 0 = one tile away!",
      pause: true
    },
    {
      trigger: 'claim_opportunity',
      message: "A claim opportunity! When another player discards, you might be able " +
               "to claim it for a Pong (triplet) or Chow (sequence). But be careful " +
               "\u2014 claiming opens your hand, which reduces scoring potential.",
      pause: true
    },
    {
      trigger: 'mid_game',
      message: "You're getting the hang of it! Focus on building groups: sequences " +
               "(like 3-4-5 of Bamboo) or triplets (like three 7 of Circles). Plus " +
               "you need one pair.",
      pause: false
    },
    {
      trigger: 'near_tenpai',
      message: "You're close to tenpai (ready)! When you reach 0 shanten, consider " +
               "declaring Riichi for +10 bonus points \u2014 but only if your hand is " +
               "closed (no claims).",
      pause: true
    },
    {
      trigger: 'round_end',
      message: "Round over! Let's review what happened. Check the post-round report " +
               "for insights on your play.",
      pause: false
    }
  ];

  // ---------------------------------------------------------------------------
  // Grade thresholds
  // ---------------------------------------------------------------------------
  var GRADE_THRESHOLDS = [
    { min: 0.9, grade: 'A+' },
    { min: 0.8, grade: 'A'  },
    { min: 0.7, grade: 'B+' },
    { min: 0.6, grade: 'B'  },
    { min: 0.5, grade: 'C'  },
    { min: 0.0, grade: 'D'  }
  ];

  function accuracyToGrade(accuracy) {
    for (var i = 0; i < GRADE_THRESHOLDS.length; i++) {
      if (accuracy >= GRADE_THRESHOLDS[i].min) {
        return GRADE_THRESHOLDS[i].grade;
      }
    }
    return 'D';
  }

  // ---------------------------------------------------------------------------
  // Pattern explanations
  // ---------------------------------------------------------------------------
  var PATTERN_EXPLANATIONS = {
    'Pure Flush':
      'A Pure Flush means ALL tiles from one suit. You had a strong ' +
      'concentration but some off-suit tiles diluted it. Next time, ' +
      'discard off-suit tiles earlier.',
    'All Triplets':
      'All Triplets requires every meld to be a pong (3 identical tiles). ' +
      'You had pairs forming but went for sequences instead. If you see 3+ ' +
      'pairs early, consider the triplet path.',
    'Dragon Pong':
      'Dragon Pongs are free bonus points. If you have 2 of any dragon, ' +
      'hold them \u2014 the third might come.',
    'Mixed Flush':
      'A Mixed Flush is one suit plus honor tiles. You were close! Try ' +
      'discarding tiles from the suits you\'re NOT collecting.',
    'Riichi':
      'You could have declared Riichi for +10 points. Remember: Riichi ' +
      'requires a closed hand (no claims) at tenpai.',
    'Half Flush':
      'A Half Flush uses one suit plus honor tiles. Concentrate your suit ' +
      'early and keep honor tiles for flexibility.',
    'Seven Pairs':
      'Seven Pairs needs exactly 7 different pairs. If you have 4+ pairs ' +
      'midway, pivot to this pattern \u2014 it can catch opponents off guard.',
    'All Simples':
      'All Simples uses only tiles numbered 2-8 (no terminals or honors). ' +
      'Discard 1s, 9s, and honor tiles early for maximum efficiency.',
    'Pinfu':
      'Pinfu requires all sequences, a non-value pair, and a two-sided wait. ' +
      'Avoid making triplets if you want this pattern.',
    'Tanyao':
      'Tanyao (All Simples) excludes terminals and honors. Focus on the ' +
      'middle tiles (2-8) and discard edge tiles early.'
  };

  // ---------------------------------------------------------------------------
  // Socratic question templates
  // ---------------------------------------------------------------------------
  var QUESTION_TEMPLATES = {
    wait_identification: [
      "You're tenpai! Can you identify which tile(s) you're waiting on?",
      "You're one tile away from winning. Which tile completes your hand?"
    ],
    riichi_decision: [
      "Should you declare Riichi here? What are the pros and cons?",
      "Riichi is available. Is it worth locking your hand for the bonus points?"
    ],
    efficiency: [
      "You're close! Which tile would you discard to maximize your useful draws?",
      "Think about tile acceptance \u2014 which discard gives you the most winning draws?"
    ],
    push_fold: [
      "{wind} wind looks dangerous. Should you play safe or push for your hand?",
      "An opponent may be tenpai. Is your hand strong enough to keep attacking?"
    ],
    defense_basics: [
      "Which tiles in your hand are safest to discard right now?",
      "Can you spot any tiles that no opponent could possibly need?"
    ],
    early_strategy: [
      "Look at your starting hand. Do you see a path to a specific pattern?",
      "Which suit has the most potential in your opening hand?"
    ],
    value_assessment: [
      "How many points is your current hand worth if you win right now?",
      "Is it worth slowing down to aim for a higher-scoring hand?"
    ]
  };

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // ---------------------------------------------------------------------------
  // AdvancedTutor
  // ---------------------------------------------------------------------------

  /**
   * AdvancedTutor provides guided first-game walkthrough, Socratic questioning,
   * post-round report cards, adaptive hint frequency, and pattern teaching.
   */
  function AdvancedTutor() {
    this.guidedMode = false;
    this.guidedStep = 0;
    this.hintCooldown = 0;
    this.roundDecisions = [];
    this.questionsAsked = 0;
    this.questionsAnsweredCorrectly = 0;
    this.adaptiveLevel = this._loadLevel();
  }

  // --- Persistence ---

  /** @private */
  AdvancedTutor.prototype._loadLevel = function () {
    try {
      var val = parseInt(localStorage.getItem(LEVEL_KEY), 10);
      return (isNaN(val) || val < 1) ? 1 : val;
    } catch (e) {
      return 1;
    }
  };

  /** @private */
  AdvancedTutor.prototype._saveLevel = function () {
    try {
      localStorage.setItem(LEVEL_KEY, String(this.adaptiveLevel));
    } catch (e) { /* noop */ }
  };

  // =========================================================================
  // GUIDED FIRST GAME
  // =========================================================================

  /**
   * Begin the guided first-game walkthrough.
   * @returns {Object|null} First guided message.
   */
  AdvancedTutor.prototype.startGuidedGame = function () {
    this.guidedMode = true;
    this.guidedStep = 0;
    return this._getGuidedMessage();
  };

  /**
   * End the guided walkthrough early.
   */
  AdvancedTutor.prototype.stopGuidedGame = function () {
    this.guidedMode = false;
    this.guidedStep = 0;
  };

  /** @private */
  AdvancedTutor.prototype._getGuidedMessage = function () {
    if (this.guidedStep < GUIDED_STEPS.length) {
      return GUIDED_STEPS[this.guidedStep];
    }
    this.guidedMode = false;
    return null;
  };

  /**
   * Advance the guided walkthrough when a game trigger fires.
   * @param {string} trigger  The trigger identifier (e.g. 'game_start').
   * @returns {Object|null}  The message to display, or null if no match.
   */
  AdvancedTutor.prototype.advanceGuided = function (trigger) {
    if (!this.guidedMode) { return null; }
    var msg = this._getGuidedMessage();
    if (msg && msg.trigger === trigger) {
      this.guidedStep++;
      return msg;
    }
    return null;
  };

  /**
   * Check if the guided mode is currently active.
   * @returns {boolean}
   */
  AdvancedTutor.prototype.isGuidedActive = function () {
    return this.guidedMode;
  };

  /**
   * Get the current guided step index.
   * @returns {number}
   */
  AdvancedTutor.prototype.getGuidedProgress = function () {
    return {
      current: this.guidedStep,
      total: GUIDED_STEPS.length,
      percent: Math.round(this.guidedStep / GUIDED_STEPS.length * 100)
    };
  };

  // =========================================================================
  // SOCRATIC QUESTIONING
  // =========================================================================

  /**
   * Generate a contextual Socratic question for the player.
   * Questions are filtered by the player's adaptive level so beginners get
   * easier prompts and advanced players get harder ones.
   *
   * @param {Object} player  The player object (must have .hand, .seatIndex).
   * @param {Object} state   The game state (must have .players array).
   * @returns {Object|null}  { question, type, difficulty } or null.
   */
  AdvancedTutor.prototype.generateQuestion = function (player, state) {
    var Hand = root.MJ.Hand;
    var AIE  = root.MJ.AIEngine;
    if (!player || !state || !state.players) { return null; }

    var questions = [];
    var shanten = -1;

    // Try to compute shanten if AIEngine is available
    if (AIE && AIE.handToCompact && AIE.calcShantenCompact && player.hand) {
      try {
        var compact = AIE.handToCompact(player.hand);
        var meldCount = (player.hand.melds && player.hand.melds.length) || 0;
        shanten = AIE.calcShantenCompact(new Uint8Array(compact), meldCount);
      } catch (e) {
        shanten = -1;
      }
    }

    // Tenpai questions
    if (shanten === 0) {
      questions.push({
        question: pickRandom(QUESTION_TEMPLATES.wait_identification),
        type: 'wait_identification',
        difficulty: 2
      });
      questions.push({
        question: pickRandom(QUESTION_TEMPLATES.riichi_decision),
        type: 'riichi_decision',
        difficulty: 3
      });
    } else if (shanten > 0 && shanten <= 2) {
      questions.push({
        question: pickRandom(QUESTION_TEMPLATES.efficiency),
        type: 'efficiency',
        difficulty: 2
      });
    } else if (shanten > 2) {
      questions.push({
        question: pickRandom(QUESTION_TEMPLATES.early_strategy),
        type: 'early_strategy',
        difficulty: 1
      });
    }

    // Defensive questions — check if any opponent looks dangerous
    var seatIndex = player.seatIndex || 0;
    for (var i = 0; i < state.players.length; i++) {
      if (i === seatIndex) { continue; }
      var opp = state.players[i];
      if (!opp) { continue; }

      var isDangerous = opp.riichi ||
        (opp.hand && opp.hand.melds && opp.hand.melds.length >= 3);

      if (isDangerous) {
        var wind = opp.seatWind || ['East', 'South', 'West', 'North'][i];
        var qText = pickRandom(QUESTION_TEMPLATES.push_fold)
          .replace('{wind}', wind);
        questions.push({
          question: qText,
          type: 'push_fold',
          difficulty: 3
        });
        break;
      }
    }

    // Basic defense question for beginners
    if (this.adaptiveLevel <= 2 && questions.length === 0) {
      questions.push({
        question: pickRandom(QUESTION_TEMPLATES.defense_basics),
        type: 'defense_basics',
        difficulty: 1
      });
    }

    // Value assessment for intermediate+ players
    if (this.adaptiveLevel >= 3 && shanten >= 0 && shanten <= 1) {
      questions.push({
        question: pickRandom(QUESTION_TEMPLATES.value_assessment),
        type: 'value_assessment',
        difficulty: 4
      });
    }

    if (questions.length === 0) { return null; }

    // Filter by adaptive level (allow questions at most 1 difficulty above level)
    var maxDiff = this.adaptiveLevel + 1;
    var filtered = questions.filter(function (q) { return q.difficulty <= maxDiff; });
    if (filtered.length === 0) { filtered = [questions[0]]; }

    var chosen = pickRandom(filtered);
    this.questionsAsked++;
    return chosen;
  };

  /**
   * Record the player's answer to a Socratic question and update stats.
   * @param {boolean} correct  Whether the answer was correct.
   */
  AdvancedTutor.prototype.recordAnswer = function (correct) {
    if (correct) {
      this.questionsAnsweredCorrectly++;
    }
  };

  // =========================================================================
  // DECISION TRACKING
  // =========================================================================

  /**
   * Record a discard or claim decision for the current round.
   * @param {Object} decision  { action, tile, quality, turn, context }
   *   quality: 'optimal' | 'acceptable' | 'suboptimal' | 'bad'
   */
  AdvancedTutor.prototype.recordDecision = function (decision) {
    this.roundDecisions.push(decision);
  };

  /**
   * Clear recorded decisions for a new round.
   */
  AdvancedTutor.prototype.resetRound = function () {
    this.roundDecisions = [];
  };

  // =========================================================================
  // POST-ROUND REPORT CARD
  // =========================================================================

  /**
   * Generate a graded report card summarizing the player's round performance.
   *
   * @param {Object} roundData  {
   *   won: boolean,
   *   score: number,
   *   dealtIn: boolean,
   *   handPath: Array<{pattern, progress, estimatedPoints}> (optional)
   * }
   * @returns {Object} Report card with grade, summary, highlights, improvements, stats, patternsMissed.
   */
  AdvancedTutor.prototype.generateReportCard = function (roundData) {
    var report = {
      grade: 'B',
      summary: '',
      highlights: [],
      improvements: [],
      stats: {},
      patternsMissed: []
    };

    if (!roundData) { return report; }

    var decisions = this.roundDecisions;
    var totalPlays = decisions.length;
    var goodPlays = 0;
    var badPlays = 0;

    for (var i = 0; i < totalPlays; i++) {
      var quality = decisions[i].quality;
      if (quality === 'optimal' || quality === 'acceptable') {
        goodPlays++;
      } else {
        badPlays++;
      }
    }

    var accuracy = totalPlays > 0 ? goodPlays / totalPlays : 0;
    report.grade = accuracyToGrade(accuracy);
    report.summary = 'You made ' + goodPlays + '/' + totalPlays +
      ' optimal decisions (' + (accuracy * 100).toFixed(0) + '% accuracy).';

    // --- Highlights ---
    if (roundData.won) {
      report.highlights.push('Won with ' + (roundData.score || 0) + ' points!');
    }
    if (accuracy >= 0.9 && totalPlays >= 5) {
      report.highlights.push('Excellent decision-making this round!');
    }
    if (goodPlays > 0 && badPlays === 0 && totalPlays >= 3) {
      report.highlights.push('Perfect round \u2014 no suboptimal discards.');
    }

    // --- Improvements ---
    if (roundData.dealtIn) {
      report.improvements.push(
        'You dealt into an opponent\'s hand. Check for safe tiles (genbutsu) ' +
        'before discarding.'
      );
    }
    if (accuracy < 0.6 && totalPlays > 0) {
      report.improvements.push(
        'Try using the hint overlay to see which tiles have the most useful draws.'
      );
    }
    if (accuracy < 0.5 && totalPlays >= 5) {
      report.improvements.push(
        'Focus on reducing shanten first before worrying about hand value.'
      );
    }
    if (badPlays > 3) {
      report.improvements.push(
        'Several suboptimal discards detected. Consider which tiles have the ' +
        'fewest connections before throwing them.'
      );
    }

    // --- Missed patterns ---
    if (roundData.handPath && Array.isArray(roundData.handPath)) {
      for (var j = 0; j < roundData.handPath.length; j++) {
        var path = roundData.handPath[j];
        if (path.progress > 60 && !roundData.won) {
          report.patternsMissed.push(
            'You were ' + path.progress + '% toward ' + path.pattern +
            ' (' + path.estimatedPoints + ' pts) but didn\'t complete it.'
          );
        }
      }
    }

    // --- Stats ---
    report.stats = {
      totalDecisions: totalPlays,
      goodPlays: goodPlays,
      badPlays: badPlays,
      accuracy: (accuracy * 100).toFixed(1) + '%'
    };

    return report;
  };

  // =========================================================================
  // ADAPTIVE HINT FREQUENCY
  // =========================================================================

  /**
   * Determine whether a hint should be shown at this moment.
   * Factors in adaptive level (higher = fewer hints) and a cooldown counter.
   *
   * @param {Object} player  (unused, reserved for future context).
   * @param {Object} state   (unused, reserved for future context).
   * @returns {boolean}
   */
  AdvancedTutor.prototype.shouldShowHint = function (player, state) {
    if (this.hintCooldown > 0) {
      this.hintCooldown--;
      return false;
    }

    // More hints for lower levels, fewer for higher
    var hintChance = Math.max(0.05, 0.4 - this.adaptiveLevel * 0.08);
    if (Math.random() > hintChance) { return false; }

    this.hintCooldown = 3; // skip next 3 opportunities
    return true;
  };

  /**
   * Force reset the hint cooldown (e.g. after a player requests help).
   */
  AdvancedTutor.prototype.resetHintCooldown = function () {
    this.hintCooldown = 0;
  };

  /**
   * Adjust the adaptive level based on the round report card.
   * Good grades increase the level (fewer hints, harder questions);
   * bad grades decrease it.
   *
   * @param {Object} reportCard  As returned by generateReportCard.
   */
  AdvancedTutor.prototype.adjustLevel = function (reportCard) {
    if (!reportCard) { return; }

    if (reportCard.grade === 'A+' || reportCard.grade === 'A') {
      this.adaptiveLevel = Math.min(5, this.adaptiveLevel + 1);
    } else if (reportCard.grade === 'D') {
      this.adaptiveLevel = Math.max(1, this.adaptiveLevel - 1);
    }
    this._saveLevel();
  };

  /**
   * Get the current adaptive level (1-5).
   * @returns {number}
   */
  AdvancedTutor.prototype.getLevel = function () {
    return this.adaptiveLevel;
  };

  /**
   * Manually set the adaptive level.
   * @param {number} level  1-5.
   */
  AdvancedTutor.prototype.setLevel = function (level) {
    this.adaptiveLevel = Math.max(1, Math.min(5, level));
    this._saveLevel();
  };

  // =========================================================================
  // PATTERN TEACHING
  // =========================================================================

  /**
   * Explain why a scoring pattern was missed and how to aim for it next time.
   * @param {string} pattern    Pattern name (e.g. 'Pure Flush').
   * @param {Array}  handTiles  (reserved) The tiles the player held.
   * @returns {string}  Human-readable explanation.
   */
  AdvancedTutor.prototype.explainMissedPattern = function (pattern, handTiles) {
    if (PATTERN_EXPLANATIONS[pattern]) {
      return PATTERN_EXPLANATIONS[pattern];
    }
    return 'The ' + pattern + ' pattern requires specific tile combinations. Keep practicing!';
  };

  /**
   * Get a list of all patterns the tutor can explain.
   * @returns {string[]}
   */
  AdvancedTutor.prototype.getKnownPatterns = function () {
    return Object.keys(PATTERN_EXPLANATIONS);
  };

  /**
   * Provide a short tip for a given game phase.
   * @param {string} phase  'early' | 'mid' | 'late'
   * @returns {string}
   */
  AdvancedTutor.prototype.getPhaseTip = function (phase) {
    var tips = {
      early: [
        'Focus on flexibility \u2014 keep tiles that connect with many others.',
        'Discard isolated honor tiles unless you have a pair of them.',
        'Look for natural suit concentrations in your starting hand.'
      ],
      mid: [
        'Start narrowing your hand toward a specific pattern.',
        'Pay attention to the discard pool \u2014 tiles already gone are dead draws.',
        'If you have 3+ pairs, consider pivoting to Seven Pairs.'
      ],
      late: [
        'Prioritize defense if your hand is far from tenpai.',
        'Use genbutsu (tiles in opponents\' discard pools) for safe discards.',
        'If an opponent declared Riichi, think twice before pushing a weak hand.'
      ]
    };
    var list = tips[phase] || tips.mid;
    return pickRandom(list);
  };

  // =========================================================================
  // REPORT CARD UI
  // =========================================================================

  /**
   * Build a DOM element displaying the round report card.
   * @param {Object} report  As returned by generateReportCard.
   * @returns {HTMLElement}
   */
  AdvancedTutor.prototype.buildReportCardUI = function (report) {
    var el = document.createElement('div');
    el.style.cssText = 'background:rgba(0,0,0,0.3);border-radius:10px;padding:16px;margin:12px 0;';

    var gradeColors = {
      'A+': '#4ade80',
      'A':  '#4ade80',
      'B+': '#a3e635',
      'B':  '#e8b830',
      'C':  '#fb923c',
      'D':  '#ef4444'
    };
    var color = gradeColors[report.grade] || '#e8b830';

    var html = '';

    // Header with grade
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">';
    html += '<span style="font-size:16px;font-weight:bold;color:var(--text-primary);">Round Report Card</span>';
    html += '<span style="font-size:32px;font-weight:bold;color:' + color + ';">' + report.grade + '</span>';
    html += '</div>';

    // Summary
    html += '<div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;">';
    html += report.summary;
    html += '</div>';

    // Stats bar
    if (report.stats && report.stats.totalDecisions > 0) {
      var pct = parseFloat(report.stats.accuracy) || 0;
      html += '<div style="background:rgba(255,255,255,0.1);border-radius:4px;height:6px;margin-bottom:10px;overflow:hidden;">';
      html += '<div style="width:' + pct + '%;height:100%;background:' + color + ';border-radius:4px;"></div>';
      html += '</div>';
      html += '<div style="font-size:11px;color:var(--text-secondary);margin-bottom:8px;">';
      html += report.stats.goodPlays + ' good / ' + report.stats.badPlays + ' suboptimal';
      html += ' out of ' + report.stats.totalDecisions + ' decisions';
      html += '</div>';
    }

    // Highlights
    if (report.highlights.length > 0) {
      html += '<div style="margin-bottom:8px;">';
      for (var h = 0; h < report.highlights.length; h++) {
        html += '<div style="font-size:12px;color:#4ade80;">+ ' +
          report.highlights[h] + '</div>';
      }
      html += '</div>';
    }

    // Improvements
    if (report.improvements.length > 0) {
      html += '<div style="margin-bottom:8px;">';
      for (var m = 0; m < report.improvements.length; m++) {
        html += '<div style="font-size:12px;color:#fb923c;">- ' +
          report.improvements[m] + '</div>';
      }
      html += '</div>';
    }

    // Missed patterns
    if (report.patternsMissed.length > 0) {
      html += '<div style="margin-bottom:4px;">';
      html += '<div style="font-size:11px;color:var(--text-secondary);font-weight:bold;margin-bottom:2px;">Missed patterns:</div>';
      for (var p = 0; p < report.patternsMissed.length; p++) {
        html += '<div style="font-size:11px;color:var(--text-secondary);">' +
          report.patternsMissed[p] + '</div>';
      }
      html += '</div>';
    }

    // Adaptive level note
    html += '<div style="font-size:10px;color:var(--text-secondary);margin-top:8px;opacity:0.7;">';
    html += 'Tutor level: ' + this.adaptiveLevel + '/5';
    html += '</div>';

    el.innerHTML = html;
    return el;
  };

  /**
   * Build a compact inline hint bubble for a specific suggestion.
   * @param {string} text  Hint text to display.
   * @returns {HTMLElement}
   */
  AdvancedTutor.prototype.buildHintBubble = function (text) {
    var bubble = document.createElement('div');
    bubble.style.cssText =
      'background:rgba(74,222,128,0.15);border:1px solid rgba(74,222,128,0.3);' +
      'border-radius:8px;padding:8px 12px;font-size:12px;color:#4ade80;' +
      'max-width:300px;margin:4px 0;animation:fadeIn 0.3s ease;';
    bubble.textContent = text;
    return bubble;
  };

  /**
   * Build the Socratic question UI with answer buttons.
   * @param {Object} questionObj  As returned by generateQuestion.
   * @param {Function} onAnswer   Called with (boolean correct) when player answers.
   * @returns {HTMLElement}
   */
  AdvancedTutor.prototype.buildQuestionUI = function (questionObj, onAnswer) {
    var self = this;
    var container = document.createElement('div');
    container.style.cssText =
      'background:rgba(59,130,246,0.12);border:1px solid rgba(59,130,246,0.3);' +
      'border-radius:10px;padding:12px;margin:8px 0;';

    var qDiv = document.createElement('div');
    qDiv.style.cssText = 'font-size:13px;color:#93c5fd;margin-bottom:8px;';
    qDiv.textContent = questionObj.question;
    container.appendChild(qDiv);

    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:6px;';

    var showBtn = document.createElement('button');
    showBtn.className = 'btn btn-sm';
    showBtn.textContent = 'Show answer';
    showBtn.style.cssText = 'font-size:11px;';
    showBtn.addEventListener('click', function () {
      self.recordAnswer(false);
      btnRow.innerHTML = '<div style="font-size:11px;color:var(--text-secondary);">Answer shown. Keep practicing!</div>';
      if (typeof onAnswer === 'function') { onAnswer(false); }
    });

    var gotItBtn = document.createElement('button');
    gotItBtn.className = 'btn btn-sm btn-primary';
    gotItBtn.textContent = 'I know!';
    gotItBtn.style.cssText = 'font-size:11px;';
    gotItBtn.addEventListener('click', function () {
      self.recordAnswer(true);
      btnRow.innerHTML = '<div style="font-size:11px;color:#4ade80;">Great job!</div>';
      if (typeof onAnswer === 'function') { onAnswer(true); }
    });

    btnRow.appendChild(gotItBtn);
    btnRow.appendChild(showBtn);
    container.appendChild(btnRow);

    return container;
  };

  /**
   * Get a summary of the tutor's overall tracking stats.
   * @returns {Object}
   */
  AdvancedTutor.prototype.getStats = function () {
    return {
      adaptiveLevel: this.adaptiveLevel,
      questionsAsked: this.questionsAsked,
      questionsCorrect: this.questionsAnsweredCorrectly,
      questionAccuracy: this.questionsAsked > 0
        ? (this.questionsAnsweredCorrectly / this.questionsAsked * 100).toFixed(1) + '%'
        : 'N/A',
      roundDecisionsRecorded: this.roundDecisions.length,
      guidedActive: this.guidedMode,
      guidedProgress: this.getGuidedProgress()
    };
  };

  /**
   * Reset all tutor state (useful for testing or new-player reset).
   */
  AdvancedTutor.prototype.reset = function () {
    this.guidedMode = false;
    this.guidedStep = 0;
    this.hintCooldown = 0;
    this.roundDecisions = [];
    this.questionsAsked = 0;
    this.questionsAnsweredCorrectly = 0;
    this.adaptiveLevel = 1;
    this._saveLevel();
  };

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------
  root.MJ.AdvancedTutor = AdvancedTutor;

})(typeof window !== 'undefined' ? window : global);
