import Navigation from './Navigation';

const Header = ({ activeTab, onTabChange }) => {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">유튜브 키워드 분석</h1>
          <Navigation activeTab={activeTab} onTabChange={onTabChange} />
        </div>
      </div>
    </header>
  );
};

export default Header;

