import assert from 'node:assert/strict';
import {
  SUITS, autoFinish, canAutoFinish, canPlaceOnFoundation, canPlaceOnTableau,
  createDailyGame, createGame, drawFromStock, getHint, getLegalHints,
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
function makeState({ tableaus = emptyTableaus(), foundationIds = {}, wasteIds = [], drawCount = 1, dailyDate = null } = {}) {
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
    drawCount,
    dailyDate,
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

// A reverse of the immediately preceding foundation/tableau move is not
// suggested as a hint, even though its move counter and elapsed time differ.
const reverseHint = makeState({
  tableaus: [[card('hearts-2')], ...emptyTableaus().slice(1)],
  foundationIds: { clubs: ['clubs-1'] },
});
assert.equal(moveFoundationToTableau(reverseHint, 'clubs', 0), true);
reverseHint.elapsed = 17;
assert.equal(validateState(reverseHint), true);
assert.equal(getLegalHints(reverseHint).some((hint) => hint.kind === 'move' && hint.source.kind === 'tableau' && hint.source.pile === 0 && hint.source.cardIndex === 1 && hint.destination.kind === 'foundation' && hint.destination.suit === 'clubs'), false);

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
assert.equal(getHint(fullWon), null);

// Draw-three is a single undoable stock action, including a partial final
// draw and the standard reverse-order recycle.
const drawThree = createGame(fixed, { drawCount: 3 });
assert.equal(drawThree.drawCount, 3);
assert.equal(validateState(drawThree), true);
const drawThreeStock = drawThree.stock.length;
const drawThreeBefore = JSON.stringify(drawThree);
assert.equal(drawFromStock(drawThree), 'draw');
assert.equal(drawThree.stock.length, drawThreeStock - 3);
assert.equal(drawThree.waste.length, 3);
assert.equal(validateState(drawThree), true);
assert.equal(drawThree.history.length, 1);
assert.equal(undo(drawThree), true);
assert.equal(JSON.stringify(drawThree), drawThreeBefore);
while (drawThree.stock.length) {
  assert.equal(drawFromStock(drawThree), 'draw');
  assert.equal(validateState(drawThree), true);
}
assert.equal(drawThree.waste.length, drawThreeStock);
assert.equal(drawFromStock(drawThree), 'recycle');
assert.equal(drawThree.waste.length, 0);
assert.equal(drawThree.stock.length, drawThreeStock);
assert.ok(drawThree.stock.every((card) => !card.faceUp));
assert.equal(validateState(drawThree), true);

// Daily deals are stable for a date, differ across dates, and retain their
// date/draw-mode metadata for the UI and saved-game display.
const daily = createDailyGame('2026-10-05', 3);
const sameDaily = createDailyGame('2026-10-05', 3);
const otherDaily = createDailyGame('2026-10-06', 3);
assert.deepEqual(daily, sameDaily);
assert.notDeepEqual(daily, otherDaily);
assert.equal(daily.dailyDate, '2026-10-05');
assert.equal(daily.drawCount, 3);
assert.equal(validateState(daily), true);
assert.equal(validateState(createDailyGame('2024-02-29')), true);
assert.throws(() => createDailyGame('2025-02-29'), RangeError);
assert.throws(() => createDailyGame('2026-99-99'), RangeError);
assert.throws(() => createDailyGame('2026-04-31'), RangeError);

// Hints are pure and expose the same source/destination shapes used by the
// UI. A state with only stock cards has a draw hint; a drained stock has a
// recycle hint; a won state has no hint.
const hintState = makeState({ tableaus: [[card('clubs-1')], ...emptyTableaus().slice(1)] });
const hintBefore = JSON.stringify(hintState);
const firstHint = getHint(hintState);
assert.deepEqual(firstHint, { kind: 'move', source: { kind: 'tableau', pile: 0, cardIndex: 0 }, destination: { kind: 'foundation', suit: 'clubs' } });
assert.equal(JSON.stringify(hintState), hintBefore);
assert.ok(getLegalHints(hintState).some((hint) => hint.kind === 'move'));
const stockHint = makeState();
assert.deepEqual(getHint(stockHint), { kind: 'draw' });
const recycleTableaus = cards(['clubs-13', 'diamonds-13', 'hearts-13', 'spades-13', 'clubs-10', 'diamonds-10', 'hearts-10']).map((value) => [value]);
const recycleWaste = ALL_IDS.filter((id) => !recycleTableaus.flat().some((value) => value.id === id) && id !== 'spades-7');
recycleWaste.push('spades-7');
const recycleHint = makeState({ tableaus: recycleTableaus, wasteIds: recycleWaste });
assert.deepEqual(getHint(recycleHint), { kind: 'recycle' });
assert.equal(validateState(recycleHint), true);

// Fully exposed, drained endgames can be finished safely in one undo step.
const finishState = makeState({
  tableaus: [[card('spades-13')], ...emptyTableaus().slice(1)],
  foundationIds: Object.fromEntries(SUITS.map((suit) => [suit, Array.from({ length: suit === 'spades' ? 12 : 13 }, (_, index) => `${suit}-${index + 1}`)])),
});
assert.equal(canAutoFinish(finishState), true);
const finishBefore = JSON.stringify(finishState);
assert.equal(autoFinish(finishState), true);
assert.equal(finishState.won, true);
assert.equal(validateState(finishState), true);
assert.equal(finishState.history.length, 1);
assert.equal(undo(finishState), true);
assert.equal(JSON.stringify(finishState), finishBefore);

// Old saved games had no mode/date fields; migration supplies draw-one and a
// null date for the top-level snapshot and every history snapshot.
const storage = new Map();
const fakeStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
const legacy = createGame(fixed);
const legacySnapshot = snapshotOf(legacy);
delete legacy.drawCount;
delete legacy.dailyDate;
delete legacySnapshot.drawCount;
delete legacySnapshot.dailyDate;
legacy.history = [legacySnapshot];
storage.set('pg_solitaire_v1', JSON.stringify({ version: 1, ...legacy }));
const migrated = loadGame(fakeStorage);
assert.equal(migrated?.drawCount, 1);
assert.equal(migrated?.dailyDate, null);
assert.equal(migrated?.history[0].drawCount, 1);
assert.equal(migrated?.history[0].dailyDate, null);
assert.equal(validateState(migrated), true);
storage.set('pg_solitaire_v1', JSON.stringify({ version: 1, ...createGame(fixed), drawCount: 2 }));
assert.equal(loadGame(fakeStorage), null);
for (const invalidDay of ['2026-99-99', '2025-02-29', '2026-04-31']) {
  storage.set('pg_solitaire_v1', JSON.stringify({ version: 1, ...createGame(fixed), dailyDate: invalidDay }));
  assert.equal(loadGame(fakeStorage), null);
}

// Persistence accepts a pristine zero-move deal, including a newly started
// deal, and rejects malformed or structurally impossible saved data.
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
