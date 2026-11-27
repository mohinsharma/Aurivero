import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CandlestickChart,
  PieChart,
  BrainCircuit,
  History,
  Newspaper,
  Trophy,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  Compass,
  Sparkles,
  Coins,
  Flame,
  MessageSquare,
  GraduationCap,
  Bookmark,
  ShieldAlert,
  type LucideIcon,
  Bot,
  Target,
  Swords
} from 'lucide-react';
import { useSimulator } from '../../context/SimulatorContext';

interface NavItem {
  name: string;
  path: string;
  icon: LucideIcon;
  badge?: string;
}

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    items: [{ name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard }],
  },
  {
    id: 'markets',
    label: 'Markets',
    items: [
      { name: 'Markets Hub', path: '/markets', icon: Coins, badge: 'LIVE' },
      { name: 'Stocks Heatmap', path: '/markets/heatmap', icon: Sparkles, badge: 'MAP' },
      { name: 'Market Screener', path: '/markets/screener', icon: Compass },
      { name: 'Crypto & FX Hub', path: '/market-intelligence', icon: Coins },
    ],
  },
  {
    id: 'analysis',
    label: 'Analysis',
    items: [
      { name: 'Pro Charting', path: '/markets/terminal', icon: CandlestickChart, badge: 'PRO' },
      { name: 'Risk & ML Lab', path: '/markets/risk', icon: ShieldCheck, badge: 'RISK' },
      { name: 'Portfolio Analytics', path: '/portfolio', icon: PieChart },
      { name: 'Paper Simulator', path: '/simulator', icon: CandlestickChart },
      { name: 'Market Replay', path: '/market-replay', icon: History },
    ],
  },
  {
    id: 'ai_intelligence',
    label: 'AI Intelligence',
    items: [
      { name: 'AI Coach', path: '/ai-coach', icon: Sparkles, badge: 'COACH' },
    ],
  },
  {
    id: 'news_community',
    label: 'News & Community',
    items: [
      { name: 'News & Community', path: '/news-community', icon: Newspaper, badge: 'HUB' },
      { name: 'News Explainer', path: '/news-explainer', icon: Newspaper },
    ],
  },
  {
    id: 'learning',
    label: 'Learning',
    items: [
      { name: 'Learning Studio', path: '/learning', icon: GraduationCap, badge: 'HUB' },
      { name: 'My Progress', path: '/my-progress', icon: Trophy, badge: 'XP' },
      { name: 'Arena', path: '/arena', icon: Swords, badge: 'COMPETE' },
      { name: 'Learn & Teach Academy', path: '/academy', icon: GraduationCap },
      { name: 'Behavioral Insights', path: '/behavioral-insights', icon: BrainCircuit },
      { name: 'Challenges & XP', path: '/challenges', icon: Trophy },
    ],
  },
  {
    id: 'workspace',
    label: 'Personal Workspace',
    items: [
      { name: 'Watchlists', path: '/markets/watchlists', icon: Bookmark },
      { name: 'Personal Hub', path: '/hub', icon: Bookmark },
    ],
  },
  {
    id: 'settings_admin',
    label: 'Settings & Admin',
    items: [
      { name: 'Profile & Settings', path: '/settings', icon: Settings },
      { name: 'Admin & Moderation', path: '/admin', icon: ShieldAlert, badge: 'STAFF' },
    ],
  },
];

const BEGINNER_PRIMARY_GROUPS: NavGroup[] = [
  {
    id: 'beginner_core',
    label: 'Start Here',
    items: [
      { name: 'Home', path: '/dashboard', icon: LayoutDashboard },
      { name: 'Learn', path: '/academy', icon: GraduationCap },
      { name: 'Practice (Paper Trading)', path: '/simulator', icon: CandlestickChart },
      { name: 'My Portfolio', path: '/portfolio', icon: PieChart },
      { name: 'Explore Markets', path: '/markets', icon: Coins },
      { name: 'AI Buddy', path: '/ai-buddy', icon: Bot },
    ],
  },
];

const BEGINNER_ADVANCED_TOOLS: NavGroup = {
  id: 'advanced_tools',
  label: 'Explore Advanced Tools',
  items: [
    { name: 'Pro Charting', path: '/markets/terminal', icon: CandlestickChart },
    { name: 'Market Replay', path: '/market-replay', icon: History },
    { name: 'Market Screener', path: '/markets/screener', icon: Compass },
    { name: 'Stocks Heatmap', path: '/markets/heatmap', icon: Sparkles },
    { name: 'Risk & ML Lab', path: '/markets/risk', icon: ShieldCheck },
    { name: 'Behavioral Insights', path: '/behavioral-insights', icon: BrainCircuit },
    { name: 'Arena & Mirror', path: '/arena', icon: Trophy },
    { name: 'News & Community', path: '/news-community', icon: Newspaper },
    { name: 'AI Coach', path: '/ai-coach', icon: Sparkles },
    { name: 'My Progress', path: '/my-progress', icon: Trophy },
  ],
};

export const Sidebar: React.FC = () => {
  const { sidebarCollapsed, toggleSidebar, behavioralScore, experienceMode } = useSimulator();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    overview: true,
    ai_intelligence: true,
    markets: true,
    analysis: true,
    news_community: true,
    learning: false,
    workspace: true,
    settings_admin: false,
    beginner_core: true,
    advanced_tools: false,
  });

  const activeGroups =
    experienceMode === 'beginner'
      ? [...BEGINNER_PRIMARY_GROUPS, BEGINNER_ADVANCED_TOOLS]
      : NAV_GROUPS;

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <aside
      aria-label="Primary sidebar navigation"
      className={`hidden lg:flex flex-col border-r border-border/80 bg-surface/75 backdrop-blur-xl transition-all duration-300 ease-in-out relative z-20 ${
        sidebarCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      <button
        type="button"
        onClick={toggleSidebar}
        className="absolute -right-3 top-6 w-6 h-6 rounded-full bg-surface-elevated border border-border text-text-secondary hover:text-text-primary flex items-center justify-center shadow-md z-30 transition-transform focus:outline-none focus:ring-2 focus:ring-primary"
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {!sidebarCollapsed && experienceMode === 'pro' && (
        <div className="mx-4 mt-4 p-3 rounded-xl bg-surface-elevated/70 border border-primary/20">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted flex items-center gap-1.5 font-mono">
              <Sparkles size={13} className="text-primary" />
              Trader Mindset
            </span>
            <span className="font-mono font-bold text-primary text-tabular">
              {behavioralScore.overallHealth}/100
            </span>
          </div>
          <div className="mt-2 w-full bg-background rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-primary to-secondary h-full rounded-full transition-all duration-500"
              style={{ width: `${behavioralScore.overallHealth}%` }}
            />
          </div>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-3" aria-label="Workspace sections">
        {activeGroups.map((group) => {
          const isOpen = sidebarCollapsed || openGroups[group.id];
          return (
            <div key={group.id}>
              {!sidebarCollapsed && (
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={openGroups[group.id]}
                  className="w-full px-3 py-1.5 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-text-muted hover:text-text-primary rounded-lg transition-colors"
                >
                  <span>{group.label}</span>
                  <ChevronDown
                    size={12}
                    className={`transition-transform ${openGroups[group.id] ? 'rotate-0' : '-rotate-90'}`}
                  />
                </button>
              )}

              {isOpen && (
                <div className="space-y-1 mt-1">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === '/markets'}
                      title={sidebarCollapsed ? item.name : undefined}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all group ${
                          isActive
                            ? 'bg-primary/10 text-primary border border-primary/25 shadow-glow'
                            : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated/80'
                        } ${sidebarCollapsed ? 'justify-center px-0' : ''}`
                      }
                    >
                      <item.icon size={17} className="flex-shrink-0 transition-transform group-hover:scale-105" />
                      {!sidebarCollapsed && (
                        <span className="flex-1 flex items-center justify-between min-w-0">
                          <span className="truncate">{item.name}</span>
                          {item.badge && (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30 font-semibold ml-1.5">
                              {item.badge}
                            </span>
                          )}
                        </span>
                      )}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
};
