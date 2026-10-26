import React, { useState, useEffect } from 'react';
import { Coins, Minus, Plus } from 'lucide-react';
import { useGame } from '../../context/GameContext';

interface BetControlsProps {
  betAmount: number;
  setBetAmount: (amount: number) => void;
  disabled?: boolean;
  minBet?: number;
  maxBet?: number;
}

export const BetControls: React.FC<BetControlsProps> = ({
  betAmount,
  setBetAmount,
  disabled = false,
  minBet = 10,
  maxBet = 10000,
}) => {
  const { balance, playSound } = useGame();

  const [typedValue, setTypedValue] = useState<string>(betAmount.toString());

  useEffect(() => {
    setTypedValue(betAmount.toString());
  }, [betAmount]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    setTypedValue(raw);
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed)) {
      setBetAmount(parsed);
    }
  };

  const handleInputBlur = () => {
    const parsed = parseInt(typedValue, 10);
    if (isNaN(parsed) || parsed < minBet) {
      setBetAmount(minBet);
      setTypedValue(minBet.toString());
    } else if (parsed > Math.min(balance, maxBet)) {
      const clamped = Math.min(balance, maxBet);
      setBetAmount(clamped);
      setTypedValue(clamped.toString());
    }
  };

  const presets = [10, 25, 50, 100, 250, 500];

  const handleAdjust = (delta: number) => {
    playSound('click');
    setBetAmount(Math.max(minBet, Math.min(balance, Math.min(maxBet, betAmount + delta))));
  };

  const handleHalf = () => {
    playSound('click');
    setBetAmount(Math.max(minBet, Math.floor(betAmount / 2)));
  };

  const handleDouble = () => {
    playSound('click');
    setBetAmount(Math.max(minBet, Math.min(balance, Math.min(maxBet, betAmount * 2))));
  };

  const handleMax = () => {
    playSound('click');
    const safeMax = Math.min(balance, maxBet);
    setBetAmount(Math.max(minBet, safeMax));
  };

  const handleSetPreset = (val: number) => {
    playSound('click');
    setBetAmount(Math.min(balance, val));
  };

  const isInsufficient = balance < betAmount;

  return (
    <div className="w-full bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-xs">
      <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
        <span className="flex items-center gap-1.5 font-bold text-slate-700">
          <Coins className="w-3.5 h-3.5 text-rose-500" />
          <span>Wager Amount (Type or Select)</span>
        </span>
        <span className="tabular-nums">
          Avail: <strong className="text-slate-900 font-bold font-mono">₹{balance.toLocaleString()}</strong>
        </span>
      </div>

      <div className="flex items-center gap-2 mb-2.5">
        <button
          type="button"
          onClick={() => handleAdjust(-10)}
          disabled={disabled || betAmount <= minBet}
          aria-label="Decrease bet by 10"
          className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 flex items-center justify-center transition-all disabled:opacity-40 disabled:pointer-events-none border border-slate-200 cursor-pointer"
        >
          <Minus className="w-4 h-4" />
        </button>

        <div className="relative flex-1">
          <input
            type="text"
            inputMode="numeric"
            value={typedValue}
            disabled={disabled}
            placeholder="Type amount"
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            className="w-full h-10 bg-slate-50 border border-slate-200 focus:border-rose-500 focus:bg-white rounded-xl px-3 text-center text-base sm:text-lg font-black text-slate-900 focus:outline-none tabular-nums transition-colors"
          />
        </div>

        <button
          type="button"
          onClick={() => handleAdjust(10)}
          disabled={disabled || betAmount >= balance || betAmount >= maxBet}
          aria-label="Increase bet by 10"
          className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 flex items-center justify-center transition-all disabled:opacity-40 disabled:pointer-events-none border border-slate-200 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Quick Presets & Modifiers */}
      <div className="grid grid-cols-6 gap-1.5 mb-2">
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            disabled={disabled || preset > balance}
            onClick={() => handleSetPreset(preset)}
            className={`py-1.5 text-xs font-bold rounded-lg transition-all border cursor-pointer ${
              betAmount === preset
                ? 'bg-rose-500 text-white border-rose-600 shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200 disabled:opacity-30'
            }`}
          >
            ₹{preset}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5 text-xs">
        <button
          type="button"
          disabled={disabled}
          onClick={handleHalf}
          className="flex-1 py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors border border-slate-200 cursor-pointer"
        >
          ½ Half
        </button>
        <button
          type="button"
          disabled={disabled || betAmount * 2 > balance}
          onClick={handleDouble}
          className="flex-1 py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors border border-slate-200 disabled:opacity-40 cursor-pointer"
        >
          2× Double
        </button>
        <button
          type="button"
          disabled={disabled || balance <= 0}
          onClick={handleMax}
          className="flex-1 py-1.5 px-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold transition-colors border border-rose-200 disabled:opacity-40 cursor-pointer"
        >
          Max
        </button>
      </div>

      {isInsufficient && (
        <p className="text-[11px] text-rose-600 font-semibold mt-2 text-center">
          Insufficient balance. Please reduce bet or deposit funds.
        </p>
      )}
    </div>
  );
};
