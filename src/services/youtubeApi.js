import axios from 'axios';
import { CACHE_TTL, getCachedValue, makeCacheKey, setCachedValue } from '../utils/apiCache';

const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const BASE_URL = 'https://www.googleapis.com/youtube/v3';

const withCache = async ({ type, params, ttl, fetcher, forceRefresh = false }) => {
  const key = makeCacheKey(type, params);

  if (!forceRefresh) {
    const cached = await getCachedValue(key);
    if (cached) {
      return {
        data: cached,
        cache: { hit: 1, miss: 0, apiCalls: 0, quota: 0 },
      };
    }
  }

  const data = await fetcher();
  await setCachedValue(key, data, ttl);

  return {
    data,
    cache: {
      hit: 0,
      miss: 1,
      apiCalls: 1,
      quota: type === 'search' ? 100 : 1,
    },
  };
};

export const searchVideos = async ({
  keyword,
  regionCode = 'KR',
  relevanceLanguage,
  maxResults = 25,
  order = 'date',
  pageToken,
  publishedAfter,
  publishedBefore,
  videoDuration,
  forceRefresh = false,
}) => {
  const params = {
    part: 'snippet',
    key: API_KEY,
    type: 'video',
    maxResults: Math.min(Number(maxResults) || 25, 50),
    q: keyword,
    order,
    pageToken,
    publishedAfter,
    publishedBefore,
    relevanceLanguage: relevanceLanguage || (regionCode === 'KR' ? 'ko' : undefined),
    videoDuration,
  };

  if (regionCode && regionCode !== 'ALL') {
    params.regionCode = regionCode;
  }

  return withCache({
    type: 'search',
    params,
    ttl: CACHE_TTL.search,
    forceRefresh,
    fetcher: async () => {
      const response = await axios.get(`${BASE_URL}/search`, {
        params,
      });
      return response.data;
    },
  });
};

export const getVideoDetails = async (videoIds, options = {}) => {
  if (!videoIds || videoIds.length === 0) {
    return { data: [], cache: { hit: 0, miss: 0, apiCalls: 0, quota: 0 } };
  }

  const params = {
    part: 'statistics,contentDetails,snippet',
    key: API_KEY,
    id: [...videoIds].sort().join(','),
  };

  return withCache({
    type: 'videos',
    params,
    ttl: CACHE_TTL.videos,
    forceRefresh: options.forceRefresh,
    fetcher: async () => {
      const response = await axios.get(`${BASE_URL}/videos`, {
        params,
      });
      return response.data.items || [];
    },
  });
};

export const getChannelInfo = async (channelIds, options = {}) => {
  if (!channelIds || channelIds.length === 0) {
    return { data: [], cache: { hit: 0, miss: 0, apiCalls: 0, quota: 0 } };
  }

  const params = {
    part: 'statistics,snippet',
    key: API_KEY,
    id: [...channelIds].sort().join(','),
  };

  return withCache({
    type: 'channels',
    params,
    ttl: CACHE_TTL.channels,
    forceRefresh: options.forceRefresh,
    fetcher: async () => {
      const response = await axios.get(`${BASE_URL}/channels`, {
        params,
      });
      return response.data.items || [];
    },
  });
};
