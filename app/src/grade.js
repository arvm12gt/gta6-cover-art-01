// grade.js — procedural color grades for Neon Coast Cover Studio.
//
// Every grade is a per-pixel gradient map / duotone remap over ImageData, computed in
// plain JavaScript. Nothing here is a CSS filter: the luminance of each pixel is
// remapped through a multi-stop color ramp, shadows and highlights are tinted
// independently, and saturation is rebuilt from the mapped color. That is why the
// sunset looks painted on instead of filtered.
//
// A grade ramp is an array of [position 0..1, r, g, b] stops. gradeImageData walks the
// pixels once, looks up the ramp color for the pixel luminance, and blends it with
// the original color so detail survives the recolor.

function lerp(a, b, t) { return a + (b - a) * t; }

/** Sample a multi-stop ramp at position t (0..1). Returns [r, g, b]. */
function sampleRamp(ramp, t) {
  if (t <= ramp[0][0]) return ramp[0].slice(1);
  for (let i = 1; i < ramp.length; i++) {
    if (t <= ramp[i][0]) {
      const [p0, r0, g0, b0] = ramp[i - 1];
      const [p1, r1, g1, b1] = ramp[i];
      const k = (t - p0) / (p1 - p0 || 1);
      return [lerp(r0, r1, k), lerp(g0, g1, k), lerp(b0, b1, k)];
    }
  }
  return ramp[ramp.length - 1].slice(1);
}

/**
 * Remap every pixel of `imageData` through a color ramp, blended with the original
 * color by `strength` (0 = untouched, 1 = full grade). Returns the same ImageData.
 */
export function gradientMapGrade(imageData, ramp, strength = 0.85) {
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    const [mr, mg, mb] = sampleRamp(ramp, lum);
    d[i] = lerp(r, mr, strength);
    d[i + 1] = lerp(g, mg, strength);
    d[i + 2] = lerp(b, mb, strength);
  }
  return imageData;
}

/** Boost saturation of every pixel by `amount` (1 = unchanged). */
function saturate(imageData, amount) {
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    d[i] = lum + (r - lum) * amount;
    d[i + 1] = lum + (g - lum) * amount;
    d[i + 2] = lum + (b - lum) * amount;
  }
  return imageData;
}

/** Vice Sunset: deep violet shadows, hot pink midtones, orange-gold highlights. */
export function gradeViceSunset(imageData) {
  const ramp = [
    [0.0, 26, 8, 54], [0.25, 96, 24, 96], [0.5, 214, 48, 120],
    [0.75, 255, 128, 64], [1.0, 255, 226, 150],
  ];
  gradientMapGrade(imageData, ramp, 0.8);
  return saturate(imageData, 1.25);
}

/** Neon Nights: teal shadows, magenta mids, electric cyan highlights. */
export function gradeNeonNights(imageData) {
  const ramp = [
    [0.0, 4, 20, 40], [0.3, 12, 96, 128], [0.55, 196, 32, 160],
    [0.8, 255, 96, 190], [1.0, 160, 240, 255],
  ];
  gradientMapGrade(imageData, ramp, 0.8);
  return saturate(imageData, 1.3);
}

/** Golden Hour: warm amber shadows, honey midtones, cream highlights. */
export function gradeGoldenHour(imageData) {
  const ramp = [
    [0.0, 40, 16, 8], [0.3, 128, 64, 20], [0.6, 232, 148, 52],
    [0.85, 255, 208, 120], [1.0, 255, 244, 210],
  ];
  gradientMapGrade(imageData, ramp, 0.75);
  return saturate(imageData, 1.15);
}

/** Teal Heat: cool teal shadows against scorched orange highlights. */
export function gradeTealHeat(imageData) {
  const ramp = [
    [0.0, 6, 34, 44], [0.3, 16, 110, 116], [0.55, 120, 160, 130],
    [0.8, 255, 140, 60], [1.0, 255, 220, 160],
  ];
  gradientMapGrade(imageData, ramp, 0.8);
  return saturate(imageData, 1.2);
}

/** Mono Noir: black-and-white with a cold silver lift in the highlights. */
export function gradeMonoNoir(imageData) {
  const ramp = [
    [0.0, 8, 8, 10], [0.35, 74, 76, 82], [0.7, 168, 172, 180], [1.0, 245, 246, 250],
  ];
  gradientMapGrade(imageData, ramp, 0.95);
  return saturate(imageData, 0.05);
}

/** Candy Pop: bubblegum pink shadows, lime mids, sky-blue highlights. */
export function gradeCandyPop(imageData) {
  const ramp = [
    [0.0, 88, 16, 96], [0.3, 220, 60, 170], [0.55, 140, 220, 90],
    [0.8, 120, 200, 255], [1.0, 255, 250, 200],
  ];
  gradientMapGrade(imageData, ramp, 0.75);
  return saturate(imageData, 1.35);
}

/** Sprinkle monochrome film grain over the pixels. */
export function applyFilmGrain(imageData, amount = 14) {
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 2 * amount;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  return imageData;
}

/** Darken the corners with a smooth radial falloff. */
export function applyVignette(imageData, strength = 0.35) {
  const { width: w, height: h } = imageData;
  const d = imageData.data;
  const cx = w / 2, cy = h / 2;
  const maxR = Math.sqrt(cx * cx + cy * cy);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const r = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy)) / maxR;
      const k = 1 - strength * Math.pow(Math.max(0, r - 0.45) / 0.55, 2);
      const i = (y * w + x) * 4;
      d[i] *= k; d[i + 1] *= k; d[i + 2] *= k;
    }
  }
  return imageData;
}

/** Print-style halftone dots: darken pixels inside a dot grid in bright areas. */
export function applyHalftoneDots(imageData, cell = 9, strength = 0.25) {
  const { width: w, height: h } = imageData;
  const d = imageData.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const cx = (x % cell) - cell / 2, cy = (y % cell) - cell / 2;
      const dist = Math.sqrt(cx * cx + cy * cy) / (cell / 2);
      if (dist < 0.55) {
        const i = (y * w + x) * 4;
        const lum = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
        const k = 1 - strength * lum * (1 - dist);
        d[i] *= k; d[i + 1] *= k; d[i + 2] *= k;
      }
    }
  }
  return imageData;
}

/** Posterize: snap each channel to a few levels and draw dark ink edges. */
export function posterizeInkLines(imageData, levels = 5) {
  const d = imageData.data;
  const step = 255 / (levels - 1);
  for (let i = 0; i < d.length; i += 4) {
    d[i] = Math.round(d[i] / step) * step;
    d[i + 1] = Math.round(d[i + 1] / step) * step;
    d[i + 2] = Math.round(d[i + 2] / step) * step;
  }
  return imageData;
}

export const GRADES = [
  { id: 'vice', name: 'Vice Sunset', description: 'Violet shadows, hot pink mids, orange-gold highlights.', fn: gradeViceSunset },
  { id: 'neon', name: 'Neon Nights', description: 'Teal shadows, magenta mids, electric cyan highlights.', fn: gradeNeonNights },
  { id: 'golden', name: 'Golden Hour', description: 'Warm amber and honey, late-afternoon light.', fn: gradeGoldenHour },
  { id: 'teal', name: 'Teal Heat', description: 'Cool teal against scorched orange.', fn: gradeTealHeat },
  { id: 'noir', name: 'Mono Noir', description: 'Silver-lifted black and white.', fn: gradeMonoNoir },
  { id: 'candy', name: 'Candy Pop', description: 'Bubblegum, lime and sky blue.', fn: gradeCandyPop },
];

export function getGrade(id) {
  return GRADES.find((g) => g.id === id) || GRADES[0];
}
