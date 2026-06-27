import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Camera, 
  Clock, 
  BookOpen, 
  User, 
  Globe, 
  LogOut, 
  Menu, 
  Bell, 
  BrainCircuit, 
  ChevronLeft 
} from 'lucide-react';
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
  const [user, setUser] = useState<any>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Sync user profile
  useEffect(() => {
    const fetchUser = () => {
      const data = localStorage.getItem('cropdoc_user');
      if (data) {
        setUser(JSON.parse(data));
      }
    };
    fetchUser();
    window.addEventListener('storage', fetchUser);
    return () => window.removeEventListener('storage', fetchUser);
  }, []);

  const handleMockChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as MockMode;
    setMockMode(value);
    setLocalMockMode(value);
    window.dispatchEvent(new Event('storage'));
  };

  const handleSignOut = () => {
    localStorage.removeItem('cropdoc_user');
    window.dispatchEvent(new Event('storage'));
    navigate('/');
  };

  const currentPath = location.pathname;
  const isScan = currentPath === '/scan';

  const menuItems = [
    { path: '/scan', label: 'Scan Leaf', icon: Camera },
    { path: '/history', label: t('nav.history'), icon: Clock },
    { path: '/library', label: t('nav.library'), icon: BookOpen },
    { path: '/countries', label: 'Countries', icon: Globe },
    { path: '/profile', label: 'Profile', icon: User }
  ];

  return (
    <div className="flex min-h-screen w-full bg-bg-base text-text-primary font-sans select-none">
      
      {/* 1. DESKTOP SIDEBAR (Visible on screens >= 768px) */}
      <aside 
        className={`hidden md:flex flex-col justify-between bg-bg-surface border-r border-border transition-all duration-350 shrink-0 ${
          isSidebarCollapsed ? 'w-20' : 'w-60'
        }`}
      >
        <div className="flex flex-col gap-6">
          {/* Logo Block */}
          <div className={`p-6 flex items-center justify-between border-b border-border/60 ${isSidebarCollapsed ? 'justify-center px-4' : ''}`}>
            {!isSidebarCollapsed ? (
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🌿</span>
                <span className="font-display font-bold text-lg tracking-tight text-white">
                  CropDoc <span className="text-green-neon">AI</span>
                </span>
              </div>
            ) : (
              <span className="text-2xl animate-pulse">🌿</span>
            )}
            
            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="text-text-muted hover:text-white p-1 rounded-4 hover:bg-bg-overlay"
              title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5 px-3">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-8 font-semibold text-sm transition-all hover:bg-bg-overlay ${
                    isActive 
                      ? 'bg-green-deep text-green-neon border-l-4 border-green-neon shadow-md shadow-green-neon/5' 
                      : 'text-text-secondary hover:text-white'
                  } ${isSidebarCollapsed ? 'justify-center px-0 border-l-0' : ''}`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-green-neon' : ''}`} />
                  {!isSidebarCollapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Details & Sign Out */}
        <div className="flex flex-col p-4 gap-4 border-t border-border/60 bg-bg-surface/50">
          {/* AI Simulation Engine Selector inside Sidebar */}
          {!isSidebarCollapsed ? (
            <div className="flex items-center gap-1.5 bg-bg-overlay border border-border/80 rounded-8 px-2 py-1.5 text-xs text-text-secondary">
              <BrainCircuit className="w-4 h-4 text-green-neon shrink-0" />
              <select
                value={mockMode}
                onChange={handleMockChange}
                className="bg-transparent font-medium focus:outline-none cursor-pointer pr-1 text-white text-[11px] w-full"
                title="AI Analysis Engine Mode"
              >
                <option value="confident" className="text-white bg-bg-surface">AI: Early Blight</option>
                <option value="lowconf" className="text-white bg-bg-surface">AI: Low Confidence</option>
                <option value="healthy" className="text-white bg-bg-surface">AI: Healthy Leaf</option>
                <option value="notleaf" className="text-white bg-bg-surface">AI: Non-Leaf Object</option>
                <option value="pest" className="text-white bg-bg-surface">AI: Pest Infestation</option>
                <option value="disabled" className="text-white bg-bg-surface">AI: Production Cloud</option>
              </select>
            </div>
          ) : (
            <BrainCircuit className="w-5 h-5 text-green-neon mx-auto animate-pulse" />
          )}

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-green-deep border border-green-neon/30 flex items-center justify-center font-bold text-xs text-green-neon shrink-0 select-all">
                {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              {!isSidebarCollapsed && (
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-white truncate">{user?.fullName || 'Global Farmer'}</span>
                  <span className="text-[10px] text-text-secondary truncate">{user?.email || 'farmer@global.com'}</span>
                </div>
              )}
            </div>
            
            {!isSidebarCollapsed && (
              <button 
                onClick={handleSignOut}
                className="p-1.5 hover:bg-bg-overlay text-text-muted hover:text-sev-severe rounded-6 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* 2. MAIN CONTENT VIEWPORT */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen relative pb-20 md:pb-0">
        
        {/* MOBILE HEADER (Visible on screens < 768px) */}
        <header className="flex md:hidden sticky top-0 z-30 bg-bg-surface/90 backdrop-blur-md border-b border-border px-4 py-3.5 items-center justify-between h-14">
          <div className="flex items-center gap-2">
            {!isScan && (
              <button
                onClick={() => navigate(-1)}
                className="p-1 -ml-1 text-text-secondary hover:text-white rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Go back"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <h1 className="text-base font-bold tracking-tight text-white uppercase">
              {currentPath.startsWith('/result') ? 'Scan Report' : currentPath.split('/')[1] || 'Scan'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* AI Engine switcher inside Mobile top-bar */}
            <div className="flex items-center gap-1 bg-bg-overlay border border-border/80 rounded-6 px-1.5 py-0.5 text-xs text-text-secondary scale-90">
              <BrainCircuit className="w-3.5 h-3.5 text-green-neon" />
              <select
                value={mockMode}
                onChange={handleMockChange}
                className="bg-transparent font-medium focus:outline-none cursor-pointer pr-1 text-white text-[10px]"
                title="AI Analysis Engine Mode"
              >
                <option value="confident" className="text-white bg-bg-surface">AI: Early Blight</option>
                <option value="lowconf" className="text-white bg-bg-surface">AI: Low Confidence</option>
                <option value="healthy" className="text-white bg-bg-surface">AI: Healthy</option>
                <option value="notleaf" className="text-white bg-bg-surface">AI: Non-Leaf</option>
                <option value="pest" className="text-white bg-bg-surface">AI: Pest Infestation</option>
                <option value="disabled" className="text-white bg-bg-surface">AI: Live Cloud</option>
              </select>
            </div>

            <button className="text-text-secondary hover:text-white relative p-1.5" title="Notifications">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-green-neon" />
            </button>
            
            <Link to="/profile" className="w-7 h-7 rounded-full bg-green-deep border border-green-neon/30 flex items-center justify-center font-bold text-[10px] text-green-neon">
              {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
            </Link>
          </div>
        </header>

        {/* Content Wrapper */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-6 overflow-y-auto">
          {children}
        </main>

        {/* MOBILE BOTTOM NAVIGATION BAR (Visible on screens < 768px) */}
        <nav className="flex md:hidden fixed bottom-0 left-0 right-0 bg-bg-surface/95 backdrop-blur-md border-t border-border items-center justify-around py-2.5 z-30 h-16 shadow-[0_-4px_12px_rgba(0,0,0,0.2)]">
          <Link
            to="/scan"
            className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[48px] ${
              currentPath === '/scan' ? 'text-green-neon font-bold' : 'text-text-secondary hover:text-white'
            }`}
          >
            <Camera className="w-5 h-5 mb-1" />
            <span className="text-[10px] tracking-wide">Scan</span>
          </Link>

          <Link
            to="/history"
            className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[48px] ${
              currentPath === '/history' ? 'text-green-neon font-bold' : 'text-text-secondary hover:text-white'
            }`}
          >
            <Clock className="w-5 h-5 mb-1" />
            <span className="text-[10px] tracking-wide">{t('nav.history')}</span>
          </Link>

          <Link
            to="/library"
            className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[48px] ${
              currentPath.startsWith('/library') ? 'text-green-neon font-bold' : 'text-text-secondary hover:text-white'
            }`}
          >
            <BookOpen className="w-5 h-5 mb-1" />
            <span className="text-[10px] tracking-wide">{t('nav.library')}</span>
          </Link>

          <Link
            to="/profile"
            className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[48px] ${
              currentPath === '/profile' ? 'text-green-neon font-bold' : 'text-text-secondary hover:text-white'
            }`}
          >
            <User className="w-5 h-5 mb-1" />
            <span className="text-[10px] tracking-wide">Profile</span>
          </Link>
        </nav>

      </div>

    </div>
  );
};

