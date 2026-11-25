// Warung Senja — shots: deterministic screenshot scenes behind ?shot=1|2|3|4.
// Each scene builds a real game state (orders, wok, board, plate) and returns the
// screen to draw over it, so every screenshot is a genuine render of the game code.
import { DAY_SECONDS } from './config.js';
import {
  SCREEN_OVER,
  SCREEN_PLAY,
  SCREEN_TITLE,
  createCustomer,
  resetState,
} from './state.js';

/** Put a customer with a fixed dish on the board (deterministic, no RNG). */
function fixedCustomer(state, dish, patience, maxPatience) {
  const customer = createCustomer(state.random, 0);
  customer.dish = dish;
  customer.patience = patience;
  customer.maxPatience = maxPatience;
  customer.leaving = false;
  customer.happy = 0;
  state.customers.push(customer);
  return customer;
}

/**
 * Stage scene `name` on `state` and return the screen to draw.
 * 1 = kitchen at the start of the day, 2 = one dish mid-assembly,
 * 3 = the service rush, 4 = a plate ready to serve (plus a served dish's coins).
 */
export function stageShot(name, state) {
  resetState(state);
  state.screen = SCREEN_PLAY;
  if (name === '2') {
    // Mid-assembly: chopping an egg, the wok cooking nasi goreng, one order waiting.
    state.timeLeft = 118;
    state.coins = 34;
    state.score = 340;
    state.served = 2;
    fixedCustomer(state, 'nasgor', 34, 48);
    fixedCustomer(state, 'miekuah', 40, 48);
    state.board = { kind: 'telur', progress: 0.55 };
    state.wok = { contents: [], cooking: 0.45, cookingRecipe: 'nasgor', done: null };
    state.hand = { kind: 'ayam_potong' };
    return { screen: SCREEN_PLAY };
  }
  if (name === '3') {
    // Rush: four orders, the clock nearly out, the wok full and a plate waiting.
    state.timeLeft = 18;
    state.coins = 96;
    state.score = 960;
    state.served = 6;
    state.combo = 3;
    fixedCustomer(state, 'nasgor', 9, 48);
    fixedCustomer(state, 'sate', 16, 42);
    fixedCustomer(state, 'miekuah', 24, 48);
    fixedCustomer(state, 'esteh', 30, 40);
    state.wok = { contents: [], cooking: 0.7, cookingRecipe: 'sate', done: null };
    state.plate = { dish: 'miekuah' };
    state.hand = { kind: 'sayur_potong' };
    return { screen: SCREEN_PLAY };
  }
  if (name === '4') {
    // Serve: a plated nasi goreng on the counter, coins in the air, happy customer.
    state.timeLeft = 74;
    state.coins = 52;
    state.score = 520;
    state.served = 3;
    const happy = fixedCustomer(state, 'nasgor', 40, 48);
    happy.happy = 1.4;
    happy.leaving = true;
    fixedCustomer(state, 'esteh', 36, 40);
    state.plate = { dish: 'nasgor' };
    state.hand = { kind: 'plate', dish: 'nasgor' };
    return { screen: SCREEN_PLAY };
  }
  // Shot 1 (and anything else): the kitchen at the start of the day.
  state.timeLeft = DAY_SECONDS;
  state.coins = 0;
  state.score = 0;
  fixedCustomer(state, 'nasgor', 44, 48);
  fixedCustomer(state, 'esteh', 38, 40);
  return { screen: SCREEN_PLAY };
}

export { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE };
