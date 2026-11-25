// Warung Senja — orders: generating customer orders and reading their patience.
// The board shows up to MAX_CUSTOMERS tickets; each ticket is one dish plus a
// patience bar that drains while the customer waits at the serving window.
import { MAX_CUSTOMERS, RECIPES } from './config.js';
import { createCustomer } from './state.js';

/** Fill the board with the opening orders of a fresh day. */
export function openingOrders(state, count) {
  for (let i = 0; i < count && state.customers.length < MAX_CUSTOMERS; i += 1) {
    state.customers.push(createCustomer(state.random, 0));
  }
}

/** 0..1, how much patience a customer has left. */
export function patienceFraction(customer) {
  if (customer.maxPatience <= 0) return 0;
  return Math.max(0, Math.min(1, customer.patience / customer.maxPatience));
}

/** The patience bar colour: green while calm, amber while worried, red when angry. */
export function patienceColor(customer) {
  const f = patienceFraction(customer);
  if (f > 0.55) return '#58b368';
  if (f > 0.28) return '#e8a13a';
  return '#d94f3d';
}

/** One-line summary of a ticket for the board: "Nasi Goreng Senja — 18 koin". */
export function orderSummary(dishId) {
  const recipe = RECIPES[dishId];
  return `${recipe.name} — ${recipe.price} koin`;
}

/** How many customers are waiting (not counting ones already leaving). */
export function waitingCount(state) {
  return state.customers.filter((c) => !c.leaving).length;
}

/** The customer standing in slot i, or null. */
export function customerInSlot(state, i) {
  return state.customers[i] ?? null;
}
