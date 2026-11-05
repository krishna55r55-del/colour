import React from 'react';
import { Gift, ArrowRight, ShieldCheck, Wallet, Sparkles, X } from 'lucide-react';
import { useGame } from '../../context/GameContext';

export const FirstDepositPromptModal: React.FC = () => {
  const {
    showFirstDepositPrompt,
    setShowFirstDepositPrompt,
    firstDepositPromptMessage,
    setActiveView,
    selectGame,
    playSound,
    balance,
  } = useGame();

  if (!showFirstDepositPrompt) return null;

  const handleDepositNow = () => {
    playSound('click');
    setShowFirstDepositPrompt(false);
    selectGame(null);
    setActiveView('deposit');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClose = () => {
    playSound('click');
    setShowFirstDepositPrompt(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center border border-slate-200 shadow-2xl relative animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* Subtle decorative background glow */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-200/50 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-rose-200/50 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Hero Icon */}
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-400 via-rose-500 to-red-500 text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/25 ring-4 ring-rose-50">
          <Gift className="w-8 h-8 animate-bounce" />
        </div>

        {/* Bonus Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-black uppercase tracking-wider mb-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>Registration Bonus: ₹{balance || 98}</span>
        </div>

        {/* Main Required Message */}
        <h2 className="text-xl font-black text-slate-900 font-display leading-tight mb-2">
          {firstDepositPromptMessage || 'Deposit 1 time to play with bonus money'}
        </h2>

        <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto mb-5">
          Your account has been credited with <strong className="text-slate-800">₹98 Registration Bonus</strong>. Complete your 1st deposit to unlock instant betting on all 9 games!
        </p>

        {/* Info Card */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 mb-5 text-left text-xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-700">
            <span className="flex items-center gap-1.5 font-bold">
              <Wallet className="w-3.5 h-3.5 text-rose-500" />
              <span>Current Bonus Balance:</span>
            </span>
            <span className="font-mono font-black text-slate-900">₹{balance || 98}</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Requirement:</span>
            </span>
            <span className="font-bold text-amber-700">1 Time Deposit</span>
          </div>
        </div>

        {/* CTA Actions */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleDepositNow}
            className="w-full py-3.5 rounded-full bg-gradient-to-r from-amber-500 via-rose-600 to-red-600 hover:from-amber-400 hover:to-red-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-rose-600/30 transition-all transform active:scale-98 cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Deposit Money Now</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleClose}
            className="w-full py-2.5 rounded-full text-slate-500 hover:text-slate-700 font-bold text-xs transition-colors cursor-pointer"
          >
            I'll Deposit Later
          </button>
        </div>
      </div>
    </div>
  );
};
