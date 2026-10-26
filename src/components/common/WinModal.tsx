import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Frown, RotateCcw, ArrowRight } from 'lucide-react';
import { useGame } from '../../context/GameContext';

interface WinModalProps {
  isOpen: boolean;
  isWin: boolean;
  payout: number;
  betAmount: number;
  multiplier?: number;
  resultMessage?: string;
  onPlayAgain: () => void;
  onClose?: () => void;
}

export const WinModal: React.FC<WinModalProps> = ({
  isOpen,
  isWin,
  payout,
  betAmount,
  multiplier,
  resultMessage,
  onPlayAgain,
  onClose,
}) => {
  const { playSound } = useGame();

  useEffect(() => {
    if (isOpen && isWin) {
      try {
        confetti({
          particleCount: payout >= betAmount * 4 ? 80 : 45,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#a855f7', '#38bdf8', '#22c55e', '#fbbf24']
        });
      } catch {}
    }
  }, [isOpen, isWin, payout, betAmount]);

  if (!isOpen) return null;

  const netProfit = payout - betAmount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in zoom-in-95 duration-200">
      <div className={`w-full max-w-sm rounded-3xl p-6 text-center border shadow-2xl relative ${
        isWin
          ? 'bg-white border-rose-200 shadow-rose-500/10'
          : 'bg-white border-slate-200 shadow-slate-900/10'
      }`}>
        {/* Glow halo */}
        <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${
          isWin
            ? 'bg-gradient-to-tr from-rose-500 to-amber-400 text-white shadow-md animate-bounce'
            : 'bg-slate-100 text-slate-400'
        }`}>
          {isWin ? <Trophy className="w-10 h-10" /> : <Frown className="w-10 h-10" />}
        </div>

        <h3 className="text-xl sm:text-2xl font-black font-display tracking-tight text-slate-900 mb-1">
          {isWin ? (multiplier && multiplier >= 5 ? '🎉 JACKPOT WIN!' : '✨ ROUND WON!') : 'BETTER LUCK NEXT TIME'}
        </h3>

        {resultMessage && (
          <p className="text-xs text-slate-500 font-medium mb-3">{resultMessage}</p>
        )}

        <div className="my-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
          <div className="flex justify-between text-slate-500">
            <span>Your Wager</span>
            <span className="font-bold text-slate-900 tabular-nums">₹{betAmount}</span>
          </div>
          {multiplier !== undefined && (
            <div className="flex justify-between text-slate-500">
              <span>Multiplier</span>
              <span className="font-bold text-rose-600 tabular-nums">{multiplier.toFixed(2)}x</span>
            </div>
          )}
          <div className="h-px bg-slate-200 my-1" />
          <div className="flex justify-between items-center text-sm font-bold">
            <span className="text-slate-700">Total Payout</span>
            <span className={`tabular-nums ${isWin ? 'text-emerald-600 text-lg font-black font-mono' : 'text-slate-400'}`}>
              {payout > 0 ? `+₹${payout.toLocaleString()}` : '0'}
            </span>
          </div>
          {isWin && (
            <>
              <div className="flex justify-between items-center text-[11px] text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/70">
                <span>Fee (2.4% Commission)</span>
                <span className="font-bold font-mono">-₹{(payout > 0 ? (payout / 0.976) * 0.024 : 0).toFixed(2)}</span>
              </div>
              <div className="text-[11px] text-emerald-600 font-bold text-right">
                Net Profit: +₹{netProfit.toLocaleString()}
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2.5 mt-5">
          {onClose && (
            <button
              type="button"
              onClick={() => {
                playSound('click');
                onClose();
              }}
              className="flex-1 py-3 px-4 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all border border-slate-200 cursor-pointer"
            >
              Close
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              playSound('click');
              onPlayAgain();
            }}
            className="flex-2 py-3 px-5 rounded-full bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm active:scale-98 transition-all cursor-pointer"
          >
            <span>Play Next Round</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
