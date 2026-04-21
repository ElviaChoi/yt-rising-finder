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
  { value: 'ALL', label: '전세계/제한 없음' },
  { value: 'US', label: '미국 US' },
  { value: 'JP', label: '일본 JP' },
  { value: 'GB', label: '영국 GB' },
];

const FieldLabel = ({ icon, children }) => (
  <span className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded bg-slate-100 px-1 text-[11px] text-slate-600">
      {icon}
    </span>
    {children}
  </span>
);

const SearchFilters = ({ filters, onFilterChange, onPresetSelect, activeTab }) => {
  const selectedExpansion = expansionPresets.find((preset) => preset.id === filters.expansionId);

  return (
    <aside className="min-w-0 space-y-5">
      <section className="rounded-lg border border-rose-200 bg-white p-4 shadow-sm">
        <div className="mb-3">
          <h2 className="text-lg font-bold text-slate-950">소재 카테고리</h2>
          <p className="mt-1 text-sm leading-5 text-slate-500">
            큰 주제로 넓게 먼저 찾고, 조건은 결과가 많을 때만 줄이는 용도입니다.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {topicPresets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onPresetSelect(preset)}
              className={`rounded-md border px-3 py-2 text-left text-sm font-semibold transition ${
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

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-950">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-sm text-blue-700">
            Q
          </span>
          검색조건
        </h2>

        <div className="mb-4 rounded-md bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-800">
          검색 확장은 필터가 아닙니다. 기본 키워드를 먼저 찾고 남는 검색량에만 추가 표현을 붙입니다.
        </div>

        <div className="space-y-4">
          <label className="block">
            <FieldLabel icon="Q">직접 키워드</FieldLabel>
            <input
              value={filters.keyword}
              onChange={(event) => onFilterChange('keyword', event.target.value)}
              placeholder="예: 짚신, 중세 화장실, 조선 백성"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="block">
            <FieldLabel icon="+">검색 확장</FieldLabel>
            <select
              value={filters.expansionId}
              onChange={(event) => onFilterChange('expansionId', event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {expansionPresets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">{selectedExpansion?.hint}</p>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <FieldLabel icon="D">기간</FieldLabel>
              <select
                value={filters.duration}
                onChange={(event) => onFilterChange('duration', event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="7">7일</option>
                <option value="30">30일</option>
                <option value="90">90일</option>
                <option value="180">180일</option>
                <option value="365">1년</option>
              </select>
            </label>

            <label className="block">
              <FieldLabel icon="G">국가</FieldLabel>
              <select
                value={filters.countryCode}
                onChange={(event) => onFilterChange('countryCode', event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {countryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <FieldLabel icon="V">최소 조회수</FieldLabel>
              <select
                value={filters.minViews}
                onChange={(event) => onFilterChange('minViews', event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {numberOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <FieldLabel icon="S">구독자 상한</FieldLabel>
              <select
                value={filters.subscriberLimit}
                onChange={(event) => onFilterChange('subscriberLimit', event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="10000">1만 이하</option>
                <option value="30000">3만 이하</option>
                <option value="50000">5만 이하</option>
                <option value="100000">10만 이하</option>
                <option value="999999999">제한 없음</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <FieldLabel icon="L">영상 길이</FieldLabel>
              <select
                value={filters.length}
                onChange={(event) => onFilterChange('length', event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">전체</option>
                <option value="shortsOut">쇼츠 제외</option>
                <option value="8plus">8분 이상</option>
                <option value="15plus">15분 이상</option>
                <option value="30plus">30분 이상</option>
                <option value="40plus">40분 이상</option>
                <option value="60plus">60분 이상</option>
              </select>
            </label>

            <label className="block">
              <FieldLabel icon="#">검색량</FieldLabel>
              <select
                value={filters.maxKeywords}
                onChange={(event) => onFilterChange('maxKeywords', event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="5">가볍게</option>
                <option value="8">보통</option>
                <option value="12">넓게</option>
                <option value="16">아주 넓게</option>
              </select>
            </label>
          </div>

          <label className="block">
            <FieldLabel icon="R">정렬</FieldLabel>
            <select
              value={filters.sortBy}
              onChange={(event) => onFilterChange('sortBy', event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="risingScore">떡상지수 높은 순</option>
              <option value="viewSubscriberRatio">조회수/구독자 높은 순</option>
              <option value="hourlyViews">시간당 조회수 높은 순</option>
              <option value="views">조회수 높은 순</option>
              <option value="publishedAt">최신순</option>
            </select>
          </label>

          {activeTab === 'competitor' && (
            <div className="rounded-md bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
              해외/경쟁 벤치마킹은 구독자 상한을 제한 없음으로 두고, 국가는 전세계나 미국으로 바꾸면 더 넓게 볼 수 있습니다.
            </div>
          )}
        </div>
      </section>
    </aside>
  );
};

export default SearchFilters;
