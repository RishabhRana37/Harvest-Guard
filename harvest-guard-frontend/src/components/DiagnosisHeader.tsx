import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, AlertTriangle, AlertOctagon } from 'lucide-react';
import { ConfidenceGauge } from './ConfidenceGauge';

interface DiagnosisHeaderProps {
  cropName: string;
  diseaseName: string;
  confidence: number | null;
  confidenceBand: 'high' | 'medium' | 'low' | null;
  severity: 'healthy' | 'mild' | 'severe' | null;
  urgencyDays: number | null;
}

export const DiagnosisHeader: React.FC<DiagnosisHeaderProps> = ({
  cropName,
  diseaseName,
  confidence,
  confidenceBand,
  severity,
  urgencyDays
}) => {
  const { t } = useTranslation();

  const getBackgroundStyle = () => {
    if (severity === 'healthy') return { backgroundColor: 'rgba(46, 164, 79, 0.12)' };
    if (severity === 'mild') return { backgroundColor: 'rgba(232, 162, 61, 0.12)' };
    if (severity === 'severe') return { backgroundColor: 'rgba(214, 69, 69, 0.12)' };
    return { backgroundColor: 'var(--surface)' };
  };

  const getBorderColorClass = () => {
    if (severity === 'healthy') return 'border-sev-healthy/20';
    if (severity === 'mild') return 'border-sev-mild/20';
    if (severity === 'severe') return 'border-sev-severe/20';
    return 'border-border';
  };

  const getSeverityPill = () => {
    if (severity === 'healthy') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold bg-sev-healthy text-white shadow-sm">
          <Check className="w-4 h-4 stroke-[3px]" />
          {t('result.severity.healthy')}
        </span>
      );
    }
    if (severity === 'mild') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold bg-sev-mild text-white shadow-sm">
          <AlertTriangle className="w-4 h-4 stroke-[2.5px]" />
          {t('result.severity.mild')}
        </span>
      );
    }
    if (severity === 'severe') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold bg-sev-severe text-white shadow-sm">
          <AlertOctagon className="w-4 h-4 stroke-[2.5px]" />
          {t('result.severity.severe')}
        </span>
      );
    }
    return null;
  };

  const getUrgencyText = () => {
    if (severity === 'healthy' || !urgencyDays) return null;
    return t('result.urgency', { days: urgencyDays });
  };

  const getUrgencyColorClass = () => {
    if (urgencyDays && urgencyDays <= 3) return 'text-sev-severe font-bold';
    return 'text-sev-mild font-semibold';
  };

  return (
    <div
      style={getBackgroundStyle()}
      className={`w-full rounded-16 p-4 border ${getBorderColorClass()} shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center select-none`}
    >
      <div className="flex-1 flex flex-col gap-2">
        {/* Severity pill tag */}
        <div>{getSeverityPill()}</div>
        
        {/* Diagnosis Header Text */}
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-strong mt-1 leading-tight">
          {cropName} <span className="text-text-muted/40 font-normal">·</span> {diseaseName}
        </h2>

        {/* Urgency warning label */}
        {getUrgencyText() && (
          <p className={`text-sm mt-1 uppercase tracking-wider ${getUrgencyColorClass()}`}>
            ⚠️ {getUrgencyText()}
          </p>
        )}
      </div>

      {/* Radial Confidence Meter */}
      <ConfidenceGauge confidence={confidence} band={confidenceBand} />
    </div>
  );
};
