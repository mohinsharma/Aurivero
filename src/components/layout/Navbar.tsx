import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  RotateCcw,
  Bell,
  Menu,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Wallet,
  Sparkles,
  User
} from 'lucide-react';
import { useSimulator } from '../../context/SimulatorContext';
import { INDIAN_INDICES } from '../../data/mockData';
import { SearchModal } from '../common/SearchModal';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

interface NavbarProps {
  onToggleMobileMenu: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileMenu }) => {
  const { virtualCash, totalPortfolioValue, resetPortfolio } = useSimulator();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);
  const navigate = useNavigate();

  const handleConfirmReset = () => {
    resetPortfolio();
    setIsResetModalOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-30 w-full border-b border-border/80 bg-surface/90 backdrop-blur-md">
        {/* Top Mini Ticker Strip */}
        <div className="hidden lg:flex items-center justify-between px-6 py-1 border-b border-border/40 text-[11px] font-mono bg-background/50 text-text-secondary overflow-x-auto">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 text-primary font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              NSE / BSE LIVE (SIMULATED)
            </span>

            {INDIAN_INDICES.map((idx) => {
              const isUp = idx.change >= 0;
              return (
                <div key={idx.name} className="flex items-center gap-1.5">
                  <span className="text-text-muted">{idx.name}:</span>
                  <span className="font-semibold text-text-primary">{idx.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  <span className={`inline-flex items-center text-[10px] ${isUp ? 'text-primary' : 'text-danger'}`}>
                    {isUp ? <TrendingUp size={11} className="mr-0.5" /> : <TrendingDown size={11} className="mr-0.5" />}
                    {isUp ? '+' : ''}{idx.changePercent.toFixed(2)}%
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-4 text-text-muted">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
              IST 09:15 – 15:30 Regular Market Session
            </span>
            <span className="text-warning/80">SEBI Sandbox Educational Environment</span>
          </div>
        </div>

        {/* Main Navbar */}
        <div className="px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Left: Mobile Menu Toggle & Brand Mobile */}
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleMobileMenu}
              className="lg:hidden p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu size={20} />
            </button>

            <Link to="/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-glow">
                {/* Custom Target Mark / Bullseye icon */}
                <svg className="w-5 h-5 text-background" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-lg tracking-wider text-text-primary font-mono group-hover:text-primary transition-colors">
                    BULLSEYE
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20">
                    AI SIM
                  </span>
                </div>
                <span className="text-[10px] text-text-muted hidden sm:inline -mt-0.5">
                  Train your decisions.
                </span>
              </div>
            </Link>
          </div>

          {/* Center: Search Trigger Bar */}
          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="w-full h-10 px-3.5 rounded-xl bg-surface border border-border hover:border-text-secondary/40 text-text-muted hover:text-text-secondary text-xs flex items-center justify-between transition-colors shadow-inner"
            >
              <span className="flex items-center gap-2">
                <Search size={15} />
                <span>Search stocks, lessons, crash replays...</span>
              </span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-text-muted bg-surface-elevated border border-border rounded">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right: Virtual Capital Display, Reset, Search Icon (mobile), Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile Search Icon Button */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="md:hidden p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-elevated"
              aria-label="Search"
            >
              <Search size={18} />
            </button>

            {/* Virtual Capital Chip */}
            <div className="flex items-center gap-2 bg-surface-elevated/90 border border-primary/25 rounded-xl px-3 py-1.5 shadow-sm">
              <div className="p-1 rounded-md bg-primary/10 text-primary hidden sm:block">
                <Wallet size={15} />
              </div>
              <div className="flex flex-col text-right">
                <span className="text-[10px] font-mono text-text-muted uppercase">Virtual Capital</span>
                <span className="font-mono font-bold text-xs sm:text-sm text-primary text-tabular">
                  ₹{totalPortfolioValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
              </div>
              <button
                onClick={() => setIsResetModalOpen(true)}
                title="Reset Virtual Capital to ₹10,00,000"
                className="ml-1 p-1 rounded-md text-text-muted hover:text-warning hover:bg-surface transition-colors"
                aria-label="Reset virtual capital"
              >
                <RotateCcw size={13} />
              </button>
            </div>

            {/* Notifications Button */}
            <div className="relative">
              <button
                onClick={() => setShowNotificationPopup(!showNotificationPopup)}
                className="p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-elevated border border-border/50 transition-colors relative"
                aria-label="View notifications"
              >
                <Bell size={18} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-secondary" />
              </button>

              {showNotificationPopup && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl bg-surface-elevated border border-border shadow-2xl p-4 z-40 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-border/50">
                    <span className="font-bold text-text-primary">Market Simulator Alerts</span>
                    <span className="text-[10px] font-mono text-primary">2 Unread</span>
                  </div>
                  <div className="mt-3 space-y-2.5">
                    <div className="p-2 rounded-lg bg-surface border border-border/40">
                      <div className="font-semibold text-text-primary flex items-center gap-1.5">
                        <Sparkles size={12} className="text-secondary" />
                        <span>Behavioral Insight Generated</span>
                      </div>
                      <p className="text-text-muted text-[11px] mt-0.5">
                        Your disciplined stop-loss placement has raised your Trader Health Score to 88/100.
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-surface border border-border/40">
                      <div className="font-semibold text-text-primary flex items-center gap-1.5">
                        <TrendingUp size={12} className="text-primary" />
                        <span>TCS Crossed Target Milestone</span>
                      </div>
                      <p className="text-text-muted text-[11px] mt-0.5">
                        TCS reached ₹4,180 (+3.22%). Review your profit-taking discipline.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowNotificationPopup(false);
                      navigate('/behavioral-insights');
                    }}
                    className="w-full mt-3 py-1.5 text-center text-[11px] text-secondary hover:underline font-mono"
                  >
                    View All Behavioral Insights →
                  </button>
                </div>
              )}
            </div>

            {/* Profile Avatar / Quick Link */}
            <Link
              to="/settings"
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-surface-elevated transition-colors border border-border/40"
              title="Profile & Settings"
            >
              <div className="w-7 h-7 rounded-lg bg-surface-elevated border border-primary/30 flex items-center justify-center text-primary text-xs font-bold font-mono">
                AM
              </div>
              <span className="hidden xl:inline text-xs font-medium text-text-primary">
                Amay (Novice)
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* Global Search Dialog */}
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {/* Reset Portfolio Confirmation Modal */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title="Reset Virtual Trading Capital"
        description="Are you sure you want to restore your virtual balance back to ₹10,00,000?"
      >
        <div className="space-y-4">
          <p className="text-xs text-text-secondary leading-relaxed">
            This will wipe your simulated open positions and restore ₹10,00,000 in paper cash. Your learning progress and completed course tracks will remain saved.
          </p>

          <div className="p-3 rounded-xl bg-warning/10 border border-warning/20 flex items-start gap-2.5 text-warning text-xs">
            <ShieldAlert size={16} className="flex-shrink-0 mt-0.5" />
            <span>
              In real financial markets, there is no reset button. Use virtual resets thoughtfully to test distinct asset allocation strategies.
            </span>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsResetModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="warning" size="sm" onClick={handleConfirmReset}>
              Reset to ₹10 Lakhs
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
