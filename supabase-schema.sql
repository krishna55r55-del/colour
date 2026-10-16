-- =========================================================================
-- COBCLUB Gaming Platform - Supabase Database Schema
-- Project Reference: ijjzajfgdlpzbvxmypya
--
-- Tables created:
-- 1. profiles (wallet balance, phone number, member ID)
-- 2. bet_history (game rounds, bets, outcomes, payouts)
-- 3. deposits (recharges, amounts, bonus, payment methods, status)
-- 4. withdrawals (payout requests, bank details, amounts, status)
-- 5. bank_accounts (saved bank account details)
-- =========================================================================

-- 1. Profiles Table (Stores user wallet balance and member info)
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  phone_number TEXT NOT NULL,
  member_id TEXT NOT NULL,
  balance NUMERIC(12, 2) NOT NULL DEFAULT 1000.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Bet History Table
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

-- 3. Deposits Table
CREATE TABLE IF NOT EXISTS public.deposits (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  phone_number TEXT,
  amount NUMERIC(12, 2) NOT NULL,
  bonus NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total_credit NUMERIC(12, 2) NOT NULL,
  method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Withdrawals Table
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

-- 5. Saved Bank Accounts Table
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bet_history_member ON public.bet_history (member_id);
CREATE INDEX IF NOT EXISTS idx_bet_history_created ON public.bet_history (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deposits_member ON public.deposits (member_id);
CREATE INDEX IF NOT EXISTS idx_deposits_created ON public.deposits (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawals_member ON public.withdrawals (member_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created ON public.withdrawals (created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bet_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

-- Allow anonymous & authenticated reads/writes through the public anon key
DROP POLICY IF EXISTS "Allow public all on profiles" ON public.profiles;
CREATE POLICY "Allow public all on profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all on bet_history" ON public.bet_history;
CREATE POLICY "Allow public all on bet_history" ON public.bet_history FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all on deposits" ON public.deposits;
CREATE POLICY "Allow public all on deposits" ON public.deposits FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all on withdrawals" ON public.withdrawals;
CREATE POLICY "Allow public all on withdrawals" ON public.withdrawals FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all on bank_accounts" ON public.bank_accounts;
CREATE POLICY "Allow public all on bank_accounts" ON public.bank_accounts FOR ALL USING (true) WITH CHECK (true);
