import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Camera, Upload, Info, X } from 'lucide-react';

interface ScanButtonProps {
  onImageSelected: (file: File) => void;
}

export const ScanButton: React.FC<ScanButtonProps> = ({ onImageSelected }) => {
  const { t } = useTranslation();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [showTip, setShowTip] = useState(() => {
    return localStorage.getItem('cropdoc_dismiss_tip') !== 'true';
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onImageSelected(e.target.files[0]);
    }
  };

  const triggerCamera = () => {
    cameraInputRef.current?.click();
  };

  const triggerGallery = () => {
    galleryInputRef.current?.click();
  };

  const dismissTip = () => {
    setShowTip(false);
    localStorage.setItem('cropdoc_dismiss_tip', 'true');
  };

  return (
    <div className="flex flex-col items-center justify-center w-full my-6 select-none">
      {/* Dismissible Camera Tip Card */}
      {showTip && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="relative w-full max-w-sm mb-8 bg-sage-100 rounded-16 p-4 border border-border flex items-start gap-3"
        >
          <Info className="w-5 h-5 text-green-700 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-text-strong pr-6 leading-relaxed">
              {t('home.cameraTip')}
            </p>
          </div>
          <button
            onClick={dismissTip}
            className="absolute top-2 right-2 text-text-muted hover:text-text-strong p-1 rounded-full min-w-[32px] min-h-[32px] flex items-center justify-center"
            aria-label="Dismiss tips"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* Hidden File Inputs */}
      {/* Camera Capture Path */}
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment"
        className="hidden"
        id="camera-input"
      />
      {/* Gallery Path */}
      <input
        type="file"
        ref={galleryInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
        id="gallery-input"
      />

      {/* Pulsing Scan Trigger Disc */}
      <div className="relative mb-8 flex items-center justify-center w-36 h-36">
        {/* Breathing Animation Background Rings */}
        <motion.div
          animate={{
            scale: [1, 1.25, 1],
            opacity: [0.4, 0, 0.4],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute inset-0 bg-green-500 rounded-full"
        />
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.6, 0.1, 0.6],
          }}
          transition={{
            duration: 2.5,
            delay: 0.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute w-28 h-28 bg-green-700/40 rounded-full"
        />

        {/* Hero Camera Button */}
        <button
          onClick={triggerCamera}
          className="relative z-10 w-24 h-24 bg-green-700 hover:bg-green-500 active:scale-95 text-white rounded-full flex flex-col items-center justify-center shadow-lg transition-colors border-4 border-white min-w-[96px] min-h-[96px]"
          aria-label={t('home.scanCTA')}
        >
          <Camera className="w-8 h-8 mb-1" />
          <span className="text-xs font-bold uppercase tracking-wider">{t('nav.scan')}</span>
        </button>
      </div>

      {/* Action CTA Buttons */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={triggerCamera}
          className="flex items-center justify-center gap-2 w-full bg-green-700 hover:bg-green-500 text-white font-semibold py-3.5 px-6 rounded-12 shadow transition-all active:scale-98 min-h-[48px] text-base"
        >
          <Camera className="w-5 h-5" />
          {t('home.takePhoto')}
        </button>
        
        <button
          onClick={triggerGallery}
          className="flex items-center justify-center gap-2 w-full bg-surface border border-border text-green-700 font-semibold py-3.5 px-6 rounded-12 shadow-sm transition-all hover:bg-sage-100 active:scale-98 min-h-[48px] text-base"
        >
          <Upload className="w-5 h-5" />
          {t('home.uploadGallery')}
        </button>
      </div>
    </div>
  );
};
