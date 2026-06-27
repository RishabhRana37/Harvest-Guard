import React from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, RefreshCw } from 'lucide-react';

interface LowConfidenceBannerProps {
  topClassName: string;
  onRetake: () => void;
}

/**
 * LowConfidenceBanner
 *
 * Shown when result.is_confident === false.
 * Spec text: "Not fully sure — this may be {name}. Retake in better light,
 *             one leaf filling the frame."
 * Has a "Retake Photo" CTA.
 * Collapsed treatment plan below carries a "Tentative" tag (handled in
 * TreatmentTabs via the isConfident prop).
 */
export const LowConfidenceBanner: React.FC<LowConfidenceBannerProps> = ({
  topClassName,
  onRetake,
}) => {
  const { t } = useTranslation();

  return (
    <div
      role="alert"
      className="w-full bg-sev-mild/12 border border-sev-mild/35
                 rounded-16 p-4 flex flex-col gap-4 select-none shadow-sm"
    >
      {/* Header row */}
      <div className="flex items-start gap-2.5">
        <ShieldAlert
          className="w-5 h-5 text-sev-mild shrink-0 mt-0.5"
          aria-hidden
        />
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-semibold text-white leading-snug">
            Not fully sure — this may be{' '}
            <span className="text-sev-mild">{topClassName}</span>.
          </p>
          <p className="text-xs font-medium text-text-muted leading-relaxed">
            Retake in better light, one leaf filling the frame.
          </p>
        </div>
      </div>

      {/* Retake CTA */}
      <button
        onClick={onRetake}
        className="self-start flex items-center gap-1.5
                   bg-sev-mild hover:opacity-90 active:scale-95
                   text-white font-bold text-xs uppercase tracking-wider
                   py-2.5 px-4 rounded-12 min-h-[40px] transition-all"
        aria-label="Retake photo for a clearer diagnosis"
      >
        <RefreshCw className="w-3.5 h-3.5" aria-hidden />
        {t('home.retake')}
      </button>
    </div>
  );
};
