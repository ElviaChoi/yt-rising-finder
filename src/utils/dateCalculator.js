import { differenceInHours, parseISO } from 'date-fns';

export const calculateHourlyViews = (views, publishedAt) => {
  try {
    const publishedDate = parseISO(publishedAt);
    const hoursDiff = Math.max(differenceInHours(new Date(), publishedDate), 1);
    return Math.round(Number(views || 0) / hoursDiff);
  } catch {
    return 0;
  }
};

export const getDateRange = (duration) => {
  const now = new Date();
  const startDate = new Date(now);
  const days = Number(duration);

  if (!Number.isNaN(days)) {
    startDate.setDate(now.getDate() - days);
  } else {
    switch (duration) {
      case '7':
      case '1주일':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30':
      case '1개월':
        startDate.setDate(now.getDate() - 30);
        break;
      case '180':
      case '6개월':
        startDate.setDate(now.getDate() - 180);
        break;
      case '90':
      case '3개월':
      default:
        startDate.setDate(now.getDate() - 90);
        break;
    }
  }

  return {
    publishedAfter: startDate.toISOString(),
    publishedBefore: now.toISOString(),
  };
};

export const getDaysSinceUpload = (publishedAt) => {
  try {
    const diff = new Date().getTime() - parseISO(publishedAt).getTime();
    return Math.max(Math.floor(diff / (1000 * 60 * 60 * 24)), 0);
  } catch {
    return 0;
  }
};

export const parseDuration = (duration) => {
  try {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = Number(match[1] || 0);
    const minutes = Number(match[2] || 0);
    const seconds = Number(match[3] || 0);

    return Math.round((hours * 60 + minutes + seconds / 60) * 10) / 10;
  } catch {
    return 0;
  }
};

export const parseDurationMinSec = (duration) => {
  try {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return '0:00';

    const hours = Number(match[1] || 0);
    const minutes = Number(match[2] || 0);
    const seconds = Number(match[3] || 0);
    const totalMinutes = hours * 60 + minutes;

    return `${totalMinutes}:${seconds.toString().padStart(2, '0')}`;
  } catch {
    return '0:00';
  }
};

export const formatDate = (dateString) => {
  try {
    return parseISO(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return dateString;
  }
};
