# Poker Strategy Guide

An in-depth strategy reference for Texas Hold'em players who understand the basic rules and want to take their game to the next level. Covers starting hand selection, positional play, pot odds, reading opponents, bluffing, post-flop tactics, common mistakes, and tips for beating each AI opponent.

---

## Table of Contents

1. [Starting Hand Selection](#starting-hand-selection)
2. [Position Play](#position-play)
3. [Pot Odds and Implied Odds](#pot-odds-and-implied-odds)
4. [Reading Opponents](#reading-opponents)
5. [Bluffing](#bluffing)
6. [Post-Flop Play](#post-flop-play)
7. [Common Mistakes](#common-mistakes)
8. [Beating the AI Opponents](#beating-the-ai-opponents)

---

## Starting Hand Selection

The single most important decision in poker is which hands to play and which to fold. Most winning players fold roughly 70-80% of their starting hands.

### Hand Categories

#### Tier 1 — Premium Hands

These hands are strong enough to raise from any position. You should almost always be raising or re-raising with these.

| Hand | Notes |
|------|-------|
| **AA** | The best starting hand. Raise big and build the pot. |
| **KK** | Second best. Vulnerable to aces on the board but otherwise dominant. |
| **QQ** | Very strong, but proceed carefully if an Ace or King hits the flop. |
| **JJ** | Strong but tricky. Many overcards can appear on the flop. |
| **AKs** | The best drawing hand. Suited gives flush potential. Plays well all-in pre-flop. |

**How to play:** Raise 3-4x the big blind. If someone re-raises, consider going all-in with AA/KK. With QQ-JJ, call and evaluate the flop. With AKs, call a re-raise and re-evaluate after the flop.

#### Tier 2 — Strong Hands

Raise from middle or late position. In early position, raise with the stronger ones and consider folding the weaker ones.

| Hand | Notes |
|------|-------|
| **AKo** | Strong but slightly worse than suited. Still a premium open-raise. |
| **AQs** | Excellent hand. Dominates AJ, AT, and weaker aces. |
| **AQo** | Solid but can be dominated by AK. |
| **TT** | Good pair but many overcards exist. Set-mine against heavy action. |
| **99** | Similar to TT. Play for set value in multi-way pots. |
| **KQs** | Strong suited broadway. Plays well post-flop with flush and straight potential. |
| **AJs** | Good suited ace. Be cautious if an ace flops and there is heavy betting. |

**How to play:** Open-raise from middle position onwards. Against a raise, call and look to hit the flop. Against a 3-bet, fold the weaker hands in this tier.

#### Tier 3 — Playable Hands

Play these from late position (Cutoff, Button) or if the blinds fold around to you. In early position, fold these.

| Hand | Notes |
|------|-------|
| **88, 77, 66** | Mid pairs. Set-mine: call a raise, hoping to hit a set on the flop. |
| **ATs, A9s** | Suited aces with decent kickers. |
| **KJs, KTs** | Suited broadway hands with straight and flush potential. |
| **QJs, QTs** | Suited connectors that make strong draws. |
| **JTs** | One of the best speculative hands — makes many straights and flushes. |
| **AJo, ATo** | Offsuit aces. Playable but be cautious against raises. |
| **KQo** | Decent broadway hand but vulnerable out of position. |

**How to play:** Raise when folded to you in late position. Call a single raise from middle position. Fold to strong aggression unless pot odds are favorable.

#### Tier 4 — Speculative Hands

Only play these cheaply from late position or the big blind. Their value comes from making big hands (sets, straights, flushes) that win large pots.

| Hand | Notes |
|------|-------|
| **55, 44, 33, 22** | Small pairs. Set-mine only. Fold if you miss the flop. |
| **87s, 76s, 65s** | Suited connectors. Best in multi-way pots where implied odds are high. |
| **97s, 86s, 75s** | One-gap suited connectors. Slightly worse but still speculative gold. |
| **A5s, A4s, A3s, A2s** | Suited wheel aces. Can make the nut flush and a wheel straight. |
| **K9s, Q9s, J9s** | Suited one-gappers. Playable in position. |
| **T9s, 98s** | Strong suited connectors close to Tier 3. |

**How to play:** See a cheap flop. If you hit big (set, two pair, flush draw, straight draw), play aggressively. If you miss, fold with no regrets.

#### Tier 5 — Trash Hands

Fold these. Do not be tempted.

- **72o** — The worst hand in poker. No straight potential, no flush potential, no nothing.
- **83o, 92o, 73o, 62o** — Random unconnected offsuit junk.
- **K2o-K5o, Q2o-Q6o, J2o-J6o** — Offsuit hands with big gaps and no suited value.
- **Any offsuit hand with a gap of 4+ and no ace** — Pure trash.

**Why fold:** These hands cost you money in the long run. Even if you hit a pair, your kicker is terrible. Playing junk hands is the number one mistake beginners make.

### Starting Hands and Position Chart

```
Position:       EP        MP        LP        Blinds
Premium:        Raise     Raise     Raise     Raise/3-Bet
Strong:         Raise     Raise     Raise     Raise
Playable:       Fold      Call/Raise Raise     Call
Speculative:    Fold      Fold      Call/Raise Call
Trash:          Fold      Fold      Fold      Fold
```

---

## Position Play

Position is the second most important concept in poker after hand selection. The player who acts last has a massive advantage.

### Why Position Matters

1. **Information advantage.** You see what your opponents do before you act. If they check, they are likely weak. If they bet, they have something.
2. **Pot control.** In position, you can check behind to keep the pot small with marginal hands, or bet to build it with strong ones.
3. **Bluffing opportunities.** Bluffs are more effective in position because you can represent a wider range of hands and your opponent has already shown weakness by checking.
4. **Free cards.** If you check in position, you get to see the next card without putting more chips at risk.
5. **Easier decision-making.** Every decision is simpler when you know what your opponent has done.

### Position Guidelines

#### Early Position (UTG, UTG+1)

- Play only Tier 1 and the top of Tier 2.
- Raise to 3x the big blind.
- Do not limp. Either raise or fold.
- You will be out of position for the entire hand, so you need strong cards to compensate.

#### Middle Position (MP, Hijack)

- Add Tier 2 hands and the top of Tier 3.
- Raise to 2.5-3x the big blind.
- You can start to widen your range as fewer players remain to act behind you.

#### Late Position (Cutoff, Button)

- Play all of Tiers 1-3 and selectively play Tier 4.
- Raise to 2-2.5x the big blind.
- If folded to you, raise aggressively to steal the blinds.
- The button is the best seat in poker — exploit it mercilessly.

#### The Blinds

- **Small Blind:** The worst seat. You have money invested but will be out of position for all post-flop streets. Defend selectively.
- **Big Blind:** You already have a full blind invested. Defend wider than the small blind, but do not call with pure trash. You close the action pre-flop, which is an advantage.

### Stealing the Blinds

When everyone folds to you in late position, raise with a wide range (any Tier 1-4 hand and even some Tier 5 hands) to steal the blinds. This is free money against tight opponents who fold their blinds too often.

---

## Pot Odds and Implied Odds

Mathematical thinking separates winning players from losing ones.

### Pot Odds

Pot odds tell you whether a call is mathematically profitable based on the current pot size and the cost to call.

**Formula:**
```
Pot Odds = Cost to Call / (Pot + Opponent's Bet + Cost to Call)
```

**Example 1: Flush Draw on the Turn**
- Pot: 400 chips
- Opponent bets: 200 chips
- Cost to call: 200 chips
- Pot odds: 200 / (400 + 200 + 200) = 200 / 800 = 25%
- You have a flush draw with 9 outs = approximately 19.6% chance to hit on the river.
- 19.6% < 25% — this is a **losing call** based on pot odds alone.

**Example 2: Open-Ended Straight Draw on the Flop**
- Pot: 300 chips
- Opponent bets: 100 chips
- Cost to call: 100 chips
- Pot odds: 100 / (300 + 100 + 100) = 100 / 500 = 20%
- You have 8 outs with two cards to come = approximately 31.5% chance.
- 31.5% > 20% — this is a **profitable call**.

### Implied Odds

Implied odds account for the additional money you expect to win on future streets if you hit your draw.

**When implied odds matter:**
- You have a draw that, if completed, will likely win a large pot.
- Your opponent has a strong hand they are unlikely to fold.
- The draw is hidden (e.g., a gutshot or backdoor flush) so your opponent will not see it coming.

**Example:**
- Pot: 200 chips. Opponent bets 200. You need to call 200 into a 600 pot (33%).
- You have a gutshot straight draw: 4 outs = ~8.5% on the river.
- Pure pot odds say fold. But if you hit, your opponent has top pair and will likely call a big bet.
- If you estimate you can win an additional 800 chips when you hit, your effective pot is 600 + 800 = 1,400.
- Adjusted odds: 200 / 1,600 = 12.5%. Still not great, but closer.
- Conclusion: Fold here. The implied odds help but are not enough to overcome the gap.

**When implied odds are high:**
- Your opponent has a big stack.
- You have a hidden draw (gutshot, backdoor flush).
- The board is unlikely to scare your opponent when you hit.

**When implied odds are low:**
- Your opponent is short-stacked (not much more to win).
- The draw is obvious (four-flush on board).
- Your opponent is a good player who will fold to aggression.

### The Rule of 2 and 4

A quick shortcut for calculating your equity:

- **On the flop (two cards to come):** Multiply your outs by 4.
- **On the turn (one card to come):** Multiply your outs by 2.

| Draw | Outs | Flop (x4) | Turn (x2) | Actual (Flop) | Actual (Turn) |
|------|------|-----------|-----------|----------------|----------------|
| Flush draw | 9 | 36% | 18% | 35% | 19.6% |
| OESD | 8 | 32% | 16% | 31.5% | 17.4% |
| Gutshot | 4 | 16% | 8% | 16.5% | 8.7% |
| Flush + Gutshot | 12 | 48% | 24% | 45% | 26.1% |
| Two overcards | 6 | 24% | 12% | 24.1% | 13% |

---

## Reading Opponents

You cannot see your opponents' cards, but you can gather a tremendous amount of information from how they play.

### Betting Patterns

The most reliable way to read opponents is through their betting patterns.

**Signs of strength:**
- Large bets or raises, especially on the turn and river.
- Betting into multiple opponents.
- Check-raising (checking, then raising after you bet).
- Quick calls (they have a strong hand or draw and do not need to think).
- Re-raising pre-flop (almost always a premium hand in low-stakes games).

**Signs of weakness:**
- Checking when they could bet.
- Small bets (often a "blocking bet" to prevent you from making a bigger bet).
- Hesitating before calling (they are unsure about their hand).
- Calling on the flop and turn, then checking the river (missed their draw).
- Min-raising (minimum raise) — often a weak hand trying to look strong.

### Player Types

Most players fall into one of four categories:

| Type | Description | How to Beat Them |
|------|-------------|-----------------|
| **Tight-Aggressive (TAG)** | Plays few hands, bets aggressively. The strongest player type. | Respect their raises. Bluff them when they show weakness. |
| **Loose-Aggressive (LAG)** | Plays many hands, bets aggressively. Dangerous but exploitable. | Let them bluff into you with strong hands. Do not try to bluff them. |
| **Tight-Passive (Rock)** | Plays few hands, mostly calls. Predictable and easy to exploit. | Steal their blinds. When they bet big, fold — they have it. |
| **Loose-Passive (Calling Station)** | Plays many hands, mostly calls. The easiest opponent. | Never bluff them. Value bet relentlessly with any decent hand. |

### Timing Tells

In this game, the AI opponents have subtle timing patterns:

- **Quick action:** Usually a clear decision — either a very strong hand or a pure bluff.
- **Long pause followed by a raise:** Often a strong hand (they were deciding how much to raise).
- **Long pause followed by a call:** Usually a marginal hand or a draw.
- **Instant check:** Weak hand, not interested in the pot.

### Bet Sizing Tells

- **Overbets (more than the pot):** Polarized — either very strong or a bluff. Rarely a medium-strength hand.
- **Half-pot bets:** Standard, gives you less information.
- **Min bets:** Usually weak. The player wants to see a cheap showdown.
- **All-in on the river:** Often a bluff from recreational players. From experienced players, it is polarized.

---

## Bluffing

Bluffing is what makes poker exciting, but most beginners bluff too much. Effective bluffing requires good timing and the right conditions.

### When to Bluff

**Good bluffing situations:**
- You are in late position and everyone has checked to you (sign of weakness).
- The board is scary (e.g., three high cards, possible straight or flush) and you can represent a strong hand.
- You have been playing tight, so opponents give you credit for strong hands.
- There are only one or two opponents left in the hand.
- Your opponent is a tight player who folds often.

**Bad bluffing situations:**
- Multiple opponents in the pot (someone probably has something).
- Your opponent is a calling station who never folds.
- You have been caught bluffing recently (opponents will call you down).
- The board is dry (e.g., K-7-2 rainbow) and your opponent likely has a king.

### Semi-Bluffs

A semi-bluff is a bet with a hand that is not the best right now but has the potential to improve. Semi-bluffs are more profitable than pure bluffs because you have two ways to win:

1. Your opponent folds (you win immediately).
2. Your opponent calls but you hit your draw (you win at showdown).

**Best semi-bluff hands:**
- Flush draws (9 outs)
- Open-ended straight draws (8 outs)
- Flush draw + straight draw combo (12-15 outs)
- Overcards + gutshot (10 outs)

**Example:**
You hold 8h-9h on a board of 6h-7c-Kh. You have an open-ended straight draw AND a flush draw (15 outs, ~54% chance with two cards to come). Betting here is not really a bluff — you are actually a favorite to win!

### Bluff Sizing

- **Bluff the same amount you would value bet.** If your value bets are 60-75% of the pot, bluff the same amount so opponents cannot distinguish between the two.
- **Larger bluffs on the river.** A big river bet puts maximum pressure on your opponent. But if you are caught, it costs you more.
- **Smaller bluffs on the flop.** A 33-50% pot bet on the flop is enough to fold out weak hands and does not risk too much.

### Bluff-to-Value Ratio

A balanced player bluffs roughly in proportion to the odds they are offering. If you bet half the pot, your opponent needs to be right 25% of the time — so you should be bluffing about 25% of the time you bet. This makes you unexploitable.

In practice, against most opponents in this game, you can deviate from balance:
- Against tight players: bluff more than balanced.
- Against calling stations: bluff less (or not at all).

---

## Post-Flop Play

Post-flop play is where the real skill in poker lives. Pre-flop is largely formulaic; post-flop is where judgment, creativity, and reading opponents come together.

### Continuation Bets (C-Bets)

A continuation bet is when the pre-flop raiser bets the flop regardless of whether they improved. It works because:
- The pre-flop raiser has a perceived range advantage.
- Most hands miss the flop (you only pair the flop about 1/3 of the time).
- Your opponent is likely to fold unless they connected.

**When to c-bet:**
- Dry boards (K-7-2 rainbow, A-9-3). Your opponent probably missed.
- You have position. If called, you can control the pot on later streets.
- Heads-up pots. Fewer opponents means a higher fold rate.
- You have some equity (overcards, backdoor draws).

**When NOT to c-bet:**
- Wet boards (8h-9h-Th) with multiple draw possibilities and several opponents.
- Multi-way pots. With three or more opponents, someone likely connected.
- You have complete air with no backdoor equity. Just give up.

**C-bet sizing:**
- Dry boards: 25-33% of the pot.
- Medium boards: 50-66% of the pot.
- Wet boards (if you bet at all): 66-75% of the pot.

### Check-Raising

A check-raise is when you check, your opponent bets, and then you raise. It is a powerful play because:
- It traps opponents who bet with weak hands.
- It builds a large pot when you have a strong hand.
- It represents enormous strength, putting pressure on opponents.

**Use the check-raise when:**
- You have a very strong hand out of position and want to build the pot.
- You have a strong draw and want to semi-bluff aggressively.
- You want to bluff a player who c-bets too frequently.

### Slow-Playing

Slow-playing means playing a strong hand passively (checking, calling) to disguise its strength and let opponents catch up or bluff.

**When to slow-play:**
- You have an extremely strong hand (set, straight, flush) on a dry board.
- Your opponent is aggressive and will bet if you check.
- There are few draws that can beat you.

**When NOT to slow-play:**
- The board is wet with many draws. Charge opponents to draw!
- Multiple opponents are in the hand. Someone might catch up for free.
- You have a vulnerable hand like top pair. Do not give free cards.

### Playing Draws

When you have a draw, consider these factors:
- **How many outs do you have?** More outs = more aggressive play.
- **What are your pot odds?** If the pot odds are good, call. If not, fold or raise (semi-bluff).
- **What are your implied odds?** Will you get paid off if you hit?
- **Is your draw hidden?** A gutshot is more hidden than an obvious flush draw.

### Multi-Street Planning

Good poker players think ahead. Before you bet the flop, consider:
- What will you do on the turn if called?
- What will you do on the river?
- Are you betting for value all three streets, or planning to check at some point?
- If you are bluffing, on which street will you give up?

---

## Common Mistakes

### Mistake 1: Playing Too Many Hands

**The problem:** Entering pots with weak hands because "any two cards can win."

**The fix:** Follow the starting hand chart strictly. Fold Tier 5 hands every single time. Only expand into Tier 4 from late position.

### Mistake 2: Calling Too Much

**The problem:** Calling bets with weak draws or marginal hands hoping to improve.

**The fix:** Calculate pot odds before every call. If the math does not work, fold. It is better to fold and save chips than to call and lose more.

### Mistake 3: Ignoring Position

**The problem:** Playing the same hands from every position.

**The fix:** Tighten your range dramatically in early position. Widen it in late position. Position is worth at least one tier of hand quality.

### Mistake 4: Predictable Bet Sizing

**The problem:** Always betting small with weak hands and large with strong hands.

**The fix:** Use consistent bet sizing. Bet the same amount whether you are bluffing or value betting. Let your hand range, not your bet size, tell the story.

### Mistake 5: Never Bluffing

**The problem:** Only betting when you have a strong hand. Opponents learn to fold every time you bet.

**The fix:** Add bluffs to your range, especially semi-bluffs with draws. If opponents always fold to your bets, you are not getting maximum value from your strong hands.

### Mistake 6: Always Bluffing

**The problem:** Betting every hand, hoping opponents will fold. Opponents catch on and start calling.

**The fix:** Only bluff when conditions are favorable. Bluff less against calling stations. Maintain a balanced ratio of bluffs to value bets.

### Mistake 7: Chasing Draws Without Odds

**The problem:** Calling large bets with gutshot straight draws (4 outs, ~8%) or runner-runner draws.

**The fix:** Know your outs and the required pot odds. A gutshot needs at least 5:1 pot odds to call profitably. Do not chase with fewer than 8 outs unless the price is very cheap.

### Mistake 8: Playing Scared with Strong Hands

**The problem:** Checking and calling with top pair or better, afraid of being beaten.

**The fix:** Bet your strong hands for value. Most of the time, top pair with a good kicker is the best hand. Extract value from weaker hands that will call.

### Mistake 9: Tilting After Bad Beats

**The problem:** Playing aggressively or recklessly after losing a big pot to a bad beat.

**The fix:** Recognize that bad beats are a normal part of poker. Take a breath. If you feel emotional, take a break. The mathematically correct play does not change because of what happened on the previous hand.

### Mistake 10: Not Adjusting to Opponents

**The problem:** Playing the same strategy against every opponent regardless of their tendencies.

**The fix:** Observe how each opponent plays and adjust. Bluff the tight players. Value bet the calling stations. Avoid the aggressive players unless you have a real hand.

---

## Beating the AI Opponents

Each AI opponent in this game has a distinct personality and poker style. Understanding their tendencies is the key to maximizing your profits.

### Mei — The Mathematician

**Profile:** Tight-Passive / Tight-Aggressive

Mei plays a mathematically sound game. She calculates pot odds precisely and rarely makes mistakes. However, she is predictable because she sticks rigidly to the math.

**Key tendencies:**
- Very tight pre-flop. She only plays premium and strong hands.
- Rarely bluffs (bluff frequency ~8%). When she bets big, she almost always has it.
- Folds too often to aggression (fold threshold ~40%).
- Highly position-aware. She plays even tighter in early position.
- Low continuation bet frequency (~55%). If she bets the flop, she usually has something.
- Almost never check-raises (~8%).
- Does not tilt. Her play stays consistent regardless of results.

**How to beat Mei:**
1. **Bluff her relentlessly.** Mei folds to aggression. Raise her blinds, continuation bet against her, and barrel the turn. She will fold unless she has a real hand.
2. **Steal her blinds.** She folds her blinds very often. Every time it folds to you in late position, raise.
3. **When she fights back, fold.** If Mei raises or re-raises, she has a premium hand. Do not try to outplay her — just fold and wait for a better spot.
4. **Do not slow-play against her.** She will not pay you off with weak hands. Bet your strong hands for value and hope she has something decent.
5. **Exploit her low c-bet frequency.** When she checks the flop as the pre-flop raiser, she is giving up. Take the pot with a bet.

### Kenji — The Aggressor

**Profile:** Loose-Aggressive (LAG)

Kenji is the most aggressive opponent. He plays a wide range of hands, bets big, and puts constant pressure on opponents. He is dangerous but exploitable.

**Key tendencies:**
- Loose pre-flop. He plays many speculative hands, especially in position.
- High bluff frequency (~35%). He bets with air frequently.
- Almost never folds (fold threshold ~15%). Bluffing him is futile.
- High continuation bet frequency (~80%). He bets the flop almost every time he raised pre-flop.
- Moderate check-raise frequency (~15%).
- Tilts occasionally (~20% tilt factor). When he loses a big pot, his play becomes even more erratic.
- Loves to make big river bets, both as bluffs and for value.

**How to beat Kenji:**
1. **Never bluff him.** His fold threshold is extremely low. He will call you down with middle pair, bottom pair, or even ace-high. Save your bluffs for someone else.
2. **Call him down with medium-strength hands.** Top pair is a monster against Kenji. Even second pair is often good. Let him bet and call.
3. **Trap him with strong hands.** Check-raise him when you have a set or better. He will often call or re-raise with weaker hands.
4. **Wait for him to tilt.** After Kenji loses a big pot, his aggression increases further. This is the best time to call him down light.
5. **Let him hang himself.** Do not raise him off his bluffs. Just call and let him fire multiple barrels into your strong hand.
6. **Tighten your pre-flop range.** You need strong hands to play against Kenji because pots will be large.

### Yuki — The Balanced Player

**Profile:** Balanced / Slightly Aggressive

Yuki is the hardest opponent to exploit because she plays a relatively balanced strategy. She mixes bluffs and value bets well and adjusts to your play.

**Key tendencies:**
- Moderate pre-flop range. She plays standard opening ranges with slight adjustments.
- Moderate bluff frequency (~20%). She bluffs at a reasonable rate.
- Moderate fold threshold (~28%). She does not fold too easily but is not a calling station.
- Good position awareness (~75%). She plays tighter in early position and wider in late.
- Moderate continuation bet frequency (~65%). A reasonable c-bet rate.
- Moderate check-raise frequency (~12%).
- Low tilt factor (~10%). She stays composed most of the time.
- Adjusts to your play over time. If you bluff too much, she starts calling more.

**How to beat Yuki:**
1. **Play solid, fundamental poker.** Against a balanced opponent, the best approach is balanced play of your own. Do not try to get fancy.
2. **Mix up your play.** Because Yuki adjusts, avoid falling into predictable patterns. Vary your bet sizing and bluffing frequency.
3. **Look for small edges.** Yuki's fold threshold is slightly exploitable. You can bluff a bit more often than balanced, but do not overdo it.
4. **Target her in multi-way pots.** Yuki plays more cautiously when multiple opponents are involved. Use this to steal more pots.
5. **Value bet thinner.** Yuki calls with a reasonable range. You can bet for value with hands like second pair or weak top pair and she will often call with worse.
6. **Be patient.** You will not make huge profits against Yuki in any single hand. Grind small edges over many hands.

### General Tips for All AI Opponents

- **Take notes mentally on patterns.** Even though AI opponents have fixed tendencies, they do have randomness built in. Pay attention to how they play in specific situations.
- **Adjust your strategy based on stack sizes.** All opponents play differently when short-stacked versus deep-stacked.
- **Do not play on autopilot.** Each hand is a new puzzle. Think about what range your opponent could have and how they would play each hand in that range.
- **Use the Poker Tutor.** The in-game tutor provides real-time advice and hand analysis. Use it to learn why certain plays are correct.

---

*For basic rules, see [Poker Rulebook](poker-rulebook.md).*
*Use the in-game Poker Tutor for real-time advice during hands.*
