import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ConfidenceGaugeProps {
  confidence: number | null; // 0 - 1
  band: 'high' | 'medium' | 'low' | null;
}

export const ConfidenceGauge: React.FC<ConfidenceGaugeProps> = ({ confidence, band }) => {
  const { t } = useTranslation();
  const [animatedValue, setAnimatedValue] = useState(0);
  
  const value = confidence !== null ? confidence : 0;
  
  // Animate the fill over 800ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedValue(value);
    }, 100);
    return () => clearTimeout(timer);
  }, [value]);

  const radius = 42;
  const strokeWidth = 8;
  const circumference = Math.PI * radius; 
  const strokeDashoffset = circumference - (animatedValue * circumference);

  const getBandLabel = () => {
    if (band === 'high' || value >= 0.8) return t('result.confidenceBand.high');
    if (band === 'medium' || (value >= 0.6 && value < 0.8)) return t('result.confidenceBand.medium');
    return t('result.confidenceBand.low');
  };

  const getBandColorClass = () => {
    if (band === 'high' || value >= 0.8) return 'text-sev-healthy';
    if (band === 'medium' || (value >= 0.6 && value < 0.8)) return 'text-sev-mild';
    return 'text-sev-severe';
  };

  return (
    <div className="flex flex-col items-center justify-center p-5 bg-bg-surface rounded-16 border border-border w-full max-w-[210px] shadow-lg select-none shrink-0 relative overflow-hidden">
      
      <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-3.5">
        Clinical AI Trust
      </span>
      
      {/* SVG Radial Arc Gauge */}
      <div className="relative w-32 h-18 flex items-center justify-center overflow-hidden">
        <svg viewBox="0 0 100 55" className="w-full h-full">
          {/* Neon Glow Filters definitions */}
          <defs>
            <filter id="ai-glow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#4D9FFF" floodOpacity="0.8" />
            </filter>
          </defs>

          {/* Concentric grid lines in the background */}
          <path
            d="M 12 50 A 38 38 0 0 1 88 50"
            fill="none"
            stroke="var(--border)"
            strokeWidth="0.5"
            strokeDasharray="2 3"
            className="opacity-45"
          />
          <path
            d="M 16 50 A 34 34 0 0 1 84 50"
            fill="none"
            stroke="var(--border)"
            strokeWidth="0.5"
            strokeDasharray="2 3"
            className="opacity-30"
          />

          {/* Background track arc */}
          <path
            d="M 8 50 A 42 42 0 0 1 92 50"
            fill="none"
            stroke="var(--border)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className="opacity-40"
          />

          {/* Active value arc with glowing filter */}
          <path
            d="M 8 50 A 42 42 0 0 1 92 50"
            fill="none"
            stroke="var(--ai-blue-500)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            filter="url(#ai-glow)"
            className="gauge-circle transition-all duration-[800ms] ease-out"
          />
        </svg>
        
        {/* Floating Percentage Figure with JetBrains Mono */}
        <div className="absolute bottom-1 text-center flex flex-col items-center">
          <span className="text-2xl font-mono font-bold tracking-tight text-white tabular-nums leading-none">
            {(value * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      <span className={`text-[10px] font-bold text-center mt-3.5 leading-tight ${getBandColorClass()}`}>
        {getBandLabel()}
      </span>
    </div>
  );
};
