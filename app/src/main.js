// main.js — Neon Coast Cover Studio editor: state, toolbar, live preview, export.
//
// State: { layout, grade, texture, title, subtitle, stars, ribbon,
//           photos: [Image|null, Image|null], panels: [{zoom, offset}, {zoom, offset}] }.
// Every change pushes the previous state onto the undo stack and re-renders the
// live preview through renderCover(); exports render the same state at full size
// so the download is pixel-identical to the preview. A `?shot=` query hands
// control to shots.js instead (fixed scenes for screenshots).

import { renderCover, exportCanvasToPNG } from './cover.js';
import { LAYOUTS } from './layouts.js';
import { GRADES } from './grade.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const statusEl = document.getElementById('status');

export const EXPORT_SIZES = [
  { id: '1080x1080', label: 'Square 1080 x 1080', w: 1080, h: 1080 },
  { id: '1080x1350', label: 'Portrait 1080 x 1350', w: 1080, h: 1350 },
  { id: '1920x1080', label: 'Landscape 1920 x 1080', w: 1920, h: 1080 },
  { id: '1080x1920', label: 'Story 1080 x 1920', w: 1080, h: 1920 },
];

export const DEFAULT_STATE = {
  layout: 'nine',
  grade: 'vice',
  texture: 'grain',
  title: 'NEON SHORE',
  subtitle: 'Vice City nights',
  stars: 5,
  ribbon: 'EST. 2026',
  photos: [null, null],
  panels: [{ zoom: 1, offset: { x: 0, y: 0 } }, { zoom: 1, offset: { x: 0, y: 0 } }],
};

let state = structuredClone(DEFAULT_STATE);
let undoStack = [];
let redoStack = [];
let renderToken = 0;

function snapshot() {
  return JSON.parse(JSON.stringify({ ...state, photos: state.photos.map((p) => (p ? p.src : null)) }));
}

function commit() {
  undoStack.push(snapshot());
  if (undoStack.length > 50) undoStack.shift();
  redoStack = [];
  renderPreview();
}

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function renderPreview() {
  const token = ++renderToken;
  const preview = await renderCover(state, 1080, 1080);
  if (token !== renderToken) return; // a newer render superseded this one
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(preview, 0, 0);
  document.getElementById('undo').disabled = undoStack.length === 0;
  document.getElementById('redo').disabled = redoStack.length === 0;
}

function fillSelect(select, items, value) {
  select.innerHTML = '';
  for (const item of items) {
    const opt = document.createElement('option');
    opt.value = item.id;
    opt.textContent = `${item.name} — ${item.description}`;
    select.appendChild(opt);
  }
  select.value = value;
}

fillSelect(document.getElementById('layout'), LAYOUTS, state.layout);
fillSelect(document.getElementById('grade'), GRADES, state.grade);

document.getElementById('layout').addEventListener('change', (e) => { state.layout = e.target.value; commit(); });
document.getElementById('grade').addEventListener('change', (e) => { state.grade = e.target.value; commit(); });
document.getElementById('texture').addEventListener('change', (e) => { state.texture = e.target.value; commit(); });
document.getElementById('title').addEventListener('input', (e) => { state.title = e.target.value || 'NEON SHORE'; renderPreview(); });
document.getElementById('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; renderPreview(); });
document.getElementById('stars').addEventListener('change', (e) => { state.stars = Number(e.target.value); commit(); });

// Photo loading: per-panel upload buttons and the sample-photo shortcut.
async function loadPhotoInto(slot, fileOrUrl) {
  const url = typeof fileOrUrl === 'string' ? fileOrUrl : URL.createObjectURL(fileOrUrl);
  const img = await loadImage(url);
  state.photos[slot] = img;
  commit();
}

document.getElementById('photo0').addEventListener('change', (e) => {
  if (e.target.files[0]) loadPhotoInto(0, e.target.files[0]);
});
document.getElementById('photo1').addEventListener('change', (e) => {
  if (e.target.files[0]) loadPhotoInto(1, e.target.files[0]);
});
document.getElementById('sample').addEventListener('click', async () => {
  state.photos[0] = await loadImage('samples/pier.jpg');
  state.photos[1] = await loadImage('samples/boulevard.jpg');
  commit();
  statusEl.textContent = 'Sample photos loaded: pier + boulevard.';
});

// Per-panel drag to reposition + wheel to zoom (panel under the pointer).
let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const px = ((e.clientX - rect.left) / rect.width) * 1080;
  const py = ((e.clientY - rect.top) / rect.height) * 1080;
  drag = { x: px, y: py, slot: panelSlotAt(px, py) };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag || drag.slot == null) return;
  const rect = canvas.getBoundingClientRect();
  const px = ((e.clientX - rect.left) / rect.width) * 1080;
  const py = ((e.clientY - rect.top) / rect.height) * 1080;
  const per = state.panels[drag.slot];
  per.offset.x += (px - drag.x) / 1080;
  per.offset.y += (py - drag.y) / 1080;
  drag.x = px; drag.y = py;
  renderPreview();
});
canvas.addEventListener('pointerup', () => { if (drag) { drag = null; commit(); } });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const px = ((e.clientX - rect.left) / rect.width) * 1080;
  const py = ((e.clientY - rect.top) / rect.height) * 1080;
  const slot = panelSlotAt(px, py);
  if (slot == null) return;
  const per = state.panels[slot];
  per.zoom = Math.min(3, Math.max(1, per.zoom * (e.deltaY < 0 ? 1.1 : 0.9)));
  renderPreview();
}, { passive: false });

/** Which photo slot (0 or 1) the preview point falls in, via the live layout. */
function panelSlotAt(px, py) {
  // Recompute the current layout geometry at preview size (1080x1080).
  const layout = LAYOUTS.find((l) => l.id === state.layout) || LAYOUTS[0];
  const geo = layout.fn(1080, 1080);
  for (const panel of geo.panels) {
    if (px >= panel.x && px <= panel.x + panel.w && py >= panel.y && py <= panel.y + panel.h) {
      return panel.photoIndex;
    }
  }
  return null;
}

// Undo / redo.
document.getElementById('undo').addEventListener('click', async () => {
  if (!undoStack.length) return;
  redoStack.push(snapshot());
  const prev = undoStack.pop();
  await restoreSnapshot(prev);
});
document.getElementById('redo').addEventListener('click', async () => {
  if (!redoStack.length) return;
  undoStack.push(snapshot());
  const next = redoStack.pop();
  await restoreSnapshot(next);
});

async function restoreSnapshot(snap) {
  state = { ...snap, photos: [null, null], panels: snap.panels };
  for (let i = 0; i < 2; i++) {
    if (snap.photos[i]) state.photos[i] = await loadImage(snap.photos[i]);
  }
  document.getElementById('layout').value = state.layout;
  document.getElementById('grade').value = state.grade;
  document.getElementById('texture').value = state.texture;
  document.getElementById('title').value = state.title;
  document.getElementById('subtitle').value = state.subtitle;
  document.getElementById('stars').value = String(state.stars);
  renderPreview();
}

// Export: four sizes, PNG download.
const sizeSelect = document.getElementById('exportSize');
for (const s of EXPORT_SIZES) {
  const opt = document.createElement('option');
  opt.value = s.id;
  opt.textContent = s.label;
  sizeSelect.appendChild(opt);
}
document.getElementById('export').addEventListener('click', async () => {
  const size = EXPORT_SIZES.find((s) => s.id === sizeSelect.value) || EXPORT_SIZES[0];
  statusEl.textContent = `Rendering ${size.label}…`;
  try {
    const blob = await exportCanvasToPNG(state, size.w, size.h);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-coast-cover-${size.w}x${size.h}.png`;
    a.click();
    statusEl.textContent = `Saved neon-coast-cover-${size.w}x${size.h}.png`;
  } catch (e) {
    statusEl.textContent = `Export failed: ${e.message}`;
  }
});

// Boot: shot scenes take over; otherwise load the samples and render.
const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  runShot(shot, params, state, renderPreview);
} else {
  (async () => {
    state.photos[0] = await loadImage('samples/pier.jpg');
    state.photos[1] = await loadImage('samples/boulevard.jpg');
    renderPreview();
  })();
}
