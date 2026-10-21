import manifest from './generated-manifest.json';
import type { Product, Room } from '../types';

type Seed = Omit<Product, 'image' | 'model' | 'createdAt' | 'updatedAt' | 'currency' | 'isDemo'>;

/**
 * Produtos de demonstração. Dimensões idênticas às dos modelos gerados em
 * src/demo/models.ts. Preços são ilustrativos.
 */
const SEEDS: Seed[] = [
  { id: 'escultura-onda', sku: 'AWK-ESC-001', name: 'Escultura Onda', category: 'Esculturas', material: 'Resina acetinada e base em resina preta', heightCm: 42, widthCm: 20, depthCm: 20, priceCents: 38900, description: 'Escultura orgânica de linhas contínuas.' },
  { id: 'escultura-gota', sku: 'AWK-ESC-002', name: 'Escultura Gota', category: 'Esculturas', material: 'Cerâmica esmaltada', heightCm: 30, widthCm: 16, depthCm: 16, priceCents: 24900, description: 'Peça em cerâmica com esmalte brilhante terracota.' },
  { id: 'escultura-arco', sku: 'AWK-ESC-003', name: 'Escultura Arco', category: 'Esculturas', material: 'Travertino', heightCm: 35, widthCm: 28, depthCm: 10, priceCents: 45900, description: 'Arco em pedra natural sobre base retangular.' },
  { id: 'escultura-esferas', sku: 'AWK-ESC-004', name: 'Escultura Esferas', category: 'Esculturas', material: 'Madeira freijó', heightCm: 40, widthCm: 18, depthCm: 18, priceCents: 29900, description: 'Três esferas torneadas e empilhadas.' },
  { id: 'escultura-folha', sku: 'AWK-ESC-005', name: 'Escultura Folha', category: 'Esculturas', material: 'Metal com banho dourado', heightCm: 50, widthCm: 26, depthCm: 8, priceCents: 52000, description: 'Produto de demonstração sem modelo 3D: disponível somente no modo 2D.' },
  { id: 'luminaria-lua', sku: 'AWK-LUM-001', name: 'Luminária de Mesa Lua', category: 'Luminárias', material: 'Vidro opalino e latão', heightCm: 45, widthCm: 30, depthCm: 30, priceCents: 69000, description: 'Globo opalino de luz difusa sobre haste de latão.' },
  { id: 'luminaria-arco', sku: 'AWK-LUM-002', name: 'Luminária de Piso Arco', category: 'Luminárias', material: 'Aço pintado, mármore e linho', heightCm: 180, widthCm: 115, depthCm: 40, priceCents: 129000, description: 'Luminária de piso com haste curva e base em mármore.' },
  { id: 'vaso-anfora', sku: 'AWK-VAS-001', name: 'Vaso Ânfora', category: 'Vasos', material: 'Cerâmica artesanal esmaltada', heightCm: 38, widthCm: 24, depthCm: 24, priceCents: 27900, description: 'Vaso de formas clássicas em azul intenso.' },
  { id: 'vaso-canelado', sku: 'AWK-VAS-002', name: 'Vaso de Piso Canelado', category: 'Vasos', material: 'Fibra de vidro', heightCm: 70, widthCm: 34, depthCm: 34, priceCents: 54900, description: 'Vaso de piso com textura canelada.' },
  { id: 'vela-copo', sku: 'AWK-OBJ-001', name: 'Vela Perfumada em Copo', category: 'Objetos decorativos', material: 'Cera vegetal e copo cerâmico', heightCm: 10, widthCm: 8, depthCm: 8, priceCents: 8900, description: 'Vela em copo cerâmico.' },
];

const products = manifest.products as Record<string, { image: string; model: string | null }>;

export function demoProducts(now = Date.now()): Product[] {
  return SEEDS.map((s, i) => {
    const assets = products[s.id];
    return {
      ...s,
      currency: 'BRL',
      image: { kind: 'url', url: assets.image },
      model: assets.model ? { kind: 'url', url: assets.model } : undefined,
      isDemo: true,
      createdAt: now - i,
      updatedAt: now - i,
    };
  });
}

export const DEMO_ROOMS: Room[] = manifest.rooms.map((r) => ({
  id: r.id,
  name: r.name,
  source: 'demo',
  image: { kind: 'url', url: r.image },
  width: r.width,
  height: r.height,
  suggestedReferences: r.references.map((ref, i) => ({ ...ref, id: `${r.id}-ref-${i}` })),
  createdAt: 0,
}));

/** Câmera usada para renderizar cada ambiente de demonstração. */
export const DEMO_ROOM_CAMERA: Record<string, { fovDeg: number; pitchDeg: number }> = Object.fromEntries(
  manifest.rooms.map((r) => [r.id, { fovDeg: r.camera.fovDeg, pitchDeg: r.camera.pitchDeg }]),
);
