// Warung Senja — state: the whole game state, the day timer, orders, scores.
// Pure data plus small transitions; rendering lives in render.js, input in input.js.
import {
  BEST_KEY,
  CHOP_SECONDS,
  DAY_SECONDS,
  INGREDIENTS,
  MAX_CUSTOMERS,
  PATIENCE_MIN_SECONDS,
  PATIENCE_SECONDS,
  RECIPES,
  RECIPE_ORDER,
  SPAWN_FIRST_SECONDS,
  SPAWN_GAP_SECONDS,
  STEP,
  choppedKind,
  matchRecipe,
  recipeNeeds,
} from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

export const EVENT_NONE = 0;
export const EVENT_SERVED = 1;
export const EVENT_LEFT = 2;
export const EVENT_OVER = 4;
export const EVENT_CHOP_DONE = 8;
export const EVENT_COOK_DONE = 16;

/** Deterministic RNG (mulberry32) so ?seed=N replays the same day. */
export function createRandom(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let nextCustomerId = 1;

export function createCustomer(random, dayProgress) {
  // Weight cheap drinks early, richer dishes later in the day.
  const roll = random();
  let dish;
  if (roll < 0.22) dish = 'esteh';
  else if (roll < 0.5) dish = 'nasgor';
  else if (roll < 0.76) dish = 'miekuah';
  else dish = 'sate';
  const patience = Math.max(
    PATIENCE_MIN_SECONDS,
    PATIENCE_SECONDS - dayProgress * 12,
  );
  return {
    id: nextCustomerId,
    dish,
    patience,
    maxPatience: patience,
    // A little visual variety: skin tone, shirt colour, hair style.
    skin: ['#f2c79b', '#e8b07e', '#c98d5f', '#f7d7ae'][Math.floor(random() * 4)],
    shirt: ['#d94f3d', '#3d7bd9', '#4da85c', '#8a5fc0', '#e0a030'][Math.floor(random() * 5)],
    hair: Math.floor(random() * 3),
    happy: 0, // >0 while the customer smiles after being served
    leaving: false,
  };
}

export function createState(random) {
  return {
    random,
    screen: SCREEN_TITLE,
    timeLeft: DAY_SECONDS,
    day: 1,
    coins: 0,
    score: 0,
    served: 0,
    lost: 0,
    combo: 0,
    bestCombo: 0,
    best: 0,
    hand: null, // { kind } ingredient, { kind: 'dish', dish } or { kind: 'plate', dish }
    board: null, // { kind, progress } while chopping
    wok: { contents: [], cooking: 0, cookingRecipe: null, done: null },
    plate: null, // { dish } plated and waiting on the counter
    customers: [],
    spawnIn: SPAWN_FIRST_SECONDS,
    particles: [],
    floats: [], // floating "+18" texts
    message: '',
    messageUntil: 0,
    elapsed: 0,
    sizzle: 0, // seconds of sizzle sound left to play
  };
}

export function resetState(state) {
  const fresh = createState(state.random);
  fresh.best = state.best;
  Object.assign(state, fresh);
}

/** A short-lived floating text above a point. */
export function addFloat(state, x, y, text, color) {
  state.floats.push({ x, y, text, color: color || '#ffd76a', life: 1.2, max: 1.2 });
}

/** A burst of tiny particles (steam, coins, crumbs). */
export function addParticles(state, x, y, color, count) {
  for (let i = 0; i < count; i += 1) {
    state.particles.push({
      x,
      y,
      vx: (state.random() - 0.5) * 90,
      vy: -40 - state.random() * 70,
      life: 0.5 + state.random() * 0.5,
      max: 1,
      color,
      size: 2 + state.random() * 4,
    });
  }
}

function setMessage(state, text) {
  state.message = text;
  state.messageUntil = state.elapsed + 2.2;
}

/** Pick up an ingredient from a bin into the hand. Returns a short event note. */
export function takeIngredient(state, kind) {
  if (state.hand) return 'tangan-penuh';
  state.hand = { kind };
  return 'ambil';
}

/** What happens when the player clicks the chopping board. */
export function useBoard(state) {
  if (state.board) return 'memotong';
  if (!state.hand) return 'kosong';
  const kind = state.hand.kind;
  if (kind === 'dish' || kind === 'plate') return 'bukan-bahan';
  if (!INGREDIENTS[kind].chop) {
    setMessage(state, `${INGREDIENTS[kind].name} tidak perlu dipotong.`);
    return 'tidak-perlu';
  }
  state.board = { kind, progress: 0 };
  state.hand = null;
  return 'potong';
}

/** What happens when the player clicks the wok. */
export function useWok(state) {
  const wok = state.wok;
  if (wok.done) {
    if (state.hand) return 'tangan-penuh';
    state.hand = { kind: 'dish', dish: wok.done };
    wok.done = null;
    return 'ambil-masakan';
  }
  if (wok.cooking > 0) return 'memasak';
  if (!state.hand) return 'kosong';
  const kind = state.hand.kind;
  if (kind === 'dish' || kind === 'plate') return 'bukan-bahan';
  if (kind === 'teh') {
    setMessage(state, 'Teh tidak dimasak — sajikan langsung di piring.');
    return 'tidak-perlu';
  }
  wok.contents.push(kind);
  state.hand = null;
  const recipeId = matchRecipe(wok.contents);
  if (recipeId) {
    wok.cookingRecipe = recipeId;
    wok.cooking = 0.0001; // starts cooking; 0 means idle
    wok.contents = [];
    return 'masak';
  }
  return 'masuk-wajan';
}

/** What happens when the player clicks the plate stack. */
export function usePlateStack(state) {
  if (state.hand && state.hand.kind === 'dish') {
    if (state.plate) return 'piring-penuh';
    state.plate = { dish: state.hand.dish };
    state.hand = null;
    return 'tata-piring';
  }
  if (state.hand) return 'tangan-penuh';
  return 'kosong';
}

/** What happens when the player clicks the plating counter. */
export function usePlateCounter(state) {
  // Tea goes straight onto a plate: no wok, no chopping.
  if (state.hand && state.hand.kind === 'teh') {
    if (state.plate) return 'piring-penuh';
    state.plate = { dish: 'esteh' };
    state.hand = null;
    return 'saji-teh';
  }
  if (state.plate) {
    if (state.hand) return 'tangan-penuh';
    state.hand = { kind: 'plate', dish: state.plate.dish };
    state.plate = null;
    return 'ambil-piring';
  }
  return 'kosong';
}

/** Serve the plated dish in hand to a customer. Returns the coins earned or 0. */
export function serveCustomer(state, customer, x, y) {
  if (!state.hand || state.hand.kind !== 'plate') return 0;
  if (state.hand.dish !== customer.dish) {
    setMessage(state, `Pelanggan mau ${RECIPES[customer.dish].name}, bukan ${RECIPES[state.hand.dish].name}.`);
    return -1;
  }
  const recipe = RECIPES[customer.dish];
  const patienceBonus = Math.round((customer.patience / customer.maxPatience) * 6);
  const comboBonus = Math.min(state.combo, 5) * 2;
  const earned = recipe.price + patienceBonus + comboBonus;
  state.coins += earned;
  state.score += earned * 10;
  state.served += 1;
  state.combo += 1;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  state.hand = null;
  customer.happy = 1.4;
  customer.leaving = true;
  addFloat(state, x, y - 20, `+${earned} koin`, '#ffd76a');
  addParticles(state, x, y, '#ffd76a', 14);
  return earned;
}

/** Advance the world one fixed step. Returns event flags for sounds. */
export function stepState(state, dt) {
  let events = EVENT_NONE;
  state.elapsed += dt;

  // Chopping finishes on its own.
  if (state.board) {
    state.board.progress += dt / CHOP_SECONDS;
    if (state.board.progress >= 1) {
      state.hand = { kind: choppedKind(state.board.kind) };
      state.board = null;
      events |= EVENT_CHOP_DONE;
    }
  }

  // Cooking finishes on its own; steam while it cooks.
  const wok = state.wok;
  if (wok.cooking > 0 && wok.cookingRecipe) {
    const recipe = RECIPES[wok.cookingRecipe];
    wok.cooking += dt / recipe.cook;
    state.sizzle = Math.max(state.sizzle, 0.1);
    if (state.random() < dt * 6) {
      addParticles(state, 730, 430, 'rgba(255,255,255,0.7)', 1);
    }
    if (wok.cooking >= 1) {
      wok.done = wok.cookingRecipe;
      wok.cooking = 0;
      wok.cookingRecipe = null;
      events |= EVENT_COOK_DONE;
    }
  }

  // Customers lose patience; an angry one walks out.
  const dayProgress = 1 - state.timeLeft / DAY_SECONDS;
  for (const customer of state.customers) {
    if (customer.leaving) {
      customer.happy = Math.max(0, customer.happy - dt);
      continue;
    }
    customer.patience -= dt;
    if (customer.patience <= 0) {
      customer.leaving = true;
      customer.patience = 0;
      state.lost += 1;
      state.combo = 0;
      setMessage(state, 'Pelanggan pergi karena terlalu lama menunggu.');
      events |= EVENT_LEFT;
    }
  }
  // Served customers linger a moment smiling, then leave; angry ones leave at once.
  state.customers = state.customers.filter((c) => {
    if (!c.leaving) return true;
    if (c.happy > 0) return true;
    return false;
  });

  // New customers arrive while the day runs.
  if (state.timeLeft > 0 && state.customers.length < MAX_CUSTOMERS) {
    state.spawnIn -= dt;
    if (state.spawnIn <= 0) {
      state.customers.push(createCustomer(state.random, dayProgress));
      state.spawnIn = SPAWN_GAP_SECONDS * (0.85 + state.random() * 0.3);
    }
  }

  // Day timer.
  if (state.timeLeft > 0) {
    state.timeLeft -= dt;
    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      events |= EVENT_OVER;
    }
  }

  // Particles and floating texts fade.
  for (const p of state.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy -= 30 * dt;
  }
  state.particles = state.particles.filter((p) => p.life > 0);
  for (const f of state.floats) {
    f.life -= dt;
    f.y -= 28 * dt;
  }
  state.floats = state.floats.filter((f) => f.life > 0);
  if (state.message && state.elapsed > state.messageUntil) state.message = '';

  return events;
}

/** The order a customer is waiting for, as a readable list of steps. */
export function orderSteps(dishId) {
  const recipe = RECIPES[dishId];
  const steps = [];
  if (recipe.direct) {
    steps.push(`Ambil ${INGREDIENTS[recipe.direct].name}`);
    steps.push('Tata di piring saji');
  } else {
    if (recipe.base) steps.push(`Ambil ${INGREDIENTS[recipe.base].name}`);
    for (const kind of recipe.chopped) steps.push(`Potong ${INGREDIENTS[kind].name}`);
    steps.push('Masak di wajan');
    steps.push('Tata di piring saji');
  }
  return steps;
}

export { BEST_KEY, RECIPE_ORDER, STEP };
