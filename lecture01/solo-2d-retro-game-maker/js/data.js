// Data models, defaults, and palettes

export const COLORS = [
  '#000000','#FFFFFF','#FF004D','#008751','#FFB13B','#1D2B53','#7E2553','#AB5236',
  '#5F574F','#C2C3C7','#FFF1E8','#FF77A8','#29ADFF','#83769C','#FFCCAA','#FFA300',
  '#FFEC27','#00E436','#00A3CC','#3A6A7F','#6B8E9B','#A3C4D4','#C6D7DE','#D2B48C',
  '#8B4513','#556B2F','#800080','#FF6347','#4682B4','#32CD32','#FFD700','#7A7A7A',
];

export const TILE_PROPS = { EMPTY:0, WALL:1, GROUND:2, PLATFORM:3, SPIKE:4, GOAL:5, DECOR:6, WATER:7 };

export const DEFAULT_TILES = [
  { id:-1, name:'Empty',   solid:false, color:'#1D1D2B', sprite:null, walkable:false, deadly:false },
  { id:0,  name:'Wall',    solid:true,  color:'#5F574F', sprite:'wall',   walkable:false, deadly:false },
  { id:1,  name:'Ground',  solid:true,  color:'#AB5236', sprite:'ground', walkable:true,  deadly:false },
  { id:2,  name:'Platfm',  solid:true,  color:'#008751', sprite:'platform', walkable:true, deadly:false },
  { id:3,  name:'Spike',   solid:false, color:'#FF004D', sprite:'spike',  walkable:true,  deadly:true  },
  { id:4,  name:'Goal',    solid:false, color:'#FFD700', sprite:'goal',   walkable:true,  deadly:false },
  { id:5,  name:'Decor',   solid:false, color:'#83769C', sprite:null,     walkable:true,  deadly:false },
  { id:6,  name:'Water',   solid:false, color:'#29ADFF', sprite:'water',  walkable:true,  deadly:true  },
  { id:7,  name:'Brick',   solid:true,  color:'#8B4513', sprite:'brick',  walkable:false, deadly:false },
  { id:8,  name:'Ladder',  solid:false, color:'#FFB13B', sprite:'ladder', walkable:true,  deadly:false },
];

export const DEFAULT_SPRITES = [
  {
    name:'player', w:16, h:16, palette:['#1D2B53','#FF004D','#FFB13B','#FFF1E8'],
    frames:[[
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0],
      [0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0],
      [0,0,0,0,2,2,2,3,3,2,2,2,0,0,0,0],
      [0,0,0,2,3,2,3,3,3,3,2,3,2,0,0,0],
      [0,0,0,2,3,2,2,3,3,2,2,3,2,0,0,0],
      [0,0,0,0,2,3,3,3,3,3,3,2,0,0,0,0],
      [0,0,0,0,3,3,3,3,3,3,3,3,0,0,0,0],
      [0,0,0,0,2,2,1,1,1,1,2,2,0,0,0,0],
      [0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0],
      [0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0],
      [0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
      [0,0,1,1,1,0,0,1,1,0,0,1,1,1,0,0],
      [0,0,0,1,1,0,0,1,1,0,0,1,1,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    ]]
  },
  {
    name:'slime', w:16, h:16, palette:['#1D2B53','#008751','#00E436','#FFF1E8'],
    frames:[
      [  // frame 1
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
        [0,0,0,0,1,2,2,2,2,2,2,1,0,0,0,0],
        [0,0,0,1,2,2,2,2,2,2,2,2,1,0,0,0],
        [0,0,1,2,2,2,2,2,2,2,2,2,2,1,0,0],
        [0,1,2,2,2,1,2,2,2,2,1,2,2,2,1,0],
        [0,1,2,2,2,1,3,2,2,3,1,2,2,2,1,0],
        [0,1,2,2,2,1,1,2,2,1,1,2,2,2,1,0],
        [0,1,2,2,2,2,2,2,2,2,2,2,2,2,1,0],
        [0,0,1,2,2,2,2,2,2,2,2,2,2,1,0,0],
        [0,0,0,1,2,2,2,2,2,2,2,2,1,0,0,0],
        [0,0,0,0,1,2,2,2,2,2,2,1,0,0,0,0],
        [0,0,0,0,0,1,1,2,2,1,1,0,0,0,0,0],
        [0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      ]
    ]
  },
  {
    name:'coin', w:16, h:16, palette:['#1D2B53','#FFD700','#FFEC27','#FFF1E8'],
    frames:[
      [
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0],
        [0,0,0,0,1,1,2,2,2,2,1,1,0,0,0,0],
        [0,0,0,1,2,2,2,2,2,2,2,2,1,0,0,0],
        [0,0,1,2,2,2,2,2,2,2,2,2,2,1,0,0],
        [0,1,2,2,2,2,2,3,3,2,2,2,2,2,1,0],
        [0,1,2,2,2,2,2,3,3,2,2,2,2,2,1,0],
        [0,1,2,2,2,2,2,2,2,2,2,2,2,2,1,0],
        [0,0,1,2,2,2,2,2,2,2,2,2,2,1,0,0],
        [0,0,0,1,1,2,2,2,2,2,2,1,1,0,0,0],
        [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      ],[
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0],
        [0,0,0,0,0,1,1,2,2,1,1,0,0,0,0,0],
        [0,0,0,0,1,2,2,2,2,2,2,1,0,0,0,0],
        [0,0,0,1,2,2,2,3,3,2,2,2,1,0,0,0],
        [0,0,1,2,2,2,2,3,3,2,2,2,2,1,0,0],
        [0,0,1,2,2,2,2,2,2,2,2,2,2,1,0,0],
        [0,0,1,2,2,2,2,2,2,2,2,2,2,1,0,0],
        [0,0,0,1,1,2,2,2,2,2,2,1,1,0,0,0],
        [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      ]
    ]
  },
];

export const BEHAVIORS = {
  idle:   { name:'Idle',   desc:'Stays still', animate:true, params:{}},
  patrol: { name:'Patrol', desc:'Walks back and forth', animate:true, params:{ range:{label:'Range (tiles)',type:'number',default:3}, speed:{label:'Speed',type:'number',default:1} }},
  chase:  { name:'Chase',  desc:'Follows player when close', animate:true, params:{ range:{label:'Detect (tiles)',type:'number',default:5}, speed:{label:'Speed',type:'number',default:1.5} }},
  bounce: { name:'Bounce', desc:'Bounces up and down', animate:true, params:{ height:{label:'Height (px)',type:'number',default:16}, speed:{label:'Speed',type:'number',default:2} }},
  float:  { name:'Float',  desc:'Moves in a circle', animate:true, params:{ radius:{label:'Radius (px)',type:'number',default:8}, speed:{label:'Speed',type:'number',default:1} }},
};

export const DEFAULT_ENTITY_TYPES = [
  { id:'player',  name:'Player',  sprite:'player', behavior:'idle',   props:{}, color:'#FF004D', size:14 },
  { id:'slime',   name:'Slime',   sprite:'slime',  behavior:'patrol', props:{range:3,speed:1}, color:'#00E436', size:14, solid:true },
  { id:'coin',    name:'Coin',    sprite:'coin',   behavior:'idle',   props:{}, color:'#FFD700', size:10, collectible:true },
  { id:'spike',   name:'Spike',   sprite:'spike',   behavior:'idle',  props:{}, color:'#FF004D', size:10, deadly:true },
  { id:'goal',    name:'Goal',    sprite:'goal',    behavior:'idle',  props:{}, color:'#FFEC27', size:12 },
];

export const DEFAULT_PROJECT = {
  name:'Untitled', tileSize:16, levelWidth:40, levelHeight:20,
  tiles:DEFAULT_TILES, sprites:DEFAULT_SPRITES.map(s=>({...s,frames:s.frames.map(f=>f.map(r=>[...r]))})),
  entityTypes:JSON.parse(JSON.stringify(DEFAULT_ENTITY_TYPES)),
  levels:[],
};

export function createLevel(name,w,h){
  return {
    name:name||'Level 1', width:w||40, height:h||20,
    layers:{
      bg:Array.from({length:h},()=>Array(w).fill(-1)),
      fg:Array.from({length:h},()=>Array(w).fill(-1)),
      coll:Array.from({length:h},()=>Array(w).fill(-1)),
    },
    entities:[], bgColor:'#1D1D2B', playerStart:{x:1,y:1},
  };
}
