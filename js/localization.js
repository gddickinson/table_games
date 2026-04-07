/**
 * localization.js - Multi-language support for Mahjong game
 * Supports English, Japanese, Chinese, and Korean
 */
(function(exports) {
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  // ── Storage key ────────────────────────────────────────────────────
  var STORAGE_KEY = 'mj_language';

  // ── Available languages metadata ───────────────────────────────────
  var LANGUAGES = {
    en: { code: 'en', name: 'English',  nativeName: 'English',  flag: '\uD83C\uDDFA\uD83C\uDDF8' },
    ja: { code: 'ja', name: 'Japanese', nativeName: '\u65E5\u672C\u8A9E', flag: '\uD83C\uDDEF\uD83C\uDDF5' },
    zh: { code: 'zh', name: 'Chinese',  nativeName: '\u4E2D\u6587',     flag: '\uD83C\uDDE8\uD83C\uDDF3' },
    ko: { code: 'ko', name: 'Korean',   nativeName: '\uD55C\uAD6D\uC5B4', flag: '\uD83C\uDDF0\uD83C\uDDF7' }
  };

  // ── Translation tables ─────────────────────────────────────────────
  var TRANSLATIONS = {
    en: {
      game_title: 'Mahjong',
      new_game: 'New Game',
      auto_play: 'Auto Play',
      sort: 'Sort',
      tutorial: 'Tutorial',
      undo: 'Undo',
      settings: 'Settings',
      your_turn: 'Your turn',
      round: 'Round',
      tiles_remaining: 'Tiles',
      east_wind: 'East Wind',
      south_wind: 'South Wind',
      west_wind: 'West Wind',
      north_wind: 'North Wind',
      pong: 'Pong',
      chow: 'Chow',
      kong: 'Kong',
      win: 'Win',
      pass: 'Pass',
      declare_win: 'Declare Win!',
      declare_kong: 'Declare Kong',
      declare_riichi: 'Riichi!',
      tenpai: 'Tenpai (ready!)',
      winning_hand: 'WINNING HAND!',
      away: 'away',
      shanten: 'tiles from ready',
      game_log: 'Game Log',
      game_chat: 'Game Chat',
      by_suit: 'By Suit',
      by_value: 'By Value',
      next_round: 'Next Round',
      review_hand: 'Review Hand',
      difficulty: 'AI Difficulty',
      hint_level: 'Hint Level',
      chat_level: 'AI Chat',
      game_speed: 'Game Speed',
      beginner: 'Beginner',
      basic: 'Basic',
      intermediate: 'Intermediate',
      advanced: 'Advanced',
      expert: 'Expert',
      practice: 'Practice',
      multiplayer: 'Multiplayer',
      lessons: 'Lessons',
      you_win: 'You Win!',
      draw: 'Draw \u2014 Wall Exhausted',
      points: 'Points',
      bamboo: 'Bamboo',
      circles: 'Circles',
      characters: 'Characters',
      red_dragon: 'Red Dragon',
      green_dragon: 'Green Dragon',
      white_dragon: 'White Dragon',
      all_sequences: 'All Sequences',
      all_triplets: 'All Triplets',
      self_drawn: 'Self Drawn',
      fully_concealed: 'Fully Concealed',
      flower_bonus: 'Flower Bonus',
      riichi_bonus: 'Riichi',
      dealer_bonus: 'Dealer Bonus',
      dora_bonus: 'Dora Bonus',
      // Additional UI strings
      language: 'Language',
      accessibility: 'Accessibility',
      close: 'Close',
      confirm: 'Confirm',
      cancel: 'Cancel',
      yes: 'Yes',
      no: 'No',
      loading: 'Loading...',
      error: 'Error',
      player: 'Player',
      dealer: 'Dealer',
      hand: 'Hand',
      discard: 'Discard',
      wall: 'Wall',
      score: 'Score',
      total: 'Total',
      turn: 'Turn',
      game_over: 'Game Over',
      final_score: 'Final Score',
      rank: 'Rank',
      first_place: '1st Place',
      second_place: '2nd Place',
      third_place: '3rd Place',
      fourth_place: '4th Place',
      concealed: 'Concealed',
      open: 'Open',
      riichi: 'Riichi',
      tsumo: 'Tsumo',
      ron: 'Ron',
      dora: 'Dora',
      ura_dora: 'Ura Dora',
      ippatsu: 'Ippatsu',
      wind_of_round: 'Round Wind',
      seat_wind: 'Seat Wind',
      tile_1_of: '1 of',
      tile_2_of: '2 of',
      tile_3_of: '3 of',
      tile_4_of: '4 of',
      tile_5_of: '5 of',
      tile_6_of: '6 of',
      tile_7_of: '7 of',
      tile_8_of: '8 of',
      tile_9_of: '9 of',
      flower: 'Flower',
      season: 'Season',
      // Scoring yaku
      pinfu: 'All Sequences',
      tanyao: 'All Simples',
      iipeiko: 'Double Sequence',
      yakuhai: 'Value Tiles',
      rinshan: 'After a Kong',
      chankan: 'Robbing a Kong',
      haitei: 'Last Tile Draw',
      houtei: 'Last Tile Discard',
      double_riichi: 'Double Riichi',
      chiitoitsu: 'Seven Pairs',
      san_ankou: 'Three Concealed Triplets',
      san_kantsu: 'Three Kongs',
      toitoi: 'All Triplets',
      honitsu: 'Half Flush',
      chinitsu: 'Full Flush',
      kokushi: 'Thirteen Orphans',
      suuankou: 'Four Concealed Triplets',
      daisangen: 'Big Three Dragons',
      shousuushii: 'Little Four Winds',
      daisuushii: 'Big Four Winds',
      tsuuiisou: 'All Honors',
      chinroutou: 'All Terminals',
      ryuuiisou: 'All Green',
      chuuren: 'Nine Gates',
      // Action messages
      draws_tile: 'draws a tile',
      discards: 'discards',
      declares_pong: 'declares Pong',
      declares_chow: 'declares Chow',
      declares_kong: 'declares Kong',
      declares_riichi: 'declares Riichi',
      declares_win: 'declares Win',
      passes: 'passes',
      // Quest / character related
      quest_complete: 'Quest Complete!',
      quest_reward: 'Reward',
      quest_progress: 'Progress',
      relationship: 'Relationship',
      level: 'Level',
    },
    ja: {
      game_title: '\u9EBB\u96C0',
      new_game: '\u65B0\u898F\u30B2\u30FC\u30E0',
      auto_play: '\u81EA\u52D5\u30D7\u30EC\u30A4',
      sort: '\u4E26\u3073\u66FF\u3048',
      tutorial: '\u30C1\u30E5\u30FC\u30C8\u30EA\u30A2\u30EB',
      undo: '\u53D6\u6D88',
      settings: '\u8A2D\u5B9A',
      your_turn: '\u3042\u306A\u305F\u306E\u756A',
      round: '\u5C40',
      tiles_remaining: '\u6B8B\u308A\u724C',
      east_wind: '\u6771\u98A8',
      south_wind: '\u5357\u98A8',
      west_wind: '\u897F\u98A8',
      north_wind: '\u5317\u98A8',
      pong: '\u30DD\u30F3',
      chow: '\u30C1\u30FC',
      kong: '\u30AB\u30F3',
      win: '\u30ED\u30F3',
      pass: '\u30D1\u30B9',
      declare_win: '\u30C4\u30E2\uFF01',
      declare_kong: '\u30AB\u30F3',
      declare_riichi: '\u30EA\u30FC\u30C1\uFF01',
      tenpai: '\u8074\u724C',
      winning_hand: '\u548C\u4E86\uFF01',
      away: '\u5411\u8074',
      shanten: '\u5411\u8074\u6570',
      game_log: '\u724C\u8B5C',
      game_chat: '\u30C1\u30E3\u30C3\u30C8',
      by_suit: '\u8272\u9806',
      by_value: '\u6570\u9806',
      next_round: '\u6B21\u306E\u5C40',
      review_hand: '\u5FA9\u7FD2',
      difficulty: 'AI\u96E3\u6613\u5EA6',
      hint_level: '\u30D2\u30F3\u30C8\u30EC\u30D9\u30EB',
      chat_level: 'AI\u30C1\u30E3\u30C3\u30C8',
      game_speed: '\u30B2\u30FC\u30E0\u901F\u5EA6',
      beginner: '\u521D\u5FC3\u8005',
      basic: '\u57FA\u672C',
      intermediate: '\u4E2D\u7D1A',
      advanced: '\u4E0A\u7D1A',
      expert: '\u9054\u4EBA',
      practice: '\u7DF4\u7FD2',
      multiplayer: '\u30DE\u30EB\u30C1',
      lessons: '\u30EC\u30C3\u30B9\u30F3',
      you_win: '\u3042\u304C\u308A\uFF01',
      draw: '\u6D41\u5C40',
      points: '\u70B9',
      bamboo: '\u7D22\u5B50',
      circles: '\u7B52\u5B50',
      characters: '\u842C\u5B50',
      red_dragon: '\u4E2D',
      green_dragon: '\u767C',
      white_dragon: '\u767D',
      all_sequences: '\u5E73\u548C',
      all_triplets: '\u5BFE\u3005\u548C',
      self_drawn: '\u81EA\u6478',
      fully_concealed: '\u9580\u524D\u6E05',
      flower_bonus: '\u82B1\u724C',
      riichi_bonus: '\u30EA\u30FC\u30C1',
      dealer_bonus: '\u89AA',
      dora_bonus: '\u30C9\u30E9',
      language: '\u8A00\u8A9E',
      accessibility: '\u30A2\u30AF\u30BB\u30B7\u30D3\u30EA\u30C6\u30A3',
      close: '\u9589\u3058\u308B',
      confirm: '\u78BA\u8A8D',
      cancel: '\u30AD\u30E3\u30F3\u30BB\u30EB',
      yes: '\u306F\u3044',
      no: '\u3044\u3044\u3048',
      loading: '\u8AAD\u307F\u8FBC\u307F\u4E2D...',
      error: '\u30A8\u30E9\u30FC',
      player: '\u30D7\u30EC\u30A4\u30E4\u30FC',
      dealer: '\u89AA',
      hand: '\u624B\u724C',
      discard: '\u6368\u3066\u724C',
      wall: '\u5C71',
      score: '\u5F97\u70B9',
      total: '\u5408\u8A08',
      turn: '\u30BF\u30FC\u30F3',
      game_over: '\u7D42\u4E86',
      final_score: '\u6700\u7D42\u5F97\u70B9',
      rank: '\u9806\u4F4D',
      concealed: '\u9580\u524D',
      open: '\u526F\u9732',
      riichi: '\u30EA\u30FC\u30C1',
      tsumo: '\u30C4\u30E2',
      ron: '\u30ED\u30F3',
      dora: '\u30C9\u30E9',
      ura_dora: '\u88CF\u30C9\u30E9',
      ippatsu: '\u4E00\u767A',
      wind_of_round: '\u5834\u98A8',
      seat_wind: '\u81EA\u98A8',
      flower: '\u82B1',
      season: '\u5B63\u7BC0',
      pinfu: '\u5E73\u548C',
      tanyao: '\u65AD\u5E3A\u4E5D',
      yakuhai: '\u5F79\u724C',
      honitsu: '\u6DF7\u4E00\u8272',
      chinitsu: '\u6E05\u4E00\u8272',
      kokushi: '\u56FD\u58EB\u7121\u53CC',
      suuankou: '\u56DB\u6697\u523B',
      daisangen: '\u5927\u4E09\u5143',
      tsuuiisou: '\u5B57\u4E00\u8272',
      draws_tile: '\u30C4\u30E2',
      discards: '\u6368\u3066',
      declares_pong: '\u30DD\u30F3',
      declares_chow: '\u30C1\u30FC',
      declares_kong: '\u30AB\u30F3',
      declares_riichi: '\u30EA\u30FC\u30C1\u5BA3\u8A00',
      declares_win: '\u548C\u4E86',
      passes: '\u30D1\u30B9',
      quest_complete: '\u30AF\u30A8\u30B9\u30C8\u5B8C\u4E86\uFF01',
      quest_reward: '\u5831\u916C',
      quest_progress: '\u9032\u6357',
      relationship: '\u95A2\u4FC2',
      level: '\u30EC\u30D9\u30EB',
    },
    zh: {
      game_title: '\u9EBB\u5C06',
      new_game: '\u65B0\u6E38\u620F',
      auto_play: '\u81EA\u52A8',
      sort: '\u6392\u5E8F',
      tutorial: '\u6559\u7A0B',
      undo: '\u64A4\u9500',
      settings: '\u8BBE\u7F6E',
      your_turn: '\u4F60\u7684\u56DE\u5408',
      round: '\u5C40',
      tiles_remaining: '\u5269\u4F59',
      east_wind: '\u4E1C\u98CE',
      south_wind: '\u5357\u98CE',
      west_wind: '\u897F\u98CE',
      north_wind: '\u5317\u98CE',
      pong: '\u78B0',
      chow: '\u5403',
      kong: '\u6760',
      win: '\u80E1',
      pass: '\u8FC7',
      declare_win: '\u80E1\u4E86\uFF01',
      declare_kong: '\u6760',
      declare_riichi: '\u7ACB\u76F4\uFF01',
      tenpai: '\u542C\u724C',
      winning_hand: '\u80E1\u724C\uFF01',
      away: '\u5411\u542C',
      shanten: '\u5411\u542C\u6570',
      game_log: '\u8BB0\u5F55',
      game_chat: '\u804A\u5929',
      by_suit: '\u6309\u82B1\u8272',
      by_value: '\u6309\u6570\u503C',
      next_round: '\u4E0B\u4E00\u5C40',
      review_hand: '\u56DE\u987E',
      difficulty: 'AI\u96BE\u5EA6',
      hint_level: '\u63D0\u793A\u7B49\u7EA7',
      chat_level: 'AI\u804A\u5929',
      game_speed: '\u6E38\u620F\u901F\u5EA6',
      beginner: '\u521D\u5B66\u8005',
      basic: '\u57FA\u7840',
      intermediate: '\u4E2D\u7EA7',
      advanced: '\u9AD8\u7EA7',
      expert: '\u4E13\u5BB6',
      practice: '\u7EC3\u4E60',
      multiplayer: '\u591A\u4EBA',
      lessons: '\u8BFE\u7A0B',
      you_win: '\u4F60\u8D62\u4E86\uFF01',
      draw: '\u6D41\u5C40',
      points: '\u5206',
      bamboo: '\u6761',
      circles: '\u7B52',
      characters: '\u4E07',
      red_dragon: '\u4E2D',
      green_dragon: '\u53D1',
      white_dragon: '\u767D',
      all_sequences: '\u5E73\u548C',
      all_triplets: '\u5BF9\u5BF9\u548C',
      self_drawn: '\u81EA\u6478',
      fully_concealed: '\u95E8\u524D\u6E05',
      flower_bonus: '\u82B1\u724C',
      riichi_bonus: '\u7ACB\u76F4',
      dealer_bonus: '\u5E84\u5BB6',
      dora_bonus: '\u5B9D\u724C',
      language: '\u8BED\u8A00',
      accessibility: '\u65E0\u969C\u788D',
      close: '\u5173\u95ED',
      confirm: '\u786E\u8BA4',
      cancel: '\u53D6\u6D88',
      yes: '\u662F',
      no: '\u5426',
      loading: '\u52A0\u8F7D\u4E2D...',
      error: '\u9519\u8BEF',
      player: '\u73A9\u5BB6',
      dealer: '\u5E84\u5BB6',
      hand: '\u624B\u724C',
      discard: '\u5F03\u724C',
      wall: '\u724C\u5C71',
      score: '\u5F97\u5206',
      total: '\u603B\u8BA1',
      turn: '\u56DE\u5408',
      game_over: '\u6E38\u620F\u7ED3\u675F',
      final_score: '\u6700\u7EC8\u5F97\u5206',
      concealed: '\u95E8\u524D',
      open: '\u526F\u9732',
      riichi: '\u7ACB\u76F4',
      tsumo: '\u81EA\u6478',
      ron: '\u8363\u548C',
      dora: '\u5B9D\u724C',
      flower: '\u82B1',
      draws_tile: '\u6478\u724C',
      discards: '\u6253\u51FA',
      declares_pong: '\u78B0',
      declares_chow: '\u5403',
      declares_kong: '\u6760',
      declares_riichi: '\u7ACB\u76F4',
      declares_win: '\u80E1\u724C',
      passes: '\u8FC7',
      quest_complete: '\u4EFB\u52A1\u5B8C\u6210\uFF01',
      quest_reward: '\u5956\u52B1',
      quest_progress: '\u8FDB\u5EA6',
      relationship: '\u5173\u7CFB',
      level: '\u7B49\u7EA7',
    },
    ko: {
      game_title: '\uB9C8\uC791',
      new_game: '\uC0C8 \uAC8C\uC784',
      auto_play: '\uC790\uB3D9',
      sort: '\uC815\uB82C',
      tutorial: '\uD29C\uD1A0\uB9AC\uC5BC',
      undo: '\uCDE8\uC18C',
      settings: '\uC124\uC815',
      your_turn: '\uB2F9\uC2E0 \uCC28\uB840',
      round: '\uAD6D',
      tiles_remaining: '\uB0A8\uC740 \uD0C0\uC77C',
      east_wind: '\uB3D9\uD48D',
      south_wind: '\uB0A8\uD48D',
      west_wind: '\uC11C\uD48D',
      north_wind: '\uBD81\uD48D',
      pong: '\uD305',
      chow: '\uCE58',
      kong: '\uAE61',
      win: '\uB860',
      pass: '\uD328\uC2A4',
      declare_win: '\uC2B9\uB9AC!',
      declare_kong: '\uAE61',
      declare_riichi: '\uB9AC\uCE58!',
      tenpai: '\uD150\uD30C\uC774',
      winning_hand: '\uC2B9\uB9AC!',
      away: '\uD5A5\uCCAD',
      shanten: '\uD5A5\uCCAD\uC218',
      game_log: '\uAE30\uB85D',
      game_chat: '\uCC44\uD305',
      by_suit: '\uBB38\uC591\uBCC4',
      by_value: '\uC22B\uC790\uBCC4',
      next_round: '\uB2E4\uC74C \uAD6D',
      review_hand: '\uBCF5\uC2B5',
      difficulty: 'AI \uB09C\uC774\uB3C4',
      hint_level: '\uD78C\uD2B8 \uB808\uBCA8',
      beginner: '\uCD08\uBCF4\uC790',
      basic: '\uAE30\uCD08',
      intermediate: '\uC911\uAE09',
      advanced: '\uACE0\uAE09',
      expert: '\uC804\uBB38\uAC00',
      practice: '\uC5F0\uC2B5',
      multiplayer: '\uBA40\uD2F0',
      lessons: '\uB808\uC2A8',
      you_win: '\uC2B9\uB9AC!',
      draw: '\uC720\uAD6D',
      points: '\uC810',
      bamboo: '\uC0AD',
      circles: '\uD1B5',
      characters: '\uB9CC',
      red_dragon: '\uC911',
      green_dragon: '\uBC1C',
      white_dragon: '\uBC31',
      all_sequences: '\uD3C9\uD654',
      all_triplets: '\uB300\uB300\uD654',
      self_drawn: '\uCE20\uBAA8',
      fully_concealed: '\uBA58\uC820',
      language: '\uC5B8\uC5B4',
      close: '\uB2EB\uAE30',
      confirm: '\uD655\uC778',
      cancel: '\uCDE8\uC18C',
      yes: '\uC608',
      no: '\uC544\uB2C8\uC624',
      loading: '\uB85C\uB529...',
      player: '\uD50C\uB808\uC774\uC5B4',
      score: '\uC810\uC218',
      game_over: '\uAC8C\uC784 \uC885\uB8CC',
      riichi: '\uB9AC\uCE58',
      tsumo: '\uCE20\uBAA8',
      ron: '\uB860',
      dora: '\uB3C4\uB77C',
      flower: '\uAF43',
      draws_tile: '\uCE20\uBAA8',
      discards: '\uBC84\uB9BC',
      declares_pong: '\uD305',
      declares_chow: '\uCE58',
      declares_kong: '\uAE61',
      declares_win: '\uC2B9\uB9AC',
      passes: '\uD328\uC2A4',
      quest_complete: '\uD018\uC2A4\uD2B8 \uC644\uB8CC!',
      quest_reward: '\uBCF4\uC0C1',
      quest_progress: '\uC9C4\uD589',
      relationship: '\uAD00\uACC4',
      level: '\uB808\uBCA8',
    }
  };

  // ── Default / fallback language ────────────────────────────────────
  var DEFAULT_LANG = 'en';

  // ── Localization class ─────────────────────────────────────────────
  function Localization() {
    this._currentLang = DEFAULT_LANG;
    this._customTranslations = {};
    this._changeListeners = [];
    this._selectorEl = null;
    this._loadLanguage();
  }

  /**
   * Load persisted language preference from localStorage.
   */
  Localization.prototype._loadLanguage = function() {
    if (typeof localStorage === 'undefined') return;
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored && TRANSLATIONS[stored]) {
        this._currentLang = stored;
      }
    } catch (e) { /* ignore */ }
  };

  /**
   * Persist current language to localStorage.
   */
  Localization.prototype._saveLanguage = function() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, this._currentLang);
    } catch (e) { /* ignore */ }
  };

  /**
   * Set the active language.
   * @param {string} langCode - 'en', 'ja', 'zh', or 'ko'
   */
  Localization.prototype.setLanguage = function(langCode) {
    if (!TRANSLATIONS[langCode]) {
      console.warn('[Localization] Unknown language code: ' + langCode + '. Falling back to en.');
      langCode = DEFAULT_LANG;
    }
    var oldLang = this._currentLang;
    this._currentLang = langCode;
    this._saveLanguage();

    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', langCode);
    }

    // Notify listeners
    for (var i = 0; i < this._changeListeners.length; i++) {
      try {
        this._changeListeners[i](langCode, oldLang);
      } catch (e) {
        console.error('[Localization] Listener error:', e);
      }
    }

    this.applyToDOM();
  };

  /**
   * Translate a key to the current language. Falls back to English, then to the key itself.
   * Supports simple string interpolation with {0}, {1}, etc.
   * @param {string} key - Translation key
   * @param {...*} args - Interpolation arguments
   * @returns {string}
   */
  Localization.prototype.t = function(key) {
    var args = Array.prototype.slice.call(arguments, 1);
    var value = null;

    // Check custom translations first
    if (this._customTranslations[this._currentLang] &&
        this._customTranslations[this._currentLang][key] !== undefined) {
      value = this._customTranslations[this._currentLang][key];
    }
    // Then check built-in translations
    else if (TRANSLATIONS[this._currentLang] &&
             TRANSLATIONS[this._currentLang][key] !== undefined) {
      value = TRANSLATIONS[this._currentLang][key];
    }
    // Fall back to English
    else if (TRANSLATIONS[DEFAULT_LANG] &&
             TRANSLATIONS[DEFAULT_LANG][key] !== undefined) {
      value = TRANSLATIONS[DEFAULT_LANG][key];
    }
    // Fall back to the key itself
    else {
      value = key;
    }

    // String interpolation
    if (args.length > 0) {
      for (var i = 0; i < args.length; i++) {
        value = value.replace('{' + i + '}', String(args[i]));
      }
    }

    return value;
  };

  /**
   * Get the current language code.
   * @returns {string}
   */
  Localization.prototype.getCurrentLanguage = function() {
    return this._currentLang;
  };

  /**
   * Get all available languages with metadata.
   * @returns {Object}
   */
  Localization.prototype.getAvailableLanguages = function() {
    return JSON.parse(JSON.stringify(LANGUAGES));
  };

  /**
   * Register a callback for language changes.
   * @param {Function} fn - Callback receiving (newLang, oldLang)
   */
  Localization.prototype.onLanguageChange = function(fn) {
    if (typeof fn === 'function') {
      this._changeListeners.push(fn);
    }
  };

  /**
   * Remove a language change listener.
   * @param {Function} fn
   */
  Localization.prototype.offLanguageChange = function(fn) {
    this._changeListeners = this._changeListeners.filter(function(listener) {
      return listener !== fn;
    });
  };

  /**
   * Add custom translations (e.g., from a mod or plugin).
   * @param {string} langCode
   * @param {Object} translations - key-value pairs
   */
  Localization.prototype.addTranslations = function(langCode, translations) {
    if (!this._customTranslations[langCode]) {
      this._customTranslations[langCode] = {};
    }
    for (var key in translations) {
      if (translations.hasOwnProperty(key)) {
        this._customTranslations[langCode][key] = translations[key];
      }
    }
  };

  /**
   * Check if a translation key exists for the current language.
   * @param {string} key
   * @returns {boolean}
   */
  Localization.prototype.hasKey = function(key) {
    if (this._customTranslations[this._currentLang] &&
        this._customTranslations[this._currentLang][key] !== undefined) {
      return true;
    }
    return !!(TRANSLATIONS[this._currentLang] && TRANSLATIONS[this._currentLang][key] !== undefined);
  };

  /**
   * Get all translation keys for the current language.
   * @returns {string[]}
   */
  Localization.prototype.getKeys = function() {
    var keys = {};
    var langData = TRANSLATIONS[this._currentLang] || {};
    var customData = this._customTranslations[this._currentLang] || {};
    var fallbackData = TRANSLATIONS[DEFAULT_LANG] || {};
    var k;
    for (k in fallbackData) { if (fallbackData.hasOwnProperty(k)) keys[k] = true; }
    for (k in langData) { if (langData.hasOwnProperty(k)) keys[k] = true; }
    for (k in customData) { if (customData.hasOwnProperty(k)) keys[k] = true; }
    return Object.keys(keys);
  };

  /**
   * Apply translations to all DOM elements with a data-i18n attribute.
   * Elements should have data-i18n="key" to be translated.
   * Optional data-i18n-attr to set an attribute instead of textContent.
   */
  Localization.prototype.applyToDOM = function() {
    if (typeof document === 'undefined') return;

    var self = this;
    var elements = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];
      var key = el.getAttribute('data-i18n');
      var attr = el.getAttribute('data-i18n-attr');
      var translated = self.t(key);

      if (attr) {
        el.setAttribute(attr, translated);
      } else {
        el.textContent = translated;
      }
    }

    // Also update elements with data-i18n-placeholder
    var placeholders = document.querySelectorAll('[data-i18n-placeholder]');
    for (var p = 0; p < placeholders.length; p++) {
      var plEl = placeholders[p];
      var plKey = plEl.getAttribute('data-i18n-placeholder');
      plEl.setAttribute('placeholder', self.t(plKey));
    }

    // Update elements with data-i18n-title
    var titles = document.querySelectorAll('[data-i18n-title]');
    for (var t = 0; t < titles.length; t++) {
      var tEl = titles[t];
      var tKey = tEl.getAttribute('data-i18n-title');
      tEl.setAttribute('title', self.t(tKey));
    }

    // Update elements with data-i18n-aria-label
    var ariaLabels = document.querySelectorAll('[data-i18n-aria-label]');
    for (var a = 0; a < ariaLabels.length; a++) {
      var aEl = ariaLabels[a];
      var aKey = aEl.getAttribute('data-i18n-aria-label');
      aEl.setAttribute('aria-label', self.t(aKey));
    }
  };

  /**
   * Get the localized name for a tile.
   * @param {Object} tile - Tile object with suit and value
   * @returns {string}
   */
  Localization.prototype.getTileName = function(tile) {
    if (!tile) return '';
    if (tile.suit) {
      var suitLower = tile.suit.toLowerCase();
      if (suitLower === 'wind') {
        var winds = ['east_wind', 'south_wind', 'west_wind', 'north_wind'];
        return this.t(winds[tile.value] || 'east_wind');
      }
      if (suitLower === 'dragon') {
        var dragons = ['red_dragon', 'green_dragon', 'white_dragon'];
        return this.t(dragons[tile.value] || 'red_dragon');
      }
      if (suitLower === 'flower') {
        return this.t('flower') + ' ' + (tile.value + 1);
      }
      var suitKeys = {
        bamboo: 'bamboo', bam: 'bamboo',
        circles: 'circles', pin: 'circles',
        characters: 'characters', man: 'characters', wan: 'characters'
      };
      var suitKey = suitKeys[suitLower] || suitLower;
      return (tile.value + 1) + ' ' + this.t(suitKey);
    }
    return String(tile);
  };

  /**
   * Build and return a language selector dropdown UI element.
   * @returns {HTMLElement|null}
   */
  Localization.prototype.buildLanguageSelectorUI = function() {
    if (typeof document === 'undefined') return null;

    var self = this;

    // Remove existing selector if present
    if (this._selectorEl && this._selectorEl.parentNode) {
      this._selectorEl.parentNode.removeChild(this._selectorEl);
    }

    var container = document.createElement('div');
    container.className = 'lang-selector';
    container.style.cssText = 'display:inline-block;position:relative;';

    var label = document.createElement('label');
    label.textContent = this.t('language') + ': ';
    label.style.cssText = 'margin-right:6px;font-size:0.9em;';
    label.setAttribute('for', 'mj-lang-select');
    container.appendChild(label);

    var select = document.createElement('select');
    select.id = 'mj-lang-select';
    select.setAttribute('aria-label', 'Select language');
    select.style.cssText = 'padding:4px 8px;border-radius:4px;border:1px solid #666;' +
      'background:#333;color:#fff;font-size:0.95em;cursor:pointer;';

    var langCodes = Object.keys(LANGUAGES);
    for (var i = 0; i < langCodes.length; i++) {
      var code = langCodes[i];
      var lang = LANGUAGES[code];
      var option = document.createElement('option');
      option.value = code;
      option.textContent = lang.flag + ' ' + lang.nativeName + ' (' + lang.name + ')';
      if (code === self._currentLang) {
        option.selected = true;
      }
      select.appendChild(option);
    }

    select.addEventListener('change', function() {
      self.setLanguage(select.value);
      // Update the label text when language changes
      label.textContent = self.t('language') + ': ';
    });

    container.appendChild(select);
    this._selectorEl = container;
    return container;
  };

  /**
   * Convenience: translate an action message (e.g., "Player East discards 3 of Bamboo").
   * @param {string} playerName
   * @param {string} actionKey - e.g. 'discards', 'declares_pong'
   * @param {string} [tileDesc] - optional tile description
   * @returns {string}
   */
  Localization.prototype.describeAction = function(playerName, actionKey, tileDesc) {
    var action = this.t(actionKey);
    var msg = playerName + ' ' + action;
    if (tileDesc) {
      msg += ' ' + tileDesc;
    }
    return msg;
  };

  /**
   * Format a number with the appropriate points suffix.
   * @param {number} value
   * @returns {string}
   */
  Localization.prototype.formatPoints = function(value) {
    return value + ' ' + this.t('points');
  };

  /**
   * Get the raw translations object for a given language (read-only copy).
   * @param {string} langCode
   * @returns {Object|null}
   */
  Localization.prototype.getTranslations = function(langCode) {
    if (!TRANSLATIONS[langCode]) return null;
    return JSON.parse(JSON.stringify(TRANSLATIONS[langCode]));
  };

  // ── Export ─────────────────────────────────────────────────────────
  root.MJ.Localization = Localization;

})(typeof window !== 'undefined' ? window : global);
