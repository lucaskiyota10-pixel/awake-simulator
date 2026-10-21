import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Calibration, CameraSettings, Placement, Point, ViewMode } from '../types';
import { DEFAULT_CAMERA } from '../lib/projection';

/**
 * Estado da sessão do simulador, compartilhado entre os modos 2D e 3D:
 * o mesmo ambiente, o mesmo produto e a mesma posição são usados nos dois.
 */
export type SimulatorStep = 'room' | 'calibrate' | 'simulate';

interface SimulatorState {
  roomId: string | null;
  productId: string | null;
  step: SimulatorStep;
  mode: ViewMode;
  placement: Placement | null;
  calibration: Calibration;
  camera: CameraSettings;
  setRoom: (roomId: string, calibration: Calibration, camera?: CameraSettings) => void;
  setStep: (step: SimulatorStep) => void;
  setProduct: (productId: string) => void;
  setMode: (mode: ViewMode) => void;
  setCalibration: (c: Calibration) => void;
  setCamera: (c: Partial<CameraSettings>) => void;
  initPlacement: (anchor: Point) => void;
  updatePlacement: (p: Partial<Placement>) => void;
  restore: (s: Pick<SimulatorState, 'roomId' | 'productId' | 'mode' | 'placement' | 'calibration' | 'camera'>) => void;
  reset: () => void;
}

export const useSimulator = create<SimulatorState>()(
  persist(
    (set) => ({
      roomId: null,
      productId: null,
      step: 'room',
      mode: '2d',
      placement: null,
      calibration: { references: [] },
      camera: DEFAULT_CAMERA,
      setRoom: (roomId, calibration, camera) =>
        set({ roomId, calibration, placement: null, camera: camera ?? DEFAULT_CAMERA, step: 'calibrate' }),
      setStep: (step) => set({ step }),
      setProduct: (productId) => set({ productId }),
      setMode: (mode) => set({ mode }),
      setCalibration: (calibration) => set({ calibration }),
      setCamera: (c) => set((s) => ({ camera: { ...s.camera, ...c } })),
      initPlacement: (anchor) => set({ placement: { anchor, manualScale: 1, rotationDeg: 0, flipX: false } }),
      updatePlacement: (p) => set((s) => (s.placement ? { placement: { ...s.placement, ...p } } : {})),
      restore: (s) => set({ ...s, step: 'simulate' }),
      reset: () => set({ roomId: null, step: 'room', placement: null, calibration: { references: [] } }),
    }),
    { name: 'awake-simulador-sessao' },
  ),
);
