import { useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import type { Calibration, CalibrationReference, Point, Room } from '../../types';
import { buildScaleModel, distance, referencePxPerCm, validateReference } from '../../lib/calibration';
import { uid } from '../../lib/db';
import { useAssetUrl } from '../../lib/hooks';
import { Button, Field, Notice, inputClass } from '../ui';
import PhotoFrame from './PhotoFrame';

const PRESETS: { label: string; cm: number }[] = [
  { label: 'Porta — altura', cm: 210 },
  { label: 'Porta — largura', cm: 80 },
  { label: 'Mesa de jantar — altura', cm: 75 },
  { label: 'Bancada de cozinha — altura', cm: 90 },
  { label: 'Folha A4 — altura', cm: 29.7 },
];

const COLORS = ['#EC0A80', '#152F8C'];

type DragTarget = { refId: string; end: 'a' | 'b' } | null;

export default function CalibrationStep({
  room,
  calibration,
  onChange,
  onDone,
  onBack,
}: {
  room: Room;
  calibration: Calibration;
  onChange: (c: Calibration) => void;
  onDone: () => void;
  onBack: () => void;
}) {
  const url = useAssetUrl(room.image);
  const [activeId, setActiveId] = useState<string | null>(calibration.references[0]?.id ?? null);
  const [drag, setDrag] = useState<DragTarget>(null);
  const [loupe, setLoupe] = useState<Point | null>(null);
  const scaleRef = useRef(1);
  const W = room.width;
  const H = room.height;
  const refs = calibration.references;
  const model = useMemo(() => buildScaleModel(calibration, W, H), [calibration, W, H]);

  const update = (id: string, patch: Partial<CalibrationReference>) =>
    onChange({ references: refs.map((r) => (r.id === id ? { ...r, ...patch } : r)) });

  const addReference = () => {
    const i = refs.length;
    const x = W * (i === 0 ? 0.35 : 0.65);
    const ref: CalibrationReference = {
      id: uid('ref_'),
      // Sem medida pré-preenchida: a referência só vale após o usuário informar o valor real.
      label: '',
      a: { x, y: H * 0.3 },
      b: { x, y: H * 0.75 },
      lengthCm: 0,
    };
    onChange({ references: [...refs, ref] });
    setActiveId(ref.id);
  };

  const toImage = (e: RPointerEvent<HTMLElement>): Point => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const s = scaleRef.current;
    return {
      x: Math.min(Math.max((e.clientX - r.left) / s, 0), W),
      y: Math.min(Math.max((e.clientY - r.top) / s, 0), H),
    };
  };

  const onFramePointerMove = (e: RPointerEvent<HTMLDivElement>) => {
    if (!drag) return;
    const p = toImage(e);
    update(drag.refId, { [drag.end]: p });
    setLoupe(p);
  };
  const endDrag = () => {
    setDrag(null);
    setLoupe(null);
  };

  const suggested = room.suggestedReferences ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div>
        {url && (
          <PhotoFrame width={W} height={H}>
            {(scale, fw) => {
              scaleRef.current = scale;
              return (
                <div
                  className="absolute inset-0 touch-none select-none"
                  onPointerMove={onFramePointerMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                >
                  <img src={url} alt={room.name} className="absolute inset-0 h-full w-full" draggable={false} />
                  <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox={`0 0 ${W} ${H}`}>
                    {refs.map((r, i) => {
                      const color = COLORS[i % 2];
                      const invalid = validateReference(r, W, H);
                      const mid = { x: (r.a.x + r.b.x) / 2, y: (r.a.y + r.b.y) / 2 };
                      const sw = 3 / scale;
                      return (
                        <g key={r.id} opacity={activeId && activeId !== r.id ? 0.55 : 1}>
                          <line x1={r.a.x} y1={r.a.y} x2={r.b.x} y2={r.b.y} stroke="white" strokeWidth={sw * 2.2} strokeLinecap="round" />
                          <line x1={r.a.x} y1={r.a.y} x2={r.b.x} y2={r.b.y} stroke={color} strokeWidth={sw} strokeDasharray={invalid ? `${8 / scale} ${6 / scale}` : undefined} strokeLinecap="round" />
                          <g transform={`translate(${mid.x + 12 / scale} ${mid.y})`}>
                            <rect x={0} y={-12 / scale} width={86 / scale} height={24 / scale} rx={12 / scale} fill={color} />
                            <text x={43 / scale} y={0} fill="white" fontSize={12 / scale} fontWeight={700} textAnchor="middle" dominantBaseline="central" fontFamily="Montserrat">
                              {r.lengthCm ? `${String(r.lengthCm).replace('.', ',')} cm` : '? cm'}
                            </text>
                          </g>
                        </g>
                      );
                    })}
                  </svg>
                  {refs.map((r, i) =>
                    (['a', 'b'] as const).map((end) => (
                      <button
                        key={r.id + end}
                        aria-label={`Ponta ${end === 'a' ? '1' : '2'} da referência ${i + 1}`}
                        className="absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center active:cursor-grabbing"
                        style={{ left: r[end].x * scale, top: r[end].y * scale }}
                        onPointerDown={(e) => {
                          e.preventDefault();
                          (e.currentTarget.parentElement as HTMLElement).setPointerCapture(e.pointerId);
                          setActiveId(r.id);
                          setDrag({ refId: r.id, end });
                          setLoupe(r[end]);
                        }}
                      >
                        <span className="block h-5 w-5 rounded-full border-[3px] border-white shadow-md" style={{ background: COLORS[i % 2] }} />
                      </button>
                    )),
                  )}
                  {loupe && <Loupe url={url} point={loupe} scale={scale} frameW={fw} W={W} H={H} />}
                </div>
              );
            }}
          </PhotoFrame>
        )}
        <p className="mt-3 text-center text-xs text-awake-blue/60">
          Arraste as duas pontas de cada linha até as extremidades do objeto de medida conhecida. A lupa ajuda a marcar com precisão.
        </p>
      </div>

      <aside className="space-y-4">
        <div>
          <h2 className="text-lg font-bold">Calibração de escala</h2>
          <p className="mt-1 text-sm text-awake-blue/75">
            Informe uma medida real visível na foto. Ela converte centímetros em pixels para que o produto apareça com as dimensões cadastradas.
          </p>
        </div>

        {suggested.length > 0 && (
          <Notice title="Este ambiente tem medidas conhecidas">
            <p>{suggested.map((s) => `${s.label}: ${String(s.lengthCm).replace('.', ',')} cm`).join(' · ')}</p>
            <Button
              size="sm"
              variant="primary"
              className="mt-2"
              onClick={() => {
                const next = suggested.map((s) => ({ ...s, id: uid('ref_') }));
                onChange({ references: next });
                setActiveId(next[0].id);
              }}
            >
              Usar medidas deste ambiente
            </Button>
          </Notice>
        )}

        {refs.map((r, i) => {
          const problem = validateReference(r, W, H);
          return (
            <div
              key={r.id}
              className={`space-y-3 rounded-xl bg-white p-4 ring-1 ${activeId === r.id ? 'ring-awake-pink' : 'ring-awake-cream-dark'}`}
              onFocus={() => setActiveId(r.id)}
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <span className="h-3 w-3 rounded-full" style={{ background: COLORS[i % 2] }} />
                  Referência {i + 1}
                </span>
                <button
                  className="text-xs font-semibold text-red-700"
                  onClick={() => onChange({ references: refs.filter((x) => x.id !== r.id) })}
                >
                  Remover
                </button>
              </div>
              <Field label="O que foi medido">
                <input className={inputClass} value={r.label} placeholder="ex.: Porta — altura" onChange={(e) => update(r.id, { label: e.target.value })} list="calib-presets" />
              </Field>
              <datalist id="calib-presets">
                {PRESETS.map((p) => (
                  <option key={p.label} value={p.label} />
                ))}
              </datalist>
              <Field label="Medida real (cm)">
                <input
                  className={inputClass}
                  type="number"
                  inputMode="decimal"
                  min={1}
                  step="0.1"
                  value={r.lengthCm || ''}
                  placeholder="ex.: 210"
                  onChange={(e) => update(r.id, { lengthCm: parseFloat(e.target.value) || 0 })}
                />
              </Field>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    className="rounded-full bg-awake-cream px-2.5 py-1 text-[11px] font-semibold hover:bg-awake-cream-dark"
                    onClick={() => update(r.id, { label: p.label, lengthCm: p.cm })}
                  >
                    {p.label.split(' — ')[0]} {String(p.cm).replace('.', ',')}
                  </button>
                ))}
              </div>
              {problem ? (
                <p className="text-xs font-medium text-amber-700">{problem}</p>
              ) : (
                <p className="text-xs text-awake-blue/65">
                  {Math.round(distance(r.a, r.b))} px na foto → {referencePxPerCm(r).toFixed(2).replace('.', ',')} px/cm
                </p>
              )}
            </div>
          );
        })}

        {refs.length < 2 && (
          <Button variant="outline" className="w-full" onClick={addReference}>
            {refs.length === 0 ? '+ Marcar medida conhecida' : '+ Segunda referência (perspectiva)'}
          </Button>
        )}

        {refs.length === 1 && (
          <p className="text-xs text-awake-blue/65">
            Opcional: uma segunda referência apoiada em outra profundidade (mais perto ou mais longe da câmera) permite ajustar a escala conforme o produto é arrastado pelo piso.
          </p>
        )}

        <CalibrationSummary refs={refs.length} valid={model.validRefs.length} perspective={model.perspective} />

        <div className="flex flex-wrap gap-2 pt-2">
          <Button variant="ghost" onClick={onBack}>← Trocar foto</Button>
          <Button variant="accent" className="flex-1" onClick={onDone}>
            {model.validRefs.length > 0 ? 'Continuar para a simulação' : 'Continuar sem calibração'}
          </Button>
        </div>
      </aside>
    </div>
  );
}

function CalibrationSummary({ refs, valid, perspective }: { refs: number; valid: number; perspective: boolean }) {
  if (refs === 0)
    return (
      <Notice tone="warn" title="Sem calibração">
        Você pode continuar, mas o tamanho do produto será apenas uma estimativa visual e não representará o tamanho real.
      </Notice>
    );
  if (valid === 0)
    return (
      <Notice tone="warn" title="Calibração insuficiente">
        Corrija a referência marcada. Até lá, a simulação não representará o tamanho real.
      </Notice>
    );
  return (
    <Notice tone="ok" title={perspective ? 'Calibrada com perspectiva' : 'Calibrada'}>
      {perspective
        ? 'Duas referências em profundidades diferentes: a escala acompanha a posição do produto sobre o mesmo piso.'
        : 'Escala válida para produtos na mesma profundidade da referência.'}
    </Notice>
  );
}

function Loupe({ url, point, scale, frameW, W, H }: { url: string; point: Point; scale: number; frameW: number; W: number; H: number }) {
  const size = 120;
  const zoom = 3;
  const sx = point.x * scale;
  const sy = point.y * scale;
  // Fica acima do dedo; se não couber, vai para baixo.
  const top = sy - size - 40 < 0 ? sy + 40 : sy - size - 40;
  const left = Math.min(Math.max(sx - size / 2, 0), frameW - size);
  const bgW = W * scale * zoom;
  const bgH = H * scale * zoom;
  return (
    <div
      className="pointer-events-none absolute overflow-hidden rounded-full border-4 border-white shadow-xl"
      style={{
        width: size,
        height: size,
        left,
        top,
        backgroundImage: `url(${url})`,
        backgroundSize: `${bgW}px ${bgH}px`,
        backgroundPosition: `${-(sx * zoom - size / 2)}px ${-(sy * zoom - size / 2)}px`,
      }}
    >
      <span className="absolute left-1/2 top-0 h-full w-px bg-awake-pink" />
      <span className="absolute left-0 top-1/2 h-px w-full bg-awake-pink" />
    </div>
  );
}
