import { useProgress } from '@react-three/drei';

/** Indicador de carregamento fora do Canvas (evita portais DOM dentro do Suspense). */
export default function LoadingOverlay({ label = 'Carregando modelo 3D…' }: { label?: string }) {
  const { active, progress } = useProgress();
  if (!active) return null;
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-awake-blue shadow">
        {label} {Math.round(progress)}%
      </span>
    </div>
  );
}
