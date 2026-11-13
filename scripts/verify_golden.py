#!/usr/bin/env python3
"""Run the golden questions against a live API (default: local) and print pass/abstain/fail counts.

Usage: python scripts/verify_golden.py [--api https://...] [--limit N] [--ids G001,G044]
Uses only the standard library. Sends no API keys.
"""
import argparse
import json
import sys
import time
import unicodedata
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps" / "api" / "tests"))
from test_golden import QS, check  # noqa: E402


def post(api: str, path: str, body: dict, timeout: float = 90) -> dict:
    req = urllib.request.Request(api.rstrip("/") + path, data=json.dumps(body).encode(), method="POST",
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read())


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--api", default="http://localhost:8000")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--ids", default="")
    a = ap.parse_args()
    items = [q for q in QS if not a.ids or q["id"] in a.ids.split(",")]
    if a.limit:
        items = items[: a.limit]
    res = {"pass": 0, "abstain_ok": 0, "fail": 0}
    for q in items:
        t = time.time()
        try:
            r = post(a.api, "/api/qa", {"question": q["question"]})
            errs = check(q, r)
        except Exception as e:  # noqa: BLE001
            errs, r = [f"{type(e).__name__}: {e}"], {}
        key = "fail" if errs else ("abstain_ok" if q["type"] == "abstain" else "pass")
        res[key] += 1
        ans = unicodedata.normalize("NFKC", (r.get("answer") or ""))[:110]
        print(f"{q['id']} {key.upper():10s} {time.time() - t:5.1f}s {'; '.join(errs) or ans}")
    print(json.dumps({"api": a.api, "total": len(items), **res}))
    return 1 if res["fail"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
