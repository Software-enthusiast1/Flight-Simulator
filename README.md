# Flight-Simulator
A flight simulator using the 3D engine and terrain generator I built

# TODO
Quick side note low amp will be for the rockyness or smoothness of terrain

- for LOD, first 5 chunk radius will have chunk res of 4, and next 10 will have 2, and the rest 1
- for LOD, water must be above 1 chunk res, so it will probably be at 2 for first 5 and the rest 1
- vegetation is the main problem with lag. make a vegetation render distance (not working because chunks need to all be reloaded every time new chunks are loaded) (also still very laggy with only a 5 render distance)

- make cockpit window opaque
- fix anoyance where camera smoothing or somthing creates an ocolating effect

- Add a large valley system and mountain system onto the map
- add arches and bridges and overhangs and cliffs (very hard)
- Water is boring, add islands
- Land is boring, and lakes and ponds
- readjust coloring of terrain
- terrain coloring gradients

- Add motion blur so low framerate (ie on chromebook or raspberry pi 5 (my only two computers)) doesnt look as bad

- Make a it a flight sim with plane phisics and such
    - ground effect
    - ridge turbulance
    - stall
- Visual effects
    - fog (to make chunks not just jump in)
    - clouds
    - biome effects like snow
    - Plane go boom? (crash boom based off of speed)
    - visual wake in water and sand
    - Wind in vegetation
    - folage moves when you fly by fast
    - high speed effects (more fov, wind particles, shake)
    - birb?
    - stunt points?
- Audio effects

# File Organization

```
Flight-Simulator/
├── engine.js           # Main game loop and initialization
├── index.html          # HTML entry point
├── src
    ├── options.js          # Graphics and performance options
    ├── math.js             # Vector and matrix utilities
    ├── rendering.js        # WebGL rendering system
    ├── input.js            # Keyboard input handling
    ├── physics.js          # Player movement and collision
    ├── noise.js            # Procedural generation (Perlin/Simplex noise)
    ├── world.js            # Terrain and world chunk generation
    └── ocean.js            # Ocean surface generation and animation
└── noTerrain          # Directory for making models or testing webGL buffers
    ├── index.html          # HTML entry point
    └── noTerrainEngine.js  # Single-file 3D renderer for making models or testing webGL buffers
```

# What ive learned so far (for college aplications)
- Using ai not to vibe code but as a tool
- Getting better at js and coding in general
- Bug fixing
- Git, github
- Vim text editor
- repo organizeation
- Terrain generation (smooth noise functions)
- Game design

# Next Steps
1. **Performance Optimization**: Profile with DevTools, optimize slow sections
2. **Graphics Enhancement**: Add better shaders, lighting, textures
3. **Content Expansion**: Add more biomes, creatures, weather effects
4. **Gameplay Features**: Add inventory, crafting, NPCs, quests
5. **Multiplayer**: Add networking for multiplayer support
