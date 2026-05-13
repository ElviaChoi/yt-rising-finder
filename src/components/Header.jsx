import Navigation from './Navigation';

const Header = ({ activeTab, onTabChange }) => {
  return (
    <header className="sticky top-0 z-20 w-full overflow-x-hidden border-b border-slate-200 bg-slate-50/95 backdrop-blur">
      <div className="mx-auto w-full max-w-[1500px] px-3 py-3 sm:px-6 sm:py-4 lg:px-8">
        <div className="mb-3 flex flex-col gap-1 sm:mb-4">
          <p className="text-sm font-semibold text-blue-700">Longform Opportunity Finder</p>
          <h1 className="text-xl font-bold leading-7 tracking-normal text-slate-950 sm:text-2xl">
            작은 채널 롱폼 기회 검증
          </h1>
        </div>
        <Navigation activeTab={activeTab} onTabChange={onTabChange} />
      </div>
    </header>
  );
};

export default Header;
