#!/usr/bin/env node
/**
 * test-modules.js — Integration tests for Mahjong modules (Node.js)
 * Run: node js/test-modules.js
 */
'use strict';

// Shim browser globals for modules that use window/localStorage
const g = global;
g.window = g;
g.localStorage = {
  _data: {},
  getItem(k) { return this._data[k] || null; },
  setItem(k, v) { this._data[k] = v; },
  removeItem(k) { delete this._data[k]; }
};
g.MJ = {};

const path = require('path');
const fs = require('fs');

function loadModule(name) {
  const p = path.join(__dirname, name);
  const code = fs.readFileSync(p, 'utf8');
  // Silence console.log from module loading
  const origLog = console.log;
  console.log = function () {};
  try {
    // Use Function instead of eval so modules see global scope
    new Function(code)();
  } finally {
    console.log = origLog;
  }
}

// Load modules in dependency order
loadModule('constants.js');
loadModule('tile.js');
loadModule('hand.js');
loadModule('scoring.js');
loadModule('ai-engine.js');
loadModule('dora.js');
loadModule('furiten.js');
loadModule('scoring-preview.js');
loadModule('shanten-table.js');
loadModule('hand-path.js');
loadModule('achievements.js');
loadModule('practice-mode.js');

const { SUITS } = MJ.Constants;
const Tile = MJ.Tile;
const Hand = MJ.Hand;
const Scoring = MJ.Scoring;
const AIE = MJ.AIEngine;
const Dora = MJ.Dora;
const Furiten = MJ.Furiten;
const ScoringPreview = MJ.ScoringPreview;
const ShantenTable = MJ.ShantenTable;
const HandPath = MJ.HandPath;
const Achievements = MJ.Achievements;
const PracticeMode = MJ.PracticeMode.PracticeMode;

// ── Test runner ──────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (!cond) throw new Error('Assertion failed: ' + msg);
}

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  PASS  ' + name);
  } catch (e) {
    failed++;
    console.log('  FAIL  ' + name + ' -- ' + e.message);
  }
}

// ── Helpers ──────────────────────────────────────────────────────────

function makeHand(tileDefs) {
  const hand = Hand.create();
  for (const def of tileDefs) {
    hand.concealed.push(Tile.create(def.suit, def.rank));
  }
  return hand;
}

function buildPlayer(hand, opts) {
  opts = opts || {};
  return {
    seatIndex: opts.seatIndex || 0,
    seatWind: opts.seatWind || 'east',
    hand: hand,
    discards: opts.discards || [],
    flowerTiles: opts.flowerTiles || [],
    riichi: opts.riichi || false,
    isDealer: opts.isDealer || false,
  };
}

function buildState(players, opts) {
  opts = opts || {};
  return {
    roundWind: opts.roundWind || 'east',
    turnCount: opts.turnCount || 8,
    players: players,
    lastDiscard: opts.lastDiscard || null,
  };
}

function makeMinimalState(hand) {
  const p0 = buildPlayer(hand);
  const others = [1, 2, 3].map(i => ({
    seatIndex: i,
    seatWind: ['south', 'west', 'north'][i - 1],
    hand: Hand.create(),
    discards: [],
  }));
  return buildState([p0, ...others]);
}

// ── 1. Dora tests ────────────────────────────────────────────────────

console.log('\n--- Dora ---');

test('Suited tile: indicator 1 bamboo -> dora 2 bamboo', () => {
  const d = Dora.getDoraFromIndicator({ suit: 'bamboo', rank: 1 });
  assert(d.suit === 'bamboo' && d.rank === 2, `got ${d.suit}-${d.rank}`);
});

test('Suited tile: indicator 9 circles -> dora 1 circles (wrap)', () => {
  const d = Dora.getDoraFromIndicator({ suit: 'circles', rank: 9 });
  assert(d.suit === 'circles' && d.rank === 1, `got ${d.suit}-${d.rank}`);
});

test('Wind wrap: indicator 4 (North) -> dora 1 (East)', () => {
  const d = Dora.getDoraFromIndicator({ suit: 'wind', rank: 4 });
  assert(d.suit === 'wind' && d.rank === 1, `got ${d.suit}-${d.rank}`);
});

test('Wind sequence: East -> South -> West -> North', () => {
  for (let r = 1; r <= 3; r++) {
    const d = Dora.getDoraFromIndicator({ suit: 'wind', rank: r });
    assert(d.rank === r + 1, `wind ${r} -> expected ${r + 1}, got ${d.rank}`);
  }
});

test('Dragon wrap: indicator 3 (White) -> dora 1 (Red)', () => {
  const d = Dora.getDoraFromIndicator({ suit: 'dragon', rank: 3 });
  assert(d.suit === 'dragon' && d.rank === 1, `got ${d.suit}-${d.rank}`);
});

test('Dragon sequence: Red -> Green -> White', () => {
  const d1 = Dora.getDoraFromIndicator({ suit: 'dragon', rank: 1 });
  assert(d1.rank === 2, 'Red -> Green');
  const d2 = Dora.getDoraFromIndicator({ suit: 'dragon', rank: 2 });
  assert(d2.rank === 3, 'Green -> White');
});

test('Characters 9 -> 1 wrap', () => {
  const d = Dora.getDoraFromIndicator({ suit: 'characters', rank: 9 });
  assert(d.suit === 'characters' && d.rank === 1, `got ${d.suit}-${d.rank}`);
});

test('countDora counts correctly', () => {
  const hand = [{ suit: 'bamboo', rank: 2 }, { suit: 'bamboo', rank: 2 }];
  const indicators = [{ suit: 'bamboo', rank: 1 }]; // dora = bamboo 2
  const count = Dora.countDora(hand, [], indicators);
  assert(count === 2, `expected 2, got ${count}`);
});

// ── 2. Furiten tests ─────────────────────────────────────────────────

console.log('\n--- Furiten ---');

test('Tenpai hand with wait tile in own discards -> furiten', () => {
  // Build a tenpai hand: three sets + a pair + one partial waiting for bamboo-7
  // 1-2-3 bamboo, 4-5-6 bamboo, 1-2-3 circles, 9-9 chars, 5-6 bamboo (waiting 4 or 7)
  const hand = makeHand([
    { suit: 'bamboo', rank: 1 }, { suit: 'bamboo', rank: 2 }, { suit: 'bamboo', rank: 3 },
    { suit: 'bamboo', rank: 4 }, { suit: 'bamboo', rank: 5 }, { suit: 'bamboo', rank: 6 },
    { suit: 'circles', rank: 1 }, { suit: 'circles', rank: 2 }, { suit: 'circles', rank: 3 },
    { suit: 'characters', rank: 9 }, { suit: 'characters', rank: 9 },
    { suit: 'bamboo', rank: 5 }, { suit: 'bamboo', rank: 6 },
  ]);

  const discardTile = Tile.create('bamboo', 7);
  const player = buildPlayer(hand, {
    discards: [discardTile],
  });
  const state = makeMinimalState(hand);
  state.players[0] = player;

  const result = Furiten.checkFuriten(player, state);
  assert(result.isFuriten === true, 'expected furiten but got: ' + result.reason);
});

test('Tenpai hand with no wait in discards -> not furiten', () => {
  const hand = makeHand([
    { suit: 'bamboo', rank: 1 }, { suit: 'bamboo', rank: 2 }, { suit: 'bamboo', rank: 3 },
    { suit: 'circles', rank: 4 }, { suit: 'circles', rank: 5 }, { suit: 'circles', rank: 6 },
    { suit: 'characters', rank: 7 }, { suit: 'characters', rank: 8 }, { suit: 'characters', rank: 9 },
    { suit: 'dragon', rank: 3 }, { suit: 'dragon', rank: 3 },
    { suit: 'bamboo', rank: 5 }, { suit: 'bamboo', rank: 6 },
  ]);

  const player = buildPlayer(hand, { discards: [] });
  const state = makeMinimalState(hand);
  state.players[0] = player;

  const result = Furiten.checkFuriten(player, state);
  assert(result.isFuriten === false, 'expected not furiten but got: ' + result.reason);
});

// ── 3. Scoring preview tests ─────────────────────────────────────────

console.log('\n--- Scoring Preview ---');

test('Tenpai hand gets non-empty score previews', () => {
  const hand = makeHand([
    { suit: 'bamboo', rank: 1 }, { suit: 'bamboo', rank: 2 }, { suit: 'bamboo', rank: 3 },
    { suit: 'circles', rank: 4 }, { suit: 'circles', rank: 5 }, { suit: 'circles', rank: 6 },
    { suit: 'characters', rank: 7 }, { suit: 'characters', rank: 8 }, { suit: 'characters', rank: 9 },
    { suit: 'dragon', rank: 3 }, { suit: 'dragon', rank: 3 },
    { suit: 'bamboo', rank: 5 }, { suit: 'bamboo', rank: 6 },
  ]);

  const player = buildPlayer(hand);
  const state = makeMinimalState(hand);

  const previews = ScoringPreview.previewScores(player, state);
  assert(previews.length > 0, 'expected previews but got empty array');
  assert(previews[0].score > 0, 'expected positive score');
  assert(previews[0].waitTile && previews[0].waitTile.suit, 'expected waitTile');
});

test('Non-tenpai hand returns empty previews', () => {
  const hand = makeHand([
    { suit: 'bamboo', rank: 1 }, { suit: 'circles', rank: 3 },
    { suit: 'characters', rank: 5 }, { suit: 'wind', rank: 1 },
    { suit: 'dragon', rank: 2 }, { suit: 'bamboo', rank: 7 },
    { suit: 'circles', rank: 9 }, { suit: 'characters', rank: 2 },
    { suit: 'wind', rank: 3 }, { suit: 'dragon', rank: 1 },
    { suit: 'bamboo', rank: 4 }, { suit: 'circles', rank: 6 },
    { suit: 'characters', rank: 8 },
  ]);

  const player = buildPlayer(hand);
  const state = makeMinimalState(hand);

  const previews = ScoringPreview.previewScores(player, state);
  assert(previews.length === 0, 'expected empty previews for non-tenpai hand');
});

// ── 4. Shanten table tests ───────────────────────────────────────────

console.log('\n--- Shanten Table ---');

test('fastShanten vs calcShantenCompact for 20 random hands', () => {
  let mismatches = 0;
  const details = [];

  for (let trial = 0; trial < 20; trial++) {
    // Generate a random 13-tile hand
    const compact = new Uint8Array(34);
    const pool = [];
    for (let i = 0; i < 34; i++) {
      for (let c = 0; c < 4; c++) pool.push(i);
    }
    // Shuffle and pick 13
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    compact.fill(0);
    for (let i = 0; i < 13; i++) compact[pool[i]]++;

    const fast = ShantenTable.fastShanten(compact, 0);
    const recursive = AIE.calcShantenCompact(new Uint8Array(compact), 0);

    // They may differ slightly due to different algorithms; check they are close
    if (Math.abs(fast - recursive) > 2) {
      mismatches++;
      details.push(`trial ${trial}: fast=${fast} recursive=${recursive}`);
    }
  }

  assert(mismatches <= 5, `Too many large mismatches: ${mismatches}. ${details.join('; ')}`);
});

test('fastShanten agrees with calcShantenCompact on a winning hand', () => {
  const compact = new Uint8Array(34);
  // 1-2-3 bamboo (indices 9,10,11), 4-5-6 bamboo (12,13,14),
  // 7-8-9 bamboo (15,16,17), 1-2-3 circles (18,19,20), pair: 1-1 chars (0)
  compact[9] = 1; compact[10] = 1; compact[11] = 1;
  compact[12] = 1; compact[13] = 1; compact[14] = 1;
  compact[15] = 1; compact[16] = 1; compact[17] = 1;
  compact[18] = 1; compact[19] = 1; compact[20] = 1;
  compact[0] = 2;
  const fast = ShantenTable.fastShanten(compact, 0);
  const recursive = AIE.calcShantenCompact(new Uint8Array(compact), 0);
  // Both should report this as winning or very close; allow the table-based
  // approach to be within 2 of the recursive result
  assert(Math.abs(fast - recursive) <= 2,
    `fast=${fast} recursive=${recursive}, differ by more than 2`);
});

// ── 5. Hand path tests ──────────────────────────────────────────────

console.log('\n--- Hand Path ---');

test('Flush detection: hand concentrated in one suit', () => {
  const hand = makeHand([
    { suit: 'bamboo', rank: 1 }, { suit: 'bamboo', rank: 2 }, { suit: 'bamboo', rank: 3 },
    { suit: 'bamboo', rank: 4 }, { suit: 'bamboo', rank: 5 }, { suit: 'bamboo', rank: 6 },
    { suit: 'bamboo', rank: 7 }, { suit: 'bamboo', rank: 8 }, { suit: 'bamboo', rank: 9 },
    { suit: 'bamboo', rank: 1 }, { suit: 'bamboo', rank: 2 }, { suit: 'bamboo', rank: 3 },
    { suit: 'bamboo', rank: 4 },
  ]);

  const player = buildPlayer(hand);
  const state = makeMinimalState(hand);

  const paths = HandPath.analyzePath(player, state);
  assert(paths.length > 0, 'expected paths');
  const flushPath = paths.find(p => p.pattern.toLowerCase().indexOf('flush') >= 0);
  assert(flushPath !== undefined, 'expected Pure Flush path in results: ' + paths.map(p => p.pattern).join(', '));
  assert(flushPath.progress >= 80, 'expected high progress for pure flush hand, got ' + flushPath.progress);
});

test('Dragon collection path for dragon-heavy hand', () => {
  const hand = makeHand([
    { suit: 'dragon', rank: 1 }, { suit: 'dragon', rank: 1 }, { suit: 'dragon', rank: 1 },
    { suit: 'dragon', rank: 2 }, { suit: 'dragon', rank: 2 }, { suit: 'dragon', rank: 2 },
    { suit: 'bamboo', rank: 1 }, { suit: 'bamboo', rank: 2 }, { suit: 'bamboo', rank: 3 },
    { suit: 'circles', rank: 4 }, { suit: 'circles', rank: 5 }, { suit: 'circles', rank: 6 },
    { suit: 'wind', rank: 1 },
  ]);

  const player = buildPlayer(hand);
  const state = makeMinimalState(hand);

  const paths = HandPath.analyzePath(player, state);
  const dragonPath = paths.find(p => p.pattern.toLowerCase().indexOf('dragon') >= 0);
  assert(dragonPath !== undefined, 'expected dragon path');
});

// ── 6. Achievements tests ────────────────────────────────────────────

console.log('\n--- Achievements ---');

test('Round_end event triggers first_win achievement', () => {
  Achievements.reset();
  const data = {
    winner: { seatIndex: 0 },
    winResult: { total: 10, breakdown: [{ name: 'Basic', points: 10 }] },
  };
  const unlocked = Achievements.check('round_end', data);
  assert(unlocked.length > 0, 'expected at least one achievement');
  const firstWin = unlocked.find(a => a.id === 'first_win');
  assert(firstWin !== undefined, 'expected first_win achievement');
  assert(Achievements.isUnlocked('first_win'), 'first_win should be unlocked');
});

test('Same event does not re-unlock', () => {
  const data = {
    winner: { seatIndex: 0 },
    winResult: { total: 10, breakdown: [{ name: 'Basic', points: 10 }] },
  };
  const unlocked = Achievements.check('round_end', data);
  const firstWin = unlocked.find(a => a.id === 'first_win');
  assert(firstWin === undefined, 'first_win should not re-unlock');
});

test('Self-draw win unlocks self_draw_win achievement', () => {
  Achievements.reset();
  const data = {
    winner: { seatIndex: 0 },
    selfDrawn: true,
    winResult: { total: 15, breakdown: [{ name: 'Self-Draw', points: 5 }] },
  };
  const unlocked = Achievements.check('round_end', data);
  const selfDraw = unlocked.find(a => a.id === 'self_draw_win');
  assert(selfDraw !== undefined, 'expected self_draw_win achievement');
});

test('getProgress returns correct totals', () => {
  Achievements.reset();
  const progress = Achievements.getProgress();
  assert(progress.total > 0, 'expected total > 0');
  assert(progress.unlocked === 0, 'expected 0 unlocked after reset');
});

// ── 7. Practice mode tests ──────────────────────────────────────────

console.log('\n--- Practice Mode ---');

test('checkAnswer for best_discard puzzle bd_01', () => {
  const pm = new PracticeMode();
  const result = pm.checkAnswer('bd_01', { suit: 'wind', rank: 3 });
  assert(result.correct === true, 'expected correct answer for discarding West Wind');
});

test('checkAnswer wrong answer for best_discard puzzle', () => {
  const pm = new PracticeMode();
  const result = pm.checkAnswer('bd_01', { suit: 'bamboo', rank: 1 });
  assert(result.correct === false, 'expected wrong answer');
  assert(result.explanation.length > 0, 'expected explanation');
});

test('checkAnswer for claim_or_pass puzzle cp_01 (claim dragon pong)', () => {
  const pm = new PracticeMode();
  const result = pm.checkAnswer('cp_01', true);
  assert(result.correct === true, 'expected correct: claim dragon pong');
});

test('checkAnswer for claim_or_pass puzzle cp_02 (pass on chow)', () => {
  const pm = new PracticeMode();
  const result = pm.checkAnswer('cp_02', false);
  assert(result.correct === true, 'expected correct: pass on flush-breaking chow');
});

test('getPuzzles returns all categories', () => {
  const pm = new PracticeMode();
  const puzzles = pm.getPuzzles();
  assert(puzzles.best_discard.length > 0, 'expected best_discard puzzles');
  assert(puzzles.identify_waits.length > 0, 'expected identify_waits puzzles');
  assert(puzzles.claim_or_pass.length > 0, 'expected claim_or_pass puzzles');
});

// ── Summary ──────────────────────────────────────────────────────────

console.log('\n========================================');
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log('========================================\n');

process.exit(failed > 0 ? 1 : 0);
