import React from 'react';
import { X, Trophy, Frown, CheckCircle2, ShieldCheck, Clock, Hash } from 'lucide-react';
import { GameHistoryItem } from '../../types';

interface BetDetailModalProps {
  item: GameHistoryItem | null;
  onClose: () => void;
}

export const BetDetailModal: React.FC<BetDetailModalProps> = ({ item, onClose }) => {
  if (!item) return null;

  const isPending = item.status === 'Pending';
  const isWin = !isPending && item.isWin;

  // Derive target option name
  const selectedOption =
    item.selectedOption ||
    item.target?.toUpperCase() ||
    item.choice.replace(/\s*\[Issue\s+.*?\]/, '').toUpperCase() ||
    'BIG';

  // Parse result number and color if not directly present
  let resultNumber = item.resultNumber;
  if (resultNumber === undefined && item.outcome) {
    const match = item.outcome.match(/Number\s+(\d+)/);
    if (match) resultNumber = parseInt(match[1], 10);
  }

  let resultColor = item.resultColor;
  if (!resultColor && resultNumber !== undefined) {
    if (resultNumber === 0) resultColor = 'Red + Violet';
    else if (resultNumber === 5) resultColor = 'Green + Violet';
    else if ([1, 3, 7, 9].includes(resultNumber)) resultColor = 'Green';
    else resultColor = 'Red';
  }

  const betAmount = item.betAmount;
  const amountDeducted = betAmount;

  // If grossPayout isn't stored, calculate from payout + commission or multiplier
  const commissionDeducted = isWin
    ? (item.commission !== undefined
        ? item.commission
        : Number(((item.payout / 0.976) * 0.024).toFixed(2)))
    : 0;

  const grossWinningAmount = isWin
    ? (item.grossPayout !== undefined
        ? item.grossPayout
        : Number((item.payout + commissionDeducted).toFixed(2)))
    : 0;

  const netWinningAmount = isWin ? item.payout : 0;
  const finalProfitOrLoss = isWin ? item.netProfit : -betAmount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-sm rounded-3xl bg-white text-slate-800 shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header Bar */}
        <div
          className={`px-5 py-4 flex items-center justify-between text-white ${
            isPending
              ? 'bg-amber-600'
              : isWin
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600'
              : 'bg-gradient-to-r from-rose-600 to-red-600'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center border border-white/30 shrink-0">
              {isPending ? (
                <Clock className="w-5 h-5 text-white" />
              ) : isWin ? (
                <Trophy className="w-5 h-5 text-white" />
              ) : (
                <Frown className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <h3 className="font-black text-sm uppercase tracking-wide font-display">
                Bet Record Detail
              </h3>
              <span className="text-[10px] text-white/80 font-mono">
                {new Date(item.timestamp).toLocaleString()}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-white cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-3.5 text-xs">
          {/* Bet ID */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <span className="text-slate-500 font-bold flex items-center gap-1 text-[11px]">
              <Hash className="w-3.5 h-3.5 text-slate-400" />
              <span>Bet ID</span>
            </span>
            <span className="font-mono font-bold text-slate-800 text-[11px] truncate max-w-[190px]">
              {item.id}
            </span>
          </div>

          {/* Core Table Grid */}
          <div className="space-y-2 border border-slate-100 rounded-2xl p-3.5 bg-slate-50/50">
            {/* Bet Status */}
            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Bet Status</span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  isPending
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : isWin
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-red-100 text-red-800 border border-red-300'
                }`}
              >
                {isPending ? 'PENDING' : isWin ? 'WIN' : 'LOSS'}
              </span>
            </div>

            {/* Selected Option */}
            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Selected Option</span>
              <span className="font-black text-slate-900 text-xs font-display">
                {selectedOption}
              </span>
            </div>

            {/* Result Number & Color */}
            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Result Number &amp; Color</span>
              <div className="flex items-center gap-1.5">
                {resultNumber !== undefined ? (
                  <>
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-mono font-bold flex items-center justify-center text-[11px]">
                      {resultNumber}
                    </span>
                    <span className="font-bold text-slate-800">{resultColor || 'Drawn'}</span>
                  </>
                ) : (
                  <span className="text-slate-400 font-medium">
                    {isPending ? 'Pending Draw' : item.outcome}
                  </span>
                )}
              </div>
            </div>

            {/* Bet Amount */}
            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Bet Amount</span>
              <span className="font-mono font-bold text-slate-800">
                ₹{betAmount.toFixed(2)}
              </span>
            </div>

            {/* Amount Deducted */}
            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Amount Deducted</span>
              <span className="font-mono font-bold text-slate-800">
                ₹{amountDeducted.toFixed(2)}
              </span>
            </div>

            {/* Gross Winning Amount */}
            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Gross Winning Amount</span>
              <span className={`font-mono font-bold ${isWin ? 'text-emerald-700' : 'text-slate-400'}`}>
                ₹{grossWinningAmount.toFixed(2)}
              </span>
            </div>

            {/* Commission Deducted */}
            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Commission Deducted (2.4%)</span>
              <span className={`font-mono font-bold ${isWin ? 'text-amber-700' : 'text-slate-400'}`}>
                {isWin ? `-₹${commissionDeducted.toFixed(2)}` : '₹0.00'}
              </span>
            </div>

            {/* Net Winning Amount */}
            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Net Winning Amount</span>
              <span className={`font-mono font-bold ${isWin ? 'text-emerald-700' : 'text-slate-400'}`}>
                ₹{netWinningAmount.toFixed(2)}
              </span>
            </div>

            {/* Final Profit or Loss */}
            <div className="flex justify-between items-center py-1 pt-1.5 font-bold">
              <span className="text-slate-800">Final Profit / Loss</span>
              <span
                className={`font-mono font-black text-sm tabular-nums ${
                  isWin ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {finalProfitOrLoss >= 0
                  ? `+₹${finalProfitOrLoss.toFixed(2)}`
                  : `-₹${Math.abs(finalProfitOrLoss).toFixed(2)}`}
              </span>
            </div>
          </div>

          {/* Close Action Button */}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Close Detail
          </button>
        </div>
      </div>
    </div>
  );
};
