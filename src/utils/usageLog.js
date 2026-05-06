import { USAGE_LOG_STORE, dbPromise } from './appDb';

export const getUsageLogs = async () => {
  const db = await dbPromise;
  return db.getAll(USAGE_LOG_STORE);
};

export const getReviewedVideoIds = async () => {
  const logs = await getUsageLogs();
  return logs.map((log) => log.videoId);
};

export const upsertUsageLog = async (entry) => {
  const db = await dbPromise;
  await db.put(USAGE_LOG_STORE, {
    ...entry,
    checkedAt: new Date().toISOString(),
  });
};

export const deleteUsageLog = async (videoId) => {
  const db = await dbPromise;
  await db.delete(USAGE_LOG_STORE, videoId);
};
