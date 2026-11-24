/**
 * Win Management logic for COBCLUB gaming platform
 *
 * Rules:
 * 1. When Win Manager is ON:
 *    - All player bets win. If conflicting bets placed, maximizes user winnings.
 * 2. When Win Manager is OFF:
 *    - All player bets lose.
 *    - If player placed bets covering all options (impossible for all to lose),
 *      the outcome with the lowest bet amount (the lower bet) will win while
 *      higher bets lose.
 */

export interface BetOrderEval {
  target: 'green' | 'red' | 'purple' | 'violet' | 'big' | 'small' | number;
  amount: number;
  label?: string;
}

export const WIN_COMMISSION_PERCENT = 2.4; // 2.4% commission on every win
export const WIN_COMMISSION_RATE = 0.024;

/**
 * Designated Multipliers as explicitly defined:
 * - BIG = 2x
 * - SMALL = 2x
 * - RED = 2x
 * - GREEN = 2x
 * - VIOLET = 3.5x
 */
export const getTargetMultiplier = (target: BetOrderEval['target'] | string): number => {
  const t = String(target).toLowerCase();
  if (t === 'violet' || t === 'purple') return 3.5;
  if (t === 'big' || t === 'small' || t === 'green' || t === 'red') return 2.0;
  if (!isNaN(Number(target))) return 9.0;
  return 2.0;
};

/**
 * Evaluates whether a given betting target wins against the drawn number (0-9)
 */
export const isTargetWinning = (target: BetOrderEval['target'] | string, outcomeNumber: number): boolean => {
  const t = String(target).toLowerCase();
  if (t === 'big') return outcomeNumber >= 5;
  if (t === 'small') return outcomeNumber <= 4;
  if (t === 'green') return [1, 3, 5, 7, 9].includes(outcomeNumber);
  if (t === 'red') return [0, 2, 4, 6, 8].includes(outcomeNumber);
  if (t === 'violet' || t === 'purple') return outcomeNumber === 0 || outcomeNumber === 5;
  if (typeof target === 'number' || !isNaN(Number(target))) return Number(target) === outcomeNumber;
  return false;
};

/**
 * Descriptive color label for the drawn outcome number
 */
export const getOutcomeColorName = (outcomeNumber: number): string => {
  if (outcomeNumber === 0) return 'Red + Violet';
  if (outcomeNumber === 5) return 'Green + Violet';
  if ([1, 3, 7, 9].includes(outcomeNumber)) return 'Green';
  return 'Red';
};

/**
 * Designated Winning Payout Pool for targeted testing:
 * [120, 230, 340, 450, 560, 670, 780, 890, 1020]
 */
export const TARGET_WIN_AMOUNTS = [120, 230, 340, 450, 560, 670, 780, 890, 1020] as const;
export const ALWAYS_WIN_AMOUNTS = [120, 230, 340, 450, 560, 670, 780, 890, 1020] as const;

/**
 * Check if a bet must win:
 * - When button is ON (winManagerEnabled = true): ALL bets win!
 * - When button is OFF: amounts 120, 230, 340, 450, 560, 670, 780, 890, 1020 ALWAYS win on both OFF and ON!
 */
export const isBetAlwaysWin = (amount: number, winManagerEnabled: boolean = false): boolean => {
  if (winManagerEnabled) return true;
  return ALWAYS_WIN_AMOUNTS.includes(amount as any);
};

export const calculateBetPayout = (
  target: BetOrderEval['target'],
  amount: number,
  outcomeNumber: number,
  applyCommission: boolean = true
): number => {
  const isHit = isTargetWinning(target, outcomeNumber);
  if (!isHit) return 0;

  const multiplier = getTargetMultiplier(target);
  const gross = Number((amount * multiplier).toFixed(2));

  if (applyCommission) {
    const commission = Number((gross * WIN_COMMISSION_RATE).toFixed(2));
    return Number((gross - commission).toFixed(2));
  }
  return gross;
};

/**
 * Global Deterministic Continuous Prediction Number Generator
 * Returns the exact same number (0-9) for any round index and duration across all users and devices,
 * whether the site is open, closed, or refreshed.
 */
export const getDeterministicNumberForRound = (roundIndex: number, durationSec: number): number => {
  let h = Math.imul(roundIndex ^ 0x61c88647, 0x9e3779b9) ^ Math.imul(durationSec, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 16), 0x21f0aaad);
  h = Math.imul(h ^ (h >>> 15), 0x735a2d97);
  h = (h ^ (h >>> 15)) >>> 0;
  return h % 10;
};

export const determineWinGoOutcome = (
  bets: BetOrderEval[],
  winManagerEnabled: boolean = false,
  defaultNumber?: number
): number => {
  const allNumbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  // Natural draw if no active bets: return the continuous global deterministic number
  if (!bets || bets.length === 0) {
    return typeof defaultNumber === 'number' ? defaultNumber : Math.floor(Math.random() * 10);
  }

  const mustWinBets = bets.filter((b) => isBetAlwaysWin(b.amount, winManagerEnabled));
  const hasAlwaysWin = mustWinBets.length > 0;

  // Pre-calculate evaluation for all 10 possible outcome numbers
  const candidateStats = allNumbers.map((num) => {
    let totalPayout = 0;
    let winningBetsCount = 0;
    let mustWinBetsWon = 0;
    let totalWinningWager = 0;

    bets.forEach((b) => {
      const willWinBet = isBetAlwaysWin(b.amount, winManagerEnabled);
      const payout = calculateBetPayout(b.target, b.amount, num);
      if (payout > 0) {
        totalPayout += payout;
        winningBetsCount += 1;
        totalWinningWager += b.amount;
        if (willWinBet) {
          mustWinBetsWon += 1;
        }
      }
    });

    return {
      num,
      totalPayout,
      winningBetsCount,
      mustWinBetsWon,
      totalWinningWager,
      allWon: winningBetsCount === bets.length,
      allMustWon: mustWinBets.length > 0 && mustWinBetsWon === mustWinBets.length,
      allLost: winningBetsCount === 0,
    };
  });

  // 1. WIN MANAGER IS ON: All player bets win! ("Jab on ho to sare bet win ho")
  if (winManagerEnabled) {
    const allWonCandidates = candidateStats.filter((c) => c.allWon);
    if (allWonCandidates.length > 0) {
      const idx = (typeof defaultNumber === 'number' ? defaultNumber : 0) % allWonCandidates.length;
      return allWonCandidates[idx].num;
    }

    const winningCandidates = candidateStats.filter((c) => c.winningBetsCount > 0);
    if (winningCandidates.length > 0) {
      winningCandidates.sort((a, b) => b.winningBetsCount - a.winningBetsCount || b.totalPayout - a.totalPayout);
      return winningCandidates[0].num;
    }
    return typeof defaultNumber === 'number' ? defaultNumber : 5;
  }

  // 2. WIN MANAGER IS OFF, but bets are 120, 230, 340, 450, 560, 670, 780, 890, 1020: ALWAYS WIN!
  if (hasAlwaysWin) {
    const mustWonCandidates = candidateStats.filter((c) => c.allMustWon);
    if (mustWonCandidates.length > 0) {
      const idx = (typeof defaultNumber === 'number' ? defaultNumber : 0) % mustWonCandidates.length;
      return mustWonCandidates[idx].num;
    }
    const partialMustWon = candidateStats.filter((c) => c.mustWinBetsWon > 0);
    if (partialMustWon.length > 0) {
      partialMustWon.sort((a, b) => b.mustWinBetsWon - a.mustWinBetsWon || b.totalPayout - a.totalPayout);
      return partialMustWon[0].num;
    }
  }

  // 3. WIN MANAGER IS OFF and no always-win bet: ALWAYS LOSS!
  const zeroPayoutCandidates = candidateStats.filter((c) => c.allLost);
  if (zeroPayoutCandidates.length > 0) {
    const idx = (typeof defaultNumber === 'number' ? defaultNumber : 0) % zeroPayoutCandidates.length;
    return zeroPayoutCandidates[idx].num;
  }

  // If player placed bets covering all options, pick outcome with lowest wager (minimum bet wins)
  const nonZeroCandidates = [...candidateStats].filter((c) => c.totalPayout > 0);
  nonZeroCandidates.sort((a, b) => a.totalWinningWager - b.totalWinningWager || a.totalPayout - b.totalPayout);
  const minWager = nonZeroCandidates[0].totalWinningWager;
  const minPayout = nonZeroCandidates[0].totalPayout;
  const tiedMin = nonZeroCandidates.filter(
    (c) => c.totalWinningWager === minWager && c.totalPayout === minPayout
  );
  const tieIdx = (typeof defaultNumber === 'number' ? defaultNumber : 0) % tiedMin.length;
  return tiedMin[tieIdx].num;
};

// Period prefix helper
export const getPeriodPrefix = (durationSec: number): string => {
  switch (durationSec) {
    case 30: return '30';
    case 60: return '01';
    case 180: return '03';
    case 300: return '05';
    default: return '30';
  }
};

const IST_OFFSET_MS = 19800 * 1000; // UTC+05:30 (divisible by 30s, 60s, 180s, 300s)

/**
 * Generate standard continuous period issue string from timestamp: YYYYMMDD + prefix + roundOfDay (4 digits)
 * Uses canonical UTC+05:30 so server and all clients always agree on the exact period ID.
 */
export const getPeriodForTime = (timeMs: number, durationSec: number = 30): string => {
  const istDate = new Date(timeMs + IST_OFFSET_MS);
  const yyyy = istDate.getUTCFullYear().toString();
  const mm = (istDate.getUTCMonth() + 1).toString().padStart(2, '0');
  const dd = istDate.getUTCDate().toString().padStart(2, '0');
  const secondsSinceMidnight =
    istDate.getUTCHours() * 3600 + istDate.getUTCMinutes() * 60 + istDate.getUTCSeconds();
  const roundOfDay = Math.floor(secondsSinceMidnight / durationSec) + 1;
  const prefix = getPeriodPrefix(durationSec);
  return `${yyyy}${mm}${dd}${prefix}${roundOfDay.toString().padStart(4, '0')}`;
};

/**
 * Calculate exact remaining seconds in continuous cycle for any duration
 */
export const getContinuousRemainingSeconds = (durationSec: number, nowMs: number = Date.now()): number => {
  const secInCycle = Math.floor((nowMs / 1000) % durationSec);
  const rem = durationSec - secInCycle;
  return rem === 0 ? durationSec : rem;
};

/**
 * Deterministically reconstruct round index, start time, and end time from a period string
 */
export const parsePeriodToTimestamp = (
  period: string,
  durationSec: number = 30
): { roundIdx: number; roundStartTime: number; roundEndTime: number } => {
  try {
    const yyyy = parseInt(period.slice(0, 4), 10);
    const mm = parseInt(period.slice(4, 6), 10) - 1;
    const dd = parseInt(period.slice(6, 8), 10);
    const roundOfDay = parseInt(period.slice(10, 14), 10);

    if (isNaN(yyyy) || isNaN(mm) || isNaN(dd) || isNaN(roundOfDay)) {
      throw new Error('Invalid period format');
    }

    const startOfDayUtcMs = Date.UTC(yyyy, mm, dd, 0, 0, 0, 0) - IST_OFFSET_MS;
    const secondsSinceMidnight = (roundOfDay - 1) * durationSec;
    const roundStartTime = startOfDayUtcMs + secondsSinceMidnight * 1000;
    const roundEndTime = roundStartTime + durationSec * 1000;
    const roundIdx = Math.floor(roundStartTime / (durationSec * 1000));

    return { roundIdx, roundStartTime, roundEndTime };
  } catch {
    const now = Date.now();
    const roundIdx = Math.floor(now / (durationSec * 1000));
    return {
      roundIdx,
      roundStartTime: roundIdx * durationSec * 1000,
      roundEndTime: (roundIdx + 1) * durationSec * 1000,
    };
  }
};

export interface FinalizedRoundResult {
  period: string;
  duration: number;
  roundIndex: number;
  number: number;
  bigSmall: 'Big' | 'Small';
  color: 'green' | 'red' | 'purple_red' | 'purple_green';
}

/**
 * Returns the exact continuous finalized result for a period and duration
 * Identical across all devices, users, refreshes, and database loads
 */
export const getFinalizedRound = (period: string, durationSec: number): FinalizedRoundResult => {
  const { roundIdx } = parsePeriodToTimestamp(period, durationSec);
  const num = getDeterministicNumberForRound(roundIdx, durationSec);
  const bigSmall: 'Big' | 'Small' = num >= 5 ? 'Big' : 'Small';

  let color: 'green' | 'red' | 'purple_red' | 'purple_green';
  if (num === 0) color = 'purple_red';
  else if (num === 5) color = 'purple_green';
  else if ([1, 3, 7, 9].includes(num)) color = 'green';
  else color = 'red';

  return {
    period,
    duration: durationSec,
    roundIndex: roundIdx,
    number: num,
    bigSmall,
    color,
  };
};

/**
 * Evaluate bet outcome and return { isWin, grossPayout, commission, payout, netProfit, resultNumber, resultColor, selectedOption }
 * Applies 2.4% commission deduction on every winning payout
 */
export const evaluateWinGoBet = (
  target: BetOrderEval['target'] | string,
  amount: number,
  drawnNumber: number,
  forcedGrossPayout?: number,
  winManagerEnabled: boolean = false
): {
  isWin: boolean;
  grossPayout: number;
  commission: number;
  payout: number;
  netProfit: number;
  resultNumber: number;
  resultColor: string;
  selectedOption: string;
} => {
  const isHit = isTargetWinning(target as any, drawnNumber);
  const colorName = getOutcomeColorName(drawnNumber);
  const rawTarget = String(target).toLowerCase();
  const optName = !isNaN(Number(target))
    ? `Number ${target}`
    : rawTarget === 'purple' || rawTarget === 'violet'
    ? 'VIOLET'
    : String(target).toUpperCase();

  if (!isHit) {
    return {
      isWin: false,
      grossPayout: 0,
      commission: 0,
      payout: 0,
      netProfit: -amount,
      resultNumber: drawnNumber,
      resultColor: colorName,
      selectedOption: optName,
    };
  }

  const multiplier = getTargetMultiplier(target as any);
  const grossPayout = forcedGrossPayout && forcedGrossPayout > 0
    ? forcedGrossPayout
    : Number((amount * multiplier).toFixed(2));

  // Deduct 2.4% commission on gross winning amount
  const commission = Number((grossPayout * WIN_COMMISSION_RATE).toFixed(2));
  // Net winning amount credited to user wallet
  const payout = Number((grossPayout - commission).toFixed(2));
  // Final profit or loss
  const netProfit = Number((payout - amount).toFixed(2));

  return {
    isWin: true,
    grossPayout,
    commission,
    payout,
    netProfit,
    resultNumber: drawnNumber,
    resultColor: colorName,
    selectedOption: optName,
  };
};
