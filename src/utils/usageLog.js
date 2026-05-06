import { USAGE_LOG_STORE, dbPromise } from './appDb';
import { saveCandidateSnapshot } from './candidateSnapshots';
import { getVideoMetrics } from './videoMetrics';

export const getUsageLogs = async () => {
  const db = await dbPromise;
  return db.getAll(USAGE_LOG_STORE);
};

export const getReviewedVideoIds = async () => {
  const logs = await getUsageLogs();
  return logs
    .filter((log) => log.isReviewed === true || (log.isReviewed == null && log.isTracked == null && log.isSaved == null))
    .map((log) => log.videoId);
};

export const getTrackedVideoIds = async () => {
  const logs = await getUsageLogs();
  return logs.filter((log) => log.isTracked === true).map((log) => log.videoId);
};

export const createUsageSnapshot = (video, context = {}) => {
  const metrics = video.metrics || getVideoMetrics(video);

  return {
    videoId: video.videoId,
    channelId: video.snippet?.channelId || video.channelId,
    snapshotAt: new Date().toISOString(),
    title: video.snippet?.title || video.title || '',
    channelTitle: video.snippet?.channelTitle || video.channelTitle || '',
    searchedKeyword: video.searchedKeyword || '',
    searchedKeywordNote: video.searchedKeywordNote || '',
    categoryId: context.categoryId || video.categoryId || '',
    activeTab: context.activeTab || video.activeTab || '',
    viewCount: metrics.views,
    subscriberCount: metrics.subscribers,
    commentCount: metrics.comments,
    hourlyViews: metrics.hourlyViews,
    viewSubscriberRatio: metrics.viewSubscriberRatio,
    commentRate: metrics.commentRate,
    durationMinutes: metrics.durationMinutes,
    daysSinceUpload: metrics.daysSinceUpload,
    score: metrics.risingScore,
    hasHiddenSubscribers: metrics.hasHiddenSubscribers,
  };
};

export const upsertUsageLog = async (entry) => {
  const db = await dbPromise;
  const existing = await db.get(USAGE_LOG_STORE, entry.videoId);
  const now = new Date().toISOString();
  const nextEntry = {
    ...existing,
    ...entry,
    updatedAt: now,
  };

  if (Object.prototype.hasOwnProperty.call(entry, 'isReviewed')) {
    nextEntry.checkedAt = entry.isReviewed ? now : null;
  }

  if (Object.prototype.hasOwnProperty.call(entry, 'isTracked')) {
    nextEntry.trackedAt = entry.isTracked ? now : null;
  }

  if (Object.prototype.hasOwnProperty.call(entry, 'isSaved')) {
    nextEntry.savedAt = entry.isSaved ? now : null;
  }

  await db.put(USAGE_LOG_STORE, nextEntry);

  if (entry.snapshotAt) {
    await saveCandidateSnapshot(nextEntry);
  }
};

export const deleteUsageLog = async (videoId) => {
  const db = await dbPromise;
  await db.delete(USAGE_LOG_STORE, videoId);
};
