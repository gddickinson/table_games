"""Start the Table Game Simulator web app locally: python run_web.py [--port 8251]  ->  http://127.0.0.1:8251

The house shell is at /, the game itself at /game/.
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import uvicorn  # noqa: E402

if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--port", type=int, default=8251)
    ap.add_argument("--reload", action="store_true")
    a = ap.parse_args()
    print(f"Table Game Simulator web app on http://127.0.0.1:{a.port}  (game at /game/)")
    uvicorn.run("web.app:app", host="127.0.0.1", port=a.port, reload=a.reload)
