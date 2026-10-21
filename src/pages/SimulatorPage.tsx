import { useEffect, useRef, useState } from 'react';
import type { Calibration, Room } from '../types';
import { useSimulator, type SimulatorStep } from '../store/simulator';
import { getRoom, loadCalibration, saveCalibration } from '../services/rooms';
import { DEMO_ROOM_CAMERA } from '../demo/seed';
import { PageHeader, Spinner } from '../components/ui';
import RoomStep from '../components/simulator/RoomStep';
import CalibrationStep from '../components/simulator/CalibrationStep';
import SimulateStep from '../components/simulator/SimulateStep';

const STEPS: { id: SimulatorStep; label: string }[] = [
  { id: 'room', label: 'Ambiente' },
  { id: 'calibrate', label: 'Calibração' },
  { id: 'simulate', label: 'Simulação' },
];

export default function SimulatorPage() {
  const s = useSimulator();
  const [room, setRoom] = useState<Room | null | undefined>(undefined);
  const saveTimer = useRef<number | undefined>(undefined);

  // Restaura o ambiente da sessão (a foto original vem do armazenamento local).
  useEffect(() => {
    if (!s.roomId) {
      setRoom(null);
      if (s.step !== 'room') s.setStep('room');
      return;
    }
    if (room?.id === s.roomId) return;
    getRoom(s.roomId).then((r) => {
      if (!r) s.reset();
      setRoom(r ?? null);
    });
  }, [s.roomId]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectRoom = async (r: Room) => {
    const calibration = await loadCalibration(r.id);
    setRoom(r);
    s.setRoom(r.id, calibration, DEMO_ROOM_CAMERA[r.id]);
    window.scrollTo({ top: 0 });
  };

  const changeCalibration = (c: Calibration) => {
    s.setCalibration(c);
    if (!room) return;
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => saveCalibration(room.id, c), 300);
  };

  const step = room ? s.step : 'room';
  const go = (st: SimulatorStep) => {
    s.setStep(st);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader eyebrow="Simulador" title="Visualize a peça no seu ambiente">
        Envie uma foto, calibre com uma medida conhecida e posicione o produto em 2D ou 3D.
      </PageHeader>

      <ol className="mb-6 flex flex-wrap gap-2" aria-label="Etapas">
        {STEPS.map((st, i) => {
          const idx = STEPS.findIndex((x) => x.id === step);
          const enabled = i === 0 || (room && i <= 2);
          return (
            <li key={st.id}>
              <button
                disabled={!enabled}
                onClick={() => go(st.id)}
                aria-current={step === st.id ? 'step' : undefined}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold transition disabled:opacity-40 ${
                  step === st.id ? 'bg-awake-blue text-white' : i < idx ? 'bg-awake-blue-soft' : 'bg-white ring-1 ring-awake-blue/15'
                }`}
              >
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${step === st.id ? 'bg-awake-pink' : 'bg-awake-blue/10'}`}>{i + 1}</span>
                {st.label}
              </button>
            </li>
          );
        })}
      </ol>

      {room === undefined && s.roomId ? (
        <Spinner />
      ) : step === 'room' || !room ? (
        <RoomStep onSelect={selectRoom} />
      ) : step === 'calibrate' ? (
        <CalibrationStep
          room={room}
          calibration={s.calibration}
          onChange={changeCalibration}
          onBack={() => go('room')}
          onDone={() => go('simulate')}
        />
      ) : (
        <SimulateStep room={room} onRecalibrate={() => go('calibrate')} onChangeRoom={() => go('room')} />
      )}
    </div>
  );
}
