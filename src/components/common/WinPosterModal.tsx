import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, X, Sparkles, CheckCircle2 } from 'lucide-react';

export interface WinPosterData {
  isOpen: boolean;
  selectedOption: string; // BIG, SMALL, GREEN, VIOLET, RED
  resultNumber: number;
  resultColor?: string;
  betAmount: number;
  grossWinningAmount: number;
  commissionDeducted: number; // 2.4%
  finalCreditedAmount: number; // Net Winning Amount
  period?: string;
}

interface WinPosterModalProps {
  data: WinPosterData;
  onClose: () => void;
}

export const WinPosterModal: React.FC<WinPosterModalProps> = ({ data, onClose }) => {
  useEffect(() => {
    if (data.isOpen) {
      try {
        confetti({
          particleCount: 70,
          spread: 70,
          origin: { y: 0.5 },
          colors: ['#10b981', '#34d399', '#f59e0b', '#fbbf24', '#ffffff'],
        });
      } catch {}
    }
  }, [data.isOpen]);

  if (!data.isOpen) return null;

  const colorBadge = () => {
    const col = (data.resultColor || '').toLowerCase();
    if (col.includes('violet') || col.includes('purple')) {
      return 'from-purple-500 to-emerald-500';
    }
    if (col.includes('green')) return 'from-emerald-500 to-teal-500';
    return 'from-rose-500 to-red-500';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Winning Poster Card - Green Theme */}
      <div className="relative w-full max-w-sm rounded-3xl overflow-hidden bg-gradient-to-b from-[#064e3b] via-[#047857] to-[#065f46] text-white shadow-2xl border-2 border-emerald-400/50 animate-in zoom-in-95 duration-200">
        {/* Glow ambient circles */}
        <div className="absolute -top-16 -right-16 w-44 h-44 rounded-full bg-emerald-400/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-44 h-44 rounded-full bg-amber-400/20 blur-3xl pointer-events-none" />

        {/* Close Button Top Right */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white/90 hover:text-white flex items-center justify-center border border-white/20 transition-all cursor-pointer"
          aria-label="Close winning poster"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Poster Header */}
        <div className="pt-6 pb-2 px-6 text-center relative z-10">
          {/* Trophy Badge */}
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-300 text-emerald-950 flex items-center justify-center shadow-lg shadow-amber-900/30 mb-3 border-2 border-amber-200">
            <Trophy className="w-9 h-9" strokeWidth={2.3} />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-900/70 border border-emerald-400/40 text-[10px] font-black uppercase tracking-widest text-emerald-200 mb-1">
            <Sparkles className="w-3 h-3 text-amber-300" />
            <span>Verified Winning Round</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white font-display drop-shadow-sm">
            CONGRATULATIONS!
          </h2>

          <p className="text-xs text-emerald-100/90 font-medium mt-0.5">
            You successfully predicted the outcome!
          </p>
        </div>

        {/* Credited Amount Center Banner */}
        <div className="my-3 mx-4 p-4 rounded-2xl bg-emerald-900/80 border border-emerald-400/30 text-center shadow-inner">
          <span className="text-[11px] font-bold text-emerald-200 uppercase tracking-wider block">
            Final Credited Amount
          </span>
          <div className="text-3xl sm:text-4xl font-black font-mono text-amber-300 tracking-tight tabular-nums mt-0.5 drop-shadow-sm">
            ₹{data.finalCreditedAmount.toFixed(2)}
          </div>
          <span className="text-[10px] text-emerald-200/80 font-medium block mt-0.5">
            Instantly added to your wallet balance
          </span>
        </div>

        {/* Detailed Breakdown Card */}
        <div className="mx-4 mb-4 p-3.5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15 space-y-2 text-xs">
          {/* Selected Option & Result Number */}
          <div className="grid grid-cols-2 gap-2 pb-2 border-b border-white/10">
            <div>
              <span className="text-[10px] text-emerald-200 uppercase font-bold block">
                Selected Option
              </span>
              <span className="text-sm font-black text-white font-display">
                {data.selectedOption}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-emerald-200 uppercase font-bold block">
                Result Number
              </span>
              <div className="inline-flex items-center gap-1.5 justify-end">
                <span className={`w-5 h-5 rounded-full bg-gradient-to-tr ${colorBadge()} flex items-center justify-center text-[11px] font-black font-mono shadow-xs border border-white/30`}>
                  {data.resultNumber}
                </span>
                <span className="font-bold text-white text-xs">
                  {data.resultColor || `#${data.resultNumber}`}
                </span>
              </div>
            </div>
          </div>

          {/* Financial Breakdown: Gross, Commission (2.4%), Net */}
          <div className="flex justify-between items-center text-emerald-100">
            <span>Bet Amount</span>
            <span className="font-mono font-bold text-white tabular-nums">
              ₹{data.betAmount.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between items-center text-emerald-100">
            <span>Gross Winning Amount</span>
            <span className="font-mono font-bold text-emerald-200 tabular-nums">
              ₹{data.grossWinningAmount.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between items-center text-amber-200 bg-amber-500/15 px-2 py-1 rounded-lg border border-amber-400/20 text-[11px]">
            <span>2.4% Commission Deducted</span>
            <span className="font-mono font-bold tabular-nums">
              -₹{data.commissionDeducted.toFixed(2)}
            </span>
          </div>

          <div className="pt-1 flex justify-between items-center font-bold text-white text-sm border-t border-white/10">
            <span className="flex items-center gap-1 text-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>Net Winning Amount</span>
            </span>
            <span className="font-mono font-black text-amber-300 text-base tabular-nums">
              +₹{data.finalCreditedAmount.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Close Button Action Footer */}
        <div className="p-4 pt-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-emerald-950 font-black text-sm uppercase tracking-wider shadow-lg transition-transform active:scale-98 cursor-pointer font-display"
          >
            Claim &amp; Continue Playing
          </button>
        </div>
      </div>
    </div>
  );
};
