import { commerceConfig } from '../commerce/config';
import { createHttpProductRepository } from '../commerce/adapters';
import { localProductRepository } from './localProductRepository';
import type { ProductRepository } from './ProductRepository';

/** Ponto único de troca entre catálogo local e catálogo do e-commerce. */
export const productRepository: ProductRepository = commerceConfig.catalogApiUrl
  ? createHttpProductRepository(commerceConfig.catalogApiUrl)
  : localProductRepository;
