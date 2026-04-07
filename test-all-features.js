#!/usr/bin/env node
/**
 * test-all-features.js — Comprehensive test of ALL game features
 * Tests gameplay, UI, docs viewer, settings, chat, and captures screenshots.
 */
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const DIR = path.join(__dirname, 'screenshots');
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
    // === 1. LOAD GAME ===
    console.log('\n=== 1. Loading game ===');
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await wait(3000);
    await shot('01_game_loaded');

    // Close tutorial if showing
    try { const skip = await page.$('#tutorial-skip'); if (skip) { const vis = await page.evaluate(e => e.offsetParent !== null, skip); if (vis) await skip.click(); } } catch(e){}
    await wait(1000);
    await shot('02_board_with_chat');

    // === 2. GAMEPLAY — AUTO-PLAY ===
    console.log('\n=== 2. Auto-play gameplay ===');
    await click('#btn-auto-play');
    await wait(6000);
    await shot('03_auto_play_running');
    await click('#btn-auto-play'); // stop
    await wait(500);
    await shot('04_auto_play_stopped');

    // === 3. CHAT TUTOR ===
    console.log('\n=== 3. Chat tutor ===');
    const chatInput = await page.$('#chat-input');
    if (chatInput) {
      await chatInput.click();
      await chatInput.type('What should I discard?', { delay: 20 });
      await click('#chat-send');
      await wait(1000);
      await shot('05_tutor_discard_advice');

      await chatInput.click({ clickCount: 3 });
      await chatInput.type('Can I win?', { delay: 20 });
      await click('#chat-send');
      await wait(1000);

      await chatInput.click({ clickCount: 3 });
      await chatInput.type('Tell me about scoring', { delay: 20 });
      await click('#chat-send');
      await wait(1000);
      await shot('06_tutor_multiple_questions');
    }

    // === 4. SETTINGS PANEL ===
    console.log('\n=== 4. Settings panel ===');
    await click('#btn-help'); // opens settings (⚙ button)
    await wait(800);
    await shot('07_settings_panel');
    await click('#btn-close-settings');
    await wait(300);

    // === 5. DOCS VIEWER ===
    console.log('\n=== 5. Documentation viewer ===');
    await click('#btn-docs');
    await wait(1500);
    await shot('08_docs_viewer_home');

    // Click on Rulebook
    const menuItems = await page.$$('#doc-menu > div');
    if (menuItems.length > 0) {
      await menuItems[0].click(); // Rulebook
      await wait(1500);
      await shot('09_docs_rulebook');
    }

    // Click on Tutorial doc
    if (menuItems.length > 1) {
      await menuItems[1].click(); // Tutorial
      await wait(1500);
      await shot('10_docs_tutorial');
    }

    // Click on History
    if (menuItems.length > 2) {
      await menuItems[2].click(); // History
      await wait(1500);
      await shot('11_docs_history');
    }

    // Click on Strategy Guide
    if (menuItems.length > 4) {
      await menuItems[4].click(); // Strategy
      await wait(1500);
      await shot('12_docs_strategy');
    }

    // Search docs
    const docSearch = await page.$('#doc-search');
    if (docSearch) {
      await docSearch.click();
      await docSearch.type('furiten', { delay: 30 });
      await wait(1000);
      await shot('13_docs_search_furiten');

      await docSearch.click({ clickCount: 3 });
      await docSearch.type('riichi', { delay: 30 });
      await wait(1000);
      await shot('14_docs_search_riichi');
    }

    // Close docs
    await click('#doc-close');
    await wait(500);

    // === 6. GAME LOG ===
    console.log('\n=== 6. Game log ===');
    await click('#log-toggle');
    await wait(500);
    await shot('15_game_log');
    await click('#log-toggle');
    await wait(300);

    // === 7. SORT HAND ===
    console.log('\n=== 7. Sorting ===');
    await click('#btn-sort');
    await wait(500);
    await shot('16_hand_sorted');

    // === 8. PLAY TO ROUND END ===
    console.log('\n=== 8. Playing to round end ===');
    await click('#btn-auto-play');
    await wait(20000);
    await shot('17_round_progress');

    // Check for win/draw overlay
    const overlayVis = await page.evaluate(() => {
      const ov = document.getElementById('overlay');
      return ov && !ov.classList.contains('hidden');
    });
    if (overlayVis) {
      await shot('18_win_or_draw_screen');
      await click('#btn-next-round');
      await wait(2000);
    }

    // Continue auto-play for another round
    await wait(20000);
    await shot('19_round2_progress');

    // Stop auto-play
    await click('#btn-auto-play');
    await wait(500);

    // === 9. SCREENSHOT & GALLERY ===
    console.log('\n=== 9. Screenshot & gallery ===');
    await click('#btn-screenshot');
    await wait(1000);
    await shot('20_screenshot_taken');

    await click('#btn-gallery');
    await wait(1000);
    await shot('21_screenshot_gallery');
    await click('#ss-close');
    await wait(300);

    // === 10. TUTORIAL ===
    console.log('\n=== 10. Tutorial ===');
    await click('#btn-tutorial');
    await wait(800);
    await shot('22_tutorial');
    try { const skip = await page.$('#tutorial-skip'); if (skip) await skip.click(); } catch(e){}
    await wait(300);

    // === 11. NEW GAME ===
    console.log('\n=== 11. New game ===');
    await click('#btn-new-game');
    await wait(2000);
    await shot('23_new_game');

    // === 12. MANUAL TILE INTERACTION ===
    console.log('\n=== 12. Manual tile interaction ===');
    await wait(3000);
    const tiles = await page.$$('#hand-bottom .mj-tile.clickable');
    if (tiles.length > 0) {
      await tiles[0].click();
      await wait(300);
      await shot('24_tile_selected');
      await tiles[0].click(); // discard
      await wait(2000);
      await shot('25_after_discard');
    }

    // === 13. PLAY FULL GAME FOR ACHIEVEMENTS ===
    console.log('\n=== 13. Full game auto-play ===');
    await click('#btn-auto-play');
    await wait(40000);
    await shot('26_full_game_progress');

    // Check overlay
    const ov2 = await page.evaluate(() => {
      const ov = document.getElementById('overlay');
      return ov && !ov.classList.contains('hidden');
    });
    if (ov2) {
      await shot('27_round_end_screen');
    }

    // === 14. DOCS — GAME HELP ===
    console.log('\n=== 14. Game help doc ===');
    await click('#btn-docs');
    await wait(1000);
    const menuItems2 = await page.$$('#doc-menu > div');
    if (menuItems2.length > 3) {
      await menuItems2[3].click(); // Game Help
      await wait(1500);
      await shot('28_docs_game_help');
    }
    await click('#doc-close');
    await wait(300);

    // === 15. MOBILE VIEWPORT ===
    console.log('\n=== 15. Mobile viewport ===');
    await page.setViewport({ width: 375, height: 812 });
    await wait(1500);
    await shot('29_mobile_iphone');

    await page.setViewport({ width: 768, height: 1024 });
    await wait(1500);
    await shot('30_mobile_ipad');

    await page.setViewport({ width: 812, height: 375 });
    await wait(1500);
    await shot('31_mobile_landscape');

    await page.setViewport({ width: 1400, height: 900 });
    await wait(500);

    // === 16. FINAL STATE ===
    console.log('\n=== 16. Final state ===');
    const chatInput2 = await page.$('#chat-input');
    if (chatInput2) {
      await chatInput2.click({ clickCount: 3 });
      await chatInput2.type('How did I do overall?', { delay: 20 });
      await click('#chat-send');
      await wait(1000);
    }
    await shot('32_final_state');

    // === SUMMARY ===
    console.log(`\n✅ Done! ${n} screenshots saved to: ${DIR}/`);
    const files = fs.readdirSync(DIR).filter(f => f.endsWith('.png')).sort();
    console.log(`\nScreenshot files (${files.length}):`);
    files.forEach(f => console.log(`  ${f}`));

    // Console error check
    const errors = await page.evaluate(() => {
      return window._mjErrors || [];
    });
    if (errors.length > 0) {
      console.log(`\n⚠️ Console errors: ${errors.length}`);
      errors.slice(0, 5).forEach(e => console.log(`  ${e}`));
    }

  } catch (err) {
    console.error('Error:', err.message);
    await shot('error_state');
  } finally {
    await wait(2000);
    await browser.close();
  }
}

main().catch(console.error);
