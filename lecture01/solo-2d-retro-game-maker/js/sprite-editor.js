// Sprite Editor
import { COLORS } from './data.js';
import * as R from './renderer.js';

export class SpriteEditor {
  constructor(canvas, state) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = state;
    this.currentSprite = null;
    this.currentSpriteIndex = 0;
    this.currentFrame = 0;
    this.drawTool = 'pencil'; // pencil | fill | line | rect
    this.brushColor = 1;
    this.drawing = false;
    this.prevPos = null;
    this.zoom = 4;
    this.palette = COLORS;
    this.paletteIndex = 0;
    this.animTimer = 0;
    this.animFrame = 0;
    this.showAnim = false;
    this.setup();
  }

  setup() {
    this.canvas.addEventListener('mousedown', e => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', e => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', () => { this.drawing = false; this.prevPos = null; });
    this.canvas.addEventListener('mouseleave', () => { this.drawing = false; this.prevPos = null; });
    this.canvas.addEventListener('contextmenu', e => e.preventDefault());
  }

  selectSprite(sprite, index) {
    this.currentSprite = sprite;
    this.currentSpriteIndex = index;
    this.currentFrame = 0;
    this.showAnim = false;
  }

  get sprite() { return this.currentSprite; }

  screenToPixel(ex, ey) {
    const rect = this.canvas.getBoundingClientRect();
    const ts = this.zoom;
    // center the sprite in canvas
    if (!this.sprite) return null;
    const sx = (this.canvas.width - this.sprite.w * ts) / 2;
    const sy = (this.canvas.height - this.sprite.h * ts) / 2;
    return {
      px: Math.floor((ex - rect.left - sx) / ts),
      py: Math.floor((ey - rect.top - sy) / ts),
    };
  }

  setTool(t) { this.drawTool = t; }
  setColor(c) { this.brushColor = c; }
  setZoom(z) { this.zoom = Math.max(2, Math.min(16, z)); }

  onMouseDown(e) {
    if (!this.sprite) return;
    const p = this.screenToPixel(e.clientX, e.clientY);
    if (!p || p.px < 0 || p.py < 0 || p.px >= this.sprite.w || p.py >= this.sprite.h) return;
    this.drawing = true;
    this.prevPos = p;
    if (e.button === 2) {
      this.pickColor(p.px, p.py);
      return;
    }
    this.applyTool(p.px, p.py);
  }

  onMouseMove(e) {
    if (!this.sprite || !this.drawing) return;
    const p = this.screenToPixel(e.clientX, e.clientY);
    if (!p) return;
    if (this.drawTool === 'pencil' || this.drawTool === 'line' || this.drawTool === 'rect') {
      if (this.drawTool === 'pencil') {
        this.drawLine(this.prevPos.px, this.prevPos.py, p.px, p.py);
      }
      this.prevPos = p;
    } else {
      this.applyTool(p.px, p.py);
    }
  }

  pickColor(px, py) {
    const frame = this.sprite.frames[this.currentFrame];
    if (!frame || !frame[py] || frame[py][px] === undefined) return;
    this.brushColor = frame[py][px];
    this.state.onChange?.();
  }

  applyTool(px, py) {
    if (!this.sprite) return;
    const frame = this.sprite.frames[this.currentFrame];
    if (!frame || !frame[py] || frame[py][px] === undefined) return;
    if (this.drawTool === 'pencil') {
      frame[py][px] = this.brushColor;
    } else if (this.drawTool === 'fill') {
      this.floodFill(px, py, this.brushColor);
    } else if (this.drawTool === 'line') {
      // handled in onMouseMove
    } else if (this.drawTool === 'rect') {
      // handled in onMouseMove
    }
    this.state.onChange?.();
  }

  floodFill(sx, sy, nc) {
    if (!this.sprite) return;
    const frame = this.sprite.frames[this.currentFrame];
    const oc = frame[sy]?.[sx];
    if (oc === nc) return;
    const w = this.sprite.w, h = this.sprite.h;
    const stack = [[sx, sy]];
    const visited = new Set();
    while (stack.length) {
      const [x, y] = stack.pop();
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const k = y * w + x;
      if (visited.has(k)) continue;
      visited.add(k);
      if (frame[y][x] !== oc) continue;
      frame[y][x] = nc;
      stack.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);
    }
    this.state.onChange?.();
  }

  drawLine(x0, y0, x1, y1) {
    if (!this.sprite) return;
    const frame = this.sprite.frames[this.currentFrame];
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let x = x0, y = y0;
    while (true) {
      if (x >= 0 && y >= 0 && x < this.sprite.w && y < this.sprite.h) {
        frame[y][x] = this.brushColor;
      }
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x += sx; }
      if (e2 < dx) { err += dx; y += sy; }
    }
    this.state.onChange?.();
  }

  addFrame() {
    if (!this.sprite) return;
    const w = this.sprite.w, h = this.sprite.h;
    const blank = Array.from({length:h},()=>Array(w).fill(0));
    this.sprite.frames.push(blank);
    this.currentFrame = this.sprite.frames.length - 1;
    this.state.onChange?.();
  }

  duplicateFrame() {
    if (!this.sprite) return;
    const src = this.sprite.frames[this.currentFrame];
    if (src) {
      this.sprite.frames.push(src.map(r => [...r]));
      this.currentFrame = this.sprite.frames.length - 1;
      this.state.onChange?.();
    }
  }

  removeFrame() {
    if (!this.sprite || this.sprite.frames.length <= 1) return;
    this.sprite.frames.splice(this.currentFrame, 1);
    this.currentFrame = Math.min(this.currentFrame, this.sprite.frames.length - 1);
    this.state.onChange?.();
  }

  addSprite(name, w = 16, h = 16) {
    const blank = Array.from({length:h},()=>Array(w).fill(0));
    const sprite = { name: name || `sprite${this.state.project.sprites.length}`, w, h, palette:['#1D2B53','#FFF1E8','#FF004D','#FFB13B'], frames:[blank] };
    this.state.project.sprites.push(sprite);
    this.selectSprite(sprite, this.state.project.sprites.length - 1);
    this.state.onChange?.();
  }

  deleteSprite(index) {
    if (this.state.project.sprites.length <= 1) return;
    this.state.project.sprites.splice(index, 1);
    this.selectSprite(this.state.project.sprites[Math.min(index, this.state.project.sprites.length - 1)], Math.min(index, this.state.project.sprites.length - 1));
    this.state.onChange?.();
  }

  update(dt) {
    if (this.showAnim && this.sprite) {
      this.animTimer += dt;
      if (this.animTimer > 0.2) {
        this.animTimer = 0;
        this.animFrame = (this.animFrame + 1) % this.sprite.frames.length;
      }
    }
  }

  render() {
    const { ctx } = this;
    const cw = this.canvas.width, ch = this.canvas.height;
    ctx.fillStyle = '#1D1D2B';
    ctx.fillRect(0, 0, cw, ch);

    if (!this.sprite) {
      R.drawText(ctx, 'Select a sprite to edit', cw/2-80, ch/2-4, '#666', 12);
      return;
    }

    const ts = this.zoom;
    const w = this.sprite.w, h = this.sprite.h;
    const ox = (cw - w * ts) / 2;
    const oy = (ch - h * ts) / 2;

    // checkerboard background
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? '#2a2a3a' : '#1a1a2a';
        ctx.fillRect(ox + x * ts, oy + y * ts, ts, ts);
      }
    }

    // draw pixels
    const frame = this.showAnim ? this.sprite.frames[this.animFrame] : this.sprite.frames[this.currentFrame];
    if (frame) {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const ci = frame[y]?.[x];
          if (ci > 0) {
            ctx.fillStyle = this.sprite.palette[ci - 1] || '#FF00FF';
            ctx.fillRect(ox + x * ts, oy + y * ts, ts, ts);
          }
        }
      }
    }

    // pixel grid
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= w; x++) {
      ctx.beginPath(); ctx.moveTo(ox + x * ts, oy); ctx.lineTo(ox + x * ts, oy + h * ts); ctx.stroke();
    }
    for (let y = 0; y <= h; y++) {
      ctx.beginPath(); ctx.moveTo(ox, oy + y * ts); ctx.lineTo(ox + w * ts, oy + y * ts); ctx.stroke();
    }

    // frame label
    const label = this.showAnim ? `Animation` : `Frame ${this.currentFrame + 1}/${this.sprite.frames.length}`;
    R.drawText(ctx, label, 4, ch - 12, '#888', 10);
  }
}
