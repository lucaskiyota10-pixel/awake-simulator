import * as THREE from 'three';

/**
 * Ambientes de demonstração, renderizados pelo script de geração de assets.
 * Como a câmera e as medidas são conhecidas, cada ambiente exporta
 * referências de calibração exatas (projetadas na imagem pelo gerador).
 */

export interface DemoRoomRef {
  label: string;
  lengthCm: number;
  a: THREE.Vector3;
  b: THREE.Vector3;
}

export interface DemoRoomSpec {
  id: string;
  name: string;
  build: () => { scene: THREE.Scene; refs: DemoRoomRef[] };
  camera: { fovDeg: number; pitchDeg: number; heightM: number };
}

function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, repeat: [number, number]): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

let seed = 7;
const rand = () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};

function woodFloor(): THREE.CanvasTexture {
  return canvasTexture(1024, 1024, (ctx) => {
    const rows = 8;
    const rh = 1024 / rows;
    for (let r = 0; r < rows; r++) {
      let x = -rand() * 400;
      while (x < 1024) {
        const len = 300 + rand() * 300;
        const l = 58 + rand() * 10;
        ctx.fillStyle = `hsl(30, ${32 + rand() * 10}%, ${l}%)`;
        ctx.fillRect(x, r * rh, len, rh);
        for (let i = 0; i < 14; i++) {
          ctx.strokeStyle = `rgba(90,55,30,${0.04 + rand() * 0.06})`;
          ctx.beginPath();
          const yy = r * rh + rand() * rh;
          ctx.moveTo(x, yy);
          ctx.bezierCurveTo(x + len / 3, yy + rand() * 6 - 3, x + (2 * len) / 3, yy + rand() * 6 - 3, x + len, yy);
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(60,35,20,0.35)';
        ctx.fillRect(x, r * rh, 2, rh);
        x += len;
      }
      ctx.fillStyle = 'rgba(60,35,20,0.3)';
      ctx.fillRect(0, r * rh, 1024, 2);
    }
  }, [3, 3]);
}

function stoneFloor(): THREE.CanvasTexture {
  return canvasTexture(1024, 1024, (ctx) => {
    const n = 4;
    const s = 1024 / n;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        ctx.fillStyle = `hsl(38, 18%, ${84 + rand() * 4}%)`;
        ctx.fillRect(i * s, j * s, s, s);
        for (let k = 0; k < 200; k++) {
          ctx.fillStyle = `rgba(120,100,80,${rand() * 0.05})`;
          ctx.fillRect(i * s + rand() * s, j * s + rand() * s, 3 + rand() * 6, 2 + rand() * 4);
        }
        ctx.strokeStyle = 'rgba(150,135,115,0.6)';
        ctx.lineWidth = 3;
        ctx.strokeRect(i * s, j * s, s, s);
      }
  }, [3, 3]);
}

function plaster(color: string): THREE.CanvasTexture {
  return canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 512, 512);
    for (let k = 0; k < 3000; k++) {
      ctx.fillStyle = `rgba(${rand() > 0.5 ? '255,255,255' : '0,0,0'},${rand() * 0.025})`;
      ctx.fillRect(rand() * 512, rand() * 512, 2 + rand() * 4, 2 + rand() * 4);
    }
  }, [4, 2]);
}

const std = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });

function box(w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

interface Shell {
  scene: THREE.Scene;
}

function roomShell(opts: {
  xMin: number; xMax: number; zBack: number; height: number;
  floor: THREE.Texture; wallColor: string; windowSide?: 'left' | 'right';
}): Shell {
  const scene = new THREE.Scene();
  const { xMin, xMax, zBack, height } = opts;
  const width = xMax - xMin;
  const depth = -zBack + 2;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), std('#ffffff', { map: opts.floor, roughness: 0.55 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set((xMin + xMax) / 2, 0, zBack + depth / 2);
  floor.receiveShadow = true;
  scene.add(floor);

  const wallMat = std('#ffffff', { map: plaster(opts.wallColor), roughness: 0.95 });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(width, height), wallMat);
  back.position.set((xMin + xMax) / 2, height / 2, zBack);
  back.receiveShadow = true;
  const left = new THREE.Mesh(new THREE.PlaneGeometry(depth, height), wallMat);
  left.rotation.y = Math.PI / 2;
  left.position.set(xMin, height / 2, zBack + depth / 2);
  left.receiveShadow = true;
  const right = left.clone();
  right.rotation.y = -Math.PI / 2;
  right.position.x = xMax;
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), std('#F7F4EE'));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set((xMin + xMax) / 2, height, zBack + depth / 2);
  scene.add(back, left, right, ceiling);

  // Rodapé
  const skirting = std('#F3EFE8');
  scene.add(box(width, 0.08, 0.015, skirting, (xMin + xMax) / 2, 0.04, zBack + 0.008));

  // Janela com luz natural
  const side = opts.windowSide ?? 'left';
  const wx = side === 'left' ? xMin + 0.01 : xMax - 0.01;
  const win = new THREE.Mesh(
    new THREE.PlaneGeometry(1.4, 1.6),
    new THREE.MeshBasicMaterial({ color: '#FFFDF6' }),
  );
  win.rotation.y = side === 'left' ? Math.PI / 2 : -Math.PI / 2;
  win.position.set(wx, 1.45, zBack + 1.8);
  scene.add(win);
  const frameMat = std('#FFFFFF', { roughness: 0.5 });
  const fx = side === 'left' ? xMin + 0.03 : xMax - 0.03;
  scene.add(box(0.04, 1.68, 0.05, frameMat, fx, 1.45, zBack + 1.8));
  scene.add(box(0.05, 0.05, 1.48, frameMat, fx, 1.45, zBack + 1.8));
  scene.add(box(0.05, 0.05, 1.48, frameMat, fx, 2.27, zBack + 1.8));
  scene.add(box(0.05, 0.05, 1.48, frameMat, fx, 0.63, zBack + 1.8));

  const hemi = new THREE.HemisphereLight('#FFF8EE', '#B8A48C', 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#FFF1DC', 2.4);
  sun.position.set(side === 'left' ? xMin - 3 : xMax + 3, 3.4, zBack + 2.6);
  sun.target.position.set((xMin + xMax) / 2, 0, zBack + 0.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -5;
  sun.shadow.camera.right = 5;
  sun.shadow.camera.top = 5;
  sun.shadow.camera.bottom = -5;
  sun.shadow.bias = -0.0004;
  sun.shadow.radius = 6;
  scene.add(sun, sun.target);
  const fill = new THREE.PointLight('#FFE7C8', 6, 9, 1.6);
  fill.position.set(0.5, 2.4, zBack + 2.2);
  scene.add(fill);
  return { scene };
}

function plant(scene: THREE.Scene, x: number, z: number) {
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.13, 0.38, 48), std('#D9D2C7', { roughness: 0.6 }));
  pot.position.set(x, 0.19, z);
  pot.castShadow = pot.receiveShadow = true;
  scene.add(pot);
  const leaf = std('#4F6B45', { roughness: 0.7 });
  for (let i = 0; i < 14; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.12 + rand() * 0.08, 16, 12), leaf);
    s.scale.set(1, 1.6, 0.5);
    const a = rand() * Math.PI * 2;
    const r = rand() * 0.22;
    s.position.set(x + Math.cos(a) * r, 0.6 + rand() * 0.75, z + Math.sin(a) * r);
    s.rotation.set(rand(), rand() * 3, rand());
    s.castShadow = true;
    scene.add(s);
  }
}

function frame(scene: THREE.Scene, x: number, y: number, z: number, w: number, h: number, art: string) {
  scene.add(box(w, h, 0.03, std('#2B2B2B', { roughness: 0.4 }), x, y, z + 0.015));
  const c = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.08, h - 0.08), std(art, { roughness: 0.9 }));
  c.position.set(x, y, z + 0.032);
  scene.add(c);
}

function livingRoom() {
  seed = 11;
  const zBack = -4.6;
  const { scene } = roomShell({ xMin: -2.6, xMax: 2.6, zBack, height: 2.8, floor: woodFloor(), wallColor: '#EEE8DF' });

  // Tapete
  const rug = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.01, 1.7), std('#D8CBB8', { roughness: 1 }));
  rug.position.set(-0.55, 0.005, -3.35);
  rug.receiveShadow = true;
  scene.add(rug);

  // Sofá
  const fabric = std('#B7AE9F', { roughness: 0.95 });
  const sx = -0.6;
  const sz = zBack + 0.45;
  scene.add(box(2.1, 0.22, 0.88, fabric, sx, 0.2, sz));
  scene.add(box(2.1, 0.5, 0.2, fabric, sx, 0.55, zBack + 0.12));
  scene.add(box(0.2, 0.3, 0.88, fabric, sx - 0.95, 0.45, sz));
  scene.add(box(0.2, 0.3, 0.88, fabric, sx + 0.95, 0.45, sz));
  scene.add(box(0.92, 0.12, 0.66, fabric, sx - 0.47, 0.37, sz + 0.08));
  scene.add(box(0.92, 0.12, 0.66, fabric, sx + 0.47, 0.37, sz + 0.08));
  const pillow = std('#152F8C', { roughness: 0.9 });
  const p = box(0.42, 0.38, 0.12, pillow, sx - 0.6, 0.62, zBack + 0.3);
  p.rotation.x = -0.2;
  scene.add(p);
  for (const dx of [-0.95, 0.95]) {
    for (const dz of [-0.35, 0.35]) scene.add(box(0.04, 0.09, 0.04, std('#3B2A1E'), sx + dx, 0.045, sz + dz));
  }

  // Mesa de centro (altura 40 cm)
  const wood = std('#8B5E3C', { roughness: 0.5 });
  const tz = -3.3;
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.04, 64), wood);
  top.position.set(-0.5, 0.38, tz);
  top.castShadow = top.receiveShadow = true;
  scene.add(top);
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.36, 48), wood);
  leg.position.set(-0.5, 0.18, tz);
  leg.castShadow = true;
  scene.add(leg);

  // Aparador (altura 80 cm)
  const az = zBack + 0.2;
  scene.add(box(1.2, 0.62, 0.4, std('#A57A52', { roughness: 0.55 }), 1.7, 0.49, az));
  for (const dx of [-0.56, 0.56]) for (const dz of [-0.16, 0.16]) scene.add(box(0.035, 0.18, 0.035, std('#2A2A2A'), 1.7 + dx, 0.09, az + dz));
  for (const dx of [-0.3, 0.3]) scene.add(box(0.58, 0.58, 0.005, std('#9A7049', { roughness: 0.5 }), 1.7 + dx, 0.49, az + 0.2));

  frame(scene, -0.6, 1.65, zBack, 1.1, 0.75, '#C9B8A0');
  frame(scene, 1.7, 1.55, zBack, 0.55, 0.7, '#E7A9C4');
  plant(scene, -2.15, zBack + 0.4);

  const refs: DemoRoomRef[] = [
    { label: 'Aparador — altura', lengthCm: 80, a: new THREE.Vector3(1.12, 0, az + 0.2), b: new THREE.Vector3(1.12, 0.8, az + 0.2) },
    { label: 'Mesa de centro — altura', lengthCm: 40, a: new THREE.Vector3(-0.5, 0, tz + 0.38), b: new THREE.Vector3(-0.5, 0.4, tz + 0.38) },
  ];
  return { scene, refs };
}

function entryHall() {
  seed = 23;
  const zBack = -3.6;
  const { scene } = roomShell({ xMin: -1.9, xMax: 1.9, zBack, height: 2.7, floor: stoneFloor(), wallColor: '#E9E4DA', windowSide: 'right' });

  // Aparador estreito (altura 85 cm)
  const cx = -0.45;
  const cz = zBack + 0.18;
  const oak = std('#C49A6C', { roughness: 0.5 });
  scene.add(box(1.3, 0.05, 0.35, oak, cx, 0.825, cz));
  scene.add(box(1.3, 0.04, 0.33, oak, cx, 0.2, cz));
  for (const dx of [-0.62, 0.62]) for (const dz of [-0.15, 0.15]) scene.add(box(0.04, 0.8, 0.04, std('#1F1F1F', { roughness: 0.4 }), cx + dx, 0.4, cz + dz));

  // Espelho redondo
  const mirrorFrame = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.02, 16, 96), std('#B8925A', { metalness: 1, roughness: 0.3 }));
  mirrorFrame.position.set(cx, 1.55, zBack + 0.02);
  scene.add(mirrorFrame);
  const mirror = new THREE.Mesh(new THREE.CircleGeometry(0.4, 96), std('#C9D2D6', { metalness: 0.9, roughness: 0.08 }));
  mirror.position.set(cx, 1.55, zBack + 0.015);
  scene.add(mirror);

  // Porta (210 cm)
  const doorX = 1.05;
  scene.add(box(0.9, 2.1, 0.03, std('#F6F3EE', { roughness: 0.5 }), doorX, 1.05, zBack + 0.02));
  scene.add(box(1.0, 0.05, 0.05, std('#FFFFFF'), doorX, 2.125, zBack + 0.03));
  scene.add(box(0.05, 2.15, 0.05, std('#FFFFFF'), doorX - 0.475, 1.075, zBack + 0.03));
  scene.add(box(0.05, 2.15, 0.05, std('#FFFFFF'), doorX + 0.475, 1.075, zBack + 0.03));
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), std('#B8925A', { metalness: 1, roughness: 0.3 }));
  knob.position.set(doorX - 0.35, 1.0, zBack + 0.06);
  scene.add(knob);

  // Banco
  scene.add(box(0.9, 0.06, 0.36, oak, -1.2, 0.44, -1.9).rotateY(Math.PI / 2));
  for (const dz of [-0.4, 0.4]) scene.add(box(0.3, 0.42, 0.04, std('#1F1F1F'), -1.2, 0.21, -1.9 + dz).rotateY(Math.PI / 2));

  const rug = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.01, 1.8), std('#2C3F86', { roughness: 1 }));
  rug.position.set(0.1, 0.005, -2.2);
  rug.receiveShadow = true;
  scene.add(rug);

  const refs: DemoRoomRef[] = [
    { label: 'Aparador — altura', lengthCm: 85, a: new THREE.Vector3(cx + 0.64, 0, cz + 0.175), b: new THREE.Vector3(cx + 0.64, 0.85, cz + 0.175) },
    { label: 'Porta — altura', lengthCm: 210, a: new THREE.Vector3(doorX - 0.45, 0, zBack + 0.035), b: new THREE.Vector3(doorX - 0.45, 2.1, zBack + 0.035) },
  ];
  return { scene, refs };
}

function bedroom() {
  seed = 41;
  const zBack = -4.2;
  const { scene } = roomShell({ xMin: -2.4, xMax: 2.4, zBack, height: 2.7, floor: woodFloor(), wallColor: '#E6E1DA' });

  const bx = -0.35;
  // Cabeceira
  scene.add(box(1.9, 1.15, 0.08, std('#C8BBA8', { roughness: 0.95 }), bx, 0.575, zBack + 0.04));
  // Cama
  scene.add(box(1.7, 0.3, 2.0, std('#8B6A4C', { roughness: 0.6 }), bx, 0.18, zBack + 1.08));
  scene.add(box(1.62, 0.2, 1.95, std('#F5F1EA', { roughness: 0.95 }), bx, 0.43, zBack + 1.08));
  scene.add(box(1.66, 0.06, 1.2, std('#152F8C', { roughness: 0.95 }), bx, 0.55, zBack + 1.45));
  for (const dx of [-0.42, 0.42]) {
    const pl = box(0.62, 0.16, 0.34, std('#FBF8F2', { roughness: 0.95 }), bx + dx, 0.6, zBack + 0.32);
    pl.rotation.x = -0.15;
    scene.add(pl);
  }

  // Criados-mudos (altura 55 cm)
  const nsMat = std('#A57A52', { roughness: 0.55 });
  const nz = zBack + 0.25;
  for (const nx of [bx - 1.25, bx + 1.25]) {
    scene.add(box(0.45, 0.4, 0.4, nsMat, nx, 0.35, nz));
    for (const dx of [-0.19, 0.19]) for (const dz of [-0.16, 0.16]) scene.add(box(0.03, 0.15, 0.03, std('#2A2A2A'), nx + dx, 0.075, nz + dz));
  }

  frame(scene, bx, 1.75, zBack, 1.3, 0.6, '#D7C5B0');
  plant(scene, 1.95, zBack + 0.45);

  const refs: DemoRoomRef[] = [
    { label: 'Criado-mudo — altura', lengthCm: 55, a: new THREE.Vector3(bx + 1.025, 0, nz + 0.2), b: new THREE.Vector3(bx + 1.025, 0.55, nz + 0.2) },
  ];
  return { scene, refs };
}

export const DEMO_ROOMS: DemoRoomSpec[] = [
  { id: 'demo-sala', name: 'Sala de estar', build: livingRoom, camera: { fovDeg: 50, pitchDeg: 0, heightM: 1.2 } },
  { id: 'demo-hall', name: 'Hall de entrada', build: entryHall, camera: { fovDeg: 50, pitchDeg: 0, heightM: 1.3 } },
  { id: 'demo-quarto', name: 'Quarto', build: bedroom, camera: { fovDeg: 50, pitchDeg: 0, heightM: 1.25 } },
];
