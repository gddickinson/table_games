/**
 * poker-ai-v2.js — Advanced poker AI with opponent modeling, draw detection,
 * implied odds, c-bet logic, check-raise, SPR awareness, and strategic bluffing.
 * Replaces poker-ai.js as the primary AI decision engine.
 */
(function(exports) {
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};
  root.MJ.Poker = root.MJ.Poker || {};

  const Cards = () => root.MJ.Poker.Cards;
  const HE = () => root.MJ.Poker.HandEval;

  // === Pre-flop hand strength lookup (much faster than Monte Carlo pre-flop) ===
  // Comprehensive pre-flop equity table (vs random hands, heads-up adjusted for multi-way)
  const PREFLOP_EQUITY = {
    'AA':0.85,'KK':0.82,'QQ':0.80,'JJ':0.77,'TT':0.75,'99':0.72,'88':0.69,'77':0.66,'66':0.63,'55':0.60,'44':0.57,'33':0.54,'22':0.50,
    'AKs':0.67,'AQs':0.66,'AJs':0.65,'ATs':0.64,'A9s':0.60,'A8s':0.59,'A7s':0.58,'A6s':0.57,'A5s':0.58,'A4s':0.57,'A3s':0.56,'A2s':0.55,
    'AKo':0.65,'AQo':0.64,'AJo':0.63,'ATo':0.62,'A9o':0.57,'A8o':0.56,'A7o':0.55,'A6o':0.54,'A5o':0.55,'A4o':0.54,'A3o':0.53,'A2o':0.52,
    'KQs':0.63,'KJs':0.62,'KTs':0.61,'K9s':0.58,'K8s':0.54,'K7s':0.53,'K6s':0.52,'K5s':0.51,
    'KQo':0.61,'KJo':0.60,'KTo':0.59,'K9o':0.55,'K8o':0.51,'K7o':0.50,
    'QJs':0.60,'QTs':0.59,'Q9s':0.56,'Q8s':0.52,'QJo':0.57,'QTo':0.56,'Q9o':0.52,
    'JTs':0.57,'J9s':0.55,'J8s':0.52,'JTo':0.54,'J9o':0.51,
    'T9s':0.54,'T8s':0.52,'T7s':0.49,'T9o':0.50,'T8o':0.47,
    '98s':0.52,'97s':0.50,'96s':0.47,'98o':0.48,'97o':0.45,
    '87s':0.50,'86s':0.47,'87o':0.46,'76s':0.48,'75s':0.45,'76o':0.44,
    '65s':0.47,'64s':0.44,'65o':0.43,'54s':0.46,'53s':0.43,'54o':0.42,
    '43s':0.41,'43o':0.37,'32s':0.36,'32o':0.32,
    // Worst offsuit hands
    '72o':0.32,'83o':0.33,'84o':0.34,'92o':0.33,'93o':0.34,'94o':0.35,'T2o':0.36,'T3o':0.37,
    'J2o':0.37,'J3o':0.38,'J4o':0.39,'Q2o':0.38,'Q3o':0.39,'Q4o':0.40,'Q5o':0.41,
    'K2o':0.42,'K3o':0.43,'K4o':0.44,'K5o':0.45,'K6o':0.46
  };

  function getPreflopKey(cards) {
    const c1 = cards[0], c2 = cards[1];
    const r1 = c1.rank === '10' ? 'T' : c1.rank;
    const r2 = c2.rank === '10' ? 'T' : c2.rank;
    if (c1.value === c2.value) return r1 + r2;
    const high = c1.value > c2.value ? r1 : r2;
    const low = c1.value > c2.value ? r2 : r1;
    return high + low + (c1.suit === c2.suit ? 's' : 'o');
  }

  function getPreflopEquity(cards, numOpponents) {
    const key = getPreflopKey(cards);
    let eq = PREFLOP_EQUITY[key] || 0.25; // default for unranked/trash hands
    // Adjust for number of opponents (equity decreases with more players)
    eq *= Math.pow(0.92, Math.max(0, numOpponents - 1));
    return eq;
  }

  // === Draw Detection ===
  function detectDraws(holeCards, community) {
    if (community.length < 3) return { flushDraw: false, straightDraw: false, outs: 0 };
    const all = holeCards.concat(community);
    const draws = { flushDraw: false, openEndedStraight: false, gutshotStraight: false, outs: 0 };

    // Flush draw: 4 of same suit
    const suitCounts = {};
    all.forEach(c => { suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1; });
    for (const suit in suitCounts) {
      if (suitCounts[suit] === 4) { draws.flushDraw = true; draws.outs += 9; break; }
    }

    // Straight draw detection
    const values = [...new Set(all.map(c => c.value))].sort((a, b) => a - b);
    // Check for 4-in-a-row gaps
    for (let i = 0; i < values.length - 3; i++) {
      const span = values[i + 3] - values[i];
      if (span === 3) { draws.openEndedStraight = true; draws.outs += 8; break; } // open-ended
      if (span === 4) {
        // Check if it's a gutshot (one gap)
        let gaps = 0;
        for (let j = i; j < i + 3; j++) {
          if (values[j + 1] - values[j] > 1) gaps++;
        }
        if (gaps === 1) { draws.gutshotStraight = true; draws.outs += 4; }
      }
    }

    // Combo draw bonus (flush + straight draw together)
    if (draws.flushDraw && (draws.openEndedStraight || draws.gutshotStraight)) {
      draws.outs += 3; // some overlap but combo is very strong
    }

    return draws;
  }

  // === Opponent Modeling ===
  class OpponentModel {
    constructor() {
      this.profiles = {}; // playerId -> observed stats
    }

    observe(playerId, action, context) {
      if (!this.profiles[playerId]) {
        this.profiles[playerId] = {
          vpip: 0, pfr: 0, af: 0, hands: 0,
          raises: 0, calls: 0, folds: 0, checks: 0, bets: 0,
          showdowns: 0, showdownWins: 0,
          preFlopRaises: 0, cBets: 0, cBetOpps: 0
        };
      }
      const p = this.profiles[playerId];
      p.hands++;

      switch (action) {
        case 'raise': case 'allin': p.raises++; p.bets++; if (context === 'pre_flop') p.preFlopRaises++; break;
        case 'call': p.calls++; break;
        case 'fold': p.folds++; break;
        case 'check': p.checks++; break;
      }
    }

    getProfile(playerId) {
      const p = this.profiles[playerId];
      if (!p || p.hands < 3) return null; // not enough data
      const totalActions = p.raises + p.calls + p.folds + p.checks;
      return {
        vpip: (p.calls + p.raises) / Math.max(1, p.hands), // voluntarily put money in pot
        pfr: p.preFlopRaises / Math.max(1, p.hands), // pre-flop raise %
        aggression: p.bets / Math.max(1, p.calls + p.checks), // aggression factor
        foldRate: p.folds / Math.max(1, totalActions),
        isLoose: (p.calls + p.raises) / Math.max(1, p.hands) > 0.4,
        isTight: (p.calls + p.raises) / Math.max(1, p.hands) < 0.2,
        isAggressive: p.bets / Math.max(1, p.calls + p.checks) > 1.5,
        isPassive: p.bets / Math.max(1, p.calls + p.checks) < 0.8
      };
    }

    estimateHandRange(playerId, phase, action) {
      // Return estimated hand strength range based on action
      const profile = this.getProfile(playerId);
      if (action === 'raise' || action === 'allin') {
        if (profile && profile.isTight) return { min: 0.7, max: 1.0 }; // tight player raising = strong
        if (profile && profile.isLoose) return { min: 0.35, max: 1.0 }; // loose player could have anything
        return { min: 0.5, max: 1.0 }; // default raise range
      }
      if (action === 'call') return { min: 0.3, max: 0.75 };
      return { min: 0, max: 1.0 };
    }
  }

  // === Personality Profiles (enhanced) ===
  const PROFILES = {
    kenji: { aggression: 0.8, bluffFreq: 0.35, foldThresh: 0.15, tilt: 0.2, posAware: 0.4, cBetFreq: 0.8, checkRaiseFreq: 0.15, impliedOddsAdj: 1.3 },
    mei:   { aggression: 0.3, bluffFreq: 0.08, foldThresh: 0.4,  tilt: 0.05, posAware: 0.9, cBetFreq: 0.55, checkRaiseFreq: 0.08, impliedOddsAdj: 1.0 },
    yuki:  { aggression: 0.55, bluffFreq: 0.2, foldThresh: 0.28, tilt: 0.1, posAware: 0.75, cBetFreq: 0.65, checkRaiseFreq: 0.12, impliedOddsAdj: 1.15 },
    default: { aggression: 0.5, bluffFreq: 0.15, foldThresh: 0.3, tilt: 0.1, posAware: 0.5, cBetFreq: 0.6, checkRaiseFreq: 0.1, impliedOddsAdj: 1.1 }
  };

  // === Main AI v2 ===
  class PokerAIv2 {
    constructor() {
      this.opponentModel = new OpponentModel();
      this.handHistory = []; // actions this hand for c-bet tracking
      this.wasPreFlopAggressor = false;
      this.checkRaiseIntents = {}; // Improvement 8: playerId -> {active, strength}
    }

    startNewHand() {
      this.handHistory = [];
      this.wasPreFlopAggressor = false;
      this.currentPlan = null;
      this.checkRaiseIntents = {}; // Improvement 8: clear check-raise intents each hand
    }

    planStreets(holeCards, position, prof) {
      const eq = getPreflopEquity(holeCards, 3);
      if (eq > 0.7) return { plan: 'value_town', streets: ['bet','bet','bet'] };
      if (eq > 0.55) return { plan: 'pot_control', streets: ['bet','check','bet'] };
      if (eq > 0.4) return { plan: 'speculative', streets: ['call','check','fold'] };
      return { plan: 'give_up', streets: ['fold','fold','fold'] };
    }

    getStackPressure(player, state) {
      const avgStack = state.players.reduce((s, p) => s + p.chips, 0) / state.players.length;
      const ratio = player.chips / avgStack;
      if (ratio < 0.3) return 'short';
      if (ratio < 0.7) return 'medium';
      if (ratio > 2.0) return 'big';
      return 'normal';
    }

    recordAction(playerId, action, phase) {
      this.opponentModel.observe(playerId, action, phase);
      this.handHistory.push({ playerId, action, phase });
    }

    decideAction(player, state, personalityKey) {
      const prof = PROFILES[personalityKey] || PROFILES.default;
      const phase = state.phase;
      const callAmt = Math.max(0, state.currentBet - player.bet);
      const pot = state.pot;
      const numOpp = state.players.filter(p => p.id !== player.id && !p.folded).length;
      const position = this.getPosition(player.id, state.dealerIndex, state.players.length);
      const spr = player.chips / Math.max(1, pot); // stack-to-pot ratio

      // === Stack pressure (tournament/ICM awareness) ===
      const stackPressure = this.getStackPressure(player, state);

      // === PRE-FLOP ===
      if (phase === 'pre_flop') {
        const equity = getPreflopEquity(player.cards, numOpp);
        // Set multi-street plan at the start of each hand
        if (!this.currentPlan) {
          this.currentPlan = this.planStreets(player.cards, position, prof);
        }
        // Short stack: push or fold with decent hands
        if (stackPressure === 'short' && equity > 0.40) {
          return { type: 'allin' };
        }
        if (stackPressure === 'short' && equity <= 0.40) {
          return { type: 'fold' };
        }
        return this.preFlopDecision(player, state, prof, equity, callAmt, pot, position, spr, numOpp);
      }

      // === POST-FLOP ===
      // Hand strength via Monte Carlo (more trials for important decisions)
      const trials = callAmt > pot * 0.3 ? 500 : 200;
      const strength = this.monteCarloStrength(player.cards, state.communityCards, numOpp, trials);
      const draws = detectDraws(player.cards, state.communityCards);
      const currentHand = state.communityCards.length >= 3 ? HE().getBestHand(player.cards, state.communityCards) : null;

      return this.postFlopDecision(player, state, prof, strength, draws, currentHand, callAmt, pot, position, spr, numOpp);
    }

    preFlopDecision(player, state, prof, equity, callAmt, pot, position, spr, numOpp) {
      const bb = state.bigBlind;

      // === Game Theory: Nash push/fold for short stacks ===
      if (root.MJ.GameTheory) {
        const GT = root.MJ.GameTheory;
        const stackBBs = player.chips / bb;
        if (stackBBs <= 15) {
          const nash = GT.NashPushFold.shouldPush(stackBBs, equity, position);
          if (nash.shouldPush) return { type: 'allin' };
          return { type: 'fold' };
        }
      }

      // Position adjustment
      // Mei threshold ~0.46 (tight), Kenji ~0.31 (loose), Yuki ~0.38 (balanced)
      let playThreshold = 0.52 - prof.aggression * 0.28;
      if (position === 'late') playThreshold -= 0.08;
      if (position === 'early' && prof.posAware > 0.5) playThreshold += 0.08;

      // Fold below threshold
      if (equity < playThreshold) {
        // Steal attempt from late position
        if (position === 'late' && callAmt <= bb && Math.random() < prof.bluffFreq * 2) {
          this.wasPreFlopAggressor = true;
          return { type: 'raise', amount: state.currentBet + bb * 2.5 };
        }
        return { type: 'fold' };
      }

      // Premium hands (>0.75 equity): 3-bet or 4-bet
      if (equity > 0.75) {
        this.wasPreFlopAggressor = true;
        if (callAmt > bb * 8) {
          // Someone raised big — shove with AA/KK
          if (equity > 0.82) return { type: 'allin' };
          return { type: 'call' };
        }
        // Improvement 3: Pre-flop open 2.5-3x BB, 3-bet 3x previous raise
        const raiseSize = callAmt > 0
          ? Math.min(state.currentBet * 3, player.chips + player.bet) // 3-bet: 3x the previous raise
          : bb * (2.5 + Math.random() * 0.5); // open to 2.5-3x BB
        return { type: 'raise', amount: raiseSize };
      }

      // Strong hands (0.60-0.75): raise or call based on action
      if (equity > 0.60) {
        if (callAmt <= bb) {
          // No raise yet — open raise
          this.wasPreFlopAggressor = true;
          return { type: 'raise', amount: state.currentBet + bb * 2.5 };
        }
        if (callAmt <= bb * 6) return { type: 'call' };
        // 3-bet with the strongest of this tier
        if (Math.random() < prof.aggression * 0.5) {
          this.wasPreFlopAggressor = true;
          return { type: 'raise', amount: Math.min(state.currentBet * 3, player.chips + player.bet) };
        }
        if (callAmt <= bb * 10) return { type: 'call' };
        return { type: 'fold' };
      }

      // Playable hands (threshold-0.60): call moderate bets
      if (callAmt <= 0) {
        // Open raise with playable hands from late position
        if (position === 'late' && Math.random() < prof.aggression) {
          this.wasPreFlopAggressor = true;
          return { type: 'raise', amount: state.currentBet + bb * 2.5 };
        }
        return { type: 'check' };
      }
      if (callAmt <= bb * 3 && position === 'late' && Math.random() < prof.aggression * 0.4) {
        this.wasPreFlopAggressor = true;
        return { type: 'raise', amount: Math.min(state.currentBet * 2.5, player.chips + player.bet) };
      }
      if (callAmt <= bb * 4) return { type: 'call' };
      // Call larger bets with better playable hands
      if (equity > 0.50 && callAmt <= bb * 6) return { type: 'call' };
      return { type: 'fold' };
    }

    postFlopDecision(player, state, prof, strength, draws, currentHand, callAmt, pot, position, spr, numOpp) {
      const bb = state.bigBlind;
      const handRank = currentHand ? currentHand.rank : 0;
      const potOdds = callAmt > 0 ? callAmt / (pot + callAmt) : 0;

      // === Game Theory: River GTO mixing (takes priority when on the river) ===
      if (root.MJ.GameTheory && state.phase === 'river') {
        const GT = root.MJ.GameTheory;
        // Compute effective strength early for river GTO decisions
        const drawEquityEarly = draws.outs / 47;
        const impliedDrawEquityEarly = drawEquityEarly * prof.impliedOddsAdj * (1 + Math.min(1, spr * 0.1));
        let earlyEffective = Math.max(strength, strength * 0.6 + impliedDrawEquityEarly * 0.4);

        if (callAmt <= 0) {
          // Betting decision: use GTO frequencies
          const freqs = GT.GTOMixer.getRiverFrequencies(0.5, earlyEffective, position === 'late');
          const action = GT.GTOMixer.mix(freqs);
          if (action === 'bet') {
            const size = Math.floor(pot * (0.5 + (earlyEffective - 0.5) * 0.5));
            return { type: 'raise', amount: player.bet + Math.max(size, bb) };
          }
          return { type: 'check' };
        } else {
          // Facing bet: use defense frequencies
          const betFrac = callAmt / Math.max(1, pot - callAmt);
          const freqs = GT.GTOMixer.getDefenseFrequencies(betFrac, earlyEffective);
          const action = GT.GTOMixer.mix(freqs);
          if (action === 'raise') {
            return { type: 'raise', amount: Math.min(player.bet + Math.floor(pot * 0.8), player.chips + player.bet) };
          }
          if (action === 'call') return { type: 'call' };
          return { type: 'fold' };
        }
      }

      // Implied odds for draws
      const drawEquity = draws.outs / 47; // approximate equity from outs
      const impliedDrawEquity = drawEquity * prof.impliedOddsAdj * (1 + Math.min(1, spr * 0.1));

      // Effective strength including draw equity
      let effectiveStrength = Math.max(strength, strength * 0.6 + impliedDrawEquity * 0.4);

      // === Game Theory: MDF — prevent overfolding ===
      if (root.MJ.GameTheory && callAmt > 0) {
        const GT = root.MJ.GameTheory;
        const betFrac = callAmt / Math.max(1, pot - callAmt);
        const mdfAnalysis = GT.MDF.analyze(prof.foldThresh, betFrac);
        if (mdfAnalysis.overfolding && effectiveStrength > 0.25) {
          // We're folding too much -- defend to prevent exploitation
          return { type: 'call' };
        }
      }

      // === Opponent modeling: tight bettor discount ===
      if (callAmt > 0) {
        const bettorProfile = this.opponentModel.getProfile(state.lastBettorId || 0);
        if (bettorProfile && bettorProfile.isTight && callAmt > pot * 0.5) {
          effectiveStrength *= 0.85; // tight player betting big = strong hand
        }
      }

      // === Improvement 6: Bet sizing tells ===
      if (callAmt > 0) {
        const betToPotRatio = callAmt / Math.max(1, pot - callAmt);
        let sizingRead = 'neutral';
        if (betToPotRatio < 0.35) sizingRead = 'weak_or_draw';
        else if (betToPotRatio > 0.8) sizingRead = 'strong_or_bluff';
        else sizingRead = 'standard';

        if (sizingRead === 'weak_or_draw' && effectiveStrength > 0.5) {
          effectiveStrength += 0.05; // opponent weak — raise to punish
        }
        if (sizingRead === 'strong_or_bluff') {
          effectiveStrength -= 0.05; // need stronger hand to call big bets
        }
      }

      // === Multi-street plan awareness ===
      const streetIndex = state.phase === 'flop' ? 0 : state.phase === 'turn' ? 1 : 2;
      const planAction = this.currentPlan ? this.currentPlan.streets[streetIndex] : null;
      // pot_control: prefer checking on the turn
      const preferCheck = this.currentPlan && this.currentPlan.plan === 'pot_control' && state.phase === 'turn';
      // speculative: fold to big bets on river
      const preferFold = this.currentPlan && this.currentPlan.plan === 'speculative' && state.phase === 'river' && callAmt > pot * 0.5;
      // give_up: fold to any bet
      const shouldGiveUp = this.currentPlan && this.currentPlan.plan === 'give_up' && callAmt > 0;

      // === Improvement 7: Pot-committed logic ===
      if (callAmt > 0) {
        const invested = (1000 - player.chips);
        const commitRatio = invested / (invested + player.chips);
        if (commitRatio > 0.6 && effectiveStrength > 0.15) {
          if (player.chips <= callAmt * 1.5) return { type: 'allin' };
          return { type: 'call' };
        }
      }

      // === Plan-based early exits ===
      if (shouldGiveUp) return { type: 'fold' };
      if (preferFold && effectiveStrength < 0.6) return { type: 'fold' };

      // === C-BET LOGIC ===
      if (callAmt <= 0 && this.wasPreFlopAggressor && state.phase === 'flop') {
        if (Math.random() < prof.cBetFreq) {
          // Improvement 3: C-bet 50-66% pot
          const cBetSize = Math.floor(pot * (0.5 + prof.aggression * 0.16));
          return { type: 'raise', amount: player.bet + Math.max(cBetSize, bb) };
        }
      }

      // === Improvement 8: CHECK-RAISE with state tracking ===
      // When facing a bet, check if we have a pending check-raise intent
      if (callAmt > 0 && this.checkRaiseIntents[player.id] && this.checkRaiseIntents[player.id].active) {
        this.checkRaiseIntents[player.id].active = false;
        const raiseSize = Math.floor(pot * 0.8 + callAmt);
        return { type: 'raise', amount: player.bet + Math.max(raiseSize, callAmt * 2.5) };
      }
      // Set check-raise intent when strong hand decides to check
      if (callAmt <= 0 && effectiveStrength > 0.75 && Math.random() < prof.checkRaiseFreq) {
        this.checkRaiseIntents[player.id] = { active: true, strength: effectiveStrength };
        return { type: 'check' };
      }

      // === MONSTER HAND (strength > 0.85) ===
      if (effectiveStrength > 0.85 || handRank >= 5) {
        if (callAmt <= 0) {
          // Improvement 3: Value bet 50-75% pot (larger with stronger hands)
          const valueBetSize = Math.floor(pot * (0.5 + (effectiveStrength - 0.65) * 0.5));
          return { type: 'raise', amount: player.bet + Math.max(valueBetSize, bb) };
        }
        // Raise for value
        if (Math.random() < prof.aggression || handRank >= 6) {
          const valueBetSize = Math.floor(pot * (0.5 + (effectiveStrength - 0.65) * 0.5));
          const raiseSize = Math.min(state.currentBet + valueBetSize, player.chips + player.bet);
          return { type: 'raise', amount: raiseSize };
        }
        return { type: 'call' };
      }

      // === STRONG HAND (0.65-0.85) ===
      if (effectiveStrength > 0.65) {
        if (callAmt <= 0) {
          // Multi-street plan: pot control means check on turn
          if (preferCheck) return { type: 'check' };
          if (Math.random() < prof.aggression * 0.8) {
            // Improvement 3: Value bet 50-75% pot
            const valueBetSize = Math.floor(pot * (0.5 + (effectiveStrength - 0.65) * 0.5));
            return { type: 'raise', amount: player.bet + Math.max(valueBetSize, bb) };
          }
          return { type: 'check' };
        }
        // Call if pot odds are right
        if (effectiveStrength > potOdds + 0.05) return { type: 'call' };
        // Personality-based call on marginal spots
        if (Math.random() < (1 - prof.foldThresh) * 0.3) return { type: 'call' };
        return { type: 'fold' };
      }

      // === DRAWING HAND (big draw with equity) ===
      if (draws.outs >= 8 && impliedDrawEquity > potOdds) {
        if (callAmt <= 0) {
          // Semi-bluff: bet your draws aggressively
          if (Math.random() < prof.aggression * 0.7) {
            // Improvement 3: Semi-bluff 50-66% pot
            const semiBluffSize = Math.floor(pot * (0.5 + prof.aggression * 0.16));
            return { type: 'raise', amount: player.bet + Math.max(semiBluffSize, bb) };
          }
          return { type: 'check' };
        }
        // Call with good drawing odds
        if (impliedDrawEquity > potOdds) return { type: 'call' };
        return { type: 'fold' };
      }

      // === MEDIUM HAND (0.45-0.65) ===
      if (effectiveStrength > 0.45) {
        if (callAmt <= 0) {
          if (Math.random() < prof.aggression * 0.4) {
            // Improvement 3: Probe bet 33-50% pot
            return { type: 'raise', amount: player.bet + Math.floor(pot * (0.33 + Math.random() * 0.17)) };
          }
          return { type: 'check' };
        }
        if (effectiveStrength > potOdds && callAmt <= pot * 0.5) return { type: 'call' };
        // Big stacks can afford to call more liberally
        const stackPressure = this.getStackPressure(player, state);
        if (stackPressure === 'big' && effectiveStrength > potOdds - 0.05) return { type: 'call' };
        return { type: 'fold' };
      }

      // === WEAK HAND ===
      if (callAmt <= 0) {
        // === Game Theory: GTO-informed bluff frequency ===
        if (root.MJ.GameTheory) {
          const GT = root.MJ.GameTheory;
          const betFrac = 0.5; // we're considering a half-pot bluff
          const optimalBluff = GT.ValueBluffRatio.optimalBluffRatio(betFrac);
          // Blend GTO optimal with personality tendency
          const bluffProb = optimalBluff * 0.5 + prof.bluffFreq * 0.5;
          if (Math.random() < bluffProb) {
            const bluffSize = Math.floor(pot * (0.33 + Math.random() * 0.17));
            return { type: 'raise', amount: player.bet + Math.max(bluffSize, bb) };
          }
        } else if (this.shouldBluff(prof, state, position, numOpp)) {
          // Fallback: original bluff logic when game theory module not loaded
          const bluffSize = Math.floor(pot * (0.33 + Math.random() * 0.17));
          return { type: 'raise', amount: player.bet + Math.max(bluffSize, bb) };
        }
        return { type: 'check' };
      }

      // Fold to any bet with weak hand (unless tiny)
      if (callAmt <= bb && Math.random() < 0.3) return { type: 'call' }; // station with min bet
      return { type: 'fold' };
    }

    shouldBluff(prof, state, position, numOpp) {
      let bluffProb = prof.bluffFreq;

      // Bluff more in late position
      if (position === 'late') bluffProb += 0.1;
      if (position === 'early') bluffProb -= 0.08;

      // Bluff more with fewer opponents
      if (numOpp === 1) bluffProb += 0.1;
      if (numOpp >= 3) bluffProb -= 0.15;

      // Bluff more on scary boards (ace or king on board)
      if (state.communityCards) {
        const hasAce = state.communityCards.some(c => c.value === 14);
        const hasKing = state.communityCards.some(c => c.value === 13);
        if (hasAce || hasKing) bluffProb += 0.08; // opponents fear top pair
      }

      // Bluff less on wet boards (many draws possible)
      if (state.communityCards && state.communityCards.length >= 3) {
        const suits = {};
        state.communityCards.forEach(c => { suits[c.suit] = (suits[c.suit] || 0) + 1; });
        if (Object.values(suits).some(v => v >= 3)) bluffProb -= 0.1; // monotone board = dangerous to bluff
      }

      // Exploit specific opponents (blended with GTO via exploit weight)
      if (numOpp === 1) {
        const oppId = state.players.find(p => !p.folded && p.id !== state.players[state.currentPlayerIndex]?.id)?.id;
        if (oppId !== undefined) {
          const oppProfile = this.opponentModel.getProfile(oppId);
          if (oppProfile) {
            let exploitAdj = 0;
            if (oppProfile.foldRate > 0.5) exploitAdj = 0.15; // opponent folds a lot -> bluff more
            if (oppProfile.foldRate < 0.2) exploitAdj = -0.15; // calling station -> don't bluff

            // Game Theory: scale exploitative adjustment by confidence in reads
            if (root.MJ.GameTheory && exploitAdj !== 0) {
              const sampleSize = this.opponentModel.profiles[oppId]?.hands || 0;
              const exploitWeight = root.MJ.GameTheory.ExploitGTOBalance.getExploitWeight(sampleSize);
              exploitAdj *= exploitWeight; // less data = smaller adjustment
            }
            bluffProb += exploitAdj;
          }
        }
      }

      bluffProb += (Math.random() - 0.5) * prof.tilt;
      return Math.random() < Math.max(0, Math.min(0.5, bluffProb));
    }

    monteCarloStrength(holeCards, community, numOpp, trials) {
      if (!holeCards || holeCards.length < 2) return 0.5;
      const C = Cards(), H = HE();
      if (!C || !H) return 0.5;

      let wins = 0, total = 0;
      const knownCards = holeCards.concat(community);
      const communityNeeded = 5 - community.length;

      for (let t = 0; t < trials; t++) {
        const tempDeck = new C.Deck();
        tempDeck.removeCards(knownCards);
        tempDeck.shuffle();
        if (tempDeck.cards.length < communityNeeded + numOpp * 2) continue;

        const simCommunity = community.slice();
        for (let c = 0; c < communityNeeded; c++) simCommunity.push(tempDeck.cards.shift());

        const ourHand = H.getBestHand(holeCards, simCommunity);
        if (!ourHand) continue;

        let weWin = true;
        for (let o = 0; o < numOpp; o++) {
          if (tempDeck.cards.length < 2) break;
          const oppCards = [tempDeck.cards.shift(), tempDeck.cards.shift()];
          const oppHand = H.getBestHand(oppCards, simCommunity);
          if (oppHand && H.compareHands(ourHand, oppHand) < 0) { weWin = false; break; }
        }
        if (weWin) wins++;
        total++;
      }
      return total > 0 ? wins / total : 0.5;
    }

    getPosition(playerIdx, dealerIdx, numPlayers) {
      const pos = (playerIdx - dealerIdx + numPlayers) % numPlayers;
      const third = numPlayers / 3;
      if (pos <= third) return 'early';
      if (pos <= third * 2) return 'middle';
      return 'late';
    }
  }

  root.MJ.Poker.AIv2 = { PokerAIv2, OpponentModel, detectDraws, getPreflopEquity, PROFILES };

  if (typeof console !== 'undefined') console.log('[Poker] AI v2 loaded');
})(typeof window !== 'undefined' ? window : global);
