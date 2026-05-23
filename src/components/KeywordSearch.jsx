import { useEffect, useMemo, useState } from 'react';
import { expansionPresets, topicPresets } from '../data/topicPresets';
import { getChannelInfo, getVideoDetails, searchVideos } from '../services/youtubeApi';
import { clearApiCache } from '../utils/apiCache';
import { exportToCSV } from '../utils/csvExporter';
import { getDateRange } from '../utils/dateCalculator';
import { getUsageLogs, createUsageSnapshot, upsertUsageLog } from '../utils/usageLog';
import { enrichVideo } from '../utils/videoMetrics';
import SearchFilters from './SearchFilters';
import VideoPreview from './VideoPreview';
import VideoTable from './VideoTable';

const STORAGE_KEYS = {
  saved: 'seniorFinder.savedVideos',
  hidden: 'seniorFinder.hiddenVideos',
  hiddenSnapshots: 'seniorFinder.hiddenVideoSnapshots',
};

const tabProfiles = {
  rising: {
    title: '작은 채널 롱폼 기회',
    description: '최근 90일 안에 조회수를 만든 롱폼 후보에서 작은 채널 사례를 찾습니다.',
    filters: {
      minViews: '10000',
      subscriberLimit: '10000',
      length: '12plus',
      sortBy: 'risingScore',
      countryCode: 'KR',
      expansionId: 'none',
      maxKeywords: '5',
    },
    searchOrder: 'viewCount',
    searchDurations: ['medium', 'long'],
  },
  daily: {
    title: '국내 수요 탐색',
    description: '국내에서 이미 조회수가 있는 정보형 롱폼 소재와 제목 패턴을 넓게 확인합니다.',
    filters: {
      minViews: '10000',
      subscriberLimit: '999999999',
      length: '12plus',
      sortBy: 'views',
      countryCode: 'KR',
      expansionId: 'none',
      maxKeywords: '5',
    },
    searchOrder: 'relevance',
    searchDurations: ['long'],
  },
  competitor: {
    title: '해외 원형 참고',
    description: '해외에서 반복되는 소재 원형을 참고하는 모드입니다.',
    filters: {
      minViews: '10000',
      subscriberLimit: '999999999',
      length: '20plus',
      sortBy: 'views',
      countryCode: 'US',
      overseasLanguage: 'en',
      expansionId: 'none',
      maxKeywords: '5',
    },
    searchOrder: 'relevance',
    searchDurations: ['long'],
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

const initialPreset = topicPresets[0];

const overseasLanguageProfiles = {
  en: { regionCode: 'US', relevanceLanguage: 'en', label: '영어권' },
  ja: { regionCode: 'JP', relevanceLanguage: 'ja', label: '일본어권' },
};

const emptyCacheStats = {
  hits: 0,
  misses: 0,
  apiCalls: 0,
  quota: 0,
};

const emptySearchDiagnostics = {
  queriesRun: 0,
  searchItems: 0,
  detailedVideos: 0,
  qualityFilteredOut: 0,
  relevanceFilteredOut: 0,
};

const searchParameterKeys = [
  'presetId',
  'keyword',
  'duration',
  'countryCode',
  'expansionId',
  'maxKeywords',
  'overseasLanguage',
];

const resultFilterKeys = ['minViews', 'subscriberLimit', 'length', 'sortBy'];

const hasDifferentValue = (left = {}, right = {}, keys = []) =>
  keys.some((key) => String(left[key] ?? '') !== String(right[key] ?? ''));

const getYoutubeErrorReason = (error) =>
  error.response?.data?.error?.errors?.[0]?.reason || error.response?.data?.error?.status || '';

const getSearchErrorMessage = (error, { estimatedQuota = 0, partialCount = 0 } = {}) => {
  const status = error.response?.status;
  const reason = getYoutubeErrorReason(error);
  const partialText =
    partialCount > 0 ? ` 제한 전까지 모은 후보 ${partialCount.toLocaleString('ko-KR')}개는 화면에 남겼습니다.` : '';

  if (status === 429) {
    return `YouTube API가 단시간 요청량을 제한했습니다(429). 현재 조건은 최대 ${estimatedQuota.toLocaleString(
      'ko-KR'
    )} quota를 쓸 수 있습니다. 검색량을 줄이거나 직접 키워드 1개로 먼저 확인한 뒤 잠시 후 다시 시도해주세요.${partialText}`;
  }

  if (status === 403) {
    return `YouTube API 키, 권한, 일일 할당량을 확인해주세요.${reason ? ` 사유: ${reason}.` : ''}${partialText}`;
  }

  return `검색 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}${partialText}`;
};

const readStoredArray = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
};

const readStoredHiddenVideoIds = () => {
  const hiddenIds = readStoredArray(STORAGE_KEYS.hidden);
  const hiddenSnapshots = readStoredArray(STORAGE_KEYS.hiddenSnapshots);
  return Array.from(new Set([...hiddenIds, ...hiddenSnapshots.map((video) => video.videoId).filter(Boolean)]));
};

const mergeCacheStats = (stats, cache) => ({
  hits: stats.hits + (cache?.hit || 0),
  misses: stats.misses + (cache?.miss || 0),
  apiCalls: stats.apiCalls + (cache?.apiCalls || 0),
  quota: stats.quota + (cache?.quota || 0),
});

const isLegacyReviewedLog = (log) => log.isReviewed == null && log.isTracked == null && log.isSaved == null;
const getLogIsReviewed = (log) => log.isReviewed === true || isLegacyReviewedLog(log);
const getLogIsActive = (log) => getLogIsReviewed(log) || log.isTracked === true || log.isSaved === true;

const getKeywordText = (keyword) => (typeof keyword === 'string' ? keyword : keyword?.q || '');
const getKeywordNote = (keyword) => (typeof keyword === 'string' ? '' : keyword?.note || '');
const getCategoryLabel = (categoryId) =>
  topicPresets.find((preset) => preset.id === categoryId)?.label || '카테고리 없음';
const getVideoCategoryId = (video, fallbackCategoryId = '') => video.categoryId || fallbackCategoryId || '';
const getVideoActiveTab = (video, fallbackActiveTab = '') => video.activeTab || fallbackActiveTab || '';
const normalizeQueryKey = (query) =>
  query
    .toLowerCase()
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '');
const stripDecorativeUnicode = (text) =>
  String(text || '').replace(/[\u{1D400}-\u{1D7FF}]/gu, (char) => {
    const code = char.codePointAt(0);
    const ranges = [
      [0x1d400, 0x1d419, 0x41],
      [0x1d41a, 0x1d433, 0x61],
      [0x1d434, 0x1d44d, 0x41],
      [0x1d44e, 0x1d467, 0x61],
      [0x1d468, 0x1d481, 0x41],
      [0x1d482, 0x1d49b, 0x61],
      [0x1d5a0, 0x1d5b9, 0x41],
      [0x1d5ba, 0x1d5d3, 0x61],
      [0x1d5d4, 0x1d5ed, 0x41],
      [0x1d5ee, 0x1d607, 0x61],
      [0x1d608, 0x1d621, 0x41],
      [0x1d622, 0x1d63b, 0x61],
      [0x1d63c, 0x1d655, 0x41],
      [0x1d656, 0x1d66f, 0x61],
      [0x1d670, 0x1d689, 0x41],
      [0x1d68a, 0x1d6a5, 0x61],
      [0x1d7ce, 0x1d7d7, 0x30],
      [0x1d7d8, 0x1d7e1, 0x30],
      [0x1d7e2, 0x1d7eb, 0x30],
      [0x1d7ec, 0x1d7f5, 0x30],
      [0x1d7f6, 0x1d7ff, 0x30],
    ];
    const range = ranges.find(([start, end]) => code >= start && code <= end);
    return range ? String.fromCharCode(range[2] + code - range[0]) : char;
  });

const normalizeSearchText = (text) =>
  stripDecorativeUnicode(text)
    .normalize('NFKC')
    .toLowerCase();

const compactSearchText = (text) => normalizeSearchText(text).replace(/[^\p{L}\p{N}]/gu, '');

const includesAnyTerm = (text, terms = []) => {
  const normalizedText = normalizeSearchText(text);
  const compactText = compactSearchText(text);

  return terms.some((term) => {
    const normalizedTerm = normalizeSearchText(term).trim();
    if (!normalizedTerm) return false;
    return normalizedText.includes(normalizedTerm) || compactText.includes(compactSearchText(term));
  });
};

const lowValueFormatTerms = [
  '플레이리스트',
  'playlist',
  'play list',
  '모음',
  '모음집',
  '몰아보기',
  '몰아듣기',
  '모아듣기',
  '연속재생',
  '연속 재생',
  '전편 모음',
  '통합본',
  '오디오북',
  '오디오 북',
  '책읽어주는',
  '책 읽어주는',
  '낭독',
  '명언',
  '좋은글',
  '좋은 글',
  '수면용',
  '수면 음악',
  '수면 명상',
  '잠잘 때',
  '잠 안 올 때',
  'asmr',
  'bgm',
  'ost',
  'music playlist',
  'audiobook',
  'quotes',
];

const getVideoSearchText = (video) =>
  normalizeSearchText(
    [video.snippet?.title, video.snippet?.description, video.snippet?.channelTitle].filter(Boolean).join(' ')
  );

const passesQualityFormat = (video) => !includesAnyTerm(getVideoSearchText(video), lowValueFormatTerms);

const passesTopicRelevance = (video, preset) => {
  const relevance = preset?.relevance;
  if (!relevance) return true;

  const searchText = getVideoSearchText(video);

  if (includesAnyTerm(searchText, relevance.excludeAny)) return false;
  if (relevance.includeAny?.length && !includesAnyTerm(searchText, relevance.includeAny)) return false;

  return true;
};

const getOverseasLanguages = (value) => {
  if (value === 'both') return ['en', 'ja'];
  if (value === 'ja') return ['ja'];
  return ['en'];
};

const usageLogToVideo = (log) => {
  const subscribers = log.subscriberCount ?? log.subscribers ?? null;

  return {
    videoId: log.videoId,
    snapshotAt: log.snapshotAt,
    isReviewed: getLogIsReviewed(log),
    isTracked: log.isTracked === true,
    isSaved: log.isSaved === true,
    activeTab: log.activeTab,
    categoryId: log.categoryId,
    searchedKeyword: log.searchedKeyword,
    searchedKeywordNote: log.searchedKeywordNote,
    snippet: {
      title: log.title || '',
      channelTitle: log.channelTitle || '',
      channelId: log.channelId || '',
      publishedAt: log.snapshotAt || new Date().toISOString(),
      thumbnails: log.thumbnailUrl ? { medium: { url: log.thumbnailUrl } } : {},
    },
    contentDetails: {
      duration: `PT${Math.round(Math.max(Number(log.durationMinutes || 0), 0))}M`,
    },
    metrics: {
      views: Number(log.viewCount ?? log.views ?? 0),
      subscribers,
      comments: Number(log.commentCount ?? log.comments ?? 0),
      hourlyViews: Number(log.hourlyViews || 0),
      viewSubscriberRatio: Number(log.viewSubscriberRatio || 0),
      commentRate: Number(log.commentRate || 0),
      durationMinutes: Number(log.durationMinutes || 0),
      daysSinceUpload: Number(log.daysSinceUpload || 0),
      risingScore: Number(log.score ?? log.risingScore ?? 0),
      hasHiddenSubscribers: Boolean(log.hasHiddenSubscribers || subscribers == null),
    },
  };
};

const getTabProfile = (tabId) => tabProfiles[tabId] || tabProfiles.rising;

const createInitialFilters = (tabId = 'rising') => ({
  presetId: initialPreset.id,
  keyword: '',
  duration: '90',
  ...getTabProfile(tabId).filters,
});

const createTabState = (factory) =>
  Object.fromEntries(Object.keys(tabProfiles).map((tabId) => [tabId, factory(tabId)]));

const KeywordSearch = ({ activeTab }) => {
  const [filtersByTab, setFiltersByTab] = useState(() => createTabState(createInitialFilters));
  const [appliedFiltersByTab, setAppliedFiltersByTab] = useState(() => createTabState(createInitialFilters));
  const [resultsByTab, setResultsByTab] = useState(() => createTabState(() => []));
  const [savedVideos, setSavedVideos] = useState(() => readStoredArray(STORAGE_KEYS.saved));
  const [hiddenVideoIds, setHiddenVideoIds] = useState(readStoredHiddenVideoIds);
  const [hiddenVideos, setHiddenVideos] = useState(() => readStoredArray(STORAGE_KEYS.hiddenSnapshots));
  const [usageLogs, setUsageLogs] = useState([]);
  const [reviewedVideoIds, setReviewedVideoIds] = useState([]);
  const [trackedVideoIds, setTrackedVideoIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [hasSearchedByTab, setHasSearchedByTab] = useState(() => createTabState(() => false));
  const [rawSearchCountByTab, setRawSearchCountByTab] = useState(() => createTabState(() => 0));
  const [showHiddenSubscriberVideosByTab, setShowHiddenSubscriberVideosByTab] = useState(() =>
    createTabState(() => false)
  );
  const [cacheStatsByTab, setCacheStatsByTab] = useState(() => createTabState(() => emptyCacheStats));
  const [searchDiagnosticsByTab, setSearchDiagnosticsByTab] = useState(() =>
    createTabState(() => emptySearchDiagnostics)
  );
  const [archiveCategoryId, setArchiveCategoryId] = useState('all');

  const stateTab = tabProfiles[activeTab] ? activeTab : 'rising';
  const activeProfile = getTabProfile(activeTab);
  const isArchive = activeTab === 'archive';
  const filters = filtersByTab[stateTab] || createInitialFilters(stateTab);
  const appliedFilters = appliedFiltersByTab[stateTab] || filters;
  const results = resultsByTab[stateTab] || [];
  const hasSearched = hasSearchedByTab[stateTab] || false;
  const rawSearchCount = rawSearchCountByTab[stateTab] || 0;
  const showHiddenSubscriberVideos = showHiddenSubscriberVideosByTab[stateTab] || false;
  const cacheStats = cacheStatsByTab[stateTab] || emptyCacheStats;
  const searchDiagnostics = searchDiagnosticsByTab[stateTab] || emptySearchDiagnostics;

  useEffect(() => {
    setError('');
    setProgress('');
  }, [activeTab]);

  const refreshUsageLogs = async () => {
    const logs = await getUsageLogs();
    setUsageLogs(logs);
    setReviewedVideoIds(logs.filter(getLogIsReviewed).map((log) => log.videoId));
    setTrackedVideoIds(logs.filter((log) => log.isTracked === true).map((log) => log.videoId));
  };

  useEffect(() => {
    refreshUsageLogs().catch((logError) => console.error('확인 로그를 불러오지 못했습니다.', logError));
  }, []);

  const selectedPreset = useMemo(
    () => topicPresets.find((preset) => preset.id === filters.presetId) || initialPreset,
    [filters.presetId]
  );
  const appliedPreset = useMemo(
    () => topicPresets.find((preset) => preset.id === appliedFilters.presetId) || selectedPreset,
    [appliedFilters.presetId, selectedPreset]
  );
  const displayPreset = !isArchive && hasSearched ? appliedPreset : selectedPreset;
  const hasPendingSearchChanges =
    !isArchive && hasSearched && hasDifferentValue(filters, appliedFilters, searchParameterKeys);
  const hasPendingResultFilterChanges =
    !isArchive && hasSearched && hasDifferentValue(filters, appliedFilters, resultFilterKeys);

  const savedVideoIds = useMemo(() => savedVideos.map((video) => video.videoId), [savedVideos]);
  const activeUsageLogs = useMemo(
    () =>
      usageLogs
        .filter(getLogIsActive)
        .sort((a, b) => new Date(b.updatedAt || b.snapshotAt || 0).getTime() - new Date(a.updatedAt || a.snapshotAt || 0).getTime()),
    [usageLogs]
  );
  const usageLogVideoIds = useMemo(() => activeUsageLogs.map((log) => log.videoId), [activeUsageLogs]);
  const archiveVideos = useMemo(() => {
    const savedVideoMap = new Map(savedVideos.map((video) => [video.videoId, video]));
    const logVideos = activeUsageLogs.map((log) => {
      const logVideo = usageLogToVideo(log);
      const savedVideo = savedVideoMap.get(log.videoId);

      if (!savedVideo) return logVideo;

      const logThumbnails = logVideo.snippet?.thumbnails || {};
      const savedThumbnails = savedVideo.snippet?.thumbnails || {};
      const mergedThumbnails = Object.keys(logThumbnails).length > 0 ? logThumbnails : savedThumbnails;

      return {
        ...savedVideo,
        ...logVideo,
        isSaved: logVideo.isSaved || true,
        snippet: {
          ...savedVideo.snippet,
          ...logVideo.snippet,
          thumbnails: mergedThumbnails,
        },
        contentDetails: logVideo.contentDetails || savedVideo.contentDetails,
      };
    });
    const savedOnlyVideos = savedVideos
      .filter((video) => !usageLogVideoIds.includes(video.videoId))
      .map((video) => ({ ...video, isSaved: true }));

    return [...logVideos, ...savedOnlyVideos].filter((video) => !hiddenVideoIds.includes(video.videoId));
  }, [activeUsageLogs, savedVideos, usageLogVideoIds, hiddenVideoIds]);
  const archiveCategoryCounts = useMemo(() => {
    const counts = new Map();
    archiveVideos.forEach((video) => {
      const categoryId = video.categoryId || 'uncategorized';
      counts.set(categoryId, (counts.get(categoryId) || 0) + 1);
    });

    return counts;
  }, [archiveVideos]);

  const handleFilterChange = (name, value) => {
    setFiltersByTab((prev) => ({
      ...prev,
      [stateTab]: {
        ...(prev[stateTab] || createInitialFilters(stateTab)),
        [name]: value,
      },
    }));
  };

  const handlePresetSelect = (preset) => {
    setFiltersByTab((prev) => ({
      ...prev,
      [stateTab]: {
        ...(prev[stateTab] || createInitialFilters(stateTab)),
        presetId: preset.id,
      },
    }));
  };

  const buildSearchQueryItems = () => {
    const manualKeyword = filters.keyword.trim();
    const expansion = expansionPresets.find((preset) => preset.id === filters.expansionId);
    const maxKeywords = Number(filters.maxKeywords);
    const queryItems = [];
    const usedQueryKeys = new Set();

    const appendQueryItem = (item, limit = maxKeywords) => {
      const query = item.query?.trim();
      const normalizedKey = normalizeQueryKey(query || '');
      if (!query || !normalizedKey || usedQueryKeys.has(normalizedKey) || queryItems.length >= limit) return;

      usedQueryKeys.add(normalizedKey);
      queryItems.push({ ...item, query });
    };

    if (manualKeyword) {
      return [
        {
          query: manualKeyword,
          note: '직접 입력 키워드',
          regionCode: filters.countryCode,
          relevanceLanguage: activeProfile.relevanceLanguage,
        },
      ];
    }

    if (activeTab === 'competitor') {
      getOverseasLanguages(filters.overseasLanguage).forEach((language) => {
        const profile = overseasLanguageProfiles[language] || overseasLanguageProfiles.en;
        const seeds = selectedPreset.overseasSeeds?.[language] || [];

        seeds.slice(0, maxKeywords).forEach((seed) => {
          appendQueryItem(
            {
              query: getKeywordText(seed),
              note: getKeywordNote(seed),
              language,
              languageLabel: profile.label,
              regionCode: profile.regionCode,
              relevanceLanguage: profile.relevanceLanguage,
            },
            Number.MAX_SAFE_INTEGER
          );
        });
      });

      return queryItems;
    }

    const baseQueries = selectedPreset.keywords.map((keyword) => ({
      query: getKeywordText(keyword),
      note: getKeywordNote(keyword),
    }));

    baseQueries.forEach((item) => appendQueryItem(item));

    if (queryItems.length < maxKeywords) {
      for (const baseQuery of baseQueries) {
        for (const boost of expansion?.queryBoosts || []) {
          appendQueryItem({
            query: `${baseQuery.query} ${boost}`,
            note: baseQuery.note,
          });
          if (queryItems.length >= maxKeywords) break;
        }
        if (queryItems.length >= maxKeywords) break;
      }
    }

    return queryItems;
  };

  const estimatedSearchCalls = useMemo(() => {
    const keywordCount = buildSearchQueryItems().length;
    const durationCount = activeProfile.searchDurations?.length || 1;
    return keywordCount * durationCount;
  }, [
    filters.keyword,
    filters.presetId,
    filters.maxKeywords,
    filters.expansionId,
    filters.overseasLanguage,
    activeProfile,
  ]);

  const passesLengthFilter = (video, length) => {
    const minutes = video.metrics.durationMinutes;
    if (length === 'shortsOut') return minutes >= 3;
    if (length === '8plus') return minutes >= 8;
    if (length === '12plus') return minutes >= 12;
    if (length === '15plus') return minutes >= 15;
    if (length === '20plus') return minutes >= 20;
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
      referenceVideos,
      hiddenSubscriberVideos,
    };
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
    setAppliedFiltersByTab((prev) => {
      const previousFilters = prev[stateTab] || createInitialFilters(stateTab);
      const nextFilters = { ...previousFilters };

      resultFilterKeys.forEach((key) => {
        nextFilters[key] = filters[key];
      });

      return { ...prev, [stateTab]: nextFilters };
    });
  };

  const runSearch = async () => {
    if (!import.meta.env.VITE_YOUTUBE_API_KEY) {
      setError('.env 파일에 VITE_YOUTUBE_API_KEY가 필요합니다.');
      return;
    }

    const queries = buildSearchQueryItems();
    if (queries.length === 0) {
      setError('검색할 키워드가 없습니다.');
      return;
    }

    setLoading(true);
    setHasSearchedByTab((prev) => ({ ...prev, [stateTab]: true }));
    setError('');
    setProgress('검색 준비 중');
    setResultsByTab((prev) => ({ ...prev, [stateTab]: [] }));
    setRawSearchCountByTab((prev) => ({ ...prev, [stateTab]: 0 }));
    setCacheStatsByTab((prev) => ({ ...prev, [stateTab]: emptyCacheStats }));
    setSearchDiagnosticsByTab((prev) => ({ ...prev, [stateTab]: emptySearchDiagnostics }));
    setShowHiddenSubscriberVideosByTab((prev) => ({ ...prev, [stateTab]: false }));

    const searchTab = stateTab;
    const searchFilters = { ...filters };
    const dateRange = getDateRange(filters.duration);
    const collected = [];
    let nextCacheStats = { ...emptyCacheStats };
    let nextSearchDiagnostics = { ...emptySearchDiagnostics };
    const searchDurations = activeProfile.searchDurations || [undefined];
    const estimatedQuota = queries.length * searchDurations.length * 100;
    const commitCollectedResults = () => {
      const uniqueVideos = Array.from(new Map(collected.map((video) => [video.videoId, video])).values());
      setResultsByTab((prev) => ({ ...prev, [searchTab]: uniqueVideos }));
      setAppliedFiltersByTab((prev) => ({ ...prev, [searchTab]: searchFilters }));
      setRawSearchCountByTab((prev) => ({ ...prev, [searchTab]: nextSearchDiagnostics.detailedVideos }));
      setCacheStatsByTab((prev) => ({ ...prev, [searchTab]: nextCacheStats }));
      setSearchDiagnosticsByTab((prev) => ({ ...prev, [searchTab]: nextSearchDiagnostics }));

      return uniqueVideos.length;
    };

    try {
      for (let index = 0; index < queries.length; index += 1) {
        const queryItem = queries[index];
        const query = queryItem.query;

        for (let durationIndex = 0; durationIndex < searchDurations.length; durationIndex += 1) {
          const videoDuration = searchDurations[durationIndex];
          const durationLabel = videoDuration ? `/${videoDuration}` : '';
          setProgress(`${index + 1}/${queries.length}${durationLabel} - "${query}" 검색 중`);

          const searchResult = await searchVideos({
            keyword: query,
            regionCode: queryItem.regionCode || filters.countryCode,
            relevanceLanguage: queryItem.relevanceLanguage || activeProfile.relevanceLanguage,
            maxResults: activeTab === 'rising' ? 50 : activeTab === 'keyword' ? 40 : 30,
            order: activeProfile.searchOrder || 'relevance',
            videoDuration,
            ...dateRange,
          });
          nextCacheStats = mergeCacheStats(nextCacheStats, searchResult.cache);
          nextSearchDiagnostics.queriesRun += 1;

          const searchItems = searchResult.data.items || [];
          nextSearchDiagnostics.searchItems += searchItems.length;

          const videoIds = searchItems.map((item) => item.id.videoId).filter(Boolean);
          if (videoIds.length === 0) continue;

          const detailsResult = await getVideoDetails(videoIds);
          nextCacheStats = mergeCacheStats(nextCacheStats, detailsResult.cache);
          const details = detailsResult.data;
          nextSearchDiagnostics.detailedVideos += details.length;
          const qualityDetails = details.filter(passesQualityFormat);
          nextSearchDiagnostics.qualityFilteredOut += details.length - qualityDetails.length;
          const relevantDetails = qualityDetails.filter((video) => passesTopicRelevance(video, selectedPreset));
          nextSearchDiagnostics.relevanceFilteredOut += qualityDetails.length - relevantDetails.length;
          if (relevantDetails.length === 0) continue;

          const channelIds = [...new Set(relevantDetails.map((video) => video.snippet.channelId))];
          const channelsResult = await getChannelInfo(channelIds);
          nextCacheStats = mergeCacheStats(nextCacheStats, channelsResult.cache);
          const channelMap = Object.fromEntries(
            channelsResult.data.map((channel) => [
              channel.id,
              {
                subscribers: Number(channel.statistics?.subscriberCount || 0),
                hiddenSubscriberCount:
                  channel.statistics?.hiddenSubscriberCount === true ||
                  channel.statistics?.hiddenSubscriberCount === 'true',
              },
            ])
          );

          relevantDetails.forEach((video) => {
            const channel = channelMap[video.snippet.channelId] || {};
            collected.push(
              enrichVideo(
                {
                  ...video,
                  videoId: video.id,
                  channelSubscribers: channel.subscribers || 0,
                  hiddenSubscriberCount: channel.hiddenSubscriberCount === true || channel.hiddenSubscriberCount === 'true',
                },
                query,
                {
                  searchedKeywordNote: queryItem.note,
                  searchedLanguage: queryItem.language,
                  searchedLanguageLabel: queryItem.languageLabel,
                  activeTab: searchTab,
                  categoryId: searchFilters.presetId,
                }
              )
            );
          });

          await new Promise((resolve) => setTimeout(resolve, 80));
        }
      }

      commitCollectedResults();
    } catch (searchError) {
      console.error(searchError);
      const partialCount = commitCollectedResults();
      setError(getSearchErrorMessage(searchError, { estimatedQuota, partialCount }));
    } finally {
      setLoading(false);
      setProgress('');
    }
  };

  const getSnapshotContext = (video) => ({
    activeTab: getVideoActiveTab(video, isArchive ? video.activeTab : activeTab),
    categoryId: getVideoCategoryId(video, isArchive ? video.categoryId : appliedFilters.presetId),
  });

  const saveVideo = async (video) => {
    const willSave = !(savedVideoIds.includes(video.videoId) || video.isSaved === true);
    const savedVideo = {
      ...video,
      activeTab: getVideoActiveTab(video, isArchive ? video.activeTab : activeTab),
      categoryId: getVideoCategoryId(video, isArchive ? video.categoryId : appliedFilters.presetId),
    };

    setSavedVideos((prev) => {
      const next = willSave
        ? [savedVideo, ...prev.filter((item) => item.videoId !== video.videoId)]
        : prev.filter((item) => item.videoId !== video.videoId);
      localStorage.setItem(STORAGE_KEYS.saved, JSON.stringify(next));
      return next;
    });

    await upsertUsageLog({
      ...createUsageSnapshot(video, getSnapshotContext(video)),
      isSaved: willSave,
    });
    await refreshUsageLogs();
  };

  const hideVideo = (video) => {
    const isAlreadyHidden = hiddenVideoIds.includes(video.videoId);
    const hiddenVideo = {
      ...video,
      activeTab: getVideoActiveTab(video, isArchive ? video.activeTab : activeTab),
      categoryId: getVideoCategoryId(video, isArchive ? video.categoryId : appliedFilters.presetId),
      excludedAt: new Date().toISOString(),
      isHidden: !isAlreadyHidden,
    };

    setHiddenVideoIds((prev) => {
      const next = isAlreadyHidden ? prev.filter((videoId) => videoId !== video.videoId) : Array.from(new Set([video.videoId, ...prev]));
      localStorage.setItem(STORAGE_KEYS.hidden, JSON.stringify(next));
      return next;
    });

    setHiddenVideos((prev) => {
      const next = isAlreadyHidden
        ? prev.filter((item) => item.videoId !== video.videoId)
        : [hiddenVideo, ...prev.filter((item) => item.videoId !== video.videoId)];
      localStorage.setItem(STORAGE_KEYS.hiddenSnapshots, JSON.stringify(next));
      return next;
    });
  };

  const restoreHiddenVideos = () => {
    setHiddenVideoIds([]);
    localStorage.setItem(STORAGE_KEYS.hidden, JSON.stringify([]));
    setHiddenVideos([]);
    localStorage.setItem(STORAGE_KEYS.hiddenSnapshots, JSON.stringify([]));
  };

  const handleClearCache = async () => {
    await clearApiCache();
    setCacheStatsByTab((prev) => ({ ...prev, [stateTab]: emptyCacheStats }));
  };

  const toggleReviewedVideo = async (video) => {
    await upsertUsageLog({
      ...createUsageSnapshot(video, getSnapshotContext(video)),
      isReviewed: !reviewedVideoIds.includes(video.videoId),
    });
    await refreshUsageLogs();
  };

  const toggleTrackedVideo = async (video) => {
    await upsertUsageLog({
      ...createUsageSnapshot(video, getSnapshotContext(video)),
      isTracked: !trackedVideoIds.includes(video.videoId),
    });
    await refreshUsageLogs();
  };

  const filterBreakdown = useMemo(() => {
    if (isArchive) return null;
    return getFilterBreakdown(results, appliedFilters);
  }, [isArchive, results, hiddenVideoIds, appliedFilters]);

  const reusableCandidateVideos = useMemo(() => {
    if (isArchive) return [];

    const activeVideoIds = new Set(results.map((video) => video.videoId));
    const candidateCategoryId = appliedFilters.presetId;
    const reusablePool = Object.entries(resultsByTab)
      .filter(([tabId]) => tabId !== stateTab)
      .flatMap(([, tabResults]) => tabResults)
      .filter(
        (video) =>
          video.categoryId === candidateCategoryId &&
          !activeVideoIds.has(video.videoId)
      );
    const uniqueVideos = Array.from(new Map(reusablePool.map((video) => [video.videoId, video])).values());
    const reusableBreakdown = getFilterBreakdown(uniqueVideos, appliedFilters);

    return sortVideos(reusableBreakdown.finalVideos, appliedFilters);
  }, [isArchive, results, resultsByTab, stateTab, appliedFilters, hiddenVideoIds]);

  const visibleVideos = useMemo(() => {
    if (isArchive) {
      if (archiveCategoryId === 'hidden') {
        return hiddenVideos;
      }

      const filteredVideos =
        archiveCategoryId === 'all'
          ? archiveVideos
          : archiveVideos.filter((video) => (video.categoryId || 'uncategorized') === archiveCategoryId);

      return filteredVideos;
    }

    return sortVideos(filterBreakdown?.finalVideos || [], appliedFilters);
  }, [isArchive, archiveVideos, archiveCategoryId, hiddenVideos, filterBreakdown, appliedFilters]);

  const hiddenSubscriberVideos = useMemo(() => {
    if (isArchive) return [];
    return sortVideos(filterBreakdown?.hiddenSubscriberVideos || [], appliedFilters);
  }, [isArchive, filterBreakdown, appliedFilters]);

  const referenceCandidateVideos = useMemo(() => {
    if (isArchive || appliedFilters.subscriberLimit !== '10000') return [];
    return sortVideos(filterBreakdown?.referenceVideos || [], appliedFilters);
  }, [isArchive, filterBreakdown, appliedFilters]);

  const shouldShowReferenceCandidates =
    !isArchive && !loading && visibleVideos.length === 0 && referenceCandidateVideos.length > 0;

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
      reviewedCount: reviewedVideoIds.length,
      trackedCount: trackedVideoIds.length,
      hiddenCount: hiddenVideoIds.length,
    };
  }, [visibleVideos, savedVideos.length, reviewedVideoIds.length, trackedVideoIds.length, hiddenVideoIds.length]);

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
      searchedKeywordNote: video.searchedKeywordNote,
      videoId: video.videoId,
    }));

    exportToCSV(csvData, `senior_youtube_finder_${Date.now()}.csv`);
  };

  return (
    <div className="mx-auto grid w-full max-w-[1500px] grid-cols-1 gap-4 overflow-x-hidden px-3 py-4 sm:gap-5 sm:px-6 sm:py-6 lg:grid-cols-[minmax(300px,360px)_minmax(0,1fr)] lg:px-8">
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
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-sm font-bold text-blue-700">{displayPreset.label}</p>
              <h2 className="mt-1 text-xl font-black leading-7 text-slate-950 sm:text-2xl">
                {isArchive ? '후보 보관함' : activeProfile.title}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                {isArchive
                  ? '저장, 확인함, 추적 중으로 표시한 후보를 스냅샷 기준으로 다시 확인합니다. 데이터는 이 브라우저에만 저장됩니다.'
                  : activeProfile.description}
              </p>
              {!isArchive && (
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {hasSearched
                    ? `${activeProfile.title} 탭의 마지막 검색 결과를 보고 있습니다. 탭 전환만으로는 API를 호출하지 않습니다.`
                    : '이 탭은 아직 검색하지 않았습니다. 후보 찾기를 누를 때만 API를 호출합니다.'}
                </p>
              )}
              {hasPendingSearchChanges && (
                <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-800">
                  카테고리, 검색어, 기간, 국가 같은 검색 조건이 바뀌었습니다. 현재 결과는 마지막 검색 기준인
                  {' '}{appliedPreset.label} 결과입니다. 새 조건은 후보 찾기를 눌러 다시 검색해야 반영됩니다.
                </p>
              )}
              {hasPendingResultFilterChanges && !hasPendingSearchChanges && (
                <p className="mt-2 rounded-md bg-blue-50 px-3 py-2 text-xs font-semibold leading-5 text-blue-800">
                  조회수, 구독자, 길이, 정렬 조건이 바뀌었습니다. 필터 적용을 누르면 현재 결과 안에서 다시 계산합니다.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:flex sm:flex-wrap">
              {!isArchive && (
                <button
                  type="button"
                  onClick={runSearch}
                  disabled={loading}
                  className="w-full rounded-md bg-blue-50 px-5 py-3 text-sm font-bold text-blue-700 shadow-sm ring-1 ring-blue-100 transition hover:bg-blue-100 disabled:bg-slate-100 disabled:text-slate-400 sm:w-auto sm:py-2.5"
                >
                  {loading ? progress || '검색 중' : '후보 찾기'}
                </button>
              )}
              <button
                type="button"
                onClick={exportResults}
                disabled={visibleVideos.length === 0}
                className="w-full rounded-md bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:bg-slate-300 sm:w-auto sm:py-2.5"
              >
                CSV 다운로드
              </button>
              {summary.hiddenCount > 0 && (
                <button
                  type="button"
                  onClick={restoreHiddenVideos}
                  className="w-full rounded-md bg-slate-100 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-200 sm:w-auto sm:py-2.5"
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

        {!isArchive && hasSearched && searchDiagnostics.queriesRun > 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-black text-slate-950">검색 진단</p>
                <p className="text-xs leading-5 text-slate-500">
                  API 검색, 상세 조회, 형식 필터, 카테고리 관련성 필터 중 어디에서 후보가 줄었는지 확인합니다.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {[
                ['검색 호출', searchDiagnostics.queriesRun],
                ['API 검색 결과', searchDiagnostics.searchItems],
                ['상세 조회', searchDiagnostics.detailedVideos],
                ['형식 제외', searchDiagnostics.qualityFilteredOut],
                ['관련성 제외', searchDiagnostics.relevanceFilteredOut],
              ].map(([label, value]) => (
                <div key={label} className="rounded-md bg-slate-50 px-3 py-2">
                  <p className="text-[11px] font-bold text-slate-500">{label}</p>
                  <p className="mt-1 text-lg font-black text-slate-950">
                    {Number(value).toLocaleString('ko-KR')}
                  </p>
                </div>
              ))}
            </div>
            {searchDiagnostics.qualityFilteredOut > 0 && (
              <p className="mt-3 text-xs leading-5 text-slate-500">
                형식 제외는 플레이리스트, 모음, 통합본, 오디오북, 낭독, 수면용, ASMR처럼 소재 조사 가치가 낮은 포맷입니다.
              </p>
            )}
            {searchDiagnostics.relevanceFilteredOut > 0 && (
              <p className="mt-2 text-xs leading-5 text-slate-500">
                관련성 제외는 선택한 카테고리의 include/exclude 키워드에 맞지 않아 빠진 영상입니다. 심리학/뇌과학 소재는
                전용 카테고리로 검색하면 이 단계에서 덜 빠집니다.
              </p>
            )}
          </div>
        )}

        {isArchive && archiveVideos.length > 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <div className="mb-3">
              <p className="text-sm font-black text-slate-950">카테고리별 보관함</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                저장, 확인함, 추적 중 후보를 발견 당시 카테고리 기준으로 나눠 봅니다.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:flex sm:flex-wrap">
              <button
                type="button"
                onClick={() => setArchiveCategoryId('all')}
                className={`min-h-10 rounded-md px-3 py-2 text-xs font-bold transition ${
                  archiveCategoryId === 'all'
                    ? 'bg-slate-950 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                전체 {archiveVideos.length.toLocaleString('ko-KR')}
              </button>
              {topicPresets
                .filter((preset) => archiveCategoryCounts.has(preset.id))
                .map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setArchiveCategoryId(preset.id)}
                    className={`min-h-10 rounded-md px-3 py-2 text-xs font-bold transition ${
                      archiveCategoryId === preset.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                    }`}
                  >
                    {preset.label} {archiveCategoryCounts.get(preset.id).toLocaleString('ko-KR')}
                  </button>
                ))}
              {archiveCategoryCounts.has('uncategorized') && (
                <button
                  type="button"
                  onClick={() => setArchiveCategoryId('uncategorized')}
                  className={`min-h-10 rounded-md px-3 py-2 text-xs font-bold transition ${
                    archiveCategoryId === 'uncategorized'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  }`}
                >
                  {getCategoryLabel('')} {archiveCategoryCounts.get('uncategorized').toLocaleString('ko-KR')}
                </button>
              )}
              {hiddenVideos.length > 0 && (
                <button
                  type="button"
                  onClick={() => setArchiveCategoryId('hidden')}
                  className={`min-h-10 rounded-md px-3 py-2 text-xs font-bold transition ${
                    archiveCategoryId === 'hidden'
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                  }`}
                >
                  제외 {hiddenVideos.length.toLocaleString('ko-KR')}
                </button>
              )}
            </div>
          </div>
        )}

        {!isArchive && results.length > 0 && filterBreakdown && (
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-black text-slate-950">필터 통과 현황</p>
                <p className="text-xs text-slate-500">검색 결과가 어느 조건에서 줄어드는지 확인합니다.</p>
              </div>
              {hiddenSubscriberVideos.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setShowHiddenSubscriberVideosByTab((prev) => ({
                      ...prev,
                      [stateTab]: !showHiddenSubscriberVideos,
                    }))
                  }
                  className="rounded-md bg-slate-100 px-3 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
                >
                  구독자 미공개 {hiddenSubscriberVideos.length.toLocaleString('ko-KR')}개{' '}
                  {showHiddenSubscriberVideos ? '접기' : '보기'}
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-7">
              {[
                ['수집 원본', rawSearchCount || filterBreakdown.raw],
                ['관련성/중복 후', filterBreakdown.raw],
                ['길이 통과', filterBreakdown.afterLength],
                ['조회수 통과', filterBreakdown.afterViews],
                ['1만 이하', filterBreakdown.strong],
                ['1~3만 참고', filterBreakdown.reference],
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
                구독자 미공개 채널 {filterBreakdown.hiddenSubscribers.toLocaleString('ko-KR')}개는 작은 채널 여부를
                판단할 수 없어 별도 참고 후보로 분리했습니다.
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-6">
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <p className="text-xs font-bold text-slate-500">결과</p>
            <p className="mt-1 text-xl font-black text-slate-950 sm:text-2xl">{summary.count.toLocaleString('ko-KR')}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <p className="text-xs font-bold text-slate-500">평균 조회/구독</p>
            <p className="mt-1 text-xl font-black text-slate-950 sm:text-2xl">{summary.avgRatio.toFixed(1)}배</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <p className="text-xs font-bold text-slate-500">보관함</p>
            <p className="mt-1 text-xl font-black text-slate-950 sm:text-2xl">{summary.savedCount.toLocaleString('ko-KR')}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <p className="text-xs font-bold text-slate-500">확인함</p>
            <p className="mt-1 text-xl font-black text-slate-950 sm:text-2xl">{summary.reviewedCount.toLocaleString('ko-KR')}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <p className="text-xs font-bold text-slate-500">추적 중</p>
            <p className="mt-1 text-xl font-black text-slate-950 sm:text-2xl">{summary.trackedCount.toLocaleString('ko-KR')}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <p className="text-xs font-bold text-slate-500">제외</p>
            <p className="mt-1 text-xl font-black text-slate-950 sm:text-2xl">{summary.hiddenCount.toLocaleString('ko-KR')}</p>
          </div>
        </div>

        {summary.top && !isArchive && <VideoPreview video={summary.top} />}

        <VideoTable
          videos={visibleVideos}
          onSave={saveVideo}
          onHide={hideVideo}
          onToggleReviewed={toggleReviewedVideo}
          onToggleTracked={toggleTrackedVideo}
          savedVideoIds={savedVideoIds}
          hiddenVideoIds={hiddenVideoIds}
          reviewedVideoIds={reviewedVideoIds}
          trackedVideoIds={trackedVideoIds}
          emptyMessage={
            isArchive
              ? archiveCategoryId === 'hidden'
                ? '제외한 후보가 없습니다.'
                : '보관함에 저장, 확인함, 추적 중 영상이 없습니다.'
              : loading
                ? progress || '검색 중입니다. 키워드별 후보 영상을 수집하고 있습니다.'
                : hasSearched
                  ? searchDiagnostics.detailedVideos > 0 && searchDiagnostics.qualityFilteredOut >= searchDiagnostics.detailedVideos
                    ? '검색은 되었지만 플레이리스트, 모음, 오디오북, 낭독 같은 형식이라 모두 제외됐습니다. 검색어를 더 구체적으로 바꿔보세요.'
                    : searchDiagnostics.detailedVideos > 0 &&
                        searchDiagnostics.qualityFilteredOut + searchDiagnostics.relevanceFilteredOut >= searchDiagnostics.detailedVideos
                    ? '검색은 되었지만 선택한 카테고리 관련성 필터에서 모두 제외됐습니다. 카테고리를 바꾸거나 직접 키워드를 더 구체적으로 입력해보세요.'
                    : shouldShowReferenceCandidates
                      ? '1만 이하 작은 채널은 없지만, 1만~3만 구독자 참고 후보가 아래에 있습니다. 이 정도까지 넓히면 소재 검증은 가능합니다.'
                    : '검색은 끝났지만 현재 필터를 통과한 영상이 없습니다. 기간, 조회수, 길이, 구독자 조건을 완화해보세요.'
                  : reusableCandidateVideos.length > 0
                    ? '이 탭에서 직접 검색한 결과는 없습니다. 아래 재활용 후보는 기존 검색 결과에서 가져왔습니다.'
                    : '현재 카테고리와 검색 조건을 확인한 뒤 후보 찾기를 눌러 영상을 수집해보세요.'
          }
        />

        {shouldShowReferenceCandidates && (
          <div className="space-y-2">
            <div>
              <h3 className="text-sm font-black text-slate-950">1만~3만 구독자 참고 후보</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                엄격한 1만 이하 조건에는 걸리지 않았지만, 조회수와 길이를 통과한 준작은 채널 후보입니다. 소재 수요와 제목 패턴을
                판단하기에는 이 구간도 유용합니다.
              </p>
            </div>
            <VideoTable
              videos={referenceCandidateVideos}
              onSave={saveVideo}
              onHide={hideVideo}
              onToggleReviewed={toggleReviewedVideo}
              onToggleTracked={toggleTrackedVideo}
              savedVideoIds={savedVideoIds}
              hiddenVideoIds={hiddenVideoIds}
              reviewedVideoIds={reviewedVideoIds}
              trackedVideoIds={trackedVideoIds}
              emptyMessage="1만~3만 구독자 참고 후보가 없습니다."
            />
          </div>
        )}

        {!isArchive && reusableCandidateVideos.length > 0 && (
          <div className="space-y-2">
            <div>
              <h3 className="text-sm font-black text-slate-950">기존 검색에서 조건에 맞는 후보</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                다른 탭에서 이미 가져온 같은 카테고리 영상 중 현재 탭 필터를 통과한 후보입니다. API를 추가로 호출하지 않았습니다.
              </p>
            </div>
            <VideoTable
              videos={reusableCandidateVideos}
              onSave={saveVideo}
              onHide={hideVideo}
              onToggleReviewed={toggleReviewedVideo}
              onToggleTracked={toggleTrackedVideo}
              savedVideoIds={savedVideoIds}
              hiddenVideoIds={hiddenVideoIds}
              reviewedVideoIds={reviewedVideoIds}
              trackedVideoIds={trackedVideoIds}
              emptyMessage="기존 검색 결과에서 재활용할 후보가 없습니다."
            />
          </div>
        )}

        {!isArchive && showHiddenSubscriberVideos && hiddenSubscriberVideos.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-black text-slate-950">구독자 미공개 참고 후보</h3>
            <VideoTable
              videos={hiddenSubscriberVideos}
              onSave={saveVideo}
              onHide={hideVideo}
              onToggleReviewed={toggleReviewedVideo}
              onToggleTracked={toggleTrackedVideo}
              savedVideoIds={savedVideoIds}
              hiddenVideoIds={hiddenVideoIds}
              reviewedVideoIds={reviewedVideoIds}
              trackedVideoIds={trackedVideoIds}
              emptyMessage="구독자 미공개 참고 후보가 없습니다."
            />
          </div>
        )}
      </section>
    </div>
  );
};

export default KeywordSearch;
