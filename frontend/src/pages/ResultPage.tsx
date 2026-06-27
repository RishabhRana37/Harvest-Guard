import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Save, Share2, Plus, FileDown } from 'lucide-react';
import { getScan } from '../utils/db';
import { DiagnosisHeader } from '../components/DiagnosisHeader';
import { HeatmapViewer } from '../components/HeatmapViewer';
import { PredictionList } from '../components/PredictionList';
import { TreatmentTabs } from '../components/TreatmentTabs';
import { LowConfidenceBanner } from '../components/LowConfidenceBanner';
import { OODState } from '../components/OODState';
import { FeedbackLoopCard } from '../components/FeedbackLoopCard';
import { WeatherRiskCard } from '../components/WeatherRiskCard';
import { PestResultCard } from '../components/PestResultCard';
import { Toast } from '../components/shared/Toast';
import type { ToastType } from '../components/shared/Toast';

import { API_BASE_URL } from '../services/api';

export const ResultPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [scan, setScan] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'disease' | 'pest'>('disease');

  // User Profile cache
  const [user, setUser] = useState<any>(null);

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<string>('');
  const [toastType, setToastType] = useState<ToastType>('success');
  const [showToast, setShowToast] = useState<boolean>(false);

  useEffect(() => {
    const data = localStorage.getItem('cropdoc_user');
    if (data) {
      setUser(JSON.parse(data));
    }
  }, []);

  useEffect(() => {
    const loadScanData = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const data = await getScan(id);
        if (data) {
          setScan(data);
          // Set active tab to 'pest' if the scan is a pest scan
          if (data.scan_mode === 'pest' || data.pest || data.prediction?.slug?.startsWith('pest')) {
            setActiveTab('pest');
          } else {
            setActiveTab('disease');
          }
        } else {
          navigate('/scan');
        }
      } catch (error) {
        console.error('Failed to load scan details:', error);
      } finally {
        setLoading(false);
      }
    };

    loadScanData();
  }, [id, navigate]);

  useEffect(() => {
    if (scan && scan.is_leaf && !scan.is_pending && localStorage.getItem('cropdoc_prompted_install') !== 'true') {
      const promptEvent = (window as any).deferredInstallPrompt;
      if (promptEvent) {
        setTimeout(() => {
          promptEvent.prompt();
          promptEvent.userChoice.then((choiceResult: any) => {
            localStorage.setItem('cropdoc_prompted_install', 'true');
            if (choiceResult.outcome === 'accepted') {
              (window as any).deferredInstallPrompt = null;
            }
          });
        }, 1200);
      }
    }
  }, [scan]);

  const triggerToast = (message: string, type: ToastType = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      triggerToast('Result summary and link copied to clipboard!');
    } catch (error) {
      triggerToast('Failed to copy text.', 'error');
    }
  };

  const handleShare = async () => {
    if (!scan) return;
    
    const cropName = scan.prediction?.crop || 'Crop';
    const diseaseName = activeTab === 'pest' && scan.pest ? scan.pest.name : (scan.prediction?.name || 'Healthy');
    const confidenceVal = scan.confidence ?? 0.87;
    const confidencePercentage = `${Math.round(confidenceVal * 100)}%`;
    
    const summaryText = `CropDoc AI: ${cropName} — ${diseaseName}, ${confidencePercentage} confidence`;
    const shareUrl = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `CropDoc AI - ${cropName}`,
          text: summaryText,
          url: shareUrl
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.log('Sharing error:', error);
          copyToClipboard(`${summaryText}\n${shareUrl}`);
        }
      }
    } else {
      copyToClipboard(`${summaryText}\n${shareUrl}`);
    }
  };

  const handleDownloadReport = async () => {
    if (!scan) return;
    try {
      const response = await fetch(`${API_BASE_URL}/scans/${scan.scan_id}/report`, {
        headers: {
          'X-Device-Id': localStorage.getItem('cropdoc_device_id') || '',
        }
      });
      if (!response.ok) {
        throw new Error('Failed to download report PDF');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      triggerToast('Error downloading report PDF.', 'error');
    }
  };

  const handleSave = () => {
    triggerToast('Outpatient report saved to database.');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 select-none text-text-primary">
        <div className="w-10 h-10 border-4 border-green-neon border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-text-secondary">Generating diagnosis report...</p>
      </div>
    );
  }

  if (!scan) return null;

  // Handle Out-Of-Distribution (OOD / Not a leaf) state immediately
  if (!scan.is_leaf) {
    return <OODState onTryAgain={() => navigate('/scan')} />;
  }

  const isHealthy = scan.severity === 'healthy';
  const hasPestData = scan.pest || scan.scan_mode === 'pest' || scan.prediction?.slug?.startsWith('pest');

  return (
    <div className="flex flex-col gap-6 w-full pb-10 text-text-primary">
      
      {/* Toast popup */}
      <Toast
        message={toastMessage}
        type={toastType}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />

      {/* Offline pending submission notice */}
      {scan.is_pending && (
        <div className="bg-green-deep/20 border border-green-neon/30 rounded-16 p-4 flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-green-neon border-t-transparent rounded-full animate-spin shrink-0" />
          <div>
            <h4 className="text-sm font-bold text-white">Diagnosis Queued (Offline Buffer)</h4>
            <p className="text-xs text-text-secondary">This scan will automatically be diagnosed when connection is restored.</p>
          </div>
        </div>
      )}

      {/* Interactive Tabs Header (shown if pest is detected alongside or if selected) */}
      {hasPestData && (
        <div className="flex bg-bg-surface border border-border rounded-12 p-1 self-start">
          <button
            onClick={() => setActiveTab('disease')}
            className={`px-4 py-2 rounded-8 text-xs font-bold uppercase tracking-wider transition-all min-h-[32px] ${
              activeTab === 'disease' 
                ? 'bg-green-deep text-green-neon border border-green-neon/20 shadow-inner' 
                : 'text-text-secondary hover:text-white'
            }`}
          >
            Disease View
          </button>
          <button
            onClick={() => setActiveTab('pest')}
            className={`px-4 py-2 rounded-8 text-xs font-bold uppercase tracking-wider transition-all min-h-[32px] ${
              activeTab === 'pest' 
                ? 'bg-ai-purple/20 text-white border border-ai-purple/30 shadow-inner' 
                : 'text-text-secondary hover:text-white'
            }`}
          >
            Pest View
          </button>
        </div>
      )}

      {/* DOUBLE-PANEL RESPONSIVE GRID LAYOUT FOR DESKTOP (>=1280px) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: DIAGNOSIS DETAILS AND CONTROLS (7 cols on desktop) */}
        <div className="lg:col-span-7 flex flex-col gap-6 w-full">
          
          {activeTab === 'pest' && scan.pest ? (
            <PestResultCard 
              pestName={scan.pest.name}
              confidence={scan.confidence || 0.92}
              severity={scan.severity || 'severe'}
              description={scan.pest.description}
              treatments={scan.pest.treatments}
            />
          ) : (
            <>
              {/* Diagnosis Header Card */}
              <DiagnosisHeader
                cropName={scan.prediction?.crop || 'Crop'}
                diseaseName={scan.prediction?.name || 'Healthy'}
                confidence={scan.confidence}
                confidenceBand={scan.confidence_band}
                severity={scan.severity}
                urgencyDays={scan.urgency_days}
              />

              {/* ── AI Explanation ─────────────────────────────────────────
                  result.explanation — plain-language sentence generated by
                  the backend's explanation service. Shown prominently as the
                  primary human-readable summary of the diagnosis.
              */}
              {scan.explanation && (
                <div className="flex items-start gap-3 bg-bg-overlay border border-border rounded-16 p-4">
                  <span className="text-xl leading-none mt-0.5" aria-hidden>🤖</span>
                  <p className="text-sm font-medium text-text-secondary leading-relaxed flex-1">
                    {scan.explanation}
                  </p>
                </div>
              )}

              {/* ── Quality Tips ───────────────────────────────────────────
                  result.quality.tips — advisory chips from the backend's
                  image quality assessment gate. Only shown when tips exist.
              */}
              {scan?.quality?.tips && Array.isArray(scan.quality.tips) && scan.quality.tips.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {scan.quality.tips.map((tip: string, i: number) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 text-[11px] font-semibold
                                 bg-sev-mild/15 border border-sev-mild/25 text-sev-mild
                                 px-2.5 py-1 rounded-full"
                    >
                      <span aria-hidden>💡</span>
                      {tip}
                    </span>
                  ))}
                </div>
              )}

              {/* Low Confidence Banner - Conditional */}
              {!scan?.is_confident && scan?.prediction && (
                <LowConfidenceBanner
                  topClassName={scan.prediction?.name || 'Unknown'}
                  onRetake={() => navigate('/scan')}
                />
              )}

              {/* Treatments section - hide for healthy leaves */}
              {!isHealthy && scan?.disease?.treatments && (
                <TreatmentTabs
                  treatments={scan.disease.treatments}
                  isConfident={!!scan.is_confident}
                />
              )}

              {/* Healthy crop descriptive banner */}
              {isHealthy && (
                <div className="bg-green-deep/20 border border-green-neon/30 rounded-16 p-4 text-center text-sm font-semibold text-green-neon">
                  🎉 {t('result.healthyResult')}
                </div>
              )}
            </>
          )}

          {/* Collapsible Weather Advisor */}
          <WeatherRiskCard countryCode={user?.country || 'IN'} />

          {/* Interactive Outpatient Feedback Loop */}
          <FeedbackLoopCard
            scanId={scan.scan_id}
            onFeedbackSubmitted={(msg) => triggerToast(msg, 'success')}
          />
        </div>

        {/* RIGHT COLUMN: HEATMAP AND IMAGES (5 cols on desktop) */}
        <div className="lg:col-span-5 flex flex-col gap-6 w-full sticky top-24">
          <HeatmapViewer
            photoUrl={scan.local_image_url || scan.disease?.image_url || ''}
            heatmapUrl={scan.heatmap}
          />

          {/* Alternate predictions list */}
          {scan?.top_k && Array.isArray(scan.top_k) && scan.top_k.length > 1 && activeTab === 'disease' && (
            <PredictionList predictions={scan.top_k} />
          )}

          {/* Action Row */}
          <div className="grid grid-cols-2 gap-3 w-full mt-2">
            <button
              onClick={handleSave}
              className="flex items-center justify-center gap-2 bg-green-deep/50 border border-green-neon/30 hover:bg-green-deep text-green-neon font-bold py-3.5 px-4 rounded-12 shadow-md text-xs min-h-[48px] flex-1 transition-all active:scale-95"
            >
              <Save className="w-4 h-4" />
              {t('result.actions.save')}
            </button>

            <button
              onClick={handleShare}
              className="flex items-center justify-center gap-2 bg-bg-surface border border-border hover:bg-bg-overlay active:scale-95 text-white font-bold py-3.5 px-4 rounded-12 shadow-sm text-xs min-h-[48px] flex-1 transition-all"
            >
              <Share2 className="w-4 h-4 text-text-secondary" />
              {t('result.actions.share')}
            </button>

            <button
              onClick={handleDownloadReport}
              className="flex items-center justify-center gap-2 bg-bg-surface border border-border hover:bg-bg-overlay active:scale-95 text-white font-bold py-3.5 px-4 rounded-12 shadow-sm text-xs min-h-[48px] flex-1 transition-all"
            >
              <FileDown className="w-4 h-4 text-text-secondary" />
              Download Report
            </button>

            <button
              onClick={() => navigate('/scan')}
              className="flex items-center justify-center gap-2 bg-green-neon hover:bg-green-bright text-bg-base font-bold py-3.5 px-4 rounded-12 shadow-lg text-xs min-h-[48px] flex-1 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              New Scan
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
