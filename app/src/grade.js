// Colour grades for the Vice Cover Studio poster.
// A grade is a sunset or neon wash laid over the photo panels: a warm
// top-to-bottom gradient, a coloured vignette and a halftone dot screen
// in the shadows, the print-poster look of a GTA-style cover. Everything
// is drawn with plain canvas operations, so it works offline and exports
// exactly what the preview shows.

export const GRADES = {
  sunset: {
    name: 'Vice Sunset',
    blurb: 'Hot pink into orange, the classic poster dusk.',
    top: 'rgba(255, 94, 120, 0.12)',
    mid: 'rgba(255, 140, 66, 0.18)',
    bottom: 'rgba(124, 30, 120, 0.40)',
    vignette: 'rgba(40, 8, 60, 0.55)',
    dots: 'rgba(255, 255, 255, 0.10)',
  },
  neon: {
    name: 'Neon Night',
    blurb: 'Purple and teal after dark, lit signage.',
    top: 'rgba(80, 40, 255, 0.16)',
    mid: 'rgba(0, 229, 255, 0.08)',
    bottom: 'rgba(255, 0, 128, 0.30)',
    vignette: 'rgba(8, 4, 40, 0.60)',
    dots: 'rgba(0, 229, 255, 0.12)',
  },
  golden: {
    name: 'Golden Hour',
    blurb: 'Low amber sun, warm skin tones, soft haze.',
    top: 'rgba(255, 200, 90, 0.12)',
    mid: 'rgba(255, 150, 50, 0.14)',
    bottom: 'rgba(120, 50, 10, 0.30)',
    vignette: 'rgba(50, 25, 5, 0.50)',
    dots: 'rgba(255, 220, 140, 0.10)',
  },
  noir: {
    name: 'Vice Noir',
    blurb: 'High-contrast night, deep blacks, one hot accent.',
    top: 'rgba(10, 10, 20, 0.22)',
    mid: 'rgba(60, 10, 60, 0.16)',
    bottom: 'rgba(0, 0, 0, 0.38)',
    vignette: 'rgba(0, 0, 0, 0.65)',
    dots: 'rgba(255, 255, 255, 0.08)',
  },
};

export const GRADE_IDS = Object.keys(GRADES);

/** A small tile of halftone dots, reused as a canvas pattern. */
function dotTile(colour, spacing, radius) {
  const tile = document.createElement('canvas');
  tile.width = spacing * 2;
  tile.height = spacing * 2;
  const t = tile.getContext('2d');
  t.fillStyle = colour;
  t.beginPath();
  t.arc(spacing / 2, spacing / 2, radius, 0, Math.PI * 2);
  t.arc(spacing * 1.5, spacing * 1.5, radius, 0, Math.PI * 2);
  t.fill();
  return tile;
}

/**
 * Lays `grade` over the rectangle (x, y, w, h) of `ctx`:
 * a three-stop vertical wash, a halftone screen that fades in towards
 * the bottom, and a soft vignette that darkens the corners.
 */
export function applyGrade(ctx, grade, x, y, w, h) {
  const wash = ctx.createLinearGradient(0, y, 0, y + h);
  wash.addColorStop(0, grade.top);
  wash.addColorStop(0.55, grade.mid);
  wash.addColorStop(1, grade.bottom);
  ctx.fillStyle = wash;
  ctx.fillRect(x, y, w, h);

  // Halftone dots, denser towards the bottom of the panel.
  const spacing = Math.max(10, Math.round(Math.min(w, h) / 90));
  const tile = dotTile(grade.dots, spacing, Math.max(1.5, spacing * 0.16));
  const pattern = ctx.createPattern(tile, 'repeat');
  ctx.save();
  ctx.fillStyle = pattern;
  ctx.globalAlpha = 0.5;
  ctx.fillRect(x, y + h * 0.55, w, h * 0.45);
  ctx.restore();

  // Vignette: dark corners, clear centre.
  const cx = x + w / 2;
  const cy = y + h / 2;
  const r = Math.hypot(w, h) / 2;
  const vig = ctx.createRadialGradient(cx, cy, r * 0.45, cx, cy, r);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, grade.vignette);
  ctx.fillStyle = vig;
  ctx.fillRect(x, y, w, h);
}

/**
 * Darkens the bottom of the cover so the caption stays readable over
 * any photo: a scrim that starts transparent and deepens downwards.
 */
export function applyCaptionScrim(ctx, band) {
  const scrim = ctx.createLinearGradient(0, band.y - band.h * 0.35, 0, band.y + band.h);
  scrim.addColorStop(0, 'rgba(8, 4, 18, 0)');
  scrim.addColorStop(0.45, 'rgba(8, 4, 18, 0.55)');
  scrim.addColorStop(1, 'rgba(8, 4, 18, 0.88)');
  ctx.fillStyle = scrim;
  ctx.fillRect(band.x, band.y - band.h * 0.35, band.w, band.h * 1.35);
}
