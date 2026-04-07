# Mahjong Strategy Guide

An advanced strategy reference for players who understand the basic rules and want to improve their game. Covers tile efficiency, defense, hand value planning, positional play, and more.

---

## Table of Contents

1. [Beginner Strategy](#beginner-strategy)
2. [Tile Efficiency](#tile-efficiency)
3. [Defense](#defense)
4. [Push vs. Fold](#push-vs-fold)
5. [Hand Value Planning](#hand-value-planning)
6. [Riichi Strategy](#riichi-strategy)
7. [Claiming Strategy](#claiming-strategy)
8. [Positional Play](#positional-play)
9. [Reading Opponents](#reading-opponents)
10. [Endgame](#endgame)
11. [Pattern-Specific Strategy](#pattern-specific-strategy)
12. [Common Mistakes](#common-mistakes)
13. [Practice Drills](#practice-drills)
14. [AI Opponent Guide](#ai-opponent-guide)

---

## Beginner Strategy

Before diving into advanced concepts, internalize these foundational principles.

### First Principles

**1. Winning is better than losing.**
This sounds obvious, but many beginners either over-value expensive hands (pursuing yakuman when a simple 1-han win would suffice) or under-value cheap wins (folding when a quick win would protect their position).

**2. Points per round matters more than points per hand.**
A player who wins small hands frequently will usually outperform a player who wins big hands rarely. Consistency beats flashiness.

**3. Not dealing into opponents is just as important as winning.**
A round where you score 0 and pay 0 is better than a round where you score 2,000 but pay 8,000. Defense is not passive — it is active point preservation.

**4. Every tile you can see is information.**
Your hand, all discard pools, all open melds, the dora indicator — every visible tile reduces uncertainty. Use all available information.

### Basic Tile Management

In the first few turns of a hand, follow this discard priority:

```
Discard first:  Isolated guest winds (not your seat wind, not round wind)
                Isolated terminals with no neighbors
                Duplicate isolated tiles (e.g., two copies of an unused honor)

Keep:           Pairs (potential melds or final pair)
                Two-sided connections (4m-5m, 6p-7p)
                Tiles near your dora
                Seat wind, round wind, dragon pairs

Evaluate:       One-gap connections (2m-4m) — decent but not great
                Edge connections (1p-2p, 8s-9s) — limited but usable
                Single honors with value (lone seat wind) — keep briefly, discard if no match
```

### When to Claim (Beginner Guidelines)

| Situation | Recommendation |
|-----------|---------------|
| Ron (win) | Always claim |
| Pong of dragon/seat wind/round wind | Usually claim — provides yakuhai |
| Pong of other tiles | Rarely claim early; consider if tenpai or 1-shanten |
| Chow | Rarely claim; only when tenpai or have clear fast yaku path |
| Kong | Consider carefully; adds dora but reveals information |

---

## Tile Efficiency

Tile efficiency is the science of maximizing the number of tiles that improve your hand. Mastering this concept is the single largest skill improvement most intermediate players can make.

### Shanten and Ukeire

**Shanten** = minimum number of tile swaps needed to reach tenpai.

**Ukeire** = number of individual tiles (not tile types) that would reduce your shanten by 1.

The optimal discard is usually the one that maximizes ukeire while maintaining or reducing shanten.

### Tile Acceptance by Connection Type

| Connection | Tiles Needed | Max Ukeire |
|------------|-------------|-------------|
| Isolated tile (no connection) | Needs 2 specific tiles | 0 direct acceptance |
| Pair | Third copy | 2 tiles |
| Edge sequence (1-2 or 8-9) | One specific tile | 4 tiles |
| Closed gap (e.g., 3-5) | One specific tile | 4 tiles |
| Two-sided sequence (e.g., 4-5) | Either end | 8 tiles |
| Three connected (e.g., 3-4-5) | Multiple options | Varies, high |

### The Value of Middle Tiles

Tiles in the range 3-7 can participate in the most sequences:

```
Sequences containing each number:

1: [1-2-3]                                    = 1 sequence
2: [1-2-3] [2-3-4]                           = 2 sequences
3: [1-2-3] [2-3-4] [3-4-5]                   = 3 sequences
4: [2-3-4] [3-4-5] [4-5-6]                   = 3 sequences
5: [3-4-5] [4-5-6] [5-6-7]                   = 3 sequences
6: [4-5-6] [5-6-7] [6-7-8]                   = 3 sequences
7: [5-6-7] [6-7-8] [7-8-9]                   = 3 sequences
8: [6-7-8] [7-8-9]                            = 2 sequences
9: [7-8-9]                                    = 1 sequence
```

This is why 3-7 tiles are more flexible than 1-2-8-9 tiles.

### Complex Shape Analysis

When your hand has overlapping connections, analyze which discard preserves the most overall acceptance:

```
Hand fragment: 2m 3m 4m 5m

This contains:
  Complete meld: [2m-3m-4m] + leftover 5m
  Complete meld: [3m-4m-5m] + leftover 2m
  Two partial melds: [2m-3m] + [4m-5m] (but only need 1 meld from this group)

If you need one meld from this group:
  Keep all four — any draw of 1m, 4m, 6m helps (but 4m is already held)

If you need to discard from this group:
  Discard 2m: keeps [3m-4m-5m] complete + potential [4m-5m] wait
  Discard 5m: keeps [2m-3m-4m] complete + potential [2m-3m] wait
  Discard from outside: depends on the rest of your hand
```

### Head (Pair) Management

You need exactly one pair in your final hand. Managing pairs is a common source of inefficiency:

**Too few pairs (0):**
- You will need to form a pair from scratch, costing acceptance.
- Prioritize keeping or creating at least one pair.

**One pair (ideal in most hands):**
- The pair is your head. Build four melds around it.

**Two pairs:**
- Flexible. One can become a triplet, or you can choose which to keep as the head.
- Consider shanpon (dual pair wait) at tenpai.

**Three or more pairs:**
- Consider pivoting toward seven pairs (chiitoitsu) if you have 4+ pairs.
- Otherwise, discard the least useful pair tile to free up hand space.

---

## Defense

Defense in Mahjong is the art of avoiding dealing the winning tile to an opponent. A skilled defensive player can reduce their deal-in rate from 15%+ (beginner) to under 10% (expert).

### Genbutsu: Absolute Safety

Tiles in an opponent's discard pool are **100% safe** against that player due to the furiten rule. This is the foundation of all defense.

```
Opponent's discards: [3m] [7p] [Nw] [5s] [2m] [8p] [Ew] [1s]

100% safe against this player: 3m, 7p, Nw, 5s, 2m, 8p, Ew, 1s
```

When defending against a specific player (e.g., someone who declared riichi), prioritize discarding their genbutsu tiles.

### Suji: Statistical Safety

Suji logic relies on the assumption that the most common tenpai wait is ryanmen (two-sided). If an opponent discarded a tile that would be part of a two-sided wait, the tiles on the "other side" of that wait are statistically safer.

```
Suji grid:

 1 --- 4 --- 7
 2 --- 5 --- 8
 3 --- 6 --- 9

If opponent discarded 4m:
  1m is safer (the 2m-3m wait would need 1m or 4m, but 4m is furiten)
  7m is safer (the 5m-6m wait would need 4m or 7m, but 4m is furiten)
```

**ASCII diagram of suji relationships:**

```
Discarded: 4

  [1] 2  3 [4] 5  6 [7] 8  9
   ^               ^
   |               |
   +-- Suji safe --+

Reason: Ryanmen [2-3] waits on 1 or 4 (4 is furiten)
        Ryanmen [5-6] waits on 4 or 7 (4 is furiten)
```

> **Warning:** Suji is approximately 75-85% safe, NOT 100%. It does not protect against kanchan (closed wait), tanki (single tile wait), or shanpon (dual pair wait). Against a player in riichi, suji reduces danger but does not eliminate it.

### Kabe: Wall Block Safety

When all 4 copies of a tile are visible, no player can hold that tile, which means certain sequences are impossible:

```
All four 5p are visible (in discards, open melds, and your hand)

No one can have:
  [4p-5p] → cannot wait on 3p or 6p via this shape
  [5p-6p] → cannot wait on 4p or 7p via this shape
  [4p-6p] → cannot wait on 5p

Tiles made safer: 3p, 6p (from 4p-5p shape) and 4p, 7p (from 5p-6p shape)
```

**Partial kabe**: If 3 of 4 copies are visible, the danger is reduced but not eliminated.

### No-Chance Tiles

A tile is **no-chance** if it cannot be part of any concealed meld in an opponent's hand. This requires checking:
- All copies of adjacent tiles are accounted for
- The tile cannot complete any pong (all copies visible)

No-chance analysis is complex but provides the highest confidence when genbutsu is unavailable.

### Defense Decision Framework

When an opponent declares riichi, evaluate each tile in your hand:

```
SAFETY TIERS:

Tier 1 (Safest):   Genbutsu — tiles in the riichi player's discard pool
Tier 2:            No-chance — tiles proven impossible to complete a meld
Tier 3:            Suji + Kabe — tiles protected by suji logic AND wall block
Tier 4:            Suji only — tiles with suji protection but no kabe backup
Tier 5:            Kabe only — wall-blocked sequences but no suji
Tier 6 (Danger):   Unprotected tiles — especially honor tiles they haven't discarded,
                   tiles near their recent discards, dora tiles
```

### Reading Riichi Danger

After a riichi declaration, the most dangerous tiles to discard are:

1. **Tiles between 3-7 that have no suji protection** — These can be part of many sequences.
2. **Honor tiles the opponent has NOT discarded** — If they kept an honor through many turns, they may have a pair or triplet waiting.
3. **Dora tiles** — Players build hands around dora, so the dora tile itself may be their wait.
4. **Tiles adjacent to their late discards** — If they discarded 5m late (tedashi), they may have broken a 4m-5m or 5m-6m shape, meaning 3m, 6m, or 4m, 7m could be waiting.

---

## Push vs. Fold

The push-or-fold decision is the most consequential strategic judgment in Mahjong. It determines whether you pursue your own hand or play defensively.

### Expected Value Framework

Every decision in Mahjong has an expected value (EV):

```
EV(push) = P(win) * value_of_win - P(deal_in) * cost_of_deal_in
EV(fold) = 0 (approximately — folding protects your score)

Push when EV(push) > EV(fold)
Fold when EV(fold) > EV(push)
```

### Factors Favoring Push

| Factor | Why It Favors Pushing |
|--------|----------------------|
| You are tenpai | High chance of winning |
| Good wait (ryanmen, 8 tiles) | Many winning tiles available |
| High hand value (3+ han) | Win payout justifies risk |
| Riichi opponent has bad wait (you suspect) | Lower deal-in probability |
| Early in the round | Many wall tiles remain |
| You are behind in score | Need points to recover |
| You have safe tiles to fall back on | Can push now and fold later if needed |

### Factors Favoring Fold

| Factor | Why It Favors Folding |
|--------|----------------------|
| You are far from tenpai (2+ shanten) | Low chance of winning before wall ends |
| Bad wait | Few winning tiles |
| Low hand value | Win payout does not justify risk |
| Multiple opponents tenpai | Higher deal-in probability |
| Late in the round | Few wall tiles remain |
| You are in first place | Do not need to risk your lead |
| No safe tiles | Every discard is dangerous |

### The Shanten Threshold

A practical rule of thumb:

```
Opponent riichi → Check your shanten:

Tenpai (0-shanten):     Usually push, unless your hand is worthless
                        and theirs is clearly expensive

1-shanten:              Push if you have safe tiles to discard
                        and good potential hand value.
                        Consider fold if you have no safe tiles.

2-shanten:              Usually fold. You need 2+ improvements
                        before you can even think about winning.

3+ shanten:             Always fold. You have no realistic path
                        to winning this hand.
```

### Partial Fold (Mawashi)

Between full push and full fold, there is a middle ground: **mawashi** (detour). This means continuing to develop your hand while only discarding relatively safe tiles.

```
Full push:   Discard whatever is optimal for hand development,
             regardless of safety.

Mawashi:     Develop your hand but choose between safe-ish discards.
             Accept slower hand development for reduced deal-in risk.
             May reshape your hand around safe discards.

Full fold:   Discard only the safest tiles available.
             Break apart your hand if needed to find safe discards.
             Give up all hope of winning this hand.
```

Mawashi is the default mode for skilled players when one opponent is in riichi and the defender is at 1-shanten with decent value.

---

## Hand Value Planning

### Identify Your Path Early

By turn 3-4, you should have a rough idea of what your hand could become. Ask:

1. **What yaku am I heading toward?** (Riichi? Tanyao? Yakuhai? Pinfu?)
2. **How many han can I expect?** (Consider yaku + dora)
3. **Is this worth pursuing, or should I aim for something different?**

### The Value Calculation

A quick estimate of your hand's expected value:

```
Expected Han = confirmed_yaku + likely_yaku + dora_count

Confirmed yaku:   Yaku you already have (e.g., a dragon pong = 1 han)
Likely yaku:      Yaku you will probably complete (e.g., tanyao if you have
                  no terminals/honors, riichi if your hand is closed)
Dora count:       Dora tiles in your hand
```

### Pivot Points

A **pivot point** is a moment when you should consider changing your hand's direction. Common pivot points:

**Early draw of a third dragon or wind:**
```
Hand: ... Rd Rd + random tiles ...
Draw: Rd (third Red Dragon!)
→ Pivot: Now prioritize completing the dragon pong and building yakuhai.
   Previously you might have been aiming for tanyao — change plans.
```

**Multiple same-suit tiles accumulate:**
```
Hand: 1p 2p 3p 5p 6p 8p 9p + mixed other tiles
→ Pivot: Consider honitsu (half flush) or chinitsu (full flush).
   Start discarding non-circle tiles.
```

**Dora draw changes hand value:**
```
Hand: Basic tanyao hand worth ~2 han
Draw: Dora tile (and it fits your hand)
→ Pivot: Hand is now worth 3+ han. Worth pushing harder and possibly
   declaring riichi for a mangan.
```

### Value Targets by Game Situation

| Situation | Minimum Target |
|-----------|---------------|
| Comfortable lead, late game | 1 han (any win, just maintain lead) |
| Even score, mid-game | 2-3 han (decent hand, worth the risk) |
| Behind, need to catch up | 4-5 han (mangan minimum to make a dent) |
| Last place, desperate | Go for the biggest hand possible |
| Dealer | Any value (dealer payments are 1.5x) |

---

## Riichi Strategy

### When to Riichi: The Decision Matrix

| Factor | Favors Riichi | Favors Damaten |
|--------|---------------|----------------|
| **Wait quality** | Good wait (ryanmen, 5+ tiles live) | Bad wait (1-2 tiles live) |
| **Hand value without riichi** | 0 yaku (need riichi to win!) | 3+ han already |
| **Round timing** | Early-mid (turns 1-12) | Late (turns 13+) |
| **Score position** | Behind or even | Far ahead |
| **Opponents' state** | No one seems close to tenpai | Multiple opponents look close |
| **Ura dora potential** | Many tiles in hand could be ura dora | Few possibilities |
| **Ippatsu chance** | No claims have interrupted the cycle | Opponents likely to claim |

### Riichi Timing

**Immediate riichi (declaring as soon as you reach tenpai):**
- Generally correct. Statistical analysis shows that riichi earlier is usually better.
- Maximizes ippatsu chance.
- Puts pressure on opponents for the maximum number of turns.

**Delayed riichi (waiting one or more turns before declaring):**
- Rarely correct, but sometimes justified.
- Example: You reached tenpai but your current wait is bad. If you draw a tile that improves your wait, then riichi with the better wait.
- However, every turn you delay is a turn you could have won with ippatsu or put pressure on opponents.

### Damaten Situations

Keep your tenpai hidden (damaten) when:

1. **You already have a high-value hand** (mangan+ without riichi). Adding riichi might push you from mangan to haneman, but it risks the 1,000 deposit and flexibility.

2. **Your wait is on a tile someone is likely to discard** if they do not know you are tenpai. Riichi warns them; damaten does not.

3. **You want to keep flexibility.** Without riichi, you can change your hand if a better tile appears, or you can claim a chow or pong that completes your hand differently.

4. **Multiple opponents are in riichi.** Adding a third riichi to the table increases volatility. Damaten lets you quietly win while they fight each other.

---

## Claiming Strategy

### The Cost of Opening Your Hand

Opening your hand (claiming chow, pong, or open kong) has concrete costs:

| Lost Opportunity | Impact |
|-----------------|--------|
| Cannot declare riichi | Lose 1+ han (riichi, ippatsu, ura dora) |
| Cannot score pinfu | Lose 1 han |
| Cannot score menzen tsumo | Lose 1 han |
| Cannot score iipeikou | Lose 1 han |
| Reveals information | Opponents can read your hand better |
| Reduces chinitsu/honitsu | These yaku lose 1 han when open |

### When Opening Is Worth It

Despite the costs, opening is correct in specific situations:

**1. Yakuhai (dragon/wind pong):**
Claiming a dragon or relevant wind pong gives you an immediate, guaranteed yaku. The 1 han from yakuhai partially offsets the 1 han lost from riichi.

```
Hand: Rd Rd + various tiles
Opponent discards: Rd
→ Claim pon. You now have yakuhai (1 han) and can build any winning hand.
```

**2. Speed priority:**
When you need to win quickly (defending a lead, closing out a game, or preventing an opponent from winning):

```
You are 1-shanten, an opponent just declared riichi.
Opponent to your left discards a tile completing a chow in your hand.
After claiming, you would be tenpai with yakuhai from an earlier pong.
→ Claim chi. Getting tenpai quickly may let you win before the riichi player.
```

**3. High-value open hands:**
Some hands maintain high value even when open:

```
Open toitoi (all triplets): 2 han even when open
Open honitsu + yakuhai: 2 + 1 = 3 han minimum
Multiple yakuhai: Each dragon/wind pong adds 1 han
```

### Claim Frequency Guidelines

| Player Skill | Recommended Claim Rate |
|--------------|----------------------|
| Beginner | Rarely (only ron and essential yakuhai) |
| Intermediate | Selectively (~15-20% of hands open) |
| Advanced | Strategically (~20-30%, based on situation) |
| Expert | Context-dependent (varies widely by game state) |

---

## Positional Play

### Score Situation Awareness

Your strategy should change based on the current scores. At the start of each hand, note:

```
Check these before each hand:
[ ] What place am I in? (1st, 2nd, 3rd, 4th)
[ ] How far ahead/behind am I?
[ ] Who is the dealer? (dealer wins are worth 1.5x)
[ ] How many hands are left in the game?
[ ] Are there riichi deposits or bonus counters on the table?
```

### Strategy by Position

**First Place (Leading):**
- Play conservatively. Avoid dealing into opponents.
- Cheap wins are fine — they maintain your lead and end the round.
- Fold freely when opponents declare riichi.
- As dealer, you want rounds to continue (renchan) — even tenpai draws are good.
- Do not take unnecessary risks chasing big hands.

**Second Place:**
- Balanced play. Push against third and fourth place; be cautious against first.
- Look for opportunities to overtake first place, but do not gamble recklessly.
- Calculate how much you need to overtake first. If it is within one mangan, stay aggressive.

**Third Place:**
- More aggressive. You need points.
- Push harder for valuable hands.
- Consider opening your hand for speed if you have yakuhai available.
- Target the player in fourth place (deal into them if necessary to boost your ranking).

**Fourth Place (Last):**
- Maximum aggression. You have the least to lose.
- Push for big hands when possible.
- Take risks you would not normally take.
- Riichi freely — the ippatsu and ura dora bonuses could be what you need.
- On the last hand, calculate exactly how much you need and plan accordingly.

### Dealer Strategy

The dealer position has unique strategic implications:

- **Dealer wins pay 1.5x**: Even small wins are significantly more valuable.
- **Dealer continuance**: Winning as dealer means you stay dealer for another hand with bonus counters.
- **Aggressive dealing is rewarded**: Push harder as dealer than you would in other seats.
- **Renchan pressure**: Consecutive dealer wins with accumulating bonus counters can dramatically swing scores.

### Last-Place Desperation (All Last / Oorasu)

In the final hand of the game, fourth place needs to maximize their finishing position:

```
Score situation (final hand):
1st: 35,000    2nd: 28,000    3rd: 22,000    You: 15,000

To reach 3rd: Need 22,000 - 15,000 = 7,000 point swing minimum
  → A haneman tsumo would work
  → A mangan ron against 3rd place player would work

To reach 2nd: Need 28,000 - 15,000 = 13,000 point swing minimum
  → Nearly impossible in one hand without yakuman

Strategy: Aim for 3rd place. Target a mangan+ hand and hope for the best.
```

---

## Reading Opponents

### Discard Analysis Fundamentals

**Early discards (turns 1-4):**
- Honor tiles: Normal, low information value.
- Terminals: Player likely pursuing simples (tanyao direction).
- Middle tiles (3-7): Unusual early — player may have a strong shape elsewhere or be pursuing terminals/honors.

**Middle discards (turns 5-9):**
- Pay attention to which suits are being discarded and which are absent.
- If a player has not discarded any tiles from a specific suit, they may be collecting it (honitsu/chinitsu direction).

**Late discards (turns 10+):**
- These are the most informative. Late-discarded tiles were previously considered useful.
- Suited tiles discarded late suggest the player restructured their hand.

### Tedashi vs. Tsumogiri Reading

**Tedashi** (discarding from hand, not the drawn tile):
- The player chose to keep the drawn tile over an existing tile.
- The drawn tile improved their hand.
- Their hand structure just changed.

**Tsumogiri** (discarding the tile just drawn):
- The drawn tile was useless to them.
- Their hand structure has not changed.
- Their needs are the same as before the draw.

```
Tracking example:
Turn 10: Player draws, pauses, discards 4s from hand (tedashi)
→ They drew something more useful than 4s
→ They may have completed a meld or improved a connection
→ 4s was the weakest tile in their hand

Turn 11: Player draws, immediately discards the drawn tile (tsumogiri)
→ The drawn tile was useless
→ Their hand state has not changed from turn 10
```

### Open Meld Reading

When a player claims tiles and forms open melds, you gain substantial information:

```
Player's open melds: [3p 4p 5p] [Gd Gd Gd]

Known:
- They have at least yakuhai (Green Dragon) = 1 han minimum
- They claimed a chow (3-4-5 circles) = they are going for speed
- Their hand is open = no riichi, no menzen tsumo, no pinfu
- Remaining hand: ~7 concealed tiles + they need 1 more meld + pair

Deductions:
- With a circle chow and green dragon, they may be pursuing honitsu (circles + honors)
- OR they may just be building a fast yakuhai hand
- Watch their discards for clues about suit concentration
```

### Identifying Tenpai Without Riichi

Signs that an opponent may be tenpai (even without declaring riichi):

1. **Three open melds**: They only need a pair or one more partial to win.
2. **Sudden change in discard pattern**: They switch from discarding one suit to discarding seemingly useful tiles from another suit.
3. **Long pauses before discarding**: They are considering whether a discard is safe.
4. **Discarding previously "useful" tiles**: A late-game discard of a middle tile suggests they no longer need it — their hand may be complete except for one tile.

---

## Endgame

### Late Wall Strategy

When fewer than 20 tiles remain in the wall:

**If tenpai:**
- Consider whether to declare riichi (adds value but reveals information).
- Calculate how many of your winning tiles remain live.
- If only 1-2 winning tiles remain, consider whether pushing is worth the risk.

**If not tenpai:**
- Begin transitioning to defense.
- Prioritize safe discards over hand development.
- Aim for noten penalty avoidance (get to tenpai if possible without dangerous discards).

### Wall Counting

Track the number of tiles remaining:

```
Starting wall: 70 tiles (136 total - 52 dealt - 14 dead wall)
Each turn: -1 tile (draw) + 0 (discard goes to river, not wall)
Kongs: -1 additional tile (replacement draw)

Current wall count = 70 - (total turns taken) - (kongs declared)
```

The game displays this count, but understanding the math helps you estimate how many more turns remain.

### Noten Penalty Avoidance

When the wall is about to run out, being tenpai matters:

```
Noten penalty distribution:
  1 tenpai, 3 noten:  Each noten pays 1,000 (tenpai gains 3,000)
  2 tenpai, 2 noten:  Each noten pays 1,500 (each tenpai gains 1,500)
  3 tenpai, 1 noten:  Noten pays 3,000 (each tenpai gains 1,000)
```

In the last few turns, getting to tenpai (even with a bad wait or low-value hand) saves you 1,000-3,000 points compared to being noten. This can be worth making slightly dangerous discards.

### Safe Tile Selection in the Endgame

As the game nears wall exhaustion:

1. **Late-game genbutsu**: Opponents' discard pools are large, giving you many safe options.
2. **Tile count advantage**: Many tiles are visible, making kabe analysis more effective.
3. **Honor tile safety**: By late game, if an honor tile has been discarded 2-3 times, the 4th copy is safe (no one can have a pair or triplet waiting).

---

## Pattern-Specific Strategy

### Flush Pursuit (Honitsu / Chinitsu)

**When to go for a flush:**
- You start with 6+ tiles in one suit.
- You have honor tiles that complement the suit.
- The suit tiles form good connections (not all isolated).

```
Starting hand strong for honitsu:
2p 3p 4p 6p 7p 9p + Ew Ew + Rd + scattered others
→ 6 circles + 2 honor pairs
→ Discard non-circle suited tiles, keep honors
→ Target: honitsu (3 han closed, 2 han open) + potential yakuhai
```

**Flush discard pattern (what opponents see):**
Your discards will be heavy in two suits with no tiles from the third. Experienced opponents will notice this and stop discarding tiles in your flush suit. The earlier you commit to a flush, the more obvious it becomes.

> **Tip:** Sometimes discarding one tile from your flush suit early can disguise your intentions. Advanced players call this a "bluff discard."

### All Triplets (Toitoi)

**When to pursue toitoi:**
- You start with 3+ pairs or existing triplets.
- You have honor pairs (which can become yakuhai pongs).
- Going for sequences is difficult (too many isolated tiles).

**Toitoi is usually an open hand** because you need to claim pongs. The value comes from:
- Toitoi itself: 2 han
- Yakuhai from honor pongs: 1 han each
- Potential honroutou (all terminals and honors): 2 han
- Dora in your triplets: stacks well

### Dragon Collection (Shousangen / Daisangen)

**Small Three Dragons (Shousangen):**
Requires pongs of two dragons and a pair of the third. Worth 2 han plus yakuhai for each dragon pong.

```
Example: [Wd Wd Wd] [Gd Gd Gd] + [Rd Rd] pair + 2 other melds
Value: Shousangen (2) + White Dragon (1) + Green Dragon (1) = 4 han minimum
```

**Big Three Dragons (Daisangen):**
Pongs of all three dragons. Yakuman.

**Strategy:**
- If you start with 2+ of two different dragons, consider the dragon path.
- Claim dragon pongs aggressively (opponents should be watching for this).
- Be aware that experienced opponents will never discard the third dragon if they see you have two dragon pongs.
- Sometimes hold two dragon tiles concealed to avoid tipping off opponents.

### Seven Pairs (Chiitoitsu)

**When to pursue seven pairs:**
- You start with 4+ pairs and no strong sequence connections.
- Normal hand development (4 melds + 1 pair) looks difficult.
- You want to stay closed for riichi + chiitoitsu (4 han).

```
Good seven pairs start:
3m 3m | 7m 7m | 2p 2p | 5p 5p | 8s 8s | Ew | 3s
→ 5 pairs already! Need 2 more pairs from 3 unpaired tiles.
→ Very strong chiitoitsu candidate.
```

**Seven pairs notes:**
- Closed hand only (you cannot claim tiles for pairs).
- Always a tanki (single tile) wait — maximum 3 tiles acceptance.
- Worth 2 han (25 fu) as a base. Combine with riichi, tanyao, or honitsu.
- Four identical tiles do NOT count as two pairs in chiitoitsu.

---

## Common Mistakes

### Mistake 1: Always Declaring Riichi When Tenpai

**The problem**: Riichi is not always optimal. With a bad wait and a high-value hand, damaten can be better.

**The fix**: Before declaring riichi, check your wait quality and existing hand value. If you already have 3+ han and a single-tile wait, consider damaten.

### Mistake 2: Never Folding

**The problem**: Pushing every hand regardless of danger leads to frequent, expensive deal-ins.

**The fix**: When an opponent declares riichi and you are 2+ shanten, fold immediately. No exceptions until you learn to evaluate marginal push/fold situations.

### Mistake 3: Opening Your Hand Too Often

**The problem**: Claiming chows and pongs for minimal benefit, sacrificing riichi and hand value.

**The fix**: For every claim, ask "What am I gaining? What am I losing?" Only claim when the gain clearly outweighs the cost.

### Mistake 4: Ignoring Dora

**The problem**: Discarding dora tiles or not building your hand around them.

**The fix**: Dora tiles are worth 1 han each — free points. Keep them unless they are truly isolated and holding them prevents you from reaching tenpai.

### Mistake 5: Poor Pair Management

**The problem**: Having no pairs (needing to form one from scratch) or too many pairs (creating a muddled hand).

**The fix**: Aim for 1-2 pairs in your hand during development. If you accumulate 4+ pairs, commit to seven pairs.

### Mistake 6: Not Tracking Discards

**The problem**: Playing only your hand without looking at the table.

**The fix**: Force yourself to glance at opponent discard pools every 2-3 turns. Note which suits are absent and which tiles have been discarded.

### Mistake 7: Chasing a Specific Tile

**The problem**: Waiting for one specific tile when alternative hand developments offer better acceptance.

**The fix**: Always compare ukeire between discard options. Choose the discard that maximizes acceptance, not the one that preserves a specific "dream hand."

### Mistake 8: Inefficient Discard Order

**The problem**: Discarding useful tiles early and keeping useless tiles late.

**The fix**: Follow the priority order: isolated guest winds first, then isolated terminals, then evaluate based on connection quality.

### Mistake 9: Not Considering What You Discard After Claiming

**The problem**: Claiming a pong or chow and then discarding a dangerous tile.

**The fix**: Before claiming, plan your discard. If the only discard after claiming is a highly dangerous tile, reconsider the claim.

### Mistake 10: Playing the Same Strategy Every Hand

**The problem**: Always going for the same type of hand regardless of your starting tiles.

**The fix**: Read your starting hand and adapt. Some hands want riichi + pinfu. Others want open yakuhai. Others want seven pairs. Flexibility is key.

### Mistake 11: Undervaluing Dealer Position

**The problem**: Playing the same way regardless of whether you are the dealer.

**The fix**: As dealer, push harder — your wins are worth 50% more, and continuing as dealer gives you more hands.

### Mistake 12: Discarding Round/Seat Wind Tiles Thoughtlessly

**The problem**: Early-discarding wind tiles that match your seat or the round wind.

**The fix**: Seat wind and round wind pongs are guaranteed yakuhai. If you have a pair, hold them for several turns to see if you draw the third.

### Mistake 13: Not Adjusting to Score Situation

**The problem**: Playing the same way in first place and last place.

**The fix**: Leading? Play safe. Trailing? Take risks. The final hand? Calculate exactly what you need.

### Mistake 14: Slow Play Due to Indecision

**The problem**: Spending too long on every discard, running out the clock.

**The fix**: Practice tile efficiency drills to make standard discard decisions automatic. Reserve your thinking time for genuinely difficult decisions.

### Mistake 15: Tilting After a Bad Outcome

**The problem**: Playing recklessly after a bad beat (paying a mangan, missing a win by one tile).

**The fix**: Accept that Mahjong has variance. A single hand does not define your skill. Take a deep breath and play the next hand on its own merits.

---

## Practice Drills

### Drill 1: Tenpai Recognition (5 minutes daily)

Open Practice Mode > Tenpai Recognition. Set to timed mode (15 seconds per hand). Identify whether the hand is tenpai and list the waiting tiles. Goal: 90% accuracy at 15 seconds.

### Drill 2: Best Discard (10 minutes daily)

Open Practice Mode > Best Discard. For each hand, choose the optimal discard without time pressure. After submitting, review the AI explanation. Goal: match the AI recommendation 80% of the time.

### Drill 3: Suji Identification (5 minutes daily)

Given a discard pool, quickly identify all suji-safe tiles. Start with one opponent's pool, then try reading all three simultaneously. Goal: identify all suji relationships within 10 seconds.

### Drill 4: Hand Value Estimation (5 minutes daily)

Open Practice Mode > Scoring Quiz. Given a completed hand, estimate the han and approximate point value before seeing the answer. Goal: correct han count 90% of the time.

### Drill 5: Defense Scenario (10 minutes daily)

Open Practice Mode > Defense Drill. An opponent has declared riichi with a visible discard pool. Choose the safest discard sequence for the next 5 turns. Goal: 0 deal-ins across 10 scenarios.

### Drill 6: Replay Review (15 minutes after each game session)

After playing, open your last game in the replay viewer. For each hand you lost or dealt in, identify: what should you have done differently? Use the AI analysis overlay to compare your decisions to optimal play.

### Drill 7: Open Meld Reading (during games)

During each game, actively predict what hand each opponent is building based on their open melds and discards. After the game, check the replay to see if your predictions were correct.

### Drill 8: Wall Counting (during games)

Practice mentally tracking the wall count. Before looking at the game's wall count display, estimate how many tiles remain. Compare with the actual count. Goal: be within 2 tiles of the correct count consistently.

---

## AI Opponent Guide

### How to Beat Each AI Character

#### Mei (Balanced)

**Play style**: Solid fundamentals, balanced attack and defense, prefers closed hands.

**Weaknesses**:
- Predictable discard patterns — she follows textbook tile efficiency.
- Folds reliably against riichi, which you can exploit by declaring riichi with weak hands to slow her down.
- Rarely goes for big hands; she prefers consistent small wins.

**Strategy against Mei**:
- Do not expect her to deal in to your big hands — she defends well.
- Attack quickly when she is not threatening.
- She is the most consistent opponent, so beat her with your own consistency.

#### Kenji (Aggressive)

**Play style**: Pushes hard, declares riichi early and often, takes risks.

**Weaknesses**:
- Frequently deals into other players' hands due to aggressive pushing.
- Declares riichi with bad waits sometimes.
- Poor defensive play — he rarely folds.

**Strategy against Kenji**:
- Let him push into your hands. Play solid defense and wait for him to deal in.
- When he declares riichi, respect it (he usually is tenpai) but know his wait quality varies.
- His aggression means he occasionally wins big, but his consistency is poor.

#### Yuki (Defensive)

**Play style**: Extremely cautious, folds frequently, waits for high-value hands.

**Weaknesses**:
- Wins infrequently — she folds too often, missing opportunities.
- When she does push, her hand is usually expensive, but she telegraphs it.
- Her excessive folding means she often finishes noten and pays penalties.

**Strategy against Yuki**:
- When Yuki pushes (does not fold), be very cautious — she almost certainly has a high-value hand.
- Declare riichi against her freely — she will fold and give you free turns to draw your tile.
- Attack aggressively in general; she will not fight back most of the time.

#### Ryou (All-or-Nothing)

**Play style**: Either goes for big hands (mangan+) or folds completely. No middle ground.

**Weaknesses**:
- Ignores cheap winning opportunities.
- Telegraphs his intent early — if he is keeping tiles, he is going big.
- When folding, he is completely passive and will not contest the hand.

**Strategy against Ryou**:
- Steal small wins while he is building his hand.
- If he reaches tenpai, his hand is almost certainly expensive. Fold unless you are also tenpai with good value.
- Exploit his folding rounds with aggressive play.

#### Lian (Open-Hand Speed)

**Play style**: Calls tiles frequently, builds open hands with yakuhai, wins fast.

**Weaknesses**:
- Open hands are lower value — she wins often but cheaply.
- Her open melds reveal her hand, making defense easier.
- She can be outscored over a full game despite winning more hands.

**Strategy against Lian**:
- Do not discard honor tiles carelessly — she will claim them.
- Her open melds tell you exactly what she needs. Deny her winning tiles.
- Build closed hands for higher value to outpace her cheap wins.

#### Professor Tanaka (Optimal)

**Play style**: Near-optimal AI play. Balanced push/fold, perfect tile efficiency, accurate defense.

**Weaknesses**:
- Very few exploitable patterns.
- Slightly predictable because he always makes the "correct" play.
- Can be outplayed through unpredictable strategies (though this is risky).

**Strategy against Professor Tanaka**:
- Play your best fundamental Mahjong. There is no trick to beating optimal play except playing well yourself.
- Focus on your own hand development and defense.
- Accept that his win rate will be high, and focus on minimizing your losses in hands you do not win.
- In the long run, variance will decide many hands. Stay consistent and patient.

---

*Strategy is a living discipline. Every game provides new situations and learning opportunities. Review your replays, practice your drills, and keep refining your approach. The path from beginner to expert is paved with thousands of hands, each one a lesson.*
