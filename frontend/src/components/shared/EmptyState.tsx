import { Leaf } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  icon
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 py-16 bg-surface rounded-16 border border-border/80 shadow-sm max-w-sm mx-auto my-6">
      <div className="p-4 bg-sage-100 rounded-full text-green-700 mb-4 flex items-center justify-center">
        {icon || <Leaf className="w-10 h-10" />}
      </div>
      
      <h3 className="text-lg font-bold text-text-strong mb-2">{title}</h3>
      <p className="text-text-muted text-base mb-6 leading-relaxed px-2">{description}</p>
      
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="bg-green-700 text-white font-semibold py-3 px-6 rounded-12 shadow hover:bg-green-500 transition-colors min-h-[48px] min-w-[120px] flex items-center justify-center text-base"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
