import React, { useState, useEffect } from 'react';
import { Play, Sparkles, Gamepad2, Diamond, Crown, Skull, Rocket, Zap, RotateCcw } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { GameModalHeader } from '../common/GameModalHeader';
import { BetControls } from '../common/BetControls';
import { WinModal } from '../common/WinModal';
import { isBetAlwaysWin } from '../../utils/winLogic';

interface MemoryCard {
  id: number;
  iconName: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const SYMBOLS = [
  { name: 'gamepad', icon: Gamepad2, color: 'text-purple-400' },
  { name: 'diamond', icon: Diamond, color: 'text-cyan-400' },
  { name: 'crown', icon: Crown, color: 'text-amber-400' },
  { name: 'skull', icon: Skull, color: 'text-rose-400' },
  { name: 'rocket', icon: Rocket, color: 'text-emerald-400' },
  { name: 'zap', icon: Zap, color: 'text-yellow-400' },
];

export const MemoryMatchGame: React.FC = () => {
  const { placeBet, recordGameResult, playSound, winManagerEnabled } = useGame();

  const [betAmount, setBetAmount] = useState(50);
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [flipsUsed, setFlipsUsed] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

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

  const initializeDeck = () => {
    // 6 symbols duplicated to 12 cards
    const deck: MemoryCard[] = [];
    SYMBOLS.forEach((sym, idx) => {
      deck.push({ id: idx * 2, iconName: sym.name, isFlipped: false, isMatched: false });
      deck.push({ id: idx * 2 + 1, iconName: sym.name, isFlipped: false, isMatched: false });
    });

    // Shuffle
    const shuffled = deck.sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setFlippedCards([]);
    setMatchedPairs(0);
    setFlipsUsed(0);
  };

  useEffect(() => {
    initializeDeck();
  }, []);

  const handleStartGame = () => {
    if (!placeBet(betAmount)) return;

    initializeDeck();
    setIsPlaying(true);
    playSound('card');
  };

  const handleDefeat = (finalFlips: number) => {
    setIsPlaying(false);
    playSound('loss');

    recordGameResult({
      gameId: 'memory-match',
      gameTitle: 'Memory Match',
      betAmount,
      choice: 'Memory Grid Challenge',
      outcome: `Failed at ${finalFlips} Turns`,
      payout: 0,
      netProfit: -betAmount,
      isWin: false,
    });

    setModalState({
      isOpen: true,
      isWin: false,
      payout: 0,
      multiplier: 0,
      message: '❌ Turn limit exceeded! Better luck next round.',
    });
  };

  const handleCardClick = (cardId: number) => {
    if (!isPlaying) return;
    if (flippedCards.length === 2) return; // Wait for flip resolution

    const cardIndex = cards.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) return;

    const clickedCard = cards[cardIndex];
    if (clickedCard.isFlipped || clickedCard.isMatched) return;

    playSound('card');

    // Flip the clicked card
    const updatedCards = [...cards];
    updatedCards[cardIndex] = { ...clickedCard, isFlipped: true };
    setCards(updatedCards);

    const newFlipped = [...flippedCards, cardId];
    setFlippedCards(newFlipped);

    // If 2 cards flipped, check match
    if (newFlipped.length === 2) {
      const currentFlips = flipsUsed + 1;
      setFlipsUsed(currentFlips);

      const firstCard = cards.find((c) => c.id === newFlipped[0]);
      const secondCard = clickedCard;

      const willWin = isBetAlwaysWin(betAmount, winManagerEnabled);

      // When willWin is false: Always loss
      if (!willWin && currentFlips >= 8) {
        setTimeout(() => {
          handleDefeat(currentFlips);
        }, 600);
        return;
      }

      if (firstCard && firstCard.iconName === secondCard.iconName) {
        // Matched!
        setTimeout(() => {
          playSound('win');
          setCards((prev) =>
            prev.map((c) =>
              c.id === firstCard.id || c.id === secondCard.id
                ? { ...c, isMatched: true, isFlipped: true }
                : c
            )
          );
          setFlippedCards([]);

          const nextMatched = matchedPairs + 1;
          setMatchedPairs(nextMatched);

          // All 6 pairs found:
          if (nextMatched === 6) {
            if (!willWin) {
              handleDefeat(currentFlips);
            } else {
              handleVictory(currentFlips);
            }
          }
        }, 500);
      } else {
        // Not matched: flip back after 850ms
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) =>
              c.id === newFlipped[0] || c.id === newFlipped[1]
                ? { ...c, isFlipped: false }
                : c
            )
          );
          setFlippedCards([]);
        }, 850);
      }
    }
  };

  const handleVictory = (finalFlips: number) => {
    setIsPlaying(false);

    if (!isBetAlwaysWin(betAmount, winManagerEnabled)) {
      handleDefeat(finalFlips);
      return;
    }

    // Multiplier calculation based on efficiency
    let multiplier = 1.2;
    if (finalFlips <= 7) {
      multiplier = 3.5;
    } else if (finalFlips <= 10) {
      multiplier = 2.4;
    } else if (finalFlips <= 13) {
      multiplier = 1.8;
    }

    const payout = Math.round(betAmount * multiplier);

    recordGameResult({
      gameId: 'memory-match',
      gameTitle: 'Memory Match',
      betAmount,
      choice: 'Memory Grid Solved',
      outcome: `Completed in ${finalFlips} Turns`,
      payout,
      netProfit: payout - betAmount,
      isWin: true,
    });

    setModalState({
      isOpen: true,
      isWin: true,
      payout,
      multiplier,
      message: `🎉 All 6 pairs matched in ${finalFlips} turns! Multiplier: ${multiplier.toFixed(1)}x`,
    });
  };

  const renderIcon = (name: string) => {
    const found = SYMBOLS.find((s) => s.name === name);
    if (!found) return null;
    const IconComp = found.icon;
    return <IconComp className={`w-8 h-8 sm:w-10 sm:h-10 ${found.color}`} />;
  };

  return (
    <div className="w-full max-w-4xl mx-auto rounded-3xl bg-white border border-slate-200 shadow-xl overflow-hidden text-slate-800">
      <GameModalHeader gameId="memory-match" />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Game Stats Tracker */}
        <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2">
            <span>Pairs Found:</span>
            <span className="font-bold text-emerald-400 tabular-nums">{matchedPairs} / 6</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Turns:</span>
            <span className="font-bold text-white tabular-nums">{flipsUsed} / 8 Max</span>
          </div>
          <div className="flex items-center gap-1.5 text-purple-400 font-semibold">
            <span>Max Return:</span>
            <span className="tabular-nums">3.5x</span>
          </div>
        </div>

        {/* 12-Card Grid Arena */}
        <div className="relative py-6 px-4 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border border-cyan-500/30 flex flex-col items-center justify-center">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 w-full max-w-xl">
            {cards.map((card) => {
              const isRevealed = card.isFlipped || card.isMatched;

              return (
                <div
                  key={card.id}
                  onClick={() => handleCardClick(card.id)}
                  className={`h-24 sm:h-28 rounded-2xl p-2 flex flex-col items-center justify-center cursor-pointer select-none transition-all duration-300 border-2 ${
                    card.isMatched
                      ? 'bg-emerald-950/60 border-emerald-500/80 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                      : card.isFlipped
                      ? 'bg-slate-800 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)] scale-102'
                      : isPlaying
                      ? 'bg-slate-900/90 border-slate-800 hover:border-cyan-500/60 hover:scale-102'
                      : 'bg-slate-900/60 border-slate-800/80 opacity-60'
                  }`}
                >
                  {isRevealed ? (
                    <div className="flex flex-col items-center justify-center animate-in zoom-in-75 duration-200">
                      {renderIcon(card.iconName)}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-600">
                      <Sparkles className="w-5 h-5 mb-1" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        COB
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 text-center">
            <span className="text-xs font-semibold text-slate-400">
              {isPlaying
                ? 'Flip two cards to match symbols!'
                : 'Click Start Game below to shuffle and play!'}
            </span>
          </div>
        </div>

        {/* Multiplier Tiers */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Skill Payout Multipliers
          </label>
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-300 font-black">
              ⭐ 3.5x (≤7 Flips)
            </div>
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/40 text-purple-300 font-bold">
              ✨ 2.4x (8-10 Flips)
            </div>
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/40 text-cyan-300 font-bold">
              ⚡ 1.8x (11-13 Flips)
            </div>
            <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 font-medium">
              1.2x (14+ Flips)
            </div>
          </div>
        </div>

        {/* Bet Controls */}
        <BetControls betAmount={betAmount} setBetAmount={setBetAmount} disabled={isPlaying} />

        {/* Action Button */}
        <button
          type="button"
          disabled={isPlaying}
          onClick={handleStartGame}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-cyan-600/30 active:scale-98 transition-all disabled:opacity-50"
        >
          {isPlaying ? (
            <>
              <RotateCcw className="w-5 h-5 animate-spin" />
              <span>Match in Progress ({matchedPairs}/6)...</span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5 fill-current" />
              <span>Start Memory Quest ({betAmount})</span>
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
        onPlayAgain={() => {
          setModalState((prev) => ({ ...prev, isOpen: false }));
          handleStartGame();
        }}
        onClose={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
