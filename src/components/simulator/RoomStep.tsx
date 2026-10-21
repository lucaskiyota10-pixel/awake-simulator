import { useEffect, useRef, useState } from 'react';
import type { Room } from '../../types';
import { DEMO_ROOMS } from '../../demo/seed';
import { createRoomFromFile, deleteRoom, listUserRooms } from '../../services/rooms';
import { useAssetUrl } from '../../lib/hooks';
import { Notice, Spinner } from '../ui';
import CameraCapture from './CameraCapture';

function RoomThumb({ room, onSelect, onDelete }: { room: Room; onSelect: () => void; onDelete?: () => void }) {
  const url = useAssetUrl(room.image);
  return (
    <div className="group relative overflow-hidden rounded-xl bg-white ring-1 ring-awake-cream-dark">
      <button onClick={onSelect} className="block w-full text-left">
        <div className="aspect-[3/2] bg-awake-cream-dark">
          {url && <img src={url} alt={room.name} className="h-full w-full object-cover" loading="lazy" />}
        </div>
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm font-semibold">{room.name}</span>
          <span className="text-[11px] text-awake-blue/60">{room.width}×{room.height}px</span>
        </div>
      </button>
      {onDelete && (
        <button
          onClick={onDelete}
          className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-red-700 shadow"
          aria-label={`Excluir ${room.name}`}
        >
          Excluir
        </button>
      )}
    </div>
  );
}

export default function RoomStep({ onSelect }: { onSelect: (room: Room) => void }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [camera, setCamera] = useState(false);

  useEffect(() => {
    listUserRooms().then(setRooms);
  }, []);

  const handle = async (file: Blob | undefined, source: 'upload' | 'camera') => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const name = file instanceof File && source === 'upload' ? file.name.replace(/\.[^.]+$/, '') : undefined;
      const room = await createRoomFromFile(file, source, name);
      onSelect(room);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-3">
        <button
          onClick={() => fileInput.current?.click()}
          className="flex flex-col items-start gap-2 rounded-2xl bg-awake-blue p-5 text-left text-white transition hover:bg-awake-blue-dark"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 16V4m0 0l-4 4m4-4l4 4M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" /></svg>
          <span className="font-semibold">Enviar fotografia</span>
          <span className="text-xs text-white/75">JPG, PNG ou WEBP do seu ambiente</span>
        </button>
        <button
          onClick={() => setCamera(true)}
          className="flex flex-col items-start gap-2 rounded-2xl bg-awake-pink p-5 text-left text-white transition hover:brightness-95"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
          <span className="font-semibold">Usar a câmera</span>
          <span className="text-xs text-white/80">Fotografe o ambiente agora</span>
        </button>
        <a
          href="#demos"
          className="flex flex-col items-start gap-2 rounded-2xl bg-white p-5 text-left ring-1 ring-awake-blue/15 transition hover:ring-awake-blue/40"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 11l9-7 9 7v9H3z" /><path d="M10 20v-5h4v5" /></svg>
          <span className="font-semibold">Imagem de demonstração</span>
          <span className="text-xs text-awake-blue/65">Ambientes com medidas conhecidas</span>
        </a>
      </div>

      <input ref={fileInput} type="file" accept="image/*" hidden onChange={(e) => { handle(e.target.files?.[0], 'upload'); e.target.value = ''; }} />
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { handle(e.target.files?.[0], 'camera'); e.target.value = ''; }} />

      {busy && <Spinner label="Guardando a foto original…" />}
      {error && <Notice tone="error" title="Não foi possível usar esta imagem">{error}</Notice>}

      <Notice>
        <strong>Dicas para uma boa simulação:</strong> fotografe com o celular na horizontal e na altura do peito, com a câmera reta (sem inclinar para cima ou para baixo) e inclua no enquadramento um objeto de medida conhecida — uma porta, uma mesa ou um móvel cujas dimensões você saiba. A foto original é guardada sem alterações neste navegador.
      </Notice>

      <section id="demos">
        <h2 className="label-caps mb-3 text-awake-pink">Ambientes de demonstração</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DEMO_ROOMS.map((r) => (
            <RoomThumb key={r.id} room={r} onSelect={() => onSelect(r)} />
          ))}
        </div>
      </section>

      {rooms.length > 0 && (
        <section>
          <h2 className="label-caps mb-3 text-awake-pink">Meus ambientes</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((r) => (
              <RoomThumb
                key={r.id}
                room={r}
                onSelect={() => onSelect(r)}
                onDelete={async () => {
                  if (!confirm(`Excluir "${r.name}" deste navegador?`)) return;
                  await deleteRoom(r);
                  setRooms((rs) => rs.filter((x) => x.id !== r.id));
                }}
              />
            ))}
          </div>
        </section>
      )}

      {camera && (
        <CameraCapture
          onClose={() => setCamera(false)}
          onFallback={() => {
            setCamera(false);
            cameraInput.current?.click();
          }}
          onCapture={(b) => {
            setCamera(false);
            handle(b, 'camera');
          }}
        />
      )}
    </div>
  );
}
