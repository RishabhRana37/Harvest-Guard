import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Search, BookOpen, CheckCircle, AlertOctagon } from 'lucide-react';
import { api } from '../services/api';
import { DiseaseCardSkeleton } from '../components/shared/Skeleton';

interface DiseaseListItem {
  slug: string;
  crop: string;
  name: string;
  is_healthy: boolean;
  image_url: string;
}

export const LibraryPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [diseases, setDiseases] = useState<DiseaseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCrop, setSelectedCrop] = useState<string>(''); // empty means All

  const cropChips = ['Rice', 'Wheat', 'Potato', 'Tomato', 'Maize'];

  useEffect(() => {
    const fetchDiseases = async () => {
      try {
        setLoading(true);
        const data = await api.getDiseases({
          crop: selectedCrop || undefined,
          q: searchQuery || undefined
        });
        setDiseases(data.items || []);
      } catch (error) {
        console.error('Failed to load library items:', error);
      } finally {
        setLoading(false);
      }
    };

    // Debounce search input
    const delayDebounce = setTimeout(() => {
      fetchDiseases();
    }, 200);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, selectedCrop]);

  const handleChipClick = (crop: string) => {
    setSelectedCrop((prev) => (prev === crop ? '' : crop));
  };

  return (
    <div className="flex flex-col gap-5 w-full pb-8 select-none">
      
      {/* Search Input Bar */}
      <div className="relative w-full">
        <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-text-muted/60" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('library.searchPlaceholder')}
          className="w-full bg-surface border border-border focus:border-green-500 rounded-16 py-3.5 pl-11 pr-4 text-base placeholder-text-muted/50 shadow-sm focus:outline-none min-h-[48px]"
        />
      </div>

      {/* Horizontal Crop Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide snap-x">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setSelectedCrop('')}
          className={`px-4 py-2.5 rounded-full text-xs font-bold whitespace-nowrap snap-start shadow-sm transition-all min-h-[36px] ${
            selectedCrop === ''
              ? 'bg-green-700 text-white'
              : 'bg-surface border border-border text-text-strong hover:bg-surface-alt'
          }`}
        >
          {t('library.allCrops')}
        </motion.button>
        
        {cropChips.map((crop) => (
          <motion.button
            key={crop}
            whileTap={{ scale: 1.05 }}
            onClick={() => handleChipClick(crop)}
            className={`px-4 py-2.5 rounded-full text-xs font-bold whitespace-nowrap snap-start shadow-sm transition-all min-h-[36px] ${
              selectedCrop === crop
                ? 'bg-moss-400 text-green-900 border border-green-900/10'
                : 'bg-surface border border-border text-text-strong hover:bg-surface-alt'
            }`}
          >
            {crop}
          </motion.button>
        ))}
      </div>

      {/* Disease Cards 2-column Grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          <DiseaseCardSkeleton />
          <DiseaseCardSkeleton />
          <DiseaseCardSkeleton />
          <DiseaseCardSkeleton />
        </div>
      ) : diseases.length > 0 ? (
        <div className="grid grid-cols-2 gap-4">
          {diseases.map((disease) => (
            <div
              key={disease.slug}
              onClick={() => navigate(`/library/${disease.slug}`)}
              className="bg-surface rounded-16 border border-border/80 hover:border-green-500 p-3 shadow-sm flex flex-col gap-2.5 cursor-pointer transition-all active:scale-98"
            >
              {/* Thumbnail */}
              <div className="w-full aspect-video rounded-12 overflow-hidden bg-black/5">
                <img
                  src={disease.image_url}
                  alt={disease.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Text metadata */}
              <div className="flex-1 flex flex-col gap-0.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                  {disease.crop}
                </span>
                <h4 className="text-sm font-bold text-text-strong leading-tight truncate">
                  {disease.name}
                </h4>
              </div>

              {/* Status indicator tag */}
              <div className="flex items-center gap-1.5 text-[10px] font-bold mt-1">
                {disease.is_healthy ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 text-sev-healthy shrink-0" />
                    <span className="text-sev-healthy">{t('library.healthyDot')}</span>
                  </>
                ) : (
                  <>
                    <AlertOctagon className="w-3.5 h-3.5 text-sev-severe shrink-0" />
                    <span className="text-sev-severe">{t('library.sickDot')}</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty state */
        <div className="flex flex-col items-center justify-center text-center p-8 py-16 bg-surface rounded-16 border border-border/60 shadow-sm max-w-sm mx-auto my-4">
          <BookOpen className="w-10 h-10 text-text-muted/30 mb-3" />
          <h3 className="text-base font-bold text-text-strong mb-1">No Diseases Found</h3>
          <p className="text-xs text-text-muted px-2">Try adjusting your filters or search keywords.</p>
        </div>
      )}
    </div>
  );
};
