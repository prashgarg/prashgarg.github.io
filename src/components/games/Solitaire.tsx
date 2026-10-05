import { useCallback, useEffect, useRef, useState } from 'react';
import {
  SUITS, type Card, type GameState, type Suit, cloneState, createGame, drawFromStock,
  isRed, loadGame, moveFoundationToTableau, moveTableauToFoundation,
  moveTableauToTableau, moveWasteToFoundation, moveWasteToTableau, saveGame, undo,
} from './solitaireEngine';
import './Solitaire.css';

type Props = { active: boolean; onSound?: (event: 'move' | 'win' | 'lose') => void };
type Source = { kind: 'tableau'; pile: number; cardIndex: number } | { kind: 'waste' } | { kind: 'foundation'; suit: Suit };
type Destination = { kind: 'tableau'; pile: number } | { kind: 'foundation'; suit: Suit };
type Drag = { source: Source; id: number; x: number; y: number; moved: boolean };
const symbols: Record<Suit, string> = { clubs: '♣', diamonds: '♦', hearts: '♥', spades: '♠' };
const rank = (n: number) => ['','A','2','3','4','5','6','7','8','9','10','J','Q','K'][n];
const cardName = (card: Card) => `${({1:'Ace',11:'Jack',12:'Queen',13:'King'} as Record<number,string>)[card.rank] || card.rank} of ${card.suit}`;
const time = (n: number) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
function selectedCard(state: GameState, source: Source | null): Card | undefined {
  if (!source) return;
  if (source.kind === 'waste') return state.waste.at(-1);
  if (source.kind === 'foundation') return state.foundations[source.suit].at(-1);
  return state.tableaus[source.pile]?.[source.cardIndex];
}

export default function Solitaire({ active, onSound }: Props) {
  const [state, setState] = useState<GameState>(() => loadGame() ?? createGame());
  const stateRef = useRef(state);
  const [selection, setSelection] = useState<Source | null>(null);
  const [confirmDeal, setConfirmDeal] = useState(false);
  const [notice, setNotice] = useState('');
  const [saveAvailable, setSaveAvailable] = useState(true);
  const [focused, setFocused] = useState(() => document.hasFocus());
  const [visible, setVisible] = useState(() => !document.hidden);
  const root = useRef<HTMLElement>(null);
  const drag = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const [ghost, setGhost] = useState<{card:Card; x:number; y:number; width:number} | null>(null);
  stateRef.current = state;

  const persist = useCallback((next: GameState) => setSaveAvailable(saveGame(next)), []);
  useEffect(() => {
    persist(stateRef.current);
    const blur = () => { setFocused(false); saveGame(stateRef.current); };
    const focus = () => setFocused(true);
    const visibility = () => { setVisible(!document.hidden); if (document.hidden) saveGame(stateRef.current); };
    const save = () => { saveGame(stateRef.current); };
    window.addEventListener('blur', blur);
    window.addEventListener('focus', focus);
    window.addEventListener('pagehide', save);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      save(); window.removeEventListener('blur', blur); window.removeEventListener('focus', focus);
      window.removeEventListener('pagehide', save); document.removeEventListener('visibilitychange', visibility);
    };
  }, [persist]);
  useEffect(() => {
    if (!active) {
      persist(stateRef.current); setSelection(null); drag.current = null; setGhost(null);
    }
  }, [active, persist]);
  useEffect(() => {
    if (!active || !focused || !visible || state.won) return;
    const timer = window.setInterval(() => {
      const next = { ...stateRef.current, elapsed: stateRef.current.elapsed + 1 };
      stateRef.current = next; setState(next);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [active, focused, visible, state.won]);

  // Event handlers commit synchronously through a ref. React state updaters
  // stay pure, and a move's sound/save happen once even with batched renders.
  const commit = (mutate: (next: GameState) => boolean) => {
    if (!active) return false;
    const next = cloneState(stateRef.current);
    if (!mutate(next)) return false;
    stateRef.current = next; setState(next); persist(next); setSelection(null);
    setNotice(next.won ? 'You won!' : 'Move completed.');
    onSound?.(next.won ? 'win' : 'move');
    return true;
  };
  const move = (source: Source, destination: Destination) => {
    if (destination.kind === 'tableau') {
      if (source.kind === 'waste') return commit(next => moveWasteToTableau(next, destination.pile));
      if (source.kind === 'foundation') return commit(next => moveFoundationToTableau(next, source.suit, destination.pile));
      return commit(next => moveTableauToTableau(next, {from:source.pile, cardIndex:source.cardIndex, to:destination.pile}));
    }
    const card = selectedCard(stateRef.current, source);
    if (!card || card.suit !== destination.suit) return false;
    if (source.kind === 'waste') return commit(next => moveWasteToFoundation(next));
    if (source.kind === 'tableau' && source.cardIndex === stateRef.current.tableaus[source.pile].length - 1) {
      return commit(next => moveTableauToFoundation(next, source.pile));
    }
    return false;
  };
  const activate = (source: Source | null, destination?: Destination) => {
    if (!active) return;
    if (suppressClick.current) { suppressClick.current = false; return; }
    if (selection && destination && move(selection, destination)) return;
    if (source) {
      const next = JSON.stringify(source) === JSON.stringify(selection) ? null : source;
      setSelection(next);
      const card = selectedCard(stateRef.current, next);
      setNotice(card ? `${cardName(card)} selected.` : 'Selection cleared.');
    } else if (selection) setNotice('That move is not available.');
  };
  const pointerDown = (event: React.PointerEvent<HTMLElement>, source: Source | null) => {
    suppressClick.current = false;
    if (!active || event.button !== 0 || !source) return;
    drag.current = { source, id:event.pointerId, x:event.clientX, y:event.clientY, moved:false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const pointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const current = drag.current;
    if (!current || current.id !== event.pointerId || !active) return;
    if (Math.hypot(event.clientX-current.x, event.clientY-current.y) < 6 && !current.moved) return;
    current.moved = true;
    const card = selectedCard(stateRef.current, current.source);
    const rect = root.current?.getBoundingClientRect();
    if (!rect || !card) return;
    const width = event.currentTarget.getBoundingClientRect().width;
    setGhost({card, x:event.clientX-rect.left-width/2, y:event.clientY-rect.top-16, width});
  };
  const pointerUp = (event: React.PointerEvent<HTMLElement>) => {
    const current = drag.current; drag.current = null; setGhost(null);
    if (!current?.moved || !active) return;
    suppressClick.current = true;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-solitaire-tableau], [data-solitaire-foundation]');
    const destination: Destination | null = target?.dataset.solitaireFoundation
      ? {kind:'foundation', suit:target.dataset.solitaireFoundation as Suit}
      : target?.dataset.solitaireTableau !== undefined ? {kind:'tableau', pile:Number(target.dataset.solitaireTableau)} : null;
    if (!destination || !move(current.source, destination)) setNotice('That move is not available.');
  };
  const handlers = (source: Source | null) => ({
    onPointerDown:(event:React.PointerEvent<HTMLElement>) => pointerDown(event, source),
    onPointerMove:pointerMove, onPointerUp:pointerUp,
    onPointerCancel:() => { drag.current=null; setGhost(null); suppressClick.current=false; },
  });
  const draw = () => commit(next => drawFromStock(next) !== 'empty');
  const newDeal = () => {
    if (!active) return;
    const next = createGame(); stateRef.current=next; setState(next); persist(next);
    setSelection(null); setConfirmDeal(false); setNotice('New deal.');
  };
  const selected = selectedCard(state, selection)?.id;

  return <section ref={root} className="solitaire-game" aria-label="Klondike Solitaire" onKeyDown={event => {
    if (event.key === 'Escape' && confirmDeal) { event.preventDefault(); event.stopPropagation(); setConfirmDeal(false); }
  }}>
    <div className="games-toolbar solitaire-toolbar">
      <div className="solitaire-toolbar-group">
        <button className="games-button" onClick={draw} disabled={!active || (!state.stock.length && !state.waste.length)} aria-label={state.stock.length?'Draw card':'Recycle waste'}>{state.stock.length?'Draw':'Recycle'}</button>
        <button className="games-button" onClick={() => commit(undo)} disabled={!active || !state.history.length}>Undo</button>
      </div>
      <div className="solitaire-status"><span>{state.won?'You won!':`Moves ${state.moves}`}</span><time aria-label="Time played">{time(state.elapsed)}</time></div>
      <button className="games-button" onClick={() => setConfirmDeal(true)} disabled={!active}>New deal</button>
    </div>
    {confirmDeal && <div className="solitaire-confirm" role="group" aria-label="Confirm new deal">
      <span>Start a new deal?</span><button className="games-button" onClick={newDeal} disabled={!active}>Deal</button><button className="games-button" onClick={() => setConfirmDeal(false)}>Cancel</button>
    </div>}
    <div className={`solitaire-board${state.won?' solitaire-won':''}`}>
      <div className="solitaire-top-row">
        <button className={`solitaire-card solitaire-stock${state.stock.length?'':' is-empty'}`} onClick={draw} disabled={!active || (!state.stock.length && !state.waste.length)} aria-label={state.stock.length?`${state.stock.length} cards in stock`:state.waste.length?'Recycle waste pile':'Empty stock'}>
          {state.stock.length?<span className="solitaire-card-back" aria-hidden="true"/>:<span className="solitaire-empty-mark">↻</span>}
        </button>
        <button className={`solitaire-card solitaire-waste${state.waste.length?'':' is-empty'}${selection?.kind==='waste'?' is-selected':''}`} onClick={() => activate(state.waste.length?{kind:'waste'}:null)} {...handlers(state.waste.length?{kind:'waste'}:null)} disabled={!active} aria-label={state.waste.length?`Waste: ${cardName(state.waste.at(-1)!)}`:'Empty waste'}>
          {state.waste.length > 0 && <CardFace card={state.waste.at(-1)!}/>}
        </button>
        <div/>
        {SUITS.map(suit => {
          const card=state.foundations[suit].at(-1);
          const source:Source|null=card?{kind:'foundation',suit}:null;
          return <button key={suit} data-solitaire-foundation={suit} className={`solitaire-card solitaire-foundation${card?'':' is-empty'}${card?.id===selected?' is-selected':''}`} onClick={() => activate(source,{kind:'foundation',suit})} {...handlers(source)} disabled={!active} aria-label={card?`${suit} foundation: ${cardName(card)}`:`Empty ${suit} foundation`}>
            {card?<CardFace card={card}/>:<span className="solitaire-empty-mark" aria-hidden="true">{symbols[suit]}</span>}
          </button>;
        })}
      </div>
      <div className="solitaire-tableaus" role="group" aria-label="Tableau piles">
        {state.tableaus.map((pile,pileIndex) => {
          let offset=0;
          const positions=pile.map(card => {const top=offset; offset+=card.faceUp?24:17; return top;});
          return <div className="solitaire-tableau" data-solitaire-tableau={pileIndex} key={pileIndex} style={{paddingTop:positions.at(-1)||0}}>
            {!pile.length && <button className="solitaire-card is-empty solitaire-empty-column" disabled={!active} onClick={() => activate(null,{kind:'tableau',pile:pileIndex})} onPointerDown={() => {suppressClick.current=false;}} aria-label={`Empty tableau ${pileIndex+1}`}><span className="solitaire-empty-mark">K</span></button>}
            {pile.map((card,index) => <button key={card.id} data-solitaire-card={card.id} className={`solitaire-card solitaire-tableau-card${card.id===selected?' is-selected':''}`} style={{top:positions[index],zIndex:index+1}} disabled={!active||!card.faceUp} aria-label={card.faceUp?`${cardName(card)}, tableau ${pileIndex+1}`:'Face-down card'} onClick={() => activate({kind:'tableau',pile:pileIndex,cardIndex:index},{kind:'tableau',pile:pileIndex})} {...handlers(card.faceUp?{kind:'tableau',pile:pileIndex,cardIndex:index}:null)}>
              {card.faceUp?<CardFace card={card}/>:<span className="solitaire-card-back" aria-hidden="true"/>}
            </button>)}
          </div>;
        })}
      </div>
      <p className="solitaire-help">{state.won?'All four suits complete.': 'Select a card, then its destination. Or drag to move.'}</p>
      {!saveAvailable && <p className="solitaire-help">Saving is unavailable in this browser.</p>}
    </div>
    <p className="solitaire-announcement" role="status">{notice}</p>
    {ghost && <div className="solitaire-card solitaire-drag-ghost" style={{left:ghost.x,top:ghost.y,width:ghost.width}} aria-hidden="true"><CardFace card={ghost.card}/></div>}
  </section>;
}

function CardFace({card}:{card:Card}) {
  return <span className={`solitaire-card-face${isRed(card.suit)?' is-red':''}`} aria-hidden="true">
    <span className="solitaire-corner">{rank(card.rank)}<span>{symbols[card.suit]}</span></span>
    <span className="solitaire-pip">{card.rank>10?rank(card.rank):symbols[card.suit]}</span>
  </span>;
}
