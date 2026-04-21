import Navigation from './Navigation';

const Header = ({ activeTab, onTabChange }) => {
  return (
    <header className="sticky top-0 z-20 w-full overflow-x-hidden border-b border-slate-200 bg-slate-50/95 backdrop-blur">
      <div className="mx-auto w-full max-w-[1500px] px-4 py-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-col gap-1">
          <p className="text-sm font-semibold text-blue-700">Senior YouTube Finder</p>
          <h1 className="text-2xl font-bold tracking-normal text-slate-950">
            작은 채널의 떡상 소재 찾기
          </h1>
        </div>
        <Navigation activeTab={activeTab} onTabChange={onTabChange} />
      </div>
    </header>
  );
};

export default Header;
