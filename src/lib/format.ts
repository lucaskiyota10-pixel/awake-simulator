import type { Product } from '../types';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export const formatPrice = (cents: number) => brl.format(cents / 100);

export const formatCm = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1).replace('.', ',')} cm`;

export const formatDims = (p: Pick<Product, 'heightCm' | 'widthCm' | 'depthCm'>) =>
  `A ${formatCm(p.heightCm)} × L ${formatCm(p.widthCm)} × P ${formatCm(p.depthCm)}`;
