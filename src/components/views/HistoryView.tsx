import React, { useState } from 'react';
import { History, Trophy, Frown, Trash2, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';
import { useGame } from '../../context/GameContext';

export const HistoryView: React.FC = () => {
  const { history, stats, clearHistory, playSound } = useGame();
  const [filter, setFilter] = useState<'all' | 'wins' | 'losses'>('all');

  const filteredHistory = history.filter((item) => {
    if (filter === 'wins') return item.isWin;
    if (filter === 'losses') return !item.isWin;
    return true;
  });

  const winRate = stats.totalRounds > 0
    ? Math.round((stats.totalWins / stats.totalRounds) * 100)
    : 0;

  const netBalance = stats.totalWon - stats.totalWagered;

  const handleClear = () => {
    playSound('click');
    if (window.confirm('Clear all game history records?')) {
      clearHistory();
    }
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-rose-600">
            Records & Transactions
          </span>
          <h1 className="text-2xl sm:text-3xl font-black font-display text-slate-900 mt-1">
            Game History Log
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review your round outcomes, multipliers, stakes, and virtual returns.
          </p>
        </div>

        {history.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* Stats Summary Bar (White theme cards) */}
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
            Net Virtual Return
          </span>
          <div className={`text-xl sm:text-2xl font-black font-mono mt-1 tabular-nums flex items-center gap-1 ${
            netBalance >= 0 ? 'text-emerald-600' : 'text-slate-600'
          }`}>
            {netBalance >= 0 ? <ArrowUpRight className="w-5 h-5 text-emerald-600" /> : <ArrowDownRight className="w-5 h-5 text-slate-500" />}
            {netBalance >= 0 ? `+₹${netBalance.toLocaleString()}` : `₹${netBalance.toLocaleString()}`}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Peak win: ₹{stats.biggestWin.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => {
            playSound('click');
            setFilter('all');
          }}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border cursor-pointer ${
            filter === 'all'
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
            setFilter('wins');
          }}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border cursor-pointer ${
            filter === 'wins'
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
            setFilter('losses');
          }}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border cursor-pointer ${
            filter === 'losses'
              ? 'bg-slate-800 text-white border-slate-900 shadow-xs'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          Losses ({history.filter((i) => !i.isWin).length})
        </button>
      </div>

      {/* History Log List */}
      {filteredHistory.length > 0 ? (
        <div className="space-y-2.5">
          {filteredHistory.map((item) => (
            <div
              key={item.id}
              className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  item.isWin
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-600'
                    : 'bg-slate-100 border border-slate-200 text-slate-500'
                }`}>
                  {item.isWin ? <Trophy className="w-4 h-4" /> : <Frown className="w-4 h-4" />}
                </div>

                <div>
                  <div className="font-bold text-slate-900 text-sm">
                    {item.gameTitle}
                  </div>
                  <div className="text-slate-500 text-[11px] flex items-center gap-2 mt-0.5">
                    <span>Choice: <strong className="text-slate-700">{item.choice}</strong></span>
                    <span>·</span>
                    <span>Result: <span className="text-slate-600">{item.outcome}</span></span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                <div className="text-left sm:text-right">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Wager</span>
                  <span className="font-bold text-slate-700 tabular-nums">
                    ₹{item.betAmount}
                  </span>
                </div>

                <div className="text-right min-w-[80px]">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Payout</span>
                  <span className={`font-black font-mono tabular-nums text-sm ${
                    item.isWin ? 'text-emerald-600' : 'text-slate-400'
                  }`}>
                    {item.payout > 0 ? `+₹${item.payout.toLocaleString()}` : '0'}
                  </span>
                </div>

                <div className="text-[10px] text-slate-400 font-mono hidden md:block">
                  {formatDate(item.timestamp)}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center rounded-3xl bg-white border border-slate-200 shadow-xs">
          <History className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No game records yet</h3>
          <p className="text-xs text-slate-500 mt-1">
            Jump into Win Go or any other game to start playing!
          </p>
        </div>
      )}
    </div>
  );
};
