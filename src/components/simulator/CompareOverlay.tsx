import { useRef } from 'react';

/**
 * Antes/depois: à esquerda da divisória a foto original, à direita a
 * composição. A camada do produto é recortada pelo componente pai com
 * clip-path; aqui ficam apenas a divisória e os rótulos.
 */
export default function CompareOverlay({ split, onChange }: { split: number; onChange: (v: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (clientX: number) => {
    const r = ref.current!.getBoundingClientRect();
    onChange(Math.min(Math.max((clientX - r.left) / r.width, 0), 1));
  };
  return (
    <div
      ref={ref}
      className="absolute inset-0 z-20 touch-none"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        move(e.clientX);
      }}
      onPointerMove={(e) => e.currentTarget.hasPointerCapture(e.pointerId) && move(e.clientX)}
    >
      <div className="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_6px_rgba(0,0,0,0.4)]" style={{ left: `${split * 100}%` }}>
        <div className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-awake-blue shadow-lg">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M9 6l-6 6 6 6M15 6l6 6-6 6" /></svg>
        </div>
      </div>
      <span className="label-caps absolute left-3 top-3 rounded-full bg-black/55 px-3 py-1 text-white">Antes</span>
      <span className="label-caps absolute right-3 top-3 rounded-full bg-awake-pink px-3 py-1 text-white">Depois</span>
    </div>
  );
}
