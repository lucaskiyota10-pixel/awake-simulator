import { db, uid } from '../lib/db';
import { saveAsset, deleteAsset } from '../lib/assets';
import { imageSizeOf } from '../lib/image';
import { DEMO_ROOMS } from '../demo/seed';
import type { Calibration, Room, RoomSource } from '../types';

export async function listUserRooms(): Promise<Room[]> {
  const rooms = await db.getAll<Room>('rooms');
  return rooms.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getRoom(id: string): Promise<Room | undefined> {
  return DEMO_ROOMS.find((r) => r.id === id) ?? db.get<Room>('rooms', id);
}

/** Armazena a foto exatamente como enviada (o arquivo original não é alterado). */
export async function createRoomFromFile(file: Blob, source: RoomSource, name?: string): Promise<Room> {
  if (!file.type.startsWith('image/')) throw new Error('Envie um arquivo de imagem (JPG, PNG, HEIC convertido, WEBP).');
  const { width, height } = await imageSizeOf(file);
  const image = await saveAsset(file);
  const room: Room = {
    id: uid('room_'),
    name: name ?? (source === 'camera' ? 'Foto da câmera' : 'Meu ambiente'),
    source,
    image,
    width,
    height,
    createdAt: Date.now(),
  };
  await db.put('rooms', room.id, room);
  return room;
}

export async function deleteRoom(room: Room): Promise<void> {
  if (room.source === 'demo') return;
  await deleteAsset(room.image);
  await db.delete('rooms', room.id);
  await db.delete('meta', `calibration:${room.id}`);
}

export async function loadCalibration(roomId: string): Promise<Calibration> {
  return (await db.get<Calibration>('meta', `calibration:${roomId}`)) ?? { references: [] };
}

export async function saveCalibration(roomId: string, calibration: Calibration): Promise<void> {
  await db.put('meta', `calibration:${roomId}`, calibration);
}
