// noise.js — Noise and terrain generation functions

import SimplexNoise from 'https://cdn.jsdelivr.net/npm/simplex-noise@3.0.0/+esm';

// Simple seeded PRNG (mulberry32)
export function mulberry32(a) {
  return function () {
    a |= 0;
    a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

// Replace previous perlin-like implementation with seeded simplex-noise fBm
const _simplexCache = new Map();

function getSimplex(seed) {
  const key = seed | 0;
  if (_simplexCache.has(key)) return _simplexCache.get(key);
  const rnd = mulberry32(key);
  const rndFn = () => rnd();
  const inst = new SimplexNoise(rndFn);
  _simplexCache.set(key, inst);
  return inst;
}

// Keep the function name `perlinNoise` so existing calls remain unchanged.
// This uses fractal Brownian motion (fBm) over simplex noise and returns in approx [-1,1].
export function perlinNoise(x, z, seed) {
  const inst = getSimplex(seed || 0);
  let value = 0;
  let amplitude = 3.0;
  let frequency = 0.025; // base frequency (tweak for visible scale)
  const octaves = 1;
  const lacunarity = 2.0;
  const gain = 0.5;
  let ampSum = 0;
  for (let i = 0; i < octaves; i++) {
    value += inst.noise2D(x * frequency, z * frequency) * amplitude;
    ampSum += amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }
  return value / ampSum;
}

// 4D perlin noise for wave animation (x, z, time, seed)
export function perlinNoise4D(x, z, time, seed) {
  const inst = getSimplex(seed || 0);
  let value = 0;
  let amplitude = 1.0;
  let frequency = 0.15;
  const octaves = 3;
  const lacunarity = 2.0;
  const gain = 0.5;
  let ampSum = 0;
  for (let i = 0; i < octaves; i++) {
    // Use time as a dimension for animation
    value += inst.noise3D(x * frequency, z * frequency, time * frequency * 0.5) * amplitude;
    ampSum += amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }
  return value / ampSum;
}

export function hslToRgb(h, s, l) {
  // h in [0,1]
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}
