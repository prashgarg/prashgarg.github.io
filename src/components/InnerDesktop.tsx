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
import { papers, talks, affiliations, site } from '../data/site';

// Compute the most recent paper for the homepage "Latest" card.
// Sort by year desc, then by published > accepted > rr > working > other.
const STATUS_RANK: Record<string, number> = { published: 5, accepted: 4, rr: 3, working: 2, other: 1 };
const LATEST_PAPER = [...papers].sort((a, b) => {
  const yearDiff = (b.year || 0) - (a.year || 0);
  if (yearDiff !== 0) return yearDiff;
  return (STATUS_RANK[b.status] || 0) - (STATUS_RANK[a.status] || 0);
})[0];
const LATEST_PAPER_COUNT = papers.length;
const LATEST_TALK_COUNT = talks.length;

// Current affiliations (excluding past PhD and incoming Bocconi)
const CURRENT_AFFILIATIONS = affiliations.filter((a: any) => a.current);
const INCOMING_AFFILIATION = affiliations.find((a: any) => a.incoming);

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
/* Embedded mode — sized to the EXACT pixel rect of the CRT screen plane
   as projected to the viewport every frame. CSS vars --crt-left/top/w/h
   are written by CrtScreenProjector inside the R3F canvas. Fallbacks
   keep the overlay sensible if the projector hasn't run yet. */
.win95-desktop.embedded {
  inset: auto;
  top:    var(--crt-top,  50%);
  left:   var(--crt-left, 50%);
  width:  var(--crt-w,    min(66vw, 880px));
  height: var(--crt-h,    min(78vh, 670px));
  transform: none;
  box-shadow: 0 0 0 2px #2b2b2b, 0 18px 50px rgba(0,0,0,0.55);
  /* fade-in when boot completes and InnerDesktop mounts */
  animation: w95-fadein 0.55s cubic-bezier(0.16, 1, 0.3, 1) both;
}
@keyframes w95-fadein {
  0%   { opacity: 0; }
  100% { opacity: 1; }
}
/* When embedded, the inner window is forced to fill the CRT box. Drop
   the desktop-mode min sizes so the chrome doesn't overflow on smaller
   CRT projections. */
.win95-desktop.embedded .win95-window {
  min-width:  0;
  min-height: 0;
}
/* Sidebar shrinks too — 220 px is a lot of a ~600 px-wide CRT. */
.win95-desktop.embedded .win95-nav {
  width: 170px;
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
  align-items: stretch;
  justify-content: flex-start;
  height: 100%;
  padding: 28px 40px 24px;
  box-sizing: border-box;
  overflow-y: auto;
}
.win95-home-header {
  text-align: center;
  margin-bottom: 22px;
}
.win95-home-name {
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 56px;
  line-height: 0.95;
  color: #1a1a1a;
  margin-bottom: 8px;
}
.win95-home-subtitle {
  font-family: Millennium, 'Times New Roman', serif;
  font-size: 15px;
  color: #444;
  margin-bottom: 14px;
}
.win95-home-stats {
  display: flex;
  gap: 14px;
  justify-content: center;
  font-family: MSSerif, Arial, sans-serif;
  font-size: 11px;
  color: #444;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.win95-home-stats .dot {
  color: #8a8a8a;
}
/* Sectioned card grid below the header */
.win95-home-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}
.win95-card {
  background: #FFFFFF;
  padding: 12px 14px;
  box-shadow: inset -1px -1px #fff, inset 1px 1px #86898d,
              inset -2px -2px #c3c6ca, inset 2px 2px #2b2b2b;
  display: flex;
  flex-direction: column;
}
.win95-card-label {
  font-family: MSSerif, Arial, sans-serif;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.10em;
  color: #6a6a6a;
  margin-bottom: 6px;
}
.win95-card-title {
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 17px;
  line-height: 1.25;
  color: #1a1a1a;
  margin-bottom: 6px;
}
.win95-card-meta {
  font-family: MSSerif, Arial, sans-serif;
  font-size: 11px;
  color: #555;
  margin-bottom: 8px;
}
.win95-card-link {
  font-family: MSSerif, Arial, sans-serif;
  font-size: 12px;
  color: #0000a3;
  text-decoration: underline;
  cursor: pointer;
  margin-top: auto;
}
.win95-card-text {
  font-family: Millennium, serif;
  font-size: 13px;
  line-height: 1.45;
  color: #2a2a2a;
}
.win95-home-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: auto;
  padding-top: 8px;
}
/* AFFILIATIONS strip — full-width below the 2-card grid */
.win95-affil {
  background: #FFFFFF;
  padding: 10px 14px;
  box-shadow: inset -1px -1px #fff, inset 1px 1px #86898d,
              inset -2px -2px #c3c6ca, inset 2px 2px #2b2b2b;
  margin-bottom: 12px;
}
.win95-affil-label {
  font-family: MSSerif, Arial, sans-serif;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.10em;
  color: #6a6a6a;
  margin-bottom: 6px;
}
.win95-affil-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.win95-affil-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-family: Millennium, serif;
  font-size: 13px;
  line-height: 1.35;
}
.win95-affil-role { color: #6a6a6a; min-width: 0; flex-shrink: 0; }
.win95-affil-org {
  color: #1a1a1a; text-decoration: none;
  border-bottom: 1px dotted rgba(0,0,0,0.30);
}
.win95-affil-org:hover { color: #0000a3; }
.win95-affil-tag {
  font-family: MSSerif, Arial, sans-serif;
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 1px 5px;
  background: #c3c6ca;
  color: #2b2b2b;
  margin-left: auto;
}
.win95-affil-tag.current  { background: #d8e8c8; color: #2a4a18; }
.win95-affil-tag.incoming { background: #ffe4b8; color: #6a3500; }

/* CONTACT strip — email + icon buttons */
.win95-contact {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 12px;
  margin-bottom: 12px;
  background: #c3c6ca;
  box-shadow: inset -1px -1px #fff, inset 1px 1px #86898d;
}
.win95-contact-email {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #1a1a1a;
  user-select: all;
}
.win95-copy-btn {
  font-family: MSSerif, Arial, sans-serif;
  font-size: 10px;
  padding: 2px 6px;
  background: #c3c6ca;
  border: none;
  cursor: pointer;
  box-shadow: inset -1px -1px #2b2b2b, inset 1px 1px #fff;
  color: #1a1a1a;
}
.win95-copy-btn:active {
  box-shadow: inset -1px -1px #fff, inset 1px 1px #2b2b2b;
}
.win95-copy-btn.copied { background: #d8e8c8; }
.win95-contact-spacer { flex: 1; }
.win95-contact-link {
  font-family: MSSerif, Arial, sans-serif;
  font-size: 11px;
  padding: 3px 10px;
  background: #c3c6ca;
  border: none;
  cursor: pointer;
  box-shadow: inset -1px -1px #2b2b2b, inset 1px 1px #fff,
              inset -2px -2px #86898d, inset 2px 2px #c3c6ca;
  text-decoration: none;
  color: #1a1a1a;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.win95-contact-link:hover { background: #d4d8dc; }
.win95-contact-link:active {
  box-shadow: inset -1px -1px #fff, inset 1px 1px #2b2b2b,
              inset -2px -2px #c3c6ca, inset 2px 2px #86898d;
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
/* system-tray mute button */
.win95-tray-btn {
  width: 26px; height: 22px;
  background: #c3c6ca;
  border: none; cursor: pointer; padding: 0;
  display: flex; align-items: center; justify-content: center;
  box-shadow: inset -1px -1px #2b2b2b, inset 1px 1px #fff,
              inset -2px -2px #86898d,  inset 2px 2px #c3c6ca;
}
.win95-tray-btn:active {
  box-shadow: inset -1px -1px #fff, inset 1px 1px #2b2b2b,
              inset -2px -2px #c3c6ca, inset 2px 2px #86898d;
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

/* ---------- synthesised UI click sounds (Henry Heffernan pattern, MIT) ---
 * Henry plays mouseDown.mp3 + mouseUp.mp3 from a positional 3D source at
 * the monitor location.  We achieve the same tactile feel by synthesising a
 * short noise burst — no audio file required.
 *
 * Two flavours (matching Henry's two-sound approach):
 *   'down' — 22 ms / 1800 Hz BPF / gain 0.22  (the press)
 *   'up'   — 15 ms / 3200 Hz BPF / gain 0.16  (the release)
 */
let _uiAc: AudioContext | null = null;

function getUiAc(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!_uiAc) {
    try {
      _uiAc = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
    } catch { return null; }
  }
  if (_uiAc.state === 'suspended') _uiAc.resume();
  return _uiAc;
}

function playUiClick(type: 'down' | 'up' = 'down') {
  const ac = getUiAc();
  if (!ac) return;
  const now     = ac.currentTime;
  const durS    = type === 'down' ? 0.022 : 0.015;
  const bpFreq  = type === 'down' ? 1800  : 3200;
  const gain    = type === 'down' ? 0.22  : 0.16;
  const samples = Math.floor(ac.sampleRate * durS);

  const buf = ac.createBuffer(1, samples, ac.sampleRate);
  const d   = buf.getChannelData(0);
  for (let i = 0; i < samples; i++) {
    // white noise shaped with a fast exponential decay
    d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (samples * 0.25));
  }

  const src = ac.createBufferSource();
  src.buffer = buf;

  const bpf        = ac.createBiquadFilter();
  bpf.type         = 'bandpass';
  bpf.frequency.value = bpFreq;
  bpf.Q.value      = 0.7;

  const g          = ac.createGain();
  g.gain.value     = gain;

  src.connect(bpf); bpf.connect(g); g.connect(ac.destination);
  src.start(now);
}

/* ---------- helpers ---------------------------------------------------- */
function getTime() {
  const d = new Date();
  let h = d.getHours(); const m = d.getMinutes();
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m < 10 ? '0' + m : m} ${ap}`;
}

interface WinState { x: number; y: number; w: number; h: number; }

const SS_WIN   = 'pg_win';
const SS_PHASE = 'pg_phase';
const SS_MUTED = 'pg_muted';

function getInitial(): WinState {
  if (typeof window === 'undefined') return { x: 60, y: 30, w: 860, h: 580 };
  // try to restore position from previous session visit
  try {
    const saved = sessionStorage.getItem(SS_WIN);
    if (saved) {
      const p = JSON.parse(saved) as WinState;
      // sanity-check it fits the current viewport
      if (p.x >= 0 && p.y >= 0 && p.w >= 520 && p.h >= 360) return p;
    }
  } catch { /* ignore */ }
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
    playUiClick('down');
    setFlash(true);
    setTimeout(() => { window.location.href = href; }, 100);
  };
  return (
    <a
      href={href}
      className={`win95-nav-link ${flash ? 'flash' : ''}`}
      onMouseDown={go}
      onMouseUp={() => playUiClick('up')}
    >
      <span className="win95-nav-link-dot" />
      <h4>{label}</h4>
    </a>
  );
}

/* ---------- contact strip (email + CV / scholar / github / X / bsky) --- */
function ContactStrip() {
  const [copied, setCopied] = useState(false);
  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(site.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      window.prompt('Copy email:', site.email);
    }
  };
  return (
    <div className="win95-contact">
      <span className="win95-contact-email">{site.email}</span>
      <button
        className={`win95-copy-btn${copied ? ' copied' : ''}`}
        onClick={copyEmail}
        onMouseDown={() => playUiClick('down')}
        onMouseUp={() => playUiClick('up')}
        title="Copy email"
      >{copied ? '✓ copied' : '📋 copy'}</button>
      <span className="win95-contact-spacer" />
      <a className="win95-contact-link" href={site.cv}      target="_blank" rel="noopener">CV ↗</a>
      <a className="win95-contact-link" href={site.scholar} target="_blank" rel="noopener">Scholar ↗</a>
      <a className="win95-contact-link" href={site.github}  target="_blank" rel="noopener">GitHub ↗</a>
      <a className="win95-contact-link" href={site.twitter} target="_blank" rel="noopener">X ↗</a>
      <a className="win95-contact-link" href={site.bluesky} target="_blank" rel="noopener">Bluesky ↗</a>
    </div>
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

/* ---------- volume icons (adapted from Study.tsx, MIT SVGs) ------------ */
function VolumeOnIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 149.48 122.85" width="12" height="12" fill="#2b2b2b">
      <path d="M87.87,61.64q0,25.53,0,51c0,4-1.16,7.34-4.91,9.36A7.37,7.37,0,0,1,74.24,121q-13.39-12.1-26.88-24.1c-3.16-2.82-6.26-5.7-9.54-8.38a6.53,6.53,0,0,0-3.7-1.41C27.56,87,21,87.05,14.44,87,5.08,87,.1,82.08,0,72.79Q0,61.08,0,49.38c.07-8.78,5.39-14,14.21-14.05,6.73,0,13.46,0,20.18-.06a5.09,5.09,0,0,0,3.06-1.15q17.58-15.46,35-31.06C75.59.3,78.82-.71,82.75,1S87.83,6,87.85,9.85c.06,13.53,0,27.06,0,40.59Z" transform="translate(0 -0.15)"/>
      <path d="M149.48,62.67c-1.15,16.31-7.19,28.67-18.4,38.5-3.33,2.92-7.63,3-10.05.29s-1.94-6.62,1.24-9.53c5.68-5.18,10.33-11,12.44-18.54,4.23-15,1.13-28.3-9.75-39.63-1.09-1.13-2.32-2.14-3.38-3.3-2.52-2.75-2.65-6.65-.36-9a6.76,6.76,0,0,1,9.05-.27c9.84,8.43,16.26,18.91,18.37,31.79C149.24,56.64,149.3,60.38,149.48,62.67Z" transform="translate(0 -0.15)"/>
      <path d="M123,61.54a25.75,25.75,0,0,1-8.75,19.53c-2.85,2.56-7,2.71-9.43.29S102.2,74.9,105,72c2.27-2.34,4.46-4.66,4.94-8.08.67-4.66-.48-8.68-4-11.92-1.91-1.75-3.34-3.76-2.87-6.51.41-2.4,1.52-4.35,4-5.19A6.85,6.85,0,0,1,114.19,42,25.77,25.77,0,0,1,123,61.54Z" transform="translate(0 -0.15)"/>
    </svg>
  );
}
function VolumeOffIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 153.1 122.85" width="12" height="12" fill="#2b2b2b">
      <path d="M87.87,61.64q0,25.53,0,51c0,4-1.16,7.34-4.91,9.36A7.37,7.37,0,0,1,74.24,121q-13.39-12.1-26.88-24.1c-3.16-2.82-6.26-5.7-9.54-8.38a6.53,6.53,0,0,0-3.7-1.41C27.56,87,21,87.05,14.44,87,5.08,87,.1,82.08,0,72.79Q0,61.08,0,49.38c.07-8.78,5.39-14,14.21-14.05,6.73,0,13.46,0,20.18-.06a5.09,5.09,0,0,0,3.06-1.15q17.58-15.46,35-31.06C75.59.3,78.82-.71,82.75,1S87.83,6,87.85,9.85c.06,13.53,0,27.06,0,40.59Z" transform="translate(0 -0.15)"/>
      <path d="M137.18,62.29c4.61,4.19,9.06,8.13,13.38,12.2,2.66,2.52,3.19,5.58,1.78,8.23-1.8,3.37-6.94,5.37-11.37,1.06q-5.72-5.55-11.43-11.1c-.44-.43-.9-.84-1.95-1.8-4.19,4.33-8.24,8.66-12.45,12.84-3,3-6,3.3-9.23,1.32a6,6,0,0,1-2-8.51,13.79,13.79,0,0,1,2-2.42c4.06-4,8.15-7.92,12.38-12-.54-.56-1-1.06-1.45-1.52-3.8-3.7-7.63-7.38-11.41-11.11-2.75-2.73-3.26-5.5-1.63-8.34,2.31-4,7.53-4.55,11.28-.88,4.24,4.15,8.27,8.5,12.51,12.89,1.06-1,1.56-1.4,2-1.86,3.77-3.74,7.52-7.49,11.31-11.22,2.56-2.52,5.4-3.15,8.26-1.91a6.27,6.27,0,0,1,3.1,8.84,13.16,13.16,0,0,1-2.2,2.75C146,53.72,142,57.66,137.18,62.29Z" transform="translate(0 -0.15)"/>
    </svg>
  );
}

/* ---------- main component --------------------------------------------- */
interface InnerDesktopProps {
  onClose: () => void;
  /** When true, the desktop renders as a centred window with the 3D
   *  scene visible around it (Henry Heffernan pattern). */
  embedded?: boolean;
}

export default function InnerDesktop({ onClose, embedded = false }: InnerDesktopProps) {
  const [time, setTime] = useState(getTime);
  const [win, setWin] = useState<WinState>(getInitial);
  // When embedded inside the CRT (the desktop container is only as big
  // as the CRT screen rect), default to MAXIMIZED so the inner window
  // fills the bezel cleanly instead of overflowing the right edge with
  // its 520 px min-width chrome.
  const [isMaximized, setIsMaximized] = useState(embedded);
  const [preMax, setPreMax] = useState<WinState | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isActive, setIsActive] = useState(true);

  // ---------- ambient audio (continues from the study) ----------
  const [muted, setMuted] = useState<boolean>(() => {
    try { return sessionStorage.getItem(SS_MUTED) === '1'; } catch { return false; }
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // When embedded inside the 3D scene the parent owns the audio
    // (Office.tsx's StudyAudio) — skip our own loop to avoid double playback.
    if (embedded) return;
    const audio = new Audio('/audio/ambient.mp3');
    audio.loop   = true;
    audio.volume = 0.32;
    audio.muted  = muted;
    audioRef.current = audio;
    // attempt autoplay; if blocked wait for first interaction
    audio.play().catch(() => {
      const resume = () => { audio.play().catch(() => {}); };
      document.addEventListener('pointerdown', resume, { once: true });
    });
    return () => { audio.pause(); audio.src = ''; };
  }, [embedded]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
    try { sessionStorage.setItem(SS_MUTED, muted ? '1' : '0'); } catch { /* ignore */ }
  }, [muted]);

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
    // signal to Study: if the user navigates away and comes back,
    // skip the dolly+boot animation and go straight to desktop
    try { sessionStorage.setItem(SS_PHASE, 'desktop'); } catch { /* ignore */ }
  }, []);

  // persist window geometry across navigations
  useEffect(() => {
    try { sessionStorage.setItem(SS_WIN, JSON.stringify(win)); } catch { /* ignore */ }
  }, [win]);

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
    <div className={`win95-desktop${embedded ? ' embedded' : ''}`} onMouseDown={() => setIsActive(false)}>

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
              onMouseDown={e => { e.stopPropagation(); playUiClick('down'); }}
              onMouseUp={() => playUiClick('up')}
              onClick={e => { e.stopPropagation(); minimize(); }}
            >_</button>
            <button
              className="win95-titlebtn"
              title={isMaximized ? 'Restore' : 'Maximise'}
              onMouseDown={e => { e.stopPropagation(); playUiClick('down'); }}
              onMouseUp={() => playUiClick('up')}
              onClick={e => { e.stopPropagation(); toggleMaximize(); }}
            >□</button>
            <button
              className="win95-titlebtn win95-titlebtn-close"
              title="Close / back to study"
              onMouseDown={e => { e.stopPropagation(); playUiClick('down'); }}
              onMouseUp={() => playUiClick('up')}
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
              <span
                className="win95-nav-back"
                onMouseDown={() => playUiClick('down')}
                onMouseUp={() => playUiClick('up')}
                onClick={onClose}
              >← back to study</span>
            </nav>

            <div className="win95-content">
              <div className="win95-home">
                <div className="win95-home-header">
                  <div className="win95-home-name">Prashant<br/>Garg</div>
                  <div className="win95-home-subtitle">
                    Economist · Research Associate at Cambridge
                  </div>
                  <div className="win95-home-stats">
                    <span>{LATEST_PAPER_COUNT} papers</span>
                    <span className="dot">·</span>
                    <span>{LATEST_TALK_COUNT} talks</span>
                    {INCOMING_AFFILIATION && (
                      <>
                        <span className="dot">·</span>
                        <span title="Incoming">→ {(INCOMING_AFFILIATION as any).org}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Two-card grid: most recent paper + current focus ("now") */}
                <div className="win95-home-grid">
                  {LATEST_PAPER && (
                    <div className="win95-card">
                      <div className="win95-card-label">Latest paper</div>
                      <div className="win95-card-title">{LATEST_PAPER.title}</div>
                      <div className="win95-card-meta">
                        {LATEST_PAPER.venue || 'Working paper'}{LATEST_PAPER.year ? ` · ${LATEST_PAPER.year}` : ''}
                        {LATEST_PAPER.coauthors.length ? ` · with ${LATEST_PAPER.coauthors.join(', ')}` : ''}
                      </div>
                      <a
                        className="win95-card-link"
                        href={`/research/${LATEST_PAPER.slug}`}
                        onMouseDown={() => playUiClick('down')}
                        onMouseUp={() => playUiClick('up')}
                      >Open paper →</a>
                    </div>
                  )}
                  <div className="win95-card">
                    <div className="win95-card-label">Now</div>
                    <div className="win95-card-text">
                      Cambridge, May 2026. Working on the <strong>Global Automation Atlas</strong> — mapping where automation arrives across global production networks and what it displaces.
                    </div>
                    <a
                      className="win95-card-link"
                      href="/now"
                      onMouseDown={() => playUiClick('down')}
                      onMouseUp={() => playUiClick('up')}
                    >Read more →</a>
                  </div>
                </div>

                {/* AFFILIATIONS strip — all roles from data */}
                <div className="win95-affil">
                  <div className="win95-affil-label">Affiliations</div>
                  <div className="win95-affil-list">
                    {affiliations.map((a: any, i: number) => (
                      <div className="win95-affil-row" key={i}>
                        <span className="win95-affil-role">{a.role} ·</span>
                        <a
                          href={a.url}
                          target="_blank"
                          rel="noopener"
                          className="win95-affil-org"
                          onMouseDown={() => playUiClick('down')}
                          onMouseUp={() => playUiClick('up')}
                        >{a.org}</a>
                        {a.current  && <span className="win95-affil-tag current">current</span>}
                        {a.incoming && <span className="win95-affil-tag incoming">incoming</span>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* CONTACT strip — email (selectable, copyable) + buttons */}
                <ContactStrip />

                <div className="win95-home-buttons">
                  {NAV_LINKS.map(l => (
                    <button
                      key={l.href}
                      className="win95-btn"
                      onMouseDown={() => playUiClick('down')}
                      onMouseUp={() => playUiClick('up')}
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
        <button
          className="win95-start-btn"
          onMouseDown={() => playUiClick('down')}
          onMouseUp={() => playUiClick('up')}
        >
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
          onMouseDown={() => playUiClick('down')}
          onMouseUp={() => playUiClick('up')}
          onClick={onChipClick}
        >
          <MonitorIcon />
          Prashant Garg
        </button>

        <div className="win95-toolbar-spacer" />
        {/* system tray: mute toggle */}
        <button
          className="win95-tray-btn"
          title={muted ? 'Unmute ambient' : 'Mute ambient'}
          onMouseDown={() => { playUiClick('down'); setMuted(m => !m); }}
          onMouseUp={() => playUiClick('up')}
        >
          {muted ? <VolumeOffIcon /> : <VolumeOnIcon />}
        </button>
        <div className="win95-clock">{time}</div>
      </div>
    </div>
  );
}
