import { useCallback, useEffect, useRef, useState } from 'react';
import {
  SUITS, type Card, type GameState, type Suit, type DrawCount, type Hint,
  type CardSource as Source, type CardDestination as Destination,
  cloneState, createGame, createDailyGame, drawFromStock, getHint, canAutoFinish, autoFinish,
  loadGame, moveFoundationToTableau, moveTableauToFoundation,
  moveTableauToTableau, moveWasteToFoundation, moveWasteToTableau, saveGame, undo,
} from './solitaireEngine';
import PlayingCardFace from './PlayingCardFace';
import './Solitaire.css';

type Props = { active: boolean; onSound?: (event: 'move' | 'win' | 'lose') => void };
type Drag = { source: Source; id: number; x: number; y: number; moved: boolean };
type Deal = { drawCount: DrawCount; dailyDate: string | null };
type Ghost = { source:Source; cards:Card[]; x:number; y:number; width:number };
const symbols: Record<Suit, string> = { clubs: '♣', diamonds: '♦', hearts: '♥', spades: '♠' };
const cardName = (card: Card) => `${({1:'Ace',11:'Jack',12:'Queen',13:'King'} as Record<number,string>)[card.rank] || card.rank} of ${card.suit}`;
const time = (n: number) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
};
const dateLabel = (day: string) => new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(`${day}T12:00:00Z`));
function selectedCard(state: GameState, source: Source | null): Card | undefined {
  if (!source) return;
  if (source.kind === 'waste') return state.waste.at(-1);
  if (source.kind === 'foundation') return state.foundations[source.suit].at(-1);
  return state.tableaus[source.pile]?.[source.cardIndex];
}
function hintText(state:GameState, hint:Hint|null) {
  if (!hint) return 'No useful moves found.';
  if (hint.kind === 'draw') return `Draw ${state.drawCount === 3 ? 'three cards' : 'a card'} from the stock.`;
  if (hint.kind === 'recycle') return 'Turn the waste pile over to use it again.';
  const card=selectedCard(state,hint.source);
  const to=hint.destination;
  const target=to.kind==='tableau'?state.tableaus[to.pile].at(-1):null;
  return card ? `Move ${cardName(card)} ${to.kind==='foundation'?'to its foundation':target?`onto ${cardName(target)}`:'to an empty column'}.` : '';
}

export default function Solitaire({ active, onSound }: Props) {
  const [state, setState] = useState<GameState>(() => loadGame() ?? createGame());
  const stateRef = useRef(state);
  const [selection, setSelection] = useState<Source | null>(null);
  const [pendingDeal, setPendingDeal] = useState<Deal | null>(null);
  const [hint, setHint] = useState<Hint | null>(null);
  const [hintMessage, setHintMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [saveAvailable, setSaveAvailable] = useState(true);
  const [focused, setFocused] = useState(() => document.hasFocus());
  const [visible, setVisible] = useState(() => !document.hidden);
  const root = useRef<HTMLElement>(null);
  const drag = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const [ghost, setGhost] = useState<Ghost | null>(null);
  stateRef.current = state;

  const persist = useCallback((next: GameState) => setSaveAvailable(saveGame(next)), []);
  useEffect(() => {
    persist(stateRef.current);
    const blur = () => { setFocused(false); saveGame(stateRef.current); drag.current=null; setGhost(null); };
    const focus = () => setFocused(true);
    const visibility = () => { setVisible(!document.hidden); if (document.hidden) {saveGame(stateRef.current);drag.current=null;setGhost(null);} };
    const save = () => { saveGame(stateRef.current); };
    window.addEventListener('blur', blur); window.addEventListener('focus', focus);
    window.addEventListener('pagehide', save); document.addEventListener('visibilitychange', visibility);
    return () => {
      save(); window.removeEventListener('blur', blur); window.removeEventListener('focus', focus);
      window.removeEventListener('pagehide', save); document.removeEventListener('visibilitychange', visibility);
    };
  }, [persist]);
  useEffect(() => {
    if (!active) {
      persist(stateRef.current); setSelection(null); drag.current = null; setGhost(null); setHint(null); setHintMessage('');
    }
  }, [active, persist]);
  useEffect(() => {
    if (!active || !focused || !visible || state.won || pendingDeal) return;
    const timer = window.setInterval(() => {
      const next = { ...stateRef.current, elapsed: stateRef.current.elapsed + 1 };
      stateRef.current = next; setState(next);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [active, focused, visible, state.won, pendingDeal]);

  const clearHint = () => {setHint(null);setHintMessage('');};
  const commit = (mutate: (next: GameState) => boolean) => {
    if (!active || pendingDeal) return false;
    const next = cloneState(stateRef.current);
    if (!mutate(next)) return false;
    stateRef.current = next; setState(next); persist(next); setSelection(null); clearHint();
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
    if (!active || pendingDeal) return;
    if (suppressClick.current) { suppressClick.current = false; return; }
    clearHint();
    if (selection && destination && move(selection, destination)) return;
    if (source) {
      const next = JSON.stringify(source) === JSON.stringify(selection) ? null : source;
      setSelection(next);
      const card = selectedCard(stateRef.current, next);
      setNotice(card ? `${cardName(card)} selected.` : 'Selection cleared.');
    } else if (selection) setNotice('That move is not available.');
  };
  const toFoundation = (source:Source, expectedId:string) => {
    const card=selectedCard(stateRef.current,source);
    if(card?.id===expectedId && !move(source,{kind:'foundation',suit:card.suit}))setNotice('That card cannot go to its foundation yet.');
  };
  const pointerDown = (event: React.PointerEvent<HTMLElement>, source: Source | null) => {
    suppressClick.current = false;
    if (!active || pendingDeal || event.button !== 0 || !source) return;
    clearHint();
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
    const cards=current.source.kind==='tableau'?stateRef.current.tableaus[current.source.pile].slice(current.source.cardIndex):[card];
    setGhost({source:current.source,cards,x:event.clientX-rect.left-width/2,y:event.clientY-rect.top-14,width});
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
  const requestDeal = (deal:Deal) => {if(active){setPendingDeal(deal);clearHint();setSelection(null);}};
  const newDeal = (deal:Deal) => {
    if (!active) return;
    const next = deal.dailyDate?createDailyGame(deal.dailyDate,deal.drawCount):createGame(undefined,{drawCount:deal.drawCount});
    stateRef.current=next; setState(next); persist(next); setPendingDeal(null); setSelection(null); clearHint();
    setNotice(deal.dailyDate?`Daily deal for ${dateLabel(deal.dailyDate)}.`:'New deal.');
  };
  const showHint = () => {
    if(!active||pendingDeal)return;
    const next=getHint(stateRef.current);const message=hintText(stateRef.current,next);
    setHint(next);setHintMessage(message);setNotice(message);setSelection(null);
  };
  const selected = selectedCard(state, selection)?.id;
  const hintId=hint?.kind==='move'?selectedCard(state,hint.source)?.id:null;
  const hintDestination=hint?.kind==='move'?hint.destination:null;
  const disabled=!active||!!pendingDeal;
  const wasteCards=state.waste.slice(-(state.drawCount===3?3:1));
  const canFinish=canAutoFinish(state);
  const stackSelected=(pile:number,index:number)=>selection?.kind==='tableau'&&selection.pile===pile&&index>=selection.cardIndex;
  const dragged=(id:string)=>ghost?.cards.some(card=>card.id===id);

  return <section ref={root} className="solitaire-game" aria-label="Klondike Solitaire" onKeyDown={event => {
    if (event.key === 'Escape' && pendingDeal) { event.preventDefault(); event.stopPropagation(); setPendingDeal(null); }
  }}>
    <div className="games-toolbar solitaire-toolbar">
      <div className="solitaire-toolbar-group">
        <button className="games-button" onClick={draw} disabled={disabled || (!state.stock.length && !state.waste.length)} aria-label={state.stock.length?'Draw card':'Recycle waste'}>{state.stock.length?'Draw':'Recycle'}</button>
        <button className="games-button" onClick={() => commit(undo)} disabled={disabled || !state.history.length}>Undo</button>
        <button className="games-button" onClick={showHint} disabled={disabled||state.won}>Hint</button>
      </div>
      <button className="games-button" onClick={() => requestDeal({drawCount:state.drawCount,dailyDate:null})} disabled={disabled}>New deal</button>
    </div>
    <div className="solitaire-options">
      <select className="games-select" aria-label="Draw mode" value={state.drawCount} disabled={disabled} onChange={event=>requestDeal({drawCount:Number(event.target.value) as DrawCount,dailyDate:state.dailyDate})}>
        <option value={1}>Draw 1</option><option value={3}>Draw 3</option>
      </select>
      <button className={`games-button solitaire-daily${state.dailyDate?' is-current':''}`} onClick={()=>requestDeal({drawCount:state.drawCount,dailyDate:today()})} disabled={disabled} title={state.dailyDate?`Daily deal: ${state.dailyDate}`:'The same deal for everyone today'}>{state.dailyDate?`Daily · ${dateLabel(state.dailyDate)}`:'Daily deal'}</button>
      <div className="solitaire-status"><span>{state.won?'You won!':`Moves ${state.moves}`}</span><time aria-label="Time played">{time(state.elapsed)}</time></div>
    </div>
    {pendingDeal && <div className="solitaire-confirm" role="group" aria-label="Confirm new deal">
      <span>{pendingDeal.dailyDate?`Play the ${dateLabel(pendingDeal.dailyDate)} daily deal?`:`Start a new draw-${pendingDeal.drawCount===3?'three':'one'} deal?`}</span>
      <button className="games-button" onClick={()=>newDeal(pendingDeal)} disabled={!active}>Deal</button><button className="games-button" onClick={() => setPendingDeal(null)}>Cancel</button>
    </div>}
    <div className={`solitaire-board${state.won?' solitaire-won':''}`}>
      <div className="solitaire-top-row">
        <button className={`solitaire-card solitaire-stock${state.stock.length?'':' is-empty'}${hint?.kind==='draw'||hint?.kind==='recycle'?' is-hint':''}`} onClick={draw} disabled={disabled || (!state.stock.length && !state.waste.length)} aria-label={state.stock.length?`${state.stock.length} cards in stock`:state.waste.length?'Recycle waste pile':'Empty stock'}>
          {state.stock.length?<span className="solitaire-card-back" aria-hidden="true"/>:<span className="solitaire-empty-mark">↻</span>}
        </button>
        <div className="solitaire-waste-fan">
          {wasteCards.slice(0,-1).map((card,index)=><span key={card.id} className="solitaire-card solitaire-waste-under" style={{left:`${index*34}%`}} aria-hidden="true"><PlayingCardFace card={card}/></span>)}
          <button className={`solitaire-card solitaire-waste${state.waste.length?'':' is-empty'}${selection?.kind==='waste'?' is-selected':''}${hint?.kind==='move'&&hint.source.kind==='waste'?' is-hint':''}${state.waste.at(-1)&&dragged(state.waste.at(-1)!.id)?' is-drag-source':''}`} style={{left:`${Math.max(0,wasteCards.length-1)*34}%`}} onClick={() => activate(state.waste.length?{kind:'waste'}:null)} onDoubleClick={()=>{if(state.waste.length)toFoundation({kind:'waste'},state.waste.at(-1)!.id);}} {...handlers(state.waste.length?{kind:'waste'}:null)} disabled={disabled} aria-label={state.waste.length?`Waste: ${cardName(state.waste.at(-1)!)}`:'Empty waste'}>
            {state.waste.length > 0 && <PlayingCardFace card={state.waste.at(-1)!}/>}
          </button>
        </div>
        <div/>
        {SUITS.map(suit => {
          const card=state.foundations[suit].at(-1);
          const source:Source|null=card?{kind:'foundation',suit}:null;
          const highlighted=hintDestination?.kind==='foundation'&&hintDestination.suit===suit;
          return <button key={suit} data-solitaire-foundation={suit} className={`solitaire-card solitaire-foundation${card?'':' is-empty'}${card?.id===selected?' is-selected':''}${highlighted||card?.id===hintId?' is-hint':''}${card&&dragged(card.id)?' is-drag-source':''}`} onClick={() => activate(source,{kind:'foundation',suit})} {...handlers(source)} disabled={disabled} aria-label={card?`${suit} foundation: ${cardName(card)}`:`Empty ${suit} foundation`}>
            {card?<PlayingCardFace card={card}/>:<span className="solitaire-empty-mark" aria-hidden="true">{symbols[suit]}</span>}
          </button>;
        })}
      </div>
      <div className="solitaire-tableaus" role="group" aria-label="Tableau piles">
        {state.tableaus.map((pile,pileIndex) => {
          let offset=0;
          const positions=pile.map(card => {const top=offset; offset+=card.faceUp?24:17; return top;});
          const hintTarget=hintDestination?.kind==='tableau'&&hintDestination.pile===pileIndex;
          return <div className="solitaire-tableau" data-solitaire-tableau={pileIndex} key={pileIndex} style={{paddingTop:positions.at(-1)||0}}>
            {!pile.length && <button className={`solitaire-card is-empty solitaire-empty-column${hintTarget?' is-hint':''}`} disabled={disabled} onClick={() => activate(null,{kind:'tableau',pile:pileIndex})} onPointerDown={() => {suppressClick.current=false;}} aria-label={`Empty tableau ${pileIndex+1}`}><span className="solitaire-empty-mark">K</span></button>}
            {pile.map((card,index) => <button key={card.id} data-solitaire-card={card.id} className={`solitaire-card solitaire-tableau-card${stackSelected(pileIndex,index)?' is-selected':''}${card.id===hintId||(hintTarget&&index===pile.length-1)?' is-hint':''}${dragged(card.id)?' is-drag-source':''}`} style={{top:positions[index],zIndex:index+1}} disabled={disabled||!card.faceUp} aria-label={card.faceUp?`${cardName(card)}, tableau ${pileIndex+1}`:'Face-down card'} onClick={() => activate({kind:'tableau',pile:pileIndex,cardIndex:index},{kind:'tableau',pile:pileIndex})} onDoubleClick={()=>toFoundation({kind:'tableau',pile:pileIndex,cardIndex:index},card.id)} {...handlers(card.faceUp?{kind:'tableau',pile:pileIndex,cardIndex:index}:null)}>
              {card.faceUp?<PlayingCardFace card={card}/>:<span className="solitaire-card-back" aria-hidden="true"/>}
            </button>)}
          </div>;
        })}
      </div>
      {state.won?<div className="solitaire-win" role="group" aria-label="Deal completed">
        <div className="solitaire-win-suits" aria-hidden="true">{SUITS.map(suit=><span key={suit}>{symbols[suit]}</span>)}</div>
        <strong>{state.dailyDate?'Daily deal complete':'Well played'}</strong><span>{state.moves} moves · {time(state.elapsed)}</span>
        <button className="games-button" onClick={()=>newDeal({drawCount:state.drawCount,dailyDate:null})} disabled={!active}>Deal again</button>
      </div>:<div className="solitaire-footer">
        {canFinish&&<button className="games-button" onClick={()=>commit(autoFinish)} disabled={disabled}>Finish game</button>}
        <p className={`solitaire-help${hintMessage?' solitaire-hint-message':''}`}>{hintMessage||'Select a card, then its destination. Double-click sends it to a foundation.'}</p>
      </div>}
      {!saveAvailable && <p className="solitaire-help">Saving is unavailable in this browser.</p>}
    </div>
    <p className="solitaire-announcement" role="status">{notice}</p>
    {ghost && <div className="solitaire-drag-stack" style={{left:ghost.x,top:ghost.y,width:ghost.width,height:ghost.width/.72+(ghost.cards.length-1)*24}} aria-hidden="true">
      {ghost.cards.map((card,index)=><div key={card.id} className="solitaire-card solitaire-drag-card" style={{top:index*24}}><PlayingCardFace card={card}/></div>)}
    </div>}
  </section>;
}
