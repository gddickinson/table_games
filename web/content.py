"""Facts for the web shell, all taken from the repo: README.md, js/intro-screen.js, docs/*.md and the source tree.

Nothing here is invented: game blurbs quote the README table and the intro-screen cards, character notes quote the
README, and counts are computed from the files at request time.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Files and folders that make up the game the browser runs (index.html loads js/ and css/; the doc viewer fetches docs/).
GAME_FILES = ["index.html", "manifest.json", "sw.js"]
GAME_DIRS = ["js", "css", "docs"]
# Never shipped with the game: the node test runner that lives in js/ (index.html does not load it).
GAME_EXCLUDE = {"test-modules.js"}
# docs/img holds this site's README screenshots (scripts/screenshots.py), not game content.
GAME_EXCLUDE_DIRS = {"docs/img"}

# Game cards: name/blurb/stats from js/intro-screen.js buildGameCard(...), description and AI from the README table.
GAMES = [
    {"id": "mahjong", "icon": "🀄", "name": "Mahjong", "blurb": "Classic Chinese tile game",
     "stats": {"Players": "4", "Type": "Tile Game", "AI": "Learning"},
     "description": "Chinese tile game with riichi, dora, flowers, furiten, 6 rule variants",
     "ai": "EV-based with shanten/ukeire efficiency, push/fold, score situation awareness",
     "shot": "screenshots-final/02_02_mahjong_board.png", "docs": ["rulebook", "tutorial", "strategy-guide", "history"]},
    {"id": "poker", "icon": "🃏", "name": "Texas Hold'em", "blurb": "Poker with AI opponents",
     "stats": {"Players": "4", "Type": "Card Game", "AI": "Learning v2"},
     "description": "Texas Hold'em with full betting (fold/check/call/raise/all-in)",
     "ai": "Monte Carlo hand strength, opponent modeling, multi-street planning, learning v2",
     "shot": "screenshots-final/15_15_poker_action.png", "docs": ["poker-rulebook", "poker-strategy"]},
    {"id": "blackjack", "icon": "🂡", "name": "Blackjack", "blurb": "Beat the dealer to 21",
     "stats": {"Players": "4 vs Dealer", "Type": "Card Game", "AI": "Basic Strategy"},
     "description": "6-deck shoe, hit/stand/double/split, 3:2 blackjack payout",
     "ai": "Basic strategy with personality deviations, adaptive thresholds, card counting (Mei)",
     "shot": "screenshots-final/17_17_blackjack_dealt.png", "docs": ["blackjack-rulebook", "blackjack-strategy"]},
    {"id": "dominoes", "icon": "🁣", "name": "Dominoes", "blurb": "Classic tile matching game",
     "stats": {"Players": "4", "Type": "Tile Game", "AI": "Learning"},
     "description": "Block dominoes (double-six), play on chain ends, 4 players",
     "ai": "Tile counting, blocking strategy, option-maximizing, personality-driven",
     "shot": "screenshots-allgames/16_dominoes_gameplay.png", "docs": ["dominoes-rulebook", "dominoes-strategy"]},
    {"id": "dragon", "icon": "🐉", "name": "Dragon's Lair", "blurb": "Full AD&D campaign adventure",
     "stats": {"Party": "6 Heroes", "Type": "RPG Campaign", "World": "8 Locations"},
     "description": ("Tactical turn-based RPG combat based on D&D 5th Edition rules: a party of 6 heroes fights an "
                     "Adult Red Dragon in its cave lair, inside a campaign across the realm of Willowmere "
                     "(docs/dragon-rulebook.md, docs/dragon-campaign.md)"),
     "ai": "Party AI and dragon AI; you control one hero and can order the others, or let Auto-Play run everything",
     "shot": None, "docs": ["dragon-rulebook", "dragon-campaign", "dragon-strategy"]},
]

# The three core AI characters, quoted from the README ("AI Characters").
CHARACTERS = [
    {"name": "Mei", "icon": "👩", "text": "Cautious data analyst from Osaka. Plays tight, calculates odds, rarely bluffs. "
     "Her cat Mochi makes occasional cameo appearances."},
    {"name": "Kenji", "icon": "👨", "text": "Ex-poker pro turned ramen shop owner. Aggressive, emotional, trash-talks "
     "lovingly. Tilts after losses but learns patience over time."},
    {"name": "Yuki", "icon": "👵", "text": "Retired literature professor. Plays to honor her late husband Takeshi. Wise, "
     "unflappable, quotes literature. Sees each game as a life lesson."},
]

# Screenshots committed in the repo (captions from the README headings), shown on the Games page.
SHOTS = [
    {"file": "screenshots-final/01_01_intro_screen.png", "caption": "Game selection screen"},
    {"file": "screenshots-final/04_04_mahjong_chat.png", "caption": "AI characters chatting"},
    {"file": "screenshots-final/21_21_mahjong_tutorial.png", "caption": "Interactive tutorial"},
] + [{"file": g["shot"], "caption": g["name"] + " gameplay"} for g in GAMES if g["shot"]]


def _title(text: str, fallback: str) -> str:
    m = re.search(r"^# (.+)$", text, re.M)
    return m.group(1).strip() if m else fallback


def docs_list():
    """Every Markdown document in docs/ with its title (first '# ' heading) and line count."""
    out = []
    for p in sorted((ROOT / "docs").glob("*.md")):
        text = p.read_text(encoding="utf-8")
        out.append({"slug": p.stem, "title": _title(text, p.stem), "lines": len(text.splitlines())})
    return out


def doc(slug: str):
    p = ROOT / "docs" / f"{slug}.md"
    if not re.fullmatch(r"[a-z0-9-]+", slug) or not p.is_file():
        return None
    text = p.read_text(encoding="utf-8")
    return {"slug": slug, "title": _title(text, slug), "markdown": text}


def game_js_files():
    return sorted(p for p in (ROOT / "js").rglob("*.js") if p.name not in GAME_EXCLUDE)


def code_counts():
    js = game_js_files()
    return {
        "js_modules": len(js),
        "js_lines": sum(p.read_text(encoding="utf-8").count("\n") for p in js),
        "css_files": len(list((ROOT / "css").glob("*.css"))),
        "scripts_in_index": len(re.findall(r'<script src="js/', (ROOT / "index.html").read_text(encoding="utf-8"))),
    }
