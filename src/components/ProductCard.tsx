import { Link, useNavigate } from 'react-router-dom';
import type { Product } from '../types';
import { useAssetUrl } from '../lib/hooks';
import { formatDims, formatPrice } from '../lib/format';
import { Badge, Button } from './ui';
import { useSimulator } from '../store/simulator';

export default function ProductCard({ product }: { product: Product }) {
  const img = useAssetUrl(product.image);
  const navigate = useNavigate();
  const setProduct = useSimulator((s) => s.setProduct);
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-awake-cream-dark transition hover:shadow-md">
      <Link to={`/produto/${product.id}`} className="relative block aspect-[4/5] overflow-hidden bg-gradient-to-b from-white to-awake-cream">
        {img && <img src={img} alt={product.name} className="absolute inset-0 h-full w-full object-contain p-6 transition group-hover:scale-[1.03] sm:p-8" loading="lazy" />}
        <div className="absolute left-3 top-3">
          {product.model ? <Badge tone="blue">3D + 2D</Badge> : <Badge tone="neutral">Somente 2D</Badge>}
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="label-caps text-awake-pink">{product.category}</p>
        <Link to={`/produto/${product.id}`} className="font-semibold leading-snug hover:underline">
          {product.name}
        </Link>
        <p className="text-xs text-awake-blue/70">{product.material}</p>
        <p className="text-xs text-awake-blue/70">{formatDims(product)}</p>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
          <span className="font-bold">{formatPrice(product.priceCents)}</span>
          <Button
            size="sm"
            variant="accent"
            onClick={() => {
              setProduct(product.id);
              navigate('/simulador');
            }}
          >
            Simular
          </Button>
        </div>
      </div>
    </article>
  );
}
