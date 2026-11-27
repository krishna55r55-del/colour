import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import {
  GameId,
  GameHistoryItem,
  UserStats,
  ViewType,
  UserProfile,
  BankAccountDetails,
  WithdrawRecord,
  DepositRecord,
  DailyBonusState,
  WinGoBetOrderInput,
  ReferralRecord,
  ReferralMilestoneBonus,
  ReferralStats,
  WinGoRoundItem,
  PaginatedBetsResponse,
} from '../types';
import { soundManager } from '../utils/audio';
import {
  parsePeriodToTimestamp,
  getPeriodForTime,
  getDeterministicNumberForRound,
  getFinalizedRound,
  determineWinGoOutcome,
  evaluateWinGoBet,
  BetOrderEval,
} from '../utils/winLogic';
import {
  syncUserProfile,
  updateWalletBalanceInSupabase,
  recordBetInSupabase,
  updateBetOutcomeInSupabase,
  fetchBetHistoryFromSupabase,
  recordGameRoundInSupabase,
  recordDepositInSupabase,
  updateDepositStatusInSupabase,
  fetchAllDepositsFromSupabase,
  recordWithdrawalInSupabase,
  saveBankDetailsToSupabase,
  recordDailyBonusInSupabase,
} from '../lib/supabase';

interface GameContextType {
  balance: number;
  history: GameHistoryItem[];
  totalBetsCount: number;
  stats: UserStats;
  recentlyPlayed: GameId[];
  soundEnabled: boolean;
  activeView: ViewType;
  selectedGameId: GameId | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  savedBankDetails: BankAccountDetails | null;
  withdrawRecords: WithdrawRecord[];
  depositRecords: DepositRecord[];
  refreshAccountState: () => Promise<void>;
  fetchPaginatedBets: (params: {
    page?: number;
    limit?: number;
    gameId?: string;
    outcome?: 'all' | 'wins' | 'losses';
    status?: 'all' | 'Completed' | 'Pending';
  }) => Promise<PaginatedBetsResponse>;
  login: (phoneNumber: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (
    phoneNumber: string,
    password: string,
    confirmPassword: string,
    inviteCode?: string
  ) => Promise<{ success: boolean; error?: string }>;
  sendPasswordResetOtp: (
    phoneNumber: string
  ) => Promise<{ success: boolean; message?: string; error?: string }>;
  resetPasswordWithOtp: (
    phoneNumber: string,
    otp: string,
    newPassword: string,
    confirmPassword: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  toggleSound: () => void;
  setActiveView: (view: ViewType) => void;
  selectGame: (id: GameId | null) => void;
  placeBet: (amount: number) => boolean;
  refundBet: (amount: number) => void;
  submitWinGoBet: (
    order: WinGoBetOrderInput
  ) => Promise<{ success: boolean; bet?: GameHistoryItem; betId?: string; error?: string }>;
  pendingWinGoBets: GameHistoryItem[];
  settleWinGoBets: () => Promise<{
    settledBets: GameHistoryItem[];
    historiesByDuration?: Record<number, WinGoRoundItem[]>;
    currentPeriods?: Record<number, string>;
    serverTimeMs?: number;
  }>;
  wingoRoundsByDuration: Record<number, WinGoRoundItem[]>;
  wingoCurrentPeriods: Record<number, string>;
  serverClockOffsetMs: number;
  refreshWinGoState: () => Promise<void>;
  recordGameResult: (item: Omit<GameHistoryItem, 'id' | 'timestamp'>) => Promise<void>;
  submitDepositRequest: (data: {
    amount: number;
    bonus: number;
    method: string;
    utr: string;
    screenshot?: string;
  }) => Promise<{ success: boolean; record?: DepositRecord; error?: string }>;
  isAdminUnlocked: boolean;
  unlockAdmin: (passcode: string) => Promise<{ success: boolean; error?: string }>;
  exitAdmin: () => void;
  approveDepositRequest: (depositId: string) => Promise<{ success: boolean; error?: string }>;
  rejectDepositRequest: (
    depositId: string,
    reason?: string
  ) => Promise<{ success: boolean; error?: string }>;
  masterDepositRequests: DepositRecord[];
  refreshMasterDeposits: () => Promise<void>;
  saveBankDetails: (details: BankAccountDetails) => Promise<{ success: boolean; error?: string }>;
  submitWithdrawal: (
    amount: number,
    details: BankAccountDetails
  ) => Promise<{ success: boolean; error?: string; record?: WithdrawRecord }>;
  winManagerEnabled: boolean;
  setWinManagerEnabled: (enabled: boolean) => void;
  playSound: (
    type:
      | 'click'
      | 'bet'
      | 'tick'
      | 'card'
      | 'flip'
      | 'win'
      | 'jackpot'
      | 'loss'
      | 'countdown_beep'
      | 'round_end',
    arg?: number
  ) => void;
  dailyBonus: DailyBonusState;
  claimDailyBonus: () => Promise<{ success: boolean; amount: number; day: number; error?: string }>;
  isClaimingDailyBonus: boolean;
  canClaimDailyBonus: boolean;
  timeUntilNextBonus: number;
  isDailyBonusModalOpen: boolean;
  setIsDailyBonusModalOpen: (open: boolean) => void;
  hasCompletedFirstDeposit: boolean;
  showFirstDepositPrompt: boolean;
  setShowFirstDepositPrompt: (open: boolean) => void;
  firstDepositPromptMessage: string;
  userReferrals: ReferralRecord[];
  userReferralBonuses: ReferralMilestoneBonus[];
  referralStats: ReferralStats;
}

export const DAILY_BONUS_TIERS = [
  { day: 1, points: 50, label: 'Day 1' },
  { day: 2, points: 75, label: 'Day 2' },
  { day: 3, points: 100, label: 'Day 3' },
  { day: 4, points: 150, label: 'Day 4' },
  { day: 5, points: 200, label: 'Day 5' },
  { day: 6, points: 300, label: 'Day 6' },
  { day: 7, points: 500, label: 'Day 7 VIP' },
];

const STORAGE_KEY_SOUND = 'cobclub_sound_pref_v1';
const STORAGE_KEY_RECENT = 'cobclub_recent_games_v1';
const STORAGE_KEY_ACCOUNTS = 'cobclub_accounts_v1';
const STORAGE_KEY_AUTH_USER = 'cobclub_auth_user_v1';
const STORAGE_KEY_MASTER_DEPOSITS = 'cobclub_master_deposits_v1';
const STORAGE_KEY_REFERRALS = 'cobclub_referrals_v1';
const STORAGE_KEY_REFERRAL_BONUSES = 'cobclub_referral_bonuses_v1';
const STORAGE_KEY_WINGO_OUTCOMES = 'cobclub_wingo_round_outcomes_v1';
const STORAGE_KEY_ADMIN_SESSION = 'cobclub_admin_session';

const ADMIN_PASSCODE = 'Sweta@1212';

export const REFERRAL_REWARD_AMOUNT = 77;
export const REFERRAL_MILESTONE_TARGET = 5;
export const REFERRAL_MILESTONE_BONUS = 355;
export const BONUS_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export const defaultDailyBonus: DailyBonusState = {
  lastClaimedAt: null,
  streak: 0,
  totalClaimed: 0,
  history: [],
};

const INITIAL_BALANCE = 98;

const defaultStats: UserStats = {
  totalRounds: 0,
  totalWins: 0,
  totalLosses: 0,
  totalWagered: 0,
  totalWon: 0,
  biggestWin: 0,
  currentStreak: 0,
  bestStreak: 0,
  favoriteGameId: null,
};

interface StoredAccount {
  phoneNumber: string;
  password: string;
  memberId: string;
  registeredAt: number;
  referredBy?: string;
  balance: number;
  hasCompletedFirstDeposit: boolean;
  dailyBonus: DailyBonusState;
  history: GameHistoryItem[];
  savedBankDetails: BankAccountDetails | null;
  withdrawRecords: WithdrawRecord[];
  depositRecords: DepositRecord[];
}

const readJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

const normalizePhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  if (digits.length > 10 && digits.startsWith('91')) {
    return digits.slice(-10);
  }
  return digits;
};

const computeStats = (items: GameHistoryItem[]): UserStats => {
  const completed = items.filter((b) => b.status !== 'Pending');
  if (completed.length === 0) return { ...defaultStats };

  let totalWins = 0;
  let totalLosses = 0;
  let totalWagered = 0;
  let totalWon = 0;
  let biggestWin = 0;
  let bestStreak = 0;
  let runningStreak = 0;
  const counts: Record<string, number> = {};

  const chronological = [...completed].sort((a, b) => a.timestamp - b.timestamp);
  chronological.forEach((b) => {
    totalWagered += Number(b.betAmount || 0);
    counts[b.gameId] = (counts[b.gameId] || 0) + 1;
    if (b.isWin) {
      totalWins += 1;
      const payout = Number(b.payout || 0);
      totalWon += payout;
      if (payout > biggestWin) biggestWin = payout;
      runningStreak += 1;
      if (runningStreak > bestStreak) bestStreak = runningStreak;
    } else {
      totalLosses += 1;
      runningStreak = 0;
    }
  });

  let favoriteGameId: GameId | null = null;
  let maxCount = 0;
  Object.entries(counts).forEach(([gid, cnt]) => {
    if (cnt > maxCount) {
      maxCount = cnt;
      favoriteGameId = gid as GameId;
    }
  });

  return {
    totalRounds: completed.length,
    totalWins,
    totalLosses,
    totalWagered: Number(totalWagered.toFixed(2)),
    totalWon: Number(totalWon.toFixed(2)),
    biggestWin: Number(biggestWin.toFixed(2)),
    currentStreak: runningStreak,
    bestStreak,
    favoriteGameId,
  };
};

const numberToRoundItem = (period: string, num: number): WinGoRoundItem => {
  let color: WinGoRoundItem['color'] = 'red';
  if (num === 0) color = 'purple_red';
  else if (num === 5) color = 'purple_green';
  else if ([1, 3, 7, 9].includes(num)) color = 'green';
  return {
    period,
    number: num,
    bigSmall: num >= 5 ? 'Big' : 'Small',
    color,
  };
};

const buildContinuousHistory = (
  duration: number,
  count: number,
  settledOutcomes: Record<string, WinGoRoundItem>,
  hist: GameHistoryItem[],
  nowMs: number = Date.now()
): WinGoRoundItem[] => {
  const currentRoundIdx = Math.floor(nowMs / (duration * 1000));
  const rounds: WinGoRoundItem[] = [];

  for (let i = 1; i <= count; i++) {
    const targetRoundIdx = currentRoundIdx - i;
    const roundStartMs = targetRoundIdx * duration * 1000;
    const period = getPeriodForTime(roundStartMs, duration);
    const key = `${duration}_${period}`;

    if (settledOutcomes[key]) {
      rounds.push(settledOutcomes[key]);
      continue;
    }

    const settledBet = hist.find(
      (h) =>
        h.gameId === 'color-prediction' &&
        h.status === 'Completed' &&
        h.period === period &&
        (h.duration === duration || (!h.duration && duration === 30)) &&
        typeof h.resultNumber === 'number'
    );

    if (settledBet && typeof settledBet.resultNumber === 'number') {
      rounds.push(numberToRoundItem(period, settledBet.resultNumber));
      continue;
    }

    const fin = getFinalizedRound(period, duration);
    rounds.push({
      period: fin.period,
      number: fin.number,
      bigSmall: fin.bigSmall,
      color: fin.color,
    });
  }

  return rounds;
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [balance, setBalance] = useState<number>(INITIAL_BALANCE);
  const [hasCompletedFirstDeposit, setHasCompletedFirstDeposit] = useState<boolean>(false);
  const [history, setHistory] = useState<GameHistoryItem[]>([]);
  const [totalBetsCount, setTotalBetsCount] = useState<number>(0);
  const [stats, setStats] = useState<UserStats>(defaultStats);
  const [savedBankDetails, setSavedBankDetails] = useState<BankAccountDetails | null>(null);
  const [withdrawRecords, setWithdrawRecords] = useState<WithdrawRecord[]>([]);
  const [depositRecords, setDepositRecords] = useState<DepositRecord[]>([]);
  const [dailyBonus, setDailyBonus] = useState<DailyBonusState>(defaultDailyBonus);
  const [canClaimDailyBonus, setCanClaimDailyBonus] = useState<boolean>(true);
  const [timeUntilNextBonus, setTimeUntilNextBonus] = useState<number>(0);
  const [isClaimingDailyBonus, setIsClaimingDailyBonus] = useState<boolean>(false);
  const [isDailyBonusModalOpen, setIsDailyBonusModalOpen] = useState<boolean>(false);
  const [userReferrals, setUserReferrals] = useState<ReferralRecord[]>([]);
  const [userReferralBonuses, setUserReferralBonuses] = useState<ReferralMilestoneBonus[]>([]);

  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY_ADMIN_SESSION) === 'true';
    } catch {
      return false;
    }
  });
  const [masterDepositRequests, setMasterDepositRequests] = useState<DepositRecord[]>(() =>
    readJson<DepositRecord[]>(STORAGE_KEY_MASTER_DEPOSITS, [])
  );

  const settledOutcomesRef = useRef<Record<string, WinGoRoundItem>>(
    readJson<Record<string, WinGoRoundItem>>(STORAGE_KEY_WINGO_OUTCOMES, {})
  );

  const [wingoRoundsByDuration, setWingoRoundsByDuration] = useState<
    Record<number, WinGoRoundItem[]>
  >(() => {
    const now = Date.now();
    const outcomes = settledOutcomesRef.current;
    return {
      30: buildContinuousHistory(30, 50, outcomes, [], now),
      60: buildContinuousHistory(60, 50, outcomes, [], now),
      180: buildContinuousHistory(180, 50, outcomes, [], now),
      300: buildContinuousHistory(300, 50, outcomes, [], now),
    };
  });

  const [wingoCurrentPeriods, setWingoCurrentPeriods] = useState<Record<number, string>>(() => ({
    30: getPeriodForTime(Date.now(), 30),
    60: getPeriodForTime(Date.now(), 60),
    180: getPeriodForTime(Date.now(), 180),
    300: getPeriodForTime(Date.now(), 300),
  }));
  const [serverClockOffsetMs] = useState<number>(0);

  const [recentlyPlayed, setRecentlyPlayed] = useState<GameId[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RECENT);
      return saved ? JSON.parse(saved) : ['color-prediction', 'dice-roll', 'spin-wheel'];
    } catch {
      return ['color-prediction', 'dice-roll', 'spin-wheel'];
    }
  });

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SOUND);
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const [activeView, setActiveView] = useState<ViewType>('home');
  const [selectedGameId, setSelectedGameId] = useState<GameId | null>(null);
  const [showFirstDepositPrompt, setShowFirstDepositPrompt] = useState<boolean>(false);
  const [firstDepositPromptMessage, setFirstDepositPromptMessage] = useState<string>(
    'Deposit 1 time to play with bonus money'
  );
  const [winManagerEnabled, setWinManagerEnabled] = useState<boolean>(false);

  const userRef = useRef(user);
  userRef.current = user;
  const balanceRef = useRef(balance);
  balanceRef.current = balance;
  const historyRef = useRef(history);
  historyRef.current = history;
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;
  const winManagerEnabledRef = useRef(winManagerEnabled);
  winManagerEnabledRef.current = winManagerEnabled;
  const isClaimingRef = useRef(false);
  const isSettlingRef = useRef(false);
  const otpStoreRef = useRef<Record<string, { otp: string; expiresAt: number }>>({});

  const playSound = useCallback(
    (
      type:
        | 'click'
        | 'bet'
        | 'tick'
        | 'card'
        | 'flip'
        | 'win'
        | 'jackpot'
        | 'loss'
        | 'countdown_beep'
        | 'round_end',
      arg?: number
    ) => {
      if (soundEnabledRef.current) {
        soundManager.play(type, arg);
      }
    },
    []
  );

  const toggleSound = () => {
    const next = !soundEnabledRef.current;
    soundEnabledRef.current = next;
    setSoundEnabled(next);
    if (next) soundManager.play('click');
  };

  useEffect(() => {
    writeJson(STORAGE_KEY_RECENT, recentlyPlayed);
  }, [recentlyPlayed]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SOUND, soundEnabled.toString());
    } catch {}
  }, [soundEnabled]);

  const persistCurrentAccount = useCallback((updater: (acc: StoredAccount) => StoredAccount) => {
    const currentUser = userRef.current;
    if (!currentUser) return null;
    const accounts = readJson<Record<string, StoredAccount>>(STORAGE_KEY_ACCOUNTS, {});
    const existing = accounts[currentUser.phoneNumber];
    if (!existing) return null;
    const updated = updater(existing);
    accounts[currentUser.phoneNumber] = updated;
    writeJson(STORAGE_KEY_ACCOUNTS, accounts);
    return updated;
  }, []);

  const applyStoredAccount = useCallback((acc: StoredAccount) => {
    const profile: UserProfile = {
      phoneNumber: acc.phoneNumber,
      memberId: acc.memberId,
      registeredAt: acc.registeredAt,
      lastDailyBonusAt: acc.dailyBonus.lastClaimedAt ?? undefined,
      dailyStreak: acc.dailyBonus.streak,
      totalBonusClaimed: acc.dailyBonus.totalClaimed,
      referredBy: acc.referredBy,
    };

    const sortedHistory = [...(acc.history || [])].sort((a, b) => b.timestamp - a.timestamp);
    const computedStats = computeStats(sortedHistory);

    const elapsed = acc.dailyBonus.lastClaimedAt ? Date.now() - acc.dailyBonus.lastClaimedAt : BONUS_COOLDOWN_MS;
    const left = acc.dailyBonus.lastClaimedAt ? Math.max(0, BONUS_COOLDOWN_MS - elapsed) : 0;

    const allReferrals = readJson<ReferralRecord[]>(STORAGE_KEY_REFERRALS, []);
    const allBonuses = readJson<ReferralMilestoneBonus[]>(STORAGE_KEY_REFERRAL_BONUSES, []);

    setUser(profile);
    userRef.current = profile;
    setBalance(acc.balance);
    balanceRef.current = acc.balance;
    setHasCompletedFirstDeposit(Boolean(acc.hasCompletedFirstDeposit));
    setStats(computedStats);
    setDailyBonus(acc.dailyBonus || defaultDailyBonus);
    setCanClaimDailyBonus(left === 0);
    setTimeUntilNextBonus(left);
    setHistory(sortedHistory);
    historyRef.current = sortedHistory;
    setTotalBetsCount(sortedHistory.filter((h) => h.status !== 'Pending').length);
    setDepositRecords(acc.depositRecords || []);
    setWithdrawRecords(acc.withdrawRecords || []);
    setSavedBankDetails(acc.savedBankDetails || null);
    setUserReferrals(allReferrals.filter((r) => r.referrerMemberId === acc.memberId));
    setUserReferralBonuses(allBonuses.filter((b) => b.referrerMemberId === acc.memberId));
  }, []);

  const refreshWinGoState = useCallback(async () => {
    const now = Date.now();
    const outcomes = settledOutcomesRef.current;
    const hist = historyRef.current;
    setWingoCurrentPeriods({
      30: getPeriodForTime(now, 30),
      60: getPeriodForTime(now, 60),
      180: getPeriodForTime(now, 180),
      300: getPeriodForTime(now, 300),
    });
    setWingoRoundsByDuration({
      30: buildContinuousHistory(30, 50, outcomes, hist, now),
      60: buildContinuousHistory(60, 50, outcomes, hist, now),
      180: buildContinuousHistory(180, 50, outcomes, hist, now),
      300: buildContinuousHistory(300, 50, outcomes, hist, now),
    });
  }, []);

  const refreshAccountState = useCallback(async () => {
    try {
      const savedPhone = localStorage.getItem(STORAGE_KEY_AUTH_USER);
      if (!savedPhone) {
        setUser(null);
        userRef.current = null;
        return;
      }

      const accounts = readJson<Record<string, StoredAccount>>(STORAGE_KEY_ACCOUNTS, {});
      const acc = accounts[savedPhone];
      if (!acc) {
        localStorage.removeItem(STORAGE_KEY_AUTH_USER);
        setUser(null);
        userRef.current = null;
        return;
      }

      applyStoredAccount(acc);

      // Background sync with Supabase if reachable (merge bet history without overwriting local settled outcomes)
      syncUserProfile(acc.memberId, acc.phoneNumber, acc.balance).catch(() => {});
      fetchBetHistoryFromSupabase(acc.memberId, acc.phoneNumber)
        .then((remoteBets) => {
          if (!remoteBets || remoteBets.length === 0) return;
          const localMap = new Map<string, GameHistoryItem>();
          (acc.history || []).forEach((b) => localMap.set(b.id, b));
          let changed = false;
          remoteBets.forEach((rb) => {
            if (!localMap.has(rb.id)) {
              localMap.set(rb.id, rb);
              changed = true;
            }
          });
          if (changed && userRef.current?.memberId === acc.memberId) {
            const merged = Array.from(localMap.values()).sort((a, b) => b.timestamp - a.timestamp);
            persistCurrentAccount((curr) => ({ ...curr, history: merged }));
            setHistory(merged);
            historyRef.current = merged;
            setStats(computeStats(merged));
            setTotalBetsCount(merged.filter((h) => h.status !== 'Pending').length);
          }
        })
        .catch(() => {});
    } finally {
      setIsAuthLoading(false);
    }
  }, [applyStoredAccount, persistCurrentAccount]);

  useEffect(() => {
    refreshAccountState();
    refreshWinGoState();
  }, [refreshAccountState, refreshWinGoState]);

  // Keep daily bonus countdown eligibility fresh when 24h expires while app is open
  useEffect(() => {
    const interval = setInterval(() => {
      if (!dailyBonus.lastClaimedAt) {
        if (!canClaimDailyBonus) setCanClaimDailyBonus(true);
        if (timeUntilNextBonus !== 0) setTimeUntilNextBonus(0);
        return;
      }
      const elapsed = Date.now() - dailyBonus.lastClaimedAt;
      const left = Math.max(0, BONUS_COOLDOWN_MS - elapsed);
      setTimeUntilNextBonus(left);
      setCanClaimDailyBonus(left === 0);
    }, 1000);
    return () => clearInterval(interval);
  }, [dailyBonus.lastClaimedAt, canClaimDailyBonus, timeUntilNextBonus]);

  const pendingWinGoBets = useMemo(() => {
    return history.filter((h) => h.gameId === 'color-prediction' && h.status === 'Pending');
  }, [history]);

  const settleWinGoBets = useCallback(async () => {
    const now = Date.now();
    const outcomes = { ...settledOutcomesRef.current };

    if (isSettlingRef.current) {
      return {
        settledBets: [],
        historiesByDuration: {
          30: buildContinuousHistory(30, 50, outcomes, historyRef.current, now),
          60: buildContinuousHistory(60, 50, outcomes, historyRef.current, now),
          180: buildContinuousHistory(180, 50, outcomes, historyRef.current, now),
          300: buildContinuousHistory(300, 50, outcomes, historyRef.current, now),
        },
        currentPeriods: {
          30: getPeriodForTime(now, 30),
          60: getPeriodForTime(now, 60),
          180: getPeriodForTime(now, 180),
          300: getPeriodForTime(now, 300),
        },
        serverTimeMs: now,
      };
    }

    isSettlingRef.current = true;
    try {
      const currentHist = [...historyRef.current];
      const readyPending = currentHist.filter((h) => {
        if (h.gameId !== 'color-prediction' || h.status !== 'Pending' || !h.period) return false;
        const { roundEndTime } = parsePeriodToTimestamp(h.period, h.duration || 30);
        return now >= roundEndTime;
      });

      const settledBets: GameHistoryItem[] = [];
      let totalWinCredit = 0;

      if (readyPending.length > 0) {
        // Group ready pending bets by duration_period
        const groups = new Map<string, GameHistoryItem[]>();
        readyPending.forEach((b) => {
          const dur = b.duration || 30;
          const key = `${dur}_${b.period}`;
          const list = groups.get(key) || [];
          list.push(b);
          groups.set(key, list);
        });

        const updatedMap = new Map<string, GameHistoryItem>();
        currentHist.forEach((b) => updatedMap.set(b.id, b));

        groups.forEach((betsInRound, key) => {
          const dur = betsInRound[0].duration || 30;
          const period = betsInRound[0].period!;
          const { roundIdx } = parsePeriodToTimestamp(period, dur);
          const deterministicNum = getDeterministicNumberForRound(roundIdx, dur);

          let drawnNum: number;
          if (outcomes[key]) {
            drawnNum = outcomes[key].number;
          } else {
            const evalOrders: BetOrderEval[] = betsInRound.map((b) => ({
              target: (b.target ?? b.choice) as BetOrderEval['target'],
              amount: b.betAmount,
              label: b.selectedOption,
            }));
            drawnNum = determineWinGoOutcome(
              evalOrders,
              winManagerEnabledRef.current,
              deterministicNum
            );
            const roundItem = numberToRoundItem(period, drawnNum);
            outcomes[key] = roundItem;

            recordGameRoundInSupabase({
              id: `${dur}_${period}`,
              duration: dur,
              period,
              roundIndex: roundIdx,
              number: roundItem.number,
              color: roundItem.color,
              bigSmall: roundItem.bigSmall,
              finalizedAt: now,
            }).catch(() => {});
          }

          betsInRound.forEach((b) => {
            const target = (b.target ?? b.choice) as BetOrderEval['target'];
            const evaluation = evaluateWinGoBet(
              target,
              b.betAmount,
              drawnNum,
              undefined,
              winManagerEnabledRef.current
            );

            if (evaluation.isWin && evaluation.payout > 0) {
              totalWinCredit += evaluation.payout;
            }

            const settled: GameHistoryItem = {
              ...b,
              status: 'Completed',
              outcome: `Number ${evaluation.resultNumber} (${evaluation.resultColor})`,
              payout: evaluation.payout,
              grossPayout: evaluation.grossPayout,
              commission: evaluation.commission,
              netProfit: evaluation.netProfit,
              isWin: evaluation.isWin,
              resultNumber: evaluation.resultNumber,
              resultColor: evaluation.resultColor,
              selectedOption: evaluation.selectedOption || b.selectedOption,
              settledAt: now,
            };

            updatedMap.set(b.id, settled);
            settledBets.push(settled);

            updateBetOutcomeInSupabase(
              b.id,
              settled.outcome,
              settled.payout,
              settled.netProfit,
              settled.isWin,
              now
            ).catch(() => {});
          });
        });

        settledOutcomesRef.current = outcomes;
        writeJson(STORAGE_KEY_WINGO_OUTCOMES, outcomes);

        const nextHistory = Array.from(updatedMap.values()).sort(
          (a, b) => b.timestamp - a.timestamp
        );
        const nextBalance = Number((balanceRef.current + totalWinCredit).toFixed(2));
        const nextStats = computeStats(nextHistory);

        historyRef.current = nextHistory;
        setHistory(nextHistory);
        balanceRef.current = nextBalance;
        setBalance(nextBalance);
        setStats(nextStats);
        setTotalBetsCount(nextHistory.filter((h) => h.status !== 'Pending').length);

        const acc = persistCurrentAccount((curr) => ({
          ...curr,
          balance: nextBalance,
          history: nextHistory,
        }));
        if (acc) {
          updateWalletBalanceInSupabase(acc.memberId, acc.phoneNumber, nextBalance).catch(() => {});
        }
      }

      const historiesByDuration: Record<number, WinGoRoundItem[]> = {
        30: buildContinuousHistory(30, 50, outcomes, historyRef.current, now),
        60: buildContinuousHistory(60, 50, outcomes, historyRef.current, now),
        180: buildContinuousHistory(180, 50, outcomes, historyRef.current, now),
        300: buildContinuousHistory(300, 50, outcomes, historyRef.current, now),
      };
      const currentPeriods: Record<number, string> = {
        30: getPeriodForTime(now, 30),
        60: getPeriodForTime(now, 60),
        180: getPeriodForTime(now, 180),
        300: getPeriodForTime(now, 300),
      };

      setWingoRoundsByDuration(historiesByDuration);
      setWingoCurrentPeriods(currentPeriods);

      return {
        settledBets,
        historiesByDuration,
        currentPeriods,
        serverTimeMs: now,
      };
    } finally {
      isSettlingRef.current = false;
    }
  }, [persistCurrentAccount]);

  // Global settlement tick: settle any pending Win Go bets once their round ends
  useEffect(() => {
    const interval = setInterval(() => {
      if (!userRef.current) return;
      const now = Date.now();
      const hasReadyPending = historyRef.current.some((h) => {
        if (h.gameId !== 'color-prediction' || h.status !== 'Pending' || !h.period) return false;
        const { roundEndTime } = parsePeriodToTimestamp(h.period, h.duration || 30);
        return now >= roundEndTime;
      });
      if (hasReadyPending) {
        settleWinGoBets();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [settleWinGoBets]);

  const login = async (
    phoneNumber: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanPhone = normalizePhone(phoneNumber);
    if (cleanPhone.length < 10) {
      return { success: false, error: 'Please enter a valid 10-digit mobile number.' };
    }
    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }

    const accounts = readJson<Record<string, StoredAccount>>(STORAGE_KEY_ACCOUNTS, {});
    const account = accounts[cleanPhone];
    if (!account) {
      return { success: false, error: 'No account found for this phone number. Please register first.' };
    }
    if (account.password !== password) {
      return { success: false, error: 'Incorrect password. Please try again.' };
    }

    localStorage.setItem(STORAGE_KEY_AUTH_USER, cleanPhone);
    applyStoredAccount(account);
    await refreshWinGoState();
    playSound('win');
    return { success: true };
  };

  const register = async (
    phoneNumber: string,
    password: string,
    confirmPassword: string,
    inviteCode?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanPhone = normalizePhone(phoneNumber);
    if (cleanPhone.length < 10) {
      return { success: false, error: 'Please enter a valid 10-digit mobile number.' };
    }
    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }
    if (password !== confirmPassword) {
      return { success: false, error: 'Passwords do not match.' };
    }

    const accounts = readJson<Record<string, StoredAccount>>(STORAGE_KEY_ACCOUNTS, {});
    if (accounts[cleanPhone]) {
      return { success: false, error: 'Phone number already registered. Please sign in.' };
    }

    const memberId = 'COB' + Math.floor(100000 + Math.random() * 900000);
    const now = Date.now();

    let referredBy: string | undefined;
    const trimmedCode = (inviteCode || '').trim().toUpperCase();
    if (trimmedCode) {
      const referrerAcc = Object.values(accounts).find(
        (a) => a.memberId.toUpperCase() === trimmedCode
      );
      if (referrerAcc) {
        referredBy = referrerAcc.memberId;
        const referrals = readJson<ReferralRecord[]>(STORAGE_KEY_REFERRALS, []);
        referrals.unshift({
          id: 'REF_' + now + '_' + Math.random().toString(36).slice(2, 6).toUpperCase(),
          referrerMemberId: referrerAcc.memberId,
          referrerPhone: referrerAcc.phoneNumber,
          refereeMemberId: memberId,
          refereePhone: cleanPhone,
          registeredAt: now,
          firstDepositCompleted: false,
          rewardAmount: REFERRAL_REWARD_AMOUNT,
        });
        writeJson(STORAGE_KEY_REFERRALS, referrals);
      }
    }

    const newAccount: StoredAccount = {
      phoneNumber: cleanPhone,
      password,
      memberId,
      registeredAt: now,
      referredBy,
      balance: INITIAL_BALANCE,
      hasCompletedFirstDeposit: false,
      dailyBonus: { ...defaultDailyBonus },
      history: [],
      savedBankDetails: null,
      withdrawRecords: [],
      depositRecords: [],
    };

    accounts[cleanPhone] = newAccount;
    writeJson(STORAGE_KEY_ACCOUNTS, accounts);
    localStorage.setItem(STORAGE_KEY_AUTH_USER, cleanPhone);

    applyStoredAccount(newAccount);
    await refreshWinGoState();
    syncUserProfile(memberId, cleanPhone, INITIAL_BALANCE).catch(() => {});
    playSound('jackpot');
    return { success: true };
  };

  const sendPasswordResetOtp = async (
    phoneNumber: string
  ): Promise<{ success: boolean; message?: string; error?: string }> => {
    const cleanPhone = normalizePhone(phoneNumber);
    if (cleanPhone.length < 10) {
      return { success: false, error: 'Please enter a valid 10-digit mobile number.' };
    }
    const accounts = readJson<Record<string, StoredAccount>>(STORAGE_KEY_ACCOUNTS, {});
    if (!accounts[cleanPhone]) {
      return { success: false, error: 'No registered account found for this phone number.' };
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStoreRef.current[cleanPhone] = {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
    };
    playSound('tick');
    return {
      success: true,
      message: `Your 6-digit verification OTP for +91 ${cleanPhone} is: ${otp}`,
    };
  };

  const resetPasswordWithOtp = async (
    phoneNumber: string,
    otp: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanPhone = normalizePhone(phoneNumber);
    const entry = otpStoreRef.current[cleanPhone];
    if (!entry || entry.otp !== otp.trim()) {
      return { success: false, error: 'Invalid verification OTP.' };
    }
    if (Date.now() > entry.expiresAt) {
      return { success: false, error: 'OTP expired. Please request a new one.' };
    }
    if (newPassword.length < 6) {
      return { success: false, error: 'New password must be at least 6 characters.' };
    }
    if (newPassword !== confirmPassword) {
      return { success: false, error: 'Passwords do not match.' };
    }

    const accounts = readJson<Record<string, StoredAccount>>(STORAGE_KEY_ACCOUNTS, {});
    if (!accounts[cleanPhone]) {
      return { success: false, error: 'Account not found.' };
    }
    accounts[cleanPhone].password = newPassword;
    writeJson(STORAGE_KEY_ACCOUNTS, accounts);
    delete otpStoreRef.current[cleanPhone];
    playSound('win');
    return { success: true };
  };

  const logout = async () => {
    playSound('click');
    localStorage.removeItem(STORAGE_KEY_AUTH_USER);
    try {
      sessionStorage.removeItem(STORAGE_KEY_ADMIN_SESSION);
    } catch {}
    setIsAdminUnlocked(false);
    setUser(null);
    userRef.current = null;
    setHistory([]);
    historyRef.current = [];
    setTotalBetsCount(0);
    setStats(defaultStats);
    setBalance(INITIAL_BALANCE);
    balanceRef.current = INITIAL_BALANCE;
    setHasCompletedFirstDeposit(false);
    setDailyBonus(defaultDailyBonus);
    setCanClaimDailyBonus(true);
    setTimeUntilNextBonus(0);
    setDepositRecords([]);
    setWithdrawRecords([]);
    setSavedBankDetails(null);
    setUserReferrals([]);
    setUserReferralBonuses([]);
    setActiveView('home');
    setSelectedGameId(null);
  };

  const selectGame = (id: GameId | null) => {
    if (id) {
      if (!hasCompletedFirstDeposit) {
        setFirstDepositPromptMessage('Deposit 1 time to play with bonus money');
        setShowFirstDepositPrompt(true);
        setActiveView('deposit');
        setSelectedGameId(null);
        playSound('loss');
        return;
      }
      setSelectedGameId(id);
      setRecentlyPlayed((prev) => {
        const filtered = prev.filter((g) => g !== id);
        return [id, ...filtered].slice(0, 5);
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setSelectedGameId(null);
    }
  };

  const placeBet = (amount: number): boolean => {
    if (!hasCompletedFirstDeposit) {
      setFirstDepositPromptMessage('Deposit 1 time to play with bonus money');
      setShowFirstDepositPrompt(true);
      setActiveView('deposit');
      playSound('loss');
      return false;
    }
    if (amount <= 0 || balanceRef.current < amount) {
      return false;
    }
    const nextBalance = Number((balanceRef.current - amount).toFixed(2));
    balanceRef.current = nextBalance;
    setBalance(nextBalance);
    playSound('bet');

    const acc = persistCurrentAccount((curr) => ({ ...curr, balance: nextBalance }));
    if (acc) {
      updateWalletBalanceInSupabase(acc.memberId, acc.phoneNumber, nextBalance).catch(() => {});
    }
    return true;
  };

  const refundBet = (amount: number) => {
    if (amount <= 0) return;
    const nextBalance = Number((balanceRef.current + amount).toFixed(2));
    balanceRef.current = nextBalance;
    setBalance(nextBalance);

    const acc = persistCurrentAccount((curr) => ({ ...curr, balance: nextBalance }));
    if (acc) {
      updateWalletBalanceInSupabase(acc.memberId, acc.phoneNumber, nextBalance).catch(() => {});
    }
  };

  const recordGameResult = async (item: Omit<GameHistoryItem, 'id' | 'timestamp'>) => {
    if (item.isWin) {
      if (item.payout >= item.betAmount * 5) playSound('jackpot');
      else playSound('win');
    } else {
      playSound('loss');
    }

    const now = Date.now();
    const record: GameHistoryItem = {
      ...item,
      id: 'BET_' + now + '_' + Math.random().toString(36).slice(2, 7).toUpperCase(),
      timestamp: now,
      status: 'Completed',
      settledAt: now,
    };

    const nextBalance =
      item.payout > 0
        ? Number((balanceRef.current + item.payout).toFixed(2))
        : balanceRef.current;

    const nextHistory = [record, ...historyRef.current];
    const nextStats = computeStats(nextHistory);

    balanceRef.current = nextBalance;
    setBalance(nextBalance);
    historyRef.current = nextHistory;
    setHistory(nextHistory);
    setStats(nextStats);
    setTotalBetsCount(nextHistory.filter((h) => h.status !== 'Pending').length);

    const acc = persistCurrentAccount((curr) => ({
      ...curr,
      balance: nextBalance,
      history: nextHistory,
    }));

    if (acc) {
      recordBetInSupabase(record, acc.memberId, acc.phoneNumber).catch(() => {});
      updateWalletBalanceInSupabase(acc.memberId, acc.phoneNumber, nextBalance).catch(() => {});
    }
  };

  const submitWinGoBet = async (
    order: WinGoBetOrderInput
  ): Promise<{ success: boolean; bet?: GameHistoryItem; betId?: string; error?: string }> => {
    if (!hasCompletedFirstDeposit) {
      setFirstDepositPromptMessage('Deposit 1 time to play with bonus money');
      setShowFirstDepositPrompt(true);
      setActiveView('deposit');
      playSound('loss');
      return { success: false, error: 'Deposit 1 time to play with bonus money' };
    }

    if (order.amount <= 0 || balanceRef.current < order.amount) {
      return { success: false, error: 'Insufficient balance.' };
    }

    const now = Date.now();
    const rawTarget = String(order.target).toLowerCase();
    const selectedOption =
      order.selectedOption ||
      (!isNaN(Number(order.target))
        ? `Number ${order.target}`
        : rawTarget === 'purple' || rawTarget === 'violet'
        ? 'VIOLET'
        : String(order.target).toUpperCase());

    const bet: GameHistoryItem = {
      id: 'WG_' + now + '_' + Math.random().toString(36).slice(2, 7).toUpperCase(),
      gameId: 'color-prediction',
      gameTitle: `Win Go ${order.duration >= 60 ? `${order.duration / 60}Min` : `${order.duration}s`}`,
      betAmount: order.amount,
      choice: `${selectedOption} [Issue ${order.period}]`,
      outcome: 'Pending Resolution',
      payout: 0,
      netProfit: -order.amount,
      isWin: false,
      timestamp: now,
      status: 'Pending',
      period: order.period,
      target: String(order.target),
      multiplier: order.multiplier,
      duration: order.duration,
      selectedOption,
    };

    const nextBalance = Number((balanceRef.current - order.amount).toFixed(2));
    const nextHistory = [bet, ...historyRef.current];

    balanceRef.current = nextBalance;
    setBalance(nextBalance);
    historyRef.current = nextHistory;
    setHistory(nextHistory);
    playSound('bet');

    const acc = persistCurrentAccount((curr) => ({
      ...curr,
      balance: nextBalance,
      history: nextHistory,
    }));

    if (acc) {
      recordBetInSupabase(bet, acc.memberId, acc.phoneNumber).catch(() => {});
      updateWalletBalanceInSupabase(acc.memberId, acc.phoneNumber, nextBalance).catch(() => {});
    }

    return { success: true, bet, betId: bet.id };
  };

  const fetchPaginatedBets = useCallback(
    async (params: {
      page?: number;
      limit?: number;
      gameId?: string;
      outcome?: 'all' | 'wins' | 'losses';
      status?: 'all' | 'Completed' | 'Pending';
    }): Promise<PaginatedBetsResponse> => {
      const page = Math.max(1, params.page || 1);
      const limit = Math.max(1, params.limit || 10);

      let filtered = [...historyRef.current];

      if (params.status && params.status !== 'all') {
        filtered = filtered.filter((b) =>
          params.status === 'Pending' ? b.status === 'Pending' : b.status !== 'Pending'
        );
      }
      if (params.gameId && params.gameId !== 'all') {
        filtered = filtered.filter((b) => b.gameId === params.gameId);
      }
      if (params.outcome === 'wins') {
        filtered = filtered.filter((b) => b.isWin);
      } else if (params.outcome === 'losses') {
        filtered = filtered.filter((b) => !b.isWin);
      }

      const totalCount = filtered.length;
      const totalPages = Math.max(1, Math.ceil(totalCount / limit));
      const start = (page - 1) * limit;
      const items = filtered.slice(start, start + limit);

      return {
        success: true,
        items,
        totalCount,
        page,
        totalPages,
        hasMore: page < totalPages,
        stats: computeStats(historyRef.current),
      };
    },
    []
  );

  const claimDailyBonus = async (): Promise<{
    success: boolean;
    amount: number;
    day: number;
    error?: string;
  }> => {
    if (isClaimingRef.current) {
      return { success: false, amount: 0, day: dailyBonus.streak || 1, error: 'Processing claim...' };
    }
    if (!userRef.current) {
      return { success: false, amount: 0, day: 1, error: 'Please sign in first.' };
    }

    const now = Date.now();
    if (dailyBonus.lastClaimedAt && now - dailyBonus.lastClaimedAt < BONUS_COOLDOWN_MS) {
      return {
        success: false,
        amount: 0,
        day: dailyBonus.streak || 1,
        error: 'Daily bonus already claimed today. Come back later!',
      };
    }

    isClaimingRef.current = true;
    setIsClaimingDailyBonus(true);
    try {
      const nextDay = dailyBonus.streak >= 7 ? 1 : dailyBonus.streak + 1;
      const tier = DAILY_BONUS_TIERS.find((t) => t.day === nextDay) || DAILY_BONUS_TIERS[0];
      const amount = tier.points;

      const updatedBonus: DailyBonusState = {
        lastClaimedAt: now,
        streak: nextDay,
        totalClaimed: dailyBonus.totalClaimed + amount,
        history: [
          {
            id: 'DB_' + now,
            day: nextDay,
            amount,
            claimedAt: now,
          },
          ...dailyBonus.history,
        ],
      };

      const nextBalance = Number((balanceRef.current + amount).toFixed(2));
      balanceRef.current = nextBalance;
      setBalance(nextBalance);
      setDailyBonus(updatedBonus);
      setCanClaimDailyBonus(false);
      setTimeUntilNextBonus(BONUS_COOLDOWN_MS);

      const acc = persistCurrentAccount((curr) => ({
        ...curr,
        balance: nextBalance,
        dailyBonus: updatedBonus,
      }));

      if (acc) {
        recordDailyBonusInSupabase(
          acc.memberId,
          acc.phoneNumber,
          amount,
          nextDay,
          updatedBonus.totalClaimed,
          nextBalance
        ).catch(() => {});
      }

      playSound('jackpot');
      return { success: true, amount, day: nextDay };
    } finally {
      isClaimingRef.current = false;
      setIsClaimingDailyBonus(false);
    }
  };

  const submitDepositRequest = async (data: {
    amount: number;
    bonus: number;
    method: string;
    utr: string;
    screenshot?: string;
  }): Promise<{ success: boolean; record?: DepositRecord; error?: string }> => {
    const currentUser = userRef.current;
    if (!currentUser) {
      return { success: false, error: 'Please log in to submit a deposit.' };
    }

    const now = Date.now();
    const record: DepositRecord = {
      id: 'DEP' + now.toString().slice(-8) + Math.floor(10 + Math.random() * 89),
      memberId: currentUser.memberId,
      phoneNumber: currentUser.phoneNumber,
      amount: data.amount,
      bonus: data.bonus,
      totalCredit: data.amount + data.bonus,
      method: data.method,
      utr: data.utr,
      screenshot: data.screenshot,
      timestamp: now,
      status: 'Pending',
    };

    const masterList = readJson<DepositRecord[]>(STORAGE_KEY_MASTER_DEPOSITS, []);
    const nextMaster = [record, ...masterList];
    writeJson(STORAGE_KEY_MASTER_DEPOSITS, nextMaster);
    setMasterDepositRequests(nextMaster);

    const nextUserDeposits = [record, ...depositRecords];
    setDepositRecords(nextUserDeposits);
    persistCurrentAccount((curr) => ({
      ...curr,
      depositRecords: [record, ...(curr.depositRecords || [])],
    }));

    recordDepositInSupabase(record).catch(() => {});
    playSound('click');
    return { success: true, record };
  };

  const refreshMasterDeposits = useCallback(async () => {
    const localList = readJson<DepositRecord[]>(STORAGE_KEY_MASTER_DEPOSITS, []);
    try {
      const remoteList = await fetchAllDepositsFromSupabase();
      if (remoteList && remoteList.length > 0) {
        const merged = new Map<string, DepositRecord>();
        localList.forEach((d) => merged.set(d.id, d));
        remoteList.forEach((rd) => {
          const existing = merged.get(rd.id);
          if (!existing || (existing.status === 'Pending' && rd.status !== 'Pending')) {
            merged.set(rd.id, rd);
          }
        });
        const sorted = Array.from(merged.values()).sort((a, b) => b.timestamp - a.timestamp);
        writeJson(STORAGE_KEY_MASTER_DEPOSITS, sorted);
        setMasterDepositRequests(sorted);
        return;
      }
    } catch {}
    setMasterDepositRequests(localList);
  }, []);

  const unlockAdmin = async (passcode: string): Promise<{ success: boolean; error?: string }> => {
    if (passcode.trim() !== ADMIN_PASSCODE) {
      return { success: false, error: 'Access denied. Incorrect password.' };
    }
    try {
      sessionStorage.setItem(STORAGE_KEY_ADMIN_SESSION, 'true');
    } catch {}
    setIsAdminUnlocked(true);
    await refreshMasterDeposits();
    return { success: true };
  };

  const exitAdmin = () => {
    try {
      sessionStorage.removeItem(STORAGE_KEY_ADMIN_SESSION);
    } catch {}
    setIsAdminUnlocked(false);
  };

  const approveDepositRequest = async (
    depositId: string
  ): Promise<{ success: boolean; error?: string }> => {
    const masterList = readJson<DepositRecord[]>(STORAGE_KEY_MASTER_DEPOSITS, []);
    const idx = masterList.findIndex((d) => d.id === depositId);
    if (idx === -1) {
      return { success: false, error: 'Deposit record not found.' };
    }
    const targetDeposit = masterList[idx];
    if (targetDeposit.status === 'Completed') {
      return { success: false, error: 'Deposit already approved.' };
    }

    const now = Date.now();
    const updatedDeposit: DepositRecord = {
      ...targetDeposit,
      status: 'Completed',
      approvedAt: now,
    };
    masterList[idx] = updatedDeposit;
    writeJson(STORAGE_KEY_MASTER_DEPOSITS, masterList);
    setMasterDepositRequests([...masterList]);

    updateDepositStatusInSupabase(depositId, 'Completed').catch(() => {});

    // Credit player account & process referral rewards on first deposit
    const accounts = readJson<Record<string, StoredAccount>>(STORAGE_KEY_ACCOUNTS, {});
    const playerKey = Object.keys(accounts).find(
      (k) =>
        accounts[k].memberId === targetDeposit.memberId ||
        accounts[k].phoneNumber === targetDeposit.phoneNumber
    );

    if (playerKey) {
      const playerAcc = accounts[playerKey];
      const wasFirstDepositPending = !playerAcc.hasCompletedFirstDeposit;
      playerAcc.balance = Number((playerAcc.balance + targetDeposit.totalCredit).toFixed(2));
      playerAcc.hasCompletedFirstDeposit = true;
      playerAcc.depositRecords = (playerAcc.depositRecords || []).map((d) =>
        d.id === depositId ? updatedDeposit : d
      );
      accounts[playerKey] = playerAcc;

      updateWalletBalanceInSupabase(
        playerAcc.memberId,
        playerAcc.phoneNumber,
        playerAcc.balance
      ).catch(() => {});

      // Refer & Earn: ₹77 for 1st deposit + ₹355 every 5 qualified referrals
      if (wasFirstDepositPending && playerAcc.referredBy) {
        const referrals = readJson<ReferralRecord[]>(STORAGE_KEY_REFERRALS, []);
        const refIdx = referrals.findIndex(
          (r) =>
            r.referrerMemberId === playerAcc.referredBy &&
            r.refereeMemberId === playerAcc.memberId &&
            !r.firstDepositCompleted
        );

        let referrerKey = Object.keys(accounts).find(
          (k) => accounts[k].memberId === playerAcc.referredBy
        );

        if (refIdx !== -1) {
          referrals[refIdx] = {
            ...referrals[refIdx],
            firstDepositCompleted: true,
            firstDepositAt: now,
          };
          writeJson(STORAGE_KEY_REFERRALS, referrals);
        } else if (referrerKey) {
          referrals.unshift({
            id: 'REF_' + now,
            referrerMemberId: accounts[referrerKey].memberId,
            referrerPhone: accounts[referrerKey].phoneNumber,
            refereeMemberId: playerAcc.memberId,
            refereePhone: playerAcc.phoneNumber,
            registeredAt: playerAcc.registeredAt,
            firstDepositCompleted: true,
            firstDepositAt: now,
            rewardAmount: REFERRAL_REWARD_AMOUNT,
          });
          writeJson(STORAGE_KEY_REFERRALS, referrals);
        }

        if (referrerKey) {
          const referrerAcc = accounts[referrerKey];
          let bonusCredit = REFERRAL_REWARD_AMOUNT;

          const qualifiedCount = referrals.filter(
            (r) => r.referrerMemberId === referrerAcc.memberId && r.firstDepositCompleted
          ).length;

          if (qualifiedCount > 0 && qualifiedCount % REFERRAL_MILESTONE_TARGET === 0) {
            const bonuses = readJson<ReferralMilestoneBonus[]>(STORAGE_KEY_REFERRAL_BONUSES, []);
            const alreadyAwarded = bonuses.some(
              (b) =>
                b.referrerMemberId === referrerAcc.memberId && b.milestoneCount === qualifiedCount
            );
            if (!alreadyAwarded) {
              bonuses.unshift({
                id: 'REFM_' + now,
                referrerMemberId: referrerAcc.memberId,
                referrerPhone: referrerAcc.phoneNumber,
                milestoneCount: qualifiedCount,
                amount: REFERRAL_MILESTONE_BONUS,
                awardedAt: now,
              });
              writeJson(STORAGE_KEY_REFERRAL_BONUSES, bonuses);
              bonusCredit += REFERRAL_MILESTONE_BONUS;
            }
          }

          referrerAcc.balance = Number((referrerAcc.balance + bonusCredit).toFixed(2));
          accounts[referrerKey] = referrerAcc;
          updateWalletBalanceInSupabase(
            referrerAcc.memberId,
            referrerAcc.phoneNumber,
            referrerAcc.balance
          ).catch(() => {});
        }
      }

      writeJson(STORAGE_KEY_ACCOUNTS, accounts);
    }

    await refreshAccountState();
    return { success: true };
  };

  const rejectDepositRequest = async (
    depositId: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const masterList = readJson<DepositRecord[]>(STORAGE_KEY_MASTER_DEPOSITS, []);
    const idx = masterList.findIndex((d) => d.id === depositId);
    if (idx === -1) {
      return { success: false, error: 'Deposit record not found.' };
    }
    const targetDeposit = masterList[idx];
    const updatedDeposit: DepositRecord = {
      ...targetDeposit,
      status: 'Rejected',
      rejectedReason: reason || 'Rejected by administrator',
    };
    masterList[idx] = updatedDeposit;
    writeJson(STORAGE_KEY_MASTER_DEPOSITS, masterList);
    setMasterDepositRequests([...masterList]);

    updateDepositStatusInSupabase(depositId, 'Rejected', updatedDeposit.rejectedReason).catch(
      () => {}
    );

    const accounts = readJson<Record<string, StoredAccount>>(STORAGE_KEY_ACCOUNTS, {});
    const playerKey = Object.keys(accounts).find(
      (k) =>
        accounts[k].memberId === targetDeposit.memberId ||
        accounts[k].phoneNumber === targetDeposit.phoneNumber
    );
    if (playerKey) {
      accounts[playerKey].depositRecords = (accounts[playerKey].depositRecords || []).map((d) =>
        d.id === depositId ? updatedDeposit : d
      );
      writeJson(STORAGE_KEY_ACCOUNTS, accounts);
    }

    playSound('loss');
    await refreshAccountState();
    return { success: true };
  };

  const saveBankDetails = async (
    details: BankAccountDetails
  ): Promise<{ success: boolean; error?: string }> => {
    if (!details.accountHolderName || !details.accountNumber || !details.ifscCode) {
      return { success: false, error: 'Please complete all required bank details.' };
    }
    setSavedBankDetails(details);
    const acc = persistCurrentAccount((curr) => ({ ...curr, savedBankDetails: details }));
    if (acc) {
      saveBankDetailsToSupabase(details, acc.memberId, acc.phoneNumber).catch(() => {});
    }
    playSound('click');
    return { success: true };
  };

  const submitWithdrawal = async (
    amount: number,
    details: BankAccountDetails
  ): Promise<{ success: boolean; error?: string; record?: WithdrawRecord }> => {
    if (amount < 100) {
      return { success: false, error: 'Minimum withdrawal amount is ₹100.' };
    }
    if (balanceRef.current < amount) {
      return { success: false, error: 'Insufficient balance.' };
    }

    const now = Date.now();
    const maskedAcc =
      details.accountNumber.length > 4
        ? `****${details.accountNumber.slice(-4)}`
        : details.accountNumber;

    const record: WithdrawRecord = {
      id: 'WD' + now.toString().slice(-8) + Math.floor(10 + Math.random() * 89),
      amount,
      actualAmount: amount,
      fee: 0,
      bankName: details.bankName,
      accountNumberMasked: maskedAcc,
      accountHolderName: details.accountHolderName,
      timestamp: now,
      status: 'Processing',
    };

    const nextBalance = Number((balanceRef.current - amount).toFixed(2));
    balanceRef.current = nextBalance;
    setBalance(nextBalance);
    setSavedBankDetails(details);
    setWithdrawRecords((prev) => [record, ...prev]);

    const acc = persistCurrentAccount((curr) => ({
      ...curr,
      balance: nextBalance,
      savedBankDetails: details,
      withdrawRecords: [record, ...(curr.withdrawRecords || [])],
    }));

    if (acc) {
      recordWithdrawalInSupabase(record, acc.memberId, acc.phoneNumber).catch(() => {});
      updateWalletBalanceInSupabase(acc.memberId, acc.phoneNumber, nextBalance).catch(() => {});
      saveBankDetailsToSupabase(details, acc.memberId, acc.phoneNumber).catch(() => {});
    }

    playSound('jackpot');
    return { success: true, record };
  };

  const referralStats: ReferralStats = useMemo(() => {
    const qualifiedCount = userReferrals.filter((r) => r.firstDepositCompleted).length;
    const totalReferred = userReferrals.length;
    const pendingCount = totalReferred - qualifiedCount;
    const totalEarnedFrom77 = qualifiedCount * REFERRAL_REWARD_AMOUNT;
    const milestonesCompleted = Math.floor(qualifiedCount / REFERRAL_MILESTONE_TARGET);
    const extraBonusEarned355 = userReferralBonuses.reduce((sum, b) => sum + b.amount, 0);
    const remainder = qualifiedCount % REFERRAL_MILESTONE_TARGET;
    const progressToNext5 =
      qualifiedCount > 0 && remainder === 0 ? REFERRAL_MILESTONE_TARGET : remainder;

    return {
      referralCode: user?.memberId || 'COB8892',
      totalReferred,
      qualifiedCount,
      pendingCount,
      totalEarnedFrom77,
      extraBonusEarned355,
      totalEarned: totalEarnedFrom77 + extraBonusEarned355,
      progressToNext5,
      milestonesCompleted,
    };
  }, [user?.memberId, userReferrals, userReferralBonuses]);

  return (
    <GameContext.Provider
      value={{
        balance,
        history,
        totalBetsCount,
        stats,
        recentlyPlayed,
        soundEnabled,
        activeView,
        selectedGameId,
        user,
        isAuthenticated: !!user,
        isAuthLoading,
        savedBankDetails,
        withdrawRecords,
        depositRecords,
        refreshAccountState,
        fetchPaginatedBets,
        login,
        register,
        sendPasswordResetOtp,
        resetPasswordWithOtp,
        logout,
        toggleSound,
        setActiveView,
        selectGame,
        placeBet,
        refundBet,
        submitWinGoBet,
        pendingWinGoBets,
        settleWinGoBets,
        wingoRoundsByDuration,
        wingoCurrentPeriods,
        serverClockOffsetMs,
        refreshWinGoState,
        submitDepositRequest,
        isAdminUnlocked,
        unlockAdmin,
        exitAdmin,
        approveDepositRequest,
        rejectDepositRequest,
        masterDepositRequests,
        refreshMasterDeposits,
        saveBankDetails,
        submitWithdrawal,
        winManagerEnabled,
        setWinManagerEnabled,
        recordGameResult,
        playSound,
        dailyBonus,
        claimDailyBonus,
        isClaimingDailyBonus,
        canClaimDailyBonus,
        timeUntilNextBonus,
        isDailyBonusModalOpen,
        setIsDailyBonusModalOpen,
        hasCompletedFirstDeposit,
        showFirstDepositPrompt,
        setShowFirstDepositPrompt,
        firstDepositPromptMessage,
        userReferrals,
        userReferralBonuses,
        referralStats,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
