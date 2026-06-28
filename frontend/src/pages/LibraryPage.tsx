import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, BookOpen, Bug, MapPin } from 'lucide-react';
import { api } from '../services/api';
import { DiseaseCardSkeleton } from '../components/shared/Skeleton';

interface DiseaseListItem {
  slug: string;
  crop: string;
  name: string;
  is_healthy: boolean;
  image_url: string;
}

interface CropGalleryItem {
  id: string;
  name: string;
  emoji: string;
  diseaseCount: number;
  risk: 'Low' | 'Medium' | 'High';
  riskColor: string;
}

export const LibraryPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [activeView, setActiveView] = useState<'disease' | 'pest'>('disease');
  const [diseases, setDiseases] = useState<DiseaseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCrop, setSelectedCrop] = useState<string>(''); // empty means All
  const [user, setUser] = useState<any>(null);

  // Photographic crop visual gallery dataset
  const cropGallery: CropGalleryItem[] = [
    { id: 'Wheat', name: 'Wheat', emoji: '🌾', diseaseCount: 23, risk: 'Medium', riskColor: 'bg-sev-mild' },
    { id: 'Tomato', name: 'Tomato', emoji: '🍅', diseaseCount: 18, risk: 'High', riskColor: 'bg-sev-severe' },
    { id: 'Rice', name: 'Rice', emoji: '🌾', diseaseCount: 15, risk: 'High', riskColor: 'bg-sev-severe' },
    { id: 'Potato', name: 'Potato', emoji: '🥔', diseaseCount: 14, risk: 'Medium', riskColor: 'bg-sev-mild' },
    { id: 'Maize', name: 'Maize', emoji: '🌽', diseaseCount: 12, risk: 'Low', riskColor: 'bg-sev-healthy' },
    { id: 'Soybean', name: 'Soybean', emoji: '🫘', diseaseCount: 16, risk: 'Medium', riskColor: 'bg-sev-mild' },
    { id: 'Cotton', name: 'Cotton', emoji: '🌿', diseaseCount: 11, risk: 'High', riskColor: 'bg-sev-severe' },
    { id: 'Banana', name: 'Banana', emoji: '🍌', diseaseCount: 9, risk: 'Low', riskColor: 'bg-sev-healthy' },
    { id: 'Mango', name: 'Mango', emoji: '🥭', diseaseCount: 13, risk: 'Medium', riskColor: 'bg-sev-mild' },
    { id: 'Grapes', name: 'Grapes', emoji: '🍇', diseaseCount: 20, risk: 'High', riskColor: 'bg-sev-severe' },
    { id: 'Pepper', name: 'Pepper', emoji: '🌶', diseaseCount: 15, risk: 'Medium', riskColor: 'bg-sev-mild' },
    { id: 'Onion', name: 'Onion', emoji: '🧅', diseaseCount: 8, risk: 'Low', riskColor: 'bg-sev-healthy' },
    { id: 'Coffee', name: 'Coffee', emoji: '☕', diseaseCount: 10, risk: 'Medium', riskColor: 'bg-sev-mild' },
    { id: 'Citrus', name: 'Citrus', emoji: '🍊', diseaseCount: 12, risk: 'High', riskColor: 'bg-sev-severe' },
    { id: 'Bell Pepper', name: 'Bell Pepper', emoji: '🫑', diseaseCount: 7, risk: 'Low', riskColor: 'bg-sev-healthy' }
  ];

  // Mock Pests library dataset
  const pestsList = [
    { name: 'Aphids', crop: 'Tomato & Maize', affected: 'Curling leaves, honeydew mold', organic: 'Neem oil spray, ladybugs', chemical: 'Imidacloprid spray', emoji: '🐜' },
    { name: 'Whitefly', crop: 'Tomato & Cotton', affected: 'Yellow leaves, stunt growth', organic: 'Sticky traps, predatory mites', chemical: 'Acetamiprid spray', emoji: '🪰' },
    { name: 'Spider Mites', crop: 'Grapes & Pepper', affected: 'Webbing on foliage, speckling', organic: 'Water jetting, predatory thrips', chemical: 'Abamectin spray', emoji: '🕷' },
    { name: 'Stem Borer', crop: 'Rice & Wheat', affected: 'Dead hearts, whiteheads', organic: 'Trichogramma cards release', chemical: 'Cartap hydrochloride', emoji: '🐛' },
    { name: 'Leaf Miner', crop: 'Tomato & Potato', affected: 'Serpentine tunnels in leaves', organic: 'Parasitic wasps, neem drenches', chemical: 'Spinosad spray', emoji: '🦟' }
  ];

  useEffect(() => {
    const data = localStorage.getItem('harvest_guard_user');
    if (data) {
      setUser(JSON.parse(data));
    }
  }, []);

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

    const delayDebounce = setTimeout(() => {
      fetchDiseases();
    }, 200);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, selectedCrop]);

  const handleCropSelect = (cropName: string) => {
    setSelectedCrop((prev) => (prev === cropName ? '' : cropName));
  };

  const filteredPests = pestsList.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.crop.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.affected.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 w-full pb-8 select-none text-text-primary">
      
      {/* Header and Outpost Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5 border-b border-border pb-4">
        <div>
          <h2 className="font-display font-bold text-2xl text-white">Explore Crops & Outbreaks</h2>
          <p className="text-xs text-text-secondary">Study pathogens and treatments common in your region.</p>
        </div>

        {user && (
          <div className="inline-flex items-center gap-2 bg-bg-surface border border-border rounded-full px-3 py-1.5 text-xs text-text-secondary">
            <MapPin className="w-3.5 h-3.5 text-green-neon" />
            <span>Showing: {user.flag} {user.countryName}</span>
          </div>
        )}
      </div>

      {/* SEARCH AND TOGGLES */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
        {/* Search Input Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search diseases, symptoms, crops, pests..."
            className="w-full bg-bg-surface border border-border focus:border-green-neon rounded-12 py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none min-h-[40px]"
          />
        </div>

        {/* Diseases vs Pests Toggle tab */}
        <div className="flex bg-bg-surface border border-border rounded-12 p-1 shrink-0 self-start md:self-auto">
          <button
            onClick={() => setActiveView('disease')}
            className={`px-4 py-2 rounded-8 text-xs font-bold uppercase tracking-wider transition-all min-h-[32px] ${
              activeView === 'disease' 
                ? 'bg-green-deep text-green-neon border border-green-neon/20 shadow-inner' 
                : 'text-text-secondary hover:text-white'
            }`}
          >
            Diseases
          </button>
          <button
            onClick={() => {
              setActiveView('pest');
              setSelectedCrop('');
            }}
            className={`px-4 py-2 rounded-8 text-xs font-bold uppercase tracking-wider transition-all min-h-[32px] ${
              activeView === 'pest' 
                ? 'bg-ai-purple/20 text-white border border-ai-purple/30 shadow-inner' 
                : 'text-text-secondary hover:text-white'
            }`}
          >
            Pests
          </button>
        </div>
      </div>

      {/* CROP GALLERY GRID (Photographic Cards) */}
      {activeView === 'disease' && (
        <div className="flex flex-col gap-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary px-1">
            Registered Outpatient Crops (Tap to filter)
          </span>
          <div className="flex gap-3 overflow-x-auto pb-2.5 scrollbar-hide snap-x">
            {cropGallery.map((crop) => {
              const isActive = selectedCrop === crop.id;
              return (
                <div
                  key={crop.id}
                  onClick={() => handleCropSelect(crop.id)}
                  className={`bg-bg-surface border rounded-16 p-3 flex flex-col justify-between min-w-[130px] aspect-[4/5] snap-start shrink-0 cursor-pointer transition-all hover:scale-[1.03] ${
                    isActive 
                      ? 'border-green-neon shadow-[0_0_12px_rgba(57,255,135,0.15)] bg-bg-overlay' 
                      : 'border-border/80 hover:border-green-neon/30'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-2xl">{crop.emoji}</span>
                    <span className={`w-2 h-2 rounded-full ${crop.riskColor}`} />
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-xs text-white truncate">{crop.name}</h4>
                    <p className="text-[9px] text-text-secondary font-mono mt-0.5">{crop.diseaseCount} Outpatients</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* RESULTS LIST VIEW */}
      {activeView === 'disease' ? (
        <div className="flex flex-col gap-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary px-1">
            Outpatient Pathology Index
          </span>
          
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <DiseaseCardSkeleton />
              <DiseaseCardSkeleton />
              <DiseaseCardSkeleton />
            </div>
          ) : diseases.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {diseases.map((disease) => (
                <div
                  key={disease.slug}
                  onClick={() => navigate(`/library/${disease.slug}`)}
                  className="bg-bg-surface rounded-16 border border-border/85 hover:border-green-neon p-3 flex items-center gap-4.5 cursor-pointer transition-all hover:scale-[1.01] active:scale-98 shadow-md"
                >
                  <div className="w-16 h-16 rounded-12 overflow-hidden bg-black/30 shrink-0 border border-border/50">
                    <img
                      src={disease.image_url}
                      alt={disease.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 flex flex-col min-w-0">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-text-secondary">
                      {disease.crop}
                    </span>
                    <h4 className="text-xs font-bold text-white leading-snug truncate mt-0.5">
                      {disease.name}
                    </h4>
                    
                    <span className={`inline-flex items-center gap-1 text-[9px] font-bold mt-1.5 self-start px-2 py-0.5 rounded-full ${
                      disease.is_healthy 
                        ? 'bg-green-deep/20 text-green-neon border border-green-neon/20' 
                        : 'bg-sev-severe/15 text-sev-severe border border-sev-severe/20'
                    }`}>
                      {disease.is_healthy ? t('library.healthyDot') : t('library.sickDot')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-8 py-14 bg-bg-surface rounded-16 border border-border shadow-inner max-w-sm mx-auto my-4 w-full">
              <BookOpen className="w-10 h-10 text-text-muted/30 mb-3" />
              <h3 className="text-sm font-bold text-white mb-1">No Pathogens Found</h3>
              <p className="text-xs text-text-secondary px-2">Try adjusting your filters or search keywords.</p>
            </div>
          )}
        </div>
      ) : (
        /* PEST VIEWPORT */
        <div className="flex flex-col gap-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary px-1">
            Entomological Outpatient Index
          </span>

          {filteredPests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPests.map((pest) => (
                <div
                  key={pest.name}
                  className="bg-bg-surface border border-border rounded-16 p-4 flex flex-col gap-3 shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{pest.emoji}</span>
                      <div>
                        <h4 className="text-sm font-bold text-white">{pest.name}</h4>
                        <p className="text-[10px] text-text-secondary mt-0.5">Primary Target: {pest.crop}</p>
                      </div>
                    </div>
                    
                    <span className="bg-ai-purple/20 text-white border border-ai-purple/30 px-2 py-0.5 rounded-full text-[8px] font-bold font-mono uppercase tracking-wider">
                      Insect
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 text-xs text-text-secondary leading-relaxed border-t border-border/50 pt-2.5">
                    <div>
                      <strong className="text-[10px] text-text-muted block uppercase tracking-wider font-mono">Symptoms:</strong>
                      <span className="text-white">{pest.affected}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <div className="bg-bg-overlay/50 rounded-8 p-2 border border-border/40">
                        <strong className="text-[9px] text-green-neon block uppercase tracking-wider font-mono">Organic:</strong>
                        <span className="text-[11px] block mt-0.5 leading-snug">{pest.organic}</span>
                      </div>
                      
                      <div className="bg-bg-overlay/50 rounded-8 p-2 border border-border/40">
                        <strong className="text-[9px] text-ai-blue block uppercase tracking-wider font-mono">Chemical:</strong>
                        <span className="text-[11px] block mt-0.5 leading-snug">{pest.chemical}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-8 py-14 bg-bg-surface rounded-16 border border-border shadow-inner max-w-sm mx-auto my-4 w-full">
              <Bug className="w-10 h-10 text-text-muted/30 mb-3" />
              <h3 className="text-sm font-bold text-white mb-1">No Pests Found</h3>
              <p className="text-xs text-text-secondary px-2">Try adjusting your keywords.</p>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
