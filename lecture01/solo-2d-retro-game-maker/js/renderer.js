// Canvas rendering utilities
import { COLORS } from './data.js';

export function createCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return { canvas:c, ctx:c.getContext('2d') };
}

export function scaleCanvas(canvas, factor) {
  const scaled = document.createElement('canvas');
  scaled.width = canvas.width * factor;
  scaled.height = canvas.height * factor;
  const sctx = scaled.getContext('2d');
  sctx.imageSmoothingEnabled = false;
  sctx.drawImage(canvas, 0, 0, scaled.width, scaled.height);
  return scaled;
}

export function renderTile(ctx, tx, ty, tileId, tiles, ts) {
  const tile = tiles.find(t => t.id === tileId);
  if (!tile || tileId === -1) return;
  ctx.fillStyle = tile.color;
  ctx.fillRect(tx * ts, ty * ts, ts, ts);
  // simple retro highlight
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(tx * ts, ty * ts, ts, 2);
}

export function renderGrid(ctx, w, h, ts, color = 'rgba(255,255,255,0.06)') {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  for (let x = 0; x <= w; x++) {
    ctx.beginPath(); ctx.moveTo(x * ts, 0); ctx.lineTo(x * ts, h * ts); ctx.stroke();
  }
  for (let y = 0; y <= h; y++) {
    ctx.beginPath(); ctx.moveTo(0, y * ts); ctx.lineTo(w * ts, y * ts); ctx.stroke();
  }
}

export function renderSprite(ctx, sprite, frameIdx, px, py, ts = 1, flipX = false) {
  if (!sprite || !sprite.frames || !sprite.frames[frameIdx || 0]) return;
  const frame = sprite.frames[frameIdx || 0];
  const { w, h, palette } = sprite;
  for (let y = 0; y < h; y++) {
    const row = frame[y];
    if (!row) continue;
    for (let x = 0; x < w; x++) {
      const ci = row[x];
      if (ci <= 0) continue;
      const sx = flipX ? (w - 1 - x) : x;
      ctx.fillStyle = palette[ci - 1] || '#FF00FF';
      ctx.fillRect(px + sx * ts, py + y * ts, ts, ts);
    }
  }
}

export function renderSpriteOnTile(ctx, sprite, frameIdx, tx, ty, ts, cam = { x:0, y:0 }) {
  if (!sprite) return;
  const px = tx * ts - cam.x;
  const py = ty * ts - cam.y;
  const scale = ts / 16;
  renderSprite(ctx, sprite, frameIdx || 0, px, py, scale);
}

export function renderEntity(ctx, entity, sprite, frameIdx, ts, cam) {
  const px = entity.x * ts - (sprite ? sprite.w * (ts / 16) : ts) / 2 - cam.x;
  const py = entity.y * ts - (sprite ? sprite.h * (ts / 16) : ts) + ts - cam.y;
  const scale = (ts / 16);
  ctx.fillStyle = entity.type?.color || '#FF00FF';
  if (sprite) {
    renderSprite(ctx, sprite, frameIdx || 0, px, py, scale);
  } else {
    ctx.fillRect(px, py, ts, ts);
  }
  // hitbox outline
  if (entity.type?.solid) {
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(px, py, ts, ts);
  }
}

export function pixelOverlay(ctx, w, h, ts, zoom) {
  const pixelSize = Math.max(1, Math.floor(ts * zoom));
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x * pixelSize + 0.5, y * pixelSize + 0.5, pixelSize, pixelSize);
    }
  }
}

export function drawText(ctx, text, x, y, color = '#FFF1E8', size = 8) {
  ctx.fillStyle = color;
  ctx.font = `${size}px monospace`;
  ctx.textBaseline = 'top';
  ctx.fillText(text, x, y);
}
