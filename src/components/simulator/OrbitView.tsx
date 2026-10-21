import { Suspense, useEffect, useRef, type ComponentRef, type RefObject } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import LoadingOverlay from '../three/LoadingOverlay';
import type { Product } from '../../types';
import { ProductModel } from '../three/ProductModel';
import StudioEnvironment from '../three/StudioEnvironment';

type OrbitControlsImpl = ComponentRef<typeof OrbitControls>;

export type AnglePreset = 'frente' | 'lateral' | 'diagonal' | 'superior' | 'traseira';

export const ANGLE_PRESETS: { id: AnglePreset; label: string }[] = [
  { id: 'frente', label: 'Frente' },
  { id: 'diagonal', label: '3/4' },
  { id: 'lateral', label: 'Lateral' },
  { id: 'traseira', label: 'Traseira' },
  { id: 'superior', label: 'Superior' },
];

function PresetCamera({ preset, hM, rotationDeg, controls }: { preset: AnglePreset; hM: number; rotationDeg: number; controls: RefObject<OrbitControlsImpl | null> }) {
  // hM aqui é a altura a enquadrar (produto ou silhueta humana, o que for maior).
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    const d = Math.max(hM, 0.3) * 2.6;
    const base = (rotationDeg * Math.PI) / 180;
    const angles: Record<AnglePreset, [number, number]> = {
      frente: [0, 0.15],
      diagonal: [Math.PI / 4, 0.3],
      lateral: [Math.PI / 2, 0.15],
      traseira: [Math.PI, 0.15],
      superior: [0, 1.35],
    };
    const [yaw, pitch] = angles[preset];
    const a = base + yaw;
    camera.position.set(Math.sin(a) * Math.cos(pitch) * d, hM / 2 + Math.sin(pitch) * d, Math.cos(a) * Math.cos(pitch) * d);
    controls.current?.target.set(0, hM / 2, 0);
    controls.current?.update();
  }, [preset, hM, rotationDeg, camera, controls]);
  return null;
}

/** Referência humana de 1,70 m para leitura de escala ao girar o produto. */
function HumanReference({ offsetX }: { offsetX: number }) {
  return (
    <group position={[offsetX, 0, 0]}>
      <mesh position={[0, 0.72, 0]}>
        <capsuleGeometry args={[0.16, 1.1, 8, 16]} />
        <meshStandardMaterial color="#c9cfdf" transparent opacity={0.55} />
      </mesh>
      <mesh position={[0, 1.58, 0]}>
        <sphereGeometry args={[0.12, 24, 16]} />
        <meshStandardMaterial color="#c9cfdf" transparent opacity={0.55} />
      </mesh>
    </group>
  );
}

export default function OrbitView({ product, modelUrl, preset, rotationDeg, showHuman }: { product: Product; modelUrl: string; preset: AnglePreset; rotationDeg: number; showHuman: boolean }) {
  const hM = product.heightCm / 100;
  const controls = useRef<OrbitControlsImpl | null>(null);
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-white to-awake-cream-dark">
      <Canvas camera={{ fov: 35, near: 0.01, far: 100, position: [0, hM, hM * 3] }} dpr={[1, 2]}>
        <StudioEnvironment intensity={0.7} />
        <directionalLight position={[2, 4, 3]} intensity={1.4} />
        <group rotation={[0, (rotationDeg * Math.PI) / 180, 0]}>
          <Suspense fallback={null}>
            <ProductModel url={modelUrl} heightCm={product.heightCm} />
          </Suspense>
        </group>
        {showHuman && <HumanReference offsetX={-(product.widthCm / 200 + 0.35)} />}
        <gridHelper args={[6, 60, '#c9c3b5', '#e2dccf']} position={[0, 0, 0]} />
        <ContactShadows position={[0, 0.001, 0]} opacity={0.4} scale={Math.max(hM * 3, 1.2)} blur={2.2} far={hM + 0.2} />
        <OrbitControls ref={controls} makeDefault enablePan={false} minDistance={0.2} maxDistance={12} />
        <PresetCamera preset={preset} hM={showHuman ? Math.max(hM, 1.75) : hM} rotationDeg={rotationDeg} controls={controls} />
      </Canvas>
      <LoadingOverlay />
      <p className="pointer-events-none absolute bottom-2 left-0 right-0 text-center text-[11px] text-awake-blue/55">
        Arraste para girar a câmera · grade de 10 cm{showHuman ? ' · silhueta de 1,70 m' : ''}
      </p>
    </div>
  );
}
