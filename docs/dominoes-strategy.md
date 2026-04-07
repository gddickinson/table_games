# Block Dominoes — Strategy Guide

Master the art of Block Dominoes with tile counting techniques, blocking strategies, opponent reading, and tips for beating each AI player in this game.

---

## Table of Contents

1. [Strategic Fundamentals](#strategic-fundamentals)
2. [Opening Strategy](#opening-strategy)
3. [Tile Counting](#tile-counting)
4. [Blocking Strategy](#blocking-strategy)
5. [Keeping Options Open](#keeping-options-open)
6. [Reading Opponents](#reading-opponents)
7. [End Game Strategy](#end-game-strategy)
8. [Pip Count Management](#pip-count-management)
9. [Partnership Strategy](#partnership-strategy)
10. [Common Mistakes](#common-mistakes)
11. [AI Opponent Strategies](#ai-opponent-strategies)
12. [Advanced Concepts](#advanced-concepts)

---

## Strategic Fundamentals

Block Dominoes appears simple on the surface, but strong play requires balancing three competing goals simultaneously:

### The Three Pillars of Domino Strategy

1. **Going out first.** The primary objective is to empty your hand before anyone else. Every tile you play is one step closer to winning.
2. **Blocking opponents.** If you cannot go out, prevent opponents from going out by controlling the open ends of the layout.
3. **Minimizing your pip count.** If the game becomes blocked, having the lowest pip count wins. Play heavy tiles early and keep light tiles for the endgame.

These three goals sometimes conflict. Playing a heavy tile early (good for pip management) might open up values that benefit an opponent (bad for blocking). A skilled player learns to balance all three considerations based on the game state.

### Information Hierarchy

In a 4-player game with all tiles dealt, the only hidden information is which tiles are in which players' hands. You can deduce this information through:

1. **Your own hand** — you know 7 of 28 tiles immediately.
2. **Tiles played** — every tile on the layout is visible to all.
3. **Passes** — when a player passes, you learn they have no tiles matching the current open ends.
4. **Inference from plays** — when a player could have played on either end but chose one, you can sometimes infer which values they want to keep open.

The more information you track, the better your decisions become.

---

## Opening Strategy

### Play Your Highest Double First

When you start the round (or when choosing your first play after the opening), prioritize playing your **highest double**. There are several reasons:

- **Doubles are harder to play.** A double like 5-5 can only be played when a 5 is at an open end. A mixed tile like 5-3 can be played when either a 5 or a 3 is available, giving it twice the opportunity.
- **High doubles carry heavy pip counts.** The 6-6 is worth 12 pips — if you get stuck with it, that is a significant penalty in a blocked game.
- **Early doubles set the pace.** Playing a double early gives you more flexibility with your remaining mixed tiles.

### The Opening Tile

The very first tile of the round must be the highest double held (this is a rule, not a strategy). However, the second player has a genuine strategic choice: which tile to play on the opening double?

**Considerations for the second play:**

- Play a tile that opens a value well-represented in your hand.
- Avoid opening a value you have only one tile of (you will run out quickly).
- If you have many tiles of one value, try to keep that value as an open end.

### First Few Turns

During the first 3-4 turns, focus on:

- Establishing open ends that match values you hold many tiles of.
- Playing heavy tiles (high pip counts) to reduce your liability.
- Watching carefully which values opponents play and avoid.

---

## Tile Counting

Tile counting is the single most important skill in Block Dominoes. By tracking which tiles have been played, you can deduce what opponents hold and make optimal decisions.

### What to Track

For each value (0 through 6), there are exactly **8 tiles** containing that value. Track how many tiles of each value have been played:

| Value | Total Tiles | Played | Remaining |
|-------|------------|--------|-----------|
| 0 | 8 | ? | ? |
| 1 | 8 | ? | ? |
| 2 | 8 | ? | ? |
| 3 | 8 | ? | ? |
| 4 | 8 | ? | ? |
| 5 | 8 | ? | ? |
| 6 | 8 | ? | ? |

### Practical Counting Method

Rather than memorizing every tile, track the **remaining count** for each value. Start at 8 for each value, and subtract 1 each time a tile with that value is played:

**Example:**
- Round starts. All values at 8.
- 6-6 is played. Value 6 drops to 6 (the double uses two ends but is one tile; however, since both ends are 6, two "instances" of value 6 are consumed — so value 6 goes to 6).
- 6-3 is played. Value 6 drops to 5, value 3 drops to 7.
- 3-3 is played. Value 3 drops to 5.

Wait — counting correctly requires precision. The double-six tile consumes 2 of the 8 "appearances" of value 6. Each value appears in 8 tiles total, but the double counts as 1 tile with 2 appearances of that value.

**Simplified approach:** Instead of tracking value appearances, track how many **unplayed tiles** contain each value. This is easier:

- Start: 8 tiles contain each value.
- When a tile is played, subtract 1 from each value on that tile.
- The 6-6 subtracts 1 from value 6 (it is one tile containing value 6; the fact that both ends are 6 is irrelevant for counting purposes).

Actually, the simplest mental model is: there are 8 tiles in the "6 suit" (all tiles that have a 6 on at least one end). When a tile from the 6 suit is played, there are 7 remaining, then 6, and so on.

### Using the Count

Once you know how many tiles of each value remain unplayed (and how many are in your own hand), you can determine how many are in opponents' hands:

**Remaining in opponents' hands = Remaining unplayed - In your hand**

If 3 tiles with value 5 remain unplayed and you hold 1 of them, then opponents collectively hold 2 tiles with value 5. If there are 3 opponents, the chance any specific opponent can play on a 5 is relatively low.

### Depletion Tracking

The most critical count to track is when a value becomes **depleted** (all 8 tiles played). If all 8 tiles containing value 4 have been played and value 4 is at an open end, **nobody can play on that end**. This effectively reduces the layout to a single open end, making blocks much more likely.

---

## Blocking Strategy

Blocking is the art of creating open ends that opponents cannot match, forcing them to pass while you continue playing.

### The Principle of Blocking

If you can determine (through tile counting and pass analysis) that an opponent lacks tiles of a certain value, playing to make that value an open end forces them to pass. The more opponents you can block simultaneously, the stronger your position.

### Setting Up a Block

1. **Track passes.** When Player B passes with open ends of 3 and 5, you know Player B has no 3s and no 5s.
2. **Maintain blocking values.** If you know an opponent cannot play 3s, try to keep a 3 as one of the open ends.
3. **Double-block.** Ideally, make both open ends values that one or more opponents cannot match.

### Sacrificing Points for Position

Sometimes the best blocking play is not the tile with the highest pip count. It may be correct to play a low-pip tile that creates a favorable open end rather than a high-pip tile that opens the game up for opponents.

**Example:**
- Open ends: 4 and 2
- You hold: 4-6 (10 pips) and 4-1 (5 pips)
- You know Player B has no 1s
- **Play 4-1** (creating open end of 1) even though 4-6 would shed more pips, because it blocks Player B.

### The "Both Ends" Block

The strongest block occurs when you control both open ends:

- If you are the only player with tiles matching both open values, you can play freely while everyone else passes.
- This often leads to going out while opponents are helpless.

### When Not to Block

- Do not block when you are close to going out and blocking might stall your own play.
- Do not block your partner (in partnership games).
- Do not block when your pip count is already low and continuing play benefits you.

---

## Keeping Options Open

### Diversity of Values

Try to maintain tiles covering as many different values as possible in your hand. This ensures you can play on whatever open end appears.

**Good hand composition:** 6-2, 5-1, 4-3, 0-5 (covers values 0,1,2,3,4,5,6)
**Poor hand composition:** 6-5, 6-3, 6-1, 5-3 (heavy on 6,5,3; missing 0,2,4)

### Avoid Depleting Your Own Values

If you play all your tiles of value 3 early, you become vulnerable to being blocked when 3 is an open end. Keep at least one tile of common values as long as possible.

### The Versatility Principle

When choosing between two legal plays, prefer the one that leaves you with more future options:

**Example:**
- Open ends: 5 and 2
- Your hand: 5-3, 5-4, 2-6
- Playing 5-3 leaves you with 5-4 (plays on 5s) and 2-6 (plays on 2s or 6s)
- Playing 5-4 leaves you with 5-3 (plays on 5s) and 2-6 (plays on 2s or 6s)
- Playing 2-6 leaves you with 5-3 and 5-4 (both only play on 5s — you are locked into needing a 5!)
- **Best play: 5-3 or 5-4** (either maintains your flexibility better than 2-6)

### The Connectivity Concept

Think of your tiles as a network of connected values. Each tile connects two values. A well-connected hand can "chain" tiles together to play multiple turns in sequence without getting stuck.

---

## Reading Opponents

### Pass Analysis

The most valuable information in Block Dominoes comes from **passes**. When a player passes, you learn they have **zero tiles** matching either open end value.

**Example:**
- Open ends are 4 and 6.
- Player C passes.
- You now know: Player C has no tiles with value 4 AND no tiles with value 6.
- If the open ends change to 4 and 2 and Player C passes again, they also have no 2s.
- You are building a growing picture of Player C's hand.

### Tracking Multiple Passes

Maintain a mental list of values each opponent has been proven to lack:

| Player | Known Missing Values |
|--------|---------------------|
| Player B | 3, 5 |
| Player C | 4, 6, 2 |
| Player D | (none yet) |

As the game progresses, you can narrow down exactly what tiles each opponent holds.

### Play Choice Analysis

When a player could have played on either end but chooses one over the other, this can reveal information:

- **Playing on the less obvious end** might mean they want to keep a certain value open.
- **Always playing on the same end** might mean they lack tiles for the other end.
- **Playing a double when a non-double is available** might mean they want to shed the double.

These inferences are less reliable than pass analysis but provide additional data points.

### Defensive Reads

If an opponent is playing aggressively on one end and ignoring the other, they may be trying to deplete their tiles of a specific value. Consider whether allowing this benefits or hinders you.

---

## End Game Strategy

### The Final Tiles

The last 3-4 plays of a round are the most critical. At this stage, you should have a clear picture of what tiles remain and who holds them.

### Forcing Opponents to Pass

In the endgame, try to engineer a situation where opponents cannot play:

1. Count the remaining tiles for each value.
2. Identify which values opponents are short on (from passes and deductions).
3. Play to make those scarce values the open ends.
4. If successful, opponents must pass while you play your remaining tiles.

### Going Out Guaranteed

The ideal endgame is a **guaranteed domino** — a sequence of plays from your hand where each tile you play sets up the open end for your next tile.

**Example:**
- You hold: 3-5 and 5-2
- Open end: 3
- Play 3-5 (open end becomes 5)
- Play 5-2 (you go out!)

Plan these chains in advance. When you see a guaranteed path to going out, take it even if it means playing lower-pip tiles first.

### When You Cannot Go Out

If you determine you cannot go out (opponents will play their last tiles first, or the game will block), shift your priority to **minimizing your pip count**:

- Play your heaviest tiles while you still can.
- Keep your lightest tiles for the inevitable block.
- The 0-0 (double blank) is the best tile to get stuck with — 0 pips.

---

## Pip Count Management

### Heavy Tiles to Shed Early

The tiles with the highest pip counts are your biggest liabilities:

| Tile | Pip Count | Priority to Play |
|------|-----------|-----------------|
| 6-6 | 12 | Highest — play first |
| 6-5 | 11 | Very high |
| 6-4, 5-5 | 10 | High |
| 6-3, 5-4 | 9 | High |
| 6-2, 5-3, 4-4 | 8 | Medium-high |
| 6-1, 5-2, 4-3 | 7 | Medium |
| 6-0, 5-1, 4-2, 3-3 | 6 | Medium |
| 5-0, 4-1, 3-2 | 5 | Medium-low |
| 4-0, 3-1, 2-2 | 4 | Low |
| 3-0, 2-1 | 3 | Low |
| 2-0, 1-1 | 2 | Very low |
| 1-0 | 1 | Minimal |
| 0-0 | 0 | Keep this — zero liability |

### Balancing Pip Management with Strategy

Playing heavy tiles first is a good default, but do not sacrifice blocking advantage or hand flexibility just to shed a few pips. The goal is to **win rounds**, not just minimize losses when you do lose.

If you are confident you can go out, ignore pip management — just play to win. If the game looks like it will block, prioritize shedding weight.

---

## Partnership Strategy

In 4-player Block Dominoes, players seated across from each other often play as partners. Partnership play adds a new strategic dimension.

### Supporting Your Partner

- **Keep your partner's values open.** If your partner plays a 5 on one end, try to play on the other end rather than covering the 5.
- **Do not block your partner.** If your partner has been playing 3s frequently, they likely have more — do not deplete the 3 end.
- **Clear a path for your partner.** If your partner is down to few tiles, try to create open ends matching what they have been playing.

### Reading Your Partner

- Track your partner's plays and passes just like opponents'.
- If your partner passes on a 4, you know to avoid making 4 an open end.
- If your partner consistently plays on one end, they may want that value to remain open for a future play.

### Team Pip Count

In partnership scoring, the combined pip count of both partners matters. If your partner is heavy with pips, focus on helping them play tiles rather than optimizing your own hand.

---

## Common Mistakes

### Playing Doubles Late

**Why it's wrong:** Doubles are the hardest tiles to play because they match only one value. The longer you hold a double, the greater the chance it becomes unplayable. A heavy double stuck in your hand is devastating in a blocked game.

**Fix:** Play doubles at the first opportunity, especially heavy doubles (5-5, 6-6).

### Ignoring Passes

**Why it's wrong:** A player's pass tells you exactly which values they cannot play. Ignoring this information throws away your biggest strategic advantage.

**Fix:** Make a mental note every time a player passes. Ideally track which values each player is known to be missing.

### Playing Your Only Tile of a Value

**Why it's wrong:** If you play your only 2-value tile and later the layout shows 2 as an open end, you are blocked on that side.

**Fix:** Before playing a tile, check if it is your last tile with that value. If so, consider whether losing access to that value is worth it.

### Always Playing the Highest-Pip Tile

**Why it's wrong:** While shedding heavy tiles is generally good, it should not override strategic considerations. Playing a heavy tile that opens favorable ends for your opponents can cost you the round.

**Fix:** Consider the strategic implications of each play, not just the pip count.

### Not Counting Tiles

**Why it's wrong:** Without counting, you are playing blind. You cannot block effectively, you cannot predict blocks, and you cannot plan your endgame.

**Fix:** At minimum, track the count for the values at the two open ends. Ideally, track all seven values.

### Tunneling on One End

**Why it's wrong:** If you only play on one end of the layout, you signal to opponents that you are weak on the other end's value. They can exploit this by keeping that value open to block you.

**Fix:** Alternate ends when possible to maintain unpredictability.

---

## AI Opponent Strategies

Each AI player in this game has a distinct approach to Block Dominoes. Understanding their tendencies will help you anticipate their plays and exploit their weaknesses.

### Mei — The Tile Counter

**Playing Style:** Mei tracks every tile played and makes deductions about all players' hands. She plays the mathematically optimal move in most situations.

**Tendencies:**
- Rarely holds heavy doubles for long
- Blocks effectively based on pass analysis
- Plays defensively when her pip count is low and a block seems likely
- Adapts her strategy based on the game state

**How to beat Mei:** Mei's weakness is that her optimal play is based on expected values, which can be exploited with unpredictable plays. Occasionally make a suboptimal play to disrupt her deductions. Also, since she counts tiles perfectly, focus on your own counting to compete at her level.

### Kenji — The Aggressive Player

**Playing Style:** Kenji plays to go out as fast as possible, prioritizing shedding tiles over blocking or pip management.

**Tendencies:**
- Plays his heaviest tiles first regardless of strategic value
- Rarely blocks deliberately — he focuses on his own hand
- Plays quickly and does not adapt much to passes
- Gets into trouble in blocked games due to poor pip management

**How to beat Kenji:** Force blocked games. Kenji's aggressive style means he often sheds high-pip tiles early but leaves himself with a poorly composed hand. If you can cause a block when Kenji still holds several tiles, he often has a high remaining pip count despite having shed his heaviest tiles.

### Yuki — The Conservative Player

**Playing Style:** Yuki prioritizes keeping options open and maintaining a balanced hand. She is cautious and avoids risky plays.

**Tendencies:**
- Keeps a diverse hand with many different values
- Rarely gets blocked (she always seems to have a playable tile)
- Does not block aggressively — she avoids confrontation
- Plays slowly and methodically
- Tends to hold doubles too long, hoping for the "perfect" moment

**How to beat Yuki:** Exploit her reluctance to block by playing aggressively yourself. Since Yuki does not deliberately try to block you, you have more freedom to plan your own endgame. Also target her tendency to hold doubles — if you can create open ends that force doubles out, she loses her flexibility advantage.

### General Tips Against All AI Players

- Count tiles religiously. The AI players do this (to varying degrees) and you should too.
- Watch for pass patterns. The AI players' passes reveal the same information as human players' passes.
- Do not change your strategy based on who is next in turn order. Play the mathematically best move for the current board state.
- In close games, pip management becomes the deciding factor. Focus on shedding heavy tiles when the game seems headed for a block.

---

## Advanced Concepts

### The Rule of Seven

In a 4-player game, all 28 tiles are in play. You hold 7 tiles and can see the layout. As the game progresses, you should be able to account for an increasing number of tiles:

- **Start of game:** You know 7 tiles (your hand). You are blind to 21.
- **After round 1:** You know 7 + 4 = 11 tiles. Blind to 17.
- **After round 3:** You know 7 + 12 = 19 tiles, minus any passes that reveal information. Blind to 9 or fewer.
- **Late game:** You should know the location of nearly every tile.

### Probability-Based Decisions

When you cannot be certain what an opponent holds, use probability:

- If 3 tiles with value 5 are unaccounted for among 3 opponents, each opponent has roughly a 63% chance of holding at least one 5.
- If 1 tile with value 5 is unaccounted for among 3 opponents, each has roughly a 33% chance.
- If you are deciding whether to block on 5s, these probabilities matter.

### Tempo and Initiative

**Tempo** in dominoes refers to who controls the pace and direction of the game. The player who dictates which values appear at the open ends has the initiative.

Gaining tempo:
- Play tiles that create open ends matching many tiles in your hand.
- Force opponents into reactive positions where they must play on ends you control.
- Use blocks to skip opponents' turns, gaining extra plays for yourself.

Losing tempo:
- Being forced to play on an end that depletes your key values.
- Passing (the ultimate loss of tempo).
- Reacting to opponents' blocking rather than executing your own plan.

### The Endgame Squeeze

A powerful advanced technique: in the late game, play a tile that simultaneously blocks one opponent and creates an open end that only you can match. This "squeezes" the opponent out of the game while guaranteeing you another turn.

**Example:**
- 3 tiles remain in play (you hold 2, an opponent holds 1).
- Open ends: 4 and 6.
- You hold 4-1 and 1-3.
- Opponent holds 6-2.
- Play 4-1 (changing open ends to 1 and 6).
- Opponent plays 6-2 (changing open ends to 1 and 2).
- Play... wait, you cannot play (you have 1-3, and open ends are 1 and 2).

This illustrates why the squeeze must be calculated carefully. A true squeeze leaves you with a guaranteed chain:

- Open ends: 4 and 6.
- You hold 6-1 and 1-3.
- Opponent holds 4-2.
- Play 6-1 (open ends: 4 and 1). Opponent plays 4-2 (open ends: 2 and 1). You play 1-3. Domino!

### Pattern Recognition

Over time, experienced players develop intuition for common game patterns:

- **The "stall":** Both open ends are the same value (e.g., both show 4). Only 4-value tiles can be played. If few 4s remain, a block is imminent.
- **The "highway":** One value appears frequently at the open end and many tiles remain for it. The game flows quickly on that side.
- **The "dead end":** An open end showing a value with all 8 tiles already played. That end is permanently unplayable.

---

*This strategy guide covers the essential and advanced tactics of Block Dominoes. Practice counting tiles, reading opponents, and balancing aggression with defense. With experience, you will develop the intuition to make the right play in every situation.*
