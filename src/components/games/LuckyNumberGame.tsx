import React, { useState } from 'react';
import { Play, Sparkles } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { GameModalHeader } from '../common/GameModalHeader';
import { BetControls } from '../common/BetControls';
import { WinModal } from '../common/WinModal';

type BetType = 'single' | 'odd_even' | 'range';

export const LuckyNumberGame: React.FC = () => {
  const { placeBet, recordGameResult, playSound } = useGame();

  const [betAmount, setBetAmount] = useState(50);
  const [betType, setBetType] = useState<BetType>('single');
  const [selectedDigit, setSelectedDigit] = useState<number>(7);
  const [selectedOddEven, setSelectedOddEven] = useState<'odd' | 'even'>('odd');
  const [selectedRange, setSelectedRange] = useState<'low' | 'high'>('high'); // low: 0-4, high: 5-9
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnNumber, setDrawnNumber] = useState<number | null>(7);
  const [recentDrawn, setRecentDrawn] = useState<number[]>([7, 3, 9, 2, 8, 4, 1]);

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

  const handleDraw = () => {
    if (!placeBet(betAmount)) return;

    setIsDrawing(true);
    setDrawnNumber(null);

    let ticks = 0;
    const interval = setInterval(() => {
      playSound('tick');
      setDrawnNumber(Math.floor(Math.random() * 10));
      ticks++;
      if (ticks > 14) clearInterval(interval);
    }, 85);

    setTimeout(() => {
      clearInterval(interval);
      const finalNumber = Math.floor(Math.random() * 10);
      setDrawnNumber(finalNumber);
      setRecentDrawn((prev) => [finalNumber, ...prev.slice(0, 9)]);
      setIsDrawing(false);

      let isWin = false;
      let multiplier = 0;
      let choiceStr = '';

      if (betType === 'single') {
        choiceStr = `Single Digit: ${selectedDigit}`;
        isWin = finalNumber === selectedDigit;
        multiplier = 9.0;
      } else if (betType === 'odd_even') {
        choiceStr = selectedOddEven.toUpperCase();
        const isOdd = finalNumber % 2 !== 0;
        isWin = (selectedOddEven === 'odd' && isOdd) || (selectedOddEven === 'even' && !isOdd);
        multiplier = 1.95;
      } else if (betType === 'range') {
        choiceStr = selectedRange === 'low' ? 'Low (0–4)' : 'High (5–9)';
        isWin = (selectedRange === 'low' && finalNumber <= 4) || (selectedRange === 'high' && finalNumber >= 5);
        multiplier = 1.95;
      }

      const payout = isWin ? Math.round(betAmount * multiplier) : 0;

      recordGameResult({
        gameId: 'lucky-number',
        gameTitle: 'Lucky Number',
        betAmount,
        choice: choiceStr,
        outcome: `Lotto Sphere: #${finalNumber}`,
        payout,
        netProfit: payout - betAmount,
        isWin,
      });

      setModalState({
        isOpen: true,
        isWin,
        payout,
        multiplier,
        message: `Lotto machine ejected #${finalNumber}! ${isWin ? 'Congratulations!' : 'Try another lucky digit.'}`,
      });
    }, 1300);
  };

  return (
    <div className="w-full max-w-4xl mx-auto rounded-3xl bg-white border border-slate-200 shadow-xl overflow-hidden text-slate-800">
      <GameModalHeader gameId="lucky-number" />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Recent Balls Drawn */}
        <div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold">Recent Winning Numbers</span>
            <span>0 to 9 Machine</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {recentDrawn.map((num, i) => (
              <div
                key={i}
                className="w-8 h-8 shrink-0 rounded-full bg-slate-900 border border-amber-500/40 text-amber-400 flex items-center justify-center font-black text-xs shadow-xs"
              >
                {num}
              </div>
            ))}
          </div>
        </div>

        {/* Lottery Cage Center Stage */}
        <div className="relative py-10 px-4 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border border-emerald-500/30 flex flex-col items-center justify-center">
          <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full border-4 border-emerald-500/40 bg-slate-950/80 p-3 flex items-center justify-center shadow-[0_0_35px_rgba(16,185,129,0.25)]">
            {/* Spinning cage rings */}
            <div className={`absolute inset-2 rounded-full border-2 border-dashed border-emerald-400/30 ${
              isDrawing ? 'animate-spin' : ''
            }`} />

            {/* Chute Golden Ball */}
            <div className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-200 text-slate-950 flex flex-col items-center justify-center font-black shadow-xl shadow-amber-500/40 transition-all ${
              isDrawing ? 'scale-90 animate-bounce' : 'scale-100'
            }`}>
              {isDrawing ? (
                <Sparkles className="w-8 h-8 animate-spin text-slate-900" />
              ) : (
                <>
                  <span className="text-3xl sm:text-4xl font-display font-black leading-none">
                    {drawnNumber !== null ? drawnNumber : '?'}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider font-extrabold mt-1">
                    LOTTO
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="mt-4 text-center">
            <span className="text-xs font-semibold text-slate-400">
              {isDrawing ? 'Spinning Quantum Lotto Cage...' : 'Select your bet mode and pick your numbers'}
            </span>
          </div>
        </div>

        {/* Bet Type Tabs */}
        <div className="space-y-4">
          <div className="flex rounded-2xl bg-slate-900 p-1 border border-slate-800">
            <button
              type="button"
              disabled={isDrawing}
              onClick={() => {
                playSound('click');
                setBetType('single');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                betType === 'single'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Exact Digit (9.0x)
            </button>
            <button
              type="button"
              disabled={isDrawing}
              onClick={() => {
                playSound('click');
                setBetType('odd_even');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                betType === 'odd_even'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Odd / Even (1.95x)
            </button>
            <button
              type="button"
              disabled={isDrawing}
              onClick={() => {
                playSound('click');
                setBetType('range');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                betType === 'range'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Range (1.95x)
            </button>
          </div>

          {/* Type-specific controls */}
          {betType === 'single' && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Choose Lucky Digit (0–9)
              </label>
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    disabled={isDrawing}
                    onClick={() => {
                      playSound('click');
                      setSelectedDigit(digit);
                    }}
                    className={`h-12 rounded-2xl font-black text-base transition-all border ${
                      selectedDigit === digit
                        ? 'bg-emerald-500 text-slate-950 border-white shadow-[0_0_15px_rgba(16,185,129,0.5)] scale-105'
                        : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-emerald-500/50'
                    }`}
                  >
                    {digit}
                  </button>
                ))}
              </div>
            </div>
          )}

          {betType === 'odd_even' && (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={isDrawing}
                onClick={() => {
                  playSound('click');
                  setSelectedOddEven('odd');
                }}
                className={`p-4 rounded-2xl border text-center transition-all ${
                  selectedOddEven === 'odd'
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)] scale-102'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-emerald-500/50'
                }`}
              >
                <div className="text-base font-black">ODD NUMBERS</div>
                <div className="text-xs opacity-90 mt-0.5">1, 3, 5, 7, 9 · 1.95x Payout</div>
              </button>

              <button
                type="button"
                disabled={isDrawing}
                onClick={() => {
                  playSound('click');
                  setSelectedOddEven('even');
                }}
                className={`p-4 rounded-2xl border text-center transition-all ${
                  selectedOddEven === 'even'
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)] scale-102'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-emerald-500/50'
                }`}
              >
                <div className="text-base font-black">EVEN NUMBERS</div>
                <div className="text-xs opacity-90 mt-0.5">0, 2, 4, 6, 8 · 1.95x Payout</div>
              </button>
            </div>
          )}

          {betType === 'range' && (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={isDrawing}
                onClick={() => {
                  playSound('click');
                  setSelectedRange('low');
                }}
                className={`p-4 rounded-2xl border text-center transition-all ${
                  selectedRange === 'low'
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)] scale-102'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-emerald-500/50'
                }`}
              >
                <div className="text-base font-black">LOW (0–4)</div>
                <div className="text-xs opacity-90 mt-0.5">1.95x Payout</div>
              </button>

              <button
                type="button"
                disabled={isDrawing}
                onClick={() => {
                  playSound('click');
                  setSelectedRange('high');
                }}
                className={`p-4 rounded-2xl border text-center transition-all ${
                  selectedRange === 'high'
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)] scale-102'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-emerald-500/50'
                }`}
              >
                <div className="text-base font-black">HIGH (5–9)</div>
                <div className="text-xs opacity-90 mt-0.5">1.95x Payout</div>
              </button>
            </div>
          )}
        </div>

        {/* Bet Controls */}
        <BetControls betAmount={betAmount} setBetAmount={setBetAmount} disabled={isDrawing} />

        {/* Action Button */}
        <button
          type="button"
          disabled={isDrawing}
          onClick={handleDraw}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-500 hover:from-emerald-500 hover:to-cyan-400 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/30 active:scale-98 transition-all disabled:opacity-50"
        >
          {isDrawing ? (
            <>
              <Sparkles className="w-5 h-5 animate-spin" />
              <span>Drawing Lotto Ball...</span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5 fill-current" />
              <span>Draw Lucky Ball ({betAmount})</span>
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
