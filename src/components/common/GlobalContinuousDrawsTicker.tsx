import React, { useState, useEffect } from 'react';
import { Radio, Clock, ChevronRight, Zap, RefreshCw } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { ALL_GAMES } from '../../data/games';
import { GameId } from '../../types';
import {
  getContinuousPeriodForGame,
  getContinuousRemainingSeconds,
  calculateDeterministicGameOutcome,
  CONTINUOUS_ROUND_DURATION_SEC,
} from '../../utils/allGamesContinuousLogic';

export const GlobalContinuousDrawsTicker: React.FC = () => {
  const { selectGame, playSound } = useGame();
  const [timeLeft, setTimeLeft] = useState<number>(() => getContinuousRemainingSeconds());
  const [tickCount, setTickCount] = useState<number>(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const rem = getContinuousRemainingSeconds();
      setTimeLeft(rem);
      setTickCount((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Compute live current outcomes for all 10 games
  const currentRoundIndex = Math.floor(Date.now() / (CONTINUOUS_ROUND_DURATION_SEC * 1000));
  const previousRoundIndex = currentRoundIndex - 1;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6">
      <div className="rounded-3xl bg-white border border-slate-200/90 shadow-sm p-4 sm:p-5 space-y-3.5">
        {/* Header Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <Radio className="w-4 h-4 animate-pulse text-rose-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">
                  24/7 Live Continuous Rounds (All 10 Games)
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
                  Live Sync
                </span>
              </div>
              <span className="text-[11px] text-slate-500 block">
                Non-stop deterministic draws running continuously whether site is online or offline
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 text-white font-mono font-bold text-xs shadow-xs">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Next Draw:</span>
              <span className={`font-black ${timeLeft <= 5 ? 'text-rose-400 animate-pulse' : 'text-amber-300'}`}>
                00:{timeLeft.toString().padStart(2, '0')}s
              </span>
            </div>
          </div>
        </div>

        {/* 10 Games Real-Time Continuous Rounds Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {ALL_GAMES.map((game) => {
            const lastOutcome = calculateDeterministicGameOutcome(game.id, previousRoundIndex);
            const activePeriod = getContinuousPeriodForGame(game.id);

            return (
              <div
                key={game.id}
                onClick={() => {
                  playSound('click');
                  selectGame(game.id);
                }}
                className="p-3 rounded-2xl bg-slate-50 hover:bg-white border border-slate-200/90 hover:border-rose-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider truncate max-w-[90px]">
                      {game.title}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  </div>

                  <div className="text-[10px] text-slate-400 font-mono">
                    #{activePeriod.slice(-4)}
                  </div>

                  <div className="mt-1.5 py-1 px-2 rounded-lg bg-white border border-slate-200 text-center shadow-2xs">
                    <span className="text-xs font-black text-slate-800 truncate block">
                      {lastOutcome.badge}
                    </span>
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-rose-600 font-bold group-hover:text-rose-700">
                  <span>Enter Room</span>
                  <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
