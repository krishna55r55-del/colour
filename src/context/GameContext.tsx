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
} from '../types';
import { soundManager } from '../utils/audio';
import { parsePeriodToTimestamp, getPeriodForTime } from '../utils/winLogic';
import {
  api,
  setAuthToken,
  setAdminToken,
  hasAdminToken,
  AccountStatePayload,
  WinGoRoundItem,
  PaginatedBetsResponse,
} from '../lib/api';

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
  ) => Promise<{ success: boolean; otp?: string; error?: string }>;
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

  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(() => hasAdminToken());
  const [masterDepositRequests, setMasterDepositRequests] = useState<DepositRecord[]>([]);

  const [wingoRoundsByDuration, setWingoRoundsByDuration] = useState<
    Record<number, WinGoRoundItem[]>
  >({
    30: [],
    60: [],
    180: [],
    300: [],
  });
  const [wingoCurrentPeriods, setWingoCurrentPeriods] = useState<Record<number, string>>(() => ({
    30: getPeriodForTime(Date.now(), 30),
    60: getPeriodForTime(Date.now(), 60),
    180: getPeriodForTime(Date.now(), 180),
    300: getPeriodForTime(Date.now(), 300),
  }));
  const [serverClockOffsetMs, setServerClockOffsetMs] = useState<number>(0);
  const serverClockOffsetRef = useRef<number>(0);

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
  const isClaimingRef = useRef(false);
  const isSettlingRef = useRef(false);

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
    try {
      localStorage.setItem(STORAGE_KEY_RECENT, JSON.stringify(recentlyPlayed));
    } catch {}
  }, [recentlyPlayed]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SOUND, soundEnabled.toString());
    } catch {}
  }, [soundEnabled]);

  const applyAccountState = useCallback((state: AccountStatePayload) => {
    setUser(state.user);
    userRef.current = state.user;
    setBalance(state.balance);
    balanceRef.current = state.balance;
    setHasCompletedFirstDeposit(state.hasCompletedFirstDeposit);
    setStats(state.stats);
    setDailyBonus(state.dailyBonus);
    setCanClaimDailyBonus(state.canClaimDailyBonus);
    setTimeUntilNextBonus(state.timeUntilNextBonus);
    setHistory(state.latestBets);
    historyRef.current = state.latestBets;
    setTotalBetsCount(state.totalBetsCount);
    setDepositRecords(state.depositRecords);
    setWithdrawRecords(state.withdrawRecords);
    setSavedBankDetails(state.savedBankDetails);
    setUserReferrals(state.userReferrals);
    setUserReferralBonuses(state.userReferralBonuses);
  }, []);

  const refreshWinGoState = useCallback(async () => {
    try {
      const res = await api.getWinGoState();
      if (res.success) {
        const offset = res.serverTimeMs - Date.now();
        serverClockOffsetRef.current = offset;
        setServerClockOffsetMs(offset);
        setWingoCurrentPeriods(res.currentPeriods);
        setWingoRoundsByDuration(res.historiesByDuration);

        if (res.settledBets && res.settledBets.length > 0) {
          setHistory((prev) => {
            const map = new Map<string, GameHistoryItem>();
            res.settledBets.forEach((b) => map.set(b.id, b));
            prev.forEach((p) => {
              if (!map.has(p.id)) map.set(p.id, p);
            });
            const merged = Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);
            historyRef.current = merged;
            return merged;
          });
        }
      }
    } catch (err) {
      console.warn('WinGo state refresh warning:', err);
    }
  }, []);

  const refreshAccountState = useCallback(async () => {
    try {
      const res = await api.getAccountState();
      if (res.success && res.authenticated && res.state) {
        applyAccountState(res.state);
      } else {
        setUser(null);
        userRef.current = null;
      }
    } catch (err) {
      console.warn('Account state load warning:', err);
    } finally {
      setIsAuthLoading(false);
    }
  }, [applyAccountState]);

  // Initial load: restore session from backend HttpOnly cookie and fetch official WinGo rounds
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
    if (!userRef.current) return { settledBets: [] };
    if (isSettlingRef.current) return { settledBets: [] };
    isSettlingRef.current = true;
    try {
      const res = await api.settleWinGoBets();
      if (res.success) {
        const offset = res.serverTimeMs - Date.now();
        serverClockOffsetRef.current = offset;
        setServerClockOffsetMs(offset);
        setWingoCurrentPeriods(res.currentPeriods);
        setWingoRoundsByDuration(res.historiesByDuration);
        setBalance(res.balance);
        balanceRef.current = res.balance;
        setStats(res.stats);

        if (res.settledBets && res.settledBets.length > 0) {
          setHistory((prev) => {
            const map = new Map<string, GameHistoryItem>();
            res.settledBets.forEach((b) => map.set(b.id, b));
            prev.forEach((p) => {
              if (!map.has(p.id)) map.set(p.id, p);
            });
            const merged = Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);
            historyRef.current = merged;
            return merged;
          });
        } else {
          // If background server ticker settled the bet 200ms earlier, sync latest bets from DB
          const latest = await api.getBets({ page: 1, limit: 50 });
          if (latest.success) {
            setHistory(latest.items);
            historyRef.current = latest.items;
            setTotalBetsCount(latest.totalCount);
            setStats(latest.stats);
          }
        }

        return {
          settledBets: res.settledBets || [],
          historiesByDuration: res.historiesByDuration,
          currentPeriods: res.currentPeriods,
          serverTimeMs: res.serverTimeMs,
        };
      }
      return { settledBets: [] };
    } finally {
      isSettlingRef.current = false;
    }
  }, []);

  // Global settlement tick: when any pending WinGo bet's round has ended, call server settle
  useEffect(() => {
    const interval = setInterval(() => {
      if (!userRef.current) return;
      const nowServer = Date.now() + serverClockOffsetRef.current;
      const hasReadyPending = historyRef.current.some((h) => {
        if (h.gameId !== 'color-prediction' || h.status !== 'Pending' || !h.period) return false;
        const { roundEndTime } = parsePeriodToTimestamp(h.period, h.duration || 30);
        return nowServer >= roundEndTime;
      });
      if (hasReadyPending) {
        settleWinGoBets();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [settleWinGoBets]);

  // Sync account & rounds when window regains visibility or focus
  useEffect(() => {
    const handleSync = () => {
      if (userRef.current) {
        refreshAccountState();
      }
      refreshWinGoState();
    };
    window.addEventListener('visibilitychange', handleSync);
    window.addEventListener('focus', handleSync);
    return () => {
      window.removeEventListener('visibilitychange', handleSync);
      window.removeEventListener('focus', handleSync);
    };
  }, [refreshAccountState, refreshWinGoState]);

  const login = async (
    phoneNumber: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    const res = await api.login({ phoneNumber, password });
    if (!res.success || !res.state) {
      return { success: false, error: res.error || 'Failed to sign in' };
    }
    setAuthToken(res.token || null);
    applyAccountState(res.state);
    refreshWinGoState();
    playSound('win');
    return { success: true };
  };

  const register = async (
    phoneNumber: string,
    password: string,
    confirmPassword: string,
    inviteCode?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const res = await api.register({ phoneNumber, password, confirmPassword, inviteCode });
    if (!res.success || !res.state) {
      return { success: false, error: res.error || 'Registration failed' };
    }
    setAuthToken(res.token || null);
    applyAccountState(res.state);
    refreshWinGoState();
    playSound('jackpot');
    return { success: true };
  };

  const sendPasswordResetOtp = async (
    phoneNumber: string
  ): Promise<{ success: boolean; otp?: string; error?: string }> => {
    const res = await api.sendOtp(phoneNumber);
    if (res.success) playSound('tick');
    return res;
  };

  const resetPasswordWithOtp = async (
    phoneNumber: string,
    otp: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    const res = await api.resetPassword({ phoneNumber, otp, newPassword, confirmPassword });
    if (res.success) playSound('win');
    return res;
  };

  const logout = async () => {
    playSound('click');
    try {
      await api.logout();
    } catch {}
    setAuthToken(null);
    setAdminToken(null);
    setIsAdminUnlocked(false);
    setMasterDepositRequests([]);
    setUser(null);
    userRef.current = null;
    setHistory([]);
    historyRef.current = [];
    setTotalBetsCount(0);
    setStats(defaultStats);
    setBalance(INITIAL_BALANCE);
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
    const prevBal = balanceRef.current;
    const optimistic = Number((prevBal - amount).toFixed(2));
    setBalance(optimistic);
    balanceRef.current = optimistic;
    playSound('bet');

    api.placeInstantBet(amount).then((res) => {
      if (res.success && typeof res.balance === 'number') {
        setBalance(res.balance);
        balanceRef.current = res.balance;
      } else {
        setBalance(prevBal);
        balanceRef.current = prevBal;
      }
    });
    return true;
  };

  const refundBet = (amount: number) => {
    if (amount <= 0) return;
    api.refundInstantBet(amount).then((res) => {
      if (res.success && typeof res.balance === 'number') {
        setBalance(res.balance);
        balanceRef.current = res.balance;
      }
    });
  };

  const recordGameResult = async (item: Omit<GameHistoryItem, 'id' | 'timestamp'>) => {
    if (item.isWin) {
      if (item.payout >= item.betAmount * 5) playSound('jackpot');
      else playSound('win');
    } else {
      playSound('loss');
    }

    const res = await api.recordInstantBet({
      gameId: item.gameId,
      gameTitle: item.gameTitle,
      betAmount: item.betAmount,
      choice: item.choice,
      outcome: item.outcome,
      payout: item.payout,
      commission: item.commission,
      isWin: item.isWin,
    });

    if (res.success && res.bet) {
      setHistory((prev) => {
        const updated = [res.bet!, ...prev.filter((p) => p.id !== res.bet!.id)];
        historyRef.current = updated;
        return updated;
      });
      if (typeof res.balance === 'number') {
        setBalance(res.balance);
        balanceRef.current = res.balance;
      }
      if (res.stats) setStats(res.stats);
      setTotalBetsCount((c) => c + 1);
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

    const res = await api.placeWinGoBet(order);
    if (!res.success || !res.bet) {
      return { success: false, error: res.error || 'Failed to place bet in database' };
    }

    playSound('bet');
    if (typeof res.balance === 'number') {
      setBalance(res.balance);
      balanceRef.current = res.balance;
    }
    setHistory((prev) => {
      const updated = [res.bet!, ...prev.filter((p) => p.id !== res.bet!.id)];
      historyRef.current = updated;
      return updated;
    });
    setTotalBetsCount((c) => c + 1);

    return { success: true, bet: res.bet, betId: res.bet.id };
  };

  const fetchPaginatedBets = useCallback(
    async (params: {
      page?: number;
      limit?: number;
      gameId?: string;
      outcome?: 'all' | 'wins' | 'losses';
      status?: 'all' | 'Completed' | 'Pending';
    }): Promise<PaginatedBetsResponse> => {
      const res = await api.getBets(params);
      if (res.success && res.stats) {
        setStats(res.stats);
      }
      return res;
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
    isClaimingRef.current = true;
    setIsClaimingDailyBonus(true);

    try {
      const res = await api.claimDailyBonus();
      if (res.dailyBonus) setDailyBonus(res.dailyBonus);
      if (typeof res.canClaimDailyBonus === 'boolean') setCanClaimDailyBonus(res.canClaimDailyBonus);
      if (typeof res.timeUntilNextBonus === 'number') setTimeUntilNextBonus(res.timeUntilNextBonus);

      if (!res.success) {
        return {
          success: false,
          amount: 0,
          day: res.dailyBonus?.streak || dailyBonus.streak || 1,
          error: res.error || 'Unable to claim daily bonus',
        };
      }

      if (typeof res.newBalance === 'number') {
        setBalance(res.newBalance);
        balanceRef.current = res.newBalance;
      }
      playSound('jackpot');

      return {
        success: true,
        amount: res.amount || 0,
        day: res.day || 1,
      };
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
    const res = await api.submitDeposit(data);
    if (!res.success || !res.record) {
      return { success: false, error: res.error || 'Failed to submit deposit' };
    }
    setDepositRecords((prev) => [res.record!, ...prev]);
    playSound('click');
    return { success: true, record: res.record };
  };

  const refreshMasterDeposits = useCallback(async () => {
    if (!hasAdminToken()) return;
    const res = await api.getAdminDeposits();
    if (res.success && res.deposits) {
      setMasterDepositRequests(res.deposits);
    }
  }, []);

  const unlockAdmin = async (passcode: string): Promise<{ success: boolean; error?: string }> => {
    const res = await api.unlockAdmin(passcode);
    if (!res.success || !res.adminToken) {
      return { success: false, error: res.error || 'Access denied. Incorrect password.' };
    }
    setAdminToken(res.adminToken);
    setIsAdminUnlocked(true);
    await refreshMasterDeposits();
    return { success: true };
  };

  const exitAdmin = () => {
    setAdminToken(null);
    setIsAdminUnlocked(false);
    setMasterDepositRequests([]);
  };

  const approveDepositRequest = async (
    depositId: string
  ): Promise<{ success: boolean; error?: string }> => {
    const res = await api.approveDeposit(depositId);
    if (res.success) {
      await Promise.all([refreshMasterDeposits(), refreshAccountState()]);
    }
    return res;
  };

  const rejectDepositRequest = async (
    depositId: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const res = await api.rejectDeposit(depositId, reason);
    if (res.success) {
      playSound('loss');
      await Promise.all([refreshMasterDeposits(), refreshAccountState()]);
    }
    return res;
  };

  const saveBankDetails = async (
    details: BankAccountDetails
  ): Promise<{ success: boolean; error?: string }> => {
    const res = await api.saveBankDetails(details);
    if (res.success && res.details) {
      setSavedBankDetails(res.details);
      playSound('click');
      return { success: true };
    }
    return { success: false, error: res.error || 'Failed to save bank details' };
  };

  const submitWithdrawal = async (
    amount: number,
    details: BankAccountDetails
  ): Promise<{ success: boolean; error?: string; record?: WithdrawRecord }> => {
    const res = await api.submitWithdrawal(amount, details);
    if (!res.success || !res.record) {
      return { success: false, error: res.error || 'Failed to submit withdrawal' };
    }
    if (typeof res.balance === 'number') {
      setBalance(res.balance);
      balanceRef.current = res.balance;
    }
    setSavedBankDetails(details);
    setWithdrawRecords((prev) => [res.record!, ...prev]);
    playSound('jackpot');
    return { success: true, record: res.record };
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
