const tabs = [
  { id: 'rising', label: '작은 채널 롱폼 기회' },
  { id: 'daily', label: '국내 수요 탐색' },
  { id: 'competitor', label: '해외 원형 참고' },
  { id: 'archive', label: '후보 보관함' },
];

const Navigation = ({ activeTab, onTabChange }) => {
  return (
    <nav className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`min-h-10 shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold transition sm:px-4 ${
            activeTab === tab.id
              ? 'bg-slate-950 text-white shadow-sm'
              : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
};

export default Navigation;
