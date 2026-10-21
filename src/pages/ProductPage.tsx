import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Product } from '../types';
import { productRepository } from '../services/catalog';
import { useAssetUrl } from '../lib/hooks';
import { formatCm, formatPrice } from '../lib/format';
import { Badge, Button, Notice, Spinner } from '../components/ui';
import ModelViewer from '../components/three/ModelViewer';
import { useSimulator } from '../store/simulator';
import { catalogLinkFor } from '../services/commerce/config';

export default function ProductPage() {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null | undefined>(undefined);
  const [view, setView] = useState<'photo' | '3d'>('photo');
  const img = useAssetUrl(product?.image);
  const modelUrl = useAssetUrl(product?.model);
  const navigate = useNavigate();
  const setSimProduct = useSimulator((s) => s.setProduct);

  useEffect(() => {
    productRepository.get(id!).then((p) => setProduct(p ?? null));
  }, [id]);

  if (product === undefined) return <div className="p-8"><Spinner /></div>;
  if (product === null)
    return (
      <div className="mx-auto max-w-3xl p-8">
        <Notice tone="error" title="Produto não encontrado" />
        <Link to="/" className="mt-4 inline-block underline">Voltar ao catálogo</Link>
      </div>
    );

  const store = catalogLinkFor(product);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <Link to="/" className="text-sm text-awake-blue/70 hover:underline">← Catálogo</Link>
      <div className="mt-4 grid gap-8 md:grid-cols-2">
        <div>
          <div className="aspect-square overflow-hidden rounded-2xl bg-white ring-1 ring-awake-cream-dark">
            {view === 'photo' || !modelUrl ? (
              img && <img src={img} alt={product.name} className="h-full w-full object-contain p-8" />
            ) : (
              <ModelViewer url={modelUrl} heightCm={product.heightCm} className="h-full w-full" />
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant={view === 'photo' ? 'primary' : 'outline'} onClick={() => setView('photo')}>
              Foto
            </Button>
            <Button size="sm" variant={view === '3d' ? 'primary' : 'outline'} onClick={() => setView('3d')} disabled={!product.model}>
              Modelo 3D
            </Button>
            {!product.model && <span className="self-center text-xs text-awake-blue/60">Modelo 3D não disponível para este produto.</span>}
          </div>
        </div>
        <div>
          <p className="label-caps text-awake-pink">{product.category}</p>
          <h1 className="mt-1 text-3xl font-bold">{product.name}</h1>
          <p className="mt-3 text-2xl font-bold">{formatPrice(product.priceCents)}</p>
          <p className="text-xs text-awake-blue/60">Preço ilustrativo · protótipo sem pagamentos</p>
          {product.description && <p className="mt-4 text-sm leading-relaxed text-awake-blue/80">{product.description}</p>}
          <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-awake-cream-dark text-sm ring-1 ring-awake-cream-dark">
            {[
              ['Material', product.material],
              ['Altura', formatCm(product.heightCm)],
              ['Largura', formatCm(product.widthCm)],
              ['Profundidade', formatCm(product.depthCm)],
              ['SKU', product.sku],
              ['Modelo 3D', product.model ? 'Disponível' : 'Não disponível'],
            ].map(([k, v]) => (
              <div key={k} className="bg-white p-3">
                <dt className="label-caps text-awake-blue/55">{k}</dt>
                <dd className="mt-1 font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              variant="accent"
              onClick={() => {
                setSimProduct(product.id);
                navigate('/simulador');
              }}
            >
              Simular no meu ambiente
            </Button>
            {store.external && (
              <a href={store.href} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-full border border-awake-blue/30 bg-white px-5 py-2.5 text-sm font-semibold hover:border-awake-blue">
                Ver na loja online ↗
              </a>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge tone="blue">Simulação 2D</Badge>
            {product.model ? <Badge tone="blue">Simulação 3D</Badge> : <Badge tone="neutral">Sem simulação 3D</Badge>}
          </div>
        </div>
      </div>
    </div>
  );
}
