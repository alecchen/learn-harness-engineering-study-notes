// Level Editor
import * as R from './renderer.js';

export class LevelEditor {
  constructor(canvas, state) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = state;
    this.tool = 'brush'; // brush | eraser | fill | pick | entity
    this.brushTile = 0;
    this.layer = 'fg';   // bg | fg | coll
    this.drawing = false;
    this.camera = { x:0, y:0 };
    this.camDrag = false;
    this.camDragStart = { x:0, y:0 };
    this.hover = null;
    this.selectedEntity = null;
    this.entityFrame = 0;
    this.frameTimer = 0;
    this.setup();
  }

  setup() {
    this.canvas.addEventListener('mousedown', e => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', e => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', e => this.onMouseUp(e));
    this.canvas.addEventListener('mouseleave',() => { this.drawing = false; this.camDrag = false; this.hover = null; });
    this.canvas.addEventListener('contextmenu', e => e.preventDefault());
  }

  getLevel() {
    return this.state.project?.levels?.[this.state.currentLevel];
  }

  screenToWorld(ex, ey) {
    const rect = this.canvas.getBoundingClientRect();
    const ts = this.state.tileSize;
    const scale = this.state.editorScale || 1;
    return {
      tx: Math.floor((ex - rect.left) / scale / ts + this.camera.x / ts),
      ty: Math.floor((ey - rect.top) / scale / ts + this.camera.y / ts),
      px: (ex - rect.left) / scale + this.camera.x,
      py: (ey - rect.top) / scale + this.camera.y,
    };
  }

  setTool(t) { this.tool = t; this.selectedEntity = null; }
  setLayer(l) { this.layer = l; }
  setBrush(id) { this.brushTile = id; }

  onMouseDown(e) {
    const level = this.getLevel();
    if (!level) return;
    const p = this.screenToWorld(e.clientX, e.clientY);
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      this.camDrag = true; this.camDragStart = { x:e.clientX, y:e.clientY, cx:this.camera.x, cy:this.camera.y };
      return;
    }
    if (this.tool === 'entity') {
      if (this.state.entityBrush) {
        level.entities.push({ x:p.tx+0.5, y:p.ty+0.5, typeId:this.state.entityBrush, props:{}, active:true });
        this.state.onChange?.();
      }
      return;
    }
    this.drawing = true;
    this.paint(p.tx, p.ty);
  }

  onMouseMove(e) {
    const level = this.getLevel();
    if (!level) return;
    const p = this.screenToWorld(e.clientX, e.clientY);
    this.hover = p;
    if (this.camDrag) {
      const dx = (e.clientX - this.camDragStart.x) / (this.state.editorScale || 1);
      const dy = (e.clientY - this.camDragStart.y) / (this.state.editorScale || 1);
      this.camera.x = Math.max(0, this.camDragStart.cx - dx);
      this.camera.y = Math.max(0, this.camDragStart.cy - dy);
      return;
    }
    if (this.drawing) this.paint(p.tx, p.ty);
  }

  onMouseUp(e) { this.drawing = false; this.camDrag = false; }

  paint(tx, ty) {
    const level = this.getLevel();
    if (!level || tx < 0 || ty < 0 || tx >= level.width || ty >= level.height) return;
    if (this.tool === 'eraser') {
      level.layers[this.layer][ty][tx] = -1;
      this.state.onChange?.();
      return;
    }
    if (this.tool === 'fill') {
      this.floodFill(tx, ty, this.brushTile);
      return;
    }
    if (this.tool === 'pick') {
      this.brushTile = level.layers[this.layer][ty][tx];
      this.state.onChange?.();
      return;
    }
    if (this.tool === 'brush') {
      level.layers[this.layer][ty][tx] = this.brushTile;
      this.state.onChange?.();
    }
  }

  floodFill(sx, sy, newId) {
    const level = this.getLevel();
    if (!level) return;
    const layer = level.layers[this.layer];
    const oldId = layer[sy][sx];
    if (oldId === newId) return;
    const w = level.width, h = level.height;
    const stack = [[sx, sy]];
    const visited = new Set();
    while (stack.length) {
      const [x, y] = stack.pop();
      const k = y * w + x;
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      if (visited.has(k)) continue;
      visited.add(k);
      if (layer[y][x] !== oldId) continue;
      layer[y][x] = newId;
      stack.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);
    }
    this.state.onChange?.();
  }

  selectEntity(ex, ey) {
    const level = this.getLevel();
    if (!level) return;
    const p = this.screenToWorld(ex, ey);
    const closest = level.entities.reduce((best, e, i) => {
      const dx = e.x - p.tx, dy = e.y - p.ty;
      const dist = Math.sqrt(dx*dx + dy*dy);
      return dist < (best?.dist || Infinity) ? { e, i, dist } : best;
    }, null);
    if (closest && closest.dist < 2) {
      this.state.selectedEntityIndex = closest.i;
      this.state.onChange?.();
    } else {
      this.state.selectedEntityIndex = -1;
    }
  }

  deleteSelected() {
    const level = this.getLevel();
    if (this.state.selectedEntityIndex >= 0 && level) {
      level.entities.splice(this.state.selectedEntityIndex, 1);
      this.state.selectedEntityIndex = -1;
      this.state.onChange?.();
    }
  }

  update(dt) {
    this.frameTimer += dt;
    if (this.frameTimer > 0.15) {
      this.frameTimer = 0;
      this.entityFrame = (this.entityFrame + 1) % 8;
    }
  }

  render() {
    const level = this.getLevel();
    if (!level) return;
    const { ctx, camera } = this;
    const ts = this.state.tileSize;
    const scale = this.state.editorScale || 1;
    const cw = this.canvas.width, ch = this.canvas.height;

    ctx.fillStyle = level.bgColor || '#1D1D2B';
    ctx.fillRect(0, 0, cw, ch);

    const tiles = this.state.project.tiles;

    // render tiles
    const startX = Math.max(0, Math.floor(camera.x / ts));
    const startY = Math.max(0, Math.floor(camera.y / ts));
    const endX = Math.min(level.width, Math.ceil((camera.x + cw/scale) / ts));
    const endY = Math.min(level.height, Math.ceil((camera.y + ch/scale) / ts));

    const layers = ['bg', 'fg', 'coll'];
    for (const layer of layers) {
      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const tid = level.layers[layer][y]?.[x];
          if (tid === -1) continue;
          if (layer === 'coll') {
            ctx.fillStyle = 'rgba(255,0,0,0.2)';
            ctx.fillRect(x * ts - camera.x, y * ts - camera.y, ts, ts);
          } else {
            const tile = tiles.find(t => t.id === tid);
            if (tile) R.renderTile(ctx, x, y, tid, tiles, ts);
          }
        }
      }
    }

    // render entities
    for (let i = 0; i < level.entities.length; i++) {
      const e = level.entities[i];
      const etype = this.state.project.entityTypes.find(t => t.id === e.typeId);
      const sprite = this.state.project.sprites.find(s => s.name === (etype?.sprite || ''));
      const isSelected = i === this.state.selectedEntityIndex;

      const ex = e.x * ts - camera.x;
      const ey = e.y * ts - camera.y - (ts / 2);
      R.renderSprite(ctx, sprite, this.entityFrame % (sprite?.frames?.length || 1), ex, ey, 1);

      if (isSelected) {
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.strokeRect(ex - 1, ey - 1, ts + 2, ts + 2);
      }
    }

    // grid overlay
    R.renderGrid(ctx, level.width, level.height, ts, 'rgba(255,255,255,0.05)');

    // hover
    if (this.hover && !this.camDrag) {
      const { tx, ty } = this.hover;
      if (tx >=0 && ty >=0 && tx < level.width && ty < level.height) {
        ctx.strokeStyle = this.tool === 'eraser' ? '#FF004D' : '#FFD700';
        ctx.lineWidth = 2;
        ctx.strokeRect(tx * ts - camera.x, ty * ts - camera.y, ts, ts);
        if (this.tool === 'entity' && this.state.entityBrush) {
          const etype = this.state.project.entityTypes.find(t => t.id === this.state.entityBrush);
          const sprite = this.state.project.sprites.find(s => s.name === (etype?.sprite || ''));
          if (sprite) {
            ctx.globalAlpha = 0.5;
            R.renderSprite(ctx, sprite, 0, tx * ts - camera.x, ty * ts - camera.y - ts/2, 1);
            ctx.globalAlpha = 1;
          }
        }
      }
    }

    // camera border
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, level.width * ts - camera.x, level.height * ts - camera.y);

    // coord info
    if (this.hover) {
      const tileInfo = [];
      for (const ln of ['bg','fg','coll']) {
        const tid = level.layers[ln][this.hover.ty]?.[this.hover.tx];
        if (tid !== undefined && tid !== -1) tileInfo.push(`${ln}:${tid}`);
      }
      R.drawText(ctx, `${this.hover.tx},${this.hover.ty} ${tileInfo.join(' ')}`, 4, ch - 12, '#888', 10);
    }

    // entity info
    if (this.state.selectedEntityIndex >= 0) {
      const e = level.entities[this.state.selectedEntityIndex];
      if (e) {
        const etype = this.state.project.entityTypes.find(t => t.id === e.typeId);
        R.drawText(ctx, `${etype?.name || e.typeId} @ ${e.x.toFixed(1)},${e.y.toFixed(1)}`, 4, ch - 24, '#FFD700', 10);
      }
    }
  }
}
