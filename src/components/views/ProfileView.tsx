import React from 'react';
import {
  User,
  Crown,
  Trophy,
  Coins,
  Gift,
  RotateCcw,
  Volume2,
  VolumeX,
  Award,
  Zap,
  CheckCircle,
  ShieldCheck,
  LogOut,
} from 'lucide-react';
import { useGame } from '../../context/GameContext';

export const ProfileView: React.FC = () => {
  const {
    balance,
    stats,
    soundEnabled,
    toggleSound,
    resetBalance,
    playSound,
    user,
    logout,
  } = useGame();

  const getRank = (rounds: number) => {
    if (rounds >= 100) return { title: 'Legendary Master', color: 'text-amber-400', badge: 'LEGEND' };
    if (rounds >= 50) return { title: 'Diamond High Roller', color: 'text-cyan-400', badge: 'DIAMOND' };
    if (rounds >= 25) return { title: 'Gold Strategist', color: 'text-yellow-400', badge: 'GOLD' };
    if (rounds >= 10) return { title: 'Silver Competitor', color: 'text-purple-400', badge: 'SILVER' };
    if (rounds >= 3) return { title: 'Bronze Challenger', color: 'text-orange-400', badge: 'BRONZE' };
    return { title: 'Rookie Gamer', color: 'text-slate-400', badge: 'ROOKIE' };
  };

  const rank = getRank(stats.totalRounds);
  const winRate = stats.totalRounds > 0 ? Math.round((stats.totalWins / stats.totalRounds) * 100) : 0;

  const handleReset = () => {
    playSound('click');
    if (window.confirm('Reset virtual balance back to 1,000?')) {
      resetBalance();
    }
  };

  // Gaming Achievements badges
  const achievements = [
    {
      title: 'First Victory',
      desc: 'Win your first game round',
      unlocked: stats.totalWins >= 1,
      icon: Trophy,
    },
    {
      title: 'High Roller',
      desc: 'Wager 500+ in total',
      unlocked: stats.totalWagered >= 500,
      icon: Coins,
    },
    {
      title: 'Streak Master',
      desc: 'Achieve a 3+ round win streak',
      unlocked: stats.bestStreak >= 3,
      icon: Zap,
    },
    {
      title: 'Centurion',
      desc: 'Play 10 total rounds',
      unlocked: stats.totalRounds >= 10,
      icon: Award,
    },
    {
      title: 'Big Winner',
      desc: 'Win 200+ in a single round',
      unlocked: stats.biggestWin >= 200,
      icon: Crown,
    },
    {
      title: 'Platform Veteran',
      desc: 'Maintain 40%+ win rate',
      unlocked: stats.totalRounds >= 5 && winRate >= 40,
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Profile Header Card (Red Gradient like screenshot WhatsApp Image 2026-10-10 at 10.35.38 AM (2).jpeg) */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#e52e2e] via-[#f53b3b] to-[#ff5252] text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          {/* Avatar Icon */}
          <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-full bg-white/20 p-1 shadow-md border-2 border-white/40 shrink-0 flex items-center justify-center">
            <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
              <User className="w-10 h-10 text-rose-600" />
            </div>
          </div>

          <div className="space-y-1.5 flex-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 border border-white/30 text-[11px] font-black text-white">
              <Crown className="w-3.5 h-3.5 text-amber-300" />
              <span>{rank.badge} VIP MEMBER</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black font-display text-white">
              {user ? `+91 ${user.phoneNumber}` : `COBCLUB Player #${Math.abs(stats.totalRounds * 37 + 1042)}`}
            </h1>

            <p className="text-xs text-white/90 font-mono font-bold">
              UID: {user?.memberId || 'COB8892'}
            </p>

            <p className="text-xs font-bold text-amber-200">
              Rank: {rank.title}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={logout}
              className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-white/20 hover:bg-white/30 text-white border border-white/30 text-xs font-black flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-sm"
            >
              <LogOut className="w-4 h-4 text-white" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Wallet Balance & Action Card (Screenshot WhatsApp Image 2026-10-10 at 10.35.38 AM (3).jpeg style) */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-center sm:text-left">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0 shadow-xs">
            <Coins className="w-7 h-7" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-extrabold uppercase tracking-wider block">
              Total Balance
            </span>
            <span className="text-3xl sm:text-4xl font-black text-slate-900 font-mono tabular-nums">
              ₹{balance.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleReset}
            className="flex-1 sm:flex-initial px-5 py-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black flex items-center justify-center gap-1.5 transition-colors border border-slate-200 cursor-pointer"
            title="Restore default starting balance of 1,000"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
            <span>Reset Balance</span>
          </button>
        </div>
      </div>

      {/* Player Career Stats */}
      <div>
        <h2 className="text-lg font-black font-display text-slate-900 mb-3">
          Game Statistics
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Total Rounds
            </span>
            <div className="text-2xl font-black text-slate-900 font-mono mt-1 tabular-nums">
              {stats.totalRounds}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              W: {stats.totalWins} · L: {stats.totalLosses}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Win Rate
            </span>
            <div className="text-2xl font-black text-rose-600 font-mono mt-1 tabular-nums">
              {winRate}%
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Efficiency rate
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Peak Single Win
            </span>
            <div className="text-2xl font-black text-emerald-600 font-mono mt-1 tabular-nums">
              +₹{stats.biggestWin.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Record payout
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Best Streak
            </span>
            <div className="text-2xl font-black text-blue-600 font-mono mt-1 tabular-nums">
              {stats.bestStreak}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Current: {stats.currentStreak}
            </span>
          </div>
        </div>
      </div>

      {/* Achievements Badges Grid */}
      <div>
        <h2 className="text-lg font-black font-display text-slate-900 mb-3">
          Achievements & Badges
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {achievements.map((ach, i) => {
            const Icon = ach.icon;
            return (
              <div
                key={i}
                className={`p-4 rounded-2xl border transition-all flex items-start gap-3.5 ${
                  ach.unlocked
                    ? 'bg-white border-rose-200 shadow-xs'
                    : 'bg-slate-50 border-slate-200 opacity-60'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  ach.unlocked
                    ? 'bg-rose-50 text-rose-600 border border-rose-200'
                    : 'bg-slate-200 text-slate-400'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                    <span>{ach.title}</span>
                    {ach.unlocked && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {ach.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Settings & Preferences */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-base font-bold font-display text-slate-900">
          Preferences & Audio
        </h2>

        <div className="flex items-center justify-between py-2 border-b border-slate-100 text-xs">
          <div>
            <span className="font-semibold text-slate-800 block">Synthesized Sound Effects</span>
            <span className="text-slate-500 text-[11px]">Play audio chimes for rolls, cards, and wins</span>
          </div>
          <button
            type="button"
            onClick={toggleSound}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              soundEnabled
                ? 'bg-rose-600 text-white'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>{soundEnabled ? 'On' : 'Muted'}</span>
          </button>
        </div>

        <div className="flex items-center justify-between py-2 text-xs">
          <div>
            <span className="font-semibold text-slate-800 block">Fair Play & Security</span>
            <span className="text-slate-500 text-[11px]">COBCLUB operates with verified fair gaming algorithms</span>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
            Verified Fair
          </span>
        </div>
      </div>
    </div>
  );
};
