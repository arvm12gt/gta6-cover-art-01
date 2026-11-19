// shots.js — fixed scenes for screenshots: ?shot=cover draws a finished cover
// full-frame on the canvas at the requested size; ?shot=editor shows the editor
// UI with a sample photo loaded and panels filled. window.__shotReady is set
// once the scene is painted, so the screenshot runner knows the frame is done.
// Query params: photo=pier|boulevard, caption=..., format=landscape|portrait|square.

import { renderCover } from './cover.js';
import { loadImage, DEFAULT_STATE } from './main.js';

/** Size for a shot=cover scene, from the format param. */
function coverSize(format) {
  if (format === 'portrait') return { w: 1024, h: 1280 };
  if (format === 'square') return { w: 1080, h: 1080 };
  return { w: 1280, h: 720 };
}

export async function runShot(shot, query, state, renderPreview) {
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const photo = query.get('photo') ?? 'pier';
    const caption = query.get('caption') ?? 'Sunset Heist';
    const format = query.get('format') ?? 'landscape';
    const size = coverSize(format);
    const img = await loadImage(`samples/${photo}.jpg`);
    const other = await loadImage(`samples/${photo === 'pier' ? 'boulevard' : 'pier'}.jpg`);
    const shotState = {
      ...structuredClone(DEFAULT_STATE),
      title: caption,
      subtitle: format === 'portrait' ? 'Vice City nights' : 'A Vice City story',
      photos: [img, other],
      panels: [{ zoom: 1, offset: { x: 0, y: 0 } }, { zoom: 1, offset: { x: 0, y: 0 } }],
    };
    const canvas = document.getElementById('cover');
    const painted = await renderCover(shotState, size.w, size.h);
    canvas.width = size.w;
    canvas.height = size.h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(painted, 0, 0);
    document.title = `Neon Coast — ${caption}`;
  } else if (shot === 'editor') {
    const photo = query.get('photo') ?? 'boulevard';
    const caption = query.get('caption') ?? 'Boulevard Queen';
    state.photos[0] = await loadImage(`samples/${photo}.jpg`);
    state.photos[1] = await loadImage(`samples/${photo === 'pier' ? 'boulevard' : 'pier'}.jpg`);
    state.title = caption;
    state.subtitle = 'Vice City nights';
    const titleInput = document.getElementById('title');
    if (titleInput) titleInput.value = caption;
    renderPreview();
  }
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
