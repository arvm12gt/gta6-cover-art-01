// cover.js — the composite engine of Neon Coast Cover Studio.
//
// renderCover(state, width, height) paints one finished cover onto a fresh canvas:
//   1. a dark sunset backdrop,
//   2. each layout panel, face-aware cropped, graded per-pixel, with white gutters
//      and a soft drop shadow (tilted panels are rotated),
//   3. print texture — film grain, vignette, halftone dots — over the photo area,
//   4. the title block: gradient Anton title, Pacifico subtitle, star heat meter,
//      badge ribbon and the original corner bug.
// The same function drives the live editor preview and the PNG exports, so what
// you see is exactly what you download.

import { getLayout } from './layouts.js';
import { getGrade, applyFilmGrain, applyVignette, applyHalftoneDots, posterizeInkLines } from './grade.js';
import { detectFocusPoint, cropRectForPanel } from './focus.js';
import { drawGradientTitle, drawScriptSubtitle, drawStarHeatMeter, drawBadgeRibbon, drawCornerBug, ensureFontsLoaded } from './lettering.js';

/** Grade a panel's pixels in place on an offscreen canvas. */
function gradePanelImage(img, gradeId, texture) {
  const c = document.createElement('canvas');
  c.width = Math.min(img.naturalWidth || img.width, 1200);
  c.height = Math.round(c.width * ((img.naturalHeight || img.height) / (img.naturalWidth || img.width)));
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0, c.width, c.height);
  const data = g.getImageData(0, 0, c.width, c.height);
  getGrade(gradeId).fn(data);
  if (texture === 'poster') posterizeInkLines(data, 5);
  applyFilmGrain(data, 10);
  applyVignette(data, 0.3);
  if (texture === 'halftone') applyHalftoneDots(data, 9, 0.22);
  g.putImageData(data, 0, 0);
  return c;
}

/** Draw one photo into one panel rect, face-aware cropped, with gutter + shadow. */
export function drawPanelImage(ctx, img, panel, state, focusCache) {
  const { x, y, w, h, rotate = 0 } = panel;
  ctx.save();
  if (rotate) {
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate((rotate * Math.PI) / 180);
    ctx.translate(-w / 2, -h / 2);
  } else {
    ctx.translate(x, y);
  }
  // Polaroid-style white frame for tilted panels, thin white gutter otherwise.
  const frame = rotate ? Math.max(6, w * 0.05) : Math.max(3, Math.min(w, h) * 0.014);
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;
  ctx.fillRect(-frame, -frame, w + frame * 2, h + frame * 2);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  const key = img.src || 'sample';
  let focus = focusCache.get(key);
  if (!focus) {
    focus = detectFocusPointFromImage(img);
    focusCache.set(key, focus);
  }
  const per = state.panels[panel.photoIndex] || {};
  const crop = cropRectForPanel(img, { w, h }, focus, per.zoom || 1, per.offset || { x: 0, y: 0 });
  const graded = gradePanelImage(img, state.grade, state.texture);
  ctx.drawImage(graded, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, w, h);
  ctx.restore();
}

/** Focus point for a loaded <img>, via a downscaled offscreen read. */
function detectFocusPointFromImage(img) {
  try {
    const c = document.createElement('canvas');
    const w = 160, h = Math.max(1, Math.round(160 * (img.naturalHeight / img.naturalWidth)));
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0, w, h);
    return detectFocusPoint(g.getImageData(0, 0, w, h));
  } catch (e) {
    return { x: 0.5, y: 0.42 };
  }
}

/** Paint the title block: gradient title, script subtitle, stars, ribbon, corner bug. */
function drawTitleBlock(ctx, state, title, w, h) {
  const pad = Math.round(Math.min(w, h) * 0.03);
  const tx = title.x + pad;
  const tw = title.w - pad * 2;
  if (title.overlay) {
    // Dark scrim so the title reads over the full-bleed photo.
    const scrim = ctx.createLinearGradient(0, title.y, 0, title.y + title.h);
    scrim.addColorStop(0, 'rgba(18,4,31,0)');
    scrim.addColorStop(1, 'rgba(18,4,31,0.82)');
    ctx.fillStyle = scrim;
    ctx.fillRect(title.x, title.y, title.w, title.h);
  } else {
    ctx.fillStyle = '#12041f';
    ctx.fillRect(title.x, title.y, title.w, title.h);
  }
  const center = title.align === 'center';
  const titleY = title.y + Math.round(title.h * 0.06);
  const titleH = Math.round(title.h * 0.56);
  const base = drawGradientTitle(ctx, state.title, tx, titleY, tw, titleH, title.align);
  drawScriptSubtitle(ctx, state.subtitle, tx, base + Math.round(title.h * 0.02), tw, Math.round(title.h * 0.17), title.align);
  // Furniture row: stars left, ribbon right, corner bug far right.
  const fy = title.y + title.h - Math.round(title.h * 0.2);
  const starSize = Math.round(title.h * 0.1);
  const afterStars = drawStarHeatMeter(ctx, tx, fy, starSize, 5, state.stars || 5);
  const ribbonW = Math.round(tw * 0.22);
  const ribbonH = Math.round(title.h * 0.14);
  drawBadgeRibbon(ctx, state.ribbon || 'EST. 2026', title.x + title.w - pad - ribbonW, fy, ribbonW, ribbonH);
  drawCornerBug(ctx, title.x + title.w - pad - Math.round(title.h * 0.16), title.y + Math.round(title.h * 0.06), Math.round(title.h * 0.16));
  return afterStars;
}

/**
 * Render a finished cover. `state` carries { layout, grade, texture, title,
 * subtitle, stars, ribbon, photos: [img|null, img|null], panels: [{zoom,offset}] }.
 * Returns the canvas. Call ensureFontsLoaded() first for correct lettering.
 */
export async function renderCover(state, width, height) {
  await ensureFontsLoaded();
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const layout = getLayout(state.layout);
  const geo = layout.fn(width, height);
  // Backdrop: deep violet with a sunset wash at the top.
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, '#2a0a4a');
  bg.addColorStop(0.5, '#12041f');
  bg.addColorStop(1, '#0a0212');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  const focusCache = new Map();
  for (const panel of geo.panels) {
    const img = state.photos[panel.photoIndex];
    if (!img) {
      // Empty panel: placeholder tile with a dashed frame and a hint.
      ctx.fillStyle = '#241338';
      ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.setLineDash([8, 6]);
      ctx.lineWidth = 2;
      ctx.strokeRect(panel.x + 4, panel.y + 4, panel.w - 8, panel.h - 8);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = `400 ${Math.max(12, Math.round(panel.h * 0.06))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('Add a photo', panel.x + panel.w / 2, panel.y + panel.h / 2);
      continue;
    }
    drawPanelImage(ctx, img, panel, state, focusCache);
  }
  drawTitleBlock(ctx, state, geo.title, width, height);
  return canvas;
}

/** Export a cover state as a PNG blob at the requested size. */
export async function exportCanvasToPNG(state, width, height) {
  const canvas = await renderCover(state, width, height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG export failed'))), 'image/png');
  });
}
