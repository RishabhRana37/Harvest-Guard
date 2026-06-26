import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ThumbsUp, ThumbsDown, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

interface FeedbackRowProps {
  scanId: string;
  onFeedbackSubmitted: (message: string) => void;
}

export const FeedbackRow: React.FC<FeedbackRowProps> = ({ scanId, onFeedbackSubmitted }) => {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [agreedState, setAgreedState] = useState<boolean | null>(null);

  const handleFeedback = async (agreed: boolean) => {
    if (submitting || submitted) return;
    
    try {
      setSubmitting(true);
      setAgreedState(agreed);
      
      await api.submitFeedback({
        scan_id: scanId,
        agreed
      });
      
      setSubmitted(true);
      onFeedbackSubmitted(t('result.feedbackToast'));
    } catch (error) {
      console.error('Feedback submission failed:', error);
      // Still set submitted state to keep UX clean in offline demo mode
      setSubmitted(true);
      onFeedbackSubmitted(t('result.feedbackToast'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full bg-surface rounded-16 p-4 border border-border shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 select-none">
      <span className="text-sm font-bold text-text-strong">
        {t('result.feedbackTitle')}
      </span>

      {submitted ? (
        <div className="flex items-center gap-1.5 text-sm font-bold text-green-700 bg-sage-100 px-3 py-1.5 rounded-full border border-sev-healthy/20">
          <CheckCircle2 className="w-4 h-4 stroke-[3.5px] text-sev-healthy" />
          <span>Submitted</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleFeedback(true)}
            disabled={submitting}
            className={`flex items-center justify-center gap-1.5 border border-border font-semibold py-2 px-4 rounded-12 text-sm min-h-[44px] min-w-[90px] shadow-sm active:scale-95 transition-all ${
              submitting && agreedState === true 
                ? 'bg-sage-100 text-green-700' 
                : 'bg-surface text-text-strong hover:bg-surface-alt'
            }`}
            aria-label="Agree with diagnosis"
          >
            <ThumbsUp className={`w-4 h-4 ${submitting && agreedState === true ? 'animate-bounce' : ''}`} />
            <span>Yes</span>
          </button>

          <button
            onClick={() => handleFeedback(false)}
            disabled={submitting}
            className={`flex items-center justify-center gap-1.5 border border-border font-semibold py-2 px-4 rounded-12 text-sm min-h-[44px] min-w-[90px] shadow-sm active:scale-95 transition-all ${
              submitting && agreedState === false 
                ? 'bg-sev-severe/10 text-sev-severe' 
                : 'bg-surface text-text-strong hover:bg-surface-alt'
            }`}
            aria-label="Disagree with diagnosis"
          >
            <ThumbsDown className={`w-4 h-4 ${submitting && agreedState === false ? 'animate-bounce' : ''}`} />
            <span>No</span>
          </button>
        </div>
      )}
    </div>
  );
};
