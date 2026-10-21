import type { ImageRect } from '../components/simulator/usePlacementDrag';
import { canvasToBlob, loadImage } from './image';

/**
 * Gera a composição final na RESOLUÇÃO ORIGINAL da foto. A foto original
 * nunca é alterada: a composição é sempre uma nova imagem.
 */
export async function composeImage(opts: {
  roomUrl: string;
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D) => void | Promise<void>;
  caption: string;
  warning?: string;
}): Promise<Blob> {
  const { width: W, height: H } = opts;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(await loadImage(opts.roomUrl), 0, 0, W, H);
  await opts.draw(ctx);

  // Legenda com identificação do produto e o status da escala.
  const band = Math.max(28, Math.round(H * 0.045));
  const lines = opts.warning ? 2 : 1;
  const bandH = band * (lines === 2 ? 1.6 : 1);
  ctx.fillStyle = 'rgba(246,243,235,0.92)';
  ctx.fillRect(0, H - bandH, W, bandH);
  const logo = await loadImage('brand/awake-logo-blue.png').catch(() => null);
  let x = band * 0.4;
  if (logo) {
    const lh = band * 0.62;
    const lw = (logo.naturalWidth / logo.naturalHeight) * lh;
    ctx.drawImage(logo, x, H - bandH + (bandH - lh) / 2, lw, lh);
    x += lw + band * 0.5;
  }
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#152F8C';
  ctx.font = `600 ${Math.round(band * 0.36)}px Montserrat, sans-serif`;
  const firstY = lines === 2 ? H - bandH + band * 0.5 : H - bandH / 2;
  ctx.fillText(opts.caption, x, firstY, W - x - band * 0.4);
  if (opts.warning) {
    ctx.fillStyle = '#B45309';
    ctx.font = `500 ${Math.round(band * 0.32)}px Montserrat, sans-serif`;
    ctx.fillText(opts.warning, x, H - bandH + band * 1.12, W - x - band * 0.4);
  }
  return canvasToBlob(canvas, 'image/png');
}

/** Sombra de contato elíptica sob o produto (mesma usada na tela). */
export function drawContactShadow(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number) {
  const rx = w * 0.48;
  const ry = Math.max(2, w * 0.07);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, 'rgba(0,0,0,0.38)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export async function drawProduct2D(
  ctx: CanvasRenderingContext2D,
  productUrl: string,
  rect: ImageRect,
  flipX: boolean,
  shadow: boolean,
) {
  const img = await loadImage(productUrl);
  if (shadow) drawContactShadow(ctx, rect.left + rect.width / 2, rect.top + rect.height, rect.width);
  ctx.save();
  if (flipX) {
    ctx.translate(rect.left + rect.width, rect.top);
    ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0, rect.width, rect.height);
  } else {
    ctx.drawImage(img, rect.left, rect.top, rect.width, rect.height);
  }
  ctx.restore();
}
