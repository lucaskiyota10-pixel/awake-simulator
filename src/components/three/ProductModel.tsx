import { useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

export interface ModelFitInfo {
  /** Dimensões do modelo após escalar pela altura cadastrada (cm). */
  widthCm: number;
  depthCm: number;
  heightCm: number;
}

/**
 * Carrega um GLB/GLTF e o normaliza para as DIMENSÕES CADASTRADAS:
 * escala uniforme para que a altura do modelo seja exatamente a altura do
 * produto, base apoiada em y = 0 e centralizado em x/z. Unidades: metros.
 */
export function ProductModel({
  url,
  heightCm,
  onFit,
}: {
  url: string;
  heightCm: number;
  onFit?: (info: ModelFitInfo) => void;
}) {
  const gltf = useGLTF(url, false);
  const { object, info } = useMemo(() => {
    const model = gltf.scene.clone(true);
    const wrapper = new THREE.Group();
    wrapper.add(model);
    wrapper.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const s = heightCm / 100 / (size.y || 1);
    // Escala o wrapper e desloca o conteúdo para que a base fique em y = 0.
    model.position.sub(new THREE.Vector3(center.x, box.min.y, center.z));
    wrapper.scale.setScalar(s);
    model.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    const outer = new THREE.Group();
    outer.add(wrapper);
    return { object: outer, info: { widthCm: size.x * s * 100, depthCm: size.z * s * 100, heightCm } };
  }, [gltf, heightCm]);

  useEffect(() => {
    onFit?.(info);
  }, [info, onFit]);

  return <primitive object={object} />;
}
