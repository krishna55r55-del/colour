import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  Coins,
  Gift,
  Play,
  Flame,
  Clock,
  Dices,
  Trophy,
  Shield,
  Palette,
  Layers,
  Zap,
  Crown,
  Lock,
  X,
  Users,
} from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { ALL_GAMES } from '../../data/games';
import { GameId } from '../../types';

export const HomeView: React.FC = () => {
  const {
    selectGame,
    setActiveView,
    recentlyPlayed,
    playSound,
    dailyBonus,
    canClaimDailyBonus,
    setIsDailyBonusModalOpen,
    winManagerEnabled,
    setWinManagerEnabled,
    masterDepositRequests,
    referralStats,
  } = useGame();

  const [showPassModal, setShowPassModal] = useState(false);
  const [passInput, setPassInput] = useState('');
  const [passError, setPassError] = useState('');

  // Admin Authentication State
  const [showAdminPinModal, setShowAdminPinModal] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [adminPinError, setAdminPinError] = useState('');

  const handleAdminClick = () => {
    playSound('click');
    const isAuth = typeof window !== 'undefined' && sessionStorage.getItem('cobclub_admin_session') === 'true';
    if (isAuth) {
      setActiveView('admin');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setAdminPinInput('');
      setAdminPinError('');
      setShowAdminPinModal(true);
    }
  };

  const handleAdminPinSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const pin = adminPinInput.trim();
    if (pin === 'Sweta@1212') {
      try {
        sessionStorage.setItem('cobclub_admin_session', 'true');
      } catch {}
      setShowAdminPinModal(false);
      setAdminPinInput('');
      setAdminPinError('');
      playSound('win');
      setActiveView('admin');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setAdminPinError('Access denied. Incorrect password.');
      playSound('loss');
    }
  };

  const handleToggleClick = () => {
    playSound('click');
    if (!winManagerEnabled) {
      setPassInput('');
      setPassError('');
      setShowPassModal(true);
    } else {
      setWinManagerEnabled(false);
    }
  };

  const handlePassSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (passInput.trim() === 'Sweta@1212') {
      setWinManagerEnabled(true);
      setShowPassModal(false);
      setPassInput('');
      setPassError('');
      playSound('win');
    } else {
      setPassError('Access denied. Incorrect password.');
      playSound('loss');
    }
  };

  const featuredGames = ALL_GAMES.filter((g) => g.featured);

  // Render stylized 3D/Neon game icon for each game
  const renderGameIcon = (gameId: GameId) => {
    switch (gameId) {
      case 'color-prediction':
        return (
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-emerald-500 p-0.5 shadow-lg shadow-purple-600/30">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Palette className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        );
      case 'dice-roll':
        return (
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 p-0.5 shadow-lg shadow-cyan-600/30">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Dices className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
        );
      case 'lucky-number':
        return (
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-600 to-cyan-500 p-0.5 shadow-lg shadow-emerald-600/30">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
        );
      case 'coin-flip':
        return (
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-yellow-400 via-amber-500 to-orange-600 p-0.5 shadow-lg shadow-yellow-500/30">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Coins className="w-6 h-6 text-yellow-400" />
            </div>
          </div>
        );
      case 'number-prediction':
        return (
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 via-indigo-600 to-cyan-400 p-0.5 shadow-lg shadow-indigo-600/30">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Zap className="w-6 h-6 text-indigo-400" />
            </div>
          </div>
        );
      case 'spin-wheel':
        return (
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-amber-400 p-0.5 shadow-lg shadow-green-500/30">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Trophy className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
        );
      case 'lucky-cards':
        return (
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-purple-600 to-pink-500 p-0.5 shadow-lg shadow-purple-600/30">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Layers className="w-6 h-6 text-pink-400" />
            </div>
          </div>
        );
      case 'color-match':
        return (
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 via-fuchsia-600 to-cyan-400 p-0.5 shadow-lg shadow-fuchsia-600/30">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Palette className="w-6 h-6 text-fuchsia-400" />
            </div>
          </div>
        );
      case 'memory-match':
        return (
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-purple-600 p-0.5 shadow-lg shadow-cyan-600/30">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
        );
      default:
        return (
          <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-300">
            <Play className="w-6 h-6" />
          </div>
        );
    }
  };

  const handleLaunchGame = (id: GameId) => {
    playSound('click');
    selectGame(id);
  };

  const handleExploreClick = () => {
    playSound('click');
    setActiveView('all-games');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-8 sm:space-y-10 pb-12">
      {/* Top Banner / Hero Carousel (Rajaluck / 82win red lottery styling) */}
      <section className="relative overflow-hidden pt-6 pb-4 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto rounded-3xl p-6 sm:p-10 bg-gradient-to-r from-[#e52e2e] via-[#f53b3b] to-[#ff5757] text-white shadow-xl relative overflow-hidden">
          {/* Subtle lottery sphere shapes */}
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 blur-xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-black/10 blur-xl pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/20 text-xs font-black text-white shadow-sm border border-white/30">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>OFFICIAL GAMING PLATFORM</span>
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black font-display tracking-tight text-white uppercase text-balance leading-none">
              WELCOME TO COBCLUB
            </h1>

            <p className="text-xs sm:text-sm text-white/90 max-w-lg mx-auto leading-relaxed font-medium">
              Fair & Transparent Online Prediction Gaming. Enjoy 9 exciting games including Win Go, Dice Roll, Lucky Number, and more with instant results!
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleLaunchGame('color-prediction')}
                className="px-6 py-3 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-2"
              >
                <span>Play Win Go Live</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleExploreClick}
                className="px-6 py-3 rounded-full bg-white/20 hover:bg-white/30 text-white font-bold text-xs uppercase tracking-wider transition-all border border-white/30 cursor-pointer"
              >
                All 9 Games
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 24-Hour Daily Login Bonus Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div
          onClick={() => {
            playSound('click');
            setIsDailyBonusModalOpen(true);
          }}
          className={`cursor-pointer rounded-2xl p-4 sm:p-5 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs hover:shadow-md ${
            canClaimDailyBonus
              ? 'bg-gradient-to-r from-amber-50 via-rose-50 to-orange-50 border-amber-300 ring-1 ring-amber-300/60'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                canClaimDailyBonus
                  ? 'bg-gradient-to-tr from-amber-500 to-rose-500 text-white animate-pulse'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              <Gift className="w-6 h-6" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    canClaimDailyBonus
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {canClaimDailyBonus ? 'Bonus Available' : 'Claimed Today'}
                </span>
                <span className="text-xs font-bold text-slate-500">
                  {dailyBonus.streak > 0 ? `Day ${dailyBonus.streak} of 7 Streak` : '7-Day Streak Ladder'}
                </span>
              </div>

              <h3 className="text-sm sm:text-base font-black font-display text-slate-900 mt-0.5">
                {canClaimDailyBonus
                  ? 'Daily Login Bonus Ready to Claim!'
                  : 'Daily Bonus Active · Check In Tomorrow'}
              </h3>
              <p className="text-xs text-slate-500">
                {canClaimDailyBonus
                  ? 'Earn free virtual points every 24 hours to fuel your gaming.'
                  : `Next bonus point unlock available in 24 hours. Total claimed: ₹${(dailyBonus.totalClaimed || 0).toLocaleString()}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
            <button
              type="button"
              className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-xs cursor-pointer ${
                canClaimDailyBonus
                  ? 'bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>{canClaimDailyBonus ? 'Claim Points' : 'View Calendar'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* Refer & Earn Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div
          onClick={() => {
            playSound('click');
            setActiveView('refer');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="cursor-pointer rounded-2xl p-4 sm:p-5 border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-amber-50 hover:border-emerald-300 shadow-xs hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Users className="w-6 h-6" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                  ₹77 Per Refer
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                  5 Refers = ₹355 Extra
                </span>
              </div>

              <h3 className="text-sm sm:text-base font-black font-display text-slate-900 mt-1">
                Refer Friends & Earn Instant Cash Bonus
              </h3>
              <p className="text-xs text-slate-500">
                Get ₹77 after your friend completes 1 deposit · Progress: {referralStats.progressToNext5}/5 toward ₹355 extra
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
            <button
              type="button"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <span>Refer & Earn</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* Featured Games Spotlight */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-rose-600" />
            <h2 className="text-xl sm:text-2xl font-black font-display text-slate-900">
              Popular Games
            </h2>
          </div>
          <button
            type="button"
            onClick={handleExploreClick}
            className="text-xs text-rose-600 hover:text-rose-700 font-black flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {featuredGames.slice(0, 3).map((game) => (
            <div
              key={game.id}
              onClick={() => handleLaunchGame(game.id)}
              className="group cursor-pointer rounded-3xl p-5 bg-white border border-slate-200 hover:border-rose-300 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  {renderGameIcon(game.id)}
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-[10px] font-black text-rose-600">
                    <span>Max {game.maxMultiplier}</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-black font-display text-slate-900 group-hover:text-rose-600 transition-colors">
                    {game.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {game.description}
                  </p>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Min: ₹{game.minBet}</span>
                <span className="font-black text-rose-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <span>Play Now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recently Played Section (if user has played games) */}
      {recentlyPlayed.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-rose-600" />
            <h2 className="text-base sm:text-lg font-black font-display text-slate-900">
              Recently Played
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {recentlyPlayed.map((id) => {
              const game = ALL_GAMES.find((g) => g.id === id);
              if (!game) return null;

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleLaunchGame(id)}
                  className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-rose-300 hover:shadow-xs text-left transition-all group flex items-center gap-3 cursor-pointer"
                >
                  <div className="shrink-0">{renderGameIcon(id)}</div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-rose-600 truncate block">
                      {game.title}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      {game.maxMultiplier}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* All 9 Games Responsive Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-6">
          <div>
            <div className="text-xs uppercase tracking-wider font-black text-rose-600 mb-1">
              Complete Arena
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-display text-slate-900">
              All 9 Interactive Games
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Provably fair browser simulations with instant virtual returns
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {ALL_GAMES.map((game, idx) => (
            <div
              key={game.id}
              onClick={() => handleLaunchGame(game.id)}
              className="group cursor-pointer rounded-2xl p-4 bg-white border border-slate-200 hover:border-rose-300 hover:shadow-md transition-all duration-200 hover:-translate-y-1 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  {renderGameIcon(game.id)}
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                    {game.maxMultiplier}
                  </span>
                </div>

                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  0{idx + 1} · {game.categoryLabel}
                </div>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-rose-600 transition-colors mt-0.5">
                  {game.title}
                </h3>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {game.tagline}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-medium">Min: ₹{game.minBet}</span>
                <span className="font-black text-rose-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <span>Play</span>
                  <Play className="w-2.5 h-2.5 fill-current" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Platform Value Highlights */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="rounded-3xl p-6 sm:p-8 bg-white border border-slate-200 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-center sm:text-left">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto sm:mx-0">
                <Shield className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">100% Fair Gaming</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Zero real money gambling. All games operate strictly with simulated fun credits.
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mx-auto sm:mx-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Provably Fair Browser RNG</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Randomized algorithms ensure transparent, non-skewed math across every single round.
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto sm:mx-0">
                <Coins className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Always Available Credits</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Seamless gameplay guaranteed. Instant balance replenishment & withdrawals via deposit dashboard.
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto sm:mx-0">
                <Zap className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Instant Responsive Action</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Mobile-first layout engineered with sub-second feedback, rich audio, and crisp physics.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Shifted to Home Section Last Bottom: Winning ON/OFF Toggle & Admin Portal Button labeled Volume */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-6">
        <div className="flex flex-col items-center justify-center gap-3">
          {/* ON/OFF Switch labeled Volume */}
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Volume
            </span>
            <button
              type="button"
              onClick={handleToggleClick}
              className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none shadow-xs ${
                winManagerEnabled ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
              title={winManagerEnabled ? 'Volume ON' : 'Volume OFF'}
              aria-label={winManagerEnabled ? 'Volume ON' : 'Volume OFF'}
            >
              <span
                className={`pointer-events-none h-6 w-6 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out inline-flex items-center justify-center text-[9px] font-black uppercase ${
                  winManagerEnabled ? 'translate-x-7 text-emerald-600' : 'translate-x-0 text-slate-500'
                }`}
              >
                {winManagerEnabled ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>

          {/* Crown Portal Button labeled Volume */}
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={handleAdminClick}
              className="relative inline-flex items-center justify-center gap-1.5 px-3.5 h-9 rounded-full bg-slate-100 hover:bg-amber-50 text-slate-700 border border-slate-200 transition-all shadow-2xs cursor-pointer active:scale-95"
              aria-label="Volume"
            >
              <Crown className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold uppercase tracking-wider">Volume</span>
              {masterDepositRequests.filter((d) => d.status === 'Pending').length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse border border-white" />
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Password Verification Modal */}
      {showAdminPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-xs rounded-2xl bg-white p-5 border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Crown className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-black text-slate-900 tracking-wide uppercase">
                  Portal Access
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAdminPinModal(false);
                  setAdminPinInput('');
                  setAdminPinError('');
                }}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdminPinSubmit} className="space-y-3">
              <div>
                <input
                  type="password"
                  value={adminPinInput}
                  onChange={(e) => {
                    setAdminPinInput(e.target.value);
                    if (adminPinError) setAdminPinError('');
                  }}
                  placeholder="Enter Password"
                  autoFocus
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-mono text-center text-sm font-bold tracking-wider focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                />
                {adminPinError && (
                  <p className="text-[11px] font-semibold text-rose-500 mt-1 text-center">
                    {adminPinError}
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdminPinModal(false);
                    setAdminPinInput('');
                    setAdminPinError('');
                  }}
                  className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-colors cursor-pointer shadow-xs"
                >
                  Unlock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Secure Password Authentication Modal for Winning ON/OFF */}
      {showPassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-xs rounded-2xl bg-white p-5 border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                  <Lock className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-slate-800 tracking-wide uppercase">
                  Security Verification
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPassModal(false);
                  setPassInput('');
                  setPassError('');
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePassSubmit} className="space-y-3">
              <div>
                <input
                  type="password"
                  value={passInput}
                  onChange={(e) => {
                    setPassInput(e.target.value);
                    if (passError) setPassError('');
                  }}
                  placeholder="Enter Password"
                  autoFocus
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-mono text-sm tracking-wider focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
                {passError && (
                  <p className="text-[11px] font-semibold text-rose-500 mt-1">
                    {passError}
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowPassModal(false);
                    setPassInput('');
                    setPassError('');
                  }}
                  className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
