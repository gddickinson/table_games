// Pure helpers for the Card lab. Every ranking and strategy decision is made by the game's own code, passed in as `MJ`
// (window.MJ in the browser, the same scripts loaded by the node test): MJ.Poker.Cards / HandEval and
// MJ.Blackjack.Cards / AI. This module only converts between short codes ("AS", "10H") and the game's Card objects
// and lays out the strategy chart.

export const SUITS = [['spades', 'S', '♠'], ['hearts', 'H', '♥'], ['diamonds', 'D', '♦'], ['clubs', 'C', '♣']];
export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
export const UPCARDS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'A'];

const SUIT_OF = Object.fromEntries(SUITS.map(([name, letter]) => [letter, name]));
const LETTER_OF = Object.fromEntries(SUITS.map(([name, letter]) => [name, letter]));
const SYMBOL_OF = Object.fromEntries(SUITS.map(([name, , sym]) => [name, sym]));

// "AS" -> the game's Card('spades', 'A'); "10H" -> Card('hearts', '10').
export function card(MJ, code) {
  const m = /^(10|[2-9JQKA])([SHDC])$/.exec(String(code).toUpperCase());
  if (!m) throw new Error('bad card code ' + code);
  return new MJ.Poker.Cards.Card(SUIT_OF[m[2]], m[1]);
}
export const code = c => c.rank + LETTER_OF[c.suit];
export const label = c => c.rank + SYMBOL_OF[c.suit];
export const isRed = c => c.suit === 'hearts' || c.suit === 'diamonds';
export const fullDeck = () => SUITS.flatMap(([, s]) => RANKS.map(r => r + s));

// Best five-card poker hand from 5-7 codes (null below 5), with the codes of the five cards it uses.
export function pokerHand(MJ, codes) {
  if (codes.length < 5) return null;
  const r = MJ.Poker.HandEval.evaluateHand(codes.map(c => card(MJ, c)));
  return { rank: r.rank, name: r.name, value: r.value, best: r.bestFive.map(code) };
}

// Unseen cards that would raise the hand's category, from the game's getOuts (5 or 6 known cards).
export function pokerOuts(MJ, codes) {
  if (codes.length < 5 || codes.length > 6) return null;
  const cs = codes.map(c => card(MJ, c));
  return MJ.Poker.HandEval.getOuts(cs.slice(0, 2), cs.slice(2));
}

// A two- or three-card hand of rank strings that reaches each chart row (the AI only looks at ranks).
export function rowHand(kind, key) {
  if (kind === 'pair') return [key, key];
  if (kind === 'soft') return ['A', String(key - 11)];
  if (key <= 11) return ['2', String(key - 2)];                    // hard 5..11: 2+3 ... 2+9
  if (key === 20) return ['K', 'Q'];                                // 10+10 would be a pair
  if (key === 21) return ['10', '9', '2'];                          // hard 21 needs three cards
  return ['10', String(key - 10)];                                  // hard 12..19
}

// The Blackjack AI's basic-strategy action for player ranks against a dealer upcard rank, plus the hand value.
export function bjAction(MJ, ranks, up) {
  const cards = ranks.map(r => new MJ.Poker.Cards.Card('spades', r));
  const hv = MJ.Blackjack.Cards.calculateHandValue(cards);
  const action = MJ.Blackjack.AI.lookupBasicStrategy({ cards }, new MJ.Poker.Cards.Card('hearts', up));
  return { action, value: hv.value, soft: hv.soft };
}

// The full chart as the game's lookupBasicStrategy answers it: hard 5-21, soft 13-21, pairs 2-10 and A.
export function strategyChart(MJ) {
  const rows = [];
  for (let t = 5; t <= 21; t++) rows.push({ kind: 'hard', key: t, label: 'Hard ' + t });
  for (let t = 13; t <= 21; t++) rows.push({ kind: 'soft', key: t, label: `Soft ${t} (A,${t - 11})` });
  for (const r of ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'A']) rows.push({ kind: 'pair', key: r, label: `Pair ${r},${r}` });
  return rows.map(row => ({ ...row, hand: rowHand(row.kind, row.key),
    actions: UPCARDS.map(up => bjAction(MJ, rowHand(row.kind, row.key), up).action) }));
}

// Legend for the action codes, from the comment above the tables in js/blackjack/blackjack-ai.js.
export const ACTIONS = { H: 'hit', S: 'stand', D: 'double (hit if not allowed)', Dh: 'double (stand if not allowed)', P: 'split' };
