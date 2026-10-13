#!/usr/bin/env python3
"""
Fetch quotes via Yahoo Finance chart API (server-side; no browser CORS)
and overwrite data/markets.json. Safe to run from cron or GitHub Actions.

Usage (from repo root):
  python3 scripts/update-markets.py

On failure, exits non-zero and leaves the existing JSON untouched.
"""

from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "markets.json"

# Display metadata + Yahoo symbols for an hourly updater to overwrite sample data
SYMBOLS = [
    {"id": "sp500", "symbol": "^GSPC", "name": "S&P 500", "region": "US"},
    {"id": "nasdaq", "symbol": "^IXIC", "name": "Nasdaq Composite", "region": "US"},
    {"id": "hsi", "symbol": "^HSI", "name": "Hang Seng", "region": "HK"},
    {"id": "nikkei", "symbol": "^N225", "name": "Nikkei 225", "region": "JP"},
    {"id": "ftse", "symbol": "^FTSE", "name": "FTSE 100", "region": "UK"},
    {"id": "stoxx50", "symbol": "^STOXX50E", "name": "Euro Stoxx 50", "region": "EU"},
    {"id": "0700.HK", "symbol": "0700.HK", "name": "Tencent (0700.HK)", "region": "HK"},
]

UA = "MarketPulseUpdater/1.0 (+https://github.com/; educational static site)"


def fetch_quote(symbol: str) -> tuple[float, float]:
    url = (
        "https://query1.finance.yahoo.com/v8/finance/chart/"
        + urllib.request.quote(symbol, safe="")
        + "?interval=1d&range=5d"
    )
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=20) as resp:
        payload = json.load(resp)
    result = payload["chart"]["result"][0]
    meta = result["meta"]
    price = float(meta["regularMarketPrice"])
    prev = meta.get("chartPreviousClose") or meta.get("previousClose")
    if prev is None:
        closes = (result.get("indicators") or {}).get("quote", [{}])[0].get("close") or []
        closes = [c for c in closes if c is not None]
        if len(closes) >= 2:
            prev = closes[-2]
        else:
            prev = price
    prev = float(prev)
    change_pct = 0.0 if prev == 0 else ((price - prev) / prev) * 100.0
    return price, change_pct


def main() -> int:
    markets = []
    for item in SYMBOLS:
        try:
            price, change_pct = fetch_quote(item["symbol"])
        except (urllib.error.URLError, urllib.error.HTTPError, KeyError, IndexError, TypeError, ValueError) as exc:
            print(f"Failed to fetch {item['symbol']}: {exc}", file=sys.stderr)
            return 1
        markets.append(
            {
                "id": item["id"],
                "symbol": item["symbol"],
                "name": item["name"],
                "region": item["region"],
                "price": round(price, 2),
                "changePercent": round(change_pct, 2),
            }
        )

    hk = timezone(timedelta(hours=8))
    updated = datetime.now(hk).isoformat(timespec="seconds")
    doc = {
        "updatedAt": updated,
        "source": "yahoo-chart",
        "label": "Quotes refreshed via scheduled updater (Yahoo Finance chart API)",
        "markets": markets,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(doc, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUT} ({len(markets)} markets) at {updated}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
