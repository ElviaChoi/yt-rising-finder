import { useEffect, useMemo, useState } from 'react';
import { expansionPresets, topicPresets } from '../data/topicPresets';
import { getChannelInfo, getVideoDetails, searchVideos } from '../services/youtubeApi';
import { getDateRange } from '../utils/dateCalculator';
import { exportToCSV } from '../utils/csvExporter';
import { enrichVideo } from '../utils/videoMetrics';
import { clearApiCache } from '../utils/apiCache';
import SearchFilters from './SearchFilters';
import VideoPreview from './VideoPreview';
import VideoTable from './VideoTable';

const STORAGE_KEYS = {
  saved: 'seniorFinder.savedVideos',
  hidden: 'seniorFinder.hiddenVideos',
};

const tabProfiles = {
  rising: {
    title: '작은 채널 롱폼 기회',
    description: '최근 90일 안에 작은 채널이 12분 이상 롱폼으로 조회수를 만든 사례를 찾습니다.',
    filters: {
      minViews: '10000',
      subscriberLimit: '10000',
      length: '12plus',
      sortBy: 'risingScore',
      countryCode: 'KR',
      expansionId: 'none',
      maxKeywords: '5',
    },
    searchOrder: 'date',
    searchDurations: ['medium', 'long'],
  },
  daily: {
    title: '국내 수요 탐색',
    description: '국내에서 이미 조회수를 내는 정보형 롱폼 소재와 제목 패턴을 넓게 확인합니다.',
    filters: {
      minViews: '10000',
      subscriberLimit: '999999999',
      length: '12plus',
      sortBy: 'views',
      countryCode: 'KR',
      expansionId: 'none',
      maxKeywords: '8',
    },
    searchOrder: 'relevance',
    searchDurations: ['long'],
  },
  competitor: {
    title: '해외 원형 참고',
    description: '해외에서 반복되는 세계경제·지리·교양형 소재 원형을 참고하는 모드입니다.',
    filters: {
      minViews: '10000',
      subscriberLimit: '999999999',
      length: '12plus',
      sortBy: 'views',
      countryCode: 'US',
      expansionId: 'none',
      maxKeywords: '8',
    },
    searchOrder: 'relevance',
    searchDurations: ['long'],
    relevanceLanguage: 'en',
  },
  keyword: {
    title: '키워드 실험',
    description: '직접 키워드를 넣고 검색 확장 표현을 붙여가며 후보를 테스트합니다.',
    filters: {
      minViews: '10000',
      subscriberLimit: '999999999',
      length: '12plus',
      sortBy: 'risingScore',
      countryCode: 'KR',
      expansionId: 'question',
      maxKeywords: '5',
    },
    searchOrder: 'relevance',
    searchDurations: ['medium', 'long'],
  },
};

const readStoredArray = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
};

const emptyCacheStats = {
  hits: 0,
  misses: 0,
  apiCalls: 0,
  quota: 0,
};

const mergeCacheStats = (stats, cache) => ({
  hits: stats.hits + (cache?.hit || 0),
  misses: stats.misses + (cache?.miss || 0),
  apiCalls: stats.apiCalls + (cache?.apiCalls || 0),
  quota: stats.quota + (cache?.quota || 0),
});

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
  const [hasSearched, setHasSearched] = useState(false);
  const [rawSearchCount, setRawSearchCount] = useState(0);
  const [showHiddenSubscriberVideos, setShowHiddenSubscriberVideos] = useState(false);
  const [cacheStats, setCacheStats] = useState(emptyCacheStats);

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

  const estimatedSearchCalls = useMemo(() => {
    const keywordCount = buildSearchQueries().length;
    const durationCount = activeProfile.searchDurations?.length || 1;
    return keywordCount * durationCount;
  }, [filters.keyword, filters.presetId, filters.maxKeywords, filters.expansionId, activeProfile]);

  const passesLengthFilter = (video, length) => {
    const minutes = video.metrics.durationMinutes;
    if (length === 'shortsOut') return minutes >= 3;
    if (length === '8plus') return minutes >= 8;
    if (length === '12plus') return minutes >= 12;
    if (length === '15plus') return minutes >= 15;
    if (length === '30plus') return minutes >= 30;
    if (length === '40plus') return minutes >= 40;
    if (length === '60plus') return minutes >= 60;
    return true;
  };

  const getFilterBreakdown = (videos, filterSet = appliedFilters) => {
    const minViews = Number(filterSet.minViews);
    const subscriberLimit = Number(filterSet.subscriberLimit);
    const available = videos.filter((video) => !hiddenVideoIds.includes(video.videoId));
    const afterLength = available.filter((video) => passesLengthFilter(video, filterSet.length));
    const afterViews = afterLength.filter((video) => video.metrics.views >= minViews);
    const hiddenSubscriberVideos = afterViews.filter((video) => video.metrics.hasHiddenSubscribers);
    const visibleSubscriberVideos = afterViews.filter((video) => !video.metrics.hasHiddenSubscribers);
    const strongVideos = visibleSubscriberVideos.filter((video) => video.metrics.subscribers <= 10000);
    const referenceVideos = visibleSubscriberVideos.filter(
      (video) => video.metrics.subscribers > 10000 && video.metrics.subscribers <= 30000
    );
    const finalVideos = visibleSubscriberVideos.filter((video) => {
      if (subscriberLimit === 999999999) return true;
      return video.metrics.subscribers <= subscriberLimit;
    });

    return {
      raw: videos.length,
      available: available.length,
      afterLength: afterLength.length,
      afterViews: afterViews.length,
      hiddenSubscribers: hiddenSubscriberVideos.length,
      strong: strongVideos.length,
      reference: referenceVideos.length,
      final: finalVideos.length,
      finalVideos,
      hiddenSubscriberVideos,
    };
  };

  const applyFilters = (videos, filterSet = appliedFilters) => {
    return getFilterBreakdown(videos, filterSet).finalVideos;
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
    setHasSearched(true);
    setError('');
    setProgress('검색 준비 중');
    setResults([]);
    setRawSearchCount(0);
    setCacheStats(emptyCacheStats);
    setShowHiddenSubscriberVideos(false);

    try {
      const dateRange = getDateRange(filters.duration);
      const collected = [];
      let nextCacheStats = { ...emptyCacheStats };
      const searchDurations = activeProfile.searchDurations || [undefined];

      for (let index = 0; index < queries.length; index += 1) {
        const query = queries[index];
        for (let durationIndex = 0; durationIndex < searchDurations.length; durationIndex += 1) {
          const videoDuration = searchDurations[durationIndex];
          const durationLabel = videoDuration ? `/${videoDuration}` : '';
          setProgress(`${index + 1}/${queries.length}${durationLabel} - "${query}" 검색 중`);

          const searchResult = await searchVideos({
            keyword: query,
            regionCode: filters.countryCode,
            relevanceLanguage: activeProfile.relevanceLanguage,
            maxResults: activeTab === 'keyword' ? 40 : 30,
            order: activeProfile.searchOrder || 'relevance',
            videoDuration,
            ...dateRange,
          });
          nextCacheStats = mergeCacheStats(nextCacheStats, searchResult.cache);
          const searchResponse = searchResult.data;

          const videoIds = (searchResponse.items || []).map((item) => item.id.videoId).filter(Boolean);
          if (videoIds.length === 0) continue;

          const detailsResult = await getVideoDetails(videoIds);
          nextCacheStats = mergeCacheStats(nextCacheStats, detailsResult.cache);
          const details = detailsResult.data;
          const channelIds = [...new Set(details.map((video) => video.snippet.channelId))];
          const channelsResult = await getChannelInfo(channelIds);
          nextCacheStats = mergeCacheStats(nextCacheStats, channelsResult.cache);
          const channels = channelsResult.data;
          const channelMap = Object.fromEntries(
            channels.map((channel) => [
              channel.id,
              {
                subscribers: Number(channel.statistics?.subscriberCount || 0),
                hiddenSubscriberCount:
                  channel.statistics?.hiddenSubscriberCount === true ||
                  channel.statistics?.hiddenSubscriberCount === 'true',
              },
            ])
          );

          details.forEach((video) => {
            const channel = channelMap[video.snippet.channelId] || {};
            collected.push(
              enrichVideo(
                {
                  ...video,
                  videoId: video.id,
                  channelSubscribers: channel.subscribers || 0,
                  hiddenSubscriberCount: channel.hiddenSubscriberCount === true || channel.hiddenSubscriberCount === 'true',
                },
                query
              )
            );
          });

          await new Promise((resolve) => setTimeout(resolve, 80));
        }
      }

      const uniqueVideos = Array.from(new Map(collected.map((video) => [video.videoId, video])).values());
      setResults(uniqueVideos);
      setAppliedFilters(filters);
      setRawSearchCount(collected.length);
      setCacheStats(nextCacheStats);
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

  const handleClearCache = async () => {
    await clearApiCache();
    setCacheStats(emptyCacheStats);
  };

  const filterBreakdown = useMemo(() => {
    if (activeTab === 'archive') return null;
    return getFilterBreakdown(results, appliedFilters);
  }, [activeTab, results, hiddenVideoIds, appliedFilters]);

  const visibleVideos = useMemo(() => {
    if (activeTab === 'archive') return savedVideos;
    return sortVideos(filterBreakdown?.finalVideos || [], appliedFilters);
  }, [activeTab, savedVideos, filterBreakdown, appliedFilters]);

  const hiddenSubscriberVideos = useMemo(() => {
    if (activeTab === 'archive') return [];
    return sortVideos(filterBreakdown?.hiddenSubscriberVideos || [], appliedFilters);
  }, [activeTab, filterBreakdown, appliedFilters]);

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
      subscriberCount: video.metrics.hasHiddenSubscribers ? '미공개' : video.metrics.subscribers,
      viewCount: video.metrics.views,
      viewSubscriberRatio: video.metrics.hasHiddenSubscribers ? '미공개' : video.metrics.viewSubscriberRatio.toFixed(1),
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
        onRunSearch={runSearch}
        loading={loading}
        progress={progress}
        onApplyFilters={applyCurrentFilters}
        hasResults={results.length > 0}
        rawResultCount={results.length}
        appliedFilters={appliedFilters}
        estimatedSearchCalls={estimatedSearchCalls}
        cacheStats={cacheStats}
        onClearCache={handleClearCache}
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
                  className="rounded-md bg-blue-50 px-5 py-2.5 text-sm font-bold text-blue-700 shadow-sm ring-1 ring-blue-100 transition hover:bg-blue-100 disabled:bg-slate-100 disabled:text-slate-400"
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

        {!isArchive && results.length > 0 && filterBreakdown && (
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-black text-slate-950">필터 통과 현황</p>
                <p className="text-xs text-slate-500">검색 결과가 어느 조건에서 줄어드는지 확인합니다.</p>
              </div>
              {hiddenSubscriberVideos.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowHiddenSubscriberVideos((prev) => !prev)}
                  className="rounded-md bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
                >
                  구독자 미공개 {hiddenSubscriberVideos.length.toLocaleString('ko-KR')}개{' '}
                  {showHiddenSubscriberVideos ? '접기' : '보기'}
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
              {[
                ['수집 원본', rawSearchCount || filterBreakdown.raw],
                ['중복 제거 후', filterBreakdown.raw],
                ['길이 통과', filterBreakdown.afterLength],
                ['조회수 통과', filterBreakdown.afterViews],
                ['1만 이하', filterBreakdown.strong],
                ['최종 후보', filterBreakdown.final],
              ].map(([label, value]) => (
                <div key={label} className="rounded-md bg-slate-50 px-3 py-2">
                  <p className="text-[11px] font-bold text-slate-500">{label}</p>
                  <p className="mt-1 text-lg font-black text-slate-950">
                    {Number(value).toLocaleString('ko-KR')}
                  </p>
                </div>
              ))}
            </div>
            {filterBreakdown.hiddenSubscribers > 0 && (
              <p className="mt-3 text-xs leading-5 text-slate-500">
                구독자 미공개 채널 {filterBreakdown.hiddenSubscribers.toLocaleString('ko-KR')}개는 1만 이하 여부를
                판단할 수 없어 별도 참고 후보로 분리했습니다.
              </p>
            )}
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
          emptyMessage={
            isArchive
              ? '저장된 영상이 없습니다.'
              : loading
                ? progress || '검색 중입니다. 키워드별 후보 영상을 수집하고 있습니다.'
                : hasSearched
                  ? '검색은 되었지만 현재 필터를 통과한 영상이 없습니다. 기간, 조회수, 길이, 구독자 조건을 완화해보세요.'
                  : '소재 카테고리와 검색 조건을 확인한 뒤 후보 찾기를 눌러 작은 채널 롱폼 사례를 수집해보세요.'
          }
        />

        {!isArchive && showHiddenSubscriberVideos && hiddenSubscriberVideos.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-black text-slate-950">구독자 미공개 참고 후보</h3>
            <VideoTable
              videos={hiddenSubscriberVideos}
              onSave={saveVideo}
              onHide={hideVideo}
              savedVideoIds={savedVideoIds}
              hiddenVideoIds={hiddenVideoIds}
              emptyMessage="구독자 미공개 참고 후보가 없습니다."
            />
          </div>
        )}
      </section>
    </div>
  );
};

export default KeywordSearch;
