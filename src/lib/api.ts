import {
  BankAccountDetails,
  DailyBonusState,
  DepositRecord,
  GameHistoryItem,
  ReferralMilestoneBonus,
  ReferralRecord,
  UserProfile,
  UserStats,
  WinGoBetOrderInput,
  WithdrawRecord,
} from '../types';

export interface AccountStatePayload {
  user: UserProfile;
  balance: number;
  hasCompletedFirstDeposit: boolean;
  stats: UserStats;
  dailyBonus: DailyBonusState;
  canClaimDailyBonus: boolean;
  timeUntilNextBonus: number;
  latestBets: GameHistoryItem[];
  totalBetsCount: number;
  depositRecords: DepositRecord[];
  withdrawRecords: WithdrawRecord[];
  savedBankDetails: BankAccountDetails | null;
  userReferrals: ReferralRecord[];
  userReferralBonuses: ReferralMilestoneBonus[];
}

export interface WinGoRoundItem {
  period: string;
  number: number;
  bigSmall: 'Big' | 'Small';
  color: 'green' | 'red' | 'purple_red' | 'purple_green';
}

export interface WinGoStateResponse {
  success: boolean;
  serverTimeMs: number;
  currentPeriods: Record<number, string>;
  historiesByDuration: Record<number, WinGoRoundItem[]>;
  settledBets: GameHistoryItem[];
}

export interface PaginatedBetsResponse {
  success: boolean;
  items: GameHistoryItem[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
  stats: UserStats;
  error?: string;
}

// Kept strictly in memory (never localStorage or sessionStorage)
let inMemoryAuthToken: string | null = null;
let inMemoryAdminToken: string | null = null;

export function setAuthToken(token: string | null) {
  inMemoryAuthToken = token;
}

export function setAdminToken(token: string | null) {
  inMemoryAdminToken = token;
}

export function hasAdminToken(): boolean {
  return Boolean(inMemoryAdminToken);
}

async function apiRequest<T = any>(
  url: string,
  options: RequestInit = {},
  useAdminToken = false
): Promise<T> {
  const headers: Record<string, string> = {
    'X-Requested-With': 'XMLHttpRequest',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (inMemoryAuthToken) {
    headers['Authorization'] = `Bearer ${inMemoryAuthToken}`;
  }
  if (useAdminToken && inMemoryAdminToken) {
    headers['X-Admin-Token'] = inMemoryAdminToken;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      credentials: 'include',
      headers,
    });
  } catch {
    return {
      success: false,
      error: 'Unable to reach server. Please check your connection and try again.',
    } as T;
  }

  const text = await res.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {
      success: false,
      error: `Server returned an unexpected response (${res.status}).`,
    };
  }

  if (!res.ok) {
    if (data.success === undefined) {
      data.success = false;
    }
    if (!data.error) {
      data.error = `Server error (${res.status}). Please try again.`;
    }
  }
  return data as T;
}

export const api = {
  getAccountState: () =>
    apiRequest<{ success: boolean; authenticated: boolean; state?: AccountStatePayload }>(
      '/api/account/state'
    ),

  register: (payload: {
    phoneNumber: string;
    password: string;
    confirmPassword: string;
    inviteCode?: string;
  }) =>
    apiRequest<{
      success: boolean;
      token?: string;
      state?: AccountStatePayload;
      error?: string;
    }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: { phoneNumber: string; password: string }) =>
    apiRequest<{
      success: boolean;
      token?: string;
      state?: AccountStatePayload;
      error?: string;
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  logout: () =>
    apiRequest<{ success: boolean }>('/api/auth/logout', {
      method: 'POST',
    }),

  sendOtp: (phoneNumber: string) =>
    apiRequest<{ success: boolean; message?: string; error?: string }>('/api/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber }),
    }),

  resetPassword: (payload: {
    phoneNumber: string;
    otp: string;
    newPassword: string;
    confirmPassword: string;
  }) =>
    apiRequest<{ success: boolean; error?: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getDailyBonusStatus: () =>
    apiRequest<{
      success: boolean;
      dailyBonus: DailyBonusState;
      canClaimDailyBonus: boolean;
      timeUntilNextBonus: number;
    }>('/api/daily-bonus/status'),

  claimDailyBonus: () =>
    apiRequest<{
      success: boolean;
      amount?: number;
      day?: number;
      newBalance?: number;
      dailyBonus?: DailyBonusState;
      canClaimDailyBonus?: boolean;
      timeUntilNextBonus?: number;
      error?: string;
    }>('/api/daily-bonus/claim', {
      method: 'POST',
    }),

  getWinGoState: () => apiRequest<WinGoStateResponse>('/api/wingo/state'),

  getWinGoRounds: (duration: number, limit = 30) =>
    apiRequest<{ success: boolean; duration: number; rounds: WinGoRoundItem[] }>(
      `/api/wingo/rounds?duration=${encodeURIComponent(duration)}&limit=${encodeURIComponent(limit)}`
    ),

  settleWinGoBets: () =>
    apiRequest<{
      success: boolean;
      settledBets: GameHistoryItem[];
      balance: number;
      stats: UserStats;
      serverTimeMs: number;
      currentPeriods: Record<number, string>;
      historiesByDuration: Record<number, WinGoRoundItem[]>;
    }>('/api/wingo/settle', { method: 'POST' }),

  placeWinGoBet: (order: WinGoBetOrderInput) =>
    apiRequest<{
      success: boolean;
      bet?: GameHistoryItem;
      balance?: number;
      error?: string;
    }>('/api/bets/wingo', {
      method: 'POST',
      body: JSON.stringify(order),
    }),

  placeInstantBet: (amount: number) =>
    apiRequest<{ success: boolean; balance?: number; error?: string }>('/api/bets/instant/place', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }),

  refundInstantBet: (amount: number) =>
    apiRequest<{ success: boolean; balance?: number; error?: string }>('/api/bets/instant/refund', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }),

  recordInstantBet: (payload: {
    gameId: string;
    gameTitle: string;
    betAmount: number;
    choice: string;
    outcome: string;
    payout: number;
    commission?: number;
    isWin: boolean;
  }) =>
    apiRequest<{
      success: boolean;
      bet?: GameHistoryItem;
      balance?: number;
      stats?: UserStats;
      error?: string;
    }>('/api/bets/instant/record', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getBets: (params: {
    page?: number;
    limit?: number;
    gameId?: string;
    outcome?: 'all' | 'wins' | 'losses';
    status?: 'all' | 'Completed' | 'Pending';
  }) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.gameId) qs.set('gameId', params.gameId);
    if (params.outcome) qs.set('outcome', params.outcome);
    if (params.status) qs.set('status', params.status);
    return apiRequest<PaginatedBetsResponse>(`/api/bets?${qs.toString()}`);
  },

  submitDeposit: (payload: {
    amount: number;
    bonus: number;
    method: string;
    utr: string;
    screenshot?: string;
  }) =>
    apiRequest<{ success: boolean; record?: DepositRecord; error?: string }>('/api/deposits', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  saveBankDetails: (details: BankAccountDetails) =>
    apiRequest<{ success: boolean; details?: BankAccountDetails; error?: string }>('/api/bank', {
      method: 'POST',
      body: JSON.stringify(details),
    }),

  submitWithdrawal: (amount: number, details: BankAccountDetails) =>
    apiRequest<{
      success: boolean;
      record?: WithdrawRecord;
      balance?: number;
      error?: string;
    }>('/api/withdrawals', {
      method: 'POST',
      body: JSON.stringify({ amount, details }),
    }),

  unlockAdmin: (passcode: string) =>
    apiRequest<{ success: boolean; adminToken?: string; error?: string }>('/api/admin/unlock', {
      method: 'POST',
      body: JSON.stringify({ passcode }),
    }),

  getAdminDeposits: () =>
    apiRequest<{ success: boolean; deposits?: DepositRecord[]; error?: string }>(
      '/api/admin/deposits',
      {},
      true
    ),

  approveDeposit: (depositId: string) =>
    apiRequest<{ success: boolean; error?: string }>(
      `/api/admin/deposits/${encodeURIComponent(depositId)}/approve`,
      { method: 'POST' },
      true
    ),

  rejectDeposit: (depositId: string, reason?: string) =>
    apiRequest<{ success: boolean; error?: string }>(
      `/api/admin/deposits/${encodeURIComponent(depositId)}/reject`,
      {
        method: 'POST',
        body: JSON.stringify({ reason }),
      },
      true
    ),
};
