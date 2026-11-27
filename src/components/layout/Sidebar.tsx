import React, { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  LayoutGrid,
  CandlestickChart,
  Wallet,
  Newspaper,
  TrendingUp,
  Sparkles,
  Users,
  Bookmark,
  Settings,
  ShieldCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  type LucideIcon,
} from 'lucide-react';
import { useSimulator } from '../../context/SimulatorContext';
import { AuriveroLogo } from '../common/AuriveroLogo';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

interface SubItem {
  name: string;
  path: string;
}

interface ExpandableGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  items: SubItem[];
}

const PRIMARY_LINKS = [
  { name: 'Home', path: '/', icon: Home },
  { name: 'Dashboard', path: '/dashboard', icon: LayoutGrid },
  { name: 'Paper Simulator', path: '/simulator', icon: CandlestickChart },
  { name: 'Portfolio', path: '/portfolio', icon: Wallet },
];

const EXPANDABLE_GROUPS: ExpandableGroup[] = [
  {
    id: 'markets',
    label: 'Markets & Fund',
    icon: TrendingUp,
    items: [
      { name: 'Markets Hub', path: '/markets' },
      { name: 'Stocks Heatmap', path: '/markets/heatmap' },
      { name: 'Market Screener', path: '/markets/screener' },
      { name: 'Pro Charting', path: '/markets/terminal' },
      { name: 'Risk & ML Lab', path: '/markets/risk' },
      { name: 'Crypto & FX Hub', path: '/market-intelligence' },
      { name: 'Market Replay', path: '/market-replay' },
      { name: 'Watchlists', path: '/markets/watchlists' },
    ],
  },
  {
    id: 'news',
    label: 'News & Topics',
    icon: Newspaper,
    items: [
      { name: 'Financial News', path: '/markets/news' },
      { name: 'Hot Topics', path: '/hot-topics' },
      { name: 'News Explainer', path: '/news-explainer' },
    ],
  },
  {
    id: 'learning',
    label: 'Learning & Coach',
    icon: Sparkles,
    items: [
      { name: 'AI Buddy', path: '/ai-buddy' },
      { name: 'Learn & Teach Academy', path: '/academy' },
      { name: 'Behavioral Insights', path: '/behavioral-insights' },
      { name: 'Challenges & XP', path: '/challenges' },
      { name: 'Skill Assessment', path: '/onboarding' },
    ],
  },
];

const FOOTER_LINKS = [
  { name: 'Our Community', path: '/forums', icon: Users },
  { name: 'Personal Hub', path: '/hub', icon: Bookmark },
  { name: 'Settings', path: '/settings', icon: Settings },
  { name: 'Staff Admin', path: '/admin', icon: ShieldCheck },
];

export const Sidebar: React.FC = () => {
  const {
    sidebarCollapsed,
    toggleSidebar,
    totalPortfolioValue,
    startingCapital,
    behavioralScore,
    resetPortfolio,
  } = useSimulator();
  const location = useLocation();
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    markets: false,
    news: false,
    learning: false,
  });

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const returnPct =
    startingCapital > 0 ? ((totalPortfolioValue - startingCapital) / startingCapital) * 100 : 0;
  const isPositive = returnPct >= 0;

  const handleConfirmReset = () => {
    resetPortfolio();
    setIsResetModalOpen(false);
  };

  return (
    <>
      <aside
        aria-label="Primary sidebar navigation"
        className={`hidden lg:flex flex-col bg-surface border-r border-border transition-all duration-300 ease-in-out relative z-20 shrink-0 ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Collapse Toggle Button */}
        <button
          type="button"
          onClick={toggleSidebar}
          className="absolute -right-3 top-6 w-6 h-6 rounded-full bg-surface border border-border text-text-secondary hover:text-text-primary flex items-center justify-center shadow-sm z-30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Top Brand Logo */}
        <div
          className={`h-16 flex items-center shrink-0 ${
            sidebarCollapsed ? 'justify-center px-2' : 'px-5'
          }`}
        >
          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <AuriveroLogo size="sm" />
            {!sidebarCollapsed && (
              <span className="font-bold text-lg tracking-tight text-text-primary group-hover:text-primary transition-colors">
                Aurivero
              </span>
            )}
          </Link>
        </div>

        {/* Sleek Black Virtual Capital Card (like earlier GoStock reference) */}
        {!sidebarCollapsed && (
          <div className="mx-4 mt-1 mb-2 p-4 rounded-2xl bg-[#14171D] dark:bg-[#090D16] border border-transparent dark:border-slate-800 text-white relative overflow-hidden shadow-sm">
            {/* Subtle decorative contour lines */}
            <svg
              className="absolute -right-4 -bottom-4 w-28 h-28 text-white/[0.06] pointer-events-none"
              viewBox="0 0 100 100"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="70" cy="70" r="24" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="70" cy="70" r="38" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="70" cy="70" r="52" stroke="currentColor" strokeWidth="1.5" />
            </svg>

            <div className="relative z-10">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-slate-300">
                  Virtual Capital
                </span>
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(true)}
                  title="Reset Virtual Capital to ₹10,00,000"
                  aria-label="Reset virtual capital"
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  <RotateCcw size={13} />
                </button>
              </div>

              <div className="mt-1.5 flex items-baseline justify-between gap-2">
                <span className="text-lg font-bold tracking-tight text-white tabular-nums">
                  ₹{totalPortfolioValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
                <span
                  className={`inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums ${
                    isPositive ? 'text-[#34D399]' : 'text-[#F87171]'
                  }`}
                >
                  {isPositive ? '+' : ''}
                  {returnPct.toFixed(2)}%
                  {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Scrollable Navigation Links */}
        <nav
          className="flex-1 overflow-y-auto px-3.5 py-4 space-y-1.5"
          aria-label="Workspace sections"
        >
          {PRIMARY_LINKS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              title={sidebarCollapsed ? item.name : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13.5px] transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-text-secondary font-medium hover:text-text-primary hover:bg-surface-elevated'
                } ${sidebarCollapsed ? 'justify-center px-0' : ''}`
              }
            >
              <item.icon size={18} className="shrink-0" />
              {!sidebarCollapsed && <span className="truncate">{item.name}</span>}
            </NavLink>
          ))}

          {/* Expandable Clean Groups */}
          {EXPANDABLE_GROUPS.map((group) => {
            const hasActiveChild = group.items.some((sub) => location.pathname === sub.path);
            const isOpen = !sidebarCollapsed && (openGroups[group.id] || hasActiveChild);

            if (sidebarCollapsed) {
              return (
                <NavLink
                  key={group.id}
                  to={group.items[0].path}
                  title={group.label}
                  className={`flex items-center justify-center py-2.5 rounded-xl transition-colors ${
                    hasActiveChild
                      ? 'bg-primary/10 text-primary'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
                  }`}
                >
                  <group.icon size={18} />
                </NavLink>
              );
            }

            return (
              <div key={group.id} className="pt-0.5">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={isOpen}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13.5px] transition-colors ${
                    hasActiveChild
                      ? 'text-primary font-semibold'
                      : 'text-text-secondary font-medium hover:text-text-primary hover:bg-surface-elevated'
                  }`}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <group.icon size={18} className="shrink-0" />
                    <span className="truncate">{group.label}</span>
                  </span>
                  <ChevronDown
                    size={15}
                    className={`shrink-0 text-text-muted transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : 'rotate-0'
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="mt-1 ml-9 space-y-1">
                    {group.items.map((sub) => (
                      <NavLink
                        key={sub.path}
                        to={sub.path}
                        end={sub.path === '/markets'}
                        className={({ isActive }) =>
                          `block px-3 py-1.5 rounded-lg text-[13px] transition-colors truncate ${
                            isActive
                              ? 'text-primary font-semibold bg-primary/10'
                              : 'text-text-secondary font-normal hover:text-text-primary hover:bg-surface-elevated'
                          }`
                        }
                      >
                        {sub.name}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Subtle Divider before Community / Settings */}
          <div className="pt-3 mt-3 border-t border-border">
            {FOOTER_LINKS.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                title={sidebarCollapsed ? item.name : undefined}
                className={({ isActive }) =>
                  `flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-[13.5px] transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-text-secondary font-medium hover:text-text-primary hover:bg-surface-elevated'
                  } ${sidebarCollapsed ? 'justify-center px-0' : ''}`
                }
              >
                <span className="flex items-center gap-3 min-w-0">
                  <item.icon size={18} className="shrink-0" />
                  {!sidebarCollapsed && <span className="truncate">{item.name}</span>}
                </span>
                {!sidebarCollapsed && item.path === '/settings' && (
                  <span
                    className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold tabular-nums"
                    title="Trader Mindset Score"
                  >
                    {behavioralScore.overallHealth}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      </aside>

      {/* Reset Portfolio Confirmation Modal */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title="Reset Virtual Trading Capital"
        description="Are you sure you want to restore your virtual balance back to ₹10,00,000?"
      >
        <div className="space-y-4">
          <p className="text-xs text-text-secondary leading-relaxed">
            This will wipe your simulated open positions and restore ₹10,00,000 in paper cash. Your
            learning progress and completed course tracks will remain saved.
          </p>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-amber-700 dark:text-amber-300 text-xs">
            <ShieldAlert size={16} className="flex-shrink-0 mt-0.5" />
            <span>
              In real financial markets, there is no reset button. Use virtual resets thoughtfully
              to test distinct asset allocation strategies.
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
