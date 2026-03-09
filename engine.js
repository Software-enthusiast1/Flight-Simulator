// engine.js — All engine code lives in this file
import SimplexNoise from 'https://cdn.jsdelivr.net/npm/simplex-noise@3.0.0/+esm';

(function(){
  const canvas = document.getElementById('screen');
  const gl = canvas.getContext('webgl');
  if (!gl) { alert('WebGL not supported'); return; }

  function resize(){
    canvas.width = window.innerWidth * devicePixelRatio;
    canvas.height = window.innerHeight * devicePixelRatio;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
    // WebGL setup: enable depth buffer
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clearDepth(1.0);
    // WebGL shader setup
    const vertexShaderSource = `
      attribute vec3 aPosition;
      attribute vec3 aColor;
      attribute vec3 aNormal;
      varying vec3 vColor;
      varying vec3 vNormal;
      uniform mat4 uProjection;
      uniform mat4 uView;
      void main() {
        gl_Position = uProjection * uView * vec4(aPosition, 1.0);
        vColor = aColor;
        vNormal = aNormal;
      }
    `;
    const fragmentShaderSource = `
      precision mediump float;
      varying vec3 vColor;
      varying vec3 vNormal;
      void main() {
        vec3 lightDir = normalize(vec3(0.5, 0.8, 0.3));
        float diff = max(dot(normalize(vNormal), lightDir), 0.2);
        gl_FragColor = vec4(vColor * diff, 1.0);
      }
    `;
    function createShader(gl, type, source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader));
      }
      return shader;
    }
    function createProgram(gl, vsSource, fsSource) {
      const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
      const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
      const program = gl.createProgram();
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program));
      }
      return program;
    }
    const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);
    gl.useProgram(program);
    // WebGL draw triangles
    function drawTriangles(triangles, projection, view) {
      const positions = [];
      const colors = [];
      const normals = [];
      for (const tri of triangles) {
        // Calculate face normal
        const e1 = [
          tri.verts[1][0] - tri.verts[0][0],
          tri.verts[1][1] - tri.verts[0][1],
          tri.verts[1][2] - tri.verts[0][2]
        ];
        const e2 = [
          tri.verts[2][0] - tri.verts[0][0],
          tri.verts[2][1] - tri.verts[0][1],
          tri.verts[2][2] - tri.verts[0][2]
        ];
        const n = vec3.norm(vec3.cross(e1, e2));
        for (let i = 0; i < 3; ++i) {
          positions.push(...tri.verts[i]);
          colors.push(...tri.color.map(c => c / 255));
          normals.push(...n);
        }
      }
      // Create buffers
      const posBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
      const colBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, colBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
      const normBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, normBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
      // Set attributes
      const aPosition = gl.getAttribLocation(program, 'aPosition');
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
      gl.enableVertexAttribArray(aPosition);
      gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
      const aColor = gl.getAttribLocation(program, 'aColor');
      gl.bindBuffer(gl.ARRAY_BUFFER, colBuffer);
      gl.enableVertexAttribArray(aColor);
      gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 0, 0);
      const aNormal = gl.getAttribLocation(program, 'aNormal');
      gl.bindBuffer(gl.ARRAY_BUFFER, normBuffer);
      gl.enableVertexAttribArray(aNormal);
      gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 0, 0);
      // Set uniforms
      const uProjection = gl.getUniformLocation(program, 'uProjection');
      const uView = gl.getUniformLocation(program, 'uView');
      gl.uniformMatrix4fv(uProjection, false, projection);
      gl.uniformMatrix4fv(uView, false, view);
      // Draw
      gl.drawArrays(gl.TRIANGLES, 0, positions.length / 3);
      // Cleanup
      gl.disableVertexAttribArray(aPosition);
      gl.disableVertexAttribArray(aColor);
      gl.disableVertexAttribArray(aNormal);
      gl.deleteBuffer(posBuffer);
      gl.deleteBuffer(colBuffer);
      gl.deleteBuffer(normBuffer);
    }
  window.addEventListener('resize', resize);
  resize();

  

  // Simple vector/matrix helpers
  const vec3 = {
    add: (a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],
    sub: (a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],
    mul: (a,s)=>[a[0]*s,a[1]*s,a[2]*s],
    dot: (a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],
    cross: (a,b)=>[a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]],
    norm: a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return [a[0]/l,a[1]/l,a[2]/l]},
    len: a=>Math.hypot(a[0],a[1],a[2])
  };

  // Player physics
  const player = {
    pos: [0, 2, 5], // world position (feet)
    vel: [0, 0, 0], // velocity
    yaw: 0, // rotation around Y
    pitch: 0, // rotation around X
    roll: 0, // rotation around Z (roll)
    fov: 75 * Math.PI/180,
    radius: 0.3, // collision radius
    height: 1.8, // player height
    eyeHeight: 1.6, // eye position above feet
    isGrounded: false,
    jumpPower: 0, // accumulate jump force
  };

  // Physics constants
  const GRAVITY = -19.8;
  const MOVE_SPEED = 6.0; // units/sec
  const JUMP_FORCE = 6.5; // units/sec
  const FRICTION = 0.99; // per frame
  const GROUND_FRICTION = 0.95;
  const RENDER_DISTANCE = 500; // units
  const CHUNK_REGEN_DIST = 30; // regen chunks when player is this far from center

  function resetCamera(){ 
    player.pos = [0, 2, 5]; 
    player.vel = [0, 0, 0];
    player.yaw = 0; 
    player.pitch = 0;
    player.roll = 0;
    player.isGrounded = false;
  }

  // Get camera pos (eyes) from player feet pos
  function getCameraPos(){
    return [player.pos[0], player.pos[1] + player.eyeHeight, player.pos[2]];
  }

  // Ray-cast down from pos to find ground height
  function getTerrainHeightAt(x, z){
    // Simple heightfield lookup using scene triangles with barycentric interpolation
    let maxY = -100;
    
    for(const tri of sceneTriangles){
      const v0 = tri.verts[0], v1 = tri.verts[1], v2 = tri.verts[2];
      
      // bounding box check (early exit)
      const minX = Math.min(v0[0], v1[0], v2[0]);
      const maxX = Math.max(v0[0], v1[0], v2[0]);
      const minZ = Math.min(v0[2], v1[2], v2[2]);
      const maxZ = Math.max(v0[2], v1[2], v2[2]);
      
      if(x >= minX && x <= maxX && z >= minZ && z <= maxZ){
        // Barycentric coordinates for point in triangle
        const denom = ((v1[2]-v2[2])*(v0[0]-v2[0]) + (v2[0]-v1[0])*(v0[2]-v2[2]));
        if(Math.abs(denom) < 0.0001) continue; // degenerate triangle
        
        const a = ((v1[2]-v2[2])*(x-v2[0]) + (v2[0]-v1[0])*(z-v2[2])) / denom;
        const b = ((v2[2]-v0[2])*(x-v2[0]) + (v0[0]-v2[0])*(z-v2[2])) / denom;
        const c = 1 - a - b;
        
        // if point is inside triangle
        if(a >= -0.01 && b >= -0.01 && c >= -0.01){
          const h = a * v0[1] + b * v1[1] + c * v2[1];
          maxY = Math.max(maxY, h);
        }
      }
    }
    return maxY;
  }

  // Keyboard state
  const keys = {};
  window.addEventListener('keydown', e=>{ 
    keys[e.key.toLowerCase()] = true; 
    if(e.key==='r' || e.key==='R'){ resetCamera(); } 
    if(e.key===' ' && player.isGrounded){ player.jumpPower = JUMP_FORCE; }
  });
  window.addEventListener('keyup', e=>{ keys[e.key.toLowerCase()] = false; });

  // regenerate world with G
  window.addEventListener('keydown', e=>{
    if(e.key==='g' || e.key==='G'){
      generateWorld((Date.now() + Math.floor(Math.random()*100000)) % 2147483647);
    }
  });

  function updatePlayer(dt){
    let moveSpeed = MOVE_SPEED;
    // Increase speed when shift is held
    if(keys['shift']) moveSpeed *= 6.0;
    
    const rotSpeed = 3.0; // radians / second for arrow keys
    
    // rotation from arrow keys
    if(keys['arrowleft']) player.yaw -= rotSpeed * dt;
    if(keys['arrowright']) player.yaw += rotSpeed * dt;
    if(keys['arrowup']) player.pitch = Math.max(-Math.PI/2+0.01, player.pitch - rotSpeed * dt);
    if(keys['arrowdown']) player.pitch = Math.min(Math.PI/2-0.01, player.pitch + rotSpeed * dt);
    // roll with Q/E
    if(keys['q']) player.roll -= rotSpeed * dt;
    if(keys['e']) player.roll += rotSpeed * dt;

    // movement direction based on yaw rotation (W/S forward/backward, A/D strafe left/right)
    // Use proper trigonometry: forward is the direction player yaw points to
    const yaw = player.yaw;
    const forward = [Math.sin(0-yaw), 0, Math.cos(0-yaw)]; // forward direction in world space
    const right = [Math.sin((0-yaw) - Math.PI/2), 0, Math.cos((0-yaw) - Math.PI/2)]; // right direction (perpendicular to forward)
    
    let moveDir = [0, 0, 0];
    
    if(keys['w']) moveDir = vec3.add(moveDir, forward);
    if(keys['s']) moveDir = vec3.sub(moveDir, forward);
    if(keys['a']) moveDir = vec3.sub(moveDir, right);
    if(keys['d']) moveDir = vec3.add(moveDir, right);

    // normalize and apply move speed
    if(moveDir[0]||moveDir[1]||moveDir[2]){
      moveDir = vec3.norm(moveDir);
      moveDir = vec3.mul(moveDir, moveSpeed);
    }

    // apply movement to velocity (horizontal only)
    player.vel[0] = moveDir[0];
    player.vel[2] = moveDir[2];

    // apply gravity
    player.vel[1] += GRAVITY * dt;
    player.vel[1] = Math.max(player.vel[1], -50); // terminal velocity

    // apply jump
    if(player.jumpPower > 0){
      player.vel[1] += player.jumpPower;
      player.jumpPower = 0;
      player.isGrounded = false;
    }

    // apply friction when grounded
    if(player.isGrounded){
      player.vel[0] *= GROUND_FRICTION;
      player.vel[2] *= GROUND_FRICTION;
    } else {
      player.vel[0] *= FRICTION;
      player.vel[2] *= FRICTION;
    }

    // update position
    const newPos = vec3.add(player.pos, vec3.mul(player.vel, dt));

    // collision and grounding
    const groundHeight = getTerrainHeightAt(newPos[0], newPos[2]);
    const feetHeight = newPos[1];
    const headHeight = newPos[1] + player.height;

    if(feetHeight <= groundHeight){
      // on ground
      newPos[1] = groundHeight;
      player.vel[1] = 0;
      player.isGrounded = true;
    } else {
      player.isGrounded = false;
    }

    player.pos = newPos;
    
    // Check if we need to regenerate chunks
    const playerChunkX = Math.floor(player.pos[0] / (CHUNK_SIZE * CHUNK_SPACING));
    const playerChunkZ = Math.floor(player.pos[2] / (CHUNK_SIZE * CHUNK_SPACING));
    if(Math.abs(playerChunkX - lastPlayerChunkX) > 0 || Math.abs(playerChunkZ - lastPlayerChunkZ) > 0){
      lastPlayerChunkX = playerChunkX;
      lastPlayerChunkZ = playerChunkZ;
      rebuildSceneTriangles(worldSeed);
    }
  }

  // Simple seeded PRNG (mulberry32)
  function mulberry32(a){
    return function(){
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
  }

  // Transform a point by camera (view) matrix: rotate then translate
  function worldToCamera(v){
    // translate relative to camera (eye position)
    const eyePos = getCameraPos();
    const p = vec3.sub(v, eyePos);
    // apply yaw then pitch (order: yaw around Y, pitch around X)
    const cy = Math.cos(-player.yaw), sy = Math.sin(-player.yaw);
    const cx = Math.cos(-player.pitch), sx = Math.sin(-player.pitch);
    // yaw
    let x = p[0]*cy - p[2]*sy;
    let z = p[0]*sy + p[2]*cy;
    let y = p[1];
    // pitch
    let y2 = y*cx - z*sx;
    let z2 = y*sx + z*cx;
    // roll (rotate around camera Z axis)
    const cr = Math.cos(-player.roll), sr = Math.sin(-player.roll);
    let x2 = x * cr - y2 * sr;
    let y3 = x * sr + y2 * cr;
    return [x2, y3, z2];
  }

  // Build scene triangles array
  let sceneTriangles = [];

  function hslToRgb(h,s,l){
    // h in [0,1]
    let r,g,b;
    if(s===0){ r=g=b=l; }
    else{
      const hue2rgb = (p,q,t)=>{
        if(t<0) t+=1; if(t>1) t-=1;
        if(t<1/6) return p + (q-p)*6*t;
        if(t<1/2) return q;
        if(t<2/3) return p + (q-p)*(2/3 - t)*6;
        return p;
      };
      const q = l < 0.5 ? l*(1+s) : l + s - l*s;
      const p = 2*l - q;
      r = hue2rgb(p,q,h + 1/3);
      g = hue2rgb(p,q,h);
      b = hue2rgb(p,q,h - 1/3);
    }
    return [Math.round(r*255), Math.round(g*255), Math.round(b*255)];
  }

  // Replace previous perlin-like implementation with seeded simplex-noise fBm
  const _simplexCache = new Map();
  function getSimplex(seed){
    const key = seed|0;
    if(_simplexCache.has(key)) return _simplexCache.get(key);
    const rnd = mulberry32(key);
    const rndFn = () => rnd();
    const inst = new SimplexNoise(rndFn);
    _simplexCache.set(key, inst);
    return inst;
  }

  // Keep the function name `perlinNoise` so existing calls remain unchanged.
  // This uses fractal Brownian motion (fBm) over simplex noise and returns in approx [-1,1].
  function perlinNoise(x, z, seed){
    const inst = getSimplex(seed || 0);
    let value = 0;
    let amplitude = 3.0;
    let frequency = 0.025; // base frequency (tweak for visible scale)
    const octaves = 1;
    const lacunarity = 2.0;
    const gain = 0.5;
    let ampSum = 0;
    for(let i=0;i<octaves;i++){
      value += inst.noise2D(x * frequency, z * frequency) * amplitude;
      ampSum += amplitude;
      amplitude *= gain;
      frequency *= lacunarity;
    }
    return value / ampSum;
  }

  // Chunk-based world generation for infinite terrain
  const CHUNK_SIZE = 16;
  const CHUNK_SPACING = 1.0; // must be 1.0 for chunks to align perfectly
  const worldChunks = new Map(); // key: "x,z", value: {tris}
  let worldSeed = 0;
  let lastPlayerChunkX = 0, lastPlayerChunkZ = 0;
  
  function getChunkKey(chunkX, chunkZ){
    return `${chunkX},${chunkZ}`;
  }

  function generateChunk(chunkX, chunkZ){
    const key = getChunkKey(chunkX, chunkZ);
    if(worldChunks.has(key)) return worldChunks.get(key);

    const seed = worldSeed ^ (chunkX * 73856093) ^ (chunkZ * 19349663);
    const rnd = mulberry32(seed|0);
    const tris = [];
    const spacing = CHUNK_SPACING;
    
    // World position of chunk corner
    const offsetX = chunkX * CHUNK_SIZE * spacing;
    const offsetZ = chunkZ * CHUNK_SIZE * spacing;
    
    // Get biome value (without discrete boundaries) for smooth transitions
    // Adjusted weights and frequencies to favor snowy patches and reduce desert coverage.
    const getBiomeValue = (x, z) => {
      const low = perlinNoise(x * 0.0055, z * 0.0055, worldSeed) * 0.8; // very large-scale
      const mid = perlinNoise(x * 0.035, z * 0.035, worldSeed + 1) * 0.45; // medium
      const high = perlinNoise(x * 0.28, z * 0.28, worldSeed + 2) * 1.05; // high-frequency favors snow
      const biomeVal = (low * 0.6 + mid * 0.4 + high * 1.3) / (0.6 + 0.4 + 1.3);
      return biomeVal; // roughly in [-1,1]
    };
    
    // Get discrete biome from continuous biome value
    const getBiome = (x, z) => {
      const biomeVal = getBiomeValue(x, z);
      if(biomeVal < -0.45) return 'ocean';
      if(biomeVal < -0.3) return 'lake';
      // Narrow desert band to reduce desert coverage
      if(biomeVal < -0.1) return 'desert';
      if(biomeVal < 0.50) return 'plains';
      if(biomeVal < 0.6) return 'snowy_plains';
      return 'mountains';
    };
    
    // Use perlin-like noise for better terrain with peaks
    const heightAt = (x,z)=>{
      // Start with multiple octaves of Perlin noise for smooth base
      let h = perlinNoise(x, z, worldSeed) * 5.0; 
      h += perlinNoise(x * 4, z * 4, worldSeed + 1) * 0.4;
      
      // Get biome value for smooth blending between biome heights
      const biomeVal = getBiomeValue(x, z);
      const biome = getBiome(x, z);
      
      // Apply smooth blending based on biome value instead of hard transitions
      // This prevents jagged borders by using the continuous biome noise
      const t = (biomeVal + 0.6) / 1.1; // Normalize biome value to 0-1 range
      const smoothT = Math.max(0, Math.min(1, t)); // Clamp to 0-1
      
      // Blend heights based on smooth biome transition
        // helper smoothstep and mix to reduce abrupt jumps at biome boundaries
        const smoothstep = (a, b, t) => {
          const x = Math.max(0, Math.min(1, (t - a) / (b - a)));
          return x * x * (3 - 2 * x);
        };
        const mix = (a, b, t) => a * (1 - t) + b * t;

        if(biomeVal < -0.15){
          // Ocean <-> Lake transition: use smooth interpolation instead of piecewise branches
          const t = smoothstep(-0.6, -0.2, biomeVal);
          const oceanH = h * 0.3 - 2.0;
          const lakeH = h * 0.2 - 0.5;
          h = mix(oceanH, lakeH, t);
        } else if(biomeVal < 0.05){
        // Lake/Desert transition
        const blend = (biomeVal + 0.15) / 0.2;
        if(blend < 0) h = h * 0.2 - 0.5;
        else if(blend > 1) h = Math.abs(h) * 0.5 + 0.2;
        else {
          const h1 = h * 0.2 - 0.5;
          const h2 = Math.abs(h) * 0.5 + 0.2;
          h = h1 * (1-blend) + h2 * blend;
        }
      } else if(biomeVal < 0.3){
        // Desert/Plains transition
        const blend = (biomeVal - 0.05) / 0.25;
        if(blend < 0) h = Math.abs(h) * 0.5 + 0.2;
        else if(blend > 1) h = h * 0.3 + 0.2;
        else {
          const h1 = Math.abs(h) * 0.5 + 0.2;
          const h2 = h * 0.3 + 0.2;
          h = h1 * (1-blend) + h2 * blend;
        }
      } else if(biomeVal < 0.5){
        // Plains/Snowy transition
        const blend = (biomeVal - 0.3) / 0.2;
        if(blend < 0) h = h * 0.3 + 0.2;
        else if(blend > 1) h = h * 0.5 + 1.0;
        else {
          const h1 = h * 0.3 + 0.2;
          const h2 = h * 0.5 + 1.0;
          h = h1 * (1-blend) + h2 * blend;
        }
      } else {
        // Snowy/Mountains transition and pure mountains
        const blend = (biomeVal - 0.5) / 0.3;
        let h2 = h * 0.5 + 1.0;
        
        // Add peaks only in mountain regions
        if(blend > 0){
          for(let octave = 0; octave < 3; octave++){
            const freq = 0.003 * Math.pow(2, octave);
            const amp = 1.0 / Math.pow(2, octave);
            
            const seedRnd = mulberry32((worldSeed + octave * 12345) | 0);
            const offsetX_rnd = seedRnd() * Math.PI * 2;
            const offsetZ_rnd = seedRnd() * Math.PI * 2;
            
            const peakVal = Math.sin(x * freq + offsetX_rnd) * Math.cos(z * freq + offsetZ_rnd);
            
            if(peakVal > 0.2){
              const peakSpacing = 1.0 / freq;
              const peakCenterX = Math.round(x / peakSpacing) * peakSpacing;
              const peakCenterZ = Math.round(z / peakSpacing) * peakSpacing;
              const distToPeak = Math.hypot(x - peakCenterX, z - peakCenterZ);
              
              const peakRadius = peakSpacing * 0.35;
              const falloff = Math.max(0, 1 - (distToPeak / peakRadius));
              
              h2 += falloff * falloff * falloff * peakVal * amp * 8.0 * Math.max(0, blend);
            }
          }
        }
        
        if(blend < 0) h = h * 0.5 + 1.0;
        else if(blend > 1) h = h2;
        else h = (h * 0.5 + 1.0) * (1-blend) + h2 * blend;
      }

      // Reduce water amplitude for oceans/lakes so they are flatter but still gentle hills
      // Use continuous biomeVal blending instead of discrete biome classification
      const waterT = smoothstep(-0.6, -0.2, biomeVal);
      if(biomeVal < -0.25){
        const oceanH = h * 1.0 - 2.2; // lower sea level and reduced amplitude
        const lakeH = h * 1.6 - 0.6;  // shallower lakes
        return mix(oceanH, lakeH, waterT);
      }

      return h * 3.5;
    };
    
    // Function to check if a point is at a peak (for coloring)
    const isAtPeak = (x, z) => {
      const biome = getBiome(x, z);
      if(biome !== 'mountains') return false;
      
      for(let octave = 0; octave < 3; octave++){
        const freq = 0.003 * Math.pow(2, octave);
        const seedRnd = mulberry32((worldSeed + octave * 12345) | 0);
        const offsetX_rnd = seedRnd() * Math.PI * 2;
        const offsetZ_rnd = seedRnd() * Math.PI * 2;
        
        const peakVal = Math.sin(x * freq + offsetX_rnd) * Math.cos(z * freq + offsetZ_rnd);
        
        if(peakVal > 0.4){
          const peakSpacing = 1.0 / freq;
          const peakCenterX = Math.round(x / peakSpacing) * peakSpacing;
          const peakCenterZ = Math.round(z / peakSpacing) * peakSpacing;
          const distToPeak = Math.hypot(x - peakCenterX, z - peakCenterZ);
          const peakRadius = peakSpacing * 0.15;
          
          if(distToPeak < peakRadius) return true;
        }
      }
      return false;
    };

    // generate a padded terrain grid (one extra row/col on each side) to allow smoothing across chunk borders
    const PAD = 1;
    const gridSize = CHUNK_SIZE + 1; // original grid points per chunk (0..CHUNK_SIZE)
    const padSize = gridSize + PAD*2; // padded grid size
    const padded = new Array(padSize * padSize);

    for(let ix = 0; ix < padSize; ix++){
      for(let iz = 0; iz < padSize; iz++){
        const worldX = offsetX + (ix - PAD) * spacing;
        const worldZ = offsetZ + (iz - PAD) * spacing;
        const h = heightAt(worldX, worldZ);
        padded[ix * padSize + iz] = { x: worldX, z: worldZ, h };
      }
    }

    // apply a simple 3x3 smoothing kernel (weighted) to reduce abrupt jumps
    const smoothIterations = 1;
    const kernel = [
      [1,2,1],
      [2,4,2],
      [1,2,1]
    ];
    const kernelSum = 16;

    for(let it = 0; it < smoothIterations; it++){
      const next = new Array(padded.length);
      for(let ix = 0; ix < padSize; ix++){
        for(let iz = 0; iz < padSize; iz++){
          let acc = 0;
          let sum = 0;
          for(let kx = -1; kx <= 1; kx++){
            for(let kz = -1; kz <= 1; kz++){
              const sx = ix + kx;
              const sz = iz + kz;
              if(sx < 0 || sx >= padSize || sz < 0 || sz >= padSize) continue;
              const w = kernel[kx+1][kz+1];
              acc += padded[sx*padSize + sz].h * w;
              sum += w;
            }
          }
          next[ix*padSize + iz] = { x: padded[ix*padSize + iz].x, z: padded[ix*padSize + iz].z, h: acc / sum };
        }
      }
      for(let i=0;i<padded.length;i++) padded[i] = next[i];
    }

    // build terrain triangles from the inner grid (excluding padding)
    const heights = [];
    for(let ix = 0; ix < gridSize; ix++){
      for(let iz = 0; iz < gridSize; iz++){
        const p = padded[(ix + PAD) * padSize + (iz + PAD)];
        heights.push({ x: p.x, z: p.z, h: p.h, ix, iz });
      }
    }

    // color helper (kept from previous implementation)
    const colorByBiome = (h, x, z) => {
      const biome = getBiome(x, z);
      const atPeak = isAtPeak(x, z);
      if(biome === 'ocean') return hslToRgb(0.6, 0.9, 0.4);
      if(biome === 'lake') return hslToRgb(0.58, 0.85, 0.5);
      if(biome === 'desert') return h < -0.2 ? hslToRgb(0.13, 0.9, 0.55) : hslToRgb(0.12, 0.95, 0.52);
      if(biome === 'plains') return h < 0.3 ? hslToRgb(0.28, 0.85, 0.48) : hslToRgb(0.25, 0.8, 0.42);
      if(biome === 'snowy_plains'){
        if(h < 0.6) return hslToRgb(0.2, 0.7, 0.65);
        if(h < 1.0) return hslToRgb(0,0,0.85);
        return hslToRgb(0,0,0.9);
      }
      if(biome === 'mountains'){
        if(atPeak) return hslToRgb(0,0,0.95);
        if(h > 2.5) return hslToRgb(0,0,0.7);
        if(h > 2.0) return hslToRgb(0,0,0.65);
        if(h > 1.5) return hslToRgb(0,0,0.55);
        return hslToRgb(0.08,0.6,0.5);
      }
      return hslToRgb(0,0,0.5);
    };

    for(let ix = 0; ix < CHUNK_SIZE; ix++){
      for(let iz = 0; iz < CHUNK_SIZE; iz++){
        const idx = ix * (CHUNK_SIZE + 1) + iz;
        const i1 = idx;
        const i2 = idx + 1;
        const i3 = idx + (CHUNK_SIZE + 1);
        const i4 = idx + (CHUNK_SIZE + 1) + 1;

        const h00 = heights[i1].h;
        const h10 = heights[i2].h;
        const h01 = heights[i3].h;
        const h11 = heights[i4].h;

        const v00 = [heights[i1].x, h00, heights[i1].z];
        const v10 = [heights[i2].x, h10, heights[i2].z];
        const v01 = [heights[i3].x, h01, heights[i3].z];
        const v11 = [heights[i4].x, h11, heights[i4].z];

        const avgX = (heights[i1].x + heights[i2].x + heights[i3].x + heights[i4].x) / 4;
        const avgZ = (heights[i1].z + heights[i2].z + heights[i3].z + heights[i4].z) / 4;
        const avgH = (h00 + h10 + h01 + h11) / 4;
        const col = colorByBiome(avgH, avgX, avgZ);

        const heightVar = Math.max(
          Math.abs(h00 - h10), Math.abs(h10 - h11),
          Math.abs(h11 - h01), Math.abs(h01 - h00),
          Math.abs(h00 - h11), Math.abs(h10 - h01)
        );

        const diag1 = Math.abs((h00 + h11) - (h10 + h01));

        if(heightVar > 1.5){
          const cx = (heights[i1].x + heights[i2].x + heights[i3].x + heights[i4].x) / 4;
          const cz = (heights[i1].z + heights[i2].z + heights[i3].z + heights[i4].z) / 4;
          const ch = (h00 + h10 + h01 + h11) / 4;
          const vc = [cx, ch, cz];
          tris.push({ verts: [v00, v10, vc], color: col });
          tris.push({ verts: [v10, v11, vc], color: col });
          tris.push({ verts: [v11, v01, vc], color: col });
          tris.push({ verts: [v01, v00, vc], color: col });
        } else if(diag1 < 0.5){
          tris.push({ verts: [v00, v10, v11], color: col });
          tris.push({ verts: [v00, v11, v01], color: col });
        } else {
          tris.push({ verts: [v00, v10, v01], color: col });
          tris.push({ verts: [v10, v11, v01], color: col });
        }
      }
    }

    // add procedural trees to chunk (This is a proof of concept and to be used in develpment for procedually generating structures, the tree models are terrible)
    // Increase tree frequency and vary by biome: deserts get fewer, plains/mountains more
    let baseTrees = 5 + Math.floor(rnd() * 8);
    const biomeSampleX = offsetX + CHUNK_SIZE*0.5*spacing;
    const biomeSampleZ = offsetZ + CHUNK_SIZE*0.5*spacing;
    const sampleBiome = getBiome(biomeSampleX, biomeSampleZ);
    if(sampleBiome === 'desert' || sampleBiome === 'lake' || sampleBiome === 'ocean') baseTrees = Math.max(0, Math.floor(baseTrees * 0.35));
    if(sampleBiome === 'plains' || sampleBiome === 'snowy_plains') baseTrees = Math.max(1, Math.floor(baseTrees * 1.2));
    if(sampleBiome === 'mountains') baseTrees = Math.max(2, Math.floor(baseTrees * 1.6));
    const treeCount = baseTrees;

    // Generate clustered tree positions deterministically using rnd
    const positions = [];
    const clusters = Math.max(1, Math.floor(treeCount / 3));
    for(let c=0;c<clusters;c++){
      const cx = offsetX + (rnd()-0.5) * CHUNK_SIZE * spacing * 0.7;
      const cz = offsetZ + (rnd()-0.5) * CHUNK_SIZE * spacing * 0.7;
      const clusterSize = 2 + Math.floor(rnd() * Math.max(2, Math.floor(treeCount/2)));
      const radius = 1 + rnd() * (CHUNK_SIZE * 0.25);
      for(let i=0;i<clusterSize;i++){
        const rx = (rnd() - 0.5) * 2;
        const rz = (rnd() - 0.5) * 2;
        const tx = cx + rx * radius;
        const tz = cz + rz * radius;
        positions.push({x:tx,z:tz,cluster:true});
      }
    }
    // Add a few outliers spread across the chunk
    const outliers = Math.max(1, Math.floor(treeCount * 0.3));
    for(let o=0;o<outliers;o++){
      const tx = offsetX + (rnd()-0.5) * CHUNK_SIZE * spacing * 0.95;
      const tz = offsetZ + (rnd()-0.5) * CHUNK_SIZE * spacing * 0.95;
      positions.push({x:tx,z:tz,cluster:false});
    }

    // Place vegetation at generated positions
    for(const ppos of positions){
      const tx = ppos.x;
      const tz = ppos.z;
      const th = heightAt(tx, tz);
      const biome = getBiome(tx, tz);

      // Only place vegetation in appropriate biomes
      if(biome === 'ocean' || biome === 'lake') continue;

      let canPlaceVegetation = false;
      let vegetationType = null;

      // Biome-specific height ranges and vegetation types
      if(biome === 'desert'){
        // Desert gets cacti
        if(th > -0.5 && th < 0.8) {
          canPlaceVegetation = true;
          vegetationType = 'cactus';
        }
      } else if(biome === 'plains'){
        // Plains prefer oaks and shrubs
        if(th > 0.1 && th < 0.5) {
          canPlaceVegetation = true;
          vegetationType = rnd() > 0.4 ? 'oak' : 'shrub';
        }
      } else if(biome === 'snowy_plains'){
        // Snowy plains prefer evergreens and shrubs
        if(th > 0.8 && th < 1.5) {
          canPlaceVegetation = true;
          vegetationType = rnd() > 0.5 ? 'evergreen' : 'shrub';
        }
      } else if(biome === 'mountains'){
        // Mountains prefer tall evergreens
        if(th > 1.0 && th < 3.0) {
          canPlaceVegetation = true;
          vegetationType = 'evergreen';
        }
      }

      if(!canPlaceVegetation) continue;

      if(vegetationType === 'cactus'){
        // CACTUS: Tall, narrow, segmented, desert green
        const cactusH = 1.2 + rnd()*0.6;
        const cactusRad = 0.15 + rnd()*0.08;
        const cactusColor = hslToRgb(0.32, 0.75, 0.35); // Warm desert green
        const segments = 5 + Math.floor(rnd()*3);
        
        // Main trunk (cylinder-like)
        const sides = 6;
        const segmentH = cactusH / segments;
        
        for(let seg = 0; seg < segments; seg++){
          const h1 = th + seg * segmentH;
          const h2 = th + (seg + 1) * segmentH;
          const rad1 = cactusRad * (1 + Math.sin(seg * 0.8) * 0.2); // Slight waviness
          const rad2 = cactusRad * (1 + Math.sin((seg + 1) * 0.8) * 0.2);
          
          for(let s = 0; s < sides; s++){
            const a1 = (s / sides) * Math.PI * 2;
            const a2 = ((s + 1) / sides) * Math.PI * 2;
            const v0 = [tx + Math.cos(a1) * rad1, h1, tz + Math.sin(a1) * rad1];
            const v1 = [tx + Math.cos(a2) * rad1, h1, tz + Math.sin(a2) * rad1];
            const v2 = [tx + Math.cos(a2) * rad2, h2, tz + Math.sin(a2) * rad2];
            const v3 = [tx + Math.cos(a1) * rad2, h2, tz + Math.sin(a1) * rad2];
            tris.push({ verts: [v0, v1, v2], color: cactusColor });
            tris.push({ verts: [v0, v2, v3], color: cactusColor });
          }
        }
        
        // Add small arms/spines sticking out (simple spikes)
        const spineColor = hslToRgb(0.08, 0.8, 0.4); // Dark brownish for spines
        for(let seg = 0; seg < segments; seg += 2){
          const segH = th + (seg + 0.5) * segmentH;
          const armCount = 3 + Math.floor(rnd() * 2);
          
          for(let a = 0; a < armCount; a++){
            const angle = (a / armCount) * Math.PI * 2;
            const armLen = 0.25 + rnd() * 0.15;
            const armX = tx + Math.cos(angle) * (cactusRad + armLen);
            const armZ = tz + Math.sin(angle) * (cactusRad + armLen);
            const armTipH = segH + rnd() * 0.2;
            
            const baseX = tx + Math.cos(angle) * cactusRad;
            const baseZ = tz + Math.sin(angle) * cactusRad;
            
            // Simple triangular spike
            const v0 = [baseX, segH, baseZ];
            const v1 = [armX, armTipH, armZ];
            const v2 = [baseX + (rnd() - 0.5) * 0.1, segH + 0.1, baseZ + (rnd() - 0.5) * 0.1];
            tris.push({ verts: [v0, v1, v2], color: spineColor });
          }
        }
      }
      else if(vegetationType === 'evergreen'){
        // Type 0: TALL SKINNY EVERGREEN (Pine) - vertical spike shape
        const trunkH = biome === 'mountains' ? 2.5 + rnd()*1.5 : 1.5 + rnd()*0.8;
        const baseRad = 0.2 + rnd()*0.1;
        const apexH = th + trunkH + 2.5 + rnd()*0.8;
        const treeColor = biome === 'snowy_plains' ? 
          hslToRgb(0.35, 0.7, 0.35) : // Darker green for snowy areas
          hslToRgb(0.38, 0.85, 0.25); // Dark forest green for mountains
        const trunkColor = hslToRgb(0.05, 0.6, 0.15); // dark brown
        
        // Very thin trunk
        const trunkRad = 0.05;
        const sides = 4;
        const trunkTop = [tx, th + trunkH, tz];
        for(let s=0; s<sides; s++){
          const a1 = (s/sides)*Math.PI*2;
          const a2 = ((s+1)/sides)*Math.PI*2;
          const v1 = [tx + Math.cos(a1)*trunkRad, th, tz + Math.sin(a1)*trunkRad];
          const v2 = [tx + Math.cos(a2)*trunkRad, th, tz + Math.sin(a2)*trunkRad];
          tris.push({ verts: [v1, v2, trunkTop], color: trunkColor });
        }
        
        // Very tall, very narrow cone
        const layers = 8;
        for(let lay=0; lay<layers; lay++){
          const layRad = baseRad * Math.pow(1 - lay/(layers+1), 2.5);
          const layH = th + trunkH + (apexH - th - trunkH)*lay/(layers+1);
          const nextRad = baseRad * Math.pow(1 - (lay+1)/(layers+1), 2.5);
          const nextH = th + trunkH + (apexH - th - trunkH)*(lay+1)/(layers+1);
          
          for(let s=0; s<sides; s++){
            const a1 = (s/sides)*Math.PI*2;
            const a2 = ((s+1)/sides)*Math.PI*2;
            const v0 = [tx + Math.cos(a1)*layRad, layH, tz + Math.sin(a1)*layRad];
            const v1 = [tx + Math.cos(a2)*layRad, layH, tz + Math.sin(a2)*layRad];
            const v2 = [tx + Math.cos(a2)*nextRad, nextH, tz + Math.sin(a2)*nextRad];
            const v3 = [tx + Math.cos(a1)*nextRad, nextH, tz + Math.sin(a1)*nextRad];
            tris.push({ verts: [v0, v1, v2], color: treeColor });
            tris.push({ verts: [v0, v2, v3], color: treeColor });
          }
        }
      }
      else if(vegetationType === 'oak'){
        // Type 1: WIDE SPREADING OAK - massive crown, short trunk
        const trunkH = 0.6 + rnd()*0.3;
        const maxRad = 0.65 + rnd()*0.3;
        const topH = th + trunkH + maxRad;
        const treeColor = hslToRgb(0.28, 0.75, 0.36); // bright medium green
        const trunkColor = hslToRgb(0.08, 0.7, 0.25); // thicker brown trunk
        
        // Very thick chunky trunk
        const trunkRad = 0.25;
        const sides = 12;
        const trunkTop = [tx, th + trunkH, tz];
        for(let s=0; s<sides; s++){
          const a1 = (s/sides)*Math.PI*2;
          const a2 = ((s+1)/sides)*Math.PI*2;
          const v1 = [tx + Math.cos(a1)*trunkRad, th, tz + Math.sin(a1)*trunkRad];
          const v2 = [tx + Math.cos(a2)*trunkRad, th, tz + Math.sin(a2)*trunkRad];
          tris.push({ verts: [v1, v2, trunkTop], color: trunkColor });
        }
        
        // 4 wide overlapping spheres for massive crown
        const layers = 4;
        for(let lay=0; lay<layers; lay++){
          const layRad = maxRad * (1 - lay*0.1);
          const layH = th + trunkH + (maxRad * 0.6) * lay;
          const nextRad = maxRad * (1 - (lay+1)*0.1);
          const nextH = th + trunkH + (maxRad * 0.6) * (lay+1);
          
          for(let s=0; s<sides; s++){
            const a1 = (s/sides)*Math.PI*2;
            const a2 = ((s+1)/sides)*Math.PI*2;
            const v0 = [tx + Math.cos(a1)*layRad, layH, tz + Math.sin(a1)*layRad];
            const v1 = [tx + Math.cos(a2)*layRad, layH, tz + Math.sin(a2)*layRad];
            const v2 = [tx + Math.cos(a2)*nextRad, nextH, tz + Math.sin(a2)*nextRad];
            const v3 = [tx + Math.cos(a1)*nextRad, nextH, tz + Math.sin(a1)*nextRad];
            tris.push({ verts: [v0, v1, v2], color: treeColor });
            tris.push({ verts: [v0, v2, v3], color: treeColor });
          }
        }
      }
      else if(vegetationType === 'shrub'){
        // Type 2: SQUAT DENSE SHRUB
        const shrubH = 0.3 + rnd()*0.15;
        const shrubRad = 0.35 + rnd()*0.15;
        const shrubColor = biome === 'snowy_plains' ?
          hslToRgb(0.35, 0.6, 0.5) : // Lighter frosted look for snowy
          hslToRgb(0.25, 0.8, 0.38); // Bright yellowish-green for plains
        const sides = 10;
        
        // Dense rounded dome shape
        const apexH = th + shrubH;
        const apex = [tx, apexH, tz];
        
        // Base circle at ground
        const baseHeight = th;
        const baseRad = shrubRad;
        for(let s=0; s<sides; s++){
          const a1 = (s/sides)*Math.PI*2;
          const a2 = ((s+1)/sides)*Math.PI*2;
          const v0 = [tx + Math.cos(a1)*baseRad, baseHeight, tz + Math.sin(a1)*baseRad];
          const v1 = [tx + Math.cos(a2)*baseRad, baseHeight, tz + Math.sin(a2)*baseRad];
          tris.push({ verts: [v0, v1, apex], color: shrubColor });
        }
        
        // Add TWO middle layers for more dense appearance
        const mid1Rad = shrubRad * 0.9;
        const mid1H = th + shrubH * 0.4;
        for(let s=0; s<sides; s++){
          const a1 = (s/sides)*Math.PI*2;
          const a2 = ((s+1)/sides)*Math.PI*2;
          const v0 = [tx + Math.cos(a1)*baseRad, baseHeight, tz + Math.sin(a1)*baseRad];
          const v1 = [tx + Math.cos(a2)*baseRad, baseHeight, tz + Math.sin(a2)*baseRad];
          const v2 = [tx + Math.cos(a2)*mid1Rad, mid1H, tz + Math.sin(a2)*mid1Rad];
          const v3 = [tx + Math.cos(a1)*mid1Rad, mid1H, tz + Math.sin(a1)*mid1Rad];
          tris.push({ verts: [v0, v1, v2], color: shrubColor });
          tris.push({ verts: [v0, v2, v3], color: shrubColor });
        }
        
        const mid2Rad = shrubRad * 0.75;
        const mid2H = th + shrubH * 0.7;
        for(let s=0; s<sides; s++){
          const a1 = (s/sides)*Math.PI*2;
          const a2 = ((s+1)/sides)*Math.PI*2;
          const v0 = [tx + Math.cos(a1)*mid1Rad, mid1H, tz + Math.sin(a1)*mid1Rad];
          const v1 = [tx + Math.cos(a2)*mid1Rad, mid1H, tz + Math.sin(a2)*mid1Rad];
          const v2 = [tx + Math.cos(a2)*mid2Rad, mid2H, tz + Math.sin(a2)*mid2Rad];
          const v3 = [tx + Math.cos(a1)*mid2Rad, mid2H, tz + Math.sin(a1)*mid2Rad];
          tris.push({ verts: [v0, v1, v2], color: shrubColor });
          tris.push({ verts: [v0, v2, v3], color: shrubColor });
        }
      }
    }

    const chunk = { tris };
    worldChunks.set(key, chunk);
    return chunk;
  }

  function generateWorld(seed){
    worldSeed = seed;
    worldChunks.clear();
    lastPlayerChunkX = 0;
    lastPlayerChunkZ = 0;
    rebuildSceneTriangles(seed);
  }

  function rebuildSceneTriangles(seed){
    sceneTriangles = [];
    // Get player chunk position
    const playerChunkX = Math.floor(player.pos[0] / (CHUNK_SIZE * CHUNK_SPACING));
    const playerChunkZ = Math.floor(player.pos[2] / (CHUNK_SIZE * CHUNK_SPACING));
    
    // Generate/load chunks around player (5x5 grid for better coverage)
    for(let cx=playerChunkX-2; cx<=playerChunkX+2; cx++){
      for(let cz=playerChunkZ-2; cz<=playerChunkZ+2; cz++){
        const chunk = generateChunk(cx, cz);
        sceneTriangles.push(...chunk.tris);
      }
    }
  }

  // initial world
  generateWorld(Date.now() % 2147483647);
  
  // Place player on valid terrain
  const initialGroundHeight = getTerrainHeightAt(0, 0);
  player.pos[1] = Math.max(initialGroundHeight + 0.5, 0.5);

  function project(v){
    // camera looks down -Z; we expect z negative in front
    // we'll treat objects with z>0 (behind camera) as clipped
    const aspect = canvas.width / canvas.height;
    const f = 1 / Math.tan(player.fov / 2);
    // simple projection to NDC
    const z = v[2] || 0.0001;
    return {
      ndc: [ (v[0] * f) / (-z * aspect), (v[1] * f) / -z ],
      z: z
    };
  }

  function ndcToScreen(ndc){
    const x = (ndc[0] * 0.5 + 0.5) * canvas.width;
    const y = (1 - (ndc[1] * 0.5 + 0.5)) * canvas.height; // flip y
    return [x,y];
  }

  // ...removed 2D drawTriangle, replaced by WebGL

  // render loop
  let last = performance.now();
  function frame(now){
    const dt = Math.min(0.05, (now - last)/1000); last = now;
    updatePlayer(dt);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // WebGL: build projection and view matrices
    function perspectiveMatrix(fov, aspect, near, far) {
      const f = 1.0 / Math.tan(fov / 2);
      const nf = 1 / (near - far);
      return new Float32Array([
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, (far + near) * nf, -1,
        0, 0, (2 * far * near) * nf, 0
      ]);
    }
    function lookAtMatrix(eye, target, up) {
      // Build lookAt matrix, then apply roll
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
      const cr = Math.cos(-player.roll), sr = Math.sin(-player.roll);
      // 3x3 rotation for roll
      const rollMat = [
        cr, -sr, 0,
        sr,  cr, 0,
        0,   0,  1
      ];
      // Multiply rollMat * upper 3x3 of m
      let out = new Float32Array(16);
      for (let row = 0; row < 3; ++row) {
        for (let col = 0; col < 3; ++col) {
          out[col*4+row] = rollMat[row*3+0]*m[col*4+0] + rollMat[row*3+1]*m[col*4+1] + rollMat[row*3+2]*m[col*4+2];
        }
      }
      // Copy translation and bottom row
      out[12] = m[12];
      out[13] = m[13];
      out[14] = m[14];
      out[15] = m[15];
      return out;
    }
    const aspect = canvas.width / canvas.height;
    const projection = perspectiveMatrix(player.fov, aspect, 0.1, 1000);
    const eye = getCameraPos();
    const target = vec3.add(eye, [Math.sin(-player.yaw), Math.sin(-player.pitch), Math.cos(-player.yaw)]);
    const up = [0, 1, 0];
    const view = lookAtMatrix(eye, target, up);
    drawTriangles(sceneTriangles, projection, view);

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
