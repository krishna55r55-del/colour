import React, { useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';

interface BetPlacedToastProps {
  show: boolean;
  onClose: () => void;
  message?: string;
  durationMs?: number;
}

export const BetPlacedToast: React.FC<BetPlacedToastProps> = ({
  show,
  onClose,
  message = 'BET PLACED SUCCESSFULLY',
  durationMs = 3000,
}) => {
  useEffect(() => {
    if (!show) return;
    const timer = setTimeout(() => {
      onClose();
    }, durationMs);
    return () => clearTimeout(timer);
  }, [show, onClose, durationMs]);

  if (!show) return null;

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] w-[92%] max-w-sm pointer-events-none animate-in fade-in slide-in-from-top-4 duration-200">
      <div className="bg-emerald-600 text-white px-5 py-3.5 rounded-2xl shadow-xl shadow-emerald-950/20 border border-emerald-400/50 flex items-center justify-center gap-3 select-none">
        <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0 border border-white/30">
          <CheckCircle2 className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
        <div className="text-center">
          <span className="font-black text-sm uppercase tracking-wider block font-display drop-shadow-xs">
            {message}
          </span>
        </div>
      </div>
    </div>
  );
};
