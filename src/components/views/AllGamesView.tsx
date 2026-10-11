import React, { useState } from 'react';
import { Search, Filter, Play, ArrowUpDown, Palette, Dices, Crown, Sparkles, Coins, Zap, Trophy, Layers } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { ALL_GAMES } from '../../data/games';
import { GameCategory, GameId } from '../../types';

export const AllGamesView: React.FC = () => {
  const { selectGame, playSound } = useGame();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<GameCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<'default' | 'multiplier' | 'minBet'>('default');

  const categories: Array<{ id: GameCategory | 'all'; label: string }> = [
    { id: 'all', label: 'All Games (10)' },
    { id: 'prediction', label: 'Predictions' },
    { id: 'dice_cards', label: 'Dice & Cards' },
    { id: 'luck_wheels', label: 'Luck & Wheels' },
    { id: 'arcade', label: 'Arcade & Skill' },
  ];

  const filteredGames = ALL_GAMES.filter((game) => {
    const matchesCategory = selectedCategory === 'all' || game.category === selectedCategory;
    const matchesSearch =
      game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  }).sort((a, b) => {
    if (sortBy === 'multiplier') {
      const getMult = (m: string) => parseFloat(m.replace('x', ''));
      return getMult(b.maxMultiplier) - getMult(a.maxMultiplier);
    }
    if (sortBy === 'minBet') {
      return a.minBet - b.minBet;
    }
    return 0;
  });

  const handleLaunch = (id: GameId) => {
    playSound('click');
    selectGame(id);
  };

  const renderGameIcon = (gameId: GameId) => {
    switch (gameId) {
      case 'color-prediction': return <Palette className="w-5 h-5 text-purple-400" />;
      case 'dice-roll': return <Dices className="w-5 h-5 text-cyan-400" />;
      case 'dragon-tiger': return <Crown className="w-5 h-5 text-amber-400" />;
      case 'lucky-number': return <Sparkles className="w-5 h-5 text-emerald-400" />;
      case 'coin-flip': return <Coins className="w-5 h-5 text-yellow-400" />;
      case 'number-prediction': return <Zap className="w-5 h-5 text-indigo-400" />;
      case 'spin-wheel': return <Trophy className="w-5 h-5 text-emerald-400" />;
      case 'lucky-cards': return <Layers className="w-5 h-5 text-pink-400" />;
      case 'color-match': return <Palette className="w-5 h-5 text-fuchsia-400" />;
      case 'memory-match': return <Sparkles className="w-5 h-5 text-cyan-400" />;
      default: return <Play className="w-5 h-5 text-purple-400" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Page Title & Search Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-rose-600">
            Catalog & Games
          </span>
          <h1 className="text-2xl sm:text-3xl font-black font-display text-slate-900 mt-1">
            All 10 Games
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Choose from high-speed predictions, dice rolls, table cards, and wheel jackpots.
          </p>
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search games..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-full pl-10 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-rose-500 transition-colors shadow-xs"
          />
        </div>
      </div>

      {/* Filter and Sort Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                playSound('click');
                setSelectedCategory(cat.id);
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-rose-500 text-white border-rose-600 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Sort Selector */}
        <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
          <ArrowUpDown className="w-3.5 h-3.5" />
          <span className="font-bold">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:outline-none shadow-xs font-medium cursor-pointer"
          >
            <option value="default">Default</option>
            <option value="multiplier">Highest Multiplier</option>
            <option value="minBet">Lowest Min Bet</option>
          </select>
        </div>
      </div>

      {/* Games Grid */}
      {filteredGames.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredGames.map((game) => (
            <div
              key={game.id}
              onClick={() => handleLaunch(game.id)}
              className="group cursor-pointer rounded-2xl p-4 sm:p-5 bg-white border border-slate-200 hover:border-rose-300 transition-all duration-200 hover:-translate-y-1 hover:shadow-md flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center">
                    {renderGameIcon(game.id)}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                    {game.maxMultiplier} Max
                  </span>
                </div>

                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {game.categoryLabel}
                </span>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-rose-600 transition-colors mt-0.5">
                  {game.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  {game.description}
                </p>
              </div>

              <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Min: ₹{game.minBet}</span>
                <button
                  type="button"
                  className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 text-white font-black text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <span>Play</span>
                  <Play className="w-3 h-3 fill-current" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center rounded-3xl bg-white border border-slate-200 shadow-xs">
          <p className="text-sm font-bold text-slate-800">No games matched your search criteria.</p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
            }}
            className="mt-3 px-4 py-2 rounded-full bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
};
