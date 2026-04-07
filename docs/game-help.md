# Game Help

Complete reference guide for every feature, control, and setting in this Mahjong game.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Controls Reference](#controls-reference)
3. [Game Interface](#game-interface)
4. [Settings Guide](#settings-guide)
5. [Features Guide](#features-guide)
6. [Troubleshooting](#troubleshooting)
7. [Accessibility](#accessibility)
8. [Languages](#languages)

---

## Getting Started

### First Launch

When you open the game for the first time:

1. **Welcome Screen**: A brief introduction and language selection appear.
2. **Name Entry**: Choose your player name (can be changed later in settings).
3. **Tutorial Prompt**: The game asks if you would like to play the interactive tutorial. We highly recommend it for first-time players.
4. **Main Menu**: After setup, you arrive at the main menu.

### Main Menu Overview

```
+-----------------------------------------------+
|                  MAHJONG                       |
|                                                |
|    [  Play  ]     [  Practice  ]              |
|                                                |
|    [ Campaign ]   [ Daily Challenge ]         |
|                                                |
|    [ Tournament ] [ Multiplayer ]             |
|                                                |
|    [ Replays ]    [ Achievements ]            |
|                                                |
|    [ Shop ]       [ Settings ]               |
|                                                |
+-----------------------------------------------+
```

### Quick Start: Your First Game

1. Click **Play** from the main menu.
2. Select **Free Play** for an unrestricted game.
3. Choose your difficulty (Easy is recommended for beginners).
4. Select your AI opponents or let the game choose randomly.
5. Click **Start Game**.
6. The game loads the table, deals the tiles, and you begin playing.

### Game Modes

| Mode | Description |
|------|-------------|
| **Free Play** | Standard game against AI opponents. Choose any settings. |
| **Campaign** | Story-driven series of games with increasing difficulty and special rules. |
| **Practice** | Focused drills on specific skills (tile efficiency, defense, etc.). |
| **Daily Challenge** | A new puzzle or scenario every day with leaderboards. |
| **Tournament** | Bracket-style competition against AI with prizes. |
| **Multiplayer** | Play online against other human players. |
| **Spectator** | Watch AI opponents play a full game. |

---

## Controls Reference

### Mouse Controls

| Action | Control |
|--------|---------|
| Select a tile | Left-click on the tile |
| Discard a tile | Left-click a selected tile (click again), or drag to discard area |
| Claim a discard | Click the appropriate button (Chi / Pon / Kan / Ron) |
| Declare riichi | Click the Riichi button when prompted |
| Declare tsumo | Click the Tsumo button when prompted |
| Sort hand | Right-click anywhere in the hand area |
| View opponent discards | Hover over an opponent's discard area |
| Zoom in | Scroll wheel up |
| Zoom out | Scroll wheel down |
| Rotate camera | Middle-click and drag |
| Open menu | Right-click on the table area (outside hand) |

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1` - `9` | Select the Nth tile from the left in your hand |
| `0` | Select the rightmost tile (drawn tile) |
| `Enter` | Confirm action (discard selected tile, confirm claim) |
| `Space` | Skip / Pass (decline to claim a discard) |
| `C` | Claim: Chow (Chi) |
| `P` | Claim: Pong (Pon) |
| `K` | Claim: Kong (Kan) |
| `R` | Declare Riichi |
| `W` | Declare Win (Ron or Tsumo, context-dependent) |
| `H` | Toggle hint display |
| `S` | Toggle score overlay |
| `T` | Open chat / tutor panel |
| `D` | Toggle discard highlight mode |
| `Tab` | Cycle through UI panels |
| `Esc` | Open pause menu / Close current panel |
| `F1` | Open help overlay |
| `F2` | Quick save (in campaign mode) |
| `F5` | Toggle fullscreen |
| `F11` | Take screenshot |
| `F12` | Toggle performance stats |
| `Ctrl+Z` | Undo (in practice mode only) |
| `Ctrl+S` | Save replay |
| `Ctrl+R` | Open replay browser |
| `M` | Toggle music |
| `N` | Toggle sound effects |
| `+` / `-` | Adjust game speed |
| `[` / `]` | Previous / Next tile in hand (alternative to number keys) |

### Touch Controls (Mobile / Tablet)

| Gesture | Action |
|---------|--------|
| Tap tile | Select tile |
| Double-tap tile | Discard tile |
| Swipe tile up | Discard tile |
| Tap claim button | Execute claim (Chi, Pon, Kan, Ron) |
| Pinch | Zoom in/out |
| Two-finger rotate | Rotate camera |
| Long press on tile | Show tile info tooltip |
| Long press on opponent area | Show opponent stats |
| Swipe down from top | Open menu |
| Swipe left/right on hand | Scroll hand (if tiles overflow) |

---

## Game Interface

### Interface Layout

```
+------------------------------------------------------------------+
|  [Menu]  Round: East 1    Tiles Left: 52    [Chat] [Hint] [Speed]|  <- Top Bar
+------------------------------------------------------------------+
|                                                                    |
|              North (Opponent)                                      |
|         [Open Melds] [Discards]                                   |
|                                                                    |
|  West        +------------------+           East                   |
| (Opp)        |                  |          (Opp)                   |
| [Melds]      |   Discard Pool   |         [Melds]                 |
| [Discrds]    |     (Center)     |        [Discrds]                |
|              |                  |                                   |
|              +------------------+                                  |
|                                                                    |
|         [Dora Indicators]  [Wall Count]                           |
|                                                                    |
|  +----+----+----+----+----+----+----+----+----+----+----+----+--+ |
|  | T1 | T2 | T3 | T4 | T5 | T6 | T7 | T8 | T9 |T10 |T11 |T12|T13  <- Your Hand
|  +----+----+----+----+----+----+----+----+----+----+----+----+--+ |
|                                                                    |
|  [Your Open Melds]        [Your Discards]         [Action Buttons]|  <- Bottom Bar
+------------------------------------------------------------------+
|  [Score: 25000]  [Seat: South]  [Wind: East]  [Riichi Sticks: 0] |  <- Status Bar
+------------------------------------------------------------------+
```

### Top Bar Elements

| Element | Description |
|---------|-------------|
| **Menu Button** | Opens the pause menu with options to save, quit, adjust settings, or view help. |
| **Round Indicator** | Shows the current round (e.g., "East 1") and the prevailing wind. |
| **Tiles Left** | Number of tiles remaining in the live wall. When this reaches 0, the round ends in a draw (if no one has won). |
| **Chat Button** | Opens the chat panel where you can talk to AI opponents or ask the tutor questions. |
| **Hint Button** | Toggles the hint system on/off. Shows recommended discards and danger indicators when enabled. |
| **Speed Control** | Adjusts the game speed. Useful for speeding through AI turns or slowing down for analysis. |

### Hand Area

Your tiles are displayed at the bottom of the screen. Key visual indicators:

- **Selected tile**: Raised slightly above the others.
- **Drawn tile**: Separated slightly to the right of the main hand, indicating it was just drawn.
- **Dora tiles**: Subtle glow or highlight when the hint system is enabled.
- **Dangerous tiles**: Red tint when hint system identifies them as risky discards.
- **Tenpai indicator**: A small "ready" icon appears when your hand is one tile away from winning.

### Discard Pool (Center)

Each player's discards are shown in the center area, arranged in rows of six tiles:

- **Sideways tile**: Indicates the turn when riichi was declared.
- **Dimmed tile**: A tile that was claimed by another player (shown as a ghost for reference).
- **Highlighted tile**: The most recent discard, briefly highlighted before fading.

### Opponent Areas

Each opponent's area shows:
- **Face-down tiles**: The number of concealed tiles in their hand (shown as tile backs).
- **Open melds**: Any claimed melds, displayed face-up.
- **Score**: Their current point total.
- **Seat wind indicator**: Shows which wind they are assigned.
- **Character avatar**: The AI character's portrait and expression.
- **Status indicators**: Icons for riichi (if declared), tenpai (if known), or thinking.

### Action Buttons

Context-sensitive buttons appear when you have available actions:

| Button | When It Appears |
|--------|-----------------|
| **Chi** | An opponent to your left discards a tile completing a sequence in your hand. |
| **Pon** | Any opponent discards a tile matching a pair in your hand. |
| **Kan** | You can form a kong (various situations). |
| **Riichi** | You are tenpai with a closed hand and 1000+ points. |
| **Tsumo** | You draw a tile completing your winning hand. |
| **Ron** | An opponent discards a tile completing your winning hand. |
| **Skip** | Always available — decline all claims and let play continue. |

### Score Display

The score overlay (toggled with `S`) shows:
- All four players' current scores
- Score differential from the leader
- Placement (1st through 4th)
- Bonus counters (honba sticks)
- Riichi deposits on the table

---

## Settings Guide

### Game Settings

| Setting | Options | Description |
|---------|---------|-------------|
| **Difficulty** | Easy, Medium, Hard, Expert | Controls AI opponent skill level. Easy AI makes frequent mistakes; Expert AI plays near-optimally. |
| **Game Length** | East Only (Tonpuu), East-South (Hanchan) | East Only is ~30 minutes; East-South is ~60 minutes. |
| **Starting Points** | 25000 (default), 30000, custom | Each player's starting score. |
| **Red Fives** | On / Off | Whether red five tiles (0m, 0p, 0s) are included as automatic dora. |
| **Open Tanyao** | On / Off | Whether tanyao (all simples) is allowed with an open hand. On is standard in most modern rulesets. |
| **Multiple Ron** | On / Off | Whether multiple players can win on the same discard, or if head bump (atamahane) applies. |
| **Busting (Tobi)** | On / Off | Whether the game ends immediately when a player's score drops below zero. |
| **Flowers** | On / Off | Whether flower and season tiles are included (off by default for Riichi rules). |
| **Auto-Sort** | On / Off | Automatically sort your hand by suit after each draw. |
| **Confirm Discards** | On / Off | Require a second click to confirm discards (prevents misclicks). |

### Hint Settings

| Setting | Options | Description |
|---------|---------|-------------|
| **Hint Level** | Off, Basic, Standard, Detailed | Controls how much information hints provide. |
| **Discard Suggestions** | On / Off | Highlights recommended discards in your hand. |
| **Danger Indicators** | On / Off | Colors tiles red/yellow/green based on how safe they are to discard. |
| **Shanten Display** | On / Off | Shows your current shanten count. |
| **Tenpai Alert** | On / Off | Plays a notification when you reach tenpai. |
| **Waiting Tiles Display** | On / Off | Shows which tiles would complete your hand when tenpai. |
| **Opponent Threat Level** | On / Off | Shows a threat meter for each opponent based on their likely hand state. |

### Display Settings

| Setting | Options | Description |
|---------|---------|-------------|
| **Tile Style** | Classic, Modern, Minimalist, Pixel | Visual style of the tiles. |
| **Table Theme** | Green Felt, Wood, Dark, Custom | Background and table surface appearance. |
| **Camera Angle** | Top-Down, Angled, First-Person | Default viewing angle. |
| **Animation Speed** | Slow, Normal, Fast, Instant | Speed of tile movement and claim animations. |
| **Particle Effects** | On / Off | Visual effects for wins, riichi, etc. |
| **Resolution** | Various | Screen resolution (fullscreen and windowed). |
| **Colorblind Mode** | Off, Deuteranopia, Protanopia, Tritanopia | Adjusts colors for various types of color blindness. |

### Audio Settings

| Setting | Options | Description |
|---------|---------|-------------|
| **Master Volume** | 0-100 | Overall volume control. |
| **Music Volume** | 0-100 | Background music volume. |
| **SFX Volume** | 0-100 | Sound effects (tile clicks, claims, wins). |
| **Voice Volume** | 0-100 | AI character voice lines. |
| **Voice Language** | Japanese, Chinese, English | Language for AI character voice lines. |
| **Tile Sound** | Click, Clack, Soft, Ceramic | Sound when tiles are placed. |

### Chat and Tutor Settings

| Setting | Options | Description |
|---------|---------|-------------|
| **Chat Enabled** | On / Off | Whether the chat panel is available. |
| **AI Chat Personality** | Full, Moderate, Minimal | How chatty and expressive AI opponents are. |
| **Tutor Enabled** | On / Off | Whether the in-game tutor is available. |
| **Tutor Proactivity** | Passive, Moderate, Active | How often the tutor offers unsolicited advice. Passive = only when asked. Active = comments on every turn. |
| **LLM Model** | Default, Custom | Which language model powers the tutor and AI chat. Custom allows connecting to a local or third-party LLM. |
| **LLM API Key** | Text field | API key for custom LLM providers (if using a third-party LLM). |
| **LLM Temperature** | 0.0 - 1.0 | Controls creativity/randomness of LLM responses. Lower = more consistent, higher = more varied. |

### Speed Settings

| Setting | Options | Description |
|---------|---------|-------------|
| **AI Think Time** | Instant, Fast, Normal, Slow | How long AI opponents take to make decisions. |
| **Claim Window** | Short (2s), Normal (5s), Long (10s), Manual | How long you have to decide whether to claim a discard. |
| **Auto-Win** | On / Off | Automatically declare win when a winning tile is available (no confirmation needed). |
| **Auto-Draw** | On / Off | Automatically draw from the wall when it is your turn (skips the draw animation). |

---

## Features Guide

### AI Characters

The game features distinct AI opponents, each with a unique personality and play style.

#### Default Characters

**Mei (梅)**
- **Background**: A patient teacher from Beijing who learned Mahjong from her grandmother.
- **Play Style**: Balanced and methodical. Mei plays fundamentally sound Mahjong with a slight preference for closed-hand play. She rarely makes mistakes on easy and medium difficulty.
- **Chat Personality**: Warm and encouraging. She offers congratulations when you play well and gentle corrections when you make mistakes.
- **Difficulty Range**: Easy to Hard.

**Kenji (健二)**
- **Background**: A competitive university student from Osaka who plays in amateur tournaments.
- **Play Style**: Aggressive and speed-oriented. Kenji pushes for quick wins and riichi declarations. He takes risks that sometimes pay off spectacularly and sometimes backfire.
- **Chat Personality**: Competitive and energetic. He trash-talks playfully and gets visibly frustrated when losing.
- **Difficulty Range**: Medium to Expert.

**Yuki (雪)**
- **Background**: A quiet, analytical retired actuary from Sapporo who treats Mahjong as a mathematical puzzle.
- **Play Style**: Defensive and value-focused. Yuki folds frequently, waits for high-value hands, and plays extremely safe tiles. Her discard pools are textbook-clean.
- **Chat Personality**: Quiet and precise. She speaks rarely but offers insightful observations about probability and expected value.
- **Difficulty Range**: Medium to Expert.

#### Unlockable Characters

Additional characters can be unlocked through campaign progression, achievements, or the shop:

| Character | Unlock Method | Play Style |
|-----------|--------------|------------|
| **Ryou** | Complete East Wind Campaign | All-or-nothing gambler; goes for big hands or folds |
| **Lian** | Reach Gold rank in Tournament | Master of open-hand play and fast wins |
| **Hana** | Win 50 games | Tricky and unpredictable; varies strategy every game |
| **Professor Tanaka** | Complete all tutorials | Textbook-perfect play; the hardest AI opponent |
| **Grandma Chen** | Win a Daily Challenge streak of 7 | Old-school Chinese style; loves flowers and dragons |
| **Bot-9000** | Find the hidden easter egg | Optimal AI based on statistical analysis; no personality |

### Chat and Tutor

#### Chatting with AI Opponents

During a game, press `T` or click the Chat button to open the chat panel. You can:

- Send text messages to AI opponents (they respond in character).
- React to specific plays with emoji reactions.
- Ask opponents about their strategy (they may or may not reveal, depending on personality).

AI chat responses are generated by the integrated language model and reflect each character's personality. Conversations persist throughout the game and characters remember earlier exchanges.

#### The Tutor

The tutor is an AI-powered coaching system you can ask questions at any time during a game:

**What the tutor can help with:**
- "What should I discard?" — Suggests the best discard with explanation.
- "Am I tenpai?" — Confirms your tenpai status and lists waiting tiles.
- "Is this tile safe?" — Evaluates the safety of a specific discard.
- "What yaku do I have?" — Lists all yaku your current hand qualifies for.
- "Explain [any rule]" — Provides a clear explanation of any Mahjong rule.
- "What is that opponent doing?" — Analyzes an opponent's likely hand based on their discards and open melds.
- "Should I declare riichi?" — Evaluates whether riichi is advisable given the current situation.
- "Why did I lose?" — After a hand, explains what happened and what you could have done differently.

**Tutor proactivity levels:**
- **Passive**: Only responds when you ask a question.
- **Moderate**: Occasionally highlights important moments (reaching tenpai, dangerous situations).
- **Active**: Comments on every turn with suggestions and warnings. Best for beginners learning the game.

### Hint System

The hint system provides visual cues during gameplay. Hint levels:

| Level | What It Shows |
|-------|--------------|
| **Off** | No hints. Play on your own knowledge. |
| **Basic** | Highlights when you are tenpai. Shows when a win is available. |
| **Standard** | Basic + discard suggestions (best tile highlighted in green), danger indicators on risky tiles (red/yellow), shanten count. |
| **Detailed** | Standard + waiting tile list, exact tile acceptance counts for each discard option, opponent threat meters, full safety ratings for every tile. |

### Practice Mode

Practice mode offers focused drills for specific skills:

#### Puzzle Types

| Puzzle | Description |
|--------|-------------|
| **Tenpai Recognition** | Given a hand, identify if it is tenpai and which tiles complete it. Timed challenges for speed. |
| **Best Discard** | Given a hand, choose the optimal discard. Scored against AI-optimal play. |
| **Defense Drill** | Given a game state with a riichi opponent, find the safest discard sequence. |
| **Scoring Quiz** | Given a completed hand, calculate the score (han and fu). |
| **Meld Recognition** | Identify valid melds quickly. Speed drill. |
| **Shanten Counter** | Given a hand, determine the shanten count. |
| **Wait Type ID** | Identify the wait type (ryanmen, kanchan, penchan, shanpon, tanki) for tenpai hands. |
| **Claim or Pass** | Decide whether to claim a discard or pass, given your hand and the game state. |

#### How to Use Practice Mode

1. Select a puzzle type from the Practice menu.
2. Choose difficulty (which affects the complexity of the hands presented).
3. Complete puzzles at your own pace or in timed mode.
4. Review your answers and see explanations for optimal choices.
5. Track your accuracy and speed over time in the statistics panel.

### Achievements

Achievements track your milestones and accomplishments.

#### Achievement Categories

**Beginner Milestones**

| Achievement | Requirement |
|-------------|-------------|
| First Steps | Complete the tutorial |
| First Blood | Win your first hand |
| First Victory | Win your first game (finish in 1st place) |
| Open for Business | Claim your first chow, pong, or kong |
| Ready! | Declare riichi for the first time |
| Self-Made | Win by tsumo for the first time |

**Scoring Achievements**

| Achievement | Requirement |
|-------------|-------------|
| Mangan! | Win a mangan-level hand (5 han) |
| Haneman! | Win a haneman-level hand (6-7 han) |
| Baiman! | Win a baiman-level hand (8-10 han) |
| Sanbaiman! | Win a sanbaiman-level hand (11-12 han) |
| Yakuman! | Win a yakuman-level hand (13+ han or limit hand) |
| Double Yakuman | Win a double yakuman hand |
| Dora Master | Win a hand with 5+ dora tiles |
| Ippatsu Artist | Win 10 hands by ippatsu |
| Tsumo King | Win 50 hands by tsumo |
| Ron Collector | Win 50 hands by ron |

**Strategic Achievements**

| Achievement | Requirement |
|-------------|-------------|
| Iron Wall | Finish a game without dealing into any opponent (0 ron against you) |
| Speed Demon | Win a hand within the first 6 turns |
| Patient Master | Win a hand on the last possible tile draw |
| Kong Lord | Declare 3 kongs in a single hand |
| Seven Stars | Win with seven pairs (chiitoitsu) |
| Thirteen Wonders | Win with thirteen orphans (kokushi musou) |
| All Green | Win with all green (ryuuiisou) |
| Flush Master | Win with chinitsu (full flush) 10 times |
| Dealer Streak | Win 3 consecutive hands as dealer |

**Social Achievements**

| Achievement | Requirement |
|-------------|-------------|
| Chatty | Send 100 chat messages |
| Good Sport | Congratulate an opponent on their win 10 times |
| Student | Ask the tutor 50 questions |
| Scholar | Complete all practice puzzles |

**Collection Achievements**

| Achievement | Requirement |
|-------------|-------------|
| All Characters | Unlock all AI characters |
| All Venues | Unlock all game venues |
| Tile Artist | Create a custom tile set in the editor |
| Photographer | Take 25 screenshots |
| Historian | Review 50 replays |

### Daily Challenges

Every day at midnight (local time), a new daily challenge is posted:

- **Challenge format**: A specific game scenario with particular conditions (e.g., "Win a mangan hand," "Finish without dealing in," "Score at least 40,000 points").
- **Leaderboard**: Complete the challenge and see how your performance compares to other players.
- **Streaks**: Complete challenges on consecutive days to build a streak. Streaks of 7 and 30 days unlock rewards.
- **Rewards**: Each completed challenge awards coins. High-ranking completions award bonus coins.

### Campaigns

Campaigns are story-driven series of games with narrative elements, special rules, and progressive difficulty.

#### East Wind Campaign (Beginner)

Follow Mei as she teaches you the fundamentals of Mahjong. Ten games introducing core mechanics one at a time. Each game focuses on a specific lesson (forming melds, claiming tiles, riichi, defense, etc.).

#### South Wind Campaign (Intermediate)

Join Kenji in a local amateur tournament. Fifteen games with increasingly skilled opponents and situation-specific objectives (come from behind, protect a lead, deal with aggressive opponents).

#### West Wind Campaign (Advanced)

Accompany Yuki through a professional qualifier. Twenty games featuring expert-level play, complex scoring situations, and advanced strategic concepts.

#### North Wind Campaign (Expert)

Face the toughest AI opponents in a world championship setting. The final campaign tests every skill you have learned. Completing this unlocks the "Professor Tanaka" character.

### Character Quests

Each AI character has a personal quest line that unlocks through playing games with them:

- **Mei's Quest**: "The Grandmother's Tiles" — Learn about Mei's family history through Mahjong.
- **Kenji's Quest**: "Tournament Road" — Help Kenji prepare for the national championship.
- **Yuki's Quest**: "The Probability of Memory" — Discover why Yuki turned to Mahjong after retirement.
- **Ryou's Quest**: "All or Nothing" — A high-stakes journey through underground Mahjong.
- **Lian's Quest**: "Bridge Between Worlds" — Lian explores the differences between Chinese and Japanese Mahjong.

### Tournaments

Tournament mode offers bracket-style competition:

- **Format**: Single elimination or Swiss-system brackets.
- **Bracket sizes**: 8, 16, or 32 participants (you + AI opponents).
- **Rounds**: Each match is a full hanchan (East-South game).
- **Advancement**: Top 2 of each 4-player match advance.
- **Prizes**: Coins and exclusive unlockables for reaching different stages.
- **Difficulty scales**: Tournament AI difficulty increases in later rounds.

### Replay System

Every game is automatically recorded and can be reviewed later.

#### Recording

- All games are saved automatically to your replay library.
- Replays include every draw, discard, claim, and declaration.
- Replays are stored locally and can be exported as files.

#### Reviewing

- Open the Replay Browser (`Ctrl+R`) to browse your saved games.
- Playback controls: Play, Pause, Step Forward, Step Back, Speed Up, Slow Down.
- **Hidden information toggle**: Choose to see all players' hands (review mode) or only your perspective (experience mode).
- **AI analysis overlay**: Enable NAGA-style analysis to see the AI evaluation of every decision.
- **Bookmark moments**: Mark specific turns for easy reference.
- **Annotate**: Add text notes to specific turns.

#### Sharing

- Export replays as `.mjr` files to share with friends.
- Import `.mjr` files from other players.
- Share replays to the community gallery (requires online connection).

### Screenshot and Photo Album

- **Take a screenshot**: Press `F11` at any time.
- **Screenshot formats**: PNG (default), JPG, or WebP.
- **Photo Album**: Browse all your screenshots in a gallery view.
- **Auto-capture**: Optionally auto-capture on every winning hand.
- **Share**: Export screenshots or share directly to social media.

### Venues

Venues are unlockable environments that change the visual setting of your game:

| Venue | Description | Unlock |
|-------|-------------|--------|
| **Classic Room** | Traditional green-felt table in a simple room. | Default |
| **Mei's Home** | Cozy Chinese living room with family photos. | Complete Mei's campaign quest. |
| **Tournament Hall** | Formal competition setting with spectator seating. | Enter your first tournament. |
| **Rooftop Garden** | Outdoor setting with city skyline at sunset. | Win 25 games. |
| **Kenji's Dorm** | Cluttered university dorm with anime posters. | Complete Kenji's quest. |
| **Mountain Temple** | Serene Japanese temple in the mountains. | Win 100 games. |
| **Neon Parlor** | Vibrant neon-lit Mahjong parlor in a nightlife district. | Win a tournament. |
| **Seaside Pavilion** | Open-air pavilion on a tropical beach. | Achieve a 30-day daily challenge streak. |
| **Yuki's Study** | Elegant home library with mathematical diagrams. | Complete Yuki's quest. |
| **The Void** | Abstract, minimalist space with floating tiles. | Unlock all other venues. |

### Economy and Shop

#### Earning Coins

| Activity | Coins Earned |
|----------|-------------|
| Winning a game (1st place) | 500 |
| Finishing 2nd | 200 |
| Finishing 3rd | 100 |
| Winning a hand with mangan+ | 50 bonus |
| Completing a daily challenge | 300 |
| Daily challenge streak bonus (7 days) | 1,000 |
| Completing a campaign chapter | 750 |
| Unlocking an achievement | 100-500 |
| Tournament prize (varies by stage reached) | 500-5,000 |

#### Spending Coins

| Item | Cost | Description |
|------|------|-------------|
| Tile set skins | 500-2,000 | Different visual styles for tiles |
| Table themes | 500-1,500 | Custom table surface designs |
| Character outfits | 1,000-3,000 | Alternate outfits for AI characters |
| Venue unlocks (some) | 2,000-5,000 | Some venues can be purchased instead of earned |
| Avatar frames | 300-800 | Decorative frames for your player avatar |
| Emote packs | 500 | Additional emotes for the chat system |
| Music packs | 1,000 | Additional background music tracks |

### Spectator Mode

Watch AI opponents play a complete game without your participation:

- Choose 4 AI characters to watch.
- Select the difficulty/skill level for the match.
- Full playback controls (speed up, slow down, pause).
- Hidden information toggle: watch with all hands visible or hidden.
- Great for learning by watching high-level AI play.
- AI analysis overlay available during spectating.

### Hand History

The hand history tracks every hand you have won throughout your career:

- Filter by yaku, han level, date, or opponent.
- View detailed breakdowns of each winning hand.
- Statistics: most common yaku, average han, win rate by position.
- Export hand history as a spreadsheet.

### Leaderboards

Seasonal leaderboards rank players based on performance:

- **Seasons**: Each season lasts one month.
- **Ranking criteria**: Average placement across games played (minimum 20 games per season).
- **Tiers**: Bronze, Silver, Gold, Platinum, Diamond, Master.
- **Rewards**: End-of-season rewards based on final tier (coins, exclusive items).

### Tile Editor

Create custom tile designs:

- **Template system**: Start from existing tile art and modify.
- **Drawing tools**: Pencil, fill, shapes, text overlay.
- **Import images**: Use external images as tile faces.
- **Preview**: See your custom tiles on a real game board before saving.
- **Share**: Export tile sets for other players to use.

### Mod System

The game supports community modifications:

- **Custom rule sets**: Create and share house rules.
- **Custom AI personalities**: Design AI character behaviors and chat personalities.
- **Custom scenarios**: Build specific game situations for practice or puzzles.
- **Mod browser**: Browse and install community-created mods.
- **Mod format**: Mods use JSON configuration files and optional image assets.
- **Mod compatibility**: The game validates mods for compatibility before loading.

### Multiplayer

Play against other human players online:

- **Quick Match**: Automatically matched with players of similar skill.
- **Private Room**: Create a room with a code and invite friends.
- **Ranked Play**: Competitive ladder with ELO-based matchmaking.
- **Casual Play**: Unranked games for practice and fun.
- **Chat**: In-game text chat with other human players.
- **Friend List**: Add friends and see when they are online.
- **Anti-cheat**: Server-side validation prevents cheating in multiplayer games.

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| **Game is slow or laggy** | Lower display settings (resolution, particle effects). Close other applications. Check that your system meets minimum requirements. |
| **Tiles are hard to read** | Try a different tile style in Display Settings. Enable colorblind mode if colors are the issue. Increase zoom level. |
| **Cannot claim a discard** | Check if the claim window has passed (increase claim window time in settings). Verify that you have the correct tiles for the claim. Remember: chow is only from the player to your left. |
| **Won hand not accepted** | Your hand may lack a yaku. Enable hints to see your available yaku. Review the yaku requirements in the Rulebook. |
| **Cannot declare riichi** | Verify: closed hand (no open melds)? Tenpai? At least 1000 points? At least 4 tiles remaining in the wall? |
| **AI opponents seem too easy/hard** | Adjust the difficulty in settings. Different AI characters also have different skill ceilings. |
| **Sound not working** | Check master volume in settings. Check system volume. Verify audio output device. |
| **Replay file won't load** | Ensure the replay file was created with a compatible game version. Try updating the game. |
| **Multiplayer connection failed** | Check your internet connection. Verify that your firewall allows the game. Try restarting the game. |
| **Chat/tutor not responding** | Check that chat/tutor is enabled in settings. If using a custom LLM, verify the API key and endpoint. |
| **Game crashes on startup** | Verify system requirements. Update graphics drivers. Try deleting the settings file to reset to defaults (located in the game's config directory). |
| **Save data lost** | Save data is stored locally. Check backup folder. Cloud sync (if enabled) may have a recent copy. |

### Performance Tips

- Close unnecessary background applications.
- Set animation speed to "Fast" or "Instant" for smoother play.
- Disable particle effects if your system struggles.
- Lower the resolution if frame rate is an issue.
- On laptops, ensure you are using the dedicated GPU (not integrated graphics).

---

## Accessibility

### Visual Accessibility

- **Colorblind modes**: Three colorblind presets (deuteranopia, protanopia, tritanopia) adjust the color palette throughout the game.
- **High contrast mode**: Increases contrast between tiles, background, and UI elements.
- **Large text mode**: Scales all UI text to a larger size.
- **Tile number overlay**: Always displays a large number on every suited tile, regardless of tile style.
- **Zoom controls**: Freely adjust zoom level for the tile display.

### Auditory Accessibility

- **Visual turn indicator**: A flashing border or icon indicates whose turn it is, supplementing audio cues.
- **Subtitle system**: All voice lines and sound-based notifications have text equivalents.
- **Vibration feedback**: On supported devices, haptic feedback supplements audio cues for claims, wins, and riichi.

### Motor Accessibility

- **Full keyboard control**: Every action can be performed with keyboard alone.
- **Customizable key bindings**: Remap any keyboard shortcut.
- **Extended timers**: Claim windows and turn timers can be set very long or to manual (no time pressure).
- **Auto-discard**: The game can auto-discard for you based on AI suggestion (accessibility mode).
- **Single-click mode**: All actions require only single clicks (no drag required).

### Cognitive Accessibility

- **Hint system**: Multiple levels of hints, from gentle reminders to full AI guidance.
- **Tutor**: Ask questions in natural language at any time.
- **Slow mode**: Slow down all animations and transitions.
- **Turn recap**: Optional text summary of what happened each turn.
- **Undo in practice**: Practice mode allows undo to help learning without frustration.

---

## Languages

The game supports the following languages:

| Language | Interface | Voice | Tile Notation |
|----------|-----------|-------|---------------|
| English | Full | Yes | Western (1m, 2p, etc.) |
| Japanese | Full | Yes | Japanese (一萬, 二筒, etc.) |
| Chinese (Simplified) | Full | Yes | Chinese (一万, 二筒, etc.) |
| Chinese (Traditional) | Full | Yes | Chinese (一萬, 二筒, etc.) |
| Korean | Full | Yes | Korean |
| French | Full | No | Western |
| German | Full | No | Western |
| Spanish | Full | No | Western |
| Portuguese | Full | No | Western |
| Russian | Full | No | Western |
| Thai | Interface only | No | Western |
| Vietnamese | Interface only | No | Western |
| Indonesian | Interface only | No | Western |

### Changing Language

1. Go to **Settings > General > Language**.
2. Select your preferred language.
3. Restart the game for all changes to take effect.

Tile notation style can be changed independently of the interface language: go to **Settings > Display > Tile Notation** and select Western or regional format.

---

*For additional help, use the in-game tutor (`T` key) or visit the community forums. The tutor can answer most questions about rules, strategy, and game features in natural language.*
