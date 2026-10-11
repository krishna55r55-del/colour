import React, { useState } from 'react';
import { Dices, Play } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { GameModalHeader } from '../common/GameModalHeader';
import { BetControls } from '../common/BetControls';
import { WinModal } from '../common/WinModal';

type DiceMode = 'one' | 'two';
type TwoDiceChoice = 'under7' | 'exact7' | 'over7' | 'doubles';
type OneDiceChoice = 'under4' | 'over3' | 'even' | 'odd';

export const DiceRollGame: React.FC = () => {
  const { placeBet, recordGameResult, playSound } = useGame();

  const [mode, setMode] = useState<DiceMode>('two');
  const [betAmount, setBetAmount] = useState(50);
  const [twoChoice, setTwoChoice] = useState<TwoDiceChoice>('under7');
  const [oneChoice, setOneChoice] = useState<OneDiceChoice>('under4');
  const [isRolling, setIsRolling] = useState(false);
  const [die1, setDie1] = useState(3);
  const [die2, setDie2] = useState(4);
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

  // Render dice pip faces with neon glow styling
  const renderDieFace = (val: number) => {
    // 3x3 pip coordinates
    const pips: Record<number, number[]> = {
      1: [4],
      2: [0, 8],
      3: [0, 4, 8],
      4: [0, 2, 6, 8],
      5: [0, 2, 4, 6, 8],
      6: [0, 2, 3, 5, 6, 8],
    };

    const activePips = pips[val] || [4];

    return (
      <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-cyan-500/50 shadow-[0_0_25px_rgba(6,182,212,0.35)] p-3 grid grid-cols-3 grid-rows-3 gap-1.5 transition-all duration-300 ${
        isRolling ? 'animate-bounce rotate-12 scale-95' : 'hover:scale-105'
      }`}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((index) => (
          <div key={index} className="flex items-center justify-center">
            {activePips.includes(index) && (
              <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.9)]" />
            )}
          </div>
        ))}
      </div>
    );
  };

  const handleRoll = () => {
    if (!placeBet(betAmount)) return;

    setIsRolling(true);

    // Tumbling sound and rapid changes
    let rolls = 0;
    const interval = setInterval(() => {
      playSound('tick');
      setDie1(Math.floor(Math.random() * 6) + 1);
      setDie2(Math.floor(Math.random() * 6) + 1);
      rolls++;
      if (rolls > 12) clearInterval(interval);
    }, 90);

    setTimeout(() => {
      clearInterval(interval);
      const final1 = Math.floor(Math.random() * 6) + 1;
      const final2 = Math.floor(Math.random() * 6) + 1;
      setDie1(final1);
      setDie2(final2);
      setIsRolling(false);

      let isWin = false;
      let multiplier = 0;
      let choiceText = '';
      let outcomeText = '';

      if (mode === 'two') {
        const sum = final1 + final2;
        outcomeText = `Rolled ${final1} + ${final2} = ${sum}`;

        if (twoChoice === 'under7') {
          choiceText = 'Under 7 (2–6)';
          isWin = sum < 7;
          multiplier = 2.3;
        } else if (twoChoice === 'exact7') {
          choiceText = 'Lucky 7';
          isWin = sum === 7;
          multiplier = 5.8;
        } else if (twoChoice === 'over7') {
          choiceText = 'Over 7 (8–12)';
          isWin = sum > 7;
          multiplier = 2.3;
        } else if (twoChoice === 'doubles') {
          choiceText = 'Doubles Pair';
          isWin = final1 === final2;
          multiplier = 5.5;
        }
      } else {
        outcomeText = `Rolled ${final1}`;
        if (oneChoice === 'under4') {
          choiceText = 'Low (1, 2, 3)';
          isWin = final1 <= 3;
          multiplier = 1.95;
        } else if (oneChoice === 'over3') {
          choiceText = 'High (4, 5, 6)';
          isWin = final1 >= 4;
          multiplier = 1.95;
        } else if (oneChoice === 'even') {
          choiceText = 'Even (2, 4, 6)';
          isWin = final1 % 2 === 0;
          multiplier = 1.95;
        } else if (oneChoice === 'odd') {
          choiceText = 'Odd (1, 3, 5)';
          isWin = final1 % 2 !== 0;
          multiplier = 1.95;
        }
      }

      const payout = isWin ? Math.round(betAmount * multiplier) : 0;

      recordGameResult({
        gameId: 'dice-roll',
        gameTitle: 'Dice Roll',
        betAmount,
        choice: choiceText,
        outcome: outcomeText,
        payout,
        netProfit: payout - betAmount,
        isWin,
      });

      setModalState({
        isOpen: true,
        isWin,
        payout,
        multiplier,
        message: `${outcomeText}. ${isWin ? 'Prediction was correct!' : 'Missed this time.'}`,
      });
    }, 1200);
  };

  const currentSum = die1 + die2;

  return (
    <div className="w-full max-w-4xl mx-auto rounded-3xl bg-white border border-slate-200 shadow-xl overflow-hidden text-slate-800">
      <GameModalHeader gameId="dice-roll" />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Mode Selector */}
        <div className="flex justify-center">
          <div className="p-1 rounded-2xl bg-slate-900 border border-slate-800 inline-flex">
            <button
              type="button"
              disabled={isRolling}
              onClick={() => {
                playSound('click');
                setMode('two');
              }}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                mode === 'two'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              2 Dice (Casino Sum)
            </button>
            <button
              type="button"
              disabled={isRolling}
              onClick={() => {
                playSound('click');
                setMode('one');
              }}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                mode === 'one'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              1 Die (Classic)
            </button>
          </div>
        </div>

        {/* Dice Arena */}
        <div className="relative py-10 px-4 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border border-cyan-500/30 flex flex-col items-center justify-center">
          <div className="flex items-center justify-center gap-6 sm:gap-10">
            {renderDieFace(die1)}
            {mode === 'two' && renderDieFace(die2)}
          </div>

          <div className="mt-6 text-center">
            <div className="text-2xl sm:text-3xl font-black font-display text-white tabular-nums">
              {isRolling ? 'Tumbling...' : mode === 'two' ? `Sum: ${currentSum}` : `Die: ${die1}`}
            </div>
            <div className="text-xs text-cyan-400 font-semibold mt-1">
              {mode === 'two' ? (currentSum === 7 ? '★ Lucky Seven ★' : currentSum < 7 ? 'Under 7' : 'Over 7') : (die1 % 2 === 0 ? 'Even' : 'Odd')}
            </div>
          </div>
        </div>

        {/* Prediction Options */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Choose Your Prediction
          </label>

          {mode === 'two' ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                type="button"
                disabled={isRolling}
                onClick={() => {
                  playSound('click');
                  setTwoChoice('under7');
                }}
                className={`p-4 rounded-2xl border text-center transition-all ${
                  twoChoice === 'under7'
                    ? 'bg-cyan-600 text-white border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)] scale-102'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-cyan-500/50'
                }`}
              >
                <div className="text-sm font-black">UNDER 7</div>
                <div className="text-[11px] opacity-90 mt-1">Sum 2–6 · 2.3x</div>
              </button>

              <button
                type="button"
                disabled={isRolling}
                onClick={() => {
                  playSound('click');
                  setTwoChoice('exact7');
                }}
                className={`p-4 rounded-2xl border text-center transition-all ${
                  twoChoice === 'exact7'
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 border-white shadow-[0_0_20px_rgba(245,158,11,0.5)] scale-102'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-amber-500/50'
                }`}
              >
                <div className="text-sm font-black">LUCKY 7</div>
                <div className="text-[11px] font-semibold mt-1">Exact 7 · 5.8x</div>
              </button>

              <button
                type="button"
                disabled={isRolling}
                onClick={() => {
                  playSound('click');
                  setTwoChoice('over7');
                }}
                className={`p-4 rounded-2xl border text-center transition-all ${
                  twoChoice === 'over7'
                    ? 'bg-cyan-600 text-white border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)] scale-102'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-cyan-500/50'
                }`}
              >
                <div className="text-sm font-black">OVER 7</div>
                <div className="text-[11px] opacity-90 mt-1">Sum 8–12 · 2.3x</div>
              </button>

              <button
                type="button"
                disabled={isRolling}
                onClick={() => {
                  playSound('click');
                  setTwoChoice('doubles');
                }}
                className={`p-4 rounded-2xl border text-center transition-all ${
                  twoChoice === 'doubles'
                    ? 'bg-purple-600 text-white border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.4)] scale-102'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-purple-500/50'
                }`}
              >
                <div className="text-sm font-black">DOUBLES</div>
                <div className="text-[11px] opacity-90 mt-1">Pairs (e.g. 3-3) · 5.5x</div>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                type="button"
                disabled={isRolling}
                onClick={() => {
                  playSound('click');
                  setOneChoice('under4');
                }}
                className={`p-4 rounded-2xl border text-center transition-all ${
                  oneChoice === 'under4'
                    ? 'bg-cyan-600 text-white border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)] scale-102'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-cyan-500/50'
                }`}
              >
                <div className="text-sm font-black">LOW (1–3)</div>
                <div className="text-[11px] opacity-90 mt-1">1.95x Payout</div>
              </button>

              <button
                type="button"
                disabled={isRolling}
                onClick={() => {
                  playSound('click');
                  setOneChoice('over3');
                }}
                className={`p-4 rounded-2xl border text-center transition-all ${
                  oneChoice === 'over3'
                    ? 'bg-cyan-600 text-white border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)] scale-102'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-cyan-500/50'
                }`}
              >
                <div className="text-sm font-black">HIGH (4–6)</div>
                <div className="text-[11px] opacity-90 mt-1">1.95x Payout</div>
              </button>

              <button
                type="button"
                disabled={isRolling}
                onClick={() => {
                  playSound('click');
                  setOneChoice('even');
                }}
                className={`p-4 rounded-2xl border text-center transition-all ${
                  oneChoice === 'even'
                    ? 'bg-purple-600 text-white border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.4)] scale-102'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-purple-500/50'
                }`}
              >
                <div className="text-sm font-black">EVEN (2, 4, 6)</div>
                <div className="text-[11px] opacity-90 mt-1">1.95x Payout</div>
              </button>

              <button
                type="button"
                disabled={isRolling}
                onClick={() => {
                  playSound('click');
                  setOneChoice('odd');
                }}
                className={`p-4 rounded-2xl border text-center transition-all ${
                  oneChoice === 'odd'
                    ? 'bg-purple-600 text-white border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.4)] scale-102'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-purple-500/50'
                }`}
              >
                <div className="text-sm font-black">ODD (1, 3, 5)</div>
                <div className="text-[11px] opacity-90 mt-1">1.95x Payout</div>
              </button>
            </div>
          )}
        </div>

        {/* Bet Controls */}
        <BetControls betAmount={betAmount} setBetAmount={setBetAmount} disabled={isRolling} />

        {/* Action Button */}
        <button
          type="button"
          disabled={isRolling}
          onClick={handleRoll}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-cyan-600/30 active:scale-98 transition-all disabled:opacity-50"
        >
          {isRolling ? (
            <>
              <Dices className="w-5 h-5 animate-spin" />
              <span>Rolling Dice...</span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5 fill-current" />
              <span>Roll Dice ({betAmount})</span>
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
