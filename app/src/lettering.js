// lettering.js — the big type of Neon Coast Cover Studio.
//
// GTA poster type is condensed, loud and outlined: Anton set huge with a sunset
// gradient fill and a thick dark outline, a Pacifico script subtitle underneath,
// and small graphic furniture (star heat meter, badge ribbon, corner bug) that
// makes the cover feel like a published game box. All drawing is canvas 2D with
// the vendored OFL fonts; nothing is an image of text.

/** Ensure the vendored display fonts are loaded before any canvas text is drawn. */
export async function ensureFontsLoaded() {
  try {
    await Promise.all([
      document.fonts.load('400 100px Anton'),
      document.fonts.load('400 60px Pacifico'),
    ]);
  } catch (e) {
    // Fall back to system fonts if a font file is missing; the layout still works.
    console.warn('Font load failed, using fallback:', e);
  }
}

/** Fit `text` to `maxWidth` by shrinking the font size; returns the size used. */
function fitFontSize(ctx, text, fontFamily, startSize, maxWidth, weight = 400) {
  let size = startSize;
  while (size > 12) {
    ctx.font = `${weight} ${size}px ${fontFamily}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  ctx.font = `${weight} ${size}px ${fontFamily}`;
  return size;
}

/**
 * Draw the main title in Anton with a sunset gradient fill and a thick dark
 * outline, centered or left-aligned inside (x, y, w, h). Returns the baseline y.
 */
export function drawGradientTitle(ctx, text, x, y, w, h, align = 'left') {
  const upper = text.toUpperCase();
  const size = fitFontSize(ctx, upper, 'Anton, "Arial Narrow", sans-serif', Math.round(h * 0.95), w * 0.96);
  const grad = ctx.createLinearGradient(x, y, x, y + size);
  grad.addColorStop(0, '#ffe259');
  grad.addColorStop(0.45, '#ff7e3d');
  grad.addColorStop(0.75, '#ff2e88');
  grad.addColorStop(1, '#b537f2');
  ctx.textAlign = align === 'center' ? 'center' : 'left';
  ctx.textBaseline = 'alphabetic';
  const tx = align === 'center' ? x + w / 2 : x;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#12041f';
  ctx.lineWidth = Math.max(3, size * 0.09);
  ctx.strokeText(upper, tx, y + size);
  ctx.fillStyle = grad;
  ctx.fillText(upper, tx, y + size);
  return y + size;
}

/** Draw the script subtitle in Pacifico, in warm cream with a soft shadow. */
export function drawScriptSubtitle(ctx, text, x, y, w, size, align = 'left') {
  if (!text) return y;
  const fitted = fitFontSize(ctx, text, 'Pacifico, cursive', size, w * 0.96);
  ctx.textAlign = align === 'center' ? 'center' : 'left';
  ctx.textBaseline = 'alphabetic';
  const tx = align === 'center' ? x + w / 2 : x;
  ctx.shadowColor = 'rgba(18,4,31,0.7)';
  ctx.shadowBlur = fitted * 0.12;
  ctx.fillStyle = '#fff3d6';
  ctx.fillText(text, tx, y + fitted);
  ctx.shadowBlur = 0;
  return y + fitted;
}

/** Draw a row of `count` stars, `filled` of them lit gold, as a heat meter. */
export function drawStarHeatMeter(ctx, x, y, size, count = 5, filled = 5) {
  for (let i = 0; i < count; i++) {
    const cx = x + i * size * 1.25 + size / 2;
    const cy = y + size / 2;
    drawStar(ctx, cx, cy, size / 2, size / 4, 5);
    ctx.fillStyle = i < filled ? '#ffd23f' : 'rgba(255,255,255,0.25)';
    ctx.strokeStyle = '#12041f';
    ctx.lineWidth = Math.max(1.5, size * 0.06);
    ctx.fill();
    ctx.stroke();
  }
  return x + count * size * 1.25;
}

function drawStar(ctx, cx, cy, outerR, innerR, points) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (i * Math.PI) / points - Math.PI / 2;
    const px = cx + r * Math.cos(a);
    const py = cy + r * Math.sin(a);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/** Draw a ribbon badge with a short label (e.g. "EST. 2026") at (x, y). */
export function drawBadgeRibbon(ctx, label, x, y, w, h) {
  const r = h / 2;
  ctx.save();
  ctx.fillStyle = '#ff2e88';
  ctx.strokeStyle = '#12041f';
  ctx.lineWidth = Math.max(2, h * 0.06);
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = `400 ${Math.round(h * 0.42)}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label.toUpperCase(), x + w / 2, y + h / 2 + 1);
  ctx.restore();
}

/** Draw the original corner mark: a small neon sun over waves, NOT any studio logo. */
export function drawCornerBug(ctx, x, y, size) {
  ctx.save();
  ctx.translate(x, y);
  // Sun disc.
  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, '#ffe259');
  grad.addColorStop(1, '#ff2e88');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(size / 2, size * 0.42, size * 0.3, 0, Math.PI * 2);
  ctx.fill();
  // Waves.
  ctx.strokeStyle = '#2de2ff';
  ctx.lineWidth = size * 0.07;
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const wy = size * (0.68 + i * 0.11);
    ctx.beginPath();
    ctx.moveTo(size * 0.12, wy);
    ctx.quadraticCurveTo(size * 0.3, wy - size * 0.07, size * 0.5, wy);
    ctx.quadraticCurveTo(size * 0.7, wy + size * 0.07, size * 0.88, wy);
    ctx.stroke();
  }
  ctx.restore();
}
