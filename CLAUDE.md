# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Static HTML/CSS/JS demo showcasing the ALIGN system — an AI alignment tool that lets users adjust value dimensions and see how those values change an AI decision maker's choice in military medical triage scenarios. No build step, no bundler, no framework — just ES modules served from `static/`.

## Development

Serve the `static/` directory with any static file server:

```bash
python3 -m http.server -d static 8000
npx serve static
```

Entry points are the HTML files. No build, lint, test, or install commands. Showcase variants require `./data/manifest.json` to be present (fetched at runtime by `align-engine.js`).

## Architecture

### Two Independent Apps

1. **`index.html` + `app.js`** — Self-contained single-page version with hardcoded mock data (`SCENARIOS`, `PROFILES`, `MOCK_ALIGNED_RESULTS`). Does **not** share code with the showcase variants.

2. **Showcase variants** — Six different UI layouts for the same demo flow, sharing a common code layer:
   - `wizard.html` — Step-by-step wizard with back/next navigation
   - `scroll.html` — Scroll-driven reveal with IntersectionObserver
   - `accordion.html` — Collapsible `wa-details` panels with timeline
   - `split.html` — Left/right split that expands on progression
   - `slides.html` — Presentation-style slide deck with transitions
   - `tour.html` — Three-zone grid with stage-based progression

### Shared Module Layer (`shared.js` + `align-engine.js`)

The showcase variants all import from `shared.js`, which re-exports data and the `decide()` function from `align-engine.js` and provides shared UI builder functions.

- **`align-engine.js`** — Manifest-driven decision engine. Fetches `./data/manifest.json` at load time and populates `SCENARIOS`, `PRESETS`, and `DIMENSIONS` from it. Exports a `ready` Promise that resolves when data is loaded. The `decide(scenarioId, decider, values)` function finds the closest matching experiment by KDMA value distance. Value levels are discrete: `low` (0.0), `medium` (0.5), `high` (1.0).

- **`shared.js`** — Shared UI utilities consumed by all showcase variants. Re-exports `SCENARIOS`, `PRESETS`, `DIMENSIONS`, `decide`, and `ready` from `align-engine.js`. Exports builder functions (`buildScenarioSelector`, `buildPresetChips`, `buildValueControls`, `renderDecisionComparison`, `renderScenarioDescription`), getters (`getScenario`, `getPreset`), slider helpers (`sliderValueToLevel`, `levelToSliderValue`, `getCurrentValues`, `setSliderValues`), and display helpers (`simulateThinking`, `modelBadgeHTML`). Also initializes the theme switcher.

- **`theme-switcher.js`** — Color scheme picker (Kitware, Ocean, Coral, etc.) that sets CSS custom properties. Only renders its UI when a `.showcase-nav` element exists (showcase variants only).

### Pattern: Each Variant JS File

Each variant (`wizard.js`, `scroll.js`, `tour.js`, etc.) follows the same pattern:
- Imports from `shared.js`
- Waits on `ready.then()` before initializing
- Maintains local `state` object (selected scenario, preset, values)
- Wires up event handlers that call shared builder functions with DOM containers
- Calls `decide()` to get baseline/aligned results

### CSS Structure

- `styles.css` — Styles for `index.html` only
- `shared.css` — Common styles for all showcase variants (nav, typography, cards, sliders)
- `{variant}.css` — Layout-specific styles per variant

### UI Components

Uses [Web Awesome](https://www.webawesome.com/) v3.2.1 (`wa-card`, `wa-button`, `wa-slider`, `wa-details`, `wa-tag`, `wa-badge`, `wa-spinner`, `wa-callout`, `wa-progress-bar`) loaded from CDN as ES modules.
