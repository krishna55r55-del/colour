-- =========================================================================
-- COBCLUB Gaming Platform - Supabase Database Schema
-- Project Reference: ijjzajfgdlpzbvxmypya
--
-- Tables:
-- 1. profiles (wallet balance, member ID, phone, daily streak)
-- 2. bet_history (game rounds, bets, status Pending/Completed, payouts)
-- 3. game_rounds (finalized prediction round sequence and results)
-- 4. daily_bonuses (daily streak claims)
-- 5. deposits (recharges, amounts, UTR, screenshots, status)
-- 6. withdrawals (payout requests, bank details, amounts, status)
-- 7. bank_accounts (saved bank account details)
-- =========================================================================

-- 1. Profiles Table (Stores user wallet balance and member info)
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

-- 2. Bet History Table (stores all bets with Pending and Completed status)
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
  status TEXT NOT NULL DEFAULT 'Pending',
  period TEXT,
  target TEXT,
  multiplier NUMERIC(6, 2) DEFAULT 2.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  settled_at TIMESTAMPTZ
);

-- 3. Game Rounds Table (stores finalized continuous round results permanently for all users)
CREATE TABLE IF NOT EXISTS public.game_rounds (
  id TEXT PRIMARY KEY,
  duration INT NOT NULL,
  period TEXT NOT NULL,
  round_index BIGINT NOT NULL,
  number INT NOT NULL,
  color TEXT NOT NULL,
  big_small TEXT NOT NULL,
  finalized_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Daily Login Bonuses Table
CREATE TABLE IF NOT EXISTS public.daily_bonuses (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  day INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Deposits Table
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

-- 6. Withdrawals Table
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

-- 7. Saved Bank Accounts Table
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

-- Indexes for performance & unique constraints
CREATE INDEX IF NOT EXISTS idx_bet_history_member ON public.bet_history (member_id);
CREATE INDEX IF NOT EXISTS idx_bet_history_created ON public.bet_history (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bet_history_period ON public.bet_history (period);
CREATE UNIQUE INDEX IF NOT EXISTS idx_game_rounds_period ON public.game_rounds (duration, period);
CREATE INDEX IF NOT EXISTS idx_game_rounds_order ON public.game_rounds (duration, round_index DESC);
CREATE INDEX IF NOT EXISTS idx_deposits_member ON public.deposits (member_id);
CREATE INDEX IF NOT EXISTS idx_deposits_created ON public.deposits (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawals_member ON public.withdrawals (member_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created ON public.withdrawals (created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bet_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_bonuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

-- Allow public all access via anonymous publishable key
DROP POLICY IF EXISTS "Allow public all on profiles" ON public.profiles;
CREATE POLICY "Allow public all on profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all on bet_history" ON public.bet_history;
CREATE POLICY "Allow public all on bet_history" ON public.bet_history FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all on game_rounds" ON public.game_rounds;
CREATE POLICY "Allow public all on game_rounds" ON public.game_rounds FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all on daily_bonuses" ON public.daily_bonuses;
CREATE POLICY "Allow public all on daily_bonuses" ON public.daily_bonuses FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all on deposits" ON public.deposits;
CREATE POLICY "Allow public all on deposits" ON public.deposits FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all on withdrawals" ON public.withdrawals;
CREATE POLICY "Allow public all on withdrawals" ON public.withdrawals FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all on bank_accounts" ON public.bank_accounts;
CREATE POLICY "Allow public all on bank_accounts" ON public.bank_accounts FOR ALL USING (true) WITH CHECK (true);
