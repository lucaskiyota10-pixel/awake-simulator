import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import LoadingOverlay from './LoadingOverlay';
import { ProductModel, type ModelFitInfo } from './ProductModel';
import StudioEnvironment from './StudioEnvironment';
import ErrorBoundary from '../ErrorBoundary';

/** Visualizador 3D de produto com rotação livre (página do produto e admin). */
export default function ModelViewer({
  url,
  heightCm,
  onFit,
  className = '',
}: {
  url: string;
  heightCm: number;
  onFit?: (info: ModelFitInfo) => void;
  className?: string;
}) {
  const h = heightCm / 100;
  const dist = Math.max(h, 0.3) * 2.6;
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-b from-white to-awake-cream-dark ${className}`}>
      <ErrorBoundary
        resetKey={url}
        fallback={(e) => (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-red-700">
            Não foi possível carregar o modelo 3D. {e.message}
          </div>
        )}
      >
        <Canvas shadows camera={{ position: [dist * 0.6, h * 0.8, dist], fov: 35, near: 0.01, far: 100 }} dpr={[1, 2]}>
          <StudioEnvironment intensity={0.7} />
          <directionalLight position={[2, 4, 3]} intensity={1.6} castShadow />
          <ambientLight intensity={0.2} />
          <Suspense fallback={null}>
            <ProductModel url={url} heightCm={heightCm} onFit={onFit} />
          </Suspense>
          <ContactShadows position={[0, 0.001, 0]} opacity={0.45} scale={Math.max(h * 3, 1)} blur={2.2} far={h + 0.2} />
          <OrbitControls target={[0, h / 2, 0]} enablePan={false} minDistance={h * 0.8} maxDistance={dist * 3} />
        </Canvas>
        <LoadingOverlay />
      </ErrorBoundary>
      <p className="pointer-events-none absolute bottom-2 left-0 right-0 text-center text-[11px] text-awake-blue/50">
        Arraste para girar · pinça ou scroll para aproximar
      </p>
    </div>
  );
}
