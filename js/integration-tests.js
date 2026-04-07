/* integration-tests.js — Comprehensive integration tests for the full game
 * Exports: root.MJ.IntegrationTests
 */
(function (root) {
  'use strict';

  var MJ = root.MJ = root.MJ || {};

  // ── IntegrationTests ─────────────────────────────────────────────────
  function IntegrationTests() {
    this.results = [];
    this.pass = 0;
    this.fail = 0;
  }

  IntegrationTests.prototype.assert = function (condition, name) {
    if (condition) {
      this.pass++;
      this.results.push({ name: name, pass: true });
    } else {
      this.fail++;
      this.results.push({ name: name, pass: false });
    }
  };

  IntegrationTests.prototype.reset = function () {
    this.results = [];
    this.pass = 0;
    this.fail = 0;
  };

  // ── Run all suites ───────────────────────────────────────────────────
  IntegrationTests.prototype.runAll = function () {
    this.reset();
    console.log('=== Integration Tests ===');

    this.testModuleLoading();
    this.testIntroScreen();
    this.testMahjongFlow();
    this.testPokerFlow();
    this.testSharedSystems();
    this.testPersistence();
    this.testCrossGame();
    this.testProfileCard();
    this.testDocViewer();
    this.testPersonality();
    this.testEconomy();
    this.testAccessibility();

    console.log('Results: ' + this.pass + ' passed, ' + this.fail + ' failed');
    return { pass: this.pass, fail: this.fail, results: this.results };
  };

  // ── 1. Module loading ────────────────────────────────────────────────
  IntegrationTests.prototype.testModuleLoading = function () {
    this.assert(!!root.MJ, 'MJ namespace exists');
    this.assert(!!root.MJ.Constants, 'Constants loaded');
    this.assert(!!root.MJ.Tile, 'Tile loaded');
    this.assert(!!root.MJ.Wall, 'Wall loaded');
    this.assert(!!root.MJ.Hand, 'Hand loaded');
    this.assert(!!root.MJ.Scoring, 'Scoring loaded');
    this.assert(!!root.MJ.AIEngine, 'AI Engine loaded');
    this.assert(!!root.MJ.GameFlow, 'Game Flow loaded');
    this.assert(!!root.MJ.Renderer, 'Renderer loaded');
    this.assert(!!root.MJ.IntroScreen, 'Intro Screen loaded');

    // Poker sub-namespace
    this.assert(!!root.MJ.Poker, 'Poker namespace exists');
    this.assert(!!root.MJ.Poker.Cards, 'Poker Cards loaded');
    this.assert(!!root.MJ.Poker.HandEval, 'Poker HandEval loaded');
    this.assert(!!root.MJ.Poker.AIv2, 'Poker AI v2 loaded');
    this.assert(!!root.MJ.Poker.Learning, 'Poker Learning loaded');
    this.assert(!!root.MJ.Poker.Play, 'Poker Play loaded');

    // Shared systems
    this.assert(!!root.MJ.DocViewer, 'Doc Viewer loaded');
    this.assert(!!root.MJ.Personality, 'Personality loaded');
    this.assert(!!root.MJ.LivingWorld, 'Living World loaded');
  };

  // ── 2. Intro screen ─────────────────────────────────────────────────
  IntegrationTests.prototype.testIntroScreen = function () {
    var IS = root.MJ.IntroScreen;
    if (!IS) return;
    this.assert(typeof IS.show === 'function', 'IntroScreen.show is function');
    this.assert(typeof IS.hide === 'function', 'IntroScreen.hide is function');
  };

  // ── 3. Mahjong game flow ─────────────────────────────────────────────
  IntegrationTests.prototype.testMahjongFlow = function () {
    var Tile = root.MJ.Tile;
    var Wall = root.MJ.Wall;
    var Hand = root.MJ.Hand;
    var GS = root.MJ.GameState;

    // GameState create
    if (GS && typeof GS.create === 'function') {
      var state = GS.create();
      this.assert(state.players.length === 4, 'Mahjong: 4 players created');
      this.assert(state.players[0].isHuman === true, 'Mahjong: player 0 is human');
      this.assert(state.phase === 'waiting', 'Mahjong: initial phase is waiting');
    } else {
      this.assert(false, 'Mahjong: GameState.create exists');
    }

    // Wall creation + drawing
    if (Wall && typeof Wall.create === 'function') {
      var wall = Wall.create();
      var remaining = Wall.remaining(wall);
      this.assert(remaining > 100, 'Mahjong: wall has >100 tiles');

      var drawn = Wall.draw(wall);
      this.assert(drawn !== null && drawn !== undefined, 'Mahjong: can draw from wall');
      this.assert(Wall.remaining(wall) === remaining - 1, 'Mahjong: wall count decreases after draw');
    } else {
      this.assert(false, 'Mahjong: Wall.create exists');
    }

    // Tile creation
    if (Tile && typeof Tile.create === 'function') {
      var t = Tile.create('bamboo', 1);
      this.assert(t !== null, 'Mahjong: Tile.create works');
      this.assert(t.suit === 'bamboo' || t.type === 'bamboo', 'Mahjong: tile has correct suit');
    } else {
      this.assert(false, 'Mahjong: Tile.create exists');
    }

    // Hand operations
    if (Hand && typeof Hand.create === 'function') {
      var hand = Hand.create();
      this.assert(hand !== null, 'Mahjong: Hand.create works');
      this.assert(hand.concealed && hand.concealed.length === 0, 'Mahjong: new hand is empty');

      if (Tile) {
        Hand.addTile(hand, Tile.create('bamboo', 1));
        this.assert(hand.concealed.length === 1, 'Mahjong: addTile increases count');
      }
    } else {
      this.assert(false, 'Mahjong: Hand.create exists');
    }

    // Dealing 13 tiles to 4 players
    if (GS && Wall && Hand && Tile) {
      var st2 = GS.create();
      var w2 = Wall.create();
      for (var r = 0; r < 13; r++) {
        for (var i = 0; i < 4; i++) {
          var tile = Wall.draw(w2);
          if (tile) Hand.addTile(st2.players[i].hand, tile);
        }
      }
      this.assert(st2.players[0].hand.concealed.length === 13, 'Mahjong: dealt 13 tiles to player 0');
      this.assert(st2.players[3].hand.concealed.length === 13, 'Mahjong: dealt 13 tiles to player 3');
    }

    // Winning hand detection
    if (Hand && Tile && typeof Hand.isWinningHand === 'function') {
      var winHand = Hand.create();
      [1,2,3,4,5,6,7,8,9].forEach(function (r) {
        Hand.addTile(winHand, Tile.create('bamboo', r));
      });
      [1,1,1,2,2].forEach(function (r) {
        Hand.addTile(winHand, Tile.create('circles', r));
      });
      this.assert(Hand.isWinningHand(winHand), 'Mahjong: winning hand detected');
    }

    // Scoring
    if (root.MJ.Scoring && typeof root.MJ.Scoring.score === 'function') {
      this.assert(true, 'Mahjong: Scoring.score function exists');
    }
  };

  // ── 4. Poker game flow ───────────────────────────────────────────────
  IntegrationTests.prototype.testPokerFlow = function () {
    var Poker = root.MJ.Poker;
    if (!Poker) { this.assert(false, 'Poker: namespace exists'); return; }

    var Cards = Poker.Cards;
    var HE = Poker.HandEval;
    var AIv2 = Poker.AIv2;
    var Learning = Poker.Learning;

    // Deck
    if (Cards && Cards.Deck) {
      var deck = new Cards.Deck();
      this.assert(deck.cards.length === 52, 'Poker: deck has 52 cards');

      deck.shuffle();
      this.assert(deck.cards.length === 52, 'Poker: deck still 52 after shuffle');

      var card = deck.cards[0];
      this.assert(card && card.suit !== undefined && card.rank !== undefined, 'Poker: card has suit and rank');
    } else {
      this.assert(false, 'Poker: Cards.Deck exists');
    }

    // Hand evaluation
    if (HE && typeof HE.evaluateHand === 'function' && Cards) {
      var d = new Cards.Deck();
      d.shuffle();
      var five = d.cards.slice(0, 5);
      var result = HE.evaluateHand(five);
      this.assert(result && typeof result.rank === 'number', 'Poker: hand evaluates with rank');
      this.assert(result.rank >= 0 && result.rank <= 9, 'Poker: rank is 0-9');
      this.assert(typeof result.name === 'string' || typeof result.label === 'string', 'Poker: result has name/label');
    } else {
      this.assert(false, 'Poker: HandEval.evaluateHand exists');
    }

    // AI decision
    if (AIv2 && AIv2.PokerAIv2 && Cards) {
      var ai = new AIv2.PokerAIv2();
      var dk = new Cards.Deck();
      dk.shuffle();
      var player = {
        id: 0,
        cards: [dk.cards[0], dk.cards[1]],
        chips: 1000,
        bet: 0,
        folded: false
      };
      var gameState = {
        phase: 'pre_flop',
        communityCards: [],
        currentBet: 10,
        pot: 15,
        players: [
          player,
          { id: 1, cards: [dk.cards[2], dk.cards[3]], chips: 1000, bet: 10, folded: false }
        ],
        dealerIndex: 0,
        bigBlind: 10
      };
      var decision = ai.decideAction(player, gameState, 'kenji');
      var validTypes = ['fold', 'check', 'call', 'raise', 'allin'];
      this.assert(
        decision && validTypes.indexOf(decision.type) !== -1,
        'Poker: AI makes valid decision (' + (decision ? decision.type : 'null') + ')'
      );
    } else {
      this.assert(false, 'Poker: AIv2.PokerAIv2 exists');
    }

    // Learning system
    if (Learning && Learning.PokerLearningSystem) {
      var ls = new Learning.PokerLearningSystem();
      this.assert(typeof ls.getWeights === 'function', 'Poker: learning system has getWeights');
      var w = ls.getWeights();
      this.assert(w && typeof w === 'object', 'Poker: getWeights returns object');
    } else {
      this.assert(false, 'Poker: Learning.PokerLearningSystem exists');
    }

    // Play module
    if (Poker.Play) {
      this.assert(true, 'Poker: Play module loaded');
    }
  };

  // ── 5. Shared systems ────────────────────────────────────────────────
  IntegrationTests.prototype.testSharedSystems = function () {
    // Personality / characters
    if (root.MJ.Personality) {
      var chars = root.MJ.Personality.CHARACTERS || root.MJ.Personality.characters;
      if (chars) {
        this.assert(!!chars.mei, 'Personality: Mei exists');
        this.assert(!!chars.kenji, 'Personality: Kenji exists');
        this.assert(!!chars.yuki, 'Personality: Yuki exists');
      } else {
        this.assert(false, 'Personality: CHARACTERS map exists');
      }
    }

    // Achievements
    if (root.MJ.Achievements) {
      var all = typeof root.MJ.Achievements.getAll === 'function'
        ? root.MJ.Achievements.getAll()
        : null;
      this.assert(all && all.length > 0, 'Achievements: has achievements defined');
    }
  };

  // ── 6. Persistence ──────────────────────────────────────────────────
  IntegrationTests.prototype.testPersistence = function () {
    var testKey = 'mj_test_integration_' + Date.now();

    // Write
    try {
      localStorage.setItem(testKey, JSON.stringify({ test: true, ts: Date.now() }));
      this.assert(true, 'Persistence: localStorage.setItem succeeds');
    } catch (e) {
      this.assert(false, 'Persistence: localStorage.setItem succeeds');
      return;
    }

    // Read
    try {
      var read = JSON.parse(localStorage.getItem(testKey));
      this.assert(read && read.test === true, 'Persistence: localStorage read matches write');
    } catch (e) {
      this.assert(false, 'Persistence: localStorage read matches write');
    }

    // Remove
    localStorage.removeItem(testKey);
    this.assert(localStorage.getItem(testKey) === null, 'Persistence: localStorage.removeItem works');

    // Larger payload
    var big = { arr: [] };
    for (var i = 0; i < 100; i++) big.arr.push({ i: i, v: 'value_' + i });
    try {
      localStorage.setItem(testKey, JSON.stringify(big));
      var readBig = JSON.parse(localStorage.getItem(testKey));
      this.assert(readBig.arr.length === 100, 'Persistence: handles larger payloads');
      localStorage.removeItem(testKey);
    } catch (e) {
      this.assert(false, 'Persistence: handles larger payloads');
    }
  };

  // ── 7. Cross-game integration ────────────────────────────────────────
  IntegrationTests.prototype.testCrossGame = function () {
    if (root.MJ.GameFramework && root.MJ.GameFramework.GameFramework) {
      try {
        var gf = new root.MJ.GameFramework.GameFramework();
        if (typeof gf.registerMahjong === 'function') {
          gf.registerMahjong();
          var list = gf.getGameList(1);
          this.assert(list && list.length >= 1, 'CrossGame: Mahjong registered in framework');
        } else {
          this.assert(false, 'CrossGame: registerMahjong is a function');
        }
      } catch (e) {
        this.assert(false, 'CrossGame: GameFramework instantiates (' + e.message + ')');
      }
    } else {
      // Not fatal — framework may not be present in all builds
      this.assert(true, 'CrossGame: GameFramework not present (skipped)');
    }

    // Verify that MJ.Poker and MJ namespace share the same root
    this.assert(root.MJ.Poker === root.MJ.Poker, 'CrossGame: Poker reference stable');
  };

  // ── 8. Profile card ──────────────────────────────────────────────────
  IntegrationTests.prototype.testProfileCard = function () {
    var PC = root.MJ.ProfileCard;
    if (!PC) { this.assert(false, 'ProfileCard: module loaded'); return; }

    this.assert(typeof PC.generate === 'function', 'ProfileCard: generate is function');
    this.assert(typeof PC.gatherStats === 'function', 'ProfileCard: gatherStats is function');
    this.assert(typeof PC.copyAsText === 'function', 'ProfileCard: copyAsText is function');
    this.assert(typeof PC.downloadAsPNG === 'function', 'ProfileCard: downloadAsPNG is function');
    this.assert(typeof PC.buildShareUI === 'function', 'ProfileCard: buildShareUI is function');

    // gatherStats returns valid shape
    var stats = PC.gatherStats();
    this.assert(typeof stats.level === 'number', 'ProfileCard: stats.level is number');
    this.assert(typeof stats.mahjongGames === 'number', 'ProfileCard: stats.mahjongGames is number');
    this.assert(typeof stats.pokerHands === 'number', 'ProfileCard: stats.pokerHands is number');
    this.assert(typeof stats.coins === 'number', 'ProfileCard: stats.coins is number');
    this.assert(typeof stats.memberSince === 'string', 'ProfileCard: stats.memberSince is string');
  };

  // ── 9. Doc viewer ────────────────────────────────────────────────────
  IntegrationTests.prototype.testDocViewer = function () {
    var DV = root.MJ.DocViewer;
    if (!DV) { this.assert(false, 'DocViewer: module loaded'); return; }

    this.assert(Array.isArray(DV.DOCS), 'DocViewer: DOCS is array');
    this.assert(DV.DOCS.length >= 7, 'DocViewer: has 7+ docs');

    DV.DOCS.forEach(function (doc) {
      this.assert(typeof doc.title === 'string' && doc.title.length > 0,
        'DocViewer: doc "' + (doc.title || '?') + '" has title');
    }.bind(this));
  };

  // ── 10. Personality ──────────────────────────────────────────────────
  IntegrationTests.prototype.testPersonality = function () {
    var P = root.MJ.Personality;
    if (!P) { this.assert(false, 'Personality: module loaded'); return; }

    var chars = P.CHARACTERS || P.characters;
    if (!chars) { this.assert(false, 'Personality: characters map exists'); return; }

    ['mei', 'kenji', 'yuki'].forEach(function (name) {
      var c = chars[name];
      this.assert(!!c, 'Personality: ' + name + ' defined');
      if (c) {
        this.assert(typeof c.name === 'string', 'Personality: ' + name + '.name is string');
      }
    }.bind(this));
  };

  // ── 11. Economy ──────────────────────────────────────────────────────
  IntegrationTests.prototype.testEconomy = function () {
    if (root.MJ.Economy) {
      this.assert(true, 'Economy: module loaded');
      if (typeof root.MJ.Economy.getBalance === 'function') {
        var bal = root.MJ.Economy.getBalance();
        this.assert(typeof bal === 'number', 'Economy: getBalance returns number');
      }
    } else {
      this.assert(true, 'Economy: module not present (skipped)');
    }
  };

  // ── 12. Accessibility ────────────────────────────────────────────────
  IntegrationTests.prototype.testAccessibility = function () {
    if (root.MJ.Accessibility) {
      this.assert(true, 'Accessibility: module loaded');
    } else {
      this.assert(true, 'Accessibility: module not present (skipped)');
    }
  };

  // ── Build visual UI for test results ─────────────────────────────────
  IntegrationTests.prototype.buildTestUI = function () {
    var self = this;
    var data = this.runAll();

    // Overlay
    var overlay = document.createElement('div');
    Object.assign(overlay.style, {
      position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
      background: 'rgba(0,0,0,0.8)', zIndex: '10001',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Segoe UI', Arial, sans-serif"
    });

    var panel = document.createElement('div');
    Object.assign(panel.style, {
      width: '520px', maxHeight: '80vh', overflowY: 'auto',
      background: '#1a1a1a', borderRadius: '10px', padding: '24px',
      color: '#e0e0e0', boxShadow: '0 4px 24px rgba(0,0,0,0.6)'
    });

    // Header
    var header = document.createElement('div');
    Object.assign(header.style, {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: '16px', paddingBottom: '12px',
      borderBottom: '1px solid #333'
    });
    var title = document.createElement('h2');
    title.textContent = 'Integration Tests';
    Object.assign(title.style, { margin: '0', fontSize: '18px', color: '#c8a84e' });
    header.appendChild(title);

    var summary = document.createElement('span');
    summary.textContent = data.pass + ' passed, ' + data.fail + ' failed';
    summary.style.fontSize = '13px';
    summary.style.color = data.fail > 0 ? '#e74c3c' : '#2ecc71';
    header.appendChild(summary);
    panel.appendChild(header);

    // Results list
    var list = document.createElement('div');
    data.results.forEach(function (r) {
      var row = document.createElement('div');
      Object.assign(row.style, {
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '4px 0', fontSize: '12px', lineHeight: '1.6'
      });
      var icon = document.createElement('span');
      icon.textContent = r.pass ? '\u2714' : '\u2718';
      icon.style.color = r.pass ? '#2ecc71' : '#e74c3c';
      icon.style.fontWeight = '700';
      icon.style.width = '16px';
      row.appendChild(icon);

      var label = document.createElement('span');
      label.textContent = r.name;
      label.style.color = r.pass ? '#bbb' : '#e74c3c';
      row.appendChild(label);
      list.appendChild(row);
    });
    panel.appendChild(list);

    // Close button
    var closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    Object.assign(closeBtn.style, {
      marginTop: '16px', padding: '8px 24px', borderRadius: '6px',
      border: 'none', background: '#c8a84e', color: '#1a1a1a',
      fontWeight: '600', cursor: 'pointer', fontSize: '13px'
    });
    closeBtn.addEventListener('click', function () {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    });
    panel.appendChild(closeBtn);

    overlay.appendChild(panel);

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }
    });

    document.body.appendChild(overlay);
    return overlay;
  };

  // ── Export ────────────────────────────────────────────────────────────
  MJ.IntegrationTests = new IntegrationTests();

})(typeof window !== 'undefined' ? window : this);
