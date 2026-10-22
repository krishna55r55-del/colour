import React, { useState } from 'react';
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
  Lock,
  X,
  Building,
  ArrowRight,
  Users,
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
    setActiveView,
    winManagerEnabled,
    setWinManagerEnabled,
    savedBankDetails,
    withdrawRecords,
    dailyBonus,
    canClaimDailyBonus,
    setIsDailyBonusModalOpen,
    masterPlayerBets,
    masterDepositRequests,
  } = useGame();

  const [showPassModal, setShowPassModal] = useState(false);
  const [passInput, setPassInput] = useState('');
  const [passError, setPassError] = useState('');

  // Admin Authentication State
  const [showAdminPinModal, setShowAdminPinModal] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [adminPinError, setAdminPinError] = useState('');

  const handleAdminClick = () => {
    playSound('click');
    const isAuth = typeof window !== 'undefined' && sessionStorage.getItem('cobclub_admin_session') === 'true';
    if (isAuth) {
      setActiveView('admin');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setAdminPinInput('');
      setAdminPinError('');
      setShowAdminPinModal(true);
    }
  };

  const handleAdminPinSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const pin = adminPinInput.trim();
    if (pin === '8892' || pin === 'admin123' || pin.toLowerCase() === 'admin') {
      try {
        sessionStorage.setItem('cobclub_admin_session', 'true');
      } catch {}
      setShowAdminPinModal(false);
      setAdminPinInput('');
      setAdminPinError('');
      playSound('win');
      setActiveView('admin');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setAdminPinError('Invalid Admin PIN. (Default PIN: 8892)');
      playSound('loss');
    }
  };

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

  const handleToggleClick = () => {
    playSound('click');
    if (!winManagerEnabled) {
      setPassInput('');
      setPassError('');
      setShowPassModal(true);
    } else {
      setWinManagerEnabled(false);
    }
  };

  const handlePassSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (passInput === 'Loss123') {
      setWinManagerEnabled(true);
      setShowPassModal(false);
      setPassInput('');
      setPassError('');
      playSound('win');
    } else {
      setPassError('Access denied. Incorrect security code.');
      playSound('loss');
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

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => {
              playSound('click');
              setActiveView('deposit');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex-1 sm:flex-initial px-5 py-2.5 rounded-full bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 text-white text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer active:scale-95"
          >
            <span>Deposit</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playSound('click');
              setActiveView('withdraw');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex-1 sm:flex-initial px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-orange-500 text-white text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer active:scale-95"
          >
            <span>Withdraw</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black flex items-center justify-center gap-1.5 transition-colors border border-slate-200 cursor-pointer active:scale-95"
            title="Restore default starting balance of 1,000"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Bank Account Details & Withdrawal Card */}
      <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">
                Bank Payout Details
              </span>
              {savedBankDetails ? (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                  ✓ Bank Linked
                </span>
              ) : (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  Not Linked
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {savedBankDetails
                ? `${savedBankDetails.bankName} •••• ${savedBankDetails.accountNumber.slice(-4)} (${savedBankDetails.accountHolderName})`
                : 'Add your bank account details for instant withdrawals and payouts.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            playSound('click');
            setActiveView('withdraw');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="px-4 py-2.5 rounded-full bg-slate-100 hover:bg-amber-50 hover:text-amber-700 text-slate-700 border border-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
        >
          <span>{savedBankDetails ? 'Manage Bank Account' : 'Add Bank Details'}</span>
          <ArrowRight className="w-3.5 h-3.5 text-amber-600" />
        </button>
      </div>

      {/* Daily Login Bonus Rewards Card */}
      <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              canClaimDailyBonus
                ? 'bg-amber-100 border border-amber-300 text-amber-600 animate-pulse'
                : 'bg-rose-50 border border-rose-200 text-rose-600'
            }`}
          >
            <Gift className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">
                Daily Login Bonus
              </span>
              <span
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                  canClaimDailyBonus
                    ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-bounce'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}
              >
                {canClaimDailyBonus ? '★ Ready to Claim' : '✓ Claimed Today'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Streak: <strong className="text-slate-800">Day {dailyBonus.streak || 0} of 7</strong> · Total Claimed: <strong className="text-emerald-600">₹{(dailyBonus.totalClaimed || 0).toLocaleString()}</strong> points
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            playSound('click');
            setIsDailyBonusModalOpen(true);
          }}
          className={`px-4 py-2.5 rounded-full text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-xs ${
            canClaimDailyBonus
              ? 'bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white shadow-md'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
          }`}
        >
          <span>{canClaimDailyBonus ? 'Claim Daily Points' : 'Bonus Calendar'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Master Player Records ("My Records") Platform Overview Card */}
      <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">
                👑 Master Player Records (My Records)
              </span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-900 text-amber-300">
                {masterPlayerBets.length} Bets Saved
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Every player&apos;s bets and round outcomes are automatically archived here and synced to your database.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            playSound('click');
            setActiveView('history');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="px-4 py-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 border border-amber-400 text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
        >
          <span>Open Player Records</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
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

      {/* Discreet nameless ON/OFF button hidden at bottom of profile */}
      <div className="pt-2 pb-2 flex justify-center items-center">
        <button
          type="button"
          onClick={handleToggleClick}
          className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none shadow-xs ${
            winManagerEnabled ? 'bg-emerald-500' : 'bg-slate-300'
          }`}
          title={winManagerEnabled ? 'ON' : 'OFF'}
          aria-label={winManagerEnabled ? 'ON' : 'OFF'}
        >
          <span
            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out flex items-center justify-center text-[9px] font-black uppercase ${
              winManagerEnabled ? 'translate-x-7 text-emerald-600' : 'translate-x-0 text-slate-500'
            }`}
          >
            {winManagerEnabled ? 'ON' : 'OFF'}
          </span>
        </button>
      </div>

      {/* Small Admin button at the very bottom of profile section */}
      <div className="pt-1 pb-8 flex flex-col items-center justify-center gap-1">
        <button
          type="button"
          onClick={handleAdminClick}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-200 text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
          title="Admin Approval Portal"
        >
          <Crown className="w-3.5 h-3.5 text-amber-500" />
          <span>Admin</span>
          {masterDepositRequests.filter((d) => d.status === 'Pending').length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-rose-600 text-white animate-pulse">
              {masterDepositRequests.filter((d) => d.status === 'Pending').length}
            </span>
          )}
        </button>
        <span className="text-[10px] text-slate-400 font-medium">Administrator Approval Desk</span>
      </div>

      {/* Admin PIN Verification Modal (For Admin Approval Access) */}
      {showAdminPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-xs rounded-2xl bg-white p-5 border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Crown className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 tracking-wide uppercase">
                    Admin Portal Access
                  </h3>
                  <span className="text-[10px] text-slate-400 block">Owner / Administrator</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAdminPinModal(false);
                  setAdminPinInput('');
                  setAdminPinError('');
                }}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-slate-500 mb-3">
              Enter Administrator PIN to review and approve player deposit requests:
            </p>

            <form onSubmit={handleAdminPinSubmit} className="space-y-3">
              <div>
                <input
                  type="password"
                  value={adminPinInput}
                  onChange={(e) => {
                    setAdminPinInput(e.target.value);
                    if (adminPinError) setAdminPinError('');
                  }}
                  placeholder="Enter Admin PIN (8892)"
                  autoFocus
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-mono text-center text-sm font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                />
                {adminPinError && (
                  <p className="text-[11px] font-semibold text-rose-500 mt-1 text-center">
                    {adminPinError}
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdminPinModal(false);
                    setAdminPinInput('');
                    setAdminPinError('');
                  }}
                  className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-colors cursor-pointer shadow-xs"
                >
                  Unlock Admin
                </button>
              </div>

              <div className="text-center pt-1">
                <span className="text-[10px] text-slate-400 font-mono">
                  Default PIN: <strong className="text-slate-700">8892</strong>
                </span>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Secure Password Authentication Modal */}
      {showPassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-xs rounded-2xl bg-white p-5 border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                  <Lock className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-slate-800 tracking-wide uppercase">
                  Security Verification
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPassModal(false);
                  setPassInput('');
                  setPassError('');
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePassSubmit} className="space-y-3">
              <div>
                <input
                  type="password"
                  value={passInput}
                  onChange={(e) => {
                    setPassInput(e.target.value);
                    if (passError) setPassError('');
                  }}
                  placeholder="Enter Password"
                  autoFocus
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-mono text-sm tracking-wider focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
                {passError && (
                  <p className="text-[11px] font-semibold text-rose-500 mt-1">
                    {passError}
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowPassModal(false);
                    setPassInput('');
                    setPassError('');
                  }}
                  className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
