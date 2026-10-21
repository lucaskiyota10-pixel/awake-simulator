import type { Calibration, CalibrationReference, Placement, Point, ScaleStatus } from '../types';

/**
 * CALIBRAÇÃO DE ESCALA
 *
 * Cada referência é um segmento marcado sobre a foto com comprimento real
 * conhecido (ex.: altura de uma porta = 210 cm). Ela fornece uma escala
 * local em pixels por centímetro, válida na profundidade em que o objeto
 * de referência está.
 *
 * Com UMA referência, a escala é considerada constante: só vale para
 * produtos posicionados aproximadamente na mesma profundidade (mesmo
 * plano) da referência.
 *
 * Com DUAS referências apoiadas em profundidades diferentes, usamos o fato
 * de que, para uma câmera pinhole nivelada e objetos sobre o mesmo plano
 * (piso), a escala na imagem é proporcional à distância vertical entre o
 * ponto de apoio e a linha do horizonte — ou seja, é LINEAR na coordenada
 * y do ponto de apoio. A interpolação linear entre as duas referências é
 * portanto exata nesse modelo, e permite estimar a escala em outros pontos
 * do mesmo piso.
 */

export const MIN_REFERENCE_PX_FRACTION = 0.06; // 6% da maior dimensão da foto
export const MIN_REFERENCE_CM = 5;
export const MAX_REFERENCE_CM = 1000;
/** Diferença mínima de y (fração da altura) para usar perspectiva. */
export const MIN_PERSPECTIVE_DY_FRACTION = 0.05;
/**
 * Sem calibração, supomos que a altura da foto cobre ~250 cm na posição do
 * produto. É apenas uma estimativa visual — nunca apresentada como real.
 */
export const UNCALIBRATED_FRAME_HEIGHT_CM = 250;

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function referencePxPerCm(ref: CalibrationReference): number {
  return distance(ref.a, ref.b) / ref.lengthCm;
}

/** y do ponto de apoio da referência (o ponto mais baixo do segmento). */
export function referenceBaseY(ref: CalibrationReference): number {
  return Math.max(ref.a.y, ref.b.y);
}

export interface ReferenceIssue {
  refId: string;
  message: string;
}

export function validateReference(
  ref: CalibrationReference,
  imageWidth: number,
  imageHeight: number,
): string | null {
  if (!ref.lengthCm) return 'Informe a medida real do objeto marcado.';
  if (!Number.isFinite(ref.lengthCm) || ref.lengthCm < MIN_REFERENCE_CM) {
    return `Informe uma medida de pelo menos ${MIN_REFERENCE_CM} cm.`;
  }
  if (ref.lengthCm > MAX_REFERENCE_CM) {
    return `A medida informada (${ref.lengthCm} cm) parece grande demais para um ambiente.`;
  }
  const minPx = Math.max(imageWidth, imageHeight) * MIN_REFERENCE_PX_FRACTION;
  if (distance(ref.a, ref.b) < minPx) {
    return 'O segmento marcado é curto demais na foto para uma medição confiável. Escolha uma referência maior ou mais próxima.';
  }
  return null;
}

export interface ScaleModel {
  /** Pixels (da foto original) por centímetro, no ponto de apoio y. */
  pxPerCmAt: (y: number) => number;
  /** Quantas referências válidas foram usadas. */
  validRefs: CalibrationReference[];
  issues: ReferenceIssue[];
  perspective: boolean;
}

export function buildScaleModel(
  calibration: Calibration,
  imageWidth: number,
  imageHeight: number,
): ScaleModel {
  const issues: ReferenceIssue[] = [];
  const validRefs: CalibrationReference[] = [];
  for (const ref of calibration.references) {
    const problem = validateReference(ref, imageWidth, imageHeight);
    if (problem) issues.push({ refId: ref.id, message: problem });
    else validRefs.push(ref);
  }

  const fallback = imageHeight / UNCALIBRATED_FRAME_HEIGHT_CM;

  if (validRefs.length === 0) {
    return { pxPerCmAt: () => fallback, validRefs, issues, perspective: false };
  }

  if (validRefs.length >= 2) {
    // Usa as duas referências mais afastadas em y.
    const sorted = [...validRefs].sort((r1, r2) => referenceBaseY(r1) - referenceBaseY(r2));
    const r1 = sorted[0];
    const r2 = sorted[sorted.length - 1];
    const y1 = referenceBaseY(r1);
    const y2 = referenceBaseY(r2);
    const s1 = referencePxPerCm(r1);
    const s2 = referencePxPerCm(r2);
    if (y2 - y1 >= imageHeight * MIN_PERSPECTIVE_DY_FRACTION) {
      const slope = (s2 - s1) / (y2 - y1);
      const minScale = Math.min(s1, s2) * 0.15;
      return {
        pxPerCmAt: (y) => Math.max(minScale, s1 + slope * (y - y1)),
        validRefs,
        issues,
        perspective: true,
      };
    }
    // Referências na mesma profundidade: média das escalas.
    const avg = validRefs.reduce((acc, r) => acc + referencePxPerCm(r), 0) / validRefs.length;
    return { pxPerCmAt: () => avg, validRefs, issues, perspective: false };
  }

  const s = referencePxPerCm(validRefs[0]);
  return { pxPerCmAt: () => s, validRefs, issues, perspective: false };
}

/**
 * Para perspectiva com duas referências, a horizontal do horizonte é onde a
 * escala se anula. Útil para alertar quando o produto é posicionado acima
 * dela (fora do piso calibrado).
 */
export function horizonY(calibration: Calibration, w: number, h: number): number | null {
  const model = buildScaleModel(calibration, w, h);
  if (!model.perspective) return null;
  const sorted = [...model.validRefs].sort((a, b) => referenceBaseY(a) - referenceBaseY(b));
  const r1 = sorted[0];
  const r2 = sorted[sorted.length - 1];
  const s1 = referencePxPerCm(r1);
  const s2 = referencePxPerCm(r2);
  const y1 = referenceBaseY(r1);
  const y2 = referenceBaseY(r2);
  if (s2 === s1) return null;
  return y1 - (s1 * (y2 - y1)) / (s2 - s1);
}

/** Referência escolhida como profundidade de apoio, se válida. */
export function depthReference(model: ScaleModel, placement: Placement): CalibrationReference | undefined {
  return placement.depthRefId ? model.validRefs.find((r) => r.id === placement.depthRefId) : undefined;
}

/** Escala (px/cm) no ponto do produto, antes do ajuste manual. */
export function pxPerCmForPlacement(model: ScaleModel, placement: Placement): number {
  const ref = depthReference(model, placement);
  return ref ? referencePxPerCm(ref) : model.pxPerCmAt(placement.anchor.y);
}

/** Altura em pixels da foto que o produto deve ocupar. */
export function productHeightPx(
  heightCm: number,
  placement: Placement,
  model: ScaleModel,
): number {
  return heightCm * pxPerCmForPlacement(model, placement) * placement.manualScale;
}

/**
 * Determina o que podemos afirmar sobre a escala exibida. Regra central do
 * protótipo: só dizemos "tamanho real" quando a calibração é suficiente E
 * o usuário não alterou o tamanho manualmente.
 */
export function scaleStatus(
  calibration: Calibration,
  placement: Placement,
  imageWidth: number,
  imageHeight: number,
): ScaleStatus {
  const model = buildScaleModel(calibration, imageWidth, imageHeight);
  const manual = Math.abs(placement.manualScale - 1) > 0.005;

  if (calibration.references.length === 0) {
    return {
      level: 'uncalibrated',
      realSize: false,
      title: 'Escala estimada — não calibrada',
      detail:
        'O tamanho exibido é apenas uma aproximação visual. Calibre a foto com uma medida conhecida do ambiente para usar as dimensões reais do produto.',
    };
  }

  if (model.validRefs.length === 0) {
    return {
      level: 'insufficient',
      realSize: false,
      title: 'Calibração insuficiente',
      detail: `${model.issues[0]?.message ?? 'A referência marcada não é confiável.'} Enquanto isso, o tamanho exibido não representa o tamanho real.`,
    };
  }

  if (manual) {
    return {
      level: 'manual',
      realSize: false,
      title: 'Tamanho ajustado manualmente',
      detail: `O produto está em ${Math.round(placement.manualScale * 100)}% do tamanho calculado pela calibração e não representa o tamanho real. Use "Voltar à escala calibrada" para restaurar.`,
    };
  }

  const depthRef = depthReference(model, placement);
  if (depthRef) {
    return {
      level: 'calibrated',
      realSize: true,
      title: 'Escala real calibrada',
      detail: `Usando a profundidade de "${depthRef.label}" (${depthRef.lengthCm} cm). Válida para o produto apoiado nessa mesma profundidade — por exemplo, sobre o móvel medido.`,
    };
  }

  const h = horizonY(calibration, imageWidth, imageHeight);
  if (model.perspective) {
    if (h !== null && placement.anchor.y <= h + imageHeight * 0.02) {
      return {
        level: 'insufficient',
        realSize: false,
        title: 'Fora da área calibrada',
        detail:
          'O ponto de apoio está acima da linha do horizonte estimada pelas referências, então o produto não pode estar sobre o piso. Se ele está sobre um móvel, escolha em "Apoio do produto" a referência na mesma profundidade.',
      };
    }
    return {
      level: 'calibrated-perspective',
      realSize: true,
      title: 'Escala real com perspectiva',
      detail:
        'Calibrada com duas referências em profundidades diferentes. A escala acompanha o produto conforme ele se aproxima ou se afasta, desde que esteja apoiado no piso. Sobre um móvel, escolha a referência correspondente em "Apoio do produto".',
    };
  }

  return {
    level: 'calibrated',
    realSize: true,
    title: 'Escala real calibrada',
    detail: `Baseada em ${model.validRefs.length > 1 ? `${model.validRefs.length} referências na mesma profundidade (média)` : `"${model.validRefs[0].label || 'referência'}" (${model.validRefs[0].lengthCm} cm)`}. Válida para o produto posicionado na mesma profundidade da referência; mais à frente ou ao fundo, o tamanho deixa de ser fiel. Para considerar a perspectiva, use uma referência em outra profundidade.`,
  };
}
