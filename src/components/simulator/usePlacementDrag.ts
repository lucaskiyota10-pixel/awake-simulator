import { useRef, type PointerEvent as RPointerEvent, type KeyboardEvent as RKeyboardEvent } from 'react';
import type { Point } from '../../types';

export interface ImageRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Arrastar o produto sobre a foto (mouse e toque). Se o toque começa sobre
 * o produto, ele é arrastado mantendo o ponto de pega; se começa fora, o
 * produto é levado até o ponto tocado.
 */
export function usePlacementDrag(opts: {
  scale: number;
  imageWidth: number;
  imageHeight: number;
  anchor: Point | null;
  productRect: ImageRect | null;
  onMove: (anchor: Point) => void;
  disabled?: boolean;
}) {
  const offset = useRef<Point | null>(null);
  const { scale, imageWidth, imageHeight } = opts;

  const toImage = (e: RPointerEvent<HTMLElement>): Point => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale };
  };
  const clamp = (p: Point): Point => ({
    x: Math.min(Math.max(p.x, 0), imageWidth),
    y: Math.min(Math.max(p.y, 0), imageHeight),
  });

  return {
    onPointerDown(e: RPointerEvent<HTMLElement>) {
      if (opts.disabled || !opts.anchor || e.button > 0) return;
      const p = toImage(e);
      const r = opts.productRect;
      const inside = r && p.x >= r.left && p.x <= r.left + r.width && p.y >= r.top && p.y <= r.top + r.height;
      offset.current = inside ? { x: opts.anchor.x - p.x, y: opts.anchor.y - p.y } : { x: 0, y: 0 };
      if (!inside) opts.onMove(clamp(p));
      e.currentTarget.setPointerCapture(e.pointerId);
      e.preventDefault();
    },
    onPointerMove(e: RPointerEvent<HTMLElement>) {
      if (!offset.current) return;
      const p = toImage(e);
      opts.onMove(clamp({ x: p.x + offset.current.x, y: p.y + offset.current.y }));
    },
    onPointerUp(e: RPointerEvent<HTMLElement>) {
      offset.current = null;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    },
    onKeyDown(e: RKeyboardEvent<HTMLElement>) {
      if (opts.disabled || !opts.anchor) return;
      const step = (e.shiftKey ? 10 : 1) / scale;
      const d: Record<string, Point> = {
        ArrowLeft: { x: -step, y: 0 },
        ArrowRight: { x: step, y: 0 },
        ArrowUp: { x: 0, y: -step },
        ArrowDown: { x: 0, y: step },
      };
      const delta = d[e.key];
      if (!delta) return;
      e.preventDefault();
      opts.onMove(clamp({ x: opts.anchor.x + delta.x, y: opts.anchor.y + delta.y }));
    },
  };
}
