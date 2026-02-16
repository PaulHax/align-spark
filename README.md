# ALIGN Spark

Static HTML/CSS/JS demo showcasing the ALIGN system — an AI alignment tool that lets users adjust value dimensions and see how those values change an AI decision maker's choice in military medical triage scenarios.

No build step, no bundler, no framework — just ES modules served from `static/`.

## Quick Start

```bash
python3 -m http.server -d static 8000
```

Then open http://localhost:8000

## Demo Variants

There are two independent apps:

### Single-Page App (`index.html`)

Self-contained demo with hardcoded mock data. Good for a quick overview.

### Showcase Variants

Six different UI layouts for the same demo flow, all powered by a shared manifest-driven decision engine:

| Variant | Description |
|---------|-------------|
| [wizard.html](static/wizard.html) | Step-by-step wizard with back/next navigation |
| [scroll.html](static/scroll.html) | Scroll-driven reveal with IntersectionObserver |
| [accordion.html](static/accordion.html) | Collapsible panels with timeline |
| [split.html](static/split.html) | Left/right split that expands on progression |
| [slides.html](static/slides.html) | Presentation-style slide deck with transitions |
| [tour.html](static/tour.html) | Three-zone grid with stage-based progression |

Showcase variants require `static/data/manifest.json` to be present.

## Tech Stack

- Vanilla ES modules (no build step)
- [Web Awesome](https://www.webawesome.com/) v3.2.1 for UI components
- CSS custom properties for theming
