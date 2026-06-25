import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Leaf, FlaskConical, ShieldCheck, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

interface TreatmentItem {
  action: string;
  dosage: string;
  frequency: string;
  safety: string;
}

interface TreatmentPlan {
  organic: TreatmentItem[];
  chemical: TreatmentItem[];
  prevention: string[];
}

interface TreatmentTabsProps {
  treatments: TreatmentPlan | null;
  isConfident: boolean;
}

export const TreatmentTabs: React.FC<TreatmentTabsProps> = ({ treatments, isConfident }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'organic' | 'chemical' | 'prevention'>('organic');
  const [isExpanded, setIsExpanded] = useState(isConfident); // Collapsed by default if low confidence

  if (!treatments) return null;

  const hasOrganic = treatments.organic && treatments.organic.length > 0;
  const hasChemical = treatments.chemical && treatments.chemical.length > 0;
  const hasPrevention = treatments.prevention && treatments.prevention.length > 0;

  // Auto-select tab if active tab doesn't have items
  React.useEffect(() => {
    if (activeTab === 'organic' && !hasOrganic) {
      if (hasChemical) setActiveTab('chemical');
      else if (hasPrevention) setActiveTab('prevention');
    }
  }, [treatments]);

  return (
    <div className="w-full bg-surface rounded-16 border border-border shadow-sm overflow-hidden select-none">
      {/* Collapsible header for treatment plan */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3.5 flex items-center justify-between font-bold text-sm bg-surface hover:bg-surface-alt transition-colors border-b border-border min-h-[48px]"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-green-700" />
          <span>{t('result.treatmentTitle')}</span>
          {!isConfident && (
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-bold bg-sev-mild/10 text-sev-mild rounded-full border border-sev-mild/20">
              <AlertCircle className="w-3 h-3" />
              Tentative
            </span>
          )}
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
      </button>

      {/* Expanded treatments container */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden bg-surface-alt/10"
          >
            {/* Tab Swapping Headers */}
            <div className="flex bg-surface-alt border-b border-border">
              <button
                onClick={() => setActiveTab('organic')}
                disabled={!hasOrganic}
                className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 text-xs font-bold transition-all min-h-[44px] ${
                  !hasOrganic ? 'opacity-40 cursor-not-allowed text-text-muted' : ''
                } ${
                  activeTab === 'organic' && hasOrganic
                    ? 'bg-green-700 text-white'
                    : 'text-text-muted hover:text-text-strong'
                }`}
              >
                <Leaf className="w-3.5 h-3.5" />
                {t('result.tabs.organic')}
              </button>

              <button
                onClick={() => setActiveTab('chemical')}
                disabled={!hasChemical}
                className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 text-xs font-bold transition-all min-h-[44px] ${
                  !hasChemical ? 'opacity-40 cursor-not-allowed text-text-muted' : ''
                } ${
                  activeTab === 'chemical' && hasChemical
                    ? 'bg-green-700 text-white'
                    : 'text-text-muted hover:text-text-strong'
                }`}
              >
                <FlaskConical className="w-3.5 h-3.5" />
                {t('result.tabs.chemical')}
              </button>

              <button
                onClick={() => setActiveTab('prevention')}
                disabled={!hasPrevention}
                className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 text-xs font-bold transition-all min-h-[44px] ${
                  !hasPrevention ? 'opacity-40 cursor-not-allowed text-text-muted' : ''
                } ${
                  activeTab === 'prevention' && hasPrevention
                    ? 'bg-green-700 text-white'
                    : 'text-text-muted hover:text-text-strong'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                {t('result.tabs.prevention')}
              </button>
            </div>

            {/* Tab content display panels */}
            <div className="p-4">
              {activeTab === 'organic' && hasOrganic && (
                <div className="flex flex-col gap-3">
                  {treatments.organic.map((item, idx) => (
                    <div key={idx} className="bg-surface rounded-12 p-3.5 border border-border flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-sm font-bold text-text-strong">
                        <span>{item.action}</span>
                        <span className="text-xs text-green-700 px-2 py-0.5 bg-sage-100 rounded-6">{item.dosage}</span>
                      </div>
                      <div className="text-xs text-text-muted flex justify-between">
                        <span>Frequency: <strong className="text-text-strong">{item.frequency}</strong></span>
                      </div>
                      {item.safety && (
                        <div className="text-[11px] text-sev-mild font-medium border-t border-border/50 pt-1.5 mt-1">
                          ⚠️ {item.safety}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'chemical' && hasChemical && (
                <div className="flex flex-col gap-3">
                  {treatments.chemical.map((item, idx) => (
                    <div key={idx} className="bg-surface rounded-12 p-3.5 border border-border flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-sm font-bold text-text-strong">
                        <span>{item.action}</span>
                        <span className="text-xs text-sev-severe px-2 py-0.5 bg-sev-severe/10 rounded-6">{item.dosage}</span>
                      </div>
                      <div className="text-xs text-text-muted flex justify-between">
                        <span>Frequency: <strong className="text-text-strong">{item.frequency}</strong></span>
                      </div>
                      {item.safety && (
                        <div className="text-[11px] text-sev-severe font-medium border-t border-border/50 pt-1.5 mt-1">
                          ⚠️ Warning: {item.safety}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'prevention' && hasPrevention && (
                <ul className="flex flex-col gap-2.5">
                  {treatments.prevention.map((action, idx) => (
                    <li key={idx} className="bg-surface rounded-12 p-3 px-4 border border-border text-sm font-medium text-text-strong flex items-start gap-2.5">
                      <span className="text-green-500 font-bold shrink-0 mt-0.5">•</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
