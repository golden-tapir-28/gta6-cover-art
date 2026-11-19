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

/**
 * Draws one photo into one panel, cover-fit, with the panel's zoom
 * (1 = fit exactly) and pan (-0.5..0.5 of the panel's size on each axis).
 * Photos the user has not set yet leave the panel as a dark placeholder
 * with a dashed frame and a hint, so an empty panel never looks broken.
 */
export function drawPhotoPanel(ctx, photo, panel, zoom, panX, panY) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(panel.x, panel.y, panel.w, panel.h);
  ctx.clip();

  if (!photo || !photo.naturalWidth) {
    ctx.fillStyle = '#241633';
    ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = Math.max(2, panel.w * 0.008);
    ctx.setLineDash([panel.w * 0.03, panel.w * 0.02]);
    ctx.strokeRect(
      panel.x + panel.w * 0.08,
      panel.y + panel.h * 0.08,
      panel.w * 0.84,
      panel.h * 0.84,
    );
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
    applyGrade(ctx, grade, panel.x, panel.y, panel.w, panel.h);
  });

  // White comic-book seams around every panel.
  ctx.strokeStyle = '#f5eefc';
  ctx.lineWidth = Math.max(2, Math.min(w, h) * 0.008);
  for (const panel of panels) {
    ctx.strokeRect(panel.x, panel.y, panel.w, panel.h);
  }

  const band = captionBand(w, h);
  applyCaptionScrim(ctx, band);
  drawCaption(ctx, state.title, state.subtitle, colour, band, w);
}
