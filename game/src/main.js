// Warung Senja — main: boot, the one loop, click routing and screen flow.
//
// ?seed=N fixes the day's random orders. ?shot=1|2|3|4 (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady
// for a screenshot. Otherwise the game runs: title, play, paused, game over.
import { BEST_KEY, STEP, VIEW, ZONES } from './config.js';
import {
  EVENT_CHOP_DONE,
  EVENT_COOK_DONE,
  EVENT_LEFT,
  EVENT_OVER,
  SCREEN_OVER,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_TITLE,
  createRandom,
  createState,
  resetState,
  serveCustomer,
  stepState,
  takeIngredient,
  useBoard,
  usePlateCounter,
  usePlateStack,
  useWok,
} from './state.js';
import {
  ACTION_CONFIRM,
  ACTION_INGREDIENT,
  ACTION_MUTE,
  ACTION_PAUSE,
  ACTION_RESTART,
  createInput,
  insideRect,
} from './input.js';
import {
  soundChop,
  soundCookDone,
  soundDayOver,
  soundError,
  soundLeave,
  soundPick,
  soundServe,
  soundSizzle,
  toggleMute,
  unlockAudio,
} from './audio.js';
import { createRenderer } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
canvas.width = VIEW.width;
canvas.height = VIEW.height;
const status = document.getElementById('status');
const state = createState(createRandom(seed));
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, state);
  // The hand item follows the pointer: shot 4 holds the plate up by the window,
  // the others hold their ingredient by the wok.
  const pointer = name === '4' ? { x: 960, y: 210 } : { x: 700, y: 500 };
  let painted = 0;
  function paint() {
    renderer.draw(state, scene.screen, 0, pointer, false, 1.2);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let muted = false;
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function startDay() {
    resetState(state);
    state.best = best;
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Hari dimulai. Ambil bahan, potong, masak, sajikan!');
  }

  function endDay() {
    screen = SCREEN_OVER;
    if (state.score > best) {
      best = state.score;
      saveBest(best);
    }
    soundDayOver();
    announce(`Hari selesai. Skor ${state.score}. Koin ${state.coins}. Terbaik ${best}.`);
  }

  /** Route one click to the station it lands on. */
  function handleClick(x, y) {
    unlockAudio();
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
      startDay();
      return;
    }
    if (screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      return;
    }
    // Customers first: serving is the point of the game.
    for (let i = 0; i < state.customers.length; i += 1) {
      const customer = state.customers[i];
      if (customer.leaving) continue;
      const slot = ZONES.customerSlot(i);
      if (insideRect(x, y, slot)) {
        const earned = serveCustomer(state, customer, slot.x + slot.w / 2, slot.y);
        if (earned > 0) soundServe();
        else soundError();
        return;
      }
    }
    // Ingredient bins.
    for (const bin of ZONES.bins) {
      if (insideRect(x, y, bin)) {
        if (takeIngredient(state, bin.kind) === 'ambil') soundPick();
        else soundError();
        return;
      }
    }
    if (insideRect(x, y, ZONES.board)) {
      const result = useBoard(state);
      if (result === 'potong') soundChop();
      else if (result !== 'memotong') soundError();
      return;
    }
    if (insideRect(x, y, ZONES.wok)) {
      const result = useWok(state);
      if (result === 'masak' || result === 'masuk-wajan') soundPick();
      else if (result === 'ambil-masakan') soundCookDone();
      else soundError();
      return;
    }
    if (insideRect(x, y, ZONES.plateStack)) {
      const result = usePlateStack(state);
      if (result === 'tata-piring') soundPick();
      else soundError();
      return;
    }
    if (insideRect(x, y, ZONES.plateCounter)) {
      const result = usePlateCounter(state);
      if (result === 'saji-teh' || result === 'ambil-piring') soundPick();
      else soundError();
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions.bits & ACTION_MUTE) muted = toggleMute();
    if (actions.bits & ACTION_RESTART && (screen === SCREEN_PLAY || screen === SCREEN_OVER || screen === SCREEN_PAUSED)) {
      startDay();
      return;
    }
    if (actions.bits & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) startDay();
    else if (actions.bits & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Jeda.');
    } else if (actions.bits & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Lanjut memasak.');
    }
    if (actions.bits & ACTION_INGREDIENT && screen === SCREEN_PLAY && actions.ingredient) {
      unlockAudio();
      if (takeIngredient(state, actions.ingredient) === 'ambil') soundPick();
      else soundError();
    }
  }

  function step() {
    const events = stepState(state, STEP);
    if (events & EVENT_CHOP_DONE) soundChop();
    if (events & EVENT_COOK_DONE) soundCookDone();
    if (events & EVENT_LEFT) soundLeave();
    if (events & EVENT_OVER) endDay();
    if (state.wok.cooking > 0 && Math.random() < 0.06) soundSizzle();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    for (const click of input.takeClicks()) handleClick(click.x, click.y);
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(state, screen, best, input.pointer(), muted, now / 1000);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Jeda.');
    }
  });

  announce('Warung Senja. Klik atau tekan Spasi untuk mulai.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
