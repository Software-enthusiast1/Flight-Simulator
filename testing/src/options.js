// Options for performance and graphics quality. Adjust these to your liking. I will add a settings menu in the future.

export const resolutionScale = 1;
export const chunkResolution = 4; // terrain samples per chunk
export const RENDER_DIST = 5; // in chunks (radius)
export const thirdPersonCamera = true; // toggle 3rd person camera
export const cameraSmoothingFactor = 0.3; // smoothing factor for camera movement (0 = no movement, 1 = instant movement)

// Testing terrain generation
export const foliage = false; // render foliage
export const water = true; // render water
export const color = false; // render color
export const lowAmp = true; // toggle lower amplitude of terrain generation
