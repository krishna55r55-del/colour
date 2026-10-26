import React, { useState } from 'react';
import { Play, Sparkles, Crown } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { GameModalHeader } from '../common/GameModalHeader';
import { BetControls } from '../common/BetControls';
import { WinModal } from '../common/WinModal';
import { isBetAlwaysWin } from '../../utils/winLogic';

interface MysteryCard {
  id: number;
  multiplier: number;
  label: string;
  isJackpot?: boolean;
}

const POSSIBLE_MULTIPLIERS = [0.5, 1.2, 2.0, 4.0, 10.0];

export const LuckyCardsGame: React.FC = () => {
  const { placeBet, recordGameResult, playSound, winManagerEnabled } = useGame();

  const [betAmount, setBetAmount] = useState(50);
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [cards, setCards] = useState<MysteryCard[]>([]);
  const [isRevealed, setIsRevealed] = useState(false);
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

  // Setup initial deck of 5 cards
  const generateDeck = (): MysteryCard[] => {
    // Shuffle the possible multipliers
    const shuffled = [...POSSIBLE_MULTIPLIERS].sort(() => Math.random() - 0.5);
    return shuffled.map((mult, idx) => ({
      id: idx,
      multiplier: mult,
      label: `${mult.toFixed(1)}x`,
      isJackpot: mult === 10.0,
    }));
  };

  const handleStartRound = () => {
    if (!placeBet(betAmount)) return;

    setIsPlaying(true);
    setIsRevealed(false);
    setSelectedCardId(null);
    setCards(generateDeck());
    playSound('card');
  };

  const handlePickCard = (card: MysteryCard) => {
    if (!isPlaying || isRevealed) return;

    // Enforce win/loss based on button state & target amounts: "Jab on ho to sare bet win ho or off to to 120 230 340 450 560 670 780 890 1020 is time ko always win kro off on both"
    const willWin = isBetAlwaysWin(betAmount, winManagerEnabled);
    let resolvedMultiplier = card.multiplier;
    let resolvedLabel = card.label;
    let resolvedJackpot = card.isJackpot;

    if (!willWin) {
      resolvedMultiplier = 0.0;
      resolvedLabel = '0.0x';
      resolvedJackpot = false;
    } else {
      resolvedMultiplier = Math.max(2.0, card.multiplier);
      resolvedLabel = `${resolvedMultiplier.toFixed(1)}x`;
    }

    const resolvedCard = {
      ...card,
      multiplier: resolvedMultiplier,
      label: resolvedLabel,
      isJackpot: resolvedJackpot,
    };

    setCards((prev) =>
      prev.map((c) => (c.id === card.id ? resolvedCard : c))
    );

    setSelectedCardId(card.id);
    setIsRevealed(true);
    setIsPlaying(false);
    playSound('card');

    setTimeout(() => {
      const isWin = willWin && resolvedCard.multiplier >= 1.0;
      const payout = isWin ? Math.round(betAmount * resolvedCard.multiplier) : 0;

      recordGameResult({
        gameId: 'lucky-cards',
        gameTitle: 'Lucky Cards',
        betAmount,
        choice: `Card #${card.id + 1}`,
        outcome: `Revealed ${card.label}`,
        payout,
        netProfit: payout - betAmount,
        isWin,
      });

      setModalState({
        isOpen: true,
        isWin,
        payout,
        multiplier: card.multiplier,
        message: card.isJackpot
          ? `👑 JACKPOT CARD REVEALED! You won ${card.label}!`
          : isWin
          ? `You found the ${card.label} card!`
          : `Revealed ${card.label} multiplier.`,
      });
    }, 800);
  };

  return (
    <div className="w-full max-w-4xl mx-auto rounded-3xl bg-white border border-slate-200 shadow-xl overflow-hidden text-slate-800">
      <GameModalHeader gameId="lucky-cards" />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Status prompt */}
        <div className="text-center text-xs font-semibold text-slate-400">
          {!isPlaying && !isRevealed && 'Place your bet and hit Deal Cards to begin'}
          {isPlaying && 'Tap any mystery card to reveal your prize multiplier!'}
          {isRevealed && 'All cards revealed below.'}
        </div>

        {/* 5 Holographic Mystery Cards Arena */}
        <div className="relative py-10 px-4 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border border-amber-500/30 flex flex-col items-center justify-center">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 w-full max-w-2xl">
            {(cards.length > 0 ? cards : [0, 1, 2, 3, 4].map((i) => ({ id: i, multiplier: 1, label: '?' }))).map((card, idx) => {
              const isSelected = selectedCardId === card.id;
              const cardObj = cards.find((c) => c.id === card.id);

              return (
                <div
                  key={idx}
                  onClick={() => cardObj && handlePickCard(cardObj)}
                  className={`h-40 sm:h-52 rounded-2xl p-3 flex flex-col items-center justify-center cursor-pointer transition-all duration-500 border-2 relative select-none ${
                    isRevealed
                      ? isSelected
                        ? cardObj?.isJackpot
                          ? 'bg-gradient-to-b from-amber-500 via-yellow-400 to-amber-600 text-slate-950 border-white shadow-[0_0_30px_rgba(245,158,11,0.6)] scale-105'
                          : cardObj && cardObj.multiplier >= 2
                          ? 'bg-gradient-to-b from-purple-700 to-indigo-900 text-white border-purple-400 shadow-[0_0_25px_rgba(168,85,247,0.5)] scale-105'
                          : 'bg-slate-800 text-slate-200 border-slate-600'
                        : 'bg-slate-900/60 text-slate-400 border-slate-800 opacity-60'
                      : isPlaying
                      ? 'bg-gradient-to-br from-slate-800 via-slate-900 to-purple-950/60 border-purple-500/50 hover:border-purple-400 hover:scale-105 hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] animate-pulse'
                      : 'bg-slate-900 border-slate-800 opacity-80'
                  }`}
                >
                  {isRevealed && cardObj ? (
                    <div className="text-center">
                      {cardObj.isJackpot && <Crown className="w-8 h-8 mx-auto mb-2 text-amber-950" />}
                      <span className="text-2xl sm:text-3xl font-black font-display block">
                        {cardObj.label}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider font-extrabold mt-1 block">
                        {cardObj.isJackpot ? 'MEGA JACKPOT' : cardObj.multiplier >= 2 ? 'BIG WIN' : 'MULTIPLIER'}
                      </span>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-xl bg-purple-950/60 border border-purple-600/40 flex items-center justify-center mx-auto mb-2 text-purple-300">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-bold text-slate-300">CARD #{idx + 1}</span>
                      <span className="text-[10px] text-purple-400 block mt-1">Tap to Flip</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Multipliers Legend */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Possible Hidden Multipliers in Deck
          </label>
          <div className="grid grid-cols-5 gap-2 text-center text-xs">
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 font-bold">
              0.5x
            </div>
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-bold">
              1.2x
            </div>
            <div className="p-2 rounded-xl bg-purple-950/40 border border-purple-800/40 text-purple-300 font-bold">
              2.0x
            </div>
            <div className="p-2 rounded-xl bg-cyan-950/40 border border-cyan-800/40 text-cyan-300 font-bold">
              4.0x
            </div>
            <div className="p-2 rounded-xl bg-amber-950/40 border border-amber-800/40 text-amber-300 font-black">
              👑 10.0x
            </div>
          </div>
        </div>

        {/* Bet Controls */}
        <BetControls betAmount={betAmount} setBetAmount={setBetAmount} disabled={isPlaying} />

        {/* Deal Button */}
        <button
          type="button"
          disabled={isPlaying}
          onClick={handleStartRound}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-600 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-slate-950 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 active:scale-98 transition-all disabled:opacity-50"
        >
          <Play className="w-5 h-5 fill-current" />
          <span>Deal 5 Mystery Cards ({betAmount})</span>
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
          handleStartRound();
        }}
        onClose={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
