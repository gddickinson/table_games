/**
 * stats-dashboard.js — Comprehensive cross-game statistics dashboard
 *
 * Provides a full-screen overlay with tabbed views covering Overview, Mahjong,
 * Poker, Characters, and Progression stats.  Pulls data from all localStorage
 * sources, renders CSS bar-charts / SVG progress circles, and offers a
 * shareable stats-card generator plus storage-audit utilities.
 */
(function (exports) {
  'use strict';
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  function pct(n, d) {
    if (!d) return 0;
    return Math.round((n / d) * 100);
  }

  function fmtNum(n) {
    return (n || 0).toLocaleString();
  }

  /** Build an SVG progress-circle element (0-100). */
  function progressCircle(value, size, color, label) {
    size = size || 80;
    color = color || '#4fc3f7';
    const r = (size - 8) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ * (1 - Math.min(value, 100) / 100);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('class', 'sd-progress-circle');
    svg.innerHTML =
      `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#333" stroke-width="6"/>` +
      `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="6" ` +
      `stroke-dasharray="${circ}" stroke-dashoffset="${offset}" stroke-linecap="round" ` +
      `transform="rotate(-90 ${size / 2} ${size / 2})"/>` +
      `<text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle" ` +
      `fill="#eee" font-size="${size * 0.22}px" font-family="sans-serif">${Math.round(value)}%</text>`;
    const wrap = el('div', 'sd-circle-wrap');
    wrap.appendChild(svg);
    if (label) {
      const lbl = el('div', 'sd-circle-label', label);
      wrap.appendChild(lbl);
    }
    return wrap;
  }

  /** CSS-based horizontal bar. value 0-100. */
  function barChart(items) {
    const wrap = el('div', 'sd-bar-chart');
    const max = items.reduce((m, i) => Math.max(m, i.value), 0) || 1;
    items.forEach(function (item) {
      const row = el('div', 'sd-bar-row');
      row.innerHTML =
        `<span class="sd-bar-label">${item.label}</span>` +
        `<span class="sd-bar-track"><span class="sd-bar-fill" style="width:${pct(item.value, max)}%;background:${item.color || '#4fc3f7'}"></span></span>` +
        `<span class="sd-bar-value">${fmtNum(item.value)}</span>`;
      wrap.appendChild(row);
    });
    return wrap;
  }

  /** Simple CSS pie chart (up to 6 slices). */
  function pieChart(slices, size) {
    size = size || 120;
    let gradient = '';
    let cumulative = 0;
    const colors = ['#4fc3f7', '#81c784', '#ffb74d', '#e57373', '#ba68c8', '#4dd0e1'];
    slices.forEach(function (s, i) {
      const start = cumulative;
      cumulative += s.pct;
      const c = s.color || colors[i % colors.length];
      gradient += `${c} ${start}% ${cumulative}%,`;
    });
    gradient = gradient.replace(/,$/, '');
    const pie = el('div', 'sd-pie');
    pie.style.width = size + 'px';
    pie.style.height = size + 'px';
    pie.style.borderRadius = '50%';
    pie.style.background = `conic-gradient(${gradient})`;
    const wrap = el('div', 'sd-pie-wrap');
    wrap.appendChild(pie);
    const legend = el('div', 'sd-pie-legend');
    slices.forEach(function (s, i) {
      const c = s.color || colors[i % colors.length];
      legend.innerHTML += `<span class="sd-legend-item"><span class="sd-legend-dot" style="background:${c}"></span>${s.label} (${Math.round(s.pct)}%)</span>`;
    });
    wrap.appendChild(legend);
    return wrap;
  }

  function stat(label, value) {
    const d = el('div', 'sd-stat');
    d.innerHTML = `<div class="sd-stat-val">${value}</div><div class="sd-stat-lbl">${label}</div>`;
    return d;
  }

  // -------------------------------------------------------------------------
  // StatsDashboard
  // -------------------------------------------------------------------------

  const TABS = ['Overview', 'Mahjong', 'Poker', 'Characters', 'Progression'];

  class StatsDashboard {
    constructor() {
      this.overlay = null;
      this.currentTab = 'Overview';
    }

    // --- Data gathering ---------------------------------------------------

    gatherStats() {
      const stats = {};
      const get = function (key) {
        try { return JSON.parse(localStorage.getItem(key)) || {}; } catch (e) { return {}; }
      };
      stats.reputation = get('mj_reputation');
      stats.poker = get('mj_poker_learning');
      stats.achievements = get('mj_achievements');
      stats.economy = get('mj_economy');
      stats.campaigns = get('mj_campaigns');
      stats.gameStats = get('mj_game_stats');
      stats.pokerStats = get('mj_poker_stats');
      stats.dailyChallenges = get('mj_daily_challenges');

      try { stats.handHistory = JSON.parse(localStorage.getItem('mj_hand_history')) || []; } catch (e) { stats.handHistory = []; }

      var characterIds = ['mei', 'kenji', 'yuki'];
      stats.characters = {};
      characterIds.forEach(function (id) {
        stats.characters[id] = {
          memory: get('mj_memory_' + id),
          growth: get('mj_growth_' + id),
          relationship: get('mj_relationship_' + id)
        };
      });

      return stats;
    }

    // --- Storage audit ----------------------------------------------------

    getStorageUsage() {
      var totalSize = 0;
      var items = [];
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        var value = localStorage.getItem(key);
        var size = (key.length + value.length) * 2; // approximate bytes (UTF-16)
        totalSize += size;
        if (key.startsWith('mj_')) {
          items.push({ key: key, size: size, sizeKB: (size / 1024).toFixed(1) });
        }
      }
      items.sort(function (a, b) { return b.size - a.size; });
      return { totalBytes: totalSize, totalKB: (totalSize / 1024).toFixed(1), items: items };
    }

    cleanupOldData() {
      var removed = { handHistory: 0, memories: 0, opponents: 0, challenges: 0 };
      var now = Date.now();
      var thirtyDays = 30 * 24 * 60 * 60 * 1000;

      // Remove hand history entries older than 30 days
      try {
        var history = JSON.parse(localStorage.getItem('mj_hand_history')) || [];
        var before = history.length;
        history = history.filter(function (h) {
          return h.timestamp && (now - h.timestamp) < thirtyDays;
        });
        removed.handHistory = before - history.length;
        localStorage.setItem('mj_hand_history', JSON.stringify(history));
      } catch (e) { /* ignore */ }

      // Trim episode memories to last 100 per character
      ['mei', 'kenji', 'yuki'].forEach(function (id) {
        var key = 'mj_memory_' + id;
        try {
          var mem = JSON.parse(localStorage.getItem(key));
          if (mem && Array.isArray(mem.episodes) && mem.episodes.length > 100) {
            removed.memories += mem.episodes.length - 100;
            mem.episodes = mem.episodes.slice(-100);
            localStorage.setItem(key, JSON.stringify(mem));
          }
        } catch (e) { /* ignore */ }
      });

      // Compress opponent profiles to last 50 entries
      try {
        var profiles = JSON.parse(localStorage.getItem('mj_opponent_profiles'));
        if (profiles && typeof profiles === 'object') {
          Object.keys(profiles).forEach(function (pid) {
            var p = profiles[pid];
            if (Array.isArray(p.history) && p.history.length > 50) {
              removed.opponents += p.history.length - 50;
              p.history = p.history.slice(-50);
            }
          });
          localStorage.setItem('mj_opponent_profiles', JSON.stringify(profiles));
        }
      } catch (e) { /* ignore */ }

      // Remove expired daily challenges
      try {
        var challenges = JSON.parse(localStorage.getItem('mj_daily_challenges'));
        if (challenges && Array.isArray(challenges.history)) {
          var before2 = challenges.history.length;
          challenges.history = challenges.history.filter(function (c) {
            return c.date && (now - new Date(c.date).getTime()) < thirtyDays;
          });
          removed.challenges = before2 - challenges.history.length;
          localStorage.setItem('mj_daily_challenges', JSON.stringify(challenges));
        }
      } catch (e) { /* ignore */ }

      return removed;
    }

    // --- UI building ------------------------------------------------------

    buildDashboardUI() {
      if (this.overlay) this.overlay.remove();

      var stats = this.gatherStats();
      var self = this;

      // Overlay
      var overlay = el('div', 'sd-overlay');
      overlay.innerHTML = '<style>' + StatsDashboard.CSS + '</style>';
      this.overlay = overlay;

      // Header
      var header = el('div', 'sd-header');
      header.innerHTML = '<h2 class="sd-title">Stats Dashboard</h2>';
      var closeBtn = el('button', 'sd-close', '&times;');
      closeBtn.onclick = function () { self.close(); };
      header.appendChild(closeBtn);
      overlay.appendChild(header);

      // Tabs
      var tabBar = el('div', 'sd-tabs');
      TABS.forEach(function (t) {
        var btn = el('button', 'sd-tab' + (t === self.currentTab ? ' sd-tab-active' : ''), t);
        btn.onclick = function () { self.currentTab = t; self.buildDashboardUI(); };
        tabBar.appendChild(btn);
      });
      overlay.appendChild(tabBar);

      // Content
      var content = el('div', 'sd-content');
      switch (self.currentTab) {
        case 'Overview':    self._buildOverview(content, stats); break;
        case 'Mahjong':     self._buildMahjong(content, stats); break;
        case 'Poker':       self._buildPoker(content, stats); break;
        case 'Characters':  self._buildCharacters(content, stats); break;
        case 'Progression': self._buildProgression(content, stats); break;
      }
      overlay.appendChild(content);

      document.body.appendChild(overlay);
    }

    _buildOverview(container, stats) {
      var rep = stats.reputation || {};
      var eco = stats.economy || {};
      var ach = stats.achievements || {};
      var gs = stats.gameStats || {};

      var totalGames = (gs.mahjongPlayed || 0) + (gs.pokerPlayed || 0);
      var estPlaytime = Math.round(totalGames * 8); // ~8 min average

      var grid = el('div', 'sd-stat-grid');
      grid.appendChild(stat('Total Games', fmtNum(totalGames)));
      grid.appendChild(stat('Est. Playtime', estPlaytime + ' min'));
      grid.appendChild(stat('Overall Win Rate', pct(gs.wins || 0, totalGames || 1) + '%'));
      grid.appendChild(stat('Current Level', rep.level || 1));
      grid.appendChild(stat('Coins', fmtNum(eco.coins || 0)));
      grid.appendChild(stat('Active Streak', fmtNum(rep.streak || 0)));
      container.appendChild(grid);

      // XP bar
      var xp = rep.xp || 0;
      var xpNext = rep.xpNext || 100;
      var xpBar = el('div', 'sd-xp-section');
      xpBar.innerHTML =
        `<div class="sd-xp-label">XP: ${fmtNum(xp)} / ${fmtNum(xpNext)}</div>` +
        `<div class="sd-xp-track"><div class="sd-xp-fill" style="width:${pct(xp, xpNext)}%"></div></div>`;
      container.appendChild(xpBar);

      // Games pie chart
      if (totalGames > 0) {
        var mjPct = pct(gs.mahjongPlayed || 0, totalGames);
        container.appendChild(el('h3', 'sd-section-title', 'Games by Type'));
        container.appendChild(pieChart([
          { label: 'Mahjong', pct: mjPct, color: '#4fc3f7' },
          { label: 'Poker', pct: 100 - mjPct, color: '#81c784' }
        ]));
      }

      // Achievements progress circle
      var achTotal = ach.total || 0;
      var achUnlocked = ach.unlocked || 0;
      container.appendChild(el('h3', 'sd-section-title', 'Achievements'));
      container.appendChild(progressCircle(pct(achUnlocked, achTotal || 1), 100, '#ffb74d',
        achUnlocked + ' / ' + achTotal + ' unlocked'));
    }

    _buildMahjong(container, stats) {
      var gs = stats.gameStats || {};
      var hh = stats.handHistory || [];

      var grid = el('div', 'sd-stat-grid');
      grid.appendChild(stat('Games Played', fmtNum(gs.mahjongPlayed || 0)));
      grid.appendChild(stat('Rounds Won', fmtNum(gs.roundsWon || 0)));
      grid.appendChild(stat('Draw Rate', pct(gs.draws || 0, gs.mahjongPlayed || 1) + '%'));
      grid.appendChild(stat('Avg Score / Win', fmtNum(gs.avgWinScore || 0)));
      grid.appendChild(stat('Deal-in Rate', pct(gs.dealIns || 0, gs.mahjongPlayed || 1) + '%'));
      grid.appendChild(stat('Tsumo / Ron', (gs.tsumoWins || 0) + ' / ' + (gs.ronWins || 0)));
      container.appendChild(grid);

      // Self-draw vs claim circles
      var totalWins = (gs.tsumoWins || 0) + (gs.ronWins || 0);
      if (totalWins > 0) {
        container.appendChild(el('h3', 'sd-section-title', 'Win Type Ratio'));
        var circles = el('div', 'sd-circle-row');
        circles.appendChild(progressCircle(pct(gs.tsumoWins || 0, totalWins), 80, '#81c784', 'Self-draw'));
        circles.appendChild(progressCircle(pct(gs.ronWins || 0, totalWins), 80, '#e57373', 'Claim'));
        container.appendChild(circles);
      }

      // Favorite scoring patterns
      var patterns = gs.scoringPatterns || {};
      var patternItems = Object.keys(patterns).map(function (k) {
        return { label: k, value: patterns[k], color: '#4fc3f7' };
      }).sort(function (a, b) { return b.value - a.value; }).slice(0, 8);
      if (patternItems.length) {
        container.appendChild(el('h3', 'sd-section-title', 'Favorite Scoring Patterns'));
        container.appendChild(barChart(patternItems));
      }

      // Best hand
      if (hh.length) {
        var best = hh.reduce(function (b, h) { return (h.score || 0) > (b.score || 0) ? h : b; }, hh[0]);
        if (best && best.score) {
          container.appendChild(el('h3', 'sd-section-title', 'Best Hand'));
          container.appendChild(el('div', 'sd-best-hand',
            (best.name || 'Hand') + ' &mdash; ' + fmtNum(best.score) + ' pts'));
        }
      }
    }

    _buildPoker(container, stats) {
      var ps = stats.pokerStats || {};
      var pl = stats.poker || {};

      var grid = el('div', 'sd-stat-grid');
      grid.appendChild(stat('Hands Played', fmtNum(ps.handsPlayed || 0)));
      grid.appendChild(stat('Win Rate', pct(ps.wins || 0, ps.handsPlayed || 1) + '%'));
      grid.appendChild(stat('Total Profit', fmtNum(ps.totalProfit || 0)));
      grid.appendChild(stat('Biggest Pot Won', fmtNum(ps.biggestPot || 0)));
      grid.appendChild(stat('Bluff Success', pct(ps.bluffWins || 0, ps.bluffAttempts || 1) + '%'));
      grid.appendChild(stat('Showdown Win %', pct(ps.showdownWins || 0, ps.showdowns || 1) + '%'));
      container.appendChild(grid);

      // VPIP & PFR
      if (ps.vpipHands || ps.pfrHands) {
        container.appendChild(el('h3', 'sd-section-title', 'Play Style'));
        var circles = el('div', 'sd-circle-row');
        circles.appendChild(progressCircle(pct(ps.vpipHands || 0, ps.handsPlayed || 1), 80, '#4fc3f7', 'VPIP'));
        circles.appendChild(progressCircle(pct(ps.pfrHands || 0, ps.handsPlayed || 1), 80, '#ba68c8', 'PFR'));
        container.appendChild(circles);
      }

      // AI learning info
      if (pl.epoch || pl.weightChanges) {
        container.appendChild(el('h3', 'sd-section-title', 'AI Learning'));
        var aiGrid = el('div', 'sd-stat-grid');
        aiGrid.appendChild(stat('Epoch', fmtNum(pl.epoch || 0)));
        aiGrid.appendChild(stat('Weight Changes', fmtNum(pl.weightChanges || 0)));
        container.appendChild(aiGrid);
      }
    }

    _buildCharacters(container, stats) {
      var chars = stats.characters || {};
      var ids = Object.keys(chars);
      if (!ids.length) {
        container.appendChild(el('div', 'sd-empty', 'No character data yet.'));
        return;
      }

      ids.forEach(function (id) {
        var c = chars[id] || {};
        var rel = c.relationship || {};
        var mem = c.memory || {};
        var growth = c.growth || {};

        var section = el('div', 'sd-char-section');
        section.innerHTML = '<h3 class="sd-char-name">' + id.charAt(0).toUpperCase() + id.slice(1) + '</h3>';

        // Relationship bar
        var level = rel.level || 0;
        var maxLevel = 10;
        section.innerHTML +=
          `<div class="sd-rel-label">Relationship: ${level} / ${maxLevel}</div>` +
          `<div class="sd-xp-track"><div class="sd-xp-fill" style="width:${pct(level, maxLevel)}%;background:#ba68c8"></div></div>`;

        // Mini stats
        var mini = el('div', 'sd-stat-grid sd-stat-grid-sm');
        mini.appendChild(stat('Games Together', fmtNum(rel.gamesPlayed || 0)));
        mini.appendChild(stat('Milestones', fmtNum(growth.milestones || 0)));
        section.appendChild(mini);

        // Favorite quote
        if (mem.favoriteQuote) {
          section.innerHTML += `<div class="sd-quote">"${mem.favoriteQuote}"</div>`;
        }

        container.appendChild(section);
      });
    }

    _buildProgression(container, stats) {
      var rep = stats.reputation || {};
      var ach = stats.achievements || {};
      var camp = stats.campaigns || {};
      var eco = stats.economy || {};
      var gs = stats.gameStats || {};

      // Level / XP summary
      var grid = el('div', 'sd-stat-grid');
      grid.appendChild(stat('Level', rep.level || 1));
      grid.appendChild(stat('Total XP', fmtNum(rep.totalXp || 0)));
      grid.appendChild(stat('Campaign Progress', pct(camp.completed || 0, camp.total || 1) + '%'));
      grid.appendChild(stat('Quests Done', fmtNum(camp.questsCompleted || 0)));
      grid.appendChild(stat('Venues Unlocked', fmtNum(gs.venuesUnlocked || 0)));
      grid.appendChild(stat('Items Purchased', fmtNum(eco.itemsPurchased || 0)));
      container.appendChild(grid);

      // Achievements grid
      var achList = ach.list || [];
      if (achList.length) {
        container.appendChild(el('h3', 'sd-section-title', 'Achievements'));
        var achGrid = el('div', 'sd-ach-grid');
        achList.forEach(function (a) {
          var card = el('div', 'sd-ach-card' + (a.unlocked ? ' sd-ach-unlocked' : ''));
          card.innerHTML =
            `<div class="sd-ach-icon">${a.icon || '🏆'}</div>` +
            `<div class="sd-ach-name">${a.name || '???'}</div>`;
          achGrid.appendChild(card);
        });
        container.appendChild(achGrid);
      }

      // Storage audit
      container.appendChild(el('h3', 'sd-section-title', 'Storage Usage'));
      var usage = this.getStorageUsage();
      container.appendChild(el('div', 'sd-storage-total', 'Total: ' + usage.totalKB + ' KB'));
      if (usage.items.length) {
        var table = el('table', 'sd-storage-table');
        table.innerHTML = '<tr><th>Key</th><th>Size (KB)</th></tr>';
        usage.items.slice(0, 15).forEach(function (item) {
          table.innerHTML += '<tr><td>' + item.key + '</td><td>' + item.sizeKB + '</td></tr>';
        });
        container.appendChild(table);
      }

      var cleanBtn = el('button', 'sd-btn', 'Cleanup Old Data');
      var self = this;
      cleanBtn.onclick = function () {
        var result = self.cleanupOldData();
        var msg = 'Removed: ' + result.handHistory + ' hands, ' +
          result.memories + ' memories, ' + result.opponents + ' opponent entries, ' +
          result.challenges + ' challenges.';
        alert(msg);
        self.buildDashboardUI();
      };
      container.appendChild(cleanBtn);
    }

    // --- Share card -------------------------------------------------------

    buildShareCard(stats) {
      stats = stats || this.gatherStats();
      var rep = stats.reputation || {};
      var gs = stats.gameStats || {};
      var ach = stats.achievements || {};
      var totalGames = (gs.mahjongPlayed || 0) + (gs.pokerPlayed || 0);

      var card = el('div', 'sd-share-card');
      card.innerHTML =
        '<div class="sd-share-header">Mahjong Stats</div>' +
        '<div class="sd-share-grid">' +
          '<div class="sd-share-item"><strong>' + fmtNum(totalGames) + '</strong><br>Games</div>' +
          '<div class="sd-share-item"><strong>Lv ' + (rep.level || 1) + '</strong><br>Level</div>' +
          '<div class="sd-share-item"><strong>' + pct(gs.wins || 0, totalGames || 1) + '%</strong><br>Win Rate</div>' +
          '<div class="sd-share-item"><strong>' + (ach.unlocked || 0) + '</strong><br>Achievements</div>' +
        '</div>' +
        '<div class="sd-share-footer">mahjong-ai</div>';
      return card;
    }

    // --- Open / Close -----------------------------------------------------

    open() { this.buildDashboardUI(); }
    close() { if (this.overlay) { this.overlay.remove(); this.overlay = null; } }
  }

  // -------------------------------------------------------------------------
  // Embedded CSS
  // -------------------------------------------------------------------------

  StatsDashboard.CSS = [
    '.sd-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.92);z-index:10000;overflow-y:auto;color:#eee;font-family:sans-serif;}',
    '.sd-header{display:flex;justify-content:space-between;align-items:center;padding:16px 24px;border-bottom:1px solid #333;}',
    '.sd-title{margin:0;font-size:1.4em;}',
    '.sd-close{background:none;border:none;color:#eee;font-size:2em;cursor:pointer;line-height:1;}',
    '.sd-tabs{display:flex;gap:4px;padding:8px 24px;border-bottom:1px solid #222;flex-wrap:wrap;}',
    '.sd-tab{background:#222;border:1px solid #444;color:#ccc;padding:8px 16px;border-radius:6px 6px 0 0;cursor:pointer;font-size:.9em;}',
    '.sd-tab-active{background:#333;color:#fff;border-bottom-color:#333;}',
    '.sd-content{padding:24px;max-width:800px;margin:0 auto;}',
    '.sd-stat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:12px;margin-bottom:20px;}',
    '.sd-stat-grid-sm{grid-template-columns:repeat(auto-fill,minmax(100px,1fr));}',
    '.sd-stat{background:#1a1a2e;border-radius:8px;padding:12px;text-align:center;}',
    '.sd-stat-val{font-size:1.4em;font-weight:bold;color:#4fc3f7;}',
    '.sd-stat-lbl{font-size:.75em;color:#999;margin-top:4px;}',
    '.sd-section-title{font-size:1em;color:#aaa;margin:20px 0 10px;border-bottom:1px solid #333;padding-bottom:4px;}',
    '.sd-xp-section{margin-bottom:20px;}',
    '.sd-xp-label{font-size:.85em;color:#aaa;margin-bottom:4px;}',
    '.sd-xp-track{background:#222;border-radius:6px;height:14px;overflow:hidden;}',
    '.sd-xp-fill{height:100%;background:linear-gradient(90deg,#4fc3f7,#81c784);border-radius:6px;transition:width .4s;}',
    '.sd-circle-row{display:flex;gap:20px;justify-content:center;margin:12px 0;}',
    '.sd-circle-wrap{text-align:center;}',
    '.sd-circle-label{font-size:.7em;color:#999;margin-top:4px;}',
    '.sd-bar-chart{margin-bottom:16px;}',
    '.sd-bar-row{display:flex;align-items:center;margin-bottom:6px;font-size:.8em;}',
    '.sd-bar-label{width:110px;text-align:right;padding-right:8px;color:#aaa;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.sd-bar-track{flex:1;background:#222;border-radius:4px;height:12px;overflow:hidden;}',
    '.sd-bar-fill{height:100%;border-radius:4px;transition:width .4s;}',
    '.sd-bar-value{width:50px;text-align:right;color:#ccc;padding-left:6px;}',
    '.sd-pie-wrap{display:flex;align-items:center;gap:20px;margin:12px 0;}',
    '.sd-pie-legend{display:flex;flex-direction:column;gap:6px;font-size:.8em;}',
    '.sd-legend-item{display:flex;align-items:center;gap:6px;}',
    '.sd-legend-dot{width:10px;height:10px;border-radius:50%;display:inline-block;}',
    '.sd-char-section{background:#1a1a2e;border-radius:8px;padding:16px;margin-bottom:16px;}',
    '.sd-char-name{margin:0 0 8px;color:#4fc3f7;}',
    '.sd-rel-label{font-size:.8em;color:#aaa;margin-bottom:4px;}',
    '.sd-quote{font-style:italic;color:#888;font-size:.85em;margin-top:8px;}',
    '.sd-ach-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:8px;margin-bottom:16px;}',
    '.sd-ach-card{background:#222;border-radius:8px;padding:10px;text-align:center;opacity:.4;}',
    '.sd-ach-unlocked{opacity:1;border:1px solid #ffb74d;}',
    '.sd-ach-icon{font-size:1.6em;}',
    '.sd-ach-name{font-size:.65em;color:#ccc;margin-top:4px;}',
    '.sd-storage-total{font-size:.9em;color:#aaa;margin-bottom:8px;}',
    '.sd-storage-table{width:100%;border-collapse:collapse;font-size:.8em;margin-bottom:16px;}',
    '.sd-storage-table th{text-align:left;color:#999;border-bottom:1px solid #333;padding:4px 8px;}',
    '.sd-storage-table td{padding:4px 8px;border-bottom:1px solid #222;color:#ccc;}',
    '.sd-btn{background:#4fc3f7;color:#000;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-size:.9em;margin-top:10px;}',
    '.sd-btn:hover{background:#81d4fa;}',
    '.sd-empty{color:#666;text-align:center;padding:40px;}',
    '.sd-share-card{background:#1a1a2e;border:2px solid #4fc3f7;border-radius:12px;padding:20px;max-width:320px;text-align:center;font-family:sans-serif;color:#eee;}',
    '.sd-share-header{font-size:1.2em;font-weight:bold;margin-bottom:12px;color:#4fc3f7;}',
    '.sd-share-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;}',
    '.sd-share-item{background:#222;border-radius:6px;padding:8px;}',
    '.sd-share-footer{font-size:.7em;color:#555;}'
  ].join('\n');

  root.MJ.StatsDashboard = StatsDashboard;
})(typeof exports !== 'undefined' ? exports : this);
