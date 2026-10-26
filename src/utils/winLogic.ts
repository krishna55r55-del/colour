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
  target: 'green' | 'red' | 'purple' | 'big' | 'small' | number;
  amount: number;
  label?: string;
}

export const WIN_COMMISSION_PERCENT = 2.4; // 2.4% commission on every win
export const WIN_COMMISSION_RATE = 0.024;

/**
 * Designated Winning Payout Pool:
 * [120, 230, 340, 450, 560, 670, 780, 890, 1020]
 * As requested: "Winning button default off Rahe and kuch amount win ho always 120 230 340 450 560 670 780 890 1020"
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

/**
 * Pick winning amount from the designated pool [120, 230, 340, 450, 560, 670, 780, 890, 1020]
 */
export const pickTargetWinAmount = (betAmount: number, seed?: number): number => {
  const eligible = TARGET_WIN_AMOUNTS.filter((amt) => amt > betAmount);
  const pool = eligible.length > 0 ? eligible : TARGET_WIN_AMOUNTS;

  if (typeof seed === 'number' && !isNaN(seed)) {
    const idx = Math.abs(Math.floor(seed)) % pool.length;
    return pool[idx];
  }

  if (betAmount <= 10) {
    const lowPool = pool.filter((a) => a <= 340);
    const pickFrom = lowPool.length > 0 ? lowPool : pool;
    return pickFrom[Math.floor(Math.random() * pickFrom.length)];
  } else if (betAmount <= 50) {
    const midPool = pool.filter((a) => a >= 230 && a <= 560);
    const pickFrom = midPool.length > 0 ? midPool : pool;
    return pickFrom[Math.floor(Math.random() * pickFrom.length)];
  } else if (betAmount <= 100) {
    const midHighPool = pool.filter((a) => a >= 340 && a <= 780);
    const pickFrom = midHighPool.length > 0 ? midHighPool : pool;
    return pickFrom[Math.floor(Math.random() * pickFrom.length)];
  } else if (betAmount <= 300) {
    const highPool = pool.filter((a) => a >= 560 && a <= 890);
    const pickFrom = highPool.length > 0 ? highPool : pool;
    return pickFrom[Math.floor(Math.random() * pickFrom.length)];
  } else if (betAmount <= 500) {
    const topPool = pool.filter((a) => a >= 780);
    const pickFrom = topPool.length > 0 ? topPool : pool;
    return pickFrom[Math.floor(Math.random() * pickFrom.length)];
  } else {
    // For very high bets (>= 1000)
    const multiplier = Math.ceil(betAmount / 500);
    return 1020 * Math.max(1, multiplier);
  }
};

export const calculateBetPayout = (
  target: BetOrderEval['target'],
  amount: number,
  outcomeNumber: number,
  applyCommission: boolean = true
): number => {
  let isHit = false;
  if (typeof target === 'number') {
    isHit = target === outcomeNumber;
  } else if (target === 'green') {
    isHit = [1, 3, 5, 7, 9].includes(outcomeNumber);
  } else if (target === 'red') {
    isHit = [0, 2, 4, 6, 8].includes(outcomeNumber);
  } else if (target === 'purple') {
    isHit = outcomeNumber === 0 || outcomeNumber === 5;
  } else if (target === 'big') {
    isHit = outcomeNumber >= 5;
  } else if (target === 'small') {
    isHit = outcomeNumber <= 4;
  }

  if (!isHit) return 0;

  // Selected gross payout from target win pool [120, 230, 340, 450, 560, 670, 780, 890, 1020]
  const gross = pickTargetWinAmount(amount, outcomeNumber * 13 + amount);

  if (applyCommission) {
    const commission = gross * WIN_COMMISSION_RATE;
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
      return allWonCandidates[Math.floor(Math.random() * allWonCandidates.length)].num;
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
      return mustWonCandidates[Math.floor(Math.random() * mustWonCandidates.length)].num;
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
    return zeroPayoutCandidates[Math.floor(Math.random() * zeroPayoutCandidates.length)].num;
  }

  // If player placed bets covering all options, pick outcome with lowest wager
  const nonZeroCandidates = [...candidateStats].filter((c) => c.totalPayout > 0);
  nonZeroCandidates.sort((a, b) => a.totalWinningWager - b.totalWinningWager || a.totalPayout - b.totalPayout);
  return nonZeroCandidates[0].num;
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

/**
 * Generate standard continuous period issue string from timestamp: YYYYMMDD + prefix + roundOfDay (4 digits)
 */
export const getPeriodForTime = (timeMs: number, durationSec: number = 30): string => {
  const date = new Date(timeMs);
  const yyyy = date.getFullYear().toString();
  const mm = (date.getMonth() + 1).toString().padStart(2, '0');
  const dd = date.getDate().toString().padStart(2, '0');
  const secondsSinceMidnight = date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
  const roundOfDay = Math.floor(secondsSinceMidnight / durationSec) + 1;
  const prefix = getPeriodPrefix(durationSec);
  return `${yyyy}${mm}${dd}${prefix}${roundOfDay.toString().padStart(4, '0')}`;
};

/**
 * Calculate exact remaining seconds in continuous cycle for any duration
 */
export const getContinuousRemainingSeconds = (durationSec: number): number => {
  const secInCycle = Math.floor((Date.now() / 1000) % durationSec);
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

    const startOfDayMs = new Date(yyyy, mm, dd, 0, 0, 0, 0).getTime();
    const secondsSinceMidnight = (roundOfDay - 1) * durationSec;
    const roundStartTime = startOfDayMs + secondsSinceMidnight * 1000;
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
 * Evaluate bet outcome and return { isWin, grossPayout, commission, payout, netProfit }
 * Applies 2.4% commission deduction on every winning payout ("Hr winn pe 2.4 percent commission katega")
 */
export const evaluateWinGoBet = (
  target: BetOrderEval['target'],
  amount: number,
  drawnNumber: number,
  forcedGrossPayout?: number,
  winManagerEnabled: boolean = false
): { isWin: boolean; grossPayout: number; commission: number; payout: number; netProfit: number } => {
  const willWin = isBetAlwaysWin(amount, winManagerEnabled);

  // When button is OFF and bet amount is NOT one of [120, 230, 340, 450, 560, 670, 780, 890, 1020]:
  // Strictly always a LOSS!
  if (!willWin) {
    return {
      isWin: false,
      grossPayout: 0,
      commission: 0,
      payout: 0,
      netProfit: -amount,
    };
  }

  // When willWin is true (either ON for all, or 120/230/... for off on both):
  // User is guaranteed to win!
  const grossPayout =
    forcedGrossPayout && forcedGrossPayout > 0
      ? forcedGrossPayout
      : pickTargetWinAmount(amount, drawnNumber * 13 + amount);

  const commission = Number((grossPayout * WIN_COMMISSION_RATE).toFixed(2));
  const payout = Number((grossPayout - commission).toFixed(2));
  const netProfit = Number((payout - amount).toFixed(2));

  return {
    isWin: true,
    grossPayout,
    commission,
    payout,
    netProfit,
  };
};
