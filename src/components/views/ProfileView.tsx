import React, { useState } from 'react';
import {
  User,
  Crown,
  Coins,
  Volume2,
  VolumeX,
  LogOut,
  Building,
  ArrowRight,
  Gift,
} from 'lucide-react';
import { useGame } from '../../context/GameContext';

export const ProfileView: React.FC = () => {
  const {
    balance,
    stats,
    soundEnabled,
    toggleSound,
    playSound,
    user,
    logout,
    setActiveView,
    savedBankDetails,
    referralStats,
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

      {/* Refer & Earn Card */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-50 via-white to-amber-50 border border-emerald-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
            <Gift className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">
                Refer & Earn
              </span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                Code: {referralStats.referralCode}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Earn ₹77 per deposited friend + ₹355 extra on 5 refers · Earned: ₹{referralStats.totalEarned.toLocaleString()}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            playSound('click');
            setActiveView('refer');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="px-4 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
        >
          <span>Invite & Earn</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
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
