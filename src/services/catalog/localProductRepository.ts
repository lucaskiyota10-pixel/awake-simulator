import { db } from '../../lib/db';
import { deleteAsset } from '../../lib/assets';
import { demoProducts } from '../../demo/seed';
import type { Product } from '../../types';
import type { ProductRepository } from './ProductRepository';

const SEEDED_KEY = 'catalog:seeded:v1';

async function ensureSeeded() {
  if (await db.get('meta', SEEDED_KEY)) return;
  for (const p of demoProducts()) await db.put('products', p.id, p);
  await db.put('meta', SEEDED_KEY, true);
}

export const localProductRepository: ProductRepository = {
  readOnly: false,
  async list() {
    await ensureSeeded();
    const all = await db.getAll<Product>('products');
    return all.sort((a, b) => b.createdAt - a.createdAt);
  },
  async get(id) {
    await ensureSeeded();
    return db.get<Product>('products', id);
  },
  async save(product) {
    const saved = { ...product, updatedAt: Date.now() };
    await db.put('products', saved.id, saved);
    return saved;
  },
  async remove(id) {
    const p = await db.get<Product>('products', id);
    if (p) {
      await deleteAsset(p.image);
      await deleteAsset(p.model);
    }
    await db.delete('products', id);
  },
  async resetDemo() {
    for (const p of demoProducts()) await db.put('products', p.id, p);
    await db.put('meta', SEEDED_KEY, true);
  },
};
