// input.js — Keyboard input handling

export const keys = {};

export function setupInput() {
  window.addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;
  });

  window.addEventListener('keyup', e => {
    keys[e.key.toLowerCase()] = false;
  });
}
