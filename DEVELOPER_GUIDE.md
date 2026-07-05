# Developer Quick Start Guide

## File Organization

```
Flight-Simulator/
├── engine.js           # Main game loop and initialization
└── src
    ├── math.js             # Vector and matrix utilities
    ├── rendering.js        # WebGL rendering system
    ├── input.js            # Keyboard input handling
    ├── physics.js          # Player movement and collision
    ├── noise.js            # Procedural generation (Perlin/Simplex noise)
    ├── world.js            # Terrain and world chunk generation
    ├── ocean.js            # Ocean surface generation and animation
    ├── index.html          # HTML entry point
    └── MODULE_STRUCTURE.md # Detailed module documentation
```


## Key Concepts

### Player Object Structure
```javascript
player = {
  pos: [x, y, z],        // World position (feet)
  vel: [vx, vy, vz],     // Velocity
  yaw: angle,            // Rotation around Y (horizontal)
  pitch: angle,          // Rotation around X (vertical)
  roll: angle,           // Rotation around Z (camera roll)
  fov: radians,          // Field of view
  isGrounded: bool,      // On ground?
  jumpPower: float       // Jump accumulation
}
```

### Biomes
- **Desert**: Low vegetation, cacti, sandy color
- **Plains**: Oak trees, green grass
- **Snowy Plains**: Evergreen trees, snow-white color
- **Mountains**: Tall evergreens, rocky peaks

### Chunk System
- Chunks are generated on-demand around the player
- `CHUNK_SIZE = 16` - Grid points per chunk
- `RENDER_DIST = 3` - Number of chunks to render in each direction
- Total rendered chunks: ~7x7 = 49 chunks

### Noise System
Uses Simplex Noise (faster, better quality than Perlin):
- 2D noise for terrain height and biome selection
- 4D noise for animated ocean waves
- Seeded with `worldSeed` for reproducible worlds

## Controls Reference

| Key | Action |
|-----|--------|
| W/A/S/D | Move |
| Arrow Keys | Look around |
| Q/E | Roll camera |
| Space | Jump |
| Shift | Sprint (6x speed) |
| R | Reset position |
| G | Generate new world |

## Performance Tips

- **Reduce RENDER_DIST** for better FPS on slower machines
- **Reduce CHUNK_SIZE** for less detailed but faster terrain
- **Lower amplitude in ocean.js** for simpler water
- **Reduce noise octaves** in noise.js for faster generation

## Testing Individual Modules

Each module can be tested independently:

```javascript
// Test math
import { vec3 } from './math.js';
console.log(vec3.add([1,2,3], [4,5,6]));  // [5,7,9]

// Test noise
import { perlinNoise } from './noise.js';
console.log(perlinNoise(100, 100, 42));  // Random value ~[-1, 1]

// Test world generation
import { generateWorld, rebuildSceneTriangles } from './world.js';
generateWorld(12345);
const triangles = rebuildSceneTriangles(0, 0);
console.log(triangles.length);  // Number of triangles in view
```

## Next Steps

1. **Performance Optimization**: Profile with DevTools, optimize slow sections
2. **Graphics Enhancement**: Add better shaders, lighting, textures
3. **Content Expansion**: Add more biomes, creatures, weather effects
4. **Gameplay Features**: Add inventory, crafting, NPCs, quests
5. **Multiplayer**: Add networking for multiplayer support
