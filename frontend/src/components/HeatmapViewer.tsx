import React, { useState, useCallback, useEffect, useId } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Image as ImageIcon, Layers, SlidersHorizontal, Leaf } from 'lucide-react';

interface HeatmapViewerProps {
  /** Original leaf photo — ObjectURL, blob URL, or base64 data URI */
  photoUrl: string;
  /**
   * Grad-CAM++ heatmap returned as a base64 PNG data URI (result.heatmap).
   * Pass null to gracefully hide the viewer (OOD / healthy / re-fetched scan).
   */
  heatmapUrl: string | null;
}

/**
 * HeatmapViewer
 *
 * Renders the user's leaf photo with the Grad-CAM++ heatmap composited on top.
 *
 * Design decisions:
 *  • Heatmap overlay uses `mix-blend-mode: screen` — the heatmap PNG has a
 *    black background with coloured activations; screen blending makes the
 *    black transparent while keeping the warm reds/yellows visible.
 *  • Opacity is wired to a plain CSS `style={{ opacity }}` (not animated via
 *    framer-motion) so the slider response is instant with zero easing lag.
 *  • Toggle switches between 'photo' (opacity 0) and 'overlay' (last slider
 *    value), never destroying the img node — avoids a reload flicker.
 *  • If heatmapUrl is null, shows a compact "Evidence unavailable" notice
 *    with just the original photo, so the UI never breaks.
 */
export const HeatmapViewer: React.FC<HeatmapViewerProps> = ({
  photoUrl,
  heatmapUrl,
}) => {
  const { t } = useTranslation();
  const sliderId = useId(); // unique id for label association

  // 'photo' = heatmap hidden | 'overlay' = heatmap shown at `opacity`
  const [viewMode, setViewMode] = useState<'photo' | 'overlay'>(
    heatmapUrl ? 'overlay' : 'photo'
  );
  const [opacity, setOpacity] = useState<number>(65);

  // If heatmap URL changes (e.g. scan re-fetched), reset to sensible defaults
  useEffect(() => {
    setViewMode(heatmapUrl ? 'overlay' : 'photo');
  }, [heatmapUrl]);

  // Derived: effective CSS opacity of the heatmap layer
  const heatmapCssOpacity = viewMode === 'overlay' ? opacity / 100 : 0;

  const handleSlider = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setOpacity(Number(e.target.value));
  }, []);

  return (
    <section
      aria-label="Evidence heatmap viewer"
      className="w-full bg-bg-surface rounded-16 border border-border shadow-sm
                 flex flex-col gap-4 overflow-hidden select-none"
    >
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-green-neon" aria-hidden />
          {t('result.evidence')}
        </h3>

        {/* Photo / Heatmap toggle pill — only when heatmap is available */}
        {heatmapUrl && (
          <div
            role="group"
            aria-label="View mode"
            className="flex bg-bg-overlay border border-border rounded-full p-1"
          >
            <button
              id="toggle-photo"
              role="radio"
              aria-checked={viewMode === 'photo'}
              onClick={() => setViewMode('photo')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold
                          transition-all min-h-[32px] ${
                            viewMode === 'photo'
                              ? 'bg-bg-surface text-white shadow-sm border border-border'
                              : 'text-text-muted hover:text-white'
                          }`}
            >
              <ImageIcon className="w-3.5 h-3.5" aria-hidden />
              {t('result.togglePhoto')}
            </button>
            <button
              id="toggle-heatmap"
              role="radio"
              aria-checked={viewMode === 'overlay'}
              onClick={() => setViewMode('overlay')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold
                          transition-all min-h-[32px] ${
                            viewMode === 'overlay'
                              ? 'bg-green-deep text-green-neon shadow-sm border border-green-neon/20'
                              : 'text-text-muted hover:text-white'
                          }`}
            >
              <Layers className="w-3.5 h-3.5" aria-hidden />
              {t('result.toggleHeatmap')}
            </button>
          </div>
        )}
      </div>

      {/* ── Image composite ──────────────────────────────────────────── */}
      <div className="relative w-full aspect-square bg-black/30 overflow-hidden">
        {/* Base photo — always rendered, never unmounted */}
        {photoUrl ? (
          <img
            src={photoUrl}
            alt="Original leaf photo"
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Leaf className="w-12 h-12 text-text-muted/30" aria-hidden />
          </div>
        )}

        {/*
          Heatmap overlay
          ───────────────
          mix-blend-mode: screen — the PNG has a near-black background with
          coloured activations (cool blues → warm reds). Screen blending:
            output = 1 − (1−src) × (1−dst)
          keeps black areas transparent, letting the leaf photo show through,
          while the warm activations add a vivid coloured overlay.

          Opacity is controlled by a plain CSS property (not framer-motion)
          so the range slider has zero easing lag — changes are instantaneous.
        */}
        {heatmapUrl && (
          <img
            src={heatmapUrl}
            alt="Grad-CAM++ activation heatmap overlay"
            aria-hidden
            className="absolute inset-0 w-full h-full object-cover pointer-events-none
                       transition-opacity duration-150"
            style={{
              opacity: heatmapCssOpacity,
              mixBlendMode: 'screen',
            }}
          />
        )}

        {/* "Photo only" mode badge */}
        <AnimatePresence>
          {viewMode === 'photo' && heatmapUrl && (
            <motion.div
              key="photo-badge"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm
                         text-white text-[10px] font-bold px-2 py-1 rounded-full
                         border border-white/10"
            >
              Original photo
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Slider + Legend (only when heatmap is available) ─────────── */}
      {heatmapUrl ? (
        <div className="flex flex-col gap-3 px-4 pb-4">

          {/* Opacity slider — shown only in overlay mode */}
          <AnimatePresence initial={false}>
            {viewMode === 'overlay' && (
              <motion.div
                key="slider-panel"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-3 bg-bg-overlay rounded-12 p-3 border border-border">
                  <SlidersHorizontal
                    className="w-4 h-4 text-green-neon shrink-0"
                    aria-hidden
                  />
                  <div className="flex-1 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor={sliderId}
                        className="text-[11px] font-bold text-text-muted"
                      >
                        {t('result.heatmapSlider')}
                      </label>
                      <span
                        aria-live="polite"
                        className="text-[11px] font-bold text-green-neon tabular-nums"
                      >
                        {opacity}%
                      </span>
                    </div>

                    {/*
                      Native range input — deliberately unstyled beyond the
                      track gradient so the browser's native thumb renders
                      correctly on both iOS (round) and Android (material).
                      accent-color is set via Tailwind's arbitrary value.
                    */}
                    <input
                      id={sliderId}
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={opacity}
                      onChange={handleSlider}
                      aria-label="Heatmap overlay opacity"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={opacity}
                      className="w-full h-2 rounded-full appearance-none cursor-pointer
                                 [accent-color:#4ade80]"
                      style={{
                        background: `linear-gradient(to right,
                          #4ade80 0%,
                          #4ade80 ${opacity}%,
                          rgba(255,255,255,0.12) ${opacity}%,
                          rgba(255,255,255,0.12) 100%)`,
                      }}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Cool→warm legend ────────────────────────────────────── */}
          <div className="flex flex-col gap-1.5">
            {/* Gradient bar — cool (blue) → warm (red), matching Grad-CAM palette */}
            <div
              aria-hidden
              className="w-full h-2.5 rounded-full"
              style={{
                background:
                  'linear-gradient(to right, #3b82f6, #06b6d4, #22c55e, #eab308, #f97316, #ef4444)',
              }}
            />
            <div className="flex items-center justify-between text-[10px] font-semibold text-text-muted">
              <span>{t('result.heatmapLegendLow')}</span>
              <span>{t('result.heatmapLegendHigh')}</span>
            </div>
            {/* Caption below legend */}
            <p className="text-[11px] text-text-muted text-center leading-snug mt-0.5">
              {t('result.heatmapCaption')}
            </p>
          </div>
        </div>
      ) : (
        /* ── Graceful null state ────────────────────────────────────── */
        <div className="flex items-center gap-2.5 px-4 pb-4 text-text-muted">
          <ImageIcon className="w-4 h-4 shrink-0 opacity-50" aria-hidden />
          <p className="text-xs font-medium leading-snug">
            Heatmap unavailable — shown only for disease diagnoses.
          </p>
        </div>
      )}
    </section>
  );
};
