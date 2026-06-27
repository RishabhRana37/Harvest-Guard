import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Sparkles, RefreshCw, ArrowRight } from 'lucide-react';
import { runImagePipeline } from '../utils/imagePipeline';
import { Skeleton } from './shared/Skeleton';

interface CapturePreviewProps {
  file: File;
  onAnalyze: (compressedBlob: Blob) => void;
  onCancel: () => void;
}

export const CapturePreview: React.FC<CapturePreviewProps> = ({ file, onAnalyze, onCancel }) => {
  const { t } = useTranslation();
  const [imageUrl, setImageUrl] = useState<string>('');
  const [processing, setProcessing] = useState<boolean>(true);
  const [pipelineResult, setPipelineResult] = useState<{
    blob: Blob;
    isBlurry: boolean;
    variance: number;
    originalSize: string;
    compressedSize: string;
  } | null>(null);

  useEffect(() => {
    // Set initial preview URL for raw file
    const url = URL.createObjectURL(file);
    setImageUrl(url);

    // Run pipeline
    const processImage = async () => {
      try {
        setProcessing(true);
        const result = await runImagePipeline(file);
        
        const formatSize = (bytes: number) => {
          if (bytes < 1024 * 1024) {
            return (bytes / 1024).toFixed(0) + ' KB';
          }
          return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        };

        setPipelineResult({
          blob: result.blob,
          isBlurry: result.isBlurry,
          variance: result.variance,
          originalSize: formatSize(result.originalSize),
          compressedSize: formatSize(result.compressedSize)
        });
        setProcessing(false);

        // If not blurry, automatically start analysis to minimize latency
        if (!result.isBlurry) {
          onAnalyze(result.blob);
        }
      } catch (error) {
        console.error('Image pipeline failed:', error);
        setProcessing(false);
        // Fallback to original file blob
        onAnalyze(file);
      }
    };

    processImage();

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file, onAnalyze]);

  const handleUseAnyway = () => {
    if (pipelineResult) {
      onAnalyze(pipelineResult.blob);
    } else {
      onAnalyze(file);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-sm mx-auto p-4 bg-surface rounded-16 border border-border shadow-sm">
      <div className="relative aspect-square w-full rounded-12 overflow-hidden bg-black/5 flex items-center justify-center">
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Leaf captured preview"
            className="w-full h-full object-cover"
          />
        )}
        
        {processing && (
          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-green-500" />
            <span className="text-sm font-semibold tracking-wide">Optimizing Photo...</span>
          </div>
        )}
      </div>

      {/* Compression Feedback Stats */}
      {!processing && pipelineResult && (
        <div className="bg-surface-alt rounded-12 p-3.5 border border-border flex items-center justify-between text-sm text-text-muted">
          <div className="flex items-center gap-1.5 font-medium">
            <Sparkles className="w-4 h-4 text-green-500" />
            <span>Image Optimized</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="line-through">{pipelineResult.originalSize}</span>
            <ArrowRight className="w-3.5 h-3.5 mx-0.5" />
            <span className="font-bold text-green-700">{pipelineResult.compressedSize}</span>
          </div>
        </div>
      )}

      {/* Blurry Advisory Warning Panel */}
      {!processing && pipelineResult?.isBlurry && (
        <div className="flex flex-col gap-4 bg-sev-mild/10 border border-sev-mild/30 p-4 rounded-12">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-sev-mild shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-text-strong text-sm leading-none mb-1">
                {t('home.blurryTitle')}
              </h4>
              <p className="text-xs text-text-muted leading-relaxed">
                {t('home.blurryDesc')} (Variance: {pipelineResult.variance.toFixed(0)})
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="flex-1 bg-surface border border-border text-text-strong font-semibold py-2 px-3 rounded-12 hover:bg-surface-alt text-sm min-h-[44px] flex items-center justify-center"
            >
              {t('home.retake')}
            </button>
            <button
              onClick={handleUseAnyway}
              className="flex-1 bg-green-700 text-white font-semibold py-2 px-3 rounded-12 hover:bg-green-500 text-sm min-h-[44px] flex items-center justify-center"
            >
              {t('home.useAnyway')}
            </button>
          </div>
        </div>
      )}

      {processing && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full rounded-12" />
        </div>
      )}
    </div>
  );
};
