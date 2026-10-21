import { db, uid } from '../lib/db';
import { saveAsset, deleteAsset } from '../lib/assets';
import type { Composition } from '../types';

export async function saveComposition(data: Omit<Composition, 'id' | 'createdAt' | 'renderAssetId'>, render: Blob): Promise<Composition> {
  const asset = await saveAsset(render);
  const comp: Composition = {
    ...data,
    id: uid('comp_'),
    renderAssetId: asset.kind === 'local' ? asset.assetId : '',
    createdAt: Date.now(),
  };
  await db.put('compositions', comp.id, comp);
  return comp;
}

export async function listCompositions(): Promise<Composition[]> {
  return (await db.getAll<Composition>('compositions')).sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteComposition(c: Composition): Promise<void> {
  await deleteAsset({ kind: 'local', assetId: c.renderAssetId });
  await db.delete('compositions', c.id);
}
