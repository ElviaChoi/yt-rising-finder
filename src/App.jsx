import { useState } from 'react';
import Header from './components/Header';
import KeywordSearch from './components/KeywordSearch';

function App() {
  const [activeTab, setActiveTab] = useState('rising');

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-slate-50 text-slate-950">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="w-full min-w-0">
        <KeywordSearch activeTab={activeTab} />
      </main>
    </div>
  );
}

export default App;
