import { openDB } from 'idb';

const DB_NAME = 'yt-rising-finder';
const DB_VERSION = 1;
const CACHE_STORE = 'apiCache';

export const CACHE_TTL = {
  search: 72 * 60 * 60 * 1000,
  videos: 24 * 60 * 60 * 1000,
  channels: 7 * 24 * 60 * 60 * 1000,
};

const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(CACHE_STORE)) {
      db.createObjectStore(CACHE_STORE);
    }
  },
});

const normalizeValue = (value) => {
  if (Array.isArray(value)) return value.map(normalizeValue);
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        if (value[key] !== undefined && value[key] !== null && value[key] !== '') {
          acc[key] = normalizeValue(value[key]);
        }
        return acc;
      }, {});
  }
  return value;
};

export const makeCacheKey = (type, params) => `${type}:${JSON.stringify(normalizeValue(params))}`;

export const getCachedValue = async (key) => {
  const db = await dbPromise;
  const record = await db.get(CACHE_STORE, key);
  if (!record) return null;

  if (record.expiresAt <= Date.now()) {
    await db.delete(CACHE_STORE, key);
    return null;
  }

  return record.value;
};

export const setCachedValue = async (key, value, ttl) => {
  const db = await dbPromise;
  await db.put(
    CACHE_STORE,
    {
      value,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttl,
    },
    key
  );
};

export const clearApiCache = async () => {
  const db = await dbPromise;
  await db.clear(CACHE_STORE);
};
