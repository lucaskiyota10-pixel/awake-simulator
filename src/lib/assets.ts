import type { AssetRef } from '../types';
import { db, uid } from './db';

/** Salva um arquivo (foto original, PNG, GLB) sem modificá-lo. */
export async function saveAsset(blob: Blob): Promise<AssetRef> {
  const assetId = uid('asset_');
  await db.put('assets', assetId, blob);
  return { kind: 'local', assetId };
}

export async function deleteAsset(ref: AssetRef | undefined): Promise<void> {
  if (ref?.kind === 'local') await db.delete('assets', ref.assetId);
}

export async function getAssetBlob(ref: AssetRef): Promise<Blob> {
  if (ref.kind === 'url') {
    const res = await fetch(ref.url);
    if (!res.ok) throw new Error(`Falha ao carregar ${ref.url}`);
    return res.blob();
  }
  const blob = await db.get<Blob>('assets', ref.assetId);
  if (!blob) throw new Error('Arquivo não encontrado no armazenamento local.');
  return blob;
}

const urlCache = new Map<string, Promise<string>>();

/** URL utilizável em <img>/loader. Assets locais viram object URLs (cacheadas). */
export function resolveAssetUrl(ref: AssetRef): Promise<string> {
  if (ref.kind === 'url') return Promise.resolve(ref.url);
  let p = urlCache.get(ref.assetId);
  if (!p) {
    p = getAssetBlob(ref).then((b) => URL.createObjectURL(b));
    urlCache.set(ref.assetId, p);
  }
  return p;
}
