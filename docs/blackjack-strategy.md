# Blackjack Strategy Guide

Master the mathematics of Blackjack with basic strategy charts, card counting fundamentals, bankroll management, and tips for beating each AI opponent in this game.

---

## Table of Contents

1. [Understanding the House Edge](#understanding-the-house-edge)
2. [Basic Strategy Overview](#basic-strategy-overview)
3. [Hard Totals Strategy](#hard-totals-strategy)
4. [Soft Totals Strategy](#soft-totals-strategy)
5. [Pair Splitting Strategy](#pair-splitting-strategy)
6. [Why Basic Strategy Works](#why-basic-strategy-works)
7. [Card Counting Basics](#card-counting-basics)
8. [Bet Sizing with the Count](#bet-sizing-with-the-count)
9. [Insurance — Always Decline](#insurance-always-decline)
10. [Common Mistakes](#common-mistakes)
11. [AI Opponent Strategies](#ai-opponent-strategies)
12. [Bankroll Management](#bankroll-management)
13. [Variance and Expected Results](#variance-and-expected-results)

---

## Understanding the House Edge

The **house edge** is the mathematical advantage the casino holds over the player, expressed as a percentage of the original bet that the player expects to lose over time. In Blackjack, the house edge comes from one critical asymmetry: **the player acts first**.

If both the player and the dealer bust in the same round, the player has already lost their bet. This "double bust" rule is the single largest source of the house edge.

### House Edge by Strategy

| Strategy | Approximate House Edge |
|----------|----------------------|
| No strategy (average recreational player) | 2% - 5% |
| "Always mimic dealer" (hit to 17, stand on 17+) | 5.5% |
| "Never bust" (stand on 12+) | 3.9% |
| Basic strategy (perfect play) | 0.5% |
| Basic strategy + card counting | -0.5% to -1.5% (player advantage) |

The difference between no strategy and basic strategy can be worth **thousands of dollars** over a session. Learning basic strategy is the single most important thing you can do to improve at Blackjack.

### Rule Impact on House Edge

The base house edge assumes specific rules. In this game, the rules are:

- 6 decks: +0.64% base
- Dealer hits soft 17: +0.20%
- Double after split allowed: -0.14%
- Late surrender allowed: -0.08%
- Double on any two cards: Standard
- **Net house edge with basic strategy: approximately 0.62%**

---

## Basic Strategy Overview

Basic strategy is a complete set of rules that tells you the mathematically optimal play for every possible combination of your hand and the dealer's upcard. It was first computed by Roger Baldwin and colleagues in 1956 and refined through computer simulation.

**Basic strategy does not guarantee wins.** It minimizes the house edge to the lowest possible level without counting cards. Over tens of thousands of hands, it will save you significant money compared to playing by intuition.

### How to Read the Charts

The charts below use these abbreviations:

- **H** = Hit
- **S** = Stand
- **D** = Double Down (if not allowed, Hit instead)
- **Ds** = Double Down (if not allowed, Stand instead)
- **P** = Split
- **Ph** = Split (if Double After Split is allowed, otherwise Hit)
- **Pd** = Split (if Double After Split is allowed, otherwise Double)
- **Rh** = Surrender (if allowed, otherwise Hit)
- **Rs** = Surrender (if allowed, otherwise Stand)
- **Rp** = Surrender (if allowed, otherwise Split)

---

## Hard Totals Strategy

A **hard total** is any hand without an Ace counted as 11, or any hand without an Ace.

| Your Hand | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | A |
|-----------|---|---|---|---|---|---|---|---|---|---|
| **Hard 5-8** | H | H | H | H | H | H | H | H | H | H |
| **Hard 9** | H | D | D | D | D | H | H | H | H | H |
| **Hard 10** | D | D | D | D | D | D | D | D | H | H |
| **Hard 11** | D | D | D | D | D | D | D | D | D | D |
| **Hard 12** | H | H | S | S | S | H | H | H | H | H |
| **Hard 13** | S | S | S | S | S | H | H | H | H | H |
| **Hard 14** | S | S | S | S | S | H | H | H | H | H |
| **Hard 15** | S | S | S | S | S | H | H | H | Rh | Rh |
| **Hard 16** | S | S | S | S | S | H | H | Rh | Rh | Rh |
| **Hard 17+** | S | S | S | S | S | S | S | S | S | S |

### Key Hard Total Principles

**Always hit hard 8 or less.** You cannot bust, and any card improves your hand.

**Always stand on hard 17 or more.** The risk of busting is too high and your hand is reasonably strong.

**Double on 10 and 11.** These are your best starting points. With a 10, you double against everything except dealer 10 and Ace. With an 11, you double against everything (the expected value of doubling 11 is positive against every dealer upcard).

**The "stiff zone" (12-16) is where strategy matters most.** Against dealer 2-6, stand (the dealer is likely to bust). Against dealer 7-Ace, hit (you need to improve because the dealer likely has a good hand).

**Hard 12 is special.** Unlike 13-16, you hit 12 against dealer 2 and 3 because the dealer is less likely to bust with these upcards, and only a 10 will bust you.

---

## Soft Totals Strategy

A **soft total** contains an Ace counted as 11. The key insight: you can be more aggressive with soft hands because you cannot bust on one additional card.

| Your Hand | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | A |
|-----------|---|---|---|---|---|---|---|---|---|---|
| **Soft 13 (A,2)** | H | H | H | D | D | H | H | H | H | H |
| **Soft 14 (A,3)** | H | H | H | D | D | H | H | H | H | H |
| **Soft 15 (A,4)** | H | H | D | D | D | H | H | H | H | H |
| **Soft 16 (A,5)** | H | H | D | D | D | H | H | H | H | H |
| **Soft 17 (A,6)** | H | D | D | D | D | H | H | H | H | H |
| **Soft 18 (A,7)** | Ds | Ds | Ds | Ds | Ds | S | S | H | H | H |
| **Soft 19 (A,8)** | S | S | S | S | Ds | S | S | S | S | S |
| **Soft 20 (A,9)** | S | S | S | S | S | S | S | S | S | S |

### Key Soft Total Principles

**Never stand on soft 17.** You have a safety net — hitting cannot make things worse (if you draw a high card, the Ace becomes 1 and you still have a playable hand). Soft 17 should always be hit or doubled.

**Soft 18 is tricky.** Against dealer 2-6, double if allowed (otherwise stand). Against dealer 7-8, stand (18 is likely good enough). Against dealer 9, 10, or Ace, **hit** — 18 is an underdog against these strong upcards and you have nothing to lose by hitting.

**Double soft hands against weak dealer upcards.** When the dealer shows 4, 5, or 6, they are most vulnerable. Take advantage by doubling your soft hands.

**Soft 19 and 20 are strong.** Stand on these almost always. The only exception is soft 19 against dealer 6, where doubling has a slight edge.

---

## Pair Splitting Strategy

When to split pairs. Remember: splitting creates two separate hands, each with its own bet.

| Your Pair | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | A |
|-----------|---|---|---|---|---|---|---|---|---|---|
| **A,A** | P | P | P | P | P | P | P | P | P | P |
| **10,10** | S | S | S | S | S | S | S | S | S | S |
| **9,9** | P | P | P | P | P | S | P | P | S | S |
| **8,8** | P | P | P | P | P | P | P | P | Rp | Rp |
| **7,7** | P | P | P | P | P | P | H | H | H | H |
| **6,6** | Ph | P | P | P | P | H | H | H | H | H |
| **5,5** | D | D | D | D | D | D | D | D | H | H |
| **4,4** | H | H | H | Ph | Ph | H | H | H | H | H |
| **3,3** | Ph | Ph | P | P | P | P | H | H | H | H |
| **2,2** | Ph | Ph | P | P | P | P | H | H | H | H |

### Key Pair Splitting Principles

**Always split Aces.** A single Ace is worth 11 — an incredible starting point for a hand. Two separate hands starting with 11 are far better than one hand of 12.

**Always split 8s.** A total of 16 is the worst hand in Blackjack. Two hands starting with 8 each have a chance to improve to 18 or better. Even against a dealer 10 or Ace, splitting 8s loses less money than playing 16 (though surrendering 8,8 vs Ace is also acceptable).

**Never split 10s.** A total of 20 is the second-best hand possible. Splitting 10s throws away a near-certain win for two uncertain outcomes. Mathematically, the expected value of standing on 20 is almost always higher than splitting.

**Never split 5s.** A pair of 5s gives you a total of 10 — an excellent doubling hand. Treat it as a hard 10, not as a pair.

**Split 9s against most dealer upcards** but stand against dealer 7 (you have 18, and the dealer likely has 17), stand against dealer 10 (too risky), and stand against dealer Ace (too risky).

---

## Why Basic Strategy Works

Basic strategy is derived from expected value calculations for every possible game state. Here is a simplified explanation:

### The Math Behind "Hit 12 vs Dealer 2"

This is one of the most counterintuitive basic strategy plays. Many players stand on 12 against any dealer upcard "to avoid busting." Here is why hitting is correct against dealer 2:

**If you stand on 12 vs dealer 2:**
- Dealer's most likely total: 17 (must stand)
- Probability dealer busts: approximately 35.3%
- Your expected value: approximately -0.293 (lose 29.3 cents per dollar)

**If you hit 12 vs dealer 2:**
- Probability you bust: approximately 30.8% (only a 10 busts you)
- If you don't bust, you have a better hand to compete with
- Your expected value: approximately -0.253 (lose 25.3 cents per dollar)

Hitting loses less money. Over thousands of hands, this difference compounds significantly.

### Expected Value of Key Decisions

| Situation | Stand EV | Hit EV | Best Play |
|-----------|----------|--------|-----------|
| Hard 16 vs dealer 10 | -0.540 | -0.507 | Hit (or surrender at -0.500) |
| Hard 12 vs dealer 4 | -0.211 | -0.222 | Stand (barely) |
| Soft 18 vs dealer 9 | -0.183 | -0.100 | Hit |
| Hard 11 vs dealer 10 | +0.178 | +0.385 | Double (+0.385 vs hit +0.178) |

---

## Card Counting Basics

Card counting is a technique that tracks the ratio of high cards to low cards remaining in the shoe. When the remaining shoe is rich in high cards (10s and Aces), the player has an advantage.

### Why High Cards Favor the Player

- More Blackjacks (pays 3:2 to the player, but the dealer only collects 1:1)
- Better doubling opportunities (more likely to get a 10 on your double)
- Dealer busts more often (must hit stiff hands into 10s)
- Insurance becomes profitable when the count is very high

### The Hi-Lo System

The most popular and simplest card counting system assigns a value to each card:

| Cards | Count Value | Reason |
|-------|------------|--------|
| 2, 3, 4, 5, 6 | +1 | Low cards leaving the shoe favor the player |
| 7, 8, 9 | 0 | Neutral cards |
| 10, J, Q, K, A | -1 | High cards leaving the shoe hurt the player |

### Running Count

As each card is dealt, you add its value to a running total:

**Example deal:**
- 5 (+1), King (-1), 3 (+1), 7 (0), Ace (-1), 2 (+1), Jack (-1), 6 (+1)
- Running count: +1 -1 +1 +0 -1 +1 -1 +1 = **+1**

A positive running count means more low cards have been dealt, so the remaining shoe is rich in high cards (favorable for the player).

### True Count

The running count must be adjusted for the number of decks remaining to get the **true count**:

**True Count = Running Count / Decks Remaining**

Examples:
- Running count of +6 with 3 decks remaining: True count = +2
- Running count of +6 with 1 deck remaining: True count = +6
- Running count of +2 with 4 decks remaining: True count = +0.5

The true count is what determines your actual advantage and bet size.

### Player Advantage by True Count

| True Count | Approximate Player Edge |
|------------|------------------------|
| -5 or lower | -3.0% (strong house advantage) |
| -2 | -1.5% |
| 0 | -0.5% (base house edge) |
| +1 | 0.0% (roughly break-even) |
| +2 | +0.5% |
| +3 | +1.0% |
| +5 | +2.0% |
| +7 or higher | +3.0%+ |

---

## Bet Sizing with the Count

The key to profiting from card counting is **varying your bet based on the true count**. Bet more when you have an advantage, bet less (or the minimum) when the house has the advantage.

### Simple Bet Spread

A common bet spread for a 6-deck game:

| True Count | Bet (in units) | Reasoning |
|------------|---------------|-----------|
| TC <= +1 | 1 unit (minimum) | House has advantage or break-even |
| TC +2 | 2 units | Small player advantage |
| TC +3 | 4 units | Moderate player advantage |
| TC +4 | 6 units | Good player advantage |
| TC +5+ | 8 units (maximum) | Strong player advantage |

### Bet Spread Ratio

The ratio between your maximum and minimum bet is called your **bet spread**. The example above uses an 8:1 spread. Wider spreads earn more but attract more attention from casino surveillance.

Common spreads:
- **1:4** — Conservative, lower earnings but safer
- **1:8** — Standard, good balance of profit and camouflage
- **1:12** — Aggressive, maximum earnings but conspicuous
- **1:20+** — Team play, very high risk of detection

### Wonging (Back-Counting)

A technique named after Stanford Wong: observe the table without playing ("back-counting"), only joining when the count is favorable (+2 or higher) and leaving when it drops. This eliminates playing at a disadvantage but is increasingly banned by casinos ("no mid-shoe entry" rules).

---

## Insurance — Always Decline

Insurance is one of the most misunderstood bets in Blackjack. Despite its name suggesting it "protects" your hand, it is a separate side bet with a significant house edge.

### The Mathematics

In a 6-deck shoe at the start:
- Total cards: 312
- Ten-value cards: 96
- After dealer shows Ace: 311 remaining cards, 96 are tens
- Probability of dealer Blackjack: 96/311 = 30.87%
- For a 2:1 payout to be fair, probability needs to be: 33.33%
- **House edge on insurance: approximately 7.4%**

### When Does Insurance Become Correct?

Only when the true count is +3 or higher (in the Hi-Lo system) does the proportion of tens in the remaining shoe make insurance a positive expected value bet. At true count +3, roughly 1/3 of remaining cards are tens, making the 2:1 payout fair or slightly profitable.

### Don't Be Fooled By "Even Money"

Taking "even money" on your Blackjack when the dealer shows an Ace is mathematically identical to taking insurance. Over time, declining even money earns more than accepting it.

**The math:**
- Accept even money: Win exactly 1 unit every time
- Decline even money: Win 1.5 units ~69% of the time, push ~31% of the time
- Expected value of declining: 0.69 x 1.5 + 0.31 x 0 = **1.035 units**

Declining even money is worth 3.5% more in the long run.

---

## Common Mistakes

### Standing on 12 Against Dealer 2 or 3

**Why it's wrong:** Many players think "don't bust" is the priority. But against dealer 2 or 3, the dealer is not as likely to bust as you might think (35.3% and 37.6% respectively). Hitting gives you a chance to improve, and only a 10 will bust you (30.8% chance).

### Not Splitting 8s Against Dealer 10

**Why it's wrong:** Yes, you are putting more money out against a strong dealer card. But 16 is such a terrible hand (expected loss of 54%) that two hands of 8 each (expected loss of about 48% total across both bets) is the lesser evil.

### Standing on Soft 18 Against Dealer 9, 10, or Ace

**Why it's wrong:** 18 feels like a good hand, and it often is. But against these strong dealer upcards, 18 is actually an underdog. Hitting cannot bust you (since the hand is soft) and gives you a chance to improve to 19, 20, or 21.

### Taking Insurance

**Why it's wrong:** As covered above, insurance has a 7.4% house edge. The name "insurance" is marketing — it is simply a side bet on the dealer having a 10 in the hole.

### Betting More After a Loss (Martingale)

**Why it's wrong:** Doubling your bet after each loss does not change the house edge. It only increases variance and risks hitting the table maximum or depleting your bankroll during a losing streak. The cards have no memory.

### Not Doubling 11 Against Dealer 10

**Why it's wrong:** Some players fear the dealer's strong upcard. But 11 is the best possible doubling hand — you have a 30.8% chance of drawing to 21 and you're roughly a 53% favorite to win the hand. The expected profit from doubling exceeds the expected profit from just hitting.

### Playing Based on "Feelings" or "Streaks"

**Why it's wrong:** Each hand of Blackjack is essentially independent (aside from minor card counting effects). A losing streak does not mean you are "due" for a win, and a winning streak does not mean you should deviate from basic strategy. The mathematically correct play does not change based on recent results.

### Splitting 10s

**Why it's wrong:** A total of 20 wins approximately 85% of the time against any dealer upcard. Splitting 10s throws away this near-guaranteed win. Even card counters rarely split 10s — it is a major tell for surveillance teams and the mathematical gain is minimal even at high counts.

---

## AI Opponent Strategies

Each AI player in this game has a distinct personality and playing style. Understanding their tendencies allows you to anticipate their actions and adjust your strategy.

### Mei — The Card Counter

**Playing Style:** Mei tracks the shoe and adjusts her bet size with the count. She plays near-perfect basic strategy with count-based deviations.

**Tendencies:**
- Varies her bets significantly — watch for sudden bet increases indicating a high count
- Takes insurance at high counts (correctly)
- Deviates from basic strategy in count-dependent situations (e.g., standing on 16 vs 10 at high counts, hitting 12 vs 4 at low counts)
- Plays conservatively at negative counts

**How to beat Mei:** You cannot "beat" Mei in the traditional sense since you both play against the dealer. However, if Mei is increasing her bets, the shoe is likely rich in high cards — increase your bets too. Mirror her bet sizing as a proxy count.

### Kenji — The Overbetter

**Playing Style:** Kenji is aggressive and emotional. He overbets relative to his bankroll and chases losses with larger wagers.

**Tendencies:**
- Starts with reasonable bets but escalates quickly after losses
- Doubles down in marginal situations hoping for a big win
- Splits too aggressively (including splitting 10s and 5s)
- Takes insurance frequently
- Occasionally deviates from basic strategy based on gut feeling

**How to beat Kenji:** Simply play disciplined basic strategy. Kenji's aggressive betting and frequent strategy deviations mean he will burn through his bankroll faster. Patience is your weapon against Kenji.

### Yuki — The Conservative

**Playing Style:** Yuki plays an extremely tight, risk-averse game. She prefers preserving her bankroll over maximizing expected value.

**Tendencies:**
- Always bets the minimum or near-minimum
- Rarely doubles down, even in favorable situations
- Rarely splits, even when splitting is clearly correct
- Stands on stiff hands more often than basic strategy recommends
- Never takes insurance (which is actually correct)
- Plays to "not bust" rather than to maximize expected value

**How to beat Yuki:** Yuki's conservative style means she leaves money on the table by not doubling and splitting when she should. Play correct basic strategy, and your higher expected value from optimal doubling and splitting will give you an edge over time.

### General Tips Against All AI Players

- Focus on your own play — you cannot control what the AI players do.
- The AI players' actions do not affect your expected value (a common misconception).
- Use AI betting patterns as information when you are not counting cards yourself.
- The dealer's rules are always the same regardless of other players.

---

## Bankroll Management

Proper bankroll management is critical for long-term success at Blackjack, whether you play basic strategy or count cards.

### Minimum Bankroll Requirements

To withstand normal variance, you need a bankroll that is a sufficient multiple of your betting unit:

| Playing Style | Recommended Bankroll | Risk of Ruin |
|---------------|---------------------|--------------|
| Basic strategy, flat betting | 200 units | ~5% |
| Basic strategy, flat betting | 400 units | ~1% |
| Card counting, 1:8 spread | 400 units | ~5% |
| Card counting, 1:8 spread | 1000 units | ~1% |

**"Risk of ruin"** is the probability of losing your entire bankroll before the long run takes effect.

### Session Bankroll vs Total Bankroll

- **Session bankroll:** The amount you bring to one sitting (typically 20-40 betting units).
- **Total bankroll:** Your entire Blackjack fund across all sessions.
- Never risk more than 10% of your total bankroll in a single session.

### Win/Loss Limits

- **Stop-loss:** Quit if you lose a predetermined amount (e.g., 40 units). This protects against catastrophic sessions.
- **Win goal:** Consider locking in profits after a good run (e.g., bank half your profits after doubling your session buy-in).
- These limits are psychologically helpful but do not change the math.

### Unit Sizing

Your **unit** should be sized so that your total bankroll can absorb expected downswings:

- Total bankroll: $5,000
- Recommended minimum bankroll: 300 units
- Unit size: $5,000 / 300 = approximately **$16 per unit**
- Round down to $15 for a clean number

---

## Variance and Expected Results

### What is Variance?

Variance measures how much your results deviate from the expected value. In Blackjack, short-term results are dominated by variance (luck), while long-term results converge toward the mathematical expectation (skill).

### Standard Deviation in Blackjack

The standard deviation per hand in Blackjack is approximately **1.14 betting units**. This means:

- In 100 hands at $10/hand, your standard deviation is approximately $114
- In 400 hands, approximately $228
- In 10,000 hands, approximately $1,140

### Interpreting Your Results

For a basic strategy player with a 0.5% house edge betting $10/hand:

| Hands Played | Expected Loss | 1 SD Range | Likely Range (2 SD) |
|-------------|--------------|------------|---------------------|
| 100 | -$5 | -$119 to +$109 | -$233 to +$223 |
| 500 | -$25 | -$280 to +$230 | -$535 to +$485 |
| 1,000 | -$50 | -$410 to +$310 | -$770 to +$670 |
| 5,000 | -$250 | -$1,055 to +$555 | -$1,860 to +$1,360 |
| 10,000 | -$500 | -$1,640 to +$640 | -$2,780 to +$1,780 |
| 100,000 | -$5,000 | -$8,600 to -$1,400 | -$12,200 to +$2,200 |

Notice how at 100,000 hands, even the lucky end of the 2-standard-deviation range is approaching a loss. This is the house edge grinding away.

### Winning Sessions vs Losing Sessions

Even with perfect basic strategy (0.5% house edge), a player will win approximately **47% of sessions** and lose approximately **53%** (assuming equal session lengths). Individual sessions can vary wildly — a winning session might double your buy-in, while a losing session might wipe it out.

### For Card Counters

A skilled card counter with a 1% edge (after adjusting for counting advantages) might win approximately **54% of sessions**. Even with an edge, losing sessions are common and expected. Card counting is a long-term strategy that requires:

- At least 500-1,000 hours of play to approach expected results
- Emotional discipline to endure losing streaks
- Sufficient bankroll to survive variance

### The Bottom Line

- **Short term:** Anything can happen. Do not judge your strategy by a single session.
- **Medium term (hundreds of hours):** Trends begin to emerge, but variance is still significant.
- **Long term (thousands of hours):** Results converge on the mathematical expectation. Good strategy is rewarded, bad strategy is punished.

---

*This strategy guide provides the mathematical foundation for optimal Blackjack play. Memorize the basic strategy charts, manage your bankroll wisely, and always make the mathematically correct decision — the cards will take care of the rest over time.*
