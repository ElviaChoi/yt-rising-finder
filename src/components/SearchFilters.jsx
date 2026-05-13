import { expansionPresets, topicPresets } from '../data/topicPresets';

const numberOptions = [
  { value: '0', label: '제한 없음' },
  { value: '1000', label: '1천 이상' },
  { value: '5000', label: '5천 이상' },
  { value: '10000', label: '1만 이상' },
  { value: '30000', label: '3만 이상' },
  { value: '50000', label: '5만 이상' },
  { value: '100000', label: '10만 이상' },
];

const countryOptions = [
  { value: 'KR', label: '한국 KR' },
  { value: 'ALL', label: '전세계 제한 없음' },
  { value: 'US', label: '미국 US' },
  { value: 'JP', label: '일본 JP' },
  { value: 'GB', label: '영국 GB' },
];

const lengthLabels = {
  all: '전체',
  shortsOut: '쇼츠 제외(3분 미만 제외)',
  '8plus': '8분 이상',
  '12plus': '12분 이상',
  '15plus': '15분 이상',
  '20plus': '20분 이상(long)',
  '30plus': '30분 이상',
  '40plus': '40분 이상',
  '60plus': '60분 이상',
};

const selectClassName =
  'w-full appearance-none rounded-md border border-slate-300 bg-white px-3 py-2.5 pr-10 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

const FieldLabel = ({ icon, children }) => (
  <span className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded bg-slate-100 px-1 text-[11px] text-slate-600">
      {icon}
    </span>
    {children}
  </span>
);

const SelectBox = ({ value, onChange, children }) => (
  <div className="relative">
    <select value={value} onChange={onChange} className={selectClassName}>
      {children}
    </select>
    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-black text-slate-900">
      v
    </span>
  </div>
);

const formatViews = (value) =>
  value === '0' ? '제한 없음' : `${Number(value || 0).toLocaleString('ko-KR')}회 이상`;

const formatSubscribers = (value) =>
  value === '999999999' ? '제한 없음' : `${Number(value || 0).toLocaleString('ko-KR')}명 이하`;

const SearchFilters = ({
  filters,
  onFilterChange,
  onPresetSelect,
  activeTab,
  onRunSearch,
  loading,
  progress,
  onApplyFilters,
  hasResults,
  rawResultCount = 0,
  appliedFilters,
  estimatedSearchCalls = 0,
  cacheStats,
  onClearCache,
}) => {
  const selectedExpansion = expansionPresets.find((preset) => preset.id === filters.expansionId);
  const applied = appliedFilters || filters;

  return (
    <aside className="min-w-0 space-y-5">
      <section className="rounded-lg border border-rose-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="mb-3">
          <h2 className="text-lg font-bold text-slate-950">소재 카테고리</h2>
          <p className="mt-1 text-sm leading-5 text-slate-500">
            주제별 영상 수요를 작은 채널 롱폼 기회 필터로 검증합니다.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
          {topicPresets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onPresetSelect(preset)}
              className={`min-h-11 rounded-md border px-3 py-2 text-left text-sm font-semibold leading-5 transition ${
                filters.presetId === preset.id
                  ? 'border-rose-500 bg-rose-50 text-rose-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
              title={preset.description}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-950">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-sm text-blue-700">
            Q
          </span>
          검색 조건
        </h2>

        <div className="mb-4 rounded-md bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-800">
          후보 찾기는 YouTube API를 호출하고, 결과 필터는 이미 검색된 결과 안에서 다시 걸러냅니다.
        </div>

        <div className="space-y-4">
          <div className="rounded-md bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">
            검색 조건
          </div>

          <label className="block">
            <FieldLabel icon="Q">직접 키워드</FieldLabel>
            <input
              value={filters.keyword}
              onChange={(event) => onFilterChange('keyword', event.target.value)}
              placeholder="예: 은퇴 생활비, 세계경제, 인간관계"
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="block">
            <FieldLabel icon="+">검색 확장</FieldLabel>
            <SelectBox
              value={filters.expansionId}
              onChange={(event) => onFilterChange('expansionId', event.target.value)}
            >
              {expansionPresets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </SelectBox>
            <p className="mt-1 text-xs text-slate-500">{selectedExpansion?.hint}</p>
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <FieldLabel icon="D">기간</FieldLabel>
              <SelectBox
                value={filters.duration}
                onChange={(event) => onFilterChange('duration', event.target.value)}
              >
                <option value="7">7일</option>
                <option value="30">30일</option>
                <option value="90">90일</option>
                <option value="180">180일</option>
                <option value="365">1년</option>
              </SelectBox>
            </label>

            <label className="block">
              {activeTab === 'competitor' ? (
                <>
                  <FieldLabel icon="G">해외 언어</FieldLabel>
                  <SelectBox
                    value={filters.overseasLanguage || 'en'}
                    onChange={(event) => onFilterChange('overseasLanguage', event.target.value)}
                  >
                    <option value="en">영어권만</option>
                    <option value="ja">일본어만</option>
                    <option value="both">영어+일본어</option>
                  </SelectBox>
                </>
              ) : (
                <>
                  <FieldLabel icon="G">국가</FieldLabel>
                  <SelectBox
                    value={filters.countryCode}
                    onChange={(event) => onFilterChange('countryCode', event.target.value)}
                  >
                    {countryOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </SelectBox>
                </>
              )}
            </label>
          </div>

          <label className="block">
            <FieldLabel icon="#">검색량</FieldLabel>
            <SelectBox
              value={filters.maxKeywords}
              onChange={(event) => onFilterChange('maxKeywords', event.target.value)}
            >
              <option value="5">기본</option>
              <option value="8">넓게</option>
              <option value="12">많이</option>
              <option value="16">아주 많이</option>
            </SelectBox>
            <p className="mt-1 text-xs text-slate-500">
              예상 검색 호출 {estimatedSearchCalls.toLocaleString('ko-KR')}회 ·{' '}
              {(estimatedSearchCalls * 100).toLocaleString('ko-KR')} quota
            </p>
          </label>

          {activeTab !== 'archive' && (
            <button
              type="button"
              onClick={onRunSearch}
              disabled={loading}
              className="w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:bg-slate-300"
            >
              {loading ? progress || '검색 중' : '이 조건으로 후보 찾기'}
            </button>
          )}

          <div className="rounded-md bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">
            결과 필터
          </div>

          <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs leading-5 text-slate-600">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="font-bold text-slate-700">API/캐시</span>
              <button
                type="button"
                onClick={onClearCache}
                className="rounded bg-slate-100 px-2.5 py-1.5 font-bold text-slate-600 transition hover:bg-slate-200"
              >
                캐시 비우기
              </button>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              <span>API 호출</span>
              <span className="text-right font-bold">{(cacheStats?.apiCalls || 0).toLocaleString('ko-KR')}회</span>
              <span>캐시 적중</span>
              <span className="text-right font-bold">{(cacheStats?.hits || 0).toLocaleString('ko-KR')}회</span>
              <span>소비 quota</span>
              <span className="text-right font-bold">{(cacheStats?.quota || 0).toLocaleString('ko-KR')}</span>
            </div>
          </div>

          {hasResults && (
            <div className="rounded-md bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-800">
              검색 원본 {rawResultCount.toLocaleString('ko-KR')}개 중 현재 적용 기준: 조회수{' '}
              {formatViews(applied.minViews)}, 구독자 {formatSubscribers(applied.subscriberLimit)}, 길이{' '}
              {lengthLabels[applied.length]}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <FieldLabel icon="V">최소 조회수</FieldLabel>
              <SelectBox
                value={filters.minViews}
                onChange={(event) => onFilterChange('minViews', event.target.value)}
              >
                {numberOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectBox>
            </label>

            <label className="block">
              <FieldLabel icon="S">구독자 상한</FieldLabel>
              <SelectBox
                value={filters.subscriberLimit}
                onChange={(event) => onFilterChange('subscriberLimit', event.target.value)}
              >
                <option value="10000">1만 이하</option>
                <option value="30000">3만 이하</option>
                <option value="50000">5만 이하</option>
                <option value="100000">10만 이하</option>
                <option value="999999999">제한 없음</option>
              </SelectBox>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <FieldLabel icon="L">영상 길이</FieldLabel>
              <SelectBox
                value={filters.length}
                onChange={(event) => onFilterChange('length', event.target.value)}
              >
                <option value="all">전체</option>
                <option value="shortsOut">쇼츠 제외(3분 미만)</option>
                <option value="8plus">8분 이상</option>
                <option value="12plus">12분 이상</option>
                <option value="15plus">15분 이상</option>
                <option value="20plus">20분 이상(long)</option>
                <option value="30plus">30분 이상</option>
                <option value="40plus">40분 이상</option>
                <option value="60plus">60분 이상</option>
              </SelectBox>
            </label>

            <label className="block">
              <FieldLabel icon="R">정렬</FieldLabel>
              <SelectBox
                value={filters.sortBy}
                onChange={(event) => onFilterChange('sortBy', event.target.value)}
              >
                <option value="risingScore">작은 채널 반응도</option>
                <option value="viewSubscriberRatio">조회/구독 높은 순</option>
                <option value="hourlyViews">시간당 조회 높은 순</option>
                <option value="views">조회수 높은 순</option>
                <option value="publishedAt">최신순</option>
              </SelectBox>
            </label>
          </div>

          <button
            type="button"
            onClick={onApplyFilters}
            disabled={!hasResults}
            className="w-full rounded-md bg-rose-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-rose-700 disabled:bg-slate-300 disabled:text-slate-500"
          >
            필터 적용
          </button>

          <p className="text-xs leading-5 text-slate-500">
            후보 찾기는 새로 검색하고, 필터 적용은 이미 검색된 결과 안에서 조건만 다시 계산합니다.
          </p>

          {activeTab === 'competitor' && (
            <div className="rounded-md bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
              해외 원형 참고는 영어권 US/en, 일본어권 JP/ja로 검색합니다. API 검색은 20분 초과(long) 영상만 수집합니다.
            </div>
          )}
        </div>
      </section>
    </aside>
  );
};

export default SearchFilters;
