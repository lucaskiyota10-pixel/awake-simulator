import { useCallback, useEffect, useRef, useState } from 'react';
import type { AssetRef, Product } from '../types';
import { resolveAssetUrl } from './assets';
import { productRepository } from '../services/catalog';

export function useAssetUrl(ref: AssetRef | undefined): string | null {
  const [url, setUrl] = useState<string | null>(ref?.kind === 'url' ? ref.url : null);
  useEffect(() => {
    let alive = true;
    if (!ref) {
      setUrl(null);
      return;
    }
    resolveAssetUrl(ref).then((u) => alive && setUrl(u)).catch(() => alive && setUrl(null));
    return () => {
      alive = false;
    };
  }, [ref?.kind === 'url' ? ref.url : ref?.assetId]); // eslint-disable-line react-hooks/exhaustive-deps
  return url;
}

export function useProducts() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(() => {
    productRepository
      .list()
      .then(setProducts)
      .catch((e: Error) => setError(e.message));
  }, []);
  useEffect(reload, [reload]);
  return { products, error, reload };
}

/** Largura renderizada de um elemento (para converter pixels da foto em pixels de tela). */
export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}
