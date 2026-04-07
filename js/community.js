(function(exports) {
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  // ── CommunityFeatures ──────────────────────────────────────────────
  // Share replays, screenshots, and achievements with others.
  // Provides export/import of save data and shareable text summaries.

  class CommunityFeatures {
    constructor() {}

    // ── Game summary generation ───────────────────────────────────────

    /**
     * Build a shareable game summary object from current state.
     * @param {object} state         - current game state
     * @param {object} reputation    - player reputation / level info
     * @param {object} personalities - map of character id -> personality engine
     * @returns {object} summary
     */
    generateGameSummary(state, reputation, personalities) {
      var summary = {
        version: '1.0',
        date: new Date().toISOString(),
        player: {
          level: (reputation && reputation.level) || 1,
          title: (reputation && reputation.title) || 'Novice',
          totalGames: (reputation && reputation.totalGames) || 0,
          winRate: (reputation && reputation.winRate) || '0%'
        },
        characters: {},
        highlights: []
      };

      // Character relationship summaries
      if (personalities && typeof personalities === 'object') {
        var ids = Object.keys(personalities);
        for (var i = 0; i < ids.length; i++) {
          var id = ids[i];
          var pe = personalities[id];
          if (pe && pe.character) {
            summary.characters[id] = {
              name: pe.character.name,
              relationship: pe.relationshipLevel || 1,
              gamesPlayed: pe.gamesPlayed || 0,
              dominantEmotion: (pe.memory && typeof pe.memory.getDominantEmotion === 'function')
                ? pe.memory.getDominantEmotion() : 'neutral'
            };
          }
        }
      }

      return summary;
    }

    // ── Shareable text ────────────────────────────────────────────────

    /**
     * Generate plain-text summary suitable for pasting into social media.
     * @param {object} summary - output of generateGameSummary
     * @returns {string}
     */
    generateShareText(summary) {
      var lines = [];
      lines.push('\uD83C\uDC04 Mahjong Journey \u2014 ' + summary.player.title +
        ' (Level ' + summary.player.level + ')');
      lines.push('\uD83D\uDCCA ' + summary.player.totalGames + ' games played | ' +
        summary.player.winRate + ' win rate');

      var charIds = Object.keys(summary.characters);
      for (var i = 0; i < charIds.length; i++) {
        var ch = summary.characters[charIds[i]];
        lines.push(ch.name + ': Relationship Lv' + ch.relationship +
          ' | ' + ch.gamesPlayed + ' games together');
      }

      if (summary.highlights && summary.highlights.length > 0) {
        lines.push('');
        lines.push('Highlights:');
        var max = Math.min(summary.highlights.length, 3);
        for (var j = 0; j < max; j++) {
          lines.push('  ' + summary.highlights[j]);
        }
      }

      lines.push('');
      lines.push('Play at: [game URL]');

      return lines.join('\n');
    }

    // ── Clipboard sharing ─────────────────────────────────────────────

    /**
     * Copy the share text to the system clipboard.
     * @param {object} summary
     * @returns {Promise<{success:boolean, text:string, error?:string}>}
     */
    async shareToClipboard(summary) {
      var text = this.generateShareText(summary);
      try {
        await navigator.clipboard.writeText(text);
        return { success: true, text: text };
      } catch (e) {
        return { success: false, error: e.message, text: text };
      }
    }

    // ── Save data export / import ─────────────────────────────────────

    /** localStorage keys that make up a complete save. */
    _getSaveKeys() {
      var keys = [
        'mj_reputation', 'mj_album_meta', 'mj_narrative', 'mj_venue',
        'mj_daily', 'mj_achievements', 'mj_tutor_skills', 'mj_tutor_completed',
        'mj_ai_weights', 'mj_ai_state', 'mj_ai_history'
      ];
      var characters = ['mei', 'kenji', 'yuki'];
      for (var i = 0; i < characters.length; i++) {
        keys.push('mj_memory_' + characters[i]);
        keys.push('mj_charlearn_' + characters[i]);
      }
      return keys;
    }

    /**
     * Export all recognised save data from localStorage as a JSON string.
     * @returns {string} JSON
     */
    exportGameState() {
      var state = {};
      var keys = this._getSaveKeys();
      for (var i = 0; i < keys.length; i++) {
        var val = localStorage.getItem(keys[i]);
        if (val !== null) {
          state[keys[i]] = val;
        }
      }
      return JSON.stringify(state, null, 2);
    }

    /**
     * Import save data from a JSON string, overwriting matching keys.
     * Only keys prefixed with 'mj_' are written for safety.
     * @param {string} json
     * @returns {{success:boolean, keysImported?:number, error?:string}}
     */
    importGameState(json) {
      try {
        var state = JSON.parse(json);
        var count = 0;
        var entries = Object.keys(state);
        for (var i = 0; i < entries.length; i++) {
          var key = entries[i];
          if (key.indexOf('mj_') === 0) {
            localStorage.setItem(key, state[key]);
            count++;
          }
        }
        return { success: true, keysImported: count };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }

    // ── Sharing UI ────────────────────────────────────────────────────

    /**
     * Build and display the sharing overlay.
     * @param {object} summary       - output of generateGameSummary
     * @param {object} personalities - (unused in UI but kept for future use)
     * @returns {HTMLElement} overlay element
     */
    buildShareUI(summary, personalities) {
      var self = this;

      var overlay = document.createElement('div');
      overlay.style.cssText =
        'position:fixed;inset:0;background:rgba(0,0,0,0.85);' +
        'display:flex;align-items:center;justify-content:center;z-index:300;';

      var panel = document.createElement('div');
      panel.style.cssText =
        'background:var(--panel-bg);border-radius:12px;padding:24px;' +
        'max-width:500px;width:90%;max-height:80vh;overflow-y:auto;';

      var html = '<h3 style="color:var(--accent);margin:0 0 12px;">Share Your Journey</h3>';

      // Summary card
      html += '<div style="background:rgba(0,0,0,0.3);border-radius:8px;padding:12px;margin-bottom:12px;font-size:13px;">';
      html += '<div style="font-weight:bold;color:var(--accent);">' +
        self._esc(summary.player.title) + ' (Level ' + summary.player.level + ')</div>';
      html += '<div>' + summary.player.totalGames + ' games | ' +
        self._esc(summary.player.winRate) + ' win rate</div>';

      var charIds = Object.keys(summary.characters);
      for (var i = 0; i < charIds.length; i++) {
        var ch = summary.characters[charIds[i]];
        html += '<div>' + self._esc(ch.name) + ': Relationship ' + ch.relationship + '/5</div>';
      }
      html += '</div>';

      // Action buttons
      html += '<div style="display:flex;gap:8px;flex-wrap:wrap;">';
      html += '<button id="share-clipboard" class="btn btn-primary">Copy to Clipboard</button>';
      html += '<button id="share-export" class="btn">Export Save Data</button>';
      html += '<button id="share-import" class="btn">Import Save Data</button>';
      html += '<button id="share-close" class="btn">Close</button>';
      html += '</div>';

      // Import area (hidden)
      html += '<div id="share-import-area" style="display:none;margin-top:12px;">';
      html += '<textarea id="share-import-text" style="width:100%;height:80px;' +
        'background:rgba(0,0,0,0.3);color:var(--text-primary);' +
        'border:1px solid var(--panel-border);border-radius:6px;padding:8px;' +
        'font-size:11px;" placeholder="Paste save data JSON here..."></textarea>';
      html += '<button id="share-import-go" class="btn btn-sm" style="margin-top:4px;">Import</button>';
      html += '<div id="share-status" style="font-size:12px;margin-top:4px;display:none;"></div>';
      html += '</div>';

      panel.innerHTML = html;
      overlay.appendChild(panel);
      document.body.appendChild(overlay);

      // ── Wire up event handlers ───────────────────────────────────

      document.getElementById('share-close').addEventListener('click', function() {
        overlay.remove();
      });

      document.getElementById('share-clipboard').addEventListener('click', function() {
        self.shareToClipboard(summary).then(function(result) {
          var el = document.getElementById('share-status');
          if (el) {
            el.textContent = result.success ? 'Copied!' : 'Failed to copy';
            el.style.display = 'block';
          }
        });
      });

      document.getElementById('share-export').addEventListener('click', function() {
        var data = self.exportGameState();
        var blob = new Blob([data], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'mahjong_save_' + Date.now() + '.json';
        a.click();
        URL.revokeObjectURL(url);
      });

      document.getElementById('share-import').addEventListener('click', function() {
        var area = document.getElementById('share-import-area');
        if (area) area.style.display = 'block';
      });

      document.getElementById('share-import-go').addEventListener('click', function() {
        var text = document.getElementById('share-import-text').value;
        var result = self.importGameState(text);
        var el = document.getElementById('share-status');
        if (el) {
          el.textContent = result.success
            ? 'Imported ' + result.keysImported + ' items. Refresh to apply.'
            : 'Error: ' + result.error;
          el.style.display = 'block';
        }
      });

      return overlay;
    }

    /** Minimal HTML-escape helper. */
    _esc(str) {
      if (!str) return '';
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
  }

  // ── Export ──────────────────────────────────────────────────────────
  root.MJ.Community = CommunityFeatures;

})(typeof window !== 'undefined' ? window : global);
