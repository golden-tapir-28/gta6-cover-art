// Panel layouts for the Vice Cover Studio poster.
// Every layout is a list of photo panels in normalised coordinates
// (fractions of the cover width and height). The caption is drawn by
// cover.js as a scrim band across the bottom of the whole cover, so a
// layout only has to say where the photos go. Gutters between panels
// are the white comic-book seams of a GTA-style poster.

export const LAYOUTS = {
  duo: {
    name: 'Vice Duo',
    blurb: 'One big hero shot, two stacked panels beside it.',
    panels: 3,
  },
  trio: {
    name: 'Vice Trio',
    blurb: 'Three tall strips, left to right.',
    panels: 3,
  },
  quad: {
    name: 'Vice Quad',
    blurb: 'Four panels in a two-by-two grid.',
    panels: 4,
  },
  hero: {
    name: 'Vice Hero',
    blurb: 'One full-bleed photo, caption over the bottom.',
    panels: 1,
  },
};

export const LAYOUT_IDS = Object.keys(LAYOUTS);

/** Gutter width, as a fraction of the shorter cover side. */
const GUTTER = 0.014;

/**
 * Returns the photo panels for `layout` on a cover of `w` by `h` pixels.
 * Each panel is { x, y, w, h } in pixels, already inset by the gutter,
 * plus a small outer margin so the poster breathes inside its frame.
 */
export function layoutPanels(layout, w, h) {
  const g = Math.round(Math.min(w, h) * GUTTER);
  const m = Math.round(Math.min(w, h) * 0.012); // outer margin
  const x0 = m;
  const y0 = m;
  const x1 = w - m;
  const y1 = h - m;
  const fullW = x1 - x0;
  const fullH = y1 - y0;

  switch (layout) {
    case 'trio': {
      const third = Math.floor((fullW - 2 * g) / 3);
      return [
        { x: x0, y: y0, w: third, h: fullH },
        { x: x0 + third + g, y: y0, w: third, h: fullH },
        { x: x0 + 2 * (third + g), y: y0, w: fullW - 2 * third - 2 * g, h: fullH },
      ];
    }
    case 'quad': {
      const halfW = Math.floor((fullW - g) / 2);
      const halfH = Math.floor((fullH - g) / 2);
      return [
        { x: x0, y: y0, w: halfW, h: halfH },
        { x: x0 + halfW + g, y: y0, w: fullW - halfW - g, h: halfH },
        { x: x0, y: y0 + halfH + g, w: halfW, h: fullH - halfH - g },
        { x: x0 + halfW + g, y: y0 + halfH + g, w: fullW - halfW - g, h: fullH - halfH - g },
      ];
    }
    case 'hero': {
      return [{ x: x0, y: y0, w: fullW, h: fullH }];
    }
    case 'duo':
    default: {
      const heroW = Math.floor(fullW * 0.6);
      const sideW = fullW - heroW - g;
      const halfH = Math.floor((fullH - g) / 2);
      return [
        { x: x0, y: y0, w: heroW, h: fullH },
        { x: x0 + heroW + g, y: y0, w: sideW, h: halfH },
        { x: x0 + heroW + g, y: y0 + halfH + g, w: sideW, h: fullH - halfH - g },
      ];
    }
  }
}

/** How many photo panels `layout` has. */
export function panelCount(layout) {
  return LAYOUTS[layout]?.panels ?? 3;
}

/**
 * The caption band: the strip along the bottom of the cover where the
 * title and subtitle sit, drawn over a dark scrim. Returned as
 * { x, y, w, h } in pixels, plus the scrim's height in pixels.
 */
export function captionBand(w, h) {
  const bandH = Math.round(h * 0.26);
  return { x: 0, y: h - bandH, w, h: bandH };
}
