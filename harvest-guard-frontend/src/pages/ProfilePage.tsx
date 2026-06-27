import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  MapPin, 
  Trash2, 
  LogOut, 
  Globe, 
  Plus, 
  X, 
  Check, 
  BrainCircuit, 
  Bell, 
  CloudOff,
  Search,
  ShieldAlert
} from 'lucide-react';
import { clearAllScans } from '../utils/db';
import { getCountriesList, getCountryByCode } from '../utils/countries';
import type { CountryProfile } from '../utils/countries';
import { Toast } from '../components/shared/Toast';
import { BottomSheet } from '../components/shared/BottomSheet';

export const ProfilePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  // Session user state
  const [user, setUser] = useState<any>(null);

  // Preference switches
  const [notifications, setNotifications] = useState(true);
  const [offlineMode, setOfflineMode] = useState(false);

  // Region dropdown states
  const [countries] = useState<CountryProfile[]>(getCountriesList());
  const [selectedCountry, setSelectedCountry] = useState<CountryProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Outbox / Farm crops
  const [crops, setCrops] = useState<string[]>([]);
  const [isAddCropOpen, setIsAddCropOpen] = useState(false);
  const allCropsList = ['Wheat', 'Tomato', 'Rice', 'Potato', 'Maize', 'Soybean', 'Cotton', 'Coffee', 'Citrus', 'Banana', 'Mango', 'Grapes', 'Pepper', 'Onion'];

  // Clear modal and toast states
  const [isClearSheetOpen, setIsClearSheetOpen] = useState(false);
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    const data = localStorage.getItem('cropdoc_user');
    if (data) {
      const parsed = JSON.parse(data);
      setUser(parsed);
      setCrops(parsed.crops || ['Wheat']);
      setSelectedCountry(getCountryByCode(parsed.country || 'IN'));
    }
  }, []);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setShowToast(true);
  };

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('cropdoc_language', lang);
    triggerToast(`App language switched to ${lang === 'hi' ? 'हिन्दी (Hindi)' : 'English'}!`);
  };

  const handleCountrySelect = (country: CountryProfile) => {
    setSelectedCountry(country);
    setDropdownOpen(false);
    
    // Save updated country back to user session
    if (user) {
      const updated = {
        ...user,
        country: country.code,
        countryName: country.name,
        flag: country.flag,
        currency: country.currency
      };
      localStorage.setItem('cropdoc_user', JSON.stringify(updated));
      setUser(updated);
      window.dispatchEvent(new Event('storage'));
      triggerToast(`🌍 Country updated to ${country.name}`);
    }
  };

  const handleAddCrop = (crop: string) => {
    if (crops.includes(crop)) return;
    const updated = [...crops, crop];
    setCrops(updated);
    setIsAddCropOpen(false);
    
    if (user) {
      const updatedUser = { ...user, crops: updated };
      localStorage.setItem('cropdoc_user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      window.dispatchEvent(new Event('storage'));
      triggerToast(`🌿 Added ${crop} to your farms`);
    }
  };

  const handleRemoveCrop = (crop: string) => {
    const updated = crops.filter(c => c !== crop);
    setCrops(updated);
    
    if (user) {
      const updatedUser = { ...user, crops: updated };
      localStorage.setItem('cropdoc_user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      window.dispatchEvent(new Event('storage'));
      triggerToast(`Removed ${crop}`);
    }
  };

  const handleClearHistory = async () => {
    try {
      await clearAllScans();
      setIsClearSheetOpen(false);
      triggerToast('All saved scan history deleted.');
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error(e);
      triggerToast('Failed to clear database scans.');
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await clearAllScans();
      localStorage.removeItem('cropdoc_user');
      localStorage.removeItem('cropdoc_onboarding_seen');
      window.dispatchEvent(new Event('storage'));
      navigate('/');
    } catch (e) {
      console.error(e);
      triggerToast('Error deleting account.');
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('cropdoc_user');
    window.dispatchEvent(new Event('storage'));
    navigate('/');
  };

  const filteredCountries = countries.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full flex flex-col gap-6 select-none text-text-primary pb-10 max-w-4xl mx-auto">
      
      <Toast
        message={toastMsg}
        type="success"
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />

      {/* Profile Header Details card */}
      <div className="bg-bg-surface border border-border rounded-24 p-6 shadow-xl relative overflow-hidden flex flex-col sm:flex-row items-center gap-6">
        <div className="absolute right-0 top-0 w-32 h-32 rounded-full bg-green-neon/5 blur-3xl pointer-events-none" />

        <div className="w-16 h-16 rounded-full bg-green-deep border-2 border-green-neon/40 flex items-center justify-center font-bold text-2xl text-green-neon shrink-0">
          {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
        </div>

        <div className="flex-1 flex flex-col items-center sm:items-start text-center sm:text-left gap-1">
          <h2 className="font-display font-bold text-xl text-white">{user?.fullName || 'Global Farmer'}</h2>
          <p className="text-xs text-text-secondary font-mono">{user?.email || 'farmer@global.com'}</p>
          
          <div className="inline-flex items-center gap-1.5 bg-green-deep/30 border border-green-neon/20 px-2.5 py-0.5 rounded-full text-[9px] font-mono text-green-neon mt-1">
            <Check className="w-3 h-3 text-green-neon" />
            <span>Outbreak Alert Subscription Active</span>
          </div>
        </div>

        <button 
          onClick={handleSignOut}
          className="border border-border bg-bg-overlay/50 hover:bg-bg-overlay px-4 py-2.5 rounded-12 text-xs font-bold font-display text-white flex items-center gap-1.5 active:scale-95 transition-all"
        >
          <LogOut className="w-4 h-4 text-text-muted" />
          Sign Out
        </button>
      </div>

      {/* MY FARMS: add and manage active crop filters */}
      <div className="bg-bg-surface border border-border rounded-24 p-5 flex flex-col gap-4 shadow-lg">
        <div className="flex justify-between items-center border-b border-border/50 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">My Farm Crops</h3>
            <p className="text-[10px] text-text-secondary">Outgoing outpatient lists are prioritized based on these selections.</p>
          </div>
          
          <button
            onClick={() => setIsAddCropOpen(!isAddCropOpen)}
            className="text-[10px] font-bold text-green-neon hover:text-green-bright flex items-center gap-1 min-h-[32px]"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Crop
          </button>
        </div>

        {/* Crops add modal dropdown list */}
        {isAddCropOpen && (
          <div className="bg-bg-overlay border border-border rounded-16 p-3 flex flex-wrap gap-1.5 animate-fade-in">
            {allCropsList.map((crop) => (
              <button
                key={crop}
                onClick={() => handleAddCrop(crop)}
                className="text-[10px] font-bold bg-bg-surface border border-border/60 hover:border-green-neon hover:text-green-neon py-1 px-2.5 rounded-full text-text-secondary"
              >
                {crop}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {crops.length > 0 ? (
            crops.map((crop) => (
              <div 
                key={crop}
                className="bg-bg-overlay border border-border/80 rounded-full px-3 py-1.5 flex items-center gap-1.5 text-xs text-white"
              >
                <span>{crop}</span>
                <button 
                  onClick={() => handleRemoveCrop(crop)}
                  className="text-text-muted hover:text-sev-severe"
                  title={`Remove ${crop}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))
          ) : (
            <span className="text-xs text-text-muted italic">No active crops registered. Outbreaks will fall back to default wheat diagnostics.</span>
          )}
        </div>
      </div>

      {/* REGIONAL PREFERENCES AND TRANSLATIONS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Country Selector */}
        <div className="bg-bg-surface border border-border rounded-24 p-5 flex flex-col gap-4 shadow-lg relative">
          <h3 className="text-sm font-bold text-white tracking-wide border-b border-border/50 pb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-green-neon" />
            Outpost Registry Region
          </h3>
          
          <div className="flex flex-col gap-2 relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full bg-bg-overlay border border-border focus:border-green-neon rounded-12 px-3.5 py-3 text-xs text-left text-white focus:outline-none flex justify-between items-center min-h-[44px]"
            >
              <span>{selectedCountry ? `${selectedCountry.flag} ${selectedCountry.name}` : 'Select Outpost Region'}</span>
              <Search className="w-4 h-4 text-text-muted" />
            </button>
            
            {dropdownOpen && (
              <div className="absolute bottom-full mb-1 left-0 w-full max-h-40 overflow-y-auto bg-bg-elevated border border-border rounded-12 shadow-2xl z-50 flex flex-col p-2 gap-1.5 scrollbar-hide">
                <div className="relative sticky top-0 bg-bg-elevated z-10 pb-1.5 border-b border-border/40">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-text-muted" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search outpost region..."
                    className="w-full bg-bg-surface border border-border rounded-6 py-1.5 pl-8 pr-2 text-xs text-white focus:outline-none min-h-[28px]"
                  />
                </div>
                {filteredCountries.map(c => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => handleCountrySelect(c)}
                    className="flex items-center justify-between text-left text-xs px-2 py-2 rounded-6 hover:bg-bg-overlay text-white transition-colors"
                  >
                    <span>{c.flag} {c.name}</span>
                    {selectedCountry?.code === c.code && <Check className="w-3.5 h-3.5 text-green-neon" />}
                  </button>
                ))}
              </div>
            )}
            <p className="text-[10px] text-text-secondary leading-relaxed">
              *Outpost region determines outbound currency indexes, legal treatment rules, and regional common pathogen alerts.
            </p>
          </div>
        </div>

        {/* Translation switches */}
        <div className="bg-bg-surface border border-border rounded-24 p-5 flex flex-col gap-4 shadow-lg">
          <h3 className="text-sm font-bold text-white tracking-wide border-b border-border/50 pb-3 flex items-center gap-2">
            <Globe className="w-4 h-4 text-green-neon" />
            {t('settings.language')}
          </h3>
          
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => handleLanguageChange('en')}
              className={`py-2.5 px-4 rounded-12 text-xs font-bold transition-all border min-h-[40px] ${
                i18n.language === 'en'
                  ? 'bg-green-deep text-green-neon border-green-neon/50'
                  : 'bg-bg-overlay/50 text-text-secondary border-border hover:bg-bg-overlay'
              }`}
            >
              English
            </button>
            
            <button
              onClick={() => handleLanguageChange('hi')}
              className={`py-2.5 px-4 rounded-12 text-xs font-bold transition-all border min-h-[40px] ${
                i18n.language === 'hi'
                  ? 'bg-green-deep text-green-neon border-green-neon/50'
                  : 'bg-bg-overlay/50 text-text-secondary border-border hover:bg-bg-overlay'
              }`}
            >
              हिन्दी (Hindi)
            </button>
          </div>
          <p className="text-[10px] text-text-secondary">Select language to translates leaf diagnoses results instantly.</p>
        </div>
      </div>

      {/* AI TRAINING CONTRIBUTION STATS */}
      <div className="bg-bg-surface border border-border rounded-24 p-5 flex flex-col gap-4 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 w-24 h-24 rounded-full bg-green-neon/5 blur-xl pointer-events-none" />
        
        <h3 className="text-sm font-bold text-white tracking-wide border-b border-border/50 pb-3 flex items-center gap-2">
          <BrainCircuit className="w-4 h-4 text-green-neon" />
          AI Training Contribution Index
        </h3>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-bg-overlay/40 rounded-12 p-3 border border-border/50">
            <span className="text-[10px] text-text-muted font-bold block uppercase tracking-wider">Contributions</span>
            <span className="font-mono font-bold text-lg text-green-neon">14 Times</span>
          </div>
          <div className="bg-bg-overlay/40 rounded-12 p-3 border border-border/50">
            <span className="text-[10px] text-text-muted font-bold block uppercase tracking-wider">Scans Run</span>
            <span className="font-mono font-bold text-lg text-white">47 Total</span>
          </div>
          <div className="bg-bg-overlay/40 rounded-12 p-3 border border-border/50">
            <span className="text-[10px] text-text-muted font-bold block uppercase tracking-wider">Accuracy Reviews</span>
            <span className="font-mono font-bold text-lg text-white">14 Mapped</span>
          </div>
        </div>

        <p className="text-[10px] text-text-secondary leading-relaxed font-medium">
          🧠 By validating AI outcomes (with Thumbs Up / Thumbs Down), your submissions help optimize early blight and blast prediction loops for smallholder crops globally.
        </p>
      </div>

      {/* SYSTEM TOGGLE PREFERENCES */}
      <div className="bg-bg-surface border border-border rounded-24 p-5 flex flex-col gap-4 shadow-lg">
        <h3 className="text-sm font-bold text-white tracking-wide border-b border-border/50 pb-3">Preferences</h3>
        
        <div className="flex flex-col gap-3">
          {/* Dark Mode: Locked */}
          <div className="flex items-center justify-between p-2 rounded-12 bg-bg-overlay/45 border border-border/50">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">Dark Theme System</span>
              <span className="text-[10px] text-text-muted">Clinical dashboard optimized for sunlight-contrast. Locked.</span>
            </div>
            <span className="text-xs font-bold text-green-neon bg-green-deep/30 border border-green-neon/20 px-2.5 py-0.5 rounded-full">
              ACTIVE
            </span>
          </div>

          {/* Notifications Toggle */}
          <div className="flex items-center justify-between p-2 rounded-12 bg-bg-overlay/45 border border-border/50">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-green-neon" />
                Regional Outbreak Alarms
              </span>
              <span className="text-[10px] text-text-secondary">Outbreak notifications in my region.</span>
            </div>
            <input 
              type="checkbox"
              checked={notifications}
              onChange={() => setNotifications(!notifications)}
              className="w-4 h-4 border-border rounded accent-green-bright cursor-pointer"
            />
          </div>

          {/* Offline Mode Toggle */}
          <div className="flex items-center justify-between p-2 rounded-12 bg-bg-overlay/45 border border-border/50">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <CloudOff className="w-3.5 h-3.5 text-green-neon animate-pulse" />
                Offline Scan Buffering
              </span>
              <span className="text-[10px] text-text-secondary">Enqueues leaf images local to SQLite/IDB storage index.</span>
            </div>
            <input 
              type="checkbox"
              checked={offlineMode}
              onChange={() => setOfflineMode(!offlineMode)}
              className="w-4 h-4 border-border rounded accent-green-bright cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* CLEAN UP FLOWS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => setIsClearSheetOpen(true)}
          className="bg-bg-surface hover:bg-bg-overlay border border-border text-text-secondary hover:text-white font-bold py-3.5 rounded-12 text-xs flex items-center justify-center gap-2 min-h-[44px] shadow-sm transition-all"
        >
          <Trash2 className="w-4 h-4 text-text-muted" />
          Clear Scan History
        </button>

        <button
          onClick={() => setIsDeleteAccountOpen(true)}
          className="bg-sev-severe/10 border border-sev-severe/30 hover:bg-sev-severe/20 text-sev-severe font-bold py-3.5 rounded-12 text-xs flex items-center justify-center gap-2 min-h-[44px] shadow-sm transition-all"
        >
          <ShieldAlert className="w-4 h-4" />
          Delete Farm Profile
        </button>
      </div>

      {/* Clear Database modal sheet */}
      <BottomSheet
        isOpen={isClearSheetOpen}
        onClose={() => setIsClearSheetOpen(false)}
        title="Clear Scan History"
      >
        <div className="flex flex-col gap-5 text-text-primary">
          <p className="text-xs text-text-secondary leading-relaxed">
            This action is permanent and deletes all stored local diagnostic files.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setIsClearSheetOpen(false)}
              className="flex-1 bg-bg-overlay hover:bg-border/30 text-white border border-border font-semibold py-2.5 rounded-12 text-xs min-h-[40px]"
            >
              Cancel
            </button>
            <button
              onClick={handleClearHistory}
              className="flex-1 bg-sev-severe text-white hover:bg-opacity-90 font-bold py-2.5 rounded-12 text-xs min-h-[40px]"
            >
              Confirm Clear
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Delete Account modal sheet */}
      <BottomSheet
        isOpen={isDeleteAccountOpen}
        onClose={() => setIsDeleteAccountOpen(false)}
        title="Delete Farm Profile"
      >
        <div className="flex flex-col gap-5 text-text-primary">
          <p className="text-xs text-text-secondary leading-relaxed">
            This deletes your country preference, primary crop list, and local scan history. You will be redirected to the landing portal.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setIsDeleteAccountOpen(false)}
              className="flex-1 bg-bg-overlay hover:bg-border/30 text-white border border-border font-semibold py-2.5 rounded-12 text-xs min-h-[40px]"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteAccount}
              className="flex-1 bg-sev-severe text-white hover:bg-opacity-90 font-bold py-2.5 rounded-12 text-xs min-h-[40px]"
            >
              Delete Account
            </button>
          </div>
        </div>
      </BottomSheet>

    </div>
  );
};
