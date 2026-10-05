import { Component, Suspense, lazy, useRef, useState, type ReactNode } from 'react';
import './games.css';

const Snake = lazy(() => import('./Snake'));
const Solitaire = lazy(() => import('./Solitaire'));
const Minesweeper = lazy(() => import('./Minesweeper'));
type Game = 'snake' | 'solitaire' | 'minesweeper';
export interface GameProps {
  active: boolean;
  onSound?: (event: 'move' | 'win' | 'lose') => void;
}

function SnakeIcon() {
  return <svg viewBox="0 0 48 48" aria-hidden="true">
    <path d="M9 12h22v9H18v15h21" fill="none" stroke="var(--game-border)" strokeWidth="10" />
    <path d="M9 12h22v9H18v15h21" fill="none" stroke="var(--game-accent)" strokeWidth="6" />
    <path d="M7 10h2v2H7z" fill="var(--game-ink)" />
    <path d="M36 7h7v7h-7z" fill="var(--game-red)" stroke="var(--game-border)" />
  </svg>;
}
function SolitaireIcon() {
  return <svg viewBox="0 0 48 48" aria-hidden="true">
    <rect x="7" y="5" width="27" height="35" fill="var(--game-felt)" stroke="var(--game-border)" />
    <rect x="13" y="9" width="27" height="35" fill="var(--game-hi)" stroke="var(--game-border)" />
    <path d="M26 20c-7-7-15 2 0 13 15-11 7-20 0-13z" fill="var(--game-red)" />
    <path d="M16 13h3v4h-3zM34 36h3v4h-3z" fill="var(--game-red)" />
  </svg>;
}
function MinesweeperIcon() {
  return <svg viewBox="0 0 48 48" aria-hidden="true">
    <rect x="5" y="5" width="38" height="38" fill="var(--game-face)" stroke="var(--game-border)" />
    <path d="M7 40V7h33" fill="none" stroke="var(--game-hi)" strokeWidth="3" />
    <path d="M24 10v28M10 24h28M14 14l20 20M34 14L14 34" stroke="var(--game-ink)" strokeWidth="3" />
    <circle cx="24" cy="24" r="10" fill="var(--game-ink)" /><path d="M19 18h5v5h-5z" fill="var(--game-hi)" />
  </svg>;
}

class GameBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <p className="games-load-error" role="alert">This game couldn’t load. <button className="games-button" onClick={() => window.location.reload()}>Reload</button></p>;
    return this.props.children;
  }
}

export default function GamesApp({ active, onSound }: GameProps) {
  const [game, setGame] = useState<Game | null>(null);
  const [opened, setOpened] = useState<Set<Game>>(() => new Set());
  const rootRef = useRef<HTMLDivElement>(null);
  const choose = (next: Game) => {
    setOpened(previous => new Set(previous).add(next));
    setGame(next);
    requestAnimationFrame(() => rootRef.current?.querySelector<HTMLElement>(`[data-game-pane="${next}"]`)?.focus({preventScroll:true}));
  };
  const back = () => {
    const previous = game;
    setGame(null);
    requestAnimationFrame(() => rootRef.current?.querySelector<HTMLElement>(`[data-game-option="${previous}"]`)?.focus({preventScroll:true}));
  };
  return <div ref={rootRef} className="pg-games" data-game={game || 'folder'}>
    {game && <div className="games-header">
      <button type="button" className="games-button games-back" onClick={back}>← Games</button>
      <h1>{game === 'snake' ? 'Snake' : game === 'solitaire' ? 'Solitaire' : 'Minesweeper'}</h1>
    </div>}
    <div className="games-content">
      {!game && <div className="games-folder" aria-label="Games folder">
        <button type="button" className="games-shortcut" data-game-option="snake" onClick={() => choose('snake')}>
          <SnakeIcon /><span>Snake</span>
        </button>
        <button type="button" className="games-shortcut" data-game-option="solitaire" onClick={() => choose('solitaire')}>
          <SolitaireIcon /><span>Solitaire</span>
        </button>
        <button type="button" className="games-shortcut" data-game-option="minesweeper" onClick={() => choose('minesweeper')}>
          <MinesweeperIcon /><span>Minesweeper</span>
        </button>
      </div>}
      {opened.has('snake') && <div hidden={game !== 'snake'} className="games-pane" data-game-pane="snake" tabIndex={-1}>
        <GameBoundary><Suspense fallback={<p className="games-loading" role="status">Loading Snake…</p>}>
          <Snake active={active && game === 'snake'} onSound={onSound} />
        </Suspense></GameBoundary>
      </div>}
      {opened.has('solitaire') && <div hidden={game !== 'solitaire'} className="games-pane" data-game-pane="solitaire" tabIndex={-1}>
        <GameBoundary><Suspense fallback={<p className="games-loading" role="status">Loading Solitaire…</p>}>
          <Solitaire active={active && game === 'solitaire'} onSound={onSound} />
        </Suspense></GameBoundary>
      </div>}
      {opened.has('minesweeper') && <div hidden={game !== 'minesweeper'} className="games-pane" data-game-pane="minesweeper" tabIndex={-1}>
        <GameBoundary><Suspense fallback={<p className="games-loading" role="status">Loading Minesweeper…</p>}>
          <Minesweeper active={active && game === 'minesweeper'} onSound={onSound} />
        </Suspense></GameBoundary>
      </div>}
    </div>
    {!game && <div className="games-folder-status">3 items</div>}
  </div>;
}
