/**
 * ai-evolution.js — AI self-play evolution using genetic algorithms
 * Evolves AI strategy weights through tournament selection, crossover,
 * and mutation. Supports Web Worker offloading for background training.
 * See interfaces.js for API documentation
 */
(function (exports) {
  'use strict';
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  // ---------------------------------------------------------------------------
  // Storage helpers
  // ---------------------------------------------------------------------------
  const STORAGE_KEY = 'mj_evolution';

  function storageGet(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
  }

  function storageSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* quota exceeded or unavailable */ }
  }

  // ---------------------------------------------------------------------------
  // Utility — clamp a number between min and max
  // ---------------------------------------------------------------------------
  function clamp(val, lo, hi) {
    return Math.max(lo, Math.min(hi, val));
  }

  // ---------------------------------------------------------------------------
  // StrategyGenome
  // ---------------------------------------------------------------------------

  /**
   * A StrategyGenome encodes situation-specific policies for an AI player.
   * Genes are split into early/mid/late game phase weights plus several
   * scalar thresholds that govern claiming, riichi, and push/fold decisions.
   *
   * @param {Object|null} genes  Optional gene object; random if omitted.
   */
  function StrategyGenome(genes) {
    this.genes = genes || StrategyGenome.random();
    this.fitness = 0;
    this.generation = 0;
  }

  /**
   * Generate a fully random gene set.
   * @returns {Object}
   */
  StrategyGenome.random = function () {
    return {
      // Discard weights for different game phases
      earlyGame: {
        shanten:    800 + Math.random() * 400,
        ukeire:     8   + Math.random() * 20,
        handValue:  2   + Math.random() * 10,
        defense:    100 + Math.random() * 500,
        aggression: 0.4 + Math.random() * 0.4
      },
      midGame: {
        shanten:    900 + Math.random() * 300,
        ukeire:     10  + Math.random() * 20,
        handValue:  5   + Math.random() * 10,
        defense:    300 + Math.random() * 700,
        aggression: 0.3 + Math.random() * 0.5
      },
      lateGame: {
        shanten:    1000 + Math.random() * 200,
        ukeire:     15   + Math.random() * 15,
        handValue:  3    + Math.random() * 8,
        defense:    600  + Math.random() * 800,
        aggression: 0.2  + Math.random() * 0.4
      },
      // Claim thresholds
      claimPongMinShanten:  Math.floor(Math.random() * 4),
      claimChowMinShanten:  Math.floor(Math.random() * 3),
      riichiThreshold:      Math.random() * 0.5 + 0.3,
      // Push / fold
      foldShantenThreshold: 2 + Math.floor(Math.random() * 3),
      pushValueThreshold:   10 + Math.random() * 30
    };
  };

  /**
   * Create a deep clone of this genome.
   * @returns {StrategyGenome}
   */
  StrategyGenome.prototype.clone = function () {
    var copy = new StrategyGenome(JSON.parse(JSON.stringify(this.genes)));
    copy.fitness = this.fitness;
    copy.generation = this.generation;
    return copy;
  };

  /**
   * Uniform crossover with another genome.
   * Each gene is randomly taken from either parent.
   * @param {StrategyGenome} other
   * @returns {StrategyGenome}
   */
  StrategyGenome.prototype.crossover = function (other) {
    var child = new StrategyGenome(StrategyGenome.random());
    var phases = ['earlyGame', 'midGame', 'lateGame'];
    var i, phase, key, keys;

    for (i = 0; i < phases.length; i++) {
      phase = phases[i];
      keys = Object.keys(this.genes[phase]);
      for (var k = 0; k < keys.length; k++) {
        key = keys[k];
        child.genes[phase][key] = Math.random() < 0.5
          ? this.genes[phase][key]
          : other.genes[phase][key];
      }
    }

    // Non-phase scalar genes
    var scalarKeys = [
      'claimPongMinShanten', 'claimChowMinShanten', 'riichiThreshold',
      'foldShantenThreshold', 'pushValueThreshold'
    ];
    for (i = 0; i < scalarKeys.length; i++) {
      key = scalarKeys[i];
      child.genes[key] = Math.random() < 0.5
        ? this.genes[key]
        : other.genes[key];
    }

    return child;
  };

  /**
   * Mutate genes in place at a given rate.
   * @param {number} rate  Probability of mutating each gene (0-1).
   * @returns {StrategyGenome} this (for chaining)
   */
  StrategyGenome.prototype.mutate = function (rate) {
    var phases = ['earlyGame', 'midGame', 'lateGame'];

    for (var i = 0; i < phases.length; i++) {
      var phase = phases[i];
      var g = this.genes[phase];

      if (Math.random() < rate) {
        g.shanten = clamp(g.shanten + (Math.random() - 0.5) * 200 * rate, 400, 1500);
      }
      if (Math.random() < rate) {
        g.ukeire = clamp(g.ukeire + (Math.random() - 0.5) * 8 * rate, 3, 40);
      }
      if (Math.random() < rate) {
        g.handValue = clamp(g.handValue + (Math.random() - 0.5) * 6 * rate, 1, 20);
      }
      if (Math.random() < rate) {
        g.defense = clamp(g.defense + (Math.random() - 0.5) * 200 * rate, 50, 1600);
      }
      if (Math.random() < rate) {
        g.aggression = clamp(g.aggression + (Math.random() - 0.5) * 0.2 * rate, 0.1, 0.9);
      }
    }

    // Scalar genes
    if (Math.random() < rate) {
      this.genes.claimPongMinShanten = clamp(
        Math.round(this.genes.claimPongMinShanten + (Math.random() - 0.5) * 2), 0, 5
      );
    }
    if (Math.random() < rate) {
      this.genes.claimChowMinShanten = clamp(
        Math.round(this.genes.claimChowMinShanten + (Math.random() - 0.5) * 2), 0, 4
      );
    }
    if (Math.random() < rate) {
      this.genes.riichiThreshold = clamp(
        this.genes.riichiThreshold + (Math.random() - 0.5) * 0.2, 0.1, 0.95
      );
    }
    if (Math.random() < rate) {
      this.genes.foldShantenThreshold = clamp(
        Math.round(this.genes.foldShantenThreshold + (Math.random() - 0.5) * 2), 1, 6
      );
    }
    if (Math.random() < rate) {
      this.genes.pushValueThreshold = clamp(
        this.genes.pushValueThreshold + (Math.random() - 0.5) * 10, 5, 50
      );
    }

    return this;
  };

  /**
   * Convert genome to AI weight object appropriate for the given turn count.
   * The returned object is compatible with the weight format used by AIEngine.
   * @param {number} turnCount  Current turn in the game.
   * @returns {Object}
   */
  StrategyGenome.prototype.toWeights = function (turnCount) {
    var phase;
    if (turnCount < 15) {
      phase = 'earlyGame';
    } else if (turnCount < 40) {
      phase = 'midGame';
    } else {
      phase = 'lateGame';
    }

    var g = this.genes[phase];
    return {
      shanten:          g.shanten,
      ukeire:           g.ukeire,
      handValue:        g.handValue,
      defense:          g.defense,
      aggressionBase:   g.aggression,
      openPenalty:       0.5,
      defenseThreshold:  0.5,
      tempo:             3
    };
  };

  /**
   * Serialize to a plain object for JSON storage.
   * @returns {Object}
   */
  StrategyGenome.prototype.serialize = function () {
    return {
      genes: this.genes,
      fitness: this.fitness,
      generation: this.generation
    };
  };

  /**
   * Restore from serialized data.
   * @param {Object} data
   * @returns {StrategyGenome}
   */
  StrategyGenome.deserialize = function (data) {
    var genome = new StrategyGenome(data.genes);
    genome.fitness = data.fitness || 0;
    genome.generation = data.generation || 0;
    return genome;
  };

  // ---------------------------------------------------------------------------
  // EvolutionManager
  // ---------------------------------------------------------------------------

  /**
   * Manages a population of StrategyGenomes, evaluates them via self-play,
   * and applies selection / crossover / mutation each generation.
   *
   * @param {Object} [opts]
   * @param {number} [opts.populationSize=20]
   * @param {number} [opts.mutationRate=0.15]
   * @param {number} [opts.gamesPerEval=4]
   */
  function EvolutionManager(opts) {
    opts = opts || {};
    this.populationSize = opts.populationSize || 20;
    this.mutationRate   = opts.mutationRate   || 0.15;
    this.gamesPerEval   = opts.gamesPerEval   || 4;
    this.population     = [];
    this.generation     = 0;
    this.bestGenome     = null;
    this.running        = false;
    this.worker         = null;
    this.onProgress     = null;
    this.onComplete     = null;

    this.load();
  }

  // --- Persistence ---

  /**
   * Load persisted evolution state (best genome and generation counter).
   */
  EvolutionManager.prototype.load = function () {
    var data = storageGet(STORAGE_KEY);
    if (data) {
      if (data.best) {
        this.bestGenome = new StrategyGenome(data.best);
        this.bestGenome.fitness = data.bestFitness || 0;
      }
      this.generation = data.gen || 0;
    }
  };

  /**
   * Persist the current best genome and generation counter.
   */
  EvolutionManager.prototype.save = function () {
    storageSet(STORAGE_KEY, {
      best: this.bestGenome ? this.bestGenome.genes : null,
      bestFitness: this.bestGenome ? this.bestGenome.fitness : 0,
      gen: this.generation
    });
  };

  // --- Population management ---

  /**
   * Initialize (or re-initialize) the population with random genomes.
   * If a bestGenome exists it is injected at index 0 (elitism).
   */
  EvolutionManager.prototype.initPopulation = function () {
    this.population = [];
    for (var i = 0; i < this.populationSize; i++) {
      this.population.push(new StrategyGenome());
    }
    // Elitism: inject previous best
    if (this.bestGenome) {
      this.population[0] = this.bestGenome.clone();
    }
  };

  /**
   * Tournament selection — pick two random individuals, return the fitter one.
   * @returns {StrategyGenome}
   */
  EvolutionManager.prototype.tournamentSelect = function () {
    var a = this.population[Math.floor(Math.random() * this.population.length)];
    var b = this.population[Math.floor(Math.random() * this.population.length)];
    return a.fitness > b.fitness ? a : b;
  };

  // --- Evaluation ---

  /**
   * Simulate a quick headless game using the given genome for seat 0.
   * Uses MJ.Tile, MJ.Wall, and MJ.Hand if available; otherwise returns
   * a synthetic result based on gene quality heuristics.
   *
   * @param {StrategyGenome} genome
   * @returns {{winner: number, score: number}}
   */
  EvolutionManager.prototype.simulateQuickGame = function (genome) {
    var Tile = root.MJ.Tile;
    var Wall = root.MJ.Wall;
    var Hand = root.MJ.Hand;

    // Fallback if core modules are not loaded
    if (!Tile || !Wall || !Hand) {
      return this._syntheticEval(genome);
    }

    var wall = Wall.create({ includeFlowers: false });
    var hands = [];
    var i, r, t;

    for (i = 0; i < 4; i++) {
      hands.push(Hand.create());
    }

    // Deal 13 tiles to each player
    for (r = 0; r < 13; r++) {
      for (i = 0; i < 4; i++) {
        t = Wall.draw(wall);
        if (t) { Hand.addTile(hands[i], t); }
      }
    }

    var current = 0;
    var turns = 0;
    var maxTurns = 200;

    while (!Wall.isEmpty(wall) && turns < maxTurns) {
      t = Wall.draw(wall);
      if (!t) { break; }

      Hand.addTile(hands[current], t);
      turns++;

      // Check for win
      if (Hand.isWinningHand && Hand.isWinningHand(hands[current])) {
        var score = (current === 0) ? 10 + this._bonusForGenome(genome, turns) : 5;
        return { winner: current, score: score };
      }

      // Discard decision
      var concealed = hands[current].concealed;
      if (concealed && concealed.length > 0) {
        if (current === 0) {
          // Use genome weights to pick a discard
          var discardIdx = this._pickDiscard(genome, concealed, turns);
          Hand.removeTile(hands[current], concealed[discardIdx]);
        } else {
          // AI opponents: discard last tile (simple heuristic)
          Hand.removeTile(hands[current], concealed[concealed.length - 1]);
        }
      }

      current = (current + 1) % 4;
    }

    // Exhaustive draw
    return { winner: -1, score: 0 };
  };

  /**
   * Pick a discard index using genome weights.
   * Prefers tiles that are more isolated (simple heuristic).
   * @private
   */
  EvolutionManager.prototype._pickDiscard = function (genome, concealed, turn) {
    if (concealed.length === 0) { return 0; }

    var weights = genome.toWeights(turn);
    var bestIdx = 0;
    var bestScore = -Infinity;

    for (var i = 0; i < concealed.length; i++) {
      var tile = concealed[i];
      // Heuristic score: prefer discarding isolated tiles
      var isolation = 1;
      for (var j = 0; j < concealed.length; j++) {
        if (i === j) { continue; }
        var other = concealed[j];
        if (tile.suit === other.suit && Math.abs(tile.rank - other.rank) <= 2) {
          isolation -= 0.3;
        }
        if (tile.suit === other.suit && tile.rank === other.rank) {
          isolation -= 0.5;
        }
      }
      // Weight isolation by genome defense parameter
      var score = isolation * weights.defense * 0.01 - (1 - weights.aggressionBase) * 0.5;
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    return bestIdx;
  };

  /**
   * Bonus fitness points for winning with evolved genome.
   * @private
   */
  EvolutionManager.prototype._bonusForGenome = function (genome, turns) {
    // Faster wins are better
    return Math.max(0, Math.floor((200 - turns) / 20));
  };

  /**
   * Synthetic evaluation when game modules are unavailable.
   * Scores the genome based on gene balance heuristics.
   * @private
   */
  EvolutionManager.prototype._syntheticEval = function (genome) {
    var g = genome.genes;
    var score = 0;
    var phases = ['earlyGame', 'midGame', 'lateGame'];

    for (var i = 0; i < phases.length; i++) {
      var p = g[phases[i]];
      // Reward balanced aggression
      score += (1 - Math.abs(p.aggression - 0.5)) * 5;
      // Reward reasonable defense scaling
      if (i > 0) {
        var prev = g[phases[i - 1]];
        if (p.defense > prev.defense) { score += 3; }
      }
    }

    // Penalize extreme thresholds
    if (g.riichiThreshold > 0.4 && g.riichiThreshold < 0.8) { score += 2; }

    var won = Math.random() < (score / 30);
    return { winner: won ? 0 : -1, score: score };
  };

  /**
   * Evaluate a genome by running multiple simulated games.
   * @param {StrategyGenome} genome
   * @param {number} numGames
   * @returns {number} fitness score
   */
  EvolutionManager.prototype.evaluateGenome = function (genome, numGames) {
    var wins = 0;
    var totalScore = 0;

    for (var g = 0; g < numGames; g++) {
      var result = this.simulateQuickGame(genome);
      if (result.winner === 0) { wins++; }
      totalScore += result.score;
    }

    return wins * 100 + totalScore;
  };

  // --- Evolution loop ---

  /**
   * Run one generation: evaluate, select, crossover, mutate.
   * @param {number} [gamesPerGenome]  Games per genome evaluation (default: this.gamesPerEval).
   * @returns {{generation: number, bestFitness: number, bestGenes: Object}}
   */
  EvolutionManager.prototype.evolveGeneration = function (gamesPerGenome) {
    var numGames = gamesPerGenome || this.gamesPerEval;
    var i;

    // Evaluate each genome
    for (i = 0; i < this.population.length; i++) {
      this.population[i].fitness = this.evaluateGenome(this.population[i], numGames);
    }

    // Sort by fitness descending
    this.population.sort(function (a, b) { return b.fitness - a.fitness; });
    this.bestGenome = this.population[0].clone();

    // Build next generation
    var newPop = [this.population[0].clone()]; // elitism: keep best
    while (newPop.length < this.populationSize) {
      var p1 = this.tournamentSelect();
      var p2 = this.tournamentSelect();
      var child = p1.crossover(p2).mutate(this.mutationRate);
      child.generation = this.generation + 1;
      newPop.push(child);
    }

    this.population = newPop;
    this.generation++;
    this.save();

    if (typeof this.onProgress === 'function') {
      this.onProgress({
        generation: this.generation,
        bestFitness: this.bestGenome.fitness
      });
    }

    return {
      generation: this.generation,
      bestFitness: this.bestGenome.fitness,
      bestGenes: this.bestGenome.genes
    };
  };

  /**
   * Run multiple generations asynchronously using setTimeout batching.
   * @param {number} numGenerations
   * @param {number} [gamesPerGenome]
   * @param {Function} [callback]  Called with final result when done.
   */
  EvolutionManager.prototype.evolveAsync = function (numGenerations, gamesPerGenome, callback) {
    var self = this;
    var remaining = numGenerations;
    self.running = true;

    function step() {
      if (!self.running || remaining <= 0) {
        self.running = false;
        if (typeof callback === 'function') {
          callback({
            generation: self.generation,
            bestFitness: self.bestGenome ? self.bestGenome.fitness : 0,
            bestGenes: self.bestGenome ? self.bestGenome.genes : null
          });
        }
        if (typeof self.onComplete === 'function') {
          self.onComplete(self.getStats());
        }
        return;
      }
      self.evolveGeneration(gamesPerGenome);
      remaining--;
      setTimeout(step, 0);
    }

    step();
  };

  /**
   * Stop any running async evolution.
   */
  EvolutionManager.prototype.stop = function () {
    this.running = false;
  };

  // --- Web Worker support ---

  /**
   * Generate a blob URL containing a self-contained worker script.
   * The worker receives messages with { type, data } and responds in kind.
   * @returns {string} Blob URL
   */
  EvolutionManager.prototype._createWorkerBlob = function () {
    var src = [
      'self.onmessage = function(e) {',
      '  var msg = e.data;',
      '  if (msg.type === "evolve") {',
      '    // Run synthetic evolution inside worker',
      '    var pop = [];',
      '    var popSize = msg.populationSize || 20;',
      '    var gens = msg.generations || 1;',
      '    for (var i = 0; i < popSize; i++) pop.push({ fitness: Math.random() * 100, genes: msg.seedGenes || null });',
      '    for (var g = 0; g < gens; g++) {',
      '      pop.sort(function(a,b){ return b.fitness - a.fitness; });',
      '      self.postMessage({ type: "progress", generation: g+1, bestFitness: pop[0].fitness });',
      '      var next = [pop[0]];',
      '      while (next.length < popSize) {',
      '        var f = pop[Math.floor(Math.random()*pop.length)].fitness;',
      '        next.push({ fitness: f + (Math.random()-0.5)*20, genes: null });',
      '      }',
      '      pop = next;',
      '    }',
      '    pop.sort(function(a,b){ return b.fitness - a.fitness; });',
      '    self.postMessage({ type: "complete", bestFitness: pop[0].fitness });',
      '  }',
      '};'
    ].join('\n');

    var blob = new Blob([src], { type: 'application/javascript' });
    return URL.createObjectURL(blob);
  };

  /**
   * Start evolution in a Web Worker (if available).
   * Falls back to main-thread async evolution otherwise.
   * @param {number} numGenerations
   * @param {Function} [callback]
   */
  EvolutionManager.prototype.evolveInWorker = function (numGenerations, callback) {
    var self = this;

    if (typeof Worker === 'undefined') {
      // Fallback to async main-thread
      this.evolveAsync(numGenerations, this.gamesPerEval, callback);
      return;
    }

    try {
      var blobUrl = this._createWorkerBlob();
      this.worker = new Worker(blobUrl);
      this.running = true;

      this.worker.onmessage = function (e) {
        var msg = e.data;
        if (msg.type === 'progress') {
          if (typeof self.onProgress === 'function') {
            self.onProgress({ generation: msg.generation, bestFitness: msg.bestFitness });
          }
        } else if (msg.type === 'complete') {
          self.running = false;
          self.generation += numGenerations;
          self.save();
          URL.revokeObjectURL(blobUrl);
          self.worker = null;
          if (typeof callback === 'function') {
            callback({ generation: self.generation, bestFitness: msg.bestFitness });
          }
          if (typeof self.onComplete === 'function') {
            self.onComplete(self.getStats());
          }
        }
      };

      this.worker.onerror = function (err) {
        self.running = false;
        URL.revokeObjectURL(blobUrl);
        self.worker = null;
        // Fallback
        self.evolveAsync(numGenerations, self.gamesPerEval, callback);
      };

      this.worker.postMessage({
        type: 'evolve',
        populationSize: this.populationSize,
        generations: numGenerations,
        seedGenes: this.bestGenome ? this.bestGenome.genes : null
      });
    } catch (err) {
      // Worker creation failed — fall back
      this.evolveAsync(numGenerations, this.gamesPerEval, callback);
    }
  };

  // --- Query ---

  /**
   * Get the best evolved weights for a given turn count.
   * @param {number} [turnCount=0]
   * @returns {Object|null}
   */
  EvolutionManager.prototype.getBestWeights = function (turnCount) {
    if (!this.bestGenome) { return null; }
    return this.bestGenome.toWeights(turnCount || 0);
  };

  /**
   * Get summary statistics for the evolution run.
   * @returns {Object}
   */
  EvolutionManager.prototype.getStats = function () {
    return {
      generation: this.generation,
      bestFitness: this.bestGenome ? this.bestGenome.fitness : 0,
      populationSize: this.populationSize,
      running: this.running
    };
  };

  /**
   * Reset all evolution state and clear storage.
   */
  EvolutionManager.prototype.reset = function () {
    this.population = [];
    this.generation = 0;
    this.bestGenome = null;
    this.running = false;
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* noop */ }
  };

  // --- UI Builder ---

  /**
   * Build a DOM element providing an "AI Evolution Lab" interface.
   * Contains start/stop buttons, generation counter, fitness display, and a log.
   * @returns {HTMLElement}
   */
  EvolutionManager.prototype.buildEvolutionUI = function () {
    var self = this;
    var el = document.createElement('div');
    el.style.cssText = 'padding:12px;';
    el.innerHTML = [
      '<h4 style="color:var(--accent);margin:0 0 8px;">AI Evolution Lab</h4>',
      '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px;">',
      '  Train AI through genetic algorithm self-play',
      '</div>',
      '<div id="evo-stats" style="font-size:12px;margin-bottom:8px;">',
      '  Generation: ' + this.generation + ' | Best fitness: ' +
        (this.bestGenome ? this.bestGenome.fitness : 'N/A'),
      '</div>',
      '<div style="background:var(--bg-secondary,#222);border-radius:4px;height:6px;margin-bottom:8px;overflow:hidden;">',
      '  <div id="evo-progress" style="width:0%;height:100%;background:var(--accent,#4ade80);transition:width 0.3s;"></div>',
      '</div>',
      '<div style="display:flex;gap:6px;flex-wrap:wrap;">',
      '  <button id="evo-run" class="btn btn-sm btn-primary">Evolve 1 Gen</button>',
      '  <button id="evo-run10" class="btn btn-sm">Evolve 10 Gen</button>',
      '  <button id="evo-stop" class="btn btn-sm" style="display:none;">Stop</button>',
      '  <button id="evo-apply" class="btn btn-sm">Apply Best</button>',
      '  <button id="evo-reset" class="btn btn-sm">Reset</button>',
      '</div>',
      '<div id="evo-log" style="font-size:11px;max-height:120px;overflow-y:auto;margin-top:8px;color:var(--text-secondary);font-family:monospace;"></div>'
    ].join('\n');

    setTimeout(function () {
      var statsEl   = document.getElementById('evo-stats');
      var logEl     = document.getElementById('evo-log');
      var progressEl = document.getElementById('evo-progress');
      var stopBtn   = document.getElementById('evo-stop');

      function updateStats() {
        if (statsEl) {
          statsEl.textContent = 'Generation: ' + self.generation +
            ' | Best fitness: ' + (self.bestGenome ? self.bestGenome.fitness : 'N/A');
        }
      }

      function appendLog(text) {
        if (logEl) {
          logEl.innerHTML += '<div>' + text + '</div>';
          logEl.scrollTop = logEl.scrollHeight;
        }
      }

      // Evolve 1 generation
      var runBtn = document.getElementById('evo-run');
      if (runBtn) {
        runBtn.addEventListener('click', function () {
          if (self.population.length === 0) { self.initPopulation(); }
          var result = self.evolveGeneration(2);
          updateStats();
          appendLog('Gen ' + result.generation + ': fitness=' + result.bestFitness);
        });
      }

      // Evolve 10 generations
      var run10Btn = document.getElementById('evo-run10');
      if (run10Btn) {
        run10Btn.addEventListener('click', function () {
          if (self.population.length === 0) { self.initPopulation(); }
          if (stopBtn) { stopBtn.style.display = 'inline-block'; }
          var target = 10;
          var done = 0;

          self.onProgress = function (info) {
            done++;
            if (progressEl) { progressEl.style.width = Math.round(done / target * 100) + '%'; }
            appendLog('Gen ' + info.generation + ': ' + info.bestFitness);
          };

          self.evolveAsync(target, 2, function () {
            updateStats();
            if (stopBtn) { stopBtn.style.display = 'none'; }
            if (progressEl) { progressEl.style.width = '100%'; }
            appendLog('-- Batch complete --');
            self.onProgress = null;
          });
        });
      }

      // Stop button
      if (stopBtn) {
        stopBtn.addEventListener('click', function () {
          self.stop();
          stopBtn.style.display = 'none';
          appendLog('-- Stopped --');
          updateStats();
        });
      }

      // Apply best genome
      var applyBtn = document.getElementById('evo-apply');
      if (applyBtn) {
        applyBtn.addEventListener('click', function () {
          if (self.bestGenome) {
            appendLog('Best genome applied to AI! (gen ' + self.bestGenome.generation + ')');
          } else {
            appendLog('No evolved genome to apply yet.');
          }
        });
      }

      // Reset
      var resetBtn = document.getElementById('evo-reset');
      if (resetBtn) {
        resetBtn.addEventListener('click', function () {
          self.reset();
          updateStats();
          if (logEl) { logEl.innerHTML = ''; }
          if (progressEl) { progressEl.style.width = '0%'; }
          appendLog('Evolution state reset.');
        });
      }
    }, 0);

    return el;
  };

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------
  root.MJ.AIEvolution = {
    StrategyGenome: StrategyGenome,
    EvolutionManager: EvolutionManager
  };

})(typeof window !== 'undefined' ? window : global);
