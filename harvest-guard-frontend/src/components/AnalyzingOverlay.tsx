import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, RefreshCw, XCircle, BrainCircuit } from 'lucide-react';

interface AnalyzingOverlayProps {
  imageFile: File | Blob;
  onCancel: () => void;
  onRetry?: () => void;
  scanMode?: 'disease' | 'pest';
}

export const AnalyzingOverlay: React.FC<AnalyzingOverlayProps> = ({
  imageFile,
  onCancel,
  onRetry,
  scanMode = 'disease'
}) => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [statusIndex, setStatusIndex] = useState<number>(0);
  const [seconds, setSeconds] = useState<number>(0);

  const statusLines = [
    'CONNECTING TO SECURE OUTPOST...',
    'UPLOADING PHOTOGRAPHIC METRIC...',
    'ISOLATING PATHOGEN DENSITY VECTOR...',
    'RUNNING GRAD-CAM NEURAL MAPPER...',
    'PREPARING LEGAL TREATMENT REGIMES...'
  ];

  // Load preview URL
  useEffect(() => {
    const url = URL.createObjectURL(imageFile);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  // Cycle status text every 1.2 seconds
  useEffect(() => {
    const statusInterval = setInterval(() => {
      setStatusIndex((prev) => (prev < statusLines.length - 1 ? prev + 1 : prev));
    }, 1200);

    return () => clearInterval(statusInterval);
  }, [statusLines.length]);

  // Measure elapsed seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-bg-base/90 flex flex-col items-center justify-between p-6 select-none w-full border-x border-border shadow-2xl">
      {/* Background preview image dimmed */}
      <div className="absolute inset-0 z-0">
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Leaf scanning background"
            className="w-full h-full object-cover opacity-15 blur-[4px]"
          />
        )}
      </div>

      {/* App brand header */}
      <div className="relative z-10 w-full text-center mt-6">
        <h2 className="text-xl font-display font-bold text-white tracking-widest flex items-center justify-center gap-2">
          <BrainCircuit className="w-5 h-5 text-green-neon animate-pulse" />
          CropDoc <span className="text-green-neon">AI</span>
        </h2>
        <p className="text-text-secondary text-[10px] uppercase font-mono tracking-widest mt-1">Clinical AI Laboratory Outpost</p>
      </div>

      {/* Main scanning visual area */}
      <div className="relative z-10 w-full max-w-[260px] aspect-square rounded-24 overflow-hidden border-2 border-green-neon/40 shadow-[0_0_20px_rgba(57,255,135,0.15)] bg-bg-surface flex items-center justify-center">
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Leaf scanning target"
            className="w-full h-full object-cover"
          />
        )}
        
        {/* Shimmer Sweep Animation Overlay */}
        <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
          <motion.div
            initial={{ y: '-100%' }}
            animate={{ y: '100%' }}
            transition={{
              duration: 1.6,
              repeat: Infinity,
              ease: 'linear',
            }}
            className="w-full h-1/2 bg-gradient-to-b from-transparent via-green-neon/30 to-transparent shadow-[0_0_15px_rgba(57,255,135,0.4)]"
          />
        </div>
      </div>

      {/* Progress status and typewriter logs */}
      <div className="relative z-10 w-full flex flex-col items-center gap-6 mb-8 max-w-sm">
        
        {/* Scanner target log display */}
        <div className="w-full bg-bg-surface border border-border rounded-12 p-3 font-mono text-[10px] text-green-neon flex flex-col gap-1 select-all">
          <span>&gt; OUTPOST MODE: {scanMode.toUpperCase()}</span>
          <span>&gt; TARGET_LEAF_FILE_SIZE: {Math.round(imageFile.size / 1024)} KB</span>
          <span className="text-text-secondary animate-pulse">&gt; STATUS: {statusLines[statusIndex]}</span>
        </div>

        <div className="flex flex-col items-center text-center gap-2">
          {/* Pulsing spin trigger */}
          <RefreshCw className="w-5 h-5 animate-spin text-green-neon" />
          
          <motion.p
            key={statusIndex}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-white text-sm font-semibold tracking-wide font-display"
          >
            Analyzing Leaf...
          </motion.p>
        </div>

        {/* Slow connection warning */}
        {seconds >= 8 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full bg-sev-mild/15 text-sev-mild p-3 rounded-12 shadow border border-sev-mild/30 flex flex-col gap-2"
          >
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Still working... check network speed</span>
            </div>
            {onRetry && (
              <button
                onClick={onRetry}
                className="bg-sev-mild hover:bg-opacity-95 text-bg-base font-bold py-1.5 rounded-8 text-xs flex items-center justify-center gap-1.5 transition-colors min-h-[32px]"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </button>
            )}
          </motion.div>
        )}

        {/* Abort button */}
        <button
          onClick={onCancel}
          className="flex items-center justify-center gap-1.5 bg-bg-surface border border-border hover:bg-bg-overlay text-white font-bold py-3 px-6 rounded-12 transition-colors min-h-[44px] text-xs w-full max-w-[180px]"
        >
          <XCircle className="w-4.5 h-4.5 text-sev-severe" />
          Cancel Analysis
        </button>
      </div>
    </div>
  );
};
