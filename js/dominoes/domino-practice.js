/**
 * domino-practice.js — Dominoes practice puzzles and drills
 *
 * Provides tactical decision-making puzzles for Dominoes
 * with correct answers, explanations, and a DOM-based practice UI.
 *
 * Exports: root.MJ.Dominoes.Practice
 */
(function(root) {
  'use strict';

  root.MJ = root.MJ || {};
  root.MJ.Dominoes = root.MJ.Dominoes || {};

  var STORAGE_KEY = 'mj_domino_practice';

  // =========================================================================
  // DominoPractice
  // =========================================================================

  class DominoPractice {
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
          id: 'dom1',
          title: 'Play the Double',
          description: 'You have [6|6] and [6|3]. The chain end is 6. Which tile do you play?',
          yourTiles: ['[6|6]', '[6|3]'],
          chainEnds: [6],
          options: ['[6|6]', '[6|3]'],
          correct: '[6|6]',
          explanation: 'Play doubles early! The [6|6] can only be played on a 6, making it harder to place later. The [6|3] gives you flexibility since it can also match a 3.'
        },
        {
          id: 'dom2',
          title: 'Keep Options',
          description: 'You have [3|5] and [3|1]. The chain end is 3. Which tile do you play?',
          yourTiles: ['[3|5]', '[3|1]'],
          chainEnds: [3],
          options: ['[3|5]', '[3|1]'],
          correct: '[3|1]',
          explanation: 'Play [3|1] to keep the 5 available for later. Fives are more versatile (higher pip values connect to more combinations). Keeping [3|5] preserves your options for future turns.'
        },
        {
          id: 'dom3',
          title: 'Block the Opponent',
          description: 'Your opponent just passed on a 4. You have [4|2] and [2|5]. The chain ends are 4 and 2. Which end do you play on?',
          yourTiles: ['[4|2]', '[2|5]'],
          chainEnds: [4, 2],
          options: ['play on 4 end', 'play on 2 end'],
          correct: 'play on 4 end',
          explanation: 'Your opponent passed on 4, meaning they have no 4s. Play on the 4 end to keep blocking them. If you play [4|2] on the 4 end, you expose a 2 — but the opponent still can\'t use the 4 side.'
        },
        {
          id: 'dom4',
          title: 'Count and Decide',
          description: 'All four tiles containing 3 (except yours) have already been played. You have [3|6]. The chain ends are 6 and 1. Can you play your [3|6]?',
          yourTiles: ['[3|6]'],
          chainEnds: [6, 1],
          options: ['play on 6 end', 'play on 1 end', 'cannot play'],
          correct: 'play on 6 end',
          explanation: 'You can play [3|6] on the 6 end, placing the 6 side against the chain\'s 6. The 3 side becomes the new open end. You cannot play on the 1 end since neither side of your tile is a 1.'
        },
        {
          id: 'dom5',
          title: 'Last Tile',
          description: 'You have one tile left: [2|5]. The chain ends are 2 and 4. Can you play it?',
          yourTiles: ['[2|5]'],
          chainEnds: [2, 4],
          options: ['yes, on 2 end', 'yes, on 4 end', 'no, must pass'],
          correct: 'yes, on 2 end',
          explanation: 'Yes! Play your [2|5] on the 2 end. The 2 side matches the chain end. If you play it, you win the round by emptying your hand!'
        },
        {
          id: 'dom6',
          title: 'Forced Pass',
          description: 'The chain ends are 1 and 6. Your tiles are [3|4], [2|3], and [4|5]. Can you play any tile?',
          yourTiles: ['[3|4]', '[2|3]', '[4|5]'],
          chainEnds: [1, 6],
          options: ['play [3|4]', 'play [2|3]', 'play [4|5]', 'must pass'],
          correct: 'must pass',
          explanation: 'None of your tiles have a 1 or a 6 on either end, so you cannot match either open end of the chain. You must pass your turn.'
        },
        {
          id: 'dom7',
          title: 'Strategic Double',
          description: 'You have [4|4] and [4|1]. The chain end is 4. Should you play the double?',
          yourTiles: ['[4|4]', '[4|1]'],
          chainEnds: [4],
          options: ['[4|4]', '[4|1]'],
          correct: '[4|4]',
          explanation: 'Yes, play the double [4|4]. Doubles are harder to play because both ends show the same number, so they need a specific match. Get them out of your hand early when you have the chance.'
        },
        {
          id: 'dom8',
          title: 'Endgame',
          description: 'You have [5|2] (7 pips total). Your opponent has 2 tiles left. The chain end is 5. Should you play to empty your hand or try to block?',
          yourTiles: ['[5|2]'],
          chainEnds: [5],
          options: ['play to win', 'hold and block'],
          correct: 'play to win',
          explanation: 'Play your last tile to win! When you can empty your hand, do it. There\'s no advantage to holding tiles — the first player to go out wins the round. Play [5|2] on the 5 end and claim victory.'
        }
      ];
    }

    /**
     * Get all puzzles as a flat array.
     * @returns {Array}
     */
    getAllPuzzles() {
      return this.getPuzzles().map(function(p) {
        return Object.assign({}, p, { category: 'tactics' });
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
      container.className = 'domino-practice';
      container.style.cssText = 'padding:12px;max-width:600px;';

      // Header
      var header = document.createElement('div');
      header.style.cssText = 'font-weight:bold;font-size:16px;color:var(--accent, #4fc3f7);margin-bottom:12px;';
      header.textContent = 'Dominoes Practice Puzzles';
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

      // Tiles display
      var tilesDisp = document.createElement('div');
      tilesDisp.style.cssText = 'font-size:12px;color:rgba(255,255,255,0.7);margin-bottom:4px;';
      tilesDisp.textContent = 'Your tiles: ' + puzzle.yourTiles.join(', ') +
        ' | Chain ends: ' + puzzle.chainEnds.join(', ');
      card.appendChild(tilesDisp);

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
            'background:rgba(255,255,255,0.08);color:#fff;font-size:12px;cursor:pointer;';
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

  root.MJ.Dominoes.Practice = Object.freeze({
    DominoPractice: DominoPractice
  });

  if (typeof console !== 'undefined') {
    console.log('[Dominoes] Practice module loaded');
  }

})(typeof window !== 'undefined' ? window : global);
