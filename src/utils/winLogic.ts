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

export const calculateBetPayout = (
  target: BetOrderEval['target'],
  amount: number,
  outcomeNumber: number
): number => {
  if (typeof target === 'number') {
    return target === outcomeNumber ? amount * 9 : 0;
  }
  if (target === 'green') {
    if (outcomeNumber === 5) return Math.round(amount * 1.5);
    if ([1, 3, 7, 9].includes(outcomeNumber)) return amount * 2;
    return 0;
  }
  if (target === 'red') {
    if (outcomeNumber === 0) return Math.round(amount * 1.5);
    if ([2, 4, 6, 8].includes(outcomeNumber)) return amount * 2;
    return 0;
  }
  if (target === 'purple') {
    if (outcomeNumber === 0 || outcomeNumber === 5) return Math.round(amount * 4.5);
    return 0;
  }
  if (target === 'big') {
    return outcomeNumber >= 5 ? amount * 2 : 0;
  }
  if (target === 'small') {
    return outcomeNumber <= 4 ? amount * 2 : 0;
  }
  return 0;
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
  winManagerEnabled: boolean,
  defaultNumber?: number
): number => {
  const allNumbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  // Natural draw if no active bets: return the continuous global deterministic number
  if (!bets || bets.length === 0) {
    return typeof defaultNumber === 'number' ? defaultNumber : Math.floor(Math.random() * 10);
  }

  // Pre-calculate evaluation for all 10 possible outcome numbers
  const candidateStats = allNumbers.map((num) => {
    let totalPayout = 0;
    let winningBetsCount = 0;
    let totalWinningWager = 0;

    bets.forEach((b) => {
      const payout = calculateBetPayout(b.target, b.amount, num);
      if (payout > 0) {
        totalPayout += payout;
        winningBetsCount += 1;
        totalWinningWager += b.amount;
      }
    });

    return {
      num,
      totalPayout,
      winningBetsCount,
      totalWinningWager,
      allWon: winningBetsCount === bets.length,
      allLost: winningBetsCount === 0,
    };
  });

  // 1. Win Manager is ON: All bets will win
  if (winManagerEnabled) {
    const allWonCandidates = candidateStats.filter((c) => c.allWon);
    if (allWonCandidates.length > 0) {
      const picked = allWonCandidates[Math.floor(Math.random() * allWonCandidates.length)];
      return picked.num;
    }

    // In case of conflicting bets (e.g., bet on Red and Green simultaneously),
    // pick the outcome that maximizes winning bets and payout
    const sorted = [...candidateStats].sort((a, b) => {
      if (b.winningBetsCount !== a.winningBetsCount) {
        return b.winningBetsCount - a.winningBetsCount;
      }
      return b.totalPayout - a.totalPayout;
    });

    return sorted[0].num;
  }

  // 2. Win Manager is OFF:
  // "when the button is off the all bet will loss and if a person bet ob all option the lower bet will win"

  // Check if there are outcomes where ALL user bets lose (0 payout)
  const zeroPayoutCandidates = candidateStats.filter((c) => c.allLost);
  if (zeroPayoutCandidates.length > 0) {
    const picked = zeroPayoutCandidates[Math.floor(Math.random() * zeroPayoutCandidates.length)];
    return picked.num;
  }

  // If player bet on all options so no 0-payout number exists:
  // Pick the outcome with the LOWEST winning bet amount (the lower bet wins!)
  const nonZeroCandidates = [...candidateStats].filter((c) => c.totalPayout > 0);
  nonZeroCandidates.sort((a, b) => {
    if (a.totalWinningWager !== b.totalWinningWager) {
      return a.totalWinningWager - b.totalWinningWager;
    }
    return a.totalPayout - b.totalPayout;
  });

  const minWager = nonZeroCandidates[0].totalWinningWager;
  const lowestCandidates = nonZeroCandidates.filter((c) => c.totalWinningWager === minWager);
  const picked = lowestCandidates[Math.floor(Math.random() * lowestCandidates.length)];
  return picked.num;
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
 * Evaluate bet outcome and return { isWin, payout, netProfit }
 */
export const evaluateWinGoBet = (
  target: BetOrderEval['target'],
  amount: number,
  drawnNumber: number
): { isWin: boolean; payout: number; netProfit: number } => {
  const payout = calculateBetPayout(target, amount, drawnNumber);
  const isWin = payout > 0;
  return {
    isWin,
    payout,
    netProfit: payout - amount,
  };
};
