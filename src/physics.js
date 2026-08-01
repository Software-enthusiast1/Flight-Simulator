// physics.js — Simplified flight-style movement and camera state

import { thirdPersonCamera, cameraSmoothingFactor } from './options.js';

export const player = {
  pos: [0, 40, 5],
  yaw: 0,
  pitch: 0,
  roll: 0,
  throttle: 0,
  speed: 6.0,
};

export const camera = {
  pos: [0, 40, 5],
  yaw: 0,
  pitch: 0,
  roll: 0,
  targetPos: [0, 40, 5],
  targetYaw: 0,
  targetPitch: 0,
  targetRoll: 0,
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

export function updatePlayer(dt, keys) {
  if (keys['w']) {
    player.throttle = Math.min(THROTTLE_MAX, player.throttle + THROTTLE_STEP * dt);
  } else if (keys['s']) {
    player.throttle = Math.max(THROTTLE_MIN, player.throttle - THROTTLE_STEP * dt);
  }

  if (keys['a']) player.yaw -= ROT_SPEED * dt;
  if (keys['d']) player.yaw += ROT_SPEED * dt;
  if (keys['arrowleft']) player.roll += ROT_SPEED * dt;
  if (keys['arrowright']) player.roll -= ROT_SPEED * dt;
  if (keys['arrowup']) player.pitch += ROT_SPEED * dt;
  if (keys['arrowdown']) player.pitch -= ROT_SPEED * dt;

  const yawRad = player.yaw;
  const pitchRad = player.pitch;
  const rollRad = player.roll;

  const cosPitch = Math.cos(pitchRad);
  const sinPitch = Math.sin(pitchRad);
  const sinYaw = Math.sin(-yawRad);
  const cosYaw = Math.cos(-yawRad);

  const forward = [
    cosPitch * sinYaw,
    -sinPitch,
    cosPitch * cosYaw,
  ];

  const moveAmount = player.throttle * player.speed * dt;

  player.pos[0] += forward[0] * moveAmount;
  player.pos[1] += forward[1] * moveAmount;
  player.pos[2] += forward[2] * moveAmount;

  // Change this later for both 1st and 3rd person camera modes
  if (thirdPersonCamera) {
    const cameraDistance = 10.0;
    camera.targetYaw = yawRad;
    camera.targetPitch = pitchRad;
    camera.targetRoll = 0;
    camera.targetPos[0] = player.pos[0] - forward[0] * cameraDistance;
    camera.targetPos[1] = player.pos[1] - forward[1] * cameraDistance + 2.0; // Slightly above the plane not working because it is not true up vector
    camera.targetPos[2] = player.pos[2] - forward[2] * cameraDistance;
  } else {
    camera.targetYaw = yawRad;
    camera.targetPitch = pitchRad;
    camera.targetRoll = rollRad;
    camera.targetPos = [player.pos[0], player.pos[1], player.pos[2]];
  }
  // Step the camera position towards the target position for smooth movement
  camera.pos[0] += (camera.targetPos[0] - camera.pos[0]) * cameraSmoothingFactor;
  camera.pos[1] += (camera.targetPos[1] - camera.pos[1]) * cameraSmoothingFactor;
  camera.pos[2] += (camera.targetPos[2] - camera.pos[2]) * cameraSmoothingFactor;

  // Step the camera rotation towards the target rotation for smooth movement
  camera.yaw += (camera.targetYaw - camera.yaw) * cameraSmoothingFactor;
  camera.pitch += (camera.targetPitch - camera.pitch) * cameraSmoothingFactor;
  camera.roll += (camera.targetRoll - camera.roll) * cameraSmoothingFactor;

  // This doesnt work because it does not account that the position changes in rotation, but it looks cinematic so maybe a cinematic replay mode?
  // const cameraDistance = 10.0;
  // camera.targetPos[0] = player.pos[0] - forward[0] * cameraDistance;
  // camera.targetPos[1] = player.pos[1] - forward[1] * cameraDistance + 2.0; // Slightly above the plane
  // camera.targetPos[2] = player.pos[2] - forward[2] * cameraDistance;
  // camera.targetYaw = yawRad;
  // camera.targetPitch = pitchRad;
  // camera.targetRoll = rollRad;
}
