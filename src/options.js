// Options for performance and graphics quality. Adjust these to your liking. I will add a settings menu in the future.

export const resolutionScale = 1;
export const chunkResolution = 2; // terrain samples per chunk
export const RENDER_DIST = 20; // in chunks (radius)
export const vegetationRenderDist = 5; // in chunks (radius)
export const cameraSmoothingFactor = 0.3; // smoothing factor for camera movement (0 = no movement, 1 = instant movement)

// Testing terrain generation
export const vegetation = true; // render vegetation
export const water = true; // render water
export const color = true; // render color

// Default player options
export const playerOptions = {
  thirdPersonCamera: true,
};