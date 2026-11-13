// Card lab: the game's own poker hand evaluator and Blackjack basic-strategy AI, loaded from game/js/ and driven here.
import { route, app, esc, list, $, $$ } from './core.js';
import { gameMJ } from './game_scripts.js';
import * as L from './lab_logic.js';

const SAMPLE = ['AS', 'KS', 'QS', 'JS', '10S', '2H', '3D'];
const CELL = { H: '#3b1820', S: '#163a26', D: '#3d3412', Dh: '#3d3412', P: '#152f4a' };
const norm = r => (r === 'J' || r === 'Q' || r === 'K' ? '10' : r);
const opts = sel => list(L.RANKS, r => `<option${r === sel ? ' selected' : ''}>${r}</option>`);

route('lab', async () => {
  const MJ = await gameMJ();
  app().innerHTML = `
  <p class="kicker">Card lab</p>
  <h1>The game's own evaluators</h1>
  <p class="lead">These tools call the functions the game itself uses: <code>MJ.Poker.HandEval</code> from
  <code>js/poker/hand-eval.js</code> and <code>MJ.Blackjack.AI.lookupBasicStrategy</code> from
  <code>js/blackjack/blackjack-ai.js</code>, loaded unchanged from the game.</p>

  <h2>Poker hand ranker</h2>
  <div class="panel">
    <p class="small mute">Pick up to 7 cards (the first two are your hole cards). <code>evaluateHand</code> tries every
    5-card combination and keeps the best; with 5 or 6 cards, <code>getOuts</code> counts the unseen cards that would lift
    the hand to a better category.</p>
    <div class="hand" id="hand" aria-live="polite"></div>
    <div class="result" id="res"></div><p class="small" id="outs"></p>
    <button id="deal">Deal 7 at random</button><button class="alt" id="clear">Clear</button>
    <div class="picker" id="picker" role="group" aria-label="Choose cards">${list(L.SUITS, ([name, s, sym]) => list(L.RANKS, r =>
      `<button class="pc ${name === 'hearts' || name === 'diamonds' ? 'red' : ''}" data-c="${r + s}" aria-pressed="false"
        aria-label="${r} of ${name}">${r}${sym}</button>`))}</div>
  </div>

  <h2>Blackjack basic strategy</h2>
  <div class="panel">
    <div class="row">
      <div><label for="c1">Your first card</label><select id="c1">${opts('10')}</select></div>
      <div><label for="c2">Your second card</label><select id="c2">${opts('6')}</select></div>
      <div><label for="up">Dealer upcard</label><select id="up">${opts('10')}</select></div>
    </div>
    <div class="result" id="bj"></div>
    <p class="small mute">Mei plays this chart exactly; Kenji and Yuki deviate from it by personality (15% and 5% of
    decisions, Yuki also reluctant to double or split) and by what they have learned (<code>PERSONALITY</code> in the same file).</p>
    <div class="legend small">${list(Object.entries(L.ACTIONS), ([k, v]) =>
      `<span><i style="background:${CELL[k]}"></i><b>${k}</b> ${esc(v)}</span>`)}</div>
    <div class="scroll"><table class="strat" id="chart"></table></div>
  </div>`;

  let hand = SAMPLE.slice();
  const draw = () => {
    const ev = L.pokerHand(MJ, hand), outs = L.pokerOuts(MJ, hand);
    const best = new Set(ev ? ev.best : []);
    $('#hand').innerHTML = list(hand, c => {
      const k = L.card(MJ, c);
      return `<span class="pcard ${L.isRed(k) ? 'red' : ''} ${best.has(c) ? 'best' : ''}">${esc(L.label(k))}</span>`;
    }) + list(Array(7 - hand.length).fill(0), () => '<span class="pcard slot" aria-hidden="true"></span>');
    $('#res').textContent = ev ? ev.name : `Pick ${5 - hand.length} more card${hand.length === 4 ? '' : 's'}`;
    $('#outs').textContent = outs ? `${outs.outs} unseen card${outs.outs === 1 ? '' : 's'} would improve it`
      + (outs.draws.length ? ` (to ${outs.draws.join(', ')})` : '') + '.' : '';
    $$('#picker .pc').forEach(b => {
      const on = hand.includes(b.dataset.c);
      b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); b.disabled = !on && hand.length >= 7;
    });
  };
  $('#picker').addEventListener('click', e => {
    const c = e.target.closest('.pc')?.dataset.c;
    if (!c) return;
    hand = hand.includes(c) ? hand.filter(x => x !== c) : hand.length < 7 ? [...hand, c] : hand;
    draw();
  });
  $('#deal').onclick = () => {
    const deck = L.fullDeck();
    for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
    hand = deck.slice(0, 7); draw();
  };
  $('#clear').onclick = () => { hand = []; draw(); };
  draw();

  const chart = L.strategyChart(MJ);
  const bj = () => {
    const ranks = [$('#c1').value, $('#c2').value], up = $('#up').value;
    const r = L.bjAction(MJ, ranks, up);
    const pair = ranks[0] === ranks[1];
    $('#bj').textContent = `${r.soft ? 'Soft' : 'Hard'} ${r.value}${pair ? ' (a pair)' : ''} against ${up}: `
      + `${r.action}, ${L.ACTIONS[r.action] || r.action}`;
    const row = pair ? `pair:${norm(ranks[0])}` : `${r.soft ? 'soft' : 'hard'}:${r.value}`;
    $('#chart').innerHTML = `<thead><tr><th scope="col">You / dealer</th>${list(L.UPCARDS, u => `<th scope="col">${u}</th>`)}</tr></thead>
      <tbody>${list(chart, x => `<tr><th scope="row">${esc(x.label)}</th>${list(x.actions, (a, i) =>
        `<td class="${a}${`${x.kind}:${x.key}` === row && L.UPCARDS[i] === norm(up) ? ' hit' : ''}">${a}</td>`)}</tr>`)}</tbody>`;
  };
  ['#c1', '#c2', '#up'].forEach(s => $(s).addEventListener('change', bj));
  bj();
});
