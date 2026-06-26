import React, { useState, useEffect } from 'react';
import { useNavigate as useAppNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
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
    if (filterSeverity === 'all') {
      setFilteredScans(scans);
    } else {
      setFilteredScans(scans.filter(scan => scan.severity === filterSeverity));
    }
  }, [scans, filterSeverity]);

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
      {/* Filters Header */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide snap-x">
        <SlidersHorizontal className="w-4 h-4 text-text-muted shrink-0 mr-1" />
        
        {['all', 'healthy', 'mild', 'severe'].map((sev) => (
          <motion.button
            key={sev}
            whileTap={{ scale: 0.95 }}
            onClick={() => setFilterSeverity(sev)}
            className={`px-4 py-2 rounded-full text-xs font-bold capitalize whitespace-nowrap snap-start shadow-sm transition-all min-h-[32px] ${
              filterSeverity === sev
                ? 'bg-green-700 text-white'
                : 'bg-surface border border-border text-text-strong hover:bg-surface-alt'
            }`}
          >
            {sev === 'all' ? 'All Scans' : t(`result.severity.${sev}`)}
          </motion.button>
        ))}
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
              className="bg-surface rounded-16 border border-border/80 hover:border-green-500 p-3.5 shadow-sm flex items-center gap-4 cursor-pointer transition-all active:scale-98"
            >
              {/* Thumbnail */}
              <div className="w-[60px] h-[60px] rounded-12 overflow-hidden bg-black/5 shrink-0">
                <img
                  src={scan.local_image_url || scan.heatmap || scan.disease?.image_url}
                  alt="Scan thumbnail"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Description */}
              <div className="flex-1 min-w-0">
                <h4 className="text-base font-bold text-text-strong truncate">
                  {scan.prediction?.crop} · {scan.prediction?.name}
                </h4>
                <p className="text-xs text-text-muted mt-1 font-medium">
                  {getFormattedDate(scan.created_at)}
                </p>
              </div>

              {/* Status / Severity tag */}
              <div className="shrink-0 flex items-center">
                {scan.is_pending ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-green-900/10 text-green-900 px-2.5 py-1.5 rounded-full border border-green-900/25">
                    <Activity className="w-3 h-3 animate-spin text-green-900" />
                    Pending
                  </span>
                ) : (
                  <span className={`inline-flex items-center text-[10px] font-bold px-2.5 py-1.5 rounded-full uppercase tracking-wide ${getSeverityBadgeClass(scan.severity)}`}>
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
            filterSeverity === 'all' 
              ? t('home.emptyScans') 
              : `You have no recorded scans categorized under ${filterSeverity} severity.`
          }
          actionLabel={filterSeverity === 'all' ? t('home.scanCTA') : undefined}
          onAction={filterSeverity === 'all' ? () => navigate('/') : undefined}
          icon={<Clock className="w-10 h-10" />}
        />
      )}
    </div>
  );
};
