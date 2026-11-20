import React, { useState } from 'react';
import {
  History,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
} from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { BetDetailModal } from '../common/BetDetailModal';
import { GameHistoryItem } from '../../types';

export const HistoryView: React.FC = () => {
  const {
    history,
    stats,
    clearHistory,
    playSound,
  } = useGame();

  // Selected bet item for detailed popup
  const [selectedBetForDetail, setSelectedBetForDetail] = useState<GameHistoryItem | null>(null);

  // Filter for Personal History
  const [personalFilter, setPersonalFilter] = useState<'all' | 'wins' | 'losses'>('all');

  const filteredPersonalHistory = history.filter((item) => {
    if (personalFilter === 'wins') return item.isWin;
    if (personalFilter === 'losses') return !item.isWin;
    return true;
  });

  const winRate =
    stats.totalRounds > 0 ? Math.round((stats.totalWins / stats.totalRounds) * 100) : 0;
  const netBalance = stats.totalWon - stats.totalWagered;

  const handleClear = () => {
    playSound('click');
    if (window.confirm('Clear all game history records for your current account?')) {
      clearHistory();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-rose-600">
            Records & Transactions
          </span>
          <h1 className="text-2xl sm:text-3xl font-black font-display text-slate-900 mt-1">
            My Game History Log
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review your personal round outcomes, multipliers, stakes, and virtual returns.
          </p>
        </div>
      </div>

      {/* PERSONAL ACCOUNT GAME HISTORY */}
      <div className="space-y-6 animate-in fade-in duration-150">
          {/* Stats Summary Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Total Rounds
              </span>
              <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-1 tabular-nums">
                {stats.totalRounds}
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                {stats.totalWins} Wins · {stats.totalLosses} Losses
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Win Rate
              </span>
              <div className="text-xl sm:text-2xl font-black text-rose-600 font-mono mt-1 tabular-nums">
                {winRate}%
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Best streak: {stats.bestStreak}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Total Wagered
              </span>
              <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-1 tabular-nums">
                ₹{stats.totalWagered.toLocaleString()}
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Returned: ₹{stats.totalWon.toLocaleString()}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Net Return
              </span>
              <div
                className={`text-xl sm:text-2xl font-black font-mono mt-1 tabular-nums flex items-center gap-1 ${
                  netBalance >= 0 ? 'text-emerald-600' : 'text-slate-600'
                }`}
              >
                {netBalance >= 0 ? (
                  <ArrowUpRight className="w-5 h-5 text-emerald-600" />
                ) : (
                  <ArrowDownRight className="w-5 h-5 text-slate-500" />
                )}
                {netBalance >= 0 ? `+₹${netBalance.toLocaleString()}` : `₹${netBalance.toLocaleString()}`}
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Peak win: ₹{stats.biggestWin.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Action & Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  playSound('click');
                  setPersonalFilter('all');
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                  personalFilter === 'all'
                    ? 'bg-rose-500 text-white border-rose-600 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                All ({history.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  playSound('click');
                  setPersonalFilter('wins');
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                  personalFilter === 'wins'
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Wins ({history.filter((i) => i.isWin).length})
              </button>
              <button
                type="button"
                onClick={() => {
                  playSound('click');
                  setPersonalFilter('losses');
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                  personalFilter === 'losses'
                    ? 'bg-red-600 text-white border-red-700 shadow-xs'
                    : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                }`}
              >
                Losses ({history.filter((i) => !i.isWin).length})
              </button>
            </div>

            {history.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear My History</span>
              </button>
            )}
          </div>

          {/* Simplified History Log List: Main history shows only one compact status per bet */}
          {filteredPersonalHistory.length > 0 ? (
            <div className="space-y-2">
              {filteredPersonalHistory.map((item) => {
                const isPending = item.status === 'Pending';
                const betOnLabel =
                  item.selectedOption ||
                  (item.target !== undefined
                    ? !isNaN(Number(item.target))
                      ? `Number ${item.target}`
                      : item.target.toLowerCase() === 'purple'
                      ? 'VIOLET'
                      : item.target.toUpperCase()
                    : item.choice.replace(/\s*\[Issue\s+.*?\]/, '').trim());

                let resNum = item.resultNumber;
                if (resNum === undefined && item.outcome) {
                  const match = item.outcome.match(/Number\s+(\d+)/);
                  if (match) resNum = parseInt(match[1], 10);
                }

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      playSound('click');
                      setSelectedBetForDetail(item);
                    }}
                    className={`p-3 sm:p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-2 cursor-pointer hover:shadow-xs active:scale-[0.99] select-none ${
                      isPending
                        ? 'bg-amber-50/90 border-amber-300 hover:border-amber-400'
                        : item.isWin
                        ? 'bg-emerald-50/90 border-emerald-300 hover:border-emerald-400'
                        : 'bg-red-50/90 border-red-300 hover:border-red-400'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-xs shrink-0 ${
                          isPending
                            ? 'bg-amber-500 text-white'
                            : item.isWin
                            ? 'bg-emerald-600 text-white'
                            : 'bg-red-600 text-white'
                        }`}
                      >
                        {isPending ? 'PENDING' : item.isWin ? 'WIN' : 'LOSS'}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-black text-slate-900 font-display truncate">
                            Bet: {betOnLabel}
                          </span>
                          {!isPending && resNum !== undefined && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-white/80 px-1.5 py-0.5 rounded-md border border-slate-200">
                              <span>Result:</span>
                              <strong className="font-mono text-slate-900">{resNum}</strong>
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-[11px] font-semibold text-slate-500 block">
                          #{item.period ? item.period.slice(-4) : item.id.slice(-4)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`font-mono font-black text-sm tabular-nums ${
                          isPending
                            ? 'text-amber-700'
                            : item.isWin
                            ? 'text-emerald-700'
                            : 'text-red-600'
                        }`}
                      >
                        {isPending
                          ? `₹${Number(item.betAmount || 0).toFixed(2).replace(/\.00$/, '')}`
                          : item.isWin
                          ? `+₹${Number(item.payout || 0).toFixed(2).replace(/\.00$/, '')}`
                          : `-₹${Number(item.betAmount || 0).toFixed(2).replace(/\.00$/, '')}`}
                      </span>
                      <div className="flex items-center gap-1 text-xs font-bold text-slate-500">
                        <span className="hidden sm:inline">View Details</span>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-16 text-center rounded-3xl bg-white border border-slate-200 shadow-xs">
              <History className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">No personal game records yet</h3>
              <p className="text-xs text-slate-500 mt-1">
                Jump into Win Go or any other game to start playing!
              </p>
            </div>
          )}
        </div>

      {/* Bet Detail Popup on clicking WIN / LOSS */}
      <BetDetailModal
        item={selectedBetForDetail}
        onClose={() => setSelectedBetForDetail(null)}
      />
    </div>
  );
};
