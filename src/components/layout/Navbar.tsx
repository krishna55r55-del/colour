import React, { useState } from 'react';
import { Sparkles, Volume2, VolumeX, Menu, X, LogOut, User } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { ViewType } from '../../types';

export const Navbar: React.FC = () => {
  const { activeView, setActiveView, selectGame, soundEnabled, toggleSound, playSound, user, logout } = useGame();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNav = (view: ViewType) => {
    playSound('click');
    selectGame(null);
    setActiveView(view);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-15 flex items-center justify-between gap-4">
        {/* Zone 1: Brand Wordmark (White background with Red badge like screenshots) */}
        <button
          type="button"
          onClick={() => handleNav('home')}
          className="flex items-center gap-2.5 group cursor-pointer text-left shrink-0"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-red-500 p-0.5 shadow-md shadow-rose-500/20 group-hover:scale-105 transition-all flex items-center justify-center">
            <span className="font-display font-black text-white text-lg tracking-wider">
              C
            </span>
          </div>
          <div>
            <div className="text-xl font-black font-display tracking-tight text-slate-900 flex items-center gap-1.5 leading-none">
              COBCLUB
              <span className="inline-block w-2 h-2 rounded-full bg-rose-500" />
            </div>
            <span className="text-[9px] uppercase tracking-widest font-bold text-rose-500 block mt-0.5">
              OFFICIAL GAMING
            </span>
          </div>
        </button>

        {/* Zone 2: Navigation Links (Desktop) */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-bold text-slate-600">
          <button
            type="button"
            onClick={() => handleNav('home')}
            className={`transition-colors whitespace-nowrap cursor-pointer hover:text-rose-600 ${
              activeView === 'home' ? 'text-rose-600 border-b-2 border-rose-500 pb-0.5' : 'text-slate-600'
            }`}
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => handleNav('all-games')}
            className={`transition-colors whitespace-nowrap cursor-pointer hover:text-rose-600 ${
              activeView === 'all-games' ? 'text-rose-600 border-b-2 border-rose-500 pb-0.5' : 'text-slate-600'
            }`}
          >
            All Games
          </button>
          <button
            type="button"
            onClick={() => handleNav('history')}
            className={`transition-colors whitespace-nowrap cursor-pointer hover:text-rose-600 ${
              activeView === 'history' ? 'text-rose-600 border-b-2 border-rose-500 pb-0.5' : 'text-slate-600'
            }`}
          >
            Game History
          </button>
          <button
            type="button"
            onClick={() => handleNav('profile')}
            className={`transition-colors whitespace-nowrap cursor-pointer hover:text-rose-600 ${
              activeView === 'profile' ? 'text-rose-600 border-b-2 border-rose-500 pb-0.5' : 'text-slate-600'
            }`}
          >
            Wallet & Profile
          </button>
        </nav>

        {/* Zone 3: Primary Action & Wallet Balance */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Sound Toggle */}
          <button
            type="button"
            onClick={toggleSound}
            aria-label={soundEnabled ? 'Mute sound' : 'Enable sound'}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors border border-slate-200"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-rose-500" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </button>



          {/* User Sign Out button */}
          {user && (
            <button
              type="button"
              onClick={logout}
              className="h-8 px-2.5 rounded-full bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-600 border border-slate-200 text-[11px] font-bold hidden sm:flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Sign Out of Account"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Exit</span>
            </button>
          )}

          {/* Mobile hamburger menu toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 py-4 space-y-2 animate-in slide-in-from-top-2 duration-150 shadow-md">
          <button
            type="button"
            onClick={() => handleNav('home')}
            className={`w-full text-left py-2.5 px-3 rounded-xl text-sm font-bold ${
              activeView === 'home' ? 'bg-rose-50 text-rose-600' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => handleNav('all-games')}
            className={`w-full text-left py-2.5 px-3 rounded-xl text-sm font-bold ${
              activeView === 'all-games' ? 'bg-rose-50 text-rose-600' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            All Games (10 Playable)
          </button>
          <button
            type="button"
            onClick={() => handleNav('history')}
            className={`w-full text-left py-2.5 px-3 rounded-xl text-sm font-bold ${
              activeView === 'history' ? 'bg-rose-50 text-rose-600' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            Game History Log
          </button>
          <button
            type="button"
            onClick={() => handleNav('profile')}
            className={`w-full text-left py-2 px-3 rounded-xl text-sm font-semibold ${
              activeView === 'profile' ? 'bg-purple-950/60 text-purple-300' : 'text-slate-300 hover:bg-slate-900'
            }`}
          >
            Profile & Stats
          </button>

          <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
            <span>Audio Sounds</span>
            <button
              type="button"
              onClick={toggleSound}
              className="text-cyan-400 font-semibold"
            >
              {soundEnabled ? 'Enabled' : 'Muted'}
            </button>
          </div>

          {user && (
            <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
              <span className="text-slate-400 font-mono">ID: {user.memberId} (+91 {user.phoneNumber})</span>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
