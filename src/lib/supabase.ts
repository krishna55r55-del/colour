import { createClient } from '@supabase/supabase-js';
import { BankAccountDetails, GameHistoryItem, WithdrawRecord } from '../types';

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
    const requiredTables = ['profiles', 'bet_history', 'deposits', 'withdrawals', 'bank_accounts'];
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
      missingTables: ['profiles', 'bet_history', 'deposits', 'withdrawals', 'bank_accounts'],
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
): Promise<{ balance: number; isSynced: boolean }> {
  try {
    let query = supabase.from('profiles').select('balance');
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
      return { balance: Number(data.balance), isSynced: true };
    }

    // Profile does not exist yet; create it for this user account
    const { error: insertErr } = await supabase.from('profiles').upsert(
      {
        id: memberId,
        member_id: memberId,
        phone_number: phoneNumber,
        balance: fallbackBalance,
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
export async function recordDepositInSupabase(depositRecord: {
  id: string;
  memberId: string;
  phoneNumber?: string;
  amount: number;
  bonus: number;
  totalCredit: number;
  method: string;
  status: 'Completed' | 'Pending';
}): Promise<boolean> {
  try {
    const { error } = await supabase.from('deposits').insert({
      id: depositRecord.id,
      member_id: depositRecord.memberId,
      phone_number: depositRecord.phoneNumber || null,
      amount: depositRecord.amount,
      bonus: depositRecord.bonus,
      total_credit: depositRecord.totalCredit,
      method: depositRecord.method,
      status: depositRecord.status,
      created_at: new Date().toISOString(),
    });
    return !error;
  } catch {
    return false;
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
