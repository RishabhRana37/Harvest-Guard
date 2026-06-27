import { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { Onboarding } from './components/Onboarding';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { ScanPage } from './pages/ScanPage';
import { ResultPage } from './pages/ResultPage';
import { HistoryPage } from './pages/HistoryPage';
import { LibraryPage } from './pages/LibraryPage';
import { DiseaseDetailPage } from './pages/DiseaseDetailPage';
import { CountriesPage } from './pages/CountriesPage';
import { ProfilePage } from './pages/ProfilePage';
import { AnimatedBackground } from './components/AnimatedBackground';

// Protected Route Guard
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const user = localStorage.getItem('cropdoc_user');
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

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
      {/* Global Animated Background Layer */}
      <AnimatedBackground />

      <Routes>
        {/* Unauthenticated routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Authenticated dashboard routes */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              {showOnboarding ? (
                <Onboarding onComplete={handleOnboardingComplete} />
              ) : (
                <AppShell>
                  <Routes>
                    <Route path="/scan" element={<ScanPage />} />
                    <Route path="/result/:id" element={<ResultPage />} />
                    <Route path="/history" element={<HistoryPage />} />
                    <Route path="/library" element={<LibraryPage />} />
                    <Route path="/library/:slug" element={<DiseaseDetailPage />} />
                    <Route path="/countries" element={<CountriesPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    {/* Fallbacks */}
                    <Route path="/settings" element={<Navigate to="/profile" replace />} />
                    <Route path="*" element={<Navigate to="/scan" replace />} />
                  </Routes>
                </AppShell>
              )}
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
