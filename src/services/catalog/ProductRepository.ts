import type { Product } from '../../types';

/**
 * Contrato do catálogo. O protótipo usa a implementação local (IndexedDB);
 * a integração com o e-commerce da Awake substitui apenas esta camada
 * (ver src/services/commerce/README.md).
 */
export interface ProductRepository {
  readonly readOnly: boolean;
  list(): Promise<Product[]>;
  get(id: string): Promise<Product | undefined>;
  save(product: Product): Promise<Product>;
  remove(id: string): Promise<void>;
  resetDemo?(): Promise<void>;
}
