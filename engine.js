// engine.js — Main engine loop and initialization

import { vec3, perspectiveMatrix, lookAtMatrix } from './src/math.js';
import { setupWebGL, createShaderProgram, drawTriangles, resizeCanvas } from './src/rendering.js';
import { keys, setupInput } from './src/input.js';
import { player, camera, getCameraPos, updatePlayer } from './src/physics.js';
import { generateWorld, rebuildSceneTriangles, CHUNK_SIZE } from './src/world.js';
import { rebuildOceanTriangles } from './src/ocean.js';
import { drawPlane } from './src/plane.js';

// Initialize
(function() {
  const canvas = document.getElementById('screen');
  const gl = setupWebGL(canvas);
  if (!gl) return;

resizeCanvas(canvas);
gl.viewport(0, 0, canvas.width, canvas.height);

const program = createShaderProgram(gl);
gl.useProgram(program);

// State
let worldSeed = 0;
let sceneTriangles = [];
let lastPlayerChunkX = 0;
let lastPlayerChunkZ = 0;

// Setup input handlers
setupInput();

// Handle window resize
window.addEventListener('resize', () => {
  resizeCanvas(canvas);
  gl.viewport(0, 0, canvas.width, canvas.height);
});

// Initial world setup
worldSeed = Date.now() % 2147483647;
generateWorld(worldSeed);
const initialChunkX = Math.floor(player.pos[0] / (CHUNK_SIZE));
const initialChunkZ = Math.floor(player.pos[2] / (CHUNK_SIZE));
sceneTriangles = rebuildSceneTriangles(initialChunkX, initialChunkZ);
lastPlayerChunkX = initialChunkX;
lastPlayerChunkZ = initialChunkZ;

// Render loop
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  // Update movement and camera state
  updatePlayer(dt, keys);

  const playerChunkX = Math.floor(player.pos[0] / (CHUNK_SIZE));
  const playerChunkZ = Math.floor(player.pos[2] / (CHUNK_SIZE));
  if (playerChunkX !== lastPlayerChunkX || playerChunkZ !== lastPlayerChunkZ) {
    sceneTriangles = rebuildSceneTriangles(playerChunkX, playerChunkZ);
    lastPlayerChunkX = playerChunkX;
    lastPlayerChunkZ = playerChunkZ;
  }

  // Clear screen
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // 1. Build projection matrix as normal
  const aspect = canvas.width / canvas.height;
  const projection = perspectiveMatrix(camera.fov, aspect, 0.1, 1000);

  // 2. Fetch the camera location
  const eye = getCameraPos();

  // 3. FIX: Build a standard, reliable View Matrix using Euler angles.
  // This forces all rotations (including roll) to spin perfectly at your camera origin.
  const cYaw = Math.cos(-camera.yaw + Math.PI);
  const sYaw = Math.sin(-camera.yaw + Math.PI);
  const cPitch = Math.cos(-camera.pitch);
  const sPitch = Math.sin(-camera.pitch);
  const cRoll = Math.cos(camera.roll);
  const sRoll = Math.sin(camera.roll);

  // Construct a clean, column-major Look-At View Matrix manually
  const view = [
    cYaw * cRoll + sYaw * sPitch * sRoll,   cRoll * sYaw * sPitch - cYaw * sRoll,   cPitch * sYaw,   0,
    cPitch * sRoll,                         cPitch * cRoll,                         -sPitch,         0,
    cYaw * sPitch * sRoll - cRoll * sYaw,   cYaw * cRoll * sPitch + sYaw * sRoll,   cYaw * cPitch,   0,
    0,                                      0,                                      0,               1
  ];

  // 4. Translate the View Matrix by the camera's position (negative eye vectors)
  // This shifts the world around your camera position BEFORE any rotations apply.
  view[12] = -(view[0] * eye[0] + view[4] * eye[1] + view[8] * eye[2]);
  view[13] = -(view[1] * eye[0] + view[5] * eye[1] + view[9] * eye[2]);
  view[14] = -(view[2] * eye[0] + view[6] * eye[1] + view[10] * eye[2]);

  // Draw terrain
  drawTriangles(gl, program, sceneTriangles, projection, view);

  // Draw animated ocean
  const oceanTriangles = rebuildOceanTriangles(player.pos, worldSeed, now);
  drawTriangles(gl, program, oceanTriangles, projection, view);

  const planeTriangles = drawPlane(player.pos[0], player.pos[1], player.pos[2], -player.yaw, player.pitch, -player.roll);
  drawTriangles(gl, program, planeTriangles, projection, view);

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
})();
