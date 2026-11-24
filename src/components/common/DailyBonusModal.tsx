import React, { useState, useEffect } from 'react';
import {
  Gift,
  CheckCircle,
  Clock,
  Sparkles,
  X,
  Crown,
  Flame,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useGame, DAILY_BONUS_TIERS } from '../../context/GameContext';

export const DailyBonusModal: React.FC = () => {
  const {
    dailyBonus,
    claimDailyBonus,
    canClaimDailyBonus,
    timeUntilNextBonus,
    isDailyBonusModalOpen,
    setIsDailyBonusModalOpen,
    playSound,
  } = useGame();

  const [remainingTime, setRemainingTime] = useState(timeUntilNextBonus);
  const [claimSuccess, setClaimSuccess] = useState<{ amount: number; day: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live countdown timer for 24h bonus
  useEffect(() => {
    setRemainingTime(timeUntilNextBonus);
    if (canClaimDailyBonus) return;

    const interval = setInterval(() => {
      if (dailyBonus.lastClaimedAt) {
        const cooldown = 24 * 60 * 60 * 1000;
        const left = Math.max(0, cooldown - (Date.now() - dailyBonus.lastClaimedAt));
        setRemainingTime(left);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [dailyBonus.lastClaimedAt, canClaimDailyBonus, timeUntilNextBonus]);

  if (!isDailyBonusModalOpen) return null;

  const formatCountdown = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Determine current active streak day for UI
  const currentStreak = dailyBonus.streak || 0;
  const nextTargetDay = canClaimDailyBonus
    ? currentStreak === 0 || !dailyBonus.lastClaimedAt || Date.now() - dailyBonus.lastClaimedAt > 48 * 60 * 60 * 1000
      ? 1
      : (currentStreak % 7) + 1
    : currentStreak === 0
      ? 1
      : currentStreak;

  const nextRewardTier = DAILY_BONUS_TIERS.find((t) => t.day === nextTargetDay) || DAILY_BONUS_TIERS[0];

  const handleClaim = () => {
    playSound('click');
    setErrorMessage(null);
    const result = claimDailyBonus();
    if (result.success) {
      setClaimSuccess({ amount: result.amount, day: result.day });
      setTimeout(() => {
        setClaimSuccess(null);
      }, 4000);
    } else if (result.error) {
      setErrorMessage(result.error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="relative p-5 sm:p-6 bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 text-white shrink-0 overflow-hidden">
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-black/10 blur-xl pointer-events-none" />

          <button
            type="button"
            onClick={() => {
              playSound('click');
              setIsDailyBonusModalOpen(false);
            }}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/20 hover:bg-black/30 flex items-center justify-center text-white transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-black uppercase tracking-wider text-white border border-white/20">
              24-Hour Rewards
            </span>
            <div className="flex items-center gap-1 text-[11px] font-bold text-amber-200">
              <Flame className="w-3.5 h-3.5 fill-current" />
              <span>{currentStreak > 0 ? `${currentStreak}-Day Streak` : 'Start Streak'}</span>
            </div>
          </div>

          <h2 className="text-xl sm:text-2xl font-black font-display tracking-tight text-white flex items-center gap-2">
            <span>Daily Login Bonus</span>
            <Gift className="w-5 h-5 text-amber-300" />
          </h2>
          <p className="text-xs text-white/90 mt-1 max-w-sm leading-relaxed">
            Log in every 24 hours to claim virtual bonus points. Complete all 7 days to reach the ₹500 VIP jackpot!
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Claim Success Celebration Banner */}
          {claimSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 animate-in zoom-in-95 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold block">Bonus Claimed Successfully!</span>
                <span className="text-sm font-black text-emerald-700">
                  +₹{claimSuccess.amount} virtual points added to your wallet (Day {claimSuccess.day})
                </span>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {errorMessage}
            </div>
          )}

          {/* 7-Day Rewards Grid */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                7-Day Bonus Progression
              </span>
              <span className="text-xs font-mono font-bold text-slate-700">
                Total Earned: ₹{(dailyBonus.totalClaimed || 0).toLocaleString()}
              </span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {DAILY_BONUS_TIERS.map((tier) => {
                const isClaimed = tier.day <= currentStreak && !canClaimDailyBonus;
                const isCurrentReady = canClaimDailyBonus && tier.day === nextTargetDay;
                const isVip = tier.day === 7;

                return (
                  <div
                    key={tier.day}
                    className={`rounded-2xl p-2.5 sm:p-3 text-center border transition-all flex flex-col justify-between items-center ${
                      isCurrentReady
                        ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-300 shadow-md scale-102'
                        : isClaimed
                          ? 'bg-slate-50 border-slate-200 opacity-80'
                          : isVip
                            ? 'bg-gradient-to-b from-amber-50 to-orange-50 border-amber-200 shadow-xs'
                            : 'bg-white border-slate-200'
                    }`}
                  >
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">
                      {tier.label}
                    </span>

                    <div className="my-1.5 flex items-center justify-center">
                      {isClaimed ? (
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                          <CheckCircle className="w-4 h-4" />
                        </div>
                      ) : isVip ? (
                        <div className="w-8 h-8 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center shadow-xs animate-bounce">
                          <Crown className="w-4 h-4 fill-current" />
                        </div>
                      ) : (
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            isCurrentReady
                              ? 'bg-amber-400 text-amber-950 shadow-sm animate-pulse'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          <Gift className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    <div className="text-xs font-black font-mono text-slate-900">
                      ₹{tier.points}
                    </div>

                    <span
                      className={`text-[9px] font-bold uppercase mt-1 px-1.5 py-0.5 rounded-full block ${
                        isClaimed
                          ? 'bg-emerald-100 text-emerald-700'
                          : isCurrentReady
                            ? 'bg-amber-200 text-amber-900 font-black'
                            : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {isClaimed ? 'Claimed' : isCurrentReady ? 'Ready' : 'Locked'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Area: Claim button or Countdown status */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            {canClaimDailyBonus ? (
              <div className="space-y-3 text-center sm:text-left sm:flex sm:items-center sm:justify-between sm:space-y-0">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 block">
                    Bonus Available Now
                  </span>
                  <div className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                    Claim Day {nextTargetDay} (+₹{nextRewardTier.points} Points)
                  </div>
                  <p className="text-xs text-slate-500">
                    Your points will be credited directly to your playable wallet balance.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleClaim}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Gift className="w-4 h-4" />
                  <span>Claim Now</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-2 text-center sm:text-left sm:flex sm:items-center sm:justify-between sm:space-y-0">
                <div className="space-y-1">
                  <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-bold text-slate-700">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Next Daily Bonus Countdown</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    You have already claimed today&apos;s bonus. Check back when the timer expires!
                  </p>
                </div>

                <div className="px-4 py-2.5 rounded-xl bg-slate-900 text-amber-400 font-mono font-black text-base tracking-widest text-center shadow-xs">
                  {formatCountdown(remainingTime)}
                </div>
              </div>
            )}
          </div>

          {/* Info note */}
          <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Bonuses reset once every 24 hours. Points are saved to your profile and cloud database.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
