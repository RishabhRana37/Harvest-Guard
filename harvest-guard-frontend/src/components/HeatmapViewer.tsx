import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Image, Layers, Sliders } from 'lucide-react';

interface HeatmapViewerProps {
  photoUrl: string; // original leaf photo (ObjectURL or base64)
  heatmapUrl: string | null; // base64 heatmap PNG overlay
}

export const HeatmapViewer: React.FC<HeatmapViewerProps> = ({ photoUrl, heatmapUrl }) => {
  const { t } = useTranslation();
  const [viewState, setViewState] = useState<'photo' | 'heatmap'>('heatmap');
  const [intensity, setIntensity] = useState<number>(65); // Default 65%

  // Fallback if no heatmap is available (e.g. healthy result)
  useEffect(() => {
    if (!heatmapUrl) {
      setViewState('photo');
    }
  }, [heatmapUrl]);

  return (
    <div className="w-full bg-surface rounded-16 p-4 border border-border shadow-sm flex flex-col gap-4 select-none">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-text-strong flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-green-700" />
          {t('result.evidence')}
        </h3>
        
        {/* Toggle Pill Button */}
        {heatmapUrl && (
          <div className="flex bg-surface-alt rounded-full p-1 border border-border">
            <button
              onClick={() => setViewState('photo')}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all min-h-[32px] ${
                viewState === 'photo'
                  ? 'bg-green-700 text-white shadow-sm'
                  : 'text-text-muted hover:text-text-strong'
              }`}
            >
              <Image className="w-3.5 h-3.5" />
              {t('result.togglePhoto')}
            </button>
            <button
              onClick={() => setViewState('heatmap')}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all min-h-[32px] ${
                viewState === 'heatmap'
                  ? 'bg-green-700 text-white shadow-sm'
                  : 'text-text-muted hover:text-text-strong'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              {t('result.toggleHeatmap')}
            </button>
          </div>
        )}
      </div>

      {/* Main Image Overlay Stack */}
      <div className="relative w-full h-[260px] rounded-12 overflow-hidden bg-black/5 shadow-inner">
        {/* Base photo */}
        <img
          src={photoUrl}
          alt="Leaf base photo"
          className="w-full h-full object-cover"
        />

        {/* Grad-CAM heatmap overlay */}
        {heatmapUrl && (
          <motion.img
            src={heatmapUrl}
            alt="AI Grad-CAM Heatmap overlay"
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: viewState === 'heatmap' ? intensity / 100 : 0 
            }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            style={{ mixBlendMode: 'multiply' }}
          />
        )}
      </div>

      {/* Opacity Slider and Legend */}
      {heatmapUrl && viewState === 'heatmap' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="flex flex-col gap-3 mt-1"
        >
          {/* Slider input */}
          <div className="flex items-center gap-3 bg-surface-alt rounded-12 p-3 border border-border">
            <Sliders className="w-4 h-4 text-ai-blue-500 shrink-0" />
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between text-[11px] font-bold text-text-muted mb-1">
                <span>{t('result.heatmapSlider')}</span>
                <span className="tabular-nums">{intensity}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={intensity}
                onChange={(e) => setIntensity(Number(e.target.value))}
                className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-ai-blue-500 focus:outline-none"
                style={{
                  background: `linear-gradient(to right, var(--ai-blue-500) 0%, var(--ai-blue-500) ${intensity}%, var(--border) ${intensity}%, var(--border) 100%)`
                }}
                aria-label="Heatmap intensity range"
              />
            </div>
          </div>

          {/* Color bar legend */}
          <div className="flex flex-col gap-1">
            {/* Color Gradient Strip */}
            <div className="w-full h-2 rounded-full bg-gradient-to-r from-ai-blue-500 via-moss-400 to-sev-severe" />
            <div className="flex items-center justify-between text-[11px] font-bold text-text-muted">
              <span>{t('result.heatmapLegendLow')}</span>
              <span>{t('result.heatmapCaption')}</span>
              <span>{t('result.heatmapLegendHigh')}</span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
