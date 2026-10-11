import React from 'react';
import { X, ShieldAlert, FileText, Info, Mail, CheckCircle2 } from 'lucide-react';

export type LegalModalType = 'about' | 'contact' | 'privacy' | 'terms' | 'fairness' | null;

interface LegalModalsProps {
  modal: LegalModalType;
  onClose: () => void;
}

export const LegalModals: React.FC<LegalModalsProps> = ({ modal, onClose }) => {
  if (!modal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl relative text-left max-h-[85vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {modal === 'about' && (
          <div>
            <div className="flex items-center gap-2.5 mb-4 text-rose-600">
              <Info className="w-6 h-6" />
              <h3 className="text-xl font-bold text-slate-900 font-display">About COBCLUB</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              <strong>COBCLUB</strong> is a premier mobile-first online gaming destination built for pulse-pounding arcade and prediction gaming. Designed with state-of-the-art modern aesthetics, COBCLUB gives players a sleek, frictionless playground featuring 10 distinct interactive games.
            </p>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              We operate on <strong>Virtual Points</strong>. Players receive a starting bankroll of 1,000 upon arrival and can reload credits through the profile wallet option. There are no real-money deposits, withdrawals, or fiat wagering.
            </p>
            <div className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>10 Handcrafted Interactive Games</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Fair Browser-Side RNG Simulations</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Zero Real-Money Risk & Safe Play</span>
              </div>
            </div>
          </div>
        )}

        {modal === 'contact' && (
          <div>
            <div className="flex items-center gap-2.5 mb-4 text-rose-600">
              <Mail className="w-6 h-6" />
              <h3 className="text-xl font-bold text-slate-900 font-display">Contact COBCLUB</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Have feedback, bug reports, or game feature suggestions? Our virtual clubhouse support desk is eager to hear from you.
            </p>
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3 text-xs mb-4">
              <div>
                <span className="text-slate-500 block text-[11px]">Player Support Email</span>
                <span className="text-slate-900 font-mono font-medium">support@cobclub.gaming</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Community Hours</span>
                <span className="text-slate-900 font-medium">24/7 Virtual Play & Platform Moderation</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              For security reasons, COBCLUB will never request personal financial details, passwords, or credit card numbers.
            </p>
          </div>
        )}

        {modal === 'privacy' && (
          <div>
            <div className="flex items-center gap-2.5 mb-4 text-rose-600">
              <FileText className="w-6 h-6" />
              <h3 className="text-xl font-bold text-slate-900 font-display">Privacy Policy</h3>
            </div>
            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <p>
                <strong>1. Data Minimization:</strong> COBCLUB stores gameplay progress, points, audio preferences, and round records locally within your browser's private local storage.
              </p>
              <p>
                <strong>2. No Financial Tracking:</strong> Because COBCLUB is strictly non-monetary, we do not collect banking details, credit cards, or personal billing identifiers.
              </p>
              <p>
                <strong>3. Local Storage Control:</strong> You can purge your entire game records and reset your balance at any time directly through the Profile tab.
              </p>
            </div>
          </div>
        )}

        {modal === 'terms' && (
          <div>
            <div className="flex items-center gap-2.5 mb-4 text-rose-600">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="text-xl font-bold text-slate-900 font-display">Terms of Use</h3>
            </div>
            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <p>
                <strong>1. Virtual Gaming Points Only:</strong> All games, scores, multipliers, and points within COBCLUB exist exclusively for casual gaming enjoyment. Points have no monetary value and cannot be exchanged, redeemed, or transferred for real cash, gift cards, or physical goods.
              </p>
              <p>
                <strong>2. No Real-Money Gambling:</strong> COBCLUB is NOT a casino, bookmaker, or gambling website. No real money can be deposited or withdrawn under any circumstances.
              </p>
              <p>
                <strong>3. Age & Fair Play:</strong> Players must engage respectfully and agree not to exploit automated scripts or manipulate browser state machines.
              </p>
            </div>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-6 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
