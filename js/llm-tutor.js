/**
 * llm-tutor.js — LLM-powered tutor that explains game state and decisions.
 * Provides a chat interface for asking questions and getting contextual advice.
 * Works with any OpenAI-compatible API (configurable endpoint).
 */
(function (exports) {
  'use strict';
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};
  const Tile = () => root.MJ.Tile;
  const Hand = () => root.MJ.Hand;
  const AIE = () => root.MJ.AIEngine;

  class LLMTutor {
    constructor(config = {}) {
      this.apiUrl = config.apiUrl || '';
      this.apiKey = config.apiKey || '';
      this.model = config.model || 'claude-sonnet-4-20250514';
      this.provider = config.provider || 'anthropic'; // 'anthropic' or 'openai'
      this.enabled = false;
      this.chatHistory = [];
      this.maxHistory = 20;
      this.onMessage = config.onMessage || null;
      this.playerStage = 'beginner';

      this.systemPrompt = `You are a friendly, expert Mahjong tutor embedded in a game. You help players learn and improve.

RULES:
- Be concise (2-4 sentences max unless asked for detail)
- Reference the specific tiles and game state provided
- Adapt to the player's skill level (currently: ${this.playerStage})
- Be encouraging — praise good plays, gently correct mistakes
- Use Mahjong terminology but explain it when first used
- When suggesting discards, explain WHY (efficiency, safety, hand value)
- If the player asks about scoring, explain in context of their hand

TILE NOTATION: Use names like "3 of Bamboo", "Red Dragon", "East Wind"
CONCEPTS: shanten (tiles from ready), tenpai (one away), ukeire (useful draws)`;
    }

    setApiConfig(url, key, model, provider) {
      this.apiUrl = url;
      this.apiKey = key;
      if (model) this.model = model;
      if (provider) this.provider = provider;
      this.enabled = !!(url && key);
    }

    isEnabled() { return this.enabled; }

    setPlayerStage(stage) {
      this.playerStage = stage;
      this.systemPrompt = this.systemPrompt.replace(
        /currently: \w+/, `currently: ${stage}`);
    }

    /** Format game state as context for the LLM */
    formatContext(player, state) {
      if (!player || !state) return '';
      const T = Tile();
      const hand = player.hand;
      const concealed = hand.concealed.map(t => T.getName(t)).join(', ');
      const melds = hand.melds.map(m =>
        `[${m.type}${m.open ? ' open' : ' closed'}: ${m.tiles.map(t => T.getName(t)).join('-')}]`
      ).join(' ');

      const compact = AIE().handToCompact(hand);
      const shanten = AIE().calcShantenCompact(new Uint8Array(compact), hand.melds.length);

      let ctx = `CURRENT GAME STATE:\n`;
      ctx += `Your hand: ${concealed}\n`;
      ctx += `Your melds: ${melds || 'none'}\n`;
      ctx += `Shanten: ${shanten} (${shanten < 0 ? 'WINNING' : shanten === 0 ? 'TENPAI - one away!' : shanten + ' tiles away'})\n`;
      ctx += `Seat: ${player.seatWind} wind | Round: ${state.roundWind} wind\n`;
      ctx += `Turn: ${state.turnCount || 0} | Wall: ${state.wall ? root.MJ.Wall.remaining(state.wall) : '?'} tiles left\n`;

      if (player.flowerTiles && player.flowerTiles.length > 0) {
        ctx += `Flowers: ${player.flowerTiles.length} (+${player.flowerTiles.length * 2} bonus pts)\n`;
      }

      // Opponent info
      for (let i = 0; i < 4; i++) {
        if (i === player.seatIndex) continue;
        const p = state.players[i];
        const label = `${p.seatWind} wind`;
        const openMelds = p.hand.melds.filter(m => m.open);
        const meldStr = openMelds.map(m => `${m.type}: ${m.tiles.map(t => T.getName(t)).join('-')}`).join('; ');
        ctx += `${label}: ${p.discards.length} discards, ${openMelds.length} open melds${meldStr ? ' (' + meldStr + ')' : ''}${p.riichi ? ' [RIICHI!]' : ''}\n`;
      }

      return ctx;
    }

    /** Ask the LLM for advice/explanation */
    async ask(question, player, state) {
      const context = this.formatContext(player, state);

      if (!this.enabled) {
        return this.getOfflineResponse(question, player, state);
      }

      const historyMessages = this.chatHistory.slice(-this.maxHistory).map(m => ({
        role: m.role, content: m.content
      }));
      const userMessage = { role: 'user', content: `${context}\n\nPlayer asks: ${question}` };

      try {
        let headers, body;

        if (this.provider === 'openai') {
          // OpenAI-compatible format
          headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          };
          body = JSON.stringify({
            model: this.model,
            max_tokens: 300,
            messages: [
              { role: 'system', content: this.systemPrompt },
              ...historyMessages,
              userMessage
            ]
          });
        } else {
          // Anthropic Messages API format
          headers = {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01'
          };
          body = JSON.stringify({
            model: this.model,
            max_tokens: 300,
            system: this.systemPrompt,
            messages: [
              ...historyMessages,
              userMessage
            ]
          });
        }

        const response = await fetch(this.apiUrl, {
          method: 'POST',
          headers,
          body
        });

        if (response.status === 401) {
          return 'API authentication failed. Please check your API key in settings.';
        }
        if (response.status === 429) {
          return 'Rate limit reached. Please wait a moment and try again.';
        }
        if (!response.ok) {
          return this.getOfflineResponse(question, player, state);
        }

        const data = await response.json();

        let reply;
        if (this.provider === 'openai') {
          reply = data.choices?.[0]?.message?.content || 'I couldn\'t generate a response.';
        } else {
          reply = data.content?.[0]?.text || 'I couldn\'t generate a response.';
        }

        this.chatHistory.push({ role: 'user', content: question });
        this.chatHistory.push({ role: 'assistant', content: reply });

        return reply;
      } catch (e) {
        return this.getOfflineResponse(question, player, state);
      }
    }

    /** Generate contextual advice without API (offline mode) */
    getOfflineResponse(question, player, state) {
      if (!player) return 'Start a game first to get advice!';
      const T = Tile();
      const hand = player.hand;
      const compact = AIE().handToCompact(hand);
      const meldCount = hand.melds.length;
      const tracker = new (AIE().TileTracker)();
      if (state) tracker.buildFromState(state, player.seatIndex);
      const shanten = AIE().calcShantenCompact(new Uint8Array(compact), meldCount);

      const q = question.toLowerCase();

      if (q.includes('what should i discard') || q.includes('which tile') || q.includes('best discard')) {
        const engine = new (AIE().AIEngine)();
        const best = engine.selectDiscard(player, state);
        if (best) {
          const idx = AIE().tileToIndex(best);
          compact[idx]--;
          const afterUkeire = AIE().calcUkeire(new Uint8Array(compact), meldCount, tracker);
          compact[idx]++;
          return `I'd recommend discarding ${T.getName(best)}. It leaves ${afterUkeire.total} useful draws and keeps your hand shape strong. Your hand is ${shanten}-shanten (${shanten === 0 ? 'tenpai!' : shanten + ' away from ready'}).`;
        }
      }

      if (q.includes('win') || q.includes('tsumo') || q.includes('can i win')) {
        if (shanten < 0) return 'YES! You have a winning hand! Press W or click "Declare Win" now!';
        if (shanten === 0) {
          const ukeire = AIE().calcUkeire(new Uint8Array(compact), meldCount, tracker);
          const waits = ukeire.tiles.map(t => T.getName(Tile().create(AIE().indexToTileDef(t.idx).suit, AIE().indexToTileDef(t.idx).rank)));
          return `You're TENPAI (one away)! Waiting for: ${waits.join(', ')} (${ukeire.total} tiles left in wall). ${!hand.melds.some(m => m.open) ? 'You can declare Riichi for +10 bonus!' : ''}`;
        }
        return `You're ${shanten}-shanten (${shanten} tiles away from ready). Focus on building sequences and triplets. Discard isolated tiles that don't connect with anything.`;
      }

      if (q.includes('score') || q.includes('points') || q.includes('how much')) {
        const value = AIE().estimateHandValue(compact, hand.melds, player.seatWind, state?.roundWind);
        return `Your hand's current estimated value is ~${value} points if completed. ${player.flowerTiles?.length ? `Plus ${player.flowerTiles.length * 2} flower bonus.` : ''} To increase scoring: aim for Dragon/Wind pongs (+10 each), keep hand concealed (+5), or go for a flush.`;
      }

      if (q.includes('danger') || q.includes('safe') || q.includes('defense') || q.includes('fold')) {
        let riichiCount = 0;
        if (state) {
          for (const p of state.players) {
            if (p.seatIndex !== player.seatIndex && p.riichi) riichiCount++;
          }
        }
        if (riichiCount > 0) {
          return `${riichiCount} opponent(s) declared Riichi — they're tenpai! ${shanten > 1 ? 'Consider folding: discard tiles they already threw (100% safe) or terminals/honors.' : 'Your hand is close — it may be worth pushing, but discard carefully.'}`;
        }
        return `Check opponent discards for safe tiles. Tiles they already threw are 100% safe (genbutsu). Terminals (1, 9) and honors are generally safer. Middle tiles (3-7) are more dangerous.`;
      }

      if (q.includes('riichi')) {
        const canRiichi = shanten === 0 && !hand.melds.some(m => m.open);
        if (canRiichi) return 'You CAN declare Riichi! It gives +10 bonus points, but locks your hand — you can\'t change tiles. Worth it in most cases!';
        if (shanten > 0) return `You need to reach tenpai (0-shanten) with a closed hand first. You're currently ${shanten}-shanten.`;
        return 'Riichi requires a closed hand (no open melds) at tenpai. It adds 10 points and signals strength.';
      }

      if (q.includes('help') || q.includes('what') || q.includes('how')) {
        return `You're at ${shanten}-shanten. Your hand has ${hand.concealed.length} concealed tiles and ${meldCount} melds. ${shanten <= 1 ? 'You\'re close to winning!' : 'Look for pairs and connected tiles.'} Ask me about: "best discard", "can I win?", "scoring", "defense", or "riichi".`;
      }

      return `Your hand is ${shanten}-shanten. ${shanten === 0 ? 'You\'re tenpai — one tile away!' : `Need ${shanten} more useful tiles.`} Try asking: "What should I discard?", "How can I score more?", or "Should I fold?"`;
    }

    getChatHistory() { return [...this.chatHistory]; }
    clearHistory() { this.chatHistory = []; }
  }

  root.MJ.LLMTutor = Object.freeze({ LLMTutor });
  if (typeof console !== 'undefined') console.log('[Mahjong] LLMTutor module loaded');
})(typeof window !== 'undefined' ? window : global);
