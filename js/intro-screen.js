/**
 * intro-screen.js — Main title/intro screen with game selection,
 * player profile, settings, and returning player welcome.
 */
(function () {
  'use strict';
  window.MJ = window.MJ || {};

  let overlay = null;
  let onGameSelect = null;

  function show(options) {
    options = options || {};
    onGameSelect = options.onSelect || null;

    const rep = getReputation();
    const isReturning = rep.totalGames > 0;
    const timeGreeting = getTimeGreeting();
    const events = getActiveEvents();
    const welcomeBack = getWelcomeBack(rep);

    overlay = document.createElement('div');
    overlay.id = 'intro-screen';
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:9999;
      background: radial-gradient(ellipse at center, #1a4a2e 0%, #0f3520 50%, #081a10 100%);
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;color:#e0e0e0;
      overflow-y:auto;
    `;

    let html = '<div style="max-width:700px;width:92%;text-align:center;padding:20px;">';

    // === Title ===
    html += `<div style="margin-bottom:24px;">`;
    html += `<div style="font-size:48px;margin-bottom:8px;">🀄🃏</div>`;
    html += `<h1 style="color:#e8b830;font-size:32px;margin:0;letter-spacing:2px;">Table Game Simulator</h1>`;
    html += `<div style="color:#a8c4b0;font-size:14px;margin-top:6px;">Mahjong &bull; Poker &bull; More coming soon</div>`;
    html += `</div>`;

    // === Welcome / Profile ===
    if (isReturning) {
      html += `<div style="background:rgba(232,184,48,0.08);border:1px solid rgba(232,184,48,0.2);border-radius:12px;padding:14px 20px;margin-bottom:20px;text-align:left;">`;
      html += `<div style="font-size:15px;color:#e8b830;margin-bottom:4px;">${timeGreeting}${welcomeBack ? ' ' + welcomeBack : ''}</div>`;
      html += `<div style="display:flex;justify-content:space-between;align-items:center;">`;
      html += `<div>`;
      html += `<div style="font-size:18px;font-weight:bold;color:#e0e0e0;">${rep.title}</div>`;
      html += `<div style="font-size:12px;color:#a8c4b0;">Level ${rep.level} &bull; ${rep.totalGames} games &bull; ${rep.winRate} win rate</div>`;
      html += `</div>`;
      html += `<div style="text-align:right;">`;
      html += `<div style="font-size:20px;color:#e8b830;font-weight:bold;">${rep.coins || 0} 🪙</div>`;
      if (rep.currentStreak > 0) html += `<div style="font-size:11px;color:#4ade80;">${rep.currentStreak} win streak 🔥</div>`;
      html += `</div></div></div>`;
    } else {
      html += `<div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:16px 20px;margin-bottom:20px;">`;
      html += `<div style="font-size:16px;color:#e8b830;margin-bottom:6px;">Welcome to the Table!</div>`;
      html += `<div style="font-size:13px;color:#a8c4b0;">Play classic table games with AI companions who remember you, learn your style, and have their own personalities and stories.</div>`;
      html += `</div>`;
    }

    // === Active Events ===
    if (events.length > 0) {
      html += `<div style="margin-bottom:16px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">`;
      for (const ev of events) {
        html += `<span style="padding:4px 12px;background:rgba(232,184,48,0.1);border:1px solid rgba(232,184,48,0.2);border-radius:20px;font-size:12px;color:#e8b830;">${ev.icon} ${ev.name}</span>`;
      }
      html += `</div>`;
    }

    // === Game Selection ===
    const lastGame = localStorage.getItem('mj_last_game') || 'mahjong';
    html += `<div style="font-size:12px;color:#888;margin-bottom:8px;text-align:left;">Choose your game:</div>`;
    html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">`;

    // Mahjong card
    html += buildGameCard('mahjong', '🀄', 'Mahjong', 'Classic Chinese tile game', '#1a5c32', true, rep, lastGame === 'mahjong', [
      { label: 'Players', value: '4' },
      { label: 'Type', value: 'Tile Game' },
      { label: 'AI', value: 'Learning' }
    ]);

    // Poker card
    html += buildGameCard('poker', '🃏', 'Texas Hold\'em', 'Poker with AI opponents', '#5c1a1a', true, rep, lastGame === 'poker', [
      { label: 'Players', value: '4' },
      { label: 'Type', value: 'Card Game' },
      { label: 'AI', value: 'Learning v2' }
    ]);

    // Coming soon cards
    html += buildGameCard('blackjack', '🂡', 'Blackjack', 'Beat the dealer to 21', '#1a3a5c', true, rep, lastGame === 'blackjack', [
      { label: 'Players', value: '4 vs Dealer' },
      { label: 'Type', value: 'Card Game' },
      { label: 'AI', value: 'Basic Strategy' }
    ]);
    html += buildGameCard('dominoes', '🁣', 'Dominoes', 'Classic tile matching game', '#3a1a5c', true, rep, lastGame === 'dominoes', [
      { label: 'Players', value: '4' },
      { label: 'Type', value: 'Tile Game' },
      { label: 'AI', value: 'Learning' }
    ]);
    html += buildGameCard('dragon', '🐉', 'Dragon\'s Lair', 'Full AD&D campaign adventure', '#5c1a0a', true, rep, lastGame === 'dragon', [
      { label: 'Party', value: '6 Heroes' },
      { label: 'Type', value: 'RPG Campaign' },
      { label: 'World', value: '8 Locations' }
    ]);

    html += `</div>`;

    // === Quick Resume ===
    if (isReturning) {
      html += `<div style="text-align:center;margin-bottom:16px;">`;
      html += `<button class="game-card" data-game="${lastGame}" style="background:rgba(232,184,48,0.1);border:1px solid rgba(232,184,48,0.3);padding:10px 30px;display:inline-block;">`;
      html += `<span style="color:#e8b830;font-weight:bold;">▶ Continue ${lastGame === 'poker' ? 'Poker' : 'Mahjong'}</span>`;
      html += `</button>`;
      html += `</div>`;
    }

    // === Bottom buttons ===
    html += `<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">`;
    html += `<button class="intro-btn" data-action="settings">⚙ Settings</button>`;
    html += `<button class="intro-btn" data-action="docs">📖 Documentation</button>`;
    html += `<button class="intro-btn" data-action="achievements">🏆 Achievements</button>`;
    if (isReturning) {
      html += `<button class="intro-btn" data-action="house">🏠 My Room</button>`;
      html += `<button class="intro-btn" data-action="leaderboard">📊 Leaderboard</button>`;
    }
    html += `</div>`;

    // === Characters at bottom ===
    html += `<div style="margin-top:24px;display:flex;gap:16px;justify-content:center;">`;
    const characters = [
      { name: 'Mei', avatar: '👩', quote: 'The tiles tell a story.' },
      { name: 'Kenji', avatar: '👨', quote: 'Let\'s GO!' },
      { name: 'Yuki', avatar: '👵', quote: 'In every hand, a lesson.' }
    ];
    for (const c of characters) {
      html += `<div style="text-align:center;opacity:0.7;">`;
      html += `<div style="font-size:28px;">${c.avatar}</div>`;
      html += `<div style="font-size:11px;color:#a8c4b0;">${c.name}</div>`;
      html += `<div style="font-size:10px;color:#666;font-style:italic;">"${c.quote}"</div>`;
      html += `</div>`;
    }
    html += `</div>`;

    // === Version ===
    html += `<div style="margin-top:16px;font-size:10px;color:#444;">v8.0 &bull; ${isReturning ? rep.totalGames + ' games played' : 'First time? Start with Mahjong!'}</div>`;

    html += '</div>';
    overlay.innerHTML = html;

    // Inject button styles
    const style = document.createElement('style');
    style.textContent = `
      .intro-btn { padding:8px 16px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); border-radius:8px; color:#e0e0e0; font-size:13px; cursor:pointer; transition:all 0.15s; }
      .intro-btn:hover { background:rgba(255,255,255,0.15); border-color:rgba(255,255,255,0.3); }
      .game-card { border-radius:14px; padding:20px; cursor:pointer; transition:all 0.2s; border:2px solid transparent; text-align:center; }
      .game-card:hover { transform:translateY(-3px); border-color:#e8b830; }
      .game-card.locked { opacity:0.5; cursor:not-allowed; }
      .game-card.locked:hover { transform:none; border-color:transparent; }
    `;
    overlay.appendChild(style);
    document.body.appendChild(overlay);

    // Wire click handlers
    overlay.querySelectorAll('.game-card:not(.locked)').forEach(card => {
      card.addEventListener('click', () => {
        const gameId = card.dataset.game;
        hide();
        if (onGameSelect) onGameSelect(gameId);
      });
    });

    overlay.querySelectorAll('.intro-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (action === 'settings') { hide(); document.getElementById('settings-panel')?.classList.remove('hidden'); }
        if (action === 'docs' && window.MJ.DocViewer) { hide(); window.MJ.DocViewer.show(); }
        if (action === 'achievements' && window.MJ.Achievements) {
          hide();
          if (window.MJ.Achievements.getAll) {
            const all = window.MJ.Achievements.getAll();
            const achOverlay = document.createElement('div');
            achOverlay.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;';
            const achPanel = document.createElement('div');
            achPanel.style.cssText = 'background:#1a2a1a;color:#e0e0e0;border-radius:12px;padding:24px;max-width:500px;width:90%;max-height:80vh;overflow-y:auto;';
            let achHtml = '<h2 style="margin:0 0 16px;color:#e8b830;">Achievements</h2>';
            if (all && all.length > 0) {
              for (const a of all) {
                achHtml += `<div style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.1);">${a.icon || ''} <strong>${a.name}</strong>${a.unlocked ? ' ✓' : ''}<div style="font-size:12px;color:#aaa;">${a.description || ''}</div></div>`;
              }
            } else {
              achHtml += '<div style="color:#888;">No achievements yet. Keep playing!</div>';
            }
            achHtml += '<button style="margin-top:16px;padding:8px 24px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:8px;color:#e0e0e0;cursor:pointer;" id="ach-close">Close</button>';
            achPanel.innerHTML = achHtml;
            achOverlay.appendChild(achPanel);
            document.body.appendChild(achOverlay);
            achPanel.querySelector('#ach-close').addEventListener('click', () => achOverlay.remove());
            achOverlay.addEventListener('click', (e) => { if (e.target === achOverlay) achOverlay.remove(); });
          }
        }
        if (action === 'house' && window.MJ.PlayerHouse) {
          hide();
          const ph = typeof window.MJ.PlayerHouse === 'function' ? new window.MJ.PlayerHouse() : window.MJ.PlayerHouse;
          if (ph.buildHouseUI) document.body.appendChild(ph.buildHouseUI());
        }
        if (action === 'leaderboard' && window.MJ.Leaderboards) {
          hide();
          const lb = typeof window.MJ.Leaderboards === 'function' ? new window.MJ.Leaderboards() :
            (window.MJ.Leaderboards.LeaderboardManager ? new window.MJ.Leaderboards.LeaderboardManager() : window.MJ.Leaderboards);
          if (lb.buildLeaderboardUI) document.body.appendChild(lb.buildLeaderboardUI());
        }
      });
    });
  }

  function buildGameCard(id, icon, name, desc, bgColor, unlocked, rep, isLastPlayed, features) {
    const lockClass = unlocked ? '' : ' locked';
    const lockIcon = unlocked ? '' : '<div style="font-size:20px;margin-top:6px;">🔒</div>';
    const stats = getGameStats(id, rep);
    const lastBadge = isLastPlayed ? '<div style="position:absolute;top:8px;right:10px;font-size:10px;color:#e8b830;background:rgba(232,184,48,0.15);padding:2px 8px;border-radius:10px;">Last played</div>' : '';
    const featureHtml = (features || []).map(f =>
      `<span style="font-size:10px;color:#aaa;background:rgba(255,255,255,0.06);padding:2px 6px;border-radius:4px;">${f.label}: ${f.value}</span>`
    ).join(' ');

    return `
      <div class="game-card${lockClass}" data-game="${id}" style="background:linear-gradient(135deg, ${bgColor} 0%, ${bgColor}88 100%);position:relative;">
        ${lastBadge}
        <div style="font-size:36px;margin-bottom:6px;">${icon}</div>
        <div style="font-size:18px;font-weight:bold;color:#e8b830;">${name}</div>
        <div style="font-size:12px;color:#c0c0c0;margin-top:4px;">${desc}</div>
        ${stats ? `<div style="font-size:11px;color:#4ade80;margin-top:6px;">${stats}</div>` : ''}
        ${featureHtml ? `<div style="margin-top:6px;display:flex;gap:4px;justify-content:center;flex-wrap:wrap;">${featureHtml}</div>` : ''}
        ${lockIcon}
      </div>
    `;
  }

  function getGameStats(gameId, rep) {
    if (gameId === 'mahjong') {
      if (!rep || rep.totalGames === 0) return '';
      const wr = rep.winRate || '0%';
      return `${rep.totalGames} games &bull; ${wr} wins`;
    }
    if (gameId === 'poker') {
      try {
        const d = JSON.parse(localStorage.getItem('mj_poker_learning'));
        if (d && d.cumulativeStats && d.cumulativeStats.totalHands > 0) {
          const cs = d.cumulativeStats;
          const wr = cs.totalHands > 0 ? ((cs.totalWins / cs.totalHands) * 100).toFixed(0) + '%' : '0%';
          const profit = cs.totalProfit >= 0 ? `+${cs.totalProfit}` : `${cs.totalProfit}`;
          return `${cs.totalHands} hands &bull; ${wr} wins &bull; ${profit} chips`;
        }
      } catch(e) {}
      return 'New — try it!';
    }
    return '';
  }

  function getReputation() {
    try {
      const d = JSON.parse(localStorage.getItem('mj_reputation'));
      if (d) return d;
    } catch(e) {}
    return { level: 1, title: 'Novice', totalGames: 0, winRate: '0%', currentStreak: 0, coins: 0 };
  }

  function getTimeGreeting() {
    const h = new Date().getHours();
    if (h < 6) return 'Burning the midnight oil?';
    if (h < 12) return 'Good morning!';
    if (h < 17) return 'Good afternoon!';
    if (h < 21) return 'Good evening!';
    return 'Late night session!';
  }

  function getWelcomeBack(rep) {
    try {
      const last = parseInt(localStorage.getItem('mj_last_played') || '0');
      if (!last) return '';
      const hours = (Date.now() - last) / 3600000;
      const lastGame = localStorage.getItem('mj_last_game') || 'mahjong';
      const gameName = lastGame === 'poker' ? 'cards' : 'tiles';
      if (hours > 72) return `It's been a while — the ${gameName} missed you.`;
      if (hours > 24) return 'Welcome back!';
      return '';
    } catch(e) { return ''; }
  }

  function getActiveEvents() {
    if (window.MJ.LivingWorld) {
      try {
        const wm = new window.MJ.LivingWorld.WorldManager();
        return wm.events.getActiveEvents();
      } catch(e) {}
    }
    // Fallback: basic time events
    const events = [];
    const now = new Date();
    if (now.getDay() === 5 && now.getHours() >= 18) events.push({ icon: '🌙', name: 'Friday Night Mahjong' });
    const month = now.getMonth();
    if (month >= 2 && month <= 4) events.push({ icon: '🌸', name: 'Cherry Blossom Season' });
    if (month >= 11 || month <= 1) events.push({ icon: '🎍', name: 'New Year Mahjong' });
    return events;
  }

  function hide() {
    if (overlay) { overlay.remove(); overlay = null; }
  }

  function isShowing() { return !!overlay; }

  window.MJ.IntroScreen = Object.freeze({ show, hide, isShowing });
  console.log('[Mahjong] IntroScreen module loaded');
})();
