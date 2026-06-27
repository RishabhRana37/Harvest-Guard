import { motion, AnimatePresence } from 'framer-motion';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({ isOpen, onClose, title, children }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-40"
          />

          {/* Slide-up Container */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-surface rounded-t-24 shadow-xl z-50 p-6 pb-8 border-t border-border flex flex-col gap-4"
          >
            {/* Grabber handle */}
            <div className="w-12 h-1.5 bg-border rounded-full mx-auto mb-2" />
            
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-text-strong">{title}</h3>
              <button 
                onClick={onClose}
                className="p-2 text-text-muted hover:text-text-strong rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center font-bold"
                aria-label="Close panel"
              >
                ✕
              </button>
            </div>

            <div className="text-text-muted text-base leading-relaxed">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
