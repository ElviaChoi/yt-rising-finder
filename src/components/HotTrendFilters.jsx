const HotTrendFilters = ({ filters, onFilterChange }) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">기간:</label>
          <select
            value={filters.duration}
            onChange={(e) => onFilterChange('duration', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            style={{ paddingRight: '2.5rem' }}
          >
            <option value="1개월">1개월</option>
            <option value="2개월">2개월</option>
            <option value="3개월">3개월</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">국가코드:</label>
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
          <label className="text-sm font-medium text-gray-700 mb-1">최소 영상 길이:</label>
          <select
            value={filters.minDuration}
            onChange={(e) => onFilterChange('minDuration', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            style={{ paddingRight: '2.5rem' }}
          >
            <option value="20">20분</option>
            <option value="30">30분</option>
            <option value="40">40분</option>
            <option value="60">60분</option>
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
            <option value="10000">10,000</option>
            <option value="50000">50,000</option>
            <option value="100000">100,000</option>
            <option value="500000">500,000</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">최대 결과 수:</label>
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
            <option value="조회수">조회수</option>
            <option value="업로드일">업로드일</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default HotTrendFilters;

