import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  Menu,
  Mail,
  ChevronDown,
  Bot,
  Sun,
  Moon,
} from 'lucide-react';
import { useSimulator } from '../../context/SimulatorContext';
import { SearchModal } from '../common/SearchModal';
import { AuriveroLogo } from '../common/AuriveroLogo';
import { api } from '../../services/api';

interface NavbarProps {
  onToggleMobileMenu: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileMenu }) => {
  const { theme, toggleTheme, experienceMode, setExperienceMode } = useSimulator();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    api.personalization.getNotifications().then((res) => {
      if (res.success && res.data) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unread_count || 0);
      }
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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

  return (
    <>
      <header className="sticky top-0 z-30 w-full bg-surface border-b border-border">
        <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Left: Mobile Menu + Minimal Search Trigger */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              type="button"
              onClick={onToggleMobileMenu}
              className="lg:hidden p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu size={20} />
            </button>

            <Link to="/dashboard" className="lg:hidden flex items-center gap-2 shrink-0">
              <AuriveroLogo size="sm" />
              <span className="font-bold text-base tracking-tight text-text-primary">Aurivero</span>
            </Link>

            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="hidden sm:flex items-center justify-between w-full max-w-sm h-10 px-3.5 rounded-xl bg-background hover:bg-surface-elevated border border-border text-xs text-text-secondary transition-colors"
            >
              <span className="flex items-center gap-2.5 truncate">
                <Search size={15} className="text-text-muted shrink-0" />
                <span className="truncate">Press &ldquo;⌘K&rdquo; to search stocks, lessons...</span>
              </span>
            </button>
          </div>

          {/* Right: Clean Utility Icons, Theme Switch, Notifications & Profile */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="sm:hidden p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-elevated"
              aria-label="Search"
            >
              <Search size={18} />
            </button>

            {/* Light / Dark Mode Switch (Uses Cobalt/Neutral UI, never Trade Green/Red) */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="p-2 rounded-xl text-text-secondary hover:text-primary hover:bg-surface-elevated border border-transparent hover:border-border transition-colors"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Global Beginner / Pro Mode Switch */}
            <div
              role="group"
              aria-label="Experience mode"
              className="flex items-center bg-background border border-border rounded-xl p-0.5 text-xs"
            >
              <button
                type="button"
                onClick={() => setExperienceMode('beginner')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  experienceMode === 'beginner'
                    ? 'bg-primary text-white font-semibold'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Beginner
              </button>
              <button
                type="button"
                onClick={() => setExperienceMode('pro')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  experienceMode === 'pro'
                    ? 'bg-primary text-white font-semibold'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Pro
              </button>
            </div>

            {/* Quick AI Buddy Link */}
            <Link
              to="/ai-buddy"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background hover:bg-primary/10 border border-border hover:border-primary/30 text-xs font-semibold text-text-primary hover:text-primary transition-colors"
              title="Open Aurivero AI Buddy (Finance Assistant)"
            >
              <Bot size={15} className="text-primary" />
              <span>AI Buddy</span>
            </Link>

            {/* Personal Hub / Saved Messages Icon */}
            <Link
              to="/hub"
              className="p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors"
              aria-label="Personal Hub & Saved Items"
              title="Personal Hub"
            >
              <Mail size={18} />
            </Link>

            {/* Notifications Button (Uses Primary Cobalt Badge, not Trade Loss Red) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotificationPopup(!showNotificationPopup)}
                className="p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors relative"
                aria-label="View notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotificationPopup && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-surface border border-border shadow-xl p-4 z-40 text-xs">
                  <div className="flex items-center justify-between pb-2.5 border-b border-border">
                    <span className="font-bold text-text-primary flex items-center gap-1.5">
                      <Bell size={14} className="text-primary" />
                      Notifications
                    </span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary tabular-nums">
                      {unreadCount} Unread
                    </span>
                  </div>
                  <div className="mt-3 space-y-2 max-h-72 overflow-y-auto pr-1">
                    {notifications.length === 0 ? (
                      <div className="text-center py-4 text-text-secondary">No new alerts.</div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => handleMarkAsRead(n.id, n.action_url)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer ${
                            n.is_read
                              ? 'bg-background border-border/60 opacity-75'
                              : 'bg-surface border-border hover:border-primary/40 shadow-sm'
                          }`}
                        >
                          <div className="font-semibold text-text-primary flex items-center justify-between gap-2">
                            <span className="truncate">{n.title}</span>
                            {!n.is_read && (
                              <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-text-secondary text-[11px] mt-1 leading-snug">
                            {n.message}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNotificationPopup(false);
                      navigate('/hub');
                    }}
                    className="w-full mt-3 py-2 text-center text-xs text-primary hover:underline font-semibold border-t border-border pt-2.5"
                  >
                    Open Personal Hub &amp; Saved Items →
                  </button>
                </div>
              )}
            </div>

            <span className="hidden sm:block h-6 w-px bg-border" aria-hidden="true" />

            {/* Profile Avatar & Name Link */}
            <Link
              to="/settings"
              className="flex items-center gap-2.5 py-1 px-1.5 rounded-xl hover:bg-surface-elevated transition-colors"
              title="Profile & Settings"
            >
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold shadow-sm">
                AP
              </div>
              <span className="hidden md:inline text-sm font-medium text-text-primary">
                Amay Puri
              </span>
              <ChevronDown size={14} className="hidden md:inline text-text-secondary" />
            </Link>
          </div>
        </div>
      </header>

      {/* Global Search Dialog */}
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
};
