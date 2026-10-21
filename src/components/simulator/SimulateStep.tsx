import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Product, Room, ScaleStatus } from '../../types';
import { useSimulator } from '../../store/simulator';
import { useAssetUrl, useProducts } from '../../lib/hooks';
import { buildScaleModel, productHeightPx, pxPerCmForPlacement, scaleStatus } from '../../lib/calibration';
import { loadImage, downloadBlob } from '../../lib/image';
import { composeImage, drawProduct2D } from '../../lib/compose';
import { formatDims, formatPrice } from '../../lib/format';
import { saveComposition } from '../../services/compositions';
import { catalogLinkFor } from '../../services/commerce/config';
import { Badge, Button, Notice, Spinner } from '../ui';
import PhotoFrame from './PhotoFrame';
import Stage2D from './Stage2D';
import Stage3D, { type CaptureFn, type LightSettings } from './Stage3D';
import OrbitView, { ANGLE_PRESETS, type AnglePreset } from './OrbitView';
import type { ImageRect } from './usePlacementDrag';
import type { ModelFitInfo } from '../three/ProductModel';

export default function SimulateStep({ room, onRecalibrate, onChangeRoom }: { room: Room; onRecalibrate: () => void; onChangeRoom: () => void }) {
  const s = useSimulator();
  const { products } = useProducts();
  const navigate = useNavigate();
  const roomUrl = useAssetUrl(room.image);
  const W = room.width;
  const H = room.height;

  const product = useMemo<Product | undefined>(
    () => products?.find((p) => p.id === s.productId) ?? products?.[0],
    [products, s.productId],
  );
  const productUrl = useAssetUrl(product?.image);
  const modelUrl = useAssetUrl(product?.model);
  const [aspect, setAspect] = useState<number | null>(null);

  const [layout, setLayout] = useState<'single' | 'side'>('single');
  const [compare, setCompare] = useState<number | null>(null);
  const [orbit, setOrbit] = useState(false);
  const [preset, setPreset] = useState<AnglePreset>('diagonal');
  const [showHuman, setShowHuman] = useState(true);
  const [shadow2D, setShadow2D] = useState(true);
  const [light, setLight] = useState<LightSettings>({ azimuthDeg: -35, intensity: 1 });
  const [fit, setFit] = useState<ModelFitInfo | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const captureRef = useRef<CaptureFn | null>(null);

  useEffect(() => {
    if (product && product.id !== s.productId) s.setProduct(product.id);
  }, [product, s]);

  useEffect(() => {
    if (!s.placement) s.initPlacement({ x: W / 2, y: H * 0.78 });
  }, [s, W, H]);

  useEffect(() => {
    setAspect(null);
    setFit(null);
    if (productUrl) loadImage(productUrl).then((img) => setAspect(img.naturalWidth / img.naturalHeight));
  }, [productUrl]);

  const onFit = useCallback((info: ModelFitInfo) => setFit(info), []);

  if (!products || !product || !s.placement || !roomUrl) return <Spinner />;

  const placement = s.placement;
  const model = buildScaleModel(s.calibration, W, H);
  const pxPerCm = pxPerCmForPlacement(model, placement) * placement.manualScale;
  const heightPx = productHeightPx(product.heightCm, placement, model);
  const rect2D: ImageRect | null = aspect
    ? { width: heightPx * aspect, height: heightPx, left: placement.anchor.x - (heightPx * aspect) / 2, top: placement.anchor.y - heightPx }
    : null;
  const w3D = Math.max(product.widthCm, product.depthCm) * pxPerCm;
  const rect3D: ImageRect = { width: w3D, height: heightPx, left: placement.anchor.x - w3D / 2, top: placement.anchor.y - heightPx };
  const status = scaleStatus(s.calibration, placement, W, H);
  const has3D = Boolean(product.model && modelUrl);
  const mode = s.mode;
  const link = catalogLinkFor(product);

  const common = {
    roomUrl,
    imageWidth: W,
    imageHeight: H,
    placement,
    onMove: (anchor: { x: number; y: number }) => s.updatePlacement({ anchor }),
    compare,
    onCompareChange: setCompare,
  };

  const render2D = (scale: number) =>
    rect2D && productUrl ? (
      <Stage2D {...common} scale={scale} productRect={rect2D} productUrl={productUrl} shadow={shadow2D} />
    ) : (
      <div className="absolute inset-0 flex items-center justify-center"><Spinner /></div>
    );

  const render3D = (scale: number, withCapture: boolean) => {
    if (!has3D)
      return (
        <>
          <img src={roomUrl} alt="Ambiente" className="absolute inset-0 h-full w-full" />
          <div className="absolute inset-0 flex items-center justify-center bg-awake-blue/40 p-4">
            <div className="max-w-sm rounded-2xl bg-white p-5 text-sm shadow-xl">
              <p className="font-bold">Modelo 3D indisponível</p>
              <p className="mt-1 text-awake-blue/75">
                “{product.name}” não tem um arquivo GLB/GLTF cadastrado, então não pode ser simulado em 3D. A simulação 2D continua disponível. Modelos podem ser enviados no painel Admin.
              </p>
              <Button size="sm" className="mt-3" onClick={() => s.setMode('2d')}>Visualizar em 2D</Button>
            </div>
          </div>
        </>
      );
    if (orbit && layout === 'single')
      return <OrbitView product={product} modelUrl={modelUrl!} preset={preset} rotationDeg={placement.rotationDeg} showHuman={showHuman} />;
    return (
      <Stage3D
        {...common}
        scale={scale}
        productRect={rect3D}
        product={product}
        modelUrl={modelUrl!}
        camera={s.camera}
        light={light}
        heightPx={heightPx}
        onFit={onFit}
        captureRef={withCapture ? captureRef : undefined}
      />
    );
  };

  const save = async () => {
    setSaving(true);
    setSaved(null);
    setSaveError(null);
    try {
      const caption = `${product.name} · ${formatDims(product)} · Simulação ${mode.toUpperCase()}`;
      const warning = status.realSize ? undefined : `${status.title}: o tamanho exibido não representa o tamanho real.`;
      const blob = await composeImage({
        roomUrl,
        width: W,
        height: H,
        caption,
        warning,
        draw: async (ctx) => {
          if (mode === '2d') {
            if (!rect2D || !productUrl) throw new Error('Imagem do produto ainda carregando.');
            await drawProduct2D(ctx, productUrl, rect2D, placement.flipX, shadow2D);
          } else {
            if (!captureRef.current) throw new Error('A cena 3D não está pronta. Volte ao enquadramento da foto e tente novamente.');
            const f = Math.min(1, 4096 / Math.max(W, H));
            const shot = captureRef.current(Math.round(W * f), Math.round(H * f));
            ctx.drawImage(shot, 0, 0, W, H);
          }
        },
      });
      const name = `${product.name} — ${room.name}`;
      await saveComposition(
        { name, roomId: room.id, productId: product.id, placement, calibration: s.calibration, camera: s.camera, mode, scaleStatus: status.level },
        blob,
      );
      downloadBlob(blob, `awake-${product.id}-${mode}-${Date.now()}.png`);
      setSaved(name);
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const nudge = (dx: number, dy: number) => {
    const step = Math.max(W, H) / 200;
    s.updatePlacement({
      anchor: {
        x: Math.min(Math.max(placement.anchor.x + dx * step, 0), W),
        y: Math.min(Math.max(placement.anchor.y + dy * step, 0), H),
      },
    });
  };

  const saveDisabled = saving || (mode === '3d' && (!has3D || (orbit && layout === 'single')));

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full bg-white p-1 ring-1 ring-awake-blue/15" role="group" aria-label="Modo de visualização">
            <ModeButton active={mode === '2d'} onClick={() => s.setMode('2d')}>Visualizar em 2D</ModeButton>
            <ModeButton active={mode === '3d'} onClick={() => s.setMode('3d')}>
              Visualizar em 3D{!product.model && <span className="ml-1 opacity-60">(indisp.)</span>}
            </ModeButton>
          </div>
          <Button size="sm" variant={layout === 'side' ? 'primary' : 'outline'} onClick={() => { setLayout(layout === 'side' ? 'single' : 'side'); setOrbit(false); }}>
            {layout === 'side' ? 'Fechar comparação' : 'Comparar 2D × 3D'}
          </Button>
          <Button size="sm" variant={compare !== null ? 'accent' : 'outline'} onClick={() => setCompare(compare === null ? 0.5 : null)} disabled={orbit && layout === 'single' && mode === '3d'}>
            {compare !== null ? 'Sair do antes/depois' : 'Antes / depois'}
          </Button>
        </div>

        {layout === 'single' ? (
          <PhotoFrame width={W} height={H} maxVh={66}>
            {(scale) => (mode === '2d' ? render2D(scale) : render3D(scale, true))}
          </PhotoFrame>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {(['2d', '3d'] as const).map((m) => (
              <div key={m}>
                <p className={`label-caps mb-1.5 ${mode === m ? 'text-awake-pink' : 'text-awake-blue/60'}`}>
                  {m === '2d' ? 'Simulação 2D' : 'Simulação 3D'} {mode === m && '· ativa para salvar'}
                </p>
                <PhotoFrame width={W} height={H} maxVh={42}>
                  {(scale) => (m === '2d' ? render2D(scale) : render3D(scale, true))}
                </PhotoFrame>
              </div>
            ))}
          </div>
        )}

        <ScaleBadge status={status} />

        <div className="text-xs text-awake-blue/65">
          {compare !== null
            ? 'Arraste a divisória para comparar a foto original (antes) com a simulação (depois).'
            : orbit && mode === '3d' && layout === 'single'
              ? 'Explorando ângulos do modelo fora da foto. Volte ao enquadramento para posicionar e salvar.'
              : 'Arraste o produto ou toque na foto para posicioná-lo. O ponto de apoio é o centro da base. Teclado: setas (Shift = passo maior).'}
        </div>

        <ProductStrip
          products={products}
          activeId={product.id}
          onSelect={(id) => {
            s.setProduct(id);
            s.updatePlacement({ manualScale: 1 });
          }}
        />
      </div>

      <aside className="space-y-4">
        <section className="rounded-2xl bg-white p-4 ring-1 ring-awake-cream-dark">
          <p className="label-caps text-awake-pink">{product.category}</p>
          <h2 className="text-lg font-bold leading-tight">{product.name}</h2>
          <p className="mt-1 text-xs text-awake-blue/70">{product.material}</p>
          <p className="text-xs text-awake-blue/70">{formatDims(product)}</p>
          <p className="mt-2 font-bold">{formatPrice(product.priceCents)}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="primary"
              onClick={() => (link.external ? window.open(link.href, '_blank', 'noopener') : navigate(link.href))}
            >
              Ver produto no catálogo
            </Button>
          </div>
        </section>

        <Section title="Posição">
          <div className="flex items-center gap-4">
            <div className="grid grid-cols-3 gap-1">
              <span />
              <PadButton label="Mover para cima" onClick={() => nudge(0, -1)}>↑</PadButton>
              <span />
              <PadButton label="Mover para a esquerda" onClick={() => nudge(-1, 0)}>←</PadButton>
              <PadButton label="Centralizar" onClick={() => s.updatePlacement({ anchor: { x: W / 2, y: H * 0.78 } })}>•</PadButton>
              <PadButton label="Mover para a direita" onClick={() => nudge(1, 0)}>→</PadButton>
              <span />
              <PadButton label="Mover para baixo" onClick={() => nudge(0, 1)}>↓</PadButton>
              <span />
            </div>
            <p className="text-xs text-awake-blue/65">
              Base em x {Math.round(placement.anchor.x)}, y {Math.round(placement.anchor.y)} px da foto original.
            </p>
          </div>
        </Section>

        <Section title="Tamanho e escala">
          <p className="text-xs text-awake-blue/70">
            Altura na foto: <strong>{Math.round(heightPx)} px</strong> ({pxPerCm.toFixed(2).replace('.', ',')} px/cm × {product.heightCm} cm)
          </p>
          {model.perspective && (
            <label className="mt-3 block text-xs font-semibold">
              Apoio do produto
              <select
                className="mt-1 w-full rounded-lg border border-awake-blue/20 bg-white px-2 py-1.5 text-xs"
                value={placement.depthRefId ?? ''}
                onChange={(e) => s.updatePlacement({ depthRefId: e.target.value || null })}
              >
                <option value="">No piso (escala acompanha a profundidade)</option>
                {model.validRefs.map((r) => (
                  <option key={r.id} value={r.id}>Na profundidade de: {r.label}</option>
                ))}
              </select>
              <span className="mt-1 block font-normal text-[11px] text-awake-blue/60">Sobre um móvel? Escolha a referência medida nesse móvel ou na mesma distância da câmera.</span>
            </label>
          )}
          <label className="mt-3 block text-xs font-semibold">
            Ajuste manual: {Math.round(placement.manualScale * 100)}%
            <input
              type="range"
              min={0.3}
              max={3}
              step={0.01}
              value={placement.manualScale}
              onChange={(e) => s.updatePlacement({ manualScale: parseFloat(e.target.value) })}
              className="mt-1 w-full"
            />
          </label>
          <p className="text-[11px] text-awake-blue/60">Qualquer ajuste manual faz a simulação deixar de representar o tamanho real.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => s.updatePlacement({ manualScale: 1 })} disabled={placement.manualScale === 1}>
              Voltar à escala calibrada
            </Button>
            <Button size="sm" variant="ghost" onClick={onRecalibrate}>Recalibrar</Button>
          </div>
        </Section>

        {mode === '2d' && (
          <Section title="Opções 2D">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={placement.flipX ? 'primary' : 'outline'} onClick={() => s.updatePlacement({ flipX: !placement.flipX })}>Espelhar</Button>
              <Button size="sm" variant={shadow2D ? 'primary' : 'outline'} onClick={() => setShadow2D(!shadow2D)}>Sombra</Button>
            </div>
            <p className="mt-2 text-[11px] text-awake-blue/60">
              A foto do produto tem um único ângulo. Para girar a peça e ver outros ângulos, use o modo 3D.
            </p>
          </Section>
        )}

        {mode === '3d' && has3D && (
          <Section title="Opções 3D">
            <Slider label={`Rotação da escultura: ${Math.round(placement.rotationDeg)}°`} min={-180} max={180} step={1} value={placement.rotationDeg} onChange={(v) => s.updatePlacement({ rotationDeg: v })} />
            <Slider label={`Campo de visão da câmera: ${Math.round(s.camera.fovDeg)}°`} min={25} max={90} step={1} value={s.camera.fovDeg} onChange={(v) => s.setCamera({ fovDeg: v })} />
            <Slider label={`Inclinação da câmera: ${Math.round(s.camera.pitchDeg)}°`} min={-35} max={35} step={1} value={s.camera.pitchDeg} onChange={(v) => s.setCamera({ pitchDeg: v })} />
            <p className="text-[11px] text-awake-blue/60">
              Ajuste a perspectiva até o produto parecer apoiado na superfície como os objetos da foto. A altura projetada continua definida pela calibração.
            </p>
            <Slider label={`Direção da luz: ${Math.round(light.azimuthDeg)}°`} min={-180} max={180} step={1} value={light.azimuthDeg} onChange={(v) => setLight({ ...light, azimuthDeg: v })} />
            <Slider label={`Intensidade da luz: ${Math.round(light.intensity * 100)}%`} min={0.2} max={2.5} step={0.05} value={light.intensity} onChange={(v) => setLight({ ...light, intensity: v })} />
            {layout === 'single' && (
              <div className="mt-3 border-t border-awake-cream-dark pt-3">
                <Button size="sm" variant={orbit ? 'accent' : 'outline'} onClick={() => { setOrbit(!orbit); setCompare(null); }}>
                  {orbit ? 'Voltar ao enquadramento da foto' : 'Explorar outros ângulos'}
                </Button>
                {orbit && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {ANGLE_PRESETS.map((a) => (
                      <button key={a.id} onClick={() => setPreset(a.id)} className={`rounded-full px-3 py-1 text-xs font-semibold ${preset === a.id ? 'bg-awake-blue text-white' : 'bg-awake-cream'}`}>
                        {a.label}
                      </button>
                    ))}
                    <label className="flex items-center gap-1.5 text-xs">
                      <input type="checkbox" checked={showHuman} onChange={(e) => setShowHuman(e.target.checked)} /> Referência humana 1,70 m
                    </label>
                  </div>
                )}
              </div>
            )}
            {fit && <ModelFitNote product={product} fit={fit} />}
          </Section>
        )}

        <Section title="Salvar">
          <Button variant="accent" className="w-full" onClick={save} disabled={saveDisabled}>
            {saving ? 'Gerando imagem…' : `Salvar composição ${mode.toUpperCase()}`}
          </Button>
          <p className="mt-2 text-[11px] text-awake-blue/60">
            Gera um PNG na resolução original da foto ({W}×{H}px) com a legenda do produto e o status da escala. A foto original não é alterada.
          </p>
          {saved && (
            <div className="mt-2">
              <Notice tone="ok" title="Composição salva">
                “{saved}” foi baixada e guardada em <Link to="/composicoes" className="underline">Composições</Link>.
              </Notice>
            </div>
          )}
          {saveError && <div className="mt-2"><Notice tone="error">{saveError}</Notice></div>}
        </Section>

        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onChangeRoom}>← Trocar ambiente</Button>
        </div>
      </aside>
    </div>
  );
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${active ? 'bg-awake-blue text-white shadow' : 'text-awake-blue hover:bg-awake-blue/5'}`}
    >
      {children}
    </button>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-4 ring-1 ring-awake-cream-dark">
      <h3 className="label-caps mb-3 text-awake-blue/60">{title}</h3>
      {children}
    </section>
  );
}

function PadButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button aria-label={label} title={label} onClick={onClick} className="flex h-9 w-9 items-center justify-center rounded-lg bg-awake-cream font-bold hover:bg-awake-cream-dark">
      {children}
    </button>
  );
}

function Slider({ label, min, max, step, value, onChange }: { label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void }) {
  return (
    <label className="mb-2 block text-xs font-semibold">
      {label}
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="mt-1 w-full" />
    </label>
  );
}

function ScaleBadge({ status }: { status: ScaleStatus }) {
  return (
    <div className={`flex gap-3 rounded-xl border p-3 text-sm ${status.realSize ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-amber-300 bg-amber-50 text-amber-900'}`} role="status">
      <span className="mt-0.5 text-lg leading-none" aria-hidden>{status.realSize ? '✓' : '!'}</span>
      <div>
        <p className="font-semibold">{status.title}</p>
        <p className="mt-0.5 text-xs opacity-90">{status.detail}</p>
      </div>
    </div>
  );
}

function ModelFitNote({ product, fit }: { product: Product; fit: ModelFitInfo }) {
  const dw = Math.abs(fit.widthCm - product.widthCm) / product.widthCm;
  const dd = Math.abs(fit.depthCm - product.depthCm) / product.depthCm;
  const ok = dw <= 0.1 && dd <= 0.1;
  return (
    <p className={`mt-2 text-[11px] ${ok ? 'text-awake-blue/60' : 'text-amber-700'}`}>
      {ok
        ? `Modelo 3D conferido com as dimensões cadastradas (L ${fit.widthCm.toFixed(0)} × P ${fit.depthCm.toFixed(0)} cm na altura de ${product.heightCm} cm).`
        : `Atenção: escalado pela altura cadastrada, o modelo 3D fica com L ${fit.widthCm.toFixed(0)} × P ${fit.depthCm.toFixed(0)} cm, diferente do cadastro (L ${product.widthCm} × P ${product.depthCm} cm). A altura é respeitada; revise o modelo ou o cadastro.`}
    </p>
  );
}

function ProductStrip({ products, activeId, onSelect }: { products: Product[]; activeId: string; onSelect: (id: string) => void }) {
  return (
    <div>
      <p className="label-caps mb-2 text-awake-blue/60">Trocar produto</p>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 lg:mx-0 lg:px-0">
        {products.map((p) => (
          <ProductThumb key={p.id} product={p} active={p.id === activeId} onClick={() => onSelect(p.id)} />
        ))}
      </div>
    </div>
  );
}

function ProductThumb({ product, active, onClick }: { product: Product; active: boolean; onClick: () => void }) {
  const url = useAssetUrl(product.image);
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex w-24 shrink-0 flex-col items-center gap-1 rounded-xl bg-white p-2 text-center ring-2 transition ${active ? 'ring-awake-pink' : 'ring-transparent hover:ring-awake-blue/20'}`}
    >
      <div className="h-16 w-full">{url && <img src={url} alt="" className="h-full w-full object-contain" />}</div>
      <span className="line-clamp-2 text-[11px] font-semibold leading-tight">{product.name}</span>
      {!product.model && <Badge tone="neutral">2D</Badge>}
    </button>
  );
}
