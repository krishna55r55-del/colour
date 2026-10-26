import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  HelpCircle,
  RotateCw,
  Sparkles,
  Check,
  ChevronRight,
  TrendingUp,
  History,
  User,
  Plus,
  Minus,
  X,
  Zap,
  ArrowLeft,
  ShieldCheck,
  Award,
  Trophy,
  Frown,
} from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { WinModal } from '../common/WinModal';
import {
  determineWinGoOutcome,
  getDeterministicNumberForRound,
  parsePeriodToTimestamp,
  getFinalizedRound,
  evaluateWinGoBet,
  getPeriodForTime,
  getContinuousRemainingSeconds,
} from '../../utils/winLogic';
import { GameHistoryItem } from '../../types';

type WinGoDuration = 30 | 60 | 180 | 300;
type BetTargetType = 'green' | 'purple' | 'red' | 'big' | 'small' | number;

interface BetOrder {
  id: string;
  target: BetTargetType;
  label: string;
  multiplier: number;
  amount: number;
  period: string;
}

interface PeriodHistory {
  period: string;
  number: number;
  bigSmall: 'Big' | 'Small';
  color: 'green' | 'red' | 'purple_red' | 'purple_green';
}


// Continuous deterministic history generator: produces identical continuous records
// across all users and devices whether the site is open, closed, or refreshed
const createContinuousHistory = (duration: WinGoDuration, count: number = 30): PeriodHistory[] => {
  const now = Date.now();
  const currentRoundIndex = Math.floor(now / (duration * 1000));
  const list: PeriodHistory[] = [];

  for (let i = 1; i <= count; i++) {
    const roundIdx = currentRoundIndex - i;
    const roundTime = roundIdx * duration * 1000;
    const period = getPeriodForTime(roundTime, duration);
    const num = getDeterministicNumberForRound(roundIdx, duration);
    const bigSmall: 'Big' | 'Small' = num >= 5 ? 'Big' : 'Small';

    let color: 'green' | 'red' | 'purple_red' | 'purple_green';
    if (num === 0) color = 'purple_red';
    else if (num === 5) color = 'purple_green';
    else if ([1, 3, 7, 9].includes(num)) color = 'green';
    else color = 'red';

    list.push({
      period,
      number: num,
      bigSmall,
      color,
    });
  }

  return list;
};

export const ColorPredictionGame: React.FC = () => {
  const {
    balance,
    placeBet,
    recordGameResult,
    playSound,
    selectGame,
    setActiveView,
    winManagerEnabled,
    history,
    user,
    submitWinGoBet,
    pendingWinGoBets,
    settleWinGoBets,
  } = useGame();

  const [betOutcomeFilter, setBetOutcomeFilter] = useState<'all' | 'pending' | 'wins' | 'losses'>('all');
  const [betScopeFilter, setBetScopeFilter] = useState<'wingo' | 'all'>('wingo');

  const winManagerEnabledRef = useRef(winManagerEnabled);
  winManagerEnabledRef.current = winManagerEnabled;

  // Mode selection: 30s, 1Min, 3Min, 5Min
  const [selectedDuration, setSelectedDuration] = useState<WinGoDuration>(30);

  // Distinct continuous history records for each of the 4 sections
  const [historiesByDuration, setHistoriesByDuration] = useState<Record<WinGoDuration, PeriodHistory[]>>(() => ({
    30: createContinuousHistory(30),
    60: createContinuousHistory(60),
    180: createContinuousHistory(180),
    300: createContinuousHistory(300),
  }));

  // Current period issue codes per duration
  const [currentPeriods, setCurrentPeriods] = useState<Record<WinGoDuration, string>>(() => ({
    30: getPeriodForTime(Date.now(), 30),
    60: getPeriodForTime(Date.now(), 60),
    180: getPeriodForTime(Date.now(), 180),
    300: getPeriodForTime(Date.now(), 300),
  }));

  // Continuous countdown for active mode
  const [timeLeft, setTimeLeft] = useState<number>(() => getContinuousRemainingSeconds(30));

  const currentPeriodsRef = useRef(currentPeriods);
  currentPeriodsRef.current = currentPeriods;

  const selectedDurationRef = useRef<WinGoDuration>(selectedDuration);
  selectedDurationRef.current = selectedDuration;

  const lastRoundIndicesRef = useRef<Record<WinGoDuration, number>>({
    30: Math.floor(Date.now() / 30000),
    60: Math.floor(Date.now() / 60000),
    180: Math.floor(Date.now() / 180000),
    300: Math.floor(Date.now() / 300000),
  });

  // Active section's distinct numbers, bets, and period code
  const historyList = historiesByDuration[selectedDuration] || [];
  const currentPeriod = currentPeriods[selectedDuration] || getPeriodForTime(Date.now(), selectedDuration);

  // Active bets for selected duration derived from persistent pendingWinGoBets
  const activeBets = React.useMemo(() => {
    return pendingWinGoBets.filter(
      (p) => (p.duration === selectedDuration || (!p.duration && selectedDuration === 30))
    );
  }, [pendingWinGoBets, selectedDuration]);

  // Selected quick multiplier on main UI (X1, X5, etc.)
  const [uiMultiplier, setUiMultiplier] = useState<number>(1);

  // Bottom Tabs: 'record' | 'trend' | 'my_record'
  const [bottomTab, setBottomTab] = useState<'record' | 'trend' | 'my_record'>('record');

  // Bet Sheet / Drawer State
  const [betModal, setBetModal] = useState<{
    isOpen: boolean;
    target: BetTargetType | null;
    label: string;
    payoutLabel: string;
    themeColor: 'green' | 'purple' | 'red' | 'yellow' | 'blue';
    baseUnit: number; // 1, 10, 100, 1000
    quantity: number;
  }>({
    isOpen: false,
    target: null,
    label: '',
    payoutLabel: '',
    themeColor: 'green',
    baseUnit: 10,
    quantity: 1,
  });

  // How to play modal
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  // Win/Loss result modal
  const [winModalState, setWinModalState] = useState<{
    isOpen: boolean;
    isWin: boolean;
    payout: number;
    multiplier: number;
    message: string;
    betAmount: number;
  }>({
    isOpen: false,
    isWin: false,
    payout: 0,
    multiplier: 1,
    message: '',
    betAmount: 0,
  });

  // Player personal history for this game
  const [myHistory, setMyHistory] = useState<
    Array<{
      period: string;
      target: string;
      bet: number;
      payout: number;
      isWin: boolean;
      outcomeNumber: number;
      timestamp?: number;
    }>
  >([]);

  // Unified, deduplicated betting records from global persistent history (saved in Supabase & localStorage)
  const allBettingRecords = React.useMemo(() => {
    const seen = new Set<string>();
    const list: Array<GameHistoryItem & { periodLabel?: string }> = [];

    history.forEach((h) => {
      if (!seen.has(h.id)) {
        seen.add(h.id);
        let periodLabel = h.period ? `#${h.period.slice(-4)}` : undefined;
        if (!periodLabel && h.choice.includes('[')) {
          const match = h.choice.match(/\[Issue\s+(\w+)\]/);
          if (match) periodLabel = `#${match[1]}`;
        }
        list.push({
          ...h,
          periodLabel: periodLabel || `#${h.id.slice(-4)}`,
        });
      }
    });

    return list.sort((a, b) => b.timestamp - a.timestamp);
  }, [history]);

  // Resolve Round logic for a specific section duration (30s, 1Min, 3Min, 5Min)
  const resolveRound = (dur: WinGoDuration) => {
    const periodToResolve = currentPeriodsRef.current[dur];
    const { roundIdx } = parsePeriodToTimestamp(periodToResolve, dur);
    const defaultDrawnNumber = getDeterministicNumberForRound(roundIdx, dur);

    // Look for active player bets placed for this period and duration
    const betsInThisPeriod = pendingWinGoBets.filter(
      (b) => b.period === periodToResolve && (b.duration === dur || (!b.duration && dur === 30))
    );

    // If player placed bets, outcome hits player bets with target win amounts:
    // [120, 230, 340, 450, 560, 670, 780, 890, 1020]
    const drawnNumber = betsInThisPeriod.length > 0
      ? determineWinGoOutcome(
          betsInThisPeriod.map((b) => ({ target: b.target as any, amount: b.betAmount })),
          winManagerEnabledRef.current,
          defaultDrawnNumber
        )
      : defaultDrawnNumber;

    const bigSmall: 'Big' | 'Small' = drawnNumber >= 5 ? 'Big' : 'Small';

    let colorType: 'green' | 'red' | 'purple_red' | 'purple_green';
    if (drawnNumber === 0) colorType = 'purple_red';
    else if (drawnNumber === 5) colorType = 'purple_green';
    else if ([1, 3, 7, 9].includes(drawnNumber)) colorType = 'green';
    else colorType = 'red';

    const periodRecord: PeriodHistory = {
      period: periodToResolve,
      number: drawnNumber,
      bigSmall,
      color: colorType,
    };

    // Add drawn outcome distinctly to this specific section's history
    setHistoriesByDuration((prev) => ({
      ...prev,
      [dur]: [periodRecord, ...(prev[dur] || []).slice(0, 29)],
    }));

    // Trigger instant settlement of pending bets
    settleWinGoBets();

    // Check if user placed bets on this period to show Win/Loss modal if currently viewing this duration
    if (betsInThisPeriod.length > 0 && selectedDurationRef.current === dur) {
      let totalBet = 0;
      let totalPayout = 0;

      betsInThisPeriod.forEach((b) => {
        totalBet += b.betAmount;
        let targetVal: any = b.target;
        if (targetVal !== undefined && !isNaN(Number(targetVal))) {
          targetVal = Number(targetVal);
        }
        const evalRes = evaluateWinGoBet(targetVal, b.betAmount, drawnNumber);
        if (evalRes.isWin) {
          totalPayout += evalRes.payout;
        }
      });

      const hasWin = totalPayout > 0;
      setWinModalState({
        isOpen: true,
        isWin: hasWin,
        payout: totalPayout,
        multiplier: totalBet > 0 ? Number((totalPayout / totalBet).toFixed(2)) : 0,
        message: `Win Go ${dur >= 60 ? `${dur / 60}Min` : `${dur}s`} #${periodToResolve.slice(-6)} resolved to Number ${drawnNumber} (${bigSmall})!`,
        betAmount: totalBet,
      });
    }

    // Advance period for this specific section
    const nextPeriodNum = getPeriodForTime(Date.now() + 2000, dur);
    setCurrentPeriods((prev) => ({
      ...prev,
      [dur]: nextPeriodNum,
    }));
    currentPeriodsRef.current[dur] = nextPeriodNum;
  };

  const resolveRoundRef = useRef(resolveRound);
  resolveRoundRef.current = resolveRound;

  // Continuous Multi-Section Timer Loop: each section ticks and resolves independently
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const allModes: WinGoDuration[] = [30, 60, 180, 300];

      // Check each section so 30s, 1Min, 3Min, 5Min each draw their own numbers
      allModes.forEach((dur) => {
        const roundIndex = Math.floor(now / (dur * 1000));
        if (lastRoundIndicesRef.current[dur] !== roundIndex) {
          resolveRoundRef.current(dur);
          lastRoundIndicesRef.current[dur] = roundIndex;
        }
      });

      // Update countdown for currently active section
      const activeDur = selectedDurationRef.current;
      const secInCycle = Math.floor((now / 1000) % activeDur);
      const remaining = activeDur - secInCycle;
      setTimeLeft(remaining === 0 ? activeDur : remaining);

      if (remaining <= 5 && remaining > 0) {
        playSound('tick');
      }
    };

    tick();
    const timer = setInterval(tick, 1000);

    return () => clearInterval(timer);
  }, []); // Run on mount only!

  // When window regains focus or visibility (or user switches back to tab),
  // instantly synchronize the continuous history so no missed rounds exist
  useEffect(() => {
    const handleSync = () => {
      const allModes: WinGoDuration[] = [30, 60, 180, 300];
      setHistoriesByDuration((prev) => {
        const next = { ...prev };
        allModes.forEach((dur) => {
          next[dur] = createContinuousHistory(dur, 30);
        });
        return next;
      });

      const activeDur = selectedDurationRef.current;
      setTimeLeft(getContinuousRemainingSeconds(activeDur));
    };

    window.addEventListener('visibilitychange', handleSync);
    window.addEventListener('focus', handleSync);
    return () => {
      window.removeEventListener('visibilitychange', handleSync);
      window.removeEventListener('focus', handleSync);
    };
  }, []);

  // Auto-close bet drawer if timer enters the 5s locked window
  useEffect(() => {
    if (timeLeft <= 5 && betModal.isOpen) {
      setBetModal((prev) => ({ ...prev, isOpen: false }));
    }
  }, [timeLeft, betModal.isOpen]);

  // Mode Selection handler: switches mode and synchronizes real-time countdown for selected section
  const handleModeSelect = (duration: WinGoDuration) => {
    playSound('click');
    setSelectedDuration(duration);
    selectedDurationRef.current = duration;
    const rem = getContinuousRemainingSeconds(duration);
    setTimeLeft(rem);
  };


  // Open Bet Drawer
  const openBetDrawer = (target: BetTargetType) => {
    if (timeLeft <= 5) return; // Betting closed in last 5 seconds

    playSound('click');
    let label = '';
    let payoutLabel = '2.0X Payout';
    let themeColor: 'green' | 'purple' | 'red' | 'yellow' | 'blue' = 'green';

    if (typeof target === 'number') {
      label = `Number ${target}`;
      payoutLabel = '9.0X Multiplier';
      if (target === 0 || target === 5) themeColor = 'purple';
      else if ([1, 3, 7, 9].includes(target)) themeColor = 'green';
      else themeColor = 'red';
    } else if (target === 'green') {
      label = 'Contract: Green';
      payoutLabel = '2.0X (1.5X on #5)';
      themeColor = 'green';
    } else if (target === 'purple') {
      label = 'Contract: Violet';
      payoutLabel = '4.5X Multiplier';
      themeColor = 'purple';
    } else if (target === 'red') {
      label = 'Contract: Red';
      payoutLabel = '2.0X (1.5X on #0)';
      themeColor = 'red';
    } else if (target === 'big') {
      label = 'Contract: Big (5–9)';
      payoutLabel = '2.0X Multiplier';
      themeColor = 'yellow';
    } else if (target === 'small') {
      label = 'Contract: Small (0–4)';
      payoutLabel = '2.0X Multiplier';
      themeColor = 'blue';
    }

    setBetModal({
      isOpen: true,
      target,
      label,
      payoutLabel,
      themeColor,
      baseUnit: 10,
      quantity: uiMultiplier,
    });
  };

  // Random Bet handler
  const handleRandomBet = () => {
    const options: BetTargetType[] = ['green', 'purple', 'red', 'big', 'small', 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const picked = options[Math.floor(Math.random() * options.length)];
    openBetDrawer(picked);
  };

  // Confirm bet in modal: permanently saved to GameContext & Supabase
  const handleConfirmBet = () => {
    if (!betModal.target) return;
    const totalWager = betModal.baseUnit * betModal.quantity;

    if (totalWager <= 0 || balance < totalWager) {
      alert('Insufficient available points. Please use Deposit to recharge free credits.');
      return;
    }

    let mult = 2.0;
    if (typeof betModal.target === 'number') mult = 9.0;
    else if (betModal.target === 'purple') mult = 4.5;

    const res = submitWinGoBet({
      period: currentPeriod,
      duration: selectedDuration,
      target: betModal.target,
      label: betModal.label,
      multiplier: mult,
      amount: totalWager,
    });

    if (res.success) {
      setBetModal((prev) => ({ ...prev, isOpen: false }));
    } else if (res.error) {
      alert(res.error);
    }
  };

  // Format digital countdown string (00 : 25)
  const formatTimerDigits = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    const mStr = mins.toString().padStart(2, '0');
    const sStr = secs.toString().padStart(2, '0');
    return {
      m1: mStr[0],
      m2: mStr[1],
      s1: sStr[0],
      s2: sStr[1],
    };
  };

  const timerDigits = formatTimerDigits(timeLeft);

  // Render 3D ball styling
  const renderBall = (num: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'w-7 h-7 text-xs',
      md: 'w-12 h-12 sm:w-14 sm:h-14 text-base sm:text-lg',
      lg: 'w-16 h-16 text-xl',
    }[size];

    let bgStyle: React.CSSProperties = {};
    if (num === 0) {
      bgStyle = { background: 'linear-gradient(135deg, #a855f7 50%, #f43f5e 50%)' };
    } else if (num === 5) {
      bgStyle = { background: 'linear-gradient(135deg, #a855f7 50%, #10b981 50%)' };
    } else if ([1, 3, 7, 9].includes(num)) {
      bgStyle = { background: 'radial-gradient(circle at 35% 35%, #34d399, #059669 85%)' };
    } else {
      bgStyle = { background: 'radial-gradient(circle at 35% 35%, #fb7185, #e11d48 85%)' };
    }

    return (
      <div
        className={`${sizeClasses} rounded-full flex items-center justify-center p-1 shadow-lg shadow-black/50 border border-white/25 select-none shrink-0 transition-transform active:scale-95`}
        style={bgStyle}
      >
        <div className="w-full h-full rounded-full bg-white/20 backdrop-blur-[1px] flex items-center justify-center border border-white/40">
          <span className="font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] font-display">
            {num}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-xl mx-auto rounded-3xl bg-white border border-slate-200/90 shadow-xl overflow-hidden font-sans text-slate-800">
      {/* Top Header Bar with Clean Navigation */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
        <button
          type="button"
          onClick={() => {
            playSound('click');
            selectGame(null);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors border border-slate-200 cursor-pointer"
          aria-label="Back to Platform Games"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-rose-600" />
          <span>Lobby</span>
        </button>

        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-black text-slate-900 tracking-wider uppercase font-display">
            Win Go {selectedDuration >= 60 ? `${selectedDuration / 60}Min` : `${selectedDuration}s`} · Live
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            playSound('click');
            setShowHowToPlay(true);
          }}
          className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors border border-slate-200"
          title="Market Rules & Multipliers"
        >
          <HelpCircle className="w-4 h-4 text-rose-500" />
        </button>
      </div>

      {/* 1. Wallet Balance Card (Red Gradient like screenshot WhatsApp Image 2026-10-10 at 10.35.38 AM (1).jpeg) */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-[#e52e2e] via-[#f53b3b] to-[#ff5252] text-white">
        <div className="flex items-center justify-between">
          <div className="flex-1 text-center">
            {/* Balance Amount */}
            <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight tabular-nums drop-shadow-sm">
              ₹{balance.toFixed(2)}
            </div>

            {/* Wallet Balance Label */}
            <div className="flex items-center justify-center gap-1.5 text-xs text-white/90 font-bold tracking-wide mt-1">
              <span className="inline-block w-3 h-2.5 bg-white/40 rounded-xs" />
              <span className="uppercase text-[11px] tracking-wider font-extrabold">
                Wallet Balance
              </span>
            </div>
          </div>

          {/* Refresh button */}
          <button
            type="button"
            onClick={() => {
              playSound('click');
            }}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors border border-white/30"
            title="Sync Balance"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <button
            type="button"
            onClick={() => {
              playSound('click');
              selectGame(null);
              setActiveView('withdraw');
            }}
            className="py-2.5 px-4 rounded-full bg-[#f59e0b] hover:bg-[#d97706] text-white font-black text-xs uppercase tracking-wider shadow-md transition-all active:scale-98 text-center cursor-pointer"
          >
            Withdrawal
          </button>

          <button
            type="button"
            onClick={() => {
              playSound('click');
              selectGame(null);
              setActiveView('deposit');
            }}
            className="py-2.5 px-4 rounded-full bg-white hover:bg-slate-100 text-[#e52e2e] font-black text-xs uppercase tracking-wider shadow-md transition-all active:scale-98 text-center cursor-pointer"
          >
            Deposit
          </button>
        </div>
      </div>

      {/* 2. Win Go Modes Selection Bar (Clean White Background with Red Active State) */}
      <div className="px-3 py-3 bg-white border-b border-slate-200">
        <div className="grid grid-cols-4 gap-2">
          {[
            { duration: 30, label: 'Win Go 30s', badge: 'Fast' },
            { duration: 60, label: 'Win Go 1Min', badge: 'Standard' },
            { duration: 180, label: 'Win Go 3Min', badge: 'Classic' },
            { duration: 300, label: 'Win Go 5Min', badge: 'Pro' },
          ].map((mode) => {
            const isActive = selectedDuration === mode.duration;
            return (
              <button
                key={mode.duration}
                type="button"
                onClick={() => handleModeSelect(mode.duration as WinGoDuration)}
                className={`py-2 px-1 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                  isActive
                    ? 'bg-rose-50 border-2 border-rose-500 shadow-sm'
                    : 'bg-slate-50 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${
                  isActive
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'bg-slate-200 text-slate-500'
                }`}>
                  <Clock className="w-4 h-4" />
                </div>
                <span className={`text-[11px] font-black text-center tracking-tight leading-tight ${
                  isActive ? 'text-rose-600' : 'text-slate-700'
                }`}>
                  {mode.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Winning Broadcast Marquee: Real-time broadcast showing winning amounts [120, 230, 340, 450, 560, 670, 780, 890, 1020] minus 2.4% commission */}
      <div className="bg-amber-50/90 border-b border-amber-200/80 px-3 py-1.5 flex items-center gap-2 overflow-hidden text-[11px] select-none">
        <div className="flex items-center gap-1 text-amber-800 font-black shrink-0 uppercase tracking-wider text-[10px] bg-amber-200/80 px-2 py-0.5 rounded-full shadow-2xs">
          <Zap className="w-3 h-3 text-amber-700 fill-amber-500 animate-pulse" />
          <span>Live Wins</span>
        </div>
        <div className="overflow-hidden whitespace-nowrap flex-1">
          <div className="animate-marquee gap-6 text-slate-700 font-semibold items-center">
            <span>🎉 Member 98***34 won <strong className="text-emerald-700 font-mono font-bold">₹224.48</strong> (Gross ₹230 - 2.4% Fee)</span>
            <span className="text-slate-300">|</span>
            <span>✨ Member 91***08 won <strong className="text-emerald-700 font-mono font-bold">₹439.20</strong> (Gross ₹450 - 2.4% Fee)</span>
            <span className="text-slate-300">|</span>
            <span>🏆 Member 97***55 won <strong className="text-emerald-700 font-mono font-bold">₹117.12</strong> (Gross ₹120 - 2.4% Fee)</span>
            <span className="text-slate-300">|</span>
            <span>🔥 Member 99***82 won <strong className="text-emerald-700 font-mono font-bold">₹995.52</strong> (Gross ₹1020 - 2.4% Fee)</span>
            <span className="text-slate-300">|</span>
            <span>💎 Member 94***16 won <strong className="text-emerald-700 font-mono font-bold">₹331.84</strong> (Gross ₹340 - 2.4% Fee)</span>
            <span className="text-slate-300">|</span>
            <span>🌟 Member 95***43 won <strong className="text-emerald-700 font-mono font-bold">₹546.56</strong> (Gross ₹560 - 2.4% Fee)</span>
            <span className="text-slate-300">|</span>
            <span>⚡ Member 92***77 won <strong className="text-emerald-700 font-mono font-bold">₹653.92</strong> (Gross ₹670 - 2.4% Fee)</span>
            <span className="text-slate-300">|</span>
            <span>🚀 Member 93***60 won <strong className="text-emerald-700 font-mono font-bold">₹761.28</strong> (Gross ₹780 - 2.4% Fee)</span>
            <span className="text-slate-300">|</span>
            <span>🎯 Member 96***91 won <strong className="text-emerald-700 font-mono font-bold">₹868.64</strong> (Gross ₹890 - 2.4% Fee)</span>
            <span className="text-slate-300">|</span>
            {/* Duplicate for seamless continuous loop */}
            <span>🎉 Member 98***34 won <strong className="text-emerald-700 font-mono font-bold">₹224.48</strong> (Gross ₹230 - 2.4% Fee)</span>
            <span className="text-slate-300">|</span>
            <span>✨ Member 91***08 won <strong className="text-emerald-700 font-mono font-bold">₹439.20</strong> (Gross ₹450 - 2.4% Fee)</span>
            <span className="text-slate-300">|</span>
            <span>🏆 Member 97***55 won <strong className="text-emerald-700 font-mono font-bold">₹117.12</strong> (Gross ₹120 - 2.4% Fee)</span>
            <span className="text-slate-300">|</span>
            <span>🔥 Member 99***82 won <strong className="text-emerald-700 font-mono font-bold">₹995.52</strong> (Gross ₹1020 - 2.4% Fee)</span>
            <span className="text-slate-300">|</span>
            <span>💎 Member 94***16 won <strong className="text-emerald-700 font-mono font-bold">₹331.84</strong> (Gross ₹340 - 2.4% Fee)</span>
            <span className="text-slate-300">|</span>
            <span>🌟 Member 95***43 won <strong className="text-emerald-700 font-mono font-bold">₹546.56</strong> (Gross ₹560 - 2.4% Fee)</span>
            <span className="text-slate-300">|</span>
            <span>⚡ Member 92***77 won <strong className="text-emerald-700 font-mono font-bold">₹653.92</strong> (Gross ₹670 - 2.4% Fee)</span>
            <span className="text-slate-300">|</span>
            <span>🚀 Member 93***60 won <strong className="text-emerald-700 font-mono font-bold">₹761.28</strong> (Gross ₹780 - 2.4% Fee)</span>
            <span className="text-slate-300">|</span>
            <span>🎯 Member 96***91 won <strong className="text-emerald-700 font-mono font-bold">₹868.64</strong> (Gross ₹890 - 2.4% Fee)</span>
          </div>
        </div>
      </div>

      {/* 3. Round Info & Countdown Timer Box (Red/Gold tint background as in 82Lottery / Rajaluck screenshot) */}
      <div className="p-4 bg-gradient-to-br from-rose-500 to-red-600 m-3 rounded-2xl text-white shadow-md">
        <div className="flex items-center justify-between">
          {/* Left: Rules trigger & Recent Outcome Balls */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                playSound('click');
                setShowHowToPlay(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-[11px] text-white hover:bg-white/30 font-bold border border-white/30"
            >
              <HelpCircle className="w-3.5 h-3.5 text-white" />
              <span>How to play</span>
            </button>

            <div className="text-xs font-black text-white/95 uppercase tracking-wide">
              Win Go {selectedDuration >= 60 ? `${selectedDuration / 60}Min` : `${selectedDuration}s`}
            </div>

            {/* Recent Outcome Balls Preview */}
            <div className="flex items-center gap-1.5 pt-0.5">
              {historyList.slice(0, 5).map((h, i) => (
                <div key={i}>{renderBall(h.number, 'sm')}</div>
              ))}
            </div>
          </div>

          {/* Right: Digital Countdown Box & Period Code */}
          <div className="text-right space-y-1">
            <span className="text-[11px] uppercase tracking-wider font-extrabold text-white/80 block">
              Time remaining
            </span>

            {/* Countdown Blocks [0] [0] : [2] [5] */}
            <div className="flex items-center justify-end gap-1 font-mono font-black text-sm sm:text-base">
              <span className="w-6 h-7 sm:w-7 sm:h-8 rounded-lg bg-white text-rose-600 flex items-center justify-center font-black shadow-sm">
                {timerDigits.m1}
              </span>
              <span className="w-6 h-7 sm:w-7 sm:h-8 rounded-lg bg-white text-rose-600 flex items-center justify-center font-black shadow-sm">
                {timerDigits.m2}
              </span>
              <span className="text-white font-black px-0.5">:</span>
              <span className="w-6 h-7 sm:w-7 sm:h-8 rounded-lg bg-white text-rose-600 flex items-center justify-center font-black shadow-sm">
                {timerDigits.s1}
              </span>
              <span className="w-6 h-7 sm:w-7 sm:h-8 rounded-lg bg-white text-rose-600 flex items-center justify-center font-black shadow-sm">
                {timerDigits.s2}
              </span>
            </div>

            {/* Period Issue Number */}
            <div className="text-xs sm:text-sm font-black text-amber-200 font-mono tracking-wide pt-1">
              {currentPeriod}
            </div>
          </div>
        </div>

        {/* Status ticker */}
        <div className="mt-3 pt-2.5 border-t border-white/20 flex items-center justify-between text-[11px]">
          <span className={timeLeft <= 5 ? 'text-amber-200 font-black animate-pulse' : 'text-white/90 font-semibold'}>
            {timeLeft <= 5 ? '⚠️ Orders Locked · Drawing Result...' : 'Orders Open · Cutoff at 00:05'}
          </span>
          <span className="text-[10px] text-white/80 font-mono font-bold">
            Auto-Settlement
          </span>
        </div>
      </div>

      {/* 4. Main Betting Arena: Green, Violet, Red */}
      <div className="relative px-3 space-y-3">
        {/* BIG SCREEN 5-SECOND COUNTDOWN OVERLAY ON SCREEN WHERE BETTING CLOSED */}
        {timeLeft <= 5 && (
          <div className="absolute inset-0 z-30 rounded-3xl bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-150 border-2 border-amber-400/60 shadow-2xl overflow-hidden select-none">
            {/* Glowing radial backdrop */}
            <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 w-48 h-48 rounded-full bg-rose-500/20 blur-3xl pointer-events-none" />

            {/* Giant Big Screen Timer Indicator */}
            <div className="relative mb-4 flex items-center justify-center">
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full border-4 border-amber-400/30 animate-ping absolute pointer-events-none" />
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-amber-400 bg-slate-900 shadow-[0_0_40px_rgba(245,158,11,0.7)] flex items-center justify-center">
                <span className="text-6xl sm:text-7xl font-black font-mono text-amber-300 drop-shadow-[0_0_25px_rgba(251,191,36,0.9)] animate-pulse tabular-nums">
                  {timeLeft}
                </span>
              </div>
            </div>

            {/* Prominent Status Banner */}
            <div className="space-y-2 max-w-sm relative z-10 px-2">
              <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-rose-600 text-white text-xs font-black uppercase tracking-widest shadow-lg border border-rose-400 animate-pulse">
                <span>🛑 BETTING CLOSED</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">
                Drawing Issue #{currentPeriod.slice(-5)}
              </h3>
              <p className="text-xs text-amber-200/90 font-medium leading-relaxed">
                Orders are locked. Live winning number will reveal in {timeLeft} second{timeLeft === 1 ? '' : 's'}...
              </p>
            </div>
          </div>
        )}

        {/* Colors Row */}
        <div className="grid grid-cols-3 gap-2.5">
          <button
            type="button"
            disabled={timeLeft <= 5}
            onClick={() => openBetDrawer('green')}
            className="py-3 px-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-sm tracking-wide shadow-lg shadow-emerald-600/30 active:scale-98 transition-all disabled:opacity-40 flex flex-col items-center justify-center"
          >
            <span>Green</span>
            <span className="text-[10px] font-semibold opacity-90">2.0X</span>
          </button>

          <button
            type="button"
            disabled={timeLeft <= 5}
            onClick={() => openBetDrawer('purple')}
            className="py-3 px-2 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-black text-sm tracking-wide shadow-lg shadow-purple-600/30 active:scale-98 transition-all disabled:opacity-40 flex flex-col items-center justify-center"
          >
            <span>Violet</span>
            <span className="text-[10px] font-semibold opacity-90">4.5X</span>
          </button>

          <button
            type="button"
            disabled={timeLeft <= 5}
            onClick={() => openBetDrawer('red')}
            className="py-3 px-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 text-white font-black text-sm tracking-wide shadow-lg shadow-rose-600/30 active:scale-98 transition-all disabled:opacity-40 flex flex-col items-center justify-center"
          >
            <span>Red</span>
            <span className="text-[10px] font-semibold opacity-90">2.0X</span>
          </button>
        </div>

        {/* 5. Number Balls (0–9) (Crisp light container with sleek border) */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 shadow-inner">
          <div className="grid grid-cols-5 gap-2 justify-items-center">
            {[0, 1, 2, 3, 4].map((num) => (
              <button
                key={num}
                type="button"
                disabled={timeLeft <= 5}
                onClick={() => openBetDrawer(num)}
                className="cursor-pointer transition-transform hover:scale-105 active:scale-95 disabled:opacity-40 relative group"
                title={`Predict Number ${num} (9.0X Multiplier)`}
              >
                {renderBall(num, 'md')}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-5 gap-2 justify-items-center">
            {[5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                type="button"
                disabled={timeLeft <= 5}
                onClick={() => openBetDrawer(num)}
                className="cursor-pointer transition-transform hover:scale-105 active:scale-95 disabled:opacity-40 relative group"
                title={`Predict Number ${num} (9.0X Multiplier)`}
              >
                {renderBall(num, 'md')}
              </button>
            ))}
          </div>
        </div>

        {/* 6. Random Quick Selection & Multipliers Bar (Responsive Grid) */}
        <div className="grid grid-cols-6 gap-1 sm:gap-1.5 w-full">
          <button
            type="button"
            disabled={timeLeft <= 5}
            onClick={handleRandomBet}
            className="py-2 px-1 sm:px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-rose-600 font-black text-[11px] sm:text-xs border border-rose-200 transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-1 cursor-pointer"
          >
            <Sparkles className="w-3 h-3 text-rose-500 shrink-0 hidden xs:inline" />
            <span>Rand</span>
          </button>

          {[1, 5, 10, 20, 50].map((mult) => (
            <button
              key={mult}
              type="button"
              onClick={() => {
                playSound('click');
                setUiMultiplier(mult);
              }}
              className={`py-2 px-1 rounded-xl font-black text-[11px] sm:text-xs text-center transition-all border cursor-pointer ${
                uiMultiplier === mult
                  ? 'bg-rose-500 text-white border-rose-600 shadow-sm'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
            >
              X{mult}
            </button>
          ))}
        </div>

        {/* 7. Big & Small Category Buttons (Orange Big, Light Blue Small like screenshots) */}
        <div className="grid grid-cols-2 gap-3 pb-2">
          <button
            type="button"
            disabled={timeLeft <= 5}
            onClick={() => openBetDrawer('big')}
            className="py-3.5 px-4 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-sm uppercase tracking-wider shadow-md active:scale-98 transition-all disabled:opacity-40 flex items-center justify-center gap-1.5"
          >
            <span>Big (5–9)</span>
            <span className="text-[11px] opacity-90 font-bold">· 2.0X</span>
          </button>

          <button
            type="button"
            disabled={timeLeft <= 5}
            onClick={() => openBetDrawer('small')}
            className="py-3.5 px-4 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-black text-sm uppercase tracking-wider shadow-md active:scale-98 transition-all disabled:opacity-40 flex items-center justify-center gap-1.5"
          >
            <span>Small (0–4)</span>
            <span className="text-[11px] opacity-90 font-bold">· 2.0X</span>
          </button>
        </div>

        {/* Active orders indicator */}
        {activeBets.length > 0 && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs flex items-center justify-between">
            <span className="text-rose-700 font-semibold truncate mr-2">
              Pending Orders ({activeBets.length}): {activeBets.map((b) => b.choice.replace(/\s*\[Issue\s+.*?\]/, '')).join(', ')}
            </span>
            <span className="text-rose-600 font-black shrink-0 tabular-nums">
              Wager: ₹{activeBets.reduce((acc, cur) => acc + cur.betAmount, 0).toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* 8. Bottom Records Tab Bar (White background, red active tab) */}
      <div className="mt-4 border-t border-slate-200 bg-white">
        <div className="flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => {
              playSound('click');
              setBottomTab('record');
            }}
            className={`flex-1 py-3 text-xs font-black transition-all border-b-2 uppercase tracking-wider ${
              bottomTab === 'record'
                ? 'border-rose-500 text-rose-600 bg-rose-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Game Record
          </button>
          <button
            type="button"
            onClick={() => {
              playSound('click');
              setBottomTab('trend');
            }}
            className={`flex-1 py-3 text-xs font-black transition-all border-b-2 uppercase tracking-wider ${
              bottomTab === 'trend'
                ? 'border-rose-500 text-rose-600 bg-rose-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Chart Trends
          </button>
          <button
            type="button"
            onClick={() => {
              playSound('click');
              setBottomTab('my_record');
            }}
            className={`flex-1 py-3 text-xs font-black transition-all border-b-2 uppercase tracking-wider ${
              bottomTab === 'my_record'
                ? 'border-rose-500 text-rose-600 bg-rose-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            My Record
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-3">
          {/* Tab 1: Game Record Table */}
          {bottomTab === 'record' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-200 pb-2 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-2">Issue Period</th>
                    <th className="py-2.5 px-2 text-center">Number</th>
                    <th className="py-2.5 px-2 text-center">Size</th>
                    <th className="py-2.5 px-2 text-right">Color</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historyList.map((item, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-2 font-mono text-slate-700 font-medium">
                        <span className="sm:hidden font-bold">#{item.period.slice(-4)}</span>
                        <span className="hidden sm:inline">{item.period}</span>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <div className="inline-block">{renderBall(item.number, 'sm')}</div>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          item.bigSmall === 'Big' ? 'text-amber-600 bg-amber-50' : 'text-blue-600 bg-blue-50'
                        }`}>
                          {item.bigSmall}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        <span className="inline-flex items-center gap-1 justify-end">
                          {item.color === 'purple_red' ? (
                            <>
                              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-xs" />
                              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-xs" />
                            </>
                          ) : item.color === 'purple_green' ? (
                            <>
                              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-xs" />
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs" />
                            </>
                          ) : item.color === 'green' ? (
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs" />
                          ) : (
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-xs" />
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 2: Chart Trends */}
          {bottomTab === 'trend' && (
            <div className="space-y-3 py-2 text-xs">
              <div className="text-slate-500 text-[11px] font-bold mb-2">
                Consecutive Trajectory (Last 10 Rounds):
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 overflow-x-auto gap-2">
                {historyList.slice(0, 10).map((h, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-1">
                    {renderBall(h.number, 'sm')}
                    <span className="text-[10px] text-slate-700 font-mono font-bold">
                      #{h.number}
                    </span>
                    <span className={`text-[9px] font-extrabold uppercase ${h.bigSmall === 'Big' ? 'text-amber-600' : 'text-blue-600'}`}>
                      {h.bigSmall}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: My Game Record / All Betting History */}
          {bottomTab === 'my_record' && (
            <div className="space-y-3 py-1 text-xs">
              {/* Controls bar: Scope (Win Go / All Games) and Outcome (All / Wins in Green / Losses in Red) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-2xl bg-slate-50 border border-slate-200">
                {/* Scope selector */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400">View:</span>
                  <button
                    type="button"
                    onClick={() => {
                      playSound('click');
                      setBetScopeFilter('wingo');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      betScopeFilter === 'wingo'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Win Go Bets ({allBettingRecords.filter((b) => b.gameId === 'color-prediction').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playSound('click');
                      setBetScopeFilter('all');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      betScopeFilter === 'all'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    All Games ({allBettingRecords.length})
                  </button>
                </div>

                {/* Outcome filters (All, Pending, Wins in Green, Losses in Red) */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400">Result:</span>
                  <button
                    type="button"
                    onClick={() => {
                      playSound('click');
                      setBetOutcomeFilter('all');
                    }}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold cursor-pointer transition-all ${
                      betOutcomeFilter === 'all'
                        ? 'bg-slate-800 text-white'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playSound('click');
                      setBetOutcomeFilter('pending');
                    }}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-black cursor-pointer transition-all flex items-center gap-1 ${
                      betOutcomeFilter === 'pending'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100'
                    }`}
                  >
                    <Clock className="w-3 h-3 text-amber-600" />
                    <span>Pending ({allBettingRecords.filter((b) => b.status === 'Pending').length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playSound('click');
                      setBetOutcomeFilter('wins');
                    }}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-black cursor-pointer transition-all flex items-center gap-1 ${
                      betOutcomeFilter === 'wins'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100'
                    }`}
                  >
                    <Trophy className="w-3 h-3 text-emerald-600" />
                    <span>Win (Green)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playSound('click');
                      setBetOutcomeFilter('losses');
                    }}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-black cursor-pointer transition-all flex items-center gap-1 ${
                      betOutcomeFilter === 'losses'
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'bg-red-50 text-red-700 border border-red-300 hover:bg-red-100'
                    }`}
                  >
                    <Frown className="w-3 h-3 text-red-600" />
                    <span>Loss (Red)</span>
                  </button>
                </div>
              </div>

              {/* Betting History List: Pending in Amber, Wins in Green, Losses in Red */}
              {allBettingRecords
                .filter((b) => {
                  if (betScopeFilter === 'wingo' && b.gameId !== 'color-prediction') return false;
                  if (betOutcomeFilter === 'pending' && b.status !== 'Pending') return false;
                  if (betOutcomeFilter === 'wins' && (b.status === 'Pending' || !b.isWin)) return false;
                  if (betOutcomeFilter === 'losses' && (b.status === 'Pending' || b.isWin)) return false;
                  return true;
                })
                .length > 0 ? (
                <div className="space-y-2">
                  {allBettingRecords
                    .filter((b) => {
                      if (betScopeFilter === 'wingo' && b.gameId !== 'color-prediction') return false;
                      if (betOutcomeFilter === 'pending' && b.status !== 'Pending') return false;
                      if (betOutcomeFilter === 'wins' && (b.status === 'Pending' || !b.isWin)) return false;
                      if (betOutcomeFilter === 'losses' && (b.status === 'Pending' || b.isWin)) return false;
                      return true;
                    })
                    .map((item, idx) => {
                      const isPending = item.status === 'Pending';
                      const isWin = !isPending && item.isWin;

                      return (
                        <div
                          key={item.id || idx}
                          className={`p-3 rounded-2xl border transition-all flex items-center justify-between shadow-2xs ${
                            isPending
                              ? 'bg-amber-50/80 border-amber-300 hover:border-amber-400'
                              : isWin
                              ? 'bg-emerald-50/70 border-emerald-300 hover:border-emerald-400'
                              : 'bg-red-50/70 border-red-300 hover:border-red-400'
                          }`}
                        >
                          {/* Left: Icon, Target & Outcome */}
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                                isPending
                                  ? 'bg-amber-100 border-amber-300 text-amber-700 shadow-xs'
                                  : isWin
                                  ? 'bg-emerald-100 border-emerald-300 text-emerald-700 shadow-xs'
                                  : 'bg-red-100 border-red-300 text-red-700 shadow-xs'
                              }`}
                            >
                              {isPending ? (
                                <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
                              ) : isWin ? (
                                <Trophy className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Frown className="w-4 h-4 text-red-600" />
                              )}
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-slate-900 text-xs sm:text-sm">
                                  {item.choice}
                                </span>
                                {item.periodLabel && (
                                  <span className="font-mono text-[10px] text-slate-500 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                                    {item.periodLabel}
                                  </span>
                                )}
                                {item.gameId !== 'color-prediction' && (
                                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                                    {item.gameTitle}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-600 mt-0.5 flex items-center gap-1.5">
                                <span>
                                  Outcome:{' '}
                                  {isPending ? (
                                    <strong className="text-amber-700">⏳ Waiting for Draw</strong>
                                  ) : (
                                    <strong className="text-slate-800">{item.outcome}</strong>
                                  )}
                                </span>
                                <span>·</span>
                                <span>Wager: ₹{item.betAmount.toLocaleString()}</span>
                                {isWin && (
                                  <>
                                    <span>·</span>
                                    <span className="text-amber-800 font-bold bg-amber-100/80 px-1 py-0.5 rounded text-[10px]">
                                      Fee: 2.4%{item.commission ? ` (-₹${item.commission.toFixed(2)})` : ''}
                                    </span>
                                  </>
                                )}
                                <span className="hidden sm:inline">·</span>
                                <span className="hidden sm:inline text-slate-400 text-[10px] font-mono">
                                  {new Date(item.timestamp).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Status Badge & Return / Net Profit */}
                          <div className="text-right shrink-0">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-2xs ${
                                isPending
                                  ? 'bg-amber-500 text-white border border-amber-600'
                                  : isWin
                                  ? 'bg-emerald-600 text-white border border-emerald-700'
                                  : 'bg-red-600 text-white border border-red-700'
                              }`}
                            >
                              {isPending ? 'PENDING' : isWin ? 'WIN' : 'LOSS'}
                            </span>
                            <div
                              className={`font-mono font-black text-xs sm:text-sm mt-1 tabular-nums ${
                                isPending
                                  ? 'text-amber-700'
                                  : isWin
                                  ? 'text-emerald-700'
                                  : 'text-red-600'
                              }`}
                            >
                              {isPending
                                ? `₹${item.betAmount.toLocaleString()}`
                                : isWin
                                ? `+₹${item.payout.toLocaleString()}`
                                : `-₹${item.betAmount.toLocaleString()}`}
                            </div>
                            <span
                              className={`text-[10px] block font-mono font-bold ${
                                isPending
                                  ? 'text-slate-400'
                                  : isWin
                                  ? 'text-emerald-600'
                                  : 'text-red-500'
                              }`}
                            >
                              {isPending
                                ? 'Net: ₹0'
                                : isWin
                                ? `Net: +₹${item.netProfit.toLocaleString()}`
                                : `Net: -₹${item.betAmount.toLocaleString()}`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="py-10 text-center rounded-2xl bg-slate-50 border border-slate-200 text-slate-400 font-medium">
                  <p className="text-xs">No betting records match this filter.</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Place orders above on Green, Violet, Red, Big, Small, or Numbers to start your streak!
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Interactive Order Sheet / Drawer (Light theme) */}
      {betModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl border border-slate-200 shadow-2xl overflow-hidden text-left">
            {/* Header banner */}
            <div className={`p-4 text-white flex items-center justify-between ${
              betModal.themeColor === 'green'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600'
                : betModal.themeColor === 'purple'
                ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600'
                : betModal.themeColor === 'red'
                ? 'bg-gradient-to-r from-rose-600 to-red-600'
                : betModal.themeColor === 'yellow'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-900 font-black'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600'
            }`}>
              <div>
                <h3 className="text-base font-black font-display">{betModal.label}</h3>
                <span className="text-xs opacity-90 font-medium">
                  {betModal.payoutLabel} · Issue #{currentPeriod.slice(-6)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setBetModal((prev) => ({ ...prev, isOpen: false }))}
                className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 text-xs">
              {/* Contract Unit Selection */}
              <div>
                <label className="block text-slate-600 font-bold mb-2 uppercase text-[10px] tracking-wider">
                  Contract Base Unit
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 10, 100, 1000].map((unit) => (
                    <button
                      key={unit}
                      type="button"
                      onClick={() => {
                        playSound('click');
                        setBetModal((prev) => ({ ...prev, baseUnit: unit }));
                      }}
                      className={`py-2 rounded-xl font-bold border transition-all ${
                        betModal.baseUnit === unit
                          ? 'bg-rose-500 text-white border-rose-600 shadow-sm'
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {unit}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity Stepper */}
              <div>
                <label className="block text-slate-600 font-bold mb-2 uppercase text-[10px] tracking-wider">
                  Order Multiplier
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      playSound('click');
                      setBetModal((prev) => ({ ...prev, quantity: Math.max(1, prev.quantity - 1) }));
                    }}
                    className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center border border-slate-200 cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <div className="flex-1 h-10 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center font-black text-lg font-mono text-slate-900 tabular-nums">
                    {betModal.quantity}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      playSound('click');
                      setBetModal((prev) => ({ ...prev, quantity: prev.quantity + 1 }));
                    }}
                    className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center border border-slate-200 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Quick Multiplier Buttons */}
                <div className="grid grid-cols-5 gap-1.5 mt-2">
                  {[1, 5, 10, 20, 50].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        playSound('click');
                        setBetModal((prev) => ({ ...prev, quantity: m }));
                      }}
                      className={`py-1.5 rounded-lg font-bold text-xs border ${
                        betModal.quantity === m
                          ? 'bg-rose-500 text-white border-rose-600'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      X{m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Total Calculation */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex items-center justify-between font-semibold">
                  <span className="text-slate-600 font-bold">Total Order Wager:</span>
                  <span className="text-base font-black text-rose-600 font-mono tabular-nums">
                    ₹{(betModal.baseUnit * betModal.quantity).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200/60 font-medium">
                  <span>Platform Service Fee</span>
                  <span className="font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                    2.4% commission on winning payouts
                  </span>
                </div>
              </div>

              {/* Confirmation CTA */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBetModal((prev) => ({ ...prev, isOpen: false }))}
                  className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBet}
                  className="flex-2 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white font-black text-sm shadow-md active:scale-98 transition-all cursor-pointer"
                >
                  Confirm Order (₹{(betModal.baseUnit * betModal.quantity).toLocaleString()})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rules Modal with Professional Language */}
      {showHowToPlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 border border-slate-200 text-left text-xs text-slate-800 space-y-3 max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Award className="w-4 h-4 text-rose-500" />
                <span>Win Go Official Market Rules</span>
              </div>
              <button
                type="button"
                onClick={() => setShowHowToPlay(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-[11px] text-slate-600 leading-relaxed">
              <p>
                <strong className="text-slate-900">1. Color Multipliers:</strong>
                <br />
                • <strong>Green (1, 3, 7, 9):</strong> 2.0X return. If #5 draws, pays 1.5X.
                <br />
                • <strong>Red (2, 4, 6, 8):</strong> 2.0X return. If #0 draws, pays 1.5X.
                <br />
                • <strong>Violet (0, 5):</strong> 4.5X return on dual-shade balls.
              </p>

              <p>
                <strong>2. Exact Number Draw (0–9):</strong>
                <br />
                Predicting the exact single digit yields a massive <strong>9.0X Multiplier</strong>.
              </p>

              <p>
                <strong>3. Size Categories:</strong>
                <br />
                • <strong>Big:</strong> Numbers 5, 6, 7, 8, 9 (2.0X Multiplier).
                <br />
                • <strong>Small:</strong> Numbers 0, 1, 2, 3, 4 (2.0X Multiplier).
              </p>

              <p>
                <strong>4. Platform Service Fee:</strong>
                <br />
                • A standard <strong>2.4% commission</strong> is automatically deducted from every winning payout.
              </p>

              <p>
                <strong>5. Timing & Settlement:</strong>
                <br />
                Orders remain open until 5 seconds prior to resolution. The outcome is generated by browser RNG and settled instantly to your virtual balance.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowHowToPlay(false)}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs mt-2 transition-colors cursor-pointer"
            >
              Close Rules
            </button>
          </div>
        </div>
      )}

      {/* Result Outcome Modal */}
      <WinModal
        isOpen={winModalState.isOpen}
        isWin={winModalState.isWin}
        payout={winModalState.payout}
        betAmount={winModalState.betAmount}
        multiplier={winModalState.multiplier}
        resultMessage={winModalState.message}
        onPlayAgain={() => setWinModalState((prev) => ({ ...prev, isOpen: false }))}
        onClose={() => setWinModalState((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
