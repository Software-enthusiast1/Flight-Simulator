// input.js — Keyboard input handling

export const keys = {};

export function setupInput(onReset, onJump, onRegenerate) {
  window.addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;
    if (e.key === 'r' || e.key === 'R') {
      onReset();
    }
    if (e.key === ' ') {
      onJump();
    }
    if (e.key === 'g' || e.key === 'G') {
      onRegenerate();
    }
  });

  window.addEventListener('keyup', e => {
    keys[e.key.toLowerCase()] = false;
  });
}
