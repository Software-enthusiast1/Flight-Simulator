// physics.js — Simplified flight-style movement and camera state

import { cameraSmoothingFactor } from './options.js';

export const player = {
  pos: [0, 40, 5],
  forward: [0, 0, 1],
  up: [0, 1, 0],
  right: [1, 0, 0],
  throttle: 0,
  speed: 6.0,
};

export const camera = {
  pos: [0, 40, 5],
  forward: [0, 0, -1],
  up: [0, 1, 0],
  right: [1, 0, 0],
  targetPos: [0, 40, 5],
  targetForward: [0, 0, 1],
  targetUp: [0, 1, 0],
  targetRight: [1, 0, 0],
  fov: 75 * Math.PI / 180,
};

export function rotateVector(v, axis, theta) {
  // 1. Normalize the axis vector to get unit vector k
  const length = Math.sqrt(axis[0] * axis[0] + axis[1] * axis[1] + axis[2] * axis[2]);
  if (length === 0) {
      throw new Error("Axis vector cannot be a zero vector.");
  }
  const k = [axis[0] / length, axis[1] / length, axis[2] / length];

  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);

  // 2. Compute dot product (k . v)
  const dotProd = k[0] * v[0] + k[1] * v[1] + k[2] * v[2];

  // 3. Compute cross product (k x v)
  const crossProd = [
      k[1] * v[2] - k[2] * v[1],
      k[2] * v[0] - k[0] * v[2],
      k[0] * v[1] - k[1] * v[0]
  ];

  // 4. Combine terms using Rodrigues' formula
  // v_rot = v * cos(theta) + (k x v) * sin(theta) + k * (k . v) * (1 - cos(theta))
  const s = dotProd * (1 - cosTheta);

  return [
      v[0] * cosTheta + crossProd[0] * sinTheta + k[0] * s,
      v[1] * cosTheta + crossProd[1] * sinTheta + k[1] * s,
      v[2] * cosTheta + crossProd[2] * sinTheta + k[2] * s
  ];
}

export const MOVE_SPEED = 6.0;
export const ROT_SPEED = 3.0;
export const THROTTLE_STEP = 1.0;
export const THROTTLE_MAX = 10.0;
export const THROTTLE_MIN = 0.0;

export function getCameraPos() {
  return [camera.pos[0], camera.pos[1], camera.pos[2]];
}

let thirdPersonCamera = true;
window.addEventListener('keydown', (event) => {
  if (event.repeat) return;
  if (event.key === 'c') {
    thirdPersonCamera = !thirdPersonCamera;
  }
});

export function updatePlayer(dt, keys) {
  // if (keys['c']) {
  //   thirdPersonCamera = !thirdPersonCamera;
  // }
  if (keys['w']) {
    player.throttle = Math.min(THROTTLE_MAX, player.throttle + THROTTLE_STEP * dt);
  } else if (keys['s']) {
    player.throttle = Math.max(THROTTLE_MIN, player.throttle - THROTTLE_STEP * dt);
  }
  if (keys['a']) {
    player.forward = rotateVector(player.forward, player.up, ROT_SPEED * dt);
    player.right   = rotateVector(player.right, player.up, ROT_SPEED * dt);
  } else if (keys['d']) {
    player.forward = rotateVector(player.forward, player.up, -ROT_SPEED * dt);
    player.right   = rotateVector(player.right, player.up, -ROT_SPEED * dt);
  }
  if (keys['arrowleft']) {
    player.up    = rotateVector(player.up, player.forward, -ROT_SPEED * dt);
    player.right = rotateVector(player.right, player.forward, -ROT_SPEED * dt);
  } else if (keys['arrowright']) {
    player.up    = rotateVector(player.up, player.forward, ROT_SPEED * dt);
    player.right = rotateVector(player.right, player.forward, ROT_SPEED * dt);
  }
  if (keys['arrowup']) {
    player.forward = rotateVector(player.forward, player.right, -ROT_SPEED * dt);
    player.up      = rotateVector(player.up, player.right, -ROT_SPEED * dt);
  } else if (keys['arrowdown']) {
    player.forward = rotateVector(player.forward, player.right, ROT_SPEED * dt);
    player.up      = rotateVector(player.up, player.right, ROT_SPEED * dt);
  }

  // Update right vector to maintain orthogonality
  player.right = [
    player.forward[1] * player.up[2] - player.forward[2] * player.up[1],
    player.forward[2] * player.up[0] - player.forward[0] * player.up[2],
    player.forward[0] * player.up[1] - player.forward[1] * player.up[0]
  ];

  const normalize = (v) => {
    const len = Math.hypot(v[0], v[1], v[2]);
    return len > 0 ? [v[0]/len, v[1]/len, v[2]/len] : [0, 0, 0];
  };

  player.forward = normalize(player.forward);
  player.up      = normalize(player.up);
  player.right   = normalize(player.right);

  const moveAmount = player.throttle * player.speed * dt;

  player.pos[0] += player.forward[0] * moveAmount;
  player.pos[1] += player.forward[1] * moveAmount;
  player.pos[2] += player.forward[2] * moveAmount;

  // Camera Target Positioning
  if (thirdPersonCamera) {
    camera.targetPos[0] = player.pos[0] - player.forward[0] * 10 + player.up[0] * 3;
    camera.targetPos[1] = player.pos[1] - player.forward[1] * 10 + player.up[1] * 3;
    camera.targetPos[2] = player.pos[2] - player.forward[2] * 10 + player.up[2] * 3;
  } else {
    camera.targetPos[0] = player.pos[0];
    camera.targetPos[1] = player.pos[1];
    camera.targetPos[2] = player.pos[2];
  }

  // Smooth camera Position
  camera.pos[0] += (camera.targetPos[0] - camera.pos[0]) * cameraSmoothingFactor;
  camera.pos[1] += (camera.targetPos[1] - camera.pos[1]) * cameraSmoothingFactor;
  camera.pos[2] += (camera.targetPos[2] - camera.pos[2]) * cameraSmoothingFactor;

  for (let i = 0; i < 3; i++) {
    camera.forward[i] += -(player.forward[i] - camera.forward[i]) * cameraSmoothingFactor;
    camera.up[i]      += (player.up[i] - camera.up[i]) * cameraSmoothingFactor;
  }
  camera.forward = normalize(camera.forward);
  camera.up      = normalize(camera.up);
}
