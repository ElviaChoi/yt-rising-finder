import { calculateHourlyViews, getDaysSinceUpload, parseDuration } from './dateCalculator';

const curiosityWords = [
  '왜',
  '어떻게',
  '진짜',
  '이유',
  '몰랐던',
  '뜻밖의',
  '비밀',
  '가능했을까',
  '무엇',
  '사람들은',
  '조선시대',
  '옛날',
];

export const getVideoMetrics = (video) => {
  const views = Number(video.statistics?.viewCount || 0);
  const comments = Number(video.statistics?.commentCount || 0);
  const subscribers = Number(video.channelSubscribers || 0);
  const durationMinutes = parseDuration(video.contentDetails?.duration || 'PT0M');
  const hourlyViews = calculateHourlyViews(views, video.snippet.publishedAt);
  const daysSinceUpload = getDaysSinceUpload(video.snippet.publishedAt);
  const viewSubscriberRatio = views / Math.max(subscribers, 1000);
  const commentRate = comments / Math.max(views, 1);
  const title = video.snippet.title || '';
  const curiosityHitCount = curiosityWords.filter((word) => title.includes(word)).length;

  const smallChannelBoost = subscribers <= 10000 ? 25 : subscribers <= 50000 ? 10 : 0;
  const freshnessBoost = daysSinceUpload <= 30 ? 18 : daysSinceUpload <= 90 ? 10 : 0;
  const durationBoost = durationMinutes >= 8 && durationMinutes <= 70 ? 8 : 0;
  const curiosityBoost = curiosityHitCount * 4;

  const risingScore = Math.round(
    viewSubscriberRatio * 18 +
      Math.log10(views + 10) * 9 +
      Math.log10(hourlyViews + 10) * 11 +
      Math.log10(comments + 10) * 6 +
      commentRate * 600 +
      smallChannelBoost +
      freshnessBoost +
      durationBoost +
      curiosityBoost
  );

  return {
    views,
    comments,
    subscribers,
    durationMinutes,
    hourlyViews,
    daysSinceUpload,
    viewSubscriberRatio,
    commentRate,
    risingScore,
    curiosityHitCount,
  };
};

export const enrichVideo = (video, searchedKeyword = '') => {
  const metrics = getVideoMetrics(video);
  return {
    ...video,
    searchedKeyword,
    metrics,
    risingScore: metrics.risingScore,
  };
};
