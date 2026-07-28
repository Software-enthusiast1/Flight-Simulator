// physics.js — Player physics and collision detection

import { vec3 } from './math.js';

export const player = {
  pos: [0, 2, 5], // world position (feet)
  vel: [0, 0, 0], // velocity
  yaw: 0, // rotation around Y
  pitch: 0, // rotation around X
  roll: 0, // rotation around Z (roll)
  fov: 75 * Math.PI / 180,
  radius: 0.3, // collision radius
  height: 1.8, // player height
  eyeHeight: 1.6, // eye position above feet
  isGrounded: false,
  jumpPower: 0, // accumulate jump force
};

// Physics constants
export const GRAVITY = -19.8;
export const MOVE_SPEED = 6.0; // units/sec
export const JUMP_FORCE = 6.5; // units/sec
export const FRICTION = 0.99; // per frame
export const GROUND_FRICTION = 0.95;
export const ROT_SPEED = 3.0; // radians / second for arrow keys

// Get camera pos (eyes) from player feet pos
export function getCameraPos() {
  return [player.pos[0], player.pos[1] + player.eyeHeight, player.pos[2]];
}

// Ray-cast down from pos to find ground height
export function getTerrainHeightAt(x, z, sceneTriangles) {
  // Simple heightfield lookup using scene triangles with barycentric interpolation
  let maxY = -100;

  for (const tri of sceneTriangles) {
    const v0 = tri.verts[0], v1 = tri.verts[1], v2 = tri.verts[2];

    // bounding box check (early exit)
    const minX = Math.min(v0[0], v1[0], v2[0]);
    const maxX = Math.max(v0[0], v1[0], v2[0]);
    const minZ = Math.min(v0[2], v1[2], v2[2]);
    const maxZ = Math.max(v0[2], v1[2], v2[2]);

    if (x >= minX && x <= maxX && z >= minZ && z <= maxZ) {
      // Barycentric coordinates for point in triangle
      const denom = ((v1[2] - v2[2]) * (v0[0] - v2[0]) + (v2[0] - v1[0]) * (v0[2] - v2[2]));
      if (Math.abs(denom) < 0.0001) continue; // degenerate triangle

      const a = ((v1[2] - v2[2]) * (x - v2[0]) + (v2[0] - v1[0]) * (z - v2[2])) / denom;
      const b = ((v2[2] - v0[2]) * (x - v2[0]) + (v0[0] - v2[0]) * (z - v2[2])) / denom;
      const c = 1 - a - b;

      // if point is inside triangle
      if (a >= -0.01 && b >= -0.01 && c >= -0.01) {
        const h = a * v0[1] + b * v1[1] + c * v2[1];
        maxY = Math.max(maxY, h);
      }
    }
  }
  return maxY;
}

export function resetCamera() {
  player.pos = [7, 0, 0];
  player.vel = [0, 0, 0];
  player.yaw = 0;
  player.pitch = 0;
  player.roll = 0;
  player.isGrounded = false;
}

export function updatePlayer(dt, keys, sceneTriangles, CHUNK_SIZE, CHUNK_SPACING, lastPlayerChunkX, lastPlayerChunkZ, rebuildScene) {
  let moveSpeed = MOVE_SPEED;
  // Increase speed when shift is held
  if (keys['shift']) moveSpeed *= 6.0;

  // rotation from arrow keys
  if (keys['arrowleft']) player.yaw -= ROT_SPEED * dt;
  if (keys['arrowright']) player.yaw += ROT_SPEED * dt;
  if (keys['arrowup']) player.pitch = Math.max(-Math.PI / 2 + 0.01, player.pitch - ROT_SPEED * dt);
  if (keys['arrowdown']) player.pitch = Math.min(Math.PI / 2 - 0.01, player.pitch + ROT_SPEED * dt);
  // roll with Q/E
  // if (keys['q']) player.roll -= ROT_SPEED * dt;
  // if (keys['e']) player.roll += ROT_SPEED * dt;

  // movement direction based on yaw rotation (W/S forward/backward, A/D strafe left/right)
  const yaw = player.yaw;
  const forward = [Math.sin(0 - yaw), 0, Math.cos(0 - yaw)]; // forward direction in world space
  const right = [Math.sin((0 - yaw) - Math.PI / 2), 0, Math.cos((0 - yaw) - Math.PI / 2)]; // right direction

  let moveDir = [0, 0, 0];

  if (keys['w']) moveDir = vec3.add(moveDir, forward);
  if (keys['s']) moveDir = vec3.sub(moveDir, forward);
  if (keys['a']) moveDir = vec3.sub(moveDir, right);
  if (keys['d']) moveDir = vec3.add(moveDir, right);

  // normalize and apply move speed
  if (moveDir[0] || moveDir[1] || moveDir[2]) {
    moveDir = vec3.norm(moveDir);
    moveDir = vec3.mul(moveDir, moveSpeed);
  }

  // apply movement to velocity (horizontal only)
  player.vel[0] = moveDir[0];
  player.vel[2] = moveDir[2];

  // apply gravity
  player.vel[1] += GRAVITY * dt;
  player.vel[1] = Math.max(player.vel[1], -50); // terminal velocity

  // apply jump
  if (player.jumpPower > 0) {
    player.vel[1] += player.jumpPower;
    player.jumpPower = 0;
    player.isGrounded = false;
  }

  // apply friction when grounded
  if (player.isGrounded) {
    player.vel[0] *= GROUND_FRICTION;
    player.vel[2] *= GROUND_FRICTION;
  } else {
    player.vel[0] *= FRICTION;
    player.vel[2] *= FRICTION;
  }

  // update position
  const newPos = vec3.add(player.pos, vec3.mul(player.vel, dt));

  // collision and grounding
  const groundHeight = getTerrainHeightAt(newPos[0], newPos[2], sceneTriangles);
  const feetHeight = newPos[1];

  if (feetHeight <= groundHeight) {
    // on ground
    newPos[1] = groundHeight;
    player.vel[1] = 0;
    player.isGrounded = true;
  } else {
    player.isGrounded = false;
  }

  player.pos = newPos;

  // Check if we need to regenerate chunks
  const playerChunkX = Math.floor(player.pos[0] / (CHUNK_SIZE * CHUNK_SPACING));
  const playerChunkZ = Math.floor(player.pos[2] / (CHUNK_SIZE * CHUNK_SPACING));
  if (Math.abs(playerChunkX - lastPlayerChunkX) > 0 || Math.abs(playerChunkZ - lastPlayerChunkZ) > 0) {
    rebuildScene(playerChunkX, playerChunkZ);
  }

  return { lastPlayerChunkX: playerChunkX, lastPlayerChunkZ: playerChunkZ };
}
