/**
 * main.js — Application bootstrap with tutor, chat, hints, and settings
 * See interfaces.js for API documentation
 */
(function () {
  'use strict';
  const GS = window.MJ.GameState;
  const GameFlow = window.MJ.GameFlow;
  const Renderer = window.MJ.Renderer;
  const InputHandler = window.MJ.InputHandler;
  const Tutorial = window.MJ.Tutorial;
  const Sound = window.MJ.Sound;
  const Tile = window.MJ.Tile;
  const { GAME_PHASES } = window.MJ.Constants;

  let state = null;
  let hintEngine = null;
  let tutor = null;
  let llmTutor = null;
  let conversation = null;
  let chatVisible = true;
  let achievements = null;
  let replay = null;
  let llmConfig = null;
  let exploitAI = null;
  let practiceMode = null;
  let gameSpeedMultiplier = 1.0;
  let undoState = null;
  let worldManager = null;
  let personalities = {};
  let crossGameLearning = null;
  let advancedAI = null;
  let ollamaClient = null;
  let voiceSystem = null;
  let musicSystem = null;
  let venueManager = null;
  let dailyChallenges = null;
  let charRelations = null;
  let charLearning = {};
  let charGrowth = null;
  let photoAlbum = null;
  let community = null;
  let economy = null;
  let campaigns = null;
  let tournament = null;
  let handHistory = null;
  let storyArcs = null;
  let cognition = {};

  function init() {
    console.log('[Mahjong] Initializing...');
    Renderer.init('app');
    Sound.init();
    Tutorial.init();

    // Init tutoring systems
    hintEngine = new window.MJ.HintEngine.HintEngine();
    tutor = new window.MJ.Tutor.TutorEngine();
    llmTutor = new window.MJ.LLMTutor.LLMTutor();
    conversation = new window.MJ.LLMPlayers.ConversationManager();
    conversation.init();

    // Init new module instances
    achievements = window.MJ.Achievements; // functional API, not a class
    replay = new window.MJ.Replay.ActionRecorder();
    llmConfig = new window.MJ.LLMConfig.LLMConfig();
    exploitAI = new window.MJ.ExploitativeAI.PlayerProfile();
    exploitAI.load();
    practiceMode = new window.MJ.PracticeMode.PracticeMode();

    // Init living world and personalities
    if (window.MJ.LivingWorld) {
      worldManager = new window.MJ.LivingWorld.WorldManager();
    }
    if (window.MJ.Personality) {
      personalities.mei = new window.MJ.Personality.PersonalityEngine('mei');
      personalities.kenji = new window.MJ.Personality.PersonalityEngine('kenji');
      personalities.yuki = new window.MJ.Personality.PersonalityEngine('yuki');
    }
    if (window.MJ.AIAdvanced) {
      advancedAI = new window.MJ.AIAdvanced.AdvancedAIController();
    }

    // Init media systems
    if (window.MJ.Voice) {
      const VS = window.MJ.Voice.VoiceSystem || window.MJ.Voice;
      voiceSystem = new VS(); voiceSystem.init();
    }
    if (window.MJ.Music) {
      const MS = window.MJ.Music.MusicSystem || window.MJ.Music;
      musicSystem = new MS(); musicSystem.init();
    }
    if (window.MJ.Venues) {
      const VM = window.MJ.Venues.VenueManager || window.MJ.Venues;
      venueManager = typeof VM === 'function' ? new VM() : VM;
      try { if (venueManager.getCurrentVenue) venueManager.applyTheme(venueManager.getCurrentVenue().theme); } catch(e) {}
    }
    if (window.MJ.DailyChallenges) {
      const DC = window.MJ.DailyChallenges.DailyChallengeSystem || window.MJ.DailyChallenges;
      dailyChallenges = typeof DC === 'function' ? new DC() : DC;
    }
    if (window.MJ.CharacterRelations) {
      charRelations = typeof window.MJ.CharacterRelations === 'function'
        ? new window.MJ.CharacterRelations()
        : (window.MJ.CharacterRelations.CharacterRelationships
          ? new window.MJ.CharacterRelations.CharacterRelationships()
          : window.MJ.CharacterRelations);
    }
    if (window.MJ.PhotoAlbum) {
      const PA = window.MJ.PhotoAlbum.PhotoAlbum || window.MJ.PhotoAlbum;
      photoAlbum = typeof PA === 'function' ? new PA() : PA;
    }
    if (window.MJ.Community) {
      const CF = window.MJ.Community.CommunityFeatures || window.MJ.Community;
      community = typeof CF === 'function' ? new CF() : CF;
    }

    // Init character learning for each AI
    if (window.MJ.CharacterLearning) {
      const CL = window.MJ.CharacterLearning.CharacterLearning || window.MJ.CharacterLearning;
      if (typeof CL === 'function') {
        for (const id of ['mei', 'kenji', 'yuki']) charLearning[id] = new CL(id);
      }
    }

    // Init progression systems
    if (window.MJ.CharacterGrowth) {
      const CG = window.MJ.CharacterGrowth.CharacterGrowth || window.MJ.CharacterGrowth;
      charGrowth = typeof CG === 'function' ? new CG() : CG;
    }
    if (window.MJ.CrossGameLearning) {
      crossGameLearning = new window.MJ.CrossGameLearning.CrossGameLearning();
    }
    // Initialize character cognition
    if (window.MJ.CharacterCognition) {
      for (const id of ['mei', 'kenji', 'yuki']) {
        cognition[id] = new window.MJ.CharacterCognition.CharacterCognition(id);
      }
    }
    // Initialize Ollama (local LLM)
    if (window.MJ.Ollama) {
      ollamaClient = new window.MJ.Ollama.OllamaClient();
      if (ollamaClient.config.enabled) {
        ollamaClient.checkConnection().then(result => {
          if (result.connected) {
            console.log('[Ollama] Connected! Models:', result.models.join(', '));
            addChatMessage('System', 'Local LLM connected via Ollama (' + ollamaClient.config.model + ')', 'system');
          }
        });
      }
    }
    if (window.MJ.Economy) {
      const EC = window.MJ.Economy.GameEconomy || window.MJ.Economy;
      economy = typeof EC === 'function' ? new EC() : EC;
    }
    if (window.MJ.Campaigns) {
      const CM = window.MJ.Campaigns.CampaignManager || window.MJ.Campaigns;
      campaigns = typeof CM === 'function' ? new CM() : CM;
    }
    if (window.MJ.HandHistory) {
      const HH = window.MJ.HandHistory.HandHistory || window.MJ.HandHistory;
      handHistory = typeof HH === 'function' ? new HH() : HH;
    }
    if (window.MJ.StoryArcs) {
      const SA = window.MJ.StoryArcs.StoryArcManager || window.MJ.StoryArcs;
      storyArcs = typeof SA === 'function' ? new SA() : SA;
    }

    // Session start tracking
    window._sessionStart = Date.now();

    // TimeSystem: apply time-of-day effects
    if (window.MJ.TimeSystem) {
      try {
        const ts = typeof window.MJ.TimeSystem === 'function' ? new window.MJ.TimeSystem() : window.MJ.TimeSystem;
        if (ts.applyTimeEffects) ts.applyTimeEffects();
        if (ts.getCharacterTimeComment) {
          const comment = ts.getCharacterTimeComment('yuki');
          if (comment) addChatMessage('👵 Yuki', comment, 'ai');
        }
      } catch(e) {}
    }

    // Build chat UI
    buildChatPanel();
    buildSettingsPanel();
    buildLessonPanel();
    buildSuggestionBanner();

    // Wire conversation to chat
    conversation.onMessage = (msg) => addChatMessage(msg.avatar + ' ' + msg.speaker, msg.text,
      msg.event === 'teach' ? 'teach' : 'ai');

    state = GS.create();
    wireState(state);
    Renderer.renderBoard(state);

    // Living world: welcome back messages and events
    if (worldManager) {
      const worldStart = worldManager.onGameStart();
      if (worldStart.welcomeBack) {
        for (const msg of worldStart.welcomeBack) {
          addChatMessage(msg.from, msg.text, 'ai');
        }
      }
      if (worldStart.activeEvents && worldStart.activeEvents.length > 0) {
        const evtNames = worldStart.activeEvents.map(e => `${e.icon} ${e.name}`).join(', ');
        showSuggestion(`Active events: ${evtNames}`);
      }
    }

    bindButtons();
    bindExtraButtons();

    // First visit tutorial
    if (!localStorage.getItem('mj_tutorial_done')) {
      setTimeout(() => { Tutorial.start(); localStorage.setItem('mj_tutorial_done', '1'); }, 500);
    } else {
      // Show next lesson if available
      const next = tutor.getNextLesson();
      if (next) showSuggestion(`Lesson available: "${next.title}" — click Lessons in settings.`);
    }

    console.log('[Mahjong] Ready! Tutor stage: ' + tutor.currentStage);
  }

  function wireState(s) {
    GS.onStateChange(s, () => {
      Renderer.renderBoard(s);
      Renderer.renderGameLog(s);
      updateHintOverlay(s);
    });
    GS.onChange(s, 'onPhaseChange', (phase, old) => {
      if (phase === GAME_PHASES.CLAIM) {
        Sound.play('DISCARD');
        if (replay) replay.recordAction({type:'discard', player: s.lastDiscardPlayer, tile: s.lastDiscard ? {suit: s.lastDiscard.suit, rank: s.lastDiscard.rank} : null, turn: s.turnCount});
      }
      if (phase === GAME_PHASES.DRAW) {
        Sound.play('DRAW');
        if (replay) replay.recordAction({type:'draw', player: s.currentPlayerIndex, turn: s.turnCount});
      }
      if (phase === GAME_PHASES.DISCARD && GS.isHumanTurn(s)) {
        const human = GS.getHumanPlayer(s);
        const msg = tutor.getTeachingMoment('drew_tile', { turn: s.turnCount });
        if (msg) showSuggestion(msg);
        // AI conversation
        conversation.broadcast('thinking', { turn: s.turnCount });
      }
    });
    s.callbacks.onRoundOver = (s) => {
      hintEngine.resetForRound();
      tutor.sessionStats.roundsPlayed++;

      // Update exploitative AI profile
      if (exploitAI) {
        exploitAI.update('round_end', { dealtIn: s.winner && !s.winner.isHuman && s.lastDiscardPlayer === 0 });
        exploitAI.persist();
      }

      // Auto-capture screenshot on round end
      if (window.MJ.Screenshot) {
        window.MJ.Screenshot.autoCapture(s, s.winner ? 'win' : 'draw');
      }

      // Cross-game learning: record Mahjong result, transfer emotions
      if (crossGameLearning) {
        try {
          crossGameLearning.recordGameResult('mahjong', {
            won: s.winner && s.winner.isHuman,
            score: s.winResult ? s.winResult.total : 0,
            patient: (s.turnCount || 0) > 50,
            aggressive: s.winner && s.winner.isHuman && s.winResult && s.winResult.total > 20,
            folded: false, bluffed: false
          });
          // Apply cross-game emotions to personality system
          for (const id of ['mei','kenji','yuki']) {
            if (personalities[id] && personalities[id].memory) {
              const emotion = crossGameLearning.getEmotionModifiers(id);
              if (emotion.aggression) personalities[id].memory.setEmotion(
                crossGameLearning.state.characterEmotions[id],
                crossGameLearning.state.characterEmotionIntensity[id]
              );
            }
          }
          // Cross-game comment
          const comment = crossGameLearning.getCrossGameComment('yuki', 'mahjong');
          if (comment) addChatMessage('👵 Yuki', comment, 'teach');
        } catch(e) {}
      }

      if (s.winner) {
        Sound.play('WIN');
        Renderer.showWinScreen(s, replay);
        conversation.broadcast(s.winner.isHuman ? 'someone_wins' : 'win',
          { score: s.winResult?.total, turn: s.turnCount, seatWind: s.winner.seatWind });
        if (!s.winner.isHuman) {
          const msg = tutor.getTeachingMoment('round_end');
          if (msg) addChatMessage('Tutor', msg, 'system');
        }
      } else {
        Renderer.showDrawScreen(s);
      }

      // Check achievements
      if (achievements) {
        const newAchievements = achievements.check('round_end', {
          winner: s.winner, winResult: s.winResult, state: s, stats: null
        });
        for (const a of newAchievements) {
          Sound.play('ACHIEVEMENT');
          Renderer.showMessage(`Achievement: ${a.name} ${a.icon}`);
        }
      }

      // Update personality emotions and memories
      for (const [id, pe] of Object.entries(personalities)) {
        if (!pe || !pe.processEvent) continue;
        const isWinner = s.winner && s.winner.seatIndex === {mei:1,kenji:2,yuki:3}[id];
        const event = isWinner ? 'win' : (s.winner ? 'lose' : 'draw');
        const bigWin = isWinner && s.winResult && s.winResult.total >= 25;
        pe.processEvent(bigWin ? 'big_win' : event, {
          description: `Round ${s.roundNumber}: ${event}${s.winResult ? ' (' + s.winResult.total + 'pts)' : ''}`,
          significance: bigWin ? 0.9 : (isWinner ? 0.6 : 0.3)
        });
        // Generate emotional chat message — try Ollama first, fall back to scripted
        const charAvatar = pe.character.avatar + ' ' + pe.character.name;
        if (ollamaClient && ollamaClient.config.enabled && ollamaClient.available) {
          ollamaClient.generateCharacterMessage(id, event, s).then(ollamaMsg => {
            if (ollamaMsg) addChatMessage(charAvatar, ollamaMsg, 'ai');
            else { const msg = pe.generateMessage(event, s); if (msg) addChatMessage(charAvatar, msg, 'ai'); }
          }).catch(() => { const msg = pe.generateMessage(event, s); if (msg) addChatMessage(charAvatar, msg, 'ai'); });
        } else {
          const msg = pe.generateMessage(event, s);
          if (msg) addChatMessage(charAvatar, msg, 'ai');
        }
      }

      // Living world: reputation, story triggers
      if (worldManager) {
        const worldResult = worldManager.onRoundEnd(
          { won: s.winner && s.winner.isHuman, score: s.winResult ? s.winResult.total : 0 },
          personalities
        );
        if (worldResult.repResult && worldResult.repResult.levelUp) {
          Sound.play('ACHIEVEMENT');
          Renderer.showMessage(`Level Up! You are now: ${worldResult.repResult.newTitle} (Level ${worldResult.repResult.newLevel})`);
        }
        if (worldResult.storyTriggers) {
          for (const trigger of worldResult.storyTriggers) {
            addChatMessage(trigger.from || 'Story', trigger.text, 'system');
          }
        }
        // Photo album milestone captures
        if (photoAlbum && worldResult.repResult && worldResult.repResult.levelUp) {
          photoAlbum.captureIf('level_up', { title: worldResult.repResult.newTitle }, s);
        }
      }

      // Inter-character banter
      if (charRelations && Math.random() < 0.3) {
        const banter = charRelations.generateBanter();
        if (banter) {
          for (const b of banter) {
            const charData = window.MJ.Personality ? window.MJ.Personality.CHARACTERS[b.speaker] : null;
            const avatar = charData ? charData.avatar : '';
            const name = charData ? charData.name : b.speaker;
            setTimeout(() => addChatMessage(avatar + ' ' + name, b.text, 'ai'), 500);
          }
        }
      }

      // Character learning — observe player patterns
      for (const [id, cl] of Object.entries(charLearning)) {
        if (!cl) continue;
        const humanWon = s.winner && s.winner.isHuman;
        cl.observe(humanWon ? 'win' : (s.lastDiscardPlayer === 0 && s.winner ? 'deal_in' : 'round'), {
          score: s.winResult ? s.winResult.total : 0, concealed: humanWon && s.winner.hand.melds.every(m => !m.open)
        });
        // Check for insight comment
        const insight = cl.getInsightComment(id);
        if (insight) {
          const charData = window.MJ.Personality ? window.MJ.Personality.CHARACTERS[id] : null;
          addChatMessage((charData?.avatar || '') + ' ' + (charData?.name || id), insight, 'teach');
        }
      }

      // Character cognition: process game event
      for (const [id, cog] of Object.entries(cognition)) {
        if (!cog || !cog.processEvent) continue;
        try {
          const isCharWinner = s.winner && s.winner.seatIndex === {mei:1,kenji:2,yuki:3}[id];
          cog.processEvent({
            game: 'mahjong',
            type: s.winner && s.winner.isHuman && s.winResult && s.winResult.total > 20 ? 'big_win' : (s.winner && s.winner.isHuman ? 'win' : 'loss'),
            playerAction: s.lastDiscard ? 'discard' : 'draw',
            outcome: s.winner && s.winner.isHuman ? 'win' : 'loss',
            data: { score: s.winResult ? s.winResult.total : 0 }
          });

          // Share cognitive reflections in chat occasionally
          if (Math.random() < 0.15) {
            const reflections = cog.getReflection('mahjong');
            if (reflections.length > 0) {
              const charData = window.MJ.Personality ? window.MJ.Personality.CHARACTERS[id] : null;
              const reflection = reflections[Math.floor(Math.random() * reflections.length)];
              addChatMessage((charData?.avatar || '') + ' ' + (charData?.name || id), reflection, 'teach');
            }
          }
        } catch(e) {}
      }

      // Daily challenge check
      if (dailyChallenges) {
        const completed = dailyChallenges.checkChallenge('round_end', {
          winner: s.winner, winResult: s.winResult, state: s,
          dealtIn: s.lastDiscardPlayer === 0 && s.winner && !s.winner.isHuman
        });
        for (const c of completed) {
          Sound.play('ACHIEVEMENT');
          Renderer.showMessage(`Challenge complete: ${c.icon} ${c.name} (+${c.xpBonus} XP)`);
          if (worldManager) worldManager.reputation.addXP(c.xpBonus, 'challenge');
        }
      }

      // Music mood shift
      if (musicSystem) {
        musicSystem.setMood(s.winner && s.winner.isHuman ? 'victory' : 'contemplative');
        setTimeout(() => { if (musicSystem) musicSystem.setMood('calm'); }, 5000);
      }

      // Photo album auto-capture for special events
      if (photoAlbum && s.winner && s.winner.isHuman) {
        if (s.winResult && s.winResult.total >= 25) photoAlbum.captureIf('big_score', { score: s.winResult.total }, s);
        if (worldManager && worldManager.reputation.currentStreak >= 3) photoAlbum.captureIf('streak', { count: worldManager.reputation.currentStreak }, s);
      }

      // Economy: award coins
      if (economy && economy.addCoins) {
        if (s.winner && s.winner.isHuman) {
          economy.addCoins(5, 'round_win');
          if (s.winResult && s.winResult.total >= 25) economy.addCoins(10, 'big_score');
        } else {
          economy.addCoins(1, 'round_play');
        }
      }

      // Hand history: record winning hand
      if (handHistory && handHistory.recordHand && s.winner && s.winResult) {
        try {
          handHistory.recordHand({
            tiles: s.winner.hand.concealed.map(t => ({suit:t.suit, rank:t.rank})),
            melds: s.winner.hand.melds.map(m => ({type:m.type, tiles:m.tiles.map(t => ({suit:t.suit, rank:t.rank}))})),
            score: s.winResult.total, breakdown: s.winResult.breakdown,
            selfDrawn: !s.lastDiscard, roundWind: s.roundWind,
            seatWind: s.winner.seatWind, turnCount: s.turnCount,
            isHuman: s.winner.isHuman
          });
        } catch(e) {}
      }

      // Campaign progress check
      if (campaigns && campaigns.checkProgress) {
        try {
          const completed = campaigns.checkProgress('round_end', {
            winner: s.winner, winResult: s.winResult, state: s,
            isHuman: s.winner && s.winner.isHuman
          });
          if (completed && completed.length > 0) {
            for (const c of completed) {
              Sound.play('ACHIEVEMENT');
              Renderer.showMessage(`Campaign: ${c.title || c.name} complete! +${c.xpBonus || 0} XP`);
              if (economy && c.xpBonus) economy.addCoins(Math.floor(c.xpBonus / 2), 'campaign');
            }
          }
        } catch(e) {}
      }

      // Character growth milestones
      if (charGrowth && charGrowth.recordGame) {
        for (const id of ['mei', 'kenji', 'yuki']) {
          try {
            const milestones = charGrowth.recordGame(id, { won: s.winner && s.winner.seatIndex === {mei:1,kenji:2,yuki:3}[id] });
            if (milestones && milestones.length > 0) {
              for (const m of milestones) {
                addChatMessage(m.character, m.message, 'system');
                if (m.traitChange) Renderer.showMessage(`${m.title}: ${m.traitChange}`);
              }
            }
          } catch(e) {}
        }
      }

      // Story arcs
      if (storyArcs && storyArcs.checkTriggers) {
        try {
          const relLevels = {};
          for (const [id, pe] of Object.entries(personalities)) {
            relLevels[id] = pe && pe.relationshipLevel ? pe.relationshipLevel : 1;
          }
          const arcs = storyArcs.checkTriggers({
            totalGames: worldManager ? worldManager.reputation.totalGames : 0,
            relationships: relLevels
          });
          if (arcs && arcs.length > 0) {
            for (const arc of arcs) {
              addChatMessage(arc.from || 'Story', arc.text || arc.message, 'system');
              if (photoAlbum) photoAlbum.captureIf('story_moment', { title: arc.title }, s);
            }
          }
        } catch(e) {}
      }

      // CrossGameAchievements check
      if (window.MJ.CrossGameAchievements) {
        try {
          const cga = typeof window.MJ.CrossGameAchievements === 'function'
            ? new window.MJ.CrossGameAchievements() : window.MJ.CrossGameAchievements;
          if (cga.check) {
            const gameData = {
              mahjongGames: worldManager ? worldManager.reputation.totalGames : 0,
              pokerHands: 0, sessionMahjongWins: s.winner && s.winner.isHuman ? 1 : 0,
              sessionPokerWins: 0, level: worldManager ? worldManager.reputation.level : 1,
              totalCoins: economy && economy.getBalance ? economy.getBalance() : 0,
              playedAfterMidnight: new Date().getHours() < 5,
              sessionMinutes: Math.floor((Date.now() - (window._sessionStart || Date.now())) / 60000)
            };
            const newCGA = cga.check(gameData);
            if (newCGA && newCGA.length > 0) {
              for (const a of newCGA) { Sound.play('ACHIEVEMENT'); Renderer.showMessage(`Cross-game: ${a.name} ${a.icon}`); }
            }
          }
        } catch(e) {}
      }

      // CharacterAging — record game for each character
      if (window.MJ.CharacterAging) {
        try {
          const ca = typeof window.MJ.CharacterAging === 'function' ? new window.MJ.CharacterAging() : window.MJ.CharacterAging;
          if (ca.recordGames) {
            for (const id of ['mei','kenji','yuki']) {
              const milestones = ca.recordGames(id, 1);
              if (milestones && milestones.length > 0) {
                for (const m of milestones) { addChatMessage(m.character || id, m.message, 'system'); }
              }
            }
          }
        } catch(e) {}
      }

      // CharacterQuests — check quest progress
      if (window.MJ.CharacterQuests) {
        try {
          const cq = typeof window.MJ.CharacterQuests === 'function' ? new window.MJ.CharacterQuests() : window.MJ.CharacterQuests;
          if (cq.checkProgress) {
            const completed = cq.checkProgress('round_end', { winner: s.winner, winResult: s.winResult, state: s });
            if (completed && completed.length > 0) {
              for (const q of completed) { Sound.play('ACHIEVEMENT'); Renderer.showMessage(`Quest complete: ${q.name || q.title}`); }
            }
          }
        } catch(e) {}
      }

      // NarrativeAI — check for dynamic story arcs
      if (window.MJ.NarrativeAI) {
        try {
          const na = typeof window.MJ.NarrativeAI === 'function' ? new window.MJ.NarrativeAI() : window.MJ.NarrativeAI;
          if (na.checkForNewArc) {
            const arcs = na.checkForNewArc({ recentWinRate: 0.25, totalGames: worldManager ? worldManager.reputation.totalGames : 0 });
            if (arcs && arcs.length > 0) {
              for (const arc of arcs) { addChatMessage(arc.from || 'Story', arc.text || arc.message, 'system'); }
            }
          }
        } catch(e) {}
      }

      // Leaderboards — submit score on win
      if (window.MJ.Leaderboards && s.winner && s.winner.isHuman && s.winResult) {
        try {
          const lb = typeof window.MJ.Leaderboards === 'function' ? new window.MJ.Leaderboards() :
            (window.MJ.Leaderboards.LeaderboardManager ? new window.MJ.Leaderboards.LeaderboardManager() : window.MJ.Leaderboards);
          if (lb.recordScore) lb.recordScore('You', s.winResult.total, s.winResult.breakdown[0]?.name || 'Win');
        } catch(e) {}
      }
    };
  }

  function buildChatPanel() {
    const panel = document.createElement('div');
    panel.id = 'chat-panel';
    panel.className = 'chat-panel';
    panel.innerHTML = `
      <div class="chat-header" id="chat-toggle">
        <span>Game Chat</span>
        <span id="chat-collapse">▼</span>
      </div>
      <div id="chat-messages" class="chat-messages"></div>
      <div class="chat-input-area">
        <input id="chat-input" class="chat-input" placeholder="Ask the tutor..." />
        <button id="chat-send" class="chat-send">Ask</button>
      </div>
    `;
    document.body.appendChild(panel);

    document.getElementById('chat-toggle').addEventListener('click', () => {
      const msgs = document.getElementById('chat-messages');
      const input = panel.querySelector('.chat-input-area');
      chatVisible = !chatVisible;
      msgs.style.display = chatVisible ? '' : 'none';
      input.style.display = chatVisible ? '' : 'none';
      document.getElementById('chat-collapse').textContent = chatVisible ? '▼' : '▲';
    });

    const sendBtn = document.getElementById('chat-send');
    const chatInput = document.getElementById('chat-input');
    const sendMessage = async () => {
      const text = chatInput.value.trim();
      if (!text) return;
      chatInput.value = '';
      addChatMessage('You', text, 'user');
      const human = state ? GS.getHumanPlayer(state) : null;

      // Try game-aware Ollama tutor first, then cloud LLM, then offline
      if (ollamaClient && ollamaClient.config.enabled && ollamaClient.available) {
        addChatMessage('Tutor', '...', 'system'); // typing indicator

        // Build rich Mahjong context for the tutor
        let mahjongContext = '';
        if (human && human.hand) {
          const concealed = human.hand.concealed || [];
          if (concealed.length > 0) {
            mahjongContext += 'Your tiles: ' + concealed.map(t => window.MJ.Tile.toString(t)).join(' ') + '\n';
          }
          if (human.hand.melds && human.hand.melds.length > 0) {
            mahjongContext += 'Open melds: ' + human.hand.melds.length + '\n';
          }
          const shanten = window.MJ.Hand.calculateShanten(human.hand);
          mahjongContext += 'Shanten: ' + shanten + (shanten === 0 ? ' (tenpai!)' : shanten === -1 ? ' (winning!)' : '') + '\n';
        }
        if (state) {
          mahjongContext += 'Turn: ' + (state.turnCount || 0) + ', Tiles remaining: ' + (state.tilesRemaining || '?') + '\n';
        }

        const tutorPrompt = window.MJ.GameTutorBridge && window.MJ.GameTutorBridge.TUTOR_PROMPTS
          ? window.MJ.GameTutorBridge.TUTOR_PROMPTS.mahjong
          : 'You are an expert Riichi Mahjong tutor. Give specific, actionable advice in 2-3 sentences.';

        let userMsg = '';
        if (mahjongContext) userMsg += 'CURRENT GAME STATE:\n' + mahjongContext + '\n';
        userMsg += 'PLAYER ASKS: ' + text;

        const ollamaReply = await ollamaClient.generate(
          tutorPrompt,
          userMsg,
          { maxTokens: 200, temperature: 0.5 }
        );
        // Remove typing indicator
        const msgs = document.getElementById('chat-messages');
        if (msgs && msgs.lastChild) msgs.removeChild(msgs.lastChild);
        addChatMessage('Tutor', ollamaReply || llmTutor.getOfflineResponse(text, human, state), 'system');
      } else if (llmTutor.isEnabled()) {
        const reply = await llmTutor.ask(text, human, state);
        addChatMessage('Tutor', reply, 'system');
      } else {
        const reply = llmTutor.getOfflineResponse(text, human, state);
        setTimeout(() => addChatMessage('Tutor', reply, 'system'), 300);
      }
    };
    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMessage(); });

    // Initial greeting
    addChatMessage('Tutor', `Welcome! I'm your Mahjong tutor. Ask me anything — "What should I discard?", "How can I win?", or "Explain scoring". Skill level: ${tutor.currentStage}.`, 'system');
    conversation.broadcast('game_start', {});
  }

  function addChatMessage(speaker, text, type) {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    // Add portrait if available
    let portraitHtml = '';
    if (window.MJ.Portraits && type === 'ai') {
      const charId = speaker.toLowerCase().includes('mei') ? 'mei' :
        speaker.toLowerCase().includes('kenji') ? 'kenji' :
        speaker.toLowerCase().includes('yuki') ? 'yuki' : null;
      if (charId) {
        const emotion = personalities[charId] ? personalities[charId].memory.getDominantEmotion() : 'neutral';
        const portrait = new window.MJ.Portraits.PortraitRenderer().render(charId, emotion, 24);
        if (portrait) portraitHtml = `<span class="chat-portrait">${portrait.outerHTML}</span> `;
      }
    }

    const msg = document.createElement('div');
    msg.className = `chat-msg chat-msg-${type}`;
    msg.innerHTML = `${portraitHtml}<span class="chat-speaker">${speaker}:</span> ${text}`;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
    while (container.children.length > 50) container.removeChild(container.firstChild);

    // Voice synthesis for AI messages
    if (voiceSystem && voiceSystem.isEnabled() && (type === 'ai' || type === 'system')) {
      const charId = speaker.toLowerCase().includes('mei') ? 'mei' :
        speaker.toLowerCase().includes('kenji') ? 'kenji' :
        speaker.toLowerCase().includes('yuki') ? 'yuki' : 'tutor';
      voiceSystem.speak(charId, text);
    }
  }

  function buildSuggestionBanner() {
    const banner = document.createElement('div');
    banner.id = 'suggestion-banner';
    banner.className = 'suggestion-banner hidden';
    banner.innerHTML = '<span class="close-btn" id="suggestion-close">✕</span><span id="suggestion-text"></span>';
    document.body.appendChild(banner);
    document.getElementById('suggestion-close').addEventListener('click', () => {
      banner.classList.add('hidden');
    });
  }

  function showSuggestion(text) {
    const banner = document.getElementById('suggestion-banner');
    const textEl = document.getElementById('suggestion-text');
    if (banner && textEl) {
      textEl.textContent = text;
      banner.classList.remove('hidden');
      setTimeout(() => banner.classList.add('hidden'), 8000);
    }
  }

  function updateHintOverlay(s) {
    if (hintEngine.getLevel() === 0) return;
    const human = GS.getHumanPlayer(s);
    if (!human || s.phase !== GAME_PHASES.DISCARD || s.currentPlayerIndex !== human.seatIndex) return;
    // Update tile hints when it's human's turn
    const hints = hintEngine.getHandHints(human, s);
    if (!hints) return;
    const handEl = document.getElementById('hand-bottom');
    if (!handEl) return;
    const tileEls = handEl.querySelectorAll('.mj-tile');
    tileEls.forEach(el => {
      const tileId = el.dataset.tileId;
      const h = hints.tiles[tileId];
      if (!h) return;
      // Remove old hints
      el.querySelectorAll('.tile-hint').forEach(e => e.remove());
      el.classList.remove('danger-high', 'danger-medium', 'hint-optimal');
      if (hintEngine.getLevel() >= 2) {
        if (h.isOptimal) el.classList.add('hint-optimal');
        if (h.dangerLevel === 'high') el.classList.add('danger-high');
        else if (h.dangerLevel === 'medium') el.classList.add('danger-medium');
        // Add ukeire badge
        const badge = document.createElement('span');
        badge.className = `tile-hint tile-hint-${h.isOptimal ? 'optimal' : h.dangerLevel}`;
        badge.textContent = h.ukeireAfter + '↑';
        el.style.position = 'relative';
        el.appendChild(badge);
      }
    });

    // Hand path display
    if (hintEngine.getLevel() >= 2 && window.MJ.HandPath) {
      try {
        const pathInfo = window.MJ.HandPath.analyzePath(human, s);
        if (pathInfo && pathInfo.length > 0) {
          const pathEl = document.getElementById('hand-path-info') || (() => {
            const el = document.createElement('div');
            el.id = 'hand-path-info';
            el.className = 'hand-path-info';
            el.style.cssText = 'font-size:11px;color:var(--accent,#4caf50);margin-top:4px;text-align:center;';
            const playerBottom = document.getElementById('player-bottom');
            if (playerBottom) playerBottom.appendChild(el);
            return el;
          })();
          const topPaths = pathInfo.slice(0, 2);
          pathEl.textContent = topPaths.map(p => `Path: ${p.description || p.name || 'unknown'} (${p.shanten != null ? p.shanten + ' shanten' : ''})`).join(' | ');
        }
      } catch (e) { /* HandPath analysis not available */ }
    }

    // Furiten warning
    if (window.MJ.Furiten) {
      try {
        const furitenResult = window.MJ.Furiten.checkFuriten(human, s);
        if (furitenResult && furitenResult.isFuriten) {
          showSuggestion('Warning: FURITEN! You cannot win by discard claim.');
        }
      } catch (e) { /* Furiten check not available */ }
    }

    // Scoring preview when tenpai
    if (window.MJ.ScoringPreview) {
      try {
        const Hand = window.MJ.Hand;
        const shanten = Hand.calculateShanten(human.hand);
        if (shanten === 0) {
          const preview = window.MJ.ScoringPreview.getPreviewSummary(human, s);
          if (preview && preview !== 'Not tenpai') {
            showSuggestion(`Tenpai! ${preview}`);
          }
        }
      } catch (e) { /* Scoring preview not available */ }
    }
  }

  function buildSettingsPanel() {
    const panel = document.createElement('div');
    panel.id = 'settings-panel';
    panel.className = 'settings-panel hidden';
    panel.innerHTML = `
      <div class="settings-card">
        <h3>Game Settings</h3>
        <div class="setting-row">
          <span class="setting-label">AI Difficulty</span>
          <div class="setting-control">
            <select id="setting-difficulty">
              <option value="beginner">Beginner</option>
              <option value="basic">Basic</option>
              <option value="intermediate" selected>Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert</option>
            </select>
          </div>
        </div>
        <div class="setting-row">
          <span class="setting-label">Hint Level</span>
          <div class="setting-control">
            <select id="setting-hints">
              <option value="0">Off</option>
              <option value="1">Novice (basic tips)</option>
              <option value="2" selected>Learning (efficiency + danger)</option>
              <option value="3">Advanced (detailed analysis)</option>
            </select>
          </div>
        </div>
        <div class="setting-row">
          <span class="setting-label">AI Chat</span>
          <div class="setting-control">
            <select id="setting-chat">
              <option value="0.1">Quiet</option>
              <option value="0.3" selected>Normal</option>
              <option value="0.6">Chatty</option>
              <option value="1.0">Maximum</option>
            </select>
          </div>
        </div>
        <div class="setting-row">
          <span class="setting-label">Flowers</span>
          <div class="setting-control">
            <select id="setting-flowers">
              <option value="1" selected>Enabled</option>
              <option value="0">Disabled</option>
            </select>
          </div>
        </div>
        <div class="setting-row">
          <span class="setting-label">Game Speed</span>
          <div class="setting-control">
            <input type="range" id="setting-speed" min="0.2" max="3" step="0.1" value="1" style="width:100%;" />
            <span id="speed-label" style="font-size:12px;">1.0x</span>
          </div>
        </div>
        <div id="llm-config-container"></div>
        <div id="skill-progress" class="skill-panel"></div>
        <div style="display:flex;gap:8px;margin-top:12px;">
          <button id="btn-lessons" class="btn btn-primary" style="flex:1">Lessons (${tutor.completedLessons.size}/${window.MJ.Tutor.LESSONS.length})</button>
          <button id="btn-close-settings" class="btn" style="flex:1">Close</button>
        </div>
        <div style="display:flex;gap:8px;margin-top:8px;">
          <button id="btn-practice" class="btn" style="flex:1">Practice</button>
          <button id="btn-multiplayer" class="btn" style="flex:1">Multiplayer</button>
        </div>
      </div>
    `;
    document.body.appendChild(panel);

    document.getElementById('btn-close-settings').addEventListener('click', () => panel.classList.add('hidden'));
    document.getElementById('setting-hints').addEventListener('change', (e) => {
      hintEngine.setLevel(parseInt(e.target.value));
    });
    document.getElementById('setting-chat').addEventListener('change', (e) => {
      conversation.setChattiness(parseFloat(e.target.value));
    });
    document.getElementById('btn-lessons').addEventListener('click', () => {
      panel.classList.add('hidden');
      showNextLesson();
    });

    // Game speed slider
    const speedSlider = document.getElementById('setting-speed');
    const speedLabel = document.getElementById('speed-label');
    if (speedSlider) {
      speedSlider.addEventListener('input', (e) => {
        gameSpeedMultiplier = parseFloat(e.target.value);
        speedLabel.textContent = gameSpeedMultiplier.toFixed(1) + 'x';
        // Adjust AI delay dynamically
        if (window.MJ.Constants && window.MJ.Constants.AI_DELAY_MS !== undefined) {
          window.MJ._aiDelayOverride = Math.round(600 / gameSpeedMultiplier);
        }
      });
    }

    // LLM config UI
    if (llmConfig) {
      const llmContainer = document.getElementById('llm-config-container');
      if (llmContainer) {
        const configUI = llmConfig.buildConfigUI();
        llmContainer.appendChild(configUI);
      }
    }

    // Ollama (local LLM) config UI
    if (ollamaClient) {
      const llmContainer = document.getElementById('llm-config-container');
      if (llmContainer) {
        const ollamaUI = ollamaClient.buildSettingsUI();
        llmContainer.appendChild(ollamaUI);
      }
    }

    // Practice button
    document.getElementById('btn-practice').addEventListener('click', () => {
      panel.classList.add('hidden');
      openPracticeMode();
    });

    // Multiplayer button
    document.getElementById('btn-multiplayer').addEventListener('click', () => {
      panel.classList.add('hidden');
      openMultiplayerLobby();
    });

    // Render skill bars
    updateSkillDisplay();
  }

  function updateSkillDisplay() {
    const container = document.getElementById('skill-progress');
    if (!container) return;
    const skills = tutor.getSkillSummary();
    let html = `<div style="font-size:12px;color:var(--accent);margin-bottom:6px;">Stage: ${skills.stage.toUpperCase()} | Lessons: ${skills.completedLessons}/${skills.totalLessons}</div>`;
    for (const [area, data] of Object.entries(skills.skills)) {
      const name = area.replace(/_/g, ' ');
      html += `<div class="skill-bar"><span class="skill-bar-label">${name}</span>`;
      html += `<div class="skill-bar-track"><div class="skill-bar-fill lvl-${data.level}"></div></div></div>`;
    }
    container.innerHTML = html;
  }

  function buildLessonPanel() {
    const panel = document.createElement('div');
    panel.id = 'lesson-panel';
    panel.className = 'lesson-panel hidden';
    panel.innerHTML = '<div id="lesson-card" class="lesson-card"></div>';
    document.body.appendChild(panel);
  }

  function showNextLesson() {
    const lesson = tutor.getNextLesson();
    if (!lesson) {
      Renderer.showMessage('All lessons completed! You\'re a Mahjong master!');
      return;
    }
    showLesson(lesson);
  }

  function showLesson(lesson) {
    const panel = document.getElementById('lesson-panel');
    const card = document.getElementById('lesson-card');
    card.innerHTML = `
      <div class="lesson-stage">${lesson.stage} — ${lesson.area.replace(/_/g, ' ')}</div>
      <h3>${lesson.title}</h3>
      <div class="lesson-content">${lesson.content}</div>
      ${lesson.quiz ? `
        <div class="lesson-quiz">
          <div class="quiz-question">Quiz: ${lesson.quiz}</div>
          <input id="quiz-answer" class="quiz-input" placeholder="Your answer..." />
          <div id="quiz-feedback" style="margin-top:6px;font-size:12px;"></div>
        </div>
      ` : ''}
      <div class="lesson-nav">
        <button id="lesson-skip" class="btn">Skip</button>
        <button id="lesson-complete" class="btn btn-primary">${lesson.quiz ? 'Check Answer' : 'Got It!'}</button>
      </div>
    `;
    panel.classList.remove('hidden');

    document.getElementById('lesson-skip').addEventListener('click', () => panel.classList.add('hidden'));
    document.getElementById('lesson-complete').addEventListener('click', () => {
      if (lesson.quiz) {
        const input = document.getElementById('quiz-answer');
        const feedback = document.getElementById('quiz-feedback');
        const answer = input.value.trim().toLowerCase();
        if (answer === lesson.answer.toLowerCase() || answer.includes(lesson.answer.toLowerCase())) {
          feedback.innerHTML = '<span style="color:#2d8a4e">Correct!</span>';
          tutor.completeLesson(lesson.id);
          updateSkillDisplay();
          setTimeout(() => {
            panel.classList.add('hidden');
            const next = tutor.getNextLesson();
            if (next) {
              setTimeout(() => showSuggestion(`Next lesson: "${next.title}"`), 500);
            }
          }, 800);
        } else {
          feedback.innerHTML = `<span style="color:#c41e3a">Not quite. Hint: ${lesson.answer}</span>`;
        }
      } else {
        tutor.completeLesson(lesson.id);
        updateSkillDisplay();
        panel.classList.add('hidden');
      }
    });
  }

  function openPracticeMode() {
    if (!practiceMode) return;
    const puzzles = practiceMode.getPuzzles();
    const overlay = document.createElement('div');
    overlay.className = 'practice-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:9999;';
    const panel = document.createElement('div');
    panel.style.cssText = 'background:var(--panel-bg,#1a2a1a);color:var(--text,#e0e0e0);border-radius:12px;padding:24px;max-width:600px;width:90%;max-height:80vh;overflow-y:auto;';
    panel.innerHTML = '<h2 style="margin:0 0 16px 0;">Practice Mode</h2>';
    const progress = practiceMode.getProgress();
    panel.innerHTML += `<div style="margin-bottom:12px;font-size:13px;color:#aaa;">Progress: ${progress.completed}/${progress.total} (${progress.percentage}%)</div>`;
    for (const [category, puzzleList] of Object.entries(puzzles)) {
      const catHeader = document.createElement('h3');
      catHeader.textContent = category.replace(/_/g, ' ').toUpperCase();
      catHeader.style.cssText = 'margin:12px 0 6px;font-size:14px;color:var(--accent,#4caf50);';
      panel.appendChild(catHeader);
      for (const p of puzzleList) {
        const row = document.createElement('div');
        row.style.cssText = 'padding:6px 10px;margin:2px 0;border-radius:4px;cursor:pointer;background:rgba(255,255,255,0.05);display:flex;justify-content:space-between;';
        row.innerHTML = `<span>${p.completed ? '&#10003; ' : ''}${p.title || p.id}</span><span style="font-size:12px;color:#888;">${p.difficulty || ''}</span>`;
        row.addEventListener('click', () => { overlay.remove(); Renderer.showMessage(`Starting puzzle: ${p.title || p.id}`); });
        panel.appendChild(row);
      }
    }
    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn';
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = 'margin-top:16px;padding:8px 24px;';
    closeBtn.addEventListener('click', () => overlay.remove());
    panel.appendChild(closeBtn);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
  }

  function openMultiplayerLobby() {
    const MultiplayerUI = window.MJ.Multiplayer ? window.MJ.Multiplayer.MultiplayerUI : null;
    const MultiplayerClient = window.MJ.Multiplayer ? window.MJ.Multiplayer.MultiplayerClient : null;
    if (!MultiplayerUI || !MultiplayerClient) {
      Renderer.showMessage('Multiplayer is not available yet.');
      return;
    }
    const client = new MultiplayerClient('wss://mahjong-server.example.com');
    const lobbyUI = MultiplayerUI.buildLobbyUI(client);
    if (lobbyUI) document.body.appendChild(lobbyUI);
  }

  function openReplayViewer() {
    if (!replay) return;
    const recording = replay.getRecording();
    const metadata = replay.getMetadata();
    const viewer = new window.MJ.Replay.ReplayViewer(recording, metadata);
    const viewerUI = viewer.buildViewerUI();
    if (viewerUI) document.body.appendChild(viewerUI);
  }

  function performUndo() {
    if (!undoState) {
      Renderer.showMessage('Nothing to undo');
      return;
    }
    const human = GS.getHumanPlayer(state);
    if (human && undoState.hand) {
      human.hand.concealed = undoState.hand.slice();
      if (undoState.discard) {
        human.discards.pop();
      }
      undoState = null;
      GS.notifyChange(state);
      Renderer.showMessage('Undo: last discard reversed');
    }
  }

  function storeUndoState() {
    const human = GS.getHumanPlayer(state);
    if (human) {
      undoState = {
        hand: human.hand.concealed.slice(),
        discard: true
      };
    }
  }

  function setupDoraIndicators(s) {
    if (s.wall && window.MJ.Wall) {
      const doraIndicators = window.MJ.Wall.getDoraIndicators(s.wall);
      s.doraIndicators = doraIndicators;
    }
  }

  function takeScreenshot(label) {
    if (!window.MJ.Screenshot) return;
    window.MJ.Screenshot.captureQuick(state, label);
  }

  function bindButtons() {
    const btnNew = document.getElementById('btn-new-game');
    const btnAuto = document.getElementById('btn-auto-play');
    const btnSort = document.getElementById('btn-sort');
    const btnTutorial = document.getElementById('btn-tutorial');
    const btnHelp = document.getElementById('btn-help');
    const btnSound = document.getElementById('btn-sound');

    if (btnNew) btnNew.addEventListener('click', newGame);
    if (btnAuto) btnAuto.addEventListener('click', () => {
      toggleAutoPlay();
      btnAuto.textContent = GameFlow.isAutoPlaying(state) ? 'Stop Auto' : 'Auto Play';
    });
    if (btnSort) btnSort.addEventListener('click', () => {
      const human = GS.getHumanPlayer(state);
      if (human) { human.hand.concealed = Tile.sortTiles(human.hand.concealed); GS.notifyChange(state); }
    });
    if (btnTutorial) btnTutorial.addEventListener('click', () => Tutorial.start());
    if (btnHelp) btnHelp.addEventListener('click', () => {
      document.getElementById('settings-panel').classList.remove('hidden');
      updateSkillDisplay();
    });
    if (btnSound) btnSound.addEventListener('click', () => {
      const muted = Sound.toggleMute();
      btnSound.textContent = muted ? '🔇' : '🔊';
    });
  }

  function bindExtraButtons() {
    // Replace "?" help button with settings
    const btnHelp = document.getElementById('btn-help');
    if (btnHelp) btnHelp.textContent = '⚙';

    // Add undo button to controls
    const controls = document.querySelector('.controls');
    if (controls) {
      const undoBtn = document.createElement('button');
      undoBtn.id = 'btn-undo';
      undoBtn.className = 'btn';
      undoBtn.title = 'Undo Last Discard';
      undoBtn.textContent = 'Undo';
      undoBtn.addEventListener('click', performUndo);
      controls.appendChild(undoBtn);

      // Screenshot button
      const ssBtn = document.createElement('button');
      ssBtn.id = 'btn-screenshot';
      ssBtn.className = 'btn btn-icon';
      ssBtn.title = 'Take Screenshot (Ctrl+P)';
      ssBtn.textContent = '\uD83D\uDCF7'; // camera emoji
      ssBtn.addEventListener('click', () => takeScreenshot());
      controls.appendChild(ssBtn);

      // Gallery button
      const galBtn = document.createElement('button');
      galBtn.id = 'btn-gallery';
      galBtn.className = 'btn btn-icon';
      galBtn.title = 'Screenshot Gallery';
      galBtn.textContent = '\uD83D\uDDBC'; // framed picture emoji
      galBtn.addEventListener('click', () => {
        if (window.MJ.Screenshot) window.MJ.Screenshot.showGallery();
      });
      controls.appendChild(galBtn);
    }

    // Games button — switch between Mahjong and Poker
    if (controls) {
      const gamesBtn = document.createElement('button');
      gamesBtn.id = 'btn-games';
      gamesBtn.className = 'btn';
      gamesBtn.title = 'Switch Game';
      gamesBtn.textContent = 'Games';
      gamesBtn.addEventListener('click', () => {
        // Return to intro screen for game selection
        showIntro();
      });
      controls.appendChild(gamesBtn);
    }

    // Docs button
    if (controls && window.MJ.DocViewer) {
      const docsBtn = document.createElement('button');
      docsBtn.id = 'btn-docs';
      docsBtn.className = 'btn';
      docsBtn.title = 'Documentation (F1)';
      docsBtn.textContent = 'Docs';
      docsBtn.addEventListener('click', () => window.MJ.DocViewer.show());
      controls.appendChild(docsBtn);
    }

    // Stats Dashboard button
    if (controls && window.MJ.StatsDashboard) {
      const statsBtn = document.createElement('button');
      statsBtn.id = 'btn-stats';
      statsBtn.className = 'btn';
      statsBtn.title = 'Stats Dashboard';
      statsBtn.textContent = 'Stats';
      statsBtn.addEventListener('click', () => {
        try {
          const sd = typeof window.MJ.StatsDashboard === 'function' ? new window.MJ.StatsDashboard() : window.MJ.StatsDashboard;
          if (sd.buildDashboardUI) document.body.appendChild(sd.buildDashboardUI());
          else if (sd.show) sd.show();
        } catch(e) {}
      });
      controls.appendChild(statsBtn);
    }

    // Profile Card / Share Profile button
    if (controls && window.MJ.ProfileCard) {
      const profileBtn = document.createElement('button');
      profileBtn.id = 'btn-profile';
      profileBtn.className = 'btn';
      profileBtn.title = 'Share Profile';
      profileBtn.textContent = 'Profile';
      profileBtn.addEventListener('click', () => {
        try {
          const pc = typeof window.MJ.ProfileCard === 'function' ? new window.MJ.ProfileCard() : window.MJ.ProfileCard;
          if (pc.buildProfileUI) document.body.appendChild(pc.buildProfileUI());
          else if (pc.show) pc.show();
        } catch(e) {}
      });
      controls.appendChild(profileBtn);
    }

    // Global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        takeScreenshot();
      }
      if (e.key === 'F1') {
        e.preventDefault();
        if (window.MJ.DocViewer) {
          if (window.MJ.DocViewer.isOpen()) window.MJ.DocViewer.hide();
          else window.MJ.DocViewer.show();
        }
      }
    });
  }

  function newGame() {
    GameFlow.stopGameLoop();
    InputHandler.destroy();
    conversation.clearAll();
    hintEngine.resetForRound();
    undoState = null;
    state = GS.create();
    wireState(state);
    setupDoraIndicators(state);
    if (replay) replay.startRecording({ roundWind: state.roundWind, roundNumber: state.roundNumber });
    InputHandler.init(state);
    GameFlow.startGame(state);
    Renderer.showMessage('New game started!');
    conversation.broadcast('game_start', {});
    addChatMessage('Tutor', `New game! Your skill level: ${tutor.currentStage}. Ask me anything!`, 'system');
  }

  function toggleAutoPlay() {
    if (GameFlow.isAutoPlaying(state)) {
      GameFlow.stopAutoPlay(state);
      Renderer.showMessage('Auto-play stopped');
    } else {
      GameFlow.runAutoPlay(state);
      Renderer.showMessage('Auto-play: AI plays for you');
    }
  }

  function getVersion() { return '8.0.0'; }

  function startFromIntro(gameId) {
    try { localStorage.setItem('mj_last_game', gameId); } catch(e) {}
    try { localStorage.setItem('mj_last_played', String(Date.now())); } catch(e) {}

    if (gameId === 'poker') {
      if (window.MJ.Poker && window.MJ.Poker.Play) {
        const mgr = new window.MJ.Poker.Play.PokerGameManager();
        mgr.init({ personalities, economy, worldManager, conversation, sound: Sound, ollamaClient });
        mgr.start();
      } else {
        Renderer.showMessage('Poker engine not loaded');
        GameFlow.startGame(state);
      }
    } else if (gameId === 'dominoes') {
      if (window.MJ.Dominoes && window.MJ.Dominoes.Play) {
        const DOM = window.MJ.Dominoes.Play;
        const mgr = new DOM.DominoGameManager();
        if (mgr.init) mgr.init({ personalities, economy, worldManager, conversation, sound: Sound, ollamaClient });
        mgr.start();
      } else {
        Renderer.showMessage('Dominoes engine not loaded');
        GameFlow.startGame(state);
      }
    } else if (gameId === 'blackjack') {
      if (window.MJ.Blackjack && window.MJ.Blackjack.Play) {
        const BJ = window.MJ.Blackjack.Play;
        const mgr = typeof BJ === 'function' ? new BJ() : (BJ.BlackjackGameManager ? new BJ.BlackjackGameManager() : null);
        if (mgr) {
          if (mgr.init) mgr.init({ personalities, economy, worldManager, conversation, sound: Sound, ollamaClient });
          mgr.start();
        } else {
          Renderer.showMessage('Blackjack not available');
          GameFlow.startGame(state);
        }
      } else {
        Renderer.showMessage('Blackjack engine not loaded');
        GameFlow.startGame(state);
      }
    } else if (gameId === 'dragon') {
      // Prefer campaign mode if available, fall back to single battle
      if (window.MJ.Dragon && window.MJ.Dragon.Campaign && window.MJ.Dragon.Campaign.Manager) {
        const CM = window.MJ.Dragon.Campaign.Manager;
        const mgr = new CM.CampaignManager();
        mgr.init({ personalities, economy, worldManager, conversation, sound: Sound, ollamaClient });
        mgr.start();
      } else if (window.MJ.Dragon && window.MJ.Dragon.Play) {
        const DG = window.MJ.Dragon.Play;
        const mgr = new DG.DragonGameManager();
        mgr.init({ personalities, economy, worldManager, conversation, sound: Sound, ollamaClient });
        mgr.start();
      } else {
        Renderer.showMessage('Dragon Battle not loaded');
        GameFlow.startGame(state);
      }
    } else {
      // Default: start Mahjong
      GameFlow.startGame(state);
    }
  }

  function showIntro() {
    if (window.MJ.IntroScreen) {
      window.MJ.IntroScreen.show({
        onSelect: (gameId) => startFromIntro(gameId)
      });
    } else {
      // No intro screen module — start Mahjong directly
      GameFlow.startGame(state);
    }
  }

  window.MJ.Main = Object.freeze({ init, newGame, toggleAutoPlay, getVersion, showIntro, startFromIntro, openPracticeMode, openMultiplayerLobby, openReplayViewer, performUndo });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { init(); showIntro(); });
  } else {
    init();
    showIntro();
  }

  console.log('[Mahjong] Main module loaded');
})();
