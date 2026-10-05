// Run against a built preview with Node 22:
//   node --experimental-strip-types scripts/verify-solitaire-polish.mjs [URL]
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import {
  SUITS,
  createGame,
  validateState,
  emptyFoundations,
} from '../src/components/games/solitaireEngine.ts';

const base = (process.argv[2] || 'http://127.0.0.1:4331').replace(/\/$/, '');
const out = 'shots/games-polish';
await mkdir(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const errors = [];

const makeContext = async (options = {}) => {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, ...options });
  ctx.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  return ctx;
};

const wait = async (fn, message) => {
  for (let i = 0; i < 60; i += 1) {
    if (await fn()) return;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error(message);
};

const saved = page => page.evaluate(() => JSON.parse(localStorage.getItem('pg_solitaire_v1')));
const arrangement = state => ({
  tableaus: state.tableaus,
  foundations: state.foundations,
  stock: state.stock,
  waste: state.waste,
  drawCount: state.drawCount,
  dailyDate: state.dailyDate,
  won: state.won,
});
const shot = (page, name) => page.screenshot({ path: `${out}/${name}.png` });

const seed = async (ctx, state) => ctx.addInitScript(data => {
  if (location.protocol === 'http:' || location.protocol === 'https:') {
    if (!localStorage.getItem('pg_solitaire_v1')) {
      localStorage.setItem('pg_solitaire_v1', JSON.stringify({ version: 1, ...data }));
    }
  }
}, state);

const openSolitaire = async (page) => {
  await page.goto(`${base}/games/`, { waitUntil: 'load' });
  await page.getByRole('button', { name: 'Solitaire', exact: true }).click();
  await page.locator('.solitaire-board').waitFor();
  await page.waitForTimeout(250);
};

const allCards = () => SUITS.flatMap(suit => Array.from({ length: 13 }, (_, i) => ({
  id: `${suit}-${i + 1}`,
  suit,
  rank: i + 1,
  faceUp: false,
})));

// Build valid, complete 52-card fixtures without accidentally duplicating cards.
const fixture = ({
  tableaus = Array.from({ length: 7 }, () => []),
  foundations = {},
  stock = null,
  waste = [],
  drawCount = 1,
  dailyDate = null,
} = {}) => {
  const remaining = allCards();
  const take = id => {
    const index = remaining.findIndex(card => card.id === id);
    assert.notEqual(index, -1, `fixture card ${id} is available exactly once`);
    return { ...remaining.splice(index, 1)[0], faceUp: true };
  };
  const used = ids => ids.map(id => take(id));
  const nextTableaus = tableaus.map(pile => used(pile));
  const nextFoundations = Object.fromEntries(SUITS.map(suit => [suit, used(foundations[suit] || [])]));
  const nextWaste = used(waste);
  const nextStock = stock ? used(stock) : remaining.map(card => ({ ...card, faceUp: false }));
  const state = {
    tableaus: nextTableaus,
    foundations: nextFoundations,
    stock: nextStock,
    waste: nextWaste,
    moves: 0,
    elapsed: 0,
    won: false,
    history: [],
    drawCount,
    dailyDate,
  };
  assert(validateState(state), 'fixture must pass engine validation');
  return state;
};

const drag = async (page, source, target, { inspect = false } = {}) => {
  const from = await source.boundingBox();
  const to = await target.boundingBox();
  assert(from && to, 'drag source and target should be visible');
  await page.mouse.move(from.x + from.width / 2, from.y + Math.min(from.height / 2, 14));
  await page.mouse.down();
  if (inspect) {
    await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 5 });
    await page.waitForTimeout(120);
  }
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 10 });
  await page.mouse.up();
};

try {
  // Draw-three is one atomic action: it exposes the third card as waste top and one undo restores all three.
  {
    const ctx = await makeContext();
    await seed(ctx, createGame(() => 0.37, { drawCount: 3 }));
    const page = await ctx.newPage();
    await openSolitaire(page);
    assert.equal(await page.getByRole('combobox', { name: 'Draw mode' }).inputValue(), '3');
    const before = await saved(page);
    await page.getByRole('button', { name: 'Draw card', exact: true }).click();
    const drawn = await saved(page);
    assert.equal(drawn.stock.length, before.stock.length - 3);
    assert.equal(drawn.waste.length, 3);
    await shot(page, 'draw3-fan');
    assert.equal(drawn.waste.at(-1).faceUp, true);
    assert.match(await page.getByRole('button', { name: /^Waste:/ }).getAttribute('aria-label'), /Waste:/);
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    assert.deepEqual(arrangement(await saved(page)), arrangement(before));
    await shot(page, 'draw3-undo');
    await ctx.close();
    console.log('PASS draw-three, waste top, and atomic undo');
  }

  // Hints highlight both endpoints and never mutate the persisted game.
  {
    const ctx = await makeContext();
    await seed(ctx, fixture({
      tableaus: [['hearts-1'], ['clubs-2'], ['diamonds-3'], ['spades-13'], [], ['clubs-1'], ['diamonds-2']],
    }));
    const page = await ctx.newPage();
    await openSolitaire(page);
    const before = arrangement(await saved(page));
    await page.getByRole('button', { name: 'Hint', exact: true }).click();
    assert(await page.locator('[data-solitaire-card="hearts-1"].is-hint').count(), 'hint should mark source card');
    assert(await page.locator('[data-solitaire-foundation="hearts"].is-hint').count(), 'hint should mark destination foundation');
    assert.match(await page.locator('.solitaire-hint-message').innerText(), /Ace of hearts/);
    assert.deepEqual(arrangement(await saved(page)), before, 'hint must not change the game');
    await shot(page, 'hint');
    await ctx.close();
    console.log('PASS hint highlight and nonmutation');
  }

  // Daily deals repeat after reload, while cancelling a deal leaves the current arrangement intact.
  {
    const ctx = await makeContext();
    await seed(ctx, createGame(() => 0.81));
    const page = await ctx.newPage();
    await openSolitaire(page);
    const beforeCancel = arrangement(await saved(page));
    await page.getByRole('button', { name: 'New deal', exact: true }).click();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    assert.deepEqual(arrangement(await saved(page)), beforeCancel, 'cancel must preserve current deal');
    await page.locator('.solitaire-daily').click();
    await page.getByRole('button', { name: 'Deal', exact: true }).click();
    const first = await saved(page);
    assert.match(first.dailyDate, /^\d{4}-\d{2}-\d{2}$/);
    const dailyArrangement = arrangement(first);
    await page.reload({ waitUntil: 'load' });
    await page.getByRole('button', { name: 'Solitaire', exact: true }).click();
    await page.locator('.solitaire-board').waitFor();
    assert.deepEqual(arrangement(await saved(page)), dailyArrangement, 'daily deal must survive reload');
    await page.locator('.solitaire-daily').click();
    await page.getByRole('button', { name: 'Deal', exact: true }).click();
    assert.deepEqual(arrangement(await saved(page)), dailyArrangement, 'same daily date must reproduce deal');
    await shot(page, 'daily');
    await ctx.close();
    console.log('PASS daily repeat, reload persistence, and confirmation cancel');
  }

  // A genuine drag of a three-card descending stack renders the whole stack as a ghost.
  {
    const ctx = await makeContext();
    await seed(ctx, fixture({
      tableaus: [['hearts-7', 'clubs-6', 'diamonds-5'], ['clubs-8'], [], [], [], [], []],
    }));
    const page = await ctx.newPage();
    await openSolitaire(page);
    await drag(page, page.locator('[data-solitaire-card="hearts-7"]'), page.locator('[data-solitaire-card="clubs-8"]'), { inspect: true });
    // The pointer has been released by drag(); inspect the actual move and use a second held drag for the visual check.
    const moved = await saved(page);
    assert.deepEqual(moved.tableaus[1].map(card => card.id), ['clubs-8', 'hearts-7', 'clubs-6', 'diamonds-5']);
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    const from = await page.locator('[data-solitaire-card="hearts-7"]').boundingBox();
    const to = await page.locator('[data-solitaire-card="clubs-8"]').boundingBox();
    assert(from && to);
    await page.mouse.move(from.x + from.width / 2, from.y + 12);
    await page.mouse.down();
    await page.mouse.move(from.x + 8, from.y + 90, { steps: 4 });
    await page.waitForTimeout(120);
    assert.equal(await page.locator('.solitaire-drag-stack .solitaire-drag-card').count(), 3, 'ghost should contain the entire stack');
    await shot(page, 'stack-ghost');
    await page.mouse.up();
    await ctx.close();
    console.log('PASS whole-stack drag ghost and stack move');
  }

  // Safe endgame finish is reversible through the normal single-step undo history.
  {
    const foundations = Object.fromEntries(SUITS.map(suit => [suit, Array.from({ length: suit === 'spades' ? 12 : 13 }, (_, i) => `${suit}-${i + 1}`)]));
    const ctx = await makeContext();
    await seed(ctx, fixture({ tableaus: [['spades-13'], [], [], [], [], [], []], foundations }));
    const page = await ctx.newPage();
    await openSolitaire(page);
    await page.getByRole('button', { name: 'Finish game', exact: true }).click();
    let won = await saved(page);
    assert.equal(won.won, true);
    assert.equal(won.foundations.spades.length, 13);
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    won = await saved(page);
    assert.equal(won.won, false);
    assert.equal(won.foundations.spades.length, 12);
    assert.equal(won.tableaus[0].at(-1).id, 'spades-13');
    await shot(page, 'autofinish');
    await ctx.close();
    console.log('PASS safe auto-finish and undo');
  }

  // Legacy saves without the new metadata migrate safely to draw-one / non-daily defaults.
  {
    const legacy = createGame(() => 0.22);
    delete legacy.drawCount;
    delete legacy.dailyDate;
    legacy.history = [(() => {
      const snapshot = { ...createGame(() => 0.22) };
      delete snapshot.drawCount;
      delete snapshot.dailyDate;
      return snapshot;
    })()];
    assert(validateState({ ...legacy, drawCount: 1, dailyDate: null, history: legacy.history.map(snapshot => ({ ...snapshot, drawCount: 1, dailyDate: null })) }));
    const ctx = await makeContext();
    await ctx.addInitScript(data => {
      if (location.protocol === 'http:' || location.protocol === 'https:') {
        localStorage.setItem('pg_solitaire_v1', JSON.stringify({ version: 1, ...data }));
      }
    }, legacy);
    const page = await ctx.newPage();
    await openSolitaire(page);
    const migrated = await saved(page);
    assert.equal(migrated.drawCount, 1);
    assert.equal(migrated.dailyDate, null);
    assert(migrated.history.every(snapshot => snapshot.drawCount === 1 && snapshot.dailyDate === null));
    await ctx.close();
    console.log('PASS legacy save migration');
  }

  assert.deepEqual(errors, [], 'polish flows should not emit browser exceptions');
  console.log('PASS Solitaire polish integration suite');
} finally {
  await browser.close();
}
