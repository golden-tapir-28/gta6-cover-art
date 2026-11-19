# Vice Cover Studio — GTA 6-style cover art maker

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/golden-tapir-28/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/golden-tapir-28/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

Turn your photo and a caption into GTA 6-style cover art — multi-panel poster,
bold Anton caption, Vice City sunset or neon grade — and export it as a PNG to
share. Built for the [make.fun gta6-cover-art-01 bounty](https://make.fun/bounty/gta6-cover-art-01).

## What it does

- **Any photo:** add photos from your machine (they are never uploaded), or
  start from the two built-in samples.
- **Crop + position each photo:** pick a photo per panel, zoom with a slider
  or the mouse wheel, drag it around right on the preview.
- **Fill several panels:** one photo across every panel, or a different photo
  in each — four poster layouts (Duo, Trio, Quad, Hero).
- **Edit the caption:** big bold title plus a subtitle, four caption colours,
  four colour grades (Sunset, Neon Night, Golden Hour, Noir).
- **Fast and easy:** photo to PNG in four steps, in the common post sizes
  **1080×1080**, **1080×1350** and **1920×1080**.

## Run it offline

No build step, no network. Serve `app/` with any static server and open it in
desktop Chrome:

```sh
node serve.ts
# open http://localhost:8080
```

Or open `app/index.html` straight from the files. Every font, script, image
and sample is a file under `app/`; photos are read on your machine only.

## Fonts

- **Anton** (display capitals) and **Oswald** (subtitle + UI), both under
  `app/fonts/` under the SIL Open Font License 1.1 (`app/fonts/OFL.txt`).
  Nothing in this app copies a game logo, wordmark, artwork or font.

## How it is built

- `app/index.html` — the editor page.
- `app/style.css` — the neon dusk editor theme.
- `app/src/main.js` — state, controls, drag-to-pan, export.
- `app/src/cover.js` — the poster renderer (panels, caption, seams).
- `app/src/panels.js` — the four multi-panel layouts.
- `app/src/grade.js` — sunset/neon grades, halftone dots, vignette.
- `app/src/shots.js` — fixed scenes for the screenshots.
- `main.ts` — hands the app in: copies `app/` + `screenshots/` to `/output`
  and writes `dossier.json` with the vendored make.fun library.

## Screenshots

`screenshots/` holds four images: the wide exported cover first, then the
editor with a photo loaded, then the square and portrait covers the app
exported.

## Try make.fun

Made with [make.fun](https://make.fun/r/3vf02xm0) — build apps, enter
bounties, get judged in the open.

## License

MIT — see [LICENSE](LICENSE).
