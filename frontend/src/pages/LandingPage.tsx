import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  Play, 
  Bug, 
  Sparkles,
  ChevronRight,
  MapPin
} from 'lucide-react';

interface CropShowcaseItem {
  name: string;
  count: number;
  risk: 'Low' | 'Medium' | 'High';
  color: string;
  emoji: string;
}

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [carouselIndex, setCarouselIndex] = useState(0);

  const carouselItems = [
    { name: 'Wheat Leaf', type: 'Fungal Rust', color: 'from-amber-650/40 to-bg-surface', emoji: '🌾' },
    { name: 'Tomato Leaf', type: 'Early Blight', color: 'from-red-600/40 to-bg-surface', emoji: '🍅' },
    { name: 'Rice Leaf', type: 'Blast Disease', color: 'from-green-600/40 to-bg-surface', emoji: '🌾' },
    { name: 'Potato Leaf', type: 'Late Blight', color: 'from-yellow-700/40 to-bg-surface', emoji: '🥔' },
    { name: 'Maize Leaf', type: 'Corn Smut', color: 'from-yellow-500/40 to-bg-surface', emoji: '🌽' },
  ];

  const cropsList: CropShowcaseItem[] = [
    { name: 'Wheat', count: 23, risk: 'Medium', color: 'from-amber-500/20 to-bg-surface', emoji: '🌾' },
    { name: 'Tomato', count: 18, risk: 'High', color: 'from-red-500/20 to-bg-surface', emoji: '🍅' },
    { name: 'Rice', count: 15, risk: 'High', color: 'from-emerald-500/20 to-bg-surface', emoji: '🌾' },
    { name: 'Potato', count: 14, risk: 'Medium', color: 'from-yellow-600/20 to-bg-surface', emoji: '🥔' },
    { name: 'Maize', count: 12, risk: 'Low', color: 'from-yellow-400/20 to-bg-surface', emoji: '🌽' },
    { name: 'Soybean', count: 16, risk: 'Medium', color: 'from-green-500/20 to-bg-surface', emoji: '🫘' },
    { name: 'Cotton', count: 11, risk: 'High', color: 'from-blue-200/20 to-bg-surface', emoji: '🌿' },
    { name: 'Banana', count: 9, risk: 'Low', color: 'from-yellow-300/20 to-bg-surface', emoji: '🍌' },
    { name: 'Mango', count: 13, risk: 'Medium', color: 'from-orange-400/20 to-bg-surface', emoji: '🥭' },
    { name: 'Grapes', count: 20, risk: 'High', color: 'from-purple-500/20 to-bg-surface', emoji: '🍇' },
    { name: 'Pepper', count: 15, risk: 'Medium', color: 'from-red-400/20 to-bg-surface', emoji: '🌶' },
    { name: 'Onion', count: 8, risk: 'Low', color: 'from-amber-200/20 to-bg-surface', emoji: '🧅' }
  ];

  const testimonials = [
    { name: 'Jai Kumar', country: 'India 🇮🇳', crop: 'Tomato & Rice', text: 'Harvest Guard saved my entire autumn harvest. The diagnosis was instant and the copper spray recipe was perfectly legal and accessible here.' },
    { name: 'Samuel Kiprop', country: 'Kenya 🇰🇪', crop: 'Maize & Coffee', text: 'I had doubts, but the offline queuing works. I diagnosed maize blight in the deep valley fields with zero cellular connectivity.' },
    { name: 'Ethan Jenkins', country: 'Iowa, USA 🇺🇸', crop: 'Soybean & Corn', text: 'The pest detection toggle spotted our early aphid infestation before the leaves even turned yellow. Best clinical farming UI ever.' }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % carouselItems.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleStart = () => {
    const user = localStorage.getItem('harvest_guard_user');
    if (user) {
      navigate('/scan');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="w-full flex flex-col bg-transparent text-text-primary scroll-smooth font-sans select-none min-h-screen">
      
      {/* Navigation Top Banner */}
      <header className="w-full border-b border-border/80 bg-bg-surface/85 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-8 bg-green-deep border border-green-bright/40 flex items-center justify-center">
            <span className="text-xl">🌿</span>
          </div>
          <span className="font-display font-bold text-xl tracking-tight text-white">Harvest <span className="text-green-neon">Guard</span></span>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/login')}
            className="text-sm font-bold text-text-secondary hover:text-white transition-colors"
          >
            Sign In
          </button>
          <button 
            onClick={handleStart}
            className="bg-green-bright hover:bg-green-neon hover:text-bg-base text-white px-4 py-2 rounded-8 text-xs font-bold font-display transition-all shadow-md active:scale-95"
          >
            Go to App
          </button>
        </div>
      </header>

      {/* 1. HERO SECTION */}
      <section className="relative w-full max-w-7xl mx-auto px-6 py-12 md:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7 flex flex-col items-start text-left gap-6">
          <div className="inline-flex items-center gap-2 bg-green-deep/50 border border-green-neon/20 px-3 py-1 rounded-full text-xs font-semibold text-green-neon">
            <Sparkles className="w-3.5 h-3.5" />
            <span>V2.0 Dark Intelligence Engine Released</span>
          </div>

          <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl text-white leading-tight">
            Know what's killing your crops. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-neon via-green-bright to-ai-blue">
              Before it's too late.
            </span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-text-secondary leading-relaxed max-w-xl">
            AI-powered crop disease and pest detection in under 3 seconds. Supported for 38+ crops, covering 195 countries with region-specific organic treatment regimes.
          </p>

          <div className="flex flex-wrap gap-4 mt-2">
            <button 
              onClick={handleStart}
              className="bg-green-neon hover:bg-green-bright text-bg-base font-bold font-display px-6 py-3.5 rounded-8 shadow-lg shadow-green-neon/15 hover:shadow-green-neon/25 transition-all flex items-center gap-2 active:scale-95 min-h-[48px]"
            >
              Get Started Now
              <ArrowRight className="w-4 h-4" />
            </button>
            <a 
              href="#how-it-works"
              className="border border-border bg-bg-surface/40 hover:bg-bg-overlay text-white font-bold font-display px-6 py-3.5 rounded-8 transition-all flex items-center gap-2 min-h-[48px]"
            >
              <Play className="w-4 h-4 text-green-neon" />
              See How It Works
            </a>
          </div>
        </div>

        {/* Hero Interactive Carousel Overlay */}
        <div className="lg:col-span-5 flex justify-center items-center w-full">
          <div className="relative w-full max-w-[340px] aspect-square rounded-24 overflow-hidden border border-border p-4 bg-bg-surface shadow-2xl flex flex-col justify-between">
            <div className="absolute inset-0 bg-gradient-to-br from-bg-overlay/40 to-bg-base/90 -z-10" />
            
            {/* Holographic Glowing scanner frame */}
            <div className="absolute inset-0 border border-green-neon/20 rounded-24 pointer-events-none animate-pulse" />

            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-green-neon select-all">SCAN_ID_MOCK_{carouselIndex}</span>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sev-severe/20 text-sev-severe border border-sev-severe/30 animate-pulse">
                Infected
              </span>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center py-6 gap-4">
              <div className="relative w-24 h-24 rounded-full flex items-center justify-center bg-bg-overlay/60 border border-green-neon/30 shadow-[0_0_20px_rgba(57,255,135,0.15)]">
                <span className="text-4xl">{carouselItems[carouselIndex].emoji}</span>
                {/* Green neon pulse ring */}
                <div className="absolute inset-0 rounded-full border border-green-neon animate-ping opacity-25" />
              </div>
              
              <div className="text-center">
                <h3 className="font-display font-bold text-lg text-white">{carouselItems[carouselIndex].name}</h3>
                <p className="text-sm text-text-secondary font-mono mt-0.5">{carouselItems[carouselIndex].type}</p>
              </div>
            </div>

            <div className="bg-bg-overlay border border-border rounded-12 p-3 flex justify-between items-center">
              <div>
                <span className="text-[10px] text-text-muted font-bold block uppercase tracking-wider">Confidence</span>
                <span className="font-mono font-bold text-base text-green-neon">98.4%</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-text-muted font-bold block uppercase tracking-wider font-mono">Diag Time</span>
                <span className="font-mono text-sm text-text-primary">1.8s</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. STATS BAR */}
      <section className="w-full bg-bg-surface border-y border-border py-8 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-6 text-center">
          <div>
            <h4 className="font-display font-bold text-3xl text-green-neon">38+</h4>
            <p className="text-xs font-bold text-text-secondary uppercase tracking-wider mt-1">Crops Supported</p>
          </div>
          <div>
            <h4 className="font-display font-bold text-3xl text-green-neon">95%</h4>
            <p className="text-xs font-bold text-text-secondary uppercase tracking-wider mt-1">AI Accuracy</p>
          </div>
          <div>
            <h4 className="font-display font-bold text-3xl text-green-neon">&lt; 3s</h4>
            <p className="text-xs font-bold text-text-secondary uppercase tracking-wider mt-1">Diagnosis Speed</p>
          </div>
          <div>
            <h4 className="font-display font-bold text-3xl text-green-neon">195</h4>
            <p className="text-xs font-bold text-text-secondary uppercase tracking-wider mt-1">Countries Available</p>
          </div>
          <div className="col-span-2 md:col-span-1">
            <h4 className="font-display font-bold text-3xl text-green-neon">Pest + Disease</h4>
            <p className="text-xs font-bold text-text-secondary uppercase tracking-wider mt-1">Dual Mode Scan</p>
          </div>
        </div>
      </section>

      {/* 3. CROP SHOWCASE SECTION */}
      <section className="w-full max-w-7xl mx-auto px-6 py-16 flex flex-col gap-8">
        <div className="text-center flex flex-col gap-2">
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-white">Every crop. Every disease. Every country.</h2>
          <p className="text-sm text-text-secondary max-w-lg mx-auto">
            Swipe through some of our fully-characterized agricultural species. Tap any element to view specialized profiles.
          </p>
        </div>

        {/* Crops Showcase horizontal scroll grid */}
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
          {cropsList.map((crop) => (
            <div 
              key={crop.name}
              onClick={handleStart}
              className="bg-bg-surface border border-border hover:border-green-neon/50 rounded-16 p-4 flex flex-col justify-between min-w-[210px] max-w-[220px] aspect-[4/5] snap-start shrink-0 cursor-pointer transition-all hover:scale-[1.03] hover:shadow-[0_0_15px_rgba(57,255,135,0.1)] group"
            >
              <div className="flex justify-between items-start">
                <span className="text-3xl">{crop.emoji}</span>
                <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  crop.risk === 'High' ? 'bg-sev-severe/20 text-sev-severe border border-sev-severe/30' :
                  crop.risk === 'Medium' ? 'bg-sev-mild/20 text-sev-mild border border-sev-mild/30' :
                  'bg-sev-healthy/20 text-sev-healthy border border-sev-healthy/30'
                }`}>
                  {crop.risk} Risk
                </span>
              </div>

              <div>
                <h4 className="font-display font-bold text-lg text-white group-hover:text-green-neon transition-colors">{crop.name}</h4>
                <p className="text-xs text-text-secondary font-mono mt-0.5">{crop.count} Diseases & Pests</p>
              </div>

              <div className="border-t border-border/60 pt-2 flex items-center justify-between text-xs text-green-neon font-bold font-display opacity-0 group-hover:opacity-100 transition-opacity">
                <span>View Library</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. HOW IT WORKS */}
      <section id="how-it-works" className="w-full bg-bg-surface border-y border-border py-16 px-6">
        <div className="max-w-7xl mx-auto flex flex-col gap-12">
          <div className="text-center flex flex-col gap-2">
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-white">Advanced Diagnostic Workflow</h2>
            <p className="text-sm text-text-secondary">Three clinical steps to protect and salvage your farm yield.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="flex flex-col gap-4 bg-bg-elevated p-6 rounded-16 border border-border">
              <span className="font-mono font-bold text-xs text-green-neon uppercase tracking-widest">Step 01</span>
              <div className="w-10 h-10 rounded-8 bg-green-deep border border-green-bright/30 flex items-center justify-center text-lg">
                📸
              </div>
              <h3 className="font-display font-bold text-lg text-white">Snap & Optimize</h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                Take a close-up photo of any single leaf. Our pipeline automatically analyzes orientation, resolution, and alerts if blurry.
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col gap-4 bg-bg-elevated p-6 rounded-16 border border-border">
              <span className="font-mono font-bold text-xs text-green-neon uppercase tracking-widest">Step 02</span>
              <div className="w-10 h-10 rounded-8 bg-green-deep border border-green-bright/30 flex items-center justify-center text-lg">
                🧠
              </div>
              <h3 className="font-display font-bold text-lg text-white">Diagnose & Map</h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                Clinical-grade models evaluate pathogen patterns in under 3 seconds, rendering an interactive Grad-CAM heatmap showing active spots.
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col gap-4 bg-bg-elevated p-6 rounded-16 border border-border">
              <span className="font-mono font-bold text-xs text-green-neon uppercase tracking-widest">Step 03</span>
              <div className="w-10 h-10 rounded-8 bg-green-deep border border-green-bright/30 flex items-center justify-center text-lg">
                🛡
              </div>
              <h3 className="font-display font-bold text-lg text-white">Treat & Prevent</h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                Get step-by-step chemical and organic spray instructions tailored to your specific country's local standards and regulatory permissions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. PEST DETECTION CALLOUT */}
      <section className="w-full max-w-7xl mx-auto px-6 py-12">
        <div className="w-full bg-gradient-to-r from-bg-surface via-bg-elevated to-bg-overlay border border-border rounded-24 p-6 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
          {/* AI Purple accent glow */}
          <div className="absolute right-0 top-0 w-48 h-48 rounded-full bg-ai-purple/10 blur-[60px] pointer-events-none" />

          <div className="flex flex-col items-start gap-4 text-left max-w-xl">
            <span className="inline-flex items-center gap-1.5 bg-ai-purple/20 text-white border border-ai-purple/30 px-3 py-1 rounded-full text-xs font-bold font-mono">
              <Bug className="w-3.5 h-3.5 text-ai-purple" />
              NEW: PEST CLASSIFICATION ENGINE
            </span>
            <h3 className="font-display font-bold text-2xl sm:text-3xl text-white">Spotted insects on leaves? We classify pests too.</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              We've added an advanced entomological mapping database. Diagnose Aphids, Spider Mites, Leaf Miners, and Thrips alongside standard bacterial/fungal leaf spots.
            </p>
          </div>

          <div className="flex flex-col gap-3 shrink-0 w-full sm:w-auto">
            <button 
              onClick={handleStart}
              className="bg-ai-purple hover:bg-opacity-95 text-white font-bold font-display px-6 py-3.5 rounded-8 shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 min-h-[48px]"
            >
              Try Pest Detector
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* 6. TESTIMONIALS */}
      <section className="w-full bg-bg-surface border-t border-border py-16 px-6">
        <div className="max-w-7xl mx-auto flex flex-col gap-10">
          <div className="text-center">
            <h2 className="font-display font-bold text-3xl text-white">Endorsed by Global Farmers</h2>
            <p className="text-sm text-text-secondary mt-1">Crop health solutions that cut boundaries across India, Africa, and the Americas.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, idx) => (
              <div key={idx} className="bg-bg-elevated border border-border p-6 rounded-16 flex flex-col justify-between gap-6 hover:border-green-neon/30 transition-colors">
                <p className="text-sm text-text-primary italic leading-relaxed">"{t.text}"</p>
                <div className="flex items-center justify-between border-t border-border/60 pt-4">
                  <div>
                    <h5 className="font-display font-bold text-sm text-white">{t.name}</h5>
                    <p className="text-xs text-text-secondary mt-0.5">{t.crop}</p>
                  </div>
                  <span className="text-xs font-semibold font-mono text-green-neon flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {t.country}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="w-full bg-bg-base border-t border-border py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 border-b border-border/50 pb-8">
          <div className="flex items-center gap-2">
            <span className="text-lg">🌿</span>
            <span className="font-display font-bold text-lg text-white">Harvest Guard</span>
          </div>

          <div className="flex gap-6 text-sm text-text-secondary">
            <button onClick={handleStart} className="hover:text-white transition-colors">Scan</button>
            <button onClick={() => navigate('/library')} className="hover:text-white transition-colors">Diseases</button>
            <button onClick={() => navigate('/countries')} className="hover:text-white transition-colors">Global Map</button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-text-muted">
          <span>&copy; 2026 Harvest Guard Corporation. All rights reserved.</span>
          <div className="flex gap-4">
            <span>Powered by Dark Intelligence</span>
          </div>
        </div>
      </footer>

    </div>
  );
};
