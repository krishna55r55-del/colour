export type GameId =
  | 'color-prediction'
  | 'dice-roll'
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
  grossPayout?: number;
  commission?: number;
  settledAt?: number;
  resultNumber?: number;
  resultColor?: string;
  selectedOption?: string;
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

export interface WinGoRoundItem {
  period: string;
  number: number;
  bigSmall: 'Big' | 'Small';
  color: 'green' | 'red' | 'purple_red' | 'purple_green';
}

export interface PaginatedBetsResponse {
  success: boolean;
  items: GameHistoryItem[];
  totalCount: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
  stats?: UserStats;
  error?: string;
}

export interface WinGoBetOrderInput {
  period: string;
  duration: number; // 30, 60, 180, 300
  target: 'green' | 'purple' | 'violet' | 'red' | 'big' | 'small' | number;
  label: string;
  multiplier: number;
  amount: number;
  selectedOption?: string;
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
  referredBy?: string;
}

export interface ReferralRecord {
  id: string;
  referrerMemberId: string;
  referrerPhone: string;
  refereeMemberId: string;
  refereePhone: string;
  registeredAt: number;
  firstDepositCompleted: boolean;
  firstDepositAt?: number;
  rewardAmount: number; // 77 per qualified deposit
}

export interface ReferralMilestoneBonus {
  id: string;
  referrerMemberId: string;
  referrerPhone: string;
  milestoneCount: number; // 5, 10, 15...
  amount: number; // 355 extra per 5 qualified referrals
  awardedAt: number;
}

export interface ReferralStats {
  referralCode: string;
  totalReferred: number;
  qualifiedCount: number;
  pendingCount: number;
  totalEarnedFrom77: number;
  extraBonusEarned355: number;
  totalEarned: number;
  progressToNext5: number; // 0..4 (or 5 when milestone just hit before next cycle)
  milestonesCompleted: number; // count of 5-referral ₹355 bonuses earned
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

export type ViewType = 'home' | 'all-games' | 'history' | 'profile' | 'game' | 'deposit' | 'withdraw' | 'admin' | 'refer';
