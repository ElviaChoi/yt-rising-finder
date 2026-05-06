const tabs = [
  { id: 'rising', label: '작은 채널 롱폼 기회' },
  { id: 'daily', label: '국내 수요 탐색' },
  { id: 'competitor', label: '해외 원형 참고' },
  { id: 'archive', label: '후보 보관함' },
];

const Navigation = ({ activeTab, onTabChange }) => {
  return (
    <nav className="flex gap-2 overflow-x-auto pb-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`whitespace-nowrap rounded-md px-4 py-2 text-sm font-semibold transition ${
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
