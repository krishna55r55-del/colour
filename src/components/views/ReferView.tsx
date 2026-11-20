import React, { useState } from 'react';
import {
  Gift,
  Copy,
  Check,
  Share2,
  Users,
  CheckCircle2,
  Clock,
  Coins,
  Trophy,
  Sparkles,
  ArrowLeft,
  Award,
} from 'lucide-react';
import {
  useGame,
  REFERRAL_REWARD_AMOUNT,
  REFERRAL_MILESTONE_TARGET,
  REFERRAL_MILESTONE_BONUS,
} from '../../context/GameContext';

export const ReferView: React.FC = () => {
  const {
    referralStats,
    userReferrals,
    userReferralBonuses,
    playSound,
    setActiveView,
  } = useGame();

  const [copiedType, setCopiedType] = useState<'code' | 'link' | 'share' | null>(null);

  const referralLink =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?ref=${referralStats.referralCode}`
      : `https://cobclub.app/?ref=${referralStats.referralCode}`;

  const maskPhone = (phone: string) => {
    if (!phone || phone.length < 4) return '******';
    return `+91 ${phone.slice(0, 2)}••••${phone.slice(-4)}`;
  };

  const handleCopy = async (text: string, type: 'code' | 'link' | 'share') => {
    playSound('click');
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2200);
  };

  const handleShare = async () => {
    playSound('click');
    const shareText = `Join COBCLUB with my referral code ${referralStats.referralCode} and start playing Win Go! Link: ${referralLink}`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Join COBCLUB',
          text: shareText,
          url: referralLink,
        });
        return;
      } catch {
        // Fallback to copy if user dismissed or browser blocked
      }
    }
    handleCopy(shareText, 'share');
  };

  const progressPercent = Math.min(
    100,
    Math.round((referralStats.progressToNext5 / REFERRAL_MILESTONE_TARGET) * 100)
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Back Button */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            playSound('click');
            setActiveView('home');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-rose-600 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>

        <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-black">
          Total Earned: ₹{referralStats.totalEarned.toLocaleString()}
        </span>
      </div>

      {/* Hero Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#e52e2e] via-[#f53b3b] to-[#ff5252] text-white shadow-xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-white/10 blur-xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-10 w-44 h-44 rounded-full bg-black/10 blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="space-y-2.5 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 border border-white/30 text-[11px] font-black tracking-wide uppercase">
              <Gift className="w-3.5 h-3.5 text-amber-300" />
              <span>Refer & Earn Program</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black font-display tracking-tight leading-tight">
              Get ₹{REFERRAL_REWARD_AMOUNT} Per Referral + ₹{REFERRAL_MILESTONE_BONUS} Extra!
            </h1>

            <p className="text-xs sm:text-sm text-white/90 leading-relaxed font-medium">
              Invite friends to COBCLUB. When a referred friend completes{' '}
              <strong className="text-amber-200">1 verified deposit</strong>, you receive{' '}
              <strong className="text-white">₹{REFERRAL_REWARD_AMOUNT}</strong> directly in your wallet. Complete{' '}
              <strong className="text-amber-200">{REFERRAL_MILESTONE_TARGET} deposited referrals</strong> to unlock an{' '}
              <strong className="text-white">extra ₹{REFERRAL_MILESTONE_BONUS} bonus</strong>!
            </p>
          </div>

          <div className="shrink-0 p-4 rounded-2xl bg-white/15 border border-white/25 backdrop-blur-xs text-center min-w-[155px]">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-200 block">
              5 Refers Total Payout
            </span>
            <div className="text-3xl font-black font-mono mt-0.5 text-white">
              ₹{REFERRAL_REWARD_AMOUNT * REFERRAL_MILESTONE_TARGET + REFERRAL_MILESTONE_BONUS}
            </div>
            <span className="text-[10px] font-semibold text-white/85 block mt-1">
              (5 × ₹{REFERRAL_REWARD_AMOUNT} + ₹{REFERRAL_MILESTONE_BONUS} Extra)
            </span>
          </div>
        </div>
      </div>

      {/* Referral Code & Share Link Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm sm:text-base font-black font-display text-slate-900 flex items-center gap-2">
            <Share2 className="w-4 h-4 text-rose-600" />
            <span>Your Referral Code & Invite Link</span>
          </h2>
          {copiedType && (
            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-black animate-in fade-in duration-150">
              {copiedType === 'code'
                ? 'Code Copied!'
                : copiedType === 'link'
                ? 'Invite Link Copied!'
                : 'Share Message Copied!'}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Code Box */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                Referral Code
              </span>
              <span className="text-lg font-black font-mono tracking-widest text-slate-900">
                {referralStats.referralCode}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(referralStats.referralCode, 'code')}
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shrink-0"
            >
              {copiedType === 'code' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedType === 'code' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Link Box */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 min-w-0">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                Invite Link
              </span>
              <span className="text-xs font-mono font-bold text-slate-700 truncate block">
                {referralLink}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(referralLink, 'link')}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shrink-0"
            >
              {copiedType === 'link' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedType === 'link' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleShare}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-98 transition-all"
        >
          <Share2 className="w-4 h-4" />
          <span>Invite Friends Now</span>
        </button>
      </div>

      {/* 5-Referral Milestone Progress Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-amber-50 via-white to-rose-50 border border-amber-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-amber-700">
              <Trophy className="w-4 h-4 text-amber-600" />
              <span>5-Referral Bonus Milestone</span>
            </div>
            <h3 className="text-base sm:text-lg font-black font-display text-slate-900 mt-0.5">
              Complete 5 Deposited Refers for ₹{REFERRAL_MILESTONE_BONUS} Extra
            </h3>
          </div>

          <span className="px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-xs font-black self-start sm:self-auto">
            {referralStats.progressToNext5} / {REFERRAL_MILESTONE_TARGET} Completed
          </span>
        </div>

        {/* 5 Step Indicators */}
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((step) => {
            const done = referralStats.progressToNext5 >= step;
            const isFinal = step === 5;
            return (
              <div
                key={step}
                className={`p-2.5 rounded-2xl border text-center transition-all ${
                  done
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-2xs'
                    : isFinal
                    ? 'bg-amber-50/70 border-amber-300 border-dashed text-amber-800'
                    : 'bg-white border-slate-200 text-slate-500'
                }`}
              >
                <div
                  className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center text-xs font-black mb-1 ${
                    done
                      ? 'bg-emerald-500 text-white'
                      : isFinal
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {done ? <Check className="w-4 h-4" /> : step}
                </div>
                <span className="text-[10px] font-black block">
                  {isFinal ? `+₹${REFERRAL_MILESTONE_BONUS}` : `+₹${REFERRAL_REWARD_AMOUNT}`}
                </span>
              </div>
            );
          })}
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="w-full h-3 rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
            <span>
              {referralStats.qualifiedCount >= REFERRAL_MILESTONE_TARGET &&
              referralStats.qualifiedCount % REFERRAL_MILESTONE_TARGET === 0
                ? `Milestone reached! ₹${REFERRAL_MILESTONE_BONUS} extra credited to your wallet.`
                : `${REFERRAL_MILESTONE_TARGET - referralStats.progressToNext5} more deposited referral${
                    REFERRAL_MILESTONE_TARGET - referralStats.progressToNext5 === 1 ? '' : 's'
                  } to unlock ₹${REFERRAL_MILESTONE_BONUS} extra`}
            </span>
            <span className="font-mono font-black text-amber-700">
              Bonuses Won: {referralStats.milestonesCompleted}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2 text-slate-500 text-[11px] font-bold uppercase">
            <Users className="w-3.5 h-3.5 text-rose-500" />
            <span>Total Invited</span>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono mt-1">
            {referralStats.totalReferred}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2 text-slate-500 text-[11px] font-bold uppercase">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Deposited</span>
          </div>
          <div className="text-2xl font-black text-emerald-600 font-mono mt-1">
            {referralStats.qualifiedCount}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2 text-slate-500 text-[11px] font-bold uppercase">
            <Coins className="w-3.5 h-3.5 text-amber-500" />
            <span>₹77 Rewards</span>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono mt-1">
            ₹{referralStats.totalEarnedFrom77}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2 text-slate-500 text-[11px] font-bold uppercase">
            <Award className="w-3.5 h-3.5 text-purple-500" />
            <span>₹355 Extra</span>
          </div>
          <div className="text-2xl font-black text-amber-600 font-mono mt-1">
            ₹{referralStats.extraBonusEarned355}
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-sm font-black font-display text-slate-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-rose-500" />
          <span>How Refer & Earn Works</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="inline-block px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 font-black text-[10px] mb-1.5">
              STEP 1
            </span>
            <p className="font-bold text-slate-900">Share Code or Link</p>
            <p className="text-slate-500 text-[11px] mt-0.5">
              Friends sign up on COBCLUB using your referral code{' '}
              <span className="font-mono font-bold text-slate-700">{referralStats.referralCode}</span>.
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 font-black text-[10px] mb-1.5">
              STEP 2
            </span>
            <p className="font-bold text-slate-900">Friend Completes 1 Deposit</p>
            <p className="text-slate-500 text-[11px] mt-0.5">
              Once their first deposit is verified & approved, you instantly earn{' '}
              <strong className="text-emerald-700">₹{REFERRAL_REWARD_AMOUNT}</strong>.
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="inline-block px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-black text-[10px] mb-1.5">
              STEP 3
            </span>
            <p className="font-bold text-slate-900">5 Refers = ₹{REFERRAL_MILESTONE_BONUS} Extra</p>
            <p className="text-slate-500 text-[11px] mt-0.5">
              Hit 5 deposited referrals and automatically get an extra{' '}
              <strong className="text-amber-700">₹{REFERRAL_MILESTONE_BONUS}</strong> credited!
            </p>
          </div>
        </div>
      </div>

      {/* Extra Bonus History (if any) */}
      {userReferralBonuses.length > 0 && (
        <div className="p-5 sm:p-6 rounded-3xl bg-white border border-amber-200 shadow-xs space-y-3">
          <h3 className="text-sm font-black font-display text-slate-900 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>5-Referral Extra Bonuses Credited</span>
          </h3>
          <div className="space-y-2">
            {userReferralBonuses.map((bonus) => (
              <div
                key={bonus.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs"
              >
                <div>
                  <span className="font-black text-slate-900 block">
                    {bonus.milestoneCount} Qualified Referrals Milestone
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {new Date(bonus.awardedAt).toLocaleString()}
                  </span>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-600 text-white font-mono font-black">
                  +₹{bonus.amount}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Referred Friends List */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-black font-display text-slate-900">
            Your Referred Friends
          </h3>
          <span className="text-xs font-bold text-slate-500">
            {referralStats.pendingCount} Pending · {referralStats.qualifiedCount} Deposited
          </span>
        </div>

        {userReferrals.length === 0 ? (
          <div className="py-10 text-center space-y-2 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Users className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-600">No referred friends yet</p>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              Share your referral code <span className="font-mono font-bold text-slate-600">{referralStats.referralCode}</span> with friends to start earning ₹77 per deposit!
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {userReferrals.map((ref) => (
              <div
                key={ref.id}
                className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-black font-mono text-slate-900">
                      {ref.refereeMemberId}
                    </span>
                    <span className="text-slate-500 font-mono text-[11px]">
                      {maskPhone(ref.refereePhone)}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    Joined {new Date(ref.registeredAt).toLocaleString()}
                  </span>
                </div>

                {ref.firstDepositCompleted ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 font-black text-[11px] shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Deposited · +₹{ref.rewardAmount}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 border border-amber-200 text-amber-800 font-bold text-[11px] shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Pending 1st Deposit</span>
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
