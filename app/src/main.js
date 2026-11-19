// Wires the Vice Cover Studio page: photos in, panels arranged, caption
// typed, cover out as a PNG. Everything runs on the user's machine:
// photos are read with FileReader / object URLs and never uploaded,
// the fonts and samples are files under app/, and the page makes no
// network request at all. A `?shot=` query sets up a fixed scene for a
// screenshot instead (see shots.js).
import { drawCover, CAPTION_COLOURS, CAPTION_COLOUR_IDS } from './cover.js';
import { LAYOUTS, LAYOUT_IDS, panelCount } from './panels.js';
import { GRADES, GRADE_IDS } from './grade.js';
import { runShot } from './shots.js';

export const EXPORT_SIZES = {
  square: { name: 'Square post', w: 1080, h: 1080 },
  portrait: { name: 'Portrait post', w: 1080, h: 1350 },
  wide: { name: 'Story / banner', w: 1920, h: 1080 },
};

export const EXPORT_SIZE_IDS = Object.keys(EXPORT_SIZES);

const canvas = document.getElementById('cover');
const statusEl = document.getElementById('status');
const trayEl = document.getElementById('tray');
const panelPhotoEl = document.getElementById('panel-photo');
const panelZoomEl = document.getElementById('panel-zoom');
const panelPanXEl = document.getElementById('panel-panx');
const panelPanYEl = document.getElementById('panel-pany');
const panelLabelEl = document.getElementById('panel-label');

/** The whole editor state; drawCover reads exactly this. */
export const state = {
  layout: 'duo',
  size: 'square',
  grade: 'sunset',
  captionColour: 'sunset',
  title: 'Sunset Heist',
  subtitle: 'Vice nights • 2026',
  photos: [], // { name, img } in load order
  panels: [], // { photo, zoom, panX, panY } per panel slot
  selectedPanel: 0,
};

function ensurePanels() {
  const n = panelCount(state.layout);
  while (state.panels.length < n) {
    state.panels.push({ photo: null, zoom: 1, panX: 0, panY: 0 });
  }
  state.panels.length = n;
  if (state.selectedPanel >= n) state.selectedPanel = 0;
}

/** The export canvas is always the exact export size; CSS scales the preview. */
function sizeCanvas() {
  const size = EXPORT_SIZES[state.size];
  canvas.width = size.w;
  canvas.height = size.h;
}

export function redraw() {
  ensurePanels();
  sizeCanvas();
  const photos = state.photos.map((p) => p.img);
  drawCover(canvas, { ...state, photos });
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

/** Adds an already-loaded image to the tray and, when a panel is empty, fills it. */
export function addPhoto(name, img) {
  state.photos.push({ name, img });
  ensurePanels();
  const empty = state.panels.find((p) => p.photo === null);
  if (empty) empty.photo = state.photos.length - 1;
  renderTray();
  renderPanelControls();
  redraw();
}

async function addSamplePhotos() {
  for (const [name, url] of [
    ['Boulevard', 'samples/boulevard.jpg'],
    ['Pier', 'samples/pier.jpg'],
  ]) {
    if (state.photos.some((p) => p.name === name)) continue;
    try {
      addPhoto(name, await loadImage(url));
    } catch (err) {
      setStatus(`Sample ${name} did not load: ${err.message}`);
    }
  }
  if (state.photos.length) setStatus('Sample photos loaded — add your own to replace them.');
}

function setStatus(text) {
  statusEl.textContent = text;
}

/** The photo tray: one thumb per loaded photo, click to fill the selected panel. */
function renderTray() {
  trayEl.innerHTML = '';
  state.photos.forEach((photo, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'thumb';
    button.title = `${photo.name} — click to put it in the selected panel`;
    const img = document.createElement('img');
    img.src = photo.img.src;
    img.alt = photo.name;
    button.appendChild(img);
    const label = document.createElement('span');
    label.textContent = photo.name;
    button.appendChild(label);
    button.addEventListener('click', () => {
      ensurePanels();
      state.panels[state.selectedPanel].photo = i;
      renderPanelControls();
      redraw();
    });
    trayEl.appendChild(button);
  });
  if (!state.photos.length) {
    const hint = document.createElement('p');
    hint.className = 'tray-empty';
    hint.textContent = 'No photos yet — add your own, or load the samples.';
    trayEl.appendChild(hint);
  }
}

/** Panel controls: which photo, zoom and pan for the selected panel. */
function renderPanelControls() {
  ensurePanels();
  const n = panelCount(state.layout);
  panelLabelEl.textContent = `Panel ${state.selectedPanel + 1} of ${n}`;
  panelPhotoEl.innerHTML = '';
  const none = document.createElement('option');
  none.value = '';
  none.textContent = '— empty panel —';
  panelPhotoEl.appendChild(none);
  state.photos.forEach((photo, i) => {
    const option = document.createElement('option');
    option.value = String(i);
    option.textContent = photo.name;
    panelPhotoEl.appendChild(option);
  });
  const slot = state.panels[state.selectedPanel];
  panelPhotoEl.value = slot.photo === null ? '' : String(slot.photo);
  panelZoomEl.value = String(slot.zoom);
  panelPanXEl.value = String(slot.panX);
  panelPanYEl.value = String(slot.panY);
  document.getElementById('zoom-val').textContent = `${Math.round(slot.zoom * 100)}%`;
  document.getElementById('panx-val').textContent = `${Math.round(slot.panX * 100)}`;
  document.getElementById('pany-val').textContent = `${Math.round(slot.panY * 100)}`;
}

/** Builds a row of buttons from an option map; the active one is marked. */
function buildChoice(containerId, ids, names, current, onPick) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  ids.forEach((id) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'choice';
    button.textContent = names[id];
    button.setAttribute('aria-pressed', String(id === current));
    if (id === current) button.classList.add('active');
    button.addEventListener('click', () => {
      onPick(id);
      buildChoice(containerId, ids, names, id, onPick);
      redraw();
    });
    container.appendChild(button);
  });
}

function buildLayoutChoices() {
  const names = {};
  for (const id of LAYOUT_IDS) names[id] = LAYOUTS[id].name;
  buildChoice('layout-choices', LAYOUT_IDS, names, state.layout, (id) => {
    state.layout = id;
    document.getElementById('layout-blurb').textContent = LAYOUTS[id].blurb;
    buildPanelTabs();
    renderPanelControls();
  });
}

function buildGradeChoices() {
  const names = {};
  for (const id of GRADE_IDS) names[id] = GRADES[id].name;
  buildChoice('grade-choices', GRADE_IDS, names, state.grade, (id) => {
    state.grade = id;
    document.getElementById('grade-blurb').textContent = GRADES[id].blurb;
  });
}

function buildColourChoices() {
  const names = {};
  for (const id of CAPTION_COLOUR_IDS) names[id] = CAPTION_COLOURS[id].name;
  buildChoice('colour-choices', CAPTION_COLOUR_IDS, names, state.captionColour, (id) => {
    state.captionColour = id;
  });
}

function buildSizeChoices() {
  const names = {};
  for (const id of EXPORT_SIZE_IDS) {
    const s = EXPORT_SIZES[id];
    names[id] = `${s.name} · ${s.w}×${s.h}`;
  }
  buildChoice('size-choices', EXPORT_SIZE_IDS, names, state.size, (id) => {
    state.size = id;
    redraw();
  });
}

function buildPanelTabs() {
  const tabs = document.getElementById('panel-tabs');
  tabs.innerHTML = '';
  const n = panelCount(state.layout);
  for (let i = 0; i < n; i++) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'choice';
    button.textContent = `Panel ${i + 1}`;
    if (i === state.selectedPanel) button.classList.add('active');
    button.addEventListener('click', () => {
      state.selectedPanel = i;
      buildPanelTabs();
      renderPanelControls();
    });
    tabs.appendChild(button);
  }
}

/** Drag on the preview to pan the selected panel's photo; wheel zooms it. */
function wireCanvasGestures() {
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const rect = canvas.getBoundingClientRect();
    const slot = state.panels[state.selectedPanel];
    if (!slot) return;
    // Pan is in fractions of a panel's width/height; dragging across the
    // whole preview moves the photo by about one and a half panels.
    slot.panX += ((e.clientX - lastX) / rect.width) * 1.5;
    slot.panY += ((e.clientY - lastY) / rect.height) * 1.5;
    slot.panX = Math.max(-0.5, Math.min(0.5, slot.panX));
    slot.panY = Math.max(-0.5, Math.min(0.5, slot.panY));
    lastX = e.clientX;
    lastY = e.clientY;
    renderPanelControls();
    redraw();
  });
  const endDrag = () => { dragging = false; };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const slot = state.panels[state.selectedPanel];
    if (!slot) return;
    slot.zoom = Math.max(1, Math.min(3, slot.zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
    renderPanelControls();
    redraw();
  }, { passive: false });
}

/** Exports the current cover as a PNG at the exact export size. */
export function exportCover() {
  const size = EXPORT_SIZES[state.size];
  redraw();
  canvas.toBlob((blob) => {
    if (!blob) {
      setStatus('Export failed — the browser could not make the PNG.');
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-cover-${size.w}x${size.h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    setStatus(`Saved vice-cover-${size.w}x${size.h}.png — share it anywhere.`);
  }, 'image/png');
}

function wireControls() {
  document.getElementById('photo').addEventListener('change', async (e) => {
    const files = [...e.target.files];
    for (const file of files) {
      try {
        addPhoto(file.name.replace(/\.[^.]+$/, ''), await loadImage(URL.createObjectURL(file)));
      } catch {
        setStatus(`${file.name} is not a readable image.`);
      }
    }
    e.target.value = '';
  });
  document.getElementById('samples').addEventListener('click', addSamplePhotos);
  document.getElementById('fill-all').addEventListener('click', () => {
    if (!state.photos.length) return;
    ensurePanels();
    const first = state.panels[0].photo ?? 0;
    for (const slot of state.panels) slot.photo = first;
    renderPanelControls();
    redraw();
    setStatus('Every panel now uses the same photo — crop each one differently.');
  });
  document.getElementById('title').addEventListener('input', (e) => {
    state.title = e.target.value;
    redraw();
  });
  document.getElementById('subtitle').addEventListener('input', (e) => {
    state.subtitle = e.target.value;
    redraw();
  });
  panelPhotoEl.addEventListener('change', () => {
    state.panels[state.selectedPanel].photo = panelPhotoEl.value === '' ? null : Number(panelPhotoEl.value);
    redraw();
  });
  panelZoomEl.addEventListener('input', () => {
    state.panels[state.selectedPanel].zoom = Number(panelZoomEl.value);
    renderPanelControls();
    redraw();
  });
  panelPanXEl.addEventListener('input', () => {
    state.panels[state.selectedPanel].panX = Number(panelPanXEl.value);
    renderPanelControls();
    redraw();
  });
  panelPanYEl.addEventListener('input', () => {
    state.panels[state.selectedPanel].panY = Number(panelPanYEl.value);
    renderPanelControls();
    redraw();
  });
  document.getElementById('export').addEventListener('click', exportCover);
}

// Exposed for the screenshot scenes in shots.js.
window.__vice = { state, redraw, addPhoto, loadImage, setStatus, EXPORT_SIZES };

const shot = new URLSearchParams(location.search).get('shot');
buildLayoutChoices();
buildGradeChoices();
buildColourChoices();
buildSizeChoices();
buildPanelTabs();
wireControls();
wireCanvasGestures();
renderTray();
renderPanelControls();

// Fonts are local files; wait for Anton before the first real draw so
// the caption never falls back to a system font in a screenshot.
document.fonts.load('100px Anton').finally(() => {
  document.fonts.load('600 40px Oswald').finally(() => {
    if (shot) {
      runShot(shot, new URLSearchParams(location.search));
    } else {
      addSamplePhotos();
    }
  });
});
