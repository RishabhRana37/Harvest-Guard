import React from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, RefreshCw } from 'lucide-react';

interface LowConfidenceBannerProps {
  topClassName: string;
  onRetake: () => void;
}

export const LowConfidenceBanner: React.FC<LowConfidenceBannerProps> = ({ topClassName, onRetake }) => {
  const { t } = useTranslation();

  return (
    <div className="w-full bg-sev-mild/15 border border-sev-mild/30 rounded-16 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 select-none shadow-sm">
      <div className="flex items-start gap-2.5">
        <ShieldAlert className="w-5 h-5 text-sev-mild shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-text-strong leading-normal">
            {t('result.lowConfidenceBanner', { name: topClassName })}
          </p>
        </div>
      </div>
      
      <button
        onClick={onRetake}
        className="bg-sev-mild hover:bg-opacity-90 active:scale-95 text-white font-bold text-xs uppercase tracking-wider py-2.5 px-4 rounded-12 flex items-center gap-1.5 shrink-0 min-h-[44px]"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        {t('home.retake')}
      </button>
    </div>
  );
};
