import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Moldura com a mesma proporção da foto original. Tudo que é desenhado por
 * cima (produto 2D, canvas 3D, ferramentas) usa coordenadas em pixels da
 * foto original multiplicadas por `scale`, então nunca há distorção.
 */
export default function PhotoFrame({
  width,
  height,
  maxVh = 70,
  className = '',
  children,
}: {
  width: number;
  height: number;
  maxVh?: number;
  className?: string;
  children: (scale: number, frameW: number, frameH: number) => ReactNode;
}) {
  const outer = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, vh: typeof window !== 'undefined' ? window.innerHeight : 800 });

  useEffect(() => {
    const el = outer.current!;
    const update = () => setBox({ w: el.clientWidth, vh: window.innerHeight });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    update();
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  const maxH = (box.vh * maxVh) / 100;
  const frameW = Math.min(box.w, (maxH * width) / height);
  const frameH = (frameW * height) / width;
  const scale = frameW / width;

  return (
    <div ref={outer} className={`flex w-full justify-center ${className}`}>
      {frameW > 0 && (
        <div className="relative overflow-hidden rounded-xl bg-black/5 shadow-sm" style={{ width: frameW, height: frameH }}>
          {children(scale, frameW, frameH)}
        </div>
      )}
    </div>
  );
}
