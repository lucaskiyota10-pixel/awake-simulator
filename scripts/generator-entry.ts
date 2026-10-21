import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { DEMO_MODELS, fitToDimensions } from '../src/demo/models';
import { DEMO_ROOMS } from '../src/demo/rooms';

function makeRenderer(w: number, h: number, alpha: boolean) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(w, h);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if (alpha) renderer.setClearColor(0x000000, 0);
  document.body.appendChild(renderer.domElement);
  return renderer;
}

function trimCanvas(src: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = src.getContext('2d')!;
  const { width: w, height: h } = src;
  const data = ctx.getImageData(0, 0, w, h).data;
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (data[(y * w + x) * 4 + 3] > 8) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
  const out = document.createElement('canvas');
  out.width = maxX - minX + 1;
  out.height = maxY - minY + 1;
  out.getContext('2d')!.drawImage(src, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

async function exportGlb(obj: THREE.Object3D): Promise<string> {
  const buf = (await new GLTFExporter().parseAsync(obj, { binary: true })) as ArrayBuffer;
  let s = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

async function renderProduct(id: string) {
  const spec = DEMO_MODELS.find((m) => m.id === id)!;
  const model = fitToDimensions(spec.build(), spec.widthCm, spec.heightCm, spec.depthCm);
  model.name = spec.id;
  const hM = spec.heightCm / 100;
  const S = 1400;
  const renderer = makeRenderer(S, S, true);
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.7;
  const key = new THREE.DirectionalLight('#fff4e5', 2.2);
  key.position.set(2, 3, 3);
  const rim = new THREE.DirectionalLight('#ffffff', 1.0);
  rim.position.set(-3, 2, -2);
  scene.add(key, rim, new THREE.AmbientLight('#ffffff', 0.25), model);
  // Câmera quase frontal (elevação de 4°) para a foto 2D casar com a altura real.
  const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const cam = new THREE.PerspectiveCamera(18, 1, 0.01, 100);
  const dist = (maxDim * 0.62) / Math.tan(THREE.MathUtils.degToRad(9));
  const elev = THREE.MathUtils.degToRad(4);
  cam.position.set(0, hM / 2 + Math.sin(elev) * dist, Math.cos(elev) * dist);
  cam.lookAt(0, hM / 2, 0);
  renderer.render(scene, cam);
  const tmp = document.createElement('canvas');
  tmp.width = S; tmp.height = S;
  tmp.getContext('2d')!.drawImage(renderer.domElement, 0, 0);
  const trimmed = trimCanvas(tmp);
  const png = trimmed.toDataURL('image/png');
  renderer.dispose();
  renderer.domElement.remove();
  const glb = spec.exportModel ? await exportGlb(model) : null;
  return { png, glb, imageWidth: trimmed.width, imageHeight: trimmed.height };
}

async function renderRoom(id: string) {
  const spec = DEMO_ROOMS.find((r) => r.id === id)!;
  const W = 1600, H = 1067;
  const renderer = makeRenderer(W, H, false);
  const { scene, refs } = spec.build();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.35;
  const cam = new THREE.PerspectiveCamera(spec.camera.fovDeg, W / H, 0.05, 50);
  cam.position.set(0, spec.camera.heightM, 0);
  cam.rotation.set(THREE.MathUtils.degToRad(spec.camera.pitchDeg), 0, 0);
  cam.updateMatrixWorld(true);
  renderer.render(scene, cam);
  const jpg = renderer.domElement.toDataURL('image/jpeg', 0.9);
  const toPx = (v: THREE.Vector3) => {
    const p = v.clone().project(cam);
    return { x: +(((p.x + 1) / 2) * W).toFixed(2), y: +(((1 - p.y) / 2) * H).toFixed(2) };
  };
  renderer.dispose();
  renderer.domElement.remove();
  return {
    jpg, width: W, height: H,
    references: refs.map((r) => ({ label: r.label, lengthCm: r.lengthCm, a: toPx(r.a), b: toPx(r.b) })),
  };
}

(window as unknown as Record<string, unknown>).awakeGen = {
  products: DEMO_MODELS.map((m) => m.id),
  rooms: DEMO_ROOMS.map((r) => ({ id: r.id, name: r.name, camera: r.camera })),
  renderProduct,
  renderRoom,
};
