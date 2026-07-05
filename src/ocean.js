// ocean.js — Ocean generation and animation

import { perlinNoise4D, hslToRgb } from './noise.js';
import { CHUNK_SIZE, CHUNK_SPACING, RENDER_DIST } from './world.js';

export function rebuildOceanTriangles(playerPos, worldSeed, time) {
  const oceanTriangles = [];

  // Get player chunk position
  const playerChunkX = Math.floor(playerPos[0] / (CHUNK_SIZE * CHUNK_SPACING));
  const playerChunkZ = Math.floor(playerPos[2] / (CHUNK_SIZE * CHUNK_SPACING));

  // Generate ocean chunks around player
  for (let cx = playerChunkX - RENDER_DIST; cx <= playerChunkX + RENDER_DIST; cx++) {
    for (let cz = playerChunkZ - RENDER_DIST; cz <= playerChunkZ + RENDER_DIST; cz++) {
      const chunk = generateOceanChunk(cx, cz, worldSeed, time);
      oceanTriangles.push(...chunk.tris);
    }
  }

  return oceanTriangles;
}

function generateOceanChunk(chunkX, chunkZ, worldSeed, time) {
  const tris = [];
  const spacing = CHUNK_SPACING;

  const offsetX = chunkX * CHUNK_SIZE * spacing;
  const offsetZ = chunkZ * CHUNK_SIZE * spacing;

  const oceanColor = hslToRgb(0.55, 1, 0.60);

  // Generate ocean surface mesh with animated waves
  for (let ix = 0; ix < CHUNK_SIZE; ix++) {
    for (let iz = 0; iz < CHUNK_SIZE; iz++) {
      const x0 = offsetX + ix * spacing;
      const z0 = offsetZ + iz * spacing;
      const x1 = offsetX + (ix + 1) * spacing;
      const z1 = offsetZ + (iz + 1) * spacing;

      // Get wave height at each corner using 4D perlin noise
      const amplitude = 0.85; // Wave amplitude
      const waveLength = 0.4; // Wave length
      const h00 = perlinNoise4D(x0 * waveLength, z0 * waveLength, time * 0.001, worldSeed) * amplitude;
      const h10 = perlinNoise4D(x1 * waveLength, z0 * waveLength, time * 0.001, worldSeed) * amplitude;
      const h01 = perlinNoise4D(x0 * waveLength, z1 * waveLength, time * 0.001, worldSeed) * amplitude;
      const h11 = perlinNoise4D(x1 * waveLength, z1 * waveLength, time * 0.001, worldSeed) * amplitude;

      // Water surface is at y=0 + wave height
      const v00 = [x0, h00, z0];
      const v10 = [x1, h10, z0];
      const v01 = [x0, h01, z1];
      const v11 = [x1, h11, z1];

      // Create two triangles per quad
      tris.push({ verts: [v00, v11, v10], color: oceanColor });
      tris.push({ verts: [v00, v01, v11], color: oceanColor });
    }
  }

  return { tris };
}
