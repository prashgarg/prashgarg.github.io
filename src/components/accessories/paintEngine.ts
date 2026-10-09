export type PaintTool = 'pencil' | 'eraser' | 'line' | 'rectangle';

export type PaintColor = {
  name: string;
  value: string;
};

export const PAINT_WIDTH = 800;
export const PAINT_HEIGHT = 500;

export const PAINT_COLORS: PaintColor[] = [
  { name: 'Ink', value: '#14110d' },
  { name: 'Paper', value: '#fffdf7' },
  { name: 'Red', value: '#a82020' },
  { name: 'Blue', value: '#0000a3' },
  { name: 'Green', value: '#2c5946' },
  { name: 'Mint', value: '#75b99d' },
  { name: 'Ochre', value: '#b17b2d' },
  { name: 'Rose', value: '#b75c68' },
];

export const PAINT_SIZES = [2, 5, 10, 18] as const;
export type PaintSize = (typeof PAINT_SIZES)[number];

export type CanvasPoint = { x: number; y: number };

/** Convert a browser-space pointer coordinate into the fixed logical canvas. */
export function pointFromClient(
  clientX: number,
  clientY: number,
  rect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>,
  width = PAINT_WIDTH,
  height = PAINT_HEIGHT,
): CanvasPoint {
  const x = rect.width > 0 ? ((clientX - rect.left) / rect.width) * width : 0;
  const y = rect.height > 0 ? ((clientY - rect.top) / rect.height) * height : 0;
  return {
    x: Math.max(0, Math.min(width, x)),
    y: Math.max(0, Math.min(height, y)),
  };
}

export function rectFromPoints(a: CanvasPoint, b: CanvasPoint) {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  };
}

export function samePoint(a: CanvasPoint, b: CanvasPoint): boolean {
  return a.x === b.x && a.y === b.y;
}
