const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const DIR = path.join(__dirname, 'screenshots-final');
const URL = 'http://localhost:8083';

async function main() {
  if (fs.existsSync(DIR)) fs.readdirSync(DIR).filter(f=>f.endsWith('.png')).forEach(f=>fs.unlinkSync(path.join(DIR,f)));
  else fs.mkdirSync(DIR,{recursive:true});
  const browser = await puppeteer.launch({headless:false,defaultViewport:{width:1400,height:900},args:['--window-size=1400,900']});
  const page = await browser.newPage();
  let n=0, errs=[];
  page.on('pageerror',e=>errs.push(e.message.split('\n')[0]));
  const shot=async(l)=>{n++;const f=`${String(n).padStart(2,'0')}_${l}.png`;await page.screenshot({path:path.join(DIR,f)});console.log(`  📸 ${f}`);};
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const click=async(s)=>{try{const e=await page.$(s);if(e){await e.click();return true;}}catch(e){}return false;};
  const clickText=async(text)=>{const bs=await page.$$('button');for(const b of bs){const t=await page.evaluate(e=>e.textContent,b);if(t.includes(text)){await b.click();return true;}}return false;};

  try {
    // 1. INTRO
    console.log('\n=== 1. INTRO SCREEN ===');
    await page.goto(URL,{waitUntil:'domcontentloaded',timeout:20000});
    await wait(3000);
    await shot('01_intro_screen');

    // 2. MAHJONG
    console.log('\n=== 2. MAHJONG ===');
    let cards=await page.$$('.game-card:not(.locked)');
    if(cards[0]){await cards[0].click();await wait(2000);}
    try{const s=await page.$('#tutorial-skip');if(s){const v=await page.evaluate(e=>e.offsetParent!==null,s);if(v)await s.click();}}catch(e){}
    await wait(1500);
    await shot('02_mahjong_board');
    await click('#btn-auto-play');await wait(6000);
    await shot('03_mahjong_auto_play');
    await click('#btn-auto-play');await wait(500);
    // Chat
    const ci=await page.$('#chat-input');
    if(ci){await ci.click();await ci.type('best discard?',{delay:15});await click('#chat-send');await wait(1000);}
    await shot('04_mahjong_chat');
    // Settings
    await click('#btn-help');await wait(800);
    await shot('05_settings');
    await click('#btn-close-settings');await wait(300);
    // Docs
    await click('#btn-docs');await wait(1500);
    await shot('06_docs_home');
    // Click through docs
    const mi=await page.$$('#doc-menu > div');
    if(mi[0]){await mi[0].click();await wait(1000);await shot('07_mahjong_rulebook');}
    if(mi[5]){await mi[5].click();await wait(1000);await shot('08_poker_rulebook');}
    if(mi[7]){await mi[7].click();await wait(1000);await shot('09_blackjack_rulebook');}
    if(mi[9]){await mi[9].click();await wait(1000);await shot('10_dominoes_rulebook');}
    // Search
    const ds=await page.$('#doc-search');
    if(ds){await ds.click();await ds.type('strategy',{delay:20});await wait(800);await shot('11_docs_search');}
    await click('#doc-close');await wait(300);
    // Back to intro
    await click('#btn-games');await wait(1500);
    await shot('12_back_to_intro');

    // 3. POKER
    console.log('\n=== 3. POKER ===');
    cards=await page.$$('.game-card:not(.locked)');
    if(cards[1]){await cards[1].click();await wait(3000);}
    await shot('13_poker_table');
    await wait(2000);
    await shot('14_poker_preflop');
    await clickText('Call')||await clickText('Fold');
    await wait(2000);
    await shot('15_poker_action');
    await clickText('Back')||await clickText('Quit');await wait(1000);
    const iv1=await page.evaluate(()=>!!document.getElementById('intro-screen'));
    if(!iv1){await click('#btn-games');await wait(1500);}

    // 4. BLACKJACK
    console.log('\n=== 4. BLACKJACK ===');
    cards=await page.$$('.game-card:not(.locked)');
    if(cards[2]){await cards[2].click();await wait(2000);}
    await shot('16_blackjack_table');
    // Click Deal if betting phase
    await clickText('DEAL')||await clickText('Deal');
    await wait(2000);
    await shot('17_blackjack_dealt');
    await clickText('Stand')||await clickText('Hit');
    await wait(2000);
    await shot('18_blackjack_result');
    await clickText('Back')||await clickText('Quit');await wait(1000);
    const iv2=await page.evaluate(()=>!!document.getElementById('intro-screen'));
    if(!iv2){await click('#btn-games');await wait(1500);}

    // 5. DOMINOES
    console.log('\n=== 5. DOMINOES ===');
    cards=await page.$$('.game-card:not(.locked)');
    if(cards[3]){await cards[3].click();await wait(3000);}
    await shot('19_dominoes_table');
    await wait(3000);
    await shot('20_dominoes_gameplay');
    await clickText('Back')||await clickText('Quit');await wait(1000);
    const iv3=await page.evaluate(()=>!!document.getElementById('intro-screen'));
    if(!iv3){await click('#btn-games');await wait(1500);}

    // 6. TUTORIAL TEST
    console.log('\n=== 6. TUTORIALS ===');
    cards=await page.$$('.game-card:not(.locked)');
    if(cards[0]){await cards[0].click();await wait(2000);}
    try{const s=await page.$('#tutorial-skip');if(s){const v=await page.evaluate(e=>e.offsetParent!==null,s);if(v)await s.click();}}catch(e){}
    await wait(500);
    await click('#btn-tutorial');await wait(800);
    await shot('21_mahjong_tutorial');
    try{const s=await page.$('#tutorial-skip');if(s)await s.click();}catch(e){}
    await wait(300);

    // 7. SCREENSHOT & GALLERY
    console.log('\n=== 7. SCREENSHOTS ===');
    await click('#btn-screenshot');await wait(800);
    await shot('22_screenshot_taken');
    await click('#btn-gallery');await wait(800);
    await shot('23_gallery');
    await click('#ss-close');await wait(300);

    // 8. MOBILE
    console.log('\n=== 8. MOBILE ===');
    await page.setViewport({width:375,height:812});await wait(1000);
    await shot('24_mobile_phone');
    await page.setViewport({width:1400,height:900});await wait(500);

    // 9. FINAL
    console.log('\n=== 9. FINAL STATE ===');
    await click('#btn-games');await wait(1000);
    await shot('25_final_intro');

    console.log(`\n✅ ${n} screenshots, ${errs.length} errors`);
    if(errs.length>0)errs.slice(0,3).forEach(e=>console.log('  ERR: '+e));
    fs.readdirSync(DIR).filter(f=>f.endsWith('.png')).sort().forEach(f=>console.log('  '+f));
  } catch(err) {
    console.error('Error:',err.message);
    await shot('error');
  } finally {
    await wait(2000);
    await browser.close();
  }
}
main().catch(console.error);
