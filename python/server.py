#!/usr/bin/env python3
"""
WebSocket game server for multiplayer Mahjong.
Manages rooms, turns, AI fill-in, and the full draw/discard/claim cycle.
Run: python3 python/server.py
"""

import asyncio
import json
import random
import string
import time
import sys

try:
    import websockets
except ImportError:
    print("ERROR: 'websockets' package not found. Install with: pip install websockets")
    sys.exit(1)

# ---------------------------------------------------------------------------
# Tile helpers
# ---------------------------------------------------------------------------

SUITED = ("bamboo", "circles", "characters")
ALL_TILES = []
for suit in SUITED:
    for rank in range(1, 10):
        ALL_TILES.extend([{"suit": suit, "rank": rank}] * 4)
for rank in range(1, 5):  # winds
    ALL_TILES.extend([{"suit": "wind", "rank": rank}] * 4)
for rank in range(1, 4):  # dragons
    ALL_TILES.extend([{"suit": "dragon", "rank": rank}] * 4)


def tile_eq(a, b):
    return a["suit"] == b["suit"] and a["rank"] == b["rank"]


def tile_key(t):
    return f'{t["suit"]}-{t["rank"]}'


def build_wall():
    wall = list(ALL_TILES)
    random.shuffle(wall)
    return wall


def dora_from_indicator(indicator):
    s, r = indicator["suit"], indicator["rank"]
    if s in SUITED:
        return {"suit": s, "rank": (r % 9) + 1}
    if s == "wind":
        return {"suit": s, "rank": (r % 4) + 1}
    if s == "dragon":
        return {"suit": s, "rank": (r % 3) + 1}
    return None


# ---------------------------------------------------------------------------
# Room / game state
# ---------------------------------------------------------------------------

ACTION_TIMEOUT = 15  # seconds

rooms: dict[str, "Room"] = {}


def gen_room_id():
    while True:
        rid = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
        if rid not in rooms:
            return rid


class Player:
    def __init__(self, ws, name, seat):
        self.ws = ws          # None for AI
        self.name = name
        self.seat = seat
        self.hand = []
        self.discards = []
        self.melds = []
        self.ready = False
        self.is_ai = ws is None
        self.score = 0

    def to_info(self):
        return {"name": self.name, "seat": self.seat, "ready": self.ready}


class Room:
    def __init__(self, room_id):
        self.id = room_id
        self.players: list[Player | None] = [None, None, None, None]
        self.game_running = False
        self.wall = []
        self.dora_indicator = None
        self.current_turn = 0          # seat index
        self.last_discard = None        # {"tile": ..., "seat": ...}
        self.last_discard_seat = -1
        self.pending_claims = {}        # seat -> claim action or None
        self.turn_task: asyncio.Task | None = None
        self.round_wind = "east"

    # -- helpers -------------------------------------------------------------

    def human_count(self):
        return sum(1 for p in self.players if p and not p.is_ai)

    def player_list(self):
        return [p.to_info() if p else None for p in self.players]

    def occupied_players(self):
        return [p.to_info() for p in self.players if p]

    def next_seat(self, seat):
        return (seat + 1) % 4

    async def broadcast(self, msg, exclude_seat=None):
        data = json.dumps(msg)
        for p in self.players:
            if p and p.ws and p.seat != exclude_seat:
                try:
                    await p.ws.send(data)
                except Exception:
                    pass

    async def send_to(self, seat, msg):
        p = self.players[seat]
        if p and p.ws:
            try:
                await p.ws.send(json.dumps(msg))
            except Exception:
                pass

    def find_seat(self):
        for i in range(4):
            if self.players[i] is None:
                return i
        return -1

    def wall_remaining(self):
        return len(self.wall)

    # -- state snapshot for clients ------------------------------------------

    def state_update(self):
        return {
            "type": "state_update",
            "discards": [p.discards if p else [] for p in self.players],
            "melds": [p.melds if p else [] for p in self.players],
            "wallRemaining": self.wall_remaining(),
            "scores": [p.score if p else 0 for p in self.players],
        }

    # -- game flow -----------------------------------------------------------

    def fill_ai(self):
        """Fill empty seats with AI bots."""
        for i in range(4):
            if self.players[i] is None:
                self.players[i] = Player(None, f"Bot-{i+1}", i)
                self.players[i].is_ai = True
                self.players[i].ready = True

    async def start_game(self):
        self.fill_ai()
        self.game_running = True
        self.wall = build_wall()
        self.dora_indicator = self.wall.pop()
        for p in self.players:
            p.hand = []
            p.discards = []
            p.melds = []
        # Deal 13 tiles each
        for _ in range(13):
            for p in self.players:
                if self.wall:
                    p.hand.append(self.wall.pop())
        # Notify each player of their hand
        for p in self.players:
            await self.send_to(p.seat, {
                "type": "game_start",
                "yourHand": list(p.hand),
                "doraIndicator": self.dora_indicator,
            })
        await self.broadcast(self.state_update())
        # East (seat 0) draws first
        self.current_turn = 0
        await self.do_turn()

    async def do_turn(self):
        """Execute one turn: player draws, then must discard."""
        if not self.game_running:
            return
        seat = self.current_turn
        player = self.players[seat]
        if not player:
            return

        # Draw
        if not self.wall:
            await self.end_round(winner=None)
            return

        drawn = self.wall.pop()
        player.hand.append(drawn)

        # Check for self-drawn win
        if self._is_winning_hand(player.hand, player.melds):
            await self.end_round(winner=seat, self_drawn=True)
            return

        await self.send_to(seat, {
            "type": "your_turn",
            "action": "draw",
            "drawnTile": drawn,
        })
        await self.broadcast(self.state_update())

        if player.is_ai:
            await asyncio.sleep(0.3)
            tile = self._ai_select_discard(player)
            await self.do_discard(seat, tile)
        else:
            # Ask human for discard
            await self.send_to(seat, {
                "type": "action_required",
                "actions": ["discard"],
                "timeout": ACTION_TIMEOUT * 1000,
            })
            self.turn_task = asyncio.get_event_loop().create_task(
                self._wait_for_action(seat)
            )

    async def _wait_for_action(self, seat):
        """Wait up to ACTION_TIMEOUT seconds for a human action, else auto-pass."""
        try:
            await asyncio.sleep(ACTION_TIMEOUT)
            # Timeout: auto-discard last drawn tile
            player = self.players[seat]
            if player and player.hand and self.game_running:
                tile = player.hand[-1]
                await self.do_discard(seat, tile)
        except asyncio.CancelledError:
            pass

    async def handle_action(self, seat, action):
        """Process an action message from a player."""
        if not self.game_running:
            await self.send_to(seat, {"type": "error", "message": "No game in progress"})
            return

        atype = action.get("type")
        if atype == "discard":
            if seat != self.current_turn:
                await self.send_to(seat, {"type": "error", "message": "Not your turn"})
                return
            tile = action.get("tile")
            if not tile or "suit" not in tile or "rank" not in tile:
                await self.send_to(seat, {"type": "error", "message": "Invalid tile"})
                return
            # Validate tile is in hand
            if not self._remove_from_hand(self.players[seat], tile):
                await self.send_to(seat, {"type": "error", "message": "Tile not in hand"})
                return
            # Cancel timeout task
            if self.turn_task and not self.turn_task.done():
                self.turn_task.cancel()
            # Re-add tile to hand so do_discard can remove it
            self.players[seat].hand.append(tile)
            await self.do_discard(seat, tile)

        elif atype == "claim":
            claim_type = action.get("claimType")
            if claim_type not in ("pong", "chow", "kong", "win"):
                await self.send_to(seat, {"type": "error", "message": "Invalid claim type"})
                return
            self.pending_claims[seat] = action

        elif atype == "pass":
            self.pending_claims[seat] = {"type": "pass"}

        else:
            await self.send_to(seat, {"type": "error", "message": f"Unknown action type: {atype}"})

    async def do_discard(self, seat, tile):
        """Process a discard and check for claims."""
        player = self.players[seat]
        if not self._remove_from_hand(player, tile):
            return
        player.discards.append(tile)
        self.last_discard = tile
        self.last_discard_seat = seat

        await self.broadcast({
            "type": "player_action",
            "seat": seat,
            "action": {"type": "discard", "tile": tile},
        })
        await self.broadcast(self.state_update())

        # Check for claims from other players
        claim = await self._resolve_claims(seat, tile)
        if claim:
            return  # claim handler advances the game

        # No claims: next player's turn
        self.current_turn = self.next_seat(seat)
        await self.do_turn()

    async def _resolve_claims(self, discard_seat, tile):
        """Give all other players a chance to claim. AI auto-decides. Returns True if a claim was made."""
        self.pending_claims = {}

        # Determine which players can claim
        claimants = []
        for i in range(4):
            if i == discard_seat:
                continue
            p = self.players[i]
            if not p:
                continue
            possible = self._get_possible_claims(p, tile, discard_seat)
            if not possible:
                self.pending_claims[i] = {"type": "pass"}
                continue
            if p.is_ai:
                # AI: claim pong/kong/win if possible, otherwise pass
                if "win" in possible:
                    self.pending_claims[i] = {"type": "claim", "claimType": "win"}
                elif "pong" in possible:
                    self.pending_claims[i] = {"type": "claim", "claimType": "pong"}
                elif "kong" in possible:
                    self.pending_claims[i] = {"type": "claim", "claimType": "kong"}
                else:
                    self.pending_claims[i] = {"type": "pass"}
            else:
                claimants.append(i)
                await self.send_to(i, {
                    "type": "action_required",
                    "actions": possible,
                    "timeout": ACTION_TIMEOUT * 1000,
                    "discardedTile": tile,
                    "discardedBy": discard_seat,
                })

        # Wait for human claimants
        if claimants:
            deadline = time.time() + ACTION_TIMEOUT
            while time.time() < deadline:
                if all(i in self.pending_claims for i in claimants):
                    break
                await asyncio.sleep(0.1)
            # Auto-pass anyone who didn't respond
            for i in claimants:
                if i not in self.pending_claims:
                    self.pending_claims[i] = {"type": "pass"}

        # Priority: win > pong/kong > chow
        winner_seat = None
        pong_seat = None
        chow_seat = None
        for i in range(4):
            if i == discard_seat:
                continue
            c = self.pending_claims.get(i)
            if not c or c.get("type") == "pass":
                continue
            ct = c.get("claimType")
            if ct == "win" and winner_seat is None:
                winner_seat = i
            elif ct in ("pong", "kong") and pong_seat is None:
                pong_seat = i
            elif ct == "chow" and chow_seat is None:
                chow_seat = i

        if winner_seat is not None:
            await self.end_round(winner=winner_seat, self_drawn=False)
            return True

        claim_seat = pong_seat if pong_seat is not None else chow_seat
        if claim_seat is not None:
            c = self.pending_claims[claim_seat]
            ct = c["claimType"]
            p = self.players[claim_seat]
            # Remove the discard from the discarding player's discards
            for idx, d in enumerate(self.players[discard_seat].discards):
                if tile_eq(d, tile):
                    self.players[discard_seat].discards.pop(idx)
                    break

            # Form the meld
            meld_tiles = [tile]
            if ct in ("pong", "kong"):
                needed = 2 if ct == "pong" else 3
                removed = 0
                for h in list(p.hand):
                    if tile_eq(h, tile) and removed < needed:
                        p.hand.remove(h)
                        meld_tiles.append(h)
                        removed += 1
            elif ct == "chow":
                # For simplicity, just find two tiles that form a sequence with the claimed tile
                chow_tiles = self._find_chow_tiles(p, tile)
                if chow_tiles:
                    for ct_tile in chow_tiles:
                        p.hand.remove(ct_tile)
                        meld_tiles.append(ct_tile)

            p.melds.append({"type": ct, "tiles": meld_tiles, "open": True})

            await self.broadcast({
                "type": "player_action",
                "seat": claim_seat,
                "action": {"type": "claim", "claimType": ct, "tile": tile},
            })
            await self.broadcast(self.state_update())

            # After claiming, the claiming player must discard (no draw)
            self.current_turn = claim_seat
            if p.is_ai:
                await asyncio.sleep(0.3)
                discard_tile = self._ai_select_discard(p)
                await self.do_discard(claim_seat, discard_tile)
            else:
                await self.send_to(claim_seat, {
                    "type": "action_required",
                    "actions": ["discard"],
                    "timeout": ACTION_TIMEOUT * 1000,
                })
                self.turn_task = asyncio.get_event_loop().create_task(
                    self._wait_for_action(claim_seat)
                )
            return True

        return False

    async def end_round(self, winner=None, self_drawn=False):
        """End the current round and announce results."""
        self.game_running = False
        if self.turn_task and not self.turn_task.done():
            self.turn_task.cancel()

        score = 0
        breakdown = []
        if winner is not None:
            # Simple scoring: base 10 points
            score = 10
            breakdown.append({"name": "Basic Win", "points": 10})
            if self_drawn:
                score += 5
                breakdown.append({"name": "Self-Drawn", "points": 5})
            p = self.players[winner]
            if p:
                p.score += score

        result = {
            "type": "round_over",
            "winner": winner,
            "score": score,
            "breakdown": breakdown,
        }
        await self.broadcast(result)

        # Reset readiness
        for p in self.players:
            if p:
                p.ready = False

    # -- validation helpers --------------------------------------------------

    def _remove_from_hand(self, player, tile):
        for i, h in enumerate(player.hand):
            if tile_eq(h, tile):
                player.hand.pop(i)
                return True
        return False

    def _count_in_hand(self, player, tile):
        return sum(1 for h in player.hand if tile_eq(h, tile))

    def _get_possible_claims(self, player, tile, discard_seat):
        claims = []
        # Win check
        test_hand = list(player.hand) + [tile]
        if self._is_winning_hand(test_hand, player.melds):
            claims.append("win")
        # Pong
        if self._count_in_hand(player, tile) >= 2:
            claims.append("pong")
        # Kong
        if self._count_in_hand(player, tile) >= 3:
            claims.append("kong")
        # Chow: only from the player to the left (next seat after discarder)
        if player.seat == self.next_seat(discard_seat):
            if tile["suit"] in SUITED and self._find_chow_tiles(player, tile):
                claims.append("chow")
        return claims

    def _find_chow_tiles(self, player, tile):
        if tile["suit"] not in SUITED:
            return None
        s, r = tile["suit"], tile["rank"]
        patterns = [(r - 2, r - 1), (r - 1, r + 1), (r + 1, r + 2)]
        for r1, r2 in patterns:
            if r1 < 1 or r2 > 9:
                continue
            t1 = t2 = None
            for h in player.hand:
                if h["suit"] == s and h["rank"] == r1 and t1 is None:
                    t1 = h
                elif h["suit"] == s and h["rank"] == r2 and t2 is None:
                    t2 = h
            if t1 and t2:
                return [t1, t2]
        return None

    def _is_winning_hand(self, tiles, melds):
        """Simple win check: 4 sets + 1 pair in the concealed portion."""
        needed_sets = 4 - len(melds)
        sorted_tiles = sorted(tiles, key=lambda t: (t["suit"], t["rank"]))
        return self._can_decompose(sorted_tiles, needed_sets)

    def _can_decompose(self, tiles, needed_sets):
        if len(tiles) == 0:
            return needed_sets == 0
        if len(tiles) == 2 and needed_sets == 0:
            return tile_eq(tiles[0], tiles[1])
        # Try pair
        for i in range(len(tiles) - 1):
            if tile_eq(tiles[i], tiles[i + 1]):
                if i > 0 and tile_eq(tiles[i], tiles[i - 1]):
                    continue
                rest = tiles[:i] + tiles[i + 2:]
                if self._can_form_sets(rest, needed_sets):
                    return True
        return False

    def _can_form_sets(self, tiles, n):
        if len(tiles) == 0:
            return n == 0
        if n <= 0:
            return False
        first = tiles[0]
        # Pong
        if (len(tiles) >= 3 and tile_eq(tiles[0], tiles[1]) and
                tile_eq(tiles[1], tiles[2])):
            if self._can_form_sets(tiles[3:], n - 1):
                return True
        # Chow
        if first["suit"] in SUITED:
            s, r = first["suit"], first["rank"]
            i2 = next((j for j, t in enumerate(tiles)
                        if t["suit"] == s and t["rank"] == r + 1), -1)
            i3 = next((j for j, t in enumerate(tiles)
                        if t["suit"] == s and t["rank"] == r + 2), -1)
            if i2 >= 0 and i3 >= 0:
                rest = list(tiles)
                for idx in sorted([0, i2, i3], reverse=True):
                    rest.pop(idx)
                if self._can_form_sets(rest, n - 1):
                    return True
        return False

    def _ai_select_discard(self, player):
        """AI: discard a random tile from hand."""
        if not player.hand:
            return None
        return random.choice(player.hand)

    # -- disconnect handling -------------------------------------------------

    async def handle_disconnect(self, seat):
        """Replace disconnected human with AI bot."""
        p = self.players[seat]
        if not p:
            return
        name = p.name
        # Replace with bot keeping the same hand/state
        bot = Player(None, f"Bot-{name}", seat)
        bot.is_ai = True
        bot.hand = p.hand
        bot.discards = p.discards
        bot.melds = p.melds
        bot.score = p.score
        bot.ready = True
        self.players[seat] = bot

        await self.broadcast({"type": "player_left", "seat": seat})

        # If it was this player's turn, auto-discard for the bot
        if self.game_running and self.current_turn == seat:
            if self.turn_task and not self.turn_task.done():
                self.turn_task.cancel()
            if bot.hand:
                tile = self._ai_select_discard(bot)
                await self.do_discard(seat, tile)

        # If no humans left, clean up room
        if self.human_count() == 0:
            self.game_running = False
            if self.id in rooms:
                del rooms[self.id]


# ---------------------------------------------------------------------------
# WebSocket handler
# ---------------------------------------------------------------------------

ws_to_room: dict = {}   # ws -> (room_id, seat)


async def handler(ws):
    room_id = None
    seat = -1
    try:
        async for raw in ws:
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await ws.send(json.dumps({"type": "error", "message": "Invalid JSON"}))
                continue

            mtype = msg.get("type")

            if mtype == "create_room":
                name = msg.get("name", "Player")
                rid = gen_room_id()
                room = Room(rid)
                rooms[rid] = room
                seat = 0
                room.players[0] = Player(ws, name, 0)
                room_id = rid
                ws_to_room[ws] = (rid, seat)
                await ws.send(json.dumps({"type": "room_created", "roomId": rid}))
                await ws.send(json.dumps({
                    "type": "room_joined",
                    "roomId": rid,
                    "seat": seat,
                    "players": room.occupied_players(),
                }))

            elif mtype == "join_room":
                rid = msg.get("roomId", "").upper()
                name = msg.get("name", "Player")
                if rid not in rooms:
                    await ws.send(json.dumps({"type": "error", "message": "Room not found"}))
                    continue
                room = rooms[rid]
                if room.game_running:
                    await ws.send(json.dumps({"type": "error", "message": "Game already in progress"}))
                    continue
                s = room.find_seat()
                if s < 0:
                    await ws.send(json.dumps({"type": "error", "message": "Room is full"}))
                    continue
                room.players[s] = Player(ws, name, s)
                room_id = rid
                seat = s
                ws_to_room[ws] = (rid, seat)
                await ws.send(json.dumps({
                    "type": "room_joined",
                    "roomId": rid,
                    "seat": s,
                    "players": room.occupied_players(),
                }))
                await room.broadcast(
                    {"type": "player_joined", "name": name, "seat": s},
                    exclude_seat=s,
                )

            elif mtype == "ready":
                if room_id and room_id in rooms:
                    room = rooms[room_id]
                    p = room.players[seat]
                    if p:
                        p.ready = not p.ready
                        # Auto-start when all humans are ready
                        if not room.game_running:
                            humans = [p for p in room.players if p and not p.is_ai]
                            if humans and all(h.ready for h in humans):
                                await room.start_game()

            elif mtype == "action":
                if room_id and room_id in rooms:
                    room = rooms[room_id]
                    action = msg.get("action", {})
                    await room.handle_action(seat, action)

            elif mtype == "chat":
                if room_id and room_id in rooms:
                    room = rooms[room_id]
                    text = msg.get("text", "")
                    p = room.players[seat]
                    from_name = p.name if p else "Unknown"
                    await room.broadcast({"type": "chat", "from": from_name, "text": text})

            else:
                await ws.send(json.dumps({"type": "error", "message": f"Unknown message type: {mtype}"}))

    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        # Cleanup on disconnect
        if ws in ws_to_room:
            rid, s = ws_to_room.pop(ws)
            if rid in rooms:
                await rooms[rid].handle_disconnect(s)


async def main():
    port = 9090
    print(f"Mahjong WebSocket server starting on ws://0.0.0.0:{port}")
    async with websockets.serve(handler, "0.0.0.0", port):
        await asyncio.Future()  # run forever


if __name__ == "__main__":
    asyncio.run(main())
