import { Suspense, useLayoutEffect, useMemo, type MutableRefObject } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import LoadingOverlay from '../three/LoadingOverlay';
import * as THREE from 'three';
import type { CameraSettings, Product } from '../../types';
import { placeInWorld } from '../../lib/projection';
import { ProductModel, type ModelFitInfo } from '../three/ProductModel';
import StudioEnvironment from '../three/StudioEnvironment';
import ErrorBoundary from '../ErrorBoundary';
import { usePlacementDrag } from './usePlacementDrag';
import CompareOverlay from './CompareOverlay';
import type { StageCommonProps } from './Stage2D';

export type CaptureFn = (width: number, height: number) => HTMLCanvasElement;

export interface LightSettings {
  azimuthDeg: number;
  intensity: number;
}

function CameraRig({ camera }: { camera: CameraSettings }) {
  const cam = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const invalidate = useThree((s) => s.invalidate);
  useLayoutEffect(() => {
    cam.fov = camera.fovDeg;
    cam.near = 0.01;
    cam.far = 500;
    cam.position.set(0, 0, 0);
    cam.rotation.set(THREE.MathUtils.degToRad(camera.pitchDeg), 0, 0);
    cam.updateProjectionMatrix();
    invalidate();
  }, [cam, camera.fovDeg, camera.pitchDeg, invalidate]);
  return null;
}

/** Permite renderizar a cena na resolução da foto original para salvar. */
function CaptureBridge({ captureRef }: { captureRef: MutableRefObject<CaptureFn | null> }) {
  const { gl, scene, camera } = useThree();
  useLayoutEffect(() => {
    captureRef.current = (w, h) => {
      const cam = camera as THREE.PerspectiveCamera;
      const prevSize = gl.getSize(new THREE.Vector2());
      const prevRatio = gl.getPixelRatio();
      const prevAspect = cam.aspect;
      gl.setPixelRatio(1);
      gl.setSize(w, h, false);
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
      gl.render(scene, cam);
      const out = document.createElement('canvas');
      out.width = w;
      out.height = h;
      out.getContext('2d')!.drawImage(gl.domElement, 0, 0, w, h);
      gl.setPixelRatio(prevRatio);
      gl.setSize(prevSize.x, prevSize.y, false);
      cam.aspect = prevAspect;
      cam.updateProjectionMatrix();
      gl.render(scene, cam);
      return out;
    };
    return () => {
      captureRef.current = null;
    };
  }, [gl, scene, camera, captureRef]);
  return null;
}

export default function Stage3D({
  product,
  modelUrl,
  camera,
  light,
  heightPx,
  onFit,
  captureRef,
  ...p
}: StageCommonProps & {
  product: Product;
  modelUrl: string;
  camera: CameraSettings;
  light: LightSettings;
  heightPx: number;
  onFit?: (info: ModelFitInfo) => void;
  captureRef?: MutableRefObject<CaptureFn | null>;
}) {
  const { placement, imageWidth: W, imageHeight: H } = p;
  const hM = product.heightCm / 100;
  const world = useMemo(
    () => placeInWorld(placement.anchor, W, H, heightPx, hM, camera),
    [placement.anchor, W, H, heightPx, hM, camera],
  );
  const drag = usePlacementDrag({
    scale: p.scale,
    imageWidth: W,
    imageHeight: H,
    anchor: placement.anchor,
    productRect: p.productRect,
    onMove: p.onMove,
    disabled: p.compare !== null || p.interactive === false,
  });
  const az = THREE.MathUtils.degToRad(light.azimuthDeg);
  const lightPos: [number, number, number] = [
    world.position[0] + Math.sin(az) * 3,
    world.position[1] + 3,
    world.position[2] + Math.cos(az) * 3,
  ];
  const clip = p.compare !== null ? `inset(0 0 0 ${p.compare * 100}%)` : undefined;
  const footprint = Math.max(product.widthCm, product.depthCm) / 100;

  return (
    <div
      className="absolute inset-0 touch-none select-none outline-none focus-visible:ring-4 focus-visible:ring-awake-pink/50"
      tabIndex={0}
      aria-label="Área de simulação 3D. Arraste o produto ou use as setas do teclado."
      {...drag}
    >
      <img src={p.roomUrl} alt="Ambiente" className="absolute inset-0 h-full w-full" draggable={false} />
      <div className="absolute inset-0" style={{ clipPath: clip }}>
        <ErrorBoundary
          resetKey={modelUrl}
          fallback={(e) => (
            <div className="absolute inset-x-4 top-4 rounded-lg bg-white/95 p-3 text-sm text-red-700 shadow">
              Não foi possível carregar o modelo 3D: {e.message}
            </div>
          )}
        >
          <Canvas
            frameloop="demand"
            dpr={[1, 2]}
            gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
            onCreated={({ gl }) => {
              gl.setClearColor(0x000000, 0);
              gl.toneMapping = THREE.ACESFilmicToneMapping;
            }}
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
          >
            <CameraRig camera={camera} />
            <StudioEnvironment intensity={0.5 * light.intensity} />
            <ambientLight intensity={0.15 * light.intensity} />
            <directionalLight position={lightPos} intensity={1.5 * light.intensity} />
            <group position={world.position} rotation={[0, THREE.MathUtils.degToRad(placement.rotationDeg), 0]}>
              <Suspense fallback={null}>
                <ProductModel url={modelUrl} heightCm={product.heightCm} onFit={onFit} />
              </Suspense>
              <ContactShadows position={[0, 0.0005, 0]} scale={footprint * 2.4} far={Math.max(hM * 0.6, 0.15)} blur={2.4} opacity={0.55} resolution={512} />
            </group>
            {captureRef && <CaptureBridge captureRef={captureRef} />}
          </Canvas>
          <LoadingOverlay />
        </ErrorBoundary>
      </div>
      {p.compare !== null && <CompareOverlay split={p.compare} onChange={p.onCompareChange} />}
    </div>
  );
}
