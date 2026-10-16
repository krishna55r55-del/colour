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
} from '../types';
import { soundManager } from '../utils/audio';
import {
  syncUserProfile,
  updateWalletBalanceInSupabase,
  recordBetInSupabase,
  fetchBetHistoryFromSupabase,
  recordDepositInSupabase,
  fetchDepositsFromSupabase,
  recordWithdrawalInSupabase,
  fetchWithdrawalsFromSupabase,
  saveBankDetailsToSupabase,
  fetchBankDetailsFromSupabase,
  testSupabaseConnection,
} from '../lib/supabase';

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
  recordGameResult: (item: Omit<GameHistoryItem, 'id' | 'timestamp'>) => void;
  deposit: (amount: number, bonus?: number, method?: string) => DepositRecord;
  saveBankDetails: (details: BankAccountDetails) => void;
  submitWithdrawal: (amount: number, details: BankAccountDetails) => { success: boolean; error?: string; record?: WithdrawRecord };
  winManagerEnabled: boolean;
  toggleWinManager: () => void;
  setWinManagerEnabled: (enabled: boolean) => void;
  resetBalance: () => void;
  clearHistory: () => void;
  playSound: (type: 'click' | 'bet' | 'tick' | 'card' | 'flip' | 'win' | 'jackpot' | 'loss') => void;
}

// Global storage keys
const STORAGE_KEY_AUTH = 'cobclub_auth_user_v1';
const STORAGE_KEY_ACCOUNTS = 'cobclub_registered_accounts_v1';
const STORAGE_KEY_WIN_MANAGER = 'cobclub_win_manager_v1';
const STORAGE_KEY_SOUND = 'cobclub_sound_pref_v1';
const STORAGE_KEY_RECENT = 'cobclub_recent_games_v1';

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

      return { balance, history, stats, bank, withdraws, deposits };
    } catch {
      return {
        balance: INITIAL_BALANCE,
        history: [],
        stats: defaultStats,
        bank: null,
        withdraws: [],
        deposits: [],
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

  // Win Manager state: ON = all bets win, OFF = all bets lose (or lowest bet wins if all options bet)
  const [winManagerEnabled, setWinManagerEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_WIN_MANAGER);
      return saved !== null ? saved === 'true' : false;
    } catch {
      return false;
    }
  });

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

      // 2. Sync bet history for this account
      const cloudBets = await fetchBetHistoryFromSupabase(memberId, phone);
      if (cloudBets && cloudBets.length > 0) {
        setHistory(cloudBets);
        try {
          localStorage.setItem(getUserKey(phone, 'history'), JSON.stringify(cloudBets.slice(0, 60)));
        } catch {}

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
      } catch {}
    } else {
      // Initialize brand new account storage
      try {
        localStorage.setItem(getUserKey(phone, 'balance'), INITIAL_BALANCE.toString());
        localStorage.setItem(getUserKey(phone, 'history'), '[]');
        localStorage.setItem(getUserKey(phone, 'stats'), JSON.stringify(defaultStats));
        localStorage.setItem(getUserKey(phone, 'withdraws'), '[]');
        localStorage.setItem(getUserKey(phone, 'deposits'), '[]');
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

  const recordGameResult = (item: Omit<GameHistoryItem, 'id' | 'timestamp'>) => {
    const fullItem: GameHistoryItem = {
      ...item,
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

    // Persist to user account in Supabase
    if (user) {
      recordBetInSupabase(fullItem, user.memberId, user.phoneNumber);
      updateWalletBalanceInSupabase(user.memberId, user.phoneNumber, nextBalance);
    }
  };

  const resetBalance = () => {
    setBalance(INITIAL_BALANCE);
    playSound('win');
    if (user) {
      updateWalletBalanceInSupabase(user.memberId, user.phoneNumber, INITIAL_BALANCE);
    }
  };

  const deposit = (amount: number, bonus: number = 0, method: string = 'UPI Instant'): DepositRecord => {
    const totalCredit = amount + bonus;
    const nextBalance = balance + totalCredit;
    setBalance(nextBalance);
    playSound('jackpot');

    const txnId = 'DEP' + Math.floor(1000000 + Math.random() * 9000000);
    const newRecord: DepositRecord = {
      id: txnId,
      amount,
      bonus,
      totalCredit,
      method: method.toUpperCase(),
      timestamp: Date.now(),
      status: 'Completed',
    };

    setDepositRecords((prev) => [newRecord, ...prev]);

    // Persist to user account in Supabase
    if (user) {
      updateWalletBalanceInSupabase(user.memberId, user.phoneNumber, nextBalance);
      recordDepositInSupabase({
        id: txnId,
        memberId: user.memberId,
        phoneNumber: user.phoneNumber,
        amount,
        bonus,
        totalCredit,
        method,
        status: 'Completed',
      });
    }

    return newRecord;
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
        deposit,
        saveBankDetails,
        submitWithdrawal,
        winManagerEnabled,
        toggleWinManager,
        setWinManagerEnabled,
        recordGameResult,
        resetBalance,
        clearHistory,
        playSound,
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
