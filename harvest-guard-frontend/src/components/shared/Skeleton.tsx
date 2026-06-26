interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => {
  return (
    <div className={`animate-pulse bg-border/60 rounded-8 ${className}`} />
  );
};

export const DiseaseCardSkeleton = () => {
  return (
    <div className="bg-surface rounded-16 p-4 border border-border flex flex-col gap-3">
      <Skeleton className="w-full aspect-video rounded-12" />
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-6 w-2/3" />
      <div className="flex gap-2 mt-1">
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    </div>
  );
};

export const HistoryRowSkeleton = () => {
  return (
    <div className="bg-surface rounded-16 p-4 border border-border flex items-center gap-4">
      <Skeleton className="w-[60px] h-[60px] rounded-12 shrink-0" />
      <div className="flex-1 flex flex-col gap-2">
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-4 w-1/4" />
      </div>
      <Skeleton className="w-16 h-7 rounded-full shrink-0" />
    </div>
  );
};
