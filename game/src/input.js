// Warung Senja — input: mouse clicks and keyboard, translated into game actions.
// The game is played with the mouse (click stations) and a few keys: 1-6 grab an
// ingredient, Space starts the day, P pauses, R restarts, M mutes the sound.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;
export const ACTION_MUTE = 8;
export const ACTION_INGREDIENT = 16;

export function createInput(canvas) {
  const clicks = [];
  const actions = { bits: 0, ingredient: null };
  let pointer = { x: 0, y: 0 };

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  canvas.addEventListener('pointermove', (event) => {
    pointer = canvasPoint(event);
  });
  canvas.addEventListener('pointerdown', (event) => {
    const point = canvasPoint(event);
    pointer = point;
    clicks.push(point);
  });

  const KEY_INGREDIENTS = { Digit1: 'nasi', Digit2: 'mie', Digit3: 'ayam', Digit4: 'sayur', Digit5: 'telur', Digit6: 'teh' };

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    if (event.code === 'Space' || event.code === 'Enter') {
      actions.bits |= ACTION_CONFIRM;
      event.preventDefault();
    } else if (event.code === 'KeyP' || event.code === 'Escape') {
      actions.bits |= ACTION_PAUSE;
    } else if (event.code === 'KeyR') {
      actions.bits |= ACTION_RESTART;
    } else if (event.code === 'KeyM') {
      actions.bits |= ACTION_MUTE;
    } else if (KEY_INGREDIENTS[event.code]) {
      actions.bits |= ACTION_INGREDIENT;
      actions.ingredient = KEY_INGREDIENTS[event.code];
    }
  });

  return {
    pointer() {
      return pointer;
    },
    /** All clicks since the last call, in logical canvas coordinates. */
    takeClicks() {
      return clicks.splice(0, clicks.length);
    },
    /** Action bits + ingredient key pressed since the last call. */
    takeActions() {
      const taken = { bits: actions.bits, ingredient: actions.ingredient };
      actions.bits = 0;
      actions.ingredient = null;
      return taken;
    },
  };
}

/** True when point (x, y) lies inside rect { x, y, w, h }. */
export function insideRect(x, y, rect) {
  return x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
}
