import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Camera, Clock, BookOpen, Settings, ChevronLeft, ShieldAlert } from 'lucide-react';
import { getMockMode, setMockMode } from '../services/api';
import type { MockMode } from '../services/api';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [mockMode, setLocalMockMode] = useState<MockMode>(getMockMode());

  // Keep mock mode state in sync
  useEffect(() => {
    const handleStorage = () => {
      setLocalMockMode(getMockMode());
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const handleMockChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as MockMode;
    setMockMode(value);
    setLocalMockMode(value);
    // Reload page or trigger storage event to update API service
    window.dispatchEvent(new Event('storage'));
  };

  const currentPath = location.pathname;
  const isRoot = currentPath === '/' || currentPath === '/history' || currentPath === '/library';

  const getTitle = () => {
    if (currentPath === '/') return t('appName');
    if (currentPath === '/history') return t('nav.history');
    if (currentPath === '/library') return t('nav.library');
    if (currentPath === '/settings') return t('nav.settings');
    if (currentPath.startsWith('/library/')) return t('nav.library');
    if (currentPath.startsWith('/result/')) return t('appName');
    return t('appName');
  };

  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto bg-surface shadow-lg relative border-x border-border">
      {/* Top App Bar */}
      <header className="sticky top-0 z-30 bg-green-700 text-white px-4 py-3 flex items-center justify-between shadow-md select-none h-14">
        <div className="flex items-center gap-2">
          {!isRoot && (
            <button
              onClick={() => navigate(-1)}
              className="p-1 -ml-1 text-white hover:text-sage-100 rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Go back"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          <h1 className="text-xl font-bold tracking-wide sunlight-high-contrast truncate max-w-[180px]">
            {getTitle()}
          </h1>
        </div>

        {/* Developer Mock Tool & Settings */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-green-900/60 border border-green-500/30 rounded-8 px-1.5 py-0.5 text-xs text-sage-100 scale-90 sm:scale-100">
            <ShieldAlert className="w-3.5 h-3.5 text-sev-mild shrink-0 animate-pulse" />
            <select
              value={mockMode}
              onChange={handleMockChange}
              className="bg-transparent font-medium focus:outline-none cursor-pointer pr-1 text-white text-[11px]"
              title="Dev Demo Mode Selector"
            >
              <option value="confident" className="text-text-strong bg-white">Demo: Blight</option>
              <option value="lowconf" className="text-text-strong bg-white">Demo: Low Conf</option>
              <option value="healthy" className="text-text-strong bg-white">Demo: Healthy</option>
              <option value="notleaf" className="text-text-strong bg-white">Demo: Not Leaf</option>
              <option value="disabled" className="text-text-strong bg-white">Live Backend</option>
            </select>
          </div>

          <Link
            to="/settings"
            className="p-2 text-white hover:text-sage-100 rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 pb-20 overflow-y-auto bg-surface-alt px-4 py-4">
        {children}
      </main>

      {/* Bottom Nav Bar */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-surface border-t border-border flex items-center justify-around py-2 z-30 h-16 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
        <Link
          to="/"
          className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[48px] ${
            currentPath === '/' ? 'text-green-700 font-bold' : 'text-text-muted hover:text-green-500'
          }`}
        >
          <Camera className={`w-6 h-6 mb-0.5 ${currentPath === '/' ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
          <span className="text-[12px]">{t('nav.scan')}</span>
        </Link>

        <Link
          to="/history"
          className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[48px] ${
            currentPath === '/history' ? 'text-green-700 font-bold' : 'text-text-muted hover:text-green-500'
          }`}
        >
          <Clock className={`w-6 h-6 mb-0.5 ${currentPath === '/history' ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
          <span className="text-[12px]">{t('nav.history')}</span>
        </Link>

        <Link
          to="/library"
          className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[48px] ${
            currentPath.startsWith('/library') ? 'text-green-700 font-bold' : 'text-text-muted hover:text-green-500'
          }`}
        >
          <BookOpen className={`w-6 h-6 mb-0.5 ${currentPath.startsWith('/library') ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
          <span className="text-[12px]">{t('nav.library')}</span>
        </Link>
      </nav>
    </div>
  );
};
