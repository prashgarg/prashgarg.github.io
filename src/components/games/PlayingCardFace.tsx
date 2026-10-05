import type { Card } from './solitaireEngine';
import './PlayingCardFace.css';

const symbols: Record<Card['suit'], string> = {
  clubs: '♣',
  diamonds: '♦',
  hearts: '♥',
  spades: '♠',
};

const labels: Record<number, string> = {
  1: 'A',
  11: 'J',
  12: 'Q',
  13: 'K',
};

type Pip = { x: number; y: number; inverted?: boolean };

/* Positions follow the familiar casino-card layouts. Keeping these as
 * percentages lets the field stay legible when a tableau card is only a
 * few dozen pixels wide on a phone. */
const PIPS: Record<number, Pip[]> = {
  2: [{ x: 50, y: 25 }, { x: 50, y: 75, inverted: true }],
  3: [{ x: 50, y: 20 }, { x: 50, y: 50 }, { x: 50, y: 80, inverted: true }],
  4: [
    { x: 31, y: 27 }, { x: 69, y: 27 },
    { x: 31, y: 73, inverted: true }, { x: 69, y: 73, inverted: true },
  ],
  5: [
    { x: 31, y: 25 }, { x: 69, y: 25 }, { x: 50, y: 50 },
    { x: 31, y: 75, inverted: true }, { x: 69, y: 75, inverted: true },
  ],
  6: [
    { x: 31, y: 22 }, { x: 69, y: 22 }, { x: 31, y: 50 }, { x: 69, y: 50 },
    { x: 31, y: 78, inverted: true }, { x: 69, y: 78, inverted: true },
  ],
  7: [
    { x: 31, y: 20 }, { x: 69, y: 20 }, { x: 50, y: 38 },
    { x: 31, y: 52 }, { x: 69, y: 52 },
    { x: 31, y: 80, inverted: true }, { x: 69, y: 80, inverted: true },
  ],
  8: [
    { x: 31, y: 19 }, { x: 69, y: 19 }, { x: 50, y: 34 },
    { x: 31, y: 50 }, { x: 69, y: 50 }, { x: 50, y: 66 },
    { x: 31, y: 81, inverted: true }, { x: 69, y: 81, inverted: true },
  ],
  9: [
    { x: 31, y: 18 }, { x: 69, y: 18 }, { x: 31, y: 35 }, { x: 69, y: 35 },
    { x: 50, y: 50 },
    { x: 31, y: 65, inverted: true }, { x: 69, y: 65, inverted: true },
    { x: 31, y: 82, inverted: true }, { x: 69, y: 82, inverted: true },
  ],
  10: [
    { x: 31, y: 18 }, { x: 69, y: 18 }, { x: 31, y: 35 }, { x: 69, y: 35 },
    { x: 38, y: 50 }, { x: 62, y: 50 },
    { x: 31, y: 65, inverted: true }, { x: 69, y: 65, inverted: true },
    { x: 31, y: 82, inverted: true }, { x: 69, y: 82, inverted: true },
  ],
};

function CourtArt({ rank }: { rank: 11 | 12 | 13 }) {
  const half = rank === 11 ? <JackHalf /> : rank === 12 ? <QueenHalf /> : <KingHalf />;
  return (
    <svg className={`playing-card-court playing-card-court-${rank}`} viewBox="0 0 100 120" aria-hidden="true">
      <rect className="court-panel" x="10" y="5" width="80" height="110" rx="4" />
      <g>{half}</g>
      <g transform="translate(100 120) rotate(180)">{half}</g>
      <path className="court-divider" d="M17 60H83" />
    </svg>
  );
}

function JackHalf() {
  return <g>
    <path className="court-blue" d="M28 58c2-16 8-23 22-25 14 2 20 9 22 25l-8 2H36z" />
    <path className="court-red" d="M49 33c-4-7-2-15 5-20 4 6 5 11 1 17l-3 5z" />
    <circle className="court-skin" cx="50" cy="28" r="8" />
    <path className="court-ink" d="M43 26c3-6 12-7 16-1l-3-9c-5-4-11-3-15 1z" />
    <path className="court-gold" d="M48 37h5l4 20-7 5-7-5z" />
    <path className="court-ink" d="M63 56l18-20 2 2-17 22z" />
    <path className="court-gold" d="M78 34l5 2-3 4-5-2z" />
  </g>;
}

function QueenHalf() {
  return <g>
    <path className="court-blue" d="M27 59c3-18 10-25 23-27 13 2 20 9 23 27l-10 2H37z" />
    <path className="court-red" d="M41 18l5 6 4-8 4 8 6-6-2 14H43z" />
    <circle className="court-skin" cx="50" cy="31" r="8" />
    <path className="court-ink" d="M41 29c2-9 15-11 19-1l-2-10H43z" />
    <path className="court-gold" d="M44 40h12l6 18H38z" />
    <path className="court-red" d="M50 43c-6 5-6 11 0 15 6-4 6-10 0-15z" />
    <path className="court-gold" d="M70 38c-5 2-8 6-8 11 5 1 9-2 11-7z" />
    <circle className="court-red" cx="71" cy="35" r="3" />
  </g>;
}

function KingHalf() {
  return <g>
    <path className="court-red" d="M27 59c3-17 10-25 23-27 13 2 20 10 23 27l-10 2H37z" />
    <path className="court-gold" d="M40 22l3-10 7 7 7-7 3 10-4 8H44z" />
    <circle className="court-skin" cx="50" cy="32" r="8" />
    <path className="court-ink" d="M41 29c3-8 15-10 19-1l-2-9H43z" />
    <path className="court-blue" d="M42 42h16l5 17H37z" />
    <path className="court-gold" d="M68 34h3v24h-3zM65 34h9v4h-9z" />
    <circle className="court-red" cx="69.5" cy="31" r="3" />
  </g>;
}

export default function PlayingCardFace({ card }: { card: Card }) {
  const symbol = symbols[card.suit];
  const label = labels[card.rank] ?? String(card.rank);
  const court = card.rank === 11 || card.rank === 12 || card.rank === 13;

  return (
    <span className={`playing-card-face${card.suit === 'diamonds' || card.suit === 'hearts' ? ' is-red' : ''}`} aria-hidden="true">
      <span className="playing-card-frame" />
      <span className="playing-card-corner playing-card-corner-top"><b>{label}</b><span>{symbol}</span></span>
      <span className="playing-card-corner playing-card-corner-bottom"><b>{label}</b><span>{symbol}</span></span>
      {court ? <CourtArt rank={card.rank as 11 | 12 | 13} /> : card.rank === 1 ? (
        <span className="playing-card-ace">{symbol}</span>
      ) : (
        <span className={`playing-card-pips playing-card-pips-${card.rank}`}>
          {PIPS[card.rank].map((pip, index) => <span key={`${pip.x}-${pip.y}-${index}`} className={`playing-card-pip${pip.inverted ? ' is-inverted' : ''}`} style={{ left: `${pip.x}%`, top: `${pip.y}%` }}>{symbol}</span>)}
        </span>
      )}
    </span>
  );
}
