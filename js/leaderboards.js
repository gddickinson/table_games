/**
 * leaderboards.js — Local leaderboards with seasonal rankings
 * Tracks weekly, monthly, and all-time high scores with localStorage persistence.
 */
(function (exports) {
  'use strict';
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  const STORAGE_KEY = 'mj_leaderboards';
  const MAX_ENTRIES = 100;
  const PERIODS = ['weekly', 'monthly', 'alltime'];

  const SEASON_NAMES = [
    'Spring', 'Summer', 'Autumn', 'Winter'
  ];

  // ─── LeaderboardManager ───────────────────────────────────────────

  class LeaderboardManager {
    constructor() {
      this.data = { weekly: [], monthly: [], alltime: [] };
      this.overlay = null;
      this._load();
      this._pruneExpired();
    }

    // ── Public API ──────────────────────────────────────────────────

    recordScore(playerName, score, handType) {
      var entry = {
        name: playerName || 'Player',
        score: score,
        handType: handType || 'Unknown',
        date: Date.now()
      };

      PERIODS.forEach(period => {
        this.data[period].push(Object.assign({}, entry));
        this.data[period].sort((a, b) => b.score - a.score);
        if (this.data[period].length > MAX_ENTRIES) {
          this.data[period] = this.data[period].slice(0, MAX_ENTRIES);
        }
      });

      this._save();
      return entry;
    }

    getLeaderboard(period) {
      if (PERIODS.indexOf(period) === -1) period = 'alltime';
      this._pruneExpired();
      return this.data[period].slice();
    }

    getCurrentSeason() {
      var now = new Date();
      var month = now.getMonth();
      var year = now.getFullYear();
      var seasonIdx;

      if (month >= 2 && month <= 4) seasonIdx = 0;      // Spring: Mar-May
      else if (month >= 5 && month <= 7) seasonIdx = 1;  // Summer: Jun-Aug
      else if (month >= 8 && month <= 10) seasonIdx = 2;  // Autumn: Sep-Nov
      else seasonIdx = 3;                                  // Winter: Dec-Feb

      var startMonth, endMonth;
      if (seasonIdx === 0) { startMonth = 2; endMonth = 4; }
      else if (seasonIdx === 1) { startMonth = 5; endMonth = 7; }
      else if (seasonIdx === 2) { startMonth = 8; endMonth = 10; }
      else { startMonth = 11; endMonth = 1; }

      var startYear = seasonIdx === 3 && month <= 1 ? year - 1 : year;
      var endYear = seasonIdx === 3 && month >= 11 ? year + 1 : year;

      return {
        name: SEASON_NAMES[seasonIdx] + ' ' + year,
        index: seasonIdx,
        startDate: new Date(startYear, startMonth, 1).toISOString().slice(0, 10),
        endDate: new Date(endYear, endMonth + 1, 0).toISOString().slice(0, 10)
      };
    }

    getSeasonalStats() {
      var season = this.getCurrentSeason();
      var start = new Date(season.startDate).getTime();
      var end = new Date(season.endDate).getTime() + 86400000;

      var entries = this.data.alltime.filter(e => e.date >= start && e.date < end);
      if (entries.length === 0) {
        return { season: season.name, gamesPlayed: 0, highScore: 0, averageScore: 0, topHand: 'N/A' };
      }

      var total = 0;
      var handCounts = {};
      entries.forEach(e => {
        total += e.score;
        handCounts[e.handType] = (handCounts[e.handType] || 0) + 1;
      });

      var topHand = 'N/A';
      var maxCount = 0;
      Object.keys(handCounts).forEach(h => {
        if (handCounts[h] > maxCount) { maxCount = handCounts[h]; topHand = h; }
      });

      return {
        season: season.name,
        gamesPlayed: entries.length,
        highScore: entries[0].score,
        averageScore: Math.round(total / entries.length),
        topHand: topHand
      };
    }

    getPersonalBests() {
      var bests = {};
      this.data.alltime.forEach(e => {
        if (!bests[e.handType] || e.score > bests[e.handType].score) {
          bests[e.handType] = Object.assign({}, e);
        }
      });
      return bests;
    }

    // ── UI ──────────────────────────────────────────────────────────

    buildLeaderboardUI() {
      if (this.overlay) {
        this._renderTable('weekly');
        this.overlay.style.display = 'flex';
        return this.overlay;
      }

      this.overlay = document.createElement('div');
      Object.assign(this.overlay.style, {
        position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
        backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        zIndex: '10000', fontFamily: 'sans-serif', color: '#eee'
      });

      var container = document.createElement('div');
      Object.assign(container.style, {
        background: '#1a1a2e', borderRadius: '12px', padding: '20px',
        maxWidth: '600px', width: '95%', maxHeight: '90vh', overflowY: 'auto'
      });

      // Title
      var titleBar = document.createElement('div');
      Object.assign(titleBar.style, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' });
      var title = document.createElement('h2');
      title.textContent = 'Leaderboards';
      title.style.margin = '0';
      titleBar.appendChild(title);
      var closeBtn = this._btn('Close', () => { this.overlay.style.display = 'none'; });
      titleBar.appendChild(closeBtn);
      container.appendChild(titleBar);

      // Season info
      var seasonInfo = document.createElement('div');
      seasonInfo.style.marginBottom = '10px';
      seasonInfo.style.fontSize = '13px';
      seasonInfo.style.color = '#aaa';
      var season = this.getCurrentSeason();
      var stats = this.getSeasonalStats();
      seasonInfo.textContent = 'Season: ' + season.name + ' | Games: ' + stats.gamesPlayed + ' | Best: ' + stats.highScore;
      container.appendChild(seasonInfo);

      // Tabs
      var tabBar = document.createElement('div');
      Object.assign(tabBar.style, { display: 'flex', gap: '6px', marginBottom: '12px' });
      PERIODS.forEach(period => {
        var label = period === 'alltime' ? 'All Time' : period.charAt(0).toUpperCase() + period.slice(1);
        var btn = this._btn(label, () => {
          tabBar.querySelectorAll('button').forEach(b => { b.style.borderColor = '#555'; });
          btn.style.borderColor = '#4fc3f7';
          this._renderTable(period);
        });
        if (period === 'weekly') btn.style.borderColor = '#4fc3f7';
        tabBar.appendChild(btn);
      });
      container.appendChild(tabBar);

      // Table container
      this._tableEl = document.createElement('div');
      container.appendChild(this._tableEl);

      this.overlay.appendChild(container);
      document.body.appendChild(this.overlay);
      this._renderTable('weekly');
      return this.overlay;
    }

    _renderTable(period) {
      if (!this._tableEl) return;
      this._tableEl.innerHTML = '';

      var entries = this.getLeaderboard(period);
      if (entries.length === 0) {
        var empty = document.createElement('div');
        empty.style.padding = '20px';
        empty.style.color = '#999';
        empty.style.textAlign = 'center';
        empty.textContent = 'No scores recorded yet.';
        this._tableEl.appendChild(empty);
        return;
      }

      var table = document.createElement('table');
      Object.assign(table.style, { width: '100%', borderCollapse: 'collapse', fontSize: '13px' });

      var thead = document.createElement('thead');
      var headerRow = document.createElement('tr');
      ['Rank', 'Name', 'Score', 'Hand', 'Date'].forEach(h => {
        var th = document.createElement('th');
        th.textContent = h;
        Object.assign(th.style, { textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid #333', color: '#aaa' });
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
      table.appendChild(thead);

      var tbody = document.createElement('tbody');
      var shown = Math.min(entries.length, 50);
      for (var i = 0; i < shown; i++) {
        var e = entries[i];
        var tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #222';

        var rankColors = ['#ffd700', '#c0c0c0', '#cd7f32'];
        var vals = [
          (i + 1).toString(),
          e.name,
          e.score.toLocaleString(),
          e.handType,
          new Date(e.date).toLocaleDateString()
        ];
        vals.forEach((v, ci) => {
          var td = document.createElement('td');
          td.textContent = v;
          Object.assign(td.style, { padding: '6px 8px' });
          if (ci === 0 && i < 3) td.style.color = rankColors[i];
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      this._tableEl.appendChild(table);
    }

    // ── Internal ────────────────────────────────────────────────────

    _pruneExpired() {
      var now = Date.now();
      var d = new Date();

      // Weekly: discard entries before Monday of current week
      var dayOfWeek = d.getDay();
      var daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      var monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - daysSinceMonday);
      monday.setHours(0, 0, 0, 0);
      var weekStart = monday.getTime();
      this.data.weekly = this.data.weekly.filter(e => e.date >= weekStart);

      // Monthly: discard entries before 1st of current month
      var monthStart = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
      this.data.monthly = this.data.monthly.filter(e => e.date >= monthStart);
    }

    _load() {
      try {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          var parsed = JSON.parse(raw);
          this.data.weekly = parsed.weekly || [];
          this.data.monthly = parsed.monthly || [];
          this.data.alltime = parsed.alltime || [];
        }
      } catch (_e) { /* */ }
    }

    _save() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      } catch (_e) { /* */ }
    }

    _btn(label, onClick) {
      var btn = document.createElement('button');
      btn.textContent = label;
      Object.assign(btn.style, {
        padding: '5px 12px', borderRadius: '6px', border: '1px solid #555',
        background: '#16213e', color: '#eee', cursor: 'pointer', fontSize: '12px'
      });
      btn.addEventListener('click', onClick);
      return btn;
    }
  }

  root.MJ.Leaderboards = LeaderboardManager;

})(typeof window !== 'undefined' ? window : global);
