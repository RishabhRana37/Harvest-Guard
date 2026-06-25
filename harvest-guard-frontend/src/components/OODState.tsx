import React from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, HelpCircle } from 'lucide-react';

interface OODStateProps {
  onTryAgain: () => void;
}

export const OODState: React.FC<OODStateProps> = ({ onTryAgain }) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center text-center p-8 py-16 bg-surface rounded-16 border border-border shadow-sm max-w-sm mx-auto my-6 select-none">
      {/* Drooping Leaf SVG Illustration */}
      <div className="relative p-6 bg-sev-mild/10 rounded-full text-sev-mild mb-6 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="w-16 h-16 fill-none stroke-current stroke-[2.5]" strokeLinecap="round" strokeLinejoin="round">
          {/* Stem */}
          <path d="M50 85 C50 70 40 55 25 50" />
          {/* Drooping leaf body */}
          <path d="M25 50 C20 40 25 25 45 20 C65 15 75 35 70 55 C65 75 55 80 50 85 C45 75 30 60 25 50 Z" />
          {/* Drooping vein lines */}
          <path d="M45 20 C42 35 44 50 50 85" />
          <path d="M43 38 C37 36 34 37 32 38" />
          <path d="M45 52 C39 52 35 55 33 58" />
          <path d="M47 66 C43 68 41 72 40 76" />
        </svg>
        <div className="absolute bottom-0 right-0 bg-surface rounded-full p-1 border border-border shadow-sm">
          <HelpCircle className="w-5 h-5 text-sev-mild" />
        </div>
      </div>
      
      <h3 className="text-xl font-bold text-text-strong mb-2">
        {t('result.oodTitle')}
      </h3>
      <p className="text-text-muted text-base mb-8 leading-relaxed px-4">
        {t('result.oodDesc')}
      </p>
      
      <button
        onClick={onTryAgain}
        className="w-full bg-green-700 hover:bg-green-500 active:scale-95 text-white font-semibold py-3.5 px-6 rounded-12 shadow flex items-center justify-center gap-2 min-h-[48px] text-base transition-colors"
      >
        <Camera className="w-5 h-5" />
        {t('result.tryAgain')}
      </button>
    </div>
  );
};
