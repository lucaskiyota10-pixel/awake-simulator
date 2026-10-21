import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { Notice, PageHeader, Spinner } from '../components/ui';
import { useProducts } from '../lib/hooks';
import { PRODUCT_CATEGORIES, type ProductCategory } from '../types';

export default function CatalogPage() {
  const { products, error } = useProducts();
  const [category, setCategory] = useState<ProductCategory | 'Todos'>('Todos');
  const filtered = useMemo(
    () => (products ?? []).filter((p) => category === 'Todos' || p.category === category),
    [products, category],
  );

  return (
    <div className="relative overflow-hidden">
      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <PageHeader eyebrow="Catálogo" title="Esculturas, luminárias e objetos decorativos">
            Escolha uma peça e visualize-a em uma foto do seu ambiente, em 2D ou 3D, usando as dimensões reais do produto.
          </PageHeader>
          <Link
            to="/simulador"
            className="label-caps shrink-0 self-start rounded-full bg-awake-pink px-5 py-3 text-white hover:brightness-95 sm:self-auto"
          >
            Abrir simulador
          </Link>
        </div>

        <div className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label="Categorias">
          {(['Todos', ...PRODUCT_CATEGORIES] as const).map((c) => (
            <button
              key={c}
              role="tab"
              aria-selected={category === c}
              onClick={() => setCategory(c)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                category === c ? 'bg-awake-blue text-white' : 'bg-white text-awake-blue ring-1 ring-awake-blue/15 hover:ring-awake-blue/40'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {error && <Notice tone="error" title="Erro ao carregar o catálogo">{error}</Notice>}
        {!products && !error && <Spinner />}
        {products && filtered.length === 0 && <Notice>Nenhum produto nesta categoria.</Notice>}
        <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </div>
  );
}
