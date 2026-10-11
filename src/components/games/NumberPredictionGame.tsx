import React, { useState } from 'react';
import { ArrowUp, ArrowDown, Equal, Play, Sparkles } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { GameModalHeader } from '../common/GameModalHeader';
import { BetControls } from '../common/BetControls';
import { WinModal } from '../common/WinModal';

type HiLoChoice = 'higher' | 'lower' | 'equal';

export const NumberPredictionGame: React.FC = () => {
  const { placeBet, recordGameResult, playSound } = useGame();

  const [betAmount, setBetAmount] = useState(50);
  const [baseNumber, setBaseNumber] = useState<number>(50);
  const [nextNumber, setNextNumber] = useState<number | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<HiLoChoice>('higher');
  const [isRevealing, setIsRevealing] = useState(false);
  const [streak, setStreak] = useState(0);

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    isWin: boolean;
    payout: number;
    multiplier: number;
    message: string;
  }>({
    isOpen: false,
    isWin: false,
    payout: 0,
    multiplier: 1,
    message: '',
  });

  // Calculate dynamic multipliers based on current baseNumber (1-100)
  // Higher: probability = (100 - baseNumber) / 100
  // Lower: probability = (baseNumber - 1) / 100
  const higherProb = Math.max(0.05, (100 - baseNumber) / 100);
  const lowerProb = Math.max(0.05, (baseNumber - 1) / 100);

  const higherMultiplier = Math.min(10, Math.max(1.15, Number((0.96 / higherProb).toFixed(2))));
  const lowerMultiplier = Math.min(10, Math.max(1.15, Number((0.96 / lowerProb).toFixed(2))));
  const equalMultiplier = 12.0;

  const handlePredict = () => {
    if (!placeBet(betAmount)) return;

    setIsRevealing(true);
    setNextNumber(null);

    let count = 0;
    const interval = setInterval(() => {
      playSound('tick');
      setNextNumber(Math.floor(Math.random() * 100) + 1);
      count++;
      if (count > 12) clearInterval(interval);
    }, 80);

    setTimeout(() => {
      clearInterval(interval);
      const drawn = Math.floor(Math.random() * 100) + 1;
      setNextNumber(drawn);
      setIsRevealing(false);

      let isWin = false;
      let multiplier = 1;

      if (selectedChoice === 'higher') {
        isWin = drawn > baseNumber;
        multiplier = higherMultiplier;
      } else if (selectedChoice === 'lower') {
        isWin = drawn < baseNumber;
        multiplier = lowerMultiplier;
      } else if (selectedChoice === 'equal') {
        isWin = drawn === baseNumber;
        multiplier = equalMultiplier;
      }

      const payout = isWin ? Math.round(betAmount * multiplier) : 0;

      if (isWin) {
        setStreak((prev) => prev + 1);
      } else {
        setStreak(0);
      }

      recordGameResult({
        gameId: 'number-prediction',
        gameTitle: 'Number Prediction',
        betAmount,
        choice: `${selectedChoice.toUpperCase()} (Base: ${baseNumber})`,
        outcome: `Drawn: ${drawn}`,
        payout,
        netProfit: payout - betAmount,
        isWin,
      });

      setModalState({
        isOpen: true,
        isWin,
        payout,
        multiplier,
        message: `Drawn number is ${drawn} (Base was ${baseNumber}). ${
          isWin ? 'Prediction confirmed!' : 'Missed this round.'
        }`,
      });

      // Advance base number for next round to the drawn number!
      setBaseNumber(drawn);
    }, 1200);
  };

  return (
    <div className="w-full max-w-4xl mx-auto rounded-3xl bg-white border border-slate-200 shadow-xl overflow-hidden text-slate-800">
      <GameModalHeader gameId="number-prediction" />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Streak Counter Header */}
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>High or Low Ladder</span>
          <span className="font-semibold text-purple-400">
            {streak > 0 ? `🔥 ${streak} Win Streak` : 'Scale 1 to 100'}
          </span>
        </div>

        {/* Dual Number Display Arena */}
        <div className="relative py-8 px-4 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border border-purple-500/30 flex flex-col items-center justify-center">
          <div className="flex items-center justify-center gap-6 sm:gap-12 w-full max-w-md">
            {/* Base Current Number */}
            <div className="flex flex-col items-center">
              <span className="text-xs uppercase tracking-wider font-extrabold text-slate-400 mb-2">
                Current Number
              </span>
              <div className="w-28 h-36 sm:w-36 sm:h-44 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-purple-500/50 shadow-[0_0_25px_rgba(168,85,247,0.3)] flex flex-col items-center justify-center p-3">
                <span className="text-4xl sm:text-5xl font-black font-display text-white tabular-nums">
                  {baseNumber}
                </span>
                <span className="text-[10px] text-purple-300 font-bold uppercase tracking-wider mt-2">
                  1 – 100
                </span>
              </div>
            </div>

            {/* Prediction Indicator */}
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-purple-400 font-black">
                VS
              </div>
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 mt-2 block">
                {selectedChoice.toUpperCase()}
              </span>
            </div>

            {/* Next Mystery Number */}
            <div className="flex flex-col items-center">
              <span className="text-xs uppercase tracking-wider font-extrabold text-cyan-400 mb-2">
                Next Number
              </span>
              <div className={`w-28 h-36 sm:w-36 sm:h-44 rounded-2xl border-2 flex flex-col items-center justify-center p-3 transition-all ${
                isRevealing
                  ? 'bg-slate-900 border-cyan-500/50 animate-pulse'
                  : nextNumber !== null
                  ? 'bg-gradient-to-br from-cyan-950 to-slate-900 border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.4)]'
                  : 'bg-slate-900/60 border-slate-800 border-dashed'
              }`}>
                {isRevealing ? (
                  <Sparkles className="w-8 h-8 text-cyan-400 animate-spin" />
                ) : nextNumber !== null ? (
                  <span className="text-4xl sm:text-5xl font-black font-display text-cyan-300 tabular-nums">
                    {nextNumber}
                  </span>
                ) : (
                  <span className="text-4xl sm:text-5xl font-black font-display text-slate-600">
                    ?
                  </span>
                )}
                <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider mt-2">
                  Target
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Multiplier Prediction Cards */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Predict Next Number vs {baseNumber}
          </label>
          <div className="grid grid-cols-3 gap-3">
            {/* Higher */}
            <button
              type="button"
              disabled={isRevealing}
              onClick={() => {
                playSound('click');
                setSelectedChoice('higher');
              }}
              className={`p-4 rounded-2xl border text-center transition-all ${
                selectedChoice === 'higher'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)] scale-102'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-emerald-500/50'
              }`}
            >
              <div className="flex items-center justify-center gap-1.5 text-base font-black">
                <ArrowUp className="w-5 h-5" />
                <span>HIGHER</span>
              </div>
              <div className="text-xs font-bold mt-1 text-emerald-300">
                {higherMultiplier.toFixed(2)}x Multiplier
              </div>
              <div className="text-[10px] opacity-75 mt-0.5">{`> ${baseNumber}`}</div>
            </button>

            {/* Equal (Surprise 12x) */}
            <button
              type="button"
              disabled={isRevealing}
              onClick={() => {
                playSound('click');
                setSelectedChoice('equal');
              }}
              className={`p-4 rounded-2xl border text-center transition-all ${
                selectedChoice === 'equal'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 border-white shadow-[0_0_20px_rgba(245,158,11,0.5)] scale-102 font-black'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-amber-500/50'
              }`}
            >
              <div className="flex items-center justify-center gap-1.5 text-base font-black">
                <Equal className="w-5 h-5" />
                <span>EXACT</span>
              </div>
              <div className="text-xs font-bold mt-1">12.0x Payout</div>
              <div className="text-[10px] opacity-75 mt-0.5">{`= ${baseNumber}`}</div>
            </button>

            {/* Lower */}
            <button
              type="button"
              disabled={isRevealing}
              onClick={() => {
                playSound('click');
                setSelectedChoice('lower');
              }}
              className={`p-4 rounded-2xl border text-center transition-all ${
                selectedChoice === 'lower'
                  ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white border-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.4)] scale-102'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-rose-500/50'
              }`}
            >
              <div className="flex items-center justify-center gap-1.5 text-base font-black">
                <ArrowDown className="w-5 h-5" />
                <span>LOWER</span>
              </div>
              <div className="text-xs font-bold mt-1 text-rose-300">
                {lowerMultiplier.toFixed(2)}x Multiplier
              </div>
              <div className="text-[10px] opacity-75 mt-0.5">{`< ${baseNumber}`}</div>
            </button>
          </div>
        </div>

        {/* Bet Controls */}
        <BetControls betAmount={betAmount} setBetAmount={setBetAmount} disabled={isRevealing} />

        {/* Action Button */}
        <button
          type="button"
          disabled={isRevealing}
          onClick={handlePredict}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-purple-600/30 active:scale-98 transition-all disabled:opacity-50"
        >
          {isRevealing ? (
            <>
              <Sparkles className="w-5 h-5 animate-spin" />
              <span>Drawing Next Number...</span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5 fill-current" />
              <span>Confirm Prediction ({betAmount})</span>
            </>
          )}
        </button>
      </div>

      <WinModal
        isOpen={modalState.isOpen}
        isWin={modalState.isWin}
        payout={modalState.payout}
        betAmount={betAmount}
        multiplier={modalState.multiplier}
        resultMessage={modalState.message}
        onPlayAgain={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
        onClose={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
