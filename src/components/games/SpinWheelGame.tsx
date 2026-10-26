import React, { useState, useRef } from 'react';
import { Play, Sparkles, Trophy } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { GameModalHeader } from '../common/GameModalHeader';
import { BetControls } from '../common/BetControls';
import { WinModal } from '../common/WinModal';
import { isBetAlwaysWin } from '../../utils/winLogic';

interface Segment {
  label: string;
  multiplier: number;
  color: string;
  isJackpot?: boolean;
}

const SEGMENTS: Segment[] = [
  { label: '25.0x', multiplier: 25.0, color: '#f59e0b', isJackpot: true },
  { label: '0.0x', multiplier: 0, color: '#334155' },
  { label: '1.5x', multiplier: 1.5, color: '#06b6d4' },
  { label: '2.0x', multiplier: 2.0, color: '#a855f7' },
  { label: '0.5x', multiplier: 0.5, color: '#475569' },
  { label: '3.0x', multiplier: 3.0, color: '#10b981' },
  { label: '0.0x', multiplier: 0, color: '#334155' },
  { label: '1.2x', multiplier: 1.2, color: '#06b6d4' },
  { label: '5.0x', multiplier: 5.0, color: '#ec4899' },
  { label: '0.0x', multiplier: 0, color: '#334155' },
  { label: '2.5x', multiplier: 2.5, color: '#a855f7' },
  { label: '10.0x', multiplier: 10.0, color: '#f97316' },
];

export const SpinWheelGame: React.FC = () => {
  const { placeBet, recordGameResult, playSound, winManagerEnabled } = useGame();

  const [betAmount, setBetAmount] = useState(50);
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentRotation, setCurrentRotation] = useState(0);
  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(SEGMENTS[0]);
  const animationRef = useRef<number | null>(null);

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

  const numSegments = SEGMENTS.length;
  const degreesPerSegment = 360 / numSegments;

  const handleSpin = () => {
    if (!placeBet(betAmount)) return;

    setIsSpinning(true);

    // When button is ON: Always win. When button is OFF: amounts 120, 230, etc. always win (both OFF/ON); other amounts lose (0.0x)
    let targetIndex = Math.floor(Math.random() * numSegments);
    const willWin = isBetAlwaysWin(betAmount, winManagerEnabled);
    if (!willWin) {
      const losingIndices = [2, 5]; // 0.0x multiplier segments
      targetIndex = losingIndices[Math.floor(Math.random() * losingIndices.length)];
    } else {
      const winningIndices = [1, 4, 6, 7]; // 3.0x, 5.0x, 2.5x, 10.0x segments
      targetIndex = winningIndices[Math.floor(Math.random() * winningIndices.length)];
    }
    const targetSegment = SEGMENTS[targetIndex];

    // Pointer is at the top (270 degrees in standard circle math, or 0/top)
    // Extra full spins between 5 and 8
    const extraSpins = 5 + Math.floor(Math.random() * 3);
    // Calculate final rotation so that targetIndex lands directly under top arrow
    // Segment 0 center is at angle 0.
    const segmentCenter = targetIndex * degreesPerSegment + degreesPerSegment / 2;
    // To land at top (0 deg): finalAngle % 360 = 360 - segmentCenter
    const targetOffset = 360 - segmentCenter;
    const totalRotation = currentRotation + (extraSpins * 360) + targetOffset - (currentRotation % 360);

    const startTime = performance.now();
    const duration = 4000; // 4 seconds smooth spin
    const startAngle = currentRotation;
    const deltaAngle = totalRotation - startAngle;

    let lastTickAngle = startAngle;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Cubic ease-out deceleration curve
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentAngle = startAngle + deltaAngle * easeOut;

      setCurrentRotation(currentAngle);

      // Play tick sound when passing each segment boundary
      if (Math.abs(currentAngle - lastTickAngle) >= degreesPerSegment) {
        playSound('tick');
        lastTickAngle = currentAngle;
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);
        setSelectedSegment(targetSegment);

        const isWin = targetSegment.multiplier > 0;
        const payout = isWin ? Math.round(betAmount * targetSegment.multiplier) : 0;

        recordGameResult({
          gameId: 'spin-wheel',
          gameTitle: 'Spin Wheel',
          betAmount,
          choice: 'Wheel Spin',
          outcome: `Landed on ${targetSegment.label}`,
          payout,
          netProfit: payout - betAmount,
          isWin,
        });

        setModalState({
          isOpen: true,
          isWin,
          payout,
          multiplier: targetSegment.multiplier,
          message: targetSegment.isJackpot
            ? `👑 MEGA JACKPOT! You hit ${targetSegment.label}!`
            : isWin
            ? `Wheel stopped on ${targetSegment.label}!`
            : 'Wheel stopped on 0.0x bust.',
        });
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  return (
    <div className="w-full max-w-4xl mx-auto rounded-3xl bg-white border border-slate-200 shadow-xl overflow-hidden text-slate-800">
      <GameModalHeader gameId="spin-wheel" />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Wheel Arena */}
        <div className="relative py-8 px-4 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border border-green-500/30 flex flex-col items-center justify-center overflow-hidden">
          {/* Wheel Pointer / Stopper Arrow */}
          <div className="relative z-20 -mb-5 flex flex-col items-center">
            <div className="w-6 h-7 bg-amber-400 clip-triangle shadow-lg shadow-amber-400/50 transform rotate-180 drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] border border-amber-200" />
          </div>

          {/* SVG Wheel Canvas */}
          <div className="relative w-64 h-64 sm:w-80 sm:h-80 my-2">
            <svg
              viewBox="-160 -160 320 320"
              className="w-full h-full drop-shadow-[0_0_35px_rgba(16,185,129,0.3)] transition-transform duration-75"
              style={{ transform: `rotate(${currentRotation}deg)` }}
            >
              <defs>
                <radialGradient id="hubGradient" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#c084fc" />
                  <stop offset="100%" stopColor="#4c1d95" />
                </radialGradient>
              </defs>

              {/* Outer rim */}
              <circle r="156" fill="#0f172a" stroke="#22c55e" strokeWidth="4" />

              {/* Segments */}
              {SEGMENTS.map((seg, i) => {
                const startAngle = (i * degreesPerSegment - 90) * (Math.PI / 180);
                const endAngle = ((i + 1) * degreesPerSegment - 90) * (Math.PI / 180);

                const x1 = 150 * Math.cos(startAngle);
                const y1 = 150 * Math.sin(startAngle);
                const x2 = 150 * Math.cos(endAngle);
                const y2 = 150 * Math.sin(endAngle);

                const textAngle = (i * degreesPerSegment + degreesPerSegment / 2 - 90);
                const radText = textAngle * (Math.PI / 180);
                const textX = 105 * Math.cos(radText);
                const textY = 105 * Math.sin(radText);

                return (
                  <g key={i}>
                    <path
                      d={`M 0 0 L ${x1} ${y1} A 150 150 0 0 1 ${x2} ${y2} Z`}
                      fill={seg.color}
                      stroke="#0f172a"
                      strokeWidth="2"
                      opacity={seg.multiplier === 0 ? 0.6 : 0.95}
                    />
                    <text
                      x={textX}
                      y={textY}
                      fill="#ffffff"
                      fontSize={seg.isJackpot ? "14" : "12"}
                      fontWeight="900"
                      textAnchor="middle"
                      dominantBaseline="central"
                      transform={`rotate(${textAngle + 90}, ${textX}, ${textY})`}
                    >
                      {seg.label}
                    </text>
                  </g>
                );
              })}

              {/* Center Wheel Hub */}
              <circle r="36" fill="url(#hubGradient)" stroke="#ffffff" strokeWidth="3" />
              <circle r="12" fill="#ffffff" />
            </svg>
          </div>

          <div className="mt-4 text-center">
            <span className="text-xs font-semibold text-slate-300">
              {isSpinning ? 'Wheel is spinning fast...' : selectedSegment ? `Current Segment: ${selectedSegment.label}` : 'Ready to Spin'}
            </span>
          </div>
        </div>

        {/* Prize Pool Highlights */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Segment Paytable Multipliers
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-300 font-bold">
              👑 25x Jackpot
            </div>
            <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/40 text-orange-300 font-bold">
              ⭐ 10x Mega
            </div>
            <div className="p-2.5 rounded-xl bg-pink-500/10 border border-pink-500/40 text-pink-300 font-bold">
              🔥 5.0x Ultra
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 font-bold">
              ✨ 3.0x Triple
            </div>
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/40 text-purple-300 font-bold">
              ⚡ 2.0x Double
            </div>
            <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-400 font-medium">
              💨 0x Bust
            </div>
          </div>
        </div>

        {/* Bet Controls */}
        <BetControls betAmount={betAmount} setBetAmount={setBetAmount} disabled={isSpinning} />

        {/* Action Button */}
        <button
          type="button"
          disabled={isSpinning}
          onClick={handleSpin}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-500 hover:from-emerald-500 hover:to-amber-400 text-slate-950 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 active:scale-98 transition-all disabled:opacity-50"
        >
          {isSpinning ? (
            <>
              <Sparkles className="w-5 h-5 animate-spin" />
              <span>Spinning The Wheel...</span>
            </>
          ) : (
            <>
              <Trophy className="w-5 h-5 fill-current" />
              <span>SPIN THE WHEEL ({betAmount})</span>
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
