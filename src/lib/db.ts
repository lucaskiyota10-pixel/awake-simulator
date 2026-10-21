/**
 * Armazenamento local do protótipo (IndexedDB). Guarda produtos, ambientes,
 * composições e os arquivos binários (fotos originais, PNGs, GLBs).
 */
const DB_NAME = 'awake-simulador';
const DB_VERSION = 1;
export const STORES = ['products', 'rooms', 'compositions', 'assets', 'meta'] as const;
export type StoreName = (typeof STORES)[number];

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        for (const s of STORES) if (!db.objectStoreNames.contains(s)) db.createObjectStore(s);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function wrap<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function store(name: StoreName, mode: IDBTransactionMode): Promise<IDBObjectStore> {
  const db = await openDb();
  return db.transaction(name, mode).objectStore(name);
}

export const db = {
  async get<T>(name: StoreName, key: string): Promise<T | undefined> {
    return wrap((await store(name, 'readonly')).get(key)) as Promise<T | undefined>;
  },
  async getAll<T>(name: StoreName): Promise<T[]> {
    return wrap((await store(name, 'readonly')).getAll()) as Promise<T[]>;
  },
  async put<T>(name: StoreName, key: string, value: T): Promise<void> {
    await wrap((await store(name, 'readwrite')).put(value, key));
  },
  async delete(name: StoreName, key: string): Promise<void> {
    await wrap((await store(name, 'readwrite')).delete(key));
  },
  async clear(name: StoreName): Promise<void> {
    await wrap((await store(name, 'readwrite')).clear());
  },
};

export function uid(prefix = ''): string {
  const rnd = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36);
  return prefix + rnd;
}
