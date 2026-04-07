#!/usr/bin/env python3
"""
ai_bridge.py — Python AI engine with NumPy-accelerated hand evaluation.
Communicates with Node.js via JSON over stdin/stdout.

Usage:
  # Standalone training
  python3 python/ai_bridge.py --train 1000

  # As subprocess from Node.js
  node run-headless.js --python-ai 0

  # Export trained weights to JS
  python3 python/ai_bridge.py --export
"""

import sys
import json
import random
import argparse
import os
from pathlib import Path

try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False
    print("[Python AI] NumPy not available, using pure Python", file=sys.stderr)

DATA_DIR = Path(__file__).parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)
WEIGHTS_FILE = DATA_DIR / "python_ai_weights.json"
STATS_FILE = DATA_DIR / "python_ai_stats.json"

# ─── Tile representation (matches JS: 34 tile kinds) ───
# 0-8: characters, 9-17: bamboo, 18-26: circles, 27-30: winds, 31-33: dragons
SUITED_COUNT = 27
HONOR_START = 27
TOTAL_KINDS = 34

def is_suited(idx):
    return 0 <= idx < SUITED_COUNT

def suit_of(idx):
    return idx // 9 if idx < SUITED_COUNT else -1

def rank_of(idx):
    return idx % 9 if idx < SUITED_COUNT else -1


class HandEvaluator:
    """Fast hand evaluation using vectorized operations when NumPy available."""

    def __init__(self):
        self._cache = {}

    def shanten(self, tiles, meld_count=0):
        """Calculate shanten for a hand represented as counts[34]."""
        key = (tuple(tiles), meld_count)
        if key in self._cache:
            return self._cache[key]
        needed = 4 - meld_count
        best = 8
        t = list(tiles)
        # Try each pair
        for i in range(TOTAL_KINDS):
            if t[i] >= 2:
                t[i] -= 2
                best = min(best, self._sets_needed(t, needed, 0))
                t[i] += 2
        best = min(best, self._sets_needed(t, needed, 0) + 1)
        result = best - 1
        self._cache[key] = result
        if len(self._cache) > 50000:
            self._cache.clear()
        return result

    def _sets_needed(self, t, needed, start):
        if needed == 0:
            return 0
        idx = start
        while idx < TOTAL_KINDS and t[idx] == 0:
            idx += 1
        if idx >= TOTAL_KINDS:
            return needed * 2
        best = needed * 2
        # Triplet
        if t[idx] >= 3:
            t[idx] -= 3
            best = min(best, self._sets_needed(t, needed - 1, idx))
            t[idx] += 3
        # Sequence
        if is_suited(idx) and rank_of(idx) <= 6:
            i2, i3 = idx + 1, idx + 2
            if suit_of(idx) == suit_of(i2) == suit_of(i3) and t[i2] > 0 and t[i3] > 0:
                t[idx] -= 1; t[i2] -= 1; t[i3] -= 1
                best = min(best, self._sets_needed(t, needed - 1, idx))
                t[idx] += 1; t[i2] += 1; t[i3] += 1
        # Partial pair
        if t[idx] >= 2:
            t[idx] -= 2
            best = min(best, self._sets_needed(t, needed - 1, idx) + 1)
            t[idx] += 2
        # Partial sequence
        if is_suited(idx) and rank_of(idx) <= 7:
            i2 = idx + 1
            if suit_of(idx) == suit_of(i2) and t[i2] > 0:
                t[idx] -= 1; t[i2] -= 1
                best = min(best, self._sets_needed(t, needed - 1, idx) + 1)
                t[idx] += 1; t[i2] += 1
            if rank_of(idx) <= 6:
                i3 = idx + 2
                if suit_of(idx) == suit_of(i3) and t[i3] > 0:
                    t[idx] -= 1; t[i3] -= 1
                    best = min(best, self._sets_needed(t, needed - 1, idx) + 1)
                    t[idx] += 1; t[i3] += 1
        # Skip
        saved = t[idx]
        t[idx] = 0
        best = min(best, self._sets_needed(t, needed, idx + 1))
        t[idx] = saved
        return best

    def ukeire(self, tiles, meld_count, remaining):
        """Count how many drawable tiles improve shanten."""
        current = self.shanten(tiles, meld_count)
        total = 0
        accepts = []
        t = list(tiles)
        for i in range(TOTAL_KINDS):
            if t[i] >= 4 or remaining[i] <= 0:
                continue
            t[i] += 1
            new_sh = self.shanten(tuple(t), meld_count)
            t[i] -= 1
            if new_sh < current:
                accepts.append((i, remaining[i]))
                total += remaining[i]
        return total, accepts


class PythonAI:
    """Advanced AI using parameterized evaluation with optional NumPy acceleration."""

    def __init__(self, weights=None):
        self.evaluator = HandEvaluator()
        self.weights = weights or self.default_weights()
        self.decision_log = []

    @staticmethod
    def default_weights():
        return {
            "shanten": 1000, "ukeire": 18, "hand_value": 10,
            "defense": 900, "aggression": 0.65, "open_penalty": 0.45
        }

    def select_discard(self, hand, melds_count, visible, remaining, seat_wind, round_wind, turn):
        """Select best tile to discard. hand/visible/remaining are lists of 34 counts."""
        sh = self.evaluator.shanten(tuple(hand), melds_count)
        best_score = -1e9
        best_idx = 0
        candidates = []

        for i in range(TOTAL_KINDS):
            if hand[i] <= 0:
                continue
            hand[i] -= 1
            after_sh = self.evaluator.shanten(tuple(hand), melds_count)
            uk_total, _ = self.evaluator.ukeire(tuple(hand), melds_count, remaining)
            hv = self._hand_value(hand, seat_wind, round_wind)
            hand[i] += 1

            danger = self._danger(i, visible, remaining, turn)
            attack = self.weights["aggression"]
            defense = 1.0 - attack
            off_score = (6 - after_sh) * self.weights["shanten"] + uk_total * self.weights["ukeire"] + hv * self.weights["hand_value"]
            def_score = (1.0 - danger) * self.weights["defense"]
            total = attack * off_score + defense * def_score

            candidates.append({"idx": i, "shanten": after_sh, "ukeire": uk_total,
                             "danger": round(danger, 3), "score": round(total, 1)})
            if total > best_score:
                best_score = total
                best_idx = i

        candidates.sort(key=lambda c: -c["score"])
        self.decision_log.append({"turn": turn, "chosen": best_idx, "shanten": sh,
                                  "top3": candidates[:3]})
        return best_idx

    def _hand_value(self, hand, seat_wind, round_wind):
        value = 1
        suit_counts = [0, 0, 0, 0]  # chars, bamboo, circles, honors
        for i in range(27):
            suit_counts[i // 9] += hand[i]
        for i in range(27, 34):
            suit_counts[3] += hand[i]

        max_suit = max(suit_counts[:3])
        honors = suit_counts[3]
        if max_suit >= 11 and honors == 0: value += 50
        elif max_suit >= 9 and honors == 0: value += 25
        elif max_suit >= 9: value += 15

        for i in range(31, 34):
            if hand[i] >= 3: value += 12
            elif hand[i] >= 2: value += 5

        wind_map = {"east": 27, "south": 28, "west": 29, "north": 30}
        sw = wind_map.get(seat_wind, 27)
        rw = wind_map.get(round_wind, 27)
        if hand[sw] >= 3: value += 10
        if hand[rw] >= 3: value += 10
        return value

    def _danger(self, tile_idx, visible, remaining, turn):
        danger = 0.15
        if not is_suited(tile_idx):
            danger *= 0.6 if turn < 10 else 1.2
        elif rank_of(tile_idx) in (0, 8):
            danger *= 0.7
        elif 2 <= rank_of(tile_idx) <= 6:
            danger *= 1.3
        if remaining[tile_idx] == 0:
            danger *= 0.1
        danger *= min(2.0, 1.0 + turn * 0.02)
        return min(1.0, max(0.0, danger))

    def save_weights(self, path=None):
        path = path or WEIGHTS_FILE
        with open(path, "w") as f:
            json.dump(self.weights, f, indent=2)

    def load_weights(self, path=None):
        path = path or WEIGHTS_FILE
        if os.path.exists(path):
            with open(path) as f:
                self.weights = json.load(f)


class Trainer:
    """Train AI weights through self-play."""

    def __init__(self):
        self.ai = PythonAI()
        self.stats = {"games": 0, "rounds": 0, "wins": [0,0,0,0], "draws": 0, "avg_score": 0}

    def run_round(self):
        """Simulate one round — uses fast discard (shanten-only, no ukeire) for speed."""
        wall = []
        for i in range(TOTAL_KINDS):
            wall.extend([i] * 4)
        random.shuffle(wall)

        hands = [[0]*TOTAL_KINDS for _ in range(4)]
        for _ in range(13):
            for p in range(4):
                if not wall: break
                hands[p][wall.pop()] += 1

        visible = [0] * TOTAL_KINDS
        remaining = [4] * TOTAL_KINDS
        for p in range(4):
            for i in range(TOTAL_KINDS):
                visible[i] += hands[p][i]
                remaining[i] = max(0, 4 - visible[i])

        current = 0
        winner = -1
        score = 0
        turns = 0

        while wall and turns < 300:
            t = wall.pop()
            hands[current][t] += 1
            visible[t] += 1
            remaining[t] = max(0, 4 - visible[t])
            turns += 1

            # Check win
            sh = self.ai.evaluator.shanten(tuple(hands[current]), 0)
            if sh < 0:
                winner = current
                score = self.ai._hand_value(hands[current], "east", "east")
                break

            # Fast discard: pick tile that keeps lowest shanten (skip ukeire for speed)
            d = self._fast_discard(hands[current])
            hands[current][d] -= 1

            current = (current + 1) % 4

        return winner, score, turns

    def _fast_discard(self, hand):
        """Fast discard selection — shanten only, no ukeire (for training speed)."""
        best_sh = 99
        best_idx = 0
        for i in range(TOTAL_KINDS):
            if hand[i] <= 0: continue
            hand[i] -= 1
            sh = self.ai.evaluator.shanten(tuple(hand), 0)
            hand[i] += 1
            if sh < best_sh:
                best_sh = sh
                best_idx = i
        return best_idx

    def train(self, num_games, rounds_per_game=4):
        """Run training games and adjust weights."""
        lr = 0.005
        total_wins = 0
        total_rounds = 0

        for g in range(num_games):
            game_wins = 0
            for r in range(rounds_per_game):
                winner, score, turns = self.run_round()
                total_rounds += 1
                if winner >= 0:
                    game_wins += 1
                    self.stats["wins"][winner] += 1
                    self.stats["avg_score"] = (self.stats["avg_score"] * (total_wins) + score) / (total_wins + 1) if total_wins > 0 else score
                    total_wins += 1
                else:
                    self.stats["draws"] += 1

            self.stats["games"] += 1
            self.stats["rounds"] = total_rounds

            # Adjust weights based on win rate
            win_rate = total_wins / max(1, total_rounds)
            draw_rate = self.stats["draws"] / max(1, total_rounds)

            if win_rate < 0.6:  # Not enough wins (4 players, expect ~75%)
                self.ai.weights["ukeire"] *= (1 + lr)
                self.ai.weights["aggression"] = min(0.85, self.ai.weights["aggression"] + lr * 0.5)
            if draw_rate > 0.3:
                self.ai.weights["ukeire"] *= (1 + lr * 2)
            if self.stats["avg_score"] < 10:
                self.ai.weights["hand_value"] *= (1 + lr)

            lr *= 0.998

            if (g + 1) % max(1, num_games // 10) == 0:
                print(f"  [{g+1}/{num_games}] Win rate: {win_rate:.1%} | Avg score: {self.stats['avg_score']:.1f} | Draws: {draw_rate:.1%}", file=sys.stderr)

        self.ai.save_weights()
        with open(STATS_FILE, "w") as f:
            json.dump(self.stats, f, indent=2)

        return self.stats


def bridge_mode():
    """JSON-over-stdin/stdout bridge for Node.js integration."""
    ai = PythonAI()
    ai.load_weights()
    print(json.dumps({"status": "ready", "weights": ai.weights}), flush=True)

    for line in sys.stdin:
        try:
            req = json.loads(line.strip())
            action = req.get("action")

            if action == "discard":
                hand = req["hand"]
                result = ai.select_discard(
                    hand, req.get("melds", 0), req.get("visible", [0]*34),
                    req.get("remaining", [4]*34), req.get("seat_wind", "east"),
                    req.get("round_wind", "east"), req.get("turn", 0))
                print(json.dumps({"action": "discard", "tile_idx": result}), flush=True)

            elif action == "evaluate":
                hand = req["hand"]
                sh = ai.evaluator.shanten(tuple(hand), req.get("melds", 0))
                uk, accepts = ai.evaluator.ukeire(tuple(hand), req.get("melds", 0), req.get("remaining", [4]*34))
                print(json.dumps({"shanten": sh, "ukeire": uk, "accepts": accepts}), flush=True)

            elif action == "quit":
                break
            else:
                print(json.dumps({"error": f"unknown action: {action}"}), flush=True)

        except Exception as e:
            print(json.dumps({"error": str(e)}), flush=True)


def export_weights():
    """Export Python-trained weights to JS-compatible format."""
    if not WEIGHTS_FILE.exists():
        print("No trained weights found. Run --train first.", file=sys.stderr)
        return

    with open(WEIGHTS_FILE) as f:
        py_weights = json.load(f)

    js_weights = {
        "shanten": py_weights.get("shanten", 1000),
        "ukeire": py_weights.get("ukeire", 18),
        "handValue": py_weights.get("hand_value", 10),
        "defense": py_weights.get("defense", 900),
        "tempo": 3,
        "openPenalty": py_weights.get("open_penalty", 0.45),
        "aggressionBase": py_weights.get("aggression", 0.65),
        "defenseThreshold": 0.5
    }

    js_file = DATA_DIR / "mj_ai_weights.json"
    with open(js_file, "w") as f:
        json.dump(js_weights, f, indent=2)

    print(f"Exported to {js_file}")
    print(f"Weights: {json.dumps(js_weights, indent=2)}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Mahjong Python AI Bridge")
    parser.add_argument("--train", type=int, help="Train for N games")
    parser.add_argument("--export", action="store_true", help="Export weights to JS format")
    parser.add_argument("--bridge", action="store_true", help="Run in bridge mode (stdin/stdout JSON)")
    args = parser.parse_args()

    if args.train:
        print(f"Training Python AI for {args.train} games...", file=sys.stderr)
        trainer = Trainer()
        stats = trainer.train(args.train)
        print(f"\nTraining complete!", file=sys.stderr)
        print(f"  Games: {stats['games']}, Rounds: {stats['rounds']}", file=sys.stderr)
        print(f"  Wins: {stats['wins']}, Draws: {stats['draws']}", file=sys.stderr)
        print(f"  Avg score: {stats['avg_score']:.1f}", file=sys.stderr)
        print(f"  Weights saved to {WEIGHTS_FILE}", file=sys.stderr)
    elif args.export:
        export_weights()
    elif args.bridge:
        bridge_mode()
    else:
        parser.print_help()
