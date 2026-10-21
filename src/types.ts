/** Ponto em coordenadas de PIXEL DA FOTO ORIGINAL (não da tela). */
export interface Point {
  x: number;
  y: number;
}

export type ProductCategory = 'Esculturas' | 'Luminárias' | 'Objetos decorativos' | 'Vasos';

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  'Esculturas',
  'Luminárias',
  'Vasos',
  'Objetos decorativos',
];

/**
 * Referência a um arquivo binário. Produtos de demonstração apontam para
 * arquivos estáticos em /public; produtos cadastrados no admin guardam o
 * arquivo no IndexedDB (assetId).
 */
export type AssetRef = { kind: 'url'; url: string } | { kind: 'local'; assetId: string };

export interface Product {
  id: string;
  /** Campos preparados para o e-commerce (SKU, ID e URL externos). */
  sku: string;
  externalId?: string;
  externalUrl?: string;
  name: string;
  category: ProductCategory;
  material: string;
  description?: string;
  /** Dimensões reais em centímetros. A altura é a dimensão usada na escala. */
  heightCm: number;
  widthCm: number;
  depthCm: number;
  /** Preço ilustrativo, em centavos. */
  priceCents: number;
  currency: 'BRL';
  /** PNG com fundo transparente, já recortado rente ao objeto. */
  image: AssetRef;
  /** Modelo GLB/GLTF, quando houver. */
  model?: AssetRef;
  isDemo?: boolean;
  createdAt: number;
  updatedAt: number;
}

export type RoomSource = 'upload' | 'camera' | 'demo';

export interface Room {
  id: string;
  name: string;
  source: RoomSource;
  /** Foto original, preservada sem alterações. */
  image: AssetRef;
  width: number;
  height: number;
  /** Ambientes de demonstração trazem uma referência conhecida sugerida. */
  suggestedReferences?: CalibrationReference[];
  createdAt: number;
}

/** Uma medida conhecida marcada pelo usuário sobre a foto. */
export interface CalibrationReference {
  id: string;
  label: string;
  a: Point;
  b: Point;
  lengthCm: number;
}

export interface Calibration {
  references: CalibrationReference[];
}

/** Posição do produto na foto, compartilhada entre os modos 2D e 3D. */
export interface Placement {
  /** Ponto de apoio do produto (centro da base), em pixels da foto. */
  anchor: Point;
  /**
   * Multiplicador manual sobre a escala calculada. 1 = tamanho pela
   * calibração. Qualquer outro valor invalida a afirmação de tamanho real.
   */
  manualScale: number;
  /** Rotação do modelo 3D em torno do eixo vertical (graus). */
  rotationDeg: number;
  /** Espelhamento horizontal da imagem 2D. */
  flipX: boolean;
  /**
   * Com duas referências: null = produto apoiado no piso (escala varia com
   * a profundidade). Um id = produto na mesma profundidade daquela
   * referência (ex.: sobre o móvel que foi medido).
   */
  depthRefId?: string | null;
}

export interface CameraSettings {
  /** Campo de visão vertical (graus), usado para casar a perspectiva da foto. */
  fovDeg: number;
  /** Inclinação da câmera (graus, negativo = olhando para baixo). */
  pitchDeg: number;
}

export type ViewMode = '2d' | '3d';

export interface Composition {
  id: string;
  name: string;
  roomId: string;
  productId: string;
  placement: Placement;
  calibration: Calibration;
  camera: CameraSettings;
  mode: ViewMode;
  /** Imagem final renderizada (PNG). */
  renderAssetId: string;
  scaleStatus: ScaleStatus['level'];
  createdAt: number;
}

export interface ScaleStatus {
  level: 'calibrated' | 'calibrated-perspective' | 'insufficient' | 'uncalibrated' | 'manual';
  /** Pode-se afirmar que o tamanho exibido corresponde ao real? */
  realSize: boolean;
  title: string;
  detail: string;
}
