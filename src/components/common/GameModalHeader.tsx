import React, { useState } from 'react';
import { ArrowLeft, HelpCircle, Coins, X, CheckCircle2 } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { ALL_GAMES } from '../../data/games';
import { GameId } from '../../types';

interface GameHeaderProps {
  gameId: GameId;
  onBack?: () => void;
}

export const GameModalHeader: React.FC<GameHeaderProps> = ({ gameId, onBack }) => {
  const { balance, selectGame, playSound } = useGame();
  const [showRules, setShowRules] = useState(false);

  const game = ALL_GAMES.find((g) => g.id === gameId);

  const handleBack = () => {
    playSound('click');
    if (onBack) {
      onBack();
    } else {
      selectGame(null);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between gap-2 p-3 sm:p-4 bg-white border-b border-slate-200 rounded-t-2xl sm:rounded-t-3xl shadow-xs">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleBack}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 flex items-center justify-center transition-all border border-slate-200 cursor-pointer"
            aria-label="Back to Games"
          >
            <ArrowLeft className="w-4 h-4 text-rose-600" />
          </button>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 font-display flex items-center gap-2">
              {game?.title}
              <span className="text-[10px] uppercase tracking-wider font-black px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                {game?.maxMultiplier} Max
              </span>
            </h2>
            <p className="text-[11px] text-slate-400 hidden xs:block">{game?.tagline}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Rules trigger button */}
          <button
            type="button"
            onClick={() => {
              playSound('click');
              setShowRules(true);
            }}
            className="h-8 px-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-200 cursor-pointer"
            title="Game Rules & Odds"
          >
            <HelpCircle className="w-3.5 h-3.5 text-rose-500" />
            <span className="hidden sm:inline">Rules</span>
          </button>

          {/* Balance chip */}
          <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-200 rounded-full text-xs font-bold text-rose-600">
            <Coins className="w-3.5 h-3.5 text-amber-500" />
            <span className="tabular-nums font-mono font-black">₹{balance.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Rules Modal Overlay */}
      {showRules && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-5 shadow-2xl relative text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-rose-500" />
                <h3 className="text-base font-bold text-slate-900">{game?.title} — Rules</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRules(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-2.5 text-xs text-slate-600">
              {game?.rules.map((rule, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{rule}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-700">
              💡 <strong>Fair Play Notice:</strong> COBCLUB operates on simulated RNG logic with instant payout calculation using virtual points. No real money value.
            </div>

            <button
              type="button"
              onClick={() => setShowRules(false)}
              className="mt-4 w-full py-2.5 bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 text-white font-bold text-xs rounded-full shadow-xs transition-all cursor-pointer"
            >
              Got it, let's play!
            </button>
          </div>
        </div>
      )}
    </>
  );
};
