// Node test for the Card lab: loads the game's real scripts (js/poker/cards.js, hand-eval.js,
// js/blackjack/blackjack-cards.js, blackjack-ai.js) the way js/test-modules.js does, then checks lab_logic.js and the
// game's answers against hand-worked cases. Run: node web/static/lab_logic.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { LAB_SCRIPTS } from './game_scripts.js';
import * as L from './lab_logic.js';

const JS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../js');
globalThis.window = globalThis;
const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
for (const s of LAB_SCRIPTS) new Function(readFileSync(path.join(JS, s), 'utf8'))();
const MJ = globalThis.MJ;
let n = 0;
const t = (name, fn) => { fn(); n++; };

t('card codes round-trip', () => {
  assert.equal(L.fullDeck().length, 52);
  for (const c of L.fullDeck()) assert.equal(L.code(L.card(MJ, c)), c);
  assert.equal(L.card(MJ, '10h').value, 10);
  assert.throws(() => L.card(MJ, '1S'));
});

t('poker categories (hand-worked)', () => {
  const h = cs => L.pokerHand(MJ, cs.split(' '));
  const royal = h('AS KS QS JS 10S 2H 3D');
  assert.equal(royal.name, 'Royal Flush');
  assert.deepEqual(royal.best, ['AS', 'KS', 'QS', 'JS', '10S']);
  assert.equal(h('AH 2D 3C 4S 5H 9D KC').name, 'Straight');                 // wheel A-2-3-4-5
  assert.ok(h('2H 3D 4C 5S 6H 9D KC').value > h('AH 2D 3C 4S 5H 9D KC').value); // 6-high beats the wheel
  const tp = h('KH KD 7S 7C 2H 2D AS');
  assert.equal(tp.name, 'Two Pair');
  assert.deepEqual(tp.best.map(c => c.slice(0, -1)).sort(), ['7', '7', 'A', 'K', 'K']); // best two pairs + ace kicker
  assert.equal(h('9H 9D 9S 4C 4H').name, 'Full House');
  assert.equal(h('2C 2D 2H 2S 7D').name, 'Four of a Kind');
  assert.ok(h('2H 5H 8H JH KH').value > h('9C 10D JH QS KC').value);       // flush beats straight
  assert.ok(h('AH AD KC 7S 3D').value > h('AS AC QC 7D 3H').value);         // pair of aces, K kicker beats Q kicker
  assert.equal(h('AH KD 9C 7S 3D').name, 'High Card');
  assert.equal(L.pokerHand(MJ, ['AS', 'KS']), null);
});

t('outs (hand-counted)', () => {
  // AH KH 2H 7H 9C: 15 cards pair a rank (3 left of each of A, K, 2, 7, 9), 9 hearts left make a flush, and 9H is
  // in both sets: 15 + 9 - 1 = 23 unseen cards improve the hand.
  const o = L.pokerOuts(MJ, 'AH KH 2H 7H 9C'.split(' '));
  assert.equal(o.outs, 23);
  assert.deepEqual([...o.draws].sort(), ['Flush', 'Pair']);
  assert.equal(L.pokerOuts(MJ, 'AH KH 2H 7H 9C 3D 4S'.split(' ')), null);
});

t('blackjack values and basic strategy (from the tables in blackjack-ai.js)', () => {
  const a = (r, up) => L.bjAction(MJ, r, up);
  assert.deepEqual(a(['A', 'A'], '6'), { action: 'P', value: 12, soft: true });
  assert.equal(a(['10', '6'], '10').action, 'H');
  assert.equal(a(['10', '2'], '4').action, 'S');
  assert.equal(a(['2', '9'], 'A').action, 'D');
  assert.equal(a(['A', '7'], '9').action, 'H');
  assert.equal(a(['A', '7'], '3').action, 'Dh');
  assert.equal(a(['8', '8'], 'A').action, 'P');
  assert.equal(a(['9', '9'], '7').action, 'S');
  assert.equal(a(['5', '5'], '9').action, 'D');
  assert.equal(a(['K', 'Q'], '6').action, 'S');
  assert.deepEqual(a(['10', '9', '2'], '5'), { action: 'S', value: 21, soft: false });
  assert.equal(a(['10', '6'], 'K').action, 'H');                            // face upcards count as 10
});

t('chart rows reproduce the strategy tables exactly', () => {
  const chart = L.strategyChart(MJ);
  assert.equal(chart.length, 17 + 9 + 10);
  const AI = MJ.Blackjack.AI;
  for (const row of chart) {
    const table = { hard: AI.HARD_STRATEGY, soft: AI.SOFT_STRATEGY, pair: AI.PAIR_STRATEGY }[row.kind][row.key];
    assert.deepEqual(row.actions, L.UPCARDS.map(u => table[u]), row.label);
    const v = L.bjAction(MJ, row.hand, '2');
    if (row.kind === 'hard') assert.deepEqual([v.value, v.soft], [row.key, false], row.label);
    if (row.kind === 'soft') assert.deepEqual([v.value, v.soft], [row.key, true], row.label);
  }
});

console.log(`lab_logic: ${n} groups passed`);
