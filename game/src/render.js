// Warung Senja — render: everything on screen is drawn here with canvas 2D code.
// Warm dusk palette (senja = dusk): orange sky, purple shadows, wooden counters.
// No image assets anywhere; every plate, face and flame is drawn from shapes.
import {
  DAY_SECONDS,
  INGREDIENTS,
  INGREDIENT_ORDER,
  RECIPES,
  RECIPE_ORDER,
  VIEW,
  ZONES,
  choppedKind,
  recipeNeeds,
} from './config.js';
import { SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './state.js';
import { orderSummary, patienceColor, patienceFraction } from './orders.js';

export { SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE };

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

function text(ctx, str, x, y, size, color, align = 'left', weight = 'bold') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px "Trebuchet MS", Verdana, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

/** A small drawn icon for an ingredient kind (raw or chopped). */
export function drawIngredientIcon(ctx, kind, x, y, r) {
  circle(ctx, x, y, r);
  ctx.fillStyle = '#fff8e6';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(90,50,20,0.35)';
  ctx.stroke();
  ctx.save();
  ctx.translate(x, y);
  if (kind === 'nasi') {
    ctx.fillStyle = '#f5ecd7';
    for (let i = 0; i < 7; i += 1) {
      const a = (i / 7) * Math.PI * 2;
      circle(ctx, Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.45, r * 0.2);
      ctx.fillStyle = i % 2 ? '#efe2c2' : '#fbf6e8';
      ctx.fill();
    }
  } else if (kind === 'mie') {
    ctx.strokeStyle = '#e8a93c';
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.arc(0, 0, r * (0.35 + i * 0.22), 0.4 + i, 2.4 + i);
      ctx.stroke();
    }
  } else if (kind === 'ayam') {
    ctx.fillStyle = '#e07856';
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.75, r * 0.55, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2a88f';
    circle(ctx, r * 0.35, -r * 0.3, r * 0.22);
    ctx.fill();
  } else if (kind === 'ayam_potong') {
    ctx.fillStyle = '#e07856';
    for (let i = 0; i < 3; i += 1) {
      ctx.save();
      ctx.rotate((i - 1) * 0.5);
      ctx.fillRect(-r * 0.55, -r * 0.2, r * 1.1, r * 0.4);
      ctx.restore();
    }
  } else if (kind === 'sayur') {
    ctx.fillStyle = '#5da85d';
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.7, r * 0.45, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3f7d3f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, 0);
    ctx.lineTo(r * 0.5, 0);
    ctx.stroke();
  } else if (kind === 'sayur_potong') {
    ctx.fillStyle = '#5da85d';
    for (let i = 0; i < 4; i += 1) {
      const a = (i / 4) * Math.PI * 2;
      circle(ctx, Math.cos(a) * r * 0.4, Math.sin(a) * r * 0.4, r * 0.24);
      ctx.fill();
    }
  } else if (kind === 'telur') {
    ctx.fillStyle = '#f7e08b';
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.55, r * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'telur_potong') {
    ctx.fillStyle = '#fff6d8';
    circle(ctx, 0, 0, r * 0.7);
    ctx.fill();
    ctx.fillStyle = '#f2b13c';
    circle(ctx, 0, 0, r * 0.34);
    ctx.fill();
  } else if (kind === 'teh') {
    ctx.fillStyle = '#b5763a';
    ctx.fillRect(-r * 0.5, -r * 0.6, r, r * 1.2);
    ctx.fillStyle = '#d9a05f';
    ctx.fillRect(-r * 0.5, -r * 0.6, r, r * 0.3);
    ctx.strokeStyle = '#8a5a28';
    ctx.lineWidth = 2;
    ctx.strokeRect(-r * 0.5, -r * 0.6, r, r * 1.2);
  }
  ctx.restore();
}

/** A finished dish drawn on a plate (or in a glass for tea). */
export function drawDish(ctx, dishId, x, y, size) {
  const s = size / 2;
  if (dishId === 'esteh') {
    // Glass of iced tea with a jasmine sprig.
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.moveTo(x - s * 0.55, y - s * 0.7);
    ctx.lineTo(x + s * 0.55, y - s * 0.7);
    ctx.lineTo(x + s * 0.4, y + s * 0.8);
    ctx.lineTo(x - s * 0.4, y + s * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#c07a2e';
    ctx.beginPath();
    ctx.moveTo(x - s * 0.45, y - s * 0.3);
    ctx.lineTo(x + s * 0.45, y - s * 0.3);
    ctx.lineTo(x + s * 0.35, y + s * 0.65);
    ctx.lineTo(x - s * 0.35, y + s * 0.65);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e8f4f4';
    ctx.fillRect(x - s * 0.2, y - s * 0.5, s * 0.22, s * 0.22);
    ctx.fillRect(x + s * 0.05, y - s * 0.35, s * 0.18, s * 0.18);
    ctx.strokeStyle = '#5da85d';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + s * 0.3, y - s * 0.75);
    ctx.lineTo(x + s * 0.55, y - s * 1.05);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    circle(ctx, x + s * 0.55, y - s * 1.05, s * 0.14);
    ctx.fill();
    return;
  }
  // Plate.
  circle(ctx, x, y, s);
  ctx.fillStyle = '#fdfbf4';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#d8cbb2';
  ctx.stroke();
  circle(ctx, x, y, s * 0.72);
  ctx.strokeStyle = '#e8ddc8';
  ctx.stroke();

  if (dishId === 'nasgor') {
    // Golden fried-rice mound, fried egg on top, chicken strips.
    ctx.fillStyle = '#e8a93c';
    ctx.beginPath();
    ctx.ellipse(x, y, s * 0.62, s * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d18f28';
    for (let i = 0; i < 5; i += 1) {
      circle(ctx, x - s * 0.4 + i * s * 0.2, y + (i % 2 ? s * 0.12 : -s * 0.08), s * 0.06);
      ctx.fill();
    }
    ctx.fillStyle = '#fff6d8';
    ctx.beginPath();
    ctx.ellipse(x + s * 0.1, y - s * 0.18, s * 0.34, s * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2b13c';
    circle(ctx, x + s * 0.1, y - s * 0.18, s * 0.15);
    ctx.fill();
    ctx.fillStyle = '#e07856';
    ctx.fillRect(x - s * 0.55, y + s * 0.28, s * 0.5, s * 0.14);
    ctx.fillRect(x + s * 0.1, y + s * 0.34, s * 0.45, s * 0.14);
  } else if (dishId === 'miekuah') {
    // Bowl of noodle soup with greens and egg.
    ctx.fillStyle = '#f2c14e';
    ctx.beginPath();
    ctx.ellipse(x, y, s * 0.62, s * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d18f28';
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.arc(x, y, s * (0.2 + i * 0.16), 0.3 + i * 0.7, 2.2 + i * 0.7);
      ctx.stroke();
    }
    ctx.fillStyle = '#5da85d';
    ctx.beginPath();
    ctx.ellipse(x - s * 0.35, y - s * 0.2, s * 0.22, s * 0.12, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff6d8';
    circle(ctx, x + s * 0.3, y - s * 0.15, s * 0.18);
    ctx.fill();
    ctx.fillStyle = '#f2b13c';
    circle(ctx, x + s * 0.3, y - s * 0.15, s * 0.09);
    ctx.fill();
  } else if (dishId === 'sate') {
    // Two skewers over a small ember glow.
    ctx.fillStyle = '#c65a2e';
    ctx.beginPath();
    ctx.ellipse(x, y + s * 0.3, s * 0.55, s * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let row = 0; row < 2; row += 1) {
      const yy = y - s * 0.25 + row * s * 0.3;
      ctx.strokeStyle = '#a8763e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - s * 0.7, yy);
      ctx.lineTo(x + s * 0.7, yy);
      ctx.stroke();
      ctx.fillStyle = '#8a4a22';
      for (let i = 0; i < 3; i += 1) {
        circle(ctx, x - s * 0.42 + i * s * 0.42, yy, s * 0.16);
        ctx.fill();
      }
    }
  }
}

function drawBackground(ctx, t) {
  // Dusk wall.
  const wall = ctx.createLinearGradient(0, 0, 0, 420);
  wall.addColorStop(0, '#3d2b52');
  wall.addColorStop(0.55, '#8a4a5e');
  wall.addColorStop(1, '#e0784a');
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, VIEW.width, 420);
  // Setting sun in the window.
  ctx.fillStyle = '#2c2138';
  roundRect(ctx, 560, 30, 320, 170, 12);
  ctx.fill();
  const sun = ctx.createRadialGradient(720, 150, 8, 720, 150, 90);
  sun.addColorStop(0, '#ffd76a');
  sun.addColorStop(0.6, '#f28c3c');
  sun.addColorStop(1, 'rgba(242,140,60,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(600, 50, 240, 130);
  circle(ctx, 720, 150, 34);
  ctx.fillStyle = '#ffb347';
  ctx.fill();
  ctx.fillStyle = '#3d2b52';
  ctx.fillRect(716, 30, 8, 170);
  ctx.fillRect(560, 112, 320, 8);
  // String lights.
  for (let i = 0; i < 12; i += 1) {
    const x = 60 + i * 105;
    const y = 24 + Math.sin(i * 1.3) * 6 + (i % 2 ? 8 : 0);
    const glow = 0.6 + 0.3 * Math.sin(t * 2 + i);
    ctx.fillStyle = `rgba(255,215,106,${glow})`;
    circle(ctx, x, y, 6);
    ctx.fill();
  }
  // Wooden floor.
  ctx.fillStyle = '#7a5230';
  ctx.fillRect(0, 420, VIEW.width, 380);
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  for (let y = 420; y < 800; y += 46) ctx.fillRect(0, y, VIEW.width, 3);
  for (let y = 420; y < 800; y += 46) {
    for (let x = (y % 92 ? 0 : 320); x < VIEW.width; x += 640) ctx.fillRect(x, y, 3, 46);
  }
  // Warm rug under the stations.
  ctx.fillStyle = '#a34a3a';
  roundRect(ctx, 300, 600, 680, 170, 14);
  ctx.fill();
  ctx.strokeStyle = '#e8c98a';
  ctx.lineWidth = 3;
  roundRect(ctx, 312, 612, 656, 146, 10);
  ctx.stroke();
}

function drawHud(ctx, state, screen, best) {
  ctx.fillStyle = 'rgba(28,18,38,0.92)';
  ctx.fillRect(0, 0, VIEW.width, 64);
  text(ctx, 'WARUNG SENJA', 24, 33, 26, '#ffd76a');
  text(ctx, 'warung kecil, rasa besar', 252, 36, 13, '#e8c9a8', 'left', 'normal');
  // Day timer: bar + seconds.
  const frac = state.timeLeft / DAY_SECONDS;
  ctx.fillStyle = '#241a30';
  roundRect(ctx, 480, 20, 320, 24, 12);
  ctx.fill();
  ctx.fillStyle = frac > 0.4 ? '#58b368' : frac > 0.18 ? '#e8a13a' : '#d94f3d';
  roundRect(ctx, 482, 22, 316 * frac, 20, 10);
  ctx.fill();
  text(ctx, `⏱ ${Math.ceil(state.timeLeft)} dtk`, 640, 33, 15, '#fff', 'center');
  text(ctx, `Hari ${state.day}`, 420, 33, 15, '#e8c9a8');
  // Coins, score, combo, served.
  text(ctx, `🪙 ${state.coins}`, 860, 33, 20, '#ffd76a');
  text(ctx, `Skor ${state.score}`, 990, 33, 16, '#fff');
  if (state.combo >= 2) text(ctx, `Combo x${state.combo}`, 1090, 33, 16, '#ff9d5c');
}

function drawOrderBoard(ctx, state) {
  const z = ZONES.orderBoard;
  ctx.fillStyle = '#5b3a24';
  roundRect(ctx, z.x, z.y, z.w, z.h, 12);
  ctx.fill();
  ctx.fillStyle = '#6e4729';
  roundRect(ctx, z.x + 6, z.y + 6, z.w - 12, z.h - 12, 8);
  ctx.fill();
  text(ctx, '📋 PAPAN PESANAN', z.x + 16, z.y + 24, 17, '#ffd76a');
  if (state.customers.length === 0) {
    text(ctx, 'Belum ada pesanan…', z.x + 16, z.y + 70, 14, '#e8c9a8', 'left', 'normal');
    text(ctx, 'Pelanggan pertama', z.x + 16, z.y + 94, 14, '#e8c9a8', 'left', 'normal');
    text(ctx, 'segera datang!', z.x + 16, z.y + 114, 14, '#e8c9a8', 'left', 'normal');
  }
  state.customers.forEach((customer, i) => {
    const y = z.y + 42 + i * 66;
    const leaving = customer.leaving;
    ctx.fillStyle = leaving ? 'rgba(253,251,244,0.55)' : '#fdfbf4';
    roundRect(ctx, z.x + 12, y, z.w - 24, 58, 8);
    ctx.fill();
    drawDish(ctx, customer.dish, z.x + 42, y + 29, 44);
    text(ctx, RECIPES[customer.dish].name, z.x + 72, y + 15, 13, '#3a2415');
    text(ctx, orderSummary(customer.dish), z.x + 72, y + 34, 12, '#7a5230', 'left', 'normal');
    // Patience bar.
    const barX = z.x + 72;
    const barW = z.w - 24 - 72 - 12;
    ctx.fillStyle = '#e5d9c3';
    roundRect(ctx, barX, y + 44, barW, 8, 4);
    ctx.fill();
    ctx.fillStyle = patienceColor(customer);
    roundRect(ctx, barX, y + 44, barW * patienceFraction(customer), 8, 4);
    ctx.fill();
    if (customer.happy > 0) text(ctx, '😊', z.x + z.w - 34, y + 15, 18, '#000');
    else if (patienceFraction(customer) < 0.28) text(ctx, '😠', z.x + z.w - 34, y + 15, 18, '#000');
  });
  text(ctx, 'Klik pelanggan untuk menyajikan piring.', z.x + 16, z.y + z.h - 12, 12, '#e8c9a8', 'left', 'normal');
}

function drawCustomers(ctx, state) {
  // Serving window shelf.
  ctx.fillStyle = '#3d2b52';
  roundRect(ctx, 860, 84, 404, 150, 12);
  ctx.fill();
  ctx.fillStyle = '#6e4729';
  ctx.fillRect(860, 224, 404, 14);
  text(ctx, 'JENDELA SAJI', 872, 232, 12, '#e8c9a8');
  state.customers.forEach((customer, i) => {
    const slot = ZONES.customerSlot(i);
    const cx = slot.x + slot.w / 2;
    const cy = slot.y + 78;
    if (customer.leaving && customer.happy <= 0) return; // already walked out
    // Body.
    ctx.fillStyle = customer.shirt;
    roundRect(ctx, cx - 26, cy - 6, 52, 52, 10);
    ctx.fill();
    // Head.
    circle(ctx, cx, cy - 28, 24);
    ctx.fillStyle = customer.skin;
    ctx.fill();
    // Hair.
    ctx.fillStyle = '#2e2118';
    if (customer.hair === 0) {
      ctx.beginPath();
      ctx.arc(cx, cy - 32, 24, Math.PI, 0);
      ctx.fill();
    } else if (customer.hair === 1) {
      circle(ctx, cx - 14, cy - 48, 8);
      ctx.fill();
      circle(ctx, cx + 14, cy - 48, 8);
      ctx.fill();
    } else {
      ctx.fillRect(cx - 24, cy - 52, 48, 10);
    }
    // Face: eyes + mouth by mood.
    ctx.fillStyle = '#2e2118';
    circle(ctx, cx - 9, cy - 28, 2.5);
    ctx.fill();
    circle(ctx, cx + 9, cy - 28, 2.5);
    ctx.fill();
    ctx.strokeStyle = '#2e2118';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (customer.happy > 0) ctx.arc(cx, cy - 18, 8, 0.15 * Math.PI, 0.85 * Math.PI);
    else if (patienceFraction(customer) < 0.28) ctx.arc(cx, cy - 8, 8, 1.15 * Math.PI, 1.85 * Math.PI);
    else ctx.arc(cx, cy - 14, 7, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    // Wanted dish bubble.
    ctx.fillStyle = '#fdfbf4';
    circle(ctx, cx + 30, cy - 52, 20);
    ctx.fill();
    ctx.strokeStyle = '#d8cbb2';
    ctx.lineWidth = 2;
    ctx.stroke();
    drawDish(ctx, customer.dish, cx + 30, cy - 52, 30);
  });
}

function drawBins(ctx, state, pointer) {
  ctx.fillStyle = '#5b3a24';
  roundRect(ctx, 40, 612, 1200, 172, 14);
  ctx.fill();
  text(ctx, 'BAHAN — klik untuk mengambil (tombol 1–6)', 60, 634, 14, '#ffd76a');
  for (const bin of ZONES.bins) {
    const info = INGREDIENTS[bin.kind];
    const hover = pointer.x >= bin.x && pointer.x < bin.x + bin.w && pointer.y >= bin.y && pointer.y < bin.y + bin.h;
    ctx.fillStyle = hover ? '#8a5f36' : '#6e4729';
    roundRect(ctx, bin.x, bin.y, bin.w, bin.h, 10);
    ctx.fill();
    ctx.strokeStyle = '#a8763e';
    ctx.lineWidth = 2;
    roundRect(ctx, bin.x + 4, bin.y + 4, bin.w - 8, bin.h - 8, 8);
    ctx.stroke();
    drawIngredientIcon(ctx, bin.kind, bin.x + bin.w / 2, bin.y + 42, 24);
    text(ctx, info.name, bin.x + bin.w / 2, bin.y + 84, 15, '#fff', 'center');
    text(ctx, `[${info.key}]`, bin.x + bin.w / 2, bin.y + 100, 12, '#e8c9a8', 'center', 'normal');
    if (info.chop) text(ctx, 'perlu dipotong', bin.x + bin.w / 2, bin.y + 114, 11, '#cbb8d8', 'center', 'normal');
  }
}

function drawBoard(ctx, state) {
  const z = ZONES.board;
  ctx.fillStyle = '#5b3a24';
  roundRect(ctx, z.x - 10, z.y - 10, z.w + 20, z.h + 20, 12);
  ctx.fill();
  text(ctx, 'TALENAN', z.x + 8, z.y + 2, 14, '#ffd76a');
  // Cutting board.
  ctx.fillStyle = '#e8c98a';
  roundRect(ctx, z.x, z.y + 18, z.w, z.h - 18, 10);
  ctx.fill();
  ctx.strokeStyle = '#c9a86a';
  ctx.lineWidth = 2;
  roundRect(ctx, z.x + 6, z.y + 24, z.w - 12, z.h - 30, 8);
  ctx.stroke();
  if (state.board) {
    const kind = state.board.kind;
    drawIngredientIcon(ctx, choppedKind(kind), z.x + z.w / 2 - 30, z.y + 90, 24);
    drawIngredientIcon(ctx, choppedKind(kind), z.x + z.w / 2 + 30, z.y + 90, 24);
    // Knife.
    ctx.fillStyle = '#cfd6dd';
    ctx.beginPath();
    ctx.moveTo(z.x + z.w - 70, z.y + 40);
    ctx.lineTo(z.x + z.w - 20, z.y + 40);
    ctx.lineTo(z.x + z.w - 28, z.y + 58);
    ctx.lineTo(z.x + z.w - 70, z.y + 58);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#5b3a24';
    ctx.fillRect(z.x + z.w - 78, z.y + 42, 12, 14);
    // Progress bar.
    ctx.fillStyle = '#d8cbb2';
    roundRect(ctx, z.x + 20, z.y + z.h - 28, z.w - 40, 12, 6);
    ctx.fill();
    ctx.fillStyle = '#58b368';
    roundRect(ctx, z.x + 20, z.y + z.h - 28, (z.w - 40) * state.board.progress, 12, 6);
    ctx.fill();
    text(ctx, 'Memotong…', z.x + z.w / 2, z.y + z.h - 44, 13, '#3a2415', 'center');
  } else {
    text(ctx, 'Klik dengan bahan', z.x + z.w / 2, z.y + 80, 14, '#7a5230', 'center', 'normal');
    text(ctx, 'yang perlu dipotong', z.x + z.w / 2, z.y + 102, 14, '#7a5230', 'center', 'normal');
    // Resting knife.
    ctx.fillStyle = '#cfd6dd';
    ctx.fillRect(z.x + z.w - 90, z.y + 40, 60, 12);
    ctx.fillStyle = '#5b3a24';
    ctx.fillRect(z.x + z.w - 100, z.y + 42, 12, 8);
  }
}

function drawWok(ctx, state, t) {
  const z = ZONES.wok;
  ctx.fillStyle = '#4a3a52';
  roundRect(ctx, z.x - 10, z.y - 10, z.w + 20, z.h + 20, 12);
  ctx.fill();
  text(ctx, 'KOMPOR & WAJAN', z.x + 8, z.y + 2, 14, '#ffd76a');
  // Stove body.
  ctx.fillStyle = '#3a3340';
  roundRect(ctx, z.x + 20, z.y + 120, z.w - 40, 56, 10);
  ctx.fill();
  // Flames under the wok when cooking.
  const cooking = state.wok.cooking > 0;
  if (cooking) {
    for (let i = 0; i < 5; i += 1) {
      const fx = z.x + 60 + i * 32;
      const fh = 18 + 8 * Math.sin(t * 9 + i * 1.7);
      ctx.fillStyle = i % 2 ? '#f28c3c' : '#ffd76a';
      ctx.beginPath();
      ctx.moveTo(fx - 10, z.y + 122);
      ctx.quadraticCurveTo(fx, z.y + 122 - fh - 10, fx + 10, z.y + 122);
      ctx.closePath();
      ctx.fill();
    }
  }
  // Wok.
  ctx.fillStyle = '#2c2c34';
  ctx.beginPath();
  ctx.ellipse(z.x + z.w / 2, z.y + 92, 96, 34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3d3d48';
  ctx.beginPath();
  ctx.ellipse(z.x + z.w / 2, z.y + 88, 88, 28, 0, 0, Math.PI * 2);
  ctx.fill();
  // Contents or finished dish.
  if (state.wok.done) {
    drawDish(ctx, state.wok.done, z.x + z.w / 2, z.y + 88, 84);
    text(ctx, `${RECIPES[state.wok.done].name} siap!`, z.x + z.w / 2, z.y + 152, 13, '#ffd76a', 'center');
  } else if (cooking) {
    const recipe = RECIPES[state.wok.cookingRecipe];
    const needs = recipeNeeds(state.wok.cookingRecipe);
    needs.forEach((kind, i) => {
      drawIngredientIcon(ctx, kind, z.x + 60 + i * 52, z.y + 88, 16);
    });
    // Cooking progress as a bar along the bottom of the panel.
    ctx.fillStyle = '#241a30';
    roundRect(ctx, z.x + 20, z.y + z.h - 16, z.w - 40, 10, 5);
    ctx.fill();
    ctx.fillStyle = '#ffd76a';
    roundRect(ctx, z.x + 20, z.y + z.h - 16, (z.w - 40) * state.wok.cooking, 10, 5);
    ctx.fill();
    text(ctx, `Memasak ${recipe.name}…`, z.x + z.w / 2, z.y + 152, 13, '#fff', 'center');
  } else if (state.wok.contents.length > 0) {
    state.wok.contents.forEach((kind, i) => {
      drawIngredientIcon(ctx, kind, z.x + 60 + i * 52, z.y + 88, 16);
    });
    text(ctx, 'Tambah bahan sampai resep lengkap', z.x + z.w / 2, z.y + 152, 12, '#e8c9a8', 'center', 'normal');
  } else {
    text(ctx, 'Klik dengan bahan untuk', z.x + z.w / 2, z.y + 84, 13, '#cbb8d8', 'center', 'normal');
    text(ctx, 'memasukkan ke wajan', z.x + z.w / 2, z.y + 104, 13, '#cbb8d8', 'center', 'normal');
  }
}

function drawPlating(ctx, state) {
  const z = ZONES.plateCounter;
  ctx.fillStyle = '#5b3a24';
  roundRect(ctx, z.x - 10, z.y - 10, z.w + 20, z.h + 20, 12);
  ctx.fill();
  text(ctx, 'MEJA SAJI', z.x + 8, z.y + 2, 14, '#ffd76a');
  ctx.fillStyle = '#e8e0d0';
  roundRect(ctx, z.x, z.y + 18, z.w, z.h - 18, 10);
  ctx.fill();
  // Plate stack.
  const ps = ZONES.plateStack;
  for (let i = 0; i < 3; i += 1) {
    circle(ctx, ps.x + ps.w / 2, ps.y + ps.h - 8 - i * 7, 34);
    ctx.fillStyle = '#fdfbf4';
    ctx.fill();
    ctx.strokeStyle = '#d8cbb2';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  text(ctx, 'Piring', ps.x + ps.w / 2, ps.y + ps.h + 2, 12, '#3a2415', 'center', 'normal');
  // Plated dish waiting.
  if (state.plate) {
    const slot = ZONES.plateSlot;
    drawDish(ctx, state.plate.dish, slot.x + slot.w / 2, slot.y + slot.h / 2, 110);
    text(ctx, RECIPES[state.plate.dish].name, slot.x + slot.w / 2, slot.y + slot.h - 4, 13, '#3a2415', 'center');
    text(ctx, 'Siap disajikan!', slot.x + slot.w / 2, slot.y - 8, 12, '#58b368', 'center');
  } else {
    text(ctx, 'Tata masakan di sini,', ZONES.plateSlot.x + 90, ZONES.plateSlot.y + 50, 13, '#7a5230', 'center', 'normal');
    text(ctx, 'lalu sajikan.', ZONES.plateSlot.x + 90, ZONES.plateSlot.y + 72, 13, '#7a5230', 'center', 'normal');
  }
}

function drawHand(ctx, state, pointer) {
  if (!state.hand || !pointer) return;
  const { x, y } = pointer;
  ctx.save();
  ctx.globalAlpha = 0.95;
  if (state.hand.kind === 'dish') {
    drawDish(ctx, state.hand.dish, x, y - 14, 64);
  } else if (state.hand.kind === 'plate') {
    drawDish(ctx, state.hand.dish, x, y - 14, 64);
    text(ctx, '🍽', x + 26, y - 34, 18, '#000');
  } else {
    drawIngredientIcon(ctx, state.hand.kind, x, y - 14, 26);
  }
  ctx.restore();
}

function drawParticles(ctx, state) {
  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    circle(ctx, p.x, p.y, p.size);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const f of state.floats) {
    ctx.globalAlpha = Math.max(0, f.life / f.max);
    text(ctx, f.text, f.x, f.y, 20, f.color, 'center');
  }
  ctx.globalAlpha = 1;
}

function drawMessage(ctx, state) {
  if (!state.message) return;
  ctx.fillStyle = 'rgba(28,18,38,0.9)';
  const w = ctx.measureText(state.message).width + 40;
  roundRect(ctx, VIEW.width / 2 - w / 2, 596, w, 34, 17);
  ctx.fill();
  text(ctx, state.message, VIEW.width / 2, 614, 15, '#ffd76a', 'center', 'normal');
}

function drawOverlay(ctx, state, screen, best) {
  ctx.fillStyle = 'rgba(28,18,38,0.78)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  if (screen === SCREEN_TITLE) {
    text(ctx, 'WARUNG SENJA', VIEW.width / 2, 210, 64, '#ffd76a', 'center');
    text(ctx, 'Warung kecil, rasa besar — masak pesanan sebelum pelanggan kehabisan sabar!', VIEW.width / 2, 272, 20, '#fff', 'center', 'normal');
    text(ctx, '1  Ambil bahan dari peti   •   2  Potong di talenan   •   3  Masak di wajan', VIEW.width / 2, 330, 18, '#e8c9a8', 'center', 'normal');
    text(ctx, '4  Tata di piring   •   5  Klik pelanggan untuk menyajikan   •   Es teh langsung disaji', VIEW.width / 2, 360, 18, '#e8c9a8', 'center', 'normal');
    text(ctx, 'Menu: Nasi Goreng Senja · Mie Kuah Pelangi · Sate Ember · Es Teh Melati', VIEW.width / 2, 400, 17, '#ffd76a', 'center', 'normal');
    ctx.fillStyle = '#d94f3d';
    roundRect(ctx, VIEW.width / 2 - 150, 450, 300, 56, 28);
    ctx.fill();
    text(ctx, '▶  MULAI HARI', VIEW.width / 2, 479, 22, '#fff', 'center');
    text(ctx, 'Klik atau tekan Spasi', VIEW.width / 2, 540, 15, '#cbb8d8', 'center', 'normal');
    if (best > 0) text(ctx, `Skor terbaik: ${best}`, VIEW.width / 2, 580, 15, '#ffd76a', 'center', 'normal');
  } else if (screen === SCREEN_PAUSED) {
    text(ctx, 'JEDA', VIEW.width / 2, 360, 56, '#ffd76a', 'center');
    text(ctx, 'Tekan P atau klik untuk lanjut memasak.', VIEW.width / 2, 430, 18, '#fff', 'center', 'normal');
  } else if (screen === SCREEN_OVER) {
    text(ctx, 'HARI SELESAI', VIEW.width / 2, 230, 56, '#ffd76a', 'center');
    text(ctx, `Koin hari ini: ${state.coins}   •   Pesanan tersaji: ${state.served}   •   Pelanggan pergi: ${state.lost}`, VIEW.width / 2, 310, 20, '#fff', 'center', 'normal');
    text(ctx, `Skor: ${state.score}   •   Combo terbaik: x${state.bestCombo}   •   Skor terbaik: ${Math.max(best, state.score)}`, VIEW.width / 2, 350, 18, '#e8c9a8', 'center', 'normal');
    const verdict = state.served >= 8 ? 'Warungmu ramai sekali! Para pelanggan pulang senang.' : state.served >= 4 ? 'Hari yang lumayan — besok bisa lebih ramai lagi.' : 'Hari yang sepi… latihan lagi besok, ya!';
    text(ctx, verdict, VIEW.width / 2, 400, 18, '#ffd76a', 'center', 'normal');
    ctx.fillStyle = '#58b368';
    roundRect(ctx, VIEW.width / 2 - 150, 450, 300, 56, 28);
    ctx.fill();
    text(ctx, '↻  MASAK LAGI (R)', VIEW.width / 2, 479, 22, '#fff', 'center');
  }
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  return {
    draw(state, screen, best, pointer, muted, t) {
      drawBackground(ctx, t);
      drawHud(ctx, state, screen, best);
      drawOrderBoard(ctx, state);
      drawCustomers(ctx, state);
      drawBoard(ctx, state);
      drawWok(ctx, state, t);
      drawPlating(ctx, state);
      drawBins(ctx, state, pointer || { x: -1, y: -1 });
      drawParticles(ctx, state);
      drawMessage(ctx, state);
      drawHand(ctx, state, pointer);
      if (muted) text(ctx, '🔇 Suara mati (M)', VIEW.width - 16, 84, 13, '#cbb8d8', 'right', 'normal');
      if (screen !== SCREEN_PLAY) drawOverlay(ctx, state, screen, best);
    },
  };
}
