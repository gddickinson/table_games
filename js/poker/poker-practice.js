/**
 * poker-practice.js — Poker practice puzzles and drills
 *
 * Provides categorized decision-making puzzles (preflop, postflop, bluffing)
 * with correct answers, explanations, and a DOM-based practice UI.
 *
 * Exports: root.MJ.Poker.Practice
 */
(function(root) {
  'use strict';

  root.MJ = root.MJ || {};
  root.MJ.Poker = root.MJ.Poker || {};

  var STORAGE_KEY = 'mj_poker_practice';

  // =========================================================================
  // PokerPractice
  // =========================================================================

  class PokerPractice {
    constructor() {
      this.history = null;
      this._loadHistory();
    }

    // ── Persistence ───────────────────────────────────────────────

    _loadHistory() {
      try {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          this.history = JSON.parse(raw);
          return;
        }
      } catch (e) { /* ignore */ }

      this.history = {
        attempted: {},   // puzzleId -> { attempts, correct, lastAttempt }
        totalAttempts: 0,
        totalCorrect: 0
      };
    }

    _saveHistory() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.history));
      } catch (e) { /* ignore */ }
    }

    // ── Puzzle definitions ────────────────────────────────────────

    getPuzzles() {
      return {
        preflop: [
          {
            id: 'pf1', title: 'Premium Pairs',
            description: 'You have AA in early position. UTG raises 3x. What do you do?',
            hand: ['Ah', 'As'], position: 'UTG+1', action_facing: 'raise_3x',
            correct: 'raise',
            explanation: 'Always re-raise with pocket Aces. You want to build the pot with the best starting hand.'
          },
          {
            id: 'pf2', title: 'Suited Connectors',
            description: 'You have 7\u2665 8\u2665 on the button. Everyone folds to you.',
            hand: ['7h', '8h'], position: 'button', action_facing: 'none',
            correct: 'raise',
            explanation: 'Suited connectors play well from late position. Raise to steal the blinds or see a flop in position.'
          },
          {
            id: 'pf3', title: 'Trash Hand',
            description: 'You have 7\u2663 2\u2666 under the gun.',
            hand: ['7c', '2d'], position: 'UTG', action_facing: 'none',
            correct: 'fold',
            explanation: '72 offsuit is the worst starting hand in poker. Always fold from any position.'
          },
          {
            id: 'pf4', title: 'Facing a 3-Bet',
            description: 'You raised with KQo and got re-raised 3x.',
            hand: ['Kh', 'Qd'], position: 'CO', action_facing: 'reraise_3x',
            correct: 'fold',
            explanation: 'KQ offsuit doesn\'t play well against a 3-bet range. Fold and wait for a better spot.'
          },
          {
            id: 'pf5', title: 'Small Blind Special',
            description: 'You have A5 suited in the small blind. Button raises 2.5x.',
            hand: ['As', '5s'], position: 'SB', action_facing: 'raise_2.5x',
            correct: 'call',
            explanation: 'A5 suited is a good defending hand from the blinds. The suited ace gives you flush potential.'
          }
        ],

        postflop: [
          {
            id: 'po1', title: 'Top Pair Good Kicker',
            description: 'You have AK. Flop: A-7-2 rainbow. You raised pre-flop.',
            hand: ['Ah', 'Kd'], board: ['As', '7c', '2d'], phase: 'flop',
            correct: 'bet',
            explanation: 'Top pair top kicker on a dry board \u2014 bet for value. This is a textbook c-bet.'
          },
          {
            id: 'po2', title: 'Flush Draw',
            description: 'You have K\u2665 Q\u2665. Flop: 9\u2665 4\u2665 2\u2663. Opponent bets half pot.',
            hand: ['Kh', 'Qh'], board: ['9h', '4h', '2c'], phase: 'flop',
            correct: 'call',
            explanation: 'You have a flush draw (9 outs) plus two overcards. Getting decent odds \u2014 call.'
          },
          {
            id: 'po3', title: 'Scary Board',
            description: 'You have JJ. Board: A-K-Q-T. Opponent bets big.',
            hand: ['Jh', 'Jd'], board: ['As', 'Kc', 'Qd', 'Th'], phase: 'turn',
            correct: 'fold',
            explanation: 'Four to a straight on board with A-K-Q means many hands beat you. Your jacks are likely behind.'
          }
        ],

        bluffing: [
          {
            id: 'bl1', title: 'The Semi-Bluff',
            description: 'You have 6\u2660 7\u2660. Board: 4\u2660 5\u2660 K\u2663. Opponent checks.',
            hand: ['6s', '7s'], board: ['4s', '5s', 'Kc'], phase: 'flop',
            correct: 'bet',
            explanation: 'You have an open-ended straight flush draw (15 outs!). Betting as a semi-bluff is very profitable \u2014 you win immediately or have great equity if called.'
          },
          {
            id: 'bl2', title: 'Ace on the River',
            description: 'You have 88. Board: K-7-3-2-A. You bet flop and turn, opponent called both.',
            hand: ['8h', '8d'], board: ['Ks', '7c', '3d', '2h', 'As'], phase: 'river',
            correct: 'check',
            explanation: 'The ace on the river is a bad card for you. Your opponent called twice \u2014 they likely have a king or better. Check and give up.'
          }
        ]
      };
    }

    /**
     * Get all puzzles as a flat array.
     * @returns {Array}
     */
    getAllPuzzles() {
      var puzzles = this.getPuzzles();
      var all = [];
      var categories = Object.keys(puzzles);
      for (var i = 0; i < categories.length; i++) {
        var cat = categories[i];
        var items = puzzles[cat];
        for (var j = 0; j < items.length; j++) {
          var p = Object.assign({}, items[j]);
          p.category = cat;
          all.push(p);
        }
      }
      return all;
    }

    /**
     * Check the player's answer for a given puzzle.
     *
     * @param {string} puzzleId — the puzzle id (e.g. 'pf1', 'po2')
     * @param {string} answer — the player's answer ('fold', 'call', 'raise', 'bet', 'check')
     * @returns {Object} { correct, explanation, correctAnswer }
     */
    checkAnswer(puzzleId, answer) {
      var allPuzzles = this.getAllPuzzles();
      var puzzle = null;
      for (var i = 0; i < allPuzzles.length; i++) {
        if (allPuzzles[i].id === puzzleId) {
          puzzle = allPuzzles[i];
          break;
        }
      }

      if (!puzzle) {
        return { correct: false, explanation: 'Puzzle not found', correctAnswer: null };
      }

      var correct = answer.toLowerCase() === puzzle.correct.toLowerCase();

      // Record attempt
      this.history.totalAttempts++;
      if (correct) this.history.totalCorrect++;

      if (!this.history.attempted[puzzleId]) {
        this.history.attempted[puzzleId] = { attempts: 0, correct: 0, lastAttempt: 0 };
      }
      this.history.attempted[puzzleId].attempts++;
      if (correct) this.history.attempted[puzzleId].correct++;
      this.history.attempted[puzzleId].lastAttempt = Date.now();

      this._saveHistory();

      return {
        correct: correct,
        explanation: puzzle.explanation,
        correctAnswer: puzzle.correct
      };
    }

    /**
     * Get practice progress summary.
     * @returns {Object}
     */
    getProgress() {
      var allPuzzles = this.getAllPuzzles();
      var attempted = Object.keys(this.history.attempted).length;
      return {
        totalPuzzles: allPuzzles.length,
        attempted: attempted,
        totalAttempts: this.history.totalAttempts,
        totalCorrect: this.history.totalCorrect,
        accuracy: this.history.totalAttempts > 0
          ? ((this.history.totalCorrect / this.history.totalAttempts) * 100).toFixed(1) + '%'
          : '0%',
        mastered: this._countMastered()
      };
    }

    /**
     * Count puzzles answered correctly at least twice with no recent mistakes.
     * @returns {number}
     * @private
     */
    _countMastered() {
      var count = 0;
      for (var id in this.history.attempted) {
        if (!this.history.attempted.hasOwnProperty(id)) continue;
        var rec = this.history.attempted[id];
        if (rec.correct >= 2 && rec.correct >= rec.attempts * 0.8) {
          count++;
        }
      }
      return count;
    }

    // ── DOM UI builder ────────────────────────────────────────────

    /**
     * Build a DOM element displaying the practice puzzle interface.
     * @returns {HTMLElement|null}
     */
    buildPracticeUI() {
      if (typeof document === 'undefined') return null;

      var self = this;
      var puzzles = this.getPuzzles();
      var categories = Object.keys(puzzles);

      var container = document.createElement('div');
      container.className = 'poker-practice';
      container.style.cssText = 'padding:12px;max-width:600px;';

      // Header
      var header = document.createElement('div');
      header.style.cssText = 'font-weight:bold;font-size:16px;color:var(--accent, #4fc3f7);margin-bottom:12px;';
      header.textContent = 'Poker Practice Puzzles';
      container.appendChild(header);

      // Progress bar
      var progress = this.getProgress();
      var progBar = document.createElement('div');
      progBar.style.cssText = 'margin-bottom:16px;font-size:12px;color:rgba(255,255,255,0.6);';
      progBar.textContent = 'Mastered: ' + progress.mastered + '/' + progress.totalPuzzles +
        ' | Accuracy: ' + progress.accuracy;
      container.appendChild(progBar);

      // Category sections
      for (var ci = 0; ci < categories.length; ci++) {
        var catName = categories[ci];
        var catPuzzles = puzzles[catName];

        var catHeader = document.createElement('div');
        catHeader.style.cssText = 'font-weight:bold;font-size:14px;color:#fff;margin:12px 0 8px 0;' +
          'text-transform:capitalize;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:4px;';
        catHeader.textContent = catName;
        container.appendChild(catHeader);

        for (var pi = 0; pi < catPuzzles.length; pi++) {
          var puzzle = catPuzzles[pi];
          container.appendChild(this._buildPuzzleCard(puzzle, self));
        }
      }

      return container;
    }

    /**
     * Build a single puzzle card element.
     * @param {Object} puzzle
     * @param {PokerPractice} practiceRef
     * @returns {HTMLElement}
     * @private
     */
    _buildPuzzleCard(puzzle, practiceRef) {
      var card = document.createElement('div');
      card.style.cssText = 'padding:10px;margin-bottom:8px;border-radius:6px;' +
        'background:rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.06);';

      // Title
      var title = document.createElement('div');
      title.style.cssText = 'font-weight:bold;font-size:13px;color:#fff;margin-bottom:4px;';
      title.textContent = puzzle.title;
      card.appendChild(title);

      // Hand display
      var handDisp = document.createElement('div');
      handDisp.style.cssText = 'font-size:12px;color:rgba(255,255,255,0.7);margin-bottom:4px;';
      handDisp.textContent = 'Hand: ' + puzzle.hand.join(' ');
      if (puzzle.board) {
        handDisp.textContent += ' | Board: ' + puzzle.board.join(' ');
      }
      card.appendChild(handDisp);

      // Description
      var desc = document.createElement('div');
      desc.style.cssText = 'font-size:12px;color:rgba(255,255,255,0.5);margin-bottom:8px;';
      desc.textContent = puzzle.description;
      card.appendChild(desc);

      // Answer buttons
      var btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';

      var actions = ['fold', 'call', 'raise', 'bet', 'check'];
      var explanation = document.createElement('div');
      explanation.style.cssText = 'font-size:11px;margin-top:8px;padding:6px;border-radius:4px;display:none;';

      for (var ai = 0; ai < actions.length; ai++) {
        (function(action) {
          var btn = document.createElement('button');
          btn.style.cssText = 'padding:4px 12px;border-radius:4px;border:1px solid rgba(255,255,255,0.2);' +
            'background:rgba(255,255,255,0.08);color:#fff;font-size:12px;cursor:pointer;text-transform:capitalize;';
          btn.textContent = action;
          btn.addEventListener('click', function() {
            var result = practiceRef.checkAnswer(puzzle.id, action);
            explanation.style.display = 'block';
            if (result.correct) {
              explanation.style.background = 'rgba(76,175,80,0.2)';
              explanation.style.color = '#81c784';
              explanation.textContent = 'Correct! ' + result.explanation;
            } else {
              explanation.style.background = 'rgba(244,67,54,0.2)';
              explanation.style.color = '#e57373';
              explanation.textContent = 'Incorrect (answer: ' + result.correctAnswer + '). ' + result.explanation;
            }
            // Disable all buttons after answering
            var buttons = btnRow.querySelectorAll('button');
            for (var bi = 0; bi < buttons.length; bi++) {
              buttons[bi].disabled = true;
              buttons[bi].style.opacity = '0.5';
              buttons[bi].style.cursor = 'default';
            }
          });
          btnRow.appendChild(btn);
        })(actions[ai]);
      }

      card.appendChild(btnRow);
      card.appendChild(explanation);

      // Show history hint if previously attempted
      var hist = this.history.attempted[puzzle.id];
      if (hist) {
        var histHint = document.createElement('div');
        histHint.style.cssText = 'font-size:10px;color:rgba(255,255,255,0.3);margin-top:4px;';
        histHint.textContent = 'Previously attempted ' + hist.attempts + 'x (' + hist.correct + ' correct)';
        card.appendChild(histHint);
      }

      return card;
    }

    /**
     * Reset all practice history.
     */
    resetHistory() {
      this.history = {
        attempted: {},
        totalAttempts: 0,
        totalCorrect: 0
      };
      this._saveHistory();
    }
  }

  // =========================================================================
  // Export
  // =========================================================================

  root.MJ.Poker.Practice = Object.freeze({
    PokerPractice: PokerPractice
  });

  if (typeof console !== 'undefined') {
    console.log('[Mahjong] Poker practice module loaded');
  }

})(typeof window !== 'undefined' ? window : global);
