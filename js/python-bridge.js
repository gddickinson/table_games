/**
 * python-bridge.js — Node.js bridge to Python AI engine
 * Spawns Python subprocess and communicates via JSON over stdio.
 * Falls back to JS engine if Python unavailable.
 */
(function (exports) {
  'use strict';
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  // Only works in Node.js
  const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
  if (!isNode) {
    root.MJ.PythonBridge = Object.freeze({
      PythonBridge: class { constructor() { this.available = false; } },
      isAvailable: () => false
    });
    return;
  }

  const { spawn } = require('child_process');
  const path = require('path');
  const AIE = () => root.MJ.AIEngine;

  class PythonBridge {
    constructor() {
      this.process = null;
      this.available = false;
      this.ready = false;
      this.pendingRequests = [];
      this.responseBuffer = '';
      this.weights = null;
    }

    async start() {
      const scriptPath = path.join(__dirname, '..', 'python', 'ai_bridge.py');
      try {
        this.process = spawn('python3', [scriptPath, '--bridge'], {
          stdio: ['pipe', 'pipe', 'pipe']
        });

        this.process.stdout.on('data', (data) => {
          this.responseBuffer += data.toString();
          const lines = this.responseBuffer.split('\n');
          this.responseBuffer = lines.pop(); // keep incomplete line
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const response = JSON.parse(line);
              if (response.status === 'ready') {
                this.ready = true;
                this.available = true;
                this.weights = response.weights;
                console.log('[PythonBridge] Connected! Weights:', JSON.stringify(this.weights));
              }
              // Resolve pending request
              if (this.pendingRequests.length > 0) {
                const resolve = this.pendingRequests.shift();
                resolve(response);
              }
            } catch (e) {
              // non-JSON output, ignore
            }
          }
        });

        this.process.stderr.on('data', (data) => {
          // Python stderr — training output etc
          process.stderr.write('[Python] ' + data.toString());
        });

        this.process.on('close', (code) => {
          this.ready = false;
          this.available = false;
          console.log(`[PythonBridge] Process exited with code ${code}`);
        });

        this.process.on('error', (err) => {
          this.available = false;
          console.log(`[PythonBridge] Failed to start: ${err.message}`);
        });

        // Wait for ready signal
        await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            if (!this.ready) {
              console.log('[PythonBridge] Timeout waiting for Python, using JS engine');
              this.available = false;
            }
            resolve();
          }, 5000);

          const check = setInterval(() => {
            if (this.ready) {
              clearInterval(check);
              clearTimeout(timeout);
              resolve();
            }
          }, 100);
        });

      } catch (e) {
        this.available = false;
        console.log(`[PythonBridge] Python not available: ${e.message}`);
      }
    }

    async request(data) {
      if (!this.available || !this.process) return null;
      return new Promise((resolve) => {
        this.pendingRequests.push(resolve);
        this.process.stdin.write(JSON.stringify(data) + '\n');
        // Timeout after 2 seconds
        setTimeout(() => {
          if (this.pendingRequests.includes(resolve)) {
            this.pendingRequests.splice(this.pendingRequests.indexOf(resolve), 1);
            resolve(null);
          }
        }, 2000);
      });
    }

    /** Use Python AI to select discard */
    async selectDiscard(player, state) {
      const compact = AIE().handToCompact(player.hand);
      const tracker = new (AIE().TileTracker)();
      tracker.buildFromState(state, player.seatIndex);

      const response = await this.request({
        action: 'discard',
        hand: Array.from(compact),
        melds: player.hand.melds.length,
        visible: Array.from(tracker.visible),
        remaining: Array.from(tracker.remaining),
        seat_wind: player.seatWind,
        round_wind: state.roundWind,
        turn: state.turnCount || 0
      });

      if (response && response.tile_idx !== undefined) {
        // Convert index back to tile object
        const def = AIE().indexToTileDef(response.tile_idx);
        return player.hand.concealed.find(t => t.suit === def.suit && t.rank === def.rank) || null;
      }
      return null; // fallback to JS
    }

    /** Evaluate hand via Python */
    async evaluate(hand, melds) {
      const compact = AIE().handToCompact(hand);
      const response = await this.request({
        action: 'evaluate',
        hand: Array.from(compact),
        melds: melds || 0,
        remaining: new Array(34).fill(4)
      });
      return response;
    }

    stop() {
      if (this.process) {
        try { this.process.stdin.write(JSON.stringify({ action: 'quit' }) + '\n'); }
        catch (e) {}
        setTimeout(() => { if (this.process) this.process.kill(); }, 1000);
      }
    }
  }

  /**
   * Train Python AI and export weights for JS
   */
  async function trainPythonAI(numGames) {
    const scriptPath = path.join(__dirname, '..', 'python', 'ai_bridge.py');
    return new Promise((resolve) => {
      console.log(`[PythonBridge] Training ${numGames} games...`);
      const proc = spawn('python3', [scriptPath, '--train', String(numGames)]);
      proc.stderr.on('data', (d) => process.stderr.write(d));
      proc.on('close', () => {
        // Export weights
        const exportProc = spawn('python3', [scriptPath, '--export']);
        exportProc.stdout.on('data', (d) => process.stdout.write(d));
        exportProc.on('close', () => resolve());
      });
    });
  }

  root.MJ.PythonBridge = Object.freeze({
    PythonBridge, trainPythonAI, isAvailable: () => isNode
  });

  if (typeof console !== 'undefined') console.log('[Mahjong] PythonBridge module loaded');
})(typeof window !== 'undefined' ? window : global);
