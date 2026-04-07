/**
 * economy.js - Virtual currency system for cosmetic purchases.
 *
 * Provides a coin-based economy for earning rewards through gameplay
 * and spending on cosmetic items like tile sets, table accessories,
 * tile backs, and sound packs.
 */
(function(exports) {
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  // ---------------------------------------------------------------------------
  // Shop items catalog
  // ---------------------------------------------------------------------------

  var SHOP_ITEMS = {
    // Tile sets
    tile_jade:   { name: 'Jade Tiles',     price: 100, type: 'tile_set',   description: 'Elegant jade-green tile faces',        preview: '\uD83D\uDFE2' },
    tile_gold:   { name: 'Golden Tiles',    price: 200, type: 'tile_set',   description: 'Luxurious gold-accented tiles',        preview: '\uD83D\uDFE1' },
    tile_night:  { name: 'Midnight Tiles',  price: 150, type: 'tile_set',   description: 'Dark mode tile faces',                 preview: '\uD83C\uDF19' },

    // Table accessories
    acc_lantern: { name: 'Paper Lantern',   price: 50,  type: 'accessory',  description: 'Ambient lantern glow on the table',    preview: '\uD83C\uDFEE' },
    acc_incense: { name: 'Incense Holder',  price: 30,  type: 'accessory',  description: 'Subtle particle effects',              preview: '\uD83E\uDE94' },
    acc_bonsai:  { name: 'Bonsai Tree',     price: 75,  type: 'accessory',  description: 'A miniature tree beside the table',    preview: '\uD83C\uDF33' },

    // Tile backs
    back_dragon: { name: 'Dragon Back',     price: 80,  type: 'tile_back',  description: 'Red dragon pattern tile backs',        preview: '\uD83D\uDC09' },
    back_wave:   { name: 'Great Wave',      price: 80,  type: 'tile_back',  description: 'Hokusai wave pattern',                 preview: '\uD83C\uDF0A' },
    back_sakura: { name: 'Sakura Back',     price: 60,  type: 'tile_back',  description: 'Cherry blossom pattern',               preview: '\uD83C\uDF38' },

    // Sound packs
    sound_zen:   { name: 'Zen Sounds',      price: 40,  type: 'sound_pack', description: 'Bamboo water and wind chime sounds',   preview: '\uD83C\uDF8B' },
    sound_retro: { name: 'Retro Sounds',    price: 40,  type: 'sound_pack', description: '8-bit chiptune tile sounds',           preview: '\uD83D\uDC7E' }
  };

  // ---------------------------------------------------------------------------
  // Coin rewards for game actions
  // ---------------------------------------------------------------------------

  var COIN_REWARDS = {
    round_win: 5,
    round_play: 1,
    big_score: 10,        // 25+ pts
    riichi_win: 3,
    daily_challenge: 8,
    tournament_win: 25,
    achievement: 5
  };

  // ---------------------------------------------------------------------------
  // GameEconomy class
  // ---------------------------------------------------------------------------

  function GameEconomy() {
    this.coins = 0;
    this.purchases = [];
    this.history = [];
    this.load();
  }

  GameEconomy.prototype.load = function() {
    try {
      var d = JSON.parse(localStorage.getItem('mj_economy'));
      if (d && typeof d === 'object') {
        this.coins = d.coins || 0;
        this.purchases = d.purchases || [];
        this.history = d.history || [];
        return;
      }
    } catch (e) {
      // fall through to defaults
    }
    this.coins = 0;
    this.purchases = [];
    this.history = [];
  };

  GameEconomy.prototype.save = function() {
    try {
      localStorage.setItem('mj_economy', JSON.stringify({
        coins: this.coins,
        purchases: this.purchases,
        history: this.history
      }));
    } catch (e) {
      // storage unavailable
    }
  };

  /**
   * Add coins with a reason string.
   * @param {number} amount
   * @param {string} reason
   * @returns {number} New balance
   */
  GameEconomy.prototype.addCoins = function(amount, reason) {
    if (typeof amount !== 'number' || amount <= 0) return this.coins;
    this.coins += amount;
    this.history.push({ amount: amount, reason: reason, timestamp: Date.now() });
    // Trim history to prevent storage bloat
    if (this.history.length > 200) {
      this.history.splice(0, 100);
    }
    this.save();
    return this.coins;
  };

  /**
   * Spend coins to purchase an item.
   * @param {number} amount
   * @param {string} itemId
   * @returns {boolean} True if purchase succeeded
   */
  GameEconomy.prototype.spendCoins = function(amount, itemId) {
    if (this.coins < amount) return false;
    this.coins -= amount;
    if (this.purchases.indexOf(itemId) === -1) {
      this.purchases.push(itemId);
    }
    this.history.push({ amount: -amount, reason: 'Purchased ' + itemId, timestamp: Date.now() });
    this.save();
    return true;
  };

  /**
   * Check if an item has been purchased.
   * @param {string} itemId
   * @returns {boolean}
   */
  GameEconomy.prototype.hasPurchased = function(itemId) {
    return this.purchases.indexOf(itemId) !== -1;
  };

  /**
   * Get current coin balance.
   * @returns {number}
   */
  GameEconomy.prototype.getBalance = function() {
    return this.coins;
  };

  /**
   * Award coins for a game action using the standard rewards table.
   * @param {string} action - Key from COIN_REWARDS
   * @returns {number} Coins awarded (0 if unknown action)
   */
  GameEconomy.prototype.awardForAction = function(action) {
    var amount = COIN_REWARDS[action];
    if (!amount) return 0;
    this.addCoins(amount, action);
    return amount;
  };

  /**
   * Reset the economy (for testing or prestige).
   */
  GameEconomy.prototype.reset = function() {
    this.coins = 0;
    this.purchases = [];
    this.history = [];
    this.save();
  };

  // ---------------------------------------------------------------------------
  // ShopManager class
  // ---------------------------------------------------------------------------

  function ShopManager() {
    this._equipped = {};
    this._loadEquipped();
  }

  /** @private */
  ShopManager.prototype._loadEquipped = function() {
    try {
      this._equipped = JSON.parse(localStorage.getItem('mj_shop_equipped')) || {};
    } catch (e) {
      this._equipped = {};
    }
  };

  /** @private */
  ShopManager.prototype._saveEquipped = function() {
    try {
      localStorage.setItem('mj_shop_equipped', JSON.stringify(this._equipped));
    } catch (e) {
      // storage unavailable
    }
  };

  /**
   * Get all shop items with their purchase status.
   * @param {GameEconomy} economy
   * @returns {Array} Array of item objects with purchased/equipped flags
   */
  ShopManager.prototype.getShopItems = function(economy) {
    var items = [];
    for (var id in SHOP_ITEMS) {
      if (!SHOP_ITEMS.hasOwnProperty(id)) continue;
      var item = SHOP_ITEMS[id];
      items.push({
        id: id,
        name: item.name,
        price: item.price,
        type: item.type,
        description: item.description,
        preview: item.preview,
        purchased: economy ? economy.hasPurchased(id) : false,
        equipped: this._equipped[item.type] === id
      });
    }
    return items;
  };

  /**
   * Attempt to purchase an item.
   * @param {string} itemId
   * @param {GameEconomy} economy
   * @returns {object} { success, message }
   */
  ShopManager.prototype.purchase = function(itemId, economy) {
    var item = SHOP_ITEMS[itemId];
    if (!item) return { success: false, message: 'Item not found.' };
    if (economy.hasPurchased(itemId)) return { success: false, message: 'Already purchased.' };
    if (economy.getBalance() < item.price) {
      return { success: false, message: 'Not enough coins. Need ' + item.price + ', have ' + economy.getBalance() + '.' };
    }
    var ok = economy.spendCoins(item.price, itemId);
    if (!ok) return { success: false, message: 'Purchase failed.' };
    return { success: true, message: 'Purchased ' + item.name + '!' };
  };

  /**
   * Get the currently equipped item for a given type.
   * @param {string} type - e.g., 'tile_set', 'tile_back', 'accessory', 'sound_pack'
   * @returns {string|null} Item id or null
   */
  ShopManager.prototype.getEquipped = function(type) {
    return this._equipped[type] || null;
  };

  /**
   * Equip a purchased item.
   * @param {string} itemId
   * @param {GameEconomy} economy
   * @returns {boolean} True if equipped successfully
   */
  ShopManager.prototype.equip = function(itemId, economy) {
    var item = SHOP_ITEMS[itemId];
    if (!item) return false;
    if (!economy.hasPurchased(itemId)) return false;
    this._equipped[item.type] = itemId;
    this._saveEquipped();
    return true;
  };

  /**
   * Unequip an item type (revert to default).
   * @param {string} type
   */
  ShopManager.prototype.unequip = function(type) {
    delete this._equipped[type];
    this._saveEquipped();
  };

  /**
   * Get all currently equipped items.
   * @returns {object} Map of type -> itemId
   */
  ShopManager.prototype.getAllEquipped = function() {
    var result = {};
    for (var type in this._equipped) {
      if (this._equipped.hasOwnProperty(type)) {
        result[type] = this._equipped[type];
      }
    }
    return result;
  };

  /**
   * Build the shop UI.
   * @param {GameEconomy} economy
   * @returns {HTMLElement} Shop container element
   */
  ShopManager.prototype.buildShopUI = function(economy) {
    var self = this;
    var container = document.createElement('div');
    container.className = 'mj-shop';
    container.style.cssText = 'padding:16px;max-width:700px;margin:0 auto;';

    // Balance header
    var header = document.createElement('div');
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;';

    var title = document.createElement('h2');
    title.style.cssText = 'margin:0;color:#e0d0b0;font-size:24px;';
    title.textContent = 'Shop';
    header.appendChild(title);

    var balanceDiv = document.createElement('div');
    balanceDiv.className = 'shop-balance';
    balanceDiv.style.cssText = 'font-size:18px;color:#ffd700;font-weight:bold;';
    balanceDiv.textContent = economy.getBalance() + ' coins';
    header.appendChild(balanceDiv);
    container.appendChild(header);

    // Group items by type
    var groups = {};
    var typeLabels = {
      tile_set: 'Tile Sets',
      accessory: 'Table Accessories',
      tile_back: 'Tile Backs',
      sound_pack: 'Sound Packs'
    };

    var items = this.getShopItems(economy);
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (!groups[item.type]) groups[item.type] = [];
      groups[item.type].push(item);
    }

    var typeOrder = ['tile_set', 'tile_back', 'accessory', 'sound_pack'];
    for (var t = 0; t < typeOrder.length; t++) {
      var type = typeOrder[t];
      if (!groups[type]) continue;

      var section = document.createElement('div');
      section.style.cssText = 'margin-bottom:20px;';

      var sectionTitle = document.createElement('h3');
      sectionTitle.style.cssText = 'color:#c0b090;font-size:16px;margin:0 0 10px 0;border-bottom:1px solid #333;padding-bottom:4px;';
      sectionTitle.textContent = typeLabels[type] || type;
      section.appendChild(sectionTitle);

      var grid = document.createElement('div');
      grid.style.cssText = 'display:flex;flex-wrap:wrap;gap:12px;';

      for (var j = 0; j < groups[type].length; j++) {
        var shopItem = groups[type][j];
        grid.appendChild(this._buildItemCard(shopItem, economy));
      }

      section.appendChild(grid);
      container.appendChild(section);
    }

    return container;
  };

  /** @private Build a single item card. */
  ShopManager.prototype._buildItemCard = function(item, economy) {
    var self = this;
    var card = document.createElement('div');
    card.className = 'shop-item-card';
    var borderColor = item.purchased ? (item.equipped ? '#ffd700' : '#4a7c59') : '#555';
    card.style.cssText = 'width:180px;border:2px solid ' + borderColor +
      ';border-radius:10px;padding:12px;background:#1a1a2a;text-align:center;';

    // Preview
    var preview = document.createElement('div');
    preview.style.cssText = 'font-size:36px;margin-bottom:6px;';
    preview.textContent = item.preview;
    card.appendChild(preview);

    // Name
    var nameEl = document.createElement('div');
    nameEl.style.cssText = 'font-size:14px;font-weight:bold;color:#e0d0b0;margin-bottom:4px;';
    nameEl.textContent = item.name;
    card.appendChild(nameEl);

    // Description
    var descEl = document.createElement('div');
    descEl.style.cssText = 'font-size:12px;color:#999;margin-bottom:8px;line-height:1.3;';
    descEl.textContent = item.description;
    card.appendChild(descEl);

    // Price / status
    var priceEl = document.createElement('div');
    priceEl.style.cssText = 'font-size:13px;margin-bottom:8px;';
    if (item.purchased) {
      priceEl.style.color = '#4a7c59';
      priceEl.textContent = 'Owned';
    } else {
      var canAfford = economy.getBalance() >= item.price;
      priceEl.style.color = canAfford ? '#ffd700' : '#cc4444';
      priceEl.textContent = item.price + ' coins';
    }
    card.appendChild(priceEl);

    // Action button
    var btn = document.createElement('button');
    btn.style.cssText = 'width:100%;padding:6px;border:none;border-radius:6px;font-size:13px;cursor:pointer;';

    if (item.purchased && item.equipped) {
      btn.style.background = '#555';
      btn.style.color = '#ccc';
      btn.textContent = 'Equipped';
      btn.disabled = true;
    } else if (item.purchased) {
      btn.style.background = '#4a7c59';
      btn.style.color = '#fff';
      btn.textContent = 'Equip';
      btn.setAttribute('data-item-id', item.id);
      btn.addEventListener('click', function(e) {
        var id = e.target.getAttribute('data-item-id');
        self.equip(id, economy);
        var evt = new CustomEvent('shop-item-equipped', { detail: { itemId: id } });
        e.target.closest('.mj-shop').dispatchEvent(evt);
      });
    } else {
      var affordable = economy.getBalance() >= item.price;
      btn.style.background = affordable ? '#b8860b' : '#333';
      btn.style.color = affordable ? '#fff' : '#666';
      btn.textContent = 'Buy';
      btn.disabled = !affordable;
      btn.setAttribute('data-item-id', item.id);
      btn.addEventListener('click', function(e) {
        var id = e.target.getAttribute('data-item-id');
        var result = self.purchase(id, economy);
        var evt = new CustomEvent('shop-item-purchased', { detail: { itemId: id, result: result } });
        e.target.closest('.mj-shop').dispatchEvent(evt);
      });
    }
    card.appendChild(btn);

    return card;
  };

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------
  root.MJ.Economy = {
    GameEconomy: GameEconomy,
    ShopManager: ShopManager,
    SHOP_ITEMS: SHOP_ITEMS,
    COIN_REWARDS: COIN_REWARDS
  };

})(typeof window !== 'undefined' ? window : global);
