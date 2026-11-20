import React, { useEffect, useState } from 'react';
import { Frown, X, ArrowDownRight, AlertCircle } from 'lucide-react';
import { soundManager } from '../../utils/audio';

export interface LossPosterData {
  isOpen: boolean;
  selectedOption: string; // BIG, SMALL, GREEN, VIOLET, RED
  resultNumber: number;
  resultColor?: string;
  lostBetAmount: number;
  period?: string;
}

interface LossPosterModalProps {
  data: LossPosterData;
  onClose: () => void;
}

const LOSS_REACTIONS = [
  { emoji: '😢', label: 'So Close!' },
  { emoji: '💔', label: 'Tough Luck' },
  { emoji: '😤', label: 'Next Round!' },
  { emoji: '💪', label: 'Comeback Ready!' },
];

export const LossPosterModal: React.FC<LossPosterModalProps> = ({ data, onClose }) => {
  const [activeReaction, setActiveReaction] = useState<string | null>(null);

  useEffect(() => {
    if (data.isOpen) {
      setActiveReaction(null);
    }
  }, [data.isOpen]);

  if (!data.isOpen) return null;

  const triggerLossReaction = (emoji: string, label: string) => {
    setActiveReaction(`${emoji} ${label}`);
    soundManager.playClick();
  };

  const colorBadge = () => {
    const col = (data.resultColor || '').toLowerCase();
    if (col.includes('violet') || col.includes('purple')) {
      return 'from-purple-500 to-rose-500';
    }
    if (col.includes('green')) return 'from-emerald-500 to-teal-500';
    return 'from-rose-500 to-red-500';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Loss Poster Card - Red Theme with dramatic shake reaction */}
      <div className="relative w-full max-w-sm rounded-3xl overflow-hidden bg-gradient-to-b from-[#881337] via-[#9f1239] to-[#4c0519] text-white shadow-2xl border-2 border-rose-500/50 animate-loss-shake">
        {/* Ambient background glows */}
        <div className="absolute -top-16 -right-16 w-44 h-44 rounded-full bg-rose-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-44 h-44 rounded-full bg-red-500/20 blur-3xl pointer-events-none" />

        {/* Close Button Top Right */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white/90 hover:text-white flex items-center justify-center border border-white/20 transition-all cursor-pointer"
          aria-label="Close loss poster"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Poster Header */}
        <div className="pt-6 pb-2 px-6 text-center relative z-10">
          {/* Frown Icon Badge with Floating Loss Reactions */}
          <div className="relative w-28 mx-auto mb-3 flex items-center justify-center">
            <span className="absolute -left-1 top-1 text-xl animate-float-reaction select-none">💔</span>
            <span className="absolute -right-1 top-1 text-xl animate-float-reaction select-none" style={{ animationDelay: '0.4s' }}>😢</span>
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-500 to-red-600 text-white flex items-center justify-center shadow-lg shadow-rose-950/50 border-2 border-rose-300 animate-pulse">
              <Frown className="w-9 h-9" strokeWidth={2.3} />
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-rose-950/70 border border-rose-400/30 text-[10px] font-black uppercase tracking-widest text-rose-200 mb-1">
            <AlertCircle className="w-3 h-3 text-rose-400" />
            <span>{activeReaction || '😔 SO CLOSE! VERIFIED RESULT'}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white font-display drop-shadow-sm">
            UNFORTUNATELY!
          </h2>

          <p className="text-xs text-rose-200/90 font-medium mt-0.5">
            This round did not match your prediction
          </p>
        </div>

        {/* Lost Amount Center Banner */}
        <div className="my-2.5 mx-4 p-3.5 rounded-2xl bg-rose-950/80 border border-rose-500/30 text-center shadow-inner">
          <span className="text-[11px] font-bold text-rose-300 uppercase tracking-wider block">
            Lost Bet Amount
          </span>
          <div className="text-3xl sm:text-4xl font-black font-mono text-rose-300 tracking-tight tabular-nums mt-0.5 drop-shadow-sm flex items-center justify-center gap-1">
            <ArrowDownRight className="w-7 h-7 text-rose-400" />
            <span>-₹{data.lostBetAmount.toFixed(2)}</span>
          </div>
          <span className="text-[10px] text-rose-300/80 font-medium block mt-0.5">
            Deducted from available wallet
          </span>
        </div>

        {/* Round Details Card */}
        <div className="mx-4 mb-3 p-3.5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15 space-y-2.5 text-xs">
          <div className="grid grid-cols-2 gap-2 pb-2 border-b border-white/10">
            <div>
              <span className="text-[10px] text-rose-200 uppercase font-bold block">
                Selected Option
              </span>
              <span className="text-sm font-black text-white font-display">
                {data.selectedOption}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-rose-200 uppercase font-bold block">
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

          <div className="flex justify-between items-center text-rose-200">
            <span>Bet Status</span>
            <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white font-black text-[11px] uppercase tracking-wider border border-red-400">
              LOSS
            </span>
          </div>

          <div className="flex justify-between items-center text-rose-200">
            <span>Commission Charged</span>
            <span className="font-mono font-bold text-white tabular-nums">
              ₹0.00 (No fee on loss)
            </span>
          </div>

          {data.period && (
            <div className="flex justify-between items-center text-rose-200/80 text-[10px] pt-1 border-t border-white/10">
              <span>Issue Period</span>
              <span className="font-mono font-bold">#{data.period.slice(-6)}</span>
            </div>
          )}
        </div>

        {/* Interactive Loss Reaction Bar */}
        <div className="mx-4 mb-3 flex items-center justify-between gap-2 bg-black/25 px-3 py-2 rounded-xl border border-white/10">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-200">
            React:
          </span>
          <div className="flex items-center gap-1.5">
            {LOSS_REACTIONS.map((r) => (
              <button
                key={r.label}
                type="button"
                onClick={() => triggerLossReaction(r.emoji, r.label)}
                className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/30 active:scale-90 transition-all flex items-center justify-center text-base cursor-pointer"
                title={r.label}
              >
                {r.emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Close Button Action Footer */}
        <div className="p-4 pt-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-white/20 hover:bg-white/30 text-white font-black text-sm uppercase tracking-wider border border-white/30 shadow-md transition-transform active:scale-98 cursor-pointer font-display"
          >
            Try Next Round
          </button>
        </div>
      </div>
    </div>
  );
};
