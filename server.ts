import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import { db, runInTransaction } from './server/db.ts';
import {
  getDeterministicNumberForRound,
  getPeriodForTime,
  parsePeriodToTimestamp,
  evaluateWinGoBet,
  getOutcomeColorName,
} from './src/utils/winLogic.ts';

const PORT = 3000;
const INITIAL_BALANCE = 98;
const BONUS_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const STREAK_RESET_MS = 48 * 60 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const REFERRAL_REWARD_AMOUNT = 77;
const REFERRAL_MILESTONE_TARGET = 5;
const REFERRAL_MILESTONE_BONUS = 355;

const DAILY_BONUS_TIERS = [
  { day: 1, points: 50, label: 'Day 1' },
  { day: 2, points: 75, label: 'Day 2' },
  { day: 3, points: 100, label: 'Day 3' },
  { day: 4, points: 150, label: 'Day 4' },
  { day: 5, points: 200, label: 'Day 5' },
  { day: 6, points: 300, label: 'Day 6' },
  { day: 7, points: 500, label: 'Day 7 VIP' },
];

const WIN_GO_DURATIONS = [30, 60, 180, 300] as const;

type AuthedRequest = Request & {
  memberId?: string;
  phoneNumber?: string;
  sessionToken?: string;
};

// ---------------- Security & Crypto Helpers ----------------

function hashPassword(password: string, existingSalt?: string): string {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, hex] = parts;
  const derivedBuf = crypto.scryptSync(password, salt, 64);
  const storedBuf = Buffer.from(hex, 'hex');
  if (derivedBuf.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(derivedBuf, storedBuf);
}

function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie;
  if (!header) return {};
  const result: Record<string, string> = {};
  for (const pair of header.split(';')) {
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    if (key) result[key] = decodeURIComponent(val);
  }
  return result;
}

function isHttpsRequest(req: Request): boolean {
  const proto = String(req.headers['x-forwarded-proto'] || '').toLowerCase();
  return req.secure || proto.includes('https');
}

function setSessionCookie(req: Request, res: Response, token: string) {
  const maxAgeSec = Math.floor(SESSION_TTL_MS / 1000);
  if (isHttpsRequest(req)) {
    res.setHeader(
      'Set-Cookie',
      `cobclub_session=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAgeSec}; HttpOnly; SameSite=None; Secure; Partitioned`
    );
  } else {
    res.setHeader(
      'Set-Cookie',
      `cobclub_session=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAgeSec}; HttpOnly; SameSite=Lax`
    );
  }
}

function clearSessionCookie(req: Request, res: Response) {
  if (isHttpsRequest(req)) {
    res.setHeader(
      'Set-Cookie',
      'cobclub_session=; Path=/; Max-Age=0; HttpOnly; SameSite=None; Secure; Partitioned'
    );
  } else {
    res.setHeader('Set-Cookie', 'cobclub_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax');
  }
}

function verifyCsrfOrOrigin(req: Request): boolean {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return true;
  if (req.headers['x-requested-with'] === 'XMLHttpRequest') return true;
  if (req.headers.authorization?.startsWith('Bearer ')) return true;
  const origin = req.headers.origin;
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '');
  if (origin && host) {
    try {
      const originUrl = new URL(origin);
      return originUrl.host === host;
    } catch {
      return false;
    }
  }
  return false;
}

function createSessionForMember(memberId: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  db.prepare(
    'INSERT INTO sessions (token, member_id, created_at, expires_at) VALUES (?, ?, ?, ?)'
  ).run(token, memberId, now, now + SESSION_TTL_MS);
  return token;
}

function resolveSession(req: Request): { memberId: string; phoneNumber: string; token: string } | null {
  const authHeader = req.headers.authorization;
  let token = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  }
  if (!token) {
    const cookies = parseCookies(req);
    token = cookies.cobclub_session || '';
  }
  if (!token) return null;

  const row = db
    .prepare(
      `SELECT s.token, s.member_id, s.expires_at, p.phone_number
       FROM sessions s
       JOIN profiles p ON p.member_id = s.member_id
       WHERE s.token = ?`
    )
    .get(token) as { token: string; member_id: string; expires_at: number; phone_number: string } | undefined;

  if (!row) return null;
  if (Date.now() > Number(row.expires_at)) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return null;
  }
  return { memberId: row.member_id, phoneNumber: row.phone_number, token: row.token };
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!verifyCsrfOrOrigin(req)) {
    res.status(403).json({ success: false, error: 'Invalid request origin' });
    return;
  }
  const session = resolveSession(req);
  if (!session) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }
  req.memberId = session.memberId;
  req.phoneNumber = session.phoneNumber;
  req.sessionToken = session.token;
  next();
}

const adminTokens = new Map<string, number>();

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!verifyCsrfOrOrigin(req)) {
    res.status(403).json({ success: false, error: 'Invalid request origin' });
    return;
  }
  const token = String(req.headers['x-admin-token'] || '').trim();
  const expiresAt = token ? adminTokens.get(token) : undefined;
  if (!expiresAt || Date.now() > expiresAt) {
    if (token) adminTokens.delete(token);
    res.status(401).json({ success: false, error: 'Admin verification required' });
    return;
  }
  next();
}

// ---------------- Data Formatting & WinGo Engine ----------------

function mapBetRow(row: any) {
  return {
    id: row.id,
    gameId: row.game_id,
    gameTitle: row.game_title,
    betAmount: Number(row.bet_amount),
    choice: row.choice,
    outcome: row.outcome,
    payout: Number(row.payout || 0),
    grossPayout: Number(row.gross_payout || 0),
    commission: Number(row.commission || 0),
    netProfit: Number(row.net_profit || 0),
    isWin: Boolean(row.is_win),
    timestamp: Number(row.created_at),
    status: row.status === 'Pending' ? 'Pending' : 'Completed',
    period: row.period || undefined,
    target: row.target ?? undefined,
    multiplier: row.multiplier != null ? Number(row.multiplier) : undefined,
    duration: row.duration != null ? Number(row.duration) : undefined,
    selectedOption: row.selected_option || undefined,
    resultNumber: row.result_number != null ? Number(row.result_number) : undefined,
    resultColor: row.result_color || undefined,
    settledAt: row.settled_at != null ? Number(row.settled_at) : undefined,
  };
}

function computeStatsForMember(memberId: string) {
  const agg = db
    .prepare(
      `SELECT
         COUNT(*) AS totalRounds,
         SUM(CASE WHEN is_win = 1 THEN 1 ELSE 0 END) AS totalWins,
         SUM(CASE WHEN is_win = 0 THEN 1 ELSE 0 END) AS totalLosses,
         COALESCE(SUM(bet_amount), 0) AS totalWagered,
         COALESCE(SUM(payout), 0) AS totalWon,
         COALESCE(MAX(payout), 0) AS biggestWin
       FROM bet_history
       WHERE member_id = ? AND status = 'Completed'`
    )
    .get(memberId) as any;

  const recentRows = db
    .prepare(
      `SELECT is_win, game_id FROM bet_history
       WHERE member_id = ? AND status = 'Completed'
       ORDER BY created_at DESC LIMIT 100`
    )
    .all(memberId) as Array<{ is_win: number; game_id: string }>;

  let currentStreak = 0;
  for (const r of recentRows) {
    if (r.is_win === 1) currentStreak++;
    else break;
  }

  let bestStreak = 0;
  let running = 0;
  for (let i = recentRows.length - 1; i >= 0; i--) {
    if (recentRows[i].is_win === 1) {
      running++;
      if (running > bestStreak) bestStreak = running;
    } else {
      running = 0;
    }
  }

  return {
    totalRounds: Number(agg?.totalRounds || 0),
    totalWins: Number(agg?.totalWins || 0),
    totalLosses: Number(agg?.totalLosses || 0),
    totalWagered: Number(agg?.totalWagered || 0),
    totalWon: Number(agg?.totalWon || 0),
    biggestWin: Number(agg?.biggestWin || 0),
    currentStreak,
    bestStreak,
    favoriteGameId: recentRows[0]?.game_id || null,
  };
}

function getDailyBonusStateForMember(memberId: string) {
  const profile = db
    .prepare(
      `SELECT last_daily_bonus_at, daily_streak, total_bonus_claimed
       FROM profiles WHERE member_id = ?`
    )
    .get(memberId) as
    | { last_daily_bonus_at: number | null; daily_streak: number; total_bonus_claimed: number }
    | undefined;

  const historyRows = db
    .prepare(
      `SELECT id, day, amount, claimed_at
       FROM daily_bonuses
       WHERE member_id = ?
       ORDER BY claimed_at DESC
       LIMIT 60`
    )
    .all(memberId) as Array<{ id: string; day: number; amount: number; claimed_at: number }>;

  const lastClaimedAt = profile?.last_daily_bonus_at ? Number(profile.last_daily_bonus_at) : null;
  const now = Date.now();
  const canClaimDailyBonus = !lastClaimedAt || now - lastClaimedAt >= BONUS_COOLDOWN_MS;
  const timeUntilNextBonus = lastClaimedAt ? Math.max(0, BONUS_COOLDOWN_MS - (now - lastClaimedAt)) : 0;

  return {
    dailyBonus: {
      lastClaimedAt,
      streak: Number(profile?.daily_streak || 0),
      totalClaimed: Number(profile?.total_bonus_claimed || 0),
      history: historyRows.map((h) => ({
        id: h.id,
        day: Number(h.day),
        amount: Number(h.amount),
        claimedAt: Number(h.claimed_at),
      })),
    },
    canClaimDailyBonus,
    timeUntilNextBonus,
  };
}

function buildAccountState(memberId: string) {
  const profile = db.prepare('SELECT * FROM profiles WHERE member_id = ?').get(memberId) as any;
  if (!profile) return null;

  const bonusInfo = getDailyBonusStateForMember(memberId);
  const stats = computeStatsForMember(memberId);

  const latestBetsRows = db
    .prepare(
      `SELECT * FROM bet_history
       WHERE member_id = ?
       ORDER BY created_at DESC
       LIMIT 50`
    )
    .all(memberId) as any[];

  const totalBetsCountRow = db
    .prepare('SELECT COUNT(*) AS cnt FROM bet_history WHERE member_id = ?')
    .get(memberId) as { cnt: number };

  const depositRows = db
    .prepare('SELECT * FROM deposits WHERE member_id = ? ORDER BY created_at DESC LIMIT 100')
    .all(memberId) as any[];

  const withdrawalRows = db
    .prepare('SELECT * FROM withdrawals WHERE member_id = ? ORDER BY created_at DESC LIMIT 100')
    .all(memberId) as any[];

  const bankRow = db.prepare('SELECT * FROM bank_accounts WHERE member_id = ?').get(memberId) as any;

  const referralRows = db
    .prepare('SELECT * FROM referrals WHERE referrer_member_id = ? ORDER BY registered_at DESC')
    .all(memberId) as any[];

  const milestoneRows = db
    .prepare(
      'SELECT * FROM referral_milestone_bonuses WHERE referrer_member_id = ? ORDER BY awarded_at DESC'
    )
    .all(memberId) as any[];

  const hasCompletedDeposit =
    Number(profile.has_deposited) === 1 || depositRows.some((d) => d.status === 'Completed');

  return {
    user: {
      phoneNumber: profile.phone_number,
      memberId: profile.member_id,
      registeredAt: Number(profile.created_at),
      referredBy: profile.referred_by || undefined,
    },
    balance: Number(profile.balance),
    hasCompletedFirstDeposit: hasCompletedDeposit,
    stats,
    dailyBonus: bonusInfo.dailyBonus,
    canClaimDailyBonus: bonusInfo.canClaimDailyBonus,
    timeUntilNextBonus: bonusInfo.timeUntilNextBonus,
    latestBets: latestBetsRows.map(mapBetRow),
    totalBetsCount: Number(totalBetsCountRow?.cnt || 0),
    depositRecords: depositRows.map((d) => ({
      id: d.id,
      memberId: d.member_id,
      phoneNumber: d.phone_number || undefined,
      amount: Number(d.amount),
      bonus: Number(d.bonus || 0),
      totalCredit: Number(d.total_credit),
      method: d.method,
      utr: d.utr || undefined,
      screenshot: d.screenshot || undefined,
      timestamp: Number(d.created_at),
      status: d.status,
      approvedAt: d.approved_at ? Number(d.approved_at) : undefined,
      rejectedReason: d.rejected_reason || undefined,
    })),
    withdrawRecords: withdrawalRows.map((w) => ({
      id: w.id,
      amount: Number(w.amount),
      actualAmount: Number(w.actual_amount),
      fee: Number(w.fee || 0),
      bankName: w.bank_name,
      accountNumberMasked: w.account_number_masked,
      accountHolderName: w.account_holder_name,
      timestamp: Number(w.created_at),
      status: w.status,
    })),
    savedBankDetails: bankRow
      ? {
          accountHolderName: bankRow.account_holder_name,
          bankName: bankRow.bank_name,
          accountNumber: bankRow.account_number,
          ifscCode: bankRow.ifsc_code,
          upiId: bankRow.upi_id || undefined,
          phoneNumber: bankRow.phone_number || undefined,
        }
      : null,
    userReferrals: referralRows.map((r) => ({
      id: r.id,
      referrerMemberId: r.referrer_member_id,
      referrerPhone: r.referrer_phone,
      refereeMemberId: r.referee_member_id,
      refereePhone: r.referee_phone,
      registeredAt: Number(r.registered_at),
      firstDepositCompleted: Boolean(r.first_deposit_completed),
      firstDepositAt: r.first_deposit_at ? Number(r.first_deposit_at) : undefined,
      rewardAmount: Number(r.reward_amount || REFERRAL_REWARD_AMOUNT),
    })),
    userReferralBonuses: milestoneRows.map((b) => ({
      id: b.id,
      referrerMemberId: b.referrer_member_id,
      referrerPhone: b.referrer_phone,
      milestoneCount: Number(b.milestone_count),
      amount: Number(b.amount || REFERRAL_MILESTONE_BONUS),
      awardedAt: Number(b.awarded_at),
    })),
  };
}

/**
 * Generates or retrieves the permanent official round outcome from SQLite.
 * NEVER influenced by bets placed; NEVER overwrites an existing round record.
 */
function ensureOfficialRound(duration: number, period: string, nowMs: number = Date.now()) {
  const existing = db
    .prepare('SELECT * FROM game_rounds WHERE duration = ? AND period = ?')
    .get(duration, period) as any;

  if (existing) {
    return {
      id: existing.id,
      duration: Number(existing.duration),
      period: existing.period,
      roundIndex: Number(existing.round_index),
      number: Number(existing.number),
      color: existing.color as 'green' | 'red' | 'purple_red' | 'purple_green',
      bigSmall: existing.big_small as 'Big' | 'Small',
      finalizedAt: Number(existing.finalized_at),
    };
  }

  const { roundIdx, roundEndTime } = parsePeriodToTimestamp(period, duration);
  if (roundEndTime > nowMs) {
    return null;
  }

  const num = getDeterministicNumberForRound(roundIdx, duration);
  const bigSmall: 'Big' | 'Small' = num >= 5 ? 'Big' : 'Small';
  let color: 'green' | 'red' | 'purple_red' | 'purple_green';
  if (num === 0) color = 'purple_red';
  else if (num === 5) color = 'purple_green';
  else if ([1, 3, 7, 9].includes(num)) color = 'green';
  else color = 'red';

  const id = `${duration}_${period}`;
  db.prepare(
    `INSERT OR IGNORE INTO game_rounds (id, duration, period, round_index, number, color, big_small, finalized_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, duration, period, roundIdx, num, color, bigSmall, roundEndTime);

  const saved = db
    .prepare('SELECT * FROM game_rounds WHERE duration = ? AND period = ?')
    .get(duration, period) as any;

  return {
    id: saved.id,
    duration: Number(saved.duration),
    period: saved.period,
    roundIndex: Number(saved.round_index),
    number: Number(saved.number),
    color: saved.color as 'green' | 'red' | 'purple_red' | 'purple_green',
    bigSmall: saved.big_small as 'Big' | 'Small',
    finalizedAt: Number(saved.finalized_at),
  };
}

function ensureRecentCompletedRounds(nowMs: number = Date.now(), count: number = 30) {
  const historiesByDuration: Record<number, Array<{ period: string; number: number; bigSmall: 'Big' | 'Small'; color: string }>> = {
    30: [],
    60: [],
    180: [],
    300: [],
  };
  const currentPeriods: Record<number, string> = {
    30: getPeriodForTime(nowMs, 30),
    60: getPeriodForTime(nowMs, 60),
    180: getPeriodForTime(nowMs, 180),
    300: getPeriodForTime(nowMs, 300),
  };

  for (const dur of WIN_GO_DURATIONS) {
    const currentRoundIdx = Math.floor(nowMs / (dur * 1000));
    const list: Array<{ period: string; number: number; bigSmall: 'Big' | 'Small'; color: string }> = [];

    for (let i = 1; i <= count; i++) {
      const roundIdx = currentRoundIdx - i;
      if (roundIdx < 0) break;
      const roundTime = roundIdx * dur * 1000;
      const period = getPeriodForTime(roundTime, dur);
      const saved = ensureOfficialRound(dur, period, nowMs);
      if (saved) {
        list.push({
          period: saved.period,
          number: saved.number,
          bigSmall: saved.bigSmall,
          color: saved.color,
        });
      }
    }
    historiesByDuration[dur] = list;
  }

  return { serverTimeMs: nowMs, currentPeriods, historiesByDuration };
}

function settleCompletedWinGoBets(nowMs: number = Date.now(), memberIdFilter?: string) {
  const pendingRows = (
    memberIdFilter
      ? db
          .prepare(
            `SELECT * FROM bet_history
             WHERE game_id = 'color-prediction' AND status = 'Pending' AND member_id = ?`
          )
          .all(memberIdFilter)
      : db
          .prepare(
            `SELECT * FROM bet_history
             WHERE game_id = 'color-prediction' AND status = 'Pending'`
          )
          .all()
  ) as any[];

  if (pendingRows.length === 0) return [];

  const settledIds: string[] = [];

  for (const row of pendingRows) {
    if (!row.period) continue;
    const dur = Number(row.duration || 30);
    const { roundEndTime } = parsePeriodToTimestamp(row.period, dur);
    if (nowMs < roundEndTime) continue;

    const officialRound = ensureOfficialRound(dur, row.period, nowMs);
    if (!officialRound) continue;

    let targetVal: any = row.target;
    if (targetVal !== undefined && targetVal !== null && targetVal !== '' && !isNaN(Number(targetVal))) {
      targetVal = Number(targetVal);
    }

    const evalRes = evaluateWinGoBet(targetVal, Number(row.bet_amount), officialRound.number);
    const outcomeText = `Number ${officialRound.number} (${officialRound.bigSmall})`;
    const resultColor = getOutcomeColorName(officialRound.number);

    const didSettle = runInTransaction(() => {
      const upd = db
        .prepare(
          `UPDATE bet_history
           SET status = 'Completed',
               outcome = ?,
               payout = ?,
               gross_payout = ?,
               commission = ?,
               net_profit = ?,
               is_win = ?,
               result_number = ?,
               result_color = ?,
               selected_option = COALESCE(selected_option, ?),
               settled_at = ?
           WHERE id = ? AND status = 'Pending'`
        )
        .run(
          outcomeText,
          evalRes.payout,
          evalRes.grossPayout,
          evalRes.commission,
          evalRes.netProfit,
          evalRes.isWin ? 1 : 0,
          officialRound.number,
          resultColor,
          evalRes.selectedOption,
          roundEndTime,
          row.id
        );

      if (Number(upd.changes) === 0) return false;

      if (evalRes.isWin && evalRes.payout > 0) {
        db.prepare(
          'UPDATE profiles SET balance = ROUND(balance + ?, 2), updated_at = ? WHERE member_id = ?'
        ).run(evalRes.payout, Date.now(), row.member_id);
      }
      return true;
    });

    if (didSettle) {
      settledIds.push(row.id);
    }
  }

  if (settledIds.length === 0) return [];
  const placeholders = settledIds.map(() => '?').join(',');
  const updatedRows = db
    .prepare(`SELECT * FROM bet_history WHERE id IN (${placeholders})`)
    .all(...settledIds) as any[];
  return updatedRows.map(mapBetRow);
}

// ---------------- Express App Setup ----------------

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '12mb' }));

  // Background settlement & official round archiving every 1s
  ensureRecentCompletedRounds(Date.now(), 30);
  setInterval(() => {
    try {
      const now = Date.now();
      for (const dur of WIN_GO_DURATIONS) {
        const prevIdx = Math.floor(now / (dur * 1000)) - 1;
        if (prevIdx >= 0) {
          const prevPeriod = getPeriodForTime(prevIdx * dur * 1000, dur);
          ensureOfficialRound(dur, prevPeriod, now);
        }
      }
      settleCompletedWinGoBets(now);
    } catch (err) {
      console.warn('Background settlement tick error:', err);
    }
  }, 1000);

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, serverTimeMs: Date.now() });
  });

  // -------- Authentication Routes --------
  app.post('/api/auth/register', (req, res) => {
    try {
      const phone = String(req.body?.phoneNumber || '').trim().replace(/\D/g, '');
      const password = String(req.body?.password || '');
      const confirmPassword = String(req.body?.confirmPassword || '');
      const inviteCode = String(req.body?.inviteCode || '').trim().toUpperCase();

      if (phone.length < 10) {
        res.status(400).json({ success: false, error: 'Please enter a valid 10-digit mobile number' });
        return;
      }
      if (password.length < 6) {
        res.status(400).json({ success: false, error: 'Password must be at least 6 characters long' });
        return;
      }
      if (password !== confirmPassword) {
        res.status(400).json({ success: false, error: 'Passwords do not match' });
        return;
      }

      const existing = db.prepare('SELECT member_id FROM profiles WHERE phone_number = ?').get(phone);
      if (existing) {
        res.status(409).json({ success: false, error: 'An account with this phone number already exists' });
        return;
      }

      let matchedReferrer: { member_id: string; phone_number: string } | undefined;
      if (inviteCode && inviteCode !== 'COBCLUBVIP') {
        const digits = inviteCode.replace(/\D/g, '');
        matchedReferrer = db
          .prepare(
            'SELECT member_id, phone_number FROM profiles WHERE UPPER(member_id) = ? OR phone_number = ?'
          )
          .get(inviteCode, digits.length >= 10 ? digits : '__NONE__') as any;

        if (matchedReferrer && matchedReferrer.phone_number === phone) {
          res.status(400).json({ success: false, error: 'You cannot use your own referral code' });
          return;
        }
      }

      let memberId = `COB${Math.floor(1000 + Math.random() * 9000)}`;
      while (db.prepare('SELECT 1 FROM profiles WHERE member_id = ?').get(memberId)) {
        memberId = `COB${Math.floor(1000 + Math.random() * 9000)}`;
      }

      const now = Date.now();
      const pwHash = hashPassword(password);

      runInTransaction(() => {
        db.prepare(
          `INSERT INTO profiles (
            member_id, phone_number, password_hash, balance,
            last_daily_bonus_at, daily_streak, total_bonus_claimed,
            referred_by, has_deposited, created_at, updated_at
          ) VALUES (?, ?, ?, ?, NULL, 0, 0, ?, 0, ?, ?)`
        ).run(memberId, phone, pwHash, INITIAL_BALANCE, matchedReferrer?.member_id || null, now, now);

        if (matchedReferrer) {
          const refId = `REF_${now}_${crypto.randomBytes(3).toString('hex')}`;
          db.prepare(
            `INSERT INTO referrals (
              id, referrer_member_id, referrer_phone, referee_member_id, referee_phone,
              registered_at, first_deposit_completed, reward_amount
            ) VALUES (?, ?, ?, ?, ?, ?, 0, ?)`
          ).run(
            refId,
            matchedReferrer.member_id,
            matchedReferrer.phone_number,
            memberId,
            phone,
            now,
            REFERRAL_REWARD_AMOUNT
          );
        }
      });

      const token = createSessionForMember(memberId);
      setSessionCookie(req, res, token);
      const state = buildAccountState(memberId);
      res.json({ success: true, token, state });
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({ success: false, error: 'Registration failed. Please try again.' });
    }
  });

  app.post('/api/auth/login', (req, res) => {
    try {
      const phone = String(req.body?.phoneNumber || '').trim().replace(/\D/g, '');
      const password = String(req.body?.password || '');

      if (phone.length < 10) {
        res.status(400).json({ success: false, error: 'Please enter a valid 10-digit mobile number' });
        return;
      }
      if (!password) {
        res.status(400).json({ success: false, error: 'Password is required' });
        return;
      }

      const profile = db
        .prepare('SELECT member_id, password_hash FROM profiles WHERE phone_number = ?')
        .get(phone) as { member_id: string; password_hash: string } | undefined;

      if (!profile) {
        res.status(404).json({ success: false, error: 'No account found with this phone number. Please register.' });
        return;
      }

      if (!verifyPassword(password, profile.password_hash)) {
        res.status(401).json({ success: false, error: 'Incorrect password. Please try again.' });
        return;
      }

      settleCompletedWinGoBets(Date.now(), profile.member_id);
      const token = createSessionForMember(profile.member_id);
      setSessionCookie(req, res, token);
      const state = buildAccountState(profile.member_id);
      res.json({ success: true, token, state });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ success: false, error: 'Login failed. Please try again.' });
    }
  });

  app.post('/api/auth/logout', (req: AuthedRequest, res) => {
    const session = resolveSession(req);
    if (session) {
      db.prepare('DELETE FROM sessions WHERE token = ?').run(session.token);
    }
    clearSessionCookie(req, res);
    res.json({ success: true });
  });

  // -------- Real SMS OTP Helpers --------
  const OTP_TTL_MS = 5 * 60 * 1000;
  const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
  const OTP_MAX_ATTEMPTS = 5;

  function formatPhoneForSms(rawDigits: string): { national10: string; e164: string } {
    const digits = rawDigits.replace(/\D/g, '');
    const national10 = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits.slice(-10);
    const e164 =
      digits.length === 10
        ? `+91${digits}`
        : digits.length === 12 && digits.startsWith('91')
        ? `+${digits}`
        : `+${digits}`;
    return { national10, e164 };
  }

  function getConfiguredSmsProvider():
    | 'twilio_verify'
    | 'twilio_sms'
    | 'fast2sms'
    | 'msg91'
    | 'twofactor'
    | null {
    const twilioSid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
    const twilioToken = (process.env.TWILIO_AUTH_TOKEN || '').trim();
    const twilioVerifySid = (process.env.TWILIO_VERIFY_SERVICE_SID || '').trim();
    const twilioFrom = (process.env.TWILIO_FROM_NUMBER || '').trim();
    if (twilioSid && twilioToken && twilioVerifySid) return 'twilio_verify';
    if (twilioSid && twilioToken && twilioFrom) return 'twilio_sms';
    if ((process.env.FAST2SMS_API_KEY || '').trim()) return 'fast2sms';
    if ((process.env.MSG91_AUTH_KEY || '').trim() && (process.env.MSG91_TEMPLATE_ID || '').trim()) return 'msg91';
    if ((process.env.TWOFACTOR_API_KEY || '').trim()) return 'twofactor';
    return null;
  }

  async function dispatchRealSmsOtp(phoneDigits: string): Promise<{
    ok: boolean;
    provider?: string;
    otpToStore?: string;
    error?: string;
    status?: number;
  }> {
    const provider = getConfiguredSmsProvider();
    if (!provider) {
      return {
        ok: false,
        status: 503,
        error:
          'Real SMS OTP service is not configured on the server. Add your SMS provider credentials (Twilio, Fast2SMS, MSG91, or 2Factor) in Settings -> Secrets to deliver SMS OTPs.',
      };
    }

    const { national10, e164 } = formatPhoneForSms(phoneDigits);
    const otp = String(crypto.randomInt(100000, 1000000));

    try {
      if (provider === 'twilio_verify') {
        const sid = process.env.TWILIO_ACCOUNT_SID!.trim();
        const token = process.env.TWILIO_AUTH_TOKEN!.trim();
        const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID!.trim();
        const authHeader = 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64');
        const body = new URLSearchParams({ To: e164, Channel: 'sms' });
        const resp = await fetch(`https://verify.twilio.com/v2/Services/${encodeURIComponent(verifySid)}/Verifications`, {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: body.toString(),
          signal: AbortSignal.timeout(10000),
        });
        if (!resp.ok) {
          const errData = (await resp.json().catch(() => ({}))) as any;
          return {
            ok: false,
            status: 502,
            error: errData?.message || 'SMS verification service could not send OTP. Please try again.',
          };
        }
        return { ok: true, provider, otpToStore: 'TWILIO_VERIFY' };
      }

      if (provider === 'twilio_sms') {
        const sid = process.env.TWILIO_ACCOUNT_SID!.trim();
        const token = process.env.TWILIO_AUTH_TOKEN!.trim();
        const from = process.env.TWILIO_FROM_NUMBER!.trim();
        const authHeader = 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64');
        const body = new URLSearchParams({
          From: from,
          To: e164,
          Body: `Your COBCLUB password reset OTP is ${otp}. Valid for 5 minutes. Do not share it with anyone.`,
        });
        const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: body.toString(),
          signal: AbortSignal.timeout(10000),
        });
        if (!resp.ok) {
          const errData = (await resp.json().catch(() => ({}))) as any;
          return {
            ok: false,
            status: 502,
            error: errData?.message || 'Twilio SMS gateway failed to send OTP. Please check recipient number.',
          };
        }
        return { ok: true, provider, otpToStore: hashPassword(otp) };
      }

      if (provider === 'fast2sms') {
        const apiKey = process.env.FAST2SMS_API_KEY!.trim();
        const route = (process.env.FAST2SMS_ROUTE || 'otp').trim();
        const payload =
          route === 'q'
            ? {
                route: 'q',
                message: `Your COBCLUB password reset OTP is ${otp}. Valid for 5 minutes.`,
                numbers: national10,
              }
            : {
                route: 'otp',
                variables_values: otp,
                numbers: national10,
              };
        const resp = await fetch('https://www.fast2sms.com/dev/bulkV2', {
          method: 'POST',
          headers: {
            authorization: apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10000),
        });
        const data = (await resp.json().catch(() => ({}))) as any;
        if (!resp.ok || data?.return === false) {
          return {
            ok: false,
            status: 502,
            error: data?.message?.[0] || data?.message || 'Fast2SMS failed to send OTP.',
          };
        }
        return { ok: true, provider, otpToStore: hashPassword(otp) };
      }

      if (provider === 'msg91') {
        const authKey = process.env.MSG91_AUTH_KEY!.trim();
        const templateId = process.env.MSG91_TEMPLATE_ID!.trim();
        const url = `https://control.msg91.com/api/v5/otp?template_id=${encodeURIComponent(
          templateId
        )}&mobile=${encodeURIComponent('91' + national10)}&otp=${encodeURIComponent(otp)}`;
        const resp = await fetch(url, {
          method: 'POST',
          headers: {
            authkey: authKey,
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(10000),
        });
        const data = (await resp.json().catch(() => ({}))) as any;
        if (!resp.ok || data?.type === 'error') {
          return {
            ok: false,
            status: 502,
            error: data?.message || 'MSG91 failed to send OTP.',
          };
        }
        return { ok: true, provider, otpToStore: hashPassword(otp) };
      }

      // provider === 'twofactor'
      const apiKey = process.env.TWOFACTOR_API_KEY!.trim();
      const url = `https://2factor.in/API/V1/${encodeURIComponent(apiKey)}/SMS/${encodeURIComponent(
        '+91' + national10
      )}/${encodeURIComponent(otp)}`;
      const resp = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(10000),
      });
      const data = (await resp.json().catch(() => ({}))) as any;
      if (!resp.ok || data?.Status !== 'Success') {
        return {
          ok: false,
          status: 502,
          error: data?.Details || 'SMS gateway failed to send OTP.',
        };
      }
      return { ok: true, provider, otpToStore: hashPassword(otp) };
    } catch (err) {
      console.error('SMS OTP dispatch error:', err);
      return {
        ok: false,
        status: 502,
        error: 'Unable to reach SMS gateway right now. Please try again shortly.',
      };
    }
  }

  async function checkTwilioVerifyOtp(phoneDigits: string, code: string): Promise<boolean> {
    const sid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
    const token = (process.env.TWILIO_AUTH_TOKEN || '').trim();
    const verifySid = (process.env.TWILIO_VERIFY_SERVICE_SID || '').trim();
    if (!sid || !token || !verifySid) return false;

    const { e164 } = formatPhoneForSms(phoneDigits);
    const authHeader = 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64');
    const body = new URLSearchParams({ To: e164, Code: code });
    try {
      const resp = await fetch(
        `https://verify.twilio.com/v2/Services/${encodeURIComponent(verifySid)}/VerificationCheck`,
        {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: body.toString(),
          signal: AbortSignal.timeout(10000),
        }
      );
      if (!resp.ok) return false;
      const data = (await resp.json().catch(() => ({}))) as any;
      return data?.status === 'approved';
    } catch {
      return false;
    }
  }

  app.post('/api/auth/send-otp', async (req, res) => {
    const phone = String(req.body?.phoneNumber || '').trim().replace(/\D/g, '');
    if (phone.length < 10) {
      res.status(400).json({ success: false, error: 'Please enter a valid 10-digit mobile number' });
      return;
    }
    const existing = db.prepare('SELECT member_id FROM profiles WHERE phone_number = ?').get(phone);
    if (!existing) {
      res.status(404).json({
        success: false,
        error: 'No account found with this mobile number. Please check the number or register.',
      });
      return;
    }

    const now = Date.now();
    const prevOtp = db
      .prepare('SELECT last_sent_at FROM password_reset_otps WHERE phone_number = ?')
      .get(phone) as { last_sent_at: number } | undefined;

    if (prevOtp && now - Number(prevOtp.last_sent_at || 0) < OTP_RESEND_COOLDOWN_MS) {
      const waitSec = Math.ceil((OTP_RESEND_COOLDOWN_MS - (now - Number(prevOtp.last_sent_at))) / 1000);
      res.status(429).json({
        success: false,
        error: `Please wait ${waitSec}s before requesting another SMS OTP.`,
      });
      return;
    }

    const dispatch = await dispatchRealSmsOtp(phone);
    if (!dispatch.ok || !dispatch.otpToStore) {
      res.status(dispatch.status || 503).json({
        success: false,
        error: dispatch.error || 'Failed to deliver SMS OTP.',
      });
      return;
    }

    const expiresAt = now + OTP_TTL_MS;
    db.prepare(
      `INSERT INTO password_reset_otps (phone_number, otp, expires_at, attempts, last_sent_at, provider)
       VALUES (?, ?, ?, 0, ?, ?)
       ON CONFLICT(phone_number) DO UPDATE SET
         otp = excluded.otp,
         expires_at = excluded.expires_at,
         attempts = 0,
         last_sent_at = excluded.last_sent_at,
         provider = excluded.provider`
    ).run(phone, dispatch.otpToStore, expiresAt, now, dispatch.provider || 'sms');

    const maskedTail = phone.slice(-4);
    res.json({
      success: true,
      message: `Real SMS OTP sent to your registered mobile ending in ****${maskedTail}. Valid for 5 minutes.`,
    });
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    const phone = String(req.body?.phoneNumber || '').trim().replace(/\D/g, '');
    const otp = String(req.body?.otp || '').trim();
    const newPassword = String(req.body?.newPassword || '');
    const confirmPassword = String(req.body?.confirmPassword || '');

    if (phone.length < 10) {
      res.status(400).json({ success: false, error: 'Please enter a valid 10-digit mobile number' });
      return;
    }
    if (!/^\d{6}$/.test(otp)) {
      res.status(400).json({ success: false, error: 'Please enter a valid 6-digit SMS OTP code' });
      return;
    }

    const otpRow = db
      .prepare('SELECT otp, expires_at, attempts, provider FROM password_reset_otps WHERE phone_number = ?')
      .get(phone) as
      | { otp: string; expires_at: number; attempts: number; provider: string }
      | undefined;

    if (!otpRow) {
      res.status(400).json({ success: false, error: 'Please request an SMS OTP first by clicking "Send OTP"' });
      return;
    }
    if (Date.now() > Number(otpRow.expires_at)) {
      db.prepare('DELETE FROM password_reset_otps WHERE phone_number = ?').run(phone);
      res.status(400).json({ success: false, error: 'OTP has expired. Please request a new SMS OTP' });
      return;
    }
    if (Number(otpRow.attempts || 0) >= OTP_MAX_ATTEMPTS) {
      db.prepare('DELETE FROM password_reset_otps WHERE phone_number = ?').run(phone);
      res.status(429).json({
        success: false,
        error: 'Too many invalid OTP attempts. Please request a new SMS OTP.',
      });
      return;
    }

    let isOtpValid = false;
    if (otpRow.provider === 'twilio_verify' && otpRow.otp === 'TWILIO_VERIFY') {
      isOtpValid = await checkTwilioVerifyOtp(phone, otp);
    } else if (otpRow.otp.includes(':')) {
      isOtpValid = verifyPassword(otp, otpRow.otp);
    }

    if (!isOtpValid) {
      const nextAttempts = Number(otpRow.attempts || 0) + 1;
      if (nextAttempts >= OTP_MAX_ATTEMPTS) {
        db.prepare('DELETE FROM password_reset_otps WHERE phone_number = ?').run(phone);
        res.status(429).json({
          success: false,
          error: 'Too many invalid OTP attempts. Please request a new SMS OTP.',
        });
      } else {
        db.prepare('UPDATE password_reset_otps SET attempts = ? WHERE phone_number = ?').run(
          nextAttempts,
          phone
        );
        res.status(400).json({
          success: false,
          error: `Invalid SMS OTP code (${OTP_MAX_ATTEMPTS - nextAttempts} attempt${
            OTP_MAX_ATTEMPTS - nextAttempts === 1 ? '' : 's'
          } remaining).`,
        });
      }
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ success: false, error: 'New password must be at least 6 characters long' });
      return;
    }
    if (newPassword !== confirmPassword) {
      res.status(400).json({ success: false, error: 'New password and confirm password do not match' });
      return;
    }

    const newHash = hashPassword(newPassword);
    runInTransaction(() => {
      db.prepare('UPDATE profiles SET password_hash = ?, updated_at = ? WHERE phone_number = ?').run(
        newHash,
        Date.now(),
        phone
      );
      db.prepare('DELETE FROM password_reset_otps WHERE phone_number = ?').run(phone);
      db.prepare(
        'DELETE FROM sessions WHERE member_id = (SELECT member_id FROM profiles WHERE phone_number = ?)'
      ).run(phone);
    });
    res.json({ success: true });
  });

  // -------- Account State Route --------
  app.get('/api/account/state', (req, res) => {
    const session = resolveSession(req);
    if (!session) {
      res.status(401).json({ success: false, authenticated: false });
      return;
    }
    settleCompletedWinGoBets(Date.now(), session.memberId);
    const state = buildAccountState(session.memberId);
    if (!state) {
      res.status(401).json({ success: false, authenticated: false });
      return;
    }
    res.json({ success: true, authenticated: true, state });
  });

  // -------- Daily Bonus (Strict One-Claim-Per-Account-Per-Day DB Lock) --------
  app.get('/api/daily-bonus/status', requireAuth, (req: AuthedRequest, res) => {
    const info = getDailyBonusStateForMember(req.memberId!);
    res.json({ success: true, ...info });
  });

  app.post('/api/daily-bonus/claim', requireAuth, (req: AuthedRequest, res) => {
    const memberId = req.memberId!;
    const phone = req.phoneNumber!;
    const now = Date.now();

    try {
      const outcome = runInTransaction(() => {
        const profile = db
          .prepare(
            `SELECT balance, last_daily_bonus_at, daily_streak, total_bonus_claimed
             FROM profiles WHERE member_id = ?`
          )
          .get(memberId) as
          | {
              balance: number;
              last_daily_bonus_at: number | null;
              daily_streak: number;
              total_bonus_claimed: number;
            }
          | undefined;

        if (!profile) {
          return { ok: false as const, status: 404, error: 'Account not found' };
        }

        const lastClaimed = profile.last_daily_bonus_at ? Number(profile.last_daily_bonus_at) : null;
        if (lastClaimed && now - lastClaimed < BONUS_COOLDOWN_MS) {
          const leftMs = Math.max(0, BONUS_COOLDOWN_MS - (now - lastClaimed));
          const hours = Math.max(1, Math.ceil(leftMs / (1000 * 60 * 60)));
          return {
            ok: false as const,
            status: 409,
            error: `Daily bonus already claimed! Next bonus ready in ${hours} hour${hours > 1 ? 's' : ''}.`,
          };
        }

        let nextDay = 1;
        if (lastClaimed && now - lastClaimed <= STREAK_RESET_MS) {
          nextDay = (Number(profile.daily_streak || 0) % 7) + 1;
        }

        const tier = DAILY_BONUS_TIERS.find((t) => t.day === nextDay) || DAILY_BONUS_TIERS[0];
        const points = tier.points;
        const nextBalance = Number((Number(profile.balance) + points).toFixed(2));
        const nextTotalClaimed = Number((Number(profile.total_bonus_claimed || 0) + points).toFixed(2));
        const claimWindowId = lastClaimed ? String(lastClaimed) : 'INITIAL';
        const bonusId = `DB_${now}_${crypto.randomBytes(3).toString('hex')}`;

        // Unique constraint on (member_id, claim_window_id) strictly blocks concurrent duplicates
        db.prepare(
          `INSERT INTO daily_bonuses (id, member_id, phone_number, day, amount, claim_window_id, claimed_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).run(bonusId, memberId, phone, nextDay, points, claimWindowId, now);

        db.prepare(
          `UPDATE profiles
           SET balance = ?, last_daily_bonus_at = ?, daily_streak = ?, total_bonus_claimed = ?, updated_at = ?
           WHERE member_id = ?`
        ).run(nextBalance, now, nextDay, nextTotalClaimed, now, memberId);

        return { ok: true as const, amount: points, day: nextDay, newBalance: nextBalance };
      });

      const bonusInfo = getDailyBonusStateForMember(memberId);
      if (!outcome.ok) {
        res.status(outcome.status).json({
          success: false,
          error: outcome.error,
          ...bonusInfo,
        });
        return;
      }

      res.json({
        success: true,
        amount: outcome.amount,
        day: outcome.day,
        newBalance: outcome.newBalance,
        ...bonusInfo,
      });
    } catch (err: any) {
      if (String(err?.message || '').includes('UNIQUE')) {
        const bonusInfo = getDailyBonusStateForMember(memberId);
        res.status(409).json({
          success: false,
          error: 'Daily bonus already claimed for this cycle.',
          ...bonusInfo,
        });
        return;
      }
      console.error('Daily bonus claim error:', err);
      res.status(500).json({ success: false, error: 'Failed to claim daily bonus' });
    }
  });

  // -------- Color Prediction (Permanent Backend Round Generation & Retrieval) --------
  app.get('/api/wingo/state', (req, res) => {
    const now = Date.now();
    const state = ensureRecentCompletedRounds(now, 30);
    const session = resolveSession(req);
    let settledBets: any[] = [];
    if (session) {
      settledBets = settleCompletedWinGoBets(now, session.memberId);
    }
    res.json({ success: true, ...state, settledBets });
  });

  app.get('/api/wingo/rounds', (req, res) => {
    const durRaw = Number(req.query.duration || 30);
    const dur = WIN_GO_DURATIONS.includes(durRaw as any) ? durRaw : 30;
    const limit = Math.min(200, Math.max(1, Number(req.query.limit || 30)));
    const now = Date.now();
    ensureRecentCompletedRounds(now, Math.min(50, limit));

    const rows = db
      .prepare(
        `SELECT period, number, color, big_small, finalized_at
         FROM game_rounds
         WHERE duration = ?
         ORDER BY round_index DESC
         LIMIT ?`
      )
      .all(dur, limit) as any[];

    res.json({
      success: true,
      duration: dur,
      rounds: rows.map((r) => ({
        period: r.period,
        number: Number(r.number),
        color: r.color,
        bigSmall: r.big_small,
        finalizedAt: Number(r.finalized_at),
      })),
    });
  });

  app.post('/api/wingo/settle', requireAuth, (req: AuthedRequest, res) => {
    const now = Date.now();
    const settledBets = settleCompletedWinGoBets(now, req.memberId!);
    const roundsState = ensureRecentCompletedRounds(now, 30);
    const profile = db
      .prepare('SELECT balance FROM profiles WHERE member_id = ?')
      .get(req.memberId!) as { balance: number } | undefined;
    const stats = computeStatsForMember(req.memberId!);

    res.json({
      success: true,
      settledBets,
      balance: Number(profile?.balance || 0),
      stats,
      ...roundsState,
    });
  });

  // -------- WinGo Bet Placement --------
  app.post('/api/bets/wingo', requireAuth, (req: AuthedRequest, res) => {
    const memberId = req.memberId!;
    const phone = req.phoneNumber!;
    const duration = Number(req.body?.duration || 30);
    const period = String(req.body?.period || '').trim();
    const target = req.body?.target;
    const label = String(req.body?.label || '').trim();
    const amount = Number(req.body?.amount || 0);
    const multiplier = Number(req.body?.multiplier || 2);
    const selectedOption = String(req.body?.selectedOption || label || target || '').toUpperCase();

    if (!WIN_GO_DURATIONS.includes(duration as any) || !period) {
      res.status(400).json({ success: false, error: 'Invalid round parameters' });
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      res.status(400).json({ success: false, error: 'Invalid bet amount' });
      return;
    }
    if (target === null || target === undefined || target === '') {
      res.status(400).json({ success: false, error: 'Invalid bet selection' });
      return;
    }

    const now = Date.now();
    const { roundEndTime } = parsePeriodToTimestamp(period, duration);
    if (now >= roundEndTime - 2000) {
      res.status(400).json({ success: false, error: 'Round is locked for betting. Wait for next round.' });
      return;
    }

    try {
      const txResult = runInTransaction(() => {
        const profile = db
          .prepare('SELECT balance, has_deposited FROM profiles WHERE member_id = ?')
          .get(memberId) as { balance: number; has_deposited: number } | undefined;

        if (!profile) {
          return { ok: false as const, status: 404, error: 'Account not found' };
        }
        const completedDep = db
          .prepare("SELECT 1 FROM deposits WHERE member_id = ? AND status = 'Completed' LIMIT 1")
          .get(memberId);

        if (Number(profile.has_deposited) !== 1 && !completedDep) {
          return { ok: false as const, status: 403, error: 'Deposit 1 time to play with bonus money' };
        }

        if (Number(profile.balance) < amount) {
          return { ok: false as const, status: 400, error: 'Insufficient available balance. Please Deposit to add funds.' };
        }

        const nextBalance = Number((Number(profile.balance) - amount).toFixed(2));
        const betId = `wingo_${now}_${crypto.randomBytes(4).toString('hex')}`;
        const gameTitle = `Color Prediction (Win Go ${duration >= 60 ? `${duration / 60}Min` : `${duration}s`})`;
        const choice = `${label || selectedOption} [Issue ${period.slice(-4)}]`;

        db.prepare('UPDATE profiles SET balance = ?, updated_at = ? WHERE member_id = ?').run(
          nextBalance,
          now,
          memberId
        );

        db.prepare(
          `INSERT INTO bet_history (
            id, member_id, phone_number, game_id, game_title, bet_amount, choice,
            outcome, payout, gross_payout, commission, net_profit, is_win, status,
            period, target, multiplier, duration, selected_option, created_at
          ) VALUES (?, ?, ?, 'color-prediction', ?, ?, ?, 'Pending Resolution', 0, 0, 0, ?, 0, 'Pending', ?, ?, ?, ?, ?, ?)`
        ).run(
          betId,
          memberId,
          phone,
          gameTitle,
          amount,
          choice,
          -amount,
          period,
          String(target),
          multiplier,
          duration,
          selectedOption,
          now
        );

        const row = db.prepare('SELECT * FROM bet_history WHERE id = ?').get(betId);
        const cntRow = db.prepare('SELECT COUNT(*) AS cnt FROM bet_history WHERE member_id = ?').get(memberId) as {
          cnt: number;
        };
        return {
          ok: true as const,
          bet: mapBetRow(row),
          balance: nextBalance,
          totalBetsCount: Number(cntRow?.cnt || 0),
        };
      });

      if (!txResult.ok) {
        res.status(txResult.status).json({ success: false, error: txResult.error });
        return;
      }

      res.json({
        success: true,
        bet: txResult.bet,
        balance: txResult.balance,
        totalBetsCount: txResult.totalBetsCount,
      });
    } catch (err) {
      console.error('WinGo bet error:', err);
      res.status(500).json({ success: false, error: 'Failed to place bet in database' });
    }
  });

  // -------- Instant Game Bets (Other 8 Games) --------
  app.post('/api/bets/instant/place', requireAuth, (req: AuthedRequest, res) => {
    const memberId = req.memberId!;
    const amount = Number(req.body?.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      res.status(400).json({ success: false, error: 'Invalid bet amount' });
      return;
    }

    const tx = runInTransaction(() => {
      const profile = db
        .prepare('SELECT balance, has_deposited FROM profiles WHERE member_id = ?')
        .get(memberId) as { balance: number; has_deposited: number } | undefined;
      if (!profile) return { ok: false as const, status: 404, error: 'Account not found' };

      const completedDep = db
        .prepare("SELECT 1 FROM deposits WHERE member_id = ? AND status = 'Completed' LIMIT 1")
        .get(memberId);
      if (Number(profile.has_deposited) !== 1 && !completedDep) {
        return { ok: false as const, status: 403, error: 'Deposit 1 time to play with bonus money' };
      }
      if (Number(profile.balance) < amount) {
        return { ok: false as const, status: 400, error: 'Insufficient balance' };
      }
      const nextBalance = Number((Number(profile.balance) - amount).toFixed(2));
      db.prepare('UPDATE profiles SET balance = ?, updated_at = ? WHERE member_id = ?').run(
        nextBalance,
        Date.now(),
        memberId
      );
      return { ok: true as const, balance: nextBalance };
    });

    if (!tx.ok) {
      res.status(tx.status).json({ success: false, error: tx.error });
      return;
    }
    res.json({ success: true, balance: tx.balance });
  });

  app.post('/api/bets/instant/refund', requireAuth, (req: AuthedRequest, res) => {
    const memberId = req.memberId!;
    const amount = Number(req.body?.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      res.status(400).json({ success: false, error: 'Invalid refund amount' });
      return;
    }

    const nextBalance = runInTransaction(() => {
      db.prepare(
        'UPDATE profiles SET balance = ROUND(balance + ?, 2), updated_at = ? WHERE member_id = ?'
      ).run(amount, Date.now(), memberId);
      const row = db.prepare('SELECT balance FROM profiles WHERE member_id = ?').get(memberId) as any;
      return Number(row?.balance || 0);
    });
    res.json({ success: true, balance: nextBalance });
  });

  app.post('/api/bets/instant/record', requireAuth, (req: AuthedRequest, res) => {
    const memberId = req.memberId!;
    const phone = req.phoneNumber!;
    const gameId = String(req.body?.gameId || '').trim();
    const gameTitle = String(req.body?.gameTitle || '').trim();
    const betAmount = Number(req.body?.betAmount || 0);
    const choice = String(req.body?.choice || '').trim();
    const outcome = String(req.body?.outcome || '').trim();
    const rawPayout = Number(req.body?.payout || 0);
    const rawCommission = Number(req.body?.commission || 0);
    const isWin = Boolean(req.body?.isWin);

    if (!gameId || !gameTitle || !Number.isFinite(betAmount) || betAmount <= 0) {
      res.status(400).json({ success: false, error: 'Invalid game bet payload' });
      return;
    }

    let finalPayout = Math.max(0, rawPayout);
    let finalCommission = Math.max(0, rawCommission);
    if (isWin && finalPayout > 0 && finalCommission === 0) {
      finalCommission = Number((finalPayout * 0.024).toFixed(2));
      finalPayout = Number((finalPayout - finalCommission).toFixed(2));
    }
    const grossPayout = isWin ? Number((finalPayout + finalCommission).toFixed(2)) : 0;
    const netProfit = Number((finalPayout - betAmount).toFixed(2));
    const now = Date.now();
    const betId = `round_${now}_${crypto.randomBytes(4).toString('hex')}`;

    const result = runInTransaction(() => {
      if (finalPayout > 0) {
        db.prepare(
          'UPDATE profiles SET balance = ROUND(balance + ?, 2), updated_at = ? WHERE member_id = ?'
        ).run(finalPayout, now, memberId);
      }

      db.prepare(
        `INSERT INTO bet_history (
          id, member_id, phone_number, game_id, game_title, bet_amount, choice,
          outcome, payout, gross_payout, commission, net_profit, is_win, status,
          selected_option, created_at, settled_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Completed', ?, ?, ?)`
      ).run(
        betId,
        memberId,
        phone,
        gameId,
        gameTitle,
        betAmount,
        choice,
        outcome,
        finalPayout,
        grossPayout,
        finalCommission,
        netProfit,
        isWin ? 1 : 0,
        choice,
        now,
        now
      );

      const profile = db.prepare('SELECT balance FROM profiles WHERE member_id = ?').get(memberId) as any;
      const betRow = db.prepare('SELECT * FROM bet_history WHERE id = ?').get(betId);
      const cntRow = db.prepare('SELECT COUNT(*) AS cnt FROM bet_history WHERE member_id = ?').get(memberId) as {
        cnt: number;
      };
      return {
        bet: mapBetRow(betRow),
        balance: Number(profile?.balance || 0),
        stats: computeStatsForMember(memberId),
        totalBetsCount: Number(cntRow?.cnt || 0),
      };
    });

    res.json({ success: true, ...result });
  });

  // -------- Permanent Paginated Bet History Route --------
  app.get('/api/bets', requireAuth, (req: AuthedRequest, res) => {
    const memberId = req.memberId!;
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 10)));
    const gameId = String(req.query.gameId || '').trim();
    const outcome = String(req.query.outcome || 'all').trim();
    const status = String(req.query.status || 'all').trim();

    const conditions = ['member_id = ?'];
    const params: any[] = [memberId];

    if (gameId && gameId !== 'all') {
      conditions.push('game_id = ?');
      params.push(gameId);
    }
    if (status === 'Completed' || status === 'Pending') {
      conditions.push('status = ?');
      params.push(status);
    }
    if (outcome === 'wins') {
      conditions.push("status = 'Completed' AND is_win = 1");
    } else if (outcome === 'losses') {
      conditions.push("status = 'Completed' AND is_win = 0");
    }

    const whereClause = conditions.join(' AND ');
    const countRow = db
      .prepare(`SELECT COUNT(*) AS cnt FROM bet_history WHERE ${whereClause}`)
      .get(...params) as { cnt: number };

    const totalCount = Number(countRow?.cnt || 0);
    const offset = (page - 1) * limit;

    const rows = db
      .prepare(
        `SELECT * FROM bet_history
         WHERE ${whereClause}
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset) as any[];

    res.json({
      success: true,
      items: rows.map(mapBetRow),
      totalCount,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
      hasMore: offset + rows.length < totalCount,
      stats: computeStatsForMember(memberId),
    });
  });

  // -------- Deposits, Bank, Withdrawals & Admin Routes --------
  app.post('/api/deposits', requireAuth, (req: AuthedRequest, res) => {
    const memberId = req.memberId!;
    const phone = req.phoneNumber!;
    const amount = Number(req.body?.amount || 0);
    const bonus = Number(req.body?.bonus || 0);
    const method = String(req.body?.method || 'UPI').toUpperCase();
    const utr = String(req.body?.utr || '').trim();
    const screenshot = req.body?.screenshot ? String(req.body.screenshot) : null;

    if (!Number.isFinite(amount) || amount < 100 || !utr || utr.length < 6) {
      res.status(400).json({ success: false, error: 'Invalid deposit amount or UTR reference' });
      return;
    }

    const totalCredit = amount + bonus;
    const txnId = `DEP${crypto.randomInt(1000000, 10000000)}`;
    const now = Date.now();

    db.prepare(
      `INSERT INTO deposits (
        id, member_id, phone_number, amount, bonus, total_credit,
        method, utr, screenshot, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?)`
    ).run(txnId, memberId, phone, amount, bonus, totalCredit, method, utr, screenshot, now);

    res.json({
      success: true,
      record: {
        id: txnId,
        memberId,
        phoneNumber: phone,
        amount,
        bonus,
        totalCredit,
        method,
        utr,
        screenshot: screenshot || undefined,
        timestamp: now,
        status: 'Pending',
      },
    });
  });

  app.post('/api/bank', requireAuth, (req: AuthedRequest, res) => {
    const memberId = req.memberId!;
    const phone = req.phoneNumber!;
    const accountHolderName = String(req.body?.accountHolderName || '').trim();
    const bankName = String(req.body?.bankName || '').trim();
    const accountNumber = String(req.body?.accountNumber || '').trim();
    const ifscCode = String(req.body?.ifscCode || '').trim().toUpperCase();
    const upiId = req.body?.upiId ? String(req.body.upiId).trim() : null;

    if (!accountHolderName || !bankName || accountNumber.length < 9 || ifscCode.length < 8) {
      res.status(400).json({ success: false, error: 'Please provide complete valid bank details' });
      return;
    }

    const now = Date.now();
    db.prepare(
      `INSERT INTO bank_accounts (
        member_id, phone_number, account_holder_name, bank_name, account_number, ifsc_code, upi_id, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(member_id) DO UPDATE SET
        phone_number = excluded.phone_number,
        account_holder_name = excluded.account_holder_name,
        bank_name = excluded.bank_name,
        account_number = excluded.account_number,
        ifsc_code = excluded.ifsc_code,
        upi_id = excluded.upi_id,
        updated_at = excluded.updated_at`
    ).run(memberId, phone, accountHolderName, bankName, accountNumber, ifscCode, upiId, now);

    res.json({
      success: true,
      details: { accountHolderName, bankName, accountNumber, ifscCode, upiId: upiId || undefined, phoneNumber: phone },
    });
  });

  app.post('/api/withdrawals', requireAuth, (req: AuthedRequest, res) => {
    const memberId = req.memberId!;
    const phone = req.phoneNumber!;
    const amount = Number(req.body?.amount || 0);
    const details = req.body?.details || {};

    if (!Number.isFinite(amount) || amount < 200) {
      res.status(400).json({ success: false, error: 'Minimum withdrawal amount is ₹200.' });
      return;
    }
    if (amount > 50000) {
      res.status(400).json({ success: false, error: 'Maximum single withdrawal limit is ₹50,000.' });
      return;
    }

    const accountHolderName = String(details.accountHolderName || '').trim();
    const bankName = String(details.bankName || '').trim();
    const accountNumber = String(details.accountNumber || '').trim();
    const ifscCode = String(details.ifscCode || '').trim().toUpperCase();
    const upiId = details.upiId ? String(details.upiId).trim() : null;

    if (!accountHolderName || !bankName || accountNumber.length < 9 || ifscCode.length < 8) {
      res.status(400).json({ success: false, error: 'Invalid bank account details' });
      return;
    }

    const now = Date.now();
    const tx = runInTransaction(() => {
      const profile = db.prepare('SELECT balance FROM profiles WHERE member_id = ?').get(memberId) as
        | { balance: number }
        | undefined;
      if (!profile) return { ok: false as const, status: 404, error: 'Account not found' };
      if (Number(profile.balance) < amount) {
        return { ok: false as const, status: 400, error: 'Insufficient wallet balance for this withdrawal.' };
      }

      const nextBalance = Number((Number(profile.balance) - amount).toFixed(2));
      const wthId = `WTH${crypto.randomInt(1000000, 10000000)}`;
      const masked = `**** ${accountNumber.slice(-4)}`;

      db.prepare('UPDATE profiles SET balance = ?, updated_at = ? WHERE member_id = ?').run(
        nextBalance,
        now,
        memberId
      );

      db.prepare(
        `INSERT INTO bank_accounts (
          member_id, phone_number, account_holder_name, bank_name, account_number, ifsc_code, upi_id, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(member_id) DO UPDATE SET
          account_holder_name = excluded.account_holder_name,
          bank_name = excluded.bank_name,
          account_number = excluded.account_number,
          ifsc_code = excluded.ifsc_code,
          upi_id = excluded.upi_id,
          updated_at = excluded.updated_at`
      ).run(memberId, phone, accountHolderName, bankName, accountNumber, ifscCode, upiId, now);

      db.prepare(
        `INSERT INTO withdrawals (
          id, member_id, phone_number, amount, actual_amount, fee,
          bank_name, account_number_masked, account_holder_name, ifsc_code, upi_id, status, created_at
        ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, 'Completed', ?)`
      ).run(wthId, memberId, phone, amount, amount, bankName, masked, accountHolderName, ifscCode, upiId, now);

      return {
        ok: true as const,
        balance: nextBalance,
        record: {
          id: wthId,
          amount,
          actualAmount: amount,
          fee: 0,
          bankName,
          accountNumberMasked: masked,
          accountHolderName,
          timestamp: now,
          status: 'Completed' as const,
        },
      };
    });

    if (!tx.ok) {
      res.status(tx.status).json({ success: false, error: tx.error });
      return;
    }

    res.json({ success: true, record: tx.record, balance: tx.balance });
  });

  // -------- Admin Unlock & Deposit Approvals --------
  app.post('/api/admin/unlock', (req, res) => {
    if (!verifyCsrfOrOrigin(req)) {
      res.status(403).json({ success: false, error: 'Invalid request origin' });
      return;
    }
    const passcode = String(req.body?.passcode || '').trim();
    if (!passcode) {
      res.status(400).json({ success: false, error: 'Password is required' });
      return;
    }

    const envPass = process.env.ADMIN_PASSCODE?.trim();
    let authorized = false;

    if (envPass) {
      const a = Buffer.from(passcode);
      const b = Buffer.from(envPass);
      authorized = a.length === b.length && crypto.timingSafeEqual(a, b);
    } else {
      const DEFAULT_ADMIN_HASH =
        '9acb7eb8da2e39f671005e3352e5e699:79c46745f4c9e94af14ae55a70f160420faf90f38f57a204b271e7b788c7ce3757621b356e46b947917d52f516bb30ce72247b388be34b9d6465db983b1bbe9d';
      const stored = db
        .prepare("SELECT value FROM app_settings WHERE key = 'admin_passcode_hash'")
        .get() as { value: string } | undefined;

      const hashToCheck = stored?.value || DEFAULT_ADMIN_HASH;
      if (!stored) {
        db.prepare("INSERT OR IGNORE INTO app_settings (key, value) VALUES ('admin_passcode_hash', ?)").run(
          DEFAULT_ADMIN_HASH
        );
      }
      authorized = verifyPassword(passcode, hashToCheck);
    }

    if (!authorized) {
      res.status(401).json({ success: false, error: 'Access denied. Incorrect password.' });
      return;
    }

    const token = crypto.randomBytes(24).toString('hex');
    adminTokens.set(token, Date.now() + 12 * 60 * 60 * 1000);
    res.json({ success: true, adminToken: token });
  });

  app.get('/api/admin/deposits', requireAdmin, (_req, res) => {
    const rows = db.prepare('SELECT * FROM deposits ORDER BY created_at DESC LIMIT 200').all() as any[];
    res.json({
      success: true,
      deposits: rows.map((d) => ({
        id: d.id,
        memberId: d.member_id,
        phoneNumber: d.phone_number || undefined,
        amount: Number(d.amount),
        bonus: Number(d.bonus || 0),
        totalCredit: Number(d.total_credit),
        method: d.method,
        utr: d.utr || undefined,
        screenshot: d.screenshot || undefined,
        timestamp: Number(d.created_at),
        status: d.status,
        approvedAt: d.approved_at ? Number(d.approved_at) : undefined,
        rejectedReason: d.rejected_reason || undefined,
      })),
    });
  });

  app.post('/api/admin/deposits/:id/approve', requireAdmin, (req, res) => {
    const depositId = String(req.params.id || '').trim();
    const now = Date.now();

    const tx = runInTransaction(() => {
      const dep = db.prepare('SELECT * FROM deposits WHERE id = ?').get(depositId) as any;
      if (!dep) return { ok: false as const, status: 404, error: 'Deposit record not found' };
      if (dep.status !== 'Pending') {
        return { ok: false as const, status: 409, error: `Deposit is already ${dep.status}` };
      }

      db.prepare("UPDATE deposits SET status = 'Completed', approved_at = ? WHERE id = ? AND status = 'Pending'").run(
        now,
        depositId
      );

      db.prepare(
        'UPDATE profiles SET balance = ROUND(balance + ?, 2), has_deposited = 1, updated_at = ? WHERE member_id = ?'
      ).run(Number(dep.total_credit), now, dep.member_id);

      // Process Refer & Earn reward (₹77 on 1st deposit + ₹355 every 5 qualified referrals)
      const ref = db
        .prepare(
          'SELECT * FROM referrals WHERE referee_member_id = ? AND first_deposit_completed = 0'
        )
        .get(dep.member_id) as any;

      if (ref) {
        db.prepare(
          'UPDATE referrals SET first_deposit_completed = 1, first_deposit_at = ? WHERE id = ?'
        ).run(now, ref.id);

        db.prepare(
          'UPDATE profiles SET balance = ROUND(balance + ?, 2), updated_at = ? WHERE member_id = ?'
        ).run(REFERRAL_REWARD_AMOUNT, now, ref.referrer_member_id);

        const qualifiedRow = db
          .prepare(
            'SELECT COUNT(*) AS cnt FROM referrals WHERE referrer_member_id = ? AND first_deposit_completed = 1'
          )
          .get(ref.referrer_member_id) as { cnt: number };

        const qualifiedCount = Number(qualifiedRow?.cnt || 0);
        if (qualifiedCount > 0 && qualifiedCount % REFERRAL_MILESTONE_TARGET === 0) {
          const bonusId = `REF5_${now}_${crypto.randomBytes(3).toString('hex')}`;
          const ins = db
            .prepare(
              `INSERT OR IGNORE INTO referral_milestone_bonuses (
                id, referrer_member_id, referrer_phone, milestone_count, amount, awarded_at
              ) VALUES (?, ?, ?, ?, ?, ?)`
            )
            .run(
              bonusId,
              ref.referrer_member_id,
              ref.referrer_phone,
              qualifiedCount,
              REFERRAL_MILESTONE_BONUS,
              now
            );

          if (Number(ins.changes) > 0) {
            db.prepare(
              'UPDATE profiles SET balance = ROUND(balance + ?, 2), updated_at = ? WHERE member_id = ?'
            ).run(REFERRAL_MILESTONE_BONUS, now, ref.referrer_member_id);
          }
        }
      }

      return { ok: true as const };
    });

    if (!tx.ok) {
      res.status(tx.status).json({ success: false, error: tx.error });
      return;
    }

    res.json({ success: true });
  });

  app.post('/api/admin/deposits/:id/reject', requireAdmin, (req, res) => {
    const depositId = String(req.params.id || '').trim();
    const reason = String(req.body?.reason || 'Rejected by administrator').trim();

    const upd = db
      .prepare("UPDATE deposits SET status = 'Rejected', rejected_reason = ? WHERE id = ? AND status = 'Pending'")
      .run(reason, depositId);

    if (Number(upd.changes) === 0) {
      res.status(404).json({ success: false, error: 'Pending deposit not found' });
      return;
    }
    res.json({ success: true });
  });

  // -------- Frontend Vite / Static Integration --------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`COBCLUB server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
