const Navigation = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'keyword', label: '키워드 검색' },
    { id: 'trend', label: '핫트렌드' }
  ];

  return (
    <nav className="flex space-x-1">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === tab.id
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
};

export default Navigation;

