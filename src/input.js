// input.js — Keyboard input handling

export const keys = {};

export function setupInput(onReset) {
  window.addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;
    if (e.key === 'r' || e.key === 'R') {
      onReset();
    }
  });

  window.addEventListener('keyup', e => {
    keys[e.key.toLowerCase()] = false;
  });
}
