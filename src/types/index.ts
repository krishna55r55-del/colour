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
}

export type ViewType = 'home' | 'all-games' | 'history' | 'profile' | 'game' | 'deposit';
