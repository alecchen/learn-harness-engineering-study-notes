// Game Engine - Playable test mode
import * as R from './renderer.js';
import { getBehavior } from './behaviors.js';

export class GameEngine {
  constructor(canvas, state) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = state;
    this.running = false;
    this.lastTime = 0;
    this.accumulator = 0;
    this.fixedDT = 1 / 60;

    // player
    this.player = null;
    this.camera = { x: 0, y: 0 };

    // input
    this.keys = {};
    this.setup();
  }

  setup() {
    window.addEventListener('keydown', e => { this.keys[e.key] = true; if (this.running && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault(); });
    window.addEventListener('keyup', e => { this.keys[e.key] = false; });
    this.canvas.addEventListener('click', () => {
      if (this.running) this.canvas.focus();
    });
  }

  start() {
    const level = this.getLevel();
    const entities = this.state.project.entityTypes;
    if (!level) return;

    this.lastTime = performance.now();
    this.accumulator = 0;

    // spawn entities
    this.gameEntities = [];
    for (const e of level.entities) {
      const etype = entities.find(t => t.id === e.typeId);
      const sprite = this.state.project.sprites.find(s => s.name === (etype?.sprite || ''));
      const ge = {
        x: e.x, y: e.y,
        vx: 0, vy: 0,
        type: etype,
        sprite,
        spriteFrames: sprite?.frames?.length || 1,
        frame: 0, flipX: false,
        dir: 1, time: 0, animTimer: 0,
        params: { ...(etype?.props || {}), ...(e.props || {}) },
        originX: e.x, originY: e.y,
        solid: etype?.solid || false,
        collectible: etype?.collectible || false,
        deadly: etype?.deadly || false,
        ai: getBehavior(etype?.behavior || 'idle'),
        active: e.active !== false,
        collected: false,
      };
      if (etype?.id === 'player') {
        this.player = ge;
      }
      this.gameEntities.push(ge);
    }

    if (!this.player) {
      this.player = {
        x: level.playerStart?.x || 1, y: level.playerStart?.y || 1,
        vx: 0, vy: 0, onGround: false, type: { id:'player', name:'Player', size:14, color:'#FF004D' },
        playerControl: true, frame: 0, flipX: false, animTimer: 0, spriteFrames: 1,
        active: true, collected: false,
      };
      this.gameEntities.push(this.player);
    }
    this.player.playerControl = true;
    this.player.size = 14;
    this.player.onGround = false;
    this.player.sprite = this.state.project.sprites.find(s => s.name === 'player');

    this.won = false;
    this.dead = false;
    this.coins = 0;
    this.running = true;
    this.gameTime = 0;
  }

  stop() { this.running = false; }

  getLevel() { return this.state.project?.levels?.[this.state.currentLevel]; }

  tileAt(x, y) {
    const level = this.getLevel();
    if (!level) return null;
    const tx = Math.floor(x), ty = Math.floor(y);
    if (tx < 0 || ty < 0 || tx >= level.width || ty >= level.height) return -1;
    const tiles = this.state.project.tiles;
    for (const ln of ['fg', 'bg', 'coll']) {
      const tid = level.layers[ln][ty]?.[tx];
      if (tid !== undefined && tid >= 0) {
        const tile = tiles.find(t => t.id === tid);
        if (tile) return tile;
      }
    }
    return null;
  }

  isSolid(x, y) {
    const tile = this.tileAt(x, y);
    if (!tile) return y >= this.getLevel()?.height; // out of bounds = solid floor
    return tile.solid;
  }

  isDeadly(x, y) {
    const tile = this.tileAt(x, y);
    return tile?.deadly || false;
  }

  isGoal(x, y) {
    const tile = this.tileAt(x, y);
    return tile?.id === 4; // GOAL
  }

  update(dt) {
    if (!this.running) return;
    this.gameTime += dt;

    // player input
    if (this.player && !this.dead && !this.won) {
      const pspeed = 3;
      const jumpForce = -5;
      let inputX = 0;
      if (this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']) inputX = -1;
      if (this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']) inputX = 1;
      this.player.vx = inputX * pspeed * 60;
      if (inputX !== 0) this.player.flipX = inputX < 0;

      // jump
      if ((this.keys['ArrowUp'] || this.keys['w'] || this.keys['W'] || this.keys[' ']) && this.player.onGround) {
        this.player.vy = jumpForce * 60;
        this.player.onGround = false;
      }

      // animation
      this.player.animTimer += dt;
      if (Math.abs(inputX) > 0) {
        this.player.frame = Math.floor((this.player.animTimer || 0) / 0.1) % (this.player.sprite?.frames?.length || 1);
      } else {
        this.player.frame = 0;
        this.player.animTimer = 0;
      }
    }

    // update all entities
    for (const e of this.gameEntities) {
      if (!e.active || e === this.player) continue;
      if (e.collected) continue;
      e.ai(e, dt, this.getLevel(), this.player);
    }

    // physics step
    const subSteps = 4;
    const subDT = dt / subSteps;
    for (let s = 0; s < subSteps; s++) {
      for (const e of this.gameEntities) {
        if (!e.active) continue;
        if (e.collected) continue;
        this.physicsStep(e, subDT);
      }
    }

    // check lethal tiles
    if (this.player && !this.dead) {
      if (this.isDeadly(this.player.x, this.player.y)) {
        this.dead = true;
      }
    }

    // check goal
    if (this.player && !this.won && !this.dead) {
      if (this.isGoal(this.player.x, this.player.y)) {
        this.won = true;
      }
    }

    // camera
    if (this.player) {
      const level = this.getLevel();
      const ts = this.state.tileSize;
      const cw = this.canvas.width, ch = this.canvas.height;
      const targetX = this.player.x * ts - cw / 2;
      const targetY = this.player.y * ts - ch / 2;
      this.camera.x = Math.max(0, Math.min(level.width * ts - cw, targetX));
      this.camera.y = Math.max(0, Math.min(level.height * ts - ch, targetY));
    }
  }

  physicsStep(e, dt) {
    const ts = this.state.tileSize;
    const size = e.type?.size || 14;

    // gravity
    if (e.playerControl) {
      e.vy += 200 * dt;
    } else {
      // AI entities still have some gravity if they have physics
      e.vy = e.vy || 0;
    }

    const newX = e.x * ts + e.vx * dt;
    const newY = e.y * ts + e.vy * dt;

    // X collision
    const eSize = size / ts;
    if (this.isSolid(newX / ts, e.y) || this.isSolid(newX / ts, e.y - eSize + 0.1)) {
      e.vx = 0;
    } else {
      e.x = newX / ts;
    }

    // Y collision
    if (e.vy > 0) {
      // falling
      if (this.isSolid(e.x, newY / ts) || this.isSolid(e.x, newY / ts)) {
        e.y = Math.floor(newY / ts);
        if (e.playerControl) e.onGround = true;
        e.vy = 0;
      } else {
        e.y = newY / ts;
        if (e.playerControl) e.onGround = false;
      }
    } else if (e.vy < 0) {
      // jumping up
      if (this.isSolid(e.x, newY / ts) || this.isSolid(e.x + eSize - 0.1, newY / ts)) {
        e.vy = 0;
      } else {
        e.y = newY / ts;
      }
    }

    // bounds
    const level = this.getLevel();
    if (!level) return;
    if (e.y > level.height + 1) {
      if (e.playerControl) {
        this.dead = true;
      } else {
        e.active = false;
      }
    }
  }

  render() {
    const { ctx } = this;
    const level = this.getLevel();
    if (!level) return;
    const ts = this.state.tileSize;
    const cw = this.canvas.width, ch = this.canvas.height;

    ctx.fillStyle = level.bgColor || '#1D1D2B';
    ctx.fillRect(0, 0, cw, ch);

    const tiles = this.state.project.tiles;
    const cam = this.camera;
    const startX = Math.max(0, Math.floor(cam.x / ts));
    const startY = Math.max(0, Math.floor(cam.y / ts));
    const endX = Math.min(level.width, Math.ceil((cam.x + cw) / ts) + 1);
    const endY = Math.min(level.height, Math.ceil((cam.y + ch) / ts) + 1);

    // render tiles
    for (const ln of ['bg', 'fg']) {
      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const tid = level.layers[ln][y]?.[x];
          if (tid === -1) continue;
          R.renderTile(ctx, x, y, tid, tiles, ts);
        }
      }
    }

    // render entities
    const playerSprite = this.player?.sprite;
    for (const e of this.gameEntities) {
      if (!e.active || e.collected) continue;
      const sprite = e.sprite || (e === this.player ? playerSprite : null);
      if (e === this.player) {
        R.renderSprite(ctx, sprite, e.frame || 0,
          e.x * ts - (sprite?.w || 16) / 2 - cam.x,
          e.y * ts - (sprite?.h || 16) + ts - cam.y, 1, e.flipX);
      } else {
        const ey = e.y * ts - (sprite?.h || 16) - cam.y;
        R.renderSprite(ctx, sprite, e.frame || 0,
          e.x * ts - (sprite?.w || 16) / 2 - cam.x,
          e.y * ts - (sprite?.h || 16) + ts - cam.y, 1, e.flipX);
      }
    }

    // go to player if no sprite
    if (this.player && !playerSprite) {
      ctx.fillStyle = '#FF004D';
      const px = this.player.x * ts - 7 - cam.x;
      const py = this.player.y * ts - 14 - cam.y;
      this.drawSimplePlayer(ctx, px, py, ts);
    }

    // HUD
    this.renderHUD(ctx);

    // messages
    if (this.dead) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, cw, ch);
      R.drawText(ctx, 'YOU DIED', cw/2-48, ch/2-16, '#FF004D', 20);
      R.drawText(ctx, 'Press R to respawn', cw/2-72, ch/2+12, '#888', 12);
    }
    if (this.won) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, cw, ch);
      R.drawText(ctx, 'LEVEL CLEAR!', cw/2-60, ch/2-16, '#FFD700', 20);
      R.drawText(ctx, 'Press R to restart', cw/2-64, ch/2+12, '#888', 12);
    }
  }

  drawSimplePlayer(ctx, x, y, ts) {
    ctx.fillRect(x + 4, y, 6, 6);    // head
    ctx.fillRect(x + 2, y + 6, 10, 6); // body
    ctx.fillRect(x, y + 12, 4, 4);    // left leg
    ctx.fillRect(x + 10, y + 12, 4, 4); // right leg
  }

  renderHUD(ctx) {
    const ts = this.state.tileSize;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, this.canvas.width, 24);
    R.drawText(ctx, `COINS: ${this.coins}`, 6, 6, '#FFD700', 10);
    R.drawText(ctx, `TIME: ${Math.floor(this.gameTime)}s`, 120, 6, '#FFF1E8', 10);
    R.drawText(ctx, 'ESC=exit', this.canvas.width - 70, 6, '#888', 10);
  }

  handleKey(key) {
    if (key === 'Escape') this.stop();
    if ((key === 'r' || key === 'R') && (this.dead || this.won)) {
      // collect starting entities for cleanup
      this.dead = false;
      this.won = false;
      this.start();
    }
  }
}
