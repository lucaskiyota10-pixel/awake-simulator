import type { Product } from '../../types';

/**
 * Configuração da futura integração com o e-commerce.
 * Defina no arquivo .env:
 *   VITE_COMMERCE_STORE_URL=https://loja.awake.com.br
 *   VITE_COMMERCE_PRODUCT_PATH=/produto/{sku}
 * Enquanto não houver loja configurada, "Ver produto no catálogo" abre a
 * página do produto dentro do próprio protótipo.
 */
export const commerceConfig = {
  storeUrl: (import.meta.env.VITE_COMMERCE_STORE_URL as string | undefined)?.replace(/\/$/, ''),
  productPath: (import.meta.env.VITE_COMMERCE_PRODUCT_PATH as string | undefined) ?? '/produto/{sku}',
  catalogApiUrl: import.meta.env.VITE_CATALOG_API_URL as string | undefined,
};

export interface CatalogLink {
  href: string;
  external: boolean;
}

export function catalogLinkFor(product: Product): CatalogLink {
  if (product.externalUrl) return { href: product.externalUrl, external: true };
  if (commerceConfig.storeUrl) {
    const path = commerceConfig.productPath
      .replace('{sku}', encodeURIComponent(product.sku))
      .replace('{id}', encodeURIComponent(product.externalId ?? product.id));
    return { href: commerceConfig.storeUrl + path, external: true };
  }
  return { href: `/produto/${product.id}`, external: false };
}
