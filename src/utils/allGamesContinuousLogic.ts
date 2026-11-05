/**
 * 24/7 Global Continuous Game Engine for All 10 COBCLUB Games
 *
 * Ensures all 10 games run continuous, unbroken rounds 24/7:
 * Whether the user is on the site, closes the tab, turns off their device,
 * or returns days later, all past and present rounds are deterministically
 * calculated and synchronized with real-world clock time.
 */

import { GameId } from '../types';

export const CONTINUOUS_ROUND_DURATION_SEC = 30; // 30-second continuous round cycle

// Game prefix codes for unique period issue identification
export const GAME_PERIOD_PREFIXES: Record<GameId, string> = {
  'color-prediction': '30',
  'dice-roll': 'DICE',
  'dragon-tiger': 'DT',
  'lucky-number': 'LNUM',
  'coin-flip': 'COIN',
  'number-prediction': 'NUMP',
  'spin-wheel': 'WHEEL',
  'lucky-cards': 'CARD',
  'color-match': 'CMAT',
  'memory-match': 'MMAT',
};

/**
 * Deterministic integer hash PRNG
 */
export const deterministicHash = (seed1: number, seed2: number, seed3: number = 0): number => {
  let h = Math.imul(seed1 ^ 0x61c88647, 0x9e3779b9) ^ Math.imul(seed2, 0x85ebca6b) ^ Math.imul(seed3, 0x517cc1b7);
  h = Math.imul(h ^ (h >>> 16), 0x21f0aaad);
  h = Math.imul(h ^ (h >>> 15), 0x735a2d97);
  h = (h ^ (h >>> 15)) >>> 0;
  return h;
};

/**
 * Generates continuous period issue string from timestamp: YYYYMMDD + prefix + roundOfDay (4 digits)
 */
export const getContinuousPeriodForGame = (
  gameId: GameId,
  timeMs: number = Date.now(),
  durationSec: number = CONTINUOUS_ROUND_DURATION_SEC
): string => {
  const date = new Date(timeMs);
  const yyyy = date.getFullYear().toString();
  const mm = (date.getMonth() + 1).toString().padStart(2, '0');
  const dd = date.getDate().toString().padStart(2, '0');
  const secondsSinceMidnight = date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
  const roundOfDay = Math.floor(secondsSinceMidnight / durationSec) + 1;
  const prefix = GAME_PERIOD_PREFIXES[gameId] || '30';
  return `${yyyy}${mm}${dd}${prefix}${roundOfDay.toString().padStart(4, '0')}`;
};

/**
 * Seconds remaining in current active continuous round
 */
export const getContinuousRemainingSeconds = (durationSec: number = CONTINUOUS_ROUND_DURATION_SEC): number => {
  const secInCycle = Math.floor((Date.now() / 1000) % durationSec);
  const rem = durationSec - secInCycle;
  return rem === 0 ? durationSec : rem;
};

/**
 * Reconstructs round index and start/end time from period
 */
export const parseContinuousPeriod = (
  period: string,
  gameId: GameId,
  durationSec: number = CONTINUOUS_ROUND_DURATION_SEC
): { roundIdx: number; roundStartTime: number; roundEndTime: number } => {
  try {
    const yyyy = parseInt(period.slice(0, 4), 10);
    const mm = parseInt(period.slice(4, 6), 10) - 1;
    const dd = parseInt(period.slice(6, 8), 10);
    const roundPart = period.slice(period.length - 4);
    const roundOfDay = parseInt(roundPart, 10);

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

export interface ContinuousRoundResult {
  gameId: GameId;
  period: string;
  roundIndex: number;
  timestamp: number;
  summary: string;
  badge: string;
  data: Record<string, any>;
}

const SUITS: Array<'♠' | '♥' | '♦' | '♣'> = ['♠', '♥', '♦', '♣'];
const RANK_LABELS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

/**
 * Calculates the exact deterministic outcome for any of the 10 games for a specific roundIndex.
 * Produces identical outcome across all devices, refreshes, and times.
 */
export const calculateDeterministicGameOutcome = (gameId: GameId, roundIndex: number): ContinuousRoundResult => {
  const period = getContinuousPeriodForGame(gameId, roundIndex * CONTINUOUS_ROUND_DURATION_SEC * 1000);
  const timestamp = roundIndex * CONTINUOUS_ROUND_DURATION_SEC * 1000;

  switch (gameId) {
    case 'color-prediction': {
      const h = deterministicHash(roundIndex, 101);
      const num = h % 10;
      const bigSmall = num >= 5 ? 'Big' : 'Small';
      let color: 'green' | 'red' | 'purple_red' | 'purple_green';
      if (num === 0) color = 'purple_red';
      else if (num === 5) color = 'purple_green';
      else if ([1, 3, 7, 9].includes(num)) color = 'green';
      else color = 'red';

      return {
        gameId,
        period,
        roundIndex,
        timestamp,
        summary: `Number ${num} (${bigSmall})`,
        badge: `#${num} ${color.replace('_', ' ')}`,
        data: { number: num, bigSmall, color },
      };
    }

    case 'dice-roll': {
      const h1 = deterministicHash(roundIndex, 201);
      const h2 = deterministicHash(roundIndex, 202);
      const die1 = (h1 % 6) + 1;
      const die2 = (h2 % 6) + 1;
      const sum = die1 + die2;
      const category = sum < 7 ? 'under7' : sum > 7 ? 'over7' : 'exact7';
      const isDoubles = die1 === die2;
      const label = sum === 7 ? 'Lucky 7' : sum < 7 ? `Under 7 (${sum})` : `Over 7 (${sum})`;

      return {
        gameId,
        period,
        roundIndex,
        timestamp,
        summary: `Dice ${die1} + ${die2} = ${sum}`,
        badge: label,
        data: { die1, die2, sum, category, isDoubles },
      };
    }

    case 'dragon-tiger': {
      const hD = deterministicHash(roundIndex, 301);
      const hT = deterministicHash(roundIndex, 302);
      const dRank = (hD % 13) + 1;
      const tRank = (hT % 13) + 1;
      const dSuit = SUITS[hD % 4];
      const tSuit = SUITS[hT % 4];
      const winner = dRank > tRank ? 'dragon' : tRank > dRank ? 'tiger' : 'tie';
      const winnerLabel = winner === 'dragon' ? 'Dragon Wins' : winner === 'tiger' ? 'Tiger Wins' : 'Tie';

      return {
        gameId,
        period,
        roundIndex,
        timestamp,
        summary: `Dragon ${RANK_LABELS[dRank]}${dSuit} vs Tiger ${RANK_LABELS[tRank]}${tSuit}`,
        badge: winnerLabel,
        data: {
          dragon: { rank: dRank, rankLabel: RANK_LABELS[dRank], suit: dSuit },
          tiger: { rank: tRank, rankLabel: RANK_LABELS[tRank], suit: tSuit },
          winner,
        },
      };
    }

    case 'lucky-number': {
      const h = deterministicHash(roundIndex, 401);
      const num = h % 10;
      const oddEven = num % 2 !== 0 ? 'odd' : 'even';
      const range = num <= 4 ? 'low' : 'high';
      return {
        gameId,
        period,
        roundIndex,
        timestamp,
        summary: `Sphere #${num} (${oddEven.toUpperCase()}, ${range.toUpperCase()})`,
        badge: `Sphere #${num}`,
        data: { number: num, oddEven, range },
      };
    }

    case 'coin-flip': {
      const h = deterministicHash(roundIndex, 501);
      const side: 'heads' | 'tails' = (h % 2 === 0) ? 'heads' : 'tails';
      return {
        gameId,
        period,
        roundIndex,
        timestamp,
        summary: `Coin landed ${side.toUpperCase()}`,
        badge: side === 'heads' ? 'HEADS (Crest)' : 'TAILS (Viper)',
        data: { side },
      };
    }

    case 'number-prediction': {
      const hBase = deterministicHash(roundIndex, 601);
      const hDrawn = deterministicHash(roundIndex, 602);
      const base = (hBase % 90) + 5; // 5 - 94
      const drawn = (hDrawn % 100) + 1;
      const outcome = drawn > base ? 'higher' : drawn < base ? 'lower' : 'equal';
      return {
        gameId,
        period,
        roundIndex,
        timestamp,
        summary: `Base ${base} → Drawn ${drawn} (${outcome.toUpperCase()})`,
        badge: `#${drawn} ${outcome.toUpperCase()}`,
        data: { baseNumber: base, drawnNumber: drawn, outcome },
      };
    }

    case 'spin-wheel': {
      const h = deterministicHash(roundIndex, 701);
      const segmentIndex = h % 8;
      const multipliers = [25.0, 0.0, 1.5, 2.0, 0.5, 0.0, 3.0, 5.0];
      const mult = multipliers[segmentIndex];
      return {
        gameId,
        period,
        roundIndex,
        timestamp,
        summary: `Wheel landed on Segment #${segmentIndex + 1} (${mult}x)`,
        badge: `${mult.toFixed(1)}x Multiplier`,
        data: { segmentIndex, multiplier: mult },
      };
    }

    case 'lucky-cards': {
      const h = deterministicHash(roundIndex, 801);
      const winCardIndex = h % 5;
      const multipliers = [0.5, 1.2, 2.0, 4.0, 10.0];
      const mult = multipliers[winCardIndex];
      return {
        gameId,
        period,
        roundIndex,
        timestamp,
        summary: `Card #${winCardIndex + 1} revealed ${mult}x`,
        badge: `Card #${winCardIndex + 1} (${mult}x)`,
        data: { winningCardIndex: winCardIndex, multiplier: mult },
      };
    }

    case 'color-match': {
      const h = deterministicHash(roundIndex, 901);
      const colors = ['Hyper Violet', 'Electric Cyan', 'Neon Amber', 'Muted Lavender'];
      const targetColor = colors[h % colors.length];
      return {
        gameId,
        period,
        roundIndex,
        timestamp,
        summary: `Target matched: ${targetColor}`,
        badge: targetColor,
        data: { targetColor },
      };
    }

    case 'memory-match': {
      const h = deterministicHash(roundIndex, 1001);
      const turns = (h % 6) + 6; // 6 to 11 turns
      const mult = turns <= 7 ? 3.5 : turns <= 10 ? 2.4 : 1.8;
      return {
        gameId,
        period,
        roundIndex,
        timestamp,
        summary: `Memory grid solved in ${turns} Turns`,
        badge: `${turns} Turns (${mult}x)`,
        data: { turns, multiplier: mult },
      };
    }

    default:
      return {
        gameId,
        period,
        roundIndex,
        timestamp,
        summary: `Round #${roundIndex} Completed`,
        badge: 'Completed',
        data: {},
      };
  }
};

/**
 * Returns continuous history of past completed rounds for any of the 10 games.
 * Generated backwards from current clock second so results are completely continuous
 * even if the user closed the site, turned off device, and reopened hours later!
 */
export const getContinuousHistoryForGame = (
  gameId: GameId,
  count: number = 20,
  durationSec: number = CONTINUOUS_ROUND_DURATION_SEC
): ContinuousRoundResult[] => {
  const currentRoundIndex = Math.floor(Date.now() / (durationSec * 1000));
  const list: ContinuousRoundResult[] = [];

  for (let i = 1; i <= count; i++) {
    const roundIdx = currentRoundIndex - i;
    if (roundIdx < 0) break;
    list.push(calculateDeterministicGameOutcome(gameId, roundIdx));
  }

  return list;
};
