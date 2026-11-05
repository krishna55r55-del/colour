import React, { useState, useEffect } from 'react';
import { Radio, Clock, Sparkles, RefreshCw } from 'lucide-react';
import { GameId } from '../../types';
import {
  getContinuousPeriodForGame,
  getContinuousRemainingSeconds,
  getContinuousHistoryForGame,
  calculateDeterministicGameOutcome,
  ContinuousRoundResult,
  CONTINUOUS_ROUND_DURATION_SEC,
} from '../../utils/allGamesContinuousLogic';

interface Props {
  gameId: GameId;
  gameTitle?: string;
}

export const ContinuousGameLiveHeader: React.FC<Props> = ({ gameId, gameTitle }) => {
  const [timeLeft, setTimeLeft] = useState<number>(() => getContinuousRemainingSeconds());
  const [currentPeriod, setCurrentPeriod] = useState<string>(() => getContinuousPeriodForGame(gameId));
  const [history, setHistory] = useState<ContinuousRoundResult[]>(() =>
    getContinuousHistoryForGame(gameId, 10)
  );

  useEffect(() => {
    let lastRoundIndex = Math.floor(Date.now() / (CONTINUOUS_ROUND_DURATION_SEC * 1000));

    const tick = () => {
      const now = Date.now();
      const rem = getContinuousRemainingSeconds();
      setTimeLeft(rem);

      const roundIdx = Math.floor(now / (CONTINUOUS_ROUND_DURATION_SEC * 1000));
      if (roundIdx !== lastRoundIndex) {
        lastRoundIndex = roundIdx;
        setCurrentPeriod(getContinuousPeriodForGame(gameId, now));
        // Refresh continuous history with newly completed round
        setHistory(getContinuousHistoryForGame(gameId, 10));
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [gameId]);

  return (
    <div className="w-full bg-slate-900/90 text-white p-3 sm:p-4 rounded-2xl border border-slate-800 space-y-2.5 shadow-md">
      {/* Top Issue & Timer Row */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30 text-[10px] uppercase tracking-wider">
            <Radio className="w-3 h-3 animate-pulse text-emerald-400" />
            <span>24/7 Live Continuous</span>
          </span>
          <span className="font-mono font-bold text-slate-300 text-xs">
            Issue <strong className="text-white">#{currentPeriod.slice(-6)}</strong>
          </span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800 border border-slate-700 font-mono text-xs">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-slate-400 text-[11px]">Draw:</span>
          <span
            className={`font-black tabular-nums ${
              timeLeft <= 5 ? 'text-rose-400 animate-pulse text-sm' : 'text-amber-300'
            }`}
          >
            00:{timeLeft.toString().padStart(2, '0')}s
          </span>
        </div>
      </div>

      {/* Continuous Results Trajectory Strip (Live past rounds) */}
      <div className="pt-1 border-t border-slate-800/80">
        <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold mb-1.5">
          <span>Continuous Rounds Trend (Past 10 Draws):</span>
          <span className="text-emerald-400">● Live Auto Sync</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {history.map((h, idx) => (
            <div
              key={idx}
              className={`px-2.5 py-1 rounded-lg text-center font-mono shrink-0 border ${
                idx === 0
                  ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.2)]'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300'
              }`}
              title={`${h.period}: ${h.summary}`}
            >
              <div className="text-[9px] text-slate-500 font-sans font-semibold">
                #{h.period.slice(-4)}
              </div>
              <div className="text-[11px] font-black truncate max-w-[85px]">{h.badge}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
