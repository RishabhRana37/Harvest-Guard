import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, BarChart2 } from 'lucide-react';

interface Prediction {
  slug: string;
  crop: string;
  name: string;
  prob: number;
}

interface PredictionListProps {
  predictions: Prediction[];
}

export const PredictionList: React.FC<PredictionListProps> = ({ predictions }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  if (!predictions || predictions.length === 0) return null;

  return (
    <div className="w-full bg-surface rounded-16 border border-border shadow-sm overflow-hidden select-none">
      {/* Toggle header bar */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3.5 flex items-center justify-between font-bold text-sm text-text-strong bg-surface hover:bg-surface-alt transition-colors min-h-[48px]"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-green-700" />
          <span>{t('result.topPredictions')} ({predictions.length})</span>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
      </button>

      {/* Collapsed Predictions Body */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden border-t border-border"
          >
            <div className="p-4 flex flex-col gap-3.5 bg-surface-alt/30">
              {predictions.map((pred) => (
                <div key={pred.slug} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-text-strong">
                    <span>
                      {pred.crop} <span className="text-text-muted font-normal">·</span> {pred.name}
                    </span>
                    <span className="tabular-nums">{(pred.prob * 100).toFixed(0)}%</span>
                  </div>
                  
                  {/* Probability fill bar */}
                  <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pred.prob * 100}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className="h-full bg-green-500 rounded-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
