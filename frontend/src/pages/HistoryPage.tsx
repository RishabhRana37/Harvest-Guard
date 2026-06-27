import React, { useState, useEffect } from 'react';
import { useNavigate as useAppNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Clock, SlidersHorizontal, Activity } from 'lucide-react';
import { getAllScans } from '../utils/db';
import type { SavedScan } from '../utils/db';
import { EmptyState } from '../components/shared/EmptyState';
import { HistoryRowSkeleton } from '../components/shared/Skeleton';

export const HistoryPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useAppNavigate();

  const [scans, setScans] = useState<SavedScan[]>([]);
  const [filteredScans, setFilteredScans] = useState<SavedScan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterSeverity, setFilterSeverity] = useState<string>('all'); // 'all', 'mild', 'severe', 'healthy'
  const [filterCrop, setFilterCrop] = useState<string>('all'); // 'all', 'Tomato', 'Potato', etc.

  useEffect(() => {
    const fetchScans = async () => {
      try {
        setLoading(true);
        const data = await getAllScans();
        setScans(data);
      } catch (error) {
        console.error('Failed to load history scans:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchScans();
  }, []);

  // Filter scans when list or filter state changes
  useEffect(() => {
    let result = scans;
    if (filterSeverity !== 'all') {
      result = result.filter(scan => scan.severity === filterSeverity);
    }
    if (filterCrop !== 'all') {
      result = result.filter(scan => scan.prediction?.crop === filterCrop);
    }
    setFilteredScans(result);
  }, [scans, filterSeverity, filterCrop]);

  // Extract unique crops dynamically
  const uniqueCrops = Array.from(
    new Set(scans.map(scan => scan.prediction?.crop).filter(Boolean))
  ) as string[];

  const getSeverityBadgeClass = (severity: string | null) => {
    if (severity === 'healthy') return 'bg-sev-healthy/10 text-sev-healthy border border-sev-healthy/20';
    if (severity === 'mild') return 'bg-sev-mild/10 text-sev-mild border border-sev-mild/20';
    if (severity === 'severe') return 'bg-sev-severe/10 text-sev-severe border border-sev-severe/20';
    return 'bg-border text-text-muted';
  };

  const getFormattedDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex flex-col gap-5 w-full pb-8 select-none">
      {/* Filters Header Container */}
      <div className="flex flex-col gap-3 bg-bg-surface p-4 rounded-16 border border-border shadow-sm">
        {/* Severity Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide snap-x">
          <SlidersHorizontal className="w-4 h-4 text-text-muted shrink-0 mr-1" />
          {['all', 'healthy', 'mild', 'severe'].map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold capitalize whitespace-nowrap snap-start shadow-sm transition-all min-h-[32px] ${
                filterSeverity === sev
                  ? 'bg-green-deep text-green-neon border border-green-neon/20 shadow-inner'
                  : 'bg-bg-overlay border border-border text-text-secondary hover:text-white'
              }`}
            >
              {sev === 'all' ? 'All Severities' : t(`result.severity.${sev}`)}
            </button>
          ))}
        </div>

        {/* Crop Filters */}
        {uniqueCrops.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide snap-x border-t border-border pt-3">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider shrink-0 mr-1">Crops:</span>
            <button
              onClick={() => setFilterCrop('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold capitalize whitespace-nowrap snap-start shadow-sm transition-all min-h-[32px] ${
                filterCrop === 'all'
                  ? 'bg-green-deep text-green-neon border border-green-neon/20 shadow-inner'
                  : 'bg-bg-overlay border border-border text-text-secondary hover:text-white'
              }`}
            >
              All Crops
            </button>
            {uniqueCrops.map((crop) => (
              <button
                key={crop}
                onClick={() => setFilterCrop(crop)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold capitalize whitespace-nowrap snap-start shadow-sm transition-all min-h-[32px] ${
                  filterCrop === crop
                    ? 'bg-green-deep text-green-neon border border-green-neon/20 shadow-inner'
                    : 'bg-bg-overlay border border-border text-text-secondary hover:text-white'
                }`}
              >
                {crop}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Scans Listing */}
      {loading ? (
        <div className="flex flex-col gap-4">
          <HistoryRowSkeleton />
          <HistoryRowSkeleton />
          <HistoryRowSkeleton />
        </div>
      ) : filteredScans.length > 0 ? (
        <div className="flex flex-col gap-3">
          {filteredScans.map((scan) => (
            <div
              key={scan.scan_id}
              onClick={() => navigate(`/result/${scan.scan_id}`)}
              className="bg-bg-surface rounded-16 border border-border/80 hover:border-green-neon/50 p-3.5 shadow-sm flex items-center gap-4 cursor-pointer transition-all hover:scale-[1.01] active:scale-98"
            >
              {/* Thumbnail */}
              <div className="w-[60px] h-[60px] rounded-12 overflow-hidden bg-black/30 shrink-0 border border-border/50">
                <img
                  src={scan.local_image_url || scan.heatmap || scan.disease?.image_url}
                  alt="Scan thumbnail"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Description */}
              <div className="flex-1 min-w-0">
                <h4 className="text-base font-bold text-white truncate">
                  {scan.prediction?.crop} · {scan.prediction?.name}
                </h4>
                <p className="text-xs text-text-secondary mt-1 font-medium">
                  {getFormattedDate(scan.created_at)}
                </p>
              </div>

              {/* Status / Severity tag */}
              <div className="shrink-0 flex items-center">
                {scan.is_pending ? (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold bg-sev-pending/10 text-sev-pending px-2.5 py-1.5 rounded-full border border-sev-pending/25">
                    <Activity className="w-3 h-3 animate-spin text-sev-pending" />
                    Pending
                  </span>
                ) : (
                  <span className={`inline-flex items-center text-[10px] font-bold px-2.5 py-1.5 rounded-full uppercase tracking-wider ${getSeverityBadgeClass(scan.severity)}`}>
                    {scan.severity ? t(`result.severity.${scan.severity}`) : 'Scan'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <EmptyState
          title="No Scans Recorded"
          description={
            filterSeverity === 'all' && filterCrop === 'all'
              ? t('home.emptyScans') 
              : `You have no scans matching your active filters.`
          }
          actionLabel={(filterSeverity === 'all' && filterCrop === 'all') ? t('home.scanCTA') : undefined}
          onAction={(filterSeverity === 'all' && filterCrop === 'all') ? () => navigate('/') : undefined}
          icon={<Clock className="w-10 h-10" />}
        />
      )}
    </div>
  );
};
