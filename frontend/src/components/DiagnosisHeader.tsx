import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, AlertTriangle, AlertOctagon, Timer } from 'lucide-react';
import { ConfidenceGauge } from './ConfidenceGauge';

interface DiagnosisHeaderProps {
  cropName: string;
  diseaseName: string;
  confidence: number | null;
  confidenceBand: 'high' | 'medium' | 'low' | null;
  /** healthy=#2EA44F  mild=#E8A23D  severe=#D64545 */
  severity: 'healthy' | 'mild' | 'severe' | null;
  urgencyDays: number | null;
}

/**
 * DiagnosisHeader
 *
 * Renders the top diagnosis card with:
 *   - Severity chip (exact hex colors from spec)
 *   - Crop · Disease headline
 *   - "Act within ~N days" urgency line (hidden when healthy)
 *   - Radial ConfidenceGauge with band label
 */
export const DiagnosisHeader: React.FC<DiagnosisHeaderProps> = ({
  cropName,
  diseaseName,
  confidence,
  confidenceBand,
  severity,
  urgencyDays,
}) => {
  const { t } = useTranslation();

  // ── Severity colours (spec-exact hex values) ─────────────────────
  const SEV = {
    healthy: { bg: 'rgba(46,164,79,0.12)', border: 'rgba(46,164,79,0.25)', chip: '#2EA44F' },
    mild:    { bg: 'rgba(232,162,61,0.12)', border: 'rgba(232,162,61,0.25)', chip: '#E8A23D' },
    severe:  { bg: 'rgba(214,69,69,0.12)',  border: 'rgba(214,69,69,0.25)',  chip: '#D64545' },
  } as const;

  const sev = severity ? SEV[severity] : null;

  // ── Severity chip ─────────────────────────────────────────────────
  const SeverityChip = () => {
    if (severity === 'healthy') {
      return (
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                     text-xs font-bold text-white shadow-sm"
          style={{ backgroundColor: SEV.healthy.chip }}
        >
          <Check className="w-3.5 h-3.5 stroke-[3px]" aria-hidden />
          {t('result.severity.healthy')}
        </span>
      );
    }
    if (severity === 'mild') {
      return (
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                     text-xs font-bold text-white shadow-sm"
          style={{ backgroundColor: SEV.mild.chip }}
        >
          <AlertTriangle className="w-3.5 h-3.5 stroke-[2.5px]" aria-hidden />
          {t('result.severity.mild')}
        </span>
      );
    }
    if (severity === 'severe') {
      return (
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                     text-xs font-bold text-white shadow-sm"
          style={{ backgroundColor: SEV.severe.chip }}
        >
          <AlertOctagon className="w-3.5 h-3.5 stroke-[2.5px]" aria-hidden />
          {t('result.severity.severe')}
        </span>
      );
    }
    return null;
  };

  // ── Urgency text + colour ─────────────────────────────────────────
  const urgencyText =
    severity !== 'healthy' && urgencyDays
      ? t('result.urgency', { days: urgencyDays })
      : null;

  const urgencyColor =
    urgencyDays != null && urgencyDays <= 2
      ? SEV.severe.chip
      : SEV.mild.chip;

  return (
    <div
      style={{
        backgroundColor: sev?.bg ?? 'transparent',
        borderColor: sev?.border ?? 'var(--border)',
      }}
      className="w-full rounded-16 p-4 border shadow-sm
                 flex flex-col sm:flex-row gap-4
                 justify-between items-start sm:items-center
                 select-none"
    >
      {/* ── Left: text info ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col gap-2 min-w-0">
        {/* Severity chip */}
        <div>
          <SeverityChip />
        </div>

        {/* Crop · Disease name */}
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight
                       text-white mt-1 leading-tight truncate">
          {cropName}{' '}
          <span className="text-text-muted/40 font-normal">·</span>{' '}
          {diseaseName}
        </h2>

        {/* Urgency line — hidden when severity === healthy */}
        {urgencyText && (
          <p
            className="text-xs sm:text-sm font-bold uppercase tracking-wider
                       flex items-center gap-1.5 mt-0.5"
            style={{ color: urgencyColor }}
          >
            <Timer className="w-3.5 h-3.5 shrink-0" aria-hidden />
            {urgencyText}
          </p>
        )}

        {/* Healthy positive note */}
        {severity === 'healthy' && (
          <p className="text-xs font-medium text-text-muted mt-0.5">
            Continue standard crop maintenance — no treatment needed.
          </p>
        )}
      </div>

      {/* ── Right: Radial confidence gauge ───────────────────────── */}
      <ConfidenceGauge
        confidence={confidence}
        band={confidenceBand}
      />
    </div>
  );
};
