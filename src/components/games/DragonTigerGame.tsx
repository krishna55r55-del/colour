import React, { useState } from 'react';
import { Play, Sparkles } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { GameModalHeader } from '../common/GameModalHeader';
import { BetControls } from '../common/BetControls';
import { WinModal } from '../common/WinModal';
import { isBetAlwaysWin } from '../../utils/winLogic';

type BetOption = 'dragon' | 'tiger' | 'tie';

interface CardData {
  rank: number; // 1-13
  rankLabel: string;
  suit: '♠' | '♥' | '♦' | '♣';
  isRed: boolean;
}

export const DragonTigerGame: React.FC = () => {
  const { placeBet, recordGameResult, playSound, winManagerEnabled } = useGame();

  const [betAmount, setBetAmount] = useState(50);
  const [selectedBet, setSelectedBet] = useState<BetOption>('dragon');
  const [isDealing, setIsDealing] = useState(false);
  const [dragonCard, setDragonCard] = useState<CardData | null>({ rank: 11, rankLabel: 'J', suit: '♠', isRed: false });
  const [tigerCard, setTigerCard] = useState<CardData | null>({ rank: 8, rankLabel: '8', suit: '♥', isRed: true });
  const [roadMap, setRoadMap] = useState<BetOption[]>(['dragon', 'tiger', 'dragon', 'tie', 'dragon', 'tiger', 'tiger', 'dragon']);
  const [winner, setWinner] = useState<BetOption | null>(null);

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

  const suits: Array<'♠' | '♥' | '♦' | '♣'> = ['♠', '♥', '♦', '♣'];
  const rankLabels = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  const getRandomCard = (): CardData => {
    const rank = Math.floor(Math.random() * 13) + 1;
    const suit = suits[Math.floor(Math.random() * 4)];
    return {
      rank,
      rankLabel: rankLabels[rank],
      suit,
      isRed: suit === '♥' || suit === '♦',
    };
  };

  const handleDeal = () => {
    if (!placeBet(betAmount)) return;

    setIsDealing(true);
    setWinner(null);
    playSound('card');

    setTimeout(() => {
      playSound('card');
    }, 400);

    setTimeout(() => {
      let dCard = getRandomCard();
      let tCard = getRandomCard();

      const willWin = isBetAlwaysWin(betAmount, winManagerEnabled);
      if (willWin) {
        // Win: player bet wins
        if (selectedBet === 'dragon') {
          while (dCard.rank <= tCard.rank) {
            dCard = getRandomCard();
            tCard = getRandomCard();
          }
        } else if (selectedBet === 'tiger') {
          while (tCard.rank <= dCard.rank) {
            dCard = getRandomCard();
            tCard = getRandomCard();
          }
        } else if (selectedBet === 'tie') {
          tCard = { ...dCard, suit: '♥' };
        }
      } else {
        // Win Manager OFF: player bet loses
        if (selectedBet === 'dragon') {
          while (tCard.rank <= dCard.rank) {
            dCard = getRandomCard();
            tCard = getRandomCard();
          }
        } else if (selectedBet === 'tiger') {
          while (dCard.rank <= tCard.rank) {
            dCard = getRandomCard();
            tCard = getRandomCard();
          }
        } else if (selectedBet === 'tie') {
          while (dCard.rank === tCard.rank) {
            tCard = getRandomCard();
          }
        }
      }

      setDragonCard(dCard);
      setTigerCard(tCard);
      setIsDealing(false);

      let roundWinner: BetOption;
      if (dCard.rank > tCard.rank) {
        roundWinner = 'dragon';
      } else if (tCard.rank > dCard.rank) {
        roundWinner = 'tiger';
      } else {
        roundWinner = 'tie';
      }

      setWinner(roundWinner);
      setRoadMap((prev) => [roundWinner, ...prev.slice(0, 11)]);

      const isWin = selectedBet === roundWinner;
      const multiplier = roundWinner === 'tie' ? 9.0 : 2.0;
      const payout = isWin ? Math.round(betAmount * multiplier) : 0;

      recordGameResult({
        gameId: 'dragon-tiger',
        gameTitle: 'Dragon Tiger',
        betAmount,
        choice: selectedBet.toUpperCase(),
        outcome: `Dragon: ${dCard.rankLabel}${dCard.suit} vs Tiger: ${tCard.rankLabel}${tCard.suit} (${roundWinner.toUpperCase()})`,
        payout,
        netProfit: payout - betAmount,
        isWin,
      });

      setModalState({
        isOpen: true,
        isWin,
        payout,
        multiplier,
        message: `${roundWinner.toUpperCase()} won the card battle! (${dCard.rankLabel} vs ${tCard.rankLabel})`,
      });
    }, 1200);
  };

  const renderCard = (card: CardData | null, title: string, isDragonSide: boolean) => {
    return (
      <div className="flex flex-col items-center">
        <span className={`text-xs uppercase tracking-wider font-extrabold mb-2 ${
          isDragonSide ? 'text-amber-400' : 'text-cyan-400'
        }`}>
          {title}
        </span>
        <div className={`w-28 h-40 sm:w-36 sm:h-52 rounded-2xl p-3 flex flex-col justify-between border-2 transition-all duration-500 relative shadow-2xl ${
          isDealing
            ? 'animate-pulse bg-slate-900 border-slate-700'
            : winner === (isDragonSide ? 'dragon' : 'tiger')
            ? isDragonSide
              ? 'bg-gradient-to-br from-amber-950 via-slate-900 to-slate-950 border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.5)] scale-105'
              : 'bg-gradient-to-br from-cyan-950 via-slate-900 to-slate-950 border-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.5)] scale-105'
            : 'bg-slate-900 border-slate-800'
        }`}>
          {isDealing ? (
            <div className="w-full h-full rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-slate-600 animate-spin" />
            </div>
          ) : card ? (
            <>
              {/* Top Left */}
              <div className={`text-left leading-none ${card.isRed ? 'text-rose-500' : 'text-slate-100'}`}>
                <div className="text-xl sm:text-2xl font-black font-display">{card.rankLabel}</div>
                <div className="text-sm sm:text-base">{card.suit}</div>
              </div>

              {/* Center Suit Watermark */}
              <div className={`text-4xl sm:text-6xl text-center self-center my-auto ${card.isRed ? 'text-rose-500/80' : 'text-slate-200/80'}`}>
                {card.suit}
              </div>

              {/* Bottom Right Inverted */}
              <div className={`text-right leading-none rotate-180 ${card.isRed ? 'text-rose-500' : 'text-slate-100'}`}>
                <div className="text-xl sm:text-2xl font-black font-display">{card.rankLabel}</div>
                <div className="text-sm sm:text-base">{card.suit}</div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto rounded-3xl bg-white border border-slate-200 shadow-xl overflow-hidden text-slate-800">
      <GameModalHeader gameId="dragon-tiger" />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Road Map Bar */}
        <div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold">Table Road Map (Recent Results)</span>
            <span>Dragon / Tiger / Tie</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {roadMap.map((r, i) => (
              <div
                key={i}
                className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center font-black text-xs border ${
                  r === 'dragon'
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                    : r === 'tiger'
                    ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50'
                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                }`}
              >
                {r === 'dragon' ? 'D' : r === 'tiger' ? 'T' : 'X'}
              </div>
            ))}
          </div>
        </div>

        {/* Card Arena */}
        <div className="relative py-8 px-4 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border border-amber-500/20 flex flex-col items-center justify-center">
          <div className="flex items-center justify-center gap-8 sm:gap-16 w-full max-w-lg">
            {renderCard(dragonCard, 'Dragon 🐉', true)}

            <div className="text-center font-display">
              <div className="text-xl sm:text-2xl font-black text-slate-500">VS</div>
              {winner && (
                <div className={`text-xs font-black uppercase tracking-wider mt-2 px-2.5 py-1 rounded-full ${
                  winner === 'dragon'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/50'
                    : winner === 'tiger'
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/50'
                    : 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/50'
                }`}>
                  {winner} Wins
                </div>
              )}
            </div>

            {renderCard(tigerCard, 'Tiger 🐅', false)}
          </div>
        </div>

        {/* Bet Selection Tabs */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Select Your Side
          </label>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              disabled={isDealing}
              onClick={() => {
                playSound('click');
                setSelectedBet('dragon');
              }}
              className={`p-4 rounded-2xl border text-center transition-all ${
                selectedBet === 'dragon'
                  ? 'bg-gradient-to-br from-amber-600 to-orange-600 text-white border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4)] scale-102'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-amber-500/50'
              }`}
            >
              <div className="text-base font-black">DRAGON</div>
              <div className="text-xs opacity-90 mt-0.5">2.0x Payout</div>
            </button>

            <button
              type="button"
              disabled={isDealing}
              onClick={() => {
                playSound('click');
                setSelectedBet('tie');
              }}
              className={`p-4 rounded-2xl border text-center transition-all ${
                selectedBet === 'tie'
                  ? 'bg-gradient-to-br from-emerald-600 to-teal-600 text-white border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)] scale-102'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-emerald-500/50'
              }`}
            >
              <div className="text-base font-black">TIE (EQUAL)</div>
              <div className="text-xs font-bold text-emerald-300 mt-0.5">9.0x Payout</div>
            </button>

            <button
              type="button"
              disabled={isDealing}
              onClick={() => {
                playSound('click');
                setSelectedBet('tiger');
              }}
              className={`p-4 rounded-2xl border text-center transition-all ${
                selectedBet === 'tiger'
                  ? 'bg-gradient-to-br from-cyan-600 to-blue-600 text-white border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)] scale-102'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-cyan-500/50'
              }`}
            >
              <div className="text-base font-black">TIGER</div>
              <div className="text-xs opacity-90 mt-0.5">2.0x Payout</div>
            </button>
          </div>
        </div>

        {/* Bet Controls */}
        <BetControls betAmount={betAmount} setBetAmount={setBetAmount} disabled={isDealing} />

        {/* Action Button */}
        <button
          type="button"
          disabled={isDealing}
          onClick={handleDeal}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-600 to-cyan-500 hover:from-amber-400 hover:to-cyan-400 text-slate-950 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 active:scale-98 transition-all disabled:opacity-50"
        >
          {isDealing ? (
            <>
              <Sparkles className="w-5 h-5 animate-spin" />
              <span>Dealing Cards...</span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5 fill-current" />
              <span>Deal Showdown ({betAmount})</span>
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
