import React from 'react';
import { ShieldCheck, Sparkles, Heart } from 'lucide-react';
import { LegalModalType } from '../common/LegalModals';
import { useGame } from '../../context/GameContext';
import { ALL_GAMES } from '../../data/games';
import { GameId } from '../../types';

interface FooterProps {
  onOpenLegal: (type: LegalModalType) => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenLegal }) => {
  const { selectGame, playSound } = useGame();

  const handleGameClick = (id: GameId) => {
    playSound('click');
    selectGame(id);
  };

  return (
    <footer className="w-full bg-white border-t border-slate-200 pt-12 pb-24 md:pb-12 text-slate-500 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-100">
          {/* Brand info */}
          <div className="md:col-span-1 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-rose-600 to-red-500 p-0.5 shadow-xs flex items-center justify-center">
                <span className="font-display font-black text-white text-sm">
                  C
                </span>
              </div>
              <span className="text-lg font-black font-display text-slate-900 tracking-tight">
                COBCLUB
              </span>
            </div>
            <p className="text-slate-500 text-xs leading-relaxed">
              Play. Predict. Match. Enjoy. The definitive official virtual gaming platform powered exclusively by virtual fun credits.
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-[11px] text-rose-700 font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-rose-600" />
              <span>100% Free Virtual Points</span>
            </div>
          </div>

          {/* Quick Games Column 1 */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Predictions & Cards
            </h4>
            <ul className="space-y-2 text-xs">
              {ALL_GAMES.slice(0, 5).map((game) => (
                <li key={game.id}>
                  <button
                    type="button"
                    onClick={() => handleGameClick(game.id)}
                    className="hover:text-rose-600 transition-colors text-left cursor-pointer"
                  >
                    {game.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Games Column 2 */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Luck, Wheels & Arcade
            </h4>
            <ul className="space-y-2 text-xs">
              {ALL_GAMES.slice(5, 10).map((game) => (
                <li key={game.id}>
                  <button
                    type="button"
                    onClick={() => handleGameClick(game.id)}
                    className="hover:text-rose-600 transition-colors text-left cursor-pointer"
                  >
                    {game.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal and Support */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Platform & Legal
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => onOpenLegal('about')}
                  className="hover:text-rose-600 transition-colors text-left cursor-pointer"
                >
                  About Us
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenLegal('contact')}
                  className="hover:text-rose-600 transition-colors text-left cursor-pointer"
                >
                  Contact & Support
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenLegal('privacy')}
                  className="hover:text-rose-600 transition-colors text-left cursor-pointer"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenLegal('terms')}
                  className="hover:text-rose-600 transition-colors text-left cursor-pointer"
                >
                  Terms of Use
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Platform Statement & Disclaimer */}
        <div className="py-6 border-b border-slate-200 text-[11px] text-slate-500 leading-relaxed text-center sm:text-left">
          <p>
            <strong>Disclaimer:</strong> COBCLUB is an online social gaming platform using virtual points. No real-money gambling, deposits, withdrawals, financial wagering, or cash prizes exist on this site. Points have zero monetary value and are provided solely for casual play.
          </p>
        </div>

        {/* Copyright */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            &copy; {new Date().getFullYear()} COBCLUB Official. All rights reserved.
          </div>
          <div className="flex items-center gap-1 text-[11px]">
            <span>Crafted for gamers with</span>
            <Heart className="w-3 h-3 text-rose-500 fill-current inline" />
            <span>and pure code</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
