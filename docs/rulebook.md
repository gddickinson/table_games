# Mahjong Rulebook

A comprehensive reference covering the rules of Mahjong, with emphasis on Riichi (Japanese) Mahjong and notes on regional variants.

---

## Table of Contents

1. [Overview](#overview)
2. [Setup](#setup)
3. [Tile Reference](#tile-reference)
4. [Game Flow](#game-flow)
5. [Melds](#melds)
6. [Claiming Discards](#claiming-discards)
7. [Winning](#winning)
8. [Riichi](#riichi)
9. [Furiten](#furiten)
10. [Kong Rules](#kong-rules)
11. [Dora](#dora)
12. [Flowers](#flowers)
13. [Dead Wall](#dead-wall)
14. [Scoring Reference](#scoring-reference)
15. [Round and Game Structure](#round-and-game-structure)
16. [Special Situations](#special-situations)
17. [Rule Variants](#rule-variants)

---

## Overview

Mahjong is a tile-based game for four players. Each player attempts to assemble a complete hand of 14 tiles — typically composed of four melds (sets of three or four tiles) and one pair. Players take turns drawing and discarding tiles, with opportunities to claim opponents' discards to complete melds. The first player to complete a valid, scoring hand wins the round.

A full game consists of multiple rounds, with scores accumulating over the course of the game. The player with the highest score at the end of the final round wins.

---

## Setup

### Players and Seating

Mahjong is played by exactly four players. Before the game begins, seats are assigned. The traditional method uses the four wind tiles:

1. Shuffle one of each wind tile (East, South, West, North) face-down.
2. Each player draws one tile.
3. The player who draws East chooses their seat first.
4. The remaining players sit in counter-clockwise order: South to East's right, West across from East, North to East's left.

> **Note:** In Mahjong, turn order proceeds **counter-clockwise** — the opposite of most Western card games.

### The Dice Roll

The starting dealer (East) rolls two dice. The sum determines where the wall will be broken to begin dealing.

1. Count counter-clockwise from the dealer, starting with the dealer as 1.
2. The player at the counted position breaks their wall segment.
3. From that player's wall, count from the right end by the dice sum to find the break point.

### Wall Building

1. All 136 tiles (or 144 with flowers) are shuffled face-down on the table.
2. Each player builds a wall of tiles in front of them: **17 stacks of 2 tiles** (34 tiles per player).
3. The four walls are pushed together to form a square — this is the **wall**.

```
        North Wall (17 stacks)
    +---+---+---+---+---+---+---+
    |   |   |   |   |   |   |   | ...
    +---+---+---+---+---+---+---+
W                                   E
e   +---+---+---+---+---+---+---+   a
s   |   |   |   |   |   |   |   |   s
t   +---+---+---+---+---+---+---+   t

        South Wall (17 stacks)
```

### Dealing

Starting from the break point, tiles are dealt counter-clockwise:

1. Each player takes **4 tiles** (2 stacks) at a time.
2. This repeats **3 times**, giving each player 12 tiles.
3. Each player then takes **1 more tile**, for a total of **13 tiles** each.
4. The dealer (East) takes one additional tile, starting with **14 tiles**.

The last 14 tiles (7 stacks) at the tail end of the wall are separated as the **dead wall**.

---

## Tile Reference

A standard Mahjong set contains **136 tiles** (144 with optional flower and season tiles). There are 34 unique tile types, with 4 copies of each.

### Suited Tiles (3 suits x 9 ranks = 27 types)

Suited tiles are numbered 1 through 9 in three suits. The 1 and 9 of each suit are called **terminals**; tiles 2 through 8 are called **simples**.

#### Characters (Manzu / Wan)

| Tile | Notation | Description |
|------|----------|-------------|
| 1m   | `1m`     | One of Characters — shows the kanji for 10,000 |
| 2m   | `2m`     | Two of Characters |
| 3m   | `3m`     | Three of Characters |
| 4m   | `4m`     | Four of Characters |
| 5m   | `5m`     | Five of Characters |
| 6m   | `6m`     | Six of Characters |
| 7m   | `7m`     | Seven of Characters |
| 8m   | `8m`     | Eight of Characters |
| 9m   | `9m`     | Nine of Characters |

#### Circles (Pinzu / Tong)

| Tile | Notation | Description |
|------|----------|-------------|
| 1p   | `1p`     | One of Circles — a single circle |
| 2p   | `2p`     | Two of Circles |
| 3p   | `3p`     | Three of Circles |
| 4p   | `4p`     | Four of Circles |
| 5p   | `5p`     | Five of Circles |
| 6p   | `6p`     | Six of Circles |
| 7p   | `7p`     | Seven of Circles |
| 8p   | `8p`     | Eight of Circles |
| 9p   | `9p`     | Nine of Circles |

#### Bamboo (Souzu / Tiao)

| Tile | Notation | Description |
|------|----------|-------------|
| 1s   | `1s`     | One of Bamboo — often depicted as a bird (sparrow) |
| 2s   | `2s`     | Two of Bamboo |
| 3s   | `3s`     | Three of Bamboo |
| 4s   | `4s`     | Four of Bamboo |
| 5s   | `5s`     | Five of Bamboo |
| 6s   | `6s`     | Six of Bamboo |
| 7s   | `7s`     | Seven of Bamboo |
| 8s   | `8s`     | Eight of Bamboo |
| 9s   | `9s`     | Nine of Bamboo |

### Honor Tiles (7 types)

Honor tiles cannot form sequences (chows). They can only form triplets (pongs) or quads (kongs).

#### Wind Tiles (Kazehai)

| Tile | Notation | Description |
|------|----------|-------------|
| East Wind   | `Ew` | Ton — associated with the dealer position |
| South Wind  | `Sw` | Nan — the second wind in rotation |
| West Wind   | `Ww` | Shaa — the third wind |
| North Wind  | `Nw` | Pei — the fourth wind |

Each wind can be a **seat wind** (matching the player's current position) or a **round wind** (matching the current round). A pong of your seat wind or the round wind scores a bonus.

#### Dragon Tiles (Sangenpai)

| Tile | Notation | Description |
|------|----------|-------------|
| White Dragon | `Wd` | Haku — blank white tile or framed tile |
| Green Dragon | `Gd` | Hatsu — green character meaning "prosperity" |
| Red Dragon   | `Rd` | Chun — red character meaning "center" or "middle" |

A pong or kong of any dragon tile always scores a bonus (yakuhai).

### Flower Tiles (Optional, 8 tiles)

Flowers are used in Chinese, Taiwanese, and some other variants. They are not used in standard Riichi Mahjong.

#### Flowers (Hua)

| Tile | Number | Name |
|------|--------|------|
| Flower 1 | `F1` | Plum Blossom |
| Flower 2 | `F2` | Orchid |
| Flower 3 | `F3` | Chrysanthemum |
| Flower 4 | `F4` | Bamboo |

#### Seasons (Ji)

| Tile | Number | Name |
|------|--------|------|
| Season 1 | `S1` | Spring |
| Season 2 | `S2` | Summer |
| Season 3 | `S3` | Autumn |
| Season 4 | `S4` | Winter |

Each flower and season corresponds to a seat position (1=East, 2=South, 3=West, 4=North). Drawing your matched flower or season earns bonus points.

### Tile Categories Summary

| Category | Count | Types | Can form Chow? | Can form Pong/Kong? |
|----------|-------|-------|-----------------|---------------------|
| Characters | 36 | 9 x 4 | Yes | Yes |
| Circles | 36 | 9 x 4 | Yes | Yes |
| Bamboo | 36 | 9 x 4 | Yes | Yes |
| Winds | 16 | 4 x 4 | No | Yes |
| Dragons | 12 | 3 x 4 | No | Yes |
| Flowers | 4 | 4 x 1 | N/A | N/A |
| Seasons | 4 | 4 x 1 | N/A | N/A |

**Total: 136 tiles** (or 144 with flowers and seasons)

### Special Tile: Red Fives

In many Riichi Mahjong sets, one copy of the 5 in each suit is colored red. Red fives (`0m`, `0p`, `0s`) function identically to normal fives but act as automatic dora, adding bonus scoring value.

---

## Game Flow

### The Draw-Discard-Claim Cycle

Every turn follows this fundamental sequence:

```
DRAW PHASE          DISCARD PHASE         CLAIM PHASE
+-----------+       +------------+       +---------------+
| Player    |  -->  | Player     |  -->  | Other players |
| draws a   |       | discards   |       | may claim the |
| tile from |       | one tile   |       | discard       |
| the wall  |       | face-up    |       |               |
+-----------+       +------------+       +---------------+
      |                                        |
      +-- If self-draw win (tsumo), declare ----+-- If claim win (ron), declare
      |   win immediately                      |   win immediately
      |                                        |
      +-- If concealed kong, may               +-- If pong/kong/chow,
          declare before discard                   claiming player discards next
```

### Turn Order

1. The **dealer (East)** goes first. Since they drew an extra tile during dealing, they begin by discarding.
2. Play proceeds **counter-clockwise**: East, South, West, North.
3. If a player claims a discard, turn order jumps to that player, and play continues counter-clockwise from them.

### Step-by-Step Turn

1. **Draw**: Take the next tile from the live wall (left side of the wall, moving clockwise).
2. **Evaluate**: Check if your hand is now a winning hand.
   - If yes, you may declare **Tsumo** (self-draw win).
   - If you have a concealed kong, you may declare it now.
3. **Discard**: Place one tile from your hand face-up in your discard area (river).
   - Tiles are placed in rows of 6, left to right, forming a visible history.
4. **Opponents React**: After a discard, other players have a brief window to claim.
   - If no one claims, play passes to the next player counter-clockwise.
   - If someone claims, they reveal the relevant tiles and the claimed tile joins their open meld.

### Discard Pool (River)

Each player's discards are arranged in neat rows in front of them, inside the wall square:

```
   Discard 1  Discard 2  Discard 3  Discard 4  Discard 5  Discard 6
   Discard 7  Discard 8  Discard 9  Discard 10 Discard 11 Discard 12
   ...
```

The discard pool is public information. Any player may inspect any other player's discards at any time. Reading discard pools is a critical strategic skill.

> **Tip:** When a tile is claimed via chow, pong, or kong, it is placed sideways in the claiming player's meld area to indicate it was obtained from another player. It is NOT removed from the discard pool visually in some rulesets, but in Riichi Mahjong it is typically indicated with a sideways tile in the meld.

---

## Melds

A meld is a group of tiles that forms a valid combination. There are three types of melds:

### Chow (Chi / Sequence)

A chow is a **sequence of three consecutive tiles in the same suit**.

**Rules:**
- Only suited tiles (Characters, Circles, Bamboo) can form chows.
- The sequence must be exactly three tiles.
- Sequences do not wrap around: `8-9-1` is NOT valid.
- Honor tiles (winds and dragons) cannot form chows.

**Examples of valid chows:**
```
1m-2m-3m    (Characters 1, 2, 3)
4p-5p-6p    (Circles 4, 5, 6)
7s-8s-9s    (Bamboo 7, 8, 9)
```

**Examples of INVALID chows:**
```
8m-9m-1m    (wrapping is not allowed)
1m-2p-3s    (different suits)
Ew-Sw-Ww   (honor tiles cannot form sequences)
```

**Claiming a chow:**
- You may only claim a chow from the player **immediately to your left** (the player whose turn precedes yours).
- You must reveal two tiles from your hand that complete the sequence.
- The claimed tile is placed sideways in your open meld to show its origin.

### Pong (Pon / Triplet)

A pong is a **set of three identical tiles**.

**Rules:**
- Any tile type can form a pong — suited tiles, winds, or dragons.
- All three tiles must be exactly the same.

**Examples:**
```
5m-5m-5m    (three 5 of Characters)
Ew-Ew-Ew   (three East Wind)
Rd-Rd-Rd    (three Red Dragon)
```

**Claiming a pong:**
- You may claim a pong from **any** player's discard, not just the player to your left.
- You must reveal two matching tiles from your hand.
- Pong claims take priority over chow claims.

### Kong (Kan / Quad)

A kong is a **set of four identical tiles**. Because a kong uses four tiles but occupies one meld slot, the player draws a replacement tile from the dead wall.

**Rules:**
- All four tiles must be identical.
- There are three ways to form a kong (see [Kong Rules](#kong-rules)).
- After declaring a kong, the player draws a replacement tile from the dead wall.

**Examples:**
```
3p-3p-3p-3p    (four 3 of Circles)
Nw-Nw-Nw-Nw   (four North Wind)
Gd-Gd-Gd-Gd   (four Green Dragon)
```

### Open vs. Concealed Melds

| Property | Open Meld | Concealed Meld |
|----------|-----------|----------------|
| Formation | Formed by claiming a discard | Formed entirely from self-drawn tiles |
| Visibility | Displayed face-up on the table | Kept hidden in hand (except concealed kong) |
| Hand status | Hand becomes "open" | Hand remains "closed/concealed" |
| Scoring impact | Reduces hand value for many patterns | Enables higher-scoring patterns |

> **Important:** Once you claim any tile to form an open meld (chow, pong, or open kong), your hand is considered **open** for the rest of the round. Many scoring patterns require a closed hand or score higher when the hand is closed.

### Pair (Jantai / Head)

A pair is **two identical tiles**. Every standard winning hand requires exactly one pair in addition to four melds.

```
7s-7s    (pair of 7 Bamboo)
Wd-Wd   (pair of White Dragon)
```

---

## Claiming Discards

### When Can You Claim?

After any player discards a tile, other players have a brief window to claim it. Claims are made by announcing and revealing the relevant tiles.

| Claim Type | Who Can Claim | Tiles Needed in Hand | Priority |
|------------|---------------|----------------------|----------|
| **Ron** (win) | Any player | Tiles completing a winning hand | Highest |
| **Kong** | Any player | Three matching tiles | High |
| **Pong** | Any player | Two matching tiles | Medium |
| **Chow** | Left player only | Two tiles forming a sequence | Lowest |

### Claiming Priority

When multiple players want to claim the same discard, priority resolves as follows:

1. **Win (Ron)** — Always takes priority. If multiple players can win on the same tile, see [Special Situations](#special-situations).
2. **Kong** — Takes priority over pong and chow. (In practice, kong and pong priority are often treated equally since both require three matching tiles.)
3. **Pong** — Takes priority over chow.
4. **Chow** — Lowest priority. Only the player to the discarder's right (next in turn order) may claim a chow.

> **Tip:** If the player to your left discards a tile you need for a chow, but another player calls pong on the same tile, the pong takes priority and you lose the chow opportunity.

### The Left-Player Rule for Chow

Chow claims are restricted to the player whose turn would naturally come next. Since play moves counter-clockwise, this is the player sitting to the **right** of the discarder (or equivalently, the discarder is to the **left** of the claimer).

This restriction exists to prevent turn-skipping abuse. Without it, any player could claim sequences from anyone, disrupting the natural flow of the game.

### Claiming Procedure

1. **Announce** your claim clearly: "Chi" (chow), "Pon" (pong), "Kan" (kong), or "Ron" (win).
2. **Reveal** the tiles from your hand that combine with the discarded tile.
3. **Place** the completed meld face-up to the side of your hand. The claimed tile is turned sideways to indicate which tile came from another player and the direction it came from.
4. **Discard** a tile (unless you declared a win or a kong, in which case you draw a replacement tile first).

### Passing on Claims

If you choose not to claim a discard you are eligible to claim, you **pass**. In Riichi Mahjong, passing on a winning tile (ron) triggers **temporary furiten** — see [Furiten](#furiten).

---

## Winning

### Standard Winning Hand Structure

A standard winning hand consists of **14 tiles** arranged as:

```
4 Melds + 1 Pair = 14 tiles

(3 + 3 + 3 + 3) + 2 = 14
```

Each meld is a chow (sequence of 3), pong (triplet of 3), or kong (quad of 4, but counted as one meld slot with a replacement draw to maintain 14 tiles in hand).

**Example winning hand:**
```
Melds:  [1m 2m 3m]  [5p 5p 5p]  [7s 8s 9s]  [Ew Ew Ew]
Pair:   [3m 3m]
```

### Exception: Seven Pairs (Chiitoitsu)

In Riichi Mahjong, **Seven Pairs** is a special winning pattern:
```
7 distinct pairs = 14 tiles
[1m 1m] [4m 4m] [7p 7p] [2s 2s] [Ew Ew] [Sw Sw] [Rd Rd]
```

All seven pairs must be different tiles. Four of the same tile does NOT count as two pairs.

### Exception: Thirteen Orphans (Kokushi Musou)

Another special pattern requiring one of each terminal and honor, plus one duplicate:
```
1m 9m 1p 9p 1s 9s Ew Sw Ww Nw Wd Gd Rd + one duplicate of any of these
```

### Self-Draw Win (Tsumo)

If you complete your winning hand by drawing a tile from the wall yourself:

- Announce **"Tsumo"** and reveal your hand.
- All three opponents pay you points (split among them).
- The specific split depends on whether you are the dealer.

### Claim Win (Ron)

If you complete your winning hand using another player's discard:

- Announce **"Ron"** and reveal your hand.
- Only the player who discarded the winning tile pays you the full point value.
- You must NOT be in furiten to declare ron.

### Tenpai (Waiting / Ready)

A hand is **tenpai** when it is one tile away from being complete. The tiles that would complete the hand are called **waiting tiles** (machi).

Common wait patterns:

| Wait Type | Pattern | Waiting For | Tiles |
|-----------|---------|-------------|-------|
| **Edge wait** (penchan) | `1m-2m` | `3m` | 1 type (4 tiles max) |
| **Closed wait** (kanchan) | `4p-6p` | `5p` | 1 type (4 tiles max) |
| **Open wait** (ryanmen) | `5s-6s` | `4s` or `7s` | 2 types (8 tiles max) |
| **Pair wait** (shanpon) | `3m-3m` + `8p-8p` | `3m` or `8p` | 2 types (4 tiles max) |
| **Single wait** (tanki) | Just need a pair tile | The pair tile | 1 type (3 tiles max) |

### Winning Requirements in Riichi Mahjong

In Riichi Mahjong, simply completing a hand is not enough. Your hand must have at least **one yaku** (scoring pattern). A hand with no yaku cannot win, even if the tiles form a valid structure.

Common yaku that serve as minimum requirements:
- **Riichi** — declared ready with a closed hand
- **Tanyao** — all simples (no terminals or honors)
- **Yakuhai** — a pong/kong of dragons, seat wind, or round wind
- **Menzen Tsumo** — self-draw win with a fully concealed hand
- **Pinfu** — all sequences, open wait, worthless pair, closed hand

---

## Riichi

Riichi is the signature mechanic of Japanese Mahjong and the source of the variant's name.

### Declaration Requirements

To declare riichi, ALL of the following must be true:

1. **Closed hand**: You have not claimed any tiles (no open melds). Concealed kongs are permitted.
2. **Tenpai**: Your hand is one tile away from completing.
3. **Sufficient points**: You must have at least 1,000 points to pay the riichi deposit.
4. **Tiles remaining**: There must be at least 4 tiles remaining in the live wall (excluding dead wall).

### How to Declare

1. Announce **"Riichi"** on your turn.
2. Place 1,000 points (a stick) in front of you as a deposit.
3. Discard a tile **sideways** in your discard row to mark the declaration.
4. Your hand is now locked — you cannot change it.

### Restrictions After Declaring

- You **must** draw and discard every turn. You cannot change your hand.
- You **cannot** claim chow or pong (but you may still claim a winning tile via ron).
- You **may** declare a concealed kong if you draw the fourth copy of a tile already in a concealed triplet, but ONLY if it does not change your waiting tiles.
- You **must** declare a win if you draw or are offered your winning tile (in some rule sets).

### Scoring Benefits

| Benefit | Description |
|---------|-------------|
| **Riichi** | Worth 1 han (scoring unit) |
| **Ippatsu** | If you win within one full turn cycle after declaring (before your next draw), gain an additional 1 han |
| **Uradora** | When winning with riichi, flip the tiles beneath the dora indicators. Each matching tile in your hand adds 1 han |
| **Riichi deposit** | The winner of the round collects all riichi deposits on the table (1,000 points each) |

### Double Riichi (Daburu Riichi)

If a player is tenpai with their initial dealt hand (before any tiles are claimed by anyone), they may declare **Double Riichi** on their very first discard. This is worth 2 han instead of the normal 1 han.

---

## Furiten

Furiten is a critical rule in Riichi Mahjong that restricts when you can win by claiming a discard (ron).

### What is Furiten?

A player is in **furiten** if any of their winning tiles (the tiles that would complete their hand) exist in their own discard pool. A player in furiten **cannot win by ron** — they can only win by **tsumo** (self-draw).

### Permanent Furiten

You are in permanent furiten if:
- Any tile that would complete your hand is present in your personal discard pool.
- This applies to ALL of your possible winning tiles, even if you are only "aiming" for one of them.

**Example:**
```
Hand: 2m 3m 4m  5p 6p 7p  1s 2s 3s  Rd Rd Rd  4s ___
Waiting for: 4s (to form pair)
```
If you previously discarded a `4s`, you are in furiten and cannot ron, even though the `4s` in your discard pool seems like an obvious discard.

### Temporary Furiten

You enter temporary furiten if:
- Another player discards one of your winning tiles and you **choose not to claim it** (or the claim window passes).
- This furiten lasts **until your next draw phase**. Once you draw your next tile, the temporary furiten is cleared (unless you pass on another winning tile again, or unless you are already in permanent furiten).

**Exception:** If you are in riichi, passing on a winning tile puts you in furiten **for the rest of the round**, because you cannot change your hand to escape it.

### Why Furiten Exists

Furiten serves several important purposes:

1. **Prevents confusion**: Without furiten, a player could discard a tile and then win when someone else discards the same tile, which feels contradictory.
2. **Rewards information tracking**: Players who pay attention to discards gain a defensive advantage.
3. **Enables defense**: Since furiten prevents ron, defenders can use an opponent's discard pool to identify safe tiles.
4. **Balances ron vs. tsumo**: Without furiten, players could selectively ignore certain winning tiles to fish for a more valuable payment, which would be unfair.

---

## Kong Rules

Kong (kan) is the most complex meld type due to its multiple formation methods and the replacement draw mechanic.

### Types of Kong

#### 1. Open Kong (Daiminkan)

- **Formation**: You hold three identical tiles, and another player discards the fourth.
- **Process**: Announce "Kan," reveal your three tiles, claim the discard.
- **Effect**: Hand becomes open. Draw a replacement tile from the dead wall.
- **Priority**: Same as pong for claiming purposes.

#### 2. Concealed Kong (Ankan)

- **Formation**: You draw the fourth copy of a tile when you already hold three in your concealed hand.
- **Process**: Announce "Kan" and place all four tiles face-down (or with the two outer tiles face-down in Riichi Mahjong convention).
- **Effect**: Hand remains **closed**. Draw a replacement tile from the dead wall.
- **Timing**: Declared after drawing but before discarding.
- **Special**: Even though revealed, a concealed kong cannot be "robbed" for a win (except for Thirteen Orphans in some rulesets).

#### 3. Promoted Kong (Shouminkan / Added Kong)

- **Formation**: You already have an open pong (three tiles claimed from a discard), and you draw the fourth copy.
- **Process**: Announce "Kan" and add the fourth tile to your existing open pong.
- **Effect**: Hand remains open (it was already open). Draw a replacement tile from the dead wall.
- **Risk**: When you declare a promoted kong, other players may **rob the kong** — if the added tile completes their hand, they can declare ron. This is called **chankan** (robbing the kong) and is a yaku worth 1 han.

### Replacement Draw

After any kong declaration:

1. Draw one tile from the **dead wall** (from the end closest to the live wall).
2. One tile from the live wall is transferred to the dead wall to maintain its 14-tile count.
3. A new dora indicator is flipped (the kong triggers an additional dora indicator).
4. If the replacement draw completes your hand, this is a **rinshan kaihou** (winning on a replacement tile) — a yaku worth 1 han.

### Kong Timing Summary

| Kong Type | When Declared | Hand Status | Can Be Robbed? | New Dora? |
|-----------|---------------|-------------|-----------------|-----------|
| Open | After opponent's discard | Open | No | Yes |
| Concealed | After self-draw | Closed | Only for Kokushi (some rules) | Yes |
| Promoted | After self-draw with existing open pong | Open | Yes (chankan) | Yes |

### Multiple Kongs

A player may declare multiple kongs in a single round. Each kong triggers a replacement draw and a new dora indicator. The maximum is four kongs across all players (16 tiles out of 136), though this is exceedingly rare.

> **Special rule:** If four kongs are declared by different players, the round is aborted (see [Special Situations](#special-situations)). If one player declares all four kongs, the round continues.

---

## Dora

Dora are bonus tiles that add extra scoring value (han) to a winning hand. They do not count as yaku — you still need at least one yaku to win.

### Dora Indicators

At the start of the round, one tile on the dead wall is flipped face-up. This is the **dora indicator**. The dora indicator does NOT directly score — instead, the tile **next in sequence** after the indicator is the actual dora.

### Reading the Dora

| Indicator | Dora (next tile) | Rule |
|-----------|-------------------|------|
| `1m` | `2m` | Next number in suit |
| `8p` | `9p` | Next number in suit |
| `9s` | `1s` | Wraps around: 9 -> 1 |
| `East` | `South` | Wind order: E -> S -> W -> N -> E |
| `North` | `East` | Wraps: N -> E |
| `White` | `Green` | Dragon order: White -> Green -> Red -> White |
| `Red` | `White` | Wraps: Red -> White |

### Types of Dora

| Type | Description |
|------|-------------|
| **Regular Dora** | Determined by the initial indicator, visible from the start |
| **Kan Dora** | Additional dora revealed after each kong declaration |
| **Ura Dora** | Tiles beneath the dora indicators, revealed only when a riichi-declaring player wins |
| **Red Dora** | Red five tiles (0m, 0p, 0s) — each counts as 1 dora automatically |

### Dora Scoring

Each dora tile in your winning hand adds **1 han** to your score. Dora stack — if you have three copies of the dora tile, that is 3 han.

**Example:**
- Dora indicator is `6p`, so `7p` is the dora.
- Your winning hand contains two `7p` tiles.
- You gain 2 bonus han from dora.

---

## Flowers

Flower tiles are used in Chinese, Taiwanese, and Hong Kong Mahjong variants. They are generally not used in standard Riichi Mahjong.

### Drawing Flowers

When a player draws a flower tile:

1. Immediately reveal the flower tile and place it face-up to the side.
2. Draw a replacement tile from the dead wall (similar to a kong replacement).
3. If the replacement tile is also a flower, repeat the process.

Flowers are never held in the hand and are never discarded.

### Flower Scoring

| Variant | Scoring |
|---------|---------|
| **Chinese Classical** | Each flower = 1 bonus point. Matching your seat = extra bonus. |
| **Hong Kong** | Each flower = 1 fan (han). Complete set of 4 flowers or 4 seasons = bonus. |
| **Taiwanese** | Flowers are central to scoring with elaborate bonus systems. |

### Flower-Seat Correspondence

| Seat | Flower | Season |
|------|--------|--------|
| East (1) | Plum Blossom | Spring |
| South (2) | Orchid | Summer |
| West (3) | Chrysanthemum | Autumn |
| North (4) | Bamboo | Winter |

Drawing your own seat's flower or season earns additional bonus points in variants that use them.

---

## Dead Wall

### Structure

The dead wall consists of **14 tiles** (7 stacks of 2) separated from the end of the live wall. It is not drawn from during normal play.

```
Dead Wall (14 tiles in 7 stacks):

  Stack:   1    2    3    4    5    6    7
  Top:    [D1] [D3] [D5] [D7] [D9] [D11][D13]
  Bottom: [D2] [D4] [D6] [D8] [D10][D12][D14]

  D3 = first dora indicator (flipped face-up at game start)
  D5, D7, D9, D11 = additional dora indicators (flipped after kongs)
  D4, D6, D8, D10, D12 = ura dora (flipped if riichi player wins)
```

### Purpose

1. **Dora indicators**: The top tiles of certain stacks serve as dora indicators.
2. **Replacement draws**: After kong declarations or flower draws, replacement tiles come from the dead wall.
3. **Maintaining uncertainty**: By setting aside 14 tiles, no player can know all the remaining tiles, even at the end of the wall.

### Dead Wall Maintenance

When a tile is drawn from the dead wall (for a kong or flower replacement), one tile from the end of the live wall is transferred to the dead wall to maintain its count of 14.

---

## Scoring Reference

### Han (Yaku) Reference Table

Below is a comprehensive list of scoring patterns (yaku) in Riichi Mahjong.

#### 1-Han Yaku

| Yaku | Japanese | Description | Open Allowed? |
|------|----------|-------------|---------------|
| Riichi | Riichi | Declare tenpai with closed hand, pay 1000-point deposit | No (closed only) |
| Ippatsu | Ippatsu | Win within one turn cycle of riichi declaration | No (riichi required) |
| Menzen Tsumo | Menzen Tsumo | Win by self-draw with a fully concealed hand | No (closed only) |
| Tanyao | Tanyao | Hand contains only simples (2-8), no terminals or honors | Varies by rule |
| Pinfu | Pinfu | All sequences, open wait, non-scoring pair, closed hand | No (closed only) |
| Iipeikou | Iipeikou | Two identical sequences in the same suit | No (closed only) |
| Yakuhai (Seat Wind) | Jikaze | Pong/kong of your seat wind | Yes |
| Yakuhai (Round Wind) | Bakaze | Pong/kong of the round wind | Yes |
| Yakuhai (Dragon) | Sangenpai | Pong/kong of any dragon tile | Yes |
| Haitei | Haitei Raoyue | Win by self-draw on the very last tile of the wall | Yes |
| Houtei | Houtei Raoyui | Win by claiming the very last discard of the round | Yes |
| Rinshan Kaihou | Rinshan Kaihou | Win on a replacement tile after declaring kong | Yes |
| Chankan | Chankan | Win by robbing an opponent's promoted kong | Yes |

#### 2-Han Yaku

| Yaku | Japanese | Description | Open? | Open Value |
|------|----------|-------------|-------|------------|
| Double Riichi | Daburu Riichi | Riichi on your very first turn before any claims | No | N/A |
| Chantaiyao | Chanta | Every meld and the pair contains a terminal or honor | Yes | 1 han |
| Sanshoku Doujun | Sanshoku | Same sequence (e.g., 1-2-3) in all three suits | Yes | 1 han |
| Ittsu | Ittsu | Straight 1-2-3, 4-5-6, 7-8-9 in one suit | Yes | 1 han |
| Toitoi | Toitoihou | All four melds are triplets (pong) or quads (kong) | Yes | 2 han |
| Sanankou | San Ankou | Three concealed triplets | Yes | 2 han |
| Sankantsu | San Kantsu | Three kongs | Yes | 2 han |
| San Shoku Doukou | San Shoku Doukou | Same triplet in all three suits (e.g., 5m-5m-5m, 5p-5p-5p, 5s-5s-5s) | Yes | 2 han |
| Honroutou | Honroutou | Hand contains only terminals and honors | Yes | 2 han |
| Chiitoitsu | Chiitoitsu | Seven distinct pairs | No | N/A |
| Shousangen | Shou Sangen | Two dragon pongs/kongs + pair of the third dragon | Yes | 2 han |

#### 3-Han Yaku

| Yaku | Japanese | Description | Open? | Open Value |
|------|----------|-------------|-------|------------|
| Honitsu | Honitsu | One suit plus honors only | Yes | 2 han |
| Junchan | Junchan | Every meld and pair contains a terminal (no honors) | Yes | 2 han |
| Ryanpeikou | Ryanpeikou | Two sets of identical sequences (like two iipeikou) | No | N/A |

#### 6-Han Yaku

| Yaku | Japanese | Description | Open? | Open Value |
|------|----------|-------------|-------|------------|
| Chinitsu | Chinitsu | Hand consists entirely of one suit (no honors) | Yes | 5 han |

#### Yakuman (Limit Hands)

Yakuman are the highest-scoring hands, worth a flat maximum score regardless of other bonuses.

| Yakuman | Japanese | Description |
|---------|----------|-------------|
| Kokushi Musou | Thirteen Orphans | One of each terminal and honor (13 unique) + one duplicate |
| Suuankou | Four Concealed Triplets | Four concealed pongs/kongs + pair |
| Daisangen | Big Three Dragons | Pong/kong of all three dragons |
| Shousuushii | Little Four Winds | Pong/kong of three winds + pair of the fourth |
| Daisuushii | Big Four Winds | Pong/kong of all four winds |
| Tsuuiisou | All Honors | Hand consists entirely of honor tiles |
| Chinroutou | All Terminals | Hand consists entirely of terminal tiles (1s and 9s) |
| Ryuuiisou | All Green | Hand uses only green tiles: 2s, 3s, 4s, 6s, 8s, Green Dragon |
| Chuuren Poutou | Nine Gates | 1-1-1-2-3-4-5-6-7-8-9-9-9 in one suit + any tile of same suit |
| Suukantsu | Four Kongs | Four kong declarations in one hand |
| Tenhou | Blessing of Heaven | Dealer wins on initial dealt hand (before first draw) |
| Chiihou | Blessing of Earth | Non-dealer wins on first self-draw (before any claims) |

### Minipoints (Fu)

In addition to han, scoring in Riichi Mahjong uses **fu** (minipoints) for fine-grained calculation.

| Source | Fu |
|--------|-----|
| Base fu | 20 (ron) or 22 (tsumo, with adjustment) |
| Closed ron bonus | +10 |
| Open triplet (2-8) | +2 |
| Open triplet (terminal/honor) | +4 |
| Closed triplet (2-8) | +4 |
| Closed triplet (terminal/honor) | +8 |
| Open kong (2-8) | +8 |
| Open kong (terminal/honor) | +16 |
| Closed kong (2-8) | +16 |
| Closed kong (terminal/honor) | +32 |
| Pair of dragons | +2 |
| Pair of seat wind | +2 |
| Pair of round wind | +2 |
| Edge/closed wait | +2 |
| Single tile (tanki) wait | +2 |

Fu is rounded up to the nearest 10.

### Score Calculation

The basic formula (simplified):

```
Basic Points = Fu x 2^(2 + Han)
```

This value is then multiplied based on who pays:
- **Ron**: Discarder pays the full amount.
- **Tsumo (non-dealer)**: Dealer pays 2x base; other two players pay 1x base each.
- **Tsumo (dealer)**: Each of the three opponents pays 2x base.

All payments are rounded up to the nearest 100.

### Score Tables (Non-Dealer)

| Han \ Fu | 20 | 25 | 30 | 40 | 50 | 60 | 70 |
|----------|-----|-----|-----|-----|-----|-----|-----|
| 1 | -- | -- | 1000 | 1300 | 1600 | 2000 | 2300 |
| 2 | -- | 1600 | 2000 | 2600 | 3200 | 3900 | 4500 |
| 3 | -- | 3200 | 3900 | 5200 | 6400 | 7700 | 8000 |
| 4 | -- | 6400 | 7700 | 8000 | 8000 | 8000 | 8000 |

### Score Limits

| Han | Name | Non-Dealer Ron | Dealer Ron |
|-----|------|----------------|------------|
| 5+ (or 3-4 with high fu) | Mangan | 8,000 | 12,000 |
| 6-7 | Haneman | 12,000 | 18,000 |
| 8-10 | Baiman | 16,000 | 24,000 |
| 11-12 | Sanbaiman | 24,000 | 36,000 |
| 13+ | Kazoe Yakuman | 32,000 | 48,000 |
| Yakuman | Yakuman | 32,000 | 48,000 |

---

## Round and Game Structure

### Wind Assignment

Each player is assigned a **seat wind** that rotates throughout the game:

- **East** (Dealer): Goes first, receives/pays more points, gets extra turns if they win.
- **South**: Second seat.
- **West**: Third seat.
- **North**: Fourth seat.

### Rounds and Hands

A Mahjong game is divided into **rounds**, each consisting of multiple **hands** (individual deals):

```
Game Structure:
+-- East Round (Tonpuu)
|   +-- East 1 (Player A is East/Dealer)
|   +-- East 2 (Player B is East/Dealer)
|   +-- East 3 (Player C is East/Dealer)
|   +-- East 4 (Player D is East/Dealer)
|
+-- South Round (Nanpuu)
    +-- South 1 (Player A is East/Dealer again)
    +-- South 2 (Player B is East/Dealer)
    +-- South 3 (Player C is East/Dealer)
    +-- South 4 (Player D is East/Dealer)
```

### Dealer Rotation

- After each hand, the dealer rotates **counter-clockwise** (East -> South -> West -> North).
- **Exception**: If the dealer wins the hand or is tenpai when the wall is exhausted, the dealer **does not rotate**. This is called a **renchan** (continuance). A bonus counter (honba) is added.
- The bonus counter adds 300 points per counter to the winner's score (100 from each opponent for tsumo).

### Game Types

| Type | Rounds Played | Duration |
|------|---------------|----------|
| **Tonpuu** (East only) | 1 round (East) | ~30-45 minutes |
| **Hanchan** (East-South) | 2 rounds (East + South) | ~60-90 minutes |

### Game End Conditions

The game ends when:
1. All rounds are completed.
2. A player's score drops below zero (in some rulesets with **busting/tobi**).
3. After the last hand of the last round, scores are tallied.

### Ending Bonuses

| Bonus | Description |
|-------|-------------|
| **Uma** | Placement bonus: typically +15/+5/-5/-15 for 1st/2nd/3rd/4th |
| **Oka** | 30,000 starting points with a 25,000 base — the 20,000 difference goes to 1st place |

---

## Special Situations

### Wall Exhaustion (Ryuukyoku / Exhaustive Draw)

When the live wall runs out of tiles and no one has won:

1. All players reveal whether they are **tenpai** (one tile away from winning) or **noten** (not tenpai).
2. Players who are noten pay a total of **3,000 points** to those who are tenpai:
   - 1 tenpai, 3 noten: Noten players each pay 1,000 to the tenpai player.
   - 2 tenpai, 2 noten: Noten players each pay 1,500 to be split among tenpai players.
   - 3 tenpai, 1 noten: The noten player pays 1,000 to each tenpai player.
   - All tenpai or all noten: No payment.

3. If the dealer is tenpai, the dealer does not rotate (renchan).

### Multiple Winners (Double/Triple Ron)

When two or more players can win on the same discard:

- **Head bump (Atamahane)**: Only the player closest to the discarder (in turn order) wins. Other players' wins are ignored. This is the traditional rule.
- **Multiple ron allowed**: Both (or all three) players win. The discarder pays each winner independently. This is more common in modern rules.

The specific rule depends on the variant being played. In this game, the rule can be configured in settings.

### Abortive Draws (途中流局)

Certain rare situations cause the round to immediately end in a draw:

| Situation | Japanese | Description |
|-----------|----------|-------------|
| **Nine Terminals** | Kyuushu Kyuuhai | A player's initial hand contains 9+ different terminal/honor tiles. They may (optionally) declare an abort on their first turn before any claims. |
| **Four Winds** | Suufonsu Renda | All four players discard the same wind tile on their first discard. |
| **Four Kongs** | Suukaikan | Four kongs are declared by different players (not all by one player). |
| **Four Riichi** | Suucha Riichi | All four players declare riichi. |
| **Triple Ron** | Sanchahou | Three players declare ron on the same discard (if triple ron is not allowed). |

### Chombo (Penalty)

A chombo is a penalty for rule violations:

- Declaring a win with an invalid hand.
- Exposing tiles illegally.
- Declaring riichi when not actually tenpai (discovered at wall exhaustion).

The penalty is typically paying the equivalent of a mangan to all other players.

---

## Rule Variants

Mahjong has many regional variants. This section briefly compares the major ones.

### Chinese Classical Mahjong

- The oldest widely-played variant.
- Uses flower and season tiles.
- No riichi, furiten, or dora.
- Scoring based on fan (han) and laak (fu) with no minimum yaku requirement.
- More liberal claiming rules.

### Japanese Riichi Mahjong

- Most popular variant for competitive play.
- Features riichi declaration, furiten rule, dora system.
- Requires at least one yaku to win.
- 136 tiles (no flowers in standard rules).
- Complex scoring with han and fu.
- Red fives as optional dora.

### Hong Kong Mahjong

- Popular in Hong Kong and Guangdong.
- Uses flower and season tiles.
- Scoring in faan (fan) with a minimum of 3 faan to win.
- Simpler scoring than Riichi — no fu calculation.
- No riichi or furiten.
- Chicken hand (0 faan) allowed in some social games.

### Taiwanese Mahjong

- 16-tile hand (instead of 13).
- Heavy emphasis on flower tiles — flowers are a major scoring component.
- Uses 144 tiles (including 8 flowers/seasons).
- Unique scoring system with tai.
- Multiple winning methods and a more aggressive play style.

### American Mahjong

- Uses a card of standard hands updated annually by the National Mah Jongg League.
- Includes joker tiles.
- 152 tiles (standard 144 + 8 jokers).
- Hands must match specific patterns on the card exactly.
- Very different from Asian variants.

### Comparison Table

| Feature | Chinese | Riichi | Hong Kong | Taiwanese | American |
|---------|---------|--------|-----------|-----------|----------|
| Tiles | 136-144 | 136 | 144 | 144 | 152 |
| Hand size | 13 | 13 | 13 | 16 | 13 |
| Flowers | Yes | No | Yes | Yes (major) | Yes |
| Riichi | No | Yes | No | No | No |
| Furiten | No | Yes | No | No | No |
| Dora | No | Yes | No | No | No |
| Min score to win | Varies | 1 yaku | 3 faan | Varies | Match card |
| Jokers | No | No | No | No | Yes |

---

## Quick Reference Card

### Tile Notation

```
Suits:     m = Characters (Manzu)
           p = Circles (Pinzu)
           s = Bamboo (Souzu)

Winds:     Ew = East    Sw = South    Ww = West    Nw = North
Dragons:   Wd = White   Gd = Green    Rd = Red
Red fives: 0m, 0p, 0s

Example hand: 1m 2m 3m 5p 5p 5p 7s 8s 9s Ew Ew Ew 3m 3m
```

### Claiming Priority (Highest to Lowest)

```
1. RON (Win)     — Any player — Always top priority
2. KAN (Kong)    — Any player — Over pong and chow
3. PON (Pong)    — Any player — Over chow
4. CHI (Chow)    — Left player only — Lowest priority
```

### Winning Hand Structures

```
Standard:         4 melds + 1 pair = 14 tiles
Seven Pairs:      7 pairs = 14 tiles
Thirteen Orphans: 1 each of 13 terminals/honors + 1 duplicate = 14 tiles
```

### Dora Reading

```
Suited:   1→2→3→4→5→6→7→8→9→1 (wraps)
Winds:    East→South→West→North→East (wraps)
Dragons:  White→Green→Red→White (wraps)
```

---

*This rulebook covers standard Riichi Mahjong rules. House rules and specific tournament rules may vary. Consult the settings menu in-game to review which optional rules are active.*
