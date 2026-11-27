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
  ShieldAlert,
  Bot,
  Target,
  Swords
} from 'lucide-react';
import { useSimulator } from '../../context/SimulatorContext';
import { AuriveroLogo } from '../common/AuriveroLogo';

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
    { name: 'News & Hub', path: '/news-community', icon: MessageSquare },
    { name: 'Academy', path: '/academy', icon: GraduationCap },
  ];

  const fullDrawerItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'AI Coach', path: '/ai-coach', icon: Bot },
    { name: 'My Progress', path: '/my-progress', icon: Trophy },
    { name: 'Aurivero Arena', path: '/arena', icon: Swords },
    { name: 'News & Community', path: '/news-community', icon: Newspaper },
    { name: 'Aurivero AI Buddy', path: '/ai-buddy', icon: Bot },
    { name: 'Markets (Stocks, Crypto, FX)', path: '/markets', icon: Coins },
    { name: 'Stocks Heatmap', path: '/markets/heatmap', icon: PieChart },
    { name: 'Market Screener', path: '/markets/screener', icon: Compass },
    { name: 'Pro Charting Terminal', path: '/markets/terminal', icon: CandlestickChart },
    { name: 'Risk & ML Calculator', path: '/markets/risk', icon: ShieldCheck },
    { name: 'Paper Trading Simulator', path: '/simulator', icon: CandlestickChart },
    { name: 'Portfolio Analytics', path: '/portfolio', icon: PieChart },
    { name: 'Market Intelligence (Crypto/FX)', path: '/market-intelligence', icon: Coins },
    { name: 'Learn & Teach Academy', path: '/academy', icon: GraduationCap },
    { name: 'Personal Hub & Bookmarks', path: '/hub', icon: Bookmark },
    { name: 'Behavioral Insights', path: '/behavioral-insights', icon: BrainCircuit },
    { name: 'Historical Market Replay', path: '/market-replay', icon: History },
    { name: 'Market News Explainer', path: '/news-explainer', icon: Newspaper },
    { name: 'Challenges & XP', path: '/challenges', icon: Trophy },
    { name: 'Admin & Moderation', path: '/admin', icon: ShieldAlert },
    { name: 'Profile & Settings', path: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Quick Action Bottom Navigation Bar (Thumb friendly for mobile) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-border px-2 py-1.5 flex items-center justify-around">
        {bottomBarItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-medium transition-colors ${
                isActive ? 'text-primary font-semibold' : 'text-text-secondary hover:text-text-primary'
              }`
            }
          >
            <item.icon size={18} />
            <span>{item.name}</span>
          </NavLink>
        ))}

        <button
          onClick={onCloseMenu}
          className="flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-medium text-text-secondary hover:text-text-primary"
        >
          <Menu size={18} />
          <span>More</span>
        </button>
      </div>

      {/* Slide-over Mobile Navigation Drawer */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/45 backdrop-blur-xs transition-opacity"
            onClick={onCloseMenu}
          />

          {/* Drawer Content */}
          <div className="fixed inset-y-0 left-0 w-4/5 max-w-xs bg-surface border-r border-border p-5 flex flex-col justify-between shadow-xl z-10 animate-in slide-in-from-left duration-200">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <AuriveroLogo size="sm" />
                  <span className="font-bold text-text-primary tracking-tight">Aurivero</span>
                </div>
                <button
                  onClick={onCloseMenu}
                  className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-elevated"
                  aria-label="Close menu"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Capital overview */}
              <div className="mt-4 p-3.5 rounded-2xl bg-[#14171D] dark:bg-[#090D16] border border-transparent dark:border-slate-800 text-white">
                <span className="text-[11px] font-medium text-slate-300">Virtual Capital</span>
                <div className="text-base font-bold text-white tabular-nums mt-0.5">
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
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
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
            <div className="pt-4 border-t border-border text-[11px] text-text-secondary space-y-1.5">
              <div className="flex items-center gap-1.5 text-primary font-semibold">
                <ShieldCheck size={13} />
                <span>Educational Sandbox</span>
              </div>
              <p>Virtual money simulation only. No real money advisory.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
