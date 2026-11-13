"""Regression test: the PWA (service worker + manifest) must work when the game is served from a sub-path
(e.g. https://gddickinson.github.io/table_games/game/), not only from the domain root.

Before the fix, js/service-worker-register.js registered '/sw.js' and sw.js pre-cached '/css/main.css' etc.: under a
sub-path the registration hit a 404 (console error) and, at the root, the absolute list could not be resolved
relative to the worker. Paths must be relative, and every pre-cached file must exist (one missing file makes
cache.addAll reject, so the worker never installs).

Run: python -m pytest -q tests/test_pwa_paths.py
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def _assets():
    return re.findall(r"'([^']+)'", (ROOT / "sw.js").read_text().split("const ASSETS = [", 1)[1].split("];", 1)[0])


def test_service_worker_registered_relative():
    src = (ROOT / "js" / "service-worker-register.js").read_text()
    assert re.search(r"\.register\('(\./)?sw\.js'\)", src), "register sw.js relative to the page"


def test_precached_assets_relative_and_present():
    assets = _assets()
    assert assets, "ASSETS list not found in sw.js"
    for a in assets:
        assert not a.startswith("/"), f"absolute path in sw.js: {a}"
        if a in ("./", ""):
            continue
        assert (ROOT / a.removeprefix("./")).is_file(), f"sw.js pre-caches a missing file: {a}"


def test_manifest_start_url_relative():
    m = json.loads((ROOT / "manifest.json").read_text())
    assert not m["start_url"].startswith("/")
