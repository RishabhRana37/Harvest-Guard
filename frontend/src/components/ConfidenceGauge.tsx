import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ConfidenceGaugeProps {
  confidence: number | null; // 0–1
  band: 'high' | 'medium' | 'low' | null;
}

/**
 * ConfidenceGauge
 *
 * Radial arc (half-circle) gauge showing result.confidence as a % with a
 * band label from result.confidence_band.
 *
 * Band colours:
 *   high   (≥80%) → #2EA44F (green)
 *   medium (60-79%) → #E8A23D (amber)
 *   low    (<60%)  → #D64545 (red)
 *
 * The arc animates from 0 to value over 800ms on mount via CSS transition.
 * The glow filter colour also adapts to the active band.
 */
export const ConfidenceGauge: React.FC<ConfidenceGaugeProps> = ({
  confidence,
  band,
}) => {
  const { t } = useTranslation();
  const [animated, setAnimated] = useState(0);
  const value = confidence ?? 0;

  // Delay the animated value by one frame so the CSS transition fires
  useEffect(() => {
    const id = setTimeout(() => setAnimated(value), 80);
    return () => clearTimeout(id);
  }, [value]);

  // ── Band logic ────────────────────────────────────────────────────
  const resolvedBand: 'high' | 'medium' | 'low' =
    band ??
    (value >= 0.8 ? 'high' : value >= 0.6 ? 'medium' : 'low');

  const BAND_COLOR = {
    high:   '#2EA44F',
    medium: '#E8A23D',
    low:    '#D64545',
  } as const;

  const arcColor = BAND_COLOR[resolvedBand];

  const BAND_LABEL = {
    high:   t('result.confidenceBand.high'),
    medium: t('result.confidenceBand.medium'),
    low:    t('result.confidenceBand.low'),
  } as const;

  // ── SVG arc maths ─────────────────────────────────────────────────
  // The arc spans from the left end (M 8 50) to the right end (92 50)
  // of a half-circle with radius 42 centred at (50, 50).
  // The total arc length ≈ π × 42 = ~131.95 px
  const radius = 42;
  const circumference = Math.PI * radius; // half-circle arc length
  const strokeDashoffset = circumference - animated * circumference;

  return (
    <div
      className="flex flex-col items-center justify-center
                 px-5 pt-4 pb-4
                 bg-bg-overlay rounded-16 border border-border
                 w-full max-w-[200px] shadow-md select-none shrink-0"
      role="meter"
      aria-label={`Confidence: ${(value * 100).toFixed(0)}%`}
      aria-valuenow={Math.round(value * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {/* Label */}
      <span className="text-[10px] font-bold uppercase tracking-widest
                       text-text-muted mb-3">
        Clinical AI Trust
      </span>

      {/* SVG radial arc */}
      <div className="relative w-32" style={{ height: 72 }}>
        <svg
          viewBox="0 0 100 56"
          className="w-full h-full overflow-visible"
          aria-hidden
        >
          <defs>
            <filter id="gauge-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow
                dx="0"
                dy="0"
                stdDeviation="2.5"
                floodColor={arcColor}
                floodOpacity="0.75"
              />
            </filter>
          </defs>

          {/* Concentric decorative grid rings */}
          <path
            d="M 12 50 A 38 38 0 0 1 88 50"
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="0.6"
            strokeDasharray="2 3"
          />
          <path
            d="M 18 50 A 32 32 0 0 1 82 50"
            fill="none"
            stroke="rgba(255,255,255,0.04)"
            strokeWidth="0.6"
            strokeDasharray="2 3"
          />

          {/* Background track */}
          <path
            d="M 8 50 A 42 42 0 0 1 92 50"
            fill="none"
            stroke="rgba(255,255,255,0.10)"
            strokeWidth={8}
            strokeLinecap="round"
          />

          {/* Active arc — adapts colour to band */}
          <path
            d="M 8 50 A 42 42 0 0 1 92 50"
            fill="none"
            stroke={arcColor}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            filter="url(#gauge-glow)"
            className="transition-all duration-[800ms] ease-out"
          />
        </svg>

        {/* Percentage readout centred inside the arc */}
        <div className="absolute bottom-0 inset-x-0 flex items-end justify-center pb-0.5">
          <span
            className="text-2xl font-mono font-bold tracking-tight tabular-nums"
            style={{ color: arcColor }}
          >
            {(value * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Band label */}
      <span
        className="text-[10px] font-bold text-center mt-3 leading-tight"
        style={{ color: arcColor }}
      >
        {BAND_LABEL[resolvedBand]}
      </span>
    </div>
  );
};
