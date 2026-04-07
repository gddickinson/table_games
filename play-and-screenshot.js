#!/usr/bin/env node
/**
 * play-and-screenshot.js — Automated gameplay with screenshots at each stage
 * Uses Puppeteer to control the browser, play the game, and capture images.
 */
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
const URL = process.env.PORT ? `http://localhost:${process.env.PORT}` : 'http://localhost:8083';

async function main() {
  // Create screenshots directory
  if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR);

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1400, height: 900 },
    args: ['--window-size=1400,900']
  });

  const page = await browser.newPage();
  let shotNum = 0;

  async function screenshot(label) {
    shotNum++;
    const filename = `${String(shotNum).padStart(2, '0')}_${label.replace(/[^a-z0-9]/gi, '_')}.png`;
    const filepath = path.join(SCREENSHOTS_DIR, filename);
    await page.screenshot({ path: filepath, fullPage: false });
    console.log(`  📸 ${filename}`);
    return filepath;
  }

  async function wait(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  try {
    // 1. Load the game
    console.log('\n=== Loading game ===');
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await wait(2000);
    await screenshot('01_game_loaded_with_tutorial');

    // 2. Close the tutorial (may not appear if localStorage flag set)
    console.log('\n=== Closing tutorial ===');
    try {
      const skipBtn = await page.$('#tutorial-skip');
      if (skipBtn) {
        const visible = await page.evaluate(el => el.offsetParent !== null, skipBtn);
        if (visible) { await skipBtn.click(); await wait(500); }
      }
    } catch(e) { /* tutorial not showing */ }
    await wait(1000);
    await screenshot('02_game_board_initial');

    // 3. Let the game run for a few turns (auto-play briefly)
    console.log('\n=== Starting auto-play for a few turns ===');
    const autoBtn = await page.$('#btn-auto-play');
    if (autoBtn) {
      await autoBtn.click();
      await wait(4000); // Let AI play several turns
    }
    await screenshot('03_after_auto_play_turns');

    // 4. Stop auto-play
    if (autoBtn) {
      await autoBtn.click();
      await wait(500);
    }
    await screenshot('04_human_turn_with_hints');

    // 5. Open settings panel
    console.log('\n=== Opening settings ===');
    const helpBtn = await page.$('#btn-help');
    if (helpBtn) {
      await helpBtn.click();
      await wait(800);
    }
    await screenshot('05_settings_panel');

    // Close settings
    const closeSettings = await page.$('#btn-close-settings');
    if (closeSettings) {
      await closeSettings.click();
      await wait(300);
    }

    // 6. Open game log
    console.log('\n=== Opening game log ===');
    const logToggle = await page.$('#log-toggle');
    if (logToggle) {
      await logToggle.click();
      await wait(500);
    }
    await screenshot('06_game_log_expanded');

    // Close log
    if (logToggle) {
      await logToggle.click();
      await wait(300);
    }

    // 7. Try the chat/tutor
    console.log('\n=== Using chat tutor ===');
    const chatInput = await page.$('#chat-input');
    if (chatInput) {
      await chatInput.click();
      await chatInput.type('What should I discard?', { delay: 30 });
      const sendBtn = await page.$('#chat-send');
      if (sendBtn) await sendBtn.click();
      await wait(1000);
    }
    await screenshot('07_chat_tutor_response');

    // 8. Ask another question
    if (chatInput) {
      await chatInput.click({ clickCount: 3 });
      await chatInput.type('Can I win?', { delay: 30 });
      const sendBtn = await page.$('#chat-send');
      if (sendBtn) await sendBtn.click();
      await wait(1000);
    }
    await screenshot('08_chat_can_i_win');

    // 9. Sort hand by suit
    console.log('\n=== Sorting hand ===');
    const sortBtn = await page.$('#btn-sort');
    if (sortBtn) {
      await sortBtn.click();
      await wait(500);
    }
    await screenshot('09_hand_sorted');

    // 10. Continue auto-play to reach round end
    console.log('\n=== Running to round end ===');
    if (autoBtn) {
      await autoBtn.click();
      await wait(15000); // Let the round finish
    }
    await screenshot('10_round_in_progress');

    // Wait for round to finish
    await wait(10000);
    await screenshot('11_round_end_or_progress');

    // Check if win screen appeared
    const overlay = await page.$('#overlay');
    const overlayVisible = overlay ? await page.evaluate(el => !el.classList.contains('hidden'), overlay) : false;
    if (overlayVisible) {
      await screenshot('12_win_screen_with_scores');

      // Click next round
      const nextRound = await page.$('#btn-next-round');
      if (nextRound) {
        await nextRound.click();
        await wait(2000);
      }
      await screenshot('13_next_round_started');
    }

    // 11. Play round 2 quickly
    console.log('\n=== Playing round 2 ===');
    if (autoBtn) {
      // Make sure auto-play is running
      const isAuto = await page.evaluate(() => {
        try { return document.getElementById('btn-auto-play').textContent.includes('Stop'); } catch(e) { return false; }
      });
      if (!isAuto) await autoBtn.click();
    }
    await wait(15000);
    await screenshot('14_round_2_in_progress');

    // Wait more for completion
    await wait(15000);
    await screenshot('15_round_2_end');

    // 12. Stop auto-play and take a manual screenshot using the in-game button
    console.log('\n=== Using in-game screenshot button ===');
    const ssBtn = await page.$('#btn-screenshot');
    if (ssBtn) {
      await ssBtn.click();
      await wait(1000);
    }
    await screenshot('16_after_ingame_screenshot');

    // 13. Open the in-game gallery
    console.log('\n=== Opening screenshot gallery ===');
    const galBtn = await page.$('#btn-gallery');
    if (galBtn) {
      await galBtn.click();
      await wait(1000);
    }
    await screenshot('17_screenshot_gallery');

    // Close gallery
    const ssClose = await page.$('#ss-close');
    if (ssClose) {
      await ssClose.click();
      await wait(500);
    }

    // 14. Open tutorial
    console.log('\n=== Opening tutorial ===');
    const tutBtn = await page.$('#btn-tutorial');
    if (tutBtn) {
      await tutBtn.click();
      await wait(800);
    }
    await screenshot('18_tutorial_open');

    // Navigate tutorial
    const nextStep = await page.$('#tutorial-next');
    if (nextStep) {
      await nextStep.click();
      await wait(500);
      await screenshot('19_tutorial_step2_tiles');
      await nextStep.click();
      await wait(500);
      await screenshot('20_tutorial_step3_winning');
    }

    // Close tutorial
    const tutSkip = await page.$('#tutorial-skip');
    if (tutSkip) {
      await tutSkip.click();
      await wait(300);
    }

    // 15. New game
    console.log('\n=== Starting new game ===');
    const newGameBtn = await page.$('#btn-new-game');
    if (newGameBtn) {
      await newGameBtn.click();
      await wait(2000);
    }
    await screenshot('21_new_game_fresh');

    // 16b. Auto-play aggressively to try to reach a win screen
    console.log('\n=== Trying to capture win screen ===');
    if (autoBtn) {
      const isAuto = await page.evaluate(() => {
        try { return document.getElementById('btn-auto-play').textContent.includes('Stop'); } catch(e) { return false; }
      });
      if (!isAuto) await autoBtn.click();
    }
    await wait(30000); // 30 seconds of auto-play
    await screenshot('29_trying_for_win');

    // Check if win/draw overlay appeared
    const overlayVisible2 = await page.evaluate(() => {
      const ov = document.getElementById('overlay');
      return ov && !ov.classList.contains('hidden');
    });
    if (overlayVisible2) {
      await screenshot('30_win_or_draw_screen');
    }

    // 17. Let AI continue
    await wait(5000);
    await screenshot('24_game_continues');

    // 18. Final overview with chat history
    console.log('\n=== Final state ===');
    // Ask tutor one more thing
    const chatInput2 = await page.$('#chat-input');
    if (chatInput2) {
      await chatInput2.click({ clickCount: 3 });
      await chatInput2.type('How is my score?', { delay: 30 });
      const sendBtn2 = await page.$('#chat-send');
      if (sendBtn2) await sendBtn2.click();
      await wait(1000);
    }
    await screenshot('25_final_state_with_chat');

    // 19. Mobile viewport test
    console.log('\n=== Mobile viewport test ===');
    await page.setViewport({ width: 375, height: 812 }); // iPhone
    await wait(1500);
    await screenshot('26_mobile_iphone');

    await page.setViewport({ width: 768, height: 1024 }); // iPad
    await wait(1500);
    await screenshot('27_mobile_ipad');

    // Landscape phone
    await page.setViewport({ width: 812, height: 375 });
    await wait(1500);
    await screenshot('28_mobile_landscape');

    // Reset to desktop
    await page.setViewport({ width: 1400, height: 900 });
    await wait(500);

    // Performance test
    console.log('\n=== Performance measurement ===');
    const perfResults = await page.evaluate(() => {
      const start = performance.now();
      // Force 10 full re-renders
      for (let i = 0; i < 10; i++) {
        if (window.MJ.Renderer) window.MJ.Renderer.renderBoard(window.MJ.Main._state || {});
      }
      const elapsed = performance.now() - start;
      return { renders: 10, totalMs: Math.round(elapsed), avgMs: Math.round(elapsed / 10) };
    });
    console.log(`  Render performance: ${perfResults.renders} renders in ${perfResults.totalMs}ms (avg ${perfResults.avgMs}ms/render)`);

    console.log(`\n✅ Done! ${shotNum} screenshots saved to: ${SCREENSHOTS_DIR}/`);
    console.log('\nScreenshot files:');
    fs.readdirSync(SCREENSHOTS_DIR)
      .filter(f => f.endsWith('.png'))
      .sort()
      .forEach(f => console.log(`  ${f}`));

  } catch (err) {
    console.error('Error:', err.message);
    await screenshot('error_state');
  } finally {
    await wait(2000);
    await browser.close();
  }
}

main().catch(console.error);
