# Neon Coast Cover Studio

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/arvm12gt/gta6-cover-art-01/rank.svg)](https://make.fun/c/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/arvm12gt/gta6-cover-art-01/reward.svg)](https://make.fun/c/gta6-cover-art-01)

An entry for [Make GTA 6 Cover Art](https://make.fun/c/gta6-cover-art-01) on make.fun.

**Neon Coast Cover Studio** turns any photo and caption into GTA-style multi-panel
cover art — the kind of poster you would see on a game box: a collage of moments
behind thick white gutters, one huge condensed title with a sunset gradient and a
dark outline, a handwritten script subtitle, a star heat meter and a badge ribbon.
It runs entirely offline in the browser: your photos never leave your machine.

## What it does

- **7 panel layouts** — nine-panel grid with title block, hero + three, full-bleed
  hero, four-panel grid, tilted snapshots, duo split, magazine stack. Every layout
  is a pure function of canvas size, so it works at every export size.
- **6 procedural grades** — Vice Sunset, Neon Nights, Golden Hour, Teal Heat,
  Mono Noir, Candy Pop. Each grade is a per-pixel gradient-map / duotone remap of
  the image data (not a CSS filter), so the sunset looks painted on.
- **Face-aware cropping** — a downsampled saliency + skin-tone detector finds the
  focus point of each photo, and every panel crop keeps that point in frame.
- **Real lettering** — Anton for the huge gradient title, Pacifico for the script
  subtitle, both vendored under `app/fonts/` under the SIL Open Font License.
- **Print texture** — film grain, vignette, halftone dots and posterized ink lines.
- **Live editor** — drag a panel to reposition its photo, scroll to zoom, undo/redo,
  and export PNG in four sizes: 1080×1080, 1080×1350, 1920×1080, 1080×1920 (story).

## How to use it

```sh
node serve.ts        # serves app/ on http://localhost:8080
```

Open the page, drop in up to two photos (or use the bundled samples), pick a
layout and a grade, type a title and subtitle, and hit **Export PNG**.

## How it is built

| File | What it does |
| --- | --- |
| `app/src/cover.js` | Composite engine: `renderCover(state, w, h)` paints backdrop, panels, texture and title block; `drawPanelImage` crops and grades each panel; `exportCanvasToPNG` renders an export. |
| `app/src/layouts.js` | The 7 layouts: `ninePanelGridWithTitleBlock`, `heroAndThree`, `fullBleedHero`, `fourPanelGrid`, `tiltedSnapshots`, `duoSplitPanels`, `magazineStackLayers`; exported as `LAYOUTS`. |
| `app/src/grade.js` | The 6 grades: `gradeViceSunset`, `gradeNeonNights`, `gradeGoldenHour`, `gradeTealHeat`, `gradeMonoNoir`, `gradeCandyPop`, plus `applyFilmGrain`, `applyVignette`, `applyHalftoneDots`, `posterizeInkLines`. |
| `app/src/focus.js` | `detectFocusPoint` (saliency + skin-tone) and `cropRectForPanel` (face-aware cover-fit). |
| `app/src/lettering.js` | `drawGradientTitle`, `drawScriptSubtitle`, `drawStarHeatMeter`, `drawBadgeRibbon`, `drawCornerBug`. |
| `app/src/main.js` | Editor state, toolbar wiring, per-panel drag/zoom, undo/redo, four export sizes. |
| `app/src/shots.js` | `?shot=cover` and `?shot=editor` fixed scenes for screenshots. |
| `app/fonts/` | Anton + Pacifico woff2 (SIL OFL) with the license texts. |
| `app/samples/` | Two AI-made sample photos (pier, boulevard), free to use. |
| `main.ts`, `serve.ts`, `vendor/makefun-app.ts` | Entry plumbing from the competition kit. |

## Originality

All artwork is original: the title, layouts, grades and corner bug were made for
this entry. No Rockstar logos, wordmarks, artwork or fonts are used anywhere.
The two sample photos were made with an image model for this competition and are
free to use. Fonts are Anton and Pacifico under the SIL Open Font License
(see `app/fonts/OFL-Anton.txt` and `app/fonts/OFL-Pacifico.txt`).

## License

MIT — see `LICENSE`.
