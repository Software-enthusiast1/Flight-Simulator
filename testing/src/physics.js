// physics.js — Simplified flight-style movement and camera state

import { thirdPersonCamera, cameraSmoothingFactor } from './options.js';

export const player = {
  pos: [0, 40, 10],
  forward: [1, 0, 0],
  up: [0, 1, 0],
  right: [0, 0, 1],
  throttle: 0,
  speed: 6.0,
};

export const camera = {
  pos: [0, 40, 0],
  yaw: 0,
  pitch: 0,
  roll: 0,
  fov: 75 * Math.PI / 180,
};

export const MOVE_SPEED = 6.0;
export const ROT_SPEED = 3.0;
export const THROTTLE_STEP = 1.0;
export const THROTTLE_MAX = 10.0;
export const THROTTLE_MIN = 0.0;

export function getCameraPos() {
  return [camera.pos[0], camera.pos[1], camera.pos[2]];
}

function rotateVector(v, axis, theta) {
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

export function updatePlayer(dt, keys) {
  if (keys['a']) {
    player.forward = rotateVector(player.forward, player.up, ROT_SPEED * dt);
    player.right = rotateVector(player.right, player.up, ROT_SPEED * dt);
  } else if (keys['d']) {
    player.forward = rotateVector(player.forward, player.up, -ROT_SPEED * dt);
    player.right = rotateVector(player.right, player.up, -ROT_SPEED * dt);
  }
  if (keys['arrowup']) {
    player.forward = rotateVector(player.forward, player.forward, ROT_SPEED * dt);
    player.up = rotateVector(player.up, player.forward, ROT_SPEED * dt);
  } else if (keys['arrowdown']) {
    player.forward = rotateVector(player.forward, player.forward, -ROT_SPEED * dt);
    player.up = rotateVector(player.up, player.forward, -ROT_SPEED * dt);
  }
  if (keys['arrowright']) {
    player.forward = rotateVector(player.forward, player.right, ROT_SPEED * dt);
    player.up = rotateVector(player.up, player.right, ROT_SPEED * dt);
  } else if (keys['arrowleft']) {
    player.forward = rotateVector(player.forward, player.right, -ROT_SPEED * dt);
    player.up = rotateVector(player.up, player.right, -ROT_SPEED * dt);
  }

  // Update right vector to maintain orthogonality
  player.right = [
    player.forward[1] * player.up[2] - player.forward[2] * player.up[1],
    player.forward[2] * player.up[0] - player.forward[0] * player.up[2],
    player.forward[0] * player.up[1] - player.forward[1] * player.up[0]
  ];

  // Normalize vectors to prevent drift
  const normalize = (v) => {
    const len = Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
    return [v[0]/len, v[1]/len, v[2]/len];
  };

  player.forward = normalize(player.forward);
  player.up = normalize(player.up);
  player.right = normalize(player.right);
}
