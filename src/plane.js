// plane.js - plane rotation and movement handled here

const rotate = ([x, y, z ], pitch, yaw, roll) => {
  const cp = Math.cos(pitch), sp = Math.sin(pitch); // Y-axis
  const cy = Math.cos(yaw),   sy = Math.sin(yaw);   // Z-axis
  const cr = Math.cos(roll),  sr = Math.sin(roll);  // X-axis

  // Combined Matrix Math for Y -> Z -> X sequence
  const nx = x * (cy * cp) + y * (-sy) + z * (cy * sp);
  const ny = x * (cr * sy * cp + sr * sp) + y * (cr * cy) + z * (cr * sy * sp - sr * cp);
  const nz = x * (sr * sy * cp - cr * sp) + y * (sr * cy) + z * (sr * sy * sp + cr * cp);

  return [nx, ny, nz];
};

const translate = ([x, y, z], [tx, ty, tz]) => {
    return [x + tx, y + ty, z + tz];
}


export const drawPlane = (x, y, z, yaw, pitch, roll) => {
    const planeTris = [
        {verts: [[5, 1, -1], [5, -1, -0.05], [-1, -1, -1]], color: [255, 100, 100]},
        {verts: [[-1, 1, -1], [5, 1, -1], [-1, -1, -1]], color: [255, 100, 100]},
        {verts: [[5, 1, 1], [-1, -1, 1], [5, -1, 0.05]], color: [255, 100, 100]},
        {verts: [[-1, 1, 1], [-1, -1, 1], [5, 1, 1]], color: [255, 100, 100]},
        {verts: [[5, 1, 1], [-1, 1, -1], [-1, 1, 1]], color: [255, 100, 100]},
        {verts: [[5, 1, 1], [5, 1, -1], [-1, 1, -1]], color: [255, 100, 100]},
        {verts: [[-4, -1, 0], [-1, -1, -1], [-1, -1, 1]], color: [60, 200, 255]},
        {verts: [[-1, 1, -1], [-4, -1, 0], [-1, 1, 1]], color: [60, 200, 255]},
        {verts: [[-1, 1, 1], [-4, -1, 0], [-1, -1, 1]], color: [60, 200, 255]},
        {verts: [[-1, 1, -1], [-1, -1, -1], [-4, -1, 0]], color: [60, 200, 255]},
        {verts: [[7.5, 1, -0.05], [5, -1, -0.05], [5, 1, -1]], color: [255, 100, 100]},
        {verts: [[7.5, 1, 0.05], [5, 1, 1], [5, -1, 0.05]], color: [255, 100, 100]},
        {verts: [[7.5, 1, -0.05], [5, 1, -0.05], [8, 2.3, -0.05]], color: [255, 100, 100]},
        {verts: [[7.5, 1, 0.05], [8, 2.3, 0.05], [5, 1, 0.05]], color: [255, 100, 100]},
        {verts: [[5, 1, 0.05], [8, 2.3, 0.05], [5, 1, -0.05]], color: [255, 100, 100]},
        {verts: [[5, 1, -0.05], [8, 2.3, 0.05], [8, 2.3, -0.05]], color: [255, 100, 100]},
        {verts: [[8, 2.3, 0.05], [7.5, 1, 0.05], [7.5, 1, -0.05]], color: [255, 100, 100]},
        {verts: [[8, 2.3, -0.05], [8, 2.3, 0.05], [7.5, 1, -0.05]], color: [255, 100, 100]},
        {verts: [[-1, -1, 1], [-1, -1, -1], [5, -1, 0.05]], color: [255, 100, 100]},
        {verts: [[-1, -1, -1], [5, -1, -0.05], [5, -1, 0.05]], color: [255, 100, 100]},
        {verts: [[5, 1, 0], [7.5, 1, 0], [8, 1, 1.5]], color: [255, 100, 100]},
        {verts: [[5, 1.1, 0], [8, 1.1, 1.5], [7.5, 1.1, 0]], color: [255, 100, 100]},
        {verts: [[7.5, 1, 0], [5, 1, 0], [8, 1, -1.5]], color: [255, 100, 100]},
        {verts: [[7.5, 1.1, 0], [8, 1.1, -1.5], [5, 1.1, 0]], color: [255, 100, 100]},
        {verts: [[5, -1, -0.05], [7.5, 1, -0.05], [5, -1, 0.05]], color: [255, 100, 100]},
        {verts: [[5, -1, 0.05], [7.5, 1, -0.05], [7.5, 1, 0.05]], color: [255, 100, 100]},
        {verts: [[5, 1.1, 0], [5, 1, 0], [8, 1, 1.5]], color: [255, 100, 100]},
        {verts: [[5, 1.1, 0], [8, 1, 1.5], [8, 1.1, 1.5]], color: [255, 100, 100]},
        {verts: [[5, 1, 0], [5, 1.1, 0], [8, 1, -1.5]], color: [255, 100, 100]},
        {verts: [[8, 1, -1.5], [5, 1.1, 0], [8, 1.1, -1.5]], color: [255, 100, 100]},
        {verts: [[8, 1, 1.5], [7.5, 1, 0], [7.5, 1.1, 0]], color: [255, 100, 100]},
        {verts: [[8, 1.1, 1.5], [8, 1, 1.5], [7.5, 1.1, 0]], color: [255, 100, 100]},
        {verts: [[8, 1, -1.5], [8, 1.1, -1.5], [7.5, 1, 0]], color: [255, 100, 100]},
        {verts: [[8, 1.1, -1.5], [7.5, 1.1, 0], [7.5, 1, 0]], color: [255, 100, 100]},
        {verts: [[5, 1, -1], [5, 1, 1], [7.5, 1, 0.05]], color: [255, 100, 100]},
        {verts: [[7.5, 1, 0.05], [7.5, 1, -0.05], [5, 1, -1]], color: [255, 100, 100]},
        {verts: [[4, 0, 0], [0, 0.4, 0], [3.5, 0, 7]], color: [255, 100, 100]},
        {verts: [[0, 0.2, 0], [4, -0.2, 0], [3.5, -0.2, 7]], color: [255, 100, 100]},
        {verts: [[3.5, -0.2, 7], [0, 0.4, 0], [0, 0, 0]], color: [255, 100, 100]},
        {verts: [[3.5, -0.2, 7], [3.5, 0, 7], [0, 0.4, 0]], color: [255, 100, 100]},
        {verts: [[4, -0.2, 0], [4, 0, 0], [3.5, 0, 7]], color: [255, 100, 100]},
        {verts: [[4, -0.2, 0], [3.5, 0, 7], [3.5, -0.2, 7]], color: [255, 100, 100]},
        {verts: [[4, 0, 0], [3.5, 0, -7], [0, 0.4, 0]], color: [255, 100, 100]},
        {verts: [[0, 0.2, 0], [3.5, -0.2, -7], [4, -0.2, 0]], color: [255, 100, 100]},
        {verts: [[3.5, -0.2, -7], [0, 0, 0], [0, 0.4, 0]], color: [255, 100, 100]},
        {verts: [[3.5, -0.2, -7], [0, 0.4, 0], [3.5, 0, -7]], color: [255, 100, 100]},
        {verts: [[4, -0.2, 0], [3.5, 0, -7], [4, 0, 0]], color: [255, 100, 100]},
        {verts: [[4, -0.2, 0], [3.5, -0.2, -7], [3.5, 0, -7]], color: [255, 100, 100]}
    ];

    // Move each vertex
    const tris = [];
    for (let i = 0; i < planeTris.length; i++) {
        // Rotate plane model 90 degrees yaw to point forward
        const fixedYaw = (yaw + Math.PI / 2);

        // add a translate function here to change the center of roatation

        let v0 = planeTris[i].verts[0];
        let v1 = planeTris[i].verts[1];
        let v2 = planeTris[i].verts[2];

        v0 = rotate(v0, fixedYaw, roll, pitch);
        v1 = rotate(v1, fixedYaw, roll, pitch);
        v2 = rotate(v2, fixedYaw, roll, pitch);

        v0 = translate(v0, [x, y, z]);
        v1 = translate(v1, [x, y, z]);
        v2 = translate(v2, [x, y, z]);

        tris.push({ verts: [v0, v1, v2], color: planeTris[i].color, plane: true });
    }
    return tris;
}