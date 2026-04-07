/**
 * player-house.js - Virtual room that the player customizes with trophies,
 * photos, furniture, and decorations earned or purchased through gameplay.
 *
 * Provides a DOM-rendered room view using CSS Grid with shelves, walls,
 * a Mahjong table, and character visitors. Persists to localStorage.
 */
(function(exports) {
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  // ---------------------------------------------------------------------------
  // Default room state
  // ---------------------------------------------------------------------------

  function createDefaultRoom() {
    return {
      wallColor: '#e8dcc8',
      furniture: [
        { id: 'shelf_main',  type: 'shelf',  name: 'Trophy Shelf',  slot: 'wall-top' },
        { id: 'table_main',  type: 'table',  name: 'Mahjong Table', slot: 'center' }
      ],
      trophies: [],
      photos: [],
      decorations: [],
      stats: {
        gamesPlayedHere: 0,
        firstVisit: null,
        lastVisit: null
      }
    };
  }

  // ---------------------------------------------------------------------------
  // Character comments about the room
  // ---------------------------------------------------------------------------

  var CHARACTER_ROOM_COMMENTS = {
    kenji: {
      empty:   "A bit bare in here. Need some trophies? Beat ME and you will get one!",
      few:     "Nice trophies! ...I have more though.",
      many:    "Okay, okay, that is an impressive collection. Don't let it go to your head.",
      bonsai:  "A bonsai! Reminds me of the one outside my shop.",
      lantern: "Paper lantern! Sets the mood for a good game.",
      incense: "Incense? Fancy. My shop just smells like tonkotsu."
    },
    yuki: {
      empty:   "Every room starts empty. Fill it with memories, one game at a time.",
      few:     "Your room has a warm feeling. Like Takeshi's study.",
      many:    "So many memories on these walls. Each one a story worth telling.",
      bonsai:  "A fine bonsai. Patience made visible.",
      lantern: "The lantern light is gentle. Perfect for evening games.",
      incense: "Sandalwood? It reminds me of the old parlor in Kyoto."
    },
    mei: {
      empty:   "A blank canvas. The data suggests you should play more games to fill it.",
      few:     "I notice you arranged the trophies by date. I approve.",
      many:    "Statistically impressive. You are in the top percentile of collectors.",
      bonsai:  "Bonsai maintenance follows fascinating mathematical growth patterns.",
      lantern: "The light diffusion from that lantern is quite pleasing.",
      incense: "Mochi would love that smell. She always sits near grandmother's incense."
    },
    hana: {
      empty:   "We all start somewhere! I bet this room will look amazing soon.",
      few:     "Looking good! Each trophy is proof of improvement.",
      many:    "Wow, this is like a Mahjong museum! Can I take notes?",
      bonsai:  "So cute! I want one for my apartment.",
      lantern: "Ooh, ambient lighting! Very aesthetic.",
      incense: "That smells amazing. Very zen study vibes."
    }
  };

  // ---------------------------------------------------------------------------
  // Room item definitions (what can appear in the room)
  // ---------------------------------------------------------------------------

  var ITEM_VISUALS = {
    // Economy shop items that appear in the room
    acc_lantern: { emoji: '\uD83C\uDFEE', label: 'Paper Lantern',  slot: 'wall-left',  css: 'house-lantern' },
    acc_incense: { emoji: '\uD83E\uDE94', label: 'Incense Holder', slot: 'table-side',  css: 'house-incense' },
    acc_bonsai:  { emoji: '\uD83C\uDF33', label: 'Bonsai Tree',    slot: 'floor-right', css: 'house-bonsai' },

    // Tile set displayed on table
    tile_set:    { emoji: '\uD83C\uDC04', label: 'Tile Set',       slot: 'center',      css: 'house-tileset' },

    // Generic decoration slots
    decoration:  { emoji: '\uD83C\uDFA8', label: 'Decoration',     slot: 'wall-right',  css: 'house-deco' }
  };

  // ---------------------------------------------------------------------------
  // PlayerHouse class
  // ---------------------------------------------------------------------------

  class PlayerHouse {
    constructor() {
      this.load();
    }

    // ── Persistence ─────────────────────────────────────────────────────

    load() {
      try {
        var data = JSON.parse(localStorage.getItem('mj_player_house'));
        this.room = data || createDefaultRoom();
      } catch (e) {
        this.room = createDefaultRoom();
      }
      // Ensure stats exist for older saves
      if (!this.room.stats) {
        this.room.stats = { gamesPlayedHere: 0, firstVisit: null, lastVisit: null };
      }
    }

    save() {
      try {
        localStorage.setItem('mj_player_house', JSON.stringify(this.room));
      } catch (e) { /* storage full or unavailable */ }
    }

    // ── Room state accessors ────────────────────────────────────────────

    /** Returns the full room state object. */
    getRoom() {
      return {
        wallColor:   this.room.wallColor,
        furniture:   this.room.furniture.slice(),
        trophies:    this.room.trophies.slice(),
        photos:      this.room.photos.slice(),
        decorations: this.room.decorations.slice(),
        stats:       Object.assign({}, this.room.stats)
      };
    }

    /** Returns all trophies (auto-generated from tournament wins, achievements). */
    getTrophies() {
      return this.room.trophies.slice();
    }

    /** Returns all photos (from photo album milestones). */
    getPhotos() {
      return this.room.photos.slice();
    }

    // ── Item management ─────────────────────────────────────────────────

    /**
     * Add an item to the room.
     * @param {object} item - { id, type, name, [emoji], [slot], [source] }
     */
    addItem(item) {
      if (!item || !item.id) return false;

      // Determine where it goes
      if (item.type === 'trophy') {
        if (this._findById(this.room.trophies, item.id)) return false;
        this.room.trophies.push({
          id: item.id,
          name: item.name || 'Trophy',
          emoji: item.emoji || '\uD83C\uDFC6',
          date: item.date || new Date().toISOString(),
          source: item.source || 'unknown'
        });
      } else if (item.type === 'photo') {
        if (this._findById(this.room.photos, item.id)) return false;
        this.room.photos.push({
          id: item.id,
          name: item.name || 'Photo',
          emoji: item.emoji || '\uD83D\uDDBC\uFE0F',
          date: item.date || new Date().toISOString(),
          milestone: item.milestone || null
        });
      } else if (item.type === 'furniture') {
        if (this._findById(this.room.furniture, item.id)) return false;
        this.room.furniture.push({
          id: item.id,
          type: 'furniture',
          name: item.name || 'Furniture',
          slot: item.slot || 'floor-left'
        });
      } else {
        // Decoration / accessory
        if (this._findById(this.room.decorations, item.id)) return false;
        this.room.decorations.push({
          id: item.id,
          type: item.type || 'decoration',
          name: item.name || 'Decoration',
          emoji: item.emoji || '\uD83C\uDFA8',
          slot: item.slot || 'wall-right'
        });
      }

      this.save();
      return true;
    }

    /**
     * Remove an item from the room by id.
     * Searches trophies, photos, furniture, and decorations.
     */
    removeItem(itemId) {
      var removed = false;
      removed = this._removeById(this.room.trophies, itemId) || removed;
      removed = this._removeById(this.room.photos, itemId) || removed;
      removed = this._removeById(this.room.decorations, itemId) || removed;
      // Don't remove core furniture (shelf + table)
      var fIdx = this.room.furniture.findIndex(function(f) { return f.id === itemId; });
      if (fIdx !== -1 && itemId !== 'shelf_main' && itemId !== 'table_main') {
        this.room.furniture.splice(fIdx, 1);
        removed = true;
      }
      if (removed) this.save();
      return removed;
    }

    /** Set wall colour. */
    setWallColor(color) {
      if (!color || typeof color !== 'string') return;
      this.room.wallColor = color;
      this.save();
    }

    /** Increment the games-played-here counter. */
    recordGamePlayed() {
      this.room.stats.gamesPlayedHere++;
      if (!this.room.stats.firstVisit) {
        this.room.stats.firstVisit = new Date().toISOString();
      }
      this.room.stats.lastVisit = new Date().toISOString();
      this.save();
    }

    // ── Auto-sync with other systems ────────────────────────────────────

    /**
     * Pull trophies from tournament/achievement data if available.
     */
    syncTrophies() {
      var Tournament = root.MJ.Tournament;
      var Achievements = root.MJ.Achievements;

      if (Tournament && typeof Tournament.getWins === 'function') {
        var wins = Tournament.getWins();
        for (var i = 0; i < wins.length; i++) {
          this.addItem({
            id: 'trophy_' + wins[i].id,
            type: 'trophy',
            name: wins[i].name || 'Tournament Win',
            emoji: '\uD83C\uDFC6',
            date: wins[i].date,
            source: 'tournament'
          });
        }
      }

      if (Achievements && typeof Achievements.getUnlocked === 'function') {
        var unlocked = Achievements.getUnlocked();
        for (var j = 0; j < unlocked.length; j++) {
          this.addItem({
            id: 'ach_' + unlocked[j].id,
            type: 'trophy',
            name: unlocked[j].name || 'Achievement',
            emoji: '\u2B50',
            date: unlocked[j].date,
            source: 'achievement'
          });
        }
      }
    }

    /**
     * Pull photos from the PhotoAlbum if available.
     */
    syncPhotos() {
      var Album = root.MJ.PhotoAlbum;
      if (!Album) return;

      var instance = (typeof Album === 'function') ? new Album() : Album;
      if (!instance || !instance.albums) return;

      var milestones = instance.albums.milestones || [];
      for (var i = 0; i < milestones.length; i++) {
        this.addItem({
          id: 'photo_' + (milestones[i].id || i),
          type: 'photo',
          name: milestones[i].label || 'Milestone Photo',
          emoji: '\uD83D\uDDBC\uFE0F',
          date: milestones[i].date,
          milestone: milestones[i].type || null
        });
      }
    }

    /**
     * Sync purchased economy items (lantern, bonsai, etc.) into the room.
     */
    syncShopItems() {
      var Economy = root.MJ.Economy;
      if (!Economy) return;

      var instance = (typeof Economy === 'function') ? new Economy() : Economy;
      if (!instance || typeof instance.getOwnedItems !== 'function') return;

      var owned = instance.getOwnedItems();
      for (var i = 0; i < owned.length; i++) {
        var shopId = owned[i].id || owned[i];
        var visual = ITEM_VISUALS[shopId];
        if (visual) {
          this.addItem({
            id: 'shop_' + shopId,
            type: 'decoration',
            name: visual.label,
            emoji: visual.emoji,
            slot: visual.slot
          });
        }
      }
    }

    // ── Character comments ──────────────────────────────────────────────

    /**
     * Get a character's comment about the player's room.
     */
    getCharacterComment(characterId) {
      var lines = CHARACTER_ROOM_COMMENTS[characterId];
      if (!lines) return '';

      // Check for specific decoration comments first
      var decoIds = this.room.decorations.map(function(d) { return d.id; });

      if (decoIds.indexOf('shop_acc_bonsai') !== -1 && lines.bonsai) {
        return lines.bonsai;
      }
      if (decoIds.indexOf('shop_acc_lantern') !== -1 && lines.lantern) {
        return lines.lantern;
      }
      if (decoIds.indexOf('shop_acc_incense') !== -1 && lines.incense) {
        return lines.incense;
      }

      // Fall back to trophy-count comments
      var count = this.room.trophies.length;
      if (count === 0) return lines.empty || '';
      if (count < 5)   return lines.few   || '';
      return lines.many || '';
    }

    // ── DOM rendering ───────────────────────────────────────────────────

    /**
     * Build and return a DOM element representing the room.
     * Uses CSS Grid for a side-view room layout.
     */
    buildHouseUI() {
      if (typeof document === 'undefined') return null;

      var container = document.createElement('div');
      container.className = 'player-house';
      container.style.cssText = [
        'display: grid',
        'grid-template-columns: 1fr 2fr 1fr',
        'grid-template-rows: auto 1fr auto',
        'gap: 8px',
        'padding: 16px',
        'background-color: ' + this.room.wallColor,
        'border-radius: 12px',
        'min-height: 320px',
        'position: relative',
        'font-family: sans-serif'
      ].join('; ');

      // -- Room title / stats bar --
      var header = document.createElement('div');
      header.style.cssText = 'grid-column: 1 / -1; text-align: center; font-weight: bold; font-size: 16px; padding: 4px 0; border-bottom: 2px solid rgba(0,0,0,0.1);';
      header.textContent = 'My Room';
      container.appendChild(header);

      // -- Wall area (top): trophy shelf --
      var shelfEl = this._buildShelf();
      shelfEl.style.cssText += '; grid-column: 1 / -1;';
      container.appendChild(shelfEl);

      // -- Left wall: decorations + lantern --
      var leftWall = document.createElement('div');
      leftWall.className = 'house-wall-left';
      leftWall.style.cssText = 'display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 8px;';
      this._renderSlotItems(leftWall, 'wall-left');
      container.appendChild(leftWall);

      // -- Center: Mahjong table + tile set --
      var centerArea = document.createElement('div');
      centerArea.className = 'house-center';
      centerArea.style.cssText = 'display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;';
      var tableEl = document.createElement('div');
      tableEl.className = 'house-table';
      tableEl.style.cssText = 'width: 120px; height: 120px; background: #5a8f5a; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);';
      tableEl.textContent = '\uD83C\uDC04';
      tableEl.title = 'Mahjong Table';
      centerArea.appendChild(tableEl);
      this._renderSlotItems(centerArea, 'table-side');
      container.appendChild(centerArea);

      // -- Right wall: more decorations --
      var rightWall = document.createElement('div');
      rightWall.className = 'house-wall-right';
      rightWall.style.cssText = 'display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 8px;';
      this._renderSlotItems(rightWall, 'wall-right');
      this._renderSlotItems(rightWall, 'floor-right');
      container.appendChild(rightWall);

      // -- Photo wall --
      if (this.room.photos.length > 0) {
        var photoWall = this._buildPhotoWall();
        photoWall.style.cssText += '; grid-column: 1 / -1;';
        container.appendChild(photoWall);
      }

      // -- Character visitors --
      var visitors = this._buildVisitors();
      if (visitors) {
        visitors.style.cssText += '; grid-column: 1 / -1;';
        container.appendChild(visitors);
      }

      // -- Stats footer --
      var footer = document.createElement('div');
      footer.style.cssText = 'grid-column: 1 / -1; text-align: center; font-size: 12px; color: #666; padding-top: 4px; border-top: 1px solid rgba(0,0,0,0.1);';
      footer.textContent = 'Games played here: ' + (this.room.stats.gamesPlayedHere || 0);
      container.appendChild(footer);

      return container;
    }

    // ── Private rendering helpers ───────────────────────────────────────

    _buildShelf() {
      var shelf = document.createElement('div');
      shelf.className = 'house-shelf';
      shelf.style.cssText = 'display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; padding: 8px; background: rgba(0,0,0,0.05); border-radius: 6px; min-height: 48px;';

      if (this.room.trophies.length === 0) {
        var empty = document.createElement('span');
        empty.style.cssText = 'color: #999; font-size: 12px; align-self: center;';
        empty.textContent = 'Trophy shelf — win tournaments to fill it!';
        shelf.appendChild(empty);
      } else {
        for (var i = 0; i < this.room.trophies.length; i++) {
          var t = this.room.trophies[i];
          var icon = document.createElement('span');
          icon.className = 'house-trophy';
          icon.style.cssText = 'font-size: 24px; cursor: default;';
          icon.textContent = t.emoji || '\uD83C\uDFC6';
          icon.title = t.name + (t.date ? ' (' + t.date.slice(0, 10) + ')' : '');
          shelf.appendChild(icon);
        }
      }

      return shelf;
    }

    _buildPhotoWall() {
      var wall = document.createElement('div');
      wall.className = 'house-photos';
      wall.style.cssText = 'display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; padding: 8px;';

      for (var i = 0; i < this.room.photos.length; i++) {
        var p = this.room.photos[i];
        var frame = document.createElement('div');
        frame.className = 'house-photo-frame';
        frame.style.cssText = 'width: 48px; height: 48px; background: #fff; border: 2px solid #8b7355; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 20px; cursor: default;';
        frame.textContent = p.emoji || '\uD83D\uDDBC\uFE0F';
        frame.title = p.name + (p.date ? ' (' + p.date.slice(0, 10) + ')' : '');
        wall.appendChild(frame);
      }

      return wall;
    }

    _buildVisitors() {
      if (typeof root.MJ.CharacterRelations === 'undefined') return null;

      var relations = root.MJ.CharacterRelations;
      var instance = (typeof relations === 'function') ? new relations() : relations;
      if (!instance || typeof instance.getRelationship !== 'function') return null;

      var visitors = document.createElement('div');
      visitors.className = 'house-visitors';
      visitors.style.cssText = 'display: flex; gap: 12px; justify-content: center; padding: 8px;';

      var charIds = ['yuki', 'kenji', 'mei', 'hana'];
      var charEmojis = { yuki: '\uD83D\uDC75', kenji: '\uD83D\uDC68\u200D\uD83C\uDF73', mei: '\uD83D\uDC69\u200D\uD83D\uDCBB', hana: '\uD83D\uDC69\u200D\uD83C\uDF93' };
      var hasVisitors = false;

      for (var i = 0; i < charIds.length; i++) {
        var cid = charIds[i];
        var rel = instance.getRelationship(cid);
        var level = (rel && typeof rel === 'object') ? (rel.level || rel.friendship || 0) : (typeof rel === 'number' ? rel : 0);

        if (level >= 3) {
          hasVisitors = true;
          var portrait = document.createElement('div');
          portrait.className = 'house-visitor';
          portrait.style.cssText = 'text-align: center; font-size: 28px; cursor: default;';
          portrait.textContent = charEmojis[cid] || '\uD83D\uDC64';
          portrait.title = cid.charAt(0).toUpperCase() + cid.slice(1) + ' (visiting)';
          visitors.appendChild(portrait);
        }
      }

      return hasVisitors ? visitors : null;
    }

    _renderSlotItems(parent, slotName) {
      var items = this.room.decorations.filter(function(d) {
        var visual = ITEM_VISUALS[d.id.replace('shop_', '')] || {};
        return (d.slot === slotName) || (visual.slot === slotName);
      });

      for (var i = 0; i < items.length; i++) {
        var el = document.createElement('div');
        el.className = 'house-item ' + (ITEM_VISUALS[items[i].id.replace('shop_', '')] || {}).css || '';
        el.style.cssText = 'font-size: 28px; cursor: default;';
        el.textContent = items[i].emoji || '\uD83C\uDFA8';
        el.title = items[i].name;
        parent.appendChild(el);
      }
    }

    // ── Internal helpers ────────────────────────────────────────────────

    _findById(arr, id) {
      for (var i = 0; i < arr.length; i++) {
        if (arr[i].id === id) return arr[i];
      }
      return null;
    }

    _removeById(arr, id) {
      for (var i = 0; i < arr.length; i++) {
        if (arr[i].id === id) {
          arr.splice(i, 1);
          return true;
        }
      }
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------

  root.MJ.PlayerHouse = PlayerHouse;

})(typeof exports !== 'undefined' ? exports : this);
