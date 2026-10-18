import { createClient } from '@supabase/supabase-js';
import { BankAccountDetails, DepositRecord, GameHistoryItem, PlayerBetRecord, WithdrawRecord } from '../types';

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://ijjzajfgdlpzbvxmypya.supabase.co';
export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Xebe_Nat_dAX1aPv550x2A_rEcwNOto';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export interface SupabaseProfile {
  id: string;
  phone_number: string;
  member_id: string;
  balance: number;
  created_at?: string;
  updated_at?: string;
}

export interface SupabaseDepositRecord {
  id: string;
  member_id: string;
  phone_number?: string;
  amount: number;
  bonus: number;
  total_credit: number;
  method: string;
  status: 'Completed' | 'Pending';
  created_at?: string;
}

/**
 * Test connectivity & detect table availability
 */
export async function testSupabaseConnection(): Promise<{
  connected: boolean;
  tablesReady: boolean;
  projectRef: string;
  missingTables: string[];
}> {
  const missingTables: string[] = [];
  try {
    const requiredTables = ['profiles', 'bet_history', 'deposits', 'withdrawals', 'bank_accounts', 'daily_bonuses'];
    for (const t of requiredTables) {
      const { error } = await supabase.from(t).select('id').limit(1);
      if (error && (error.code === 'PGRST205' || error.message?.includes('schema cache'))) {
        missingTables.push(t);
      }
    }
    return {
      connected: true,
      tablesReady: missingTables.length === 0,
      projectRef: 'ijjzajfgdlpzbvxmypya',
      missingTables,
    };
  } catch {
    return {
      connected: false,
      tablesReady: false,
      projectRef: 'ijjzajfgdlpzbvxmypya',
      missingTables: ['profiles', 'bet_history', 'deposits', 'withdrawals', 'bank_accounts', 'daily_bonuses'],
    };
  }
}

/**
 * Sync user profile & fetch cloud wallet balance for a specific login account
 */
export async function syncUserProfile(
  memberId: string,
  phoneNumber: string,
  fallbackBalance: number
): Promise<{
  balance: number;
  lastDailyBonusAt?: number | null;
  dailyStreak?: number;
  totalBonusClaimed?: number;
  isSynced: boolean;
}> {
  try {
    let query = supabase.from('profiles').select('*');
    if (phoneNumber && memberId) {
      query = query.or(`member_id.eq.${memberId},phone_number.eq.${phoneNumber}`);
    } else {
      query = query.eq('member_id', memberId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      // Table might not exist yet; fail gracefully
      return { balance: fallbackBalance, isSynced: false };
    }

    if (data && typeof data.balance === 'number') {
      return {
        balance: Number(data.balance),
        lastDailyBonusAt: data.last_daily_bonus_at ? new Date(data.last_daily_bonus_at).getTime() : null,
        dailyStreak: typeof data.daily_streak === 'number' ? data.daily_streak : 0,
        totalBonusClaimed: typeof data.total_bonus_claimed === 'number' ? Number(data.total_bonus_claimed) : 0,
        isSynced: true,
      };
    }

    // Profile does not exist yet; create it for this user account
    const { error: insertErr } = await supabase.from('profiles').upsert(
      {
        id: memberId,
        member_id: memberId,
        phone_number: phoneNumber,
        balance: fallbackBalance,
        last_daily_bonus_at: null,
        daily_streak: 0,
        total_bonus_claimed: 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'member_id' }
    );

    if (insertErr) {
      return { balance: fallbackBalance, isSynced: false };
    }

    return { balance: fallbackBalance, isSynced: true };
  } catch {
    return { balance: fallbackBalance, isSynced: false };
  }
}

/**
 * Update wallet balance in Supabase for a specific logged-in user
 */
export async function updateWalletBalanceInSupabase(
  memberId: string,
  phoneNumber: string,
  newBalance: number
): Promise<boolean> {
  try {
    const { error } = await supabase.from('profiles').upsert(
      {
        id: memberId,
        member_id: memberId,
        phone_number: phoneNumber,
        balance: newBalance,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'member_id' }
    );
    return !error;
  } catch {
    return false;
  }
}

/**
 * Record a game bet outcome in Supabase linked directly to the user's login account
 */
export async function recordBetInSupabase(
  item: GameHistoryItem,
  memberId: string,
  phoneNumber?: string
): Promise<boolean> {
  try {
    const { error } = await supabase.from('bet_history').insert({
      id: item.id,
      member_id: memberId,
      phone_number: phoneNumber || null,
      game_id: item.gameId,
      game_title: item.gameTitle,
      bet_amount: item.betAmount,
      choice: String(item.choice),
      outcome: String(item.outcome),
      payout: item.payout,
      net_profit: item.netProfit,
      is_win: item.isWin,
      created_at: new Date(item.timestamp).toISOString(),
    });
    return !error;
  } catch {
    return false;
  }
}

/**
 * Fetch bet history from Supabase strictly for the specified logged-in user
 */
export async function fetchBetHistoryFromSupabase(
  memberId: string,
  phoneNumber?: string
): Promise<GameHistoryItem[] | null> {
  try {
    let query = supabase
      .from('bet_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(60);

    if (phoneNumber && memberId) {
      query = query.or(`member_id.eq.${memberId},phone_number.eq.${phoneNumber}`);
    } else {
      query = query.eq('member_id', memberId);
    }

    const { data, error } = await query;

    if (error || !data) return null;

    return data.map((row: any) => ({
      id: row.id,
      gameId: row.game_id,
      gameTitle: row.game_title,
      betAmount: Number(row.bet_amount),
      choice: row.choice,
      outcome: row.outcome,
      payout: Number(row.payout),
      netProfit: Number(row.net_profit),
      isWin: Boolean(row.is_win),
      timestamp: new Date(row.created_at).getTime(),
    }));
  } catch {
    return null;
  }
}

/**
 * Record a deposit in Supabase linked to user account
 */
export async function recordDepositInSupabase(depositRecord: DepositRecord): Promise<boolean> {
  try {
    const payload: any = {
      id: depositRecord.id,
      member_id: depositRecord.memberId || 'COB8892',
      phone_number: depositRecord.phoneNumber || null,
      amount: depositRecord.amount,
      bonus: depositRecord.bonus,
      total_credit: depositRecord.totalCredit,
      method: depositRecord.method,
      status: depositRecord.status,
      created_at: new Date(depositRecord.timestamp || Date.now()).toISOString(),
    };
    if (depositRecord.utr) payload.utr = depositRecord.utr;
    if (depositRecord.screenshot) payload.screenshot = depositRecord.screenshot;
    if (depositRecord.rejectedReason) payload.rejected_reason = depositRecord.rejectedReason;

    const { error } = await supabase.from('deposits').insert(payload);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Update a deposit's status in Supabase (e.g. Approved or Rejected by Admin)
 */
export async function updateDepositStatusInSupabase(
  depositId: string,
  status: 'Completed' | 'Rejected',
  rejectedReason?: string
): Promise<boolean> {
  try {
    const updatePayload: any = { status };
    if (status === 'Completed') {
      updatePayload.approved_at = new Date().toISOString();
    }
    if (rejectedReason) {
      updatePayload.rejected_reason = rejectedReason;
    }
    const { error } = await supabase.from('deposits').update(updatePayload).eq('id', depositId);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Fetch all player deposit requests from Supabase for Admin Approval panel
 */
export async function fetchAllDepositsFromSupabase(): Promise<DepositRecord[] | null> {
  try {
    const { data, error } = await supabase
      .from('deposits')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error || !data) return null;

    return data.map((row: any) => ({
      id: row.id,
      memberId: row.member_id,
      phoneNumber: row.phone_number,
      amount: Number(row.amount),
      bonus: Number(row.bonus || 0),
      totalCredit: Number(row.total_credit || row.amount),
      method: row.method,
      utr: row.utr || undefined,
      screenshot: row.screenshot || undefined,
      status: row.status as 'Completed' | 'Pending' | 'Rejected',
      timestamp: new Date(row.created_at).getTime(),
      approvedAt: row.approved_at ? new Date(row.approved_at).getTime() : undefined,
      rejectedReason: row.rejected_reason || undefined,
    }));
  } catch {
    return null;
  }
}

/**
 * Fetch deposits from Supabase strictly for the specified logged-in user
 */
export async function fetchDepositsFromSupabase(
  memberId: string,
  phoneNumber?: string
): Promise<SupabaseDepositRecord[] | null> {
  try {
    let query = supabase
      .from('deposits')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);

    if (phoneNumber && memberId) {
      query = query.or(`member_id.eq.${memberId},phone_number.eq.${phoneNumber}`);
    } else {
      query = query.eq('member_id', memberId);
    }

    const { data, error } = await query;

    if (error || !data) return null;

    return data.map((row: any) => ({
      id: row.id,
      member_id: row.member_id,
      phone_number: row.phone_number,
      amount: Number(row.amount),
      bonus: Number(row.bonus),
      total_credit: Number(row.total_credit),
      method: row.method,
      status: row.status,
      created_at: row.created_at,
    }));
  } catch {
    return null;
  }
}

/**
 * Record a withdrawal in Supabase linked to user account
 */
export async function recordWithdrawalInSupabase(
  record: WithdrawRecord,
  memberId: string,
  phoneNumber?: string
): Promise<boolean> {
  try {
    const { error } = await supabase.from('withdrawals').insert({
      id: record.id,
      member_id: memberId,
      phone_number: phoneNumber || null,
      amount: record.amount,
      actual_amount: record.actualAmount,
      fee: record.fee,
      bank_name: record.bankName,
      account_number_masked: record.accountNumberMasked,
      account_holder_name: record.accountHolderName,
      status: record.status,
      created_at: new Date(record.timestamp).toISOString(),
    });
    return !error;
  } catch {
    return false;
  }
}

/**
 * Fetch withdrawals from Supabase strictly for the specified logged-in user
 */
export async function fetchWithdrawalsFromSupabase(
  memberId: string,
  phoneNumber?: string
): Promise<WithdrawRecord[] | null> {
  try {
    let query = supabase
      .from('withdrawals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);

    if (phoneNumber && memberId) {
      query = query.or(`member_id.eq.${memberId},phone_number.eq.${phoneNumber}`);
    } else {
      query = query.eq('member_id', memberId);
    }

    const { data, error } = await query;

    if (error || !data) return null;

    return data.map((row: any) => ({
      id: row.id,
      amount: Number(row.amount),
      actualAmount: Number(row.actual_amount),
      fee: Number(row.fee || 0),
      bankName: row.bank_name,
      accountNumberMasked: row.account_number_masked,
      accountHolderName: row.account_holder_name,
      timestamp: new Date(row.created_at).getTime(),
      status: row.status,
    }));
  } catch {
    return null;
  }
}

/**
 * Save bank account details to Supabase linked to user account
 */
export async function saveBankDetailsToSupabase(
  details: BankAccountDetails,
  memberId: string,
  phoneNumber?: string
): Promise<boolean> {
  try {
    const { error } = await supabase.from('bank_accounts').upsert(
      {
        id: memberId,
        member_id: memberId,
        phone_number: phoneNumber || null,
        account_holder_name: details.accountHolderName,
        bank_name: details.bankName,
        account_number: details.accountNumber,
        ifsc_code: details.ifscCode,
        upi_id: details.upiId || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'member_id' }
    );
    return !error;
  } catch {
    return false;
  }
}

/**
 * Fetch saved bank account details from Supabase strictly for the specified logged-in user
 */
export async function fetchBankDetailsFromSupabase(
  memberId: string,
  phoneNumber?: string
): Promise<BankAccountDetails | null> {
  try {
    let query = supabase.from('bank_accounts').select('*');
    if (phoneNumber && memberId) {
      query = query.or(`member_id.eq.${memberId},phone_number.eq.${phoneNumber}`);
    } else {
      query = query.eq('member_id', memberId);
    }

    const { data, error } = await query.maybeSingle();

    if (error || !data) return null;

    return {
      accountHolderName: data.account_holder_name,
      bankName: data.bank_name,
      accountNumber: data.account_number,
      ifscCode: data.ifsc_code,
      upiId: data.upi_id || undefined,
      phoneNumber: data.phone_number || undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Fetch all players' bet records from Supabase for Master Records ("My Records")
 */
export async function fetchAllPlayerBetsFromSupabase(): Promise<PlayerBetRecord[] | null> {
  try {
    const { data, error } = await supabase
      .from('bet_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(300);

    if (error || !data) return null;

    return data.map((row: any) => ({
      id: row.id,
      memberId: row.member_id || 'UNKNOWN',
      phoneNumber: row.phone_number || undefined,
      gameId: row.game_id,
      gameTitle: row.game_title,
      betAmount: Number(row.bet_amount),
      choice: row.choice,
      outcome: row.outcome,
      payout: Number(row.payout),
      netProfit: Number(row.net_profit),
      isWin: Boolean(row.is_win),
      timestamp: new Date(row.created_at).getTime(),
    }));
  } catch {
    return null;
  }
}

/**
 * Record a daily login bonus claim in Supabase
 */
export async function recordDailyBonusInSupabase(
  memberId: string,
  phoneNumber: string,
  amount: number,
  day: number,
  totalBonusClaimed: number,
  newBalance: number
): Promise<boolean> {
  try {
    const bonusId = 'BONUS_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const nowIso = new Date().toISOString();

    // 1. Insert into daily_bonuses
    await supabase.from('daily_bonuses').insert({
      id: bonusId,
      member_id: memberId,
      phone_number: phoneNumber,
      amount,
      day,
      created_at: nowIso,
    });

    // 2. Update profile with new balance and daily bonus tracking
    await supabase.from('profiles').upsert(
      {
        id: memberId,
        member_id: memberId,
        phone_number: phoneNumber,
        balance: newBalance,
        last_daily_bonus_at: nowIso,
        daily_streak: day,
        total_bonus_claimed: totalBonusClaimed,
        updated_at: nowIso,
      },
      { onConflict: 'member_id' }
    );

    return true;
  } catch {
    return false;
  }
}

/**
 * Complete Supabase PostgreSQL Schema SQL for COBCLUB
 */
export const COBCLUB_DATABASE_SQL = `-- COBCLUB Complete Database Schema for Supabase project: ijjzajfgdlpzbvxmypya

-- 1. Profiles Table (Wallet Balance & Daily Bonus Tracking)
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  phone_number TEXT NOT NULL,
  member_id TEXT NOT NULL,
  balance NUMERIC(12, 2) NOT NULL DEFAULT 1000.00,
  last_daily_bonus_at TIMESTAMPTZ,
  daily_streak INT DEFAULT 0,
  total_bonus_claimed NUMERIC(12, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Bet History (Player Bet Records)
CREATE TABLE IF NOT EXISTS public.bet_history (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  phone_number TEXT,
  game_id TEXT NOT NULL,
  game_title TEXT NOT NULL,
  bet_amount NUMERIC(12, 2) NOT NULL,
  choice TEXT NOT NULL,
  outcome TEXT NOT NULL,
  payout NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  net_profit NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  is_win BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Daily Login Bonuses Table
CREATE TABLE IF NOT EXISTS public.daily_bonuses (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  day INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Deposits
CREATE TABLE IF NOT EXISTS public.deposits (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  phone_number TEXT,
  amount NUMERIC(12, 2) NOT NULL,
  bonus NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total_credit NUMERIC(12, 2) NOT NULL,
  method TEXT NOT NULL,
  utr TEXT,
  screenshot TEXT,
  status TEXT NOT NULL DEFAULT 'Pending',
  rejected_reason TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Withdrawals
CREATE TABLE IF NOT EXISTS public.withdrawals (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  phone_number TEXT,
  amount NUMERIC(12, 2) NOT NULL,
  actual_amount NUMERIC(12, 2) NOT NULL,
  fee NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  bank_name TEXT NOT NULL,
  account_number_masked TEXT NOT NULL,
  account_holder_name TEXT NOT NULL,
  ifsc_code TEXT,
  upi_id TEXT,
  status TEXT NOT NULL DEFAULT 'Processing',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Bank Accounts
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  phone_number TEXT,
  account_holder_name TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  ifsc_code TEXT NOT NULL,
  upi_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row Level Security (RLS) & Public Access Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bet_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_bonuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public all on profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on bet_history" ON public.bet_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on daily_bonuses" ON public.daily_bonuses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on deposits" ON public.deposits FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on withdrawals" ON public.withdrawals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on bank_accounts" ON public.bank_accounts FOR ALL USING (true) WITH CHECK (true);
`;
