import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SimulatorProvider } from './context/SimulatorContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AppLayout } from './components/layout/AppLayout';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { DashboardPage } from './pages/DashboardPage';
import { LearnPage } from './pages/LearnPage';
import { SimulatorPage } from './pages/SimulatorPage';
import { PortfolioPage } from './pages/PortfolioPage';
import { BehavioralInsightsPage } from './pages/BehavioralInsightsPage';
import { MarketReplayPage } from './pages/MarketReplayPage';
import { NewsExplainerPage } from './pages/NewsExplainerPage';
import { ChallengesPage } from './pages/ChallengesPage';
import { SettingsPage } from './pages/SettingsPage';
import { MarketIntelligencePage } from './pages/MarketIntelligencePage';
import { HotTopicsPage } from './pages/HotTopicsPage';
import { CommunityForumsPage } from './pages/CommunityForumsPage';
import { AcademyPage } from './pages/AcademyPage';
import { PersonalHubPage } from './pages/PersonalHubPage';
import { AdminPage } from './pages/AdminPage';
import { MarketsPage } from './pages/MarketsPage';
import { InstrumentDetailPage } from './pages/InstrumentDetailPage';
import { AIBuddyPage } from './pages/AIBuddyPage';
import { MirrorModePage } from './pages/MirrorModePage';
import { ArenaPage } from './pages/ArenaPage';
import { MyProgressPage } from './pages/MyProgressPage';
import { AICoachPage } from './pages/AICoachPage';
import { NewsCommunityPage } from './pages/NewsCommunityPage';
import { NotFoundPage } from './pages/NotFoundPage';

const HeatmapPage = lazy(() => import('./pages/HeatmapPage').then((m) => ({ default: m.HeatmapPage })));
const ChartTerminalPage = lazy(() => import('./pages/ChartTerminalPage').then((m) => ({ default: m.ChartTerminalPage })));
const ScreenerPage = lazy(() => import('./pages/ScreenerPage').then((m) => ({ default: m.ScreenerPage })));
const FinancialNewsPage = lazy(() => import('./pages/FinancialNewsPage').then((m) => ({ default: m.FinancialNewsPage })));
const RiskCalculatorPage = lazy(() => import('./pages/RiskCalculatorPage').then((m) => ({ default: m.RiskCalculatorPage })));

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <SimulatorProvider>
        <BrowserRouter>
          <Suspense fallback={<div className="p-8 text-xs font-mono text-text-muted">Loading module...</div>}>
            <Routes>
            {/* Public / Fullscreen standalone routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />

            {/* Main App Layout Shell with Collapsible Sidebar & Persistent Header */}
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/ai-buddy" element={<AIBuddyPage />} />
              <Route path="/mirror-mode" element={<Navigate to="/arena?tab=mirror" replace />} />
              <Route path="/arena" element={<ArenaPage />} />
              <Route path="/my-progress" element={<MyProgressPage />} />
              <Route path="/news-community" element={<NewsCommunityPage />} />
              <Route path="/community" element={<Navigate to="/news-community?tab=community" replace />} />
              <Route path="/ai-coach" element={<AICoachPage />} />
              <Route path="/learn" element={<LearnPage />} />
              <Route path="/simulator" element={<SimulatorPage />} />
              <Route path="/portfolio" element={<PortfolioPage />} />
              <Route path="/behavioral-insights" element={<BehavioralInsightsPage />} />
              <Route path="/market-replay" element={<MarketReplayPage />} />
              <Route path="/news-explainer" element={<NewsExplainerPage />} />
              <Route path="/challenges" element={<ChallengesPage />} />

              {/* Unified Multi-Asset Markets Routes */}
              <Route path="/markets" element={<MarketsPage />} />
              <Route path="/markets/heatmap" element={<HeatmapPage />} />
              <Route path="/markets/terminal" element={<ChartTerminalPage />} />
              <Route path="/markets/screener" element={<ScreenerPage />} />
              <Route path="/markets/news" element={<Navigate to="/news-community?tab=news" replace />} />
              <Route path="/markets/risk" element={<RiskCalculatorPage />} />
              <Route path="/markets/:tab" element={<MarketsPage />} />
              <Route path="/markets/:assetClass/:symbol" element={<InstrumentDetailPage />} />

              {/* Blockchain, Crypto & Forex Ecosystem Routes */}
              <Route path="/market-intelligence" element={<MarketIntelligencePage />} />
              <Route path="/hot-topics" element={<Navigate to="/news-community?tab=hot-topics" replace />} />
              <Route path="/forums" element={<Navigate to="/news-community?tab=forums" replace />} />
              <Route path="/academy" element={<AcademyPage />} />
              <Route path="/hub" element={<PersonalHubPage />} />
              <Route path="/admin" element={<AdminPage />} />

              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </SimulatorProvider>
    </ErrorBoundary>
  );
};

export default App;
