import { Component, lazy, Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import InnerDesktop from './InnerDesktop';
import { readViewPreference } from '../lib/viewPreference';

// Keep the room on a separate async boundary. Importing Office pulls in
// Three.js, drei, postprocessing, and the room models; the desktop itself is
// useful without any of that on touch screens and explicit desktop visits.
const LazyOffice = lazy(() => import('./Office'));

function prefersLightweightEntry(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  const path = window.location.pathname || '/';
  const touch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  const readingViewport = window.matchMedia('(max-width: 900px), (max-height: 600px)').matches;
  let readingSession = false;
  try { readingSession = sessionStorage.getItem('pg_reading') === '1'; } catch { /* unavailable */ }

  // A deep link is already an instruction to open the desktop. `composite=0`
  // is also the public fullscreen fallback and should not briefly load a room
  // that cannot be seen.
  return touch || readingViewport || readingSession || readViewPreference() === 'desktop'
    || params.get('composite') === '0' || params.has('app') || (path !== '/' && path !== '');
}

function RoomLoading({ onReturn, failed = false }: { onReturn: () => void; failed?: boolean }) {
  return (
    <div className="website-entry-room-loading" role="status" aria-live="polite">
      <div>
        <p>{failed ? 'The room couldn’t load.' : 'Opening the room…'}</p>
        <button className="office-control" style={{ position: 'static', marginTop: 16 }} onClick={onReturn}>Back to desktop</button>
      </div>
    </div>
  );
}

class RoomBoundary extends Component<{children: ReactNode; onReturn: () => void}, {failed: boolean}> {
  state = { failed: false };
  static getDerivedStateFromError() { return {failed:true}; }
  render() {
    return this.state.failed ? <RoomLoading failed onReturn={this.props.onReturn} /> : this.props.children;
  }
}

/**
 * The first client component on `/`. Wide, first-time visitors keep the
 * existing BIOS → room entrance. Phones and people who chose desktop view
 * start with the desktop immediately; the room code is fetched only when
 * they use its explicit door in the Start menu.
 */
export default function WebsiteEntry() {
  const initialLightweight = useMemo(prefersLightweightEntry, []);
  const [fallbackDesktop, setFallbackDesktop] = useState(false);
  const lightweight = initialLightweight || fallbackDesktop;
  const [roomRequested, setRoomRequested] = useState(false);
  const [roomDesktopOpen, setRoomDesktopOpen] = useState(false);

  // The server-rendered entry remains useful before hydration and for
  // no-JS visitors. Once the desktop has taken over, remove that duplicate
  // copy from the accessibility tree just as the full Office does.
  useEffect(() => {
    if (!lightweight) return; // Office takes over only once its lazy import mounts.
    const entry = document.getElementById('entry');
    if (!entry) return;
    try { (entry as HTMLElement & { inert?: boolean }).inert = true; } catch { /* older browsers */ }
    entry.setAttribute('aria-hidden', 'true');
  }, [lightweight]);

  const returnToDesktop = useCallback(() => {
    setFallbackDesktop(true);
    setRoomRequested(false);
    setRoomDesktopOpen(false);
  }, []);

  const openRoom = useCallback(() => {
    setRoomDesktopOpen(false);
    setRoomRequested(true);
  }, []);
  const closeDesktop = useCallback(() => {
    // The same desktop stays mounted while Office switches to its room, so
    // its open windows and document snapshots are retained.
    if (roomRequested) setRoomDesktopOpen(false);
    else openRoom();
  }, [openRoom, roomRequested]);
  const onPhaseChange = useCallback((phase: string) => {
    setRoomDesktopOpen(phase === 'desktop');
  }, []);

  if (!lightweight) {
    return (
      <RoomBoundary onReturn={returnToDesktop}>
        <Suspense fallback={null}>
          <LazyOffice />
        </Suspense>
      </RoomBoundary>
    );
  }

  const desktopVisible = !roomRequested || roomDesktopOpen;
  return (
    <>
      {roomRequested && (
        <RoomBoundary onReturn={returnToDesktop}>
          <Suspense fallback={<RoomLoading onReturn={returnToDesktop} />}>
            <LazyOffice
              externalDesktop
              startInRoom
              desktopOpen={roomDesktopOpen}
              onPhaseChange={onPhaseChange}
            />
          </Suspense>
        </RoomBoundary>
      )}
      <div
        className="office-desktop-overlay"
        data-entry-desktop
        style={{ visibility: desktopVisible ? 'visible' : 'hidden', zIndex: 10001 }}
        aria-hidden={!desktopVisible}
      >
        <InnerDesktop onClose={closeDesktop} embedded active={desktopVisible} />
      </div>
    </>
  );
}
