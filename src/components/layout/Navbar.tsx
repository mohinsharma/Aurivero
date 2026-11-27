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
  User,
  Bot
} from 'lucide-react';
import { useSimulator } from '../../context/SimulatorContext';
import { SearchModal } from '../common/SearchModal';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { ThemeSwitcher } from '../common/ThemeSwitcher';
import { LiveMarketTicker } from '../markets/LiveMarketTicker';
import { api } from '../../services/api';

interface NavbarProps {
  onToggleMobileMenu: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileMenu }) => {
  const { virtualCash, totalPortfolioValue, resetPortfolio, experienceMode, setExperienceMode } = useSimulator();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  React.useEffect(() => {
    api.personalization.getNotifications().then((res) => {
      if (res.success && res.data) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unread_count || 0);
      }
    });
  }, []);

  const handleMarkAsRead = async (notifId: string, actionUrl?: string) => {
    await api.personalization.markNotificationRead(notifId);
    setNotifications((prev) => prev.map((n) => (n.id === notifId ? { ...n, is_read: 1 } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    if (actionUrl) {
      setShowNotificationPopup(false);
      navigate(actionUrl);
    }
  };

  const handleConfirmReset = () => {
    resetPortfolio();
    setIsResetModalOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-30 w-full border-b border-white/[0.07] bg-glass-elevated">
        {/* Live Left-to-Right Bloomberg-Style Market Ticker */}
        <LiveMarketTicker />

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
              <div className="w-9 h-9 rounded-xl bg-surface-elevated border border-gold/40 flex items-center justify-center shadow-gold">
                <svg className="w-5 h-5 text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M8.5 15.5L12 7.5l3.5 8" />
                  <path d="M9.8 13h4.4" />
                </svg>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-base sm:text-lg tracking-[0.14em] text-text-primary group-hover:text-gold transition-colors">
                    AURIVERO
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-gold/10 text-gold border border-gold/25">
                    TERMINAL
                  </span>
                </div>
                <span className="text-[10px] text-text-muted hidden sm:inline -mt-0.5">
                  Financial Intelligence & Risk
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

            {/* Global Beginner / Pro Mode Switch */}
            <div
              role="group"
              aria-label="Experience mode"
              className="flex items-center bg-surface border border-border rounded-xl p-0.5 text-[11px] font-mono"
            >
              <button
                type="button"
                onClick={() => setExperienceMode('beginner')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  experienceMode === 'beginner'
                    ? 'bg-primary text-background font-bold'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Beginner
              </button>
              <button
                type="button"
                onClick={() => setExperienceMode('pro')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  experienceMode === 'pro'
                    ? 'bg-secondary text-background font-bold'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Pro
              </button>
            </div>

            {/* Light / Dark / System Theme Switcher */}
            <ThemeSwitcher compact />

            {/* Learning Studio Quick Link */}
            <Link
              to="/learning"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gold/10 hover:bg-gold/15 border border-gold/25 text-gold text-xs font-medium transition-colors"
              title="Open Learning Studio"
            >
              <Sparkles size={14} />
              <span>Learning</span>
            </Link>

            {/* Notifications Button */}
            <div className="relative">
              <button
                onClick={() => setShowNotificationPopup(!showNotificationPopup)}
                className="p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-elevated border border-border/50 transition-colors relative"
                aria-label="View notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-secondary ring-2 ring-background animate-pulse" />
                )}
              </button>

              {showNotificationPopup && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl bg-surface-elevated border border-border shadow-2xl p-4 z-40 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-border/50">
                    <span className="font-bold text-text-primary flex items-center gap-1.5">
                      <Bell size={13} className="text-secondary" />
                      Platform Notifications
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary/15 text-secondary">
                      {unreadCount} Unread
                    </span>
                  </div>
                  <div className="mt-3 space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {notifications.length === 0 ? (
                      <div className="text-center py-4 text-text-muted">No new alerts.</div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => handleMarkAsRead(n.id, n.action_url)}
                          className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                            n.is_read
                              ? 'bg-surface/50 border-border/30 opacity-75'
                              : 'bg-surface border-secondary/30 hover:border-secondary shadow-sm'
                          }`}
                        >
                          <div className="font-semibold text-text-primary flex items-center justify-between">
                            <span className="truncate">{n.title}</span>
                            {!n.is_read && (
                              <span className="w-1.5 h-1.5 rounded-full bg-secondary flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-text-muted text-[11px] mt-1 leading-snug">
                            {n.message}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setShowNotificationPopup(false);
                      navigate('/hub');
                    }}
                    className="w-full mt-3 py-1.5 text-center text-[11px] text-secondary hover:underline font-mono border-t border-border/40 pt-2"
                  >
                    Open Personal Hub & Saved Items →
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
