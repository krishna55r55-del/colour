import React from 'react';
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
  Crown,
  Zap,
} from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { ALL_GAMES } from '../../data/games';
import { GameId, GameMetadata } from '../../types';

export const HomeView: React.FC = () => {
  const { balance, selectGame, setActiveView, recentlyPlayed, playSound } = useGame();

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
      case 'dragon-tiger':
        return (
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-600 to-red-600 p-0.5 shadow-lg shadow-amber-600/30">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Crown className="w-6 h-6 text-amber-400" />
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
              Fair & Transparent Online Prediction Gaming. Enjoy 10 exciting games including Win Go, Dice Roll, Dragon Tiger, and more with instant results!
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
                All 10 Games
              </button>
            </div>
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

      {/* All 10 Games Responsive Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-6">
          <div>
            <div className="text-xs uppercase tracking-wider font-black text-rose-600 mb-1">
              Complete Arena
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-display text-slate-900">
              All 10 Interactive Games
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
                Seamless gameplay guaranteed. Restore your starting 1,000 balance in profile whenever needed.
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
    </div>
  );
};
