import { differenceInHours, parseISO } from 'date-fns';

// 시간당 조회수 계산
export const calculateHourlyViews = (views, publishedAt) => {
  try {
    const publishedDate = parseISO(publishedAt);
    const now = new Date();
    const hoursDiff = differenceInHours(now, publishedDate);
    
    if (hoursDiff <= 0) return 0;
    return Math.round(views / hoursDiff);
  } catch (error) {
    console.error('시간당 조회수 계산 오류:', error);
    return 0;
  }
};

// 날짜 범위 계산 (기간 옵션에 따라)
export const getDateRange = (duration) => {
  const now = new Date();
  let startDate = new Date();
  
  switch (duration) {
    case '1주일':
      startDate.setDate(now.getDate() - 7);
      break;
    case '1달':
    case '1개월':
      startDate.setMonth(now.getMonth() - 1);
      break;
    case '2달':
    case '2개월':
      startDate.setMonth(now.getMonth() - 2);
      break;
    case '3달':
    case '3개월':
      startDate.setMonth(now.getMonth() - 3);
      break;
    case '6달':
    case '6개월':
      startDate.setMonth(now.getMonth() - 6);
      break;
    default:
      startDate.setMonth(now.getMonth() - 2);
  }
  
  return {
    publishedAfter: startDate.toISOString(),
    publishedBefore: now.toISOString()
  };
};

// 업로드 경과일 계산
export const getDaysSinceUpload = (publishedAt) => {
  try {
    const publishedDate = parseISO(publishedAt);
    const now = new Date();
    const diffTime = Math.abs(now - publishedDate);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  } catch (error) {
    return 0;
  }
};

// ISO 8601 duration을 분으로 변환
export const parseDuration = (duration) => {
  try {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    
    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);
    const seconds = parseInt(match[3] || 0);
    
    return Math.round((hours * 60 + minutes + seconds / 60) * 10) / 10;
  } catch (error) {
    console.error('길이 파싱 오류:', error);
    return 0;
  }
};

// ISO 8601 duration을 분:초 형식으로 변환
export const parseDurationMinSec = (duration) => {
  try {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return '0:00';
    
    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);
    const seconds = parseInt(match[3] || 0);
    
    const totalMinutes = hours * 60 + minutes;
    const sec = seconds < 10 ? `0${seconds}` : seconds.toString();
    
    return `${totalMinutes}:${sec}`;
  } catch (error) {
    console.error('길이 파싱 오류:', error);
    return '0:00';
  }
};

// 날짜 포맷팅
export const formatDate = (dateString) => {
  try {
    const date = parseISO(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch (error) {
    return dateString;
  }
};

