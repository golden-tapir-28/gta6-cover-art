// Fixed scenes for screenshots: ?shot=editor shows the page with sample
// photos loaded; ?shot=cover shows the cover alone, edge to edge.
// Query knobs: layout, size (square|portrait|wide), title, subtitle,
// grade, colour, photos (comma list of sample names, one per panel).
// window.__shotReady is set once the scene is painted.
import { panelCount } from './panels.js';

const SAMPLES = { boulevard: 'Boulevard', pier: 'Pier' };

async function loadSamples(vice, names) {
  // Load each named sample once, even when two panels share it, so the
  // photo tray lists every sample a single time.
  const loaded = {};
  for (const name of [...new Set(names)]) {
    if (!SAMPLES[name]) continue;
    const img = await vice.loadImage(`samples/${name}.jpg`);
    vice.addPhoto(SAMPLES[name], img);
    loaded[name] = vice.state.photos.length - 1;
  }
  return loaded;
}

export async function runShot(shot, query) {
  const vice = window.__vice;
  const state = vice.state;
  if (shot === 'cover') document.body.classList.add('shot-cover');

  state.layout = query.get('layout') || 'duo';
  state.size = query.get('size') || 'square';
  state.grade = query.get('grade') || 'sunset';
  state.captionColour = query.get('colour') || 'sunset';
  state.title = query.get('title') || 'Sunset Heist';
  state.subtitle = query.get('subtitle') || 'Vice nights • 2026';

  const names = (query.get('photos') || 'pier,boulevard,pier').split(',');
  const loaded = await loadSamples(vice, names);

  // Assign the named samples to the panels in order, so a shot can put
  // a different crop of the same photo in each panel.
  const n = panelCount(state.layout);
  for (let i = 0; i < n; i++) {
    const name = names[i % names.length];
    if (loaded[name] !== undefined) {
      state.panels[i] = state.panels[i] || { photo: null, zoom: 1, panX: 0, panY: 0 };
      state.panels[i].photo = loaded[name];
    }
  }
  // Give the hero panel a closer crop and the small panels their own framing.
  if (state.panels[0]) state.panels[0].zoom = Number(query.get('zoom0') || 1.15);
  if (state.panels[1]) state.panels[1].zoom = Number(query.get('zoom1') || 1.4);
  if (state.panels[2]) {
    state.panels[2].zoom = Number(query.get('zoom2') || 1.3);
    state.panels[2].panX = Number(query.get('panx2') || -0.08);
  }

  vice.redraw();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
