import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Save, Share2, Plus, ArrowRight } from 'lucide-react';
import { getScan } from '../utils/db';
import type { SavedScan } from '../utils/db';
import { DiagnosisHeader } from '../components/DiagnosisHeader';
import { HeatmapViewer } from '../components/HeatmapViewer';
import { PredictionList } from '../components/PredictionList';
import { TreatmentTabs } from '../components/TreatmentTabs';
import { LowConfidenceBanner } from '../components/LowConfidenceBanner';
import { OODState } from '../components/OODState';
import { FeedbackRow } from '../components/FeedbackRow';
import { Toast } from '../components/shared/Toast';
import type { ToastType } from '../components/shared/Toast';

export const ResultPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [scan, setScan] = useState<SavedScan | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<string>('');
  const [toastType, setToastType] = useState<ToastType>('success');
  const [showToast, setShowToast] = useState<boolean>(false);

  useEffect(() => {
    const loadScanData = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const data = await getScan(id);
        if (data) {
          setScan(data);
        } else {
          // If not found in IndexedDB, navigate home
          navigate('/');
        }
      } catch (error) {
        console.error('Failed to load scan details:', error);
      } finally {
        setLoading(false);
      }
    };

    loadScanData();
  }, [id, navigate]);

  const triggerToast = (message: string, type: ToastType = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  };

  const handleShare = async () => {
    if (!scan) return;
    
    const shareTitle = `${t('appName')} Diagnosis: ${scan.prediction?.crop} - ${scan.prediction?.name}`;
    const shareText = `CropDoc AI diagnosed ${scan.prediction?.crop} leaf with ${scan.prediction?.name} (${(scan.confidence || 0) * 100}% confidence). Severity: ${scan.severity}. Check treatments: ${window.location.origin}/library/${scan.disease?.slug || ''}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: window.location.href
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(shareText);
        triggerToast('Result text copied to clipboard!');
      } catch (error) {
        triggerToast('Failed to copy share text.', 'error');
      }
    }
  };

  const handleSave = () => {
    // Already saved to IndexedDB during diagnosis step, just trigger feedback
    triggerToast(t('result.actions.saved'));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 select-none">
        <div className="w-10 h-10 border-4 border-green-700 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-text-muted">Loading diagnosis report...</p>
      </div>
    );
  }

  if (!scan) return null;

  // Handle Out-Of-Distribution (OOD / Not a leaf) state immediately
  if (!scan.is_leaf) {
    return <OODState onTryAgain={() => navigate('/')} />;
  }

  const isHealthy = scan.severity === 'healthy';

  return (
    <div className="flex flex-col gap-5 w-full pb-10">
      
      {/* Toast popup */}
      <Toast
        message={toastMessage}
        type={toastType}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />

      {/* Offline pending submission notice */}
      {scan.is_pending && (
        <div className="bg-sage-100 border border-green-700/20 rounded-16 p-4 flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-green-700 border-t-transparent rounded-full animate-spin shrink-0" />
          <div>
            <h4 className="text-sm font-bold text-text-strong">Diagnosis Queued (Offline)</h4>
            <p className="text-xs text-text-muted">This scan will automatically be diagnosed when connection is restored.</p>
          </div>
        </div>
      )}

      {/* Diagnosis Header Card - Animates in with a custom spring motion */}
      <motion.div
        initial={{ opacity: 0, y: 15, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      >
        <DiagnosisHeader
          cropName={scan.prediction?.crop || 'Crop'}
          diseaseName={scan.prediction?.name || 'Healthy'}
          confidence={scan.confidence}
          confidenceBand={scan.confidence_band}
          severity={scan.severity}
          urgencyDays={scan.urgency_days}
        />
      </motion.div>

      {/* Low Confidence Banner - Conditional */}
      {!scan.is_confident && scan.prediction && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <LowConfidenceBanner
            topClassName={scan.prediction.name}
            onRetake={() => navigate('/')}
          />
        </motion.div>
      )}

      {/* Evidence Block (Heatmap / Original photo layer) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        <HeatmapViewer
          photoUrl={scan.local_image_url || scan.disease?.image_url || ''}
          heatmapUrl={scan.heatmap}
        />
      </motion.div>

      {/* Top predictions accordion */}
      {scan.top_k && scan.top_k.length > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <PredictionList predictions={scan.top_k} />
        </motion.div>
      )}

      {/* Treatments section - hide for healthy leaves */}
      {!isHealthy && scan.disease?.treatments && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <TreatmentTabs
            treatments={scan.disease.treatments}
            isConfident={scan.is_confident}
          />
        </motion.div>
      )}

      {/* Healthy crop descriptive banner */}
      {isHealthy && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-sev-healthy/10 border border-sev-healthy/30 rounded-16 p-4 text-center text-sm font-semibold text-text-strong"
        >
          🎉 {t('result.healthyResult')}
        </motion.div>
      )}

      {/* Action Row */}
      <div className="grid grid-cols-2 sm:flex sm:items-center gap-3 w-full mt-2">
        <button
          onClick={handleSave}
          className="flex items-center justify-center gap-2 bg-green-700 hover:bg-green-500 active:scale-95 text-white font-semibold py-3 px-4 rounded-12 shadow text-sm min-h-[48px] flex-1 transition-colors"
        >
          <Save className="w-4 h-4" />
          {t('result.actions.save')}
        </button>

        <button
          onClick={handleShare}
          className="flex items-center justify-center gap-2 bg-surface border border-border hover:bg-surface-alt active:scale-95 text-text-strong font-semibold py-3 px-4 rounded-12 shadow-sm text-sm min-h-[48px] flex-1 transition-colors"
        >
          <Share2 className="w-4 h-4" />
          {t('result.actions.share')}
        </button>

        <button
          onClick={() => navigate('/')}
          className="flex items-center justify-center gap-2 bg-green-700 hover:bg-green-500 active:scale-95 text-white font-semibold py-3 px-4 rounded-12 shadow text-sm min-h-[48px] flex-1 transition-colors col-span-2 sm:col-span-1"
        >
          <Plus className="w-4 h-4" />
          {t('result.actions.newScan')}
        </button>

        {!isHealthy && scan.disease?.slug && (
          <button
            onClick={() => navigate(`/library/${scan.disease?.slug}`)}
            className="flex items-center justify-center gap-1.5 bg-ai-blue-500 hover:bg-opacity-90 active:scale-95 text-white font-semibold py-3 px-4 rounded-12 shadow text-sm min-h-[48px] flex-1 transition-colors col-span-2"
          >
            {t('result.actions.learnMore')}
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Feedback Row */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-2"
      >
        <FeedbackRow
          scanId={scan.scan_id}
          onFeedbackSubmitted={(msg) => triggerToast(msg, 'success')}
        />
      </motion.div>
    </div>
  );
};
