import React, { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Camera, Upload, X, Scan } from 'lucide-react';

interface ScanButtonProps {
  onImageSelected: (file: File) => void;
}

/**
 * ScanButton — Native camera + gallery upload entry point.
 *
 * Mobile behaviour:
 *   • Primary circular button  → <input capture="environment"> → rear camera
 *   • "Upload from Gallery"    → <input> without capture  → photo picker
 *
 * The dismissible tip ("Fill the frame with one leaf · good light · hold
 * steady.") sits above the capture disc and is persisted to localStorage.
 *
 * The capture disc is positioned in the visual lower-third of the card so
 * it's thumb-reachable on any phone without scrolling.
 */
export const ScanButton: React.FC<ScanButtonProps> = ({ onImageSelected }) => {
  const { t } = useTranslation();

  // ── Hidden file inputs ────────────────────────────────────────────
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // ── Tip dismiss (persisted) ───────────────────────────────────────
  const [showTip, setShowTip] = useState(
    () => localStorage.getItem('harvest_guard_dismiss_tip') !== 'true'
  );

  const dismissTip = () => {
    setShowTip(false);
    localStorage.setItem('harvest_guard_dismiss_tip', 'true');
  };

  // ── File selection handler (shared by both paths) ─────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageSelected(file);
      // Reset the input so the same file can be re-selected
      e.target.value = '';
    }
  };

  return (
    <div className="flex flex-col items-center w-full select-none">

      {/* ── Hidden file inputs ───────────────────────────────────────── */}

      {/*
        Camera path: capture="environment" tells mobile browsers to open
        the rear camera directly without showing a picker first.
        On desktop it falls back to the normal file picker.
      */}
      <input
        ref={cameraInputRef}
        id="camera-capture-input"
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        aria-label="Open rear camera"
        onChange={handleFileChange}
      />

      {/*
        Gallery path: no capture attribute — shows the OS photo picker
        (gallery) on mobile, file browser on desktop.
      */}
      <input
        ref={galleryInputRef}
        id="gallery-upload-input"
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label="Upload from photo gallery"
        onChange={handleFileChange}
      />

      {/* ── Dismissible Tip ──────────────────────────────────────────── */}
      <AnimatePresence>
        {showTip && (
          <motion.div
            key="camera-tip"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-sm mb-6"
          >
            <div className="flex items-center gap-2.5 bg-green-deep/60 border border-green-neon/20 rounded-12 px-4 py-3 pr-10 shadow-sm">
              {/* Leaf accent dot */}
              <span className="w-2 h-2 rounded-full bg-green-neon shrink-0 animate-pulse" />
              <p className="text-xs font-medium text-text-secondary leading-snug flex-1">
                Fill the frame with one leaf&nbsp;·&nbsp;good light&nbsp;·&nbsp;hold steady.
              </p>
              <button
                onClick={dismissTip}
                className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-white/10 text-text-muted hover:text-white transition-colors"
                aria-label="Dismiss camera tip"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Capture Zone ─────────────────────────────────────────────── */}
      {/*
        The capture zone occupies the lower-third of a typical mobile viewport:
        - ScanPage content above (weather card, mode toggle) takes ~40% height
        - This section is therefore in the ~60-100% zone, thumb-reachable
        We do NOT use position:fixed/sticky — the AppShell already ensures
        content scrolls naturally and the button is always visible on first paint.
      */}
      <div className="flex flex-col items-center gap-8 w-full pt-4 pb-2">

        {/* Primary circular camera button */}
        <div className="relative flex items-center justify-center">

          {/* Outer breathing ring — visual affordance */}
          <motion.div
            aria-hidden
            animate={{ scale: [1, 1.28, 1], opacity: [0.35, 0, 0.35] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 rounded-full bg-green-neon/40"
            style={{ width: 144, height: 144 }}
          />
          {/* Inner breathing ring */}
          <motion.div
            aria-hidden
            animate={{ scale: [1, 1.14, 1], opacity: [0.55, 0.1, 0.55] }}
            transition={{ duration: 2.8, delay: 0.5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute rounded-full bg-green-neon/25"
            style={{ width: 120, height: 120 }}
          />

          {/*
            ✅ Primary capture button
            min-w/min-h guarantees the 96 px touch target per spec.
            Clicking this opens the rear camera on mobile devices.
          */}
          <button
            id="camera-capture-btn"
            onClick={() => cameraInputRef.current?.click()}
            className="relative z-10 flex flex-col items-center justify-center
                       rounded-full bg-gradient-to-br from-green-600 to-green-800
                       border-4 border-white shadow-[0_0_32px_rgba(74,222,128,0.35)]
                       hover:from-green-500 hover:to-green-700
                       active:scale-95 transition-all duration-150
                       text-white"
            style={{ width: 112, height: 112, minWidth: 96, minHeight: 96 }}
            aria-label={t('home.takePhoto')}
          >
            <Camera className="w-9 h-9 mb-1" aria-hidden />
            <span className="text-[10px] font-bold uppercase tracking-widest leading-none">
              {t('nav.scan')}
            </span>
          </button>
        </div>

        {/* Label below disc */}
        <p className="text-xs text-text-muted font-medium -mt-4">
          Tap to open rear camera
        </p>

        {/* ── Divider ───────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 w-full max-w-xs">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* ── Gallery upload button ──────────────────────────────────── */}
        <button
          id="gallery-upload-btn"
          onClick={() => galleryInputRef.current?.click()}
          className="flex items-center justify-center gap-2.5
                     w-full max-w-xs
                     bg-bg-surface border border-border
                     hover:border-green-neon/30 hover:bg-bg-overlay
                     text-text-primary font-semibold
                     py-3.5 px-6 rounded-12
                     transition-all active:scale-98
                     min-h-[48px] text-sm"
          aria-label={t('home.uploadGallery')}
        >
          <Upload className="w-4.5 h-4.5 shrink-0" aria-hidden />
          {t('home.uploadGallery')}
        </button>

        {/* Inline hint for gallery path */}
        <div className="flex items-center gap-1.5 -mt-4">
          <Scan className="w-3.5 h-3.5 text-text-muted/60" aria-hidden />
          <p className="text-[10px] text-text-muted/70 font-medium">
            Opens photo gallery — no camera required
          </p>
        </div>
      </div>
    </div>
  );
};
