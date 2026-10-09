const ink = '#2b2b2b';
const paper = '#f4f4f4';

export function AccessoriesIcon() {
  return <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
    <rect x="3" y="5" width="26" height="22" fill={paper} stroke={ink}/>
    <rect x="7" y="9" width="7" height="6" fill="var(--color-brand-teal)" stroke={ink}/>
    <rect x="18" y="9" width="7" height="6" fill="#d7c47a" stroke={ink}/>
    <rect x="7" y="18" width="7" height="6" fill="#c87878" stroke={ink}/>
    <rect x="18" y="18" width="7" height="6" fill="#8c9bd1" stroke={ink}/>
  </svg>;
}

export function NotepadIcon() {
  return <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
    <path d="M7 3h14l4 4v22H7z" fill={paper} stroke={ink}/>
    <path d="M21 3v5h5" fill="#d7d7d7" stroke={ink}/>
    {[13,17,21].map(y => <line key={y} x1="11" y1={y} x2="21" y2={y} stroke={ink} strokeWidth="1.2" />)}
  </svg>;
}

export function PaintIcon() {
  return <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
    <path d="M5 7h22v16H5z" fill={paper} stroke={ink}/>
    <path d="M8 11h16M8 15h9M8 19h13" stroke="var(--color-brand-teal)" strokeWidth="2"/>
    <path d="M21 24l6 5" stroke={ink} strokeWidth="2" />
    <path d="M20 25l3-3 3 3-3 3z" fill="#d7c47a" stroke={ink}/>
  </svg>;
}

export function CalculatorIcon() {
  return <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
    <rect x="5" y="3" width="22" height="26" fill="#d7d7d7" stroke={ink}/>
    <rect x="9" y="7" width="14" height="5" fill="#fff" stroke={ink}/>
    {[15,20,25].flatMap(y => [10,16,22].map(x => <rect key={`${x}-${y}`} x={x - 2} y={y - 2} width="4" height="3" fill={paper} stroke={ink} strokeWidth=".6" />))}
  </svg>;
}

export function FocusTimerIcon() {
  return <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
    <circle cx="16" cy="17" r="10" fill={paper} stroke={ink}/>
    <line x1="16" y1="17" x2="16" y2="10" stroke="var(--color-brand-teal)" strokeWidth="2" />
    <line x1="16" y1="17" x2="21" y2="20" stroke={ink} strokeWidth="2" />
    <path d="M13 4h6M16 4v3" stroke={ink} strokeWidth="2" />
  </svg>;
}

export function FilingCabinetIcon() {
  return <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
    <rect x="5" y="3" width="22" height="26" fill="#d7d7d7" stroke={ink}/>
    {[8,15,22].map(y => <g key={y}><rect x="8" y={y} width="16" height="5" fill={paper} stroke={ink}/><line x1="14" y1={y + 2.5} x2="18" y2={y + 2.5} stroke={ink}/></g>)}
  </svg>;
}

export function AmbientMixerIcon() {
  return <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
    <rect x="4" y="4" width="24" height="24" fill={paper} stroke={ink}/>
    {[10,16,22].map((x, i) => <g key={x}><line x1={x} y1="8" x2={x} y2="24" stroke={ink} strokeWidth="2"/><circle cx={x} cy={[13,19,11][i]} r="3" fill="var(--color-brand-teal)" stroke={ink}/></g>)}
  </svg>;
}

export function SequencerIcon() {
  return <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
    <rect x="2" y="5" width="28" height="22" fill={paper} stroke={ink}/>
    {[11,17,23].flatMap((y, r) => [7,13,19,25].map((x, c) => <rect key={`${x}-${y}`} x={x - 2} y={y - 2} width="4" height="4" fill={(r + c) % 3 === 0 ? 'var(--color-brand-teal)' : ink}/>))}
  </svg>;
}
