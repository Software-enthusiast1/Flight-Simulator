// world.js — World and chunk management

import { mulberry32, perlinNoise, hslToRgb } from './noise.js';
import { RENDER_DIST, chunkResolution, vegetation, water, color, vegetationRenderDist } from './options.js';
import { heightAt } from './math.js';

export const CHUNK_SIZE = 16;
export const CHUNK_RESOLUTION = Math.max(1, chunkResolution);

const worldChunks = new Map(); // key: "x,z", value: {tris}
let worldSeed = 0;

export function getChunkKey(chunkX, chunkZ) {
  return `${chunkX},${chunkZ}`;
}

export function terrainHeightAt(x, z, seed) {
  let h = (perlinNoise(x * 0.2, z * 0.2, seed - 4) * 20.0) + 20;
  h += (perlinNoise(x * 0.7, z * 0.7, seed - 3) * 7.0) + 7;
  h += (perlinNoise(x * 2.5, z * 2.5, seed - 2) * 0.4) + 0.4;
  h += (perlinNoise(x * 5.5, z * 5.5, seed - 1) * 0.1) + 0.1;

  if (water) {
    const biomeWater = perlinNoise(x * 0.02, z * 0.02, seed - 999);

    const transitionStart = 0;
    const transitionEnd = 0.5;
    const t = (biomeWater - transitionStart) / (transitionEnd - transitionStart);
    const oceanBlend = Math.max(0, Math.min(1, t));
    const smoothBlend = oceanBlend * oceanBlend * (3 - 2 * oceanBlend);

    const deepTerrain = perlinNoise(x * 0.5, z * 0.5, seed - 50) * 8.0 - 30.0;

    h = h * (1 - smoothBlend) + deepTerrain * smoothBlend;
  }

  return h;
}

function generateChunk(chunkX, chunkZ, getBiome) {
  const key = getChunkKey(chunkX, chunkZ);
  if (worldChunks.has(key)) return worldChunks.get(key);

  const seed = worldSeed ^ (chunkX * 73856093) ^ (chunkZ * 19349663);
  const rnd = mulberry32(seed | 0);
  const tris = [];

  // World position of chunk corner
  const offsetX = chunkX * CHUNK_SIZE;
  const offsetZ = chunkZ * CHUNK_SIZE;

  // generate a padded terrain grid (one extra row/col on each side) to allow smoothing across chunk borders
  const PAD = 1;
  const resolution = CHUNK_RESOLUTION;
  const gridSize = resolution + 1;
  const padSize = gridSize + PAD * 2; // padded grid size
  const padded = new Array(padSize * padSize);
  const sampleStep = CHUNK_SIZE / resolution;

  for (let ix = 0; ix < padSize; ix++) {
    for (let iz = 0; iz < padSize; iz++) {
      const worldX = offsetX + (ix - PAD) * sampleStep;
      const worldZ = offsetZ + (iz - PAD) * sampleStep;
      const h = terrainHeightAt(worldX, worldZ, worldSeed);
      padded[ix * padSize + iz] = { x: worldX, z: worldZ, h };
    }
  }

  // build terrain triangles from the inner grid (excluding padding)
  const heights = [];
  for (let ix = 0; ix < gridSize; ix++) {
    for (let iz = 0; iz < gridSize; iz++) {
      const p = padded[(ix + PAD) * padSize + (iz + PAD)];
      heights.push({ x: p.x, z: p.z, h: p.h, ix, iz });
    }
  }

  // color helper (kept from previous implementation)
  const colorByBiome = (h, x, z) => {
    const biome = getBiome(x, z);
    if (biome === 'desert') return h < 20 ? hslToRgb(0.12, 0.75, 0.54) : hslToRgb(0.13, 0.75, 0.58);
    if (biome === 'plains') return h < 20 ? hslToRgb(0.28, 0.75, 0.42) : hslToRgb(0.25, 0.75, 0.36);
    if (biome === 'snowy_plains') {
      if (h < 20) return hslToRgb(0, 0, 0.85);
      return hslToRgb(0, 0, 0.9);
    }
    return hslToRgb(0, 0, 0.5);
  };

  for (let ix = 0; ix < resolution; ix++) {
    for (let iz = 0; iz < resolution; iz++) {
      const idx = ix * (resolution + 1) + iz;
      const i1 = idx;
      const i2 = idx + 1;
      const i3 = idx + (resolution + 1);
      const i4 = idx + (resolution + 1) + 1;

      const h00 = heights[i1].h;
      const h10 = heights[i2].h;
      const h01 = heights[i3].h;
      const h11 = heights[i4].h;

      if (h00 < -1 && h10 < -1 && h01 < -1 && h11 < -1) {
        // Skip deep ocean quads
        continue;
      }

      const v00 = [heights[i1].x, h00, heights[i1].z];
      const v10 = [heights[i2].x, h10, heights[i2].z];
      const v01 = [heights[i3].x, h01, heights[i3].z];
      const v11 = [heights[i4].x, h11, heights[i4].z];

      const avgX = (heights[i1].x + heights[i2].x + heights[i3].x + heights[i4].x) / 4;
      const avgZ = (heights[i1].z + heights[i2].z + heights[i3].z + heights[i4].z) / 4;
      const avgH = (h00 + h10 + h01 + h11) / 4;
      let col;
      if (color) {
        col = colorByBiome(avgH, avgX, avgZ);
      } else {
        col = hslToRgb(0, 0, 1);
      }
      
      const heightVar = Math.max(
        Math.abs(h00 - h10), Math.abs(h10 - h11),
        Math.abs(h11 - h01), Math.abs(h01 - h00),
        Math.abs(h00 - h11), Math.abs(h10 - h01)
      );

      const diag1 = Math.abs((h00 + h11) - (h10 + h01));

      if (heightVar > 1.5) {
        const cx = (heights[i1].x + heights[i2].x + heights[i3].x + heights[i4].x) / 4;
        const cz = (heights[i1].z + heights[i2].z + heights[i3].z + heights[i4].z) / 4;
        const ch = (h00 + h10 + h01 + h11) / 4;
        const vc = [cx, ch, cz];
        tris.push({ verts: [v00, v10, vc], color: col });
        tris.push({ verts: [v10, v11, vc], color: col });
        tris.push({ verts: [v11, v01, vc], color: col });
        tris.push({ verts: [v01, v00, vc], color: col });
      } else if (diag1 < 0.5) {
        tris.push({ verts: [v00, v10, v11], color: col });
        tris.push({ verts: [v00, v11, v01], color: col });
      } else {
        tris.push({ verts: [v00, v10, v01], color: col });
        tris.push({ verts: [v10, v11, v01], color: col });
      }
    }
  }

  const chunk = { tris };
  worldChunks.set(key, chunk);
  return chunk;
}

// Dynamically import vegetation
function generateVegetation(sceneTris, chunkX, chunkZ, rnd, heightAt, getBiome) {
  let tris = [];

  // add procedural trees to chunk
  let baseTrees = -10 + Math.floor(rnd() * 8);
  const biomeSampleX = chunkX + CHUNK_SIZE * 0.5;
  const biomeSampleZ = chunkZ + CHUNK_SIZE * 0.5;
  const sampleBiome = getBiome(biomeSampleX, biomeSampleZ);
  if (sampleBiome === 'desert') baseTrees = Math.max(0, Math.floor(baseTrees * 0.35));
  if (sampleBiome === 'plains' || sampleBiome === 'snowy_plains') baseTrees = Math.max(1, Math.floor(baseTrees * 1.2));
  const treeCount = baseTrees;

  const positions = [];
  const outliers = Math.max(1, Math.floor(treeCount * 0.3));
  for (let o = 0; o < outliers; o++) {
    const tx = chunkX + (rnd() - 0.5) * CHUNK_SIZE * 0.95;
    const tz = chunkZ + (rnd() - 0.5) * CHUNK_SIZE * 0.95;
    positions.push({ x: tx, z: tz, cluster: false });
  }

  // Place vegetation at generated positions
  for (const ppos of positions) {
    const tx = ppos.x;
    const tz = ppos.z;
    const th = heightAt(tx, tz, sceneTris);
    const biome = getBiome(tx, tz);

    let canPlaceVegetation = false;
    let vegetationType = null;

    if (biome === 'desert') {
      if (th > 0) {
        canPlaceVegetation = true;
        vegetationType = 'cactus';
      }
    } else if (biome === 'plains') {
      if (th > 0) {
        canPlaceVegetation = true;
        vegetationType = 'oak';
      }
    } else if (biome === 'snowy_plains') {
      if (th > 0) {
        canPlaceVegetation = true;
        vegetationType = 'evergreen';
      }
    }

    if (!canPlaceVegetation) continue;

    if (vegetationType === 'cactus') {
      const cactus = generateCactus(tx, tz, th, rnd);
      tris.push(...cactus);
    } else if (vegetationType === 'evergreen') {
      const evergreen = generateEvergreen(tx, tz, th, rnd);
      tris.push(...evergreen);
    } else if (vegetationType === 'oak') {
      const oak = generateOak(tx, tz, th, rnd);
      tris.push(...oak);
    }
  }
  return tris;
}

function generateCactus(tx, tz, th, rnd) {
  let tris = [];
  const cactusH = 1.5 + rnd() * 0.8;
  const cactusRad = 0.25 + rnd() * 0.2;
  const cactusColor = hslToRgb(0.32, 0.75, 0.35);
  const segments = 5 + Math.floor(rnd() * 3);

  const sides = 6;
  const segmentH = cactusH / segments;

  for (let seg = 0; seg < segments; seg++) {
    const h1 = th + seg * segmentH;
    const h2 = th + (seg + 1) * segmentH;
    const rad1 = cactusRad * (1 + Math.sin(seg * 0.8) * 0.2);
    const rad2 = cactusRad * (1 + Math.sin((seg + 1) * 0.8) * 0.2);

    for (let s = 0; s < sides; s++) {
      const a1 = (s / sides) * Math.PI * 2;
      const a2 = ((s + 1) / sides) * Math.PI * 2;
      const v0 = [tx + Math.cos(a1) * rad1, h1, tz + Math.sin(a1) * rad1];
      const v1 = [tx + Math.cos(a2) * rad1, h1, tz + Math.sin(a2) * rad1];
      const v2 = [tx + Math.cos(a2) * rad2, h2, tz + Math.sin(a2) * rad2];
      const v3 = [tx + Math.cos(a1) * rad2, h2, tz + Math.sin(a1) * rad2];
      tris.push({ verts: [v0, v2, v1], color: cactusColor });
      tris.push({ verts: [v0, v3, v2], color: cactusColor });

      if (seg + 1 == segments) {
        const v4 = [tx, th + (seg + 1.5) * segmentH, tz];
        tris.push({ verts: [v2, v3, v4], color: cactusColor });
      } else if (seg === 0) {
        const v4 = [tx, th - segmentH * 5, tz];
        tris.push({ verts: [v0, v1, v4], color: cactusColor });
      }
    }
  }

  const spineColor = hslToRgb(0.08, 0.8, 0.4);
  for (let seg = 0; seg < segments; seg += 2) {
    if (seg === segments - 1) continue;
    const segH = th + (seg + 0.5) * segmentH;
    const armCount = 5 + Math.floor(rnd() * 2);

    for (let a = 0; a < armCount; a++) {
      const spineH = segH + (rnd() - 0.5) * segH * 0.05;
      if (spineH > th + (segments * segmentH)) continue;
      if (spineH < th) continue;
      const angle = ((a / armCount) * Math.PI * 2);
      const armLen = 0.1 + rnd() * 0.15;
      const armX = tx + Math.cos(angle) * (cactusRad + armLen);
      const armZ = tz + Math.sin(angle) * (cactusRad + armLen);
      const armTipH = spineH + rnd() * 0.2;

      const armThickness = 0.1;
      const baseX0 = tx + Math.sin(0 - angle) * armThickness;
      const baseZ0 = tz + Math.cos(0 - angle) * armThickness;
      const baseX1 = 2 * tx - baseX0;
      const baseZ1 = 2 * tz - baseZ0;

      const v0 = [baseX0, spineH, baseZ0];
      const v1 = [armX, armTipH, armZ];
      const v2 = [baseX0, spineH + armThickness, baseZ0];
      const v3 = [baseX1, spineH, baseZ1];
      const v4 = [baseX1, spineH + armThickness, baseZ1];
      tris.push({ verts: [v0, v3, v1], color: spineColor });
      tris.push({ verts: [v1, v4, v2], color: spineColor });
      tris.push({ verts: [v0, v1, v2], color: spineColor });
      tris.push({ verts: [v3, v4, v1], color: spineColor });
    }
  }
  return tris;
}

function generateEvergreen(tx, tz, th, rnd) {
  let tris = [];
  const height = 10 + rnd() * 1.5;
  const leavesHeight = th + height * 0.1 * rnd() + 0.8;
  const treeColor = hslToRgb(0.35, 0.7, 0.35);
  const trunkColor = hslToRgb(0.05, 0.6, 0.15);

  const trunkRad = 1.5;
  const sides = 6;
  const trunkTop = [tx, th + height, tz];
  for (let s = 0; s < sides; s++) {
    const a1 = (s / sides) * Math.PI * 2;
    const a2 = ((s + 1) / sides) * Math.PI * 2;
    const v1 = [tx + Math.cos(a1) * trunkRad, th, tz + Math.sin(a1) * trunkRad];
    const v2 = [tx + Math.cos(a2) * trunkRad, th, tz + Math.sin(a2) * trunkRad];
    tris.push({ verts: [v2, v1, trunkTop], color: trunkColor });
    tris.push({ verts: [v1, v2, [tx, th - 2, tz]], color: trunkColor });
  }

  const layers = 6;
  for (let lay = 0; lay < layers; lay++) {
    const layerHeight = leavesHeight + (height - (leavesHeight - th)) * (lay / (layers - 1));
    const layerRad = 0.4 * Math.pow(1 - lay / (layers - 1), 0.5) * height;

    let random1 = rnd() * 0.75;
    let random2 = rnd() * 0.75;
    let finalRandom = random1;
    for (let s = 0; s < sides; s++) {
      if (s === sides - 1) random2 = finalRandom;
      const a1 = (s / (sides)) * Math.PI * 2;
      const a2 = ((s + 1) / sides) * Math.PI * 2;
      const v0 = [tx + Math.cos(a1) * (layerRad), layerHeight + random1, tz + Math.sin(a1) * (layerRad)];
      const v1 = [tx + Math.cos(a2) * (layerRad), layerHeight + random2, tz + Math.sin(a2) * (layerRad)];
      const v2 = trunkTop;
      const v3 = [tx, layerHeight, tz]
      tris.push({ verts: [v0, v2, v1], color: treeColor });
      tris.push({ verts: [v0, v1, v3], color: treeColor });
      random1 = random2;
      random2 = rnd() * 0.75;
    }
  }
  return tris;
}

function generateOak(tx, tz, th, rnd) {
  let tris = [];
  const height = 5 + rnd();
  const leavesHeight = th + height * 0.1 * rnd() + 0.8;
  const treeColor = hslToRgb(0.35, 0.8 + rnd() * 0.4, 0.20 + rnd() * 0.4);
  const trunkColor = hslToRgb(0.05, 0.6, 0.15);

  const trunkRad = 0.4;
  const sides = 6;
  const trunkTop = [tx, th + height, tz];
  for (let s = 0; s < sides; s++) {
    const a1 = (s / sides) * Math.PI * 2;
    const a2 = ((s + 1) / sides) * Math.PI * 2;
    const v1 = [tx + Math.cos(a1) * trunkRad, th, tz + Math.sin(a1) * trunkRad];
    const v2 = [tx + Math.cos(a2) * trunkRad, th, tz + Math.sin(a2) * trunkRad];
    tris.push({ verts: [v2, v1, trunkTop], color: trunkColor });
    tris.push({ verts: [v1, v2, [tx, th-2, tz]], color: trunkColor });
  }

  const layers = 8;
  for (let lay = 0; lay < layers; lay++) {
    const layerHeight = leavesHeight + (height - (leavesHeight - th)) * (lay / (layers - 1));
    const layerRad = 0.2 * (1 - lay / (layers - 1)) * height;

    for (let s = 0; s < sides; s++) {
      const a1 = (s / sides) * Math.PI * 2;
      const a2 = ((s + 1) / sides) * Math.PI * 2;
      const v0 = [tx + Math.cos(a1) * layerRad, layerHeight, tz + Math.sin(a1) * layerRad];
      const v1 = [tx + Math.cos(a2) * layerRad, layerHeight, tz + Math.sin(a2) * layerRad];
      const v2 = trunkTop;
      const v3 = [tx, layerHeight, tz];
      tris.push({ verts: [v0, v2, v1], color: treeColor });
      tris.push({ verts: [v0, v1, v3], color: treeColor });
    }
  }
  return tris;
}

export function generateWorld(seed) {
  worldSeed = seed;
  worldChunks.clear();
}

export function rebuildSceneTriangles(playerChunkX, playerChunkZ) {
  const sceneTriangles = [];

  // Get discrete biome from continuous biome value (moved to higher scope)
  const getBiome = (x, z) => {
    // Biome value is based of of a simple heatmap
    const biomeVal = perlinNoise(x * 0.01, z * 0.01, worldSeed + 999);

    if (biomeVal < -0.33) return 'desert';
    if (biomeVal < 0.33) return 'plains';
    return 'snowy_plains';
  };

  // Generate/load chunks around player
  for (let cx = playerChunkX - RENDER_DIST; cx <= playerChunkX + RENDER_DIST; cx++) {
    for (let cz = playerChunkZ - RENDER_DIST; cz <= playerChunkZ + RENDER_DIST; cz++) {
      const chunk = generateChunk(cx, cz, getBiome);
      sceneTriangles.push(...chunk.tris);
    }
  }

  // Import vegetation generation from vegetation.js
  if (vegetation) {
    for (let cx = playerChunkX - vegetationRenderDist; cx <= playerChunkX + vegetationRenderDist; cx++) {
      for (let cz = playerChunkZ - vegetationRenderDist; cz <= playerChunkZ + vegetationRenderDist; cz++) {
        const seed = worldSeed ^ (cx * 73856093) ^ (cz * 19349663);
        const rnd = mulberry32(seed | 0);
        const vegetation = generateVegetation(sceneTriangles, cx * CHUNK_SIZE, cz * CHUNK_SIZE, rnd, heightAt, getBiome);
        sceneTriangles.push(...vegetation);
      }
    }
  }

  return sceneTriangles;
}
