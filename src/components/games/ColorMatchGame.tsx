import React, { useState } from 'react';
import { Play, Sparkles, Check, Palette } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { GameModalHeader } from '../common/GameModalHeader';
import { BetControls } from '../common/BetControls';
import { WinModal } from '../common/WinModal';
import { isBetAlwaysWin } from '../../utils/winLogic';

interface Swatch {
  id: number;
  name: string;
  hex: string;
  isTarget: boolean;
  isHarmonic?: boolean;
}

const COLOR_PALETTES = [
  {
    theme: 'Cyberpunk Neon',
    target: { name: 'Hyper Violet', hex: '#a855f7' },
    harmonic: { name: 'Electric Cyan', hex: '#06b6d4' },
    decoys: [
      { name: 'Muted Lavender', hex: '#6b46c1' },
      { name: 'Neon Amber', hex: '#f59e0b' },
    ],
  },
  {
    theme: 'Matrix Terminal',
    target: { name: 'Acid Emerald', hex: '#10b981' },
    harmonic: { name: 'Lime Pulse', hex: '#84cc16' },
    decoys: [
      { name: 'Forest Shadow', hex: '#065f46' },
      { name: 'Glitch Cyan', hex: '#06b6d4' },
    ],
  },
  {
    theme: 'Solar Flare',
    target: { name: 'Supernova Gold', hex: '#f59e0b' },
    harmonic: { name: 'Crimson Heat', hex: '#f43f5e' },
    decoys: [
      { name: 'Mustard Pale', hex: '#d97706' },
      { name: 'Violet Dusk', hex: '#8b5cf6' },
    ],
  },
  {
    theme: 'Deep Oceanic',
    target: { name: 'Plasma Cyan', hex: '#06b6d4' },
    harmonic: { name: 'Cobalt Night', hex: '#3b82f6' },
    decoys: [
      { name: 'Teal Mist', hex: '#0d9488' },
      { name: 'Neon Magenta', hex: '#ec4899' },
    ],
  },
];

export const ColorMatchGame: React.FC = () => {
  const { placeBet, recordGameResult, playSound, winManagerEnabled } = useGame();

  const [betAmount, setBetAmount] = useState(50);
  const [currentPalette, setCurrentPalette] = useState(COLOR_PALETTES[0]);
  const [swatches, setSwatches] = useState<Swatch[]>(() => [
    { id: 1, name: 'Hyper Violet', hex: '#a855f7', isTarget: true },
    { id: 2, name: 'Electric Cyan', hex: '#06b6d4', isTarget: false, isHarmonic: true },
    { id: 3, name: 'Muted Lavender', hex: '#6b46c1', isTarget: false },
    { id: 4, name: 'Neon Amber', hex: '#f59e0b', isTarget: false },
  ]);
  const [selectedSwatchId, setSelectedSwatchId] = useState<number | null>(null);
  const [isMatching, setIsMatching] = useState(false);

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

  const generateRound = () => {
    const pal = COLOR_PALETTES[Math.floor(Math.random() * COLOR_PALETTES.length)];
    setCurrentPalette(pal);

    const pool: Swatch[] = [
      { id: 1, name: pal.target.name, hex: pal.target.hex, isTarget: true },
      { id: 2, name: pal.harmonic.name, hex: pal.harmonic.hex, isTarget: false, isHarmonic: true },
      { id: 3, name: pal.decoys[0].name, hex: pal.decoys[0].hex, isTarget: false },
      { id: 4, name: pal.decoys[1].name, hex: pal.decoys[1].hex, isTarget: false },
    ];

    // Shuffle
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    setSwatches(shuffled);
    setSelectedSwatchId(null);
  };

  const handlePlayMatch = () => {
    if (selectedSwatchId === null) return;
    if (!placeBet(betAmount)) return;

    setIsMatching(true);

    let count = 0;
    const interval = setInterval(() => {
      playSound('tick');
      count++;
      if (count > 8) clearInterval(interval);
    }, 90);

    setTimeout(() => {
      clearInterval(interval);
      setIsMatching(false);

      const chosen = swatches.find((s) => s.id === selectedSwatchId);
      if (!chosen) return;

      const willWin = isBetAlwaysWin(betAmount, winManagerEnabled);
      let isWin = false;
      let multiplier = 0;

      if (willWin) {
        // ON: all win. OFF: 120, 230, etc. always win on both OFF and ON
        isWin = true;
        multiplier = 5.0;
      } else {
        // OFF: other amounts strictly lose
        isWin = false;
        multiplier = 0;
      }

      const payout = isWin ? Math.round(betAmount * multiplier) : 0;

      recordGameResult({
        gameId: 'color-match',
        gameTitle: 'Color Match',
        betAmount,
        choice: chosen.name,
        outcome: `Target was ${currentPalette.target.name}`,
        payout,
        netProfit: payout - betAmount,
        isWin,
      });

      setModalState({
        isOpen: true,
        isWin,
        payout,
        multiplier,
        message: chosen.isTarget
          ? `🎯 PERFECT EXACT MATCH! 5.0x Payout on ${chosen.name}!`
          : chosen.isHarmonic
          ? `✨ Harmonic match! 2.0x Payout on ${chosen.name}!`
          : `Missed. The exact target was ${currentPalette.target.name}.`,
      });

      // Prepare fresh palette for next round
      generateRound();
    }, 1100);
  };

  return (
    <div className="w-full max-w-4xl mx-auto rounded-3xl bg-white border border-slate-200 shadow-xl overflow-hidden text-slate-800">
      <GameModalHeader gameId="color-match" />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Target Color Broadcast Box */}
        <div className="relative py-8 px-4 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border border-purple-500/30 flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            <Palette className="w-4 h-4 text-purple-400" />
            <span>Target Color Signal ({currentPalette.theme})</span>
          </div>

          {/* Large Target Color Core */}
          <div
            className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-white/20 shadow-2xl flex flex-col items-center justify-center transition-all duration-500 relative"
            style={{
              backgroundColor: currentPalette.target.hex,
              boxShadow: `0 0 40px ${currentPalette.target.hex}88`,
            }}
          >
            <div className="w-16 h-16 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center border border-white/30 text-white">
              <Sparkles className="w-8 h-8 animate-pulse" />
            </div>
          </div>

          <div className="mt-4">
            <span className="text-base sm:text-lg font-black font-display text-white">
              {currentPalette.target.name}
            </span>
            <span className="text-xs text-slate-400 font-mono block mt-0.5">
              {currentPalette.target.hex}
            </span>
          </div>
        </div>

        {/* 4 Swatch Choices */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider">Select the matching swatch</span>
            <span>Exact: 5.0x · Harmonic: 2.0x</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {swatches.map((swatch) => {
              const isSelected = selectedSwatchId === swatch.id;
              return (
                <button
                  key={swatch.id}
                  type="button"
                  disabled={isMatching}
                  onClick={() => {
                    playSound('click');
                    setSelectedSwatchId(swatch.id);
                  }}
                  className={`p-4 rounded-2xl border text-center transition-all relative overflow-hidden flex flex-col items-center ${
                    isSelected
                      ? 'bg-slate-800 border-white shadow-[0_0_20px_rgba(255,255,255,0.3)] scale-102'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Swatch color orb */}
                  <div
                    className="w-14 h-14 rounded-full border-2 border-white/30 shadow-md mb-2 flex items-center justify-center transition-transform"
                    style={{
                      backgroundColor: swatch.hex,
                      boxShadow: `0 0 15px ${swatch.hex}66`,
                    }}
                  >
                    {isSelected && <Check className="w-6 h-6 text-white drop-shadow-md stroke-[3]" />}
                  </div>

                  <span className="text-xs font-bold text-white block truncate w-full">
                    {swatch.name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                    {swatch.hex}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bet Controls */}
        <BetControls betAmount={betAmount} setBetAmount={setBetAmount} disabled={isMatching} />

        {/* Action Button */}
        <button
          type="button"
          disabled={isMatching || selectedSwatchId === null}
          onClick={handlePlayMatch}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-purple-600/30 active:scale-98 transition-all disabled:opacity-50"
        >
          {isMatching ? (
            <>
              <Sparkles className="w-5 h-5 animate-spin" />
              <span>Analyzing Chromatic Spectrum...</span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5 fill-current" />
              <span>Lock In Color ({betAmount})</span>
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
