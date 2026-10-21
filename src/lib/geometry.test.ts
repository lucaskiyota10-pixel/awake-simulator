import { describe, expect, it } from 'vitest';
import { buildScaleModel, productHeightPx, scaleStatus } from './calibration';
import { placeInWorld, projectToImage } from './projection';
import type { Calibration, Placement } from '../types';

const W = 1600;
const H = 1000;
const base: Placement = { anchor: { x: 800, y: 800 }, manualScale: 1, rotationDeg: 0, flipX: false };

describe('calibração', () => {
  it('sem referências: escala estimada e nunca "tamanho real"', () => {
    const s = scaleStatus({ references: [] }, base, W, H);
    expect(s.level).toBe('uncalibrated');
    expect(s.realSize).toBe(false);
  });

  it('uma referência: converte cm em pixels', () => {
    const cal: Calibration = {
      references: [{ id: 'r', label: 'Porta', a: { x: 100, y: 200 }, b: { x: 100, y: 830 }, lengthCm: 210 }],
    };
    const model = buildScaleModel(cal, W, H);
    expect(model.pxPerCmAt(500)).toBeCloseTo(3, 5);
    expect(productHeightPx(40, base, model)).toBeCloseTo(120, 5);
    expect(scaleStatus(cal, base, W, H).realSize).toBe(true);
  });

  it('referência curta demais é insuficiente', () => {
    const cal: Calibration = {
      references: [{ id: 'r', label: 'x', a: { x: 0, y: 0 }, b: { x: 20, y: 0 }, lengthCm: 10 }],
    };
    const s = scaleStatus(cal, base, W, H);
    expect(s.level).toBe('insufficient');
    expect(s.realSize).toBe(false);
  });

  it('ajuste manual retira a afirmação de tamanho real', () => {
    const cal: Calibration = {
      references: [{ id: 'r', label: 'Porta', a: { x: 100, y: 200 }, b: { x: 100, y: 830 }, lengthCm: 210 }],
    };
    expect(scaleStatus(cal, { ...base, manualScale: 1.2 }, W, H).realSize).toBe(false);
  });

  it('duas referências em profundidades diferentes: escala linear em y', () => {
    // Objetos de 100 cm: perto (base y=900) mede 300 px, longe (base y=600) mede 150 px.
    const cal: Calibration = {
      references: [
        { id: 'perto', label: 'perto', a: { x: 300, y: 600 }, b: { x: 300, y: 900 }, lengthCm: 100 },
        { id: 'longe', label: 'longe', a: { x: 900, y: 450 }, b: { x: 900, y: 600 }, lengthCm: 100 },
      ],
    };
    const model = buildScaleModel(cal, W, H);
    expect(model.perspective).toBe(true);
    expect(model.pxPerCmAt(750)).toBeCloseTo(2.25, 5);
    // horizonte em y = 300: acima dele, o status deixa de ser real
    const above = scaleStatus(cal, { ...base, anchor: { x: 800, y: 290 } }, W, H);
    expect(above.realSize).toBe(false);
    // produto sobre o móvel da referência "longe": escala fixa dessa referência
    const onFurniture = { ...base, anchor: { x: 800, y: 290 }, depthRefId: 'longe' };
    expect(productHeightPx(30, onFurniture, model)).toBeCloseTo(45, 5);
    expect(scaleStatus(cal, onFurniture, W, H).realSize).toBe(true);
  });
});

describe('projeção 3D', () => {
  it('posiciona o modelo para que projete a mesma altura do 2D', () => {
    const cam = { fovDeg: 50, pitchDeg: 0 };
    const anchor = { x: 1000, y: 820 };
    const targetPx = 240;
    const hM = 0.4;
    const { position } = placeInWorld(anchor, W, H, targetPx, hM, cam);
    const bottom = projectToImage(position, W, H, cam);
    const top = projectToImage([position[0], position[1] + hM, position[2]], W, H, cam);
    expect(bottom.x).toBeCloseTo(anchor.x, 6);
    expect(bottom.y).toBeCloseTo(anchor.y, 6);
    expect(bottom.y - top.y).toBeCloseTo(targetPx, 6);
  });

  it('com inclinação, a base continua sobre o ponto de apoio', () => {
    const cam = { fovDeg: 45, pitchDeg: -12 };
    const anchor = { x: 400, y: 700 };
    const { position } = placeInWorld(anchor, W, H, 200, 0.5, cam);
    const bottom = projectToImage(position, W, H, cam);
    expect(bottom.x).toBeCloseTo(anchor.x, 6);
    expect(bottom.y).toBeCloseTo(anchor.y, 6);
  });
});
