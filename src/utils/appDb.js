import { openDB } from 'idb';

export const DB_NAME = 'yt-rising-finder';
export const DB_VERSION = 3;
export const CACHE_STORE = 'apiCache';
export const USAGE_LOG_STORE = 'usageLog';
export const CANDIDATE_SNAPSHOT_STORE = 'candidateSnapshots';

export const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(CACHE_STORE)) {
      db.createObjectStore(CACHE_STORE);
    }

    if (!db.objectStoreNames.contains(USAGE_LOG_STORE)) {
      db.createObjectStore(USAGE_LOG_STORE, { keyPath: 'videoId' });
    }

    if (!db.objectStoreNames.contains(CANDIDATE_SNAPSHOT_STORE)) {
      const snapshotStore = db.createObjectStore(CANDIDATE_SNAPSHOT_STORE, {
        keyPath: ['videoId', 'snapshotAt'],
      });
      snapshotStore.createIndex('videoId', 'videoId');
      snapshotStore.createIndex('snapshotAt', 'snapshotAt');
    }
  },
});
