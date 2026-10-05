export const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'] as const;
export type Suit = (typeof SUITS)[number];

export type Card = {
  id: string;
  rank: number;
  suit: Suit;
  faceUp: boolean;
};

export type FoundationState = Record<Suit, Card[]>;

export type Snapshot = {
  tableaus: Card[][];
  foundations: FoundationState;
  stock: Card[];
  waste: Card[];
  moves: number;
  elapsed: number;
  won: boolean;
};

export type GameState = Snapshot & { history: Snapshot[] };

export type TableauMove = { from: number; cardIndex: number; to: number };

export const emptyFoundations = (): FoundationState => ({
  clubs: [],
  diamonds: [],
  hearts: [],
  spades: [],
});

export function cloneCard(card: Card): Card {
  return { ...card };
}

export function cloneSnapshot(snapshot: Snapshot): Snapshot {
  return {
    tableaus: snapshot.tableaus.map((pile) => pile.map(cloneCard)),
    foundations: Object.fromEntries(
      SUITS.map((suit) => [suit, snapshot.foundations[suit].map(cloneCard)]),
    ) as FoundationState,
    stock: snapshot.stock.map(cloneCard),
    waste: snapshot.waste.map(cloneCard),
    moves: snapshot.moves,
    elapsed: snapshot.elapsed,
    won: snapshot.won,
  };
}

export function snapshotOf(state: GameState): Snapshot {
  return cloneSnapshot(state);
}

export function cloneState(state: GameState): GameState {
  return { ...cloneSnapshot(state), history: state.history.map(cloneSnapshot) };
}

function standardDeck(): Card[] {
  return SUITS.flatMap((suit) =>
    Array.from({ length: 13 }, (_, index) => ({
      id: `${suit}-${index + 1}`,
      rank: index + 1,
      suit,
      faceUp: false,
    })),
  );
}

export function createGame(random: () => number = Math.random): GameState {
  const deck = standardDeck();
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  const tableaus: Card[][] = [];
  let cursor = 0;
  for (let pile = 0; pile < 7; pile += 1) {
    const cards = deck.slice(cursor, cursor + pile + 1).map(cloneCard);
    cards[cards.length - 1].faceUp = true;
    tableaus.push(cards);
    cursor += pile + 1;
  }

  return {
    tableaus,
    foundations: emptyFoundations(),
    stock: deck.slice(cursor).map(cloneCard),
    waste: [],
    moves: 0,
    elapsed: 0,
    won: false,
    history: [],
  };
}

export function isRed(suit: Suit): boolean {
  return suit === 'diamonds' || suit === 'hearts';
}

export function isOppositeColour(first: Card, second: Card): boolean {
  return isRed(first.suit) !== isRed(second.suit);
}

export function isDescendingAlternating(cards: Card[]): boolean {
  let seenFaceUp = false;
  for (let index = 0; index < cards.length; index += 1) {
    if (!cards[index].faceUp) {
      if (seenFaceUp) return false;
      continue;
    }
    seenFaceUp = true;
    if (index > 0 && cards[index - 1].faceUp && (cards[index - 1].rank !== cards[index].rank + 1 || !isOppositeColour(cards[index - 1], cards[index]))) return false;
  }
  return true;
}

export function isValidMovingStack(cards: Card[]): boolean {
  return cards.length > 0 && cards.every((card) => card.faceUp) && isDescendingAlternating(cards);
}

export function canPlaceOnTableau(moving: Card, destination: Card | undefined): boolean {
  if (!destination) return moving.rank === 13;
  return destination.faceUp && destination.rank === moving.rank + 1 && isOppositeColour(destination, moving);
}

export function canPlaceOnFoundation(card: Card, foundation: Card[]): boolean {
  const top = foundation[foundation.length - 1];
  return top ? top.suit === card.suit && top.rank + 1 === card.rank : card.rank === 1;
}

function pushHistory(state: GameState): void {
  state.history.push(snapshotOf(state));
  if (state.history.length > 200) state.history.shift();
}

function finishMove(state: GameState): void {
  state.moves += 1;
  state.won = SUITS.every((suit) => state.foundations[suit].length === 13);
}

function flipExposed(state: GameState, pileIndex: number): void {
  const pile = state.tableaus[pileIndex];
  const top = pile[pile.length - 1];
  if (top && !top.faceUp) top.faceUp = true;
}

export function moveTableauToTableau(state: GameState, move: TableauMove): boolean {
  if (state.won || move.from === move.to) return false;
  const source = state.tableaus[move.from];
  const destination = state.tableaus[move.to];
  if (!source || !destination || move.cardIndex < 0 || move.cardIndex >= source.length) return false;
  const moving = source.slice(move.cardIndex);
  if (!isValidMovingStack(moving) || !canPlaceOnTableau(moving[0], destination[destination.length - 1])) return false;
  pushHistory(state);
  source.splice(move.cardIndex);
  destination.push(...moving);
  flipExposed(state, move.from);
  finishMove(state);
  return true;
}

export function moveTableauToFoundation(state: GameState, from: number): boolean {
  const source = state.tableaus[from];
  const card = source?.[source.length - 1];
  if (state.won || !card || !card.faceUp || !canPlaceOnFoundation(card, state.foundations[card.suit])) return false;
  pushHistory(state);
  source.pop();
  state.foundations[card.suit].push(card);
  flipExposed(state, from);
  finishMove(state);
  return true;
}

export function moveWasteToTableau(state: GameState, to: number): boolean {
  const card = state.waste[state.waste.length - 1];
  const destination = state.tableaus[to];
  if (state.won || !card || !destination || !canPlaceOnTableau(card, destination[destination.length - 1])) return false;
  pushHistory(state);
  state.waste.pop();
  destination.push(card);
  finishMove(state);
  return true;
}

export function moveWasteToFoundation(state: GameState): boolean {
  const card = state.waste[state.waste.length - 1];
  if (state.won || !card || !canPlaceOnFoundation(card, state.foundations[card.suit])) return false;
  pushHistory(state);
  state.waste.pop();
  state.foundations[card.suit].push(card);
  finishMove(state);
  return true;
}

export function moveFoundationToTableau(state: GameState, suit: Suit, to: number): boolean {
  const foundation = state.foundations[suit];
  const card = foundation[foundation.length - 1];
  const destination = state.tableaus[to];
  if (state.won || !card || !destination || !canPlaceOnTableau(card, destination[destination.length - 1])) return false;
  pushHistory(state);
  foundation.pop();
  destination.push(card);
  finishMove(state);
  return true;
}

export function drawFromStock(state: GameState): 'draw' | 'recycle' | 'empty' {
  if (state.won) return 'empty';
  if (state.stock.length) {
    pushHistory(state);
    const card = state.stock.pop()!;
    card.faceUp = true;
    state.waste.push(card);
    finishMove(state);
    return 'draw';
  }
  if (state.waste.length) {
    pushHistory(state);
    state.stock = state.waste.reverse().map((card) => ({ ...card, faceUp: false }));
    state.waste = [];
    finishMove(state);
    return 'recycle';
  }
  return 'empty';
}

export function undo(state: GameState): boolean {
  const previous = state.history.pop();
  if (!previous) return false;
  const history = state.history;
  Object.assign(state, cloneSnapshot(previous), { history });
  return true;
}

export function tick(state: GameState, seconds = 1): void {
  if (!state.won && seconds > 0) state.elapsed += seconds;
}

function validCard(card: unknown): card is Card {
  if (!card || typeof card !== 'object' || Array.isArray(card)) return false;
  const value = card as Partial<Card>;
  if (typeof value.id !== 'string' || !Number.isInteger(value.rank) || value.rank < 1 || value.rank > 13 || typeof value.suit !== 'string' || !SUITS.includes(value.suit as Suit) || typeof value.faceUp !== 'boolean') return false;
  return value.id === `${value.suit}-${value.rank}`;
}

function validSnapshot(snapshot: unknown): snapshot is Snapshot {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return false;
  const value = snapshot as Snapshot;
  if (!Array.isArray(value.tableaus) || value.tableaus.length !== 7 || !Array.isArray(value.stock) || !Array.isArray(value.waste) || !value.foundations || typeof value.foundations !== 'object' || Array.isArray(value.foundations)) return false;
  const foundations = value.foundations as Partial<FoundationState>;
  if (!SUITS.every((suit) => Array.isArray(foundations[suit]))) return false;
  if (value.tableaus.some((pile) => !Array.isArray(pile))) return false;
  const piles = [...value.tableaus.flat(), ...value.stock, ...value.waste, ...SUITS.flatMap((suit) => foundations[suit] as Card[])];
  if (piles.length !== 52 || new Set(piles.map((card) => card?.id)).size !== 52 || !piles.every(validCard)) return false;
  if (!Number.isInteger(value.moves) || value.moves < 0 || !Number.isInteger(value.elapsed) || value.elapsed < 0 || typeof value.won !== 'boolean') return false;
  if (value.tableaus.some((pile) => !isDescendingAlternating(pile) || (pile.length > 0 && !pile[pile.length - 1].faceUp))) return false;
  if (value.stock.some((card) => card.faceUp) || value.waste.some((card) => !card.faceUp)) return false;
  for (const suit of SUITS) {
    const foundation = foundations[suit] as Card[];
    if (foundation.some((card, index) => !card.faceUp || card.suit !== suit || card.rank !== index + 1)) return false;
  }
  const allFoundationsComplete = SUITS.every((suit) => (foundations[suit] as Card[]).length === 13);
  if (value.won !== allFoundationsComplete) return false;
  return true;
}

export function validateState(state: unknown): state is GameState {
  if (!state || typeof state !== 'object') return false;
  const value = state as GameState;
  return validSnapshot(value) && Array.isArray(value.history) && value.history.length <= 200 && value.history.every(validSnapshot);
}

export function saveGame(state: GameState, storage?: Storage | null): boolean {
  try {
    const target = storage ?? (typeof localStorage === 'undefined' ? null : localStorage);
    if (!target || !validateState(state)) return false;
    target.setItem('pg_solitaire_v1', JSON.stringify({ version: 1, ...snapshotOf(state), history: state.history }));
    return true;
  } catch {
    return false;
  }
}

export function loadGame(storage?: Storage | null): GameState | null {
  try {
    const target = storage ?? (typeof localStorage === 'undefined' ? null : localStorage);
    if (!target) return null;
    const raw = target.getItem('pg_solitaire_v1');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState & { version?: number };
    if (parsed.version !== 1 || !validateState(parsed)) return null;
    return cloneState(parsed);
  } catch {
    return null;
  }
}
