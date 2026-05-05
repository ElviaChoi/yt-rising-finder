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
  const hasHiddenSubscribers = Boolean(video.hiddenSubscriberCount);
  const subscribers = hasHiddenSubscribers ? null : Number(video.channelSubscribers || 0);
  const subscriberBase = subscribers == null ? 10000 : Math.max(subscribers, 1000);
  const durationMinutes = parseDuration(video.contentDetails?.duration || 'PT0M');
  const hourlyViews = calculateHourlyViews(views, video.snippet.publishedAt);
  const daysSinceUpload = getDaysSinceUpload(video.snippet.publishedAt);
  const viewSubscriberRatio = views / subscriberBase;
  const cappedViewSubscriberRatio = Math.min(viewSubscriberRatio, 20);
  const commentRate = comments / Math.max(views, 1);
  const title = video.snippet.title || '';
  const curiosityHitCount = curiosityWords.filter((word) => title.includes(word)).length;

  const subscriberBucket = hasHiddenSubscribers
    ? 'hidden'
    : subscribers <= 10000
      ? 'strong'
      : subscribers <= 30000
        ? 'reference'
        : 'large';
  const smallChannelBoost = subscriberBucket === 'strong' ? 28 : subscriberBucket === 'reference' ? 10 : 0;
  const freshnessBoost = daysSinceUpload <= 30 ? 22 : daysSinceUpload <= 90 ? 12 : 0;
  const durationBoost = durationMinutes >= 12 && durationMinutes <= 40 ? 12 : durationMinutes >= 40 && durationMinutes <= 70 ? 6 : 0;
  const curiosityBoost = curiosityHitCount * 4;

  const opportunityScore = Math.round(
    Math.log10(hourlyViews + 10) * 26 +
      cappedViewSubscriberRatio * 12 +
      Math.log10(views + 10) * 8 +
      Math.log10(comments + 10) * 5 +
      Math.min(commentRate * 800, 35) +
      smallChannelBoost +
      freshnessBoost +
      durationBoost +
      curiosityBoost
  );

  return {
    views,
    comments,
    subscribers,
    hasHiddenSubscribers,
    subscriberBucket,
    durationMinutes,
    hourlyViews,
    daysSinceUpload,
    viewSubscriberRatio,
    cappedViewSubscriberRatio,
    commentRate,
    opportunityScore,
    risingScore: opportunityScore,
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
