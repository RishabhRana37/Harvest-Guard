import React from 'react';
import { useTranslation } from 'react-i18next';
import { Camera } from 'lucide-react';

interface OODStateProps {
  onTryAgain: () => void;
}

/**
 * OODState
 *
 * Shown when result.is_leaf === false.
 * Spec text: "That doesn't look like a crop leaf.
 *             Point the camera at a single leaf."
 * Has a "Try Again" CTA.
 * No diagnosis information is shown.
 */
export const OODState: React.FC<OODStateProps> = ({ onTryAgain }) => {
  const { t } = useTranslation();

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center text-center
                 py-16 px-6 select-none max-w-sm mx-auto my-6"
    >
      {/* Illustration */}
      <div className="relative mb-6 p-6 bg-sev-mild/10 rounded-full
                      flex items-center justify-center">
        {/* Leaf-with-question SVG */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 100 100"
          className="w-16 h-16 fill-none stroke-current text-sev-mild stroke-[2.5]"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          {/* Stem */}
          <path d="M50 85 C50 70 40 55 25 50" />
          {/* Drooping leaf body */}
          <path d="M25 50 C20 40 25 25 45 20 C65 15 75 35 70 55 C65 75 55 80 50 85 C45 75 30 60 25 50 Z" />
          {/* Centre vein */}
          <path d="M45 20 C42 35 44 50 50 85" />
          {/* Side veins */}
          <path d="M43 38 C37 36 34 37 32 38" />
          <path d="M45 52 C39 52 35 55 33 58" />
          <path d="M47 66 C43 68 41 72 40 76" />
        </svg>
        {/* Question badge */}
        <span
          className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full
                     bg-bg-surface border border-border
                     flex items-center justify-center
                     text-sev-mild font-black text-lg leading-none shadow-md"
          aria-hidden
        >
          ?
        </span>
      </div>

      {/* Heading */}
      <h2 className="text-xl font-bold text-white mb-2 leading-snug">
        {t('result.oodTitle')}
      </h2>

      {/* Spec body copy */}
      <p className="text-sm text-text-muted leading-relaxed mb-8 max-w-[260px]">
        That doesn't look like a crop leaf.{' '}
        Point the camera at a single leaf.
      </p>

      {/* Tips chips */}
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {['One leaf only', 'Good light', 'Fill the frame'].map((tip) => (
          <span
            key={tip}
            className="text-[11px] font-semibold
                       bg-green-deep/50 border border-green-neon/20
                       text-green-neon px-2.5 py-1 rounded-full"
          >
            {tip}
          </span>
        ))}
      </div>

      {/* Try Again CTA */}
      <button
        onClick={onTryAgain}
        className="w-full max-w-[260px]
                   flex items-center justify-center gap-2
                   bg-green-deep border border-green-neon/30
                   hover:bg-green-neon/20 active:scale-95
                   text-green-neon font-bold
                   py-3.5 px-6 rounded-12 shadow
                   min-h-[48px] text-sm transition-all"
        aria-label="Try Again — point camera at a single leaf"
      >
        <Camera className="w-4 h-4" aria-hidden />
        {t('result.tryAgain')}
      </button>
    </div>
  );
};
