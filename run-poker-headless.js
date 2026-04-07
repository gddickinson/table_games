#!/usr/bin/env node
/**
 * run-poker-headless.js — Realistic poker simulation with proper betting rounds
 *
 * Usage:
 *   node run-poker-headless.js 100                    # 100 hands, AI only
 *   node run-poker-headless.js 50 --verbose           # verbose output
 *   node run-poker-headless.js 50 --claude 0          # Claude plays seat 0
 *   node run-poker-headless.js 200 --claude 0 --strategy aggressive
 */

global.window = global; global.MJ = {};
global.document = { readyState:'complete', addEventListener:()=>{}, getElementById:()=>null, body:{},
  createElement:()=>({className:'',classList:{add(){},remove(){},toggle(){},contains(){return false}},appendChild(){},addEventListener(){},dataset:{},style:{},innerHTML:'',textContent:'',querySelectorAll(){return[]},querySelector(){return null},outerHTML:'',title:''}),
  querySelector:()=>null, querySelectorAll:()=>[] };
global.localStorage = {_d:{},getItem(k){return this._d[k]||null},setItem(k,v){this._d[k]=v}};

require('./js/poker/cards.js');
require('./js/poker/hand-eval.js');
require('./js/game-theory.js');
require('./js/poker/poker-ai-v2.js');
require('./js/poker/poker-learning.js');

const args = process.argv.slice(2);
function getArg(name, def) {
  const idx = args.indexOf('--' + name);
  if (idx >= 0 && idx + 1 < args.length) return args[idx + 1];
  return args.includes('--' + name) ? true : def;
}

const numHands = parseInt(args.find(a => !a.startsWith('-')) || '50');
const verbose = getArg('verbose', false);
const claudeSeat = parseInt(getArg('claude', '-1'));
const claudeStrategy = getArg('strategy', 'balanced');

const Cards = MJ.Poker.Cards;
const HE = MJ.Poker.HandEval;
const AIv2 = MJ.Poker.AIv2;
const Learning = MJ.Poker.Learning;

const ai = new AIv2.PokerAIv2();
const learning = new Learning.PokerLearningSystem();

// Claude player: uses AI but with configurable strategy overlay
function claudeDecide(player, state, strategy) {
  // Claude uses the AI engine but with strategy-modified profile
  const stratProfiles = {
    aggressive: 'kenji',
    balanced: 'yuki',
    defensive: 'mei',
    tight: 'mei',
    loose: 'kenji'
  };
  return ai.decideAction(player, state, stratProfiles[strategy] || 'yuki');
}

/**
 * Run a full betting round with proper re-raising
 * Returns when all active players have acted and bets are equalized
 */
// Bluff tracking per hand
const handBluffData = { attempts: [], outcomes: [] };

function bettingRound(players, community, phase, pot, bb, dealerIdx) {
  const activePlayers = players.filter(p => !p.folded && !p.allIn);
  if (activePlayers.length <= 1) return pot;

  let currentBet = 0;
  let lastRaiser = -1;
  let actionsThisRound = 0;
  const hasActed = new Set();
  const maxIterations = players.length * 4; // prevent infinite loops
  let iterations = 0;
  let minRaise = bb; // Improvement 4: minimum raise size starts at big blind

  // Pre-flop: start after big blind, current bet = bb
  let startIdx;
  if (phase === 'pre_flop') {
    currentBet = bb;
    startIdx = (dealerIdx + 3) % players.length; // UTG
    // Blinds already posted — mark SB and BB as having bet
    const sbIdx = (dealerIdx + 1) % players.length;
    const bbIdx = (dealerIdx + 2) % players.length;
    players[sbIdx].bet = Math.min(bb / 2, players[sbIdx].chips);
    players[bbIdx].bet = Math.min(bb, players[bbIdx].chips);
  } else {
    startIdx = (dealerIdx + 1) % players.length;
  }

  let currentIdx = startIdx;

  while (iterations < maxIterations) {
    iterations++;
    const player = players[currentIdx];

    if (player.folded || player.allIn) {
      currentIdx = (currentIdx + 1) % players.length;
      if (currentIdx === lastRaiser || (lastRaiser === -1 && hasActed.has(currentIdx))) break;
      continue;
    }

    const callAmount = Math.max(0, currentBet - player.bet);

    // Check if betting round is complete
    if (hasActed.has(currentIdx) && callAmount === 0) break;
    if (currentIdx === lastRaiser && hasActed.size > 0) break;

    const state = {
      phase, communityCards: community, currentBet, pot,
      players: players.map(p => ({ id: p.id, folded: p.folded, allIn: p.allIn })),
      dealerIndex: dealerIdx, bigBlind: bb, currentPlayerIndex: currentIdx
    };

    let decision;
    if (currentIdx === claudeSeat) {
      decision = claudeDecide(player, state, claudeStrategy);
    } else {
      decision = ai.decideAction(player, state, player.personality);
    }

    ai.recordAction(player.id, decision.type, phase);
    hasActed.add(currentIdx);

    // Bluff detection: if raising/betting with a weak hand, it's a bluff
    if ((decision.type === 'raise' || decision.type === 'allin') && community.length >= 3) {
      const hand = HE.getBestHand(player.cards, community);
      const handRank = hand ? hand.rank : 0;
      // Bluff = betting with pair or worse (rank <= 1) when there's a bet to face, or betting into opponents with nothing
      if (handRank <= 1) {
        handBluffData.attempts.push({ playerId: player.id, phase, handRank });
      }
    }

    if (decision.type === 'fold') {
      player.folded = true;
      // Check if only one player left
      if (players.filter(p => !p.folded).length <= 1) return pot;
    } else if (decision.type === 'check') {
      // No action needed
    } else if (decision.type === 'call') {
      const amt = Math.min(callAmount, player.chips);
      player.chips -= amt;
      player.bet += amt;
      player.totalInvested += amt;
      pot += amt;
      if (player.chips === 0) player.allIn = true;
    } else if (decision.type === 'raise' || decision.type === 'allin') {
      const raiseTotal = decision.type === 'allin' ? player.chips + player.bet : Math.min(decision.amount || currentBet * 2, player.chips + player.bet);
      const raiseAmount = raiseTotal - player.bet;
      const actualRaise = Math.min(raiseAmount, player.chips);

      // Improvement 4: Min-raise enforcement
      const raiseBy = (player.bet + actualRaise) - currentBet;
      if (raiseBy < minRaise && (player.chips - actualRaise) > 0) {
        // Invalid raise (not all-in) — treat as call instead
        const callAmt = Math.min(callAmount, player.chips);
        player.chips -= callAmt;
        player.bet += callAmt;
        player.totalInvested += callAmt;
        pot += callAmt;
        if (player.chips === 0) player.allIn = true;
      } else {
        player.chips -= actualRaise;
        player.bet += actualRaise;
        player.totalInvested += actualRaise;
        pot += actualRaise;
        if (player.bet > currentBet) {
          const raisedBy = player.bet - currentBet;
          minRaise = Math.max(minRaise, raisedBy); // min raise increases
          currentBet = player.bet;
          lastRaiser = currentIdx;
          // Everyone needs to act again
          hasActed.clear();
          hasActed.add(currentIdx);
        }
        if (player.chips === 0) player.allIn = true;
      }
    }

    currentIdx = (currentIdx + 1) % players.length;
  }

  // Reset bets for next round
  for (const p of players) { pot += 0; p.bet = 0; } // bets already in pot

  return pot;
}

// === BLIND LEVELS (Improvement 5) ===
const BLIND_LEVELS = [
  {sb: 5, bb: 10},     // hands 1-30
  {sb: 10, bb: 20},    // hands 31-60
  {sb: 15, bb: 30},    // hands 61-90
  {sb: 25, bb: 50},    // hands 91-120
  {sb: 50, bb: 100},   // hands 121-150
  {sb: 75, bb: 150},   // hands 151-180
  {sb: 100, bb: 200},  // hands 181+
];

function getBlindLevel(handNum) {
  const levelIdx = Math.min(Math.floor(handNum / 30), BLIND_LEVELS.length - 1);
  return BLIND_LEVELS[levelIdx];
}

// === SIDE POTS (Improvement 2) ===
function calculateSidePots(players, totalPot) {
  const allInAmounts = players
    .filter(p => p.allIn && !p.folded)
    .map(p => p.totalInvested)
    .sort((a, b) => a - b);

  if (allInAmounts.length === 0) {
    return [{ amount: totalPot, eligible: players.filter(p => !p.folded).map(p => p.id) }];
  }

  const pots = [];
  let prevLevel = 0;
  const uniqueAmounts = [...new Set(allInAmounts)];

  for (const level of uniqueAmounts) {
    const contribution = level - prevLevel;
    const contributors = players.filter(p => !p.folded && p.totalInvested >= level);
    const potAmount = contribution * contributors.length;
    if (potAmount > 0) {
      // Eligible = non-folded players who invested at least this level
      pots.push({ amount: potAmount, eligible: contributors.map(p => p.id) });
    }
    prevLevel = level;
  }

  // Main pot for remaining chips (players who invested more than max all-in)
  const maxAllIn = uniqueAmounts[uniqueAmounts.length - 1];
  const remainingContributors = players.filter(p => !p.folded && p.totalInvested > maxAllIn);
  if (remainingContributors.length > 0) {
    let remainingAmount = 0;
    for (const p of remainingContributors) {
      remainingAmount += p.totalInvested - maxAllIn;
    }
    if (remainingAmount > 0) {
      pots.push({ amount: remainingAmount, eligible: remainingContributors.map(p => p.id) });
    }
  }

  // Verify pot totals match (adjust rounding)
  const potSum = pots.reduce((s, p) => s + p.amount, 0);
  if (potSum < totalPot && pots.length > 0) {
    pots[pots.length - 1].amount += (totalPot - potSum);
  }

  return pots.length > 0 ? pots : [{ amount: totalPot, eligible: players.filter(p => !p.folded).map(p => p.id) }];
}

function simulateHand(chipStacks, personalities, dealerIdx, blindLevel) {
  const deck = new Cards.Deck();
  deck.shuffle();
  const bb = blindLevel.bb, sb = blindLevel.sb;

  const players = personalities.map((p, i) => ({
    id: i, name: p, cards: [deck.cards.shift(), deck.cards.shift()],
    chips: chipStacks[i], bet: 0, folded: false, allIn: false, personality: p,
    totalInvested: 0 // track total invested for side pots
  }));

  let pot = 0;

  // Post blinds
  const sbIdx = (dealerIdx + 1) % 4;
  const bbIdx = (dealerIdx + 2) % 4;
  const sbAmt = Math.min(sb, players[sbIdx].chips);
  const bbAmt = Math.min(bb, players[bbIdx].chips);
  players[sbIdx].chips -= sbAmt; pot += sbAmt; players[sbIdx].totalInvested += sbAmt;
  players[bbIdx].chips -= bbAmt; pot += bbAmt; players[bbIdx].totalInvested += bbAmt;

  // Pre-flop betting round
  pot = bettingRound(players, [], 'pre_flop', pot, bb, dealerIdx);
  if (players.filter(p => !p.folded).length <= 1) {
    const winner = players.find(p => !p.folded) || players[0];
    winner.chips += pot;
    for (let i = 0; i < players.length; i++) chipStacks[i] = players[i].chips;
    return { winner: winner.name, winnerId: winner.id, hand: 'fold_win', pot, players: players.map(p => ({ name: p.name, chips: p.chips, folded: p.folded })) };
  }

  // Deal community cards
  const community = [];
  deck.cards.shift(); // burn
  community.push(deck.cards.shift(), deck.cards.shift(), deck.cards.shift()); // flop

  // Flop betting
  for (const p of players) p.bet = 0;
  pot = bettingRound(players, community.slice(0, 3), 'flop', pot, bb, dealerIdx);
  if (players.filter(p => !p.folded).length <= 1) {
    const winner = players.find(p => !p.folded) || players[0];
    winner.chips += pot;
    for (let i = 0; i < players.length; i++) chipStacks[i] = players[i].chips;
    return { winner: winner.name, winnerId: winner.id, hand: 'fold_win', pot, players: players.map(p => ({ name: p.name, chips: p.chips, folded: p.folded })) };
  }

  // Turn
  deck.cards.shift(); community.push(deck.cards.shift());
  for (const p of players) p.bet = 0;
  pot = bettingRound(players, community.slice(0, 4), 'turn', pot, bb, dealerIdx);
  if (players.filter(p => !p.folded).length <= 1) {
    const winner = players.find(p => !p.folded) || players[0];
    winner.chips += pot;
    for (let i = 0; i < players.length; i++) chipStacks[i] = players[i].chips;
    return { winner: winner.name, winnerId: winner.id, hand: 'fold_win', pot, players: players.map(p => ({ name: p.name, chips: p.chips, folded: p.folded })) };
  }

  // River
  deck.cards.shift(); community.push(deck.cards.shift());
  for (const p of players) p.bet = 0;
  pot = bettingRound(players, community, 'river', pot, bb, dealerIdx);

  // Showdown with side pots (Improvement 2)
  const active = players.filter(p => !p.folded);
  let overallWinner = active[0] || players[0];
  let winnerHand = null;

  if (active.length > 1) {
    // Evaluate all hands
    const hands = {};
    for (const p of active) {
      hands[p.id] = HE.getBestHand(p.cards, community);
    }

    // Calculate and award side pots
    const sidePots = calculateSidePots(players, pot);
    for (const sidePot of sidePots) {
      let bestHand = null;
      let potWinner = null;
      for (const eligibleId of sidePot.eligible) {
        const p = players[eligibleId];
        if (p.folded) continue;
        const hand = hands[p.id];
        if (!bestHand || (hand && hand.value > bestHand.value)) {
          bestHand = hand;
          potWinner = p;
        }
      }
      if (potWinner) {
        potWinner.chips += sidePot.amount;
        if (!winnerHand || (bestHand && bestHand.value > winnerHand.value)) {
          winnerHand = bestHand;
          overallWinner = potWinner;
        }
      }
    }
  } else {
    if (overallWinner && overallWinner.cards) {
      winnerHand = HE.getBestHand(overallWinner.cards, community);
    }
    overallWinner.chips += pot;
  }

  // Write back chip stacks (Improvement 1: persistent stacks)
  for (let i = 0; i < players.length; i++) {
    chipStacks[i] = players[i].chips;
  }

  return {
    winner: overallWinner.name, winnerId: overallWinner.id,
    hand: winnerHand ? winnerHand.name : 'fold_win',
    pot, showdown: active.length > 1,
    players: players.map(p => ({ name: p.name, chips: p.chips, folded: p.folded }))
  };
}

// === RUN TOURNAMENT ===
const profiles = claudeSeat >= 0
  ? ['claude', 'mei', 'kenji', 'yuki'].map((p, i) => i === claudeSeat ? 'claude' : p === 'claude' ? 'default' : p)
  : ['mei', 'kenji', 'yuki', 'default'];

console.log(`\nPoker Tournament: ${numHands} hands`);
if (claudeSeat >= 0) console.log(`Claude at seat ${claudeSeat} (${claudeStrategy})`);
console.log(`Blinds: escalating (5/10 → 100/200) | Starting chips: 1000\n`);

// Improvement 1: Persistent chip stacks
const stacks = [1000, 1000, 1000, 1000];
const stats = {};
for (const p of profiles) stats[p] = { wins: 0, folds: 0, showdowns: 0, showdownWins: 0, bigPots: 0, foldWins: 0, totalProfit: 0 };
const handTypes = {};
let biggestPot = 0, biggestHand = '';

for (let h = 0; h < numHands; h++) {
  ai.startNewHand();
  const dealerIdx = h % 4;

  // Improvement 1: Rebuy busted players
  for (let i = 0; i < stacks.length; i++) {
    if (stacks[i] <= 0) stacks[i] = 1000;
  }

  // Improvement 5: Get blind level for this hand
  const blindLevel = getBlindLevel(h);

  // Reset bluff tracking for this hand
  handBluffData.attempts = [];

  const result = simulateHand(stacks, profiles, dealerIdx, blindLevel);

  stats[result.winner].wins++;
  handTypes[result.hand] = (handTypes[result.hand] || 0) + 1;

  if (result.showdown) stats[result.winner].showdownWins++;
  if (!result.showdown) stats[result.winner].foldWins++;
  if (result.pot > 100) stats[result.winner].bigPots++;
  if (result.pot > biggestPot) { biggestPot = result.pot; biggestHand = `${result.hand} by ${result.winner} (${result.pot} chips)`; }

  // Track bluff outcomes
  const bluffedThisHand = handBluffData.attempts.length > 0;
  let bluffSucceeded = false;
  if (bluffedThisHand) {
    // Check if any bluffer won without showdown (successful bluff)
    for (const attempt of handBluffData.attempts) {
      if (attempt.playerId === result.winnerId && !result.showdown) {
        bluffSucceeded = true;
        if (!stats[result.winner].bluffsWon) stats[result.winner].bluffsWon = 0;
        stats[result.winner].bluffsWon++;
      }
      if (!stats[profiles[attempt.playerId]]) continue;
      if (!stats[profiles[attempt.playerId]].bluffAttempts) stats[profiles[attempt.playerId]].bluffAttempts = 0;
      stats[profiles[attempt.playerId]].bluffAttempts++;
    }
  }

  // Improvement 1: profit is now based on persistent stacks
  for (const p of result.players) {
    stats[p.name].totalProfit = p.chips - 1000;
  }

  const targetSeat = claudeSeat >= 0 ? claudeSeat : 0;
  const targetBluffed = handBluffData.attempts.some(a => a.playerId === targetSeat);
  const targetBluffWon = targetBluffed && result.winnerId === targetSeat && !result.showdown;

  learning.recordHandResult({
    won: result.winnerId === targetSeat,
    profit: result.players[targetSeat].chips - 1000,
    bluffAttempted: targetBluffed,
    bluffSucceeded: targetBluffWon,
    wentToShowdown: result.showdown,
    showdownWon: result.winnerId === targetSeat && result.showdown
  });

  if (verbose && h < 10) {
    const cards = result.players.map((p, i) => p.name).join(' vs ');
    console.log(`  Hand ${h + 1}: ${result.winner} wins ${result.pot} with ${result.hand}${result.showdown ? ' (showdown)' : ' (folds)'}`);
  }

  if ((h + 1) % Math.max(1, Math.floor(numHands / 5)) === 0) {
    process.stdout.write(`  Progress: ${((h + 1) / numHands * 100).toFixed(0)}%\r`);
  }
}
console.log('');

const learnResult = learning.updateWeights();

// Results
console.log('╔══════════════════════════════════════════════════════╗');
console.log('║  RESULTS                                             ║');
console.log('╚══════════════════════════════════════════════════════╝');
console.log('');
console.log('┌──────────┬──────┬───────┬─────────┬──────────┬──────────┬────────┐');
console.log('│ Player   │ Wins │ Win%  │ Profit  │ Showdown │ FoldWins │ BigPot │');
console.log('├──────────┼──────┼───────┼─────────┼──────────┼──────────┼────────┤');
for (const p of profiles) {
  const s = stats[p];
  const wr = (s.wins / numHands * 100).toFixed(1);
  const prof = s.totalProfit >= 0 ? '+' + s.totalProfit : String(s.totalProfit);
  console.log(`│ ${p.padEnd(8)} │ ${String(s.wins).padStart(4)} │ ${wr.padStart(5)}%│ ${prof.padStart(7)} │ ${String(s.showdownWins).padStart(8)} │ ${String(s.foldWins).padStart(8)} │ ${String(s.bigPots).padStart(6)} │`);
}
console.log('└──────────┴──────┴───────┴─────────┴──────────┴──────────┴────────┘');

console.log('\nHand Distribution:');
Object.entries(handTypes).sort((a, b) => b[1] - a[1]).forEach(([h, c]) => {
  console.log(`  ${h.padEnd(18)} ${String(c).padStart(4)}  ${'█'.repeat(Math.round(c * 40 / numHands))}`);
});

console.log(`\nBiggest pot: ${biggestHand}`);
const showdownRate = Object.values(stats).reduce((s, v) => s + v.showdownWins, 0) / numHands * 100;
const foldWinRate = Object.values(stats).reduce((s, v) => s + v.foldWins, 0) / numHands * 100;
console.log(`Showdown rate: ${showdownRate.toFixed(1)}% | Fold-win rate: ${foldWinRate.toFixed(1)}%`);

// Bluff analysis
console.log('\nBluff Analysis:');
let totalBluffs = 0, totalBluffWins = 0;
for (const p of profiles) {
  const s = stats[p];
  const attempts = s.bluffAttempts || 0;
  const wins = s.bluffsWon || 0;
  const rate = attempts > 0 ? (wins / attempts * 100).toFixed(0) + '%' : 'N/A';
  totalBluffs += attempts;
  totalBluffWins += wins;
  if (attempts > 0) {
    console.log(`  ${p.padEnd(8)}: ${attempts} bluffs, ${wins} succeeded (${rate})`);
  }
}
if (totalBluffs === 0) {
  console.log('  No bluffs detected (all bets were with pair+ hands)');
} else {
  console.log(`  Total: ${totalBluffs} bluffs, ${totalBluffWins} succeeded (${(totalBluffWins/totalBluffs*100).toFixed(0)}%)`);
}

if (learnResult) {
  console.log(`\nLearning: epoch ${learnResult.epoch} | bluff success: ${(learnResult.bluffSuccess * 100).toFixed(0)}% | showdown win: ${(learnResult.showdownWinRate * 100).toFixed(0)}%`);
}

console.log(`\nCompleted ${numHands} hands.`);
