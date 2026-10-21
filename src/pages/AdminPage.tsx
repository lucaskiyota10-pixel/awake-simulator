import { useState } from 'react';
import type { AssetRef, Product, ProductCategory } from '../types';
import { PRODUCT_CATEGORIES } from '../types';
import { productRepository } from '../services/catalog';
import { useAssetUrl, useProducts } from '../lib/hooks';
import { saveAsset, deleteAsset } from '../lib/assets';
import { prepareProductImage, downloadBlob } from '../lib/image';
import { uid } from '../lib/db';
import { formatDims, formatPrice } from '../lib/format';
import { Badge, Button, Field, Notice, PageHeader, Spinner, inputClass } from '../components/ui';
import ModelViewer from '../components/three/ModelViewer';
import type { ModelFitInfo } from '../components/three/ProductModel';

type Draft = Omit<Product, 'image' | 'createdAt' | 'updatedAt'> & {
  image?: AssetRef;
  createdAt?: number;
};

const emptyDraft = (): Draft => ({
  id: uid('prod_'),
  sku: '',
  name: '',
  category: 'Esculturas',
  material: '',
  description: '',
  heightCm: 0,
  widthCm: 0,
  depthCm: 0,
  priceCents: 0,
  currency: 'BRL',
});

export default function AdminPage() {
  const { products, error, reload } = useProducts();
  const [editing, setEditing] = useState<Draft | null>(null);
  const readOnly = productRepository.readOnly;

  if (editing)
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <ProductForm
          initial={editing}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      </div>
    );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <PageHeader eyebrow="Painel administrativo" title="Produtos">
        Cadastre e edite os produtos usados no catálogo e no simulador. As dimensões cadastradas definem a escala nos modos 2D e 3D.
      </PageHeader>

      <Notice tone="warn" title="Protótipo sem autenticação">
        Os dados ficam salvos apenas neste navegador (IndexedDB). Na integração com o e-commerce, o cadastro passará a vir da plataforma da loja.
      </Notice>

      <div className="my-6 flex flex-wrap gap-2">
        <Button variant="accent" onClick={() => setEditing(emptyDraft())} disabled={readOnly}>+ Novo produto</Button>
        <Button
          variant="outline"
          disabled={!products}
          onClick={() => downloadBlob(new Blob([JSON.stringify(products, null, 2)], { type: 'application/json' }), 'awake-catalogo.json')}
        >
          Exportar catálogo (JSON)
        </Button>
        {productRepository.resetDemo && (
          <Button
            variant="ghost"
            onClick={async () => {
              if (!confirm('Restaurar os produtos de demonstração? Edições feitas neles serão perdidas.')) return;
              await productRepository.resetDemo!();
              reload();
            }}
          >
            Restaurar demonstração
          </Button>
        )}
      </div>

      {error && <Notice tone="error">{error}</Notice>}
      {!products && <Spinner />}
      <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-awake-cream-dark">
        <ul className="divide-y divide-awake-cream-dark">
          {products?.map((p) => (
            <AdminRow
              key={p.id}
              product={p}
              readOnly={readOnly}
              onEdit={() => setEditing(p)}
              onDelete={async () => {
                if (!confirm(`Excluir "${p.name}"?`)) return;
                await productRepository.remove(p.id);
                reload();
              }}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

function AdminRow({ product, onEdit, onDelete, readOnly }: { product: Product; onEdit: () => void; onDelete: () => void; readOnly: boolean }) {
  const img = useAssetUrl(product.image);
  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <div className="checker h-16 w-16 shrink-0 overflow-hidden rounded-lg">{img && <img src={img} alt="" className="h-full w-full object-contain p-1" />}</div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{product.name} <span className="text-xs font-normal text-awake-blue/55">· {product.sku}</span></p>
        <p className="text-xs text-awake-blue/70">{product.category} · {product.material}</p>
        <p className="text-xs text-awake-blue/70">{formatDims(product)} · {formatPrice(product.priceCents)}</p>
        <div className="mt-1 flex gap-1.5">
          {product.model ? <Badge tone="blue">Modelo 3D</Badge> : <Badge tone="neutral">Sem modelo 3D</Badge>}
          {product.isDemo && <Badge tone="pink">Demonstração</Badge>}
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onEdit} disabled={readOnly}>Editar</Button>
        <Button size="sm" variant="danger" onClick={onDelete} disabled={readOnly}>Excluir</Button>
      </div>
    </li>
  );
}

interface PendingFile {
  blob: Blob;
  preview: string;
}

function ProductForm({ initial, onCancel, onSaved }: { initial: Draft; onCancel: () => void; onSaved: () => void }) {
  const [d, setD] = useState<Draft>(initial);
  const [price, setPrice] = useState(initial.priceCents ? (initial.priceCents / 100).toFixed(2).replace('.', ',') : '');
  const [newImage, setNewImage] = useState<(PendingFile & { info: string; warn: boolean }) | null>(null);
  const [newModel, setNewModel] = useState<PendingFile | null>(null);
  const [removeModel, setRemoveModel] = useState(false);
  const [fit, setFit] = useState<ModelFitInfo | null>(null);
  const [aspect, setAspect] = useState<number | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const currentImage = useAssetUrl(d.image);
  const currentModel = useAssetUrl(removeModel ? undefined : d.model);
  const imgUrl = newImage?.preview ?? currentImage;
  const modelUrl = newModel?.preview ?? currentModel;

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));

  const pickImage = async (file?: File) => {
    if (!file) return;
    try {
      const prepared = await prepareProductImage(file);
      setNewImage({
        blob: prepared.blob,
        preview: URL.createObjectURL(prepared.blob),
        warn: !prepared.hasTransparency,
        info: prepared.hasTransparency
          ? `Fundo transparente detectado${prepared.trimmed ? '; bordas vazias recortadas para que a altura da imagem corresponda à altura do produto' : ''}.`
          : 'A imagem não tem fundo transparente: o fundo aparecerá sobre a foto do ambiente. Use um PNG/WEBP com transparência.',
      });
    } catch (e) {
      setErrors([(e as Error).message]);
    }
  };

  const pickModel = (file?: File) => {
    if (!file) return;
    const name = file.name.toLowerCase();
    if (!name.endsWith('.glb') && !name.endsWith('.gltf')) {
      setErrors(['Envie um arquivo .glb ou .gltf (com texturas embutidas).']);
      return;
    }
    setFit(null);
    setRemoveModel(false);
    setNewModel({ blob: file, preview: URL.createObjectURL(file) });
  };

  const validate = (): string[] => {
    const e: string[] = [];
    if (!d.name.trim()) e.push('Informe o nome.');
    if (!d.sku.trim()) e.push('Informe o SKU (usado na integração com o e-commerce).');
    if (!d.material.trim()) e.push('Informe o material.');
    for (const [k, label] of [['heightCm', 'altura'], ['widthCm', 'largura'], ['depthCm', 'profundidade']] as const) {
      if (!(d[k] > 0) || d[k] > 500) e.push(`Informe a ${label} em centímetros (entre 0 e 500).`);
    }
    if (!(d.priceCents > 0)) e.push('Informe o preço ilustrativo.');
    if (!d.image && !newImage) e.push('Envie a fotografia do produto (PNG com fundo transparente).');
    return e;
  };

  const save = async () => {
    const e = validate();
    setErrors(e);
    if (e.length) return;
    setSaving(true);
    try {
      let image = d.image;
      if (newImage) {
        await deleteAsset(d.image);
        image = await saveAsset(newImage.blob);
      }
      let model = d.model;
      if (removeModel) {
        await deleteAsset(d.model);
        model = undefined;
      }
      if (newModel) {
        await deleteAsset(d.model);
        model = await saveAsset(newModel.blob);
      }
      await productRepository.save({
        ...d,
        image: image!,
        model,
        createdAt: d.createdAt ?? Date.now(),
        updatedAt: Date.now(),
      });
      onSaved();
    } catch (err) {
      setErrors([(err as Error).message]);
    } finally {
      setSaving(false);
    }
  };

  // Largura que a foto 2D terá quando a altura estiver na escala real.
  const photoWidthCm = aspect ? aspect * d.heightCm : null;
  const photoWidthOk =
    photoWidthCm === null || !d.widthCm || !d.depthCm
      ? true
      : photoWidthCm >= Math.min(d.widthCm, d.depthCm) * 0.85 && photoWidthCm <= Math.hypot(d.widthCm, d.depthCm) * 1.1;

  const num = (v: string) => parseFloat(v.replace(',', '.')) || 0;

  return (
    <div>
      <button onClick={onCancel} className="text-sm text-awake-blue/70 hover:underline">← Produtos</button>
      <h1 className="mt-2 text-2xl font-bold">{initial.name ? `Editar: ${initial.name}` : 'Novo produto'}</h1>

      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_320px]">
        <div className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-awake-cream-dark">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome"><input className={inputClass} value={d.name} onChange={(e) => set('name', e.target.value)} /></Field>
            <Field label="SKU" hint="Código do produto no e-commerce"><input className={inputClass} value={d.sku} onChange={(e) => set('sku', e.target.value)} /></Field>
            <Field label="Categoria">
              <select className={inputClass} value={d.category} onChange={(e) => set('category', e.target.value as ProductCategory)}>
                {PRODUCT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Material"><input className={inputClass} value={d.material} onChange={(e) => set('material', e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Altura (cm)"><input className={inputClass} inputMode="decimal" value={d.heightCm || ''} onChange={(e) => set('heightCm', num(e.target.value))} /></Field>
            <Field label="Largura (cm)"><input className={inputClass} inputMode="decimal" value={d.widthCm || ''} onChange={(e) => set('widthCm', num(e.target.value))} /></Field>
            <Field label="Profund. (cm)"><input className={inputClass} inputMode="decimal" value={d.depthCm || ''} onChange={(e) => set('depthCm', num(e.target.value))} /></Field>
          </div>
          <p className="-mt-2 text-xs text-awake-blue/60">A altura define a escala do produto nas simulações. Largura e profundidade são usadas para conferir a foto e o modelo 3D.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Preço ilustrativo (R$)">
              <input
                className={inputClass}
                inputMode="decimal"
                value={price}
                placeholder="0,00"
                onChange={(e) => {
                  setPrice(e.target.value);
                  set('priceCents', Math.round(num(e.target.value) * 100));
                }}
              />
            </Field>
            <Field label="URL na loja online (opcional)" hint="Usada pelo botão “Ver produto no catálogo”">
              <input className={inputClass} type="url" value={d.externalUrl ?? ''} onChange={(e) => set('externalUrl', e.target.value || undefined)} placeholder="https://" />
            </Field>
          </div>
          <Field label="Descrição (opcional)">
            <textarea className={inputClass} rows={3} value={d.description ?? ''} onChange={(e) => set('description', e.target.value)} />
          </Field>

          {errors.length > 0 && (
            <Notice tone="error" title="Revise o cadastro">
              <ul className="list-disc pl-4">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
            </Notice>
          )}
          <div className="flex gap-2">
            <Button variant="accent" onClick={save} disabled={saving}>{saving ? 'Salvando…' : 'Salvar produto'}</Button>
            <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl bg-white p-4 ring-1 ring-awake-cream-dark">
            <p className="text-sm font-semibold">Fotografia (fundo transparente)</p>
            <div className="checker mt-2 flex aspect-square items-center justify-center overflow-hidden rounded-xl">
              {imgUrl ? (
                <img src={imgUrl} alt="" className="h-full w-full object-contain p-3" onLoad={(e) => setAspect(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight)} />
              ) : (
                <span className="text-xs text-awake-blue/50">Nenhuma imagem</span>
              )}
            </div>
            <label className="mt-3 inline-flex cursor-pointer items-center rounded-full border border-awake-blue/30 px-3.5 py-1.5 text-xs font-semibold hover:border-awake-blue">
              Enviar PNG/WEBP
              <input type="file" accept="image/png,image/webp,image/*" hidden onChange={(e) => pickImage(e.target.files?.[0])} />
            </label>
            {newImage && <p className={`mt-2 text-xs ${newImage.warn ? 'text-amber-700' : 'text-emerald-700'}`}>{newImage.info}</p>}
            {!photoWidthOk && photoWidthCm && (
              <p className="mt-2 text-xs text-amber-700">
                Com {d.heightCm} cm de altura, a foto terá ~{photoWidthCm.toFixed(0)} cm de largura, o que não condiz com as dimensões cadastradas. Confira se a foto está recortada rente ao objeto e se as medidas estão corretas.
              </p>
            )}
          </div>

          <div className="rounded-2xl bg-white p-4 ring-1 ring-awake-cream-dark">
            <p className="text-sm font-semibold">Modelo 3D (GLB/GLTF)</p>
            {modelUrl && d.heightCm > 0 ? (
              <ModelViewer url={modelUrl} heightCm={d.heightCm} onFit={setFit} className="mt-2 aspect-square" />
            ) : (
              <p className="mt-2 rounded-xl bg-awake-cream p-4 text-xs text-awake-blue/65">
                {modelUrl ? 'Informe a altura para visualizar o modelo.' : 'Sem modelo 3D: o produto ficará disponível apenas na simulação 2D.'}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center rounded-full border border-awake-blue/30 px-3.5 py-1.5 text-xs font-semibold hover:border-awake-blue">
                Enviar .glb / .gltf
                <input type="file" accept=".glb,.gltf,model/gltf-binary,model/gltf+json" hidden onChange={(e) => pickModel(e.target.files?.[0])} />
              </label>
              {(d.model || newModel) && !removeModel && (
                <Button size="sm" variant="danger" onClick={() => { setNewModel(null); setRemoveModel(true); setFit(null); }}>Remover modelo</Button>
              )}
            </div>
            {fit && d.widthCm > 0 && d.depthCm > 0 && (
              <p className={`mt-2 text-xs ${Math.abs(fit.widthCm - d.widthCm) / d.widthCm > 0.1 || Math.abs(fit.depthCm - d.depthCm) / d.depthCm > 0.1 ? 'text-amber-700' : 'text-emerald-700'}`}>
                Escalado para {d.heightCm} cm de altura, o modelo mede L {fit.widthCm.toFixed(1)} × P {fit.depthCm.toFixed(1)} cm (cadastro: L {d.widthCm} × P {d.depthCm} cm).
              </p>
            )}
            <p className="mt-2 text-[11px] text-awake-blue/55">O modelo é escalado uniformemente pela altura cadastrada. Use o eixo Y como vertical (padrão glTF). Arquivos .gltf devem ter texturas embutidas.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
