/* profile-card.js — Shareable visual profile card generator
 * Exports: root.MJ.ProfileCard
 */
(function (root) {
  'use strict';

  var MJ = root.MJ = root.MJ || {};

  // ── helpers ──────────────────────────────────────────────────────────
  function el(tag, styles, text) {
    var node = document.createElement(tag);
    if (styles) Object.assign(node.style, styles);
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function stars(count, max) {
    max = max || 5;
    var s = '';
    for (var i = 0; i < max; i++) s += (i < count) ? '\u2605' : '\u2606';
    return s;
  }

  function fmt(n) {
    return (n || 0).toLocaleString();
  }

  // ── ProfileCard ──────────────────────────────────────────────────────
  function ProfileCard() {}

  // Gather stats from every localStorage source we know about
  ProfileCard.prototype.gatherStats = function () {
    var stats = {};

    // Player profile
    var profile = null;
    try { profile = JSON.parse(localStorage.getItem('mj_player_profile')); } catch (_) { /* ignore */ }
    profile = profile || {};
    stats.title = profile.title || 'Apprentice';
    stats.level = profile.level || 1;
    stats.xp = profile.xp || 0;
    stats.xpNext = profile.xpNext || 100;

    // Mahjong stats
    var mjStats = null;
    try { mjStats = JSON.parse(localStorage.getItem('mj_stats')); } catch (_) { /* ignore */ }
    mjStats = mjStats || {};
    stats.mahjongGames = mjStats.gamesPlayed || 0;
    stats.mahjongWins = mjStats.wins || 0;
    stats.mahjongWinRate = stats.mahjongGames
      ? Math.round((stats.mahjongWins / stats.mahjongGames) * 100)
      : 0;
    stats.bestHand = mjStats.bestHand || 'None yet';
    stats.bestHandPts = mjStats.bestHandPts || 0;
    stats.favoritePattern = mjStats.favoritePattern || 'N/A';

    // Poker stats
    var pkStats = null;
    try { pkStats = JSON.parse(localStorage.getItem('mj_poker_stats')); } catch (_) { /* ignore */ }
    pkStats = pkStats || {};
    stats.pokerHands = pkStats.handsPlayed || 0;
    stats.pokerWins = pkStats.wins || 0;
    stats.pokerWinRate = stats.pokerHands
      ? Math.round((stats.pokerWins / stats.pokerHands) * 100)
      : 0;
    stats.pokerProfit = pkStats.totalProfit || 0;
    stats.pokerBestHand = pkStats.bestHand || 'None yet';

    // Relationships
    var rels = null;
    try { rels = JSON.parse(localStorage.getItem('mj_relationships')); } catch (_) { /* ignore */ }
    rels = rels || {};
    stats.relationships = {
      mei:   Math.min(5, Math.max(0, Math.round((rels.mei   || 0) / 20))),
      kenji: Math.min(5, Math.max(0, Math.round((rels.kenji || 0) / 20))),
      yuki:  Math.min(5, Math.max(0, Math.round((rels.yuki  || 0) / 20)))
    };

    // Achievements
    var ach = null;
    try { ach = JSON.parse(localStorage.getItem('mj_achievements')); } catch (_) { /* ignore */ }
    ach = ach || {};
    stats.achievementsUnlocked = ach.unlocked ? ach.unlocked.length : 0;
    stats.achievementsTotal = ach.total || 30;

    // Economy
    var econ = null;
    try { econ = JSON.parse(localStorage.getItem('mj_economy')); } catch (_) { /* ignore */ }
    econ = econ || {};
    stats.coins = econ.coins || 0;

    // Member since
    var meta = null;
    try { meta = JSON.parse(localStorage.getItem('mj_meta')); } catch (_) { /* ignore */ }
    meta = meta || {};
    if (meta.memberSince) {
      var d = new Date(meta.memberSince);
      var months = ['Jan','Feb','Mar','Apr','May','Jun',
                    'Jul','Aug','Sep','Oct','Nov','Dec'];
      stats.memberSince = months[d.getMonth()] + ' ' + d.getFullYear();
    } else {
      stats.memberSince = 'Mar 2026';
    }

    return stats;
  };

  // ── generate(): returns a 600 x 400 DOM element ─────────────────────
  ProfileCard.prototype.generate = function () {
    var stats = this.gatherStats();

    // Root container
    var card = el('div', {
      width: '600px', height: '400px', overflow: 'hidden',
      borderRadius: '12px', fontFamily: "'Segoe UI', Arial, sans-serif",
      color: '#e8dcc8', position: 'relative',
      background: 'linear-gradient(135deg, #0a1a0a 0%, #1a2f1a 50%, #0d1f0d 100%)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.6)', boxSizing: 'border-box'
    });

    // ── Top section ────────────────────────────────────────────────────
    var top = el('div', {
      padding: '16px 24px 12px', background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 100%)'
    });

    var titleRow = el('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center' });
    titleRow.appendChild(el('div', { fontSize: '18px', fontWeight: '700', color: '#c8a84e', letterSpacing: '1px' }, 'Table Game Simulator'));
    titleRow.appendChild(el('div', { fontSize: '11px', color: '#8a8a7a' }, 'Member since ' + stats.memberSince));
    top.appendChild(titleRow);

    var lvlRow = el('div', { marginTop: '6px', fontSize: '14px' });
    lvlRow.appendChild(el('span', { color: '#f0d878', fontWeight: '600' }, stats.title + ' '));
    lvlRow.appendChild(el('span', { color: '#a0a090' }, '(Level ' + stats.level + ')'));
    top.appendChild(lvlRow);

    // XP bar
    var xpOuter = el('div', {
      marginTop: '6px', height: '6px', borderRadius: '3px',
      background: 'rgba(255,255,255,0.1)', overflow: 'hidden'
    });
    var pct = stats.xpNext > 0 ? Math.min(100, Math.round((stats.xp / stats.xpNext) * 100)) : 0;
    var xpInner = el('div', {
      width: pct + '%', height: '100%', borderRadius: '3px',
      background: 'linear-gradient(90deg, #c8a84e, #f0d878)'
    });
    xpOuter.appendChild(xpInner);
    top.appendChild(xpOuter);

    var xpLabel = el('div', { fontSize: '10px', color: '#8a8a7a', marginTop: '2px', textAlign: 'right' },
      fmt(stats.xp) + ' / ' + fmt(stats.xpNext) + ' XP');
    top.appendChild(xpLabel);

    card.appendChild(top);

    // ── Middle section: two columns ────────────────────────────────────
    var mid = el('div', {
      display: 'flex', padding: '8px 24px 8px', gap: '20px'
    });

    function statColumn(icon, title, lines) {
      var col = el('div', {
        flex: '1', background: 'rgba(255,255,255,0.04)', borderRadius: '8px',
        padding: '10px 14px', border: '1px solid rgba(200,168,78,0.15)'
      });
      var hdr = el('div', { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' });
      hdr.appendChild(el('span', { fontSize: '22px' }, icon));
      hdr.appendChild(el('span', { fontSize: '14px', fontWeight: '600', color: '#c8a84e' }, title));
      col.appendChild(hdr);
      lines.forEach(function (l) {
        var row = el('div', { fontSize: '12px', marginTop: '3px', lineHeight: '1.4' });
        row.appendChild(el('span', { color: '#8a8a7a' }, l.label + ': '));
        row.appendChild(el('span', { color: '#d8ccb8' }, l.value));
        col.appendChild(row);
      });
      return col;
    }

    mid.appendChild(statColumn('\uD83C\uDC04', 'Mahjong', [
      { label: 'Games', value: fmt(stats.mahjongGames) },
      { label: 'Win rate', value: stats.mahjongWinRate + '%' },
      { label: 'Best hand', value: stats.bestHand + (stats.bestHandPts ? ' (' + stats.bestHandPts + ' pts)' : '') },
      { label: 'Favorite', value: stats.favoritePattern }
    ]));

    mid.appendChild(statColumn('\uD83C\uDCCF', 'Poker', [
      { label: 'Hands', value: fmt(stats.pokerHands) },
      { label: 'Win rate', value: stats.pokerWinRate + '%' },
      { label: 'Profit', value: (stats.pokerProfit >= 0 ? '+' : '') + fmt(stats.pokerProfit) + ' chips' },
      { label: 'Best hand', value: stats.pokerBestHand }
    ]));

    card.appendChild(mid);

    // ── Bottom section ─────────────────────────────────────────────────
    var bot = el('div', {
      padding: '8px 24px 14px', borderTop: '1px solid rgba(200,168,78,0.15)',
      marginTop: '2px'
    });

    // Relationships row
    var relRow = el('div', { display: 'flex', gap: '16px', fontSize: '12px', marginBottom: '6px' });
    var relNames = { mei: 'Mei', kenji: 'Kenji', yuki: 'Yuki' };
    Object.keys(relNames).forEach(function (key) {
      var span = el('span', {});
      span.appendChild(el('span', { color: '#8a8a7a' }, relNames[key] + ' '));
      span.appendChild(el('span', { color: '#f0d878', letterSpacing: '1px' }, stars(stats.relationships[key])));
      relRow.appendChild(span);
    });
    bot.appendChild(relRow);

    // Summary row
    var sumRow = el('div', { display: 'flex', gap: '24px', fontSize: '12px' });
    var summaryItems = [
      { icon: '\uD83C\uDFC6', text: stats.achievementsUnlocked + '/' + stats.achievementsTotal + ' achievements' },
      { icon: '\uD83D\uDCB0', text: fmt(stats.coins) + ' coins' }
    ];
    summaryItems.forEach(function (item) {
      var s = el('span', { color: '#a0a090' });
      s.textContent = item.icon + ' ' + item.text;
      sumRow.appendChild(s);
    });
    bot.appendChild(sumRow);

    card.appendChild(bot);

    return card;
  };

  // ── Download the card as a PNG ───────────────────────────────────────
  ProfileCard.prototype.downloadAsPNG = function () {
    var card = this.generate();

    // Temporarily attach to measure
    card.style.position = 'fixed';
    card.style.left = '-9999px';
    card.style.top = '0';
    document.body.appendChild(card);

    // Build an SVG foreignObject wrapper for rasterisation
    var width = 600;
    var height = 400;
    var svgNS = 'http://www.w3.org/2000/svg';
    var serializer = new XMLSerializer();
    var html = serializer.serializeToString(card);

    var svg = '<svg xmlns="' + svgNS + '" width="' + width + '" height="' + height + '">' +
      '<foreignObject width="100%" height="100%">' +
      '<div xmlns="http://www.w3.org/1999/xhtml">' + html + '</div>' +
      '</foreignObject></svg>';

    var blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    var url = URL.createObjectURL(blob);

    var img = new Image();
    img.onload = function () {
      var canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      document.body.removeChild(card);

      canvas.toBlob(function (pngBlob) {
        if (!pngBlob) return;
        var a = document.createElement('a');
        a.href = URL.createObjectURL(pngBlob);
        a.download = 'profile-card.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
      }, 'image/png');
    };
    img.onerror = function () {
      document.body.removeChild(card);
      console.warn('ProfileCard: PNG export failed – falling back to SVG download.');
      var a = document.createElement('a');
      a.href = url;
      a.download = 'profile-card.svg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  // ── Copy stats as shareable text ─────────────────────────────────────
  ProfileCard.prototype.copyAsText = function () {
    var s = this.gatherStats();
    var text = '\uD83C\uDFAE Table Game Simulator \u2014 ' + s.title + ' (Level ' + s.level + ')\n' +
      '\uD83C\uDC04 Mahjong: ' + s.mahjongGames + ' games, ' + s.mahjongWinRate + '% wins\n' +
      '\uD83C\uDCCF Poker: ' + s.pokerHands + ' hands, ' + (s.pokerProfit >= 0 ? '+' : '') + s.pokerProfit + ' chips\n' +
      '\uD83C\uDFC6 Achievements: ' + s.achievementsUnlocked + '/' + s.achievementsTotal + '\n' +
      '\uD83D\uDCB0 Coins: ' + fmt(s.coins) + '\n';

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(function () {
        window.prompt('Copy the text below:', text);
      });
    } else {
      window.prompt('Copy the text below:', text);
    }
    return text;
  };

  // ── Share overlay UI ─────────────────────────────────────────────────
  ProfileCard.prototype.buildShareUI = function () {
    var self = this;

    // Backdrop
    var overlay = el('div', {
      position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
      background: 'rgba(0,0,0,0.75)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: '10000',
      flexDirection: 'column', gap: '16px'
    });

    // Card preview
    var cardNode = self.generate();
    overlay.appendChild(cardNode);

    // Button row
    var btnRow = el('div', { display: 'flex', gap: '12px' });

    function btn(label, onClick) {
      var b = el('button', {
        padding: '8px 20px', borderRadius: '6px', border: 'none',
        background: '#c8a84e', color: '#1a1a1a', fontWeight: '600',
        cursor: 'pointer', fontSize: '13px'
      }, label);
      b.addEventListener('click', onClick);
      return b;
    }

    btnRow.appendChild(btn('Download PNG', function () { self.downloadAsPNG(); }));
    btnRow.appendChild(btn('Copy Text', function () { self.copyAsText(); }));
    btnRow.appendChild(btn('Close', function () {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }));
    overlay.appendChild(btnRow);

    // Click backdrop to close
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }
    });

    document.body.appendChild(overlay);
    return overlay;
  };

  // ── Export ────────────────────────────────────────────────────────────
  MJ.ProfileCard = new ProfileCard();

})(typeof window !== 'undefined' ? window : this);
