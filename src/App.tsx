import React, { useState } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { Navbar } from './components/layout/Navbar';
import { MobileNav } from './components/layout/MobileNav';
import { Footer } from './components/layout/Footer';
import { LegalModals, LegalModalType } from './components/common/LegalModals';

// Views
import { HomeView } from './components/views/HomeView';
import { AllGamesView } from './components/views/AllGamesView';
import { HistoryView } from './components/views/HistoryView';
import { ProfileView } from './components/views/ProfileView';
import { DepositView } from './components/views/DepositView';

// 10 Playable Games
import { ColorPredictionGame } from './components/games/ColorPredictionGame';
import { DiceRollGame } from './components/games/DiceRollGame';
import { DragonTigerGame } from './components/games/DragonTigerGame';
import { LuckyNumberGame } from './components/games/LuckyNumberGame';
import { CoinFlipGame } from './components/games/CoinFlipGame';
import { NumberPredictionGame } from './components/games/NumberPredictionGame';
import { SpinWheelGame } from './components/games/SpinWheelGame';
import { LuckyCardsGame } from './components/games/LuckyCardsGame';
import { ColorMatchGame } from './components/games/ColorMatchGame';
import { MemoryMatchGame } from './components/games/MemoryMatchGame';
import { AuthPage } from './components/auth/AuthPage';

const AppContent: React.FC = () => {
  const { activeView, selectedGameId, isAuthenticated } = useGame();
  const [legalModal, setLegalModal] = useState<LegalModalType>(null);

  // Enforce Login Page Requirement
  if (!isAuthenticated) {
    return <AuthPage />;
  }

  // Render the selected interactive game
  const renderGame = () => {
    switch (selectedGameId) {
      case 'color-prediction':
        return <ColorPredictionGame />;
      case 'dice-roll':
        return <DiceRollGame />;
      case 'dragon-tiger':
        return <DragonTigerGame />;
      case 'lucky-number':
        return <LuckyNumberGame />;
      case 'coin-flip':
        return <CoinFlipGame />;
      case 'number-prediction':
        return <NumberPredictionGame />;
      case 'spin-wheel':
        return <SpinWheelGame />;
      case 'lucky-cards':
        return <LuckyCardsGame />;
      case 'color-match':
        return <ColorMatchGame />;
      case 'memory-match':
        return <MemoryMatchGame />;
      default:
        return null;
    }
  };

  // Render navigation views
  const renderView = () => {
    if (selectedGameId) {
      return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 animate-in fade-in duration-200">
          {renderGame()}
        </div>
      );
    }

    switch (activeView) {
      case 'home':
        return <HomeView />;
      case 'all-games':
        return <AllGamesView />;
      case 'history':
        return <HistoryView />;
      case 'profile':
        return <ProfileView />;
      case 'deposit':
        return <DepositView />;
      default:
        return <HomeView />;
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f5f8] text-slate-800 flex flex-col font-sans selection:bg-rose-500 selection:text-white overflow-x-hidden w-full max-w-full">
      {/* Top Navigation */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-full overflow-x-hidden pb-20 md:pb-8">
        {renderView()}
      </main>

      {/* Full Platform Footer */}
      {!selectedGameId && <Footer onOpenLegal={(type) => setLegalModal(type)} />}

      {/* Mobile-First Bottom Nav Bar */}
      <MobileNav />

      {/* Modals */}
      <LegalModals modal={legalModal} onClose={() => setLegalModal(null)} />
    </div>
  );
};

export default function App() {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
}
