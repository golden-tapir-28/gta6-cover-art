// Vice Cover Studio — the entrypoint for gta6-cover-art-01 (Node 22,
// standard library only). The app itself is the plain static files in
// app/: index.html plus its ES modules, fonts and samples, nothing loaded
// over the network, so any static server can host it offline. This program
// hands that app in: it copies app/ and screenshots/ from this directory
// into /output and writes /output/dossier.json, the summary the judge
// reads, using the vendored make.fun library (vendor/makefun-app.ts,
// unchanged from the kit).
//
// Try it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The caps below mirror the gate's own limits, so a build that passes
// here is one the scorer accepts: at most 4 screenshots, each at most
// 256 KiB; app/ at most 993 files and 48 MiB in all, no path over 1000
// bytes; and the dossier text capped at 160 KiB. Only text_max_bytes
// changes the bytes written; the rest refuse an entry the scorer would
// refuse, which is what we want to catch before submitting.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
