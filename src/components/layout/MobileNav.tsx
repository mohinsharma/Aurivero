import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CandlestickChart,
  BookOpen,
  BrainCircuit,
  Menu,
  X,
  PieChart,
  History,
  Newspaper,
  Trophy,
  Settings,
  Compass,
  ShieldCheck,
  RotateCcw,
  Coins,
  Flame,
  MessageSquare,
  GraduationCap,
  Bookmark,
  ShieldAlert
} from 'lucide-react';
import { useSimulator } from '../../context/SimulatorContext';

interface MobileNavProps {
  isMenuOpen: boolean;
  onCloseMenu: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ isMenuOpen, onCloseMenu }) => {
  const { virtualCash, resetPortfolio } = useSimulator();

  const bottomBarItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Markets', path: '/markets', icon: Coins },
    { name: 'Simulator', path: '/simulator', icon: CandlestickChart },
    { name: 'Forums', path: '/forums', icon: MessageSquare },
    { name: 'Academy', path: '/academy', icon: GraduationCap },
  ];

  const fullDrawerItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Markets (Stocks, Crypto, FX)', path: '/markets', icon: Coins },
    { name: 'Stocks Heatmap', path: '/markets/heatmap', icon: PieChart },
    { name: 'Pro Charting Terminal', path: '/markets/terminal', icon: CandlestickChart },
    { name: 'Paper Trading Simulator', path: '/simulator', icon: CandlestickChart },
    { name: 'Portfolio Analytics', path: '/portfolio', icon: PieChart },
    { name: 'Market Intelligence (Crypto/FX)', path: '/market-intelligence', icon: Coins },
    { name: 'Hot Topics & News', path: '/hot-topics', icon: Flame },
    { name: 'Community Forums', path: '/forums', icon: MessageSquare },
    { name: 'Learn & Teach Academy', path: '/academy', icon: GraduationCap },
    { name: 'Personal Hub & Bookmarks', path: '/hub', icon: Bookmark },
    { name: 'Behavioral Insights', path: '/behavioral-insights', icon: BrainCircuit },
    { name: 'Historical Market Replay', path: '/market-replay', icon: History },
    { name: 'Market News Explainer', path: '/news-explainer', icon: Newspaper },
    { name: 'Challenges & XP', path: '/challenges', icon: Trophy },
    { name: 'Admin & Moderation', path: '/admin', icon: ShieldAlert },
    { name: 'Knowledge Assessment', path: '/onboarding', icon: Compass },
    { name: 'Profile & Settings', path: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Quick Action Bottom Navigation Bar (Thumb friendly for mobile) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-lg border-t border-border px-2 py-2 flex items-center justify-around">
        {bottomBarItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-medium transition-colors ${
                isActive ? 'text-primary' : 'text-text-muted hover:text-text-secondary'
              }`
            }
          >
            <item.icon size={19} />
            <span>{item.name}</span>
          </NavLink>
        ))}

        <button
          onClick={onCloseMenu}
          className="flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-medium text-text-muted hover:text-text-secondary"
        >
          <Menu size={19} />
          <span>More</span>
        </button>
      </div>

      {/* Slide-over Mobile Navigation Drawer */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
            onClick={onCloseMenu}
          />

          {/* Drawer Content */}
          <div className="fixed inset-y-0 left-0 w-4/5 max-w-xs bg-surface-elevated border-r border-border p-5 flex flex-col justify-between shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-background font-bold">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" />
                      <circle cx="12" cy="12" r="6" />
                      <circle cx="12" cy="12" r="2" />
                    </svg>
                  </div>
                  <span className="font-mono font-bold text-text-primary tracking-wider">MINDMARK</span>
                </div>
                <button
                  onClick={onCloseMenu}
                  className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface"
                  aria-label="Close menu"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Capital overview */}
              <div className="mt-4 p-3 rounded-xl bg-surface border border-primary/20">
                <span className="text-[10px] font-mono text-text-muted uppercase">Virtual Paper Balance</span>
                <div className="text-base font-bold font-mono text-primary text-tabular mt-0.5">
                  ₹{virtualCash.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </div>
              </div>

              {/* Navigation Links */}
              <nav className="mt-4 space-y-1 max-h-[55vh] overflow-y-auto pr-1">
                {fullDrawerItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onCloseMenu}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-primary/10 text-primary border border-primary/25'
                          : 'text-text-secondary hover:text-text-primary hover:bg-surface'
                      }`
                    }
                  >
                    <item.icon size={16} />
                    <span>{item.name}</span>
                  </NavLink>
                ))}
              </nav>
            </div>

            {/* Bottom Disclaimer */}
            <div className="pt-4 border-t border-border/50 text-[10px] text-text-muted space-y-2">
              <div className="flex items-center gap-1.5 text-warning font-semibold font-mono">
                <ShieldCheck size={13} />
                <span>SEBI EDUCATIONAL COMPLIANCE</span>
              </div>
              <p>Virtual money simulation only. No real money advisory.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
