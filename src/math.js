// math.js — Vector and matrix utilities

export const vec3 = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  norm: (a) => {
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  },
  len: (a) => Math.hypot(a[0], a[1], a[2])
};

export function perspectiveMatrix(fov, aspect, near, far) {
  const f = 1.0 / Math.tan(fov / 2);
  const nf = 1 / (near - far);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, (2 * far * near) * nf, 0
  ]);
}

export function lookAtMatrix(eye, target, up, roll) {
  // Build lookAt matrix
  const z = vec3.norm(vec3.sub(eye, target));
  const x = vec3.norm(vec3.cross(up, z));
  const y = vec3.cross(z, x);
  let m = [
    x[0], y[0], z[0], 0,
    x[1], y[1], z[1], 0,
    x[2], y[2], z[2], 0,
    -vec3.dot(x, eye), -vec3.dot(y, eye), -vec3.dot(z, eye), 1
  ];
  // Apply roll (rotation around Z axis)
  const cr = Math.cos(-roll), sr = Math.sin(-roll);
  // 3x3 rotation for roll
  const rollMat = [
    cr, -sr, 0,
    sr, cr, 0,
    0, 0, 1
  ];
  // Multiply rollMat * upper 3x3 of m
  let out = new Float32Array(16);
  for (let row = 0; row < 3; ++row) {
    for (let col = 0; col < 3; ++col) {
      out[col * 4 + row] = rollMat[row * 3 + 0] * m[col * 4 + 0] + rollMat[row * 3 + 1] * m[col * 4 + 1] + rollMat[row * 3 + 2] * m[col * 4 + 2];
    }
  }
  // Copy translation and bottom row
  out[12] = m[12];
  out[13] = m[13];
  out[14] = m[14];
  out[15] = m[15];
  return out;
}

// Ray-cast down from pos to find ground height
export function heightAt(x, z, sceneTriangles) {
  // Simple heightfield lookup using scene triangles with barycentric interpolation
  let maxY = -100;

  for (const tri of sceneTriangles) {
    const v0 = tri.verts[0], v1 = tri.verts[1], v2 = tri.verts[2];
    
    const maxDist = 10; // early exit if triangle is too far away
    if (Math.abs(v0[0] - x) > maxDist || Math.abs(v1[0] - x) > maxDist || Math.abs(v2[0] - x) > maxDist) continue;
    if (Math.abs(v0[2] - z) > maxDist || Math.abs(v1[2] - z) > maxDist || Math.abs(v2[2] - z) > maxDist) continue;

    // bounding box check (early exit)
    const minX = Math.min(v0[0], v1[0], v2[0]);
    const maxX = Math.max(v0[0], v1[0], v2[0]);
    const minZ = Math.min(v0[2], v1[2], v2[2]);
    const maxZ = Math.max(v0[2], v1[2], v2[2]);

    if (x >= minX && x <= maxX && z >= minZ && z <= maxZ) {
      // Barycentric coordinates for point in triangle
      const denom = ((v1[2] - v2[2]) * (v0[0] - v2[0]) + (v2[0] - v1[0]) * (v0[2] - v2[2]));
      if (Math.abs(denom) < 0.0001) continue; // degenerate triangle

      const a = ((v1[2] - v2[2]) * (x - v2[0]) + (v2[0] - v1[0]) * (z - v2[2])) / denom;
      const b = ((v2[2] - v0[2]) * (x - v2[0]) + (v0[0] - v2[0]) * (z - v2[2])) / denom;
      const c = 1 - a - b;

      // if point is inside triangle
      if (a >= -0.01 && b >= -0.01 && c >= -0.01) {
        const h = a * v0[1] + b * v1[1] + c * v2[1];
        maxY = Math.max(maxY, h);
      }
    }
  }
  return maxY;
}
