import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Leaf, Clock, ArrowRight, Activity } from 'lucide-react';
import { ScanButton } from '../components/ScanButton';
import { CapturePreview } from '../components/CapturePreview';
import { AnalyzingOverlay } from '../components/AnalyzingOverlay';
import { api } from '../services/api';
import { getAllScans, enqueueOfflineScan } from '../utils/db';
import type { SavedScan } from '../utils/db';
import { useOffline } from '../hooks/useOffline';

export const ScanPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isOffline = useOffline();

  // Capture States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analyzingBlob, setAnalyzingBlob] = useState<Blob | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recentScans, setRecentScans] = useState<SavedScan[]>([]);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  // Fetch recent scans on mount
  useEffect(() => {
    const fetchRecentScans = async () => {
      try {
        const all = await getAllScans();
        setRecentScans(all.slice(0, 3));
      } catch (error) {
        console.error('Failed to load recent scans from DB:', error);
      }
    };
    fetchRecentScans();
  }, [isAnalyzing]);

  const handleImageSelected = (file: File) => {
    setSelectedFile(file);
  };

  const handleStartAnalysis = async (compressedBlob: Blob) => {
    setAnalyzingBlob(compressedBlob);
    setIsAnalyzing(true);

    // Create abort controller for request cancelation
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // If the device is offline, enqueue for sync and don't fetch API
      if (isOffline) {
        const pendingId = await enqueueOfflineScan(compressedBlob, selectedFile?.name?.split('.')[0] || 'Leaf');
        setIsAnalyzing(false);
        setSelectedFile(null);
        setAnalyzingBlob(null);
        // Take user to the result details where it shows queued/pending state
        navigate(`/result/${pendingId}`);
        return;
      }

      // Hit API
      const result = await api.diagnose(
        compressedBlob,
        selectedFile?.name?.split('.')[0], // pass file name as crop hint
        controller.signal
      );

      setIsAnalyzing(false);
      setSelectedFile(null);
      setAnalyzingBlob(null);
      
      if (result && result.scan_id) {
        navigate(`/result/${result.scan_id}`);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Analysis aborted by user.');
      } else {
        console.error('Analysis failed:', error);
        alert(error.message || 'Server connection issue. Please try again.');
      }
      setIsAnalyzing(false);
      setSelectedFile(null);
      setAnalyzingBlob(null);
    }
  };

  const handleCancel = () => {
    // Abort active network request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsAnalyzing(false);
    setSelectedFile(null);
    setAnalyzingBlob(null);
  };

  const handleRetry = () => {
    if (analyzingBlob) {
      handleStartAnalysis(analyzingBlob);
    }
  };

  const getSeverityColorClass = (severity: string | null) => {
    if (severity === 'healthy') return 'bg-sev-healthy text-white';
    if (severity === 'mild') return 'bg-sev-mild text-white';
    if (severity === 'severe') return 'bg-sev-severe text-white';
    return 'bg-border text-text-muted';
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-8">
      {/* Offline Status Warning Strip */}
      {isOffline && (
        <div className="bg-sev-mild/15 border border-sev-mild/30 rounded-12 p-3 text-center text-xs font-bold text-sev-mild flex items-center justify-center gap-1.5 animate-pulse">
          <Activity className="w-4 h-4 shrink-0" />
          <span>OFFLINE MODE — Scans will be queued locally</span>
        </div>
      )}

      {/* Conditional UI States */}
      {!selectedFile && !isAnalyzing ? (
        // Idle camera upload CTA
        <div className="flex flex-col gap-8">
          <ScanButton onImageSelected={handleImageSelected} />

          {/* Horizontal scroll list of 3 most recent scans */}
          <div className="flex flex-col gap-3.5 select-none">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-base font-bold text-text-strong flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-green-700" />
                {t('home.recentScans')}
              </h3>
              {recentScans.length > 0 && (
                <button
                  onClick={() => navigate('/history')}
                  className="text-xs font-bold text-green-700 hover:text-green-500 flex items-center gap-0.5"
                >
                  View All <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>

            {recentScans.length > 0 ? (
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x">
                {recentScans.map((scan) => (
                  <div
                    key={scan.scan_id}
                    onClick={() => navigate(`/result/${scan.scan_id}`)}
                    className="flex items-center gap-3 bg-surface border border-border/80 hover:border-green-500 rounded-16 p-3 shadow-sm min-w-[210px] max-w-[240px] snap-start shrink-0 cursor-pointer transition-all active:scale-98"
                  >
                    <div className="w-[52px] h-[52px] rounded-12 overflow-hidden bg-black/5 shrink-0">
                      <img
                        src={scan.local_image_url || scan.heatmap || scan.disease?.image_url}
                        alt="Scan preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    <div className="flex-1 flex flex-col gap-1 min-w-0">
                      <div className="text-sm font-bold text-text-strong truncate">
                        {scan.prediction?.crop}
                      </div>
                      <div className="text-xs font-medium text-text-muted truncate">
                        {scan.prediction?.name}
                      </div>
                      
                      {scan.is_pending ? (
                        <span className="inline-flex items-center self-start text-[9px] font-bold bg-green-900/10 text-green-900 px-1.5 py-0.5 rounded-full border border-green-900/25">
                          Pending
                        </span>
                      ) : (
                        <span className={`inline-flex items-center self-start text-[9px] font-bold px-1.5 py-0.5 rounded-full ${getSeverityColorClass(scan.severity)}`}>
                          {scan.severity}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Empty State UI
              <div className="flex flex-col items-center justify-center text-center p-8 py-10 bg-surface rounded-16 border border-border/60 shadow-inner">
                <Leaf className="w-8 h-8 text-text-muted/30 mb-2.5" />
                <p className="text-sm text-text-muted font-medium">{t('home.emptyScans')}</p>
              </div>
            )}
          </div>
        </div>
      ) : selectedFile && !isAnalyzing ? (
        // Capture preview with optimizer compression metrics & blur advisor
        <CapturePreview
          file={selectedFile}
          onAnalyze={handleStartAnalysis}
          onCancel={handleCancel}
        />
      ) : (
        // Full screen loading overlay with scrolling status text
        <AnalyzingOverlay
          imageFile={analyzingBlob || selectedFile!}
          onCancel={handleCancel}
          onRetry={handleRetry}
        />
      )}
    </div>
  );
};
