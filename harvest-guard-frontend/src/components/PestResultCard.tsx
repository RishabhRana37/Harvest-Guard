import React from 'react';
import { Bug, ShieldCheck, Info, Sparkles } from 'lucide-react';

interface PestResultProps {
  pestName: string;
  confidence: number;
  severity: 'mild' | 'severe' | 'healthy';
  description: string;
  treatments: {
    organic: string[];
    chemical: string[];
  };
}

export const PestResultCard: React.FC<PestResultProps> = ({
  pestName,
  confidence,
  severity,
  description,
  treatments
}) => {
  const getSeverityStyle = () => {
    if (severity === 'severe') return 'bg-sev-severe/20 text-sev-severe border-sev-severe/40';
    if (severity === 'mild') return 'bg-sev-mild/20 text-sev-mild border-sev-mild/40';
    return 'bg-sev-healthy/20 text-sev-healthy border-sev-healthy/40';
  };

  return (
    <div className="w-full bg-bg-surface border border-border rounded-16 p-5 flex flex-col gap-4 shadow-lg select-none">
      
      {/* Header Panel */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-12 bg-ai-purple/15 border border-ai-purple/35 flex items-center justify-center">
            <Bug className="w-6 h-6 text-ai-purple" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 bg-ai-purple/20 text-white border border-ai-purple/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase tracking-wider mb-1">
              <Sparkles className="w-3 h-3 text-ai-purple" />
              Pest Detected
            </div>
            <h3 className="font-display font-bold text-xl text-white">{pestName}</h3>
            <p className="text-[10px] font-mono text-text-secondary mt-0.5">Clinical trust: {(confidence * 100).toFixed(0)}%</p>
          </div>
        </div>

        <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${getSeverityStyle()}`}>
          {severity} infestation
        </span>
      </div>

      <p className="text-sm text-text-secondary leading-relaxed border-b border-border pb-4">
        {description}
      </p>

      {/* Treatments panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Organic Care */}
        <div className="bg-bg-overlay/40 border border-border/80 rounded-12 p-4 flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-green-neon font-bold text-sm">
            <ShieldCheck className="w-4 h-4" />
            <span>Organic Controls</span>
          </div>
          <ul className="flex flex-col gap-1.5 list-disc pl-4 text-xs text-text-secondary leading-relaxed">
            {treatments.organic.map((action, i) => (
              <li key={i}>{action}</li>
            ))}
          </ul>
        </div>

        {/* Chemical Spray */}
        <div className="bg-bg-overlay/40 border border-border/80 rounded-12 p-4 flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-ai-blue font-bold text-sm">
            <Info className="w-4 h-4" />
            <span>Chemical Sprays</span>
          </div>
          <ul className="flex flex-col gap-1.5 list-disc pl-4 text-xs text-text-secondary leading-relaxed">
            {treatments.chemical.map((action, i) => (
              <li key={i}>{action}</li>
            ))}
          </ul>
        </div>
      </div>

    </div>
  );
};
