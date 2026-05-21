/**
 * InnerDesktop — Win95-style overlay that appears after the CRT boot sequence.
 *
 * Aesthetic / component patterns adapted from Henry Heffernan's open-source
 * portfolio-inner-site (MIT):
 *   https://github.com/henryjeff/portfolio-inner-site
 * Fonts (MSSansSerif, Millennium, Terminal) from the same repo (MIT).
 * Code, layout, content all original.
 */
import { useEffect, useState } from 'react';

/* ---------- Win95 CSS injected once ----------------------------------- */
// @import must be first in the injected <style> block or browsers ignore it;
// inject it as a separate <link> element instead.
const GFONTS_HREF = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;700&display=swap';

const WIN95_STYLE = `
@font-face {
  font-family: MSSerif;
  src: url('/fonts/MSSansSerif.ttf');
}
@font-face {
  font-family: Millennium;
  src: url('/fonts/Millennium.ttf');
}
@font-face {
  font-family: MillenniumBold;
  src: url('/fonts/Millennium-Bold.ttf');
}
@font-face {
  font-family: Terminal;
  src: url('/fonts/Terminal.ttf');
}

.win95-desktop {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: #3e9697;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-family: MSSerif, 'Arial', sans-serif;
  user-select: none;
}

/* Win95 border variables */
.win95-window {
  --btn-hi:  #ffffff;
  --btn-face:#c3c6ca;
  --btn-sh:  #86898d;
  --win-fr:  #2b2b2b;
  --raised-outer: inset -1px -1px var(--win-fr),  inset 1px 1px var(--btn-hi);
  --raised-inner: inset -2px -2px var(--btn-sh),  inset 2px 2px var(--btn-face);
  --sunken:       inset -1px -1px var(--btn-hi),  inset 1px 1px var(--btn-sh),
                  inset -2px -2px var(--btn-face), inset 2px 2px var(--win-fr);

  box-shadow: var(--raised-outer);
  background: var(--btn-face);
  display: flex;
  flex-direction: column;
  width: min(94vw, 900px);
  height: min(88vh, 640px);
  box-sizing: border-box;
}

.win95-titlebar {
  background: #0000a3;
  display: flex;
  align-items: center;
  padding: 3px 4px 3px 6px;
  gap: 6px;
  flex-shrink: 0;
}
.win95-titlebar-title {
  flex: 1;
  font-family: MSSerif;
  font-size: 12px;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.win95-titlebar-icon {
  width: 14px;
  height: 14px;
  background: #c3c6ca;
  border: 1px solid #86898d;
  font-size: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: MSSerif;
  cursor: pointer;
  flex-shrink: 0;
  color: #000;
  box-shadow: inset -1px -1px #2b2b2b, inset 1px 1px #fff;
}
.win95-titlebar-icon:active {
  box-shadow: inset 1px 1px #2b2b2b, inset -1px -1px #fff;
}

.win95-body {
  display: flex;
  flex: 1;
  overflow: hidden;
  box-shadow: var(--raised-inner);
  margin: 3px;
}

/* ---- left nav panel ---- */
.win95-nav {
  width: 240px;
  flex-shrink: 0;
  background: #c3c6ca;
  box-shadow: var(--sunken);
  display: flex;
  flex-direction: column;
  padding: 24px 20px 16px 20px;
  box-sizing: border-box;
  overflow: hidden;
}
.win95-nav-name {
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 34px;
  line-height: 1.0;
  color: #000;
  margin-bottom: 4px;
}
.win95-nav-subtitle {
  font-family: Millennium, Georgia, serif;
  font-size: 13px;
  color: #333;
  margin-bottom: 24px;
}
.win95-nav-links {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.win95-nav-link {
  display: flex;
  align-items: center;
  margin-bottom: 18px;
  cursor: pointer;
  text-decoration: none;
}
.win95-nav-link-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  border: 2px solid #551a8b;
  margin-right: 8px;
  flex-shrink: 0;
  visibility: hidden;
}
.win95-nav-link.active .win95-nav-link-dot {
  visibility: visible;
}
.win95-nav-link h4 {
  font-family: MillenniumBold, 'Times New Roman', serif;
  font-size: 16px;
  font-weight: bold;
  text-decoration: underline;
  color: #000;
  margin: 0;
  letter-spacing: 0px;
}
.win95-nav-link:hover h4 { color: #0000aa; }
.win95-nav-link.flash h4 { color: red; }
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
  padding: 0;
  display: flex;
  flex-direction: column;
}
.win95-home {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px;
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
  font-size: 20px;
  color: #444;
  margin-bottom: 48px;
}
.win95-home-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
}
.win95-btn {
  font-family: Millennium, serif;
  font-size: 16px;
  background: #c3c6ca;
  border: none;
  padding: 6px 20px;
  cursor: pointer;
  color: #000;
  box-shadow: inset -1px -1px #2b2b2b, inset 1px 1px #fff,
              inset -2px -2px #86898d, inset 2px 2px #c3c6ca;
}
.win95-btn:hover { background: #d4d8dc; }
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
  padding: 0 8px;
  flex-shrink: 0;
  font-family: MSSerif;
  font-size: 11px;
  color: #333;
  box-shadow: inset 0 1px #fff;
}
.win95-statusbar-cell {
  padding: 1px 8px;
  box-shadow: var(--sunken);
  margin-right: 4px;
}

/* ---- toolbar ---- */
.win95-toolbar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 30px;
  background: #c3c6ca;
  border-top: 1px solid #fff;
  display: flex;
  align-items: center;
  padding: 2px 4px;
  box-shadow: inset 0 1px #fff;
  z-index: 10;
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
              inset -2px -2px #86898d, inset 2px 2px #c3c6ca;
}
.win95-start-btn:active {
  box-shadow: inset -1px -1px #fff, inset 1px 1px #2b2b2b,
              inset -2px -2px #c3c6ca, inset 2px 2px #86898d;
}
.win95-start-logo {
  width: 16px;
  height: 16px;
}
.win95-toolbar-spacer { flex: 1; }
.win95-clock {
  font-family: MSSerif;
  font-size: 12px;
  color: #000;
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
              inset -2px -2px #86898d, inset 2px 2px #c3c6ca;
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

/* ---------- nav link items --------------------------------------------- */
const NAV_LINKS: { label: string; href: string }[] = [
  { label: 'RESEARCH', href: '/research' },
  { label: 'TALKS',    href: '/talks'    },
  { label: 'LIBRARY',  href: '/library'  },
  { label: 'NOW',      href: '/now'      },
];

/* ---------- Win95 NavLink ---------------------------------------------- */
function NavLink({ label, href, active }: { label: string; href: string; active?: boolean }) {
  const [flash, setFlash] = useState(false);
  const go = (e: React.MouseEvent) => {
    e.preventDefault();
    setFlash(true);
    setTimeout(() => { window.location.href = href; }, 100);
  };
  return (
    <a
      href={href}
      className={`win95-nav-link ${active ? 'active' : ''} ${flash ? 'flash' : ''}`}
      onMouseDown={go}
    >
      <span className="win95-nav-link-dot" />
      <h4>{label}</h4>
    </a>
  );
}

/* ---------- main component --------------------------------------------- */
interface InnerDesktopProps {
  onClose: () => void; // back to study
}

export default function InnerDesktop({ onClose }: InnerDesktopProps) {
  const [time, setTime] = useState(getTime);

  // inject CSS + Google Fonts once
  useEffect(() => {
    const id = 'win95-styles';
    if (!document.getElementById(id)) {
      const s = document.createElement('style');
      s.id = id;
      s.textContent = WIN95_STYLE;
      document.head.appendChild(s);
    }
    const linkId = 'win95-gfonts';
    if (!document.getElementById(linkId)) {
      const l = document.createElement('link');
      l.id = linkId;
      l.rel = 'stylesheet';
      l.href = GFONTS_HREF;
      document.head.appendChild(l);
    }
  }, []);

  // tick clock
  useEffect(() => {
    const id = setInterval(() => setTime(getTime()), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="win95-desktop">
      {/* the window */}
      <div className="win95-window">
        {/* title bar */}
        <div className="win95-titlebar">
          <span className="win95-titlebar-title">
            Prashant Garg — Academic
          </span>
          <span className="win95-titlebar-icon" title="Minimise">_</span>
          <span className="win95-titlebar-icon" title="Maximise">□</span>
          <span
            className="win95-titlebar-icon"
            title="Close / back to study"
            onClick={onClose}
          >✕</span>
        </div>

        {/* body: nav + content */}
        <div className="win95-body">
          {/* left nav */}
          <nav className="win95-nav">
            <div className="win95-nav-name">Prashant<br/>Garg</div>
            <div className="win95-nav-subtitle">Economist · PhD Candidate</div>
            <div className="win95-nav-links">
              {NAV_LINKS.map(l => (
                <NavLink key={l.href} label={l.label} href={l.href} />
              ))}
            </div>
            <div className="win95-nav-spacer" />
            <span className="win95-nav-back" onClick={onClose}>
              ← back to study
            </span>
          </nav>

          {/* right content — home splash */}
          <div className="win95-content">
            <div className="win95-home">
              <div className="win95-home-name">
                Prashant<br/>Garg
              </div>
              <div className="win95-home-subtitle">
                Economist · Bocconi PhD · Imperial · LSE
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

        {/* status bar */}
        <div className="win95-statusbar">
          <span className="win95-statusbar-cell">Ready</span>
        </div>
      </div>

      {/* desktop toolbar */}
      <div className="win95-toolbar">
        <button className="win95-start-btn">
          {/* simple 4-colour Windows flag */}
          <svg className="win95-start-logo" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="0" width="7" height="7" fill="#f25022"/>
            <rect x="9" y="0" width="7" height="7" fill="#7fba00"/>
            <rect x="0" y="9" width="7" height="7" fill="#00a4ef"/>
            <rect x="9" y="9" width="7" height="7" fill="#ffb900"/>
          </svg>
          Start
        </button>
        <div className="win95-toolbar-spacer" />
        <div className="win95-clock">{time}</div>
      </div>
    </div>
  );
}
