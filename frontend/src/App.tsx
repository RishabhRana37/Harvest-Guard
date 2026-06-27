import { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { Onboarding } from './components/Onboarding';
import { ScanPage } from './pages/ScanPage';
import { ResultPage } from './pages/ResultPage';
import { HistoryPage } from './pages/HistoryPage';
import { LibraryPage } from './pages/LibraryPage';
import { DiseaseDetailPage } from './pages/DiseaseDetailPage';
import { SettingsPage } from './pages/SettingsPage';

function App() {
  const [showOnboarding, setShowOnboarding] = useState<boolean>(true);

  useEffect(() => {
    const onboardingSeen = localStorage.getItem('cropdoc_onboarding_seen');
    if (onboardingSeen === 'true') {
      setShowOnboarding(false);
    }
  }, []);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  return (
    <Router>
      {showOnboarding ? (
        <Onboarding onComplete={handleOnboardingComplete} />
      ) : (
        <AppShell>
          <Routes>
            <Route path="/" element={<ScanPage />} />
            <Route path="/result/:id" element={<ResultPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/library/:slug" element={<DiseaseDetailPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </AppShell>
      )}
    </Router>
  );
}

export default App;
