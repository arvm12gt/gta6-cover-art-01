// focus.js — face-aware focus detection for Neon Coast Cover Studio.
//
// When a photo is cropped into a panel of a different aspect ratio, a naive center
// crop can cut a person in half. detectFocusPoint finds the most interesting point
// of the photo so the crop keeps it: it downsamples the image to a small grid and
// scores every cell on two signals — edge saliency (luminance contrast with the
// neighbours, which marks faces, signs and silhouettes) and skin-tone likelihood
// (a simple YCbCr skin band, which marks people). The weighted centroid of the
// best-scoring cells is the focus point, returned in normalized 0..1 coordinates.
// cropRectForPanel then frames that point inside any panel rectangle.

/** Skin-tone likelihood in [0,1] from YCbCr chroma (classic Cb/Cr skin band). */
function skinLikelihood(r, g, b) {
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  const inCb = cb > 77 && cb < 127;
  const inCr = cr > 133 && cr < 173;
  if (!inCb || !inCr) return 0;
  const cbScore = 1 - Math.abs(cb - 102) / 25;
  const crScore = 1 - Math.abs(cr - 153) / 20;
  return Math.max(0, Math.min(cbScore, crScore));
}

/**
 * Find the focus point of an ImageData: { x, y } in normalized 0..1 coordinates.
 * Combines edge saliency (60%) and skin-tone likelihood (40%), biased slightly
 * toward the upper half of the frame where faces usually are.
 */
export function detectFocusPoint(imageData) {
  const { width: w, height: h, data: d } = imageData;
  const cols = 24, rows = 24;
  const cellW = w / cols, cellH = h / rows;
  // Downsample to luminance + skin grids.
  const lum = new Float32Array(cols * rows);
  const skin = new Float32Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let lSum = 0, sSum = 0, n = 0;
      const step = Math.max(1, Math.floor(Math.min(cellW, cellH) / 2));
      for (let y = Math.floor(r * cellH); y < Math.min(h, (r + 1) * cellH); y += step) {
        for (let x = Math.floor(c * cellW); x < Math.min(w, (c + 1) * cellW); x += step) {
          const i = (y * w + x) * 4;
          const rr = d[i], gg = d[i + 1], bb = d[i + 2];
          lSum += 0.2126 * rr + 0.7152 * gg + 0.0722 * bb;
          sSum += skinLikelihood(rr, gg, bb);
          n++;
        }
      }
      lum[r * cols + c] = n ? lSum / n : 0;
      skin[r * cols + c] = n ? sSum / n : 0;
    }
  }
  // Score each cell: local luminance contrast + skin, upper-half bias.
  let total = 0, sx = 0, sy = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const center = lum[r * cols + c];
      let contrast = 0, count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr, nc = c + dc;
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || (dr === 0 && dc === 0)) continue;
          contrast += Math.abs(center - lum[nr * cols + nc]);
          count++;
        }
      }
      contrast = count ? contrast / count : 0;
      const upperBias = 1 + 0.25 * (1 - r / rows);
      const score = (contrast / 60) * 0.6 + skin[r * cols + c] * 0.4;
      const weight = Math.max(0, score) * upperBias;
      sx += (c + 0.5) / cols * weight;
      sy += (r + 0.5) / rows * weight;
      total += weight;
    }
  }
  if (total <= 0) return { x: 0.5, y: 0.42 };
  return { x: Math.min(0.95, Math.max(0.05, sx / total)), y: Math.min(0.95, Math.max(0.05, sy / total)) };
}

/**
 * Compute the source rectangle of `img` to draw into `panelRect` (cover-fit),
 * keeping `focus` ({x,y} normalized) visible. `zoom` scales the crop (1 = fit),
 * `offset` ({x,y} normalized, from dragging) shifts the framing.
 * Returns { sx, sy, sw, sh } in image pixels.
 */
export function cropRectForPanel(img, panelRect, focus = { x: 0.5, y: 0.42 }, zoom = 1, offset = { x: 0, y: 0 }) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const panelAspect = panelRect.w / panelRect.h;
  const imgAspect = iw / ih;
  let sw, sh;
  if (imgAspect > panelAspect) {
    sh = ih; sw = ih * panelAspect;
  } else {
    sw = iw; sh = iw / panelAspect;
  }
  sw /= zoom; sh /= zoom;
  // Anchor the crop on the focus point, clamped inside the image.
  let sx = focus.x * iw - sw / 2 + offset.x * iw;
  let sy = focus.y * ih - sh / 2 + offset.y * ih;
  sx = Math.max(0, Math.min(iw - sw, sx));
  sy = Math.max(0, Math.min(ih - sh, sy));
  return { sx, sy, sw, sh };
}
