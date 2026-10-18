import React, { useState } from 'react';
import {
  History,
  Trophy,
  Frown,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  RefreshCw,
  Download,
  Users,
  Coins,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { useGame } from '../../context/GameContext';

export const HistoryView: React.FC = () => {
  const {
    history,
    stats,
    clearHistory,
    playSound,
    masterPlayerBets,
    refreshMasterPlayerBets,
  } = useGame();

  // Top view tab: Personal history vs Master Player Records ("My Records")
  const [activeTab, setActiveTab] = useState<'personal' | 'master'>('personal');

  // Filter for Personal History
  const [personalFilter, setPersonalFilter] = useState<'all' | 'wins' | 'losses'>('all');

  // Master Records search & filters
  const [searchQuery, setSearchQuery] = useState('');
  const [gameFilter, setGameFilter] = useState<string>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<'all' | 'wins' | 'losses'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredPersonalHistory = history.filter((item) => {
    if (personalFilter === 'wins') return item.isWin;
    if (personalFilter === 'losses') return !item.isWin;
    return true;
  });

  const winRate =
    stats.totalRounds > 0 ? Math.round((stats.totalWins / stats.totalRounds) * 100) : 0;
  const netBalance = stats.totalWon - stats.totalWagered;

  // Master Player Records filtering
  const filteredMasterBets = masterPlayerBets.filter((bet) => {
    const matchesSearch =
      !searchQuery.trim() ||
      bet.memberId.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      (bet.phoneNumber && bet.phoneNumber.includes(searchQuery.trim())) ||
      bet.gameTitle.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      bet.id.toLowerCase().includes(searchQuery.toLowerCase().trim());

    const matchesGame = gameFilter === 'all' || bet.gameId === gameFilter;
    const matchesOutcome =
      outcomeFilter === 'all' ||
      (outcomeFilter === 'wins' && bet.isWin) ||
      (outcomeFilter === 'losses' && !bet.isWin);

    return matchesSearch && matchesGame && matchesOutcome;
  });

  // Calculate master platform statistics across all player bets
  const totalMasterBetsCount = masterPlayerBets.length;
  const totalMasterWagered = masterPlayerBets.reduce((acc, b) => acc + b.betAmount, 0);
  const totalMasterPayouts = masterPlayerBets.reduce((acc, b) => acc + b.payout, 0);
  const platformNetMargin = totalMasterWagered - totalMasterPayouts;
  const uniquePlayersCount = new Set(masterPlayerBets.map((b) => b.memberId)).size;

  const handleClear = () => {
    playSound('click');
    if (window.confirm('Clear all game history records for your current account?')) {
      clearHistory();
    }
  };

  const handleRefreshMaster = async () => {
    playSound('click');
    setIsRefreshing(true);
    await refreshMasterPlayerBets();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleExportCsv = () => {
    playSound('click');
    if (masterPlayerBets.length === 0) {
      alert('No player bet records to export.');
      return;
    }

    const headers = [
      'Round ID',
      'Player Member ID',
      'Player Mobile',
      'Game Title',
      'Player Choice',
      'Game Outcome',
      'Bet Amount (INR)',
      'Payout (INR)',
      'Net Profit (INR)',
      'Result',
      'Date & Time',
    ];

    const rows = masterPlayerBets.map((b) => [
      b.id,
      b.memberId,
      b.phoneNumber || 'N/A',
      `"${b.gameTitle}"`,
      `"${b.choice}"`,
      `"${b.outcome}"`,
      b.betAmount,
      b.payout,
      b.netProfit,
      b.isWin ? 'WIN' : 'LOSS',
      `"${new Date(b.timestamp).toISOString()}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `COBCLUB_Player_Bet_Records_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Top Header & Tab Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-rose-600">
            Records & Transactions
          </span>
          <h1 className="text-2xl sm:text-3xl font-black font-display text-slate-900 mt-1">
            {activeTab === 'personal' ? 'My Game History Log' : 'Master Player Bet Records'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {activeTab === 'personal'
              ? 'Review your personal round outcomes, multipliers, stakes, and virtual returns.'
              : 'All player bet history saved in your records across all registered accounts and games.'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white border border-slate-200 shadow-xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              playSound('click');
              setActiveTab('personal');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'personal'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>My Account Bets</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playSound('click');
              setActiveTab('master');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'master'
                ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-amber-500" />
            <span>👑 My Records (All Players)</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: PERSONAL ACCOUNT GAME HISTORY                     */}
      {/* ======================================================== */}
      {activeTab === 'personal' && (
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

          {/* History Log List */}
          {filteredPersonalHistory.length > 0 ? (
            <div className="space-y-2.5">
              {filteredPersonalHistory.map((item) => (
                <div
                  key={item.id}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs ${
                    item.isWin
                      ? 'bg-emerald-50/50 border-emerald-200/90 hover:border-emerald-300'
                      : 'bg-red-50/50 border-red-200/90 hover:border-red-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                        item.isWin
                          ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                          : 'bg-red-100 border-red-300 text-red-700'
                      }`}
                    >
                      {item.isWin ? <Trophy className="w-4 h-4 text-emerald-600" /> : <Frown className="w-4 h-4 text-red-600" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{item.gameTitle}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            item.isWin
                              ? 'bg-emerald-600 text-white'
                              : 'bg-red-600 text-white'
                          }`}
                        >
                          {item.isWin ? 'WIN' : 'LOSS'}
                        </span>
                      </div>
                      <div className="text-slate-500 text-[11px] flex items-center gap-2 mt-0.5">
                        <span>
                          Choice: <strong className="text-slate-800">{item.choice}</strong>
                        </span>
                        <span>·</span>
                        <span>
                          Result: <span className="text-slate-700 font-semibold">{item.outcome}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Wager</span>
                      <span className="font-bold text-slate-700 tabular-nums">₹{item.betAmount}</span>
                    </div>

                    <div className="text-right min-w-[85px]">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Payout</span>
                      <span
                        className={`font-black font-mono tabular-nums text-sm ${
                          item.isWin ? 'text-emerald-700' : 'text-red-600'
                        }`}
                      >
                        {item.isWin ? `+₹${item.payout.toLocaleString()}` : `-₹${item.betAmount.toLocaleString()}`}
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
              <h3 className="text-sm font-bold text-slate-800">No personal game records yet</h3>
              <p className="text-xs text-slate-500 mt-1">
                Jump into Win Go or any other game to start playing!
              </p>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: MASTER PLAYER BET RECORDS ("MY RECORDS")           */}
      {/* ======================================================== */}
      {activeTab === 'master' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Master Platform Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Total Player Bets
                </span>
                <Coins className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-1 tabular-nums">
                {totalMasterBetsCount}
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Across {uniquePlayersCount} player{uniquePlayersCount === 1 ? '' : 's'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Total Turnover
                </span>
                <DollarSign className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-1 tabular-nums">
                ₹{totalMasterWagered.toLocaleString()}
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Total stakes placed
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Total Payouts
                </span>
                <Trophy className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-600 font-mono mt-1 tabular-nums">
                ₹{totalMasterPayouts.toLocaleString()}
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Total winnings returned
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Platform Profit / Edge
                </span>
                <TrendingUp className="w-4 h-4 text-rose-500" />
              </div>
              <div
                className={`text-xl sm:text-2xl font-black font-mono mt-1 tabular-nums ${
                  platformNetMargin >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {platformNetMargin >= 0 ? `+₹${platformNetMargin.toLocaleString()}` : `-₹${Math.abs(platformNetMargin).toLocaleString()}`}
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Turnover minus Payouts
              </span>
            </div>
          </div>

          {/* Master Search, Filters & Sync Controls */}
          <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Search input */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Player ID or Mobile..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                />
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={handleRefreshMaster}
                  disabled={isRefreshing}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 disabled:opacity-50"
                  title="Sync all player bets from Supabase cloud database"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>{isRefreshing ? 'Syncing...' : 'Sync Cloud'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* Quick Outcome & Game Filters */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-1 text-xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase mr-1">Result:</span>
                <button
                  type="button"
                  onClick={() => setOutcomeFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                    outcomeFilter === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All ({masterPlayerBets.length})
                </button>
                <button
                  type="button"
                  onClick={() => setOutcomeFilter('wins')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                    outcomeFilter === 'wins'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Player Wins ({masterPlayerBets.filter((b) => b.isWin).length})
                </button>
                <button
                  type="button"
                  onClick={() => setOutcomeFilter('losses')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                    outcomeFilter === 'losses'
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Player Losses ({masterPlayerBets.filter((b) => !b.isWin).length})
                </button>
              </div>

              <div className="ml-auto">
                <select
                  value={gameFilter}
                  onChange={(e) => setGameFilter(e.target.value)}
                  className="px-3 py-1 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="all">All 10 Games</option>
                  <option value="color-prediction">Win Go (Color Prediction)</option>
                  <option value="dice-roll">Dice Roll</option>
                  <option value="dragon-tiger">Dragon Tiger</option>
                  <option value="lucky-number">Lucky Number</option>
                  <option value="coin-flip">Coin Flip</option>
                  <option value="number-prediction">Number Prediction</option>
                  <option value="spin-wheel">Lucky Wheel</option>
                  <option value="lucky-cards">Lucky Cards</option>
                  <option value="color-match">Color Match</option>
                  <option value="memory-match">Memory Match</option>
                </select>
              </div>
            </div>
          </div>

          {/* Master Player Records List */}
          {filteredMasterBets.length > 0 ? (
            <div className="space-y-2.5">
              {filteredMasterBets.map((item) => (
                <div
                  key={item.id}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs ${
                    item.isWin
                      ? 'bg-emerald-50/50 border-emerald-200/90 hover:border-emerald-300'
                      : 'bg-red-50/50 border-red-200/90 hover:border-red-300'
                  }`}
                >
                  {/* Left: Player Info & Game Title */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        item.isWin
                          ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                          : 'bg-red-100 border-red-300 text-red-700'
                      }`}
                    >
                      {item.isWin ? <Trophy className="w-5 h-5 text-emerald-600" /> : <Frown className="w-5 h-5 text-red-600" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-slate-900 bg-white px-2 py-0.5 rounded-md text-[11px] border border-slate-200">
                          {item.memberId}
                        </span>
                        {item.phoneNumber && (
                          <span className="text-slate-500 font-mono text-[11px]">
                            {item.phoneNumber}
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            item.isWin
                              ? 'bg-emerald-600 text-white'
                              : 'bg-red-600 text-white'
                          }`}
                        >
                          {item.isWin ? 'WIN' : 'LOSS'}
                        </span>
                      </div>

                      <div className="text-slate-900 font-bold text-sm mt-1">
                        {item.gameTitle}
                      </div>

                      <div className="text-slate-500 text-[11px] flex items-center gap-2 mt-0.5">
                        <span>
                          Choice: <strong className="text-slate-800">{item.choice}</strong>
                        </span>
                        <span>·</span>
                        <span>
                          Outcome: <strong className="text-slate-800">{item.outcome}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Stake, Payout, and Time */}
                  <div className="flex items-center justify-between sm:justify-end gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Wager</span>
                      <span className="font-bold text-slate-800 tabular-nums">₹{item.betAmount}</span>
                    </div>

                    <div className="text-right min-w-[85px]">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Payout</span>
                      <span
                        className={`font-black font-mono tabular-nums text-sm ${
                          item.isWin ? 'text-emerald-700' : 'text-red-600'
                        }`}
                      >
                        {item.isWin ? `+₹${item.payout.toLocaleString()}` : `-₹${item.betAmount.toLocaleString()}`}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-400 font-mono hidden md:block text-right">
                      {formatDate(item.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center rounded-3xl bg-white border border-slate-200 shadow-xs">
              <Users className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">No player bet records found</h3>
              <p className="text-xs text-slate-500 mt-1">
                Bets placed by all players will automatically be recorded and tracked here.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
