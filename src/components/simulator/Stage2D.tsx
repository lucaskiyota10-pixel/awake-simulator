import type { Placement } from '../../types';
import type { ImageRect } from './usePlacementDrag';
import { usePlacementDrag } from './usePlacementDrag';
import CompareOverlay from './CompareOverlay';

export interface StageCommonProps {
  roomUrl: string;
  imageWidth: number;
  imageHeight: number;
  scale: number;
  placement: Placement;
  productRect: ImageRect;
  onMove: (anchor: Placement['anchor']) => void;
  compare: number | null;
  onCompareChange: (v: number) => void;
  interactive?: boolean;
}

export default function Stage2D({
  roomUrl,
  productUrl,
  shadow,
  ...p
}: StageCommonProps & { productUrl: string; shadow: boolean }) {
  const { scale, productRect: r, placement } = p;
  const drag = usePlacementDrag({
    scale,
    imageWidth: p.imageWidth,
    imageHeight: p.imageHeight,
    anchor: placement.anchor,
    productRect: r,
    onMove: p.onMove,
    disabled: p.compare !== null || p.interactive === false,
  });
  const clip = p.compare !== null ? `inset(0 0 0 ${p.compare * 100}%)` : undefined;
  const shadowW = r.width * 0.96;

  return (
    <div
      className="absolute inset-0 touch-none select-none outline-none focus-visible:ring-4 focus-visible:ring-awake-pink/50"
      tabIndex={0}
      aria-label="Área de simulação 2D. Arraste o produto ou use as setas do teclado."
      {...drag}
    >
      <img src={roomUrl} alt="Ambiente" className="absolute inset-0 h-full w-full" draggable={false} />
      <div className="absolute inset-0" style={{ clipPath: clip }}>
        {shadow && (
          <div
            className="absolute rounded-[50%]"
            style={{
              left: (r.left + r.width / 2) * scale - (shadowW * scale) / 2,
              top: (r.top + r.height) * scale - Math.max(2, shadowW * 0.07) * scale,
              width: shadowW * scale,
              height: Math.max(2, shadowW * 0.07) * 2 * scale,
              background: 'radial-gradient(closest-side, rgba(0,0,0,0.38), rgba(0,0,0,0))',
            }}
          />
        )}
        <img
          src={productUrl}
          alt="Produto"
          draggable={false}
          className="absolute max-w-none cursor-grab active:cursor-grabbing"
          style={{
            left: r.left * scale,
            top: r.top * scale,
            width: r.width * scale,
            height: r.height * scale,
            transform: placement.flipX ? 'scaleX(-1)' : undefined,
          }}
        />
      </div>
      {p.compare !== null && <CompareOverlay split={p.compare} onChange={p.onCompareChange} />}
    </div>
  );
}
