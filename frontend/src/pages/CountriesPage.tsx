import React, { useState, useEffect } from 'react';
import { Search, MapPin, Globe } from 'lucide-react';
import { getCountriesList, getCountryByCode } from '../utils/countries';
import type { CountryProfile } from '../utils/countries';
import { Toast } from '../components/shared/Toast';

export const CountriesPage: React.FC = () => {
  const [countries] = useState<CountryProfile[]>(getCountriesList());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'Africa' | 'Asia' | 'Europe' | 'North America' | 'South America'>('all');
  
  const [selectedCountry, setSelectedCountry] = useState<CountryProfile | null>(null);
  
  // Toast notifications
  const [toastMsg, setToastMsg] = useState('');
  const [showToast, setShowToast] = useState(false);

  // Sync with current user country on mount
  useEffect(() => {
    const data = localStorage.getItem('harvest_guard_user');
    if (data) {
      const parsed = JSON.parse(data);
      const matched = getCountryByCode(parsed.country || 'IN');
      setSelectedCountry(matched);
    } else {
      setSelectedCountry(getCountryByCode('IN'));
    }
  }, []);

  const handleSetCountry = (country: CountryProfile) => {
    const data = localStorage.getItem('harvest_guard_user');
    if (data) {
      const parsed = JSON.parse(data);
      const updated = {
        ...parsed,
        country: country.code,
        countryName: country.name,
        flag: country.flag,
        currency: country.currency,
        crops: country.crops
      };
      localStorage.setItem('harvest_guard_user', JSON.stringify(updated));
      setSelectedCountry(country);
      window.dispatchEvent(new Event('storage'));
      
      setToastMsg(`🌍 Region updated — showing diseases and treatments for ${country.name}`);
      setShowToast(true);
    }
  };

  const filteredCountries = countries.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'all' || c.continent === activeTab;
    return matchesSearch && matchesTab;
  });

  return (
    <div className="w-full flex flex-col gap-6 select-none text-text-primary pb-10">
      
      <Toast 
        message={toastMsg}
        type="success"
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-display font-bold text-2xl text-white">Global Outbreak Coverage</h2>
          <p className="text-xs text-text-secondary">Explore crop health coverage across 195 UN-recognized countries.</p>
        </div>
      </div>

      {/* INTERACTIVE SIMPLIFIED WORLD MAP SVG */}
      <div className="w-full bg-bg-surface border border-border rounded-24 p-6 shadow-2xl relative overflow-hidden flex flex-col gap-4">
        <div className="absolute right-3 top-3 inline-flex items-center gap-1.5 bg-green-deep/50 border border-green-neon/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono text-green-neon">
          <Globe className="w-3.5 h-3.5" />
          <span>Interactive Server Outpost Feed</span>
        </div>

        <div className="w-full aspect-[2.2/1] bg-bg-base/30 rounded-16 flex items-center justify-center p-2 border border-border/40 relative">
          {/* Custom Stylized World Outline Vector Map */}
          <svg viewBox="0 0 1000 480" className="w-full h-full text-border-bright/20 stroke-border stroke-[1.2]">
            {/* Americas */}
            <path d="M 120 80 Q 150 140 100 190 T 150 280 T 190 380 T 220 440 L 230 430 Q 180 340 190 280 T 160 180 Z" fill="currentColor" />
            <path d="M 160 50 Q 240 70 280 120 T 190 200 Z" fill="currentColor" />
            {/* Africa */}
            <path d="M 450 180 Q 520 180 540 220 T 500 320 T 480 390 L 460 380 Q 420 300 440 230 Z" fill="currentColor" />
            {/* Europe */}
            <path d="M 430 80 Q 500 50 510 100 T 480 160 Z" fill="currentColor" />
            {/* Asia */}
            <path d="M 520 80 Q 640 40 740 60 T 820 140 T 780 240 T 640 220 Z" fill="currentColor" />
            {/* Oceania */}
            <path d="M 780 320 Q 840 320 820 380 T 760 360 Z" fill="currentColor" />

            {/* Glowing Outposts indicators (clickable nodes) */}
            {/* India Node */}
            <g className="cursor-pointer group" onClick={() => handleSetCountry(getCountryByCode('IN'))}>
              <circle cx="630" cy="180" r="14" fill="var(--green-neon)" className="opacity-20 animate-ping" />
              <circle cx="630" cy="180" r="6" fill="var(--green-neon)" className="stroke-white stroke-[1.5]" />
              <text x="630" y="165" textAnchor="middle" className="fill-white text-[10px] font-bold font-display opacity-0 group-hover:opacity-100 transition-opacity">IN (Active)</text>
            </g>

            {/* Kenya Node */}
            <g className="cursor-pointer group" onClick={() => handleSetCountry(getCountryByCode('KE'))}>
              <circle cx="515" cy="275" r="14" fill="var(--green-neon)" className="opacity-20 animate-ping" />
              <circle cx="515" cy="275" r="6" fill="var(--green-neon)" className="stroke-white stroke-[1.5]" />
              <text x="515" y="260" textAnchor="middle" className="fill-white text-[10px] font-bold font-display opacity-0 group-hover:opacity-100 transition-opacity">KE (Active)</text>
            </g>

            {/* USA Node */}
            <g className="cursor-pointer group" onClick={() => handleSetCountry(getCountryByCode('US'))}>
              <circle cx="210" cy="115" r="14" fill="var(--green-neon)" className="opacity-20 animate-ping" />
              <circle cx="210" cy="115" r="6" fill="var(--green-neon)" className="stroke-white stroke-[1.5]" />
              <text x="210" y="100" textAnchor="middle" className="fill-white text-[10px] font-bold font-display opacity-0 group-hover:opacity-100 transition-opacity">US (Active)</text>
            </g>

            {/* Brazil Node */}
            <g className="cursor-pointer group" onClick={() => handleSetCountry(getCountryByCode('BR'))}>
              <circle cx="270" cy="300" r="14" fill="var(--green-neon)" className="opacity-20 animate-ping" />
              <circle cx="270" cy="300" r="6" fill="var(--green-neon)" className="stroke-white stroke-[1.5]" />
              <text x="270" y="285" textAnchor="middle" className="fill-white text-[10px] font-bold font-display opacity-0 group-hover:opacity-100 transition-opacity">BR (Active)</text>
            </g>
          </svg>
        </div>

        <span className="text-[10px] text-text-secondary italic text-center">
          *Tap the flashing indicators on the map to switch your primary region instantly.
        </span>
      </div>

      {/* TWO PANEL LIST & DETAIL VIEWPORT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT PANEL: searchable list */}
        <div className="lg:col-span-7 bg-bg-surface border border-border rounded-24 p-5 flex flex-col gap-4 h-[440px]">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search among 195 countries..."
              className="w-full bg-bg-overlay border border-border focus:border-green-neon rounded-12 py-2 pl-10 pr-4 text-xs text-white focus:outline-none min-h-[36px]"
            />
          </div>

          {/* Continent Filter scroll */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {['all', 'Asia', 'Africa', 'Europe', 'North America', 'South America'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`text-[10px] font-bold whitespace-nowrap px-3 py-1.5 rounded-full border transition-all ${
                  activeTab === tab 
                    ? 'bg-green-deep text-green-neon border-green-neon/40' 
                    : 'bg-bg-overlay/40 text-text-secondary border-border hover:bg-bg-overlay'
                }`}
              >
                {tab === 'all' ? 'All Continents' : tab}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 pr-1 scrollbar-hide">
            {filteredCountries.map((c) => {
              const isActiveRegion = selectedCountry?.code === c.code;
              return (
                <div
                  key={c.code}
                  onClick={() => setSelectedCountry(c)}
                  className={`flex items-center justify-between p-3 rounded-12 border cursor-pointer transition-all ${
                    selectedCountry?.code === c.code 
                      ? 'bg-bg-overlay border-green-neon' 
                      : 'bg-bg-overlay/40 border-border/80 hover:bg-bg-overlay'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{c.flag}</span>
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        {c.name}
                        {isActiveRegion && (
                          <span className="bg-green-deep/30 border border-green-neon/20 px-2 py-0.5 rounded-full text-[8px] font-mono text-green-neon">
                            Active
                          </span>
                        )}
                      </h4>
                      <p className="text-[10px] text-text-secondary mt-0.5">Continent: {c.continent}</p>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-text-muted">{c.crops.length} Crops</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT PANEL: Country Detail Panel */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {selectedCountry ? (
            <div className="bg-bg-surface border border-border rounded-24 p-5 flex flex-col justify-between h-full min-h-[350px] shadow-2xl relative overflow-hidden">
              <div className="absolute right-0 top-0 w-32 h-32 rounded-full bg-green-neon/[0.02] blur-3xl pointer-events-none" />

              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{selectedCountry.flag}</span>
                    <div>
                      <h3 className="font-display font-bold text-lg text-white">{selectedCountry.name}</h3>
                      <p className="text-[10px] text-text-secondary font-mono">ISO Code: {selectedCountry.code}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div>
                    <span className="text-[10px] text-text-muted font-bold block uppercase tracking-wider">Currency Index</span>
                    <span className="font-mono text-xs text-white">{selectedCountry.currency}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-text-muted font-bold block uppercase tracking-wider">Supported Crops</span>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {selectedCountry.crops.map((crop) => (
                        <span key={crop} className="text-[9px] font-bold bg-bg-overlay border border-border/80 px-2.5 py-1 rounded-full text-text-secondary">
                          {crop}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-text-muted font-bold block uppercase tracking-wider">High Risk Pathogens</span>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {selectedCountry.diseases.map((dis) => (
                        <span key={dis} className="text-[9px] font-bold bg-sev-severe/10 border border-sev-severe/20 px-2.5 py-1 rounded-full text-sev-severe">
                          {dis}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-border/50 flex flex-col gap-2 mt-4">
                <button
                  onClick={() => handleSetCountry(selectedCountry)}
                  className="w-full bg-green-neon hover:bg-green-bright text-bg-base font-bold font-display py-3 rounded-12 transition-all flex items-center justify-center gap-2 min-h-[44px]"
                >
                  <MapPin className="w-4 h-4" />
                  Set as My Country
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-bg-surface border border-border rounded-24 p-5 flex flex-col items-center justify-center text-center h-full min-h-[350px]">
              <Globe className="w-10 h-10 text-text-muted/30 mb-3" />
              <h4 className="text-sm font-bold text-white">No Country Selected</h4>
              <p className="text-xs text-text-secondary max-w-xs mt-1">Please tap a country node on the map or select from the database list.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
