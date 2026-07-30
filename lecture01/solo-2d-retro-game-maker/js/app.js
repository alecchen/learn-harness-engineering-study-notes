// Main Application
import { COLORS, DEFAULT_PROJECT, createLevel, BEHAVIORS } from './data.js';
import * as R from './renderer.js';
import { LevelEditor } from './level-editor.js';
import { SpriteEditor } from './sprite-editor.js';
import { GameEngine } from './game-engine.js';

const App = {
  state: {
    project: null,
    currentLevel: 0,
    mode: 'level', // level | sprite | entity | game
    tileSize: 16,
    editorScale: 1,
    selectedEntityIndex: -1,
    entityBrush: null,
    onChange: null,
  },

  async init() {
    this.loadProject();
    this.setupUI();
    this.setupCanvas();
    this.setupEditors();
    this.setupPalette();
    this.refreshUI();
    this.loop();
  },

  loadProject() {
    let saved;
    try { saved = JSON.parse(localStorage.getItem('retroMakerProject')); } catch(e) {}
    if (saved && saved.levels?.length) {
      this.state.project = saved;
    } else {
      this.state.project = JSON.parse(JSON.stringify(DEFAULT_PROJECT));
      const lvl = createLevel('Level 1', 40, 20);
      // add some initial ground
      for (let x = 0; x < 40; x++) {
        lvl.layers.fg[17][x] = 1; // ground
        lvl.layers.fg[18][x] = 1;
        if (x % 3 === 0) lvl.layers.fg[16][x] = 7; // brick accent
      }
      // platforms
      for (let x = 5; x < 12; x++) lvl.layers.fg[10][x] = 2; // platform
      for (let x = 25; x < 32; x++) lvl.layers.fg[12][x] = 2;
      // player start
      lvl.playerStart = { x: 2, y: 15 };
      // add initial entities
      lvl.entities.push({ x: 12, y: 15.5, typeId: 'slime', props: { range: 3, speed: 1 }, active: true });
      lvl.entities.push({ x: 28, y: 10.5, typeId: 'coin', props: {}, active: true });
      lvl.entities.push({ x: 30, y: 10.5, typeId: 'coin', props: {}, active: true });
      lvl.entities.push({ x: 26, y: 10.5, typeId: 'coin', props: {}, active: true });
      lvl.entities.push({ x: 18, y: 10, typeId: 'goal', props: {}, active: true });

      this.state.project.levels.push(lvl);
    }
    this.state.project._v = this.state.project._v || Date.now();
    this.state.onChange = () => this.save();
  },

  save() {
    try {
      this.state.project._v = Date.now();
      localStorage.setItem('retroMakerProject', JSON.stringify(this.state.project));
    } catch(e) { console.warn('Save failed', e); }
    this.refreshUI();
  },

  setupUI() {
    this.el = {
      modeBtns: document.querySelectorAll('[data-mode]'),
      canvas: document.getElementById('mainCanvas'),
      palette: document.getElementById('palette'),
      entityPaletteGrid: document.getElementById('entityPaletteGrid'),
      spritePaletteGrid: document.getElementById('spritePaletteGrid'),
      colorPalette: document.getElementById('colorPalette'),
      levelList: document.getElementById('levelList'),
      spriteList: document.getElementById('spriteList'),
      entityTypeList: document.getElementById('entityTypeList'),
      zoomIn: document.getElementById('zoomIn'),
      zoomOut: document.getElementById('zoomOut'),
      newLevel: document.getElementById('newLevel'),
      exportBtn: document.getElementById('exportBtn'),
      importBtn: document.getElementById('importBtn'),
      importFile: document.getElementById('importFile'),
      toolBtns: document.querySelectorAll('[data-tool]'),
      layerBtns: document.querySelectorAll('[data-layer]'),
      addSprite: document.getElementById('addSprite'),
      addFrame: document.getElementById('addFrame'),
      delFrame: document.getElementById('delFrame'),
      dupFrame: document.getElementById('dupFrame'),
      animToggle: document.getElementById('animToggle'),
      addEntityType: document.getElementById('addEntityType'),
      saveBtn: document.getElementById('saveBtn'),
    };

    // mode buttons
    this.el.modeBtns.forEach(btn => {
      btn.addEventListener('click', () => this.setMode(btn.dataset.mode));
    });

    // tools
    this.el.toolBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.el.toolBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (this.le) this.le.setTool(btn.dataset.tool);
        if (this.se) {
          const t = btn.dataset.tool;
          if (['pencil','fill','line','rect'].includes(t)) this.se.setTool(t);
        }
      });
    });

    this.el.layerBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.el.layerBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (this.le) this.le.setLayer(btn.dataset.layer);
      });
    });

    // zoom
    this.el.zoomIn.addEventListener('click', () => {
      if (this.state.mode === 'sprite' && this.se) {
        this.se.setZoom((this.se.zoom || 4) + 1);
      } else {
        this.state.editorScale = Math.min(4, (this.state.editorScale || 1) + 0.5);
      }
    });
    this.el.zoomOut.addEventListener('click', () => {
      if (this.state.mode === 'sprite' && this.se) {
        this.se.setZoom((this.se.zoom || 4) - 1);
      } else {
        this.state.editorScale = Math.max(0.25, (this.state.editorScale || 1) - 0.5);
      }
    });

    // project actions
    this.el.newLevel.addEventListener('click', () => {
      const name = prompt('Level name:', `Level ${this.state.project.levels.length + 1}`);
      if (name) {
        const lvl = createLevel(name, 40, 20);
        this.state.project.levels.push(lvl);
        this.state.currentLevel = this.state.project.levels.length - 1;
        this.save();
      }
    });

    this.el.exportBtn.addEventListener('click', () => this.exportProject());
    this.el.importBtn.addEventListener('click', () => this.el.importFile.click());
    this.el.importFile.addEventListener('change', e => this.importProject(e));

    this.el.addSprite.addEventListener('click', () => {
      const name = prompt('Sprite name:', `sprite${this.state.project.sprites.length}`);
      if (name && this.se) this.se.addSprite(name, 16, 16);
    });

    this.el.addFrame.addEventListener('click', () => this.se?.addFrame());
    this.el.dupFrame.addEventListener('click', () => this.se?.duplicateFrame());
    this.el.delFrame.addEventListener('click', () => this.se?.removeFrame());
    this.el.animToggle.addEventListener('click', () => {
      if (this.se) { this.se.showAnim = !this.se.showAnim;
        this.el.animToggle.textContent = this.se.showAnim ? 'Stop' : 'Anim'; }
    });

    this.el.addEntityType.addEventListener('click', () => {
      const name = prompt('Entity name:');
      if (name) {
        this.state.project.entityTypes.push({
          id: name.toLowerCase().replace(/\s+/g,'_'),
          name, sprite: 'player', behavior:'idle', props:{}, color:'#FFB13B', size:14
        });
        this.save();
      }
    });

    this.el.saveBtn.addEventListener('click', () => this.save());

    // keyboard
    window.addEventListener('keydown', e => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (this.state.mode === 'level' && this.le && document.activeElement?.tagName !== 'INPUT') {
          this.le.deleteSelected();
        }
      }
      if (this.ge?.running && (e.key === 'Escape' || e.key === 'r' || e.key === 'R')) {
        this.ge.handleKey(e.key);
        if (e.key === 'Escape') this.setMode('level');
      }
    });

    // setup active tool defaults
    document.querySelector('[data-tool="brush"]')?.classList.add('active');
    document.querySelector('[data-layer="fg"]')?.classList.add('active');
    document.querySelector('[data-mode="level"]')?.classList.add('active');

    EntityPanel.init(this);
  },

  setupCanvas() {
    this.canvas = this.el.canvas;
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  },

  resizeCanvas() {
    const container = this.canvas.parentElement;
    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;
  },

  setupEditors() {
    this.le = new LevelEditor(this.canvas, this.state);
    this.se = new SpriteEditor(this.canvas, this.state);
    this.ge = new GameEngine(this.canvas, this.state);

    // entity placement brush
    document.getElementById('entityMode').addEventListener('click', () => {
      this.state.mode = 'level';
      this.le.setTool('entity');
    });
  },

  setupPalette() {
    this.renderTilePalette();
    this.renderSpritePalette();
    this.renderEntityPalette();
    this.renderColorPalette();
  },

  renderTilePalette() {
    const el = this.el.palette;
    el.innerHTML = '';
    const tiles = this.state.project.tiles;
    tiles.forEach(tile => {
      const div = document.createElement('div');
      div.className = 'palette-tile';
      div.dataset.id = tile.id;
      const swatch = document.createElement('div');
      swatch.style.cssText = `width:24px;height:24px;background:${tile.color};border-radius:2px;image-rendering:pixelated;`;
      div.appendChild(swatch);
      const label = document.createElement('span');
      label.textContent = tile.name;
      div.appendChild(label);
      div.title = `${tile.name} (id:${tile.id}) ${tile.solid?'solid ':''}${tile.deadly?'deadly ':''}`;
      div.addEventListener('click', () => {
        el.querySelectorAll('.palette-tile').forEach(t => t.classList.remove('active'));
        div.classList.add('active');
        if (this.le) {
          this.le.setBrush(tile.id);
          this.le.setTool('brush');
          this.resetToolBtns('brush');
        }
      });
      el.appendChild(div);
    });
    // select first tile
    el.querySelector('.palette-tile')?.classList.add('active');
  },

  renderSpritePalette() {
    const el = this.el.spritePaletteGrid;
    if (!el) return;
    el.innerHTML = '';
    const sprites = this.state.project.sprites;
    sprites.forEach((spr, i) => {
      const div = document.createElement('div');
      div.className = 'palette-tile palette-sprite';
      div.dataset.index = i;
      // miniature preview
      const preview = document.createElement('canvas');
      preview.width = spr.w; preview.height = spr.h;
      const pctx = preview.getContext('2d');
      R.renderSprite(pctx, spr, 0, 0, 0, 1);
      preview.style.cssText = `width:32px;height:32px;image-rendering:pixelated;`;
      div.appendChild(preview);
      const label = document.createElement('span');
      label.textContent = spr.name;
      div.appendChild(label);
      div.addEventListener('click', () => {
        el.querySelectorAll('.palette-sprite').forEach(t => t.classList.remove('active'));
        div.classList.add('active');
        if (this.se) {
          this.se.selectSprite(spr, i);
          this.setMode('sprite');
        }
      });
      el.appendChild(div);
    });
  },

  renderEntityPalette() {
    const el = this.el.entityPaletteGrid;
    if (!el) return;
    el.innerHTML = '';
    const types = this.state.project.entityTypes;
    types.forEach((et) => {
      const div = document.createElement('div');
      div.className = 'palette-tile palette-entity';
      div.dataset.id = et.id;
      const swatch = document.createElement('div');
      swatch.style.cssText = `width:24px;height:24px;background:${et.color};border-radius:2px;image-rendering:pixelated;`;
      swatch.style.boxShadow = `inset 0 0 0 2px rgba(0,0,0,0.3)`;
      div.appendChild(swatch);
      const label = document.createElement('span');
      label.textContent = et.name;
      div.appendChild(label);
      div.title = `${et.name} - ${et.behavior}`;
      div.addEventListener('click', () => {
        el.querySelectorAll('.palette-entity').forEach(t => t.classList.remove('active'));
        div.classList.add('active');
        this.state.entityBrush = et.id;
        if (this.le) {
          this.le.setTool('entity');
          this.resetToolBtns('entity');
        }
      });
      el.appendChild(div);
    });
  },

  renderColorPalette() {
    const el = this.el.colorPalette;
    if (!el) return;
    el.innerHTML = '';
    COLORS.forEach((c, i) => {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch' + (i === 1 ? ' active' : '');
      swatch.style.background = c;
      swatch.title = c;
      swatch.addEventListener('click', () => {
        el.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        if (this.se) this.se.setColor(i);
      });
      el.appendChild(swatch);
    });
  },

  resetToolBtns(tool) {
    this.el.toolBtns.forEach(b => b.classList.remove('active'));
    const match = document.querySelector(`[data-tool="${tool}"]`);
    if (match) match.classList.add('active');
  },

  setMode(mode) {
    this.state.mode = mode;
    this.el.modeBtns.forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`[data-mode="${mode}"]`);
    if (btn) btn.classList.add('active');

    // show/hide panels
    document.querySelectorAll('.panel-section').forEach(p => p.style.display = 'none');
    const panels = {
      level: ['levelTools','tilePalette','entityPalettePanel','levelProps'],
      sprite: ['spriteTools', 'spritePalettePanel', 'spriteFrames'],
      entity: ['entityTypes', 'entityProps'],
      game: [],
    };
    (panels[mode] || []).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = '';
    });

    // update sidebar tool vis
    document.getElementById('levelTools')?.style.setProperty('display', mode === 'level' ? '' : 'none');
    document.getElementById('spriteTools')?.style.setProperty('display', mode === 'sprite' ? '' : 'none');

    if (mode === 'game') {
      this.state.editorScale = 1;
      this.resizeCanvas();
      this.ge.start();
    } else {
      this.ge.stop();
    }

    if (mode === 'sprite') {
      this.resizeCanvas();
    }

    this.syncEntityList();
    this.syncSpriteList();
    this.syncLevelList();
    this.syncEntityTypeList();
  },

  syncLevelList() {
    const el = this.el.levelList;
    if (!el) return;
    el.innerHTML = '';
    this.state.project.levels.forEach((lvl, i) => {
      const btn = document.createElement('button');
      btn.className = 'list-item' + (i === this.state.currentLevel ? ' active' : '');
      btn.textContent = lvl.name;
      btn.addEventListener('click', () => {
        this.state.currentLevel = i;
        this.save();
        this.syncLevelList();
      });
      el.appendChild(btn);
    });
  },

  syncSpriteList() {
    const el = this.el.spriteList;
    if (!el) return;
    el.innerHTML = '';
    this.state.project.sprites.forEach((spr, i) => {
      const btn = document.createElement('button');
      btn.className = 'list-item' + (this.se?.currentSpriteIndex === i ? ' active' : '');
      btn.textContent = spr.name;
      btn.addEventListener('click', () => {
        if (this.se) {
          this.se.selectSprite(spr, i);
          this.setMode('sprite');
        }
      });
      el.appendChild(btn);
    });
  },

  syncEntityTypeList() {
    const el = this.el.entityTypeList;
    if (!el) return;
    el.innerHTML = '';
    this.state.project.entityTypes.forEach((et, i) => {
      const div = document.createElement('div');
      div.className = 'entity-type-item' + (this.state.entityBrush === et.id ? ' active' : '');
      div.innerHTML = `<span style="color:${et.color}">&#x25A0;</span> ${et.name} <small>(${et.behavior})</small>`;
      const delBtn = document.createElement('button');
      delBtn.textContent = 'x';
      delBtn.className = 'small-btn';
      delBtn.addEventListener('click', e => {
        e.stopPropagation();
        this.state.project.entityTypes.splice(i, 1);
        this.save();
      });
      div.appendChild(delBtn);
      div.addEventListener('click', () => {
        this.state.entityBrush = et.id;
        this.save();
        this.syncEntityTypeList();
      });
      el.appendChild(div);
    });
  },

  refreshUI() {
    this.syncLevelList();
    this.syncSpriteList();
    this.syncEntityTypeList();
    EntityPanel.refresh(this);
    // update entity palette
    this.renderEntityPalette();
  },

  exportProject() {
    const data = JSON.stringify(this.state.project, null, 2);
    const blob = new Blob([data], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.state.project.name}.retro.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  importProject(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.levels && data.tiles) {
          this.state.project = data;
          this.save();
          this.setupEditors();
          this.setupPalette();
          this.refreshUI();
        }
      } catch(err) { alert('Invalid project file'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  },

  loop() {
    const dt = 1/60;

    // update editors
    if (this.le) this.le.update(dt);
    if (this.se) this.se.update(dt);
    if (this.ge && this.ge.running) this.ge.update(dt);

    // render
    this.render();

    requestAnimationFrame(() => this.loop());
  },

  render() {
    if (this.state.mode === 'game' && this.ge?.running) {
      this.ge.render();
    } else if (this.state.mode === 'sprite') {
      this.se?.render();
    } else {
      this.le?.render();
    }
  },
};

// Entity behavior panel
const EntityPanel = {
  init(app) {
    this.app = app;
    this.el = document.getElementById('entityPropContent');
    document.getElementById('applyEntityProps')?.addEventListener('click', () => this.apply());
  },

  refresh(app) {
    this.app = app;
    const state = app.state;
    const level = state.project?.levels?.[state.currentLevel];
    const idx = state.selectedEntityIndex;
    const container = this.el;
    if (!container) return;

    if (idx < 0 || !level || !level.entities[idx]) {
      container.innerHTML = '<span style="color:#666">Select an entity in the level</span>';
      return;
    }

    const e = level.entities[idx];
    const etype = state.project.entityTypes.find(t => t.id === e.typeId);
    const behavior = BEHAVIORS[etype?.behavior || 'idle'];
    if (!behavior) {
      container.innerHTML = '<span style="color:#666">No behavior params</span>';
      return;
    }

    let html = `<div class="prop-group">
      <label class="prop-label">Type: ${etype?.name || e.typeId}</label>
      <label class="prop-label">Behavior: ${etype?.behavior || 'idle'}</label>
    </div>`;

    const params = behavior.params || {};
    const currentProps = e.props || {};
    for (const [key, param] of Object.entries(params)) {
      const val = currentProps[key] ?? param.default ?? '';
      html += `<div class="prop-row">
        <label class="prop-label">${param.label || key}</label>
        <input class="prop-input entity-prop" data-key="${key}" type="number" value="${val}" step="0.5">
      </div>`;
    }
    container.innerHTML = html;
  },

  apply() {
    const state = this.app.state;
    const level = state.project?.levels?.[state.currentLevel];
    const idx = state.selectedEntityIndex;
    if (idx < 0 || !level) return;
    const e = level.entities[idx];
    e.props = e.props || {};
    document.querySelectorAll('.entity-prop').forEach(inp => {
      e.props[inp.dataset.key] = parseFloat(inp.value) || 0;
    });
    this.app.save();
  },
};

window.addEventListener('DOMContentLoaded', () => App.init());
