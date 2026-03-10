//To be used to create textures for whatever idk not to be used in production
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
    yaw: 180, // rotation around Y
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
    return 0; // Default height for no terrain
  }

  // Keyboard state
  const keys = {};
  window.addEventListener('keydown', e=>{ 
    keys[e.key.toLowerCase()] = true; 
    if(e.key==='r' || e.key==='R'){ resetCamera(); } 
    if(e.key===' ' && player.isGrounded){ player.jumpPower = JUMP_FORCE; }
    // No world regeneration in noTerrain mode
  });
  window.addEventListener('keyup', e=>{ keys[e.key.toLowerCase()] = false; });

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
    // No chunk logic in noTerrain mode
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

  // Create a cube at a given position with a given size and color
  function createObject(pos, color) {
    const [x, y, z] = pos;
    
    // Define 8 vertices of the cube
    const verts = [
      [x - 1, y - 1, z - 1], // 0: bottom-left-back
      [x, y - 1, z - 1], // 1: bottom-right-back
      [x, y , z - 1], // 2: top-right-back
      [x - 1, y, z - 1], // 3: top-left-back
      [x - 1, y - 1, z], // 4: bottom-left-front
      [x, y - 1, z], // 5: bottom-right-front
      [x, y, z], // 6: top-right-front
      [x - 1, y, z], // 7: top-left-front
    ];

    // Define 12 triangles (2 per face)
    const faces = [
      // Back face (z-)
      [0, 2, 1], [0, 3, 2],
      // Front face (z+)
      [4, 5, 6], [4, 6, 7],
      // Left face (x-)
      [0, 4, 7], [0, 7, 3],
      // Right face (x+)
      [1, 2, 6], [1, 6, 5],
      // Bottom face (y-)
      [0, 1, 5], [0, 5, 4],
      // Top face (y+)
      [3, 7, 6], [3, 6, 2],
    ];

    // Create triangle objects
    faces.forEach(face => {
      sceneTriangles.push({
        verts: [verts[face[0]], verts[face[1]], verts[face[2]]],
        color: color
      });
    });
  }

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
  
  // Place player on valid terrain
  const initialGroundHeight = getTerrainHeightAt(0, 0);
  player.pos[1] = Math.max(initialGroundHeight + 0.5, 0.5);

  // ===== TRIANGLE EDITOR =====
  let editableTriangles = [
    // // Long rectangle; body of plane for future flight simulator
    // {verts: [[-1, -1, -1], [7, -1, -1], [7, 1, -1]], color: [255, 100, 100]},
    // {verts: [[-1, -1, -1], [7, 1, -1], [-1, 1, -1]], color: [255, 100, 100]},
    // {verts: [[-1, -1, 1], [7, 1, 1], [7, -1, 1]], color: [255, 100, 100]},
    // {verts: [[-1, -1, 1], [-1, 1, 1], [7, 1, 1]], color: [255, 100, 100]},
    // {verts: [[-1, -1, -1], [-1, 1, 1], [-1, -1, 1]], color: [255, 100, 100]},
    // {verts: [[-1, 1, -1], [-1, 1, 1], [-1, -1, -1]], color: [255, 100, 100]},
    // {verts: [[7, -1, -1], [7, 1, 1], [7, -1, 1]], color: [255, 100, 100]},
    // {verts: [[7, 1, -1], [7, 1, 1], [7, -1, -1]], color: [255, 100, 100]},
    // {verts: [[7, -1, 1], [-1, -1, -1], [-1, -1, 1]], color: [255, 100, 100]},
    // {verts: [[7, -1, 1], [7, -1, -1], [-1, -1, -1]], color: [255, 100, 100]},
    // {verts: [[7, 1, 1], [-1, 1, -1], [-1, 1, 1]], color: [255, 100, 100]},
    // {verts: [[7, 1, 1], [7, 1, -1], [-1, 1, -1]], color: [255, 100, 100]}

    // Cube exaple and test
    {verts: [[-1, -1, -1], [1, -1, -1], [1, 1, -1]], color: [255, 100, 100]},
    {verts: [[-1, -1, -1], [1, 1, -1], [-1, 1, -1]], color: [255, 100, 100]},
    {verts: [[-1, -1, 1], [1, 1, 1], [1, -1, 1]], color: [255, 100, 100]},
    {verts: [[-1, -1, 1], [-1, 1, 1], [1, 1, 1]], color: [255, 100, 100]},
    {verts: [[-1, -1, -1], [-1, 1, 1], [-1, -1, 1]], color: [255, 100, 100]},
    {verts: [[-1, 1, -1], [-1, 1, 1], [-1, -1, -1]], color: [255, 100, 100]},
    {verts: [[1, -1, -1], [1, 1, 1], [1, -1, 1]], color: [255, 100, 100]},
    {verts: [[1, 1, -1], [1, 1, 1], [1, -1, -1]], color: [255, 100, 100]},
    {verts: [[1, -1, 1], [-1, -1, -1], [-1, -1, 1]], color: [255, 100, 100]},
    {verts: [[1, -1, 1], [1, -1, -1], [-1, -1, -1]], color: [255, 100, 100]},
    {verts: [[1, 1, 1], [-1, 1, -1], [-1, 1, 1]], color: [255, 100, 100]},
    {verts: [[1, 1, 1], [1, 1, -1], [-1, 1, -1]], color: [255, 100, 100]}
  ];

  function updateSceneFromTriangles() {
    sceneTriangles = editableTriangles.map(tri => ({
      verts: tri.verts.map(v => [...v]), // deep copy
      color: [...tri.color]
    }));
  }

  function createTriangleEditor() {
    const panel = document.getElementById('editorPanel');
    let html = '<h3>Triangle Editor</h3>';

    editableTriangles.forEach((triangle, triIdx) => {
      html += `<div class="triangle-row" style="border:1px solid #0f0;padding:10px;margin-bottom:15px;border-radius:5px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <label style="color:#0f0;font-weight:bold;">Triangle ${triIdx}</label>
          <button class="delete-triangle-btn" data-triangle="${triIdx}" style="background:#f00;color:#fff;border:none;padding:2px 6px;border-radius:3px;cursor:pointer;">X</button>
        </div>`;

      triangle.verts.forEach((vertex, vertIdx) => {
        html += `
          <div class="vertex-row" style="margin-bottom:5px;">
            <label style="color:#aaa;font-size:11px;">Vertex ${vertIdx}</label>
            <input type="text" placeholder="X" class="vertex-input" data-triangle="${triIdx}" data-vertex="${vertIdx}" data-axis="0" value="${vertex[0]}" style="width:30%;margin-right:2px;">
            <input type="text" placeholder="Y" class="vertex-input" data-triangle="${triIdx}" data-vertex="${vertIdx}" data-axis="1" value="${vertex[1]}" style="width:30%;margin-right:2px;">
            <input type="text" placeholder="Z" class="vertex-input" data-triangle="${triIdx}" data-vertex="${vertIdx}" data-axis="2" value="${vertex[2]}" style="width:30%;">
          </div>
        `;
      });

      html += `
        <div class="color-row" style="margin-top:10px;">
          <label style="color:#aaa;font-size:11px;">Color (R,G,B)</label>
          <input type="text" placeholder="R" class="color-input" data-triangle="${triIdx}" data-color="0" value="${triangle.color[0]}" style="width:30%;margin-right:2px;">
          <input type="text" placeholder="G" class="color-input" data-triangle="${triIdx}" data-color="1" value="${triangle.color[1]}" style="width:30%;margin-right:2px;">
          <input type="text" placeholder="B" class="color-input" data-triangle="${triIdx}" data-color="2" value="${triangle.color[2]}" style="width:30%;">
        </div>
      </div>`;
    });

    html += `
      <button id="addTriangleBtn" style="width:100%;padding:8px;background:#00f;color:#fff;border:none;border-radius:3px;cursor:pointer;font-weight:bold;margin-bottom:10px;">Add New Triangle</button>
      <button id="copyBtn">Copy sceneTriangles Array</button>
      <div id="format-info" style="margin-top:10px;color:#aaa;font-size:11px;">
        Format: sceneTriangles = [{verts: [[x,y,z],[x,y,z],[x,y,z]], color: [r,g,b]}, ...]
      </div>
    `;

    panel.innerHTML = html;

    // Add input listeners for vertices
    document.querySelectorAll('.vertex-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const triIdx = parseInt(e.target.dataset.triangle);
        const vertIdx = parseInt(e.target.dataset.vertex);
        const axis = parseInt(e.target.dataset.axis);
        const value = parseFloat(e.target.value);

        if (!isNaN(value)) {
          editableTriangles[triIdx].verts[vertIdx][axis] = value;
          updateSceneFromTriangles();
        }
      });

      input.addEventListener('input', (e) => {
        const triIdx = parseInt(e.target.dataset.triangle);
        const vertIdx = parseInt(e.target.dataset.vertex);
        const axis = parseInt(e.target.dataset.axis);
        const value = parseFloat(e.target.value);

        if (!isNaN(value)) {
          editableTriangles[triIdx].verts[vertIdx][axis] = value;
          updateSceneFromTriangles();
        }
      });
    });

    // Add input listeners for colors
    document.querySelectorAll('.color-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const triIdx = parseInt(e.target.dataset.triangle);
        const colorIdx = parseInt(e.target.dataset.color);
        const value = parseInt(e.target.value);

        if (!isNaN(value)) {
          editableTriangles[triIdx].color[colorIdx] = value;
          updateSceneFromTriangles();
        }
      });

      input.addEventListener('input', (e) => {
        const triIdx = parseInt(e.target.dataset.triangle);
        const colorIdx = parseInt(e.target.dataset.color);
        const value = parseInt(e.target.value);

        if (!isNaN(value)) {
          editableTriangles[triIdx].color[colorIdx] = value;
          updateSceneFromTriangles();
        }
      });
    });

    // Add delete triangle listeners
    document.querySelectorAll('.delete-triangle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const triIdx = parseInt(e.target.dataset.triangle);
        editableTriangles.splice(triIdx, 1);
        createTriangleEditor(); // Rebuild the UI
        updateSceneFromTriangles();
      });
    });

    // Add new triangle button
    document.getElementById('addTriangleBtn').addEventListener('click', () => {
      editableTriangles.push({
        verts: [
          [0, 0, 0],
          [1, 0, 0],
          [0, 1, 0]
        ],
        color: [255, 255, 255]
      });
      createTriangleEditor(); // Rebuild the UI
      updateSceneFromTriangles();
    });

    // Add copy button listener
    document.getElementById('copyBtn').addEventListener('click', () => {
      const code = editableTriangles
        .map(tri => {
          const vertsStr = tri.verts.map(v => `[${v[0]}, ${v[1]}, ${v[2]}]`).join(', ');
          const colorStr = `[${tri.color[0]}, ${tri.color[1]}, ${tri.color[2]}]`;
          return `{verts: [${vertsStr}], color: ${colorStr}}`;
        })
        .join(',\n  ');

      const fullCode = `const sceneTriangles = [\n  ${code}\n];`;

      navigator.clipboard.writeText(fullCode).then(() => {
        const btn = document.getElementById('copyBtn');
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => {
          btn.textContent = originalText;
        }, 2000);
      });
    });
  }

  // Toggle editor visibility
  document.getElementById('editToggle').addEventListener('click', (e) => {
    const panel = document.getElementById('editorPanel');
    const isVisible = panel.style.display !== 'none';
    panel.style.display = isVisible ? 'none' : 'block';
    e.target.textContent = isVisible ? 'Show Editor' : 'Hide Editor';
  });

  createTriangleEditor();
  updateSceneFromTriangles(); // Initialize scene with editable triangles
  // ===== END TRIANGLE EDITOR =====

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

  // WebGL triangle rendering
  // Simple shader setup
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
    // Flatten triangle data
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

  // render loop
  let last = performance.now();
  function frame(now){
    const dt = Math.min(0.05, (now - last)/1000); last = now;
    updatePlayer(dt);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // render procedural scene with render distance
    const tris = [];
    const eyePos = getCameraPos();
    
    for(const tri of sceneTriangles){
      // Check render distance - only process if triangle is within render distance
      const triCenter = [
        (tri.verts[0][0] + tri.verts[1][0] + tri.verts[2][0]) / 3,
        (tri.verts[0][1] + tri.verts[1][1] + tri.verts[2][1]) / 3,
        (tri.verts[0][2] + tri.verts[1][2] + tri.verts[2][2]) / 3
      ];
      const distToTri = vec3.len(vec3.sub(triCenter, eyePos));
      if(distToTri > RENDER_DISTANCE) continue;
      
      const camVerts = tri.verts.map(worldToCamera);
      if(camVerts.some(v=>v[2] > -0.15)) continue;
      // compute normal in camera space
      const e1 = vec3.sub(camVerts[1], camVerts[0]);
      const e2 = vec3.sub(camVerts[2], camVerts[0]);
      const normal = vec3.cross(e1,e2);
      // lighting (simple directional)
      // Light direction in world space pointing from light to surface
      const lightWorld = vec3.norm([0.5, 0.8, 0.3]);
      // Transform light to camera space (same rotation as camera)
      const cy = Math.cos(-player.yaw), sy = Math.sin(-player.yaw);
      const cx = Math.cos(-player.pitch), sx = Math.sin(-player.pitch);
      let lx = lightWorld[0]*cy - lightWorld[2]*sy;
      let lz = lightWorld[0]*sy + lightWorld[2]*cy;
      let ly = lightWorld[1];
      let ly2 = ly*cx - lz*sx;
      let lz2 = ly*sx + lz*cx;
      const lightCam = vec3.norm([lx, ly2, lz2]);
      
      const nrm = vec3.norm(normal);
      const diff = Math.max(0.2, vec3.dot(nrm, lightCam));

      // project
      const proj = camVerts.map(project);
      const screen = proj.map(p=>ndcToScreen(p.ndc));
      // Use average z for painter's algorithm
      const farZ = Math.min(proj[0].z, proj[1].z, proj[2].z);

      // shade color based on lighting
      const base = tri.color;
      const col = `rgb(${Math.floor(base[0]*diff)},${Math.floor(base[1]*diff)},${Math.floor(base[2]*diff)})`;
      tris.push({screen, z: farZ, color: col});
    }

    // painter's algorithm (far -> near)
    tris.sort((a,b)=>a.z - b.z); // Sort by average z, farthest first
    // For WebGL, draw triangles in world space
    // Build projection and view matrices
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
