import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';


interface OnboardingProps {
  onComplete: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < 2) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = () => {
    localStorage.setItem('harvest_guard_onboarding_seen', 'true');
    onComplete();
  };

  const slides = [
    {
      title: t('onboarding.card1.title'),
      desc: t('onboarding.card1.desc'),
      illustration: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" className="w-40 h-40 fill-none stroke-green-700 stroke-[2.5]" strokeLinecap="round" strokeLinejoin="round">
          {/* Camera body */}
          <rect x="25" y="45" width="70" height="48" rx="8" />
          <path d="M45 45 L49 35 H71 L75 45 Z" />
          {/* Lens */}
          <circle cx="60" cy="69" r="16" />
          <circle cx="60" cy="69" r="8" fill="var(--sage-100)" />
          {/* Leaf in top left */}
          <path d="M15 15 C25 15 35 25 35 35 C25 35 15 25 15 15 Z" />
          <path d="M15 15 L35 35" />
          {/* Flash */}
          <circle cx="83" cy="55" r="3" fill="var(--green-500)" />
        </svg>
      )
    },
    {
      title: t('onboarding.card2.title'),
      desc: t('onboarding.card2.desc'),
      illustration: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" className="w-40 h-40 fill-none stroke-green-700 stroke-[2.5]" strokeLinecap="round" strokeLinejoin="round">
          {/* Diagnostics mesh */}
          <circle cx="60" cy="60" r="35" strokeDasharray="6 4" />
          {/* Target box */}
          <path d="M20 35 V20 H35" />
          <path d="M100 35 V20 H85" />
          <path d="M20 85 V100 H35" />
          <path d="M100 85 V100 H85" />
          {/* Scanner sweep line */}
          <motion.line
            x1="15"
            y1="60"
            x2="105"
            y2="60"
            stroke="var(--ai-blue-500)"
            strokeWidth="3"
            animate={{
              y: [-30, 30, -30],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          {/* Leaf outline inside */}
          <path d="M60 35 C50 45 45 60 60 80 C75 60 70 45 60 35 Z" fill="var(--sage-100)" />
          <path d="M60 35 V80" />
        </svg>
      )
    },
    {
      title: t('onboarding.card3.title'),
      desc: t('onboarding.card3.desc'),
      illustration: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" className="w-40 h-40 fill-none stroke-green-700 stroke-[2.5]" strokeLinecap="round" strokeLinejoin="round">
          {/* Plant Shield */}
          <path d="M60 15 C80 15 90 25 90 50 C90 80 60 100 60 100 C60 100 30 80 30 50 C30 25 40 15 60 15 Z" />
          {/* Leaf silhouette */}
          <path d="M60 38 C53 45 50 55 60 70 C70 55 67 45 60 38 Z" fill="var(--sage-100)" />
          <path d="M60 38 V70" />
          {/* Checkmark badge */}
          <circle cx="85" cy="85" r="14" fill="var(--sev-healthy)" stroke="white" strokeWidth="2" />
          <path d="M79 85 L83 89 L91 81" stroke="white" strokeWidth="2.5" />
        </svg>
      )
    }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-green-900 flex flex-col items-center justify-between p-6 select-none max-w-md mx-auto shadow-2xl">
      {/* Top action header */}
      <div className="w-full flex justify-between items-center mt-4 z-10">
        <span className="text-white/60 font-bold text-xs uppercase tracking-widest">
          Step {currentStep + 1} of 3
        </span>
        <button
          onClick={handleFinish}
          className="text-white hover:text-sage-100 font-bold text-xs uppercase tracking-widest min-w-[48px] min-h-[48px] flex items-center justify-center"
        >
          {t('onboarding.skip')}
        </button>
      </div>

      {/* Main card carousel slider */}
      <div className="w-full flex-1 flex items-center justify-center my-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 180 }}
            className="w-full bg-sage-100 rounded-24 p-6 py-8 shadow-xl border border-white/20 flex flex-col items-center justify-center gap-6"
          >
            {/* Animate illustration on entry */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.3 }}
              className="w-44 h-44 rounded-full bg-white flex items-center justify-center shadow-inner border border-border"
            >
              {slides[currentStep].illustration}
            </motion.div>

            <div className="text-center flex flex-col gap-2">
              <h2 className="text-2xl font-bold text-text-strong tracking-tight">
                {slides[currentStep].title}
              </h2>
              <p className="text-sm font-medium text-text-muted leading-relaxed px-4">
                {slides[currentStep].desc}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer CTA & step dots */}
      <div className="w-full flex flex-col items-center gap-6 mb-6">
        {/* Step dots */}
        <div className="flex items-center gap-2">
          {slides.map((_, idx) => (
            <div
              key={idx}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                currentStep === idx ? 'w-6 bg-green-500' : 'w-2.5 bg-white/30'
              }`}
            />
          ))}
        </div>

        {/* CTA Button */}
        <button
          onClick={handleNext}
          className="w-full bg-green-700 hover:bg-green-500 active:scale-98 text-white font-semibold py-4 px-6 rounded-12 shadow-lg min-h-[48px] text-base transition-colors"
        >
          {currentStep === 2 ? t('onboarding.getStarted') : 'Next'}
        </button>
      </div>
    </div>
  );
};
