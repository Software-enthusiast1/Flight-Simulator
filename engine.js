// engine.js — Main engine loop and initialization

import { vec3, perspectiveMatrix, lookAtMatrix } from './src/math.js';
import { setupWebGL, createShaderProgram, drawTriangles, resizeCanvas } from './src/rendering.js';
import { keys, setupInput } from './src/input.js';
import { player, getCameraPos, getTerrainHeightAt, resetCamera, updatePlayer, JUMP_FORCE } from './src/physics.js';
import { generateWorld, rebuildSceneTriangles } from './src/world.js';
import { rebuildOceanTriangles } from './src/ocean.js';

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
const CHUNK_SIZE = 16;
const CHUNK_SPACING = 1.0;

// Setup input handlers
setupInput(
  // onReset
  () => {
    resetCamera();
  },
  // onJump
  () => {
    if (player.isGrounded) {
      player.jumpPower = JUMP_FORCE;
    }
  },
  // onRegenerate
  () => {
    generateWorld((Date.now() + Math.floor(Math.random() * 100000)) % 2147483647);
    sceneTriangles = rebuildSceneTriangles(lastPlayerChunkX, lastPlayerChunkZ);
  }
);

// Handle window resize
window.addEventListener('resize', () => {
  resizeCanvas(canvas);
  gl.viewport(0, 0, canvas.width, canvas.height);
});

// Initial world setup
worldSeed = Date.now() % 2147483647;
generateWorld(worldSeed);
const playerChunkX = Math.floor(player.pos[0] / (CHUNK_SIZE * CHUNK_SPACING));
const playerChunkZ = Math.floor(player.pos[2] / (CHUNK_SIZE * CHUNK_SPACING));
sceneTriangles = rebuildSceneTriangles(playerChunkX, playerChunkZ);
lastPlayerChunkX = playerChunkX;
lastPlayerChunkZ = playerChunkZ;

// Place player on valid terrain
const initialGroundHeight = getTerrainHeightAt(player.pos[0], player.pos[2], sceneTriangles);
player.pos[1] = Math.max(initialGroundHeight + 0.5, 0.5);

// Render loop
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  // Update physics
  const chunkUpdate = updatePlayer(dt, keys, sceneTriangles, CHUNK_SIZE, CHUNK_SPACING, lastPlayerChunkX, lastPlayerChunkZ, (newChunkX, newChunkZ) => {
    lastPlayerChunkX = newChunkX;
    lastPlayerChunkZ = newChunkZ;
    sceneTriangles = rebuildSceneTriangles(newChunkX, newChunkZ);
  });
  lastPlayerChunkX = chunkUpdate.lastPlayerChunkX;
  lastPlayerChunkZ = chunkUpdate.lastPlayerChunkZ;

  // Clear screen
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Build projection and view matrices
  const aspect = canvas.width / canvas.height;
  const projection = perspectiveMatrix(player.fov, aspect, 0.1, 1000);
  const eye = getCameraPos();
  const target = vec3.add(eye, [Math.sin(-player.yaw), Math.sin(-player.pitch), Math.cos(-player.yaw)]);
  const up = [0, 1, 0];
  const view = lookAtMatrix(eye, target, up, player.roll);

  // Draw terrain
  drawTriangles(gl, program, sceneTriangles, projection, view);

  // Draw animated ocean
  const oceanTriangles = rebuildOceanTriangles(player.pos, worldSeed, now);
  drawTriangles(gl, program, oceanTriangles, projection, view);

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
})();
