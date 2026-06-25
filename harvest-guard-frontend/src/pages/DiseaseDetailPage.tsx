import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, HeartPulse, HelpCircle } from 'lucide-react';
import { api } from '../services/api';
import { TreatmentTabs } from '../components/TreatmentTabs';

interface DiseaseDetails {
  slug: string;
  crop: string;
  name: string;
  pathogen: string;
  is_healthy: boolean;
  symptoms: string[];
  cause: string;
  lifecycle: string;
  treatments: {
    organic: Array<{ action: string; dosage: string; frequency: string; safety: string }>;
    chemical: Array<{ action: string; dosage: string; frequency: string; safety: string }>;
    prevention: string[];
  };
  confused_with: string[];
  image_url: string;
}

export const DiseaseDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [disease, setDisease] = useState<DiseaseDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDiseaseDetails = async () => {
      if (!slug) return;
      try {
        setLoading(true);
        const data = await api.getDiseaseBySlug(slug);
        setDisease(data);
      } catch (error) {
        console.error('Failed to load disease details:', error);
        navigate('/library');
      } finally {
        setLoading(false);
      }
    };

    fetchDiseaseDetails();
  }, [slug, navigate]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 select-none">
        <div className="w-10 h-10 border-4 border-green-700 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-text-muted">Loading disease profile...</p>
      </div>
    );
  }

  if (!disease) return null;

  return (
    <div className="flex flex-col gap-5 w-full pb-10 select-none">
      
      {/* Back button */}
      <button
        onClick={() => navigate('/library')}
        className="flex items-center gap-1 text-xs font-bold text-green-700 hover:text-green-500 uppercase tracking-wide self-start min-h-[36px]"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Library
      </button>

      {/* Hero Image Block */}
      <div className="relative w-full h-[220px] rounded-16 overflow-hidden bg-black/5 shadow-inner">
        <img
          src={disease.image_url}
          alt={disease.name}
          className="w-full h-full object-cover"
        />
        
        {/* Caption strip */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-white">
          <span className="text-[11px] font-bold uppercase tracking-wider text-sage-100/80">
            {disease.crop}
          </span>
          <h2 className="text-2xl font-bold mt-0.5 leading-none sunlight-high-contrast">
            {disease.name}
          </h2>
        </div>
      </div>

      {/* Disease Scientific Profile */}
      <div className="bg-surface rounded-16 p-4 border border-border shadow-sm flex flex-col gap-3">
        <div className="flex items-center gap-2 border-b border-border/60 pb-2.5">
          <HeartPulse className="w-5 h-5 text-green-700" />
          <h3 className="text-base font-bold text-text-strong">Scientific Profile</h3>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex flex-col">
            <span className="text-xs text-text-muted font-medium uppercase tracking-wider">{t('library.pathogen')}</span>
            <span className="font-bold text-text-strong italic mt-0.5">{disease.pathogen}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-text-muted font-medium uppercase tracking-wider">Health Status</span>
            <span className={`font-bold mt-0.5 ${disease.is_healthy ? 'text-sev-healthy' : 'text-sev-severe'}`}>
              {disease.is_healthy ? 'Healthy Leaf Variant' : 'Infected Leaf Variant'}
            </span>
          </div>
        </div>
      </div>

      {/* Symptoms list */}
      <div className="bg-surface rounded-16 p-4 border border-border shadow-sm flex flex-col gap-3">
        <h3 className="text-base font-bold text-text-strong border-b border-border/60 pb-2.5">
          {t('library.symptoms')}
        </h3>
        <ul className="flex flex-col gap-2">
          {disease.symptoms.map((symptom, idx) => (
            <li key={idx} className="text-sm text-text-strong flex items-start gap-2.5 leading-relaxed font-medium">
              <span className="text-sev-severe font-bold shrink-0 mt-0.5">•</span>
              <span>{symptom}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Fungal Cause & Lifecycle */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-surface rounded-16 p-4 border border-border shadow-sm flex flex-col gap-2">
          <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">{t('library.cause')}</h4>
          <p className="text-sm text-text-strong font-medium leading-relaxed">{disease.cause}</p>
        </div>
        <div className="bg-surface rounded-16 p-4 border border-border shadow-sm flex flex-col gap-2">
          <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">{t('library.lifecycle')}</h4>
          <p className="text-sm text-text-strong font-medium leading-relaxed">{disease.lifecycle}</p>
        </div>
      </div>

      {/* Treatment protocol tabs (force expanded: isConfident = true) */}
      {!disease.is_healthy && disease.treatments && (
        <div className="flex flex-col gap-2.5">
          <h3 className="text-base font-bold text-text-strong px-1">Enriched Treatment Guide</h3>
          <TreatmentTabs treatments={disease.treatments} isConfident={true} />
        </div>
      )}

      {/* Commonly Confused with Links */}
      {disease.confused_with && disease.confused_with.length > 0 && (
        <div className="bg-surface rounded-16 p-4 border border-border shadow-sm flex flex-col gap-3">
          <div className="flex items-center gap-2 border-b border-border/60 pb-2.5">
            <HelpCircle className="w-5 h-5 text-sev-mild" />
            <h3 className="text-base font-bold text-text-strong">{t('library.confusedWith')}</h3>
          </div>
          
          <div className="flex flex-wrap gap-2.5">
            {disease.confused_with.map((slugStr) => {
              const cleanedName = slugStr
                .split('-')
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
              return (
                <Link
                  key={slugStr}
                  to={`/library/${slugStr}`}
                  className="inline-flex items-center text-xs font-bold bg-surface-alt border border-border hover:border-green-500 hover:text-green-700 px-3 py-2 rounded-12 transition-all"
                >
                  {cleanedName} →
                </Link>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};
