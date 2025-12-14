const SearchFilters = ({ filters, onFilterChange }) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">키워드:</label>
          <input
            type="text"
            value={filters.keyword}
            onChange={(e) => onFilterChange('keyword', e.target.value)}
            placeholder="검색할 키워드를 입력하세요"
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            style={{ paddingRight: '2.5rem' }}
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">국가코드(KR/US 등):</label>
          <input
            type="text"
            value={filters.countryCode}
            onChange={(e) => onFilterChange('countryCode', e.target.value)}
            placeholder="KR"
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            style={{ paddingRight: '2.5rem' }}
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">기간:</label>
          <select
            value={filters.duration}
            onChange={(e) => onFilterChange('duration', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            style={{ paddingRight: '2.5rem' }}
          >
            <option value="1주일">1주일</option>
            <option value="1달">1달</option>
            <option value="2달">2달</option>
            <option value="3달">3달</option>
            <option value="6달">6달</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">썸네일 크기(프리뷰):</label>
          <select
            value={filters.thumbnailSize}
            onChange={(e) => onFilterChange('thumbnailSize', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            style={{ paddingRight: '2.5rem' }}
          >
            <option value="100x75">100x75</option>
            <option value="200x150">200x150</option>
            <option value="320x180">320x180</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">길이:</label>
          <select
            value={filters.length}
            onChange={(e) => onFilterChange('length', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            style={{ paddingRight: '2.5rem' }}
          >
            <option value="전체">전체</option>
            <option value="짧음(20분)">짧음(20분)</option>
            <option value="중간(60분)">중간(60분)</option>
            <option value="김(60분 이상)">김(60분 이상)</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">최소 조회수:</label>
          <select
            value={filters.minViews}
            onChange={(e) => onFilterChange('minViews', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            style={{ paddingRight: '2.5rem' }}
          >
            <option value="0">미적용</option>
            <option value="1000">1,000</option>
            <option value="10000">10,000</option>
            <option value="50000">50,000</option>
            <option value="100000">100,000</option>
            <option value="500000">500,000</option>
            <option value="1000000">1,000,000</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">구독자 상한:</label>
          <select
            value={filters.subscriberLimit}
            onChange={(e) => onFilterChange('subscriberLimit', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            style={{ paddingRight: '2.5rem' }}
          >
            <option value="10000">10,000</option>
            <option value="50000">50,000</option>
            <option value="100000">100,000</option>
            <option value="500000">500,000</option>
            <option value="1000000">1,000,000</option>
            <option value="999999999">무제한</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">검색어당 최대 검색수:</label>
          <select
            value={filters.maxResults}
            onChange={(e) => onFilterChange('maxResults', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            style={{ paddingRight: '2.5rem' }}
          >
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="150">150</option>
            <option value="200">200</option>
            <option value="250">250</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">최소 시간당 조회수:</label>
          <select
            value={filters.minHourlyViews}
            onChange={(e) => onFilterChange('minHourlyViews', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            style={{ paddingRight: '2.5rem' }}
          >
            <option value="미적용">미적용</option>
            <option value="1">1</option>
            <option value="10">10</option>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="500">500</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">정렬 기준:</label>
          <select
            value={filters.sortStandard}
            onChange={(e) => onFilterChange('sortStandard', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            style={{ paddingRight: '2.5rem' }}
          >
            <option value="구독자">구독자</option>
            <option value="조회수">조회수</option>
            <option value="시간당조회수">시간당조회수</option>
            <option value="업로드일">업로드일</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">정렬 순서:</label>
          <select
            value={filters.sortOrder}
            onChange={(e) => onFilterChange('sortOrder', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            style={{ paddingRight: '2.5rem' }}
          >
            <option value="오름차순">오름차순</option>
            <option value="내림차순">내림차순</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default SearchFilters;

