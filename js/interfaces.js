/**
 * MAHJONG GAME - MODULE INTERFACES
 * =================================
 * This file documents every public function across all modules.
 * Use this as a reference to find where functionality lives.
 * No implementation here — just contracts and documentation.
 *
 * Module Load Order:
 *   1. constants.js     - Game constants and tile definitions
 *   2. tile.js          - Tile creation and comparison
 *   3. wall.js          - Wall building and tile drawing
 *   4. hand.js          - Hand evaluation and meld detection
 *   5. scoring.js       - Score calculation
 *   6. player.js        - Player state management
 *   7. ai-engine.js     - Advanced AI: tile tracking, danger model, efficiency
 *   8. ai-learning.js   - Adaptive weight tuning (persistent across sessions)
 *   9. ai.js            - AI facade (delegates to ai-engine)
 *  10. stats.js          - Game statistics and monitoring
 *  11. claude-player.js  - Claude/external AI player interface
 *  12. headless.js       - Headless game runner (Node.js + browser)
 *  13. game-state.js     - Central game state
 *  14. game-flow.js      - Turn-by-turn game logic
 *  15. renderer.js       - Board and UI rendering
 *  16. tile-renderer.js  - Individual tile rendering
 *  17. input-handler.js  - Human player input
 *  13. tutorial.js      - Tutorial and help system
 *  14. sound.js         - Sound effects
 *  15. main.js          - Application bootstrap
 */

// ============================================================
// constants.js — window.MJ.Constants
// ============================================================
// SUITS            : { BAMBOO, CIRCLES, CHARACTERS, WIND, DRAGON }
// WINDS            : ['east', 'south', 'west', 'north']
// DRAGONS          : ['red', 'green', 'white']
// TILE_NAMES       : Map<string, string> — human-readable tile names
// GAME_PHASES      : { DEALING, DRAW, DISCARD, CLAIM, SCORING, GAME_OVER }
// MELD_TYPES       : { CHOW, PONG, KONG, CONCEALED_KONG, PAIR }
// CLAIM_TYPES      : { NONE, CHOW, PONG, KONG, WIN }
// SEAT_WINDS       : ['east', 'south', 'west', 'north']
// TILE_DEFS        : Array<{suit, rank}> — all 34 unique tile definitions
// AI_DELAY_MS      : number — milliseconds between AI actions
// AUTO_PLAY_DELAY  : number — delay when fully automated

// ============================================================
// tile.js — window.MJ.Tile
// ============================================================
// create(suit, rank)         : Tile — create a new tile object
// clone(tile)                : Tile — deep copy a tile
// equals(a, b)               : boolean — same suit and rank
// compare(a, b)              : number — sort comparator
// sortTiles(tiles)           : Tile[] — return sorted copy
// isSuited(tile)             : boolean — bamboo/circles/characters
// isHonor(tile)              : boolean — wind or dragon
// isTerminal(tile)           : boolean — rank 1 or 9 in suited
// isTerminalOrHonor(tile)    : boolean
// getId(tile)                : string — unique identifier "suit-rank"
// getDisplay(tile)           : string — unicode display character
// getName(tile)              : string — human-readable name

// ============================================================
// wall.js — window.MJ.Wall
// ============================================================
// create()                   : Wall — build and shuffle 136 tiles
// draw(wall)                 : Tile|null — draw from live wall
// drawFromEnd(wall)          : Tile|null — draw for kong replacement
// remaining(wall)            : number — tiles left in live wall
// isEmpty(wall)              : boolean

// ============================================================
// hand.js — window.MJ.Hand
// ============================================================
// create()                   : Hand — empty hand object
// addTile(hand, tile)        : void — add tile to concealed
// removeTile(hand, tile)     : boolean — remove from concealed
// addMeld(hand, meld)        : void — add open/concealed meld
// getTileCount(hand)         : number — concealed + melds total
// findChows(hand, tile)      : Tile[][] — possible chow combos with tile
// findPongs(hand, tile)      : Tile[][] — possible pong (if 2+ match)
// findKongs(hand, tile)      : Tile[][] — possible kong (if 3 match)
// findConcealedKongs(hand)   : Tile[][] — 4-of-a-kind in concealed
// canPromoteToKong(hand, tile): boolean — can add to existing pong
// isWinningHand(hand)        : boolean — 4 melds + 1 pair check
// getWinningDecompositions(hand): Decomposition[] — all valid groupings

// ============================================================
// scoring.js — window.MJ.Scoring
// ============================================================
// calculateScore(decomposition, context) : ScoreResult
//   context: { seatWind, roundWind, selfDrawn, lastTile, ... }
//   returns: { total, breakdown: [{name, points}] }
// getScoreBreakdown(scoreResult) : string — human-readable
// SCORING_RULES : Array<{name, check, points}> — all scoring patterns

// ============================================================
// player.js — window.MJ.Player
// ============================================================
// create(seatIndex, isHuman) : Player
// getSeatWind(player)        : string
// getDiscards(player)        : Tile[]
// addDiscard(player, tile)   : void
// getHand(player)            : Hand
// getScore(player)           : number
// setScore(player, score)    : void
// isDealer(player)           : boolean
// reset(player)              : void — clear hand/discards for new round

// ============================================================
// ai.js — window.MJ.AI
// ============================================================
// chooseDiscard(player, gameState)        : Tile — pick tile to discard
// shouldClaimChow(player, tile, gameState): Tile[]|null — claim or null
// shouldClaimPong(player, tile, gameState): boolean
// shouldClaimKong(player, tile, gameState): boolean
// shouldDeclareWin(player, gameState)     : boolean
// shouldDeclareKong(player, gameState)    : Tile[]|null
// evaluateHand(hand)                      : number — hand quality score
// getDangerRating(tile, gameState)        : number — 0-1 danger level

// ============================================================
// game-state.js — window.MJ.GameState
// ============================================================
// create()                   : GameState — initialize full game
// getPlayers(state)          : Player[]
// getCurrentPlayer(state)    : Player
// getCurrentPlayerIndex(state): number
// getPhase(state)            : string
// setPhase(state, phase)     : void
// getWall(state)             : Wall
// getRoundWind(state)        : string
// nextTurn(state)            : void — advance to next player
// isGameOver(state)          : boolean
// getDiscardPool(state)      : Tile[] — all discards from all players
// getRoundNumber(state)      : number
// getLog(state)              : string[] — action log entries
// addLog(state, message)     : void

// ============================================================
// game-flow.js — window.MJ.GameFlow
// ============================================================
// startGame(state)           : void — deal tiles and begin
// startRound(state)          : void — new round setup
// executeDraw(state)         : Tile|null — current player draws
// executeDiscard(state, tile): void — current player discards
// processClaims(state, tile) : ClaimResult — check all players
// executeChow(state, player, tiles) : void
// executePong(state, player, tile)  : void
// executeKong(state, player, tile)  : void
// declareWin(state, player, tile)   : ScoreResult
// checkDraw(state)           : boolean — wall exhausted
// runAITurn(state)           : Promise<void> — full AI turn cycle
// runAutoPlay(state)         : void — start autonomous play
// stopAutoPlay(state)        : void
// isAutoPlaying(state)       : boolean

// ============================================================
// renderer.js — window.MJ.Renderer
// ============================================================
// init(containerId)          : void — set up DOM structure
// renderBoard(state)         : void — full board redraw
// renderPlayerHand(player, isHuman) : void
// renderDiscards(state)      : void
// renderWallCount(wall)      : void
// renderScores(players)      : void
// renderCurrentTurn(state)   : void
// renderGameLog(state)       : void
// showMessage(text, duration): void — toast notification
// showClaimDialog(options)   : Promise<ClaimChoice>
// hideClaimDialog()          : void
// showWinScreen(result)      : void
// showDrawScreen()           : void
// highlightTile(element)     : void
// animateDiscard(tile, from) : Promise<void>
// animateDraw(to)            : Promise<void>
// updateLayout()             : void — responsive resize

// ============================================================
// tile-renderer.js — window.MJ.TileRenderer
// ============================================================
// createTileElement(tile, options) : HTMLElement
//   options: { faceDown, small, clickable, selected, highlighted }
// createMeldElement(meld)         : HTMLElement
// createDiscardElement(tile)      : HTMLElement
// updateTileState(element, state) : void
// getTileFromElement(element)     : Tile|null
// TILE_SYMBOLS : Map<string, string> — suit+rank → unicode char

// ============================================================
// input-handler.js — window.MJ.InputHandler
// ============================================================
// init(state, renderer)           : void
// enable()                        : void — accept human input
// disable()                       : void — block human input
// onTileClick(callback)           : void
// onClaimChoice(callback)         : void
// onSortToggle(callback)          : void
// waitForDiscard(hand)            : Promise<Tile>
// waitForClaimDecision(options)   : Promise<ClaimChoice>
// showAvailableActions(actions)   : void
// hideAvailableActions()          : void
// destroy()                       : void — remove all listeners

// ============================================================
// tutorial.js — window.MJ.Tutorial
// ============================================================
// init(renderer)                  : void
// start()                         : void — begin tutorial sequence
// showStep(stepIndex)             : void
// nextStep()                      : void
// prevStep()                      : void
// skip()                          : void — exit tutorial
// isActive()                      : boolean
// showHelp()                      : void — open help overlay
// hideHelp()                      : void
// highlightElement(selector)      : void — spotlight UI element
// TUTORIAL_STEPS : Array<{title, content, highlight, action}>
// HELP_SECTIONS  : Array<{title, content}>

// ============================================================
// sound.js — window.MJ.Sound
// ============================================================
// init()                          : void
// play(name)                      : void — play named sound
// setVolume(level)                : void — 0 to 1
// setMuted(muted)                 : void
// isMuted()                       : boolean
// SOUNDS : { DRAW, DISCARD, PONG, CHOW, KONG, WIN, CLICK, TURN }

// ============================================================
// main.js — window.MJ.Main
// ============================================================
// init()                          : void — boot entire application
// newGame()                       : void — start fresh game
// toggleAutoPlay()                : void
// toggleTutorial()                : void
// toggleHelp()                    : void
// toggleSound()                   : void
// getVersion()                    : string

// ============================================================
// ai-engine.js — window.MJ.AIEngine
// ============================================================
// class AIEngine(weights?)     : Advanced decision engine
//   .selectDiscard(player, state) : Tile — pick best discard
//   .shouldClaimMeld(player, tile, type, state) : boolean
//   .getDecisionLog()           : Array — detailed decision history
//   .clearDecisionLog()         : void
//   .weights                    : Object — tunable weight vector
// class TileTracker             : Track all visible tiles
//   .reset()                    : void
//   .buildFromState(state, myIdx): void — rebuild from game state
//   .getRemainingCount(tileIdx) : number
//   .getTotalUnseen()           : number
// class DangerModel(tracker)    : Estimate discard danger
//   .estimateDanger(tileIdx, oppIdx, turnCount) : number 0-1
//   .getMaxDanger(tileIdx, myIdx, turnCount)    : number 0-1
//   .isSujiSafe(tileIdx, oppIdx)  : boolean
//   .isKabe(tileIdx)              : boolean
//   .isNoChance(tileIdx)          : boolean
//   .estimateTenpaiProb(oppIdx, turnCount) : number 0-1
// tileToIndex(tile)             : number — tile to compact index 0-33
// indexToTileDef(idx)           : {suit, rank}
// handToCompact(hand)           : Uint8Array(34) — count per kind
// calcShantenCompact(compact, meldCount) : number
// calcUkeire(compact, meldCount, tracker) : {total, tiles, shanten}
// estimateHandValue(compact, melds, seatWind, roundWind) : number

// ============================================================
// ai-learning.js — window.MJ.Learning
// ============================================================
// class LearningSystem           : Persistent adaptive learning
//   .getWeights()                : Object — current weight vector
//   .recordRoundResult(result)   : void — log round outcome
//   .updateWeights()             : Object|null — run learning update
//   .updateDangerTable(data)     : void — update empirical danger
//   .getDangerTable()            : Object
//   .getGameHistory()            : Array — all past epochs
//   .getStats()                  : Object — full learning state
//   .reset()                     : void — clear all and restart
//   .save()                      : void — persist to disk/localStorage
//   Persistence: browser=localStorage, Node.js=data/*.json

// ============================================================
// stats.js — window.MJ.Stats
// ============================================================
// class GameStats                : Game statistics tracker
//   .reset()                     : void
//   .startRound()                : void — mark round start time
//   .recordRoundEnd(state)       : Object — record results
//   .recordMeldClaim(playerIdx, type) : void
//   .recordShanten(playerIdx, n) : void
//   .getSummary()                : Object — full stats summary
//   .getCSV()                    : string — CSV export of rounds
//   .formatReport()              : string — formatted text report

// ============================================================
// claude-player.js — window.MJ.ClaudePlayer
// ============================================================
// class ClaudePlayer(seatIndex)  : Claude AI player adapter
//   .makeDecision(action, player, state, extraTile) : varies
//   .formatStateForClaude(player, state) : string — text state
//   .setStrategy(strategy)       : void — balanced|aggressive|defensive
//   .getDecisionHistory()        : Array
//   .getDecisionSummary()        : Object
//   .clearHistory()              : void
// createClaudeCallback(claudePlayer) : Function — for HeadlessGame

// ============================================================
// headless.js — window.MJ.Headless
// ============================================================
// class HeadlessGame(options)    : Headless game runner
//   options: { verbose, playerTypes, claudeCallback, maxRounds }
//   playerTypes: ['ai'|'claude'|'human', ...]
//   .init(stats, learning)       : void — set up engines
//   .runRound(roundNum)          : Object — run single round
//   .runGame()                   : {results, log} — run full game
//   .runTournament(numGames)     : Array — run N games
//   .log                         : string[] — action log
//
// CLI: node run-headless.js [options]
//   --games N          Run N games (default: 4)
//   --tournament N     Run N-game tournament
//   --verbose          Show per-turn output
//   --claude SEAT      Claude plays at seat 0-3
//   --strategy STR     balanced|aggressive|defensive
//   --learning         Enable persistent adaptive learning

console.log('[Mahjong] Interfaces loaded — reference only, no executable code.');
