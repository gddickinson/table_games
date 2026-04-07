#!/usr/bin/env node
/**
 * test-poker.js — Play poker via the game page, test features, take screenshots
 */
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const DIR = path.join(__dirname, 'screenshots-poker');
const URL = 'http://localhost:8083';

async function main() {
  if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
  else fs.readdirSync(DIR).filter(f => f.endsWith('.png')).forEach(f => fs.unlinkSync(path.join(DIR, f)));

  const browser = await puppeteer.launch({ headless: false, defaultViewport: { width: 1400, height: 900 }, args: ['--window-size=1400,900'] });
  const page = await browser.newPage();
  let n = 0;
  const shot = async (label) => { n++; const f = `${String(n).padStart(2,'0')}_${label.replace(/[^a-z0-9]/gi,'_')}.png`; await page.screenshot({path: path.join(DIR, f)}); console.log(`  📸 ${f}`); };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const click = async (sel) => { try { const el = await page.$(sel); if (el) { await el.click(); return true; } } catch(e){} return false; };

  try {
    // 1. Load game
    console.log('\n=== 1. Load game ===');
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await wait(3000);
    // Close tutorial if showing
    try { const skip = await page.$('#tutorial-skip'); if (skip) { const vis = await page.evaluate(e => e.offsetParent !== null, skip); if (vis) await skip.click(); } } catch(e){}
    await wait(1000);
    await shot('01_mahjong_board');

    // 2. Open docs — check poker docs are listed
    console.log('\n=== 2. Check poker docs in viewer ===');
    await click('#btn-docs');
    await wait(1500);
    await shot('02_docs_with_poker');

    // Click poker rulebook
    const menuItems = await page.$$('#doc-menu > div');
    for (const item of menuItems) {
      const text = await page.evaluate(el => el.textContent, item);
      if (text.includes('Poker Rulebook')) {
        await item.click();
        await wait(1500);
        await shot('03_poker_rulebook');
        break;
      }
    }

    // Click poker strategy
    const menuItems2 = await page.$$('#doc-menu > div');
    for (const item of menuItems2) {
      const text = await page.evaluate(el => el.textContent, item);
      if (text.includes('Poker Strategy')) {
        await item.click();
        await wait(1500);
        await shot('04_poker_strategy');
        break;
      }
    }

    // Search for "bluff"
    const docSearch = await page.$('#doc-search');
    if (docSearch) {
      await docSearch.click();
      await docSearch.type('bluff', { delay: 30 });
      await wait(1000);
      await shot('05_docs_search_bluff');
    }
    await click('#doc-close');
    await wait(500);

    // 3. Try to launch poker via game selector or settings
    console.log('\n=== 3. Game selector ===');
    // Check if there's a game selector button
    const hasGameSelector = await page.evaluate(() => {
      // Try to invoke game selector
      if (window.MJ.GameSelector) {
        const gs = new window.MJ.GameSelector.GameSelector();
        return true;
      }
      return false;
    });
    console.log('  Game selector available:', hasGameSelector);

    // Try launching poker engine directly
    console.log('\n=== 4. Launch poker directly ===');
    const pokerAvailable = await page.evaluate(() => {
      return !!(window.MJ.Poker && window.MJ.Poker.Engine && window.MJ.Poker.Cards);
    });
    console.log('  Poker engine available:', pokerAvailable);

    if (pokerAvailable) {
      // Create a poker game overlay
      await page.evaluate(() => {
        const overlay = document.createElement('div');
        overlay.id = 'poker-test';
        overlay.style.cssText = 'position:fixed;inset:0;background:#1a3320;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:sans-serif;color:#e0e0e0;';

        // Create poker engine and play a hand
        const Cards = window.MJ.Poker.Cards;
        const HE = window.MJ.Poker.HandEval;
        const AIv2 = window.MJ.Poker.AIv2;

        // Simulate a poker hand
        const deck = new Cards.Deck();
        deck.shuffle();

        const players = [
          { id: 0, name: 'You', cards: [deck.cards.shift(), deck.cards.shift()], chips: 1000, personality: 'human' },
          { id: 1, name: 'Mei', cards: [deck.cards.shift(), deck.cards.shift()], chips: 1000, personality: 'mei' },
          { id: 2, name: 'Kenji', cards: [deck.cards.shift(), deck.cards.shift()], chips: 1000, personality: 'kenji' },
          { id: 3, name: 'Yuki', cards: [deck.cards.shift(), deck.cards.shift()], chips: 1000, personality: 'yuki' }
        ];

        const community = [];
        for (let i = 0; i < 5; i++) community.push(deck.cards.shift());

        // Build poker table display
        let html = '<div style="max-width:900px;width:100%;padding:20px;">';
        html += '<h1 style="color:#e8b830;text-align:center;margin-bottom:20px;">🃏 Texas Hold\'em Poker</h1>';

        // Community cards
        html += '<div style="text-align:center;margin-bottom:30px;">';
        html += '<div style="font-size:12px;color:#888;margin-bottom:8px;">COMMUNITY CARDS</div>';
        html += '<div style="display:flex;gap:8px;justify-content:center;">';
        for (const card of community) {
          const color = (card.suit === 'hearts' || card.suit === 'diamonds') ? '#e74c3c' : '#ecf0f1';
          const symbol = {hearts:'♥',diamonds:'♦',clubs:'♣',spades:'♠'}[card.suit];
          html += `<div style="width:70px;height:100px;background:#fff;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:${color};font-weight:bold;box-shadow:0 3px 8px rgba(0,0,0,0.3);">`;
          html += `<span style="font-size:24px;">${card.rank}</span>`;
          html += `<span style="font-size:28px;">${symbol}</span>`;
          html += `</div>`;
        }
        html += '</div></div>';

        // Player hands
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">';
        for (const player of players) {
          const hand = HE.getBestHand(player.cards, community);
          const cardStrs = player.cards.map(c => {
            const sym = {hearts:'♥',diamonds:'♦',clubs:'♣',spades:'♠'}[c.suit];
            const col = (c.suit === 'hearts' || c.suit === 'diamonds') ? '#e74c3c' : '#333';
            return `<span style="color:${col};font-size:20px;font-weight:bold;">${c.rank}${sym}</span>`;
          }).join(' ');

          const bgColor = player.id === 0 ? 'rgba(232,184,48,0.15)' : 'rgba(255,255,255,0.05)';
          const border = player.id === 0 ? '2px solid #e8b830' : '1px solid rgba(255,255,255,0.1)';

          html += `<div style="background:${bgColor};border:${border};border-radius:12px;padding:16px;">`;
          html += `<div style="font-size:16px;font-weight:bold;color:#e8b830;margin-bottom:6px;">${player.id === 0 ? '👤' : {mei:'👩',kenji:'👨',yuki:'👵'}[player.personality]} ${player.name}</div>`;
          html += `<div style="margin-bottom:8px;">${cardStrs}</div>`;
          html += `<div style="font-size:14px;color:#4ade80;">${hand ? hand.name : 'N/A'}</div>`;
          html += `<div style="font-size:12px;color:#888;">${player.chips} chips</div>`;
          html += `</div>`;
        }
        html += '</div>';

        // Determine winner
        let bestPlayer = null, bestHand = null;
        for (const player of players) {
          const hand = HE.getBestHand(player.cards, community);
          if (!bestHand || (hand && hand.value > bestHand.value)) {
            bestHand = hand;
            bestPlayer = player;
          }
        }

        html += `<div style="text-align:center;margin-top:20px;padding:16px;background:rgba(74,222,128,0.1);border-radius:12px;border:1px solid #4ade80;">`;
        html += `<div style="font-size:18px;color:#4ade80;font-weight:bold;">Winner: ${bestPlayer.name} with ${bestHand.name}!</div>`;
        html += `</div>`;

        // AI decisions display
        if (AIv2) {
          const ai = new AIv2.PokerAIv2();
          html += '<div style="margin-top:20px;padding:12px;background:rgba(0,0,0,0.3);border-radius:8px;">';
          html += '<div style="font-size:14px;color:#e8b830;margin-bottom:8px;">AI Decision Analysis</div>';
          for (const player of players) {
            if (player.id === 0) continue;
            const state = { phase: 'flop', communityCards: community.slice(0,3), currentBet: 20, pot: 60,
              players: players.map(p => ({id:p.id,folded:false})), dealerIndex: 0, bigBlind: 10, currentPlayerIndex: player.id };
            const decision = ai.decideAction(player, state, player.personality);
            const eq = AIv2.getPreflopEquity(player.cards, 3);
            html += `<div style="font-size:12px;color:#aaa;margin:4px 0;">${player.name}: equity=${(eq*100).toFixed(0)}% → ${decision.type}${decision.amount ? ' $'+decision.amount : ''}</div>`;
          }
          html += '</div>';
        }

        // Poker dialogue
        if (window.MJ.Poker.Dialogue) {
          const D = window.MJ.Poker.Dialogue;
          html += '<div style="margin-top:12px;padding:12px;background:rgba(0,0,0,0.3);border-radius:8px;">';
          html += '<div style="font-size:14px;color:#e8b830;margin-bottom:8px;">Character Chat</div>';
          const pick = arr => arr[Math.floor(Math.random()*arr.length)];
          if (D.mei && D.mei.game_start) html += `<div style="font-size:12px;color:#e8b4d0;margin:2px 0;">👩 Mei: ${pick(D.mei.game_start)}</div>`;
          if (D.kenji && D.kenji.game_start) html += `<div style="font-size:12px;color:#b4c8e8;margin:2px 0;">👨 Kenji: ${pick(D.kenji.game_start)}</div>`;
          if (D.yuki && D.yuki.game_start) html += `<div style="font-size:12px;color:#d4e8b4;margin:2px 0;">👵 Yuki: ${pick(D.yuki.game_start)}</div>`;
          html += '</div>';
        }

        html += '<div style="text-align:center;margin-top:16px;"><button id="close-poker" style="padding:10px 30px;background:#e8b830;color:#000;border:none;border-radius:8px;font-size:14px;font-weight:bold;cursor:pointer;">Back to Mahjong</button></div>';
        html += '</div>';

        overlay.innerHTML = html;
        document.body.appendChild(overlay);
        document.getElementById('close-poker').addEventListener('click', () => overlay.remove());
      });

      await wait(1000);
      await shot('06_poker_hand_display');

      // Take another hand with different cards
      await page.evaluate(() => {
        document.getElementById('poker-test')?.remove();
      });

      // Create another hand
      await page.evaluate(() => {
        const overlay = document.createElement('div');
        overlay.id = 'poker-test2';
        overlay.style.cssText = 'position:fixed;inset:0;background:#2a1520;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:sans-serif;color:#e0e0e0;';

        const Cards = window.MJ.Poker.Cards;
        const HE = window.MJ.Poker.HandEval;
        const AIv2 = window.MJ.Poker.AIv2;
        const ai = new AIv2.PokerAIv2();

        // Deal 3 hands to compare AI decisions
        let html = '<div style="max-width:900px;width:100%;padding:20px;">';
        html += '<h1 style="color:#e8b830;text-align:center;margin-bottom:20px;">🃏 Poker AI v2 — Decision Comparison</h1>';

        for (let hand = 0; hand < 3; hand++) {
          const deck = new Cards.Deck();
          deck.shuffle();

          const holeCards = [deck.cards.shift(), deck.cards.shift()];
          const flop = [deck.cards.shift(), deck.cards.shift(), deck.cards.shift()];
          const eq = AIv2.getPreflopEquity(holeCards, 3);

          const cardDisplay = (c) => {
            const sym = {hearts:'♥',diamonds:'♦',clubs:'♣',spades:'♠'}[c.suit];
            const col = (c.suit === 'hearts' || c.suit === 'diamonds') ? '#e74c3c' : '#ecf0f1';
            return `<span style="color:${col};font-weight:bold;">${c.rank}${sym}</span>`;
          };

          html += `<div style="background:rgba(255,255,255,0.05);border-radius:10px;padding:14px;margin-bottom:14px;">`;
          html += `<div style="font-size:13px;color:#888;margin-bottom:4px;">Hand ${hand+1} — Equity: ${(eq*100).toFixed(0)}%</div>`;
          html += `<div style="font-size:18px;margin-bottom:6px;">Hole: ${holeCards.map(cardDisplay).join(' ')} | Flop: ${flop.map(cardDisplay).join(' ')}</div>`;

          const bestHand = HE.getBestHand(holeCards, flop);
          html += `<div style="font-size:14px;color:#4ade80;margin-bottom:8px;">${bestHand ? bestHand.name : 'N/A'}</div>`;

          // Get decisions from all 3 personalities
          html += '<div style="display:flex;gap:12px;">';
          for (const prof of ['mei', 'kenji', 'yuki']) {
            const player = {id:0, cards:holeCards, chips:1000, bet:0, folded:false, allIn:false};
            const state = {phase:'flop', communityCards:flop, currentBet:20, pot:60,
              players:[player,{id:1,folded:false},{id:2,folded:false}], dealerIndex:1, bigBlind:10, currentPlayerIndex:0};
            const decision = ai.decideAction(player, state, prof);

            const colors = {mei:'#e8b4d0', kenji:'#b4c8e8', yuki:'#d4e8b4'};
            const icons = {mei:'👩', kenji:'👨', yuki:'👵'};
            html += `<div style="flex:1;background:rgba(0,0,0,0.2);padding:8px;border-radius:6px;border-left:3px solid ${colors[prof]};">`;
            html += `<div style="font-size:12px;color:${colors[prof]};font-weight:bold;">${icons[prof]} ${prof}</div>`;
            html += `<div style="font-size:14px;color:#fff;">${decision.type}${decision.amount ? ' $'+decision.amount : ''}</div>`;
            html += `</div>`;
          }
          html += '</div></div>';
        }

        // Poker tutor advice
        if (window.MJ.Poker.Tutor) {
          html += '<div style="background:rgba(232,184,48,0.1);border:1px solid #e8b830;border-radius:10px;padding:14px;margin-top:10px;">';
          html += '<div style="font-size:14px;color:#e8b830;font-weight:bold;margin-bottom:6px;">📚 Poker Tutor</div>';
          html += '<div style="font-size:13px;color:#ddd;">The tutor analyzes your hands in real-time, grading your decisions A+ through D and explaining pot odds, position play, and opponent tendencies.</div>';
          html += '</div>';
        }

        html += '<div style="text-align:center;margin-top:16px;"><button id="close-poker2" style="padding:10px 30px;background:#e8b830;color:#000;border:none;border-radius:8px;font-size:14px;font-weight:bold;cursor:pointer;">Close</button></div>';
        html += '</div>';

        overlay.innerHTML = html;
        document.body.appendChild(overlay);
        document.getElementById('close-poker2').addEventListener('click', () => overlay.remove());
      });

      await wait(1000);
      await shot('07_poker_ai_comparison');

      // Close poker overlay
      await click('#close-poker2');
      await wait(500);
    }

    // 5. Check poker living world integration
    console.log('\n=== 5. Poker living world ===');
    const livingCheck = await page.evaluate(() => {
      const results = {};
      if (window.MJ.Poker.Living) {
        const pl = new window.MJ.Poker.Living.PokerLivingWorld();
        results.achievements = pl.getPokerAchievements().length;
        results.challenges = pl.getPokerChallenges().length;
        results.storyArcs = pl.getPokerStoryArcs().length;
        results.crossGameComment = pl.getCrossGameComment('kenji', 'mahjong');
      }
      if (window.MJ.Poker.Practice) {
        const pp = new window.MJ.Poker.Practice.PokerPractice();
        const puzzles = pp.getPuzzles();
        results.puzzles = Object.values(puzzles).flat().length;
      }
      if (window.MJ.Poker.Tutor) {
        results.tutorAvailable = true;
      }
      return results;
    });
    console.log('  Poker achievements:', livingCheck.achievements);
    console.log('  Poker challenges:', livingCheck.challenges);
    console.log('  Poker story arcs:', livingCheck.storyArcs);
    console.log('  Poker puzzles:', livingCheck.puzzles);
    console.log('  Poker tutor:', livingCheck.tutorAvailable ? 'Yes' : 'No');
    console.log('  Cross-game comment:', livingCheck.crossGameComment);

    // 6. Check game framework
    console.log('\n=== 6. Game framework ===');
    const frameworkCheck = await page.evaluate(() => {
      if (window.MJ.GameFramework) {
        const gf = new window.MJ.GameFramework.GameFramework();
        gf.registerMahjong();
        gf.registerGame({id:'poker',name:'Poker',icon:'🃏',description:'Texas Hold\'em',category:'card',unlockLevel:1});
        return { games: gf.getGameList(10).map(g => g.name), count: gf.getGameList(10).length };
      }
      return { games: [], count: 0 };
    });
    console.log('  Registered games:', frameworkCheck.games.join(', '));

    // 7. Final screenshot with Mahjong board
    console.log('\n=== 7. Back to Mahjong ===');
    await shot('08_back_to_mahjong');

    // Summary
    console.log(`\n✅ Done! ${n} screenshots saved to: ${DIR}/`);
    fs.readdirSync(DIR).filter(f => f.endsWith('.png')).sort().forEach(f => console.log(`  ${f}`));

  } catch(err) {
    console.error('Error:', err.message);
    await shot('error');
  } finally {
    await wait(2000);
    await browser.close();
  }
}

main().catch(console.error);
