import type { Product, ProductCategory } from '../../types';
import { PRODUCT_CATEGORIES } from '../../types';
import type { ProductRepository } from '../catalog/ProductRepository';

/**
 * Formato neutro de produto vindo de uma plataforma de e-commerce
 * (Shopify, VTEX, Nuvemshop, WooCommerce...). Cada plataforma terá um
 * mapeador próprio para este formato.
 */
export interface CommerceProduct {
  id: string;
  sku: string;
  title: string;
  url: string;
  price: { amount: number; currency: 'BRL' };
  category?: string;
  /** Metacampos necessários para o simulador. */
  attributes: {
    material?: string;
    height_cm?: number;
    width_cm?: number;
    depth_cm?: number;
    transparent_image_url?: string;
    model_glb_url?: string;
  };
  description?: string;
}

export function fromCommerceProduct(c: CommerceProduct): Product {
  const category = (PRODUCT_CATEGORIES as string[]).includes(c.category ?? '')
    ? (c.category as ProductCategory)
    : 'Objetos decorativos';
  const a = c.attributes;
  if (!a.height_cm || !a.width_cm || !a.depth_cm || !a.transparent_image_url) {
    throw new Error(`Produto ${c.sku} sem dimensões ou imagem transparente cadastradas.`);
  }
  return {
    id: `ext_${c.id}`,
    externalId: c.id,
    externalUrl: c.url,
    sku: c.sku,
    name: c.title,
    category,
    material: a.material ?? '',
    description: c.description,
    heightCm: a.height_cm,
    widthCm: a.width_cm,
    depthCm: a.depth_cm,
    priceCents: Math.round(c.price.amount * 100),
    currency: 'BRL',
    image: { kind: 'url', url: a.transparent_image_url },
    model: a.model_glb_url ? { kind: 'url', url: a.model_glb_url } : undefined,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function toCommerceProduct(p: Product): Omit<CommerceProduct, 'id' | 'url'> {
  return {
    sku: p.sku,
    title: p.name,
    price: { amount: p.priceCents / 100, currency: 'BRL' },
    category: p.category,
    description: p.description,
    attributes: {
      material: p.material,
      height_cm: p.heightCm,
      width_cm: p.widthCm,
      depth_cm: p.depthCm,
    },
  };
}

/**
 * Repositório somente leitura que consome uma API de catálogo
 * (GET {baseUrl}/products -> CommerceProduct[]). Ativado quando
 * VITE_CATALOG_API_URL está definido. Os cadastros passam a ser feitos na
 * plataforma de e-commerce, não no painel local.
 */
export function createHttpProductRepository(baseUrl: string): ProductRepository {
  let cache: Product[] | null = null;
  const load = async () => {
    if (!cache) {
      const res = await fetch(`${baseUrl.replace(/\/$/, '')}/products`);
      if (!res.ok) throw new Error(`Catálogo indisponível (${res.status}).`);
      const items = (await res.json()) as CommerceProduct[];
      cache = items.flatMap((i) => {
        try {
          return [fromCommerceProduct(i)];
        } catch (e) {
          console.warn(e);
          return [];
        }
      });
    }
    return cache;
  };
  const readOnly = () => Promise.reject(new Error('Catálogo externo: edite os produtos na plataforma de e-commerce.'));
  return {
    readOnly: true,
    list: load,
    get: async (id) => (await load()).find((p) => p.id === id),
    save: readOnly,
    remove: readOnly,
  };
}
