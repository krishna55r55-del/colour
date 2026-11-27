import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  HelpCircle,
  RotateCw,
  Sparkles,
  Check,
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
  Volume2,
  VolumeX,
  List,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { WinPosterModal, WinPosterData } from '../common/WinPosterModal';
import { LossPosterModal, LossPosterData } from '../common/LossPosterModal';
import { BetPlacedToast } from '../common/BetPlacedToast';
import {
  getPeriodForTime,
  getContinuousRemainingSeconds,
} from '../../utils/winLogic';
import { GameHistoryItem, WinGoRoundItem } from '../../types';

type WinGoDuration = 30 | 60 | 180 | 300;
type BetTargetType = 'green' | 'purple' | 'violet' | 'red' | 'big' | 'small' | number;
type PeriodHistory = WinGoRoundItem;

export const ColorPredictionGame: React.FC = () => {
  const {
    balance,
    playSound,
    selectGame,
    setActiveView,
    history,
    totalBetsCount,
    submitWinGoBet,
    pendingWinGoBets,
    settleWinGoBets,
    wingoRoundsByDuration,
    wingoCurrentPeriods,
    serverClockOffsetMs,
    refreshWinGoState,
    fetchPaginatedBets,
    soundEnabled,
    toggleSound,
  } = useGame();

  const [betOutcomeFilter, setBetOutcomeFilter] = useState<'all' | 'wins' | 'losses'>('all');
  const [betScopeFilter, setBetScopeFilter] = useState<'wingo' | 'all'>('wingo');
  const [showAllMyRecords, setShowAllMyRecords] = useState<boolean>(false);
  const [myRecordPage, setMyRecordPage] = useState<number>(1);
  const [myRecordItems, setMyRecordItems] = useState<GameHistoryItem[]>([]);
  const [myRecordTotalCount, setMyRecordTotalCount] = useState<number>(0);
  const [myRecordTotalPages, setMyRecordTotalPages] = useState<number>(1);
  const [myRecordHasMore, setMyRecordHasMore] = useState<boolean>(false);
  const [isMyRecordLoading, setIsMyRecordLoading] = useState<boolean>(false);
  const [isSubmittingBet, setIsSubmittingBet] = useState<boolean>(false);

  const playSoundRef = useRef(playSound);
  playSoundRef.current = playSound;

  const historyRef = useRef(history);
  historyRef.current = history;

  const serverClockOffsetRef = useRef(serverClockOffsetMs);
  serverClockOffsetRef.current = serverClockOffsetMs;

  const shownPosterPeriodsRef = useRef<Set<string>>(new Set());
  const lastSoundSecRef = useRef<number | null>(null);

  const [showBetPlacedToast, setShowBetPlacedToast] = useState(false);
  const [winPosterData, setWinPosterData] = useState<WinPosterData>({
    isOpen: false,
    selectedOption: '',
    resultNumber: 0,
    betAmount: 0,
    grossWinningAmount: 0,
    commissionDeducted: 0,
    finalCreditedAmount: 0,
  });
  const [lossPosterData, setLossPosterData] = useState<LossPosterData>({
    isOpen: false,
    selectedOption: '',
    resultNumber: 0,
    lostBetAmount: 0,
  });
  const [roundReaction, setRoundReaction] = useState<{
    type: 'win' | 'loss';
    amount: number;
    emoji: string;
    label: string;
  } | null>(null);

  // Mode selection: 30s, 1Min, 3Min, 5Min
  const [selectedDuration, setSelectedDuration] = useState<WinGoDuration>(30);

  // Official backend-generated round records and current periods
  const [historiesByDuration, setHistoriesByDuration] = useState<Record<WinGoDuration, PeriodHistory[]>>(
    () => ({
      30: wingoRoundsByDuration[30] || [],
      60: wingoRoundsByDuration[60] || [],
      180: wingoRoundsByDuration[180] || [],
      300: wingoRoundsByDuration[300] || [],
    })
  );

  const [currentPeriods, setCurrentPeriods] = useState<Record<WinGoDuration, string>>(() => ({
    30: wingoCurrentPeriods[30] || getPeriodForTime(Date.now() + serverClockOffsetMs, 30),
    60: wingoCurrentPeriods[60] || getPeriodForTime(Date.now() + serverClockOffsetMs, 60),
    180: wingoCurrentPeriods[180] || getPeriodForTime(Date.now() + serverClockOffsetMs, 180),
    300: wingoCurrentPeriods[300] || getPeriodForTime(Date.now() + serverClockOffsetMs, 300),
  }));

  const [timeLeft, setTimeLeft] = useState<number>(() =>
    getContinuousRemainingSeconds(30, Date.now() + serverClockOffsetMs)
  );

  const currentPeriodsRef = useRef(currentPeriods);
  currentPeriodsRef.current = currentPeriods;

  const selectedDurationRef = useRef<WinGoDuration>(selectedDuration);
  selectedDurationRef.current = selectedDuration;

  const lastRoundIndicesRef = useRef<Record<WinGoDuration, number>>({
    30: Math.floor((Date.now() + serverClockOffsetMs) / 30000),
    60: Math.floor((Date.now() + serverClockOffsetMs) / 60000),
    180: Math.floor((Date.now() + serverClockOffsetMs) / 180000),
    300: Math.floor((Date.now() + serverClockOffsetMs) / 300000),
  });

  // Active section's distinct numbers, bets, and period code
  const historyList = historiesByDuration[selectedDuration] || [];
  const currentPeriod =
    currentPeriods[selectedDuration] ||
    getPeriodForTime(Date.now() + serverClockOffsetMs, selectedDuration);

  // Active bets for selected duration derived from persistent pendingWinGoBets
  const activeBets = React.useMemo(() => {
    return pendingWinGoBets.filter(
      (p) => p.duration === selectedDuration || (!p.duration && selectedDuration === 30)
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
    customWagerInput: string;
  }>({
    isOpen: false,
    target: null,
    label: '',
    payoutLabel: '',
    themeColor: 'green',
    baseUnit: 10,
    quantity: 1,
    customWagerInput: '10',
  });
  const [betModalError, setBetModalError] = useState<string | null>(null);

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

  // Fetch official rounds from backend on mount
  useEffect(() => {
    refreshWinGoState();
  }, [refreshWinGoState]);

  // Sync local display state with backend official rounds whenever GameContext receives them
  useEffect(() => {
    setHistoriesByDuration({
      30: wingoRoundsByDuration[30] || [],
      60: wingoRoundsByDuration[60] || [],
      180: wingoRoundsByDuration[180] || [],
      300: wingoRoundsByDuration[300] || [],
    });
  }, [wingoRoundsByDuration]);

  useEffect(() => {
    setCurrentPeriods({
      30: wingoCurrentPeriods[30] || getPeriodForTime(Date.now() + serverClockOffsetMs, 30),
      60: wingoCurrentPeriods[60] || getPeriodForTime(Date.now() + serverClockOffsetMs, 60),
      180: wingoCurrentPeriods[180] || getPeriodForTime(Date.now() + serverClockOffsetMs, 180),
      300: wingoCurrentPeriods[300] || getPeriodForTime(Date.now() + serverClockOffsetMs, 300),
    });
  }, [wingoCurrentPeriods, serverClockOffsetMs]);

  // Resolve Round logic for a specific section duration: fetches official server outcome & settled bets
  const resolveRound = async (dur: WinGoDuration) => {
    const periodToResolve = currentPeriodsRef.current[dur];
    const outcomeKey = `${dur}_${periodToResolve}`;

    // Advance current period immediately using canonical server clock
    const nowServer = Date.now() + serverClockOffsetRef.current;
    const nextPeriodNum = getPeriodForTime(nowServer + 1000, dur);
    setCurrentPeriods((prev) => ({
      ...prev,
      [dur]: nextPeriodNum,
    }));
    currentPeriodsRef.current[dur] = nextPeriodNum;

    // Ask backend to finalize round & settle bets (backend also returns updated historiesByDuration)
    const settleRes = await settleWinGoBets();
    const serverRounds = settleRes.historiesByDuration?.[dur] || [];
    const matchedRound = serverRounds.find((r) => r.period === periodToResolve);

    // Combine settledBets returned + updated historyRef to show poster if user bet on this period
    const combinedBetsMap = new Map<string, GameHistoryItem>();
    historyRef.current.forEach((b) => combinedBetsMap.set(b.id, b));
    (settleRes.settledBets || []).forEach((b) => combinedBetsMap.set(b.id, b));

    const betsInThisPeriod = Array.from(combinedBetsMap.values()).filter(
      (b) =>
        b.gameId === 'color-prediction' &&
        b.period === periodToResolve &&
        (b.duration === dur || (!b.duration && dur === 30))
    );

    if (
      betsInThisPeriod.length > 0 &&
      selectedDurationRef.current === dur &&
      !shownPosterPeriodsRef.current.has(outcomeKey)
    ) {
      shownPosterPeriodsRef.current.add(outcomeKey);

      const totalBet = betsInThisPeriod.reduce((s, b) => s + b.betAmount, 0);
      const totalGrossPayout = betsInThisPeriod.reduce(
        (s, b) => s + (b.isWin ? b.grossPayout || b.payout : 0),
        0
      );
      const totalCommission = betsInThisPeriod.reduce(
        (s, b) => s + (b.isWin ? b.commission || 0 : 0),
        0
      );
      const totalFinalCredited = betsInThisPeriod.reduce(
        (s, b) => s + (b.isWin ? b.payout : 0),
        0
      );
      const winningOptions = betsInThisPeriod
        .filter((b) => b.isWin)
        .map((b) => b.selectedOption || b.target || 'WIN');
      const losingOptions = betsInThisPeriod
        .filter((b) => !b.isWin)
        .map((b) => b.selectedOption || b.target || 'BET');

      const drawnNumber =
        matchedRound?.number ??
        betsInThisPeriod.find((b) => typeof b.resultNumber === 'number')?.resultNumber ??
        0;
      const colorType = matchedRound?.color || 'red';
      const colorLabel =
        colorType === 'purple_red'
          ? 'Red + Violet'
          : colorType === 'purple_green'
            ? 'Green + Violet'
            : colorType === 'green'
              ? 'Green'
              : 'Red';

      if (totalFinalCredited > 0) {
        setWinPosterData({
          isOpen: true,
          selectedOption: winningOptions.join(', ') || 'WIN',
          resultNumber: drawnNumber,
          resultColor: colorLabel,
          betAmount: totalBet,
          grossWinningAmount: totalGrossPayout,
          commissionDeducted: totalCommission,
          finalCreditedAmount: totalFinalCredited,
          period: periodToResolve,
        });
        setRoundReaction({
          type: 'win',
          amount: totalFinalCredited,
          emoji: '🥳',
          label: 'WIN! CONGRATULATIONS!',
        });
        setTimeout(() => playSoundRef.current('win'), 260);
        setTimeout(() => setRoundReaction(null), 5000);
      } else {
        setLossPosterData({
          isOpen: true,
          selectedOption: losingOptions.join(', ') || 'BET',
          resultNumber: drawnNumber,
          resultColor: colorLabel,
          lostBetAmount: totalBet,
          period: periodToResolve,
        });
        setRoundReaction({
          type: 'loss',
          amount: totalBet,
          emoji: '💔',
          label: 'LOSS! NEXT ROUND!',
        });
        setTimeout(() => playSoundRef.current('loss'), 260);
        setTimeout(() => setRoundReaction(null), 5000);
      }
    }
  };

  const resolveRoundRef = useRef(resolveRound);
  resolveRoundRef.current = resolveRound;

  // Continuous Multi-Section Timer Loop synced to canonical server clock
  useEffect(() => {
    const tick = () => {
      const now = Date.now() + serverClockOffsetRef.current;
      const allModes: WinGoDuration[] = [30, 60, 180, 300];

      allModes.forEach((dur) => {
        const roundIndex = Math.floor(now / (dur * 1000));
        if (lastRoundIndicesRef.current[dur] !== roundIndex) {
          lastRoundIndicesRef.current[dur] = roundIndex;
          resolveRoundRef.current(dur);
        }
      });

      const activeDur = selectedDurationRef.current;
      const currentSec = getContinuousRemainingSeconds(activeDur, now);
      setTimeLeft(currentSec);

      if (currentSec <= 5 && currentSec >= 1) {
        if (lastSoundSecRef.current !== currentSec) {
          lastSoundSecRef.current = currentSec;
          playSoundRef.current('countdown_beep', currentSec);
        }
      } else if (currentSec === activeDur || currentSec === 0) {
        if (lastSoundSecRef.current !== 0) {
          lastSoundSecRef.current = 0;
          playSoundRef.current('round_end');
        }
      } else {
        lastSoundSecRef.current = null;
      }
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  // Re-sync official backend rounds on focus/visibilitychange
  useEffect(() => {
    const handleSync = () => {
      refreshWinGoState();
      const now = Date.now() + serverClockOffsetRef.current;
      const allModes: WinGoDuration[] = [30, 60, 180, 300];
      allModes.forEach((dur) => {
        lastRoundIndicesRef.current[dur] = Math.floor(now / (dur * 1000));
      });
      setTimeLeft(getContinuousRemainingSeconds(selectedDurationRef.current, now));
    };

    window.addEventListener('visibilitychange', handleSync);
    window.addEventListener('focus', handleSync);
    return () => {
      window.removeEventListener('visibilitychange', handleSync);
      window.removeEventListener('focus', handleSync);
    };
  }, [refreshWinGoState]);

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
    const rem = getContinuousRemainingSeconds(duration, Date.now() + serverClockOffsetRef.current);
    setTimeLeft(rem);
  };


  // Open Bet Drawer for BIG, SMALL, GREEN, VIOLET, RED, or Numbers 0-9
  const openBetDrawer = (target: BetTargetType) => {
    if (timeLeft <= 5) return; // Betting closed in last 5 seconds

    playSound('click');
    let label = '';
    let payoutLabel = '2.0X Multiplier';
    let themeColor: 'green' | 'purple' | 'red' | 'yellow' | 'blue' = 'green';

    if (typeof target === 'number') {
      label = `Number ${target}`;
      payoutLabel = '9.0X Multiplier';
      if (target === 0 || target === 5) themeColor = 'purple';
      else if ([1, 3, 7, 9].includes(target)) themeColor = 'green';
      else themeColor = 'red';
    } else if (target === 'green') {
      label = 'GREEN';
      payoutLabel = '2.0X Multiplier';
      themeColor = 'green';
    } else if (target === 'purple' || target === 'violet') {
      label = 'VIOLET';
      payoutLabel = '3.5X Multiplier';
      themeColor = 'purple';
    } else if (target === 'red') {
      label = 'RED';
      payoutLabel = '2.0X Multiplier';
      themeColor = 'red';
    } else if (target === 'big') {
      label = 'BIG';
      payoutLabel = '2.0X Multiplier';
      themeColor = 'yellow';
    } else if (target === 'small') {
      label = 'SMALL';
      payoutLabel = '2.0X Multiplier';
      themeColor = 'blue';
    }

    setBetModalError(null);
    setBetModal({
      isOpen: true,
      target,
      label,
      payoutLabel,
      themeColor,
      baseUnit: 10,
      quantity: uiMultiplier,
      customWagerInput: (10 * uiMultiplier).toString(),
    });
  };

  // Confirm bet in modal: permanently saved in backend database before confirmation
  const handleConfirmBet = async () => {
    if (betModal.target === null || betModal.target === undefined || isSubmittingBet) return;
    setBetModalError(null);
    const typed = parseInt(betModal.customWagerInput, 10);
    const totalWager =
      !isNaN(typed) && typed > 0 ? typed : betModal.baseUnit * betModal.quantity;

    if (totalWager <= 0 || balance < totalWager) {
      setBetModalError('Insufficient available balance. Please Deposit to add funds.');
      playSoundRef.current('loss');
      return;
    }

    let mult = 2.0;
    if (betModal.target === 'purple' || betModal.target === 'violet') {
      mult = 3.5;
    } else if (typeof betModal.target === 'number') {
      mult = 9.0;
    }

    setIsSubmittingBet(true);
    try {
      const res = await submitWinGoBet({
        period: currentPeriod,
        duration: selectedDuration,
        target: betModal.target,
        label: betModal.label,
        multiplier: mult,
        amount: totalWager,
        selectedOption: betModal.label,
      });

      if (res.success) {
        setBetModal((prev) => ({ ...prev, isOpen: false }));
        setBetModalError(null);
        setShowBetPlacedToast(true);
      } else {
        setBetModalError(res.error || 'Failed to place bet');
        playSoundRef.current('loss');
      }
    } finally {
      setIsSubmittingBet(false);
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

        <div className="flex items-center gap-2">
          {/* Sound ON/OFF Toggle */}
          <button
            type="button"
            onClick={toggleSound}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold transition-all border cursor-pointer ${
              soundEnabled
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 shadow-2xs'
                : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
            }`}
            title={soundEnabled ? 'Sound is ON - Click to Mute' : 'Sound is OFF - Click to Unmute'}
            aria-label="Toggle Sound Effects"
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span className="text-[11px] font-extrabold">{soundEnabled ? 'SOUND ON' : 'SOUND OFF'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playSound('click');
              setShowHowToPlay(true);
            }}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors border border-slate-200 cursor-pointer"
            title="Market Rules & Multipliers"
          >
            <HelpCircle className="w-4 h-4 text-rose-500" />
          </button>
        </div>
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

      {/* Live Win/Loss Reaction Banner on Game Board */}
      {roundReaction && (
        <div
          className={`mx-3 my-2 px-4 py-2.5 rounded-2xl border flex items-center justify-between shadow-md select-none ${
            roundReaction.type === 'win'
              ? 'bg-emerald-600 text-white border-emerald-400 animate-win-pop'
              : 'bg-red-600 text-white border-red-400 animate-loss-shake'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-xl animate-bounce">{roundReaction.emoji}</span>
            <span className="text-xs font-black uppercase tracking-wider font-display">
              {roundReaction.label}
            </span>
          </div>
          <span className="font-mono font-black text-sm tabular-nums">
            {roundReaction.type === 'win'
              ? `+₹${roundReaction.amount.toFixed(2)}`
              : `-₹${roundReaction.amount.toFixed(2)}`}
          </span>
        </div>
      )}

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

        {/* Five Betting Options: GREEN (2x), VIOLET (3.5x), RED (2x), BIG (2x), SMALL (2x) */}
        <div className="space-y-3 pb-1">
          {/* Row 1: GREEN, VIOLET, RED */}
          <div className="grid grid-cols-3 gap-2.5">
            <button
              type="button"
              disabled={timeLeft <= 5}
              onClick={() => openBetDrawer('green')}
              className="py-4 px-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-sm tracking-wide shadow-lg shadow-emerald-600/30 active:scale-98 transition-all disabled:opacity-40 flex flex-col items-center justify-center cursor-pointer font-display"
            >
              <span className="text-base font-black">GREEN</span>
              <span className="text-[11px] font-semibold opacity-90">2x</span>
            </button>

            <button
              type="button"
              disabled={timeLeft <= 5}
              onClick={() => openBetDrawer('purple')}
              className="py-4 px-2 rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-black text-sm tracking-wide shadow-lg shadow-purple-600/30 active:scale-98 transition-all disabled:opacity-40 flex flex-col items-center justify-center cursor-pointer font-display"
            >
              <span className="text-base font-black">VIOLET</span>
              <span className="text-[11px] font-semibold opacity-90">3.5x</span>
            </button>

            <button
              type="button"
              disabled={timeLeft <= 5}
              onClick={() => openBetDrawer('red')}
              className="py-4 px-2 rounded-2xl bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 text-white font-black text-sm tracking-wide shadow-lg shadow-rose-600/30 active:scale-98 transition-all disabled:opacity-40 flex flex-col items-center justify-center cursor-pointer font-display"
            >
              <span className="text-base font-black">RED</span>
              <span className="text-[11px] font-semibold opacity-90">2x</span>
            </button>
          </div>

          {/* Number Betting Grid: 0 to 9 (9x Multiplier) */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Select Number
              </span>
              <span className="text-[11px] font-black text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                9x Payout
              </span>
            </div>
            <div className="grid grid-cols-5 gap-2.5 justify-items-center">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  disabled={timeLeft <= 5}
                  onClick={() => openBetDrawer(num)}
                  className="cursor-pointer disabled:opacity-40 transition-transform hover:scale-105 active:scale-95 focus:outline-none"
                  aria-label={`Bet on Number ${num}`}
                >
                  {renderBall(num, 'md')}
                </button>
              ))}
            </div>
          </div>

          {/* Row 2: BIG and SMALL (BIG must display only BIG; SMALL must display only SMALL. No extra text, symbols or numbers) */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={timeLeft <= 5}
              onClick={() => openBetDrawer('big')}
              className="py-4 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-base uppercase tracking-wider shadow-md active:scale-98 transition-all disabled:opacity-40 flex items-center justify-center cursor-pointer font-display"
            >
              <span>BIG</span>
            </button>

            <button
              type="button"
              disabled={timeLeft <= 5}
              onClick={() => openBetDrawer('small')}
              className="py-4 px-4 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-black text-base uppercase tracking-wider shadow-md active:scale-98 transition-all disabled:opacity-40 flex items-center justify-center cursor-pointer font-display"
            >
              <span>SMALL</span>
            </button>
          </div>

          {/* Quick Multiplier Bar */}
          <div className="flex items-center justify-between gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[11px] font-extrabold uppercase text-slate-400 px-1">Order Multiplier:</span>
            <div className="flex items-center gap-1.5 flex-1 justify-end">
              {[1, 5, 10, 20, 50].map((mult) => (
                <button
                  key={mult}
                  type="button"
                  onClick={() => {
                    playSound('click');
                    setUiMultiplier(mult);
                  }}
                  className={`py-1.5 px-3 rounded-lg font-black text-xs text-center transition-all border cursor-pointer ${
                    uiMultiplier === mult
                      ? 'bg-rose-500 text-white border-rose-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  X{mult}
                </button>
              ))}
            </div>
          </div>
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

          {/* Tab 3: My Game Record (Latest 10 + VIEW ALL paginated database history) */}
          {bottomTab === 'my_record' && (
            <MyRecordTabContent
              betScopeFilter={betScopeFilter}
              setBetScopeFilter={setBetScopeFilter}
              betOutcomeFilter={betOutcomeFilter}
              setBetOutcomeFilter={setBetOutcomeFilter}
              showAllMyRecords={showAllMyRecords}
              setShowAllMyRecords={setShowAllMyRecords}
              myRecordPage={myRecordPage}
              setMyRecordPage={setMyRecordPage}
              myRecordItems={myRecordItems}
              setMyRecordItems={setMyRecordItems}
              myRecordTotalCount={myRecordTotalCount}
              setMyRecordTotalCount={setMyRecordTotalCount}
              myRecordTotalPages={myRecordTotalPages}
              setMyRecordTotalPages={setMyRecordTotalPages}
              myRecordHasMore={myRecordHasMore}
              setMyRecordHasMore={setMyRecordHasMore}
              isMyRecordLoading={isMyRecordLoading}
              setIsMyRecordLoading={setIsMyRecordLoading}
              fetchPaginatedBets={fetchPaginatedBets}
              history={history}
              totalBetsCount={totalBetsCount}
              playSound={playSound}
            />
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
              {/* Keyboard Input for Wager Amount */}
              <div>
                <label className="block text-slate-700 font-bold mb-1.5 uppercase text-[10px] tracking-wider flex items-center justify-between">
                  <span>Wager Amount (Type with Keyboard)</span>
                  <span className="text-[10px] text-slate-400 font-mono font-medium">
                    Avail: ₹{balance.toLocaleString()}
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold text-sm">
                    ₹
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Type bet amount"
                    value={betModal.customWagerInput}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      const parsed = parseInt(raw, 10);
                      setBetModal((prev) => ({
                        ...prev,
                        customWagerInput: raw,
                        baseUnit: !isNaN(parsed) && parsed > 0 ? parsed : 0,
                        quantity: 1,
                      }));
                    }}
                    onBlur={() => {
                      const parsed = parseInt(betModal.customWagerInput, 10);
                      if (isNaN(parsed) || parsed <= 0) {
                        setBetModal((prev) => ({
                          ...prev,
                          customWagerInput: '10',
                          baseUnit: 10,
                          quantity: 1,
                        }));
                      }
                    }}
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-rose-500 font-mono font-black text-base text-slate-900 focus:outline-none transition-colors"
                  />
                </div>
              </div>

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
                        const total = unit * betModal.quantity;
                        setBetModal((prev) => ({
                          ...prev,
                          baseUnit: unit,
                          customWagerInput: total.toString(),
                        }));
                      }}
                      className={`py-2 rounded-xl font-bold border transition-all cursor-pointer ${
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
                      const newQty = Math.max(1, betModal.quantity - 1);
                      const total = betModal.baseUnit * newQty;
                      setBetModal((prev) => ({
                        ...prev,
                        quantity: newQty,
                        customWagerInput: total.toString(),
                      }));
                    }}
                    className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center border border-slate-200 cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <input
                    type="text"
                    inputMode="numeric"
                    value={betModal.quantity}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      const q = Math.max(1, parseInt(raw, 10) || 1);
                      const total = betModal.baseUnit * q;
                      setBetModal((prev) => ({
                        ...prev,
                        quantity: q,
                        customWagerInput: total.toString(),
                      }));
                    }}
                    className="flex-1 h-10 bg-slate-50 border border-slate-200 rounded-xl text-center font-black text-lg font-mono text-slate-900 tabular-nums focus:outline-none focus:border-rose-500 focus:bg-white"
                  />

                  <button
                    type="button"
                    onClick={() => {
                      playSound('click');
                      const newQty = betModal.quantity + 1;
                      const total = betModal.baseUnit * newQty;
                      setBetModal((prev) => ({
                        ...prev,
                        quantity: newQty,
                        customWagerInput: total.toString(),
                      }));
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
                        const total = betModal.baseUnit * m;
                        setBetModal((prev) => ({
                          ...prev,
                          quantity: m,
                          customWagerInput: total.toString(),
                        }));
                      }}
                      className={`py-1.5 rounded-lg font-bold text-xs border cursor-pointer ${
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
                    ₹{(parseInt(betModal.customWagerInput, 10) || betModal.baseUnit * betModal.quantity).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200/60 font-medium">
                  <span>Platform Service Fee</span>
                  <span className="font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                    2.4% commission on winning payouts
                  </span>
                </div>
              </div>

              {/* Calculation & Inline Error */}
              {betModalError && (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold text-center">
                  {betModalError}
                </div>
              )}

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
                  disabled={isSubmittingBet}
                  onClick={handleConfirmBet}
                  className="flex-2 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white font-black text-sm shadow-md active:scale-98 transition-all cursor-pointer disabled:opacity-60"
                >
                  {isSubmittingBet
                    ? 'Saving Order...'
                    : `Confirm Order (₹${(
                        parseInt(betModal.customWagerInput, 10) ||
                        betModal.baseUnit * betModal.quantity
                      ).toLocaleString()})`}
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
                <strong className="text-slate-900">1. Betting Options &amp; Exact Multipliers:</strong>
                <br />
                • <strong>Numbers 0–9:</strong> 9x Multiplier (Exact drawn number match)
                <br />
                • <strong>BIG:</strong> 2x Multiplier (Drawn numbers 5, 6, 7, 8, 9)
                <br />
                • <strong>SMALL:</strong> 2x Multiplier (Drawn numbers 0, 1, 2, 3, 4)
                <br />
                • <strong>GREEN:</strong> 2x Multiplier (Drawn numbers 1, 3, 5, 7, 9)
                <br />
                • <strong>RED:</strong> 2x Multiplier (Drawn numbers 0, 2, 4, 6, 8)
                <br />
                • <strong>VIOLET:</strong> 3.5x Multiplier (Drawn numbers 0 and 5)
              </p>

              <p>
                <strong>2. Platform Winning Commission (2.4%):</strong>
                <br />
                • A 2.4% platform commission is deducted on every gross winning payout.
                <br />
                • Calculation: Gross Winning Amount - (Gross × 2.4%) = Net Credited Amount.
                <br />
                • No commission is charged on losing bets.
              </p>

              <p>
                <strong>3. Timing &amp; Countdown:</strong>
                <br />
                • Orders are open until 5 seconds prior to draw. During the final 5 seconds, an audio beep sequence guides the countdown and results resolve automatically.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowHowToPlay(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs mt-2 transition-colors cursor-pointer"
            >
              Close Rules
            </button>
          </div>
        </div>
      )}

      {/* Requirement 7: Green Bet Placed Successfully Notification */}
      <BetPlacedToast
        show={showBetPlacedToast}
        onClose={() => setShowBetPlacedToast(false)}
        message="BET PLACED SUCCESSFULLY"
        durationMs={2000}
      />

      {/* Requirement 4: Win Congratulations Poster (Green Theme) */}
      <WinPosterModal
        data={winPosterData}
        onClose={() => setWinPosterData((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Requirement 6: Loss Unfortunately Poster (Red Theme) */}
      <LossPosterModal
        data={lossPosterData}
        onClose={() => setLossPosterData((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

interface MyRecordTabProps {
  betScopeFilter: 'wingo' | 'all';
  setBetScopeFilter: (s: 'wingo' | 'all') => void;
  betOutcomeFilter: 'all' | 'wins' | 'losses';
  setBetOutcomeFilter: (o: 'all' | 'wins' | 'losses') => void;
  showAllMyRecords: boolean;
  setShowAllMyRecords: (v: boolean) => void;
  myRecordPage: number;
  setMyRecordPage: (p: number) => void;
  myRecordItems: GameHistoryItem[];
  setMyRecordItems: React.Dispatch<React.SetStateAction<GameHistoryItem[]>>;
  myRecordTotalCount: number;
  setMyRecordTotalCount: (c: number) => void;
  myRecordTotalPages: number;
  setMyRecordTotalPages: (p: number) => void;
  myRecordHasMore: boolean;
  setMyRecordHasMore: (h: boolean) => void;
  isMyRecordLoading: boolean;
  setIsMyRecordLoading: (l: boolean) => void;
  fetchPaginatedBets: (params: {
    page?: number;
    limit?: number;
    gameId?: string;
    outcome?: 'all' | 'wins' | 'losses';
    status?: 'all' | 'Completed' | 'Pending';
  }) => Promise<any>;
  history: GameHistoryItem[];
  totalBetsCount: number;
  playSound: (type: any) => void;
}

const MyRecordTabContent: React.FC<MyRecordTabProps> = ({
  betScopeFilter,
  setBetScopeFilter,
  betOutcomeFilter,
  setBetOutcomeFilter,
  showAllMyRecords,
  setShowAllMyRecords,
  myRecordPage,
  setMyRecordPage,
  myRecordItems,
  setMyRecordItems,
  myRecordTotalCount,
  setMyRecordTotalCount,
  myRecordTotalPages,
  setMyRecordTotalPages,
  myRecordHasMore,
  setMyRecordHasMore,
  isMyRecordLoading,
  setIsMyRecordLoading,
  fetchPaginatedBets,
  history,
  totalBetsCount,
  playSound,
}) => {
  const loadRecords = React.useCallback(
    async (page: number, append: boolean, viewAll: boolean) => {
      setIsMyRecordLoading(true);
      try {
        const res = await fetchPaginatedBets({
          page,
          limit: viewAll ? 20 : 10,
          gameId: betScopeFilter === 'wingo' ? 'color-prediction' : 'all',
          outcome: betOutcomeFilter,
          status: 'Completed',
        });
        if (res.success) {
          setMyRecordItems((prev) => {
            if (!append) return res.items;
            const seen = new Set(prev.map((x) => x.id));
            return [...prev, ...res.items.filter((x: GameHistoryItem) => !seen.has(x.id))];
          });
          setMyRecordTotalCount(res.totalCount);
          setMyRecordTotalPages(res.totalPages);
          setMyRecordHasMore(res.hasMore);
          setMyRecordPage(res.page);
        }
      } finally {
        setIsMyRecordLoading(false);
      }
    },
    [
      betScopeFilter,
      betOutcomeFilter,
      fetchPaginatedBets,
      setIsMyRecordLoading,
      setMyRecordHasMore,
      setMyRecordItems,
      setMyRecordPage,
      setMyRecordTotalCount,
      setMyRecordTotalPages,
    ]
  );

  useEffect(() => {
    if (!showAllMyRecords || myRecordPage === 1) {
      loadRecords(1, false, showAllMyRecords);
    }
  }, [betScopeFilter, betOutcomeFilter, showAllMyRecords, totalBetsCount, history, loadRecords]);

  return (
    <div className="space-y-3 py-1 text-xs">
      {/* Controls bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-2xl bg-slate-50 border border-slate-200">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-extrabold uppercase text-slate-400">View:</span>
          <button
            type="button"
            onClick={() => {
              playSound('click');
              setBetScopeFilter('wingo');
              setMyRecordPage(1);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              betScopeFilter === 'wingo'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            Win Go Bets
          </button>
          <button
            type="button"
            onClick={() => {
              playSound('click');
              setBetScopeFilter('all');
              setMyRecordPage(1);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              betScopeFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            All Games
          </button>

          <button
            type="button"
            onClick={() => {
              playSound('click');
              const next = !showAllMyRecords;
              setShowAllMyRecords(next);
              setMyRecordPage(1);
              loadRecords(1, false, next);
            }}
            className={`px-3 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider cursor-pointer flex items-center gap-1 transition-all ${
              showAllMyRecords
                ? 'bg-slate-800 text-white'
                : 'bg-rose-100 text-rose-700 border border-rose-300 hover:bg-rose-200'
            }`}
          >
            <List className="w-3 h-3" />
            <span>{showAllMyRecords ? 'LATEST 10' : `VIEW ALL (${myRecordTotalCount})`}</span>
          </button>
        </div>

        {/* Outcome filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-extrabold uppercase text-slate-400">Result:</span>
          <button
            type="button"
            onClick={() => {
              playSound('click');
              setBetOutcomeFilter('all');
              setMyRecordPage(1);
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
              setBetOutcomeFilter('wins');
              setMyRecordPage(1);
            }}
            className={`px-2 py-0.5 rounded-md text-[11px] font-black cursor-pointer transition-all flex items-center gap-1 ${
              betOutcomeFilter === 'wins'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100'
            }`}
          >
            <Trophy className="w-3 h-3 text-emerald-600" />
            <span>Win</span>
          </button>
          <button
            type="button"
            onClick={() => {
              playSound('click');
              setBetOutcomeFilter('losses');
              setMyRecordPage(1);
            }}
            className={`px-2 py-0.5 rounded-md text-[11px] font-black cursor-pointer transition-all flex items-center gap-1 ${
              betOutcomeFilter === 'losses'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-red-50 text-red-700 border border-red-300 hover:bg-red-100'
            }`}
          >
            <Frown className="w-3 h-3 text-red-600" />
            <span>Loss</span>
          </button>
        </div>
      </div>

      {/* Betting History List */}
      {isMyRecordLoading && myRecordItems.length === 0 ? (
        <div className="py-10 text-center rounded-2xl bg-slate-50 border border-slate-200 text-slate-500 font-semibold">
          Loading records...
        </div>
      ) : myRecordItems.filter((item) => item.status !== 'Pending').length > 0 ? (
        <div className="space-y-2">
          {myRecordItems
            .filter((item) => item.status !== 'Pending')
            .map((item, idx) => {
              const isWin = item.isWin;
              const betTargetLabel =
                item.selectedOption ||
                (item.target
                  ? !isNaN(Number(item.target))
                    ? `Number ${item.target}`
                    : item.target.toUpperCase()
                  : item.choice.replace(/\s*\[Issue\s+.*?\]/g, '').trim());

              return (
                <div
                  key={item.id || idx}
                  className={`p-3 rounded-2xl border flex items-center justify-between gap-2 select-none ${
                    isWin
                      ? 'bg-emerald-50/90 border-emerald-300'
                      : 'bg-red-50/90 border-red-300'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider shadow-xs shrink-0 ${
                        isWin ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                      }`}
                    >
                      {isWin ? 'WIN' : 'LOSS'}
                    </span>

                    {betTargetLabel && (
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wide border truncate ${
                          isWin
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
                      isWin ? 'text-emerald-700' : 'text-red-600'
                    }`}
                  >
                    {isWin
                      ? `+₹${Number(item.payout || 0).toFixed(2).replace(/\.00$/, '')}`
                      : `-₹${Number(item.betAmount || 0).toFixed(2).replace(/\.00$/, '')}`}
                  </span>
                </div>
              );
            })}

          {/* VIEW ALL CTA when showing latest 10 */}
          {!showAllMyRecords && myRecordTotalCount > 10 && (
            <button
              type="button"
              onClick={() => {
                playSound('click');
                setShowAllMyRecords(true);
                setMyRecordPage(1);
                loadRecords(1, false, true);
              }}
              className="w-full py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-black text-xs uppercase tracking-wider cursor-pointer transition-colors"
            >
              VIEW ALL ({myRecordTotalCount} BETS)
            </button>
          )}

          {/* Pagination & Load More in VIEW ALL Mode */}
          {showAllMyRecords && (myRecordHasMore || myRecordTotalPages > 1) && (
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              {myRecordHasMore ? (
                <button
                  type="button"
                  disabled={isMyRecordLoading}
                  onClick={() => {
                    playSound('click');
                    loadRecords(myRecordPage + 1, true, true);
                  }}
                  className="w-full sm:w-auto px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-black text-[11px] uppercase cursor-pointer disabled:opacity-50"
                >
                  {isMyRecordLoading
                    ? 'Loading...'
                    : `Load More (${myRecordTotalCount - myRecordItems.length} left)`}
                </button>
              ) : (
                <span className="text-[11px] font-bold text-slate-500">
                  All {myRecordTotalCount} bets shown
                </span>
              )}

              <div className="flex items-center gap-1.5 text-[11px]">
                <button
                  type="button"
                  disabled={myRecordPage <= 1 || isMyRecordLoading}
                  onClick={() => {
                    playSound('click');
                    loadRecords(myRecordPage - 1, false, true);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold flex items-center gap-0.5 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-3 h-3" />
                  <span>Prev</span>
                </button>
                <span className="font-mono font-bold text-slate-700 px-1.5">
                  {myRecordPage} / {myRecordTotalPages}
                </span>
                <button
                  type="button"
                  disabled={myRecordPage >= myRecordTotalPages || isMyRecordLoading}
                  onClick={() => {
                    playSound('click');
                    loadRecords(myRecordPage + 1, false, true);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold flex items-center gap-0.5 disabled:opacity-40 cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="py-10 text-center rounded-2xl bg-slate-50 border border-slate-200 text-slate-400 font-medium">
          <p className="text-xs">No betting records match this filter.</p>
          <p className="text-[11px] text-slate-400 mt-1">
            Place orders above on BIG, SMALL, GREEN, VIOLET, or RED to start playing!
          </p>
        </div>
      )}
    </div>
  );
};
