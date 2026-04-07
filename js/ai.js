/**
 * ai.js — AI decision engine for computer players
 * Now delegates to AIEngine for advanced decisions when available.
 * Falls back to basic heuristics if AIEngine not loaded.
 * See interfaces.js for API documentation
 */
(function () {
  'use strict';
  const { SUITS, MELD_TYPES } = window.MJ.Constants;
  const Tile = window.MJ.Tile;
  const Hand = window.MJ.Hand;

  // Per-player advanced engine instances (created lazily)
  const engines = [null, null, null, null];

  /**
   * Evaluate how useful a tile is in the hand
   * Higher score = more useful = less likely to discard
   */
  function evaluateTileValue(tile, concealed, melds) {
    let value = 0;
    const id = Tile.getId(tile);
    const sameCount = concealed.filter(t => Tile.getId(t) === id).length;

    // Pairs and triplets are valuable
    if (sameCount >= 3) value += 80;
    else if (sameCount >= 2) value += 40;

    // Suited tile connectivity
    if (Tile.isSuited(tile)) {
      const suit = tile.suit;
      const rank = tile.rank;
      const hasAdj1 = concealed.some(t => t.suit === suit && t.rank === rank - 1);
      const hasAdj2 = concealed.some(t => t.suit === suit && t.rank === rank + 1);
      const hasGap1 = concealed.some(t => t.suit === suit && t.rank === rank - 2);
      const hasGap2 = concealed.some(t => t.suit === suit && t.rank === rank + 2);

      if (hasAdj1 && hasAdj2) value += 60; // middle of sequence
      else if (hasAdj1 || hasAdj2) value += 30; // adjacent pair
      else if (hasGap1 || hasGap2) value += 15; // gap pair

      // Middle tiles more versatile
      if (rank >= 3 && rank <= 7) value += 5;
      if (rank >= 4 && rank <= 6) value += 5;
    }

    // Honor tiles - pairs/triplets are good, isolated are bad
    if (Tile.isHonor(tile)) {
      if (sameCount === 1) value -= 5;
    }

    return value;
  }

  function getEngine(playerIdx) {
    if (window.MJ.AIEngine) {
      if (!engines[playerIdx]) {
        const weights = window.MJ.Learning ?
          new window.MJ.Learning.LearningSystem().getWeights() : undefined;
        engines[playerIdx] = new window.MJ.AIEngine.AIEngine(weights);
      }

      // Apply personality modifiers if available
      if (window.MJ.Personality && playerIdx > 0) {
        try {
          const charIds = {1: 'mei', 2: 'kenji', 3: 'yuki'};
          const charId = charIds[playerIdx];
          if (charId) {
            const pe = new window.MJ.Personality.PersonalityEngine(charId);
            const mods = pe.getWeightModifiers();
            if (mods && engines[playerIdx].weights) {
              const w = engines[playerIdx].weights;
              if (mods.aggressionBase) w.aggressionBase = Math.max(0.2, Math.min(0.9, w.aggressionBase + mods.aggressionBase));
              if (mods.defense) w.defense = Math.max(200, Math.min(2000, w.defense + mods.defense));
              if (mods.handValue) w.handValue = Math.max(1, Math.min(20, (w.handValue || 8) + mods.handValue));
              if (mods.openPenalty) w.openPenalty = Math.max(0.2, Math.min(0.9, (w.openPenalty || 0.5) + mods.openPenalty));
            }
          }
        } catch(e) {}
      }

      // Apply cross-game emotional modifiers (tilting in poker → worse Mahjong play)
      if (window.MJ.CrossGameLearning && playerIdx > 0) {
        try {
          const cgl = new window.MJ.CrossGameLearning.CrossGameLearning();
          const charIds = {1: 'mei', 2: 'kenji', 3: 'yuki'};
          const charId = charIds[playerIdx];
          if (charId) {
            const emotionMods = cgl.getEmotionModifiers(charId);
            const w = engines[playerIdx].weights;
            if (emotionMods.aggression) w.aggressionBase = Math.max(0.2, Math.min(0.95, w.aggressionBase + emotionMods.aggression));
            if (emotionMods.defense) w.defense = Math.max(100, Math.min(2000, w.defense + emotionMods.defense * 500));
            if (emotionMods.patience) w.handValue = Math.max(1, Math.min(20, (w.handValue || 8) + emotionMods.patience * 5));
          }
        } catch(e) {}
      }

      // Apply cognitive weight adjustments (character's learned beliefs)
      if (window.MJ.CharacterCognition && playerIdx > 0) {
        try {
          const charIds = {1: 'mei', 2: 'kenji', 3: 'yuki'};
          const charId = charIds[playerIdx];
          if (charId) {
            const cog = new window.MJ.CharacterCognition.CharacterCognition(charId);
            const cogAdj = cog.getWeightAdjustments();
            const w = engines[playerIdx].weights;
            if (cogAdj.aggression) w.aggressionBase = Math.max(0.2, Math.min(0.95, w.aggressionBase + cogAdj.aggression));
            if (cogAdj.defense) w.defense = Math.max(100, Math.min(2000, w.defense + cogAdj.defense * 500));
            if (cogAdj.callFreq) w.openPenalty = Math.max(0.2, Math.min(0.9, (w.openPenalty || 0.5) + cogAdj.callFreq));
          }
        } catch(e) {}
      }

      return engines[playerIdx];
    }
    return null;
  }

  /**
   * Choose which tile to discard — delegates to advanced engine if available
   */
  function chooseDiscard(player, gameState) {
    const hand = player.hand;
    const concealed = hand.concealed;
    if (concealed.length === 0) return null;

    // Try advanced engine first
    const engine = getEngine(player.seatIndex);
    if (engine && gameState && gameState.players) {
      try { return engine.selectDiscard(player, gameState); }
      catch (e) { /* fall through to basic */ }
    }

    // Basic fallback
    const scores = concealed.map(tile => ({
      tile,
      value: evaluateTileValue(tile, concealed, hand.melds),
      danger: getDangerRating(tile, gameState)
    }));
    scores.sort((a, b) => {
      const aScore = a.value - a.danger * 20;
      const bScore = b.value - b.danger * 20;
      return aScore - bScore;
    });
    return scores[0].tile;
  }

  /**
   * Evaluate overall hand quality (0-100)
   */
  function evaluateHand(hand) {
    const shanten = Hand.calculateShanten(hand);
    let score = Math.max(0, 100 - shanten * 25);

    // Bonus for melds already formed
    score += hand.melds.length * 10;

    // Check for scoring patterns
    const concealed = hand.concealed;
    const suits = new Set(concealed.filter(t => Tile.isSuited(t)).map(t => t.suit));
    if (suits.size === 1) score += 15; // heading towards pure suit

    return Math.min(100, score);
  }

  /**
   * How dangerous is discarding this tile? (0-1)
   * Based on what opponents have discarded and what's visible
   */
  function getDangerRating(tile, gameState) {
    if (!gameState) return 0;
    let danger = 0;
    const allDiscards = [];
    for (const p of gameState.players) {
      allDiscards.push(...p.discards);
    }

    // If 2+ of this tile already discarded, it's safer
    const discardCount = allDiscards.filter(t => Tile.getId(t) === Tile.getId(tile)).length;
    if (discardCount >= 2) danger -= 0.3;
    if (discardCount >= 3) danger -= 0.3;

    // Terminal/honor tiles generally safer in middle game
    if (Tile.isTerminalOrHonor(tile)) danger -= 0.1;

    // Middle tiles slightly more dangerous
    if (Tile.isSuited(tile) && tile.rank >= 3 && tile.rank <= 7) danger += 0.1;

    return Math.max(0, Math.min(1, 0.3 + danger));
  }

  /**
   * Should AI claim a chow?
   * Returns the chow tiles to use, or null
   */
  function shouldClaimChow(player, tile, gameState) {
    const chows = Hand.findChows(player.hand, tile);
    if (chows.length === 0) return null;

    // Claim if it improves shanten
    const currentShanten = Hand.calculateShanten(player.hand);
    for (const chow of chows) {
      // Simulate claiming
      const testHand = simulateChow(player.hand, tile, chow);
      const newShanten = Hand.calculateShanten(testHand);
      if (newShanten < currentShanten) return chow;
    }

    // Also claim if shanten is already low
    if (currentShanten <= 1 && chows.length > 0) return chows[0];

    return null;
  }

  function shouldClaimPong(player, tile, gameState) {
    const pongs = Hand.findPongs(player.hand, tile);
    if (pongs.length === 0) return false;

    // Almost always claim pongs - they're strong
    const currentShanten = Hand.calculateShanten(player.hand);
    return currentShanten >= 0; // claim unless already winning
  }

  function shouldClaimKong(player, tile, gameState) {
    const kongs = Hand.findKongs(player.hand, tile);
    return kongs.length > 0;
  }

  function shouldDeclareWin(player, gameState) {
    return true; // AI always declares win if possible
  }

  function shouldDeclareKong(player, gameState) {
    // Check for concealed kongs
    const kongs = Hand.findConcealedKongs(player.hand);
    if (kongs.length > 0) return kongs[0];

    // Check for promoting pong to kong
    for (const tile of player.hand.concealed) {
      if (Hand.canPromoteToKong(player.hand, tile)) {
        return [tile]; // signal to promote
      }
    }
    return null;
  }

  function simulateChow(hand, claimedTile, chowTiles) {
    const simHand = {
      concealed: [...hand.concealed],
      melds: [...hand.melds, { type: MELD_TYPES.CHOW, tiles: chowTiles, open: true }],
      drawnTile: null
    };
    // Remove the tiles used from concealed (excluding the claimed tile)
    for (const t of chowTiles) {
      if (Tile.getId(t) !== Tile.getId(claimedTile)) {
        const idx = simHand.concealed.findIndex(c => Tile.getId(c) === Tile.getId(t));
        if (idx >= 0) simHand.concealed.splice(idx, 1);
      }
    }
    return simHand;
  }

  window.MJ.AI = Object.freeze({
    chooseDiscard, evaluateHand, getDangerRating,
    shouldClaimChow, shouldClaimPong, shouldClaimKong,
    shouldDeclareWin, shouldDeclareKong
  });

  console.log('[Mahjong] AI module loaded');
})();
