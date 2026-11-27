import React from 'react';
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
import { NotFoundPage } from './pages/NotFoundPage';

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <SimulatorProvider>
        <BrowserRouter>
          <Routes>
            {/* Public / Fullscreen standalone routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />

            {/* Main App Layout Shell with Collapsible Sidebar & Persistent Header */}
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/learn" element={<LearnPage />} />
              <Route path="/simulator" element={<SimulatorPage />} />
              <Route path="/portfolio" element={<PortfolioPage />} />
              <Route path="/behavioral-insights" element={<BehavioralInsightsPage />} />
              <Route path="/market-replay" element={<MarketReplayPage />} />
              <Route path="/news-explainer" element={<NewsExplainerPage />} />
              <Route path="/challenges" element={<ChallengesPage />} />

              {/* Blockchain, Crypto & Forex Ecosystem Routes */}
              <Route path="/market-intelligence" element={<MarketIntelligencePage />} />
              <Route path="/hot-topics" element={<HotTopicsPage />} />
              <Route path="/forums" element={<CommunityForumsPage />} />
              <Route path="/academy" element={<AcademyPage />} />
              <Route path="/hub" element={<PersonalHubPage />} />
              <Route path="/admin" element={<AdminPage />} />

              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </SimulatorProvider>
    </ErrorBoundary>
  );
};

export default App;
