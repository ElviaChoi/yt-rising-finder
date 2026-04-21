import { useEffect, useMemo, useState } from 'react';
import { expansionPresets, topicPresets } from '../data/topicPresets';
import { getChannelInfo, getVideoDetails, searchVideos } from '../services/youtubeApi';
import { getDateRange } from '../utils/dateCalculator';
import { exportToCSV } from '../utils/csvExporter';
import { enrichVideo } from '../utils/videoMetrics';
import SearchFilters from './SearchFilters';
import VideoPreview from './VideoPreview';
import VideoTable from './VideoTable';

const STORAGE_KEYS = {
  saved: 'seniorFinder.savedVideos',
  hidden: 'seniorFinder.hiddenVideos',
};

const tabProfiles = {
  rising: {
    title: '작은 채널 떡상 후보',
    description: '구독자보다 조회수가 크게 튄 영상을 찾는 모드입니다.',
    filters: {
      minViews: '10000',
      subscriberLimit: '30000',
      length: '15plus',
      sortBy: 'risingScore',
      countryCode: 'KR',
      expansionId: 'none',
      maxKeywords: '8',
    },
  },
  daily: {
    title: '넓게 소재 탐색',
    description: '카테고리 안의 소재를 넓게 훑는 모드입니다. 좋은 소재가 보이면 조건을 좁혀보세요.',
    filters: {
      minViews: '10000',
      subscriberLimit: '999999999',
      length: 'shortsOut',
      sortBy: 'views',
      countryCode: 'KR',
      expansionId: 'none',
      maxKeywords: '12',
    },
  },
  competitor: {
    title: '해외/경쟁 벤치마킹',
    description: '국가를 전세계나 미국으로 바꾸고, 큰 채널의 제목/썸네일/소재 패턴을 참고하는 모드입니다.',
    filters: {
      minViews: '10000',
      subscriberLimit: '999999999',
      length: '8plus',
      sortBy: 'views',
      countryCode: 'ALL',
      expansionId: 'none',
      maxKeywords: '12',
    },
  },
  keyword: {
    title: '키워드 실험',
    description: '직접 키워드를 넣고 검색 확장 표현을 붙여가며 후보를 테스트합니다.',
    filters: {
      minViews: '10000',
      subscriberLimit: '999999999',
      length: 'shortsOut',
      sortBy: 'risingScore',
      countryCode: 'KR',
      expansionId: 'question',
      maxKeywords: '8',
    },
  },
};

const readStoredArray = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
};

const initialPreset = topicPresets[0];

const KeywordSearch = ({ activeTab }) => {
  const initialFilters = {
    presetId: initialPreset.id,
    keyword: '',
    duration: '90',
    ...tabProfiles.rising.filters,
  };
  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [results, setResults] = useState([]);
  const [savedVideos, setSavedVideos] = useState(() => readStoredArray(STORAGE_KEYS.saved));
  const [hiddenVideoIds, setHiddenVideoIds] = useState(() => readStoredArray(STORAGE_KEYS.hidden));
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  const activeProfile = tabProfiles[activeTab] || tabProfiles.rising;

  useEffect(() => {
    if (activeTab === 'archive') return;
    setFilters((prev) => {
      const nextFilters = {
        ...prev,
        ...activeProfile.filters,
      };
      setAppliedFilters(nextFilters);
      return nextFilters;
    });
  }, [activeTab]);

  const selectedPreset = useMemo(
    () => topicPresets.find((preset) => preset.id === filters.presetId) || initialPreset,
    [filters.presetId]
  );

  const savedVideoIds = useMemo(() => savedVideos.map((video) => video.videoId), [savedVideos]);

  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handlePresetSelect = (preset) => {
    setFilters((prev) => ({ ...prev, presetId: preset.id }));
  };

  const buildSearchQueries = () => {
    const manualKeyword = filters.keyword.trim();
    const expansion = expansionPresets.find((preset) => preset.id === filters.expansionId);
    const baseQueries = manualKeyword ? [manualKeyword] : selectedPreset.keywords;
    const maxKeywords = Number(filters.maxKeywords);
    const queries = [];

    baseQueries.forEach((query) => {
      if (queries.length < maxKeywords) queries.push(query);
    });

    if (queries.length < maxKeywords) {
      for (const baseQuery of baseQueries) {
        for (const boost of expansion?.queryBoosts || []) {
          if (queries.length >= maxKeywords) break;
          queries.push(`${baseQuery} ${boost}`);
        }
        if (queries.length >= maxKeywords) break;
      }
    }

    return Array.from(new Set(queries)).slice(0, maxKeywords);
  };

  const applyFilters = (videos, filterSet = appliedFilters) => {
    const minViews = Number(filterSet.minViews);
    const subscriberLimit = Number(filterSet.subscriberLimit);

    return videos.filter((video) => {
      const metrics = video.metrics;
      if (hiddenVideoIds.includes(video.videoId)) return false;
      if (metrics.views < minViews) return false;
      if (metrics.subscribers > subscriberLimit) return false;
      if (filterSet.length === 'shortsOut' && metrics.durationMinutes < 3) return false;
      if (filterSet.length === '8plus' && metrics.durationMinutes < 8) return false;
      if (filterSet.length === '15plus' && metrics.durationMinutes < 15) return false;
      if (filterSet.length === '30plus' && metrics.durationMinutes < 30) return false;
      if (filterSet.length === '40plus' && metrics.durationMinutes < 40) return false;
      if (filterSet.length === '60plus' && metrics.durationMinutes < 60) return false;
      return true;
    });
  };

  const sortVideos = (videos, filterSet = appliedFilters) => {
    return [...videos].sort((a, b) => {
      if (filterSet.sortBy === 'publishedAt') {
        return new Date(b.snippet.publishedAt).getTime() - new Date(a.snippet.publishedAt).getTime();
      }

      const aMetric = a.metrics?.[filterSet.sortBy] ?? a[filterSet.sortBy] ?? 0;
      const bMetric = b.metrics?.[filterSet.sortBy] ?? b[filterSet.sortBy] ?? 0;
      return bMetric - aMetric;
    });
  };

  const applyCurrentFilters = () => {
    setAppliedFilters({ ...filters });
  };

  const runSearch = async () => {
    if (!import.meta.env.VITE_YOUTUBE_API_KEY) {
      setError('.env 파일에 VITE_YOUTUBE_API_KEY가 필요합니다.');
      return;
    }

    const queries = buildSearchQueries();
    if (queries.length === 0) {
      setError('검색할 키워드가 없습니다.');
      return;
    }

    setLoading(true);
    setError('');
    setProgress('검색 준비 중');
    setResults([]);

    try {
      const dateRange = getDateRange(filters.duration);
      const collected = [];

      for (let index = 0; index < queries.length; index += 1) {
        const query = queries[index];
        setProgress(`${index + 1}/${queries.length} - "${query}" 검색 중`);

        const searchResponse = await searchVideos({
          keyword: query,
          regionCode: filters.countryCode,
          maxResults: activeTab === 'keyword' ? 40 : 30,
          order: activeTab === 'rising' ? 'date' : 'relevance',
          ...dateRange,
        });

        const videoIds = (searchResponse.items || []).map((item) => item.id.videoId).filter(Boolean);
        if (videoIds.length === 0) continue;

        const details = await getVideoDetails(videoIds);
        const channelIds = [...new Set(details.map((video) => video.snippet.channelId))];
        const channels = await getChannelInfo(channelIds);
        const channelMap = Object.fromEntries(
          channels.map((channel) => [channel.id, Number(channel.statistics?.subscriberCount || 0)])
        );

        details.forEach((video) => {
          collected.push(
            enrichVideo(
              {
                ...video,
                videoId: video.id,
                channelSubscribers: channelMap[video.snippet.channelId] || 0,
              },
              query
            )
          );
        });

        await new Promise((resolve) => setTimeout(resolve, 80));
      }

      const uniqueVideos = Array.from(new Map(collected.map((video) => [video.videoId, video])).values());
      setResults(uniqueVideos);
      setAppliedFilters(filters);
      setProgress('');
    } catch (searchError) {
      console.error(searchError);
      if (searchError.response?.status === 403) {
        setError('YouTube API 키, 권한, 일일 할당량을 확인해주세요.');
      } else {
        setError(`검색 중 오류가 발생했습니다: ${searchError.message || '알 수 없는 오류'}`);
      }
    } finally {
      setLoading(false);
      setProgress('');
    }
  };

  const saveVideo = (video) => {
    setSavedVideos((prev) => {
      const exists = prev.some((item) => item.videoId === video.videoId);
      const next = exists ? prev.filter((item) => item.videoId !== video.videoId) : [video, ...prev];
      localStorage.setItem(STORAGE_KEYS.saved, JSON.stringify(next));
      return next;
    });
  };

  const hideVideo = (video) => {
    setHiddenVideoIds((prev) => {
      const next = Array.from(new Set([video.videoId, ...prev]));
      localStorage.setItem(STORAGE_KEYS.hidden, JSON.stringify(next));
      return next;
    });
  };

  const restoreHiddenVideos = () => {
    setHiddenVideoIds([]);
    localStorage.setItem(STORAGE_KEYS.hidden, JSON.stringify([]));
  };

  const visibleVideos = useMemo(() => {
    if (activeTab === 'archive') return savedVideos;
    return sortVideos(applyFilters(results, appliedFilters), appliedFilters);
  }, [
    activeTab,
    savedVideos,
    results,
    hiddenVideoIds,
    appliedFilters,
  ]);

  const summary = useMemo(() => {
    const top = visibleVideos[0];
    const avgRatio =
      visibleVideos.length > 0
        ? visibleVideos.reduce((sum, video) => sum + video.metrics.viewSubscriberRatio, 0) / visibleVideos.length
        : 0;

    return {
      count: visibleVideos.length,
      top,
      avgRatio,
      savedCount: savedVideos.length,
      hiddenCount: hiddenVideoIds.length,
    };
  }, [visibleVideos, savedVideos.length, hiddenVideoIds.length]);

  const exportResults = () => {
    const csvData = visibleVideos.map((video) => ({
      risingScore: video.metrics.risingScore,
      title: video.snippet.title,
      channelTitle: video.snippet.channelTitle,
      subscriberCount: video.metrics.subscribers,
      viewCount: video.metrics.views,
      viewSubscriberRatio: video.metrics.viewSubscriberRatio.toFixed(1),
      hourlyViews: video.metrics.hourlyViews,
      commentCount: video.metrics.comments,
      duration: video.metrics.durationMinutes,
      publishedAt: video.snippet.publishedAt.split('T')[0],
      searchedKeyword: video.searchedKeyword,
      videoId: video.videoId,
    }));

    exportToCSV(csvData, `senior_youtube_finder_${Date.now()}.csv`);
  };

  const isArchive = activeTab === 'archive';

  return (
    <div className="mx-auto grid w-full max-w-[1500px] grid-cols-1 gap-5 overflow-x-hidden px-4 py-6 sm:px-6 lg:grid-cols-[minmax(300px,360px)_minmax(0,1fr)] lg:px-8">
      <SearchFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onPresetSelect={handlePresetSelect}
        activeTab={activeTab}
        onApplyFilters={applyCurrentFilters}
        hasResults={results.length > 0}
        rawResultCount={results.length}
        appliedFilters={appliedFilters}
      />

      <section className="min-w-0 space-y-5">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-sm font-bold text-blue-700">{selectedPreset.label}</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">
                {isArchive ? '보관한 영상' : activeProfile.title}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                {isArchive
                  ? '저장해둔 영상을 다시 확인합니다. 데이터는 이 브라우저에만 저장됩니다.'
                  : activeProfile.description}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {!isArchive && (
                <button
                  type="button"
                  onClick={runSearch}
                  disabled={loading}
                  className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:bg-slate-300"
                >
                  {loading ? progress || '검색 중' : '후보 찾기'}
                </button>
              )}
              <button
                type="button"
                onClick={exportResults}
                disabled={visibleVideos.length === 0}
                className="rounded-md bg-slate-950 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:bg-slate-300"
              >
                CSV 다운로드
              </button>
              {summary.hiddenCount > 0 && (
                <button
                  type="button"
                  onClick={restoreHiddenVideos}
                  className="rounded-md bg-slate-100 px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
                >
                  제외 초기화
                </button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold text-slate-500">결과</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{summary.count.toLocaleString('ko-KR')}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold text-slate-500">평균 조회/구독</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{summary.avgRatio.toFixed(1)}배</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold text-slate-500">보관함</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{summary.savedCount.toLocaleString('ko-KR')}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold text-slate-500">제외</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{summary.hiddenCount.toLocaleString('ko-KR')}</p>
          </div>
        </div>

        {summary.top && !isArchive && <VideoPreview video={summary.top} />}

        <VideoTable
          videos={visibleVideos}
          onSave={saveVideo}
          onHide={hideVideo}
          savedVideoIds={savedVideoIds}
          hiddenVideoIds={hiddenVideoIds}
        />
      </section>
    </div>
  );
};

export default KeywordSearch;
