"""FastAPI web app for the Table Game Simulator: the house shell in static/, the real game at /game/, and a JSON API.

The game is the repo's own vanilla-JS front end (index.html, js/, css/, docs/), served unchanged at /game/ so it keeps
its own look; the shell around it (home, games, card lab, docs library, about) is the house web kit. Run with
`python run_web.py` (http://127.0.0.1:8251, local only). `scripts/build_static.py` exports every path in
STATIC_ENDPOINTS to JSON and copies the game and screenshots for the GitHub Pages site.
"""
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

from web import content

STATIC = Path(__file__).resolve().parent / "static"
ROOT = content.ROOT

app = FastAPI(title="Table Game Simulator")
app.mount("/static", StaticFiles(directory=STATIC), name="static")


@app.get("/", include_in_schema=False)
def index():
    return FileResponse(STATIC / "index.html")


def game_file(rel: str) -> Path:
    """Resolve a path under /game/ to a file of the game, or raise 404 (only the game's own files are served)."""
    rel = rel or "index.html"
    parts = Path(rel).parts
    ok = (rel in content.GAME_FILES or (len(parts) > 1 and parts[0] in content.GAME_DIRS)) \
        and ".." not in parts and Path(rel).name not in content.GAME_EXCLUDE \
        and not any(rel.startswith(d + "/") for d in content.GAME_EXCLUDE_DIRS)
    p = (ROOT / rel).resolve()
    if not ok or not p.is_file() or ROOT.resolve() not in p.parents:
        raise HTTPException(404, "not part of the game")
    return p


@app.get("/game", include_in_schema=False)
def game_redirect():
    return RedirectResponse("game/")


@app.get("/game/{rel:path}", include_in_schema=False)
def game(rel: str):
    return FileResponse(game_file(rel))


@app.get("/shots/{rel:path}", include_in_schema=False)
def shot(rel: str):
    if rel not in {s["file"] for s in content.SHOTS}:
        raise HTTPException(404, "unknown screenshot")
    return FileResponse(ROOT / rel)


@app.get("/api/info")
def info():
    """Counts for the home page, computed from the repo."""
    docs = content.docs_list()
    return {"title": "Table Game Simulator", "games": len(content.GAMES), "characters": len(content.CHARACTERS),
            "docs": len(docs), "doc_lines": sum(d["lines"] for d in docs), **content.code_counts()}


@app.get("/api/games")
def games():
    """The five games (intro-screen cards + README table), the core AI characters and the committed screenshots."""
    return {"games": content.GAMES, "characters": content.CHARACTERS, "shots": content.SHOTS}


@app.get("/api/docs")
def docs():
    """The Markdown documents in docs/ (the same files the in-game doc viewer opens)."""
    return content.docs_list()


@app.get("/api/docs/{slug}")
def one_doc(slug: str):
    d = content.doc(slug)
    if d is None:
        raise HTTPException(404, "no such document")
    return d


# GET paths (without the /api prefix) written to the static site as api/<path>.json.
STATIC_ENDPOINTS = ["/info", "/games", "/docs"] + [f"/docs/{d['slug']}" for d in content.docs_list()]
