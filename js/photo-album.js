(function(exports) {
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  // ── PhotoAlbum ──────────────────────────────────────────────────────
  // Auto-organized screenshot album with milestone tagging.
  // Captures key moments, manages favorites, and provides a gallery UI.

  class PhotoAlbum {
    constructor() {
      this.load();
    }

    load() {
      try {
        const d = JSON.parse(localStorage.getItem('mj_album_meta'));
        this.albums = d || { milestones: [], favorites: [], sessions: {} };
      } catch (e) {
        this.albums = { milestones: [], favorites: [], sessions: {} };
      }
    }

    save() {
      try {
        localStorage.setItem('mj_album_meta', JSON.stringify(this.albums));
      } catch (e) { /* storage full or unavailable */ }
    }

    // ── Milestone auto-capture ────────────────────────────────────────

    /**
     * Automatically capture a screenshot when a milestone event fires.
     * @param {string} event   - one of the recognised milestone keys
     * @param {object} data    - event-specific payload (score, title, name, count ...)
     * @param {object} state   - current game state passed to Screenshot.capture
     */
    captureIf(event, data, state) {
      const milestoneEvents = {
        'first_win':     'Your very first win!',
        'first_riichi':  'First Riichi declaration!',
        'big_score':     'Scored ' + (data && data.score ? data.score : '?') + ' points!',
        'level_up':      'Reached ' + (data && data.title ? data.title : 'new level') + '!',
        'achievement':   'Achievement: ' + (data && data.name ? data.name : '?'),
        'story_moment':  (data && data.title ? data.title : 'Story moment'),
        'perfect_round': 'Perfect round \u2014 no deal-ins!',
        'streak':        (data && data.count ? data.count : '?') + '-game win streak!'
      };

      var desc = milestoneEvents[event];
      if (!desc) return;

      // Unique milestones are only captured once; repeatable ones always fire.
      if (event !== 'big_score' && event !== 'level_up') {
        if (this.albums.milestones.some(function(m) { return m.event === event; })) return;
      }

      var self = this;
      if (root.MJ.Screenshot && typeof root.MJ.Screenshot.capture === 'function') {
        root.MJ.Screenshot.capture(state, desc).then(function(entry) {
          if (entry) {
            self.albums.milestones.push({
              event: event,
              description: desc,
              screenshotIndex: entry.index,
              timestamp: Date.now(),
              dataUrl: entry.dataUrl
            });
            self.save();
          }
        });
      }
    }

    // ── Favorites ─────────────────────────────────────────────────────

    toggleFavorite(screenshotIndex) {
      var idx = this.albums.favorites.indexOf(screenshotIndex);
      if (idx >= 0) {
        this.albums.favorites.splice(idx, 1);
      } else {
        this.albums.favorites.push(screenshotIndex);
      }
      this.save();
    }

    isFavorite(screenshotIndex) {
      return this.albums.favorites.includes(screenshotIndex);
    }

    // ── Session tracking ──────────────────────────────────────────────

    /**
     * Record a screenshot under a specific session id so sessions
     * can be browsed independently.
     */
    tagSession(sessionId, screenshotIndex) {
      if (!this.albums.sessions[sessionId]) {
        this.albums.sessions[sessionId] = [];
      }
      this.albums.sessions[sessionId].push(screenshotIndex);
      this.save();
    }

    getSessionScreenshots(sessionId) {
      return (this.albums.sessions[sessionId] || []).slice();
    }

    getSessionIds() {
      return Object.keys(this.albums.sessions);
    }

    // ── Queries ───────────────────────────────────────────────────────

    getMilestones() {
      return this.albums.milestones.slice();
    }

    getFavorites() {
      return this.albums.favorites.slice();
    }

    getMilestoneCount() {
      return this.albums.milestones.length;
    }

    // ── Album viewer UI ──────────────────────────────────────────────

    buildAlbumUI() {
      var self = this;

      var overlay = document.createElement('div');
      overlay.id = 'photo-album';
      overlay.style.cssText =
        'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:300;' +
        'display:flex;flex-direction:column;padding:20px;overflow:hidden;';

      var html = '';
      // Header
      html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-shrink:0;">';
      html += '<h3 style="color:var(--accent);margin:0;">Photo Album</h3>';
      html += '<button id="album-close" class="btn">Close</button></div>';

      // Tabs
      html += '<div style="display:flex;gap:8px;margin-bottom:12px;flex-shrink:0;">';
      html += '<button class="btn btn-sm album-tab" data-tab="milestones">Milestones</button>';
      html += '<button class="btn btn-sm album-tab" data-tab="favorites">Favorites</button>';
      html += '<button class="btn btn-sm album-tab" data-tab="all">All Screenshots</button></div>';

      // Content area
      html += '<div id="album-content" style="flex:1;overflow-y:auto;"></div>';

      overlay.innerHTML = html;
      document.body.appendChild(overlay);

      // Close handler
      document.getElementById('album-close').addEventListener('click', function() {
        overlay.remove();
      });

      // Tab switching
      var tabs = overlay.querySelectorAll('.album-tab');
      for (var i = 0; i < tabs.length; i++) {
        tabs[i].addEventListener('click', function() {
          self._setActiveTab(overlay, this);
          self.renderTab(this.getAttribute('data-tab'));
        });
      }

      // Default tab
      this._setActiveTab(overlay, tabs[0]);
      this.renderTab('milestones');
      return overlay;
    }

    /** Highlight the selected tab button. */
    _setActiveTab(overlay, activeBtn) {
      var tabs = overlay.querySelectorAll('.album-tab');
      for (var i = 0; i < tabs.length; i++) {
        tabs[i].style.opacity = tabs[i] === activeBtn ? '1' : '0.5';
      }
    }

    renderTab(tab) {
      var content = document.getElementById('album-content');
      if (!content) return;

      var items = [];
      if (tab === 'milestones') {
        items = this.albums.milestones;
      } else if (tab === 'favorites') {
        var gallery = (root.MJ.Screenshot && typeof root.MJ.Screenshot.getGallery === 'function')
          ? root.MJ.Screenshot.getGallery() : [];
        var self = this;
        items = gallery.filter(function(g) { return self.isFavorite(g.index); });
      } else {
        items = (root.MJ.Screenshot && typeof root.MJ.Screenshot.getGallery === 'function')
          ? root.MJ.Screenshot.getGallery() : [];
      }

      if (items.length === 0) {
        content.innerHTML =
          '<div style="text-align:center;color:#888;padding:40px;">' +
          'No photos yet. Play more to capture moments!</div>';
        return;
      }

      var html = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px;">';
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var dataUrl = item.dataUrl || '';
        var label = item.description || item.label || '';
        var time = new Date(item.timestamp).toLocaleDateString();
        html += '<div style="background:rgba(255,255,255,0.05);border-radius:8px;overflow:hidden;border:1px solid rgba(255,255,255,0.1);">';
        if (dataUrl) {
          html += '<img src="' + dataUrl + '" style="width:100%;display:block;" loading="lazy" />';
        }
        html += '<div style="padding:6px 10px;font-size:11px;color:#aaa;">' +
          self._escapeHtml(label) + ' \u2014 ' + time + '</div></div>';
      }
      html += '</div>';
      content.innerHTML = html;
    }

    /** Minimal HTML-escape to avoid injection from label text. */
    _escapeHtml(str) {
      if (!str) return '';
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // ── Cleanup ──────────────────────────────────────────────────────

    clearAll() {
      this.albums = { milestones: [], favorites: [], sessions: {} };
      this.save();
    }
  }

  // ── Export ──────────────────────────────────────────────────────────
  root.MJ.PhotoAlbum = PhotoAlbum;

})(typeof window !== 'undefined' ? window : global);
