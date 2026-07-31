// engine.js — Main engine loop and initialization

import { vec3, perspectiveMatrix, lookAtMatrix } from './src/math.js';
import { setupWebGL, createShaderProgram, drawTriangles, resizeCanvas } from './src/rendering.js';
import { keys, setupInput } from './src/input.js';
import { player, camera, getCameraPos, updatePlayer } from './src/physics.js';
import { generateWorld, rebuildSceneTriangles, CHUNK_SIZE } from './src/world.js';
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

  // Build projection and view matrices
  const aspect = canvas.width / canvas.height;
  const projection = perspectiveMatrix(camera.fov, aspect, 0.1, 1000);
  const eye = getCameraPos();
  const target = vec3.add(eye, [Math.sin(-camera.yaw), Math.sin(-camera.pitch), Math.cos(-camera.yaw)]);
  const up = [0, 1, 0];
  const view = lookAtMatrix(eye, target, up, camera.roll);

  // Draw terrain
  drawTriangles(gl, program, sceneTriangles, projection, view);

  // Draw animated ocean
  const oceanTriangles = rebuildOceanTriangles(player.pos, worldSeed, now);
  drawTriangles(gl, program, oceanTriangles, projection, view);

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
})();
