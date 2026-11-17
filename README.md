# CBE Thesis Explorer (Source + Static Site)

Interactive research workstation for Ahmed Yasser's study on Central Bank of Egypt (CBE) MPC communication and Egyptian Banks / Real Estate stock-market return forecasts.

This repository contains both the **editable React + TypeScript source (`src/`)** and the **self-contained static bundle (`site/`)** so anyone can fork or clone it and build their own version.

> Note: The separate `cbe-thesis-explorer` repository hosts the earlier 5 November static release. This repository keeps the newer React/TypeScript build independent.

---

## Quick start: create your own version

### 1. Fork or clone

- Click **Fork** on GitHub (or **Use this template** if enabled) to create your own repository, then clone your fork:

```sh
git clone https://github.com/<your-username>/cbe-thesis-explorer-v2.git
cd cbe-thesis-explorer-v2
```

*(Or clone directly and point `origin` to a new empty repo of your own.)*

### 2. Install dependencies

Requires **Node.js 20+** (22 recommended).

```sh
npm ci
```

### 3. Preview the current site locally

Without building anything, you can serve `site/` locally:

```sh
python3 -m http.server 8793 --bind 127.0.0.1 --directory site
```

Then open <http://127.0.0.1:8793/Website/index.html> (or open `site/Website/index.html` directly from disk).

### 4. Edit and rebuild

Edit files inside `src/`:

- `src/index.tsx` — React entry point
- `src/Shell.tsx` / `src/Shell.module.css` — sidebar, header, navigation, layout shell
- `src/Overview.tsx` / `src/Overview.module.css` — landing overview, benchmark card, timeline
- `src/Walkthrough.tsx` — 6-step worked walkthrough
- `src/Workspaces.tsx` & `src/research/` — Policy & statements, Markets, Forecast results, Data & methods
- `src/SearchPalette.tsx` — `Ctrl+K` / `⌘K` command search
- `src/Charts.tsx` — ECharts React wrapper
- `src/theme.css` / `src/refinements.css` — design tokens, typography, and theme styles

Typecheck and rebuild the browser bundle (`site/Website/explorer.js` and `site/Website/explorer.css`):

```sh
npm run typecheck
npm run build
```

Optional Playwright browser verification (requires local Google Chrome):

```sh
npm run verify
```

### 5. Publish your own version on GitHub Pages

1. Push your changes to `main` on your GitHub repository.
2. In your GitHub repo, open **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **GitHub Actions**.
4. The included workflow (`.github/workflows/pages.yml`) runs `npm ci`, `npm run typecheck`, `npm run build`, and deploys `site/`.

---

## Repository layout

- `src/` — React, TypeScript, CSS Modules, and research workspace source
- `build.mjs` — `esbuild` bundler (compiles `src/index.tsx` into `site/Website/explorer.js` + `explorer.css` and copies vendor license files)
- `package.json`, `package-lock.json`, `tsconfig.json` — Node/TypeScript config
- `site/` — Static deliverable (`index.html`, `Website/`, bundled datasets, CBE PDFs, `Chapter4/`, thesis PDF/notebook/workbook/slides)
- `qa/verify.mjs` — Playwright + axe-core smoke/accessibility suite
- `.github/workflows/pages.yml` — GitHub Pages build-and-deploy workflow

---

## Data, study scope, and licensing

- Vendor library licenses (`Inter`, `React`, `ReactDOM`, `Scheduler`, `Apache ECharts`) are under `site/Website/vendor/`.
- The thesis files, CBE PDFs, and bundled datasets are published for academic review. This repository asserts no blanket open-source license over third-party market data or the underlying thesis.
- See `site/Website/README.md` and `site/Website/DESIGN.md` for study definitions, limitations, and UI documentation.
