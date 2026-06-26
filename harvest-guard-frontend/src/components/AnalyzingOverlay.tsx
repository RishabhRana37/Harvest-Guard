import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, RefreshCw, XCircle } from 'lucide-react';

interface AnalyzingOverlayProps {
  imageFile: File | Blob;
  onCancel: () => void;
  onRetry?: () => void;
  elapsedTime?: number; // Optional externally measured time
}

export const AnalyzingOverlay: React.FC<AnalyzingOverlayProps> = ({
  imageFile,
  onCancel,
  onRetry
}) => {
  const { t } = useTranslation();
  const [imageUrl, setImageUrl] = useState<string>('');
  const [statusIndex, setStatusIndex] = useState<number>(0);
  const [seconds, setSeconds] = useState<number>(0);

  const statusLines = [
    t('analyzing.uploading'),
    t('analyzing.analyzing'),
    t('analyzing.identifying'),
    t('analyzing.preparing')
  ];

  // Load preview URL
  useEffect(() => {
    const url = URL.createObjectURL(imageFile);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  // Cycle status text every 1.5 seconds
  useEffect(() => {
    const statusInterval = setInterval(() => {
      setStatusIndex((prev) => (prev < statusLines.length - 1 ? prev + 1 : prev));
    }, 1200);

    return () => clearInterval(statusInterval);
  }, [statusLines.length]);

  // Measure elapsed seconds for timeout threshold (8 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-green-900 flex flex-col items-center justify-between p-6 select-none max-w-md mx-auto border-x border-border shadow-2xl">
      {/* Background preview image dimmed */}
      <div className="absolute inset-0 z-0 bg-black/60">
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Leaf scanning"
            className="w-full h-full object-cover opacity-30 blur-[2px]"
          />
        )}
      </div>

      {/* App brand header */}
      <div className="relative z-10 w-full text-center mt-6">
        <h2 className="text-2xl font-bold text-white tracking-wide sunlight-high-contrast">
          {t('appName')}
        </h2>
        <p className="text-sage-100/70 text-sm mt-1">Clinical AI Laboratory</p>
      </div>

      {/* Main scanning visual area */}
      <div className="relative z-10 w-full max-w-[280px] aspect-square rounded-24 overflow-hidden border-2 border-green-500/50 shadow-2xl bg-black/30 flex items-center justify-center">
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Scanning area"
            className="w-full h-full object-cover"
          />
        )}
        
        {/* Shimmer Sweep Animation Overlay */}
        <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
          <motion.div
            initial={{ y: '-100%' }}
            animate={{ y: '100%' }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'linear',
            }}
            className="w-full h-2/3 bg-gradient-to-b from-transparent via-green-500/60 to-transparent shadow-[0_0_15px_rgba(79,157,82,0.8)]"
          />
        </div>
      </div>

      {/* Progress status and options */}
      <div className="relative z-10 w-full flex flex-col items-center gap-6 mb-8">
        <div className="flex flex-col items-center text-center gap-2">
          {/* Pulsing micro-spinner */}
          <RefreshCw className="w-6 h-6 animate-spin text-green-500" />
          
          {/* Status text */}
          <motion.p
            key={statusIndex}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-white text-lg font-semibold tracking-wide sunlight-high-contrast"
          >
            {statusLines[statusIndex]}
          </motion.p>
        </div>

        {/* Slow connection advisory alert */}
        {seconds >= 8 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full bg-sev-mild/95 text-text-strong px-4 py-3 rounded-12 shadow flex flex-col gap-2.5 border border-sev-mild/20"
          >
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wide">
                {t('analyzing.slowConnection')}
              </span>
            </div>
            {onRetry && (
              <button
                onClick={onRetry}
                className="bg-text-strong text-white font-bold py-2 rounded-8 text-sm flex items-center justify-center gap-1.5 hover:bg-black transition-colors min-h-[36px]"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {t('analyzing.retry')}
              </button>
            )}
          </motion.div>
        )}

        {/* Abort button */}
        <button
          onClick={onCancel}
          className="flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold py-3 px-6 rounded-12 shadow-sm transition-colors min-h-[48px] text-base w-full max-w-[200px]"
        >
          <XCircle className="w-5 h-5" />
          {t('analyzing.cancel')}
        </button>
      </div>
    </div>
  );
};
