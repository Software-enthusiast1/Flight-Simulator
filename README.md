# Flight-Simulator
A flight simulator using the 3D engine and terrain generator I built

# TODO
- world.js line 7 what is that chunk res

- Foliage be looking weird

- it needs more render distance, figure out ways to optimise
    - Add level of detail
    - cull tris behind screen(?)


- Add a large valley system and mountain system onto the map
- add arches and bridges and overhangs and cliffs

- Instead of 50/50 water land make it more like 30/70

- Water is boring, add islands
- Land is boring, and lakes and ponds

- readjust coloring of terrain
- make colors more natural (maybe gradients or textures)

- Weird rotaion bug idk
- also forward vector breaks when you do a 360

- (FIX) better align foliage render distance with land render distance
- Add motion blur so low framerate (ie on chromebook or raspberry pi 5 (my only two computers)) doesnt look as bad
- screen tearing (I don't think it is a vsnyc issue because it happens at really low fps)

- Make a it a flight sim with plane phisics and such
    - ground effect
    - ridge turbulance
    - stall
- Visual effects
    - biome effects like snow
    - Plane go boom? (crash boom based off of speed)
    - visual wake in water and sand
    - Wind in foliage
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

# Next Steps
1. **Performance Optimization**: Profile with DevTools, optimize slow sections
2. **Graphics Enhancement**: Add better shaders, lighting, textures
3. **Content Expansion**: Add more biomes, creatures, weather effects
4. **Gameplay Features**: Add inventory, crafting, NPCs, quests
5. **Multiplayer**: Add networking for multiplayer support
