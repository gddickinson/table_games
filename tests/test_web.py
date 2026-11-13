"""Web interface tests: every exported endpoint answers, the static build is complete, and the JS engine tests pass.

Run: python -m pytest -q tests/test_web.py
"""
import shutil
import subprocess
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from web.app import STATIC, STATIC_ENDPOINTS, app  # noqa: E402

client = TestClient(app)


def test_index_served():
    r = client.get("/")
    assert r.status_code == 200 and "static/main.js" in r.text


@pytest.mark.parametrize("path", STATIC_ENDPOINTS)
def test_endpoint(path):
    r = client.get("/api" + path)
    assert r.status_code == 200, r.text
    assert r.json() is not None


def test_static_build(tmp_path):
    sys.path.insert(0, str(ROOT / "scripts"))
    import build_static
    build_static.build(tmp_path / "site")
    assert (tmp_path / "site" / "index.html").read_text().count("APP_STATIC") == 1
    for path in STATIC_ENDPOINTS:
        assert (tmp_path / "site" / "api" / (path.strip("/") + ".json")).exists()


def test_static_assets_referenced_exist():
    html = (STATIC / "index.html").read_text()
    for name in ("style.css", "main.js"):
        assert f"static/{name}" in html and (STATIC / name).exists()


@pytest.mark.skipif(not shutil.which("node"), reason="node not installed")
def test_js_engine():
    tests = sorted(STATIC.glob("*.test.mjs"))
    for t in tests:
        r = subprocess.run(["node", str(t)], capture_output=True, text=True)
        assert r.returncode == 0, r.stdout + r.stderr


# --- project-specific -----------------------------------------------------------------------------------------------
from web import content  # noqa: E402


def test_game_served_unchanged():
    r = client.get("/game/")
    assert r.status_code == 200 and r.text == (ROOT / "index.html").read_text()
    for path in ("js/main.js", "js/poker/hand-eval.js", "css/main.css", "docs/rulebook.md", "sw.js", "manifest.json"):
        assert client.get("/game/" + path).status_code == 200, path


def test_every_script_in_game_index_is_served():
    import re
    for src in re.findall(r'<script src="([^"]+)"', (ROOT / "index.html").read_text()):
        assert client.get("/game/" + src).status_code == 200, src


@pytest.mark.parametrize("path", ["/game/.git/config", "/game/node_modules/puppeteer/package.json", "/game/README.md",
                                  "/game/js/test-modules.js", "/game/js/../README.md", "/game/server/app.js",
                                  "/shots/screenshots/01_01_game_loaded.png", "/game/docs/img/home.png"])
def test_only_game_files_served(path):
    assert client.get(path).status_code == 404


def test_api_facts_from_repo():
    info = client.get("/api/info").json()
    assert info["games"] == 5 and info["docs"] == len(list((ROOT / "docs").glob("*.md")))
    assert info["js_modules"] == len(list((ROOT / "js").rglob("*.js"))) - 1  # minus js/test-modules.js
    games = client.get("/api/games").json()
    ids = [g["id"] for g in games["games"]]
    intro = (ROOT / "js" / "intro-screen.js").read_text()
    assert all(f"buildGameCard('{i}'" in intro for i in ids)  # every game is a real intro-screen card
    readme = (ROOT / "README.md").read_text()
    assert all(c["text"] in readme for c in games["characters"])  # character notes quoted from the README
    for g in games["games"]:
        assert g["blurb"] in intro
        if g["id"] != "dragon":
            assert g["description"] in readme and g["ai"] in readme
    for s in games["shots"]:
        assert client.get("/shots/" + s["file"]).status_code == 200


def test_doc_endpoint_and_404():
    d = client.get("/api/docs/rulebook").json()
    assert d["title"] == "Mahjong Rulebook" and d["markdown"].startswith("# Mahjong Rulebook")
    assert client.get("/api/docs/nope").status_code == 404
    assert client.get("/api/docs/..%2FREADME").status_code == 404


def test_static_build_contains_game(tmp_path):
    sys.path.insert(0, str(ROOT / "scripts"))
    import build_static
    build_static.build(tmp_path / "site")
    game = tmp_path / "site" / "game"
    assert (game / "index.html").read_text() == (ROOT / "index.html").read_text()
    assert (game / "js" / "poker" / "hand-eval.js").exists() and not (game / "js" / "test-modules.js").exists()
    assert not (tmp_path / "site" / "node_modules").exists() and not (game / "docs" / "img").exists()
    for s in content.SHOTS:
        assert (tmp_path / "site" / "shots" / s["file"]).exists()
