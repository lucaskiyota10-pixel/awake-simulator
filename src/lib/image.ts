export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Não foi possível abrir a imagem.'));
    img.src = src;
  });
}

export async function imageSizeOf(blob: Blob): Promise<{ width: number; height: number }> {
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    return { width: img.naturalWidth, height: img.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/png', quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao gerar imagem.'))), type, quality),
  );
}

export interface PreparedProductImage {
  blob: Blob;
  hasTransparency: boolean;
  trimmed: boolean;
  width: number;
  height: number;
}

/**
 * Prepara a foto do produto para o simulador: recorta as bordas
 * transparentes (para que a altura da imagem corresponda à altura do
 * objeto) e informa se a imagem tem fundo transparente.
 */
export async function prepareProductImage(file: Blob): Promise<PreparedProductImage> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, w, h).data;
    let minX = w, minY = h, maxX = -1, maxY = -1, transparent = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const a = data[(y * w + x) * 4 + 3];
        if (a < 250) transparent++;
        if (a > 8) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    const hasTransparency = transparent > w * h * 0.02;
    if (maxX < 0) throw new Error('A imagem está totalmente transparente.');
    const tw = maxX - minX + 1;
    const th = maxY - minY + 1;
    if (tw === w && th === h) return { blob: file, hasTransparency, trimmed: false, width: w, height: h };
    const out = document.createElement('canvas');
    out.width = tw;
    out.height = th;
    out.getContext('2d')!.drawImage(c, minX, minY, tw, th, 0, 0, tw, th);
    return { blob: await canvasToBlob(out), hasTransparency, trimmed: true, width: tw, height: th };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
