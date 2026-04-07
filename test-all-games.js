#!/usr/bin/env node
/**
 * test-all-games.js — Play all 4 games from the browser, test features, take screenshots
 */
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const DIR = path.join(__dirname, 'screenshots-allgames');
const URL = 'http://localhost:8083';

async function main() {
  if (fs.existsSync(DIR)) fs.readdirSync(DIR).filter(f => f.endsWith('.png')).forEach(f => fs.unlinkSync(path.join(DIR, f)));
  else fs.mkdirSync(DIR, { recursive: true });

  const browser = await puppeteer.launch({ headless: false, defaultViewport: { width: 1400, height: 900 }, args: ['--window-size=1400,900'] });
  const page = await browser.newPage();
  let n = 0, errors = [];
  page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
  const shot = async (label) => { n++; const f = `${String(n).padStart(2,'0')}_${label}.png`; await page.screenshot({path: path.join(DIR, f)}); console.log(`  📸 ${f}`); };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const click = async (sel) => { try { const el = await page.$(sel); if (el) { await el.click(); return true; } } catch(e){} return false; };

  try {
    // === 1. INTRO SCREEN ===
    console.log('\n=== 1. Intro Screen ===');
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await wait(3000);
    await shot('intro_4games');

    // === 2. PLAY MAHJONG ===
    console.log('\n=== 2. Mahjong ===');
    const gameCards = await page.$$('.game-card:not(.locked)');
    if (gameCards.length >= 1) {
      await gameCards[0].click(); // Mahjong
      await wait(2000);
      // Close tutorial if showing
      try { const skip = await page.$('#tutorial-skip'); if (skip) { const vis = await page.evaluate(e => e.offsetParent !== null, skip); if (vis) await skip.click(); } } catch(e){}
      await wait(1500);
      await shot('mahjong_board');

      // Auto-play a few turns
      await click('#btn-auto-play');
      await wait(5000);
      await shot('mahjong_gameplay');
      await click('#btn-auto-play'); // stop
      await wait(500);

      // Chat
      const chatInput = await page.$('#chat-input');
      if (chatInput) {
        await chatInput.click();
        await chatInput.type('What should I discard?', { delay: 15 });
        await click('#chat-send');
        await wait(1000);
      }
      await shot('mahjong_with_chat');

      // Return to intro
      await click('#btn-games');
      await wait(1500);
      await shot('back_to_intro');
    }

    // === 3. PLAY POKER ===
    console.log('\n=== 3. Poker ===');
    const gameCards2 = await page.$$('.game-card:not(.locked)');
    if (gameCards2.length >= 2) {
      await gameCards2[1].click(); // Poker
      await wait(2000);
      await shot('poker_table');

      // Wait for AI to act
      await wait(3000);
      await shot('poker_preflop');

      // Try clicking Fold
      const foldBtn = await page.$('button');
      const buttons = await page.$$('button');
      for (const btn of buttons) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text.includes('Call') || text.includes('Fold')) {
          await btn.click();
          await wait(2000);
          break;
        }
      }
      await shot('poker_after_action');

      // Back to intro
      const backBtns = await page.$$('button');
      for (const btn of backBtns) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text.includes('Back to Mahjong') || text.includes('Quit') || text.includes('Back')) {
          await btn.click();
          await wait(1000);
          break;
        }
      }
      await wait(1000);
    }

    // Return to intro if not already there
    const introVisible = await page.evaluate(() => !!document.getElementById('intro-screen'));
    if (!introVisible) {
      await click('#btn-games');
      await wait(1500);
    }
    await shot('intro_after_poker');

    // === 4. PLAY BLACKJACK ===
    console.log('\n=== 4. Blackjack ===');
    const gameCards3 = await page.$$('.game-card:not(.locked)');
    if (gameCards3.length >= 3) {
      await gameCards3[2].click(); // Blackjack
      await wait(2000);
      await shot('blackjack_table');

      await wait(3000);
      await shot('blackjack_hand');

      // Try Hit or Stand
      const bjButtons = await page.$$('button');
      for (const btn of bjButtons) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text.includes('Stand') || text.includes('Hit')) {
          await btn.click();
          await wait(2000);
          break;
        }
      }
      await shot('blackjack_after_action');

      // Back
      const bjBackBtns = await page.$$('button');
      for (const btn of bjBackBtns) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text.includes('Back') || text.includes('Quit')) {
          await btn.click();
          await wait(1000);
          break;
        }
      }
    }

    // Return to intro
    const introVis2 = await page.evaluate(() => !!document.getElementById('intro-screen'));
    if (!introVis2) {
      await click('#btn-games');
      await wait(1500);
    }
    await shot('intro_after_blackjack');

    // === 5. PLAY DOMINOES ===
    console.log('\n=== 5. Dominoes ===');
    const gameCards4 = await page.$$('.game-card:not(.locked)');
    if (gameCards4.length >= 4) {
      await gameCards4[3].click(); // Dominoes
      await wait(2000);
      await shot('dominoes_table');

      await wait(3000);
      await shot('dominoes_hand');

      // Try clicking a playable tile
      const domTiles = await page.$$('.domino-tile.playable, .domino-playable, [data-playable="true"]');
      if (domTiles.length > 0) {
        await domTiles[0].click();
        await wait(2000);
        await shot('dominoes_after_play');
      } else {
        // Try any clickable element in the game area
        await wait(2000);
        await shot('dominoes_gameplay');
      }

      // Back
      const domBackBtns = await page.$$('button');
      for (const btn of domBackBtns) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text.includes('Back') || text.includes('Quit')) {
          await btn.click();
          await wait(1000);
          break;
        }
      }
    }

    // === 6. DOCS ===
    console.log('\n=== 6. Documentation ===');
    const introVis3 = await page.evaluate(() => !!document.getElementById('intro-screen'));
    if (!introVis3) {
      await click('#btn-games');
      await wait(1500);
    }
    // Click Docs button from intro
    const introBtns = await page.$$('.intro-btn');
    for (const btn of introBtns) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('Documentation')) {
        await btn.click();
        await wait(1500);
        break;
      }
    }
    await shot('docs_viewer');

    // Close docs
    await click('#doc-close');
    await wait(500);

    // === 7. FINAL STATE ===
    console.log('\n=== 7. Final ===');
    await shot('final_state');

    // === RESULTS ===
    console.log(`\n✅ Done! ${n} screenshots, ${errors.length} errors`);
    if (errors.length > 0) {
      console.log('Errors:');
      errors.slice(0, 5).forEach(e => console.log('  ' + e));
    }
    console.log('\nScreenshots:');
    fs.readdirSync(DIR).filter(f => f.endsWith('.png')).sort().forEach(f => console.log('  ' + f));

  } catch (err) {
    console.error('Error:', err.message);
    await shot('error');
  } finally {
    await wait(2000);
    await browser.close();
  }
}

main().catch(console.error);
