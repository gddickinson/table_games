/**
 * blackjack-practice.js — Blackjack practice puzzles and drills
 *
 * Provides decision-making puzzles covering basic strategy scenarios
 * with correct answers, explanations, and a DOM-based practice UI.
 *
 * Exports: root.MJ.Blackjack.Practice
 */
(function(root) {
  'use strict';

  root.MJ = root.MJ || {};
  root.MJ.Blackjack = root.MJ.Blackjack || {};

  var STORAGE_KEY = 'mj_blackjack_practice';

  // =========================================================================
  // BlackjackPractice
  // =========================================================================

  class BlackjackPractice {
    constructor() {
      this.history = null;
      this._loadHistory();
    }

    // -- Persistence --------------------------------------------------------

    _loadHistory() {
      try {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          this.history = JSON.parse(raw);
          return;
        }
      } catch (e) { /* ignore */ }

      this.history = {
        attempted: {},
        totalAttempts: 0,
        totalCorrect: 0
      };
    }

    _saveHistory() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.history));
      } catch (e) { /* ignore */ }
    }

    // -- Puzzle definitions -------------------------------------------------

    getPuzzles() {
      return [
        {
          id: 'bj1',
          title: 'Hard 16 vs 10',
          description: 'You have 10 + 6 (hard 16). Dealer shows 10. Hit or stand?',
          playerHand: ['10', '6'],
          dealerShows: '10',
          options: ['hit', 'stand'],
          correct: 'hit',
          explanation: 'Hard 16 vs a dealer 10 is a losing hand either way, but hitting gives you slightly better odds than standing. You\'ll bust often, but the dealer\'s 10 is too strong to just hope for the best.'
        },
        {
          id: 'bj2',
          title: 'Soft 17',
          description: 'You have A + 6 (soft 17). Dealer shows 7. Hit or stand?',
          playerHand: ['A', '6'],
          dealerShows: '7',
          options: ['hit', 'stand'],
          correct: 'hit',
          explanation: 'Soft 17 is a weak hand. Since the Ace can count as 1, you can\'t bust by hitting. Taking another card gives you a chance to improve to 18-21 with no risk of busting.'
        },
        {
          id: 'bj3',
          title: 'Split 8s',
          description: 'You have 8 + 8 (hard 16). Dealer shows 10. Split?',
          playerHand: ['8', '8'],
          dealerShows: '10',
          options: ['split', 'hit', 'stand'],
          correct: 'split',
          explanation: 'Always split 8s. A hard 16 is the worst possible hand in blackjack. By splitting, you turn one terrible hand into two reasonable starting hands of 8 each.'
        },
        {
          id: 'bj4',
          title: 'Double 11',
          description: 'You have 6 + 5 (hard 11). Dealer shows 6. What\'s the best action?',
          playerHand: ['6', '5'],
          dealerShows: '6',
          options: ['double', 'hit', 'stand'],
          correct: 'double',
          explanation: '11 versus a dealer 6 is the best doubling opportunity in blackjack. You\'re likely to draw a 10-value card for 21, and the dealer\'s 6 is very weak (likely to bust).'
        },
        {
          id: 'bj5',
          title: 'Hard 12 vs 4',
          description: 'You have 7 + 5 (hard 12). Dealer shows 4. Hit or stand?',
          playerHand: ['7', '5'],
          dealerShows: '4',
          options: ['hit', 'stand'],
          correct: 'stand',
          explanation: 'Stand and let the dealer bust. With a 4 showing, the dealer must hit and has a high probability of busting. Hitting 12 risks busting yourself when the dealer is already in trouble.'
        },
        {
          id: 'bj6',
          title: 'Soft 18 vs 9',
          description: 'You have A + 7 (soft 18). Dealer shows 9. What\'s the best action?',
          playerHand: ['A', '7'],
          dealerShows: '9',
          options: ['hit', 'stand', 'double'],
          correct: 'hit',
          explanation: 'Soft 18 feels strong, but against a dealer 9 it\'s actually an underdog. The dealer will often make 19, 20, or 21. Since you can\'t bust (the Ace adjusts), hitting gives you a chance to improve.'
        },
        {
          id: 'bj7',
          title: 'Never Insurance',
          description: 'Dealer shows an Ace and offers insurance. You have 20 (J + Q). Take insurance?',
          playerHand: ['J', 'Q'],
          dealerShows: 'A',
          options: ['insurance', 'decline'],
          correct: 'decline',
          explanation: 'Never take insurance. It\'s a side bet that the dealer has blackjack, and it has a house edge of about 7%. Even with a strong hand like 20, declining insurance is the mathematically correct play every time.'
        },
        {
          id: 'bj8',
          title: 'Split Aces',
          description: 'You have A + A. Dealer shows 6. Split?',
          playerHand: ['A', 'A'],
          dealerShows: '6',
          options: ['split', 'hit', 'stand'],
          correct: 'split',
          explanation: 'Always split Aces. Two Aces together give you a soft 12 (or hard 2) — terrible either way. But splitting gives you two hands each starting with an Ace, with great chances of hitting 21.'
        },
        {
          id: 'bj9',
          title: 'Hard 13 vs 2',
          description: 'You have 7 + 6 (hard 13). Dealer shows 2. What\'s the best action?',
          playerHand: ['7', '6'],
          dealerShows: '2',
          options: ['hit', 'stand'],
          correct: 'stand',
          explanation: 'This is a borderline hand, but standing is correct. The dealer\'s 2 is weak enough that you should avoid the risk of busting. Let the dealer take the risk of drawing bad cards.'
        },
        {
          id: 'bj10',
          title: 'Surrender',
          description: 'You have 10 + 6 (hard 16). Dealer shows an Ace. What\'s the best action?',
          playerHand: ['10', '6'],
          dealerShows: 'A',
          options: ['surrender', 'hit', 'stand'],
          correct: 'surrender',
          explanation: 'If the casino offers surrender, this is the time to use it. Hard 16 vs a dealer Ace is one of the worst situations in blackjack. Surrender saves you half your bet instead of losing it all most of the time. If surrender isn\'t available, hit.'
        }
      ];
    }

    /**
     * Get all puzzles as a flat array (already flat, but maintains API consistency).
     * @returns {Array}
     */
    getAllPuzzles() {
      return this.getPuzzles().map(function(p) {
        return Object.assign({}, p, { category: 'basic_strategy' });
      });
    }

    /**
     * Check the player's answer for a given puzzle.
     * @param {string} puzzleId
     * @param {string} answer
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

    /** @private */
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

    // -- DOM UI builder -----------------------------------------------------

    /**
     * Build a DOM element displaying the practice puzzle interface.
     * @returns {HTMLElement|null}
     */
    buildPracticeUI() {
      if (typeof document === 'undefined') return null;

      var self = this;
      var puzzles = this.getPuzzles();

      var container = document.createElement('div');
      container.className = 'blackjack-practice';
      container.style.cssText = 'padding:12px;max-width:600px;';

      // Header
      var header = document.createElement('div');
      header.style.cssText = 'font-weight:bold;font-size:16px;color:var(--accent, #4fc3f7);margin-bottom:12px;';
      header.textContent = 'Blackjack Practice Puzzles';
      container.appendChild(header);

      // Progress bar
      var progress = this.getProgress();
      var progBar = document.createElement('div');
      progBar.style.cssText = 'margin-bottom:16px;font-size:12px;color:rgba(255,255,255,0.6);';
      progBar.textContent = 'Mastered: ' + progress.mastered + '/' + progress.totalPuzzles +
        ' | Accuracy: ' + progress.accuracy;
      container.appendChild(progBar);

      // Puzzle cards
      for (var pi = 0; pi < puzzles.length; pi++) {
        container.appendChild(this._buildPuzzleCard(puzzles[pi], self));
      }

      return container;
    }

    /** @private */
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
      handDisp.textContent = 'Your hand: ' + puzzle.playerHand.join(' + ') +
        ' | Dealer shows: ' + puzzle.dealerShows;
      card.appendChild(handDisp);

      // Description
      var desc = document.createElement('div');
      desc.style.cssText = 'font-size:12px;color:rgba(255,255,255,0.5);margin-bottom:8px;';
      desc.textContent = puzzle.description;
      card.appendChild(desc);

      // Answer buttons
      var btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';

      var explanation = document.createElement('div');
      explanation.style.cssText = 'font-size:11px;margin-top:8px;padding:6px;border-radius:4px;display:none;';

      for (var ai = 0; ai < puzzle.options.length; ai++) {
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
            var buttons = btnRow.querySelectorAll('button');
            for (var bi = 0; bi < buttons.length; bi++) {
              buttons[bi].disabled = true;
              buttons[bi].style.opacity = '0.5';
              buttons[bi].style.cursor = 'default';
            }
          });
          btnRow.appendChild(btn);
        })(puzzle.options[ai]);
      }

      card.appendChild(btnRow);
      card.appendChild(explanation);

      // History hint
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

  root.MJ.Blackjack.Practice = Object.freeze({
    BlackjackPractice: BlackjackPractice
  });

  if (typeof console !== 'undefined') {
    console.log('[Blackjack] Practice module loaded');
  }

})(typeof window !== 'undefined' ? window : global);
