/**
 * replay-share.js — Export/import replay recordings in a compact format
 */
(function (root) {
  'use strict';

  var MJ = root.MJ || (root.MJ = {});

  var FORMAT_VERSION = 1;

  // ─── Tile encoding maps ────────────────────────────────────────────

  var SUIT_TO_CODE = {
    bamboo: 'b',
    circles: 'c',
    characters: 'm',
    wind: 'w',
    dragon: 'd',
    flower: 'f'
  };

  var CODE_TO_SUIT = {};
  Object.keys(SUIT_TO_CODE).forEach(function (k) {
    CODE_TO_SUIT[SUIT_TO_CODE[k]] = k;
  });

  // Wind rank mapping: east=1, south=2, west=3, north=4
  var WIND_RANK_TO_CODE = { 1: 'e', 2: 's', 3: 'w', 4: 'n' };
  var WIND_CODE_TO_RANK = { e: 1, s: 2, w: 3, n: 4 };

  // Dragon rank mapping: red=1, green=2, white=3
  var DRAGON_RANK_TO_CODE = { 1: 'r', 2: 'g', 3: 'w' };
  var DRAGON_CODE_TO_RANK = { r: 1, g: 2, w: 3 };

  /**
   * Encode a tile {suit, rank} to a short string code.
   * Suited tiles: "b3" (3-bamboo), "c7" (7-circles), "m1" (1-characters)
   * Winds: "we" (East), "ws" (South), "ww" (West), "wn" (North)
   * Dragons: "dr" (Red), "dg" (Green), "dw" (White)
   * Flowers: "f1"..."f8"
   */
  function encodeTile(tile) {
    if (!tile || !tile.suit) return null;
    var suitCode = SUIT_TO_CODE[tile.suit];
    if (!suitCode) return null;

    if (tile.suit === 'wind') {
      return suitCode + (WIND_RANK_TO_CODE[tile.rank] || tile.rank);
    }
    if (tile.suit === 'dragon') {
      return suitCode + (DRAGON_RANK_TO_CODE[tile.rank] || tile.rank);
    }
    return suitCode + tile.rank;
  }

  /**
   * Decode a short tile code back to {suit, rank}.
   */
  function decodeTile(code) {
    if (!code || code.length < 2) return null;
    var suitCode = code.charAt(0);
    var rest = code.substring(1);
    var suit = CODE_TO_SUIT[suitCode];
    if (!suit) return null;

    if (suit === 'wind') {
      var rank = WIND_CODE_TO_RANK[rest];
      if (!rank) return null;
      return { suit: suit, rank: rank };
    }
    if (suit === 'dragon') {
      var dRank = DRAGON_CODE_TO_RANK[rest];
      if (!dRank) return null;
      return { suit: suit, rank: dRank };
    }

    var num = parseInt(rest, 10);
    if (isNaN(num)) return null;
    return { suit: suit, rank: num };
  }

  /**
   * Encode a tile ID string ("bamboo-3") to a short code.
   */
  function encodeTileId(tileId) {
    if (!tileId) return null;
    var parts = tileId.split('-');
    if (parts.length < 2) return null;
    return encodeTile({ suit: parts[0], rank: parseInt(parts[1], 10) });
  }

  /**
   * Decode a short code to a tile ID string.
   */
  function decodeTileId(code) {
    var tile = decodeTile(code);
    if (!tile) return null;
    return tile.suit + '-' + tile.rank;
  }

  // ─── Export / Import ───────────────────────────────────────────────

  /**
   * Export a recording + metadata to a compact JSON string.
   * @param {object} recording - { actions:[], snapshots:[] }
   * @param {object} metadata
   * @returns {string} Compact JSON
   */
  function exportReplay(recording, metadata) {
    var actions = (recording.actions || []).map(function (a) {
      var encoded = {
        t: a.type,
        p: a.player,
        n: a.turn
      };
      if (a.tile) encoded.i = encodeTile(a.tile);
      if (a.timestamp) encoded.s = a.timestamp;
      return encoded;
    });

    // Encode snapshots (sparse array of arrays of tile-ID arrays)
    var snapshots = {};
    var snaps = recording.snapshots || [];
    for (var idx = 0; idx < snaps.length; idx++) {
      if (snaps[idx]) {
        snapshots[idx] = snaps[idx].map(function (hand) {
          return hand.map(encodeTileId).filter(Boolean);
        });
      }
    }

    var data = {
      v: FORMAT_VERSION,
      meta: {
        d: metadata.date || new Date().toISOString(),
        rw: metadata.roundWind || 'east',
        rn: metadata.roundNumber || 1,
        w: metadata.winner,
        sc: metadata.score || 0,
        tn: metadata.turns || 0
      },
      actions: actions,
      snaps: snapshots
    };

    return JSON.stringify(data);
  }

  /**
   * Import a compact JSON string back into {recording, metadata}.
   * @param {string} jsonString
   * @returns {object} { recording:{ actions, snapshots }, metadata }
   * @throws {Error} On invalid format
   */
  function importReplay(jsonString) {
    var data;
    try {
      data = JSON.parse(jsonString);
    } catch (e) {
      throw new Error('Invalid replay data: could not parse JSON');
    }

    if (!data || typeof data !== 'object') {
      throw new Error('Invalid replay data: not an object');
    }
    if (data.v !== FORMAT_VERSION) {
      throw new Error('Unsupported replay format version: ' + data.v + ' (expected ' + FORMAT_VERSION + ')');
    }
    if (!Array.isArray(data.actions)) {
      throw new Error('Invalid replay data: missing actions array');
    }

    var actions = data.actions.map(function (a) {
      var decoded = {
        type: a.t,
        player: a.p,
        tile: a.i ? decodeTile(a.i) : null,
        turn: a.n || 0,
        timestamp: a.s || 0
      };
      return decoded;
    });

    var snapshots = [];
    if (data.snaps && typeof data.snaps === 'object') {
      Object.keys(data.snaps).forEach(function (key) {
        var idx = parseInt(key, 10);
        snapshots[idx] = data.snaps[key].map(function (hand) {
          return hand.map(decodeTileId).filter(Boolean);
        });
      });
    }

    var m = data.meta || {};
    var metadata = {
      date: m.d || '',
      roundWind: m.rw || 'east',
      roundNumber: m.rn || 1,
      winner: (m.w !== undefined) ? m.w : null,
      score: m.sc || 0,
      turns: m.tn || 0
    };

    return {
      recording: { actions: actions, snapshots: snapshots },
      metadata: metadata
    };
  }

  /**
   * Trigger a browser download of the replay as a .json file.
   */
  function downloadReplay(recording, metadata) {
    var json = exportReplay(recording, metadata);
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    var dateStr = (metadata.date || new Date().toISOString()).substring(0, 10);
    a.href = url;
    a.download = 'mahjong-replay-' + dateStr + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Copy compact replay JSON to the clipboard.
   * @returns {Promise}
   */
  function copyToClipboard(recording, metadata) {
    var json = exportReplay(recording, metadata);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(json);
    }
    // Fallback
    var ta = document.createElement('textarea');
    ta.value = json;
    ta.style.cssText = 'position:fixed;left:-9999px;';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
    } catch (e) {
      // Ignore
    }
    document.body.removeChild(ta);
    return Promise.resolve();
  }

  /**
   * Build a share UI panel with Copy, Download, and Import controls.
   * @param {object} recording
   * @param {object} metadata
   * @returns {HTMLElement}
   */
  function buildShareUI(recording, metadata) {
    var wrap = document.createElement('div');
    wrap.className = 'replay-share-panel';
    wrap.style.cssText = 'background:var(--panel-bg, #1a2a1a);color:var(--text, #e0e0e0);' +
      'border-radius:12px;padding:20px;max-width:500px;width:100%;font-family:inherit;';

    var title = document.createElement('h3');
    title.textContent = 'Share Replay';
    title.style.cssText = 'margin:0 0 16px 0;font-size:18px;';
    wrap.appendChild(title);

    // Status message
    var status = document.createElement('div');
    status.style.cssText = 'font-size:13px;min-height:20px;margin-bottom:12px;';
    wrap.appendChild(status);

    function showStatus(msg, color) {
      status.textContent = msg;
      status.style.color = color || '#4caf50';
    }

    // Copy button
    var copyBtn = document.createElement('button');
    copyBtn.className = 'btn';
    copyBtn.textContent = 'Copy to Clipboard';
    copyBtn.style.cssText = 'margin-right:8px;padding:8px 16px;cursor:pointer;';
    copyBtn.addEventListener('click', function () {
      copyToClipboard(recording, metadata).then(function () {
        showStatus('Copied to clipboard!', '#4caf50');
      }).catch(function () {
        showStatus('Failed to copy.', '#f44336');
      });
    });
    wrap.appendChild(copyBtn);

    // Download button
    var dlBtn = document.createElement('button');
    dlBtn.className = 'btn';
    dlBtn.textContent = 'Download .json';
    dlBtn.style.cssText = 'padding:8px 16px;cursor:pointer;';
    dlBtn.addEventListener('click', function () {
      downloadReplay(recording, metadata);
      showStatus('Download started.', '#4caf50');
    });
    wrap.appendChild(dlBtn);

    // Separator
    var sep = document.createElement('hr');
    sep.style.cssText = 'border:none;border-top:1px solid #333;margin:16px 0;';
    wrap.appendChild(sep);

    // Import section
    var importLabel = document.createElement('div');
    importLabel.textContent = 'Import Replay';
    importLabel.style.cssText = 'font-size:14px;font-weight:bold;margin-bottom:8px;';
    wrap.appendChild(importLabel);

    var textarea = document.createElement('textarea');
    textarea.placeholder = 'Paste replay JSON here...';
    textarea.style.cssText = 'width:100%;height:80px;box-sizing:border-box;padding:8px;' +
      'background:#111;color:#ccc;border:1px solid #444;border-radius:6px;resize:vertical;' +
      'font-family:monospace;font-size:12px;';
    wrap.appendChild(textarea);

    var importBtn = document.createElement('button');
    importBtn.className = 'btn';
    importBtn.textContent = 'Import';
    importBtn.style.cssText = 'margin-top:8px;padding:8px 16px;cursor:pointer;';
    importBtn.addEventListener('click', function () {
      var text = textarea.value.trim();
      if (!text) {
        showStatus('Please paste replay data first.', '#ff9800');
        return;
      }
      try {
        var result = importReplay(text);
        showStatus('Replay imported successfully! ' + result.recording.actions.length + ' actions.', '#4caf50');
        // Dispatch a custom event so other code can handle the import
        var event = new CustomEvent('replay-imported', { detail: result });
        document.dispatchEvent(event);
      } catch (e) {
        showStatus('Import failed: ' + e.message, '#f44336');
      }
    });
    wrap.appendChild(importBtn);

    return wrap;
  }

  // ─── Export ────────────────────────────────────────────────────────

  MJ.ReplayShare = Object.freeze({
    exportReplay: exportReplay,
    importReplay: importReplay,
    downloadReplay: downloadReplay,
    copyToClipboard: copyToClipboard,
    buildShareUI: buildShareUI,
    encodeTile: encodeTile,
    decodeTile: decodeTile
  });

  console.log('[Mahjong] ReplayShare module loaded');

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
