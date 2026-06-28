import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getCountriesList, getCountryByCode } from '../utils/countries';
import type { CountryProfile } from '../utils/countries';
import { Eye, EyeOff, Search, Check, X, ShieldCheck } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

const signupSchema = z.object({
  fullName: z.string().min(2, { message: 'Full name must be at least 2 characters' }),
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  country: z.string().min(2, { message: 'Please select a country' }),
});

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordValue, setPasswordValue] = useState('');
  
  // Country Selector States
  const [countries] = useState<CountryProfile[]>(getCountriesList());
  const [selectedCountry, setSelectedCountry] = useState<CountryProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  // Crop multi-selector states
  const cropOptions = ['Wheat', 'Tomato', 'Rice', 'Potato', 'Maize', 'Soybean', 'Cotton', 'Coffee'];
  const [selectedCrops, setSelectedCrops] = useState<string[]>(['Wheat']);

  const { register: loginRegister, handleSubmit: handleLoginSubmit, formState: { errors: loginErrors } } = useForm({
    resolver: zodResolver(loginSchema)
  });

  const { register: signupRegister, handleSubmit: handleSignupSubmit, setValue: setSignupValue, formState: { errors: signupErrors } } = useForm({
    resolver: zodResolver(signupSchema)
  });

  // Detect country from locale
  useEffect(() => {
    try {
      const locale = navigator.language;
      const code = locale.split('-')[1] || 'IN'; // fallback to India
      const match = getCountryByCode(code);
      setSelectedCountry(match);
      setSignupValue('country', match.code);
    } catch (e) {
      const match = getCountryByCode('IN');
      setSelectedCountry(match);
      setSignupValue('country', match.code);
    }
  }, [setSignupValue]);

  // Password strength logic
  const calculatePasswordStrength = (pass: string): { score: number; label: string; color: string } => {
    if (!pass) return { score: 0, label: 'None', color: 'bg-border' };
    let score = 0;
    if (pass.length >= 6) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    switch (score) {
      case 1:
        return { score: 1, label: 'Weak', color: 'bg-sev-severe' };
      case 2:
        return { score: 2, label: 'Fair', color: 'bg-sev-mild' };
      case 3:
        return { score: 3, label: 'Strong', color: 'bg-green-bright' };
      case 4:
      default:
        return { score: 4, label: 'Very Strong', color: 'bg-green-neon' };
    }
  };

  const strength = calculatePasswordStrength(passwordValue);

  const handleCropToggle = (crop: string) => {
    setSelectedCrops(prev => 
      prev.includes(crop) ? prev.filter(c => c !== crop) : [...prev, crop]
    );
  };

  const handleCountrySelect = (country: CountryProfile) => {
    setSelectedCountry(country);
    setSignupValue('country', country.code);
    setDropdownOpen(false);
  };

  const onSignIn = (data: any) => {
    // Generate mock session
    const mockUser = {
      email: data.email,
      fullName: data.email.split('@')[0],
      country: selectedCountry?.code || 'IN',
      countryName: selectedCountry?.name || 'India',
      flag: selectedCountry?.flag || '🇮🇳',
      currency: selectedCountry?.currency || 'INR',
      crops: selectedCrops
    };
    localStorage.setItem('harvest_guard_user', JSON.stringify(mockUser));
    // Dispatch session state update
    window.dispatchEvent(new Event('storage'));
    navigate('/scan');
  };

  const onSignUp = (data: any) => {
    const mockUser = {
      email: data.email,
      fullName: data.fullName,
      country: selectedCountry?.code || 'IN',
      countryName: selectedCountry?.name || 'India',
      flag: selectedCountry?.flag || '🇮🇳',
      currency: selectedCountry?.currency || 'INR',
      crops: selectedCrops
    };
    localStorage.setItem('harvest_guard_user', JSON.stringify(mockUser));
    window.dispatchEvent(new Event('storage'));
    navigate('/scan');
  };

  const handleGoogleSSO = () => {
    // Simulate SSO
    const mockUser = {
      email: 'farmer.global@gmail.com',
      fullName: 'Global Farmer',
      country: selectedCountry?.code || 'IN',
      countryName: selectedCountry?.name || 'India',
      flag: selectedCountry?.flag || '🇮🇳',
      currency: selectedCountry?.currency || 'INR',
      crops: ['Wheat', 'Tomato']
    };
    localStorage.setItem('harvest_guard_user', JSON.stringify(mockUser));
    window.dispatchEvent(new Event('storage'));
    navigate('/scan');
  };

  const filteredCountries = countries.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full min-h-screen bg-bg-base text-text-primary flex items-stretch select-none font-sans">
      
      {/* LEFT PANEL: Interactive Grad-CAM Showcase (Desktop Only) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-bg-surface to-bg-base border-r border-border p-12 flex-col justify-between relative overflow-hidden">
        {/* Particle Effect Overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(var(--border)_1px,transparent_1px)] [background-size:24px_24px] opacity-10" />
        
        <div className="flex items-center gap-2 relative z-10">
          <div className="w-10 h-10 rounded-8 bg-green-deep border border-green-bright/40 flex items-center justify-center text-lg">
            🌿
          </div>
          <span className="font-display font-bold text-2xl tracking-tight text-white">Harvest <span className="text-green-neon">Guard</span></span>
        </div>

        <div className="flex flex-col gap-6 max-w-lg relative z-10">
          {/* Mockup scan visualizer */}
          <div className="w-full aspect-[4/3] rounded-24 bg-bg-overlay border border-border/80 p-4 relative overflow-hidden flex flex-col justify-between shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-green-neon animate-ping" />
                <span className="text-xs font-mono text-text-secondary">SYSTEM ACTIVE // GRAD-CAM</span>
              </div>
              <span className="text-xs font-bold text-green-neon px-2 py-0.5 rounded-full bg-green-deep/50 border border-green-neon/30">
                Heatmap Evidentiary
              </span>
            </div>

            <div className="flex-1 flex items-center justify-center relative">
              {/* Circular diagnostic ring */}
              <div className="absolute w-40 h-40 rounded-full border border-green-neon/15 flex items-center justify-center">
                <div className="absolute w-32 h-32 rounded-full border border-green-neon/30 border-dashed animate-spin duration-10000" />
                <div className="absolute w-24 h-24 rounded-full bg-green-deep/30 border border-green-bright/50 flex items-center justify-center text-5xl shadow-[0_0_30px_rgba(57,255,135,0.15)]">
                  🍂
                </div>
              </div>
            </div>

            <div className="bg-bg-base border border-border/60 rounded-16 p-3.5 flex justify-between items-center text-xs">
              <div className="flex flex-col gap-1">
                <span className="text-text-muted font-bold block uppercase tracking-wider">Classification</span>
                <span className="font-display font-bold text-sm text-white">Tomato Early Blight</span>
              </div>
              <div className="text-right flex flex-col gap-1">
                <span className="text-text-muted font-bold block uppercase tracking-wider">Clinical Trust</span>
                <span className="font-mono font-bold text-sm text-green-neon">98.7% HIGH</span>
              </div>
            </div>
          </div>

          <h2 className="font-display font-bold text-4xl text-white leading-tight">
            Diagnose. Treat. Protect.
          </h2>
          <p className="text-text-secondary leading-relaxed">
            Register your crops to get instant notification warnings of regional agricultural outbreaks, humidity risk escalations, and certified local chemical control prescriptions.
          </p>
        </div>

        <div className="text-xs text-text-muted relative z-10 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-green-bright" />
          <span>Production-grade AES-256 cloud encryption.</span>
        </div>
      </div>

      {/* RIGHT PANEL: Auth Form (Full Screen Mobile / Right Side Desktop) */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 sm:px-12 lg:px-20 py-12 bg-bg-base">
        <div className="max-w-[400px] w-full mx-auto flex flex-col gap-8">
          
          {/* Logo for mobile */}
          <div className="flex lg:hidden items-center gap-2 justify-center">
            <div className="w-9 h-9 rounded-8 bg-green-deep border border-green-bright/40 flex items-center justify-center">
              🌿
            </div>
            <span className="font-display font-bold text-xl tracking-tight text-white">Harvest <span className="text-green-neon">Guard</span></span>
          </div>

          {/* Form Header Tabs */}
          <div className="flex flex-col gap-2">
            <h3 className="font-display font-bold text-2xl text-white text-center lg:text-left">
              {activeTab === 'signin' ? 'Sign In to Harvest Guard' : 'Create Farm Account'}
            </h3>
            
            <div className="grid grid-cols-2 bg-bg-surface border border-border rounded-8 p-1 mt-2">
              <button
                onClick={() => setActiveTab('signin')}
                className={`py-2 text-sm font-bold rounded-6 transition-all min-h-[36px] ${
                  activeTab === 'signin' 
                    ? 'bg-green-deep text-green-neon shadow-sm border border-green-neon/20' 
                    : 'text-text-secondary hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setActiveTab('signup')}
                className={`py-2 text-sm font-bold rounded-6 transition-all min-h-[36px] ${
                  activeTab === 'signup' 
                    ? 'bg-green-deep text-green-neon shadow-sm border border-green-neon/20' 
                    : 'text-text-secondary hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>
          </div>

          {/* SIGN IN FORM */}
          {activeTab === 'signin' && (
            <form onSubmit={handleLoginSubmit(onSignIn)} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">Email Address</label>
                <input
                  type="email"
                  {...loginRegister('email')}
                  className="w-full bg-bg-surface border border-border focus:border-green-neon rounded-8 px-3.5 py-3 text-sm focus:outline-none placeholder-text-muted/50 text-white min-h-[44px]"
                  placeholder="name@farm.com"
                />
                {loginErrors.email && (
                  <span className="text-xs text-sev-severe mt-0.5 flex items-center gap-1">
                    <X className="w-3.5 h-3.5" /> {loginErrors.email.message as string}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">Password</label>
                  <button 
                    type="button"
                    onClick={() => navigate('/landing')} // mock link reset or home
                    className="text-xs font-bold text-green-neon hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    {...loginRegister('password')}
                    className="w-full bg-bg-surface border border-border focus:border-green-neon rounded-8 pl-3.5 pr-10 py-3 text-sm focus:outline-none placeholder-text-muted/50 text-white min-h-[44px]"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-text-muted hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {loginErrors.password && (
                  <span className="text-xs text-sev-severe mt-0.5 flex items-center gap-1">
                    <X className="w-3.5 h-3.5" /> {loginErrors.password.message as string}
                  </span>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-green-neon hover:bg-green-bright text-bg-base font-bold font-display py-3.5 rounded-8 transition-all shadow-md shadow-green-neon/10 mt-2 min-h-[48px]"
              >
                Sign In
              </button>
            </form>
          )}

          {/* CREATE ACCOUNT FORM */}
          {activeTab === 'signup' && (
            <form onSubmit={handleSignupSubmit(onSignUp)} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">Full Name</label>
                <input
                  type="text"
                  {...signupRegister('fullName')}
                  className="w-full bg-bg-surface border border-border focus:border-green-neon rounded-8 px-3.5 py-3 text-sm focus:outline-none placeholder-text-muted/50 text-white min-h-[44px]"
                  placeholder="Jai Karthick"
                />
                {signupErrors.fullName && (
                  <span className="text-xs text-sev-severe mt-0.5 flex items-center gap-1">
                    <X className="w-3.5 h-3.5" /> {signupErrors.fullName.message as string}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">Email Address</label>
                <input
                  type="email"
                  {...signupRegister('email')}
                  className="w-full bg-bg-surface border border-border focus:border-green-neon rounded-8 px-3.5 py-3 text-sm focus:outline-none placeholder-text-muted/50 text-white min-h-[44px]"
                  placeholder="name@farm.com"
                />
                {signupErrors.email && (
                  <span className="text-xs text-sev-severe mt-0.5 flex items-center gap-1">
                    <X className="w-3.5 h-3.5" /> {signupErrors.email.message as string}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    {...signupRegister('password')}
                    onChange={(e) => setPasswordValue(e.target.value)}
                    className="w-full bg-bg-surface border border-border focus:border-green-neon rounded-8 pl-3.5 pr-10 py-3 text-sm focus:outline-none placeholder-text-muted/50 text-white min-h-[44px]"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-text-muted hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                
                {/* 4-level Password Strength Indicator */}
                {passwordValue && (
                  <div className="flex flex-col gap-1 mt-1 px-1">
                    <div className="flex justify-between items-center text-[10px] font-bold text-text-secondary">
                      <span>Strength: {strength.label}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 h-1 w-full bg-bg-overlay rounded-full overflow-hidden">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div 
                          key={i} 
                          className={`h-full rounded-full transition-all ${
                            i < strength.score ? strength.color : 'bg-transparent'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {signupErrors.password && (
                  <span className="text-xs text-sev-severe mt-0.5 flex items-center gap-1">
                    <X className="w-3.5 h-3.5" /> {signupErrors.password.message as string}
                  </span>
                )}
              </div>

              {/* Searchable Country Selector Dropdown */}
              <div className="flex flex-col gap-1.5 relative">
                <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">My Country</label>
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-full bg-bg-surface border border-border focus:border-green-neon rounded-8 px-3.5 py-3 text-sm text-left text-white focus:outline-none flex justify-between items-center min-h-[44px]"
                >
                  <span>{selectedCountry ? `${selectedCountry.flag} ${selectedCountry.name}` : 'Select Country'}</span>
                  <Search className="w-4 h-4 text-text-muted" />
                </button>
                
                {dropdownOpen && (
                  <div className="absolute bottom-full mb-1 left-0 w-full max-h-48 overflow-y-auto bg-bg-elevated border border-border rounded-8 shadow-2xl z-50 flex flex-col p-2 gap-1.5 scrollbar-hide">
                    <div className="relative sticky top-0 bg-bg-elevated z-10 pb-1.5 border-b border-border/40">
                      <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-text-muted" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search country..."
                        className="w-full bg-bg-surface border border-border rounded-6 py-1 pl-8 pr-2 text-xs text-white focus:outline-none min-h-[28px]"
                      />
                    </div>
                    {filteredCountries.map(c => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => handleCountrySelect(c)}
                        className="flex items-center justify-between text-left text-xs px-2 py-1.5 rounded-6 hover:bg-bg-overlay text-white transition-colors"
                      >
                        <span>{c.flag} {c.name}</span>
                        {selectedCountry?.code === c.code && <Check className="w-3.5 h-3.5 text-green-neon" />}
                      </button>
                    ))}
                  </div>
                )}
                {signupErrors.country && (
                  <span className="text-xs text-sev-severe mt-0.5 flex items-center gap-1">
                    <X className="w-3.5 h-3.5" /> {signupErrors.country.message as string}
                  </span>
                )}
              </div>

              {/* Primary Crop Chips Multi-Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">My Crops (Select multiple)</label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {cropOptions.map((crop) => {
                    const active = selectedCrops.includes(crop);
                    return (
                      <button
                        key={crop}
                        type="button"
                        onClick={() => handleCropToggle(crop)}
                        className={`text-xs font-semibold py-1.5 px-3 rounded-full transition-all border min-h-[32px] ${
                          active 
                            ? 'bg-green-deep text-green-neon border-green-neon/50' 
                            : 'bg-bg-surface text-text-secondary border-border hover:bg-bg-overlay'
                        }`}
                      >
                        {crop}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-green-neon hover:bg-green-bright text-bg-base font-bold font-display py-3.5 rounded-8 transition-all shadow-md shadow-green-neon/10 mt-2 min-h-[48px]"
              >
                Create Account
              </button>
            </form>
          )}

          {/* Social SSO login option */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3 text-xs text-text-muted font-bold uppercase tracking-wider select-none mt-2">
              <div className="h-[1px] bg-border/50 flex-1" />
              <span>Or continue with</span>
              <div className="h-[1px] bg-border/50 flex-1" />
            </div>

            <button
              onClick={handleGoogleSSO}
              className="w-full border border-border bg-bg-surface hover:bg-bg-overlay font-bold font-display py-3 px-4 rounded-8 text-sm flex items-center justify-center gap-2.5 transition-all text-white min-h-[44px]"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
              Google SSO Auth
            </button>
          </div>

          <div className="text-center text-xs text-text-muted mt-2">
            By accessing Harvest Guard, you agree to comply with our global farmer fair-usage standards and clinical data terms.
          </div>

        </div>
      </div>

    </div>
  );
};
