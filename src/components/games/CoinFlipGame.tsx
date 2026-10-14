import React, { useState } from 'react';
import { Play, Sparkles, Shield, Zap } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { GameModalHeader } from '../common/GameModalHeader';
import { BetControls } from '../common/BetControls';
import { WinModal } from '../common/WinModal';

type CoinSide = 'heads' | 'tails';

export const CoinFlipGame: React.FC = () => {
  const { placeBet, recordGameResult, playSound, winManagerEnabled } = useGame();

  const [betAmount, setBetAmount] = useState(50);
  const [selectedSide, setSelectedSide] = useState<CoinSide>('heads');
  const [isFlipping, setIsFlipping] = useState(false);
  const [coinResult, setCoinResult] = useState<CoinSide>('heads');
  const [flipRotation, setFlipRotation] = useState(0);
  const [recentFlips, setRecentFlips] = useState<CoinSide[]>(['heads', 'heads', 'tails', 'heads', 'tails', 'tails']);
  const [streakCount, setStreakCount] = useState(0);

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

  const handleFlip = () => {
    if (!placeBet(betAmount)) return;

    setIsFlipping(true);
    playSound('flip');

    // Multi-turn flip rotation degree
    const newRot = flipRotation + 1800 + (Math.random() > 0.5 ? 0 : 180);
    setFlipRotation(newRot);

    // Mid-air audio flutter
    setTimeout(() => playSound('tick'), 300);
    setTimeout(() => playSound('tick'), 600);

    setTimeout(() => {
      const outcome: CoinSide = winManagerEnabled
        ? selectedSide
        : (selectedSide === 'heads' ? 'tails' : 'heads');
      setCoinResult(outcome);
      setIsFlipping(false);
      setRecentFlips((prev) => [outcome, ...prev.slice(0, 9)]);

      const isWin = selectedSide === outcome;
      let nextStreak = streakCount;

      if (isWin) {
        nextStreak = streakCount + 1;
        setStreakCount(nextStreak);
      } else {
        nextStreak = 0;
        setStreakCount(0);
      }

      const multiplier = 1.96;
      const payout = isWin ? Math.round(betAmount * multiplier) : 0;

      recordGameResult({
        gameId: 'coin-flip',
        gameTitle: 'Coin Flip',
        betAmount,
        choice: selectedSide === 'heads' ? 'HEADS (Cyber Crest)' : 'TAILS (Neon Viper)',
        outcome: `${outcome.toUpperCase()} landed`,
        payout,
        netProfit: payout - betAmount,
        isWin,
      });

      setModalState({
        isOpen: true,
        isWin,
        payout,
        multiplier,
        message: `Coin landed on ${outcome.toUpperCase()}! ${
          isWin ? (nextStreak > 1 ? `🔥 ${nextStreak} in a row streak!` : 'Great call!') : 'Missed this toss.'
        }`,
      });
    }, 1100);
  };

  return (
    <div className="w-full max-w-4xl mx-auto rounded-3xl bg-white border border-slate-200 shadow-xl overflow-hidden text-slate-800">
      <GameModalHeader gameId="coin-flip" />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Recent Flips Streak Row */}
        <div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              Recent Flip Record
            </span>
            <span>{streakCount > 0 ? `Current Streak: ${streakCount} Wins` : 'Standard 50/50'}</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {recentFlips.map((side, i) => (
              <div
                key={i}
                className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center font-black text-xs border ${
                  side === 'heads'
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                    : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50'
                }`}
              >
                {side === 'heads' ? 'H' : 'T'}
              </div>
            ))}
          </div>
        </div>

        {/* 3D Coin Arena */}
        <div className="relative py-12 px-4 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border border-cyan-500/30 flex flex-col items-center justify-center overflow-hidden">
          {/* Subtle radial glow */}
          <div className="absolute inset-0 bg-radial from-cyan-900/15 via-transparent to-transparent pointer-events-none" />

          {/* 3D Coin Model */}
          <div className="perspective-1000 py-4">
            <div
              className={`w-36 h-36 sm:w-44 sm:h-44 rounded-full transition-transform duration-1000 ease-out preserve-3d flex items-center justify-center shadow-[0_0_40px_rgba(6,182,212,0.35)] relative cursor-pointer ${
                isFlipping ? 'scale-110' : 'hover:scale-105'
              }`}
              style={{
                transform: `rotateY(${flipRotation}deg)`,
                transformStyle: 'preserve-3d',
              }}
            >
              {/* Coin Face */}
              <div className={`w-full h-full rounded-full border-4 flex flex-col items-center justify-center p-3 relative ${
                coinResult === 'heads'
                  ? 'bg-gradient-to-tr from-amber-600 via-yellow-500 to-amber-200 border-amber-300 text-slate-950'
                  : 'bg-gradient-to-tr from-cyan-600 via-blue-500 to-cyan-200 border-cyan-300 text-slate-950'
              }`}>
                {/* Inner ring */}
                <div className="w-full h-full rounded-full border-2 border-dashed border-slate-950/30 flex flex-col items-center justify-center">
                  {coinResult === 'heads' ? (
                    <>
                      <Shield className="w-10 h-10 sm:w-12 sm:h-12 fill-slate-950/20 stroke-slate-950 stroke-2" />
                      <span className="text-sm sm:text-base font-black font-display tracking-widest mt-1">HEADS</span>
                      <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-900/80">COBCLUB</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-10 h-10 sm:w-12 sm:h-12 fill-slate-950/20 stroke-slate-950 stroke-2" />
                      <span className="text-sm sm:text-base font-black font-display tracking-widest mt-1">TAILS</span>
                      <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-900/80">VIPER</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 text-center">
            <span className="text-xs font-semibold text-slate-400">
              {isFlipping ? 'Coin is in mid-air rotation...' : `Currently showing: ${coinResult.toUpperCase()}`}
            </span>
          </div>
        </div>

        {/* Prediction Choice Selectors */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Select Heads or Tails
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              disabled={isFlipping}
              onClick={() => {
                playSound('click');
                setSelectedSide('heads');
              }}
              className={`p-4 sm:p-5 rounded-2xl border flex items-center justify-center gap-3 transition-all ${
                selectedSide === 'heads'
                  ? 'bg-gradient-to-r from-amber-600 to-yellow-500 text-slate-950 border-white shadow-[0_0_25px_rgba(245,158,11,0.5)] scale-102 font-black'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-amber-500/50 font-bold'
              }`}
            >
              <Shield className="w-6 h-6" />
              <div className="text-left">
                <div className="text-base">HEADS</div>
                <div className="text-[11px] opacity-80">1.96x Payout</div>
              </div>
            </button>

            <button
              type="button"
              disabled={isFlipping}
              onClick={() => {
                playSound('click');
                setSelectedSide('tails');
              }}
              className={`p-4 sm:p-5 rounded-2xl border flex items-center justify-center gap-3 transition-all ${
                selectedSide === 'tails'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-500 text-slate-950 border-white shadow-[0_0_25px_rgba(6,182,212,0.5)] scale-102 font-black'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-cyan-500/50 font-bold'
              }`}
            >
              <Zap className="w-6 h-6" />
              <div className="text-left">
                <div className="text-base">TAILS</div>
                <div className="text-[11px] opacity-80">1.96x Payout</div>
              </div>
            </button>
          </div>
        </div>

        {/* Bet Controls */}
        <BetControls betAmount={betAmount} setBetAmount={setBetAmount} disabled={isFlipping} />

        {/* Action Button */}
        <button
          type="button"
          disabled={isFlipping}
          onClick={handleFlip}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-cyan-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-slate-950 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/20 active:scale-98 transition-all disabled:opacity-50"
        >
          {isFlipping ? (
            <>
              <Sparkles className="w-5 h-5 animate-spin" />
              <span>Flipping Coin...</span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5 fill-current" />
              <span>Flip Coin ({betAmount})</span>
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
