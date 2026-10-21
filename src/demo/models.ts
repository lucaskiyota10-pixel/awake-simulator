import * as THREE from 'three';

/**
 * Modelos 3D de demonstração, construídos proceduralmente.
 * Usados APENAS pelo script `npm run generate:assets`, que exporta cada
 * modelo para GLB e renderiza a foto do produto com fundo transparente.
 * Unidades: metros. Base do objeto em y = 0, centralizado em x/z.
 */

export interface DemoModelSpec {
  id: string;
  heightCm: number;
  widthCm: number;
  depthCm: number;
  /** false = produto só com foto (demonstra a limitação sem modelo 3D). */
  exportModel: boolean;
  build: () => THREE.Object3D;
}

const mat = (color: string, opts: Partial<THREE.MeshPhysicalMaterialParameters> = {}) =>
  new THREE.MeshPhysicalMaterial({ color, roughness: 0.55, metalness: 0, ...opts });

function lathe(profile: [number, number][], segments = 96): THREE.LatheGeometry {
  return new THREE.LatheGeometry(
    profile.map(([r, y]) => new THREE.Vector2(r, y)),
    segments,
  );
}

function mesh(geo: THREE.BufferGeometry, material: THREE.Material, name?: string): THREE.Mesh {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = true;
  m.receiveShadow = true;
  if (name) m.name = name;
  return m;
}

/** Ajusta o objeto para ocupar exatamente largura × altura × profundidade. */
export function fitToDimensions(obj: THREE.Object3D, wCm: number, hCm: number, dCm: number): THREE.Group {
  const inner = new THREE.Group();
  inner.add(obj);
  const box = new THREE.Box3().setFromObject(inner);
  const size = box.getSize(new THREE.Vector3());
  inner.scale.set(wCm / 100 / size.x, hCm / 100 / size.y, dCm / 100 / size.z);
  inner.updateMatrixWorld(true);
  const box2 = new THREE.Box3().setFromObject(inner);
  const center = box2.getCenter(new THREE.Vector3());
  inner.position.set(-center.x, -box2.min.y, -center.z);
  const root = new THREE.Group();
  root.add(inner);
  return root;
}

function ondaSculpture(): THREE.Object3D {
  const g = new THREE.Group();
  const knot = mesh(new THREE.TorusKnotGeometry(0.075, 0.026, 260, 40, 2, 3), mat('#EEE7DB', { roughness: 0.35, clearcoat: 0.4 }));
  knot.rotation.x = Math.PI / 2.4;
  knot.updateMatrixWorld(true);
  // apoia o nó sobre a base (encaixe de 1 cm)
  knot.position.y = 0.03 - new THREE.Box3().setFromObject(knot).min.y;
  const base = mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.04, 64), mat('#2A2A2A', { roughness: 0.4 }));
  base.position.y = 0.02;
  g.add(knot, base);
  return g;
}

function gotaSculpture(): THREE.Object3D {
  const pts: [number, number][] = [];
  for (let i = 0; i <= 48; i++) {
    const t = i / 48;
    const r = Math.sin(Math.PI * t) * Math.pow(1 - t, 0.9) * 0.11 + (t < 0.02 ? 0.02 : 0);
    pts.push([Math.max(r, 0.0001), t * 0.3]);
  }
  pts[0] = [0.0001, 0];
  pts.splice(1, 0, [0.03, 0]);
  return mesh(lathe(pts), mat('#C2694A', { roughness: 0.25, clearcoat: 0.8, clearcoatRoughness: 0.2 }));
}

function arcoSculpture(): THREE.Object3D {
  const g = new THREE.Group();
  const stone = mat('#D8C8AE', { roughness: 0.8 });
  const shape = new THREE.Shape();
  const R = 0.12;
  const r = 0.07;
  shape.absarc(0, 0, R, 0, Math.PI, false);
  shape.lineTo(-r, 0);
  shape.absarc(0, 0, r, Math.PI, 0, true);
  shape.lineTo(R, 0);
  const arch = mesh(
    new THREE.ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, curveSegments: 64 }),
    stone,
  );
  arch.position.set(0, 0.03, -0.04);
  const base = mesh(new THREE.BoxGeometry(0.28, 0.03, 0.1), stone);
  base.position.y = 0.015;
  g.add(arch, base);
  return g;
}

function esferasSculpture(): THREE.Object3D {
  const g = new THREE.Group();
  const wood = mat('#9B6A42', { roughness: 0.6 });
  let y = 0;
  for (const r of [0.09, 0.07, 0.05]) {
    const s = mesh(new THREE.SphereGeometry(r, 64, 48), wood);
    s.position.y = y + r * 0.92;
    y += r * 1.84;
    g.add(s);
  }
  return g;
}

function luaLamp(): THREE.Object3D {
  const g = new THREE.Group();
  const brass = mat('#B8925A', { metalness: 1, roughness: 0.3 });
  const base = mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.025, 64), brass);
  base.position.y = 0.0125;
  const stem = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 24), brass);
  stem.position.y = 0.025 + 0.08;
  const globe = mesh(
    new THREE.SphereGeometry(0.15, 64, 48),
    mat('#FFF7E6', { roughness: 0.6, emissive: new THREE.Color('#FFE9C2'), emissiveIntensity: 0.9 }),
    'globe',
  );
  globe.position.y = 0.185 + 0.13;
  g.add(base, stem, globe);
  return g;
}

function arcoLamp(): THREE.Object3D {
  const g = new THREE.Group();
  const black = mat('#1E1E1E', { metalness: 0.6, roughness: 0.4 });
  const marble = mat('#EDEAE4', { roughness: 0.3 });
  const base = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 64), marble);
  base.position.set(-0.36, 0.025, 0);
  const curve = new THREE.CubicBezierCurve3(
    new THREE.Vector3(-0.36, 0.05, 0),
    new THREE.Vector3(-0.36, 1.6, 0),
    new THREE.Vector3(0.35, 2.0, 0),
    new THREE.Vector3(0.42, 1.5, 0),
  );
  const tube = mesh(new THREE.TubeGeometry(curve, 160, 0.012, 16, false), black);
  const shade = mesh(
    new THREE.CylinderGeometry(0.07, 0.2, 0.22, 64, 1, true),
    mat('#EFE6D6', { side: THREE.DoubleSide, roughness: 0.9, emissive: new THREE.Color('#FFE3B0'), emissiveIntensity: 0.35 }),
    'shade',
  );
  shade.position.set(0.42, 1.43, 0);
  g.add(base, tube, shade);
  return g;
}

function anforaVase(): THREE.Object3D {
  const profile: [number, number][] = [
    [0.0001, 0], [0.06, 0], [0.065, 0.01], [0.1, 0.08], [0.12, 0.17], [0.11, 0.25],
    [0.07, 0.31], [0.05, 0.34], [0.055, 0.37], [0.06, 0.38], [0.05, 0.38], [0.045, 0.35], [0.0001, 0.35],
  ];
  return mesh(lathe(profile), mat('#22409A', { roughness: 0.3, clearcoat: 0.6 }));
}

function caneladoVase(): THREE.Object3D {
  const geo = new THREE.CylinderGeometry(0.15, 0.12, 0.7, 192, 40, false);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const r = Math.hypot(v.x, v.z);
    if (r < 1e-4) continue;
    const theta = Math.atan2(v.z, v.x);
    const t = (v.y + 0.35) / 0.7;
    const bulge = 1 + 0.12 * Math.sin(Math.PI * t);
    const flute = 1 + 0.035 * Math.abs(Math.cos(12 * theta));
    const k = bulge * flute;
    pos.setXYZ(i, v.x * k, v.y, v.z * k);
  }
  geo.computeVertexNormals();
  const m = mesh(geo, mat('#E8E1D4', { roughness: 0.7 }));
  m.position.y = 0.35;
  return m;
}

function vela(): THREE.Object3D {
  const g = new THREE.Group();
  const cup = mesh(
    lathe([[0.0001, 0], [0.04, 0], [0.04, 0.1], [0.036, 0.1], [0.036, 0.006], [0.0001, 0.006]], 64),
    mat('#F4EFE6', { roughness: 0.4 }),
  );
  const wax = mesh(new THREE.CylinderGeometry(0.0355, 0.0355, 0.07, 64), mat('#FBF6EE', { roughness: 0.8 }));
  wax.position.y = 0.006 + 0.035;
  const band = mesh(new THREE.CylinderGeometry(0.0405, 0.0405, 0.03, 64, 1, true), mat('#152F8C', { roughness: 0.6 }));
  band.position.y = 0.05;
  const wick = mesh(new THREE.CylinderGeometry(0.0012, 0.0012, 0.012, 8), mat('#222'));
  wick.position.y = 0.082;
  g.add(cup, wax, band, wick);
  return g;
}

function folhaSculpture(): THREE.Object3D {
  const g = new THREE.Group();
  const gold = mat('#C9A24C', { metalness: 1, roughness: 0.28 });
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(0.14, 0.08, 0.13, 0.32, 0, 0.42);
  s.bezierCurveTo(-0.13, 0.32, -0.14, 0.08, 0, 0);
  const leaf = mesh(new THREE.ExtrudeGeometry(s, { depth: 0.01, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, curveSegments: 48 }), gold);
  leaf.position.set(0, 0.08, -0.005);
  leaf.rotation.z = -0.25;
  const stem = mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.09, 16), gold);
  stem.position.y = 0.045 + 0.02;
  const base = mesh(new THREE.BoxGeometry(0.14, 0.02, 0.07), mat('#1F1F1F', { roughness: 0.35 }));
  base.position.y = 0.01;
  g.add(leaf, stem, base);
  return g;
}

export const DEMO_MODELS: DemoModelSpec[] = [
  { id: 'escultura-onda', heightCm: 42, widthCm: 20, depthCm: 20, exportModel: true, build: ondaSculpture },
  { id: 'escultura-gota', heightCm: 30, widthCm: 16, depthCm: 16, exportModel: true, build: gotaSculpture },
  { id: 'escultura-arco', heightCm: 35, widthCm: 28, depthCm: 10, exportModel: true, build: arcoSculpture },
  { id: 'escultura-esferas', heightCm: 40, widthCm: 18, depthCm: 18, exportModel: true, build: esferasSculpture },
  { id: 'luminaria-lua', heightCm: 45, widthCm: 30, depthCm: 30, exportModel: true, build: luaLamp },
  { id: 'luminaria-arco', heightCm: 180, widthCm: 115, depthCm: 40, exportModel: true, build: arcoLamp },
  { id: 'vaso-anfora', heightCm: 38, widthCm: 24, depthCm: 24, exportModel: true, build: anforaVase },
  { id: 'vaso-canelado', heightCm: 70, widthCm: 34, depthCm: 34, exportModel: true, build: caneladoVase },
  { id: 'vela-copo', heightCm: 10, widthCm: 8, depthCm: 8, exportModel: true, build: vela },
  { id: 'escultura-folha', heightCm: 50, widthCm: 26, depthCm: 8, exportModel: false, build: folhaSculpture },
];
