/**
 * stats.js — Game statistics, monitoring, and analytics
 * See interfaces.js for API documentation
 */
(function (exports) {
  'use strict';
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  class GameStats {
    constructor() { this.reset(); }

    reset() {
      this.gamesPlayed = 0;
      this.roundsPlayed = 0;
      this.playerStats = [
        this.newPlayerStats(0),
        this.newPlayerStats(1),
        this.newPlayerStats(2),
        this.newPlayerStats(3)
      ];
      this.roundLog = [];
      this.sessionStart = Date.now();
      this.lastRoundDuration = 0;
      this.avgRoundDuration = 0;
      this.totalTurns = 0;
    }

    newPlayerStats(idx) {
      return {
        seatIndex: idx,
        wins: 0,
        losses: 0,
        draws: 0,
        totalScore: 0,
        highestScore: 0,
        selfDrawWins: 0,
        claimWins: 0,
        pongsClamed: 0,
        chowsClaimed: 0,
        kongsDeclared: 0,
        dealtIn: 0,
        avgShanten: 0,
        shantenSamples: 0,
        avgTurnsToWin: 0,
        winTurnSamples: 0,
        scoringPatterns: {}
      };
    }

    recordRoundEnd(state) {
      this.roundsPlayed++;
      const roundStart = this.lastRoundStart || Date.now();
      this.lastRoundDuration = Date.now() - roundStart;
      this.avgRoundDuration = (this.avgRoundDuration * (this.roundsPlayed - 1) +
        this.lastRoundDuration) / this.roundsPlayed;
      this.totalTurns += state.turnCount || 0;

      const entry = {
        round: this.roundsPlayed,
        turns: state.turnCount || 0,
        wallRemaining: state.wall ? root.MJ.Wall.remaining(state.wall) : 0,
        winner: state.winner ? state.winner.seatIndex : -1,
        score: state.winResult ? state.winResult.total : 0,
        duration: this.lastRoundDuration,
        timestamp: Date.now()
      };

      if (state.winner) {
        const wIdx = state.winner.seatIndex;
        const ps = this.playerStats[wIdx];
        ps.wins++;
        ps.totalScore += state.winResult ? state.winResult.total : 0;
        ps.highestScore = Math.max(ps.highestScore, state.winResult ? state.winResult.total : 0);

        if (state.winResult) {
          for (const b of state.winResult.breakdown) {
            ps.scoringPatterns[b.name] = (ps.scoringPatterns[b.name] || 0) + 1;
          }
        }

        // Track win method
        entry.selfDrawn = !state.lastDiscard;
        if (entry.selfDrawn) ps.selfDrawWins++;
        else ps.claimWins++;

        ps.avgTurnsToWin = (ps.avgTurnsToWin * ps.winTurnSamples + (state.turnCount || 0))
          / (ps.winTurnSamples + 1);
        ps.winTurnSamples++;

        // Track deal-in: if won by claim, the discarder dealt in
        if (!entry.selfDrawn && state.lastDiscardPlayer !== undefined &&
            state.lastDiscardPlayer !== null) {
          const dealerIdx = state.lastDiscardPlayer;
          entry.dealtInBy = dealerIdx;
          this.playerStats[dealerIdx].dealtIn++;
        }

        // Mark other players
        for (let i = 0; i < 4; i++) {
          if (i !== wIdx) {
            this.playerStats[i].losses++;
          }
        }
      } else {
        // Draw
        for (let i = 0; i < 4; i++) {
          this.playerStats[i].draws++;
        }
        entry.draw = true;
      }

      this.roundLog.push(entry);
      return entry;
    }

    recordMeldClaim(playerIdx, type) {
      const ps = this.playerStats[playerIdx];
      if (type === 'pong') ps.pongsClamed++;
      else if (type === 'chow') ps.chowsClaimed++;
      else if (type === 'kong' || type === 'concealed_kong') ps.kongsDeclared++;
    }

    recordShanten(playerIdx, shanten) {
      const ps = this.playerStats[playerIdx];
      ps.avgShanten = (ps.avgShanten * ps.shantenSamples + shanten)
        / (ps.shantenSamples + 1);
      ps.shantenSamples++;
    }

    startRound() {
      this.lastRoundStart = Date.now();
    }

    getSummary() {
      const duration = Date.now() - this.sessionStart;
      const drawCount = this.roundLog.filter(r => r.draw).length;

      return {
        session: {
          duration: formatDuration(duration),
          gamesPlayed: this.gamesPlayed,
          roundsPlayed: this.roundsPlayed,
          totalTurns: this.totalTurns,
          avgTurnsPerRound: this.roundsPlayed > 0
            ? (this.totalTurns / this.roundsPlayed).toFixed(1) : 0,
          drawRate: this.roundsPlayed > 0
            ? ((drawCount / this.roundsPlayed) * 100).toFixed(1) + '%' : '0%',
          avgRoundDuration: formatDuration(this.avgRoundDuration)
        },
        players: this.playerStats.map((ps, i) => ({
          seat: i,
          label: i === 0 ? 'Human/Claude' : `AI-${i}`,
          wins: ps.wins,
          losses: ps.losses,
          draws: ps.draws,
          winRate: (ps.wins + ps.losses + ps.draws) > 0
            ? ((ps.wins / (ps.wins + ps.losses + ps.draws)) * 100).toFixed(1) + '%' : '0%',
          totalScore: ps.totalScore,
          highestScore: ps.highestScore,
          avgScorePerWin: ps.wins > 0 ? (ps.totalScore / ps.wins).toFixed(1) : 0,
          selfDrawRate: ps.wins > 0
            ? ((ps.selfDrawWins / ps.wins) * 100).toFixed(1) + '%' : '0%',
          avgShanten: ps.avgShanten.toFixed(2),
          avgTurnsToWin: ps.avgTurnsToWin.toFixed(1),
          dealtIn: ps.dealtIn,
          dealInRate: (ps.wins + ps.losses + ps.draws) > 0
            ? ((ps.dealtIn / (ps.wins + ps.losses + ps.draws)) * 100).toFixed(1) + '%' : '0%',
          meldsClaimed: ps.pongsClamed + ps.chowsClaimed + ps.kongsDeclared,
          topPatterns: Object.entries(ps.scoringPatterns)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => `${name} (${count})`)
        })),
        recentRounds: this.roundLog.slice(-20)
      };
    }

    getCSV() {
      const headers = 'round,turns,winner,score,draw,selfDrawn,wallRemaining,duration_ms\n';
      const rows = this.roundLog.map(r =>
        `${r.round},${r.turns},${r.winner},${r.score},${r.draw || false},${r.selfDrawn || false},${r.wallRemaining},${r.duration}`
      ).join('\n');
      return headers + rows;
    }

    formatReport() {
      const s = this.getSummary();
      const lines = [];
      lines.push('╔══════════════════════════════════════════╗');
      lines.push('║        MAHJONG GAME STATISTICS           ║');
      lines.push('╚══════════════════════════════════════════╝');
      lines.push('');
      lines.push(`Session: ${s.session.duration} | ${s.session.roundsPlayed} rounds | ${s.session.totalTurns} total turns`);
      lines.push(`Avg turns/round: ${s.session.avgTurnsPerRound} | Draw rate: ${s.session.drawRate}`);
      lines.push('');
      lines.push('┌────────┬──────┬──────┬───────┬────────┬──────────┬────────┐');
      lines.push('│ Player │ Wins │ Loss │ WinR% │ TotScr │ AvgScore │ DealIn │');
      lines.push('├────────┼──────┼──────┼───────┼────────┼──────────┼────────┤');
      for (const p of s.players) {
        lines.push(`│ ${pad(p.label, 6)} │ ${pad(p.wins, 4)} │ ${pad(p.losses, 4)} │ ${pad(p.winRate, 5)} │ ${pad(p.totalScore, 6)} │ ${pad(p.avgScorePerWin, 8)} │ ${pad(p.dealInRate, 6)} │`);
      }
      lines.push('└────────┴──────┴──────┴───────┴────────┴──────────┴────────┘');

      for (const p of s.players) {
        if (p.topPatterns.length > 0) {
          lines.push(`\n${p.label} top patterns: ${p.topPatterns.join(', ')}`);
        }
      }

      return lines.join('\n');
    }
  }

  function pad(val, width) {
    const s = String(val);
    return s.length >= width ? s : ' '.repeat(width - s.length) + s;
  }

  function formatDuration(ms) {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const min = Math.floor(ms / 60000);
    const sec = Math.round((ms % 60000) / 1000);
    return `${min}m ${sec}s`;
  }

  root.MJ.Stats = Object.freeze({ GameStats });

  if (typeof console !== 'undefined') console.log('[Mahjong] Stats module loaded');
})(typeof window !== 'undefined' ? window : global);
