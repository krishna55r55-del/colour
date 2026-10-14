import React from 'react';
import { Home, Gamepad2, History, User, Wallet } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { ViewType } from '../../types';

export const MobileNav: React.FC = () => {
  const { activeView, setActiveView, selectGame, playSound } = useGame();

  const handleSelect = (view: ViewType) => {
    playSound('click');
    selectGame(null);
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navItems: Array<{ view: ViewType; label: string; icon: React.FC<{ className?: string }>; isDeposit?: boolean }> = [
    { view: 'home', label: 'Home', icon: Home },
    { view: 'all-games', label: 'Games', icon: Gamepad2 },
    { view: 'deposit', label: 'Deposit', icon: Wallet, isDeposit: true },
    { view: 'history', label: 'History', icon: History },
    { view: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200 pb-safe shadow-lg">
      <div className="grid grid-cols-5 items-center h-16 max-w-md mx-auto px-1">
        {navItems.map((item) => {
          const isActive = activeView === item.view;
          const Icon = item.icon;

          if (item.isDeposit) {
            return (
              <button
                key={item.view}
                type="button"
                onClick={() => handleSelect(item.view)}
                className="flex flex-col items-center justify-center h-full cursor-pointer relative -top-2"
              >
                <div className={`w-11 h-11 rounded-full flex items-center justify-center shadow-md transition-transform ${
                  isActive ? 'bg-gradient-to-tr from-rose-600 to-red-500 text-white scale-105' : 'bg-gradient-to-tr from-rose-500 to-red-400 text-white'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black tracking-tight text-rose-600 mt-0.5">
                  Deposit
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.view}
              type="button"
              onClick={() => handleSelect(item.view)}
              className="flex flex-col items-center justify-center h-full cursor-pointer relative transition-colors"
            >
              <div className={`transition-transform duration-200 ${isActive ? 'scale-110 text-rose-600' : 'text-slate-400'}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className={`text-[10px] font-bold tracking-tight mt-1 transition-colors ${
                isActive ? 'text-rose-600' : 'text-slate-400'
              }`}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute top-1 w-1.5 h-1.5 rounded-full bg-rose-500 shadow-xs" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
