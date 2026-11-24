import React, { useState } from 'react';
import {
  History,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { useGame } from '../../context/GameContext';

export const HistoryView: React.FC = () => {
  const {
    history,
    stats,
    clearHistory,
    playSound,
  } = useGame();

  // Filter for Personal History (settled bets only — no open/pending bets)
  const [personalFilter, setPersonalFilter] = useState<'all' | 'wins' | 'losses'>('all');
  const [confirmingClear, setConfirmingClear] = useState(false);

  const settledHistory = history.filter((item) => item.status !== 'Pending');
  const filteredPersonalHistory = settledHistory.filter((item) => {
    if (personalFilter === 'wins') return item.isWin;
    if (personalFilter === 'losses') return !item.isWin;
    return true;
  });

  const winRate =
    stats.totalRounds > 0 ? Math.round((stats.totalWins / stats.totalRounds) * 100) : 0;
  const netBalance = stats.totalWon - stats.totalWagered;

  const handleClear = () => {
    playSound('click');
    if (!confirmingClear) {
      setConfirmingClear(true);
      return;
    }
    clearHistory();
    setConfirmingClear(false);
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
            Review your personal WIN / LOSS status and amounts.
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
                All ({settledHistory.length})
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
                Wins ({settledHistory.filter((i) => i.isWin).length})
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
                Losses ({settledHistory.filter((i) => !i.isWin).length})
              </button>
            </div>

            {settledHistory.length > 0 && (
              confirmingClear ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleClear}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Clear</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playSound('click');
                      setConfirmingClear(false);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear My History</span>
                </button>
              )
            )}
          </div>

          {/* History Log List: WIN/LOSS, Bet Placed On, and Amount (no result numbers or open bets) */}
          {filteredPersonalHistory.length > 0 ? (
            <div className="space-y-2">
              {filteredPersonalHistory.map((item) => {
                const betTargetLabel =
                  item.selectedOption ||
                  (item.target
                    ? !isNaN(Number(item.target))
                      ? `Number ${item.target}`
                      : item.target.toUpperCase()
                    : item.choice.replace(/\s*\[Issue\s+.*?\]/g, '').trim());

                return (
                  <div
                    key={item.id}
                    className={`p-3 sm:p-3.5 rounded-2xl border flex items-center justify-between gap-2 select-none ${
                      item.isWin
                        ? 'bg-emerald-50/90 border-emerald-300'
                        : 'bg-red-50/90 border-red-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-xs shrink-0 ${
                          item.isWin
                            ? 'bg-emerald-600 text-white'
                            : 'bg-red-600 text-white'
                        }`}
                      >
                        {item.isWin ? 'WIN' : 'LOSS'}
                      </span>

                      {betTargetLabel && (
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wide border truncate ${
                            item.isWin
                              ? 'bg-white text-emerald-800 border-emerald-200'
                              : 'bg-white text-red-700 border-red-200'
                          }`}
                        >
                          Bet: {betTargetLabel}
                        </span>
                      )}
                    </div>

                    <span
                      className={`font-mono font-black text-sm tabular-nums shrink-0 ${
                        item.isWin ? 'text-emerald-700' : 'text-red-600'
                      }`}
                    >
                      {item.isWin
                        ? `+₹${Number(item.payout || 0).toFixed(2).replace(/\.00$/, '')}`
                        : `-₹${Number(item.betAmount || 0).toFixed(2).replace(/\.00$/, '')}`}
                    </span>
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
    </div>
  );
};
