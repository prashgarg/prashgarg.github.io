import assert from 'node:assert/strict';
import {
  SUITS, canPlaceOnFoundation, canPlaceOnTableau, createGame, drawFromStock,
  moveFoundationToTableau, moveTableauToFoundation, moveTableauToTableau,
  saveGame, loadGame, snapshotOf, undo, validateState,
} from '../src/components/games/solitaireEngine.ts';

const fixed = () => 0.5;
const ALL_IDS = SUITS.flatMap((suit) => Array.from({ length: 13 }, (_, index) => `${suit}-${index + 1}`));
const emptyTableaus = () => Array.from({ length: 7 }, () => []);

const card = (id, faceUp = true) => {
  const [suit, rank] = id.split('-');
  return { id, rank: Number(rank), suit, faceUp };
};
const cards = (ids, faceUp = true) => ids.map((id) => card(id, faceUp));

// Construct fixtures from the complete canonical deck so every legal move can
// still be checked with the same persistence validator as a real saved game.
function makeState({ tableaus = emptyTableaus(), foundationIds = {}, wasteIds = [] } = {}) {
  const foundations = Object.fromEntries(SUITS.map((suit) => [suit, cards(foundationIds[suit] ?? [])]));
  const used = new Set([
    ...tableaus.flat().map((value) => value.id),
    ...wasteIds,
    ...SUITS.flatMap((suit) => foundations[suit].map((value) => value.id)),
  ]);
  const stock = ALL_IDS.filter((id) => !used.has(id)).map((id) => card(id, false));
  return {
    tableaus,
    foundations,
    stock,
    waste: cards(wasteIds),
    moves: 0,
    elapsed: 0,
    won: SUITS.every((suit) => foundations[suit].length === 13),
    history: [],
  };
}

const state = createGame(fixed);
assert.equal(state.tableaus.length, 7);
assert.equal(state.tableaus.filter((pile) => pile.at(-1).faceUp).length, 7);
assert.equal(validateState(state), true);

const blocked = createGame(fixed);
const beforeBlocked = JSON.stringify(blocked);
assert.equal(moveTableauToTableau(blocked, { from: 0, cardIndex: 0, to: 1 }), false);
assert.equal(JSON.stringify(blocked), beforeBlocked);
assert.equal(canPlaceOnTableau(card('hearts-13'), undefined), true);
assert.equal(canPlaceOnTableau(card('hearts-4'), card('clubs-5')), true);
assert.equal(canPlaceOnTableau(card('hearts-4'), card('diamonds-5')), false);

// A legal alternating multi-card stack moves as a unit; a same-colour landing
// is rejected without changing the otherwise valid state.
const multi = makeState({
  tableaus: [cards(['hearts-12', 'clubs-11']), cards(['clubs-13']), ...emptyTableaus().slice(2)],
});
assert.equal(validateState(multi), true);
assert.equal(moveTableauToTableau(multi, { from: 0, cardIndex: 0, to: 1 }), true);
assert.deepEqual(multi.tableaus[1].map((value) => value.id), ['clubs-13', 'hearts-12', 'clubs-11']);
assert.equal(validateState(multi), true);

const wrongColour = makeState({
  tableaus: [cards(['hearts-12', 'clubs-11']), cards(['hearts-13']), ...emptyTableaus().slice(2)],
});
assert.equal(validateState(wrongColour), true);
assert.equal(moveTableauToTableau(wrongColour, { from: 0, cardIndex: 0, to: 1 }), false);
assert.equal(validateState(wrongColour), true);

const foundationState = makeState({ tableaus: [[card('clubs-1')], ...emptyTableaus().slice(1)] });
assert.equal(canPlaceOnFoundation(foundationState.tableaus[0][0], []), true);
assert.equal(moveTableauToFoundation(foundationState, 0), true);
assert.equal(foundationState.foundations.clubs[0].rank, 1);
assert.equal(validateState(foundationState), true);
assert.equal(undo(foundationState), true);
assert.equal(foundationState.foundations.clubs.length, 0);
assert.equal(validateState(foundationState), true);

const foundationReturn = makeState({
  tableaus: [[card('hearts-2')], ...emptyTableaus().slice(1)],
  foundationIds: { clubs: ['clubs-1'] },
});
assert.equal(validateState(foundationReturn), true);
assert.equal(moveFoundationToTableau(foundationReturn, 'clubs', 0), true);
assert.deepEqual(foundationReturn.tableaus[0].map((value) => value.id), ['hearts-2', 'clubs-1']);
assert.equal(validateState(foundationReturn), true);

const invalidFoundationRank = makeState({ foundationIds: { clubs: ['clubs-2'] } });
assert.equal(validateState(invalidFoundationRank), false);

// Exposing a face-down card after a legal move is part of the move contract.
const flip = makeState({
  tableaus: [[card('clubs-13', false), card('hearts-12')], [card('spades-13')], ...emptyTableaus().slice(2)],
});
assert.equal(validateState(flip), true);
assert.equal(moveTableauToTableau(flip, { from: 0, cardIndex: 1, to: 1 }), true);
assert.equal(flip.tableaus[0][0].faceUp, true);
assert.equal(validateState(flip), true);

const moved = makeState({ tableaus: [[card('clubs-13')], ...emptyTableaus().slice(1)] });
assert.equal(validateState(moved), true);
assert.equal(moveTableauToTableau(moved, { from: 0, cardIndex: 0, to: 1 }), true);
assert.equal(validateState(moved), true);
assert.equal(undo(moved), true);
assert.equal(moved.tableaus[0][0].id, 'clubs-13');
assert.equal(validateState(moved), true);

const stock = createGame(fixed);
const stockCount = stock.stock.length;
assert.equal(drawFromStock(stock), 'draw');
assert.equal(validateState(stock), true);
assert.equal(stock.stock.length, stockCount - 1);
assert.equal(stock.waste.length, 1);
while (stock.stock.length) {
  assert.equal(drawFromStock(stock), 'draw');
  assert.equal(validateState(stock), true);
}
assert.equal(stock.waste.length, stockCount);
assert.equal(drawFromStock(stock), 'recycle');
assert.equal(validateState(stock), true);
assert.equal(stock.stock.length, stockCount);
assert.equal(stock.waste.length, 0);
assert.equal(undo(stock), true);
assert.equal(stock.waste.length, stockCount);
assert.equal(validateState(stock), true);

// A final legal foundation move marks the game won, and undo restores the
// incomplete state and its won flag.
const almostWon = makeState({
  tableaus: [[card('spades-13')], ...emptyTableaus().slice(1)],
  foundationIds: Object.fromEntries(SUITS.map((suit) => [suit, Array.from({ length: suit === 'spades' ? 12 : 13 }, (_, index) => `${suit}-${index + 1}`)])),
});
assert.equal(validateState(almostWon), true);
assert.equal(moveTableauToFoundation(almostWon, 0), true);
assert.equal(almostWon.won, true);
assert.equal(validateState(almostWon), true);
assert.equal(undo(almostWon), true);
assert.equal(almostWon.won, false);
assert.equal(validateState(almostWon), true);

const fullWon = makeState({
  foundationIds: Object.fromEntries(SUITS.map((suit) => [suit, Array.from({ length: 13 }, (_, index) => `${suit}-${index + 1}`)])),
});
assert.equal(fullWon.won, true);
assert.equal(validateState(fullWon), true);

// Persistence accepts a pristine zero-move deal, including a newly started
// deal, and rejects malformed or structurally impossible saved data.
const storage = new Map();
const fakeStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
const pristine = createGame(fixed);
assert.equal(saveGame(pristine, fakeStorage), true);
assert.equal(pristine.moves, 0);
assert.equal(loadGame(fakeStorage).moves, 0);
const newDeal = createGame(() => 0.1);
assert.equal(saveGame(newDeal, fakeStorage), true);
assert.equal(loadGame(fakeStorage).moves, 0);
assert.equal(validateState(loadGame(fakeStorage)), true);
storage.set('pg_solitaire_v1', '{broken');
assert.equal(loadGame(fakeStorage), null);

const corrupt = (mutate) => {
  const next = createGame(fixed);
  mutate(next);
  return next;
};
assert.equal(validateState(corrupt((next) => { next.stock[0].id = 'not-a-card'; })), false);
assert.equal(validateState(corrupt((next) => { next.stock[1] = { ...next.stock[0] }; })), false);
assert.equal(validateState(corrupt((next) => { next.tableaus[0].at(-1).faceUp = false; })), false);
assert.equal(validateState(corrupt((next) => { next.stock[0].faceUp = true; })), false);
const wasteFlag = corrupt((next) => undefined);
assert.equal(drawFromStock(wasteFlag), 'draw');
wasteFlag.waste[0].faceUp = false;
assert.equal(validateState(wasteFlag), false);
assert.equal(validateState(corrupt((next) => { next.won = true; })), false);
assert.equal(validateState({}), false);
assert.equal(validateState({ tableaus: 'bad', foundations: null, stock: [], waste: [], moves: 0, elapsed: 0, won: false, history: [] }), false);
assert.doesNotThrow(() => validateState({ tableaus: Array(7).fill([]), foundations: { clubs: [], diamonds: [], hearts: [], spades: [] }, stock: [], waste: [], moves: 0, elapsed: 0, won: false, history: [] }));
assert.doesNotThrow(() => validateState(corrupt((next) => { next.stock[0].suit = Symbol('bad'); })));

const tooMuchHistory = createGame(fixed);
tooMuchHistory.history = Array.from({ length: 201 }, () => snapshotOf(createGame(fixed)));
assert.equal(validateState(tooMuchHistory), false);
const malformedHistory = createGame(fixed);
malformedHistory.history = [{}];
assert.equal(validateState(malformedHistory), false);

console.log('PASS solitaire engine: legal moves, foundations, win/undo, stock/recycle, persistence, and robust corruption validation');
