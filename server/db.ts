import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'cobclub.db');
export const db = new DatabaseSync(dbPath);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  PRAGMA busy_timeout = 5000;
  PRAGMA foreign_keys = ON;
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS profiles (
    member_id TEXT PRIMARY KEY,
    phone_number TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    balance REAL NOT NULL DEFAULT 98,
    last_daily_bonus_at INTEGER,
    daily_streak INTEGER NOT NULL DEFAULT 0,
    total_bonus_claimed REAL NOT NULL DEFAULT 0,
    referred_by TEXT,
    has_deposited INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    member_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_member ON sessions (member_id);

  CREATE TABLE IF NOT EXISTS password_reset_otps (
    phone_number TEXT PRIMARY KEY,
    otp TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS daily_bonuses (
    id TEXT PRIMARY KEY,
    member_id TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    day INTEGER NOT NULL,
    amount REAL NOT NULL,
    claim_window_id TEXT NOT NULL,
    claimed_at INTEGER NOT NULL,
    UNIQUE(member_id, claim_window_id)
  );
  CREATE INDEX IF NOT EXISTS idx_daily_bonuses_member ON daily_bonuses (member_id, claimed_at DESC);

  CREATE TABLE IF NOT EXISTS game_rounds (
    id TEXT PRIMARY KEY,
    duration INTEGER NOT NULL,
    period TEXT NOT NULL,
    round_index INTEGER NOT NULL,
    number INTEGER NOT NULL,
    color TEXT NOT NULL,
    big_small TEXT NOT NULL,
    finalized_at INTEGER NOT NULL,
    UNIQUE(duration, period)
  );
  CREATE INDEX IF NOT EXISTS idx_game_rounds_lookup ON game_rounds (duration, round_index DESC);

  CREATE TABLE IF NOT EXISTS bet_history (
    id TEXT PRIMARY KEY,
    member_id TEXT NOT NULL,
    phone_number TEXT,
    game_id TEXT NOT NULL,
    game_title TEXT NOT NULL,
    bet_amount REAL NOT NULL,
    choice TEXT NOT NULL,
    outcome TEXT NOT NULL,
    payout REAL NOT NULL DEFAULT 0,
    gross_payout REAL NOT NULL DEFAULT 0,
    commission REAL NOT NULL DEFAULT 0,
    net_profit REAL NOT NULL DEFAULT 0,
    is_win INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Pending',
    period TEXT,
    target TEXT,
    multiplier REAL DEFAULT 2.0,
    duration INTEGER,
    selected_option TEXT,
    result_number INTEGER,
    result_color TEXT,
    created_at INTEGER NOT NULL,
    settled_at INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_bet_history_member_created ON bet_history (member_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_bet_history_status_period ON bet_history (status, game_id, period, duration);

  CREATE TABLE IF NOT EXISTS deposits (
    id TEXT PRIMARY KEY,
    member_id TEXT NOT NULL,
    phone_number TEXT,
    amount REAL NOT NULL,
    bonus REAL NOT NULL DEFAULT 0,
    total_credit REAL NOT NULL,
    method TEXT NOT NULL,
    utr TEXT,
    screenshot TEXT,
    status TEXT NOT NULL DEFAULT 'Pending',
    rejected_reason TEXT,
    approved_at INTEGER,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_deposits_member_created ON deposits (member_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_deposits_status ON deposits (status, created_at DESC);

  CREATE TABLE IF NOT EXISTS withdrawals (
    id TEXT PRIMARY KEY,
    member_id TEXT NOT NULL,
    phone_number TEXT,
    amount REAL NOT NULL,
    actual_amount REAL NOT NULL,
    fee REAL NOT NULL DEFAULT 0,
    bank_name TEXT NOT NULL,
    account_number_masked TEXT NOT NULL,
    account_holder_name TEXT NOT NULL,
    ifsc_code TEXT,
    upi_id TEXT,
    status TEXT NOT NULL DEFAULT 'Processing',
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_withdrawals_member ON withdrawals (member_id, created_at DESC);

  CREATE TABLE IF NOT EXISTS bank_accounts (
    member_id TEXT PRIMARY KEY,
    phone_number TEXT,
    account_holder_name TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    ifsc_code TEXT NOT NULL,
    upi_id TEXT,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS referrals (
    id TEXT PRIMARY KEY,
    referrer_member_id TEXT NOT NULL,
    referrer_phone TEXT NOT NULL,
    referee_member_id TEXT UNIQUE NOT NULL,
    referee_phone TEXT NOT NULL,
    registered_at INTEGER NOT NULL,
    first_deposit_completed INTEGER NOT NULL DEFAULT 0,
    first_deposit_at INTEGER,
    reward_amount REAL NOT NULL DEFAULT 77
  );
  CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals (referrer_member_id);

  CREATE TABLE IF NOT EXISTS referral_milestone_bonuses (
    id TEXT PRIMARY KEY,
    referrer_member_id TEXT NOT NULL,
    referrer_phone TEXT NOT NULL,
    milestone_count INTEGER NOT NULL,
    amount REAL NOT NULL DEFAULT 355,
    awarded_at INTEGER NOT NULL,
    UNIQUE(referrer_member_id, milestone_count)
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

export function runInTransaction<T>(fn: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch {}
    throw err;
  }
}
