// Gera os assets de demonstração (modelos GLB, fotos PNG transparentes e
// fotos de ambientes) renderizando os modelos procedurais em um Chromium
// headless. Uso: npm run generate:assets
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = (p) => join(root, 'public', 'demo', p);
for (const d of ['products', 'models', 'rooms']) mkdirSync(out(d), { recursive: true });

const bundle = await build({
  entryPoints: [join(root, 'scripts', 'generator-entry.ts')],
  bundle: true, write: false, format: 'iife', target: 'es2022',
});

const candidates = [
  process.env.CHROMIUM_PATH,
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
].filter(Boolean);
const executablePath = candidates.find((p) => existsSync(p));
const browser = await chromium.launch({
  executablePath,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage();
page.on('console', (m) => m.type() === 'error' && console.error('[browser]', m.text()));
await page.setContent('<!doctype html><html><body style="margin:0"></body></html>');
await page.addScriptTag({ content: bundle.outputFiles[0].text });

const manifest = { products: {}, rooms: [] };
const productIds = await page.evaluate(() => window.awakeGen.products);
for (const id of productIds) {
  const r = await page.evaluate((i) => window.awakeGen.renderProduct(i), id);
  writeFileSync(out(`products/${id}.png`), Buffer.from(r.png.split(',')[1], 'base64'));
  if (r.glb) writeFileSync(out(`models/${id}.glb`), Buffer.from(r.glb, 'base64'));
  manifest.products[id] = { image: `demo/products/${id}.png`, model: r.glb ? `demo/models/${id}.glb` : null };
  console.log('produto', id, r.imageWidth + 'x' + r.imageHeight, r.glb ? 'GLB ok' : 'sem modelo 3D');
}
const rooms = await page.evaluate(() => window.awakeGen.rooms);
for (const room of rooms) {
  const r = await page.evaluate((i) => window.awakeGen.renderRoom(i), room.id);
  writeFileSync(out(`rooms/${room.id}.jpg`), Buffer.from(r.jpg.split(',')[1], 'base64'));
  manifest.rooms.push({ id: room.id, name: room.name, image: `demo/rooms/${room.id}.jpg`, width: r.width, height: r.height, camera: room.camera, references: r.references });
  console.log('ambiente', room.id);
}
writeFileSync(join(root, 'src', 'demo', 'generated-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
await browser.close();
console.log('Assets gerados em public/demo/');
