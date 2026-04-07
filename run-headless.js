#!/usr/bin/env node
/**
 * run-headless.js — Node.js headless Mahjong runner
 * Usage:
 *   node run-headless.js                    # Quick 4-game session
 *   node run-headless.js --games 50         # Run 50 games
 *   node run-headless.js --tournament 100   # 100-game tournament
 *   node run-headless.js --verbose          # Show per-turn output
 *   node run-headless.js --claude 0         # Claude plays seat 0
 *   node run-headless.js --strategy aggressive  # Claude strategy
 *   node run-headless.js --learning         # Enable adaptive learning
 */

// Minimal DOM stubs for modules that check for window/document
global.window = global;
global.MJ = {};
global.document = {
  readyState: 'complete',
  addEventListener: () => {},
  getElementById: () => null,
  body: {},
  createElement: () => ({
    className: '', classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } },
    appendChild(){}, addEventListener(){}, dataset: {}, style: {},
    innerHTML: '', textContent: '', querySelectorAll(){ return []; },
    querySelector(){ return null; }, outerHTML: '', title: ''
  }),
  querySelector: () => null,
  querySelectorAll: () => []
};
global.localStorage = {
  _data: {},
  getItem(k) { return this._data[k] || null; },
  setItem(k, v) { this._data[k] = v; }
};
global.requestAnimationFrame = (f) => setTimeout(f, 0);

// Load modules in order
require('./js/constants.js');
require('./js/tile.js');
require('./js/wall.js');
require('./js/hand.js');
require('./js/scoring.js');
require('./js/player.js');
require('./js/dora.js');
require('./js/shanten-table.js');
require('./js/ai-engine.js');
require('./js/ai-learning.js');
require('./js/ai.js');
require('./js/difficulty.js');
require('./js/exploitative-ai.js');
require('./js/furiten.js');
require('./js/scoring-preview.js');
require('./js/hand-path.js');
require('./js/hint-engine.js');
require('./js/python-bridge.js');
require('./js/stats.js');
require('./js/claude-player.js');
require('./js/headless.js');

// Parse CLI arguments
const args = process.argv.slice(2);
function getArg(name, def) {
  const idx = args.indexOf(`--${name}`);
  if (idx >= 0 && idx + 1 < args.length) return args[idx + 1];
  return args.includes(`--${name}`) ? true : def;
}

const numGames = parseInt(getArg('games', '4'));
const tournament = parseInt(getArg('tournament', '0'));
const verbose = getArg('verbose', false);
const claudeSeat = parseInt(getArg('claude', '-1'));
const strategy = getArg('strategy', 'balanced');
const enableLearning = getArg('learning', false);
const pythonTrain = parseInt(getArg('python-train', '0'));
const showHelp = getArg('help', false);

if (showHelp) {
  console.log(`
Mahjong Headless Runner
========================
Options:
  --games N          Run N games (default: 4)
  --tournament N     Run N-game tournament with stats
  --verbose          Show per-turn output
  --claude SEAT      Claude plays at seat 0-3
  --strategy STR     Claude strategy: balanced|aggressive|defensive
  --learning         Enable adaptive AI learning
  --python-train N   Train Python AI for N games, export weights
  --help             Show this help
`);
  process.exit(0);
}

// Python training mode
if (pythonTrain > 0) {
  (async () => {
    await MJ.PythonBridge.trainPythonAI(pythonTrain);
    console.log('\nPython training complete. Weights exported to data/');
  })();
  // Exit after async completes (handled by trainPythonAI)
  return;
}

// Setup
const stats = new MJ.Stats.GameStats();
const learning = enableLearning ? new MJ.Learning.LearningSystem() : null;

const playerTypes = ['ai', 'ai', 'ai', 'ai'];
let claudePlayer = null;
let claudeCallback = null;

if (claudeSeat >= 0 && claudeSeat < 4) {
  playerTypes[claudeSeat] = 'claude';
  claudePlayer = new MJ.ClaudePlayer.ClaudePlayer(claudeSeat);
  claudePlayer.setStrategy(strategy);
  claudeCallback = MJ.ClaudePlayer.createClaudeCallback(claudePlayer);
  console.log(`Claude playing at seat ${claudeSeat} with ${strategy} strategy`);
}

console.log(`\nStarting ${tournament > 0 ? 'tournament' : 'session'}...`);
console.log(`Games: ${tournament || numGames} | Verbose: ${!!verbose} | Learning: ${!!enableLearning}\n`);

const startTime = Date.now();

if (tournament > 0) {
  // Tournament mode
  const game = new MJ.Headless.HeadlessGame({
    verbose: false,
    playerTypes,
    claudeCallback,
    maxRounds: 4
  });
  game.init(stats, learning);

  const allResults = [];
  for (let g = 1; g <= tournament; g++) {
    game.maxRounds = 4;
    const result = game.runGame();
    allResults.push(result.results);

    if (g % Math.max(1, Math.floor(tournament / 10)) === 0) {
      const pct = ((g / tournament) * 100).toFixed(0);
      process.stdout.write(`  Progress: ${pct}% (${g}/${tournament} games)\r`);
    }
  }
  console.log('');
} else {
  // Regular game mode
  for (let g = 1; g <= numGames; g++) {
    const game = new MJ.Headless.HeadlessGame({
      verbose: !!verbose,
      playerTypes,
      claudeCallback,
      maxRounds: 4
    });
    game.init(stats, learning);

    console.log(`\n===== GAME ${g} =====`);
    const result = game.runGame();

    // Print round summaries
    for (const r of result.results) {
      const status = r.draw ? 'DRAW' : `Winner: Seat ${r.winner} (${r.score} pts)`;
      console.log(`  Round ${r.round}: ${status} | ${r.turns} turns | Wall: ${r.wallRemaining}`);
      if (!r.draw && r.breakdown.length > 0) {
        for (const b of r.breakdown) {
          console.log(`    - ${b.name}: ${b.points} pts`);
        }
      }
    }
  }
}

const elapsed = Date.now() - startTime;

// Print final statistics
console.log('\n' + stats.formatReport());

if (claudePlayer) {
  const summary = claudePlayer.getDecisionSummary();
  console.log(`\nClaude Player Summary:`);
  console.log(`  Strategy: ${summary.strategy}`);
  console.log(`  Total decisions: ${summary.totalDecisions}`);
  console.log(`  Discards: ${summary.discards}`);
  console.log(`  Claims offered: ${summary.claimsOffered}, accepted: ${summary.claimsAccepted}`);
}

if (learning) {
  const lstats = learning.getStats();
  console.log(`\nLearning System (persistent — data/mj_ai_state.json):`);
  console.log(`  Epoch: ${lstats.epoch} (cumulative across sessions)`);
  console.log(`  Learning rate: ${lstats.learningRate.toFixed(4)}`);
  if (lstats.cumulative) {
    const c = lstats.cumulative;
    console.log(`  Lifetime: ${c.totalRounds} rounds, ${c.totalWins} wins, best epoch win rate: ${(c.bestEpochWinRate * 100).toFixed(1)}%`);
  }
  console.log(`  Current weights:`);
  for (const [k, v] of Object.entries(lstats.currentWeights)) {
    console.log(`    ${k}: ${typeof v === 'number' ? v.toFixed(3) : v}`);
  }
  console.log(`  Data persisted to: data/mj_ai_state.json`);
}

console.log(`\nCompleted in ${(elapsed / 1000).toFixed(1)}s`);
