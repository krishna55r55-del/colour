import React, { createContext, useContext, useState, useEffect } from 'react';
import { GameId, GameHistoryItem, UserStats, ViewType, UserProfile } from '../types';
import { soundManager } from '../utils/audio';

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
  login: (phoneNumber: string, password: string) => { success: boolean; error?: string };
  register: (phoneNumber: string, password: string, confirmPassword: string) => { success: boolean; error?: string };
  logout: () => void;
  toggleSound: () => void;
  setActiveView: (view: ViewType) => void;
  selectGame: (id: GameId | null) => void;
  placeBet: (amount: number) => boolean;
  refundBet: (amount: number) => void;
  recordGameResult: (item: Omit<GameHistoryItem, 'id' | 'timestamp'>) => void;
  resetBalance: () => void;
  clearHistory: () => void;
  playSound: (type: 'click' | 'bet' | 'tick' | 'card' | 'flip' | 'win' | 'jackpot' | 'loss') => void;
}

const STORAGE_KEY_BALANCE = 'cobclub_virtual_balance_v1';
const STORAGE_KEY_HISTORY = 'cobclub_game_history_v1';
const STORAGE_KEY_STATS = 'cobclub_user_stats_v1';
const STORAGE_KEY_RECENT = 'cobclub_recent_games_v1';
const STORAGE_KEY_SOUND = 'cobclub_sound_pref_v1';
const STORAGE_KEY_AUTH = 'cobclub_auth_user_v1';
const STORAGE_KEY_ACCOUNTS = 'cobclub_registered_accounts_v1';

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
  // Authentication state - Default authenticated for immediate full website preview
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_AUTH);
      return saved ? JSON.parse(saved) : defaultUserProfile;
    } catch {
      return defaultUserProfile;
    }
  });

  const [accounts, setAccounts] = useState<StoredAccount[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
      return saved ? JSON.parse(saved) : defaultAccounts;
    } catch {
      return defaultAccounts;
    }
  });

  const [balance, setBalance] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BALANCE);
      return saved !== null ? Math.max(0, parseInt(saved, 10)) : INITIAL_BALANCE;
    } catch {
      return INITIAL_BALANCE;
    }
  });

  const [history, setHistory] = useState<GameHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_HISTORY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [stats, setStats] = useState<UserStats>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_STATS);
      return saved ? JSON.parse(saved) : defaultStats;
    } catch {
      return defaultStats;
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

  // Sync state to local storage
  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(user));
      } else {
        localStorage.removeItem(STORAGE_KEY_AUTH);
      }
    } catch {}
  }, [user]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));
    } catch {}
  }, [accounts]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_BALANCE, balance.toString());
    } catch {}
  }, [balance]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history.slice(0, 50)));
    } catch {}
  }, [history]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(stats));
    } catch {}
  }, [stats]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_RECENT, JSON.stringify(recentlyPlayed));
    } catch {}
  }, [recentlyPlayed]);

  useEffect(() => {
    soundManager.setEnabled(soundEnabled);
    try {
      localStorage.setItem(STORAGE_KEY_SOUND, soundEnabled ? 'true' : 'false');
    } catch {}
  }, [soundEnabled]);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundManager.setEnabled(next);
    if (next) soundManager.playClick();
  };

  const playSound = (type: 'click' | 'bet' | 'tick' | 'card' | 'flip' | 'win' | 'jackpot' | 'loss') => {
    if (!soundEnabled) return;
    switch (type) {
      case 'click': soundManager.playClick(); break;
      case 'bet': soundManager.playBet(); break;
      case 'tick': soundManager.playTick(); break;
      case 'card': soundManager.playCardFlip(); break;
      case 'flip': soundManager.playCardFlip(); break;
      case 'win': soundManager.playWin(); break;
      case 'jackpot': soundManager.playJackpot(); break;
      case 'loss': soundManager.playLoss(); break;
    }
  };

  // Sign In handler
  const login = (phoneNumber: string, password: string): { success: boolean; error?: string } => {
    const cleanNumber = phoneNumber.trim().replace(/\D/g, '');
    if (!cleanNumber || cleanNumber.length < 6) {
      return { success: false, error: 'Please enter a valid phone number (at least 6 digits).' };
    }
    if (!password || password.length < 4) {
      return { success: false, error: 'Please enter your password.' };
    }

    const matched = accounts.find((acc) => acc.phoneNumber === cleanNumber);
    if (!matched) {
      return { success: false, error: 'Account not found. Please click Register to create your account.' };
    }
    if (matched.passwordHash !== password) {
      return { success: false, error: 'Incorrect password. Please verify and try again.' };
    }

    const profile: UserProfile = {
      phoneNumber: matched.phoneNumber,
      memberId: matched.memberId,
      registeredAt: matched.registeredAt,
    };
    setUser(profile);
    playSound('win');
    return { success: true };
  };

  // Register handler
  const register = (
    phoneNumber: string,
    password: string,
    confirmPassword: string
  ): { success: boolean; error?: string } => {
    const cleanNumber = phoneNumber.trim().replace(/\D/g, '');
    if (!cleanNumber || cleanNumber.length < 6) {
      return { success: false, error: 'Please enter a valid phone number (at least 6 digits).' };
    }
    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }
    if (password !== confirmPassword) {
      return { success: false, error: 'Passwords do not match. Please verify both passwords.' };
    }

    const exists = accounts.some((acc) => acc.phoneNumber === cleanNumber);
    if (exists) {
      return { success: false, error: 'An account with this phone number already exists. Please Sign In.' };
    }

    const newMemberId = 'COB' + Math.floor(1000 + Math.random() * 9000);
    const newAccount: StoredAccount = {
      phoneNumber: cleanNumber,
      passwordHash: password,
      memberId: newMemberId,
      registeredAt: Date.now(),
    };

    setAccounts((prev) => [...prev, newAccount]);

    const profile: UserProfile = {
      phoneNumber: cleanNumber,
      memberId: newMemberId,
      registeredAt: Date.now(),
    };
    setUser(profile);

    // Initialize starting balance for new user
    setBalance(INITIAL_BALANCE);
    playSound('jackpot');
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    setSelectedGameId(null);
    setActiveView('home');
    playSound('click');
  };

  const selectGame = (id: GameId | null) => {
    setSelectedGameId(id);
    if (id) {
      setActiveView('game');
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
    setBalance((prev) => prev - amount);
    playSound('bet');
    return true;
  };

  const refundBet = (amount: number) => {
    setBalance((prev) => prev + amount);
  };

  const recordGameResult = (item: Omit<GameHistoryItem, 'id' | 'timestamp'>) => {
    const fullItem: GameHistoryItem = {
      ...item,
      id: 'round_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: Date.now(),
    };

    if (fullItem.payout > 0) {
      setBalance((prev) => prev + fullItem.payout);
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
  };

  const resetBalance = () => {
    setBalance(INITIAL_BALANCE);
    playSound('win');
  };

  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY_HISTORY);
    } catch {}
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
        login,
        register,
        logout,
        toggleSound,
        setActiveView,
        selectGame,
        placeBet,
        refundBet,
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
