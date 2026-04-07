#!/usr/bin/env node
/**
 * run-poker-test.js — Headless poker test: play hands, report AI quality
 */
global.window = global;
global.MJ = {};
global.document = { readyState:'complete', addEventListener:()=>{}, getElementById:()=>null, body:{},
  createElement:()=>({className:'',classList:{add(){},remove(){},toggle(){},contains(){return false}},appendChild(){},addEventListener(){},dataset:{},style:{},innerHTML:'',textContent:'',querySelectorAll(){return[]},querySelector(){return null},outerHTML:'',title:''}),
  querySelector:()=>null, querySelectorAll:()=>[] };
global.localStorage = {_d:{},getItem(k){return this._d[k]||null},setItem(k,v){this._d[k]=v}};

require('./js/poker/cards.js');
require('./js/poker/hand-eval.js');
require('./js/poker/poker-ai-v2.js');

const Cards = MJ.Poker.Cards;
const HE = MJ.Poker.HandEval;
const AIv2 = MJ.Poker.AIv2;

let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) { pass++; process.stdout.write(`  ✓ ${msg}\n`); }
  else { fail++; process.stdout.write(`  ✗ FAIL: ${msg}\n`); }
}

console.log('\n=== POKER AI v2 TESTS ===\n');

// === Card & Hand Eval Tests ===
console.log('--- Cards & Hand Evaluation ---');
const deck = new Cards.Deck();
assert(deck.cards.length === 52, 'Deck has 52 cards');
deck.shuffle();
const hand5 = deck.cards.slice(0, 5);
const result = HE.evaluateHand(hand5);
assert(result && result.rank >= 0 && result.rank <= 9, `Hand evaluates: ${result.name} (rank ${result.rank})`);

// Royal flush test
const royalFlush = [
  new Cards.Card('hearts', 'A'), new Cards.Card('hearts', 'K'),
  new Cards.Card('hearts', 'Q'), new Cards.Card('hearts', 'J'),
  new Cards.Card('hearts', '10')
];
const rfResult = HE.evaluateHand(royalFlush);
assert(rfResult.rank === 9, `Royal flush detected: ${rfResult.name}`);

// Pair test
const pairHand = [
  new Cards.Card('hearts', 'A'), new Cards.Card('diamonds', 'A'),
  new Cards.Card('clubs', 'K'), new Cards.Card('spades', 'Q'),
  new Cards.Card('hearts', '7')
];
const pairResult = HE.evaluateHand(pairHand);
assert(pairResult.rank === 1, `Pair of Aces detected: ${pairResult.name}`);

// Full house test
const fullHouse = [
  new Cards.Card('hearts', 'K'), new Cards.Card('diamonds', 'K'),
  new Cards.Card('clubs', 'K'), new Cards.Card('spades', '5'),
  new Cards.Card('hearts', '5')
];
const fhResult = HE.evaluateHand(fullHouse);
assert(fhResult.rank === 6, `Full house detected: ${fhResult.name}`);

// 7-card best hand
const sevenCards = [
  new Cards.Card('hearts', 'A'), new Cards.Card('diamonds', 'A'),
  new Cards.Card('clubs', 'A'), new Cards.Card('spades', '5'),
  new Cards.Card('hearts', '5'), new Cards.Card('diamonds', '7'),
  new Cards.Card('clubs', '2')
];
const bestOf7 = HE.getBestHand(sevenCards.slice(0, 2), sevenCards.slice(2));
assert(bestOf7 && bestOf7.rank >= 6, `Best of 7 cards: ${bestOf7.name}`);

// === Pre-flop Equity ===
console.log('\n--- Pre-flop Equity ---');
const aa = [new Cards.Card('hearts', 'A'), new Cards.Card('spades', 'A')];
const eq_aa = AIv2.getPreflopEquity(aa, 3);
assert(eq_aa > 0.6, `AA equity vs 3 opponents: ${(eq_aa*100).toFixed(1)}%`);

const junk = [new Cards.Card('hearts', '2'), new Cards.Card('spades', '7')];
const eq_junk = AIv2.getPreflopEquity(junk, 3);
assert(eq_junk < 0.35, `72o equity vs 3 opponents: ${(eq_junk*100).toFixed(1)}%`);

const aks = [new Cards.Card('hearts', 'A'), new Cards.Card('hearts', 'K')];
const eq_aks = AIv2.getPreflopEquity(aks, 3);
assert(eq_aks > 0.45, `AKs equity vs 3 opponents: ${(eq_aks*100).toFixed(1)}%`);

// === Draw Detection ===
console.log('\n--- Draw Detection ---');
const flushDrawHole = [new Cards.Card('hearts', 'A'), new Cards.Card('hearts', '8')];
const flushDrawBoard = [new Cards.Card('hearts', 'K'), new Cards.Card('hearts', '3'), new Cards.Card('spades', '9')];
const fd = AIv2.detectDraws(flushDrawHole, flushDrawBoard);
assert(fd.flushDraw === true, `Flush draw detected: ${fd.outs} outs`);
assert(fd.outs >= 9, `Flush draw has 9+ outs: ${fd.outs}`);

const noDrawHole = [new Cards.Card('hearts', 'A'), new Cards.Card('diamonds', 'K')];
const noDrawBoard = [new Cards.Card('clubs', '3'), new Cards.Card('spades', '8'), new Cards.Card('hearts', 'J')];
const nd = AIv2.detectDraws(noDrawHole, noDrawBoard);
assert(nd.flushDraw === false, 'No flush draw when suits spread');

// === AI Decision Tests ===
console.log('\n--- AI v2 Decisions ---');
const ai = new AIv2.PokerAIv2();

function makePlayer(id, cards, chips, bet) {
  return { id, name: 'P'+id, cards, chips: chips||1000, bet: bet||0, folded: false, allIn: false };
}
function makeState(phase, community, currentBet, pot, players, dealerIdx) {
  return { phase, communityCards: community||[], currentBet: currentBet||10, pot: pot||30, players, dealerIndex: dealerIdx||0, bigBlind: 10, currentPlayerIndex: 0 };
}

// Pre-flop with AA: should raise
const aaPlayer = makePlayer(0, aa, 1000, 10);
const aaState = makeState('pre_flop', [], 10, 30, [aaPlayer, makePlayer(1,[],1000,10), makePlayer(2,[],1000,10), makePlayer(3,[],1000,10)], 1);
const aaDecision = ai.decideAction(aaPlayer, aaState, 'kenji');
assert(aaDecision.type === 'raise' || aaDecision.type === 'allin', `AA pre-flop (Kenji): ${aaDecision.type} ${aaDecision.amount||''}`);

// Pre-flop with 72o: should fold (Mei is tight)
const junkPlayer = makePlayer(0, junk, 1000, 0);
const junkState = makeState('pre_flop', [], 20, 30, [junkPlayer, makePlayer(1,[],1000), makePlayer(2,[],1000), makePlayer(3,[],1000)], 2);
const junkDecision = ai.decideAction(junkPlayer, junkState, 'mei');
assert(junkDecision.type === 'fold', `72o pre-flop (Mei): ${junkDecision.type}`);

// Post-flop with top pair: should bet (Kenji aggressive)
const topPairCards = [new Cards.Card('hearts', 'A'), new Cards.Card('diamonds', 'K')];
const topPairBoard = [new Cards.Card('spades', 'A'), new Cards.Card('clubs', '8'), new Cards.Card('hearts', '3')];
const tpPlayer = makePlayer(0, topPairCards, 1000, 0);
const tpState = makeState('flop', topPairBoard, 0, 50, [tpPlayer, makePlayer(1,[],1000), makePlayer(2,[],1000)], 1);
const tpDecision = ai.decideAction(tpPlayer, tpState, 'kenji');
assert(tpDecision.type === 'raise' || tpDecision.type === 'call' || tpDecision.type === 'check', `Top pair flop (Kenji): ${tpDecision.type}`);

// Post-flop with nothing facing big bet: should fold (Mei cautious)
const nothingCards = [new Cards.Card('hearts', '2'), new Cards.Card('diamonds', '4')];
const scaryBoard = [new Cards.Card('spades', 'A'), new Cards.Card('clubs', 'K'), new Cards.Card('hearts', 'Q')];
const nPlayer = makePlayer(0, nothingCards, 1000, 0);
const nState = makeState('flop', scaryBoard, 80, 100, [nPlayer, makePlayer(1,[],1000)], 1);
const nDecision = ai.decideAction(nPlayer, nState, 'mei');
assert(nDecision.type === 'fold', `Nothing vs big bet (Mei): ${nDecision.type}`);

// === Simulate Games ===
console.log('\n--- Simulated Hands ---');

function simulateHand(aiProfiles) {
  const d = new Cards.Deck(); d.shuffle();
  const players = aiProfiles.map((p, i) => ({ id: i, name: p, cards: [d.cards.shift(), d.cards.shift()], chips: 1000, bet: 0, folded: false }));
  const community = [d.cards.shift(), d.cards.shift(), d.cards.shift(), d.cards.shift(), d.cards.shift()];

  // Evaluate all hands at showdown
  const results = players.map(p => {
    const best = HE.getBestHand(p.cards, community);
    return { player: p.name, hand: best ? best.name : 'N/A', rank: best ? best.rank : -1, value: best ? best.value : 0,
      cards: p.cards.map(c => Cards.getCardDisplay(c)).join(' ') };
  });

  results.sort((a, b) => b.value - a.value);
  return { winner: results[0], results, community: community.map(c => Cards.getCardDisplay(c)).join(' ') };
}

const personalities = ['mei', 'kenji', 'yuki', 'default'];
const wins = { mei: 0, kenji: 0, yuki: 0, default: 0 };
const handTypes = {};
const numHands = 100;

for (let i = 0; i < numHands; i++) {
  const result = simulateHand(personalities);
  wins[result.winner.player]++;
  handTypes[result.winner.hand] = (handTypes[result.winner.hand] || 0) + 1;
}

console.log(`\n  ${numHands} hands simulated:`);
for (const [name, count] of Object.entries(wins)) {
  console.log(`    ${name}: ${count} wins (${(count/numHands*100).toFixed(0)}%)`);
}
console.log('\n  Winning hand distribution:');
Object.entries(handTypes).sort((a,b) => b[1] - a[1]).forEach(([hand, count]) => {
  console.log(`    ${hand}: ${count}`);
});

// === AI Decision Quality ===
console.log('\n--- AI Decision Quality ---');

let correctFolds = 0, totalFoldSituations = 0;
let correctRaises = 0, totalRaiseSituations = 0;

for (let i = 0; i < 50; i++) {
  const d = new Cards.Deck(); d.shuffle();
  const holeCards = [d.cards.shift(), d.cards.shift()];
  const eq = AIv2.getPreflopEquity(holeCards, 3);
  const player = makePlayer(0, holeCards, 1000, 0);
  const state = makeState('pre_flop', [], 20, 30, [player, makePlayer(1,[],1000), makePlayer(2,[],1000), makePlayer(3,[],1000)], 2);

  // Test with balanced profile (Yuki)
  const decision = ai.decideAction(player, state, 'yuki');

  if (eq < 0.35) {
    totalFoldSituations++;
    if (decision.type === 'fold') correctFolds++;
  }
  if (eq > 0.7) {
    totalRaiseSituations++;
    if (decision.type === 'raise' || decision.type === 'allin') correctRaises++;
  }
}

const foldAccuracy = totalFoldSituations > 0 ? (correctFolds/totalFoldSituations*100).toFixed(0) : 'N/A';
const raiseAccuracy = totalRaiseSituations > 0 ? (correctRaises/totalRaiseSituations*100).toFixed(0) : 'N/A';
console.log(`  Fold accuracy (trash hands): ${foldAccuracy}% (${correctFolds}/${totalFoldSituations})`);
console.log(`  Raise accuracy (premium hands): ${raiseAccuracy}% (${correctRaises}/${totalRaiseSituations})`);
assert(totalFoldSituations === 0 || correctFolds/totalFoldSituations > 0.7, 'Folds trash hands >70% of the time');
assert(totalRaiseSituations === 0 || correctRaises/totalRaiseSituations > 0.7, 'Raises premium hands >70% of the time');

// === Summary ===
console.log(`\n${'═'.repeat(40)}`);
console.log(`Results: ${pass} passed, ${fail} failed`);
if (fail === 0) console.log('All poker tests passed!');
process.exit(fail > 0 ? 1 : 0);
