/**
 * claude-player.js — Interface for Claude/external AI to play as a seat
 * Provides structured game state and accepts decisions via callback.
 * Works in both browser and Node.js headless mode.
 * See interfaces.js for API documentation
 */
(function (exports) {
  'use strict';
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  const Tile = () => root.MJ.Tile;
  const Hand = () => root.MJ.Hand;
  const AIE = () => root.MJ.AIEngine;

  /**
   * Claude Player adapter — translates game state into structured data
   * that an LLM can reason about, and converts decisions back.
   */
  class ClaudePlayer {
    constructor(seatIndex) {
      this.seatIndex = seatIndex;
      this.decisionHistory = [];
      this.strategy = 'balanced'; // balanced, aggressive, defensive
    }

    /**
     * Format game state as structured text for Claude to reason about
     */
    formatStateForClaude(player, state) {
      const hand = player.hand;
      const concealed = Tile().sortTiles(hand.concealed);
      const T = Tile();

      const lines = [];
      lines.push(`=== YOUR HAND (Seat ${this.seatIndex}, ${player.seatWind} wind) ===`);
      lines.push(`Concealed: ${concealed.map(t => T.getName(t)).join(', ')}`);
      lines.push(`Melds: ${hand.melds.map(m => m.tiles.map(t => T.getName(t)).join('-')).join(' | ') || 'none'}`);

      // Shanten
      const compact = AIE().handToCompact(hand);
      const shanten = AIE().calcShantenCompact(new Uint8Array(compact), hand.melds.length);
      lines.push(`Shanten: ${shanten} (${shanten < 0 ? 'WINNING' : shanten === 0 ? 'TENPAI' : shanten + ' away'})`);

      // Visible info
      lines.push(`\n=== TABLE STATE ===`);
      lines.push(`Round: ${state.roundWind} wind, Turn: ${state.turnCount || 0}`);
      lines.push(`Wall remaining: ${state.wall ? root.MJ.Wall.remaining(state.wall) : '?'}`);

      for (let i = 0; i < 4; i++) {
        const p = state.players[i];
        const label = i === this.seatIndex ? 'YOU' : `Player ${i} (${p.seatWind})`;
        const discStr = p.discards.slice(-6).map(t => T.getName(t)).join(', ');
        const meldStr = p.hand.melds.map(m =>
          `[${m.type}: ${m.tiles.map(t => T.getName(t)).join('-')}]`
        ).join(' ');
        lines.push(`${label}: ${p.discards.length} discards (recent: ${discStr || 'none'}) ${meldStr}`);
      }

      return lines.join('\n');
    }

    /**
     * Built-in heuristic decision maker (Claude-style reasoning)
     * This serves as the default when no external callback is provided.
     * Uses the advanced AI engine but applies strategic overlays.
     */
    makeDecision(action, player, state, extraTile) {
      const engine = new (AIE().AIEngine)();

      switch (action) {
        case 'discard':
          return this.selectDiscardWithStrategy(engine, player, state);

        case 'claim_pong':
          return this.evaluateClaim(engine, player, state, extraTile, 'pong');

        case 'claim_chow':
          return this.evaluateClaim(engine, player, state, extraTile, 'chow');

        case 'claim_kong':
          return true; // always claim kongs

        case 'claim_win':
          return true; // always claim wins

        default:
          return null;
      }
    }

    selectDiscardWithStrategy(engine, player, state) {
      const hand = player.hand;
      const compact = AIE().handToCompact(hand);
      const shanten = AIE().calcShantenCompact(new Uint8Array(compact), hand.melds.length);

      // Strategy adjustments
      if (this.strategy === 'aggressive') {
        engine.weights.aggressionBase = 0.8;
        engine.weights.defense = 400;
      } else if (this.strategy === 'defensive') {
        engine.weights.aggressionBase = 0.4;
        engine.weights.defense = 1200;
      }

      const tile = engine.selectDiscard(player, state);

      this.decisionHistory.push({
        turn: state.turnCount || 0,
        action: 'discard',
        tile: tile ? Tile().getName(tile) : null,
        shanten,
        strategy: this.strategy,
        reasoning: this.getDiscardReasoning(engine, tile, shanten)
      });

      return tile;
    }

    evaluateClaim(engine, player, state, tile, type) {
      const should = engine.shouldClaimMeld(player, tile, type, state);

      this.decisionHistory.push({
        turn: state.turnCount || 0,
        action: `claim_${type}`,
        tile: Tile().getName(tile),
        decision: should,
        strategy: this.strategy
      });

      return should;
    }

    getDiscardReasoning(engine, tile, shanten) {
      if (!tile) return 'no tiles to discard';
      const log = engine.getDecisionLog();
      const last = log[log.length - 1];
      if (!last) return 'default choice';

      const top = last.topCandidates;
      if (!top || top.length === 0) return 'only option';

      return `shanten=${shanten}, chose ${last.chosen} ` +
        `(score=${top[0].score}, danger=${top[0].dg}, ukeire=${top[0].uk})`;
    }

    setStrategy(strategy) {
      this.strategy = strategy;
    }

    getDecisionHistory() {
      return [...this.decisionHistory];
    }

    getDecisionSummary() {
      const total = this.decisionHistory.length;
      const discards = this.decisionHistory.filter(d => d.action === 'discard').length;
      const claims = this.decisionHistory.filter(d => d.action.startsWith('claim_'));
      const accepted = claims.filter(d => d.decision === true).length;

      return {
        totalDecisions: total,
        discards,
        claimsOffered: claims.length,
        claimsAccepted: accepted,
        strategy: this.strategy,
        lastFewDecisions: this.decisionHistory.slice(-5)
      };
    }

    clearHistory() {
      this.decisionHistory = [];
    }
  }

  /**
   * Create a Claude callback function for use with HeadlessGame
   */
  function createClaudeCallback(claudePlayer) {
    return function (action, player, state, extraTile) {
      return claudePlayer.makeDecision(action, player, state, extraTile);
    };
  }

  root.MJ.ClaudePlayer = Object.freeze({
    ClaudePlayer,
    createClaudeCallback
  });

  if (typeof console !== 'undefined') console.log('[Mahjong] ClaudePlayer module loaded');
})(typeof window !== 'undefined' ? window : global);
