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

const fpsElement = document.getElementById('fps');
let frameCount = 0;
let fpsLastTime = performance.now();

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

  frameCount++;
  if (now - fpsLastTime >= 250) {
    if (fpsElement) {
      fpsElement.textContent = `FPS: ${frameCount * 4}`;
    }
    frameCount = 0;
    fpsLastTime = now;
  }

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

  // 3. REPLACED: Build standard View Matrix using camera's basis vectors
  const z = camera.forward; // Camera Z-axis
  
  // Calculate Camera X-axis (Right) = Up x Forward
  let x = [
    camera.up[1] * z[2] - camera.up[2] * z[1],
    camera.up[2] * z[0] - camera.up[0] * z[2],
    camera.up[0] * z[1] - camera.up[1] * z[0]
  ];
  const xLen = Math.hypot(x[0], x[1], x[2]);
  x = xLen > 0 ? [x[0]/xLen, x[1]/xLen, x[2]/xLen] : [1, 0, 0];

  // Calculate Camera True Y-axis (Up) = Forward x Right
  const y = [
    z[1] * x[2] - z[2] * x[1],
    z[2] * x[0] - z[0] * x[2],
    z[0] * x[1] - z[1] * x[0]
  ];

  // Dot products for translation
  const dx = -(x[0] * eye[0] + x[1] * eye[1] + x[2] * eye[2]);
  const dy = -(y[0] * eye[0] + y[1] * eye[1] + y[2] * eye[2]);
  const dz = -(z[0] * eye[0] + z[1] * eye[1] + z[2] * eye[2]);

  // Column-Major View Matrix
  const view = [
    x[0], y[0], z[0], 0,
    x[1], y[1], z[1], 0,
    x[2], y[2], z[2], 0,
     dx,   dy,   dz,  1
  ];
  
  // Draw terrain
  drawTriangles(gl, program, sceneTriangles, projection, view, true);

  // Draw animated ocean
  const oceanTriangles = rebuildOceanTriangles(player.pos, worldSeed, now);
  drawTriangles(gl, program, oceanTriangles, projection, view, false);

  const planeTriangles = drawPlane(player.pos[0], player.pos[1], player.pos[2], player.forward, player.up, player.right);
  drawTriangles(gl, program, planeTriangles, projection, view, false);

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
})();
