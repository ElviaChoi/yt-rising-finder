import axios from 'axios';

const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const BASE_URL = 'https://www.googleapis.com/youtube/v3';

export const searchVideos = async ({
  keyword,
  regionCode = 'KR',
  maxResults = 25,
  order = 'date',
  pageToken,
  publishedAfter,
  publishedBefore,
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
    relevanceLanguage: regionCode === 'KR' ? 'ko' : undefined,
  };

  if (regionCode && regionCode !== 'ALL') {
    params.regionCode = regionCode;
  }

  const response = await axios.get(`${BASE_URL}/search`, {
    params,
  });

  return response.data;
};

export const getVideoDetails = async (videoIds) => {
  if (!videoIds || videoIds.length === 0) return [];

  const response = await axios.get(`${BASE_URL}/videos`, {
    params: {
      part: 'statistics,contentDetails,snippet',
      key: API_KEY,
      id: videoIds.join(','),
    },
  });

  return response.data.items || [];
};

export const getChannelInfo = async (channelIds) => {
  if (!channelIds || channelIds.length === 0) return [];

  const response = await axios.get(`${BASE_URL}/channels`, {
    params: {
      part: 'statistics,snippet',
      key: API_KEY,
      id: channelIds.join(','),
    },
  });

  return response.data.items || [];
};
