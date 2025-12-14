import { useState, useMemo } from 'react';
import { searchVideos, getVideoDetails, getChannelInfo } from '../services/youtubeApi';
import { getDateRange, parseDuration, formatDate, getDaysSinceUpload } from '../utils/dateCalculator';
import { extractKeywords, extractWordFrequency } from '../utils/keywordExtractor';
import { exportToCSV } from '../utils/csvExporter';
import HotTrendFilters from './HotTrendFilters';
import VideoTable from './VideoTable';

const HotTrend = () => {
  const [filters, setFilters] = useState({
    duration: '2개월',
    countryCode: 'KR',
    minDuration: '20',
    minViews: '10000',
    maxResults: '150',
    sortStandard: '조회수',
    sortOrder: '내림차순'
  });

  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedKeyword, setSelectedKeyword] = useState(null);
  const [selectedWord, setSelectedWord] = useState(null);

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }));
    setSelectedKeyword(null);
    setSelectedWord(null);
  };

  // 인기 검색어로 영상 검색
  const searchPopularVideos = async () => {
    setLoading(true);
    setError(null);
    setSelectedKeyword(null);
    setSelectedWord(null);
    setVideos([]);

    try {
      const dateRange = getDateRange(filters.duration);
      const maxResults = parseInt(filters.maxResults);
      const minDuration = parseInt(filters.minDuration);
      const minViews = parseInt(filters.minViews);

      // 시니어 대상 인기 검색어 목록 (롱폼 중심)
      const popularKeywords = [
        '건강', '명상', '요리', '취미', '투자', '재테크', '인문학', '철학',
        '역사', '문화', '예술', '음악', '여행', '독서', '학습', '교육',
        '다큐', '강의', '특강', '세미나', '강좌', '강연', '토크', '대담'
      ];

      let allVideos = [];
      let searchedKeywords = 0;

      // 여러 키워드로 검색하여 데이터 수집
      for (const keyword of popularKeywords) {
        if (allVideos.length >= maxResults * 2) break; // 충분한 데이터 수집

        try {
          let nextPageToken = null;
          let pageCount = 0;
          const maxPages = Math.ceil(50 / 50); // 키워드당 최대 50개

          do {
            const searchResponse = await searchVideos({
              keyword: keyword,
              regionCode: filters.countryCode || undefined,
              maxResults: 50,
              order: 'viewCount', // 조회수 기준
              pageToken: nextPageToken,
              ...dateRange
            });

            if (!searchResponse.items || searchResponse.items.length === 0) {
              break;
            }

            const videoIds = searchResponse.items.map(item => item.id.videoId);
            const videoDetails = await getVideoDetails(videoIds);

            // 필터 적용
            const filteredVideos = videoDetails.filter(video => {
              const videoMinutes = parseDuration(video.contentDetails?.duration || 'PT0M');
              const views = parseInt(video.statistics?.viewCount || 0);
              return videoMinutes >= minDuration && views >= minViews;
            });

            // 채널 정보 조회
            const channelIds = [...new Set(filteredVideos.map(v => v.snippet.channelId))];
            const channelInfo = await getChannelInfo(channelIds);
            const channelMap = {};
            channelInfo.forEach(ch => {
              channelMap[ch.id] = parseInt(ch.statistics?.subscriberCount || 0);
            });

            const videosWithDetails = filteredVideos.map(video => ({
              ...video,
              channelSubscribers: channelMap[video.snippet.channelId] || 0,
              videoId: video.id
            }));

            allVideos = [...allVideos, ...videosWithDetails];
            nextPageToken = searchResponse.nextPageToken;
            pageCount++;

            await new Promise(resolve => setTimeout(resolve, 100));
          } while (nextPageToken && pageCount < maxPages);

          searchedKeywords++;
          if (searchedKeywords >= 8) break; // 최대 8개 키워드만 검색
        } catch (err) {
          console.error(`키워드 "${keyword}" 검색 오류:`, err);
        }
      }

      // 중복 제거 (동일한 비디오 ID)
      const uniqueVideos = Array.from(
        new Map(allVideos.map(v => [v.videoId, v])).values()
      );

      // 정렬
      let sortedVideos = [...uniqueVideos];
      const order = filters.sortOrder === '오름차순' ? 1 : -1;

      sortedVideos.sort((a, b) => {
        let aVal, bVal;
        if (filters.sortStandard === '조회수') {
          aVal = parseInt(a.statistics?.viewCount || 0);
          bVal = parseInt(b.statistics?.viewCount || 0);
        } else {
          aVal = new Date(a.snippet.publishedAt).getTime();
          bVal = new Date(b.snippet.publishedAt).getTime();
        }
        return (aVal - bVal) * order;
      });

      sortedVideos = sortedVideos.slice(0, maxResults);
      setVideos(sortedVideos);
    } catch (err) {
      console.error('검색 오류:', err);
      if (err.response?.status === 403) {
        setError('YouTube API 키가 유효하지 않거나 할당량이 초과되었습니다.');
      } else if (err.response?.status === 400) {
        setError('검색 요청에 오류가 있습니다. 필터 조건을 확인해주세요.');
      } else {
        setError('검색 중 오류가 발생했습니다: ' + (err.message || '알 수 없는 오류'));
      }
    } finally {
      setLoading(false);
    }
  };

  // 필터링된 영상 목록
  const filteredVideos = useMemo(() => {
    let filtered = [...videos];

    if (selectedKeyword) {
      filtered = filtered.filter(video =>
        video.snippet.title.toLowerCase().includes(selectedKeyword.toLowerCase())
      );
    }

    if (selectedWord) {
      filtered = filtered.filter(video =>
        video.snippet.title.toLowerCase().includes(selectedWord.toLowerCase())
      );
    }

    return filtered;
  }, [videos, selectedKeyword, selectedWord]);

  // 키워드 분석
  const keywordAnalysis = useMemo(() => {
    if (videos.length === 0) return [];
    const titles = videos.map(v => v.snippet.title);
    const keywords = extractKeywords(titles, 2);
    
    return keywords.slice(0, 50).map(kw => {
      const relatedVideos = videos.filter((_, idx) => kw.videoIndices.includes(idx));
      const totalViews = relatedVideos.reduce((sum, v) => sum + parseInt(v.statistics?.viewCount || 0), 0);
      const avgViews = relatedVideos.length > 0 ? Math.round(totalViews / relatedVideos.length) : 0;
      const avgDuration = relatedVideos.reduce((sum, v) => {
        return sum + parseDuration(v.contentDetails?.duration || 'PT0M');
      }, 0) / relatedVideos.length;
      const latestDate = relatedVideos.length > 0 
        ? Math.max(...relatedVideos.map(v => new Date(v.snippet.publishedAt).getTime()))
        : 0;

      return {
        ...kw,
        videoCount: relatedVideos.length,
        avgViews,
        avgDuration: Math.round(avgDuration * 10) / 10,
        latestDate: latestDate > 0 ? formatDate(new Date(latestDate).toISOString()) : ''
      };
    });
  }, [videos]);

  // 단어 빈도 분석
  const wordFrequency = useMemo(() => {
    if (videos.length === 0) return [];
    const titles = videos.map(v => v.snippet.title);
    return extractWordFrequency(titles, 20);
  }, [videos]);

  // 길이 구간별 분석
  const durationAnalysis = useMemo(() => {
    if (videos.length === 0) return [];

    const ranges = [
      { min: 20, max: 30, label: '20~30분' },
      { min: 30, max: 40, label: '30~40분' },
      { min: 40, max: 60, label: '40~60분' },
      { min: 60, max: Infinity, label: '60분 이상' }
    ];

    return ranges.map(range => {
      const rangeVideos = videos.filter(v => {
        const minutes = parseDuration(v.contentDetails?.duration || 'PT0M');
        return minutes >= range.min && minutes < range.max;
      });

      if (rangeVideos.length === 0) {
        return {
          ...range,
          count: 0,
          avgViews: 0,
          medianViews: 0,
          avgDaysSinceUpload: 0
        };
      }

      const views = rangeVideos.map(v => parseInt(v.statistics?.viewCount || 0)).sort((a, b) => a - b);
      const totalViews = views.reduce((sum, v) => sum + v, 0);
      const avgViews = Math.round(totalViews / views.length);
      const medianViews = views.length % 2 === 0
        ? Math.round((views[views.length / 2 - 1] + views[views.length / 2]) / 2)
        : views[Math.floor(views.length / 2)];

      const totalDays = rangeVideos.reduce((sum, v) => sum + getDaysSinceUpload(v.snippet.publishedAt), 0);
      const avgDaysSinceUpload = Math.round(totalDays / rangeVideos.length);

      return {
        ...range,
        count: rangeVideos.length,
        avgViews,
        medianViews,
        avgDaysSinceUpload
      };
    });
  }, [videos]);

  const handleCSVExport = () => {
    if (filteredVideos.length === 0) {
      alert('저장할 데이터가 없습니다. 먼저 검색을 실행해주세요.');
      return;
    }

    const csvData = filteredVideos.map(video => ({
      title: video.snippet.title,
      channelTitle: video.snippet.channelTitle,
      subscriberCount: video.channelSubscribers || 0,
      publishedAt: video.snippet.publishedAt.split('T')[0],
      viewCount: parseInt(video.statistics?.viewCount || 0),
      duration: parseDuration(video.contentDetails?.duration || 'PT0M'),
      videoId: video.videoId
    }));

    exportToCSV(csvData, `hottrend_${Date.now()}.csv`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">핫트렌드 분석 (시니어 대상)</h2>
          <HotTrendFilters filters={filters} onFilterChange={handleFilterChange} />
          
          <div className="flex gap-4 mt-6">
            <button 
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
              onClick={searchPopularVideos}
              disabled={loading}
            >
              {loading ? '검색 중...' : '트렌드 분석 실행'}
            </button>
            <button 
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
              onClick={handleCSVExport}
              disabled={filteredVideos.length === 0 || loading}
            >
              CSV 저장
            </button>
          </div>
        </div>

        {loading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <span className="text-blue-800">트렌드 데이터를 수집하고 있습니다...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {videos.length > 0 && (
          <>
            {/* 섹션 1: 상승 트렌드 키워드 */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">상승 트렌드 키워드</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {keywordAnalysis.slice(0, 20).map((kw, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedKeyword(selectedKeyword === kw.keyword ? null : kw.keyword)}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedKeyword === kw.keyword
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-semibold text-gray-900 mb-2">{kw.keyword}</div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>영상 수: {kw.videoCount}</div>
                      <div>평균 조회수: {kw.avgViews.toLocaleString()}</div>
                      <div>평균 길이: {kw.avgDuration}분</div>
                      {kw.latestDate && <div>최신 업로드: {kw.latestDate}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 섹션 2: 제목 단어 빈도 */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">제목 단어 빈도 Top 20</h3>
              <div className="flex flex-wrap gap-3">
                {wordFrequency.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedWord(selectedWord === item.word ? null : item.word)}
                    className={`px-4 py-2 rounded-md transition-colors ${
                      selectedWord === item.word
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span className="font-medium">{item.word}</span>
                    <span className="ml-2 text-sm">
                      ({item.count}회, {item.videoCount}개 영상)
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 섹션 3: 영상 길이 구간별 성과 */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">영상 길이 구간별 성과</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {durationAnalysis.map((range, idx) => (
                  <div key={idx} className="p-4 border border-gray-200 rounded-lg">
                    <div className="font-semibold text-gray-900 mb-3">{range.label}</div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>영상 수: {range.count}</div>
                      {range.count > 0 && (
                        <>
                          <div>평균 조회수: {range.avgViews.toLocaleString()}</div>
                          <div>중앙값 조회수: {range.medianViews.toLocaleString()}</div>
                          <div>평균 업로드 경과일: {range.avgDaysSinceUpload}일</div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 섹션 4: 영상 리스트 */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  영상 리스트 {selectedKeyword && `(키워드: ${selectedKeyword})`}
                  {selectedWord && `(단어: ${selectedWord})`}
                </h3>
                <span className="text-sm text-gray-600">
                  총 {filteredVideos.length}개 영상
                </span>
              </div>
              <VideoTable 
                videos={filteredVideos}
                onVideoSelect={() => {}}
                filters={{ ...filters, showThumbnail: true, showHourlyViews: false, thumbnailSize: 'large', durationFormat: 'minsec' }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default HotTrend;

