// Warung Senja — config: recipes, prices, layout zones and tuning constants.
// Every name, dish and price here is original to this game.
export const VIEW = { width: 1280, height: 800 };
export const STEP = 1 / 60;
export const DAY_SECONDS = 150;
export const MAX_CUSTOMERS = 4;
export const CHOP_SECONDS = 2.2;
export const BEST_KEY = 'warung-senja-best';

// Ingredients. chop: true means it must be chopped on the board first.
export const INGREDIENTS = {
  nasi: { name: 'Nasi', color: '#f5ecd7', chop: false, key: '1' },
  mie: { name: 'Mie', color: '#f2c14e', chop: false, key: '2' },
  ayam: { name: 'Ayam', color: '#e07856', chop: true, key: '3' },
  sayur: { name: 'Sayur', color: '#5da85d', chop: true, key: '4' },
  telur: { name: 'Telur', color: '#f7e08b', chop: true, key: '5' },
  teh: { name: 'Teh', color: '#b5763a', chop: false, key: '6' },
};
export const INGREDIENT_ORDER = ['nasi', 'mie', 'ayam', 'sayur', 'telur', 'teh'];

// A chopped ingredient is named "<kind>_potong".
export function choppedKind(kind) {
  return `${kind}_potong`;
}

// Recipes: base goes into the wok raw, chopped items go in chopped, then the wok
// cooks for `cook` seconds. A recipe with direct: 'teh' needs no wok at all:
// tea in hand, tapped on the plating counter, becomes the drink.
export const RECIPES = {
  nasgor: {
    name: 'Nasi Goreng Senja',
    base: 'nasi',
    chopped: ['ayam', 'telur'],
    cook: 5,
    price: 18,
    blurb: 'Nasi + ayam potong + telur, digoreng di wajan',
  },
  miekuah: {
    name: 'Mie Kuah Pelangi',
    base: 'mie',
    chopped: ['sayur', 'telur'],
    cook: 5,
    price: 16,
    blurb: 'Mie + sayur potong + telur, kuah hangat',
  },
  sate: {
    name: 'Sate Ember',
    base: null,
    chopped: ['ayam', 'sayur'],
    cook: 4,
    price: 20,
    blurb: 'Ayam potong + sayur potong, dibakar di wajan',
  },
  esteh: {
    name: 'Es Teh Melati',
    base: null,
    chopped: [],
    direct: 'teh',
    cook: 0,
    price: 8,
    blurb: 'Teh diseduh langsung ke piring saji',
  },
};
export const RECIPE_ORDER = ['nasgor', 'miekuah', 'sate', 'esteh'];

// Required wok contents for a recipe, as item kinds (base raw, chopped as *_potong).
export function recipeNeeds(recipeId) {
  const recipe = RECIPES[recipeId];
  const needs = [];
  if (recipe.base) needs.push(recipe.base);
  for (const kind of recipe.chopped) needs.push(choppedKind(kind));
  return needs;
}

// Find the recipe whose needs exactly match the wok contents (order-insensitive).
export function matchRecipe(contents) {
  const sorted = [...contents].sort().join(',');
  for (const id of RECIPE_ORDER) {
    const recipe = RECIPES[id];
    if (recipe.direct) continue;
    if ([...recipeNeeds(id)].sort().join(',') === sorted) return id;
  }
  return null;
}

// Layout zones in logical 1280x800 space. The renderer draws them; input hit-tests them.
export const ZONES = {
  orderBoard: { x: 16, y: 84, w: 296, h: 336 },
  board: { x: 330, y: 400, w: 230, h: 170 },
  wok: { x: 600, y: 380, w: 260, h: 200 },
  plateCounter: { x: 900, y: 400, w: 340, h: 170 },
  plateStack: { x: 918, y: 424, w: 92, h: 92 },
  plateSlot: { x: 1040, y: 420, w: 180, h: 120 },
  bins: INGREDIENT_ORDER.map((kind, i) => ({
    kind,
    x: 60 + i * 200,
    y: 650,
    w: 180,
    h: 126,
  })),
  // Customer i stands in this slot at the serving window (top right).
  customerSlot(i) {
    return { x: 884 + i * 96, y: 88, w: 88, h: 140 };
  },
};

// Tuning for the rush: orders arrive faster and patience shrinks as the day goes on.
export const SPAWN_FIRST_SECONDS = 2;
export const SPAWN_GAP_SECONDS = 13;
export const PATIENCE_SECONDS = 48;
export const PATIENCE_MIN_SECONDS = 30;
export const COMBO_BONUS_PER_LEVEL = 2;
