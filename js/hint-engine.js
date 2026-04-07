/**
 * hint-engine.js — Context-sensitive hint system during gameplay
 * Analyzes game state to provide tile efficiency, danger, scoring hints.
 */
(function (exports) {
  'use strict';
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};
  const Tile = () => root.MJ.Tile;
  const Hand = () => root.MJ.Hand;
  const AIE = () => root.MJ.AIEngine;

  const HINT_LEVELS = { OFF: 0, NOVICE: 1, LEARNING: 2, ADVANCED: 3 };

  class HintEngine {
    constructor() {
      this.level = HINT_LEVELS.LEARNING;
      this.lastHints = {};
      this.hintCount = 0;
      this.maxHintsPerHand = 20;
    }

    setLevel(level) { this.level = level; }
    getLevel() { return this.level; }
    resetForRound() { this.hintCount = 0; this.lastHints = {}; }

    /** Get all hints for current hand state */
    getHandHints(player, state) {
      if (this.level === HINT_LEVELS.OFF) return null;
      const hand = player.hand;
      const compact = AIE().handToCompact(hand);
      const meldCount = hand.melds.length;
      const tracker = new (AIE().TileTracker)();
      tracker.buildFromState(state, player.seatIndex);

      const shanten = AIE().calcShantenCompact(new Uint8Array(compact), meldCount);
      const ukeire = AIE().calcUkeire(new Uint8Array(compact), meldCount, tracker);

      const hints = { shanten, tenpai: shanten === 0, winning: shanten < 0, tiles: {} };

      // Per-tile analysis
      if (this.level >= HINT_LEVELS.LEARNING) {
        for (const tile of hand.concealed) {
          const idx = AIE().tileToIndex(tile);
          if (idx < 0) continue;
          const id = Tile().getId(tile);
          if (hints.tiles[id]) continue;

          compact[idx]--;
          const afterShanten = AIE().calcShantenCompact(new Uint8Array(compact), meldCount);
          const afterUkeire = AIE().calcUkeire(new Uint8Array(compact), meldCount, tracker);
          compact[idx]++;

          const dangerModel = new (AIE().DangerModel)(tracker);
          const danger = dangerModel.getMaxDanger(idx, player.seatIndex, state.turnCount || 0);

          hints.tiles[id] = {
            shantenAfter: afterShanten,
            shantenChange: afterShanten - shanten,
            ukeireAfter: afterUkeire.total,
            acceptTiles: afterUkeire.tiles.map(t => AIE().indexToTileDef(t.idx)),
            danger: danger,
            dangerLevel: danger < 0.1 ? 'safe' : danger < 0.3 ? 'low' : danger < 0.6 ? 'medium' : 'high',
            isOptimal: false
          };
        }

        // Mark optimal discard(s)
        let bestShanten = 99, bestUkeire = -1;
        for (const [id, h] of Object.entries(hints.tiles)) {
          if (h.shantenAfter < bestShanten || (h.shantenAfter === bestShanten && h.ukeireAfter > bestUkeire)) {
            bestShanten = h.shantenAfter;
            bestUkeire = h.ukeireAfter;
          }
        }
        for (const [id, h] of Object.entries(hints.tiles)) {
          h.isOptimal = h.shantenAfter === bestShanten && h.ukeireAfter >= bestUkeire - 2;
        }
      }

      // Waiting tiles (when tenpai)
      if (shanten === 0) {
        hints.waitingTiles = ukeire.tiles.map(t => ({
          ...AIE().indexToTileDef(t.idx),
          remaining: t.count
        }));
      }

      // Scoring potential
      if (this.level >= HINT_LEVELS.LEARNING) {
        hints.scoringPotential = AIE().estimateHandValue(
          compact, hand.melds, player.seatWind, state.roundWind);
      }

      this.lastHints = hints;
      return hints;
    }

    /** Get a natural language suggestion for the current state */
    getSuggestion(player, state) {
      const hints = this.getHandHints(player, state);
      if (!hints) return null;
      this.hintCount++;

      if (hints.winning) return { type: 'win', text: 'You have a winning hand! Declare Tsumo (W key)!' };

      if (hints.tenpai) {
        const waits = hints.waitingTiles || [];
        const waitNames = waits.map(w => `${w.rank} of ${w.suit} (${w.remaining} left)`).join(', ');
        return { type: 'tenpai', text: `Tenpai! Waiting on: ${waitNames}. Consider declaring Riichi for +10 points.` };
      }

      // Find best and worst discards
      const tiles = Object.entries(hints.tiles);
      if (tiles.length === 0) return null;

      tiles.sort((a, b) => {
        if (a[1].shantenAfter !== b[1].shantenAfter) return a[1].shantenAfter - b[1].shantenAfter;
        return b[1].ukeireAfter - a[1].ukeireAfter;
      });

      const best = tiles[0];
      const worst = tiles[tiles.length - 1];

      if (this.level === HINT_LEVELS.NOVICE) {
        return {
          type: 'hint',
          text: `You are ${hints.shanten} tile${hints.shanten !== 1 ? 's' : ''} from ready. ` +
                `Try to form groups of 3 (sequences or triplets) plus a pair.`
        };
      }

      const bestName = best[0];
      return {
        type: 'efficiency',
        text: `Best discard: ${bestName} (${best[1].ukeireAfter} useful draws after). ` +
              `Danger: ${best[1].dangerLevel}. Hand value potential: ~${hints.scoringPotential} pts.`,
        bestTileId: bestName
      };
    }

    /** Evaluate a player's discard choice */
    evaluateDiscard(player, state, chosenTile) {
      const hints = this.lastHints;
      if (!hints || !hints.tiles) return null;

      const chosenId = Tile().getId(chosenTile);
      const chosen = hints.tiles[chosenId];
      if (!chosen) return null;

      // Find the optimal play
      let bestId = null, bestScore = -Infinity;
      for (const [id, h] of Object.entries(hints.tiles)) {
        const score = (6 - h.shantenAfter) * 100 + h.ukeireAfter * 2 - h.danger * 50;
        if (score > bestScore) { bestScore = score; bestId = id; }
      }

      const chosenScore = (6 - chosen.shantenAfter) * 100 + chosen.ukeireAfter * 2 - chosen.danger * 50;
      const gap = bestScore - chosenScore;

      if (gap < 10) return { quality: 'optimal', message: 'Good discard!' };
      if (gap < 50) return { quality: 'acceptable', message: `Decent choice. ${bestId} was slightly better (${hints.tiles[bestId].ukeireAfter} vs ${chosen.ukeireAfter} useful draws).` };
      if (gap < 150) return { quality: 'suboptimal', message: `${bestId} would have been better — it keeps ${hints.tiles[bestId].ukeireAfter} useful draws vs your ${chosen.ukeireAfter}, and is ${hints.tiles[bestId].dangerLevel} danger.` };
      return { quality: 'mistake', message: `That was risky! ${bestId} was much better: ${hints.tiles[bestId].ukeireAfter} useful draws, ${hints.tiles[bestId].dangerLevel} danger. Your choice loses ${gap > 200 ? 'significant' : 'some'} efficiency.` };
    }

    /** Explain a claim decision */
    explainClaim(tile, claimType, shouldClaim, reason) {
      const name = Tile().getName(tile);
      if (shouldClaim) {
        return `You can ${claimType} the ${name}! ${reason || 'This improves your hand.'}`;
      }
      return `You could ${claimType} the ${name}, but it's not recommended: ${reason || 'it would weaken your hand value.'}`;
    }
  }

  root.MJ.HintEngine = Object.freeze({ HintEngine, HINT_LEVELS });
  if (typeof console !== 'undefined') console.log('[Mahjong] HintEngine module loaded');
})(typeof window !== 'undefined' ? window : global);
