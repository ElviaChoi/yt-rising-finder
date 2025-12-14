import { useState } from 'react';
import Header from './components/Header';
import KeywordSearch from './components/KeywordSearch';
import HotTrend from './components/HotTrend';

function App() {
  const [activeTab, setActiveTab] = useState('keyword');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'keyword':
        return <KeywordSearch />;
      case 'trend':
        return <HotTrend />;
      default:
        return <KeywordSearch />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      <main>
        {renderTabContent()}
      </main>
    </div>
  );
}

export default App;

