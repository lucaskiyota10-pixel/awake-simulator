import type { CameraSettings, Point } from '../types';

/**
 * PROJEÇÃO 3D A PARTIR DA FOTO
 *
 * A cena 3D usa uma câmera pinhole na origem, com o mesmo enquadramento da
 * foto (mesma proporção) e campo de visão vertical `fovDeg`. Unidades da
 * cena: metros.
 *
 * Dado o ponto de apoio (anchor) em pixels da foto e a altura em pixels que
 * o produto deve ocupar (vinda da calibração), posicionamos o modelo na
 * profundidade em que um objeto da altura real projeta exatamente aquela
 * altura:   alturaPx = alturaM * f / profundidade
 * Assim o 3D usa as MESMAS dimensões cadastradas e a MESMA calibração do 2D.
 */

export function focalLengthPx(imageHeight: number, fovDeg: number): number {
  return imageHeight / 2 / Math.tan(((fovDeg * Math.PI) / 180) / 2);
}

export interface WorldPlacement {
  /** Posição (m) do centro da base do modelo, no espaço do mundo. */
  position: [number, number, number];
  /** Profundidade ao longo do eixo óptico (m). */
  depth: number;
}

export function placeInWorld(
  anchor: Point,
  imageWidth: number,
  imageHeight: number,
  targetHeightPx: number,
  realHeightM: number,
  camera: CameraSettings,
): WorldPlacement {
  const f = focalLengthPx(imageHeight, camera.fovDeg);
  const depth = (realHeightM * f) / Math.max(targetHeightPx, 1e-3);
  // Espaço da câmera (x à direita, y para cima, olhando para -z).
  const xc = ((anchor.x - imageWidth / 2) * depth) / f;
  const yc = (-(anchor.y - imageHeight / 2) * depth) / f;
  const zc = -depth;
  // Rotação da câmera em torno de X (pitch) leva espaço da câmera -> mundo.
  const p = (camera.pitchDeg * Math.PI) / 180;
  const cos = Math.cos(p);
  const sin = Math.sin(p);
  const yw = yc * cos - zc * sin;
  const zw = yc * sin + zc * cos;
  return { position: [xc, yw, zw], depth };
}

/** Projeta um ponto do mundo para pixels da foto (inverso de placeInWorld). */
export function projectToImage(
  world: [number, number, number],
  imageWidth: number,
  imageHeight: number,
  camera: CameraSettings,
): Point {
  const f = focalLengthPx(imageHeight, camera.fovDeg);
  const p = (camera.pitchDeg * Math.PI) / 180;
  const cos = Math.cos(p);
  const sin = Math.sin(p);
  const [xw, yw, zw] = world;
  // mundo -> câmera (rotação inversa)
  const yc = yw * cos + zw * sin;
  const zc = -yw * sin + zw * cos;
  const depth = -zc;
  return {
    x: imageWidth / 2 + (xw * f) / depth,
    y: imageHeight / 2 - (yc * f) / depth,
  };
}

export const DEFAULT_CAMERA: CameraSettings = { fovDeg: 50, pitchDeg: 0 };
