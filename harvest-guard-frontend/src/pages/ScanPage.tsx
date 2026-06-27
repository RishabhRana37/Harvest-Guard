import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Leaf, Clock, ArrowRight, Activity, MapPin, Bug } from 'lucide-react';
import { ScanButton } from '../components/ScanButton';
import { CapturePreview } from '../components/CapturePreview';
import { AnalyzingOverlay } from '../components/AnalyzingOverlay';
import { WeatherRiskCard } from '../components/WeatherRiskCard';
import { api } from '../services/api';
import { getAllScans, enqueueOfflineScan } from '../utils/db';
import type { SavedScan } from '../utils/db';
import { useOffline } from '../hooks/useOffline';

export const ScanPage: React.FC = () => {
  const navigate = useNavigate();
  const isOffline = useOffline();

  // Capture States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analyzingBlob, setAnalyzingBlob] = useState<Blob | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recentScans, setRecentScans] = useState<SavedScan[]>([]);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  // Scan Mode: disease | pest
  const [scanMode, setScanMode] = useState<'disease' | 'pest'>('disease');
  
  // User Profile cache
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const loadProfile = () => {
      const data = localStorage.getItem('cropdoc_user');
      if (data) {
        setUser(JSON.parse(data));
      }
    };
    loadProfile();
    window.addEventListener('storage', loadProfile);
    return () => window.removeEventListener('storage', loadProfile);
  }, []);

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

  const handleStartAnalysis = React.useCallback(async (compressedBlob: Blob) => {
    setAnalyzingBlob(compressedBlob);
    setIsAnalyzing(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      if (isOffline) {
        const pendingId = await enqueueOfflineScan(compressedBlob, selectedFile?.name?.split('.')[0] || 'Leaf');
        setIsAnalyzing(false);
        setSelectedFile(null);
        setAnalyzingBlob(null);
        navigate(`/result/${pendingId}`);
        return;
      }

      // Hit API
      const result = await api.diagnose(
        compressedBlob,
        selectedFile?.name?.split('.')[0],
        controller.signal
      );

      // Inject scan mode meta inIndexedDB
      result.scan_mode = scanMode;

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
  }, [isOffline, selectedFile, scanMode, navigate]);

  const handleCancel = () => {
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
    if (severity === 'healthy') return 'bg-sev-healthy/20 text-green-neon border-green-neon/30';
    if (severity === 'mild') return 'bg-sev-mild/20 text-sev-mild border-sev-mild/30';
    if (severity === 'severe') return 'bg-sev-severe/20 text-sev-severe border-sev-severe/30';
    return 'bg-bg-overlay text-text-secondary';
  };

  return (
    <div className="flex flex-col gap-5 w-full pb-8 select-none text-text-primary">
      
      {/* Offline Status Warning Strip */}
      {isOffline && (
        <div className="bg-sev-mild/15 border border-sev-mild/30 rounded-12 p-3 text-center text-xs font-bold text-sev-mild flex items-center justify-center gap-1.5 animate-pulse">
          <Activity className="w-4 h-4 shrink-0" />
          <span>OFFLINE BUFFERING ACTIVE — Images enqueued locally</span>
        </div>
      )}

      {/* Country context chip and Outpost Mode switcher */}
      {!selectedFile && !isAnalyzing && (
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3.5 border-b border-border pb-4">
          <div 
            onClick={() => navigate('/profile')}
            className="inline-flex items-center gap-2 bg-bg-surface border border-border hover:border-green-neon/30 rounded-full px-3 py-1.5 cursor-pointer text-xs font-semibold hover:bg-bg-overlay self-start transition-all"
          >
            <MapPin className="w-4 h-4 text-green-neon animate-bounce" />
            <span>Outpost: {user?.flag || '🇮🇳'} {user?.countryName || 'India'}</span>
            <span className="text-[10px] text-text-muted">(tap to change)</span>
          </div>

          {/* Scan Mode Toggle Pill */}
          <div className="flex bg-bg-surface border border-border rounded-full p-1 self-start sm:self-auto">
            <button
              onClick={() => setScanMode('disease')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all min-h-[26px] ${
                scanMode === 'disease' 
                  ? 'bg-green-deep text-green-neon border border-green-neon/20 shadow-inner' 
                  : 'text-text-secondary hover:text-white'
              }`}
            >
              <Leaf className="w-3.5 h-3.5" />
              Disease Mode
            </button>
            <button
              onClick={() => setScanMode('pest')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all min-h-[26px] ${
                scanMode === 'pest' 
                  ? 'bg-ai-purple/20 text-white border border-ai-purple/30 shadow-inner' 
                  : 'text-text-secondary hover:text-white'
              }`}
            >
              <Bug className="w-3.5 h-3.5" />
              Pest Mode
            </button>
          </div>
        </div>
      )}

      {/* Conditional UI States */}
      {!selectedFile && !isAnalyzing ? (
        <div className="flex flex-col gap-6">
          
          {/* Weather Risk collapsible Card */}
          <WeatherRiskCard countryCode={user?.country || 'IN'} />

          {/* Interactive Scan button */}
          <ScanButton onImageSelected={handleImageSelected} />

          {/* Recent Scans Strip */}
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-green-neon" />
                Recent Outpatient Scans
              </h3>
              {recentScans.length > 0 && (
                <button
                  onClick={() => navigate('/history')}
                  className="text-xs font-bold text-green-neon hover:text-green-bright flex items-center gap-0.5"
                >
                  View All <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>

            {recentScans.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {recentScans.map((scan) => (
                  <div
                    key={scan.scan_id}
                    onClick={() => navigate(`/result/${scan.scan_id}`)}
                    className="flex items-center gap-3 bg-bg-surface border border-border/80 hover:border-green-neon/50 rounded-16 p-3 shadow-md cursor-pointer transition-all hover:scale-[1.02] active:scale-98"
                  >
                    <div className="w-12 h-12 rounded-12 overflow-hidden bg-black/30 shrink-0 border border-border/50">
                      <img
                        src={scan.local_image_url || scan.heatmap || scan.disease?.image_url}
                        alt="Outpatient"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    <div className="flex-1 flex flex-col gap-1 min-w-0">
                      <div className="text-xs font-bold text-white truncate">
                        {scan.prediction?.crop}
                      </div>
                      <div className="text-[10px] font-medium text-text-secondary truncate">
                        {scan.prediction?.name}
                      </div>
                      
                      <span className={`inline-flex items-center self-start text-[8px] font-bold px-1.5 py-0.5 rounded-full border ${
                        scan.is_pending 
                          ? 'bg-green-deep/20 text-green-neon border-green-neon/20' 
                          : getSeverityColorClass(scan.severity)
                      }`}>
                        {scan.is_pending ? 'Pending' : scan.severity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-8 py-10 bg-bg-surface rounded-16 border border-border shadow-inner max-w-md mx-auto w-full">
                <Leaf className="w-8 h-8 text-text-muted/30 mb-2.5" />
                <p className="text-xs text-text-secondary font-medium">Your outpatient scans will appear here.</p>
              </div>
            )}
          </div>
        </div>
      ) : selectedFile && !isAnalyzing ? (
        <CapturePreview
          file={selectedFile}
          onAnalyze={handleStartAnalysis}
          onCancel={handleCancel}
        />
      ) : (
        <AnalyzingOverlay
          imageFile={analyzingBlob || selectedFile!}
          onCancel={handleCancel}
          onRetry={handleRetry}
        />
      )}
    </div>
  );
};
