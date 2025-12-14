import { useState } from 'react';
import { searchVideos, getVideoDetails, getChannelInfo } from '../services/youtubeApi';
import { calculateHourlyViews, getDateRange, parseDuration } from '../utils/dateCalculator';
import { exportToCSV } from '../utils/csvExporter';
import SearchFilters from './SearchFilters';
import VideoPreview from './VideoPreview';
import VideoTable from './VideoTable';

const KeywordSearch = () => {
  const [filters, setFilters] = useState({
    keyword: '',
    countryCode: 'KR',
    duration: '2달',
    thumbnailSize: '100x75',
    length: '15분~60분',
    minViews: '10000',
    subscriberLimit: '10000',
    maxResults: '150',
    minHourlyViews: '미적용',
    sortStandard: '구독자',
    sortOrder: '오름차순'
  });

  const [results, setResults] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const applyFilters = (videos) => {
    return videos.filter(video => {
      // 길이 필터
      const videoMinutes = parseDuration(video.contentDetails?.duration || 'PT0M');
      
      // 15분 이하 영상은 모두 제외
      if (videoMinutes <= 15) return false;
      
      if (filters.length === '15분~60분' && videoMinutes > 60) return false;
      if (filters.length === '60분 이상' && videoMinutes <= 60) return false;

      // 최소 조회수
      const views = parseInt(video.statistics?.viewCount || 0);
      if (views < parseInt(filters.minViews)) return false;

      // 구독자 상한
      const subscribers = parseInt(video.channelSubscribers || 0);
      if (subscribers > parseInt(filters.subscriberLimit)) return false;

      // 최소 시간당 조회수
      if (filters.minHourlyViews !== '미적용') {
        const hourlyViews = calculateHourlyViews(views, video.snippet.publishedAt);
        if (hourlyViews < parseInt(filters.minHourlyViews)) return false;
      }

      return true;
    });
  };

  const sortResults = (videos) => {
    const sorted = [...videos];
    const order = filters.sortOrder === '오름차순' ? 1 : -1;

    sorted.sort((a, b) => {
      let aVal, bVal;

      switch (filters.sortStandard) {
        case '구독자':
          aVal = parseInt(a.channelSubscribers || 0);
          bVal = parseInt(b.channelSubscribers || 0);
          break;
        case '조회수':
          aVal = parseInt(a.statistics?.viewCount || 0);
          bVal = parseInt(b.statistics?.viewCount || 0);
          break;
        case '시간당조회수':
          aVal = calculateHourlyViews(
            parseInt(a.statistics?.viewCount || 0),
            a.snippet.publishedAt
          );
          bVal = calculateHourlyViews(
            parseInt(b.statistics?.viewCount || 0),
            b.snippet.publishedAt
          );
          break;
        case '업로드일':
          aVal = new Date(a.snippet.publishedAt).getTime();
          bVal = new Date(b.snippet.publishedAt).getTime();
          break;
        default:
          return 0;
      }

      return (aVal - bVal) * order;
    });

    return sorted;
  };

  const handleSearch = async () => {
    if (!filters.keyword.trim()) {
      alert('키워드를 입력해주세요.');
      return;
    }

    if (!import.meta.env.VITE_YOUTUBE_API_KEY) {
      alert('YouTube API 키가 설정되지 않았습니다. .env 파일에 VITE_YOUTUBE_API_KEY를 추가해주세요.');
      return;
    }

    setLoading(true);
    setResults([]);
    setSelectedVideo(null);

    try {
      const dateRange = getDateRange(filters.duration);
      const maxResults = parseInt(filters.maxResults);
      
      // 여러 페이지에서 데이터 가져오기
      let allVideos = [];
      let nextPageToken = null;
      let pageCount = 0;
      const maxPages = Math.ceil(maxResults / 50);

      do {
        setProgress({ current: Math.min(pageCount * 50, maxResults), total: maxResults });
        
        const searchResponse = await searchVideos({
          keyword: filters.keyword,
          regionCode: filters.countryCode || undefined,
          maxResults: 50,
          order: 'date',
          pageToken: nextPageToken,
          ...dateRange
        });

        if (!searchResponse.items || searchResponse.items.length === 0) {
          break;
        }

        const videoIds = searchResponse.items.map(item => item.id.videoId);
        
        // 비디오 상세 정보 조회
        const videoDetails = await getVideoDetails(videoIds);
        
        // 채널 ID 추출 및 조회
        const channelIds = [...new Set(videoDetails.map(v => v.snippet.channelId))];
        const channelInfo = await getChannelInfo(channelIds);
        const channelMap = {};
        channelInfo.forEach(ch => {
          channelMap[ch.id] = parseInt(ch.statistics?.subscriberCount || 0);
        });

        // 데이터 합치기
        const videosWithDetails = videoDetails.map(video => ({
          ...video,
          channelSubscribers: channelMap[video.snippet.channelId] || 0,
          videoId: video.id
        }));

        allVideos = [...allVideos, ...videosWithDetails];
        nextPageToken = searchResponse.nextPageToken;
        pageCount++;

        // 할당량 고려하여 약간의 지연
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // 최대 페이지 수 또는 최대 결과 수에 도달하면 중단
        if (pageCount >= maxPages || allVideos.length >= maxResults) {
          break;
        }
      } while (nextPageToken);

      // 필터링 및 정렬 적용
      let filteredVideos = applyFilters(allVideos);
      filteredVideos = sortResults(filteredVideos);
      filteredVideos = filteredVideos.slice(0, maxResults);

      setResults(filteredVideos);
      
      if (filteredVideos.length > 0) {
        setSelectedVideo(filteredVideos[0]);
      } else {
        alert('필터 조건에 맞는 결과가 없습니다.');
      }
    } catch (error) {
      console.error('검색 오류:', error);
      if (error.response?.status === 403) {
        alert('YouTube API 키가 유효하지 않거나 할당량이 초과되었습니다.');
      } else if (error.response?.status === 400) {
        alert('검색 요청에 오류가 있습니다. 국가코드 등을 확인해주세요.');
      } else {
        alert('검색 중 오류가 발생했습니다: ' + (error.message || '알 수 없는 오류'));
      }
    } finally {
      setLoading(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  const handleCSVExport = () => {
    if (results.length === 0) {
      alert('저장할 데이터가 없습니다. 먼저 검색을 실행해주세요.');
      return;
    }

    const csvData = results.map(video => ({
      title: video.snippet.title,
      channelTitle: video.snippet.channelTitle,
      subscriberCount: video.channelSubscribers || 0,
      publishedAt: video.snippet.publishedAt.split('T')[0],
      viewCount: parseInt(video.statistics?.viewCount || 0),
      hourlyViews: calculateHourlyViews(
        parseInt(video.statistics?.viewCount || 0),
        video.snippet.publishedAt
      ),
      duration: parseDuration(video.contentDetails?.duration || 'PT0M'),
      videoId: video.videoId
    }));

    exportToCSV(csvData, `youtube_search_${filters.keyword}_${Date.now()}.csv`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">키워드 검색 설정</h2>
          <SearchFilters filters={filters} onFilterChange={handleFilterChange} />
          
          <div className="flex gap-4 mt-6">
            <button 
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
              onClick={handleSearch}
              disabled={loading}
            >
              {loading ? `검색 중... (${progress.current}/${progress.total})` : '검색 실행'}
            </button>
            <button 
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
              onClick={handleCSVExport}
              disabled={results.length === 0 || loading}
            >
              CSV 저장
            </button>
          </div>
        </div>

        {loading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <span className="text-blue-800">
                검색 중... {progress.current}/{progress.total}
              </span>
            </div>
          </div>
        )}

        {results.length > 0 && (
          <>
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
              <p className="text-lg font-medium text-gray-900">
                완료: {results.length}개 영상
              </p>
            </div>
            
            {selectedVideo && (
              <VideoPreview 
                video={selectedVideo} 
                thumbnailSize={filters.thumbnailSize}
              />
            )}
            
            <VideoTable 
              videos={results}
              onVideoSelect={setSelectedVideo}
              filters={filters}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default KeywordSearch;

