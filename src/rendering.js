// rendering.js — WebGL setup and drawing functions

import { vec3, triangleNormal } from './math.js';
import { resolutionScale } from './options.js';

export function setupWebGL(canvas) {
  const gl = canvas.getContext('webgl');
  if (!gl) {
    alert('WebGL not supported');
    return null;
  }

  // WebGL setup: enable depth buffer
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.clearDepth(1.0);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);

  return gl;
}

export function createShaderProgram(gl) {
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

  function createShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader));
    }
    return shader;
  }

  const vs = createShader(gl.VERTEX_SHADER, vertexShaderSource);
  const fs = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program));
  }
  return program;
}

export function drawTriangles(gl, program, triangles, projection, view, stationary) {
  const positions = [];
  const colors = [];
  const normals = [];

  if (!stationary) {
    for (const tri of triangles) {
      const n = triangleNormal(tri.verts[0], tri.verts[1], tri.verts[2]);
      for (let i = 0; i < 3; ++i) {
        positions.push(...tri.verts[i]);
        colors.push(...tri.color.map(c => c / 255));
        normals.push(...n);
      }
    }
  } else {
    for (const tri of triangles) {
      for (let i = 0; i < 3; ++i) {
        normals.push(...tri.normal);
        positions.push(...tri.verts[i]);
        colors.push(...tri.color.map(c => c / 255));
      }
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

export function resizeCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const scale = (typeof resolutionScale === 'number' && resolutionScale > 0) ? resolutionScale : 1;
  canvas.width = Math.floor(window.innerWidth * dpr * scale);
  canvas.height = Math.floor(window.innerHeight * dpr * scale);
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
}
