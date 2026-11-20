// Draws the Vice Cover Studio poster onto a canvas.
// The poster is a multi-panel photo grid in a GTA-style poster look:
// thick white gutters, a sunset or neon colour grade over every panel,
// halftone print dots, and a big bold caption in Anton across a dark
// scrim at the foot. The same function draws the live preview and the
// exported PNG, so what you see is what you share.
import { layoutPanels, captionBand } from './panels.js';
import { GRADES, applyGrade, applyCaptionScrim } from './grade.js';

export const CAPTION_COLOURS = {
  sunset: {
    name: 'Sunset Pink',
    from: '#ff5e78',
    to: '#ffb347',
    outline: '#1c0b2e',
  },
  gold: {
    name: 'Gold Rush',
    from: '#ffe259',
    to: '#ffa751',
    outline: '#241203',
  },
  ice: {
    name: 'Vice Ice',
    from: '#a8ffef',
    to: '#38b6ff',
    outline: '#06182e',
  },
  white: {
    name: 'White Hot',
    from: '#ffffff',
    to: '#ffd9ec',
    outline: '#2b0a1e',
  },
};

export const CAPTION_COLOUR_IDS = Object.keys(CAPTION_COLOURS);

/** The six role tags a panel can carry. */
export const ROLE_TAGS = ['PROTAGONIST', 'ANTAGONIST', 'DRIVER', 'PARTNER', 'LOOKOUT', 'FIXER'];

/**
 * Begins a path for `panel`: its parallelogram polygon when it has one
 * (the slanted layout), otherwise its rectangle. Used for clipping and
 * for stroking panel outlines.
 */
export function tracePanel(ctx, panel) {
  ctx.beginPath();
  if (panel.poly) {
    ctx.moveTo(panel.poly[0][0], panel.poly[0][1]);
    for (let i = 1; i < panel.poly.length; i++) {
      ctx.lineTo(panel.poly[i][0], panel.poly[i][1]);
    }
    ctx.closePath();
  } else {
    ctx.rect(panel.x, panel.y, panel.w, panel.h);
  }
}

/** Traces a rounded-rectangle path at (x, y, w, h) with corner radius r. */
function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.arcTo(x + w, y, x + w, y + rr, rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  ctx.lineTo(x + rr, y + h);
  ctx.arcTo(x, y + h, x, y + h - rr, rr);
  ctx.lineTo(x, y + rr);
  ctx.arcTo(x, y, x + rr, y, rr);
  ctx.closePath();
}

/**
 * Draws one photo into one panel, cover-fit, with the panel's zoom
 * (1 = fit exactly) and pan (-0.5..0.5 of the panel's size on each axis).
 * Photos the user has not set yet leave the panel as a dark placeholder
 * with a dashed frame and a hint, so an empty panel never looks broken.
 * A slanted panel is clipped to its parallelogram; the photo is fitted
 * to the panel's bounding rectangle first, so the slant only cuts the
 * edges, never the framing.
 */
export function drawPhotoPanel(ctx, photo, panel, zoom, panX, panY) {
  ctx.save();
  tracePanel(ctx, panel);
  ctx.clip();

  if (!photo || !photo.naturalWidth) {
    ctx.fillStyle = '#241633';
    ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = Math.max(2, panel.w * 0.008);
    ctx.setLineDash([panel.w * 0.03, panel.w * 0.02]);
    if (panel.poly) {
      tracePanel(ctx, panel);
      ctx.stroke();
    } else {
      ctx.strokeRect(
        panel.x + panel.w * 0.08,
        panel.y + panel.h * 0.08,
        panel.w * 0.84,
        panel.h * 0.84,
      );
    }
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = `600 ${Math.max(14, panel.w * 0.055)}px Oswald, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ADD A PHOTO', panel.x + panel.w / 2, panel.y + panel.h / 2);
    ctx.restore();
    return;
  }

  const fit = Math.max(panel.w / photo.naturalWidth, panel.h / photo.naturalHeight);
  const scale = fit * (zoom || 1);
  const pw = photo.naturalWidth * scale;
  const ph = photo.naturalHeight * scale;
  const dx = panel.x + (panel.w - pw) / 2 + (panX || 0) * panel.w;
  const dy = panel.y + (panel.h - ph) / 2 + (panY || 0) * panel.h;
  ctx.drawImage(photo, dx, dy, pw, ph);
  ctx.restore();
}

/**
 * Splits `text` into at most two lines that each fit `maxWidth` at
 * `size` px in `font`, shrinking the size until they do. Returns the
 * lines and the size that fits them.
 */
export function fitTitle(ctx, text, maxWidth, startSize, font) {
  const words = text.split(/\s+/).filter(Boolean);
  let size = startSize;
  while (size > 12) {
    ctx.font = `${size}px ${font}`;
    const lines = [];
    let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width <= maxWidth || !line) {
        line = test;
      } else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
    if (lines.length <= 2 && lines.every((l) => ctx.measureText(l).width <= maxWidth)) {
      return { lines, size };
    }
    size = Math.floor(size * 0.92);
  }
  ctx.font = `${size}px ${font}`;
  return { lines: [text], size };
}

/** Draws the big caption: gradient-filled Anton capitals, dark outline, hard shadow. */
export function drawCaption(ctx, title, subtitle, colour, band, w) {
  const text = (title || '').trim().toUpperCase();
  if (!text) return;
  const padX = w * 0.055;
  const maxWidth = w - padX * 2;
  const startSize = Math.round(band.h * 0.52);
  const { lines, size } = fitTitle(ctx, text, maxWidth, startSize, 'Anton, sans-serif');

  const grad = ctx.createLinearGradient(0, band.y, 0, band.y + band.h);
  grad.addColorStop(0, colour.from);
  grad.addColorStop(1, colour.to);

  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `${size}px Anton, sans-serif`;
  ctx.lineWidth = Math.max(3, size * 0.09);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = colour.outline;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = Math.round(size * 0.07);
  const lineHeight = size * 1.02;
  let y = band.y + band.h - Math.round(band.h * 0.16) - (lines.length - 1) * lineHeight;
  // Leave room for the subtitle line underneath the title.
  if (subtitle && subtitle.trim()) y -= Math.round(band.h * 0.24);
  for (const line of lines) {
    ctx.strokeText(line, padX, y);
    ctx.fillStyle = grad;
    ctx.fillText(line, padX, y);
    y += lineHeight;
  }
  ctx.restore();

  if (subtitle && subtitle.trim()) {
    const sub = subtitle.trim().toUpperCase();
    const subSize = Math.max(13, Math.round(band.h * 0.13));
    ctx.save();
    ctx.font = `600 ${subSize}px Oswald, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = Math.round(subSize * 0.15);
    // Letter-space the subtitle by hand: canvas has no letter-spacing everywhere.
    let sx = padX;
    const subY = band.y + band.h - Math.round(band.h * 0.07);
    for (const ch of sub) {
      ctx.fillText(ch, sx, subY);
      sx += ctx.measureText(ch).width + subSize * 0.18;
    }
    ctx.restore();
  }
}

/**
 * Draws a panel's role tag: a gold-rimmed pill in the panel's top
 * corner. For a slanted panel the pill starts at the parallelogram's
 * top-left corner, so it always sits inside the visible panel.
 */
export function drawRoleTag(ctx, panel, role) {
  if (!role) return;
  const anchor = panel.poly
    ? { x: panel.poly[0][0], y: panel.poly[0][1] }
    : { x: panel.x, y: panel.y };
  const fontSize = Math.max(12, Math.round(panel.w * 0.05));
  ctx.save();
  ctx.font = `700 ${fontSize}px Oswald, sans-serif`;
  const pad = Math.max(6, fontSize * 0.55);
  const tw = ctx.measureText(role).width;
  const pw = tw + pad * 2;
  const ph = fontSize * 1.9;
  const px = anchor.x + Math.max(6, panel.w * 0.03);
  const py = anchor.y + Math.max(6, panel.h * 0.02);
  roundRectPath(ctx, px, py, pw, ph, ph / 2);
  ctx.fillStyle = 'rgba(10, 5, 20, 0.82)';
  ctx.fill();
  ctx.strokeStyle = '#f5c542';
  ctx.lineWidth = Math.max(1.5, fontSize * 0.08);
  ctx.stroke();
  ctx.fillStyle = '#ffd970';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(role, px + pad, py + ph / 2 + fontSize * 0.04);
  ctx.restore();
}

/**
 * Draws one callout: a gold anchor dot at the picked spot and a pill
 * with the label beside it. `callout` is { text, panel, x, y } with x
 * and y as fractions (0..1) of the panel. For a slanted panel the
 * fractions map onto the parallelogram's visible span at that height,
 * so the dot always lands inside the panel; the pill is clamped to
 * the panel and clipped to the parallelogram so it never spills over
 * a neighbouring strip.
 */
export function drawCallout(ctx, panel, callout) {
  const label = (callout.text || '').trim().toUpperCase();
  if (!label) return;
  const fx = Math.max(0, Math.min(1, callout.x ?? 0.5));
  const fy = Math.max(0, Math.min(1, callout.y ?? 0.5));
  let ax;
  let ay;
  if (panel.poly) {
    // The parallelogram's top edge is shifted right by the slant; at
    // height fy the visible span runs from leftX to leftX + sw.
    const s = panel.poly[0][0] - panel.poly[3][0];
    const sw = panel.poly[1][0] - panel.poly[0][0];
    const leftX = panel.poly[0][0] - s * fy;
    ax = leftX + fx * sw;
    ay = panel.y + fy * panel.h;
  } else {
    ax = panel.x + fx * panel.w;
    ay = panel.y + fy * panel.h;
  }
  const fontSize = Math.max(13, Math.round(panel.w * 0.055));
  ctx.save();
  if (panel.poly) {
    tracePanel(ctx, panel);
    ctx.clip();
  }
  ctx.font = `600 ${fontSize}px Oswald, sans-serif`;
  const padX = Math.max(8, fontSize * 0.6);
  const tw = ctx.measureText(label).width;
  const pw = tw + padX * 2;
  const ph = fontSize * 1.9;
  // Pill above-right of the dot, clamped inside the panel.
  let px = ax + Math.max(8, fontSize * 0.5);
  let py = ay - ph - Math.max(6, fontSize * 0.4);
  if (px + pw > panel.x + panel.w - 4) px = ax - pw - Math.max(8, fontSize * 0.5);
  if (py < panel.y + 4) py = ay + Math.max(8, fontSize * 0.5);
  if (px < panel.x + 4) px = panel.x + 4;
  if (panel.poly) {
    // A slanted panel is narrower than its bounding rectangle, and the
    // visible span shifts with height — clamp the pill to the span at
    // the pill's own height, so the clip never cuts its text.
    const s = panel.poly[0][0] - panel.poly[3][0];
    const sw = panel.poly[1][0] - panel.poly[0][0];
    const fyPill = Math.max(0, Math.min(1, (py + ph / 2 - panel.y) / panel.h));
    const leftX = panel.poly[0][0] - s * fyPill;
    const rightX = leftX + sw;
    if (px < leftX + 4) px = leftX + 4;
    if (px + pw > rightX - 4) px = rightX - 4 - pw;
    if (px < leftX + 4) px = leftX + 4; // pill wider than the strip: align left
  }
  // Leader line from the dot to the pill.
  ctx.strokeStyle = 'rgba(245, 197, 66, 0.9)';
  ctx.lineWidth = Math.max(1.5, fontSize * 0.07);
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(px + (px > ax ? 0 : pw), py + ph / 2);
  ctx.stroke();
  // Gold anchor dot.
  ctx.beginPath();
  ctx.arc(ax, ay, Math.max(4, fontSize * 0.28), 0, Math.PI * 2);
  ctx.fillStyle = '#f5c542';
  ctx.fill();
  ctx.strokeStyle = '#160a24';
  ctx.lineWidth = Math.max(1.5, fontSize * 0.08);
  ctx.stroke();
  // Pill.
  roundRectPath(ctx, px, py, pw, ph, ph / 2);
  ctx.fillStyle = 'rgba(10, 5, 20, 0.88)';
  ctx.fill();
  ctx.strokeStyle = '#f5c542';
  ctx.lineWidth = Math.max(1.5, fontSize * 0.08);
  ctx.stroke();
  ctx.fillStyle = '#ffe9a8';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, px + padX, py + ph / 2 + fontSize * 0.04);
  ctx.restore();
}

/**
 * Draws the round stamp seal in the top-right corner of the cover:
 * a double gold ring, an editable wordmark and "EST. 2025", the whole
 * badge tilted like a rubber stamp. Long wordmarks shrink to fit.
 */
export function drawSeal(ctx, w, h, seal) {
  if (!seal || !seal.on) return;
  const word = (seal.word || 'LEONIDA').trim().toUpperCase() || 'LEONIDA';
  const r = Math.round(Math.min(w, h) * 0.075);
  const m = Math.round(Math.min(w, h) * 0.02);
  const cx = w - m - r;
  const cy = m + r;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.21); // about -12 degrees, the rubber-stamp tilt
  // Faint gold wash inside the ring.
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(212, 175, 55, 0.10)';
  ctx.fill();
  // Double gold ring.
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = Math.max(3, r * 0.07);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2);
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = Math.max(1.5, r * 0.035);
  ctx.stroke();
  // Wordmark, shrunk to fit the inner circle when it is long.
  let wordSize = Math.max(14, Math.round(r * 0.34));
  ctx.font = `${wordSize}px Anton, sans-serif`;
  const maxW = r * 1.45;
  const tw = ctx.measureText(word).width;
  if (tw > maxW) wordSize = Math.max(10, Math.floor(wordSize * maxW / tw));
  ctx.font = `${wordSize}px Anton, sans-serif`;
  ctx.fillStyle = '#f5c542';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(word, 0, -r * 0.16);
  // EST. 2025 underneath.
  const estSize = Math.max(10, Math.round(r * 0.16));
  ctx.font = `600 ${estSize}px Oswald, sans-serif`;
  ctx.fillStyle = '#ffe9a8';
  ctx.fillText('EST. 2025', 0, r * 0.30);
  ctx.restore();
}

/**
 * Draws the movie-poster credits line along the very bottom edge of
 * the cover, letter-spaced. A thin dark strip sits behind it so it
 * stays readable over any photo; the strip is short enough that it
 * never covers the subtitle above it.
 */
export function drawBilling(ctx, w, h, billing) {
  if (!billing || !billing.on) return;
  const text = (billing.text || '').trim().toUpperCase();
  if (!text) return;
  const stripH = Math.max(14, Math.round(h * 0.018));
  const size = Math.max(10, Math.round(h * 0.011));
  ctx.save();
  ctx.fillStyle = 'rgba(8, 4, 18, 0.92)';
  ctx.fillRect(0, h - stripH, w, stripH);
  ctx.font = `600 ${size}px Oswald, sans-serif`;
  ctx.fillStyle = 'rgba(255, 233, 168, 0.95)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  // Letter-space by hand and centre the whole line.
  const gap = size * 0.28;
  let total = 0;
  for (const ch of text) total += ctx.measureText(ch).width + gap;
  total -= gap;
  let sx = (w - total) / 2;
  const y = h - stripH / 2 + size * 0.04;
  for (const ch of text) {
    ctx.fillText(ch, sx, y);
    sx += ctx.measureText(ch).width + gap;
  }
  ctx.restore();
}

/**
 * Draws the whole cover for `state` onto `canvas` (which must already
 * be sized to the export size). State shape:
 * { layout, size, photos: HTMLImageElement[], panels: [{ photo, zoom, panX, panY }],
 *   title, subtitle, grade, captionColour }
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const colour = CAPTION_COLOURS[state.captionColour] || CAPTION_COLOURS.sunset;

  // Backdrop: deep violet, visible in the gutters and margins.
  ctx.fillStyle = '#160a24';
  ctx.fillRect(0, 0, w, h);

  const panels = layoutPanels(state.layout, w, h);
  panels.forEach((panel, i) => {
    const slot = state.panels[i] || {};
    const photo = typeof slot.photo === 'number' ? state.photos[slot.photo] : null;
    drawPhotoPanel(ctx, photo, panel, slot.zoom ?? 1, slot.panX ?? 0, slot.panY ?? 0);
    applyGrade(ctx, grade, panel.x, panel.y, panel.w, panel.h, panel.poly);
  });

  // White comic-book seams around every panel; slanted panels get
  // their diagonal outline instead of a rectangle.
  ctx.strokeStyle = '#f5eefc';
  ctx.lineWidth = Math.max(2, Math.min(w, h) * 0.008);
  for (const panel of panels) {
    tracePanel(ctx, panel);
    ctx.stroke();
  }

  // Role tags sit in each panel's top corner, over the grade.
  panels.forEach((panel, i) => {
    const slot = state.panels[i] || {};
    drawRoleTag(ctx, panel, slot.role || null);
  });

  const band = captionBand(w, h);
  applyCaptionScrim(ctx, band);
  drawCaption(ctx, state.title, state.subtitle, colour, band, w);

  // Callouts on top of everything, then the seal and the billing line.
  for (const callout of state.callouts || []) {
    const panel = panels[callout.panel];
    if (panel) drawCallout(ctx, panel, callout);
  }
  drawSeal(ctx, w, h, state.seal || { on: false });
  drawBilling(ctx, w, h, state.billing || { on: false });
}
