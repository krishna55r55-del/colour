import React, { useState, useEffect, useCallback } from 'react';
import {
  History,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
  List,
  RefreshCw,
} from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { GameHistoryItem } from '../../types';
import { BetDetailModal } from '../common/BetDetailModal';

const MAIN_LIMIT = 10;
const FULL_PAGE_LIMIT = 20;

export const HistoryView: React.FC = () => {
  const {
    history,
    totalBetsCount,
    stats,
    fetchPaginatedBets,
    playSound,
  } = useGame();

  const [personalFilter, setPersonalFilter] = useState<'all' | 'wins' | 'losses'>('all');
  const [showAllMode, setShowAllMode] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [items, setItems] = useState<GameHistoryItem[]>(() => history.slice(0, MAIN_LIMIT));
  const [filteredTotalCount, setFilteredTotalCount] = useState<number>(totalBetsCount);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedBet, setSelectedBet] = useState<GameHistoryItem | null>(null);

  const loadBets = useCallback(
    async (pageToLoad: number, append: boolean, viewAll: boolean, outcomeFilter: 'all' | 'wins' | 'losses') => {
      if (append) setIsLoadingMore(true);
      else setIsLoading(true);
      setLoadError(null);

      try {
        const limit = viewAll ? FULL_PAGE_LIMIT : MAIN_LIMIT;
        const res = await fetchPaginatedBets({
          page: pageToLoad,
          limit,
          outcome: outcomeFilter,
          status: 'all',
        });

        if (res.success) {
          setItems((prev) => {
            if (!append) return res.items;
            const seen = new Set(prev.map((x) => x.id));
            return [...prev, ...res.items.filter((x) => !seen.has(x.id))];
          });
          setFilteredTotalCount(res.totalCount);
          setTotalPages(res.totalPages);
          setHasMore(res.hasMore);
          setCurrentPage(res.page);
        } else {
          setLoadError(res.error || 'Failed to load bet history.');
        }
      } catch {
        setLoadError('Unable to reach server. Please try again.');
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [fetchPaginatedBets]
  );

  // Load initial 10 bets and refresh automatically whenever context history/count updates
  useEffect(() => {
    if (!showAllMode || currentPage === 1) {
      loadBets(1, false, showAllMode, personalFilter);
    }
  }, [showAllMode, personalFilter, totalBetsCount, history, loadBets]);

  const handleToggleViewAll = () => {
    playSound('click');
    const nextMode = !showAllMode;
    setShowAllMode(nextMode);
    setCurrentPage(1);
    loadBets(1, false, nextMode, personalFilter);
  };

  const handleFilterChange = (nextFilter: 'all' | 'wins' | 'losses') => {
    playSound('click');
    setPersonalFilter(nextFilter);
    setCurrentPage(1);
    loadBets(1, false, showAllMode, nextFilter);
  };

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages || isLoading) return;
    playSound('click');
    loadBets(nextPage, false, true, personalFilter);
  };

  const handleLoadMore = () => {
    if (!hasMore || isLoadingMore) return;
    playSound('click');
    loadBets(currentPage + 1, true, true, personalFilter);
  };

  const winRate =
    stats.totalRounds > 0 ? Math.round((stats.totalWins / stats.totalRounds) * 100) : 0;
  const netBalance = stats.totalWon - stats.totalWagered;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-rose-600">
            Records &amp; Transactions
          </span>
          <h1 className="text-2xl sm:text-3xl font-black font-display text-slate-900 mt-1">
            My Game History Log
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            All bets are permanently saved in your account history ({totalBetsCount} total record
            {totalBetsCount === 1 ? '' : 's'}).
          </p>
        </div>

        <button
          type="button"
          onClick={handleToggleViewAll}
          className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-xs cursor-pointer self-start sm:self-auto ${
            showAllMode
              ? 'bg-slate-900 text-white hover:bg-slate-800'
              : 'bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 text-white shadow-md'
          }`}
        >
          <List className="w-4 h-4" />
          <span>{showAllMode ? 'SHOW LATEST 10' : `VIEW ALL (${totalBetsCount})`}</span>
        </button>
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
              {netBalance >= 0
                ? `+₹${netBalance.toLocaleString()}`
                : `₹${netBalance.toLocaleString()}`}
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
              onClick={() => handleFilterChange('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                personalFilter === 'all'
                  ? 'bg-rose-500 text-white border-rose-600 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              All ({totalBetsCount})
            </button>
            <button
              type="button"
              onClick={() => handleFilterChange('wins')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                personalFilter === 'wins'
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Wins ({stats.totalWins})
            </button>
            <button
              type="button"
              onClick={() => handleFilterChange('losses')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                personalFilter === 'losses'
                  ? 'bg-red-600 text-white border-red-700 shadow-xs'
                  : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
              }`}
            >
              Losses ({stats.totalLosses})
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
            <span>
              {showAllMode
                ? `Showing ${items.length} of ${filteredTotalCount} bets`
                : `Latest ${Math.min(MAIN_LIMIT, items.length)} of ${filteredTotalCount} bets`}
            </span>
            <button
              type="button"
              onClick={() => loadBets(currentPage, false, showAllMode, personalFilter)}
              className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer"
              title="Refresh bet history"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {loadError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {loadError}
          </div>
        )}

        {/* History Log List */}
        {isLoading && items.length === 0 ? (
          <div className="py-16 text-center rounded-3xl bg-white border border-slate-200 shadow-xs text-xs text-slate-500 font-semibold">
            Loading bet history...
          </div>
        ) : items.length > 0 ? (
          <div className="space-y-2.5">
            {items.map((item) => {
              const isPending = item.status === 'Pending';
              const betTargetLabel =
                item.selectedOption ||
                (item.target
                  ? !isNaN(Number(item.target))
                    ? `Number ${item.target}`
                    : item.target.toUpperCase()
                  : item.choice.replace(/\s*\[Issue\s+.*?\]/g, '').trim());

              const dt = new Date(item.timestamp);
              const dateStr = dt.toLocaleDateString([], {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              });
              const timeStr = dt.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedBet(item)}
                  className={`p-3.5 sm:p-4 rounded-2xl border cursor-pointer transition-all hover:shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                    isPending
                      ? 'bg-amber-50/80 border-amber-300'
                      : item.isWin
                        ? 'bg-emerald-50/90 border-emerald-300'
                        : 'bg-red-50/90 border-red-300'
                  }`}
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-3 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider shadow-xs shrink-0 ${
                          isPending
                            ? 'bg-amber-500 text-slate-950'
                            : item.isWin
                              ? 'bg-emerald-600 text-white'
                              : 'bg-red-600 text-white'
                        }`}
                      >
                        {isPending ? 'PENDING' : item.isWin ? 'WIN' : 'LOSS'}
                      </span>

                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-black uppercase tracking-wide border bg-white text-slate-800 border-slate-200 truncate">
                        Bet: {betTargetLabel}
                      </span>

                      <span className="text-[11px] font-bold text-slate-600">
                        {item.gameTitle}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600">
                      <span className="font-mono font-bold text-slate-700">
                        ID: {item.id}
                      </span>
                      {item.period && (
                        <span className="font-mono text-slate-500">
                          Period: #{item.period}
                        </span>
                      )}
                      <span>
                        Result:{' '}
                        <strong className="text-slate-800">
                          {isPending
                            ? 'Waiting Draw'
                            : item.outcome || (item.resultNumber !== undefined ? `Number ${item.resultNumber}` : 'Settled')}
                        </strong>
                      </span>
                      <span className="text-slate-500">
                        {dateStr} · {timeStr}
                      </span>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-200/70">
                    <span
                      className={`font-mono font-black text-sm sm:text-base tabular-nums ${
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
                    <span className="text-[10px] font-mono font-bold text-slate-500">
                      Wager: ₹{Number(item.betAmount || 0).toFixed(2).replace(/\.00$/, '')}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* VIEW ALL CTA in Latest-10 Mode */}
            {!showAllMode && filteredTotalCount > MAIN_LIMIT && (
              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={handleToggleViewAll}
                  className="px-6 py-3 rounded-2xl bg-white hover:bg-rose-50 text-rose-600 border-2 border-rose-300 font-black text-xs uppercase tracking-wider shadow-xs transition-all cursor-pointer flex items-center gap-2"
                >
                  <List className="w-4 h-4" />
                  <span>VIEW ALL ({filteredTotalCount} BETS)</span>
                </button>
              </div>
            )}

            {/* Pagination & Load More in VIEW ALL Mode */}
            {showAllMode && (hasMore || totalPages > 1) && (
              <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                {hasMore ? (
                  <button
                    type="button"
                    disabled={isLoadingMore}
                    onClick={handleLoadMore}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {isLoadingMore
                      ? 'Loading More...'
                      : `Load More (${filteredTotalCount - items.length} remaining)`}
                  </button>
                ) : (
                  <span className="text-xs font-bold text-slate-500">
                    All {filteredTotalCount} bets loaded
                  </span>
                )}

                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    disabled={currentPage <= 1 || isLoading}
                    onClick={() => handlePageChange(currentPage - 1)}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Prev</span>
                  </button>
                  <span className="font-mono font-bold text-slate-700 px-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages || isLoading}
                    onClick={() => handlePageChange(currentPage + 1)}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
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

      <BetDetailModal item={selectedBet} onClose={() => setSelectedBet(null)} />
    </div>
  );
};
