export type GameId =
  | 'color-prediction'
  | 'dice-roll'
  | 'dragon-tiger'
  | 'lucky-number'
  | 'coin-flip'
  | 'number-prediction'
  | 'spin-wheel'
  | 'lucky-cards'
  | 'color-match'
  | 'memory-match';

export type GameCategory = 'prediction' | 'dice_cards' | 'luck_wheels' | 'arcade';

export interface GameMetadata {
  id: GameId;
  title: string;
  category: GameCategory;
  categoryLabel: string;
  description: string;
  tagline: string;
  badge: string;
  maxMultiplier: string;
  minBet: number;
  featured?: boolean;
  accentColor: string; // 'purple' | 'cyan' | 'green' | 'amber'
  rules: string[];
}

export interface GameHistoryItem {
  id: string;
  gameId: GameId;
  gameTitle: string;
  betAmount: number;
  choice: string;
  outcome: string;
  payout: number;
  netProfit: number;
  isWin: boolean;
  timestamp: number;
  status?: 'Pending' | 'Completed';
  period?: string;
  target?: string;
  multiplier?: number;
  duration?: number;
  commission?: number;
  settledAt?: number;
}

export interface PredictionRoundRecord {
  id: string;
  duration: number;
  period: string;
  roundIndex: number;
  number: number;
  color: 'green' | 'red' | 'purple_red' | 'purple_green';
  bigSmall: 'Big' | 'Small';
  finalizedAt: number;
}

export interface WinGoBetOrderInput {
  period: string;
  duration: number; // 30, 60, 180, 300
  target: 'green' | 'purple' | 'red' | 'big' | 'small' | number;
  label: string;
  multiplier: number;
  amount: number;
}

export interface UserStats {
  totalRounds: number;
  totalWins: number;
  totalLosses: number;
  totalWagered: number;
  totalWon: number;
  biggestWin: number;
  currentStreak: number;
  bestStreak: number;
  favoriteGameId: GameId | null;
}

export interface UserProfile {
  phoneNumber: string;
  memberId: string;
  registeredAt: number;
  lastDailyBonusAt?: number;
  dailyStreak?: number;
  totalBonusClaimed?: number;
}

export interface PlayerBetRecord extends GameHistoryItem {
  memberId: string;
  phoneNumber?: string;
}

export interface DailyBonusRecord {
  id: string;
  day: number;
  amount: number;
  claimedAt: number;
}

export interface DailyBonusState {
  lastClaimedAt: number | null;
  streak: number; // 0 to 7
  totalClaimed: number;
  history: DailyBonusRecord[];
}

export interface BankAccountDetails {
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  upiId?: string;
  phoneNumber?: string;
}

export interface WithdrawRecord {
  id: string;
  amount: number;
  actualAmount: number;
  fee: number;
  bankName: string;
  accountNumberMasked: string;
  accountHolderName: string;
  timestamp: number;
  status: 'Completed' | 'Processing';
}

export interface DepositRecord {
  id: string;
  memberId?: string;
  phoneNumber?: string;
  amount: number;
  bonus: number;
  totalCredit: number;
  method: string;
  utr?: string;
  screenshot?: string;
  timestamp: number;
  status: 'Completed' | 'Pending' | 'Rejected';
  approvedAt?: number;
  rejectedReason?: string;
}

export interface SupabaseSyncStatus {
  connected: boolean;
  tablesReady: boolean;
  projectRef: string;
  missingTables: string[];
  lastSyncedAt: number | null;
}

export type ViewType = 'home' | 'all-games' | 'history' | 'profile' | 'game' | 'deposit' | 'withdraw' | 'admin';
