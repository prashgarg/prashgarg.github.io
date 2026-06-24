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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { papers, talks, site } from '../data/site';


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
/* PHONES + ALL TOUCH DEVICES: the CRT projection is wider than a
   portrait viewport (the monitor camera frames landscape), which
   clipped the desktop on both edges. Below 700px — and on ANY touch
   device, where G7 skips the 3D room entirely so there is no CRT to
   project into — the embedded desktop goes FULL-SCREEN. */
@media (max-width: 700px), (hover: none) and (pointer: coarse) {
  .win95-desktop.embedded {
    top: 0; left: 0;
    width: 100vw;
    height: 100dvh;
    box-shadow: none;
  }
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
  width: 140px;
  padding: 12px 10px;
}
.win95-desktop.embedded .win95-nav-name {
  font-size: 1.5rem;
  line-height: 1.05;
}
.win95-desktop.embedded .win95-nav-subtitle {
  font-size: 0.62rem;
  margin-top: 4px;
}
.win95-desktop.embedded .win95-nav-link {
  font-size: 0.78rem;
  padding: 3px 0;
}
.win95-desktop.embedded .win95-content {
  padding: 14px 18px;
}
/* slightly tighter title + body inside the window when CRT-fit */
.win95-desktop.embedded .win95-titlebar { padding: 2px 4px 2px 5px; }
.win95-desktop.embedded .win95-titlebar-title { font-size: 11px; }

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
/* G8: 16×14px buttons are untappable on touch — grow the hit areas.
   (The taskbar keeps its 30px height: maximized-window geometry and
   the Start-menu anchor are computed from that constant.) */
@media (hover: none) and (pointer: coarse) {
  .win95-titlebtn { width: 34px; height: 28px; font-size: 12px; }
  .win95-nav-link { padding: 8px 0; }
  .win95-startmenu-item { padding: 10px 8px 10px 6px; }
  .win95-context-item { padding: 8px 16px 8px 22px; }
}

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
  position: relative;            /* containing block for the iframe loading layer */
}
.win95-home {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  height: 100%;
  padding: 30px 38px;
  box-sizing: border-box;
  overflow-y: auto;
  gap: 18px;
}
/* masthead — photo on the SIDE (bigger), text to its right, left-aligned.
   Fills the panel width so there's no dead whitespace down the sides. */
.win95-home-header {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 30px;
  text-align: left;
}
.win95-home-headtext { flex: 1; min-width: 0; }
/* portrait — bigger white-matted print, sits on the left, doesn't shrink */
.win95-home-photo {
  width: 210px;
  height: auto;
  flex-shrink: 0;
  display: block;
  padding: 6px;
  background: #fff;
  box-shadow: inset 0 0 0 1px #c3c6ca, 1px 2px 0 rgba(0,0,0,0.25);
}
/* prose bio (mirrors the old site's bio) — left-aligned, fills column */
.win95-home-bio {
  font-family: Millennium, 'Times New Roman', serif;
  font-size: 17px;
  line-height: 1.6;
  color: #333;
  text-align: left;
  max-width: none;
  margin: 14px 0 0;
}
.win95-home-name {
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 52px;
  line-height: 0.98;
  color: #1a1a1a;
  margin-bottom: 6px;
}
.win95-home-subtitle {
  font-family: Millennium, 'Times New Roman', serif;
  font-size: 18px;
  color: #555;
}
/* narrow panel (beside the icon column on small monitors) — stack the
   masthead so the photo doesn't crowd the text */
@media (max-width: 640px) {
  .win95-home-header { flex-direction: column; align-items: center; text-align: center; gap: 14px; }
  .win95-home-photo { width: 150px; }
  .win95-home-bio { text-align: center; }
}

/* CONTACT strip — plain old-site text-link row (no buttons, no glyphs) */
.win95-contact {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 8px;
  margin-top: 14px;
}
.win95-contact-link {
  font-family: Millennium, 'Times New Roman', serif;
  font-size: 13px;
  color: #0000a3;
  text-decoration: none;
  border-bottom: 1px dotted rgba(0,0,32,0.35);
}
.win95-contact-link:hover { color: #0000ee; }
.win95-contact-sep { color: #8a8a8a; font-size: 12px; }
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

/* invisible resize handles on the 4 sides + 4 corners. Sit OUTSIDE
   the visible window box (-4 px offset) so they're easy to hit. */
.win95-resize-edge {
  position: absolute;
  z-index: 10;
}
.win95-resize-edge.n  { top: -4px;    left: 6px;     right: 6px;     height: 8px;  cursor: ns-resize; }
.win95-resize-edge.s  { bottom: -4px; left: 6px;     right: 6px;     height: 8px;  cursor: ns-resize; }
.win95-resize-edge.e  { right: -4px;  top: 6px;      bottom: 6px;    width: 8px;   cursor: ew-resize; }
.win95-resize-edge.w  { left: -4px;   top: 6px;      bottom: 6px;    width: 8px;   cursor: ew-resize; }
.win95-resize-edge.ne { top: -4px;    right: -4px;   width: 12px;    height: 12px; cursor: nesw-resize; }
.win95-resize-edge.nw { top: -4px;    left: -4px;    width: 12px;    height: 12px; cursor: nwse-resize; }
.win95-resize-edge.se { bottom: -4px; right: -4px;   width: 12px;    height: 12px; cursor: nwse-resize; }
.win95-resize-edge.sw { bottom: -4px; left: -4px;    width: 12px;    height: 12px; cursor: nesw-resize; }

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
  /* must sit above the window z-stack (windows bump an unbounded
     counter from ~100) but below the Start menu (9000) — G3 */
  z-index: 8000;
  gap: 3px;
}
.win95-start-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  font-family: MillenniumBold, serif;
  font-size: 13px;
  /* explicit black — otherwise inherits the site's cream text color,
     near-invisible on the light-grey taskbar chrome (G2) */
  color: #000;
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
  color: #000;
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
  color: #000;
  padding: 2px 8px;
  box-shadow: var(--sunken);
  white-space: nowrap;
}
/* system-tray mute button */
.win95-tray-btn {
  width: 26px; height: 22px;
  color: #000;
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
/* volume slider — Win95 styling instead of the modern blue native
   range control, which broke the period illusion (G6) */
.win95-vol-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 70px;
  height: 18px;
  background: transparent;
  cursor: pointer;
}
.win95-vol-slider::-webkit-slider-runnable-track {
  height: 4px;
  background: #86898d;
  box-shadow: inset 1px 1px #2b2b2b, inset -1px -1px #fff;
}
.win95-vol-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 11px;
  height: 18px;
  margin-top: -7px;
  border-radius: 0;
  background: #c3c6ca;
  box-shadow: inset -1px -1px #2b2b2b, inset 1px 1px #fff,
              inset -2px -2px #86898d,  inset 2px 2px #c3c6ca;
}
.win95-vol-slider::-moz-range-track {
  height: 4px;
  background: #86898d;
  box-shadow: inset 1px 1px #2b2b2b, inset -1px -1px #fff;
}
.win95-vol-slider::-moz-range-thumb {
  width: 11px;
  height: 18px;
  border: none;
  border-radius: 0;
  background: #c3c6ca;
  box-shadow: inset -1px -1px #2b2b2b, inset 1px 1px #fff,
              inset -2px -2px #86898d,  inset 2px 2px #c3c6ca;
}

/* scrollbar */
.win95-content::-webkit-scrollbar { width: 16px; }
.win95-content::-webkit-scrollbar-track { background: #c3c6ca; }
.win95-content::-webkit-scrollbar-thumb {
  background: #c3c6ca;
  box-shadow: inset -1px -1px #2b2b2b, inset 1px 1px #fff,
              inset -2px -2px #86898d,  inset 2px 2px #c3c6ca;
}

/* ---------- desktop icons (Win95 shortcut tiles on the teal bg) ---- */
.win95-icons {
  position: absolute;
  top: 14px; left: 14px;
  display: grid;
  grid-template-columns: 104px;   /* wider so the bigger icons fit */
  gap: 10px 0;
  z-index: 1;       /* below windows but above background */
}
.win95-desktop.embedded .win95-icons { top: 8px; left: 8px; }
/* ── HOME ON THE DESKTOP ────────────────────────────────────────────
   The Home content lives directly on the desktop (no Home window) —
   visible on boot and whenever windows are minimized. A cream Win95
   panel right of the icon column, centred, scrollable if cramped. */
.win95-desktop-home {
  position: absolute;
  left: 140px; right: 16px; top: 8px; bottom: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;     /* clicks outside the panel reach the desktop */
  z-index: 1;               /* below windows (z 100+), beside icons */
}
.win95-desktop-home-inner {
  pointer-events: auto;
  width: min(860px, 100%);
  max-height: 100%;
  overflow-y: auto;
  background: var(--color-cream, #F4EFE2);
  box-shadow: inset -1px -1px #86898d, inset 1px 1px #fff,
              inset -2px -2px #c3c6ca, inset 2px 2px #f4efe2,
              2px 3px 0 rgba(0,0,0,0.28);
}
@media (max-width: 700px) {
  .win95-desktop-home { left: 126px; right: 8px; }
  /* shrink the masthead so the panel reads cleanly in the narrow
     column beside the icons */
  .win95-desktop-home .win95-home { padding: 16px 14px 14px; }
  .win95-desktop-home .win95-home-name { font-size: 34px; }
}
.win95-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 7px 4px 5px;
  width: 104px;
  cursor: pointer;
  user-select: none;
  border: 1px solid transparent;
}
.win95-icon-img {
  width: 46px; height: 46px;
  display: flex; align-items: center; justify-content: center;
}
/* the icon SVGs are authored at 32px — let them scale to the larger box */
.win95-icon-img svg { width: 100%; height: 100%; }
.win95-icon-label {
  font-family: MSSerif, Arial, sans-serif;
  font-size: 12px;
  color: #fff;
  text-align: center;
  line-height: 1.2;
  text-shadow: 1px 1px 0 #000;
  padding: 1px 3px;
}
.win95-icon:hover .win95-icon-label {
  background: rgba(0, 0, 128, 0.55);
}
.win95-icon.selected .win95-icon-label {
  background: #000080;
  border: 1px dotted #c8c8c8;
}
.win95-icon.selected .win95-icon-img {
  filter: brightness(0.65) contrast(1.2);
}

/* ---------- Start menu --------------------------------------------- */
.win95-startmenu {
  position: absolute;
  left: 1px;
  bottom: 30px;       /* sits on top of the toolbar */
  width: 200px;
  background: #c3c6ca;
  box-shadow: inset -1px -1px #2b2b2b, inset 1px 1px #fff,
              inset -2px -2px #86898d, inset 2px 2px #c3c6ca,
              3px 3px 12px rgba(0,0,0,0.45);
  display: flex;
  z-index: 9000;
  animation: w95-startmenu-in 0.14s ease-out;
}
@keyframes w95-startmenu-in {
  from { transform: translateY(8px) scaleY(0.5); transform-origin: bottom; opacity: 0; }
  to   { transform: translateY(0)   scaleY(1);   opacity: 1; }
}
.win95-startmenu-spine {
  width: 26px;
  background: linear-gradient(to bottom, #000080 0%, #1084d0 100%);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 8px;
}
.win95-startmenu-spine span {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  color: #fff;
  font-family: MSSerif, Arial, sans-serif;
  font-size: 14px;
  font-weight: bold;
  letter-spacing: 1px;
}
.win95-startmenu-spine span b { color: #c8c8c8; }
.win95-startmenu-list {
  flex: 1;
  padding: 2px;
  display: flex;
  flex-direction: column;
}
.win95-startmenu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px 4px 6px;
  font-family: MSSerif, Arial, sans-serif;
  font-size: 12px;
  color: #000;
  cursor: pointer;
  user-select: none;
}
.win95-startmenu-item:hover {
  background: #000080;
  color: #fff;
}
.win95-startmenu-sep {
  height: 0;
  border-top: 1px solid #86898d;
  border-bottom: 1px solid #fff;
  margin: 3px 2px;
}
.win95-startmenu-icon { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

/* ---------- Right-click desktop context menu ----------------------- */
.win95-context {
  position: absolute;
  min-width: 160px;
  background: #c3c6ca;
  box-shadow: inset -1px -1px #2b2b2b, inset 1px 1px #fff,
              inset -2px -2px #86898d, inset 2px 2px #c3c6ca,
              2px 2px 10px rgba(0,0,0,0.40);
  padding: 2px;
  z-index: 9500;
  font-family: MSSerif, Arial, sans-serif;
  font-size: 12px;
  animation: w95-startmenu-in 0.12s ease-out;
}
.win95-context-item {
  display: flex;
  align-items: center;
  padding: 4px 16px 4px 22px;
  cursor: pointer;
  user-select: none;
  color: #000;
}
.win95-context-item:hover { background: #000080; color: #fff; }
.win95-context-item.disabled { color: #86898d; cursor: default; }
.win95-context-item.disabled:hover { background: transparent; color: #86898d; }
.win95-context-sep { height: 0; border-top: 1px solid #86898d; border-bottom: 1px solid #fff; margin: 3px 2px; }
.win95-context-chevron { margin-left: auto; padding-left: 24px; font-size: 10px; }

/* ---------- window open/close/minimize animations ----------------- */
.win95-window.opening {
  animation: w95-zoom-in 0.20s cubic-bezier(0.16,1,0.3,1);
  transform-origin: var(--from-x, 50%) var(--from-y, 50%);
}
.win95-window.closing {
  animation: w95-zoom-out 0.20s cubic-bezier(0.7,0,0.84,0) forwards;
  transform-origin: var(--from-x, 50%) var(--from-y, 50%);
}
.win95-window.minimizing {
  animation: w95-zoom-out 0.20s cubic-bezier(0.7,0,0.84,0) forwards;
  transform-origin: var(--to-x, 50%) 100%;
}
@keyframes w95-zoom-in {
  0%   { transform: scale(0.06); opacity: 0; }
  60%  { opacity: 1; }
  100% { transform: scale(1);    opacity: 1; }
}
@keyframes w95-zoom-out {
  0%   { transform: scale(1);    opacity: 1; }
  100% { transform: scale(0.06); opacity: 0; }
}

/* ---------- dialogs: Run…, System Properties, Wellness (G30/34/35) -- */
.win95-dialog {
  position: absolute;
  left: 50%; top: 38%;
  transform: translate(-50%, -50%);
  width: min(360px, calc(100vw - 24px));
  background: #c3c6ca;
  z-index: 9600;
  box-shadow: inset -1px -1px #2b2b2b, inset 1px 1px #fff,
              inset -2px -2px #86898d, inset 2px 2px #c3c6ca,
              3px 3px 14px rgba(0,0,0,0.45);
  font-family: MSSerif, Arial, sans-serif;
  font-size: 12px;
  color: #000;
  animation: w95-startmenu-in 0.12s ease-out;
}
.win95-dialog.wide { width: min(440px, calc(100vw - 24px)); }
.win95-dialog-titlebar {
  display: flex; align-items: center; justify-content: space-between;
  background: #0000a3; color: #fff;
  padding: 3px 4px 3px 8px;
  font-weight: bold;
}
.win95-dialog-body { padding: 12px; }
.win95-dialog-input {
  flex: 1;
  font-family: MSSerif, Arial, sans-serif;
  font-size: 16px;          /* >=16px: no iOS zoom */
  padding: 3px 5px;
  background: #fff;
  border: none;
  color: #000;
  box-shadow: inset 1px 1px #2b2b2b, inset -1px -1px #fff;
  min-width: 0;
}
.win95-dialog-error { margin-top: 8px; color: #a00000; }
.win95-dialog-buttons { display: flex; justify-content: flex-end; gap: 6px; margin-top: 12px; align-items: center; }
.win95-dialog-section { margin-bottom: 10px; line-height: 1.55; }
.win95-wellness-line { margin: 4px 0 10px; font-size: 13px; line-height: 1.6; }

/* ---------- G33: CRT flicker (Overtime Contingency) ----------------- */
.win95-crt-flicker {
  position: absolute; inset: 0;
  z-index: 9990;
  pointer-events: none;
  background: #fff;
  animation: w95-flicker 0.5s steps(2) both;
}
@keyframes w95-flicker {
  0% { opacity: 0; } 12% { opacity: 0.85; } 22% { opacity: 0.05; }
  38% { opacity: 0.6; } 52% { opacity: 0; } 68% { opacity: 0.4; } 100% { opacity: 0; }
}

/* ---------- G32: screensaver ---------------------------------------- */
.win95-screensaver {
  position: absolute; inset: 0;
  z-index: 9985;
  background: rgba(4, 6, 5, 0.93);
  cursor: none;
}
.win95-screensaver-logo {
  position: absolute; left: 0; top: 0;
  width: 230px;
  padding: 14px 18px;
  background: #0E1B16;
  border: 1px solid #2C4434;
  color: #A4D9C5;
  font-family: ui-monospace, 'SF Mono', Menlo, Monaco, monospace;
  will-change: transform;
}
.win95-screensaver-mark { font-size: 17px; letter-spacing: 0.04em; }
.win95-screensaver-mark b { color: #E8EEDF; }
.win95-screensaver-sub { font-size: 10px; opacity: 0.6; margin-top: 4px; }

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

// G41: BIOS "UI sounds" toggle — when disabled, all synth sounds no-op.
function soundsEnabled(): boolean {
  try { const c = JSON.parse(localStorage.getItem('pg_bios_v1') || '{}'); return c.sounds !== false; }
  catch { return true; }
}
function getUiAc(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!soundsEnabled()) return null;
  if (!_uiAc) {
    try {
      _uiAc = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
    } catch { return null; }
  }
  if (_uiAc.state === 'suspended') _uiAc.resume();
  return _uiAc;
}

// PER-VARIANT click profiles. The "variant" arg lets callers play a
// different timbre for different button types (Heffer-style layered
// clicks). Each variant tunes:
//   - durDown / durUp  — sample length of the press / release impulses
//   - freqDown / freqUp — bandpass centre frequencies
//   - gainDown / gainUp — peak gain
//   - decay — exponential decay rate of the noise envelope
type ClickVariant = 'default' | 'close' | 'soft' | 'tap' | 'menu' | 'titlebtn';
interface ClickProfile {
  durDown: number; durUp: number;
  freqDown: number; freqUp: number;
  gainDown: number; gainUp: number;
  decay: number;
}
const CLICK_PROFILES: Record<ClickVariant, ClickProfile> = {
  default:  { durDown: 0.022, durUp: 0.015, freqDown: 1800, freqUp: 3200, gainDown: 0.22, gainUp: 0.16, decay: 0.25 },
  // close (X button): sharper, brighter — almost a snap
  close:    { durDown: 0.018, durUp: 0.012, freqDown: 2600, freqUp: 4500, gainDown: 0.28, gainUp: 0.22, decay: 0.18 },
  // soft (primary action buttons): mellower, lower freq
  soft:     { durDown: 0.028, durUp: 0.020, freqDown: 1100, freqUp: 1900, gainDown: 0.18, gainUp: 0.12, decay: 0.32 },
  // tap (desktop icons): light, percussive
  tap:      { durDown: 0.016, durUp: 0.010, freqDown: 2100, freqUp: 2900, gainDown: 0.16, gainUp: 0.10, decay: 0.20 },
  // menu (start menu items): muted thunk
  menu:     { durDown: 0.020, durUp: 0.014, freqDown: 1400, freqUp: 2400, gainDown: 0.20, gainUp: 0.14, decay: 0.28 },
  // titlebtn (minimise/maximise): standard but slightly tighter
  titlebtn: { durDown: 0.020, durUp: 0.013, freqDown: 2000, freqUp: 3400, gainDown: 0.20, gainUp: 0.15, decay: 0.22 },
};

function playUiClick(type: 'down' | 'up' = 'down', variant: ClickVariant = 'default') {
  const ac = getUiAc();
  if (!ac) return;
  const p = CLICK_PROFILES[variant] || CLICK_PROFILES.default;
  const now     = ac.currentTime;
  const durS    = type === 'down' ? p.durDown : p.durUp;
  const bpFreq  = type === 'down' ? p.freqDown : p.freqUp;
  const gain    = type === 'down' ? p.gainDown : p.gainUp;
  const samples = Math.floor(ac.sampleRate * durS);

  const buf = ac.createBuffer(1, samples, ac.sampleRate);
  const d   = buf.getChannelData(0);
  for (let i = 0; i < samples; i++) {
    // white noise shaped with a fast exponential decay
    d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (samples * p.decay));
  }

  const src = ac.createBufferSource();
  src.buffer = buf;

  const bpf        = ac.createBiquadFilter();
  bpf.type         = 'bandpass';
  bpf.frequency.value = bpFreq;
  bpf.Q.value      = 0.7;

  const g          = ac.createGain();
  g.gain.value     = gain * (typeof window !== 'undefined' ? getUiVolume() : 1);

  src.connect(bpf); bpf.connect(g); g.connect(ac.destination);
  src.start(now);
}

// Window-open "ding" — synthesised two-tone bell instead of a WAV.
// A short 440 Hz + 660 Hz pair with exponential decay; reads as the
// classic Windows open-window chime without shipping audio assets.
function playWindowOpenDing() {
  const ac = getUiAc();
  if (!ac) return;
  const vol = (typeof window !== 'undefined' ? getUiVolume() : 1);
  if (vol <= 0.001) return;
  const now = ac.currentTime;
  const tones = [
    { freq: 988,  delay: 0.00, dur: 0.28, gain: 0.07 },  // B5
    { freq: 1318, delay: 0.06, dur: 0.32, gain: 0.06 },  // E6
  ];
  for (const t of tones) {
    const osc = ac.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = t.freq;
    const g = ac.createGain();
    // ADSR: instant attack, exponential decay
    g.gain.setValueAtTime(0.0001, now + t.delay);
    g.gain.exponentialRampToValueAtTime(t.gain * vol, now + t.delay + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, now + t.delay + t.dur);
    osc.connect(g); g.connect(ac.destination);
    osc.start(now + t.delay);
    osc.stop(now + t.delay + t.dur + 0.01);
  }
}

// G29: the rest of the Win95 sound scheme — all synthesised (zero
// audio assets), all gated by the shared volume.
// Close/minimize: the open-ding's two tones in reverse (downward).
function playWindowCloseSound(kind: 'close' | 'minimize' = 'close') {
  const ac = getUiAc();
  if (!ac) return;
  const vol = getUiVolume();
  if (vol <= 0.001) return;
  const now = ac.currentTime;
  const tones = kind === 'close'
    ? [{ freq: 1318, delay: 0.00, dur: 0.20, gain: 0.06 }, { freq: 880, delay: 0.05, dur: 0.26, gain: 0.07 }]
    : [{ freq: 988,  delay: 0.00, dur: 0.14, gain: 0.05 }, { freq: 740, delay: 0.04, dur: 0.18, gain: 0.05 }];
  for (const t of tones) {
    const osc = ac.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = t.freq;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, now + t.delay);
    g.gain.exponentialRampToValueAtTime(t.gain * vol, now + t.delay + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, now + t.delay + t.dur);
    osc.connect(g); g.connect(ac.destination);
    osc.start(now + t.delay);
    osc.stop(now + t.delay + t.dur + 0.01);
  }
}
// Error ding — short low 'donk', the polite Win95 complaint.
function playErrorDing() {
  const ac = getUiAc();
  if (!ac) return;
  const vol = getUiVolume();
  if (vol <= 0.001) return;
  const now = ac.currentTime;
  const osc = ac.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(311, now);          // D#4
  osc.frequency.exponentialRampToValueAtTime(233, now + 0.16);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.10 * vol, now + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
  osc.connect(g); g.connect(ac.destination);
  osc.start(now); osc.stop(now + 0.3);
}
// Startup chime — soft rising triad, once per session after boot.
function playStartupChime() {
  const ac = getUiAc();
  if (!ac) return;
  const vol = getUiVolume();
  if (vol <= 0.001) return;
  const now = ac.currentTime;
  const notes = [
    { freq: 523.25, delay: 0.00, dur: 0.55, gain: 0.050 },  // C5
    { freq: 659.25, delay: 0.12, dur: 0.55, gain: 0.045 },  // E5
    { freq: 783.99, delay: 0.24, dur: 0.70, gain: 0.045 },  // G5
  ];
  for (const n of notes) {
    const osc = ac.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = n.freq;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, now + n.delay);
    g.gain.exponentialRampToValueAtTime(n.gain * vol, now + n.delay + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, now + n.delay + n.dur);
    osc.connect(g); g.connect(ac.destination);
    osc.start(now + n.delay);
    osc.stop(now + n.delay + n.dur + 0.02);
  }
}

// Single shared volume value (0..1). Persisted to localStorage so the
// setting survives navigation. UI volume slider + audio gain both read
// from this; mute = volume === 0.
const LS_VOLUME = 'pg_volume_v1';
function getUiVolume(): number {
  try {
    const v = parseFloat(localStorage.getItem(LS_VOLUME) || '0.6');
    if (isNaN(v)) return 0.6;
    return Math.max(0, Math.min(1, v));
  } catch { return 0.6; }
}
function setUiVolume(v: number) {
  try { localStorage.setItem(LS_VOLUME, String(Math.max(0, Math.min(1, v)))); } catch { /* */ }
  // notify listeners
  try { window.dispatchEvent(new CustomEvent('pg-volume', { detail: v })); } catch { /* */ }
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
  { label: 'CV',       href: '/cv'       },
];

/* ---------- App registry (multi-window) -------------------------------- */
type AppId = 'home' | 'research' | 'talks' | 'library' | 'now' | 'cv';

/* small 32×32 Win95-style shortcut icons (one per app). Drawn inline as
 * SVG using primitive shapes + the classic Win95 palette so each app has
 * a distinct silhouette on the desktop background. */
function HomeIconLg() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32">
      <rect x="6" y="14" width="20" height="13" fill="#dcdfe4" stroke="#000" />
      <polygon points="16,4 4,15 28,15" fill="#a82020" stroke="#000" />
      <rect x="13" y="19" width="6" height="8" fill="#7a3a13" stroke="#000" />
      <rect x="14" y="20" width="4" height="3" fill="#f9d56e" />
    </svg>
  );
}
function ResearchIconLg() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32">
      <rect x="6" y="3" width="20" height="26" fill="#f4eedb" stroke="#000" />
      <rect x="6" y="3" width="20" height="4" fill="#3e9697" stroke="#000" />
      {[10, 14, 18, 22].map(y => <line key={y} x1="9" y1={y} x2="23" y2={y} stroke="#3a3a3a" strokeWidth="1" />)}
      <rect x="18" y="22" width="6" height="3" fill="#f25022" stroke="#000" />
    </svg>
  );
}
function TalksIconLg() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32">
      <rect x="14" y="3" width="4" height="14" rx="2" fill="#2a2a2a" stroke="#000" />
      <rect x="13" y="17" width="6" height="2" fill="#2a2a2a" />
      <rect x="11" y="19" width="10" height="2" fill="#9a9a9a" stroke="#000" />
      <rect x="6"  y="24" width="20" height="5" fill="#dcdfe4" stroke="#000" />
      <line x1="9"  y1="26.5" x2="23" y2="26.5" stroke="#3a3a3a" />
    </svg>
  );
}
function LibraryIconLg() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32">
      <rect x="6"  y="6" width="4" height="22" fill="#a82020" stroke="#000" />
      <rect x="11" y="6" width="4" height="22" fill="#3a8b8c" stroke="#000" />
      <rect x="16" y="9" width="4" height="19" fill="#f9bd2b" stroke="#000" />
      <rect x="21" y="6" width="4" height="22" fill="#4b6a36" stroke="#000" />
      <rect x="4"  y="28" width="24" height="2" fill="#6a4a2a" stroke="#000" />
    </svg>
  );
}
function NowIconLg() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32">
      <rect x="5" y="6" width="22" height="22" fill="#fff" stroke="#000" />
      <rect x="5" y="6" width="22" height="5" fill="#a82020" stroke="#000" />
      <line x1="11" y1="6" x2="11" y2="3" stroke="#000" strokeWidth="2" />
      <line x1="21" y1="6" x2="21" y2="3" stroke="#000" strokeWidth="2" />
      <circle cx="16" cy="20" r="6" fill="none" stroke="#000" strokeWidth="1.4" />
      <line x1="16" y1="20" x2="16" y2="16" stroke="#000" strokeWidth="1.4" />
      <line x1="16" y1="20" x2="19" y2="22" stroke="#000" strokeWidth="1.4" />
    </svg>
  );
}
function CvIconLg() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32">
      <rect x="7" y="3" width="18" height="26" fill="#fff" stroke="#000" />
      <polygon points="19,3 25,9 19,9" fill="#dcdfe4" stroke="#000" />
      {[12, 15, 18, 21, 24].map(y => <line key={y} x1="10" y1={y} x2="22" y2={y} stroke="#777" strokeWidth="0.8" />)}
      <rect x="10" y="6" width="6" height="1.5" fill="#000" />
    </svg>
  );
}

interface AppDef {
  id: AppId;
  label: string;       // icon + taskbar label
  title: string;       // window titlebar full text
  path: string;        // url path (also iframe src; '/' = inline home content)
  Icon: () => React.ReactElement;
  // default window geometry on a desktop-sized canvas
  defW: number;
  defH: number;
  // offset for default placement (so windows cascade)
  cascadeIdx: number;
}
// Default window sizes are LARGE (clamped to the desktop by defaultGeo) —
// a window should show its page's actual content on open, with no
// resizing or scrolling needed to see what the section is about.
const APPS: AppDef[] = [
  { id: 'home',     label: 'Home',     title: 'Prashant Garg — Home',     path: '/',         Icon: HomeIconLg,     defW: 720,  defH: 540, cascadeIdx: 0 },
  { id: 'research', label: 'Research', title: 'Research — Prashant Garg', path: '/research', Icon: ResearchIconLg, defW: 1120, defH: 780, cascadeIdx: 1 },
  { id: 'talks',    label: 'Talks',    title: 'Talks — Prashant Garg',    path: '/talks',    Icon: TalksIconLg,    defW: 1060, defH: 740, cascadeIdx: 2 },
  { id: 'library',  label: 'Library',  title: 'Library — Prashant Garg',  path: '/library',  Icon: LibraryIconLg,  defW: 1080, defH: 760, cascadeIdx: 3 },
  { id: 'now',      label: 'Now',      title: 'Now — Prashant Garg',      path: '/now',      Icon: NowIconLg,      defW: 980,  defH: 700, cascadeIdx: 4 },
  { id: 'cv',       label: 'CV',       title: 'CV — Prashant Garg',       path: '/cv',       Icon: CvIconLg,       defW: 1140, defH: 800, cascadeIdx: 5 },
];
const APP_BY_ID: Record<AppId, AppDef> = APPS.reduce((acc, a) => { acc[a.id] = a; return acc; }, {} as any);
const APP_BY_PATH: Record<string, AppDef> = APPS.reduce((acc, a) => { acc[a.path] = a; return acc; }, {} as any);

/**
 * Find the app whose root path is the longest prefix of `href`. Used
 * to route a sub-path navigation (e.g. /research/some-paper-slug) to
 * the matching app window (the Research app). Returns null for paths
 * that don't fall under any app (those are external-ish and ignored).
 */
function findAppForPath(href: string): AppDef | null {
  if (!href) return null;
  // strip query/hash for matching
  const path = href.split(/[?#]/)[0];
  // exact match first
  if (APP_BY_PATH[path]) return APP_BY_PATH[path];
  // longest prefix (skip '/' which would match everything)
  let best: AppDef | null = null;
  for (const app of APPS) {
    if (app.path === '/') continue;
    if (path === app.path || path.startsWith(app.path + '/')) {
      if (!best || app.path.length > best.path.length) best = app;
    }
  }
  return best;
}

/* ---------- Win95 NavLink ---------------------------------------------- */
// Accepts an optional `onNavigate` so the parent InnerDesktop can route
// internally (pushState + state update) instead of doing a full page
// reload. Falls back to window.location for any caller that didn't
// wire it up.
function NavLink({ label, href, onNavigate, active }: { label: string; href: string; onNavigate?: (h: string) => void; active?: boolean }) {
  const [flash, setFlash] = useState(false);
  // `<a>` default nav fires on CLICK (not mousedown), so onClick is
  // where we must call preventDefault. mousedown just plays the click
  // sound + flashes the link red for the brief flash animation.
  const go = (e: React.MouseEvent) => {
    e.preventDefault();
    setFlash(true);
    setTimeout(() => {
      setFlash(false);
      if (onNavigate) onNavigate(href);
      else window.location.href = href;
    }, 100);
  };
  return (
    <a
      href={href}
      className={`win95-nav-link ${flash ? 'flash' : ''}${active ? ' active' : ''}`}
      onMouseDown={() => playUiClick('down')}
      onMouseUp={() => playUiClick('up')}
      onClick={go}
    >
      <span className="win95-nav-link-dot" />
      <h4>{label}</h4>
    </a>
  );
}

/* ---------- contact strip (email + CV / scholar / github / X / bsky) --- */
function ContactStrip() {
  // Old-site link row: plain text links, no glyphs, no beveled buttons.
  return (
    <div className="win95-contact">
      <a className="win95-contact-link" href={`mailto:${site.email}`}>{site.email}</a>
      <span className="win95-contact-sep">·</span>
      <a className="win95-contact-link" href={site.cv}      target="_blank" rel="noopener">CV</a>
      <span className="win95-contact-sep">·</span>
      <a className="win95-contact-link" href={site.scholar} target="_blank" rel="noopener">Google Scholar</a>
      <span className="win95-contact-sep">·</span>
      <a className="win95-contact-link" href={site.github}  target="_blank" rel="noopener">GitHub</a>
      <span className="win95-contact-sep">·</span>
      <a className="win95-contact-link" href={site.twitter} target="_blank" rel="noopener">Twitter/X</a>
      <span className="win95-contact-sep">·</span>
      <a className="win95-contact-link" href={site.bluesky} target="_blank" rel="noopener">Bluesky</a>
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

/* ---------- volume tray (icon + slider) -------------------------------- */
// Replaces the binary mute toggle with a real volume slider. The slider
// writes to localStorage via setUiVolume() and dispatches a pg-volume
// event the audio system listens for. Clicking the icon toggles mute
// (saves current volume to "lastNonZero" for unmute restore).
function VolumeTray() {
  const [vol, setVolLocal] = useState<number>(() => getUiVolume());
  const lastNonZeroRef = useRef<number>(vol > 0 ? vol : 0.6);
  useEffect(() => {
    const onExt = (e: any) => {
      const v = typeof e.detail === 'number' ? e.detail : getUiVolume();
      if (v !== vol) setVolLocal(v);
    };
    window.addEventListener('pg-volume', onExt);
    return () => window.removeEventListener('pg-volume', onExt);
  }, [vol]);
  const apply = (v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    if (clamped > 0) lastNonZeroRef.current = clamped;
    setVolLocal(clamped);
    setUiVolume(clamped);
  };
  const toggleMute = () => {
    if (vol > 0) apply(0);
    else apply(lastNonZeroRef.current || 0.6);
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingRight: 6 }}>
      <button
        className="win95-tray-btn"
        title={vol > 0 ? 'Mute ambient' : 'Unmute ambient'}
        onMouseDown={() => { playUiClick('down'); toggleMute(); }}
        onMouseUp={() => playUiClick('up')}
        style={{ flexShrink: 0 }}
      >
        {vol > 0 ? <VolumeOnIcon /> : <VolumeOffIcon />}
      </button>
      <input
        type="range"
        className="win95-vol-slider"
        min={0} max={1} step={0.02} value={vol}
        onChange={e => apply(parseFloat(e.target.value))}
        title="Volume"
      />
    </div>
  );
}

/* ---------- main component --------------------------------------------- */
interface InnerDesktopProps {
  onClose: () => void;
  /** When true, the desktop renders as a centred window with the 3D
   *  scene visible around it (Henry Heffernan pattern). */
  embedded?: boolean;
}

// ── Multi-window state types ──────────────────────────────────────
interface OpenWin {
  id: AppId;
  zIndex: number;
  minimized: boolean;
  maximized: boolean;
  // unmaximized geometry
  x: number; y: number; w: number; h: number;
  // animation state
  openFrom?: { x: number; y: number };   // origin point for zoom-in
  state: 'opening' | 'open' | 'closing' | 'minimizing';
  // Optional sub-path override — when a link inside the iframe targets
  // a path under the app's base (e.g. /research/some-paper inside the
  // Research app), this captures it so the iframe.src points at the
  // sub-page instead of the app's root path. Stays in sync with the
  // browser URL.
  path?: string;
}

/** A window's content iframe + a Win95 'Loading…' layer shown until it
 *  fires onLoad, so opening an app no longer flashes a blank cream panel
 *  while the inner Astro page + webfonts paint. Remounts (via key) on path
 *  change, which resets the loading state. */
function WindowIframe({ src, title }: { src: string; title: string }) {
  const [loading, setLoading] = useState(true);
  return (
    <>
      <iframe
        src={src}
        className="win95-iframe"
        title={title}
        onLoad={() => setLoading(false)}
        style={{ width: '100%', height: '100%', border: 0, display: 'block', background: '#EFEAD8' }}
      />
      {loading && (
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#EFEAD8', color: '#6a675f', pointerEvents: 'none',
          fontFamily: 'MSSerif, Arial, sans-serif', fontSize: 13, letterSpacing: '0.04em',
        }}>Loading…</div>
      )}
    </>
  );
}

export default function InnerDesktop({ onClose, embedded = false }: InnerDesktopProps) {
  const [time, setTime] = useState(getTime);
  // Container ref so we can measure the desktop bounding rect for
  // window cascade defaults + animation origin transforms.
  const containerRef = useRef<HTMLDivElement>(null);
  // Container size — recomputed on resize. Used so the cascade window
  // defaults size sensibly in the embedded CRT viewport vs full-screen.
  // Default matches the composited /os viewport (1040×795) so the
  // deep-link auto-open sizes windows correctly even before the
  // ResizeObserver fires — otherwise windows clamp to a tiny 662px
  // (research opened undersized in the monitor).
  const [containerSize, setContainerSize] = useState({ w: 1280, h: 800 });
  useEffect(() => {
    const measure = () => {
      const el = containerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setContainerSize({ w: r.width, h: r.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Open windows + zIndex counter + Start-menu visibility
  const [wins, setWins] = useState<OpenWin[]>([]);
  const [topZ, setTopZ] = useState(100);
  const [startOpen, setStartOpen] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState<AppId | null>(null);
  // Right-click context menu state — {x,y} of the menu top-left in
  // container-relative coords, or null if hidden.
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  // G30/G33/G34/G35: Run… dialog, Overtime Contingency, System
  // Properties, Wellness Session
  const [dialog, setDialog] = useState<null | 'run' | 'sysprops' | 'wellness'>(null);
  const [runError, setRunError] = useState('');
  const [flicker, setFlicker] = useState(false);
  const runInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (dialog === 'run') setTimeout(() => runInputRef.current?.focus(), 60);
    if (dialog !== 'run') setRunError('');
  }, [dialog]);
  const [refreshFlash, setRefreshFlash] = useState(false);   // flash anim on "Refresh"

  // ── Multi-window management ──────────────────────────────────────

  // Default geometry for a new window: LARGE + CENTERED. Each app opens at
  // ~90% of the desktop, centered, with a thin border of desktop showing
  // around it — the user asked for this over the old icon-dodging cascade
  // (which opened smallish windows that overflowed the right edge). A tiny
  // per-window step keeps stacked windows from being pixel-identical.
  const defaultGeo = useCallback((_app: AppDef) => {
    const taskbar = 30;
    const availW = containerSize.w;
    const availH = containerSize.h - taskbar;
    const w = Math.round(Math.min(availW - 24, availW * 0.90));
    const h = Math.round(Math.min(availH - 24, availH * 0.90));
    const step = 18;
    const off = (_app.cascadeIdx * step) % (step * 3);   // 0,18,36 then wrap
    let x = Math.round((availW - w) / 2) + off;
    let y = Math.round((availH - h) / 2) + off;
    x = Math.max(8, Math.min(x, availW - w - 8));
    y = Math.max(8, Math.min(y, availH - h - 8));
    return { x, y, w, h };
  }, [containerSize]);

  // Bring a window to the front by bumping its z-index.
  const focusApp = useCallback((id: AppId) => {
    setTopZ(z => {
      const nz = z + 1;
      setWins(ws => ws.map(w => w.id === id ? { ...w, zIndex: nz, minimized: false } : w));
      return nz;
    });
  }, []);

  // Open an app — restore + focus if already open, otherwise add a
  // new window to the array. `fromPoint` (icon centre) anchors the
  // zoom-in animation's transform-origin.
  const openApp = useCallback((id: AppId, fromPoint?: { x: number; y: number }, pathOverride?: string) => {
    const app = APP_BY_ID[id]; if (!app) return;
    // HOME = the desktop itself. The home content lives ON the desktop
    // (win95-desktop-home), so "opening" Home just clears the view:
    // minimize every window to reveal it. No Home window exists.
    if (id === 'home') {
      setWins(ws => ws.map(w => ({ ...w, minimized: true })));
      try { window.history.pushState({}, '', '/'); } catch { /* */ }
      return;
    }
    let wasOpen = false;
    setWins(ws => {
      const existing = ws.find(w => w.id === id);
      if (existing) {
        wasOpen = true;
        // already open → restore + focus. If a pathOverride is supplied,
        // update the sub-path so the iframe navigates to the new URL.
        return ws.map(w => w.id === id
          ? { ...w, minimized: false, state: 'open' as const, path: pathOverride || w.path }
          : w);
      }
      const geo = defaultGeo(app);
      const nextZ = topZ + 1;
      // Open new windows MAXIMIZED on a narrow viewport OR any touch device:
      // drag/resize are mouse-only (no pointer/touch handlers), so a floating
      // window on a tablet would be stuck where it opens. Maximized = usable.
      const isTouch = typeof window !== 'undefined'
        && window.matchMedia('(hover: none) and (pointer: coarse)').matches;
      const autoMax = containerSize.w < 600 || isTouch;
      return [...ws, {
        id, zIndex: nextZ,
        minimized: false, maximized: autoMax,
        ...geo,
        openFrom: fromPoint, state: 'opening',
        path: pathOverride,
      }];
    });
    setTopZ(z => z + 1);
    // play the classic Windows "ding" only for genuinely new windows
    if (!wasOpen) setTimeout(() => playWindowOpenDing(), 30);
    // promote to URL after a tick so opening animations show.
    // URL is the sub-path override (if any), else the app's root path.
    setTimeout(() => {
      try { window.history.pushState({}, '', pathOverride || app.path); } catch { /* */ }
      // mark animation done
      setWins(ws => ws.map(w => w.id === id ? { ...w, state: 'open' as const } : w));
    }, 220);
    if (fromPoint) focusApp(id);
  }, [defaultGeo, topZ, focusApp, containerSize]);

  // Close an app — play closing animation, then remove from array
  // and update URL to whatever is now the topmost open window (or '/').
  const closeApp = useCallback((id: AppId) => {
    playWindowCloseSound('close');
    setWins(ws => ws.map(w => w.id === id ? { ...w, state: 'closing' as const } : w));
    setTimeout(() => {
      setWins(ws => {
        const remaining = ws.filter(w => w.id !== id);
        // pick new top window, URL follows
        const top = [...remaining].filter(w => !w.minimized).sort((a,b) => b.zIndex - a.zIndex)[0];
        const newPath = top ? APP_BY_ID[top.id].path : '/';
        try { window.history.pushState({}, '', newPath); } catch { /* */ }
        return remaining;
      });
    }, 220);
  }, []);

  // Minimize / restore / maximize toggle
  const minimizeApp = useCallback((id: AppId) => {
    playWindowCloseSound('minimize');
    setWins(ws => ws.map(w => w.id === id ? { ...w, state: 'minimizing' as const } : w));
    setTimeout(() => {
      setWins(ws => ws.map(w => w.id === id ? { ...w, minimized: true, state: 'open' as const } : w));
    }, 200);
  }, []);
  const toggleMaximize = useCallback((id: AppId) => {
    setWins(ws => ws.map(w => w.id === id ? { ...w, maximized: !w.maximized } : w));
  }, []);

  // Receive in-iframe link clicks (Win95Layout embed-mode bootstrap
  // posts {type:'pg-nav', href}) and route them as app openings.
  // Supports sub-paths (e.g. /research/some-paper) by finding the
  // longest-prefix app and passing the full href as a path override.
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d = e.data as any;
      if (!d || d.type !== 'pg-nav' || typeof d.href !== 'string') return;
      const href = d.href;
      const app = findAppForPath(href);
      if (!app) return;            // not under any app — ignore
      // Pass href as override so iframe navigates to sub-path (e.g.
      // a paper detail) inside the matched app's window.
      const overridePath = href !== app.path ? href : undefined;
      openApp(app.id, undefined, overridePath);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [openApp]);

  // Initial-load app: only auto-open if the URL points to a specific
  // app (not '/'). '/' shows the empty desktop with icons so the user
  // can pick a section — like a real Windows desktop.
  // G30: '?app=research&paper=<slug>' query params work as a shareable
  // alias for the path form (handy when the path is owned by the boot
  // flow, e.g. linking someone straight into a windowed paper).
  const didAutoOpen = useRef(false);
  useEffect(() => {
    if (typeof window === 'undefined' || didAutoOpen.current) return;
    didAutoOpen.current = true;   // once; containerSize is sane by now
    const q = new URLSearchParams(window.location.search);
    const qApp = q.get('app');
    if (qApp && APP_BY_ID[qApp as AppId]) {
      const paper = q.get('paper');
      openApp(qApp as AppId, undefined, paper ? `/research/${paper}` : undefined);
      return;
    }
    const path = window.location.pathname || '/';
    if (path === '/') return;     // empty desktop on home url
    const app = findAppForPath(path);
    if (app) {
      const overridePath = path !== app.path ? path : undefined;
      openApp(app.id, undefined, overridePath);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerSize]);

  // G29: startup chime — once per browser session, right after the
  // desktop first mounts (the boot sequence's payoff note).
  useEffect(() => {
    try {
      if (sessionStorage.getItem('pg_chimed') === '1') return;
      sessionStorage.setItem('pg_chimed', '1');
    } catch { /* */ }
    const t = setTimeout(() => playStartupChime(), 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // popstate (back/forward) — open the app for the new path if not
  // already, else focus it.
  useEffect(() => {
    const onPop = () => {
      const path = window.location.pathname || '/';
      const app = findAppForPath(path);
      if (app) {
        const overridePath = path !== app.path ? path : undefined;
        openApp(app.id, undefined, overridePath);
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [openApp]);

  // ── G33: Overtime Contingency — CRT flicker, then innie/outie swap.
  // The themes are the site's existing light/dark pair (pg_theme +
  // html.dark); live same-origin iframes flip along with the shell.
  const overtime = useCallback(() => {
    const apply = () => {
      const dark = !document.documentElement.classList.contains('dark');
      document.documentElement.classList.toggle('dark', dark);
      try { localStorage.setItem('pg_theme', dark ? 'dark' : 'light'); } catch { /* */ }
      document.querySelectorAll('iframe.win95-iframe').forEach(f => {
        try { (f as HTMLIFrameElement).contentDocument?.documentElement.classList.toggle('dark', dark); } catch { /* */ }
      });
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { apply(); return; }
    setFlicker(true);
    setTimeout(apply, 260);
    setTimeout(() => setFlicker(false), 520);
  }, []);

  // ── G30: Run… command parsing — app names, paper slugs/titles, and
  // the hidden directives.
  const runCommand = useCallback((raw: string) => {
    const cmd = raw.trim().toLowerCase();
    if (!cmd) return;
    if (cmd === 'overtime') { setDialog(null); overtime(); return; }
    if (cmd === 'standard' || cmd === 'standard issue') { window.location.href = '/standard'; return; }
    if (cmd === 'wellness') { setDialog('wellness'); return; }
    if (cmd === 'properties' || cmd === 'sysprops' || cmd === 'system properties') { setDialog('sysprops'); return; }
    const appHit = APPS.find(a => a.id === cmd || a.label.toLowerCase() === cmd);
    if (appHit) { setDialog(null); openApp(appHit.id); return; }
    if (cmd.length >= 3) {
      const paperHit = papers.find(p => p.slug === cmd || p.slug.includes(cmd) || p.title.toLowerCase().includes(cmd));
      if (paperHit) { setDialog(null); openApp('research', undefined, `/research/${paperHit.slug}`); return; }
    }
    playErrorDing();
    setRunError(`Cannot find '${raw.trim()}'. Try an app (research, talks, cv…) or a paper title.`);
  }, [openApp, overtime]);

  // ── KEYBOARD SHORTCUTS ────────────────────────────────────────────
  // Alt+Tab  — cycle focus through open windows
  // Esc      — close the focused window (or close Start/ctx menu)
  // F11      — toggle maximize on focused window
  // ⌘/Ctrl+W — close focused window (Mac-style)
  // ⌘/Ctrl+Q — shut down (exit back to the study)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // compute focused window id inline (top zIndex, non-minimized)
      const visible = wins.filter(w => !w.minimized).sort((a, b) => b.zIndex - a.zIndex);
      const focusedId: AppId | null = visible[0] ? visible[0].id : null;
      const tgt = e.target as HTMLElement;
      const inText = tgt && (
        tgt.tagName === 'INPUT' ||
        tgt.tagName === 'TEXTAREA' ||
        tgt.isContentEditable
      );

      // Alt+Tab — cycle visible windows
      if (e.altKey && e.key === 'Tab') {
        e.preventDefault();
        if (visible.length < 2) return;
        const idx = e.shiftKey ? visible.length - 1 : 1;
        focusApp(visible[idx].id);
        return;
      }
      // Escape — close dialog/start/ctx menu, then the focused window, and
      // if there's nothing left to close, LEAVE the desktop (back to the
      // office). This listener lives INSIDE the /os iframe, so it fires even
      // when the parent window's Esc handler can't (focus is in the monitor).
      if (e.key === 'Escape') {
        if (dialog)    { setDialog(null);     e.preventDefault(); return; }
        if (startOpen) { setStartOpen(false); e.preventDefault(); return; }
        if (ctxMenu)   { setCtxMenu(null);    e.preventDefault(); return; }
        if (inText) return;
        if (focusedId) { closeApp(focusedId); e.preventDefault(); return; }
        e.preventDefault(); onClose(); return;
      }
      // Boss key — Shift+B for the instant plain-HTML standard-issue view.
      // (Was a bare 'b' that yanked a reader off the site on any stray
      // keypress; now requires Shift so it can't fire by accident.)
      if ((e.key === 'b' || e.key === 'B') && e.shiftKey && !inText && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        window.location.href = '/standard';
        return;
      }
      // F11 — toggle maximize on focused window
      if (e.key === 'F11' && focusedId) {
        e.preventDefault();
        toggleMaximize(focusedId);
        return;
      }
      // ⌘/Ctrl+W — close focused window
      if ((e.metaKey || e.ctrlKey) && (e.key === 'w' || e.key === 'W') && focusedId) {
        e.preventDefault();
        closeApp(focusedId);
        return;
      }
      // ⌘/Ctrl+Q — shut down (back to study)
      if ((e.metaKey || e.ctrlKey) && (e.key === 'q' || e.key === 'Q')) {
        e.preventDefault();
        onClose();
        return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [wins, startOpen, ctxMenu, dialog, focusApp, closeApp, toggleMaximize, onClose]);

  // ---------- ambient audio (continues from the study) ----------
  const [muted, setMuted] = useState<boolean>(() => {
    try { return sessionStorage.getItem(SS_MUTED) === '1'; } catch { return false; }
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // When embedded inside the 3D scene the parent owns the audio
    // (Office.tsx's StudyAudio) — skip our own loop to avoid double playback.
    // The composited desktop is the /os document rendered with embedded=false
    // inside the room's <iframe>, so the `embedded` flag is NOT set there;
    // detect the iframe case directly so the parent's StudyAudio stays the
    // single ambient source. (UI click sounds use a separate context and are
    // unaffected.)
    const insideParentRoom =
      typeof window !== 'undefined' && window.parent !== window;
    if (embedded || insideParentRoom) return;
    const audio = new Audio('/audio/ambient.mp3');
    audio.loop   = true;
    audio.volume = 0.32 * getUiVolume();   // base level * slider (was a flat 0.32)
    audio.muted  = muted;
    audioRef.current = audio;
    // live-update from the volume slider (standalone /os: same document, so the
    // pg-volume CustomEvent reaches us here)
    const onVol = () => { if (audioRef.current) audioRef.current.volume = 0.32 * getUiVolume(); };
    window.addEventListener('pg-volume', onVol);
    // attempt autoplay; if blocked wait for first interaction
    audio.play().catch(() => {
      const resume = () => { audio.play().catch(() => {}); };
      document.addEventListener('pointerdown', resume, { once: true });
    });
    return () => { audio.pause(); audio.src = ''; window.removeEventListener('pg-volume', onVol); };
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


  // ── tick clock ────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => setTime(getTime()), 5000);
    return () => clearInterval(id);
  }, []);

  // ── per-window drag with INERTIA ─────────────────────────────────
  // Tracks the last few pointer samples to compute release velocity,
  // then decays the velocity over ~350 ms after release so the window
  // glides briefly. Pure JS animation loop (not CSS) so the position
  // state stays the source of truth.
  const inertiaRafRef = useRef<Record<string, number>>({});
  const startDragWin = (id: AppId) => (e: React.MouseEvent) => {
    const w = wins.find(x => x.id === id);
    if (!w || w.maximized) return;
    e.preventDefault(); e.stopPropagation();
    focusApp(id);
    // cancel any in-flight inertia for this window
    if (inertiaRafRef.current[id]) cancelAnimationFrame(inertiaRafRef.current[id]);
    const sx = e.clientX, sy = e.clientY;
    const ox = w.x, oy = w.y;
    // G5: the right clamp must account for window WIDTH — otherwise a
    // wide window dragged right keeps its ✕ (at the right edge of the
    // titlebar) unreachable off-viewport.
    const maxX = Math.max(0, containerSize.w - w.w);
    // velocity samples: ring buffer of recent (t, x, y)
    const samples: { t: number; x: number; y: number }[] = [];
    samples.push({ t: performance.now(), x: ox, y: oy });
    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      const nx = Math.max(-200, Math.min(maxX, ox + dx));
      const ny = Math.max(0,    Math.min(containerSize.h - 60, oy + dy));
      samples.push({ t: performance.now(), x: nx, y: ny });
      if (samples.length > 6) samples.shift();
      setWins(ws => ws.map(s => s.id === id ? { ...s, x: nx, y: ny } : s));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      // compute release velocity from first→last sample window
      if (samples.length < 2) return;
      const last = samples[samples.length - 1];
      // look at samples in the last 80 ms for stable velocity estimate
      const ref = samples.find(s => last.t - s.t < 80) || samples[0];
      const dt = Math.max(1, last.t - ref.t);
      let vx = (last.x - ref.x) / dt * 1000;  // px/sec
      let vy = (last.y - ref.y) / dt * 1000;
      // clamp so a sudden flick doesn't fly off-screen
      const VMAX = 1800;
      const vmag = Math.hypot(vx, vy);
      if (vmag > VMAX) { vx *= VMAX / vmag; vy *= VMAX / vmag; }
      // inertia decay: ~350 ms ease-out
      let lastFrame = performance.now();
      let cx = last.x, cy = last.y;
      const decay = 0.92;   // multiplied per frame, settles fast
      const step = () => {
        const now = performance.now();
        const dt2 = (now - lastFrame) / 1000;
        lastFrame = now;
        cx += vx * dt2;
        cy += vy * dt2;
        const nx = Math.max(-200, Math.min(maxX, cx));
        const ny = Math.max(0,    Math.min(containerSize.h - 60, cy));
        setWins(ws => ws.map(s => s.id === id ? { ...s, x: nx, y: ny } : s));
        vx *= Math.pow(decay, dt2 * 60);
        vy *= Math.pow(decay, dt2 * 60);
        if (Math.hypot(vx, vy) > 12) {
          inertiaRafRef.current[id] = requestAnimationFrame(step);
        } else {
          delete inertiaRafRef.current[id];
        }
      };
      if (Math.hypot(vx, vy) > 24) {
        inertiaRafRef.current[id] = requestAnimationFrame(step);
      }
    };
    document.body.style.cursor = 'move';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };
  // Resize from ANY of 8 edges. `edge` is one of n/s/e/w/ne/nw/se/sw.
  // For edges that touch the LEFT (w, nw, sw) dragging moves the
  // window's x AND shrinks its width. Same for TOP edges. Right/Bottom
  // edges just grow/shrink width/height. Min size 360 × 260.
  type ResizeEdge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
  const cursorFor = (edge: ResizeEdge): string => (
    edge === 'n' || edge === 's' ? 'ns-resize' :
    edge === 'e' || edge === 'w' ? 'ew-resize' :
    edge === 'ne' || edge === 'sw' ? 'nesw-resize' :
    'nwse-resize'
  );
  const startResizeEdge = (id: AppId, edge: ResizeEdge) => (e: React.MouseEvent) => {
    const w = wins.find(x => x.id === id);
    if (!w || w.maximized) return;
    e.preventDefault(); e.stopPropagation();
    focusApp(id);
    const sx = e.clientX, sy = e.clientY;
    const ox = w.x, oy = w.y, ow = w.w, oh = w.h;
    const MIN_W = 360, MIN_H = 260;
    const touchTop  = edge === 'n' || edge === 'ne' || edge === 'nw';
    const touchBot  = edge === 's' || edge === 'se' || edge === 'sw';
    const touchLeft = edge === 'w' || edge === 'nw' || edge === 'sw';
    const touchRight= edge === 'e' || edge === 'ne' || edge === 'se';
    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      let nx = ox, ny = oy, nw = ow, nh = oh;
      if (touchRight) nw = Math.max(MIN_W, ow + dx);
      if (touchLeft)  { const proposed = ow - dx; nw = Math.max(MIN_W, proposed); nx = ox + (ow - nw); }
      if (touchBot)   nh = Math.max(MIN_H, oh + dy);
      if (touchTop)   { const proposed = oh - dy; nh = Math.max(MIN_H, proposed); ny = oy + (oh - nh); }
      setWins(ws => ws.map(s => s.id === id ? { ...s, x: nx, y: ny, w: nw, h: nh } : s));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
    };
    document.body.style.cursor = cursorFor(edge);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };
  // Backward-compat alias for the corner grip (SE corner)
  const startResizeWin = (id: AppId) => startResizeEdge(id, 'se');

  // Topmost (non-minimized) window is the "focused" one — drives the
  // titlebar colour and taskbar chip sunken state.
  const topId: AppId | null = (() => {
    const v = [...wins].filter(w => !w.minimized).sort((a,b) => b.zIndex - a.zIndex)[0];
    return v ? v.id : null;
  })();

  // ── icon click + Start-menu open ──────────────────────────────────
  const onIconActivate = (id: AppId, e: React.MouseEvent | React.KeyboardEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const ce = containerRef.current?.getBoundingClientRect();
    const fp = ce ? { x: r.x + r.width/2 - ce.x, y: r.y + r.height/2 - ce.y } : undefined;
    playUiClick('down');
    openApp(id, fp);
    setSelectedIcon(null);
  };
  const onStartMenuItem = (id: AppId) => {
    // pick a sensible animation origin: the Start button position
    const ce = containerRef.current?.getBoundingClientRect();
    const fp = ce ? { x: 30, y: containerSize.h - 24 } : undefined;
    openApp(id, fp);
    setStartOpen(false);
  };
  const shutDown = () => {
    setStartOpen(false);
    // closing the desktop returns to the 3D study (parent's onClose)
    onClose();
  };

  return (
    /* The whole desktop. Clicking the teal background closes Start +
       deselects icons. */
    <div
      ref={containerRef}
      className={`win95-desktop${embedded ? ' embedded' : ''}`}
      onMouseDown={() => { setStartOpen(false); setSelectedIcon(null); setCtxMenu(null); }}
      onContextMenu={(e) => {
        // Only show context menu when right-clicking the empty desktop
        // (not on a window or icon). Stop the browser's native menu.
        e.preventDefault();
        const ce = containerRef.current?.getBoundingClientRect();
        if (!ce) return;
        const x = e.clientX - ce.x;
        const y = e.clientY - ce.y;
        // clamp so menu stays on-screen
        const menuW = 168, menuH = 180;
        const cx = Math.min(x, ce.width - menuW - 4);
        const cy = Math.min(y, ce.height - menuH - 34);
        setCtxMenu({ x: cx, y: cy });
      }}
    >

      {/* ───────────── desktop icons ───────────── */}
      <div className="win95-icons" onMouseDown={e => e.stopPropagation()}>
        {/* (declutter) Home dropped from the icon column — the home panel is
            permanently on the desktop and the taskbar Home button shows it. */}
        {APPS.filter(a => a.id !== 'home').map(app => (
          <div
            key={app.id}
            className={`win95-icon${selectedIcon === app.id ? ' selected' : ''}`}
            role="button"
            tabIndex={0}
            aria-label={app.label}
            onMouseDown={e => { e.stopPropagation(); setSelectedIcon(app.id); playUiClick('down', 'tap'); }}
            onMouseUp={() => playUiClick('up', 'tap')}
            onDoubleClick={e => onIconActivate(app.id, e)}
            // single-click on touch acts as activate too
            onClick={(e) => { if (window.matchMedia('(hover: none)').matches) onIconActivate(app.id, e); }}
            // keyboard: Enter/Space opens the app (M13 — was mouse-only)
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onIconActivate(app.id, e); } }}
            title={app.label}
          >
            <div className="win95-icon-img"><app.Icon /></div>
            <div className="win95-icon-label">{app.label}</div>
          </div>
        ))}
      </div>

      {/* ───────────── home content ON the desktop ───────────── */}
      <div className="win95-desktop-home">
        <div className="win95-desktop-home-inner" onMouseDown={e => e.stopPropagation()}>
          <HomeContent />
        </div>
      </div>

      {/* ───────────── open windows ───────────── */}
      {wins.map(w => {
        const app = APP_BY_ID[w.id];
        const isTop = topId === w.id;
        if (w.minimized && w.state !== 'minimizing') return null;
        // Position/size. maximized fills the desktop minus taskbar.
        const style: React.CSSProperties = w.maximized
          ? { left: 0, top: 0, width: '100%', height: 'calc(100% - 30px)', zIndex: w.zIndex }
          : { left: w.x, top: w.y, width: w.w, height: w.h, zIndex: w.zIndex };
        // transform-origin for opening/closing zoom anim — anchored to the
        // icon position where the window was launched from.
        if (w.openFrom) {
          (style as any)['--from-x'] = `${w.openFrom.x - (w.maximized ? 0 : w.x)}px`;
          (style as any)['--from-y'] = `${w.openFrom.y - (w.maximized ? 0 : w.y)}px`;
        }
        const classes = ['win95-window'];
        if (w.state === 'opening')    classes.push('opening');
        if (w.state === 'closing')    classes.push('closing');
        if (w.state === 'minimizing') classes.push('minimizing');
        const titleBg = isTop ? '#0000a3' : '#686868';
        return (
          <div
            key={w.id}
            className={classes.join(' ')}
            style={style}
            onMouseDown={e => { e.stopPropagation(); focusApp(w.id); }}
          >
            {/* 8 invisible resize edges + corners (only when not maximized) */}
            {!w.maximized && (
              <>
                {(['n','s','e','w','ne','nw','se','sw'] as const).map(edge => (
                  <div
                    key={`edge-${edge}`}
                    className={`win95-resize-edge ${edge}`}
                    onMouseDown={startResizeEdge(w.id, edge)}
                  />
                ))}
              </>
            )}
            {/* title bar */}
            <div
              className="win95-titlebar"
              style={{ background: titleBg, cursor: w.maximized ? 'default' : 'move' }}
              onMouseDown={startDragWin(w.id)}
              onDoubleClick={e => { e.stopPropagation(); toggleMaximize(w.id); }}
            >
              <span style={{ display: 'flex', flexShrink: 0, transform: 'scale(0.7)', transformOrigin: 'center' }}><app.Icon /></span>
              <span className="win95-titlebar-title">{app.title}</span>
              <button
                className="win95-titlebtn"
                title="Minimise"
                onMouseDown={e => { e.stopPropagation(); playUiClick('down', 'titlebtn'); }}
                onMouseUp={() => playUiClick('up', 'titlebtn')}
                onClick={e => { e.stopPropagation(); minimizeApp(w.id); }}
              >_</button>
              <button
                className="win95-titlebtn"
                title={w.maximized ? 'Restore' : 'Maximise'}
                onMouseDown={e => { e.stopPropagation(); playUiClick('down', 'titlebtn'); }}
                onMouseUp={() => playUiClick('up', 'titlebtn')}
                onClick={e => { e.stopPropagation(); toggleMaximize(w.id); }}
              >□</button>
              <button
                className="win95-titlebtn win95-titlebtn-close"
                title="Close"
                onMouseDown={e => { e.stopPropagation(); playUiClick('down', 'close'); }}
                onMouseUp={() => playUiClick('up', 'close')}
                onClick={e => { e.stopPropagation(); closeApp(w.id); }}
              >✕</button>
            </div>

            {/* content area — inline HOME, or iframe */}
            <div className="win95-content">
              {w.id === 'home' ? (
                <HomeContent />
              ) : (
                /* When the window has a sub-path override (e.g. a paper
                   detail under /research/...), the iframe loads that
                   instead of the app's root path. Add ?embed=1 so
                   Win95Layout strips its chrome. */
                <WindowIframe
                  key={w.path || app.path}      /* force reload on path change */
                  src={(() => {
                    const base = w.path || app.path;
                    return base + (base.includes('?') ? '&' : '?') + 'embed=1';
                  })()}
                  title={app.title}
                />
              )}
            </div>

            {/* status bar */}
            <div className="win95-statusbar">
              <span className="win95-statusbar-cell wide">Ready</span>
              <span className="win95-statusbar-cell">prashantgarg.os</span>
              <span className="win95-statusbar-cell sm" />
              {!w.maximized && (
                <div className="win95-resize-grip" onMouseDown={startResizeWin(w.id)}>
                  <ResizeGripIcon />
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* ───────────── G32/G33: screensaver + CRT flicker ───────────── */}
      <Screensaver />
      {flicker && <div className="win95-crt-flicker" />}

      {/* ───────────── G30: Run… dialog ───────────── */}
      {dialog === 'run' && (
        <div className="win95-dialog" role="dialog" aria-label="Run">
          <div className="win95-dialog-titlebar">
            <span>Run</span>
            <button className="win95-titlebtn" onClick={() => setDialog(null)} aria-label="Close">✕</button>
          </div>
          <div className="win95-dialog-body">
            <p style={{ margin: '0 0 10px' }}>Type the name of a program or paper, and prashantgarg.os will open it for you.</p>
            <form onSubmit={e => { e.preventDefault(); runCommand(runInputRef.current?.value || ''); }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span>Open:</span>
                <input ref={runInputRef} className="win95-dialog-input" spellCheck={false} aria-label="Run command" />
              </div>
              {runError && <div className="win95-dialog-error">{runError}</div>}
              <div className="win95-dialog-buttons">
                <button type="submit" className="win95-btn">OK</button>
                <button type="button" className="win95-btn" onClick={() => setDialog(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────── G34: System Properties ───────────── */}
      {dialog === 'sysprops' && (
        <div className="win95-dialog wide" role="dialog" aria-label="System Properties">
          <div className="win95-dialog-titlebar">
            <span>System Properties</span>
            <button className="win95-titlebtn" onClick={() => setDialog(null)} aria-label="Close">✕</button>
          </div>
          <div className="win95-dialog-body">
            <div className="win95-dialog-section">
              <b>System:</b>
              <div>prashantgarg.os</div>
              <div>Astro static build · React Three Fiber + drei (the 3D office)</div>
              <div>Hand-rolled React window manager (this desktop)</div>
              <div>Deployed from GitHub Pages on every push to main</div>
            </div>
            <div className="win95-dialog-section">
              <b>Equipment:</b>
              <div>3D models: CC0 Quaternius packs, texture-stripped ~140 MB → ~1 MB</div>
              <div>Set: Severance-style MDR office — pinwheel pod, coffered ceiling</div>
              <div>Sound scheme: synthesised WebAudio, zero audio assets</div>
            </div>
            <div className="win95-dialog-section">
              <b>Registered to:</b>
              <div>Prashant Garg · Economist</div>
              <div>Research toolchain: Python + LLM pipelines (retrieval &amp; generation), causal inference, network science</div>
            </div>
            <div className="win95-dialog-buttons">
              <button className="win95-btn" onClick={() => setDialog(null)}>OK</button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────── G35: Wellness Session ───────────── */}
      {dialog === 'wellness' && <WellnessDialog onClose={() => setDialog(null)} />}

      {/* ───────────── Start menu ───────────── */}
      {startOpen && (
        <div className="win95-startmenu" onMouseDown={e => e.stopPropagation()}>
          <div className="win95-startmenu-spine"><span><b>prashant</b>garg.os</span></div>
          <div className="win95-startmenu-list">
            {APPS.filter(a => a.id !== 'home').map(app => (
              <div
                key={app.id}
                className="win95-startmenu-item"
                onMouseDown={() => playUiClick('down', 'menu')}
                onMouseUp={() => playUiClick('up', 'menu')}
                onClick={() => onStartMenuItem(app.id)}
              >
                <div className="win95-startmenu-icon"><app.Icon /></div>
                {app.label}
              </div>
            ))}
            <div className="win95-startmenu-sep" />
            {/* G30/G34/G35/G36: system items */}
            <div
              className="win95-startmenu-item"
              onMouseDown={() => playUiClick('down', 'menu')}
              onMouseUp={() => playUiClick('up', 'menu')}
              onClick={() => { setStartOpen(false); setDialog('run'); }}
            >
              <div className="win95-startmenu-icon">
                <svg width="20" height="20" viewBox="0 0 20 20"><rect x="2" y="5" width="16" height="10" fill="#fff" stroke="#2b2b2b" strokeWidth="1.5"/><path d="M5 9l3 2-3 2" fill="none" stroke="#2b2b2b" strokeWidth="1.5"/></svg>
              </div>
              Run…
            </div>
            {/* (declutter) Wellness Session + System Properties removed from the
                always-visible Start menu — demoted to the Run command (type
                "wellness" / "properties"). Wellness copy is still DRAFT, so it
                should not sit at-rest in the menu. Run… kept: it's the genuine
                launcher and the mechanism the two are demoted into. */}
            <div
              className="win95-startmenu-item"
              onMouseDown={() => playUiClick('down', 'menu')}
              onMouseUp={() => playUiClick('up', 'menu')}
              onClick={() => { window.location.href = '/standard'; }}
              title="The plain, fast version of this site (or press B)"
            >
              <div className="win95-startmenu-icon">
                <svg width="20" height="20" viewBox="0 0 20 20"><rect x="3" y="3" width="14" height="14" fill="#fff" stroke="#2b2b2b" strokeWidth="1.5"/><line x1="5.5" y1="7" x2="14.5" y2="7" stroke="#2b2b2b" strokeWidth="1.2"/><line x1="5.5" y1="10" x2="14.5" y2="10" stroke="#2b2b2b" strokeWidth="1.2"/><line x1="5.5" y1="13" x2="11" y2="13" stroke="#2b2b2b" strokeWidth="1.2"/></svg>
              </div>
              Standard Issue View
            </div>
            <div className="win95-startmenu-sep" />
            {/* The 3D office needs an explicit door from the desktop for
                EVERY device: touch boots straight here, and returning desktop
                visitors are persisted past the intro (so they'd otherwise have
                no way back). Shutting down lands on the idle room. */}
            {typeof window !== 'undefined' && (
              <div
                className="win95-startmenu-item"
                onMouseDown={() => playUiClick('down', 'menu')}
                onMouseUp={() => playUiClick('up', 'menu')}
                onClick={shutDown}
              >
                <div className="win95-startmenu-icon">
                  <svg width="20" height="20" viewBox="0 0 20 20"><rect x="2" y="3" width="16" height="11" fill="none" stroke="#2b2b2b" strokeWidth="2"/><rect x="7" y="16" width="6" height="2" fill="#2b2b2b"/></svg>
                </div>
                View office (3D)
              </div>
            )}
            <div
              className="win95-startmenu-item"
              onMouseDown={() => playUiClick('down', 'menu')}
              onMouseUp={() => playUiClick('up', 'menu')}
              onClick={shutDown}
            >
              <div className="win95-startmenu-icon">
                <svg width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="7" fill="none" stroke="#c00" strokeWidth="2"/><line x1="10" y1="3" x2="10" y2="10" stroke="#c00" strokeWidth="2"/></svg>
              </div>
              Shut Down…
            </div>
          </div>
        </div>
      )}

      {/* ───────────── right-click desktop context menu ───────────── */}
      {ctxMenu && (
        <div
          className="win95-context"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
          onMouseDown={e => e.stopPropagation()}
          onContextMenu={e => e.preventDefault()}
        >
          <div
            className="win95-context-item"
            onClick={() => {
              setCtxMenu(null);
              setRefreshFlash(true);
              setTimeout(() => setRefreshFlash(false), 280);
              playUiClick('down');
            }}
          >Refresh</div>
          {/* (declutter) removed the 3 greyed dead stubs — Arrange Icons,
              New, Properties — only real actions remain. */}
          <div className="win95-context-sep" />
          <div
            className="win95-context-item"
            onClick={() => { setCtxMenu(null); onStartMenuItem('home' as AppId); }}
          >Open Home</div>
          <div
            className="win95-context-item"
            onClick={() => { setCtxMenu(null); onClose(); }}
          >Back to Study…</div>
        </div>
      )}
      {refreshFlash && (
        <div style={{
          position: 'absolute', inset: 0, background: '#3e9697', opacity: 0.55,
          pointerEvents: 'none', zIndex: 9999,
          animation: 'pg-refresh-flash 0.28s ease-out forwards',
        }}>
          <style>{`@keyframes pg-refresh-flash { from { opacity: 0.55; } to { opacity: 0; } }`}</style>
        </div>
      )}

      {/* ───────────── taskbar ───────────── */}
      <div className="win95-toolbar" onMouseDown={e => e.stopPropagation()}>
        <button
          className="win95-start-btn"
          onMouseDown={() => playUiClick('down')}
          onMouseUp={() => playUiClick('up')}
          onClick={() => setStartOpen(o => !o)}
        >
          <svg width="16" height="16" viewBox="0 0 16 16">
            <rect x="0" y="0" width="7" height="7" fill="#f25022"/>
            <rect x="9" y="0" width="7" height="7" fill="#7fba00"/>
            <rect x="0" y="9" width="7" height="7" fill="#00a4ef"/>
            <rect x="9" y="9" width="7" height="7" fill="#ffb900"/>
          </svg>
          Start
        </button>

        {/* HOME — always-visible one-click "show the desktop" (the home
            content lives on the desktop). Windows can cover the desktop
            icons, so this is the guaranteed way back. */}
        <button
          className="win95-start-btn win95-home-btn"
          title="Home — show the desktop"
          onMouseDown={() => playUiClick('down')}
          onMouseUp={() => playUiClick('up')}
          onClick={() => openApp('home')}
        >
          <svg width="14" height="14" viewBox="0 0 16 16">
            <path d="M8 1 L15 8 H13 V14 H10 V10 H6 V14 H3 V8 H1 Z" fill="#2b2b2b"/>
          </svg>
          Home
        </button>

        {/* one taskbar chip per open window */}
        {wins.map(w => {
          const app = APP_BY_ID[w.id];
          const focused = topId === w.id && !w.minimized;
          return (
            <button
              key={w.id}
              className={`win95-taskbar-chip ${focused ? 'focused' : ''}`}
              onMouseDown={() => playUiClick('down')}
              onMouseUp={() => playUiClick('up')}
              onClick={(e) => {
                // Find the chip's screen position so restore animates
                // OUT from the chip (zoom-up from taskbar).
                const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const ce = containerRef.current?.getBoundingClientRect();
                const fp = ce ? { x: r.x + r.width/2 - ce.x, y: r.y + r.height/2 - ce.y } : undefined;
                if (w.minimized) {
                  // restore — unset minimized, replay opening animation
                  // from the taskbar chip so it visually zooms up.
                  setWins(ws => ws.map(s => s.id === w.id
                    ? { ...s, minimized: false, state: 'opening' as const, openFrom: fp }
                    : s));
                  focusApp(w.id);
                  setTimeout(() => setWins(ws => ws.map(s => s.id === w.id
                    ? { ...s, state: 'open' as const } : s)), 220);
                } else if (focused) {
                  minimizeApp(w.id);
                } else {
                  focusApp(w.id);
                }
              }}
            >
              <span style={{ display: 'flex', transform: 'scale(0.55)', transformOrigin: 'center', flexShrink: 0 }}><app.Icon /></span>
              {app.label}
            </button>
          );
        })}

        <div className="win95-toolbar-spacer" />
        {/* Always-visible exit back to the 3D office — reliable even when a
            window is maximized (clicking the room can't be reached then) and
            mirrors the Esc shortcut. */}
        <button
          className="win95-tray-btn"
          title="Back to the office (Esc)"
          aria-label="Back to the office"
          onMouseDown={() => playUiClick('down')}
          onMouseUp={() => playUiClick('up')}
          onClick={shutDown}
        >
          <svg width="16" height="16" viewBox="0 0 16 16">
            <rect x="1.5" y="3" width="13" height="9" rx="1" fill="none" stroke="#2b2b2b" strokeWidth="1.4"/>
            <rect x="6" y="12.5" width="4" height="1.4" fill="#2b2b2b"/>
            <path d="M5.6 7.4 L8 5 L10.4 7.4 M8 5 V9.6" fill="none" stroke="#2b2b2b" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        {/* system tray: volume slider + icon (click icon = mute toggle) */}
        <VolumeTray />
        <div className="win95-clock">{time}</div>
      </div>
    </div>
  );
}

/* ---------- HOME content — the inline React view for app=home -------- */
/* ---------- G32: idle screensaver — "After Dark" ---------------------
 * After ~90 s without input the desktop dims and the workstation badge
 * bounces DVD-style. Any input dismisses. Disabled entirely under
 * prefers-reduced-motion. Test hook: sessionStorage 'pg_ss_ms'. */
function Screensaver() {
  const [active, setActive] = useState(false);
  const posRef = useRef({ x: 80, y: 80, vx: 0.12, vy: 0.09 });
  const boxRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let ms = 90000;
    try { const o = parseInt(sessionStorage.getItem('pg_ss_ms') || '', 10); if (o > 0) ms = o; } catch { /* */ }
    let timeout: ReturnType<typeof setTimeout>;
    const arm = () => { clearTimeout(timeout); timeout = setTimeout(() => setActive(true), ms); };
    const wake = () => { setActive(false); arm(); };
    const evs = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'];
    evs.forEach(ev => window.addEventListener(ev, wake, { passive: true }));
    arm();
    return () => { clearTimeout(timeout); evs.forEach(ev => window.removeEventListener(ev, wake)); };
  }, []);
  useEffect(() => {
    if (!active) { cancelAnimationFrame(rafRef.current); return; }
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(50, now - last); last = now;
      const p = posRef.current;
      const W = window.innerWidth - 250, H = window.innerHeight - 100;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.x <= 0 || p.x >= W) p.vx *= -1;
      if (p.y <= 0 || p.y >= H) p.vy *= -1;
      p.x = Math.max(0, Math.min(W, p.x)); p.y = Math.max(0, Math.min(H, p.y));
      if (boxRef.current) boxRef.current.style.transform = `translate(${p.x}px, ${p.y}px)`;
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active]);
  if (!active) return null;
  return (
    <div className="win95-screensaver">
      <div ref={boxRef} className="win95-screensaver-logo">
        <div className="win95-screensaver-mark">prashantgarg<b>.os</b></div>
        <div className="win95-screensaver-sub">please enjoy each section equally</div>
      </div>
    </div>
  );
}

/* ---------- G35: Wellness Session — deadpan About/FAQ ----------------
 * Ms.-Casey-flat statements that are actually the bio. Every factual
 * claim traces to site.ts data (papers, affiliations, talks, email).
 * DRAFT copy — flagged for user review. */
const WELLNESS_LINES: { text: string; link?: { label: string; href: string } }[] = [
  { text: 'Welcome to your wellness session. Please make yourself comfortable.' },
  { text: 'Your outie is an economist.' },
  { text: 'Your outie studies science, innovation, production, and media.' },
  { text: 'Your outie has published in Nature Human Behaviour.' },
  { text: 'Your outie has a second paper forthcoming there. About disasters.' },
  { text: 'Your outie taught a machine to read 45,000 economics papers, and now knows who claims what causes what.' },
  { text: 'Your outie recently completed a PhD at Imperial College London.' },
  { text: 'Your outie is a Research Associate at the University of Cambridge.' },
  { text: 'Your outie will join Bocconi University in September 2026. Milan is said to be agreeable.' },
  { text: "Your outie mapped Bob Dylan's mind. Mr. Dylan has not been informed." },
  { text: `Your outie has given ${talks.length} talks. People keep inviting your outie back.` },
  { text: 'Your outie can be reached by electronic mail.', link: { label: site.email, href: `mailto:${site.email}` } },
  { text: "Your outie's complete record is available for inspection.", link: { label: 'Curriculum vitae', href: '/cv' } },
  { text: 'This concludes your wellness session. Please return to your desk.' },
];

function WellnessDialog({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const last = i >= WELLNESS_LINES.length - 1;
  const line = WELLNESS_LINES[Math.min(i, WELLNESS_LINES.length - 1)];
  return (
    <div className="win95-dialog" role="dialog" aria-label="Wellness Session">
      <div className="win95-dialog-titlebar">
        <span>Wellness Session</span>
        <button className="win95-titlebtn" onClick={onClose} aria-label="Close">✕</button>
      </div>
      <div className="win95-dialog-body">
        <p className="win95-wellness-line">{line.text}</p>
        {line.link && (
          <p className="win95-wellness-line">
            <a href={line.link.href} target={line.link.href.startsWith('mailto') ? undefined : '_blank'} rel="noopener">{line.link.label}</a>
          </p>
        )}
        <div className="win95-dialog-buttons">
          <span style={{ marginRight: 'auto', color: '#666', fontSize: 11 }}>{Math.min(i + 1, WELLNESS_LINES.length)} / {WELLNESS_LINES.length}</span>
          {!last && <button className="win95-btn" onClick={() => { playUiClick('down', 'soft'); setI(n => n + 1); }}>Continue</button>}
          {last && <button className="win95-btn" onClick={onClose}>Return to desk</button>}
        </div>
      </div>
    </div>
  );
}

function HomeContent() {
  return (
    <div className="win95-home">
      <div className="win95-home-header">
        <img className="win95-home-photo" src="/photo.jpg" alt="Prashant Garg" />
        <div className="win95-home-headtext">
          <div className="win95-home-name">Prashant Garg</div>
          <div className="win95-home-subtitle">
            Economist · Research Associate at Cambridge
          </div>
          <p className="win95-home-bio">{site.bio}</p>
        </div>
      </div>
      <ContactStrip />
    </div>
  );
}
