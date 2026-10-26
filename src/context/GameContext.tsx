import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  GameId,
  GameHistoryItem,
  UserStats,
  ViewType,
  UserProfile,
  BankAccountDetails,
  WithdrawRecord,
  DepositRecord,
  SupabaseSyncStatus,
  DailyBonusState,
  DailyBonusRecord,
  PlayerBetRecord,
  WinGoBetOrderInput,
} from '../types';
import { soundManager } from '../utils/audio';
import {
  syncUserProfile,
  updateWalletBalanceInSupabase,
  recordBetInSupabase,
  updateBetOutcomeInSupabase,
  recordGameRoundInSupabase,
  fetchBetHistoryFromSupabase,
  fetchAllPlayerBetsFromSupabase,
  recordDepositInSupabase,
  fetchDepositsFromSupabase,
  fetchAllDepositsFromSupabase,
  updateDepositStatusInSupabase,
  recordWithdrawalInSupabase,
  fetchWithdrawalsFromSupabase,
  saveBankDetailsToSupabase,
  fetchBankDetailsFromSupabase,
  recordDailyBonusInSupabase,
  testSupabaseConnection,
} from '../lib/supabase';
import {
  parsePeriodToTimestamp,
  getFinalizedRound,
  getDeterministicNumberForRound,
  determineWinGoOutcome,
  evaluateWinGoBet,
} from '../utils/winLogic';

interface StoredAccount {
  phoneNumber: string;
  passwordHash: string;
  memberId: string;
  registeredAt: number;
}

interface GameContextType {
  balance: number;
  history: GameHistoryItem[];
  stats: UserStats;
  recentlyPlayed: GameId[];
  soundEnabled: boolean;
  activeView: ViewType;
  selectedGameId: GameId | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  savedBankDetails: BankAccountDetails | null;
  withdrawRecords: WithdrawRecord[];
  depositRecords: DepositRecord[];
  supabaseStatus: SupabaseSyncStatus;
  refreshFromSupabase: () => Promise<void>;
  login: (phoneNumber: string, password: string) => { success: boolean; error?: string };
  register: (phoneNumber: string, password: string, confirmPassword: string) => { success: boolean; error?: string };
  logout: () => void;
  toggleSound: () => void;
  setActiveView: (view: ViewType) => void;
  selectGame: (id: GameId | null) => void;
  placeBet: (amount: number) => boolean;
  refundBet: (amount: number) => void;
  submitWinGoBet: (order: WinGoBetOrderInput) => { success: boolean; betId?: string; error?: string };
  pendingWinGoBets: GameHistoryItem[];
  settleWinGoBets: () => Promise<void>;
  recordGameResult: (item: Omit<GameHistoryItem, 'id' | 'timestamp'>) => void;
  deposit: (amount: number, bonus?: number, method?: string) => DepositRecord;
  submitDepositRequest: (data: {
    amount: number;
    bonus: number;
    method: string;
    utr: string;
    screenshot?: string;
  }) => DepositRecord;
  approveDepositRequest: (depositId: string) => { success: boolean; error?: string };
  rejectDepositRequest: (depositId: string, reason?: string) => { success: boolean };
  masterDepositRequests: DepositRecord[];
  refreshMasterDeposits: () => Promise<void>;
  saveBankDetails: (details: BankAccountDetails) => void;
  submitWithdrawal: (amount: number, details: BankAccountDetails) => { success: boolean; error?: string; record?: WithdrawRecord };
  winManagerEnabled: boolean;
  toggleWinManager: () => void;
  setWinManagerEnabled: (enabled: boolean) => void;
  resetBalance: () => void;
  clearHistory: () => void;
  playSound: (type: 'click' | 'bet' | 'tick' | 'card' | 'flip' | 'win' | 'jackpot' | 'loss') => void;
  dailyBonus: DailyBonusState;
  claimDailyBonus: () => { success: boolean; amount: number; day: number; error?: string };
  canClaimDailyBonus: boolean;
  timeUntilNextBonus: number;
  isDailyBonusModalOpen: boolean;
  setIsDailyBonusModalOpen: (open: boolean) => void;
  masterPlayerBets: PlayerBetRecord[];
  refreshMasterPlayerBets: () => Promise<void>;
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

// Global storage keys
const STORAGE_KEY_AUTH = 'cobclub_auth_user_v1';
const STORAGE_KEY_ACCOUNTS = 'cobclub_registered_accounts_v1';
const STORAGE_KEY_WIN_MANAGER = 'cobclub_win_manager_v1';
const STORAGE_KEY_SOUND = 'cobclub_sound_pref_v1';
const STORAGE_KEY_RECENT = 'cobclub_recent_games_v1';
const STORAGE_KEY_MASTER_PLAYER_BETS = 'cobclub_master_player_records_v1';
const STORAGE_KEY_MASTER_DEPOSITS = 'cobclub_master_deposits_v1';

export const BONUS_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export const defaultDailyBonus: DailyBonusState = {
  lastClaimedAt: null,
  streak: 0,
  totalClaimed: 0,
  history: [],
};

// User-scoped storage key helper
const getUserKey = (phone: string, key: string) => `cobclub_${key}_${phone}`;

const INITIAL_BALANCE = 1000;

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

const defaultAccounts: StoredAccount[] = [
  {
    phoneNumber: '9876543210',
    passwordHash: 'password123',
    memberId: 'COB8892',
    registeredAt: Date.now() - 86400000,
  },
];

const defaultUserProfile: UserProfile = {
  phoneNumber: '9876543210',
  memberId: 'COB8892',
  registeredAt: Date.now() - 86400000,
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Registered accounts database
  const [accounts, setAccounts] = useState<StoredAccount[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
      return saved ? JSON.parse(saved) : defaultAccounts;
    } catch {
      return defaultAccounts;
    }
  });

  // Current logged in user
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_AUTH);
      return saved ? JSON.parse(saved) : defaultUserProfile;
    } catch {
      return defaultUserProfile;
    }
  });

  // Helper to load user-specific initial data
  const loadUserInitialData = (phone: string | undefined) => {
    if (!phone) {
      return {
        balance: INITIAL_BALANCE,
        history: [],
        stats: defaultStats,
        bank: null,
        withdraws: [],
        deposits: [],
        dailyBonus: defaultDailyBonus,
      };
    }
    try {
      const savedBal = localStorage.getItem(getUserKey(phone, 'balance'));
      const balance = savedBal !== null ? Math.max(0, parseInt(savedBal, 10)) : INITIAL_BALANCE;

      const savedHist = localStorage.getItem(getUserKey(phone, 'history'));
      const history = savedHist ? JSON.parse(savedHist) : [];

      const savedSt = localStorage.getItem(getUserKey(phone, 'stats'));
      const stats = savedSt ? JSON.parse(savedSt) : defaultStats;

      const savedB = localStorage.getItem(getUserKey(phone, 'bank'));
      const bank = savedB ? JSON.parse(savedB) : null;

      const savedW = localStorage.getItem(getUserKey(phone, 'withdraws'));
      const withdraws = savedW ? JSON.parse(savedW) : [];

      const savedD = localStorage.getItem(getUserKey(phone, 'deposits'));
      const deposits = savedD ? JSON.parse(savedD) : [];

      const savedBonus = localStorage.getItem(getUserKey(phone, 'daily_bonus'));
      const dailyBonus: DailyBonusState = savedBonus ? JSON.parse(savedBonus) : defaultDailyBonus;

      return { balance, history, stats, bank, withdraws, deposits, dailyBonus };
    } catch {
      return {
        balance: INITIAL_BALANCE,
        history: [],
        stats: defaultStats,
        bank: null,
        withdraws: [],
        deposits: [],
        dailyBonus: defaultDailyBonus,
      };
    }
  };

  const initialData = loadUserInitialData(user?.phoneNumber);

  const [balance, setBalance] = useState<number>(initialData.balance);
  const [history, setHistory] = useState<GameHistoryItem[]>(initialData.history);
  const [stats, setStats] = useState<UserStats>(initialData.stats);
  const [savedBankDetails, setSavedBankDetails] = useState<BankAccountDetails | null>(initialData.bank);
  const [withdrawRecords, setWithdrawRecords] = useState<WithdrawRecord[]>(initialData.withdraws);
  const [depositRecords, setDepositRecords] = useState<DepositRecord[]>(initialData.deposits);
  const [dailyBonus, setDailyBonus] = useState<DailyBonusState>(initialData.dailyBonus || defaultDailyBonus);
  const [isDailyBonusModalOpen, setIsDailyBonusModalOpen] = useState<boolean>(false);
  const [masterPlayerBets, setMasterPlayerBets] = useState<PlayerBetRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MASTER_PLAYER_BETS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [masterDepositRequests, setMasterDepositRequests] = useState<DepositRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MASTER_DEPOSITS);
      if (saved) return JSON.parse(saved);
      return [];
    } catch {
      return [];
    }
  });

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

  // Win Manager state: strictly defaults to OFF (false) as requested ("Winning button default off Rahe")
  const [winManagerEnabled, setWinManagerEnabled] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_WIN_MANAGER, winManagerEnabled ? 'true' : 'false');
    } catch {}
  }, [winManagerEnabled]);

  // Supabase live connection state
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseSyncStatus>({
    connected: true,
    tablesReady: false,
    projectRef: 'ijjzajfgdlpzbvxmypya',
    missingTables: [],
    lastSyncedAt: null,
  });

  const userRef = useRef(user);
  userRef.current = user;

  const balanceRef = useRef(balance);
  balanceRef.current = balance;

  const historyRef = useRef(history);
  historyRef.current = history;

  const pendingWinGoBets = React.useMemo(() => {
    return history.filter((h) => h.gameId === 'color-prediction' && h.status === 'Pending');
  }, [history]);

  // Sync Supabase data for the currently active logged-in user
  const performSupabaseSync = async () => {
    const currentUser = userRef.current;
    try {
      const health = await testSupabaseConnection();
      setSupabaseStatus({
        connected: health.connected,
        tablesReady: health.tablesReady,
        projectRef: health.projectRef,
        missingTables: health.missingTables,
        lastSyncedAt: Date.now(),
      });

      if (!currentUser) return;
      const phone = currentUser.phoneNumber;
      const memberId = currentUser.memberId;

      // 1. Sync wallet balance with profiles table for this account
      const profileSync = await syncUserProfile(memberId, phone, balanceRef.current);
      if (profileSync.isSynced && profileSync.balance !== balanceRef.current) {
        setBalance(profileRes => {
          try {
            localStorage.setItem(getUserKey(phone, 'balance'), profileSync.balance.toString());
          } catch {}
          return profileSync.balance;
        });
      }

      // 2. Sync bet history for this account with idempotency & deduplication
      const cloudBets = await fetchBetHistoryFromSupabase(memberId, phone);
      if (cloudBets && cloudBets.length > 0) {
        setHistory((prev) => {
          const map = new Map<string, GameHistoryItem>();
          cloudBets.forEach((b) => map.set(b.id, b));
          // Preserve local pending bets or newer settled bets
          prev.forEach((p) => {
            if (!map.has(p.id)) {
              map.set(p.id, p);
            } else if (p.status === 'Completed' && map.get(p.id)?.status === 'Pending') {
              map.set(p.id, p);
            }
          });
          const merged = Array.from(map.values())
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 100);
          try {
            localStorage.setItem(getUserKey(phone, 'history'), JSON.stringify(merged.slice(0, 60)));
          } catch {}
          historyRef.current = merged;
          return merged;
        });

        // Calculate and sync stats from history
        const totalRounds = cloudBets.length;
        const totalWins = cloudBets.filter((b) => b.isWin).length;
        const totalLosses = totalRounds - totalWins;
        const totalWagered = cloudBets.reduce((acc, b) => acc + b.betAmount, 0);
        const totalWon = cloudBets.reduce((acc, b) => acc + b.payout, 0);
        const biggestWin = Math.max(0, ...cloudBets.map((b) => b.payout));
        const newStats: UserStats = {
          totalRounds,
          totalWins,
          totalLosses,
          totalWagered,
          totalWon,
          biggestWin,
          currentStreak: 0,
          bestStreak: 0,
          favoriteGameId: cloudBets[0]?.gameId || null,
        };
        setStats(newStats);
        try {
          localStorage.setItem(getUserKey(phone, 'stats'), JSON.stringify(newStats));
        } catch {}
      }

      // 3. Sync deposit records for this account
      const cloudDeposits = await fetchDepositsFromSupabase(memberId, phone);
      if (cloudDeposits && cloudDeposits.length > 0) {
        const mappedDeposits: DepositRecord[] = cloudDeposits.map((d) => ({
          id: d.id,
          amount: d.amount,
          bonus: d.bonus,
          totalCredit: d.total_credit,
          method: d.method,
          timestamp: d.created_at ? new Date(d.created_at).getTime() : Date.now(),
          status: d.status,
        }));
        setDepositRecords(mappedDeposits);
        try {
          localStorage.setItem(getUserKey(phone, 'deposits'), JSON.stringify(mappedDeposits));
        } catch {}
      }

      // 4. Sync withdrawal records for this account
      const cloudWithdrawals = await fetchWithdrawalsFromSupabase(memberId, phone);
      if (cloudWithdrawals && cloudWithdrawals.length > 0) {
        setWithdrawRecords(cloudWithdrawals);
        try {
          localStorage.setItem(getUserKey(phone, 'withdraws'), JSON.stringify(cloudWithdrawals));
        } catch {}
      }

      // 5. Sync bank account details for this account
      const cloudBank = await fetchBankDetailsFromSupabase(memberId, phone);
      if (cloudBank) {
        setSavedBankDetails(cloudBank);
        try {
          localStorage.setItem(getUserKey(phone, 'bank'), JSON.stringify(cloudBank));
        } catch {}
      }

      // 6. Sync daily login bonus tracking
      if (profileSync.isSynced) {
        if (profileSync.lastDailyBonusAt !== undefined || profileSync.dailyStreak !== undefined) {
          setDailyBonus((prev) => {
            const updated: DailyBonusState = {
              ...prev,
              lastClaimedAt: profileSync.lastDailyBonusAt !== undefined ? profileSync.lastDailyBonusAt : prev.lastClaimedAt,
              streak: profileSync.dailyStreak !== undefined ? profileSync.dailyStreak : prev.streak,
              totalClaimed: profileSync.totalBonusClaimed !== undefined ? profileSync.totalBonusClaimed : prev.totalClaimed,
            };
            try {
              localStorage.setItem(getUserKey(phone, 'daily_bonus'), JSON.stringify(updated));
            } catch {}
            return updated;
          });
        }
      }

      // 7. Sync master player bet records ("player bet history will save in my records")
      await refreshMasterPlayerBets();
    } catch (e) {
      console.warn('Supabase sync warning:', e);
    }
  };

  // Switch to account data when user logs in or registers
  const switchAccount = async (targetUser: UserProfile, isNewReg: boolean = false) => {
    const phone = targetUser.phoneNumber;
    const memberId = targetUser.memberId;

    let accBalance = INITIAL_BALANCE;
    let accHistory: GameHistoryItem[] = [];
    let accStats: UserStats = defaultStats;
    let accBank: BankAccountDetails | null = null;
    let accWithdraws: WithdrawRecord[] = [];
    let accDeposits: DepositRecord[] = [];
    let accDailyBonus: DailyBonusState = defaultDailyBonus;

    if (!isNewReg) {
      try {
        const savedBal = localStorage.getItem(getUserKey(phone, 'balance'));
        if (savedBal !== null) accBalance = Math.max(0, parseInt(savedBal, 10));

        const savedHist = localStorage.getItem(getUserKey(phone, 'history'));
        if (savedHist) accHistory = JSON.parse(savedHist);

        const savedSt = localStorage.getItem(getUserKey(phone, 'stats'));
        if (savedSt) accStats = JSON.parse(savedSt);

        const savedB = localStorage.getItem(getUserKey(phone, 'bank'));
        if (savedB) accBank = JSON.parse(savedB);

        const savedW = localStorage.getItem(getUserKey(phone, 'withdraws'));
        if (savedW) accWithdraws = JSON.parse(savedW);

        const savedD = localStorage.getItem(getUserKey(phone, 'deposits'));
        if (savedD) accDeposits = JSON.parse(savedD);

        const savedBonus = localStorage.getItem(getUserKey(phone, 'daily_bonus'));
        if (savedBonus) accDailyBonus = JSON.parse(savedBonus);
      } catch {}
    } else {
      // Initialize brand new account storage
      try {
        localStorage.setItem(getUserKey(phone, 'balance'), INITIAL_BALANCE.toString());
        localStorage.setItem(getUserKey(phone, 'history'), '[]');
        localStorage.setItem(getUserKey(phone, 'stats'), JSON.stringify(defaultStats));
        localStorage.setItem(getUserKey(phone, 'withdraws'), '[]');
        localStorage.setItem(getUserKey(phone, 'deposits'), '[]');
        localStorage.setItem(getUserKey(phone, 'daily_bonus'), JSON.stringify(defaultDailyBonus));
        localStorage.removeItem(getUserKey(phone, 'bank'));
      } catch {}
    }

    // Set user state
    setUser(targetUser);
    setBalance(accBalance);
    setHistory(accHistory);
    setStats(accStats);
    setSavedBankDetails(accBank);
    setWithdrawRecords(accWithdraws);
    setDepositRecords(accDeposits);
    setDailyBonus(accDailyBonus);

    // Save auth session
    try {
      localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(targetUser));
    } catch {}

    // Trigger Supabase fetch for this user
    userRef.current = targetUser;
    balanceRef.current = accBalance;
    await performSupabaseSync();
  };

  useEffect(() => {
    if (user?.phoneNumber) {
      performSupabaseSync();
    }
  }, [user?.phoneNumber]);

  // Persist user-scoped data whenever state updates
  useEffect(() => {
    if (!user?.phoneNumber) return;
    const phone = user.phoneNumber;
    try {
      localStorage.setItem(getUserKey(phone, 'balance'), balance.toString());
    } catch {}
  }, [balance, user?.phoneNumber]);

  useEffect(() => {
    if (!user?.phoneNumber) return;
    const phone = user.phoneNumber;
    try {
      localStorage.setItem(getUserKey(phone, 'history'), JSON.stringify(history.slice(0, 60)));
    } catch {}
  }, [history, user?.phoneNumber]);

  useEffect(() => {
    if (!user?.phoneNumber) return;
    const phone = user.phoneNumber;
    try {
      localStorage.setItem(getUserKey(phone, 'stats'), JSON.stringify(stats));
    } catch {}
  }, [stats, user?.phoneNumber]);

  useEffect(() => {
    if (!user?.phoneNumber) return;
    const phone = user.phoneNumber;
    try {
      localStorage.setItem(getUserKey(phone, 'withdraws'), JSON.stringify(withdrawRecords.slice(0, 30)));
    } catch {}
  }, [withdrawRecords, user?.phoneNumber]);

  useEffect(() => {
    if (!user?.phoneNumber) return;
    const phone = user.phoneNumber;
    try {
      localStorage.setItem(getUserKey(phone, 'deposits'), JSON.stringify(depositRecords.slice(0, 30)));
    } catch {}
  }, [depositRecords, user?.phoneNumber]);

  useEffect(() => {
    if (!user?.phoneNumber) return;
    const phone = user.phoneNumber;
    try {
      if (savedBankDetails) {
        localStorage.setItem(getUserKey(phone, 'bank'), JSON.stringify(savedBankDetails));
      } else {
        localStorage.removeItem(getUserKey(phone, 'bank'));
      }
    } catch {}
  }, [savedBankDetails, user?.phoneNumber]);

  useEffect(() => {
    if (!user?.phoneNumber) return;
    const phone = user.phoneNumber;
    try {
      localStorage.setItem(getUserKey(phone, 'daily_bonus'), JSON.stringify(dailyBonus));
    } catch {}
  }, [dailyBonus, user?.phoneNumber]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));
    } catch {}
  }, [accounts]);

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

  const playSound = (type: 'click' | 'bet' | 'tick' | 'card' | 'flip' | 'win' | 'jackpot' | 'loss') => {
    if (soundEnabled) {
      soundManager.play(type);
    }
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    if (next) {
      soundManager.play('click');
    }
  };

  const login = (phoneNumber: string, password: string): { success: boolean; error?: string } => {
    const cleanedPhone = phoneNumber.trim().replace(/\D/g, '');
    if (cleanedPhone.length < 10) {
      return { success: false, error: 'Please enter a valid 10-digit mobile number' };
    }
    if (!password) {
      return { success: false, error: 'Password is required' };
    }

    const matched = accounts.find((a) => a.phoneNumber === cleanedPhone);
    if (!matched) {
      return { success: false, error: 'No account found with this phone number. Please register.' };
    }

    if (matched.passwordHash !== password) {
      return { success: false, error: 'Incorrect password. Please try again.' };
    }

    const userProfile: UserProfile = {
      phoneNumber: matched.phoneNumber,
      memberId: matched.memberId,
      registeredAt: matched.registeredAt,
    };

    // Load and switch to this account's isolated data
    switchAccount(userProfile, false);
    playSound('win');
    return { success: true };
  };

  const register = (
    phoneNumber: string,
    password: string,
    confirmPassword: string
  ): { success: boolean; error?: string } => {
    const cleanedPhone = phoneNumber.trim().replace(/\D/g, '');
    if (cleanedPhone.length < 10) {
      return { success: false, error: 'Please enter a valid 10-digit mobile number' };
    }
    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long' };
    }
    if (password !== confirmPassword) {
      return { success: false, error: 'Passwords do not match' };
    }

    const exists = accounts.find((a) => a.phoneNumber === cleanedPhone);
    if (exists) {
      return { success: false, error: 'An account with this phone number already exists' };
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const newMemberId = `COB${randomSuffix}`;
    const newAccount: StoredAccount = {
      phoneNumber: cleanedPhone,
      passwordHash: password,
      memberId: newMemberId,
      registeredAt: Date.now(),
    };

    setAccounts((prev) => [...prev, newAccount]);

    const userProfile: UserProfile = {
      phoneNumber: cleanedPhone,
      memberId: newMemberId,
      registeredAt: Date.now(),
    };

    // Initialize fresh account state & sync to Supabase
    switchAccount(userProfile, true);
    playSound('jackpot');

    // Create profile in Supabase
    updateWalletBalanceInSupabase(newMemberId, cleanedPhone, INITIAL_BALANCE);

    return { success: true };
  };

  const logout = () => {
    playSound('click');
    setUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY_AUTH);
    } catch {}
    setActiveView('home');
    setSelectedGameId(null);
  };

  const selectGame = (id: GameId | null) => {
    setSelectedGameId(id);
    if (id) {
      setRecentlyPlayed((prev) => {
        const filtered = prev.filter((g) => g !== id);
        return [id, ...filtered].slice(0, 5);
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const placeBet = (amount: number): boolean => {
    if (amount <= 0 || balance < amount) {
      return false;
    }
    const nextBalance = balance - amount;
    setBalance(nextBalance);
    playSound('bet');

    // Sync updated balance to Supabase and user storage
    if (user) {
      updateWalletBalanceInSupabase(user.memberId, user.phoneNumber, nextBalance);
    }
    return true;
  };

  const refundBet = (amount: number) => {
    const nextBalance = balance + amount;
    setBalance(nextBalance);
    if (user) {
      updateWalletBalanceInSupabase(user.memberId, user.phoneNumber, nextBalance);
    }
  };

  // Submit a continuous WinGo bet: immediately deducts wager, creates pending record with unique ID,
  // syncs to Supabase bet_history, and guarantees the bet is never cancelled on navigation or reload
  const submitWinGoBet = (order: WinGoBetOrderInput): { success: boolean; betId?: string; error?: string } => {
    if (order.amount <= 0) {
      return { success: false, error: 'Invalid bet amount' };
    }
    if (balance < order.amount) {
      return { success: false, error: 'Insufficient available points' };
    }

    const nextBalance = balance - order.amount;
    setBalance(nextBalance);
    balanceRef.current = nextBalance;
    playSound('bet');

    const phone = user?.phoneNumber || '9876543210';
    const memberId = user?.memberId || 'COB8892';

    if (user) {
      try {
        localStorage.setItem(getUserKey(phone, 'balance'), nextBalance.toString());
      } catch {}
      updateWalletBalanceInSupabase(memberId, phone, nextBalance);
    }

    const betId = `wingo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const pendingItem: GameHistoryItem = {
      id: betId,
      gameId: 'color-prediction',
      gameTitle: `Color Prediction (Win Go ${order.duration >= 60 ? `${order.duration / 60}Min` : `${order.duration}s`})`,
      betAmount: order.amount,
      choice: `${order.label} [Issue ${order.period.slice(-4)}]`,
      outcome: 'Pending Resolution',
      payout: 0,
      netProfit: -order.amount,
      isWin: false,
      timestamp: Date.now(),
      status: 'Pending',
      period: order.period,
      target: String(order.target),
      multiplier: order.multiplier,
      duration: order.duration,
    };

    setHistory((prev) => {
      const updated = [pendingItem, ...prev.filter((p) => p.id !== betId)].slice(0, 100);
      historyRef.current = updated;
      try {
        localStorage.setItem(getUserKey(phone, 'history'), JSON.stringify(updated.slice(0, 60)));
      } catch {}
      return updated;
    });

    // Record in master player records
    const playerBetItem: PlayerBetRecord = {
      ...pendingItem,
      memberId,
      phoneNumber: phone,
    };
    setMasterPlayerBets((prev) => {
      const updated = [playerBetItem, ...prev.filter((b) => b.id !== playerBetItem.id)].slice(0, 300);
      try {
        localStorage.setItem(STORAGE_KEY_MASTER_PLAYER_BETS, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // Persist pending bet immediately to Supabase
    recordBetInSupabase(pendingItem, memberId, phone);

    return { success: true, betId };
  };

  const isSettlingRef = useRef(false);

  // Global continuous settlement algorithm: evaluates any pending WinGo bets whose periods have completed
  const settleWinGoBets = async () => {
    if (isSettlingRef.current) return;
    isSettlingRef.current = true;

    try {
      const now = Date.now();
      const currentHist = historyRef.current;
      const pendingBets = currentHist.filter(
        (h) => h.gameId === 'color-prediction' && h.status === 'Pending' && h.period
      );

      if (pendingBets.length === 0) {
        return;
      }

      let balanceIncrement = 0;
      let didUpdateAny = false;
      const settledBetIds = new Set<string>();

      const updatedHistory = currentHist.map((item) => {
        if (item.gameId !== 'color-prediction' || item.status !== 'Pending' || !item.period) {
          return item;
        }

        const dur = item.duration || 30;
        const { roundEndTime } = parsePeriodToTimestamp(item.period, dur);

        // Check if round has elapsed
        if (now < roundEndTime) {
          return item;
        }

        // Look up all pending bets for this exact period and duration
        const periodBets = pendingBets.filter(
          (p) => p.period === item.period && (p.duration || 30) === dur
        );
        const { roundIdx } = parsePeriodToTimestamp(item.period, dur);
        const defaultNum = getDeterministicNumberForRound(roundIdx, dur);
        const drawnNum = periodBets.length > 0
          ? determineWinGoOutcome(
              periodBets.map((b) => ({ target: b.target as any, amount: b.betAmount })),
              winManagerEnabled,
              defaultNum
            )
          : defaultNum;

        const bigSmall: 'Big' | 'Small' = drawnNum >= 5 ? 'Big' : 'Small';
        let color: 'green' | 'red' | 'purple_red' | 'purple_green';
        if (drawnNum === 0) color = 'purple_red';
        else if (drawnNum === 5) color = 'purple_green';
        else if ([1, 3, 7, 9].includes(drawnNum)) color = 'green';
        else color = 'red';

        let targetVal: any = item.target;
        if (targetVal !== undefined && !isNaN(Number(targetVal))) {
          targetVal = Number(targetVal);
        }

        const evalRes = evaluateWinGoBet(targetVal, item.betAmount, drawnNum);

        didUpdateAny = true;
        settledBetIds.add(item.id);
        if (evalRes.isWin && evalRes.payout > 0) {
          balanceIncrement += evalRes.payout;
        }

        const outcomeText = `Number ${drawnNum} (${bigSmall})`;

        // Persist finalized game round to Supabase
        recordGameRoundInSupabase({
          id: `${dur}_${item.period}`,
          duration: dur,
          period: item.period,
          roundIndex: roundIdx,
          number: drawnNum,
          color: color,
          bigSmall: bigSmall,
          finalizedAt: roundEndTime,
        });

        // Update bet outcome in Supabase
        updateBetOutcomeInSupabase(
          item.id,
          outcomeText,
          evalRes.payout,
          evalRes.netProfit,
          evalRes.isWin,
          roundEndTime
        );

        return {
          ...item,
          status: 'Completed' as const,
          outcome: outcomeText,
          payout: evalRes.payout,
          commission: evalRes.commission,
          netProfit: evalRes.netProfit,
          isWin: evalRes.isWin,
          settledAt: roundEndTime,
        };
      });

      if (didUpdateAny) {
        setHistory(updatedHistory);
        historyRef.current = updatedHistory;

        const phone = userRef.current?.phoneNumber || '9876543210';
        const memberId = userRef.current?.memberId || 'COB8892';

        try {
          localStorage.setItem(getUserKey(phone, 'history'), JSON.stringify(updatedHistory.slice(0, 60)));
        } catch {}

        if (balanceIncrement > 0) {
          setBalance((prevBal) => {
            const nextBal = prevBal + balanceIncrement;
            balanceRef.current = nextBal;
            try {
              localStorage.setItem(getUserKey(phone, 'balance'), nextBal.toString());
            } catch {}
            if (userRef.current) {
              updateWalletBalanceInSupabase(memberId, phone, nextBal);
            }
            return nextBal;
          });
          playSound('win');
        }

        // Update stats
        setStats((prevStats) => {
          let addedWins = 0;
          let addedLosses = 0;
          let addedWon = 0;
          let biggestWin = prevStats.biggestWin;

          updatedHistory.forEach((h) => {
            if (settledBetIds.has(h.id)) {
              if (h.isWin) {
                addedWins++;
                addedWon += h.payout;
                if (h.payout > biggestWin) biggestWin = h.payout;
              } else {
                addedLosses++;
              }
            }
          });

          const nextStats = {
            ...prevStats,
            totalWins: prevStats.totalWins + addedWins,
            totalLosses: prevStats.totalLosses + addedLosses,
            totalWon: prevStats.totalWon + addedWon,
            biggestWin,
          };

          try {
            localStorage.setItem(getUserKey(phone, 'stats'), JSON.stringify(nextStats));
          } catch {}
          return nextStats;
        });

        // Update masterPlayerBets
        setMasterPlayerBets((prev) => {
          const updated = prev.map((p) => {
            if (settledBetIds.has(p.id)) {
              const match = updatedHistory.find((u) => u.id === p.id);
              if (match) {
                return {
                  ...p,
                  status: 'Completed' as const,
                  outcome: match.outcome,
                  payout: match.payout,
                  commission: match.commission,
                  netProfit: match.netProfit,
                  isWin: match.isWin,
                  settledAt: match.settledAt,
                };
              }
            }
            return p;
          });
          try {
            localStorage.setItem(STORAGE_KEY_MASTER_PLAYER_BETS, JSON.stringify(updated));
          } catch {}
          return updated;
        });
      }
    } finally {
      isSettlingRef.current = false;
    }
  };

  // Continuous global background settlement loop: runs every 1 second
  // Ensures any pending bets are resolved on time, even if user navigated away or refreshed
  useEffect(() => {
    settleWinGoBets();
    const interval = setInterval(() => {
      settleWinGoBets();
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync and settle on window visibility and focus
  useEffect(() => {
    const handleSync = () => {
      settleWinGoBets();
    };
    window.addEventListener('visibilitychange', handleSync);
    window.addEventListener('focus', handleSync);
    return () => {
      window.removeEventListener('visibilitychange', handleSync);
      window.removeEventListener('focus', handleSync);
    };
  }, []);

  const recordGameResult = (item: Omit<GameHistoryItem, 'id' | 'timestamp'>) => {
    let finalPayout = item.payout;
    let finalCommission = item.commission || 0;
    let finalNetProfit = item.netProfit;

    // Deduct 2.4% commission on winning payouts
    if (item.isWin && finalPayout > 0 && finalCommission === 0) {
      finalCommission = Number((finalPayout * 0.024).toFixed(2));
      finalPayout = Number((finalPayout - finalCommission).toFixed(2));
      finalNetProfit = Number((finalPayout - item.betAmount).toFixed(2));
    }

    const fullItem: GameHistoryItem = {
      ...item,
      payout: finalPayout,
      commission: finalCommission,
      netProfit: finalNetProfit,
      id: 'round_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: Date.now(),
    };

    let nextBalance = balance;
    if (fullItem.payout > 0) {
      nextBalance = balance + fullItem.payout;
      setBalance(nextBalance);
    }

    if (fullItem.isWin) {
      if (fullItem.payout >= fullItem.betAmount * 5) {
        playSound('jackpot');
      } else {
        playSound('win');
      }
    } else {
      playSound('loss');
    }

    setHistory((prev) => [fullItem, ...prev].slice(0, 60));

    setStats((prev) => {
      const isWin = fullItem.isWin;
      const nextStreak = isWin ? prev.currentStreak + 1 : 0;
      const bestStreak = Math.max(prev.bestStreak, nextStreak);
      const biggestWin = Math.max(prev.biggestWin, fullItem.payout);

      return {
        ...prev,
        totalRounds: prev.totalRounds + 1,
        totalWins: prev.totalWins + (isWin ? 1 : 0),
        totalLosses: prev.totalLosses + (!isWin ? 1 : 0),
        totalWagered: prev.totalWagered + fullItem.betAmount,
        totalWon: prev.totalWon + fullItem.payout,
        biggestWin,
        currentStreak: nextStreak,
        bestStreak,
        favoriteGameId: fullItem.gameId,
      };
    });

    // 1. Record bet into Master Player Records ("player bet history will save in my records")
    const playerBetItem: PlayerBetRecord = {
      ...fullItem,
      memberId: user?.memberId || 'COB8892',
      phoneNumber: user?.phoneNumber || '9876543210',
    };

    setMasterPlayerBets((prev) => {
      const updated = [playerBetItem, ...prev.filter((b) => b.id !== playerBetItem.id)].slice(0, 300);
      try {
        localStorage.setItem(STORAGE_KEY_MASTER_PLAYER_BETS, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // 2. Persist to user account in Supabase
    if (user) {
      recordBetInSupabase(fullItem, user.memberId, user.phoneNumber);
      updateWalletBalanceInSupabase(user.memberId, user.phoneNumber, nextBalance);
    } else {
      recordBetInSupabase(fullItem, 'COB8892', '9876543210');
    }
  };

  const refreshMasterPlayerBets = async () => {
    try {
      const cloudAll = await fetchAllPlayerBetsFromSupabase();
      if (cloudAll && cloudAll.length > 0) {
        setMasterPlayerBets((prev) => {
          const map = new Map<string, PlayerBetRecord>();
          cloudAll.forEach((b) => map.set(b.id, b));
          prev.forEach((b) => {
            if (!map.has(b.id)) map.set(b.id, b);
          });
          const merged = Array.from(map.values())
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 300);
          try {
            localStorage.setItem(STORAGE_KEY_MASTER_PLAYER_BETS, JSON.stringify(merged));
          } catch {}
          return merged;
        });
      }
    } catch (e) {
      console.warn('Master player bets sync error:', e);
    }
  };

  const canClaimDailyBonus =
    !dailyBonus.lastClaimedAt || Date.now() - dailyBonus.lastClaimedAt >= BONUS_COOLDOWN_MS;

  const timeUntilNextBonus = dailyBonus.lastClaimedAt
    ? Math.max(0, BONUS_COOLDOWN_MS - (Date.now() - dailyBonus.lastClaimedAt))
    : 0;

  const claimDailyBonus = (): { success: boolean; amount: number; day: number; error?: string } => {
    if (!canClaimDailyBonus) {
      const hours = Math.ceil(timeUntilNextBonus / (1000 * 60 * 60));
      return {
        success: false,
        amount: 0,
        day: dailyBonus.streak || 1,
        error: `Daily bonus already claimed! Next bonus ready in ${hours} hour${hours > 1 ? 's' : ''}.`,
      };
    }

    let nextDay = 1;
    if (dailyBonus.lastClaimedAt) {
      const timeSinceLastClaim = Date.now() - dailyBonus.lastClaimedAt;
      if (timeSinceLastClaim <= 48 * 60 * 60 * 1000) {
        nextDay = (dailyBonus.streak % 7) + 1;
      } else {
        nextDay = 1;
      }
    } else {
      nextDay = 1;
    }

    const tier = DAILY_BONUS_TIERS.find((t) => t.day === nextDay) || DAILY_BONUS_TIERS[0];
    const points = tier.points;
    const nextBalance = balance + points;

    const newRecord: DailyBonusRecord = {
      id: 'DB_' + Date.now(),
      day: nextDay,
      amount: points,
      claimedAt: Date.now(),
    };

    const nextTotal = (dailyBonus.totalClaimed || 0) + points;
    const nextBonusState: DailyBonusState = {
      lastClaimedAt: Date.now(),
      streak: nextDay,
      totalClaimed: nextTotal,
      history: [newRecord, ...dailyBonus.history].slice(0, 30),
    };

    setDailyBonus(nextBonusState);
    setBalance(nextBalance);
    playSound('jackpot');

    if (user?.phoneNumber) {
      try {
        localStorage.setItem(getUserKey(user.phoneNumber, 'daily_bonus'), JSON.stringify(nextBonusState));
        localStorage.setItem(getUserKey(user.phoneNumber, 'balance'), nextBalance.toString());
      } catch {}
      recordDailyBonusInSupabase(user.memberId, user.phoneNumber, points, nextDay, nextTotal, nextBalance);
    }

    return { success: true, amount: points, day: nextDay };
  };

  const resetBalance = () => {
    setBalance(INITIAL_BALANCE);
    playSound('win');
    if (user) {
      updateWalletBalanceInSupabase(user.memberId, user.phoneNumber, INITIAL_BALANCE);
    }
  };

  const submitDepositRequest = (data: {
    amount: number;
    bonus: number;
    method: string;
    utr: string;
    screenshot?: string;
  }): DepositRecord => {
    const totalCredit = data.amount + data.bonus;
    const txnId = 'DEP' + Math.floor(1000000 + Math.random() * 9000000);
    const newRecord: DepositRecord = {
      id: txnId,
      memberId: user?.memberId || 'COB8892',
      phoneNumber: user?.phoneNumber || '9876543210',
      amount: data.amount,
      bonus: data.bonus,
      totalCredit,
      method: data.method.toUpperCase(),
      utr: data.utr.trim(),
      screenshot: data.screenshot,
      timestamp: Date.now(),
      status: 'Pending', // PENDING APPROVAL! Points are only credited once admin approves
    };

    setDepositRecords((prev) => [newRecord, ...prev]);

    setMasterDepositRequests((prev) => {
      const updated = [newRecord, ...prev.filter((d) => d.id !== txnId)].slice(0, 150);
      try {
        localStorage.setItem(STORAGE_KEY_MASTER_DEPOSITS, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (user) {
      try {
        localStorage.setItem(
          getUserKey(user.phoneNumber, 'deposits'),
          JSON.stringify([newRecord, ...depositRecords.slice(0, 29)])
        );
      } catch {}
    }

    recordDepositInSupabase(newRecord);
    playSound('click');
    return newRecord;
  };

  const approveDepositRequest = (depositId: string): { success: boolean; error?: string } => {
    const req =
      masterDepositRequests.find((d) => d.id === depositId) ||
      depositRecords.find((d) => d.id === depositId);

    if (!req) return { success: false, error: 'Deposit request record not found.' };

    if (req.status === 'Completed') {
      return { success: false, error: 'Deposit has already been approved and credited.' };
    }

    const approvedAt = Date.now();
    const updatedReq: DepositRecord = {
      ...req,
      status: 'Completed',
      approvedAt,
    };

    // 1. Update master deposit requests
    setMasterDepositRequests((prev) => {
      const updated = prev.map((d) => (d.id === req.id ? updatedReq : d));
      try {
        localStorage.setItem(STORAGE_KEY_MASTER_DEPOSITS, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // 2. Check if current active user is the recipient
    const isCurrentActiveUser =
      user && (user.phoneNumber === req.phoneNumber || user.memberId === req.memberId);

    if (isCurrentActiveUser) {
      const nextBal = balance + req.totalCredit;
      setBalance(nextBal);
      setDepositRecords((prev) => prev.map((d) => (d.id === req.id ? updatedReq : d)));
      playSound('jackpot');

      if (user) {
        try {
          localStorage.setItem(getUserKey(user.phoneNumber, 'balance'), nextBal.toString());
          const userDeps = depositRecords.map((d) => (d.id === req.id ? updatedReq : d));
          localStorage.setItem(getUserKey(user.phoneNumber, 'deposits'), JSON.stringify(userDeps));
        } catch {}
        updateWalletBalanceInSupabase(user.memberId, user.phoneNumber, nextBal);
      }
    } else {
      // Target user is another registered user: credit their stored balance
      try {
        if (req.phoneNumber) {
          const targetPhone = req.phoneNumber;
          const savedBal = localStorage.getItem(getUserKey(targetPhone, 'balance'));
          const currentBal = savedBal !== null ? Math.max(0, parseInt(savedBal, 10)) : INITIAL_BALANCE;
          const nextBal = currentBal + req.totalCredit;
          localStorage.setItem(getUserKey(targetPhone, 'balance'), nextBal.toString());

          const rawDeps = localStorage.getItem(getUserKey(targetPhone, 'deposits'));
          const list: DepositRecord[] = rawDeps ? JSON.parse(rawDeps) : [];
          const updList = list.some((d) => d.id === req.id)
            ? list.map((d) => (d.id === req.id ? updatedReq : d))
            : [updatedReq, ...list];
          localStorage.setItem(getUserKey(targetPhone, 'deposits'), JSON.stringify(updList));

          const rawAccs = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
          if (rawAccs) {
            const accs = JSON.parse(rawAccs);
            const idx = accs.findIndex((a: any) => a.phoneNumber === targetPhone);
            if (idx >= 0) {
              accs[idx].balance = nextBal;
              localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accs));
            }
          }
        }
      } catch (err) {
        console.warn('Error crediting offline account:', err);
      }

      if (req.memberId && req.phoneNumber) {
        updateWalletBalanceInSupabase(req.memberId, req.phoneNumber, req.totalCredit);
      }
    }

    updateDepositStatusInSupabase(req.id, 'Completed');
    return { success: true };
  };

  const rejectDepositRequest = (depositId: string, reason?: string): { success: boolean } => {
    const rejectedReason = reason || 'Payment not verified (Invalid UTR or screenshot mismatch)';

    setMasterDepositRequests((prev) => {
      const updated = prev.map((d) =>
        d.id === depositId ? { ...d, status: 'Rejected' as const, rejectedReason } : d
      );
      try {
        localStorage.setItem(STORAGE_KEY_MASTER_DEPOSITS, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setDepositRecords((prev) =>
      prev.map((d) =>
        d.id === depositId ? { ...d, status: 'Rejected' as const, rejectedReason } : d
      )
    );

    updateDepositStatusInSupabase(depositId, 'Rejected', rejectedReason);
    playSound('loss');
    return { success: true };
  };

  const refreshMasterDeposits = async () => {
    try {
      const cloudAll = await fetchAllDepositsFromSupabase();
      if (cloudAll && cloudAll.length > 0) {
        setMasterDepositRequests((prev) => {
          const map = new Map<string, DepositRecord>();
          cloudAll.forEach((d) => map.set(d.id, d));
          prev.forEach((d) => {
            if (!map.has(d.id)) map.set(d.id, d);
          });
          const merged = Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);
          try {
            localStorage.setItem(STORAGE_KEY_MASTER_DEPOSITS, JSON.stringify(merged));
          } catch {}
          return merged;
        });
      }
    } catch (e) {
      console.warn('Refresh master deposits error:', e);
    }
  };

  const deposit = (amount: number, bonus: number = 0, method: string = 'UPI Fast'): DepositRecord => {
    // When deposit is invoked without UTR, submit request for admin verification
    const mockUtr = String(Math.floor(100000000000 + Math.random() * 900000000000));
    return submitDepositRequest({
      amount,
      bonus,
      method,
      utr: mockUtr,
    });
  };

  const toggleWinManager = () => {
    setWinManagerEnabled((prev) => !prev);
    playSound('click');
  };

  const clearHistory = () => {
    setHistory([]);
    if (user) {
      try {
        localStorage.setItem(getUserKey(user.phoneNumber, 'history'), '[]');
      } catch {}
    }
  };

  const saveBankDetails = (details: BankAccountDetails) => {
    setSavedBankDetails(details);
    playSound('click');

    // Persist to user account in Supabase
    if (user) {
      saveBankDetailsToSupabase(details, user.memberId, user.phoneNumber);
    }
  };

  const submitWithdrawal = (
    amount: number,
    details: BankAccountDetails
  ): { success: boolean; error?: string; record?: WithdrawRecord } => {
    if (amount < 200) {
      return { success: false, error: 'Minimum withdrawal amount is ₹200.' };
    }
    if (amount > 50000) {
      return { success: false, error: 'Maximum single withdrawal limit is ₹50,000.' };
    }
    if (balance < amount) {
      return { success: false, error: 'Insufficient wallet balance for this withdrawal.' };
    }
    if (!details.accountHolderName.trim()) {
      return { success: false, error: 'Please enter account holder name as per bank records.' };
    }
    if (!details.bankName.trim()) {
      return { success: false, error: 'Please select or enter bank name.' };
    }
    if (!details.accountNumber.trim() || details.accountNumber.trim().length < 9) {
      return { success: false, error: 'Please enter a valid bank account number (at least 9 digits).' };
    }
    if (!details.ifscCode.trim() || details.ifscCode.trim().length < 8) {
      return { success: false, error: 'Please enter a valid IFSC code (e.g. SBIN0001234).' };
    }

    const nextBalance = balance - amount;
    setBalance(nextBalance);
    saveBankDetails(details);

    const record: WithdrawRecord = {
      id: 'WTH' + Math.floor(1000000 + Math.random() * 9000000),
      amount,
      actualAmount: amount,
      fee: 0,
      bankName: details.bankName,
      accountNumberMasked: '**** ' + details.accountNumber.slice(-4),
      accountHolderName: details.accountHolderName,
      timestamp: Date.now(),
      status: 'Processing',
    };

    setWithdrawRecords((prev) => [record, ...prev]);
    playSound('jackpot');

    // Persist to user account in Supabase
    if (user) {
      updateWalletBalanceInSupabase(user.memberId, user.phoneNumber, nextBalance);
      recordWithdrawalInSupabase(record, user.memberId, user.phoneNumber);
      saveBankDetailsToSupabase(details, user.memberId, user.phoneNumber);
    }

    // Simulate bank transfer completion after 8 seconds
    setTimeout(() => {
      setWithdrawRecords((prev) =>
        prev.map((r) => (r.id === record.id ? { ...r, status: 'Completed' } : r))
      );
    }, 8000);

    return { success: true, record };
  };

  return (
    <GameContext.Provider
      value={{
        balance,
        history,
        stats,
        recentlyPlayed,
        soundEnabled,
        activeView,
        selectedGameId,
        user,
        isAuthenticated: !!user,
        savedBankDetails,
        withdrawRecords,
        depositRecords,
        supabaseStatus,
        refreshFromSupabase: performSupabaseSync,
        login,
        register,
        logout,
        toggleSound,
        setActiveView,
        selectGame,
        placeBet,
        refundBet,
        submitWinGoBet,
        pendingWinGoBets,
        settleWinGoBets,
        deposit,
        submitDepositRequest,
        approveDepositRequest,
        rejectDepositRequest,
        masterDepositRequests,
        refreshMasterDeposits,
        saveBankDetails,
        submitWithdrawal,
        winManagerEnabled,
        toggleWinManager,
        setWinManagerEnabled,
        recordGameResult,
        resetBalance,
        clearHistory,
        playSound,
        dailyBonus,
        claimDailyBonus,
        canClaimDailyBonus,
        timeUntilNextBonus,
        isDailyBonusModalOpen,
        setIsDailyBonusModalOpen,
        masterPlayerBets,
        refreshMasterPlayerBets,
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
