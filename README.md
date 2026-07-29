# Flight-Simulator
A flight simulator using the 3D engine and terrain generator I built

# TODO
- I changed terrain again so readjust coloring and also do it with plants
- Instead of 50/50 water land make it more like 30/70
- Water is boring, add islands
- Land is boring, and lakes and ponds
- Weird rotaion bug idk
- (FIX) better align foliage render distance with land render distance
- Add LOD so farther away land doesnt steal so much computer powah (if still lagging)
- Add motion blur so low framerate (ie on chromebook or raspberry pi 5 (my only two computers)) doesnt look as bad
- screen tearing (I don't think it is a vsnyc issue because it happens at really low fps)
- Make a it a flight sim with plane phisics and such

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
