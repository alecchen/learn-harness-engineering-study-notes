// Entity behavior execution engine
import { BEHAVIORS } from './data.js';

// Behavior state machines for entities
const AI = {};

AI.idle = (entity, dt, level) => {
  // stand still
  entity.animTimer = (entity.animTimer || 0) + dt;
  entity.frame = Math.floor((entity.animTimer || 0) / 0.2) % (entity.spriteFrames || 1);
  entity.vx = 0;
  entity.vy = 0;
};

AI.patrol = (entity, dt, level) => {
  entity.animTimer = (entity.animTimer || 0) + dt;
  entity.frame = Math.floor((entity.animTimer || 0) / 0.15) % (entity.spriteFrames || 1);
  const range = entity.params?.range || 3;
  const speed = entity.params?.speed || 1;
  const originX = entity.originX != null ? entity.originX : entity.x;
  if (entity.originX == null) entity.originX = entity.x;

  entity.vx = (entity.dir || 1) * speed * 60;
  entity.vy = 0;

  if (entity.x > originX + range) { entity.dir = -1; }
  else if (entity.x < originX - range) { entity.dir = 1; }

  // wall collision check
  entity.flipX = entity.dir < 0;
};

AI.chase = (entity, dt, level, player) => {
  entity.animTimer = (entity.animTimer || 0) + dt;
  entity.frame = Math.floor((entity.animTimer || 0) / 0.12) % (entity.spriteFrames || 1);
  const range = entity.params?.range || 5;
  const speed = entity.params?.speed || 1.5;

  if (player) {
    const dx = player.x - entity.x;
    const dy = player.y - entity.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < range) {
      entity.vx = (dx / dist) * speed * 60;
      entity.vy = (dy / dist) * speed * 60;
      entity.flipX = dx < 0;
    } else {
      // patrol when player out of range
      entity.vx = (entity.dir || 1) * speed * 40;
      entity.vy = 0;
      if (entity.x > (entity.originX || entity.x) + 2) entity.dir = -1;
      else if (entity.x < (entity.originX || entity.x) - 2) entity.dir = 1;
      entity.flipX = entity.dir < 0;
      if (entity.originX == null) entity.originX = entity.x;
    }
  }
};

AI.bounce = (entity, dt, level) => {
  entity.animTimer = (entity.animTimer || 0) + dt;
  entity.frame = Math.floor((entity.animTimer || 0) / 0.15) % (entity.spriteFrames || 1);
  const height = entity.params?.height || 16;
  const speed = entity.params?.speed || 2;
  entity.time = (entity.time || 0) + dt * speed;
  entity.vy = Math.sin(entity.time * Math.PI) * height * 4;
  entity.vx = 0;
};

AI.float = (entity, dt, level) => {
  entity.animTimer = (entity.animTimer || 0) + dt;
  entity.frame = Math.floor((entity.animTimer || 0) / 0.15) % (entity.spriteFrames || 1);
  const radius = entity.params?.radius || 8;
  const speed = entity.params?.speed || 1;
  entity.time = (entity.time || 0) + dt * speed;
  entity.vx = Math.cos(entity.time) * radius * 4;
  entity.vy = Math.sin(entity.time) * radius * 4;
};

export function getBehavior(name) {
  return AI[name] || AI.idle;
}

export function getBehaviorList() {
  return Object.entries(BEHAVIORS).map(([k, v]) => ({ id: k, ...v }));
}
