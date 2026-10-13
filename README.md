# MarketPulse

A polished static financial information website — markets overview, asset categories, plain-language explainers, and a searchable glossary.

## How to open

1. Open the folder `finance-info-site` in your file manager, **or** navigate there in a terminal.
2. Open **`index.html`** in any modern browser (Chrome, Firefox, Safari, Edge).

No build step, server, or API keys are required. You can also serve the folder with any static file server if you prefer, for example:

```bash
cd /workspace/finance-info-site
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## Deploy on GitHub Pages

1. Push this repo to GitHub (default branch `main`).
2. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. The workflow `.github/workflows/pages.yml` deploys the site root on every push to `main` (and via **Actions → Deploy to GitHub Pages → Run workflow**).
4. After the first successful run, your site URL appears under **Settings → Pages**.

Asset paths in `index.html` are relative (`styles.css`, `script.js`, `data/markets.json`), so they work on both a user/org site and a project site (`username.github.io/repo/`).

## Market data refresh

- The Markets section loads **`data/markets.json`** at runtime (with a cache-busting `?t=` query). If the fetch fails, embedded HTML sample values remain.
- Until an updater overwrites the JSON, figures are **illustrative sample data**, not live prices (`source: "sample"`).
- Optional server-side refresh (no browser CORS / API key):

```bash
python3 scripts/update-markets.py
```

That script writes fresh quotes into `data/markets.json` via Yahoo’s chart API. Wire it to cron or a scheduled GitHub Action, then push (or let the Pages workflow redeploy).

## Files

| File | Role |
|------|------|
| `index.html` | Main page (all sections) |
| `styles.css` | Layout and dark/light theme |
| `script.js` | Glossary filter, theme toggle, animations, markets.json load |
| `data/markets.json` | Indices + 0700.HK quotes (sample until refreshed) |
| `scripts/update-markets.py` | Optional hourly-friendly JSON updater |
| `.github/workflows/pages.yml` | GitHub Pages deploy from `main` |
| `README.md` | This file |

## Notes

- Index / stock figures are **sample until refreshed** — not advice and not guaranteed live.
- Content is educational only and is **not financial advice**.
