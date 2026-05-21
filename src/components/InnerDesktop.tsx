/**
 * InnerDesktop — Win95-style overlay that appears after the CRT boot sequence.
 *
 * Aesthetic / component patterns adapted from Henry Heffernan's open-source
 * portfolio-inner-site (MIT):
 *   https://github.com/henryjeff/portfolio-inner-site
 * Fonts (MSSansSerif, Millennium, Terminal) from the same repo (MIT).
 * Code, layout, content all original.
 *
 * Features borrowed from Henry's Window.tsx:
 *   - draggable by title bar
 *   - resizable from bottom-right grip
 *   - active / inactive state (title bar dims when unfocused)
 *   - maximize toggle (dbl-click title bar or □ button)
 *   - minimize to taskbar button (click _ or the taskbar chip)
 */
import { useEffect, useRef, useState } from 'react';

/* ---------- Win95 CSS injected once ----------------------------------- */
const GFONTS_HREF = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;700&display=swap';

const WIN95_STYLE = `
@font-face { font-family: MSSerif;        src: url('/fonts/MSSansSerif.ttf'); }
@font-face { font-family: Millennium;     src: url('/fonts/Millennium.ttf'); }
@font-face { font-family: MillenniumBold; src: url('/fonts/Millennium-Bold.ttf'); }
@font-face { font-family: Terminal;       src: url('/fonts/Terminal.ttf'); }

/* full-screen desktop backdrop */
.win95-desktop {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: #3e9697;
  overflow: hidden;            /* positioning context for absolute windows */
  font-family: MSSerif, 'Arial', sans-serif;
  user-select: none;
}

/* ---------- window chrome ----------------------------------------- */
.win95-window {
  --btn-hi:   #ffffff;
  --btn-face: #c3c6ca;
  --btn-sh:   #86898d;
  --win-fr:   #2b2b2b;
  --raised-outer: inset -1px -1px var(--win-fr),  inset 1px 1px var(--btn-hi);
  --raised-inner: inset -2px -2px var(--btn-sh),  inset 2px 2px var(--btn-face);
  --sunken:       inset -1px -1px var(--btn-hi),  inset 1px 1px var(--btn-sh),
                  inset -2px -2px var(--btn-face), inset 2px 2px var(--win-fr);

  position: absolute;          /* positioned by JS state */
  box-shadow: var(--raised-outer);
  background: var(--btn-face);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  min-width: 520px;
  min-height: 360px;
}

/* ---------- title bar --------------------------------------------- */
.win95-titlebar {
  display: flex;
  align-items: center;
  padding: 3px 4px 3px 6px;
  gap: 5px;
  flex-shrink: 0;
  /* background set inline (active = #0000a3, inactive = #686868) */
}
.win95-titlebar-title {
  flex: 1;
  font-family: MSSerif;
  font-size: 12px;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;      /* let drag pass through text */
}
.win95-titlebtn {
  width: 16px;
  height: 14px;
  background: #c3c6ca;
  border: none;
  font-size: 9px;
  font-family: MSSerif, Arial, sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: inset -1px -1px var(--win-fr), inset 1px 1px #fff;
  color: #000;
  flex-shrink: 0;
  padding: 0;
}
.win95-titlebtn:active {
  box-shadow: inset 1px 1px var(--win-fr), inset -1px -1px #fff;
}
.win95-titlebtn-close { margin-left: 2px; }

/* ---------- body (nav + content) ---------------------------------- */
.win95-body {
  display: flex;
  flex: 1;
  overflow: hidden;
  box-shadow: var(--raised-inner);
  margin: 3px;
}

/* ---- left nav panel ---- */
.win95-nav {
  width: 220px;
  flex-shrink: 0;
  background: #c3c6ca;
  box-shadow: var(--sunken);
  display: flex;
  flex-direction: column;
  padding: 20px 18px 14px 18px;
  box-sizing: border-box;
  overflow: hidden;
}
.win95-nav-name {
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 32px;
  line-height: 1.0;
  color: #000;
  margin-bottom: 4px;
}
.win95-nav-subtitle {
  font-family: Millennium, Georgia, serif;
  font-size: 12px;
  color: #333;
  margin-bottom: 20px;
}
.win95-nav-links { display: flex; flex-direction: column; }
.win95-nav-link {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  cursor: pointer;
  text-decoration: none;
}
.win95-nav-link-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  border: 2px solid #551a8b;
  margin-right: 8px;
  flex-shrink: 0;
  visibility: hidden;
}
.win95-nav-link.active .win95-nav-link-dot { visibility: visible; }
.win95-nav-link h4 {
  font-family: MillenniumBold, 'Times New Roman', serif;
  font-size: 15px;
  font-weight: bold;
  text-decoration: underline;
  color: #000;
  margin: 0;
}
.win95-nav-link:hover h4 { color: #0000aa; }
.win95-nav-link.flash  h4 { color: red; }
.win95-nav-spacer { flex: 1; }
.win95-nav-back {
  font-family: MSSerif;
  font-size: 12px;
  color: #555;
  cursor: pointer;
  text-decoration: underline;
}
.win95-nav-back:hover { color: #0000aa; }

/* ---- content area ---- */
.win95-content {
  flex: 1;
  overflow-y: auto;
  background: #fff;
  box-shadow: var(--sunken);
  display: flex;
  flex-direction: column;
}
.win95-home {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 36px;
  box-sizing: border-box;
  text-align: center;
}
.win95-home-name {
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 64px;
  line-height: 0.9;
  color: #1a1a1a;
  margin-bottom: 12px;
}
.win95-home-subtitle {
  font-family: Millennium, 'Times New Roman', serif;
  font-size: 18px;
  color: #444;
  margin-bottom: 40px;
}
.win95-home-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}
.win95-btn {
  font-family: Millennium, serif;
  font-size: 15px;
  background: #c3c6ca;
  border: none;
  padding: 5px 18px;
  cursor: pointer;
  color: #000;
  box-shadow: inset -1px -1px #2b2b2b, inset 1px 1px #fff,
              inset -2px -2px #86898d, inset 2px 2px #c3c6ca;
}
.win95-btn:hover  { background: #d4d8dc; }
.win95-btn:active {
  box-shadow: inset -1px -1px #fff, inset 1px 1px #2b2b2b,
              inset -2px -2px #c3c6ca, inset 2px 2px #86898d;
}

/* ---- status bar ---- */
.win95-statusbar {
  height: 20px;
  background: #c3c6ca;
  border-top: 1px solid #86898d;
  display: flex;
  align-items: center;
  padding: 0 4px;
  flex-shrink: 0;
  font-family: MSSerif;
  font-size: 11px;
  color: #333;
  box-shadow: inset 0 1px #fff;
  gap: 3px;
}
.win95-statusbar-cell {
  padding: 1px 6px;
  box-shadow: var(--sunken);
  height: 14px;
  line-height: 14px;
  white-space: nowrap;
}
.win95-statusbar-cell.wide { flex: 1; }
.win95-statusbar-cell.sm   { width: 16px; }

/* resize grip in status bar */
.win95-resize-grip {
  width: 16px;
  height: 16px;
  box-shadow: var(--sunken);
  cursor: nwse-resize;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  padding: 1px;
  flex-shrink: 0;
}

/* ---------- taskbar ------------------------------------------------ */
.win95-toolbar {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 30px;
  background: #c3c6ca;
  border-top: 1px solid #fff;
  display: flex;
  align-items: center;
  padding: 2px 4px;
  box-shadow: inset 0 1px #fff;
  z-index: 10;
  gap: 3px;
}
.win95-start-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  font-family: MillenniumBold, serif;
  font-size: 13px;
  background: #c3c6ca;
  border: none;
  cursor: pointer;
  box-shadow: inset -1px -1px #2b2b2b, inset 1px 1px #fff,
              inset -2px -2px #86898d,  inset 2px 2px #c3c6ca;
  flex-shrink: 0;
}
.win95-start-btn:active {
  box-shadow: inset -1px -1px #fff, inset 1px 1px #2b2b2b,
              inset -2px -2px #c3c6ca, inset 2px 2px #86898d;
}
/* taskbar window chip — always visible like real Win95 */
.win95-taskbar-chip {
  height: 22px;
  min-width: 120px;
  max-width: 180px;
  background: #c3c6ca;
  border: none;
  cursor: pointer;
  padding: 2px 6px;
  font-family: MSSerif;
  font-size: 12px;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 4px;
  /* raised = minimized or inactive */
  box-shadow: inset -1px -1px #2b2b2b, inset 1px 1px #fff,
              inset -2px -2px #86898d,  inset 2px 2px #c3c6ca;
}
/* sunken = window is active and visible */
.win95-taskbar-chip.focused {
  box-shadow: inset -1px -1px #fff, inset 1px 1px #2b2b2b,
              inset -2px -2px #c3c6ca, inset 2px 2px #86898d;
}
.win95-toolbar-spacer { flex: 1; }
.win95-clock {
  font-family: MSSerif;
  font-size: 12px;
  padding: 2px 8px;
  box-shadow: var(--sunken);
  white-space: nowrap;
}

/* scrollbar */
.win95-content::-webkit-scrollbar { width: 16px; }
.win95-content::-webkit-scrollbar-track { background: #c3c6ca; }
.win95-content::-webkit-scrollbar-thumb {
  background: #c3c6ca;
  box-shadow: inset -1px -1px #2b2b2b, inset 1px 1px #fff,
              inset -2px -2px #86898d,  inset 2px 2px #c3c6ca;
}
`;

/* ---------- helpers ---------------------------------------------------- */
function getTime() {
  const d = new Date();
  let h = d.getHours(); const m = d.getMinutes();
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m < 10 ? '0' + m : m} ${ap}`;
}

interface WinState { x: number; y: number; w: number; h: number; }

function getInitial(): WinState {
  if (typeof window === 'undefined') return { x: 60, y: 30, w: 860, h: 580 };
  const vw = window.innerWidth, vh = window.innerHeight - 30; // minus taskbar
  const w = Math.min(860, Math.round(vw * 0.90));
  const h = Math.min(580, Math.round(vh * 0.88));
  return {
    x: Math.round((vw - w) / 2),
    y: Math.round((vh - h) / 2),
    w, h,
  };
}

/* ---------- nav link items --------------------------------------------- */
const NAV_LINKS: { label: string; href: string }[] = [
  { label: 'RESEARCH', href: '/research' },
  { label: 'TALKS',    href: '/talks'    },
  { label: 'LIBRARY',  href: '/library'  },
  { label: 'NOW',      href: '/now'      },
];

/* ---------- Win95 NavLink ---------------------------------------------- */
function NavLink({ label, href }: { label: string; href: string }) {
  const [flash, setFlash] = useState(false);
  const go = (e: React.MouseEvent) => {
    e.preventDefault();
    setFlash(true);
    setTimeout(() => { window.location.href = href; }, 100);
  };
  return (
    <a
      href={href}
      className={`win95-nav-link ${flash ? 'flash' : ''}`}
      onMouseDown={go}
    >
      <span className="win95-nav-link-dot" />
      <h4>{label}</h4>
    </a>
  );
}

/* ---------- monitor icon (matches Win95Layout title bar icon) ----------- */
function MonitorIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <rect x="1" y="1" width="12" height="9" rx="1" fill="none" stroke="#fff" strokeWidth="1"/>
      <rect x="2" y="2" width="10" height="7" fill="#3e9697"/>
      <rect x="5" y="10" width="4" height="1.5" fill="#fff"/>
      <rect x="3" y="11.5" width="8" height="1" fill="#fff"/>
    </svg>
  );
}

/* ---------- resize grip icon ------------------------------------------- */
function ResizeGripIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg">
      <line x1="10" y1="4"  x2="4"  y2="10" stroke="#86898d" strokeWidth="1.2"/>
      <line x1="10" y1="7"  x2="7"  y2="10" stroke="#86898d" strokeWidth="1.2"/>
    </svg>
  );
}

/* ---------- main component --------------------------------------------- */
interface InnerDesktopProps {
  onClose: () => void;
}

export default function InnerDesktop({ onClose }: InnerDesktopProps) {
  const [time, setTime] = useState(getTime);
  const [win, setWin] = useState<WinState>(getInitial);
  const [isMaximized, setIsMaximized] = useState(false);
  const [preMax, setPreMax] = useState<WinState | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isActive, setIsActive] = useState(true);

  // inject CSS + Google Fonts once
  useEffect(() => {
    const id = 'win95-styles';
    if (!document.getElementById(id)) {
      const s = document.createElement('style');
      s.id = id; s.textContent = WIN95_STYLE;
      document.head.appendChild(s);
    }
    const linkId = 'win95-gfonts';
    if (!document.getElementById(linkId)) {
      const l = document.createElement('link');
      l.id = linkId; l.rel = 'stylesheet'; l.href = GFONTS_HREF;
      document.head.appendChild(l);
    }
  }, []);

  // tick clock
  useEffect(() => {
    const id = setInterval(() => setTime(getTime()), 5000);
    return () => clearInterval(id);
  }, []);

  /* ---- drag title bar ---- */
  const startDrag = (e: React.MouseEvent) => {
    if (isMaximized) return;
    e.preventDefault();
    e.stopPropagation();
    const sx = e.clientX, sy = e.clientY;
    const ox = win.x, oy = win.y;
    const onMove = (ev: MouseEvent) => {
      setWin(s => ({
        ...s,
        // keep at least the title bar in viewport
        x: Math.max(-s.w + 80, Math.min(window.innerWidth - 80, ox + ev.clientX - sx)),
        y: Math.max(0,          Math.min(window.innerHeight - 60, oy + ev.clientY - sy)),
      }));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
    };
    document.body.style.cursor = 'move';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  /* ---- resize bottom-right grip ---- */
  const startResize = (e: React.MouseEvent) => {
    if (isMaximized) return;
    e.preventDefault();
    e.stopPropagation();
    const sx = e.clientX, sy = e.clientY;
    const ow = win.w, oh = win.h;
    const onMove = (ev: MouseEvent) => {
      setWin(s => ({
        ...s,
        w: Math.max(520, ow + ev.clientX - sx),
        h: Math.max(360, oh + ev.clientY - sy),
      }));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
    };
    document.body.style.cursor = 'nwse-resize';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  /* ---- maximize / restore ---- */
  const toggleMaximize = () => {
    if (isMaximized) {
      if (preMax) setWin(preMax);
      setIsMaximized(false);
    } else {
      setPreMax(win);
      setIsMaximized(true);
    }
  };

  /* ---- minimize / restore ---- */
  const minimize = () => { setIsMinimized(true); setIsActive(false); };
  const restore  = () => { setIsMinimized(false); setIsActive(true); };

  /* ---- taskbar chip click ---- */
  const onChipClick = () => {
    if (isMinimized) { restore(); return; }
    if (isActive)    { minimize(); return; }
    setIsActive(true);
  };

  const titleBg = isActive ? '#0000a3' : '#686868';
  const chipFocused = !isMinimized && isActive;

  // window geometry: maximized fills viewport minus taskbar (30px)
  const windowStyle: React.CSSProperties = isMaximized
    ? { left: 0, top: 0, width: '100%', height: 'calc(100% - 30px)' }
    : { left: win.x, top: win.y, width: win.w, height: win.h };

  return (
    /* clicking the teal desktop background deactivates the window */
    <div className="win95-desktop" onMouseDown={() => setIsActive(false)}>

      {!isMinimized && (
        /* clicking anywhere on the window activates it */
        <div
          className="win95-window"
          style={windowStyle}
          onMouseDown={e => { e.stopPropagation(); setIsActive(true); }}
        >
          {/* ---- title bar ---- */}
          <div
            className="win95-titlebar"
            style={{ background: titleBg, cursor: isMaximized ? 'default' : 'move' }}
            onMouseDown={startDrag}
            onDoubleClick={e => { e.stopPropagation(); toggleMaximize(); }}
          >
            <MonitorIcon />
            <span className="win95-titlebar-title">Prashant Garg — Academic</span>
            <button
              className="win95-titlebtn"
              title="Minimise"
              onMouseDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); minimize(); }}
            >_</button>
            <button
              className="win95-titlebtn"
              title={isMaximized ? 'Restore' : 'Maximise'}
              onMouseDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); toggleMaximize(); }}
            >□</button>
            <button
              className="win95-titlebtn win95-titlebtn-close"
              title="Close / back to study"
              onMouseDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); onClose(); }}
            >✕</button>
          </div>

          {/* ---- body: left nav + right content ---- */}
          <div className="win95-body">
            <nav className="win95-nav">
              <div className="win95-nav-name">Prashant<br/>Garg</div>
              <div className="win95-nav-subtitle">Economist · Postdoc</div>
              <div className="win95-nav-links">
                {NAV_LINKS.map(l => <NavLink key={l.href} label={l.label} href={l.href} />)}
              </div>
              <div className="win95-nav-spacer" />
              <span className="win95-nav-back" onClick={onClose}>← back to study</span>
            </nav>

            <div className="win95-content">
              <div className="win95-home">
                <div className="win95-home-name">Prashant<br/>Garg</div>
                <div className="win95-home-subtitle">
                  Economist · Cambridge · Imperial · LSE
                </div>
                <div className="win95-home-buttons">
                  {NAV_LINKS.map(l => (
                    <button
                      key={l.href}
                      className="win95-btn"
                      onClick={() => { window.location.href = l.href; }}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ---- status bar ---- */}
          <div className="win95-statusbar">
            <span className="win95-statusbar-cell wide">Ready</span>
            <span className="win95-statusbar-cell">prashantgarg.os</span>
            <span className="win95-statusbar-cell sm" />
            {/* resize grip — only when not maximized */}
            {!isMaximized && (
              <div className="win95-resize-grip" onMouseDown={startResize}>
                <ResizeGripIcon />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---- taskbar ---- */}
      <div className="win95-toolbar">
        <button className="win95-start-btn">
          <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="0" width="7" height="7" fill="#f25022"/>
            <rect x="9" y="0" width="7" height="7" fill="#7fba00"/>
            <rect x="0" y="9" width="7" height="7" fill="#00a4ef"/>
            <rect x="9" y="9" width="7" height="7" fill="#ffb900"/>
          </svg>
          Start
        </button>

        {/* window chip — always visible, sunken when active */}
        <button
          className={`win95-taskbar-chip ${chipFocused ? 'focused' : ''}`}
          onClick={onChipClick}
        >
          <MonitorIcon />
          Prashant Garg
        </button>

        <div className="win95-toolbar-spacer" />
        <div className="win95-clock">{time}</div>
      </div>
    </div>
  );
}
