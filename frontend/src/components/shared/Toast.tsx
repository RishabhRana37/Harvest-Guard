import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  isVisible: boolean;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'success', isVisible, onClose }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-24 left-4 right-4 z-50 flex items-center gap-3 bg-green-900 text-white px-4 py-3.5 rounded-12 shadow-lg border border-green-500/20"
        >
          {type === 'success' && <CheckCircle2 className="w-5 h-5 text-sev-healthy shrink-0" />}
          {type === 'warning' && <AlertTriangle className="w-5 h-5 text-sev-mild shrink-0" />}
          {type === 'error' && <XCircle className="w-5 h-5 text-sev-severe shrink-0" />}
          {type === 'info' && <Info className="w-5 h-5 text-ai-blue-500 shrink-0" />}
          
          <span className="text-sm font-medium leading-tight sunlight-high-contrast">{message}</span>
          
          <button 
            onClick={onClose} 
            className="ml-auto p-1 text-white/60 hover:text-white rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close notification"
          >
            ✕
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
