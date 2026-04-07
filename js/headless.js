/**
 * headless.js — Headless game runner for Node.js and automated play
 * Supports flowers, riichi, deal-in tracking, tedashi detection.
 * See interfaces.js for API documentation
 */
(function (exports) {
  'use strict';
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  const C = () => root.MJ.Constants;
  const Tile = () => root.MJ.Tile;
  const Wall = () => root.MJ.Wall;
  const Hand = () => root.MJ.Hand;
  const Player = () => root.MJ.Player;
  const Scoring = () => root.MJ.Scoring;
  const AIE = () => root.MJ.AIEngine;

  class HeadlessGame {
    constructor(options = {}) {
      this.verbose = options.verbose !== undefined ? options.verbose : false;
      this.playerTypes = options.playerTypes || ['ai', 'ai', 'ai', 'ai'];
      this.includeFlowers = options.includeFlowers !== undefined ? options.includeFlowers : true;
      this.riichiEnabled = options.riichiEnabled !== undefined ? options.riichiEnabled : true;
      this.engines = [];
      this.stats = null;
      this.learning = null;
      this.claudeCallback = options.claudeCallback || null;
      this.log = [];
      this.roundCount = 0;
      this.maxRounds = options.maxRounds || 4;
    }

    init(stats, learning) {
      this.stats = stats;
      this.learning = learning;
      for (let i = 0; i < 4; i++) {
        const weights = learning ? learning.getWeights() : undefined;
        this.engines.push(new (AIE().AIEngine)(weights));
      }
    }

    addLog(msg) {
      this.log.push(msg);
      if (this.verbose) {
        if (typeof process !== 'undefined') process.stdout.write(msg + '\n');
        else console.log(msg);
      }
    }

    runRound(roundNum) {
      const state = this.createState(roundNum);
      if (this.stats) this.stats.startRound();

      // Deal 13 tiles, handling flowers
      for (let r = 0; r < 13; r++) {
        for (let i = 0; i < 4; i++) {
          let t = Wall().draw(state.wall);
          if (!t) continue;
          // Replace flowers immediately during deal
          while (t && Tile().isFlower(t)) {
            state.players[i].flowerTiles.push(t);
            t = Wall().draw(state.wall);
          }
          if (t) Hand().addTile(state.players[i].hand, t);
        }
      }

      this.addLog(`\n── Round ${roundNum} (${state.roundWind} wind) ──`);
      const flowerCounts = state.players.map(p => p.flowerTiles.length);
      if (flowerCounts.some(c => c > 0)) {
        this.addLog(`Flowers: ${flowerCounts.map((c, i) => `${this.seatLabel(i)}=${c}`).join(' ')}`);
      }
      this.addLog(`Wall: ${Wall().remaining(state.wall)} tiles`);

      state.currentPlayerIndex = state.dealerIndex;
      let winner = null;
      let winResult = null;
      let turnCount = 0;
      let dealInPlayer = -1; // who dealt in

      while (!Wall().isEmpty(state.wall) && turnCount < 300) {
        const player = state.players[state.currentPlayerIndex];
        const pIdx = state.currentPlayerIndex;

        // Draw
        let drawn = Wall().draw(state.wall);
        if (!drawn) break;

        // Handle flower tiles during play
        while (drawn && Tile().isFlower(drawn)) {
          player.flowerTiles.push(drawn);
          this.addLog(`  ${this.seatLabel(pIdx)} draws flower: ${Tile().getName(drawn)}`);
          drawn = Wall().drawFromEnd(state.wall); // replacement draw
        }
        if (!drawn) break;

        Hand().addTile(player.hand, drawn);
        player.lastDrawnTile = drawn;
        turnCount++;

        // Check self-draw win
        if (Hand().isWinningHand(player.hand)) {
          winResult = this.scoreWin(player, state, null, true);
          winner = player;
          this.addLog(`  → ${this.seatLabel(pIdx)} WINS by self-draw! (${winResult.total} pts)`);
          break;
        }

        // Smart kong check
        const kongIdx = this.engines[pIdx].shouldDeclareKong(
          player.hand, player.hand.melds.length, player.seatWind, state.roundWind);
        if (kongIdx >= 0) {
          this.executeConcealedKongByIdx(player, kongIdx, state);
          const repl = Wall().drawFromEnd(state.wall);
          if (repl && !Tile().isFlower(repl)) {
            Hand().addTile(player.hand, repl);
            if (Hand().isWinningHand(player.hand)) {
              winResult = this.scoreWin(player, state, null, true);
              winner = player;
              this.addLog(`  → ${this.seatLabel(pIdx)} WINS after kong! (${winResult.total} pts)`);
              break;
            }
          } else if (repl && Tile().isFlower(repl)) {
            player.flowerTiles.push(repl);
          }
        }

        // Riichi check
        if (this.riichiEnabled && !player.riichi &&
            this.engines[pIdx].shouldDeclareRiichi(player.hand, turnCount)) {
          player.riichi = true;
          player.riichiTurn = turnCount;
          this.addLog(`  ${this.seatLabel(pIdx)} declares RIICHI!`);
        }

        // Discard
        const discard = this.chooseDiscard(pIdx, player, state);
        if (!discard) break;

        // Track tedashi: was this tile from hand or tsumogiri?
        const isTsumogiri = player.lastDrawnTile &&
          Tile().getId(discard) === Tile().getId(player.lastDrawnTile);
        player.tedashi.push(!isTsumogiri);

        Hand().removeTile(player.hand, discard);
        Player().addDiscard(player, discard);
        state.lastDiscard = discard;
        state.lastDiscardPlayer = pIdx;

        if (this.verbose && turnCount <= 5) {
          this.addLog(`  ${this.seatLabel(pIdx)} discards ${Tile().getName(discard)}${isTsumogiri ? ' (tsumogiri)' : ''}`);
        }

        // === Claims: win > kong > pong > chow ===
        let claimed = false;

        // Win claims
        for (let i = 1; i <= 3; i++) {
          const cIdx = (pIdx + i) % 4;
          const claimer = state.players[cIdx];
          if (Hand().isWinningHand(claimer.hand, discard)) {
            Hand().addTile(claimer.hand, discard);
            winResult = this.scoreWin(claimer, state, discard, false);
            winner = claimer;
            dealInPlayer = pIdx;
            player.discards.pop();
            this.addLog(`  → ${this.seatLabel(cIdx)} WINS by claim from ${this.seatLabel(pIdx)}! (${winResult.total} pts)`);
            claimed = true;
            break;
          }
        }
        if (winner) break;

        // Pong/Kong
        if (!claimed) {
          for (let i = 1; i <= 3; i++) {
            const cIdx = (pIdx + i) % 4;
            const claimer = state.players[cIdx];

            if (Hand().findKongs(claimer.hand, discard).length > 0 &&
                this.shouldClaimKong(cIdx, discard, state)) {
              player.discards.pop();
              this.executeOpenKong(claimer, discard, state);
              let repl = Wall().drawFromEnd(state.wall);
              while (repl && Tile().isFlower(repl)) {
                claimer.flowerTiles.push(repl);
                repl = Wall().drawFromEnd(state.wall);
              }
              if (repl) Hand().addTile(claimer.hand, repl);
              state.currentPlayerIndex = cIdx;
              claimed = true;
              if (this.stats) this.stats.recordMeldClaim(cIdx, 'kong');
              break;
            }

            if (Hand().findPongs(claimer.hand, discard).length > 0 &&
                this.shouldClaimPong(cIdx, discard, state)) {
              player.discards.pop();
              this.executeOpenPong(claimer, discard, state);
              state.currentPlayerIndex = cIdx;
              claimed = true;
              if (this.stats) this.stats.recordMeldClaim(cIdx, 'pong');
              const d2 = this.chooseDiscard(cIdx, claimer, state);
              if (d2) {
                claimer.tedashi.push(true);
                Hand().removeTile(claimer.hand, d2);
                Player().addDiscard(claimer, d2);
              }
              break;
            }
          }
        }

        // Chow (next player only)
        if (!claimed) {
          const nextIdx = (pIdx + 1) % 4;
          const nextP = state.players[nextIdx];
          if (Hand().findChows(nextP.hand, discard).length > 0 &&
              this.shouldClaimChow(nextIdx, discard, state)) {
            player.discards.pop();
            this.executeOpenChow(nextP, discard, state);
            state.currentPlayerIndex = nextIdx;
            claimed = true;
            if (this.stats) this.stats.recordMeldClaim(nextIdx, 'chow');
            const d2 = this.chooseDiscard(nextIdx, nextP, state);
            if (d2) {
              nextP.tedashi.push(true);
              Hand().removeTile(nextP.hand, d2);
              Player().addDiscard(nextP, d2);
            }
          }
        }

        if (!claimed) {
          state.currentPlayerIndex = (state.currentPlayerIndex + 1) % 4;
        }
        state.turnCount = turnCount;
      }

      // Record results
      const result = {
        round: roundNum, turns: turnCount,
        winner: winner ? winner.seatIndex : -1,
        score: winResult ? winResult.total : 0,
        breakdown: winResult ? winResult.breakdown : [],
        draw: !winner,
        wallRemaining: Wall().remaining(state.wall),
        dealInBy: dealInPlayer,
        flowers: state.players.map(p => p.flowerTiles.length)
      };

      if (this.stats) {
        state.winner = winner;
        state.winResult = winResult;
        state.turnCount = turnCount;
        this.stats.recordRoundEnd(state);
      }

      if (this.learning) {
        for (let i = 0; i < 4; i++) {
          this.learning.recordRoundResult({
            playerIdx: i,
            won: winner && i === winner.seatIndex,
            dealtIn: i === dealInPlayer,
            score: (winner && i === winner.seatIndex) ? result.score : 0,
            finalShanten: 0,
            turnsPlayed: turnCount,
            meldsClaimed: state.players[i].hand.melds.length
          });
        }
      }
      return result;
    }

    runGame() {
      this.log = [];
      const results = [];
      this.addLog('╔══════════════════════════════════╗');
      this.addLog('║      HEADLESS MAHJONG GAME       ║');
      this.addLog('╚══════════════════════════════════╝');
      for (let r = 1; r <= this.maxRounds; r++) results.push(this.runRound(r));
      if (this.learning) {
        const update = this.learning.updateWeights();
        if (update) {
          this.addLog(`\n[Learning] Epoch ${update.epoch}: Win ${(update.winRate*100).toFixed(0)}% | Loss ${(update.lossRate*100).toFixed(0)}%`);
        }
      }
      return { results, log: this.log };
    }

    runTournament(numGames) {
      this.addLog(`\n═══ TOURNAMENT: ${numGames} games ═══\n`);
      const allResults = [];
      for (let g = 1; g <= numGames; g++) {
        this.maxRounds = 4;
        const game = this.runGame();
        allResults.push(game.results);
        if (g % Math.max(1, Math.floor(numGames / 10)) === 0) {
          this.addLog(`  Completed ${g}/${numGames} games`);
        }
      }
      return allResults;
    }

    // === Decision Helpers ===
    chooseDiscard(pIdx, player, state) {
      if (this.playerTypes[pIdx] === 'claude' && this.claudeCallback)
        return this.claudeCallback('discard', player, state);
      return this.engines[pIdx].selectDiscard(player, state);
    }
    shouldClaimPong(pIdx, tile, state) {
      if (this.playerTypes[pIdx] === 'claude' && this.claudeCallback)
        return this.claudeCallback('claim_pong', state.players[pIdx], state, tile);
      return this.engines[pIdx].shouldClaimMeld(state.players[pIdx], tile, 'pong', state);
    }
    shouldClaimChow(pIdx, tile, state) {
      if (this.playerTypes[pIdx] === 'claude' && this.claudeCallback)
        return this.claudeCallback('claim_chow', state.players[pIdx], state, tile);
      return this.engines[pIdx].shouldClaimMeld(state.players[pIdx], tile, 'chow', state);
    }
    shouldClaimKong(pIdx, tile, state) {
      return this.engines[pIdx].shouldClaimMeld(state.players[pIdx], tile, 'kong', state);
    }

    // === Meld execution ===
    executeConcealedKongByIdx(player, tileIdx, state) {
      const tiles = [];
      const toRemove = player.hand.concealed.filter(t => AIE().tileToIndex(t) === tileIdx);
      for (let i = 0; i < 4 && i < toRemove.length; i++) {
        Hand().removeTile(player.hand, toRemove[i]);
        tiles.push(toRemove[i]);
      }
      if (tiles.length === 4) {
        Hand().addMeld(player.hand, {
          type: C().MELD_TYPES.CONCEALED_KONG, tiles, open: false
        });
      }
    }
    executeOpenKong(player, tile, state) {
      const matches = player.hand.concealed.filter(t => Tile().getId(t) === Tile().getId(tile));
      for (const m of matches) Hand().removeTile(player.hand, m);
      Hand().addMeld(player.hand, {
        type: C().MELD_TYPES.KONG, tiles: [...matches, tile], open: true
      });
    }
    executeOpenPong(player, tile, state) {
      const matches = player.hand.concealed.filter(t => Tile().getId(t) === Tile().getId(tile));
      Hand().removeTile(player.hand, matches[0]);
      Hand().removeTile(player.hand, matches[1]);
      Hand().addMeld(player.hand, {
        type: C().MELD_TYPES.PONG, tiles: [matches[0], matches[1], tile], open: true
      });
    }
    executeOpenChow(player, tile, state) {
      const chows = Hand().findChows(player.hand, tile);
      if (chows.length === 0) return;
      const chow = chows[0];
      for (const t of chow) {
        if (Tile().getId(t) !== Tile().getId(tile)) Hand().removeTile(player.hand, t);
      }
      Hand().addMeld(player.hand, {
        type: C().MELD_TYPES.CHOW, tiles: Tile().sortTiles(chow), open: true
      });
    }

    scoreWin(player, state, tile, selfDrawn) {
      const decomps = Hand().getWinningDecompositions(player.hand);
      const ctx = {
        seatWind: player.seatWind,
        roundWind: state.roundWind,
        selfDrawn,
        lastTile: tile,
        concealed: player.hand.melds.every(m => !m.open),
        riichi: player.riichi,
        flowerCount: player.flowerTiles.length,
        isDealer: player.isDealer
      };
      let best = { total: 1, breakdown: [{ name: 'Chicken Hand', points: 1 }] };
      for (const d of decomps) {
        const score = Scoring().calculateScore(d, ctx);
        if (score.total > best.total) best = score;
      }
      return best;
    }

    createState(roundNum) {
      const players = [];
      for (let i = 0; i < 4; i++) {
        players.push(Player().create(i, this.playerTypes[i] === 'human'));
      }
      return {
        players,
        wall: Wall().create({ includeFlowers: this.includeFlowers }),
        roundWind: roundNum <= 4 ? 'east' : 'south',
        roundNumber: roundNum,
        dealerIndex: (roundNum - 1) % 4,
        turnCount: 0,
        currentPlayerIndex: 0,
        lastDiscard: null,
        lastDiscardPlayer: null
      };
    }

    seatLabel(idx) {
      const labels = ['E', 'S', 'W', 'N'];
      return `${labels[idx]}(${this.playerTypes[idx]})`;
    }
  }

  root.MJ.Headless = Object.freeze({ HeadlessGame });
  if (typeof console !== 'undefined') console.log('[Mahjong] Headless module loaded');
})(typeof window !== 'undefined' ? window : global);
