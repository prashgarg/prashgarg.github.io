import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent,
} from 'react';
import {
  PAINT_COLORS,
  PAINT_HEIGHT,
  PAINT_SIZES,
  PAINT_WIDTH,
  pointFromClient,
  rectFromPoints,
  type CanvasPoint,
  type PaintSize,
  type PaintTool,
} from './paintEngine';
import './Paint.css';

const STORAGE_KEY = 'pg_paint_v1';
const MAX_HISTORY = 24;
const PAPER = '#fffdf7';

type PaintProps = { active: boolean };
type History = { past: ImageData[]; future: ImageData[] };
type Stroke = {
  pointerId: number;
  tool: PaintTool;
  start: CanvasPoint;
  last: CanvasPoint;
  base: ImageData;
  moved: boolean;
};

function copyImageData(image: ImageData): ImageData {
  return new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
}

function canvasContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  return canvas.getContext('2d', { willReadFrequently: true });
}

function setStrokeStyle(ctx: CanvasRenderingContext2D, color: string, size: number) {
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

function drawShape(ctx: CanvasRenderingContext2D, tool: PaintTool, start: CanvasPoint, end: CanvasPoint, color: string, size: number) {
  setStrokeStyle(ctx, color, size);
  ctx.beginPath();
  if (tool === 'line') {
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  } else if (tool === 'rectangle') {
    const rect = rectFromPoints(start, end);
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
  }
}

function fillPaper(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, PAINT_WIDTH, PAINT_HEIGHT);
  ctx.restore();
}

export default function Paint({ active }: PaintProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef<History>({ past: [], future: [] });
  const strokeRef = useRef<Stroke | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(false);
  const restoreSettledRef = useRef(false);
  const [tool, setTool] = useState<PaintTool>('pencil');
  const [color, setColor] = useState(PAINT_COLORS[0].value);
  const [size, setSize] = useState<PaintSize>(5);
  const [historyVersion, setHistoryVersion] = useState(0);
  const [notice, setNotice] = useState('White paper');
  const [pendingClear, setPendingClear] = useState(false);
  const [restoring, setRestoring] = useState(true);

  const currentContext = useCallback(() => {
    const canvas = canvasRef.current;
    return canvas ? canvasContext(canvas) : null;
  }, []);

  const saveNow = useCallback((canvas = canvasRef.current) => {
    if (!canvas || !restoreSettledRef.current) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, canvas.toDataURL('image/png'));
      if (mountedRef.current) setNotice('Saved in this browser');
    } catch {
      if (mountedRef.current) setNotice('Drawing kept for this session');
    }
  }, []);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null;
      saveNow();
    }, 450);
  }, [saveNow]);

  const remember = useCallback((ctx: CanvasRenderingContext2D) => {
    const history = historyRef.current;
    const next = copyImageData(ctx.getImageData(0, 0, PAINT_WIDTH, PAINT_HEIGHT));
    history.past = [...history.past.slice(-(MAX_HISTORY - 1)), next];
    history.future = [];
    setHistoryVersion(value => value + 1);
    scheduleSave();
  }, [scheduleSave]);

  const restoreImage = useCallback((image: ImageData) => {
    const ctx = currentContext();
    if (!ctx) return;
    ctx.putImageData(image, 0, 0);
    setHistoryVersion(value => value + 1);
  }, [currentContext]);

  const cancelStroke = useCallback(() => {
    const stroke = strokeRef.current;
    if (!stroke) return;
    const canvas = canvasRef.current;
    if (canvas?.hasPointerCapture(stroke.pointerId)) canvas.releasePointerCapture(stroke.pointerId);
    restoreImage(stroke.base);
    strokeRef.current = null;
  }, [restoreImage]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas ? canvasContext(canvas) : null;
    if (!canvas || !ctx) return undefined;
    let cancelled = false;
    mountedRef.current = true;
    restoreSettledRef.current = false;
    canvas.width = PAINT_WIDTH;
    canvas.height = PAINT_HEIGHT;
    fillPaper(ctx);
    historyRef.current = { past: [copyImageData(ctx.getImageData(0, 0, PAINT_WIDTH, PAINT_HEIGHT))], future: [] };
    setHistoryVersion(value => value + 1);

    let stored = '';
    try { stored = window.localStorage.getItem(STORAGE_KEY) ?? ''; } catch {
      restoreSettledRef.current = true;
      setRestoring(false);
      setNotice('White paper · local saving unavailable');
    }
    if (stored?.startsWith('data:image/')) {
      setNotice('Restoring drawing…');
      const image = new Image();
      image.onload = () => {
        if (cancelled || !mountedRef.current) return;
        ctx.clearRect(0, 0, PAINT_WIDTH, PAINT_HEIGHT);
        ctx.drawImage(image, 0, 0, PAINT_WIDTH, PAINT_HEIGHT);
        historyRef.current = { past: [copyImageData(ctx.getImageData(0, 0, PAINT_WIDTH, PAINT_HEIGHT))], future: [] };
        setHistoryVersion(value => value + 1);
        restoreSettledRef.current = true;
        setRestoring(false);
        setNotice('Restored from this browser');
      };
      image.onerror = () => { if (!cancelled) { restoreSettledRef.current = true; setRestoring(false); setNotice('White paper'); } };
      image.src = stored;
    } else {
      restoreSettledRef.current = true;
      setRestoring(false);
    }
    return () => {
      cancelled = true;
      mountedRef.current = false;
      cancelStroke();
      if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
      saveNow(canvas);
    };
  }, [cancelStroke, saveNow]);

  useEffect(() => {
    const flush = () => {
      cancelStroke();
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      saveNow();
    };
    const onVisibilityChange = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      flush();
    };
  }, [cancelStroke, saveNow]);

  useEffect(() => {
    if (!active) cancelStroke();
  }, [active, cancelStroke]);

  useEffect(() => {
    const cancelOnBlur = () => cancelStroke();
    window.addEventListener('blur', cancelOnBlur);
    return () => {
      window.removeEventListener('blur', cancelOnBlur);
    };
  }, [cancelStroke]);

  const logicalPoint = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return pointFromClient(event.clientX, event.clientY, rect);
  };

  const drawPencilSegment = (ctx: CanvasRenderingContext2D, from: CanvasPoint, to: CanvasPoint, activeTool: PaintTool) => {
    setStrokeStyle(ctx, activeTool === 'eraser' ? PAPER : color, size);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!active || restoring || strokeRef.current || event.button !== 0) return;
    event.preventDefault();
    const ctx = currentContext();
    if (!ctx) return;
    const point = logicalPoint(event);
    const stroke: Stroke = {
      pointerId: event.pointerId,
      tool,
      start: point,
      last: point,
      base: copyImageData(ctx.getImageData(0, 0, PAINT_WIDTH, PAINT_HEIGHT)),
      moved: false,
    };
    strokeRef.current = stroke;
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    if (tool === 'pencil' || tool === 'eraser') drawPencilSegment(ctx, point, { x: point.x + 0.01, y: point.y + 0.01 }, tool);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const stroke = strokeRef.current;
    if (!stroke || stroke.pointerId !== event.pointerId) return;
    event.preventDefault();
    const ctx = currentContext();
    if (!ctx) return;
    const point = logicalPoint(event);
    stroke.moved = stroke.moved || Math.abs(point.x - stroke.start.x) > 0.2 || Math.abs(point.y - stroke.start.y) > 0.2;
    if (stroke.tool === 'pencil' || stroke.tool === 'eraser') {
      drawPencilSegment(ctx, stroke.last, point, stroke.tool);
    } else {
      ctx.putImageData(stroke.base, 0, 0);
      drawShape(ctx, stroke.tool, stroke.start, point, color, size);
    }
    stroke.last = point;
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const stroke = strokeRef.current;
    if (!stroke || stroke.pointerId !== event.pointerId) return;
    event.preventDefault();
    const canvas = event.currentTarget;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    const ctx = currentContext();
    if (ctx) {
      const point = logicalPoint(event);
      stroke.moved = stroke.moved || Math.abs(point.x - stroke.start.x) > 0.2 || Math.abs(point.y - stroke.start.y) > 0.2;
      if (stroke.tool === 'pencil' || stroke.tool === 'eraser') {
        drawPencilSegment(ctx, stroke.last, point, stroke.tool);
      } else {
        ctx.putImageData(stroke.base, 0, 0);
        drawShape(ctx, stroke.tool, stroke.start, point, color, size);
      }
      remember(ctx);
    }
    strokeRef.current = null;
    setNotice(stroke.moved ? 'Stroke added' : 'Mark added');
  };

  const undo = () => {
    const history = historyRef.current;
    if (history.past.length < 2) return;
    const current = history.past.pop()!;
    history.future.unshift(current);
    restoreImage(history.past[history.past.length - 1]);
    scheduleSave();
    setNotice('Undid last stroke');
  };

  const redo = () => {
    const history = historyRef.current;
    const next = history.future.shift();
    if (!next) return;
    history.past.push(next);
    restoreImage(next);
    scheduleSave();
    setNotice('Restored stroke');
  };

  const clear = () => {
    const ctx = currentContext();
    if (!ctx) return;
    fillPaper(ctx);
    remember(ctx);
    setPendingClear(false);
    setNotice('New white paper');
  };

  const exportPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(blob => {
      if (!blob) { setNotice('PNG export unavailable'); return; }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'prashant-painting.png';
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice('PNG downloaded');
    }, 'image/png');
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!active) return;
    if (event.key === 'Escape' && pendingClear) {
      event.preventDefault();
      event.stopPropagation();
      setPendingClear(false);
      return;
    }
    const target = event.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.tagName === 'SELECT' || target.tagName === 'INPUT' || target.isContentEditable) return;
    const key = event.key.toLowerCase();
    if (!event.metaKey && !event.ctrlKey && !event.altKey && key === 'p') setTool('pencil');
    else if (!event.metaKey && !event.ctrlKey && !event.altKey && key === 'e') setTool('eraser');
    else if (!event.metaKey && !event.ctrlKey && !event.altKey && key === 'l') setTool('line');
    else if (!event.metaKey && !event.ctrlKey && !event.altKey && key === 'r') setTool('rectangle');
    else if ((event.metaKey || event.ctrlKey) && key === 'z') { event.preventDefault(); event.shiftKey ? redo() : undo(); }
  };

  const canUndo = historyVersion >= 0 && historyRef.current.past.length > 1;
  const canRedo = historyVersion >= 0 && historyRef.current.future.length > 0;

  return (
    <div className="accessory-app paint-app" onKeyDown={onKeyDown} tabIndex={0}>
      <div className="accessory-toolbar paint-toolbar" role="toolbar" aria-label="Paint tools">
        <div className="paint-tool-group" aria-label="Drawing tools">
          {([['pencil', 'Pencil', 'P'], ['eraser', 'Eraser', 'E'], ['line', 'Line', 'L'], ['rectangle', 'Rectangle', 'R']] as [PaintTool, string, string][]).map(([value, label, shortcut]) => (
            <button key={value} type="button" className={`accessory-button paint-tool${tool === value ? ' is-selected' : ''}`} aria-pressed={tool === value} onClick={() => setTool(value)} title={`${label} (${shortcut})`}>
              {label}
            </button>
          ))}
        </div>
        <div className="paint-palette" role="group" aria-label="Colours">
          {PAINT_COLORS.map((entry) => (
            <button key={entry.value} type="button" className={`paint-swatch${color === entry.value ? ' is-selected' : ''}`} style={{ '--swatch': entry.value } as CSSProperties} aria-label={`${entry.name} colour`} aria-pressed={color === entry.value} onClick={() => setColor(entry.value)} title={entry.name} />
          ))}
        </div>
        <label className="paint-size-label">Size
          <select className="accessory-input paint-size" value={size} onChange={event => setSize(Number(event.target.value) as PaintSize)} aria-label="Brush size">
            {PAINT_SIZES.map(value => <option key={value} value={value}>{value}px</option>)}
          </select>
        </label>
      </div>

      <div className="paint-actions accessory-toolbar">
        <button type="button" className="accessory-button" onClick={undo} disabled={!canUndo}>Undo</button>
        <button type="button" className="accessory-button" onClick={redo} disabled={!canRedo}>Redo</button>
        {pendingClear ? <>
          <button type="button" className="accessory-button" onClick={clear}>Clear paper</button>
          <button type="button" className="accessory-button" onClick={() => setPendingClear(false)}>Cancel</button>
        </> : <button type="button" className="accessory-button" onClick={() => setPendingClear(true)}>Clear</button>}
        <button type="button" className="accessory-button paint-export" onClick={exportPng}>Save PNG</button>
      </div>

      <div className="paint-stage">
        <div className="paint-canvas-shell">
          <canvas
            ref={canvasRef}
            className="paint-canvas"
            width={PAINT_WIDTH}
            height={PAINT_HEIGHT}
            tabIndex={0}
            role="img"
            aria-label="Paint canvas. Use the selected tool to draw."
            aria-busy={restoring}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={cancelStroke}
          />
          {restoring && <span className="paint-restoring" role="status">Restoring drawing…</span>}
        </div>
      </div>
      <p className="accessory-status paint-status" aria-live="polite">{notice} · {tool} · {size}px</p>
    </div>
  );
}
