import axios from 'axios';

const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const BASE_URL = 'https://www.googleapis.com/youtube/v3';

// YouTube 검색
export const searchVideos = async (params) => {
  try {
    const response = await axios.get(`${BASE_URL}/search`, {
      params: {
        part: 'snippet',
        key: API_KEY,
        type: 'video',
        maxResults: Math.min(params.maxResults || 50, 50),
        q: params.keyword,
        regionCode: params.regionCode || 'KR',
        publishedAfter: params.publishedAfter,
        publishedBefore: params.publishedBefore,
        order: params.order || 'relevance',
        pageToken: params.pageToken,
        ...params
      }
    });
    return response.data;
  } catch (error) {
    console.error('검색 오류:', error);
    throw error;
  }
};

// 비디오 상세 정보 조회
export const getVideoDetails = async (videoIds) => {
  try {
    const response = await axios.get(`${BASE_URL}/videos`, {
      params: {
        part: 'statistics,contentDetails,snippet',
        key: API_KEY,
        id: videoIds.join(',')
      }
    });
    return response.data.items;
  } catch (error) {
    console.error('비디오 상세 정보 오류:', error);
    throw error;
  }
};

// 채널 정보 조회
export const getChannelInfo = async (channelIds) => {
  try {
    const response = await axios.get(`${BASE_URL}/channels`, {
      params: {
        part: 'statistics,snippet',
        key: API_KEY,
        id: channelIds.join(',')
      }
    });
    return response.data.items;
  } catch (error) {
    console.error('채널 정보 오류:', error);
    throw error;
  }
};

