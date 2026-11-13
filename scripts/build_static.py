"""Export the static site (default: site/) for GitHub Pages.

Every API response is produced by calling the real FastAPI app through its TestClient, so the static site shows exactly
what the server would. Paths come from STATIC_ENDPOINTS in the web app module; anything that needs Python at request
time is answered in the browser by static_api.js or shows a "needs the local app" notice.

The game itself (index.html, js/, css/, docs/, manifest.json, sw.js) is copied unchanged to site/game/ and the
committed screenshots used by the Games page to site/shots/.

Run: python scripts/build_static.py [--out site]
"""
import argparse
import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from fastapi.testclient import TestClient  # noqa: E402

from web import content  # noqa: E402
from web.app import STATIC, STATIC_ENDPOINTS, app  # noqa: E402


def copy_game(out: Path) -> None:
    """The real game, unchanged, at site/game/ (only its own files: no node_modules, tests or screenshots)."""
    game = out / "game"
    for name in content.GAME_FILES:
        game.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT / name, game / name)
    for d in content.GAME_DIRS:
        shutil.copytree(ROOT / d, game / d, ignore=shutil.ignore_patterns(*content.GAME_EXCLUDE, ".DS_Store"))
    for d in content.GAME_EXCLUDE_DIRS:
        shutil.rmtree(game / d, ignore_errors=True)
    for s in content.SHOTS:
        dest = out / "shots" / s["file"]
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT / s["file"], dest)


def build(out: Path) -> int:
    if out.exists():
        shutil.rmtree(out)
    shutil.copytree(STATIC, out / "static", ignore=shutil.ignore_patterns("*.test.mjs", "package.json"))
    client = TestClient(app)
    for path in STATIC_ENDPOINTS:
        r = client.get("/api" + path)
        r.raise_for_status()
        dest = out / "api" / (path.strip("/") + ".json")
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(json.dumps(r.json(), ensure_ascii=False, separators=(",", ":")))
    index = (STATIC / "index.html").read_text()
    index = index.replace("<head>", "<head>\n<script>window.APP_STATIC = true;</script>", 1)
    (out / "index.html").write_text(index)
    (out / ".nojekyll").write_text("")
    copy_game(out)
    return len(STATIC_ENDPOINTS)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(ROOT / "site"))
    out = Path(ap.parse_args().out)
    n = build(out)
    size = sum(f.stat().st_size for f in out.rglob("*") if f.is_file()) / 1e6
    print(f"static site: {n} API files, {size:.1f} MB in {out}")


if __name__ == "__main__":
    main()
