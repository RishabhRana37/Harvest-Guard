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
  const strokeWidth = 10;
  // Circumference of a semi-circle (PI * r)
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
    <div className="flex flex-col items-center justify-center p-4 bg-surface rounded-16 border border-border w-full max-w-[200px] shadow-sm select-none shrink-0">
      <span className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
        {t('result.confidence')}
      </span>
      
      {/* SVG Radial Arc Gauge */}
      <div className="relative w-28 h-16 flex items-center justify-center overflow-hidden">
        <svg viewBox="0 0 100 55" className="w-full h-full">
          {/* Background track arc */}
          <path
            d="M 8 50 A 42 42 0 0 1 92 50"
            fill="none"
            stroke="var(--border)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Active value arc */}
          <path
            d="M 8 50 A 42 42 0 0 1 92 50"
            fill="none"
            stroke="var(--ai-blue-500)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="gauge-circle transition-all duration-[800ms] ease-out"
          />
        </svg>
        
        {/* Floating Percentage Figure */}
        <div className="absolute bottom-0 text-center flex flex-col items-center">
          <span className="text-2xl font-bold tracking-tight text-text-strong tabular-nums leading-none">
            {(value * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      <span className={`text-[11px] font-bold text-center mt-2 ${getBandColorClass()}`}>
        {getBandLabel()}
      </span>
    </div>
  );
};
