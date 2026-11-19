// layouts.js — the seven panel layouts of Neon Coast Cover Studio.
//
// Every layout is a pure function of (width, height) returning { panels, title } where
// panels is an array of { x, y, w, h, rotate?, photoIndex } in canvas pixels and title is
// the geometry of the title block { x, y, w, h, align }. The collage engine in cover.js
// draws each panel with a thick white gutter, then the title block on top, so a cover
// reads like a GTA poster: many small moments, one huge condensed title.
//
// All geometry is derived from the canvas size, so the same layout works for a 1080x1080
// square, a 1920x1080 landscape, a 1080x1350 portrait and a 1080x1920 story.

/** Split the usable area into a grid of `cols` x `rows` cells with gutters. */
function gridCells(x, y, w, h, cols, rows, gutter) {
  const cw = (w - gutter * (cols - 1)) / cols;
  const ch = (h - gutter * (rows - 1)) / rows;
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({ x: x + c * (cw + gutter), y: y + r * (ch + gutter), w: cw, h: ch });
    }
  }
  return cells;
}

/** A 3x3 grid with a wide title band across the bottom third. */
export function ninePanelGridWithTitleBlock(w, h) {
  const gutter = Math.round(Math.min(w, h) * 0.016);
  const titleH = Math.round(h * 0.26);
  const gridH = h - titleH - gutter;
  const cells = gridCells(0, 0, w, gridH, 3, 3, gutter);
  return {
    panels: cells.map((c, i) => ({ ...c, photoIndex: i % 2 })),
    title: { x: 0, y: gridH + gutter, w, h: titleH, align: 'left' },
  };
}

/** One large hero panel on the left, three stacked panels on the right. */
export function heroAndThree(w, h) {
  const gutter = Math.round(Math.min(w, h) * 0.016);
  const titleH = Math.round(h * 0.22);
  const bodyH = h - titleH - gutter;
  const heroW = Math.round(w * 0.58);
  const sideX = heroW + gutter;
  const sideW = w - sideX;
  const sideCells = gridCells(sideX, 0, sideW, bodyH, 1, 3, gutter);
  return {
    panels: [
      { x: 0, y: 0, w: heroW, h: bodyH, photoIndex: 0 },
      ...sideCells.map((c, i) => ({ ...c, photoIndex: (i + 1) % 2 })),
    ],
    title: { x: 0, y: bodyH + gutter, w, h: titleH, align: 'left' },
  };
}

/** A single full-bleed photo with a title band floating over its lower third. */
export function fullBleedHero(w, h) {
  const titleH = Math.round(h * 0.3);
  return {
    panels: [{ x: 0, y: 0, w, h, photoIndex: 0 }],
    title: { x: 0, y: h - titleH, w, h: titleH, align: 'center', overlay: true },
  };
}

/** Four equal panels, title band across the bottom. */
export function fourPanelGrid(w, h) {
  const gutter = Math.round(Math.min(w, h) * 0.016);
  const titleH = Math.round(h * 0.24);
  const gridH = h - titleH - gutter;
  const cells = gridCells(0, 0, w, gridH, 2, 2, gutter);
  return {
    panels: cells.map((c, i) => ({ ...c, photoIndex: i % 2 })),
    title: { x: 0, y: gridH + gutter, w, h: titleH, align: 'left' },
  };
}

/** Polaroid-style tilted snapshots scattered over a dark backdrop, title at top. */
export function tiltedSnapshots(w, h) {
  const gutter = Math.round(Math.min(w, h) * 0.02);
  const titleH = Math.round(h * 0.18);
  const bodyY = titleH + gutter;
  const bodyH = h - bodyY;
  const pw = Math.round(w * 0.44);
  const ph = Math.round(bodyH * 0.46);
  const angles = [-6, 5, -4, 7];
  const spots = [
    { x: Math.round(w * 0.04), y: bodyY + Math.round(bodyH * 0.02) },
    { x: Math.round(w * 0.52), y: bodyY + Math.round(bodyH * 0.04) },
    { x: Math.round(w * 0.08), y: bodyY + Math.round(bodyH * 0.5) },
    { x: Math.round(w * 0.5), y: bodyY + Math.round(bodyH * 0.52) },
  ];
  return {
    panels: spots.map((s, i) => ({ ...s, w: pw, h: ph, rotate: angles[i], photoIndex: i % 2 })),
    title: { x: 0, y: 0, w, h: titleH, align: 'center' },
  };
}

/** Two tall panels side by side, title band across the bottom. */
export function duoSplitPanels(w, h) {
  const gutter = Math.round(Math.min(w, h) * 0.016);
  const titleH = Math.round(h * 0.22);
  const gridH = h - titleH - gutter;
  const half = (w - gutter) / 2;
  return {
    panels: [
      { x: 0, y: 0, w: half, h: gridH, photoIndex: 0 },
      { x: half + gutter, y: 0, w: half, h: gridH, photoIndex: 1 },
    ],
    title: { x: 0, y: gridH + gutter, w, h: titleH, align: 'center' },
  };
}

/** Magazine stack: one wide top panel, two overlapping smaller panels below, title on top. */
export function magazineStackLayers(w, h) {
  const gutter = Math.round(Math.min(w, h) * 0.016);
  const titleH = Math.round(h * 0.2);
  const bodyY = titleH + gutter;
  const bodyH = h - bodyY;
  const topH = Math.round(bodyH * 0.52);
  const botY = bodyY + topH + gutter;
  const botH = bodyH - topH - gutter;
  const leftW = Math.round(w * 0.62);
  return {
    panels: [
      { x: 0, y: bodyY, w, h: topH, photoIndex: 0 },
      { x: 0, y: botY, w: leftW, h: botH, photoIndex: 1 },
      { x: leftW + gutter, y: botY, w: w - leftW - gutter, h: botH, photoIndex: 0 },
    ],
    title: { x: 0, y: 0, w, h: titleH, align: 'left' },
  };
}

export const LAYOUTS = [
  { id: 'nine', name: 'Nine-Panel Grid', description: 'Classic GTA poster: 3x3 photo grid with a wide title block.', fn: ninePanelGridWithTitleBlock },
  { id: 'hero', name: 'Hero + Three', description: 'One large hero moment with three stacked side panels.', fn: heroAndThree },
  { id: 'full', name: 'Full-Bleed Hero', description: 'A single photo edge to edge with the title floating over it.', fn: fullBleedHero },
  { id: 'four', name: 'Four-Panel Grid', description: 'Four equal panels, clean and bold, title band below.', fn: fourPanelGrid },
  { id: 'tilted', name: 'Tilted Snapshots', description: 'Polaroid-style tilted photos scattered like evidence on a desk.', fn: tiltedSnapshots },
  { id: 'duo', name: 'Duo Split', description: 'Two tall panels side by side, a before-and-after pair.', fn: duoSplitPanels },
  { id: 'magazine', name: 'Magazine Stack', description: 'A wide top shot over two overlapping layers, title up top.', fn: magazineStackLayers },
];

export function getLayout(id) {
  return LAYOUTS.find((l) => l.id === id) || LAYOUTS[0];
}
