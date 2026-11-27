import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CandlestickChart,
  PieChart,
  BrainCircuit,
  History,
  Newspaper,
  BookOpen,
  Trophy,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Compass,
  Sparkles,
  Lock,
  Coins,
  Flame,
  MessageSquare,
  GraduationCap,
  Bookmark,
  ShieldAlert
} from 'lucide-react';
import { useSimulator } from '../../context/SimulatorContext';

export const Sidebar: React.FC = () => {
  const { sidebarCollapsed, toggleSidebar, behavioralScore } = useSimulator();

  const primaryNavItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Paper Simulator', path: '/simulator', icon: CandlestickChart, badge: 'LIVE' },
    { name: 'Portfolio Analytics', path: '/portfolio', icon: PieChart },
  ];

  const intelligenceNavItems = [
    { name: 'Market Intelligence', path: '/market-intelligence', icon: Coins, badge: 'CRYPTO/FX' },
    { name: 'Hot Topics & News', path: '/hot-topics', icon: Flame, badge: 'LIVE' },
    { name: 'Community Forums', path: '/forums', icon: MessageSquare, badge: 'ACTIVE' },
  ];

  const educationNavItems = [
    { name: 'Learn & Teach Academy', path: '/academy', icon: GraduationCap, badge: 'COURSES' },
    { name: 'Behavioral Insights', path: '/behavioral-insights', icon: BrainCircuit, highlight: true },
    { name: 'Market Replay', path: '/market-replay', icon: History, badge: 'Crash Sim' },
    { name: 'News Explainer', path: '/news-explainer', icon: Newspaper },
    { name: 'Challenges & XP', path: '/challenges', icon: Trophy },
  ];

  const utilityNavItems = [
    { name: 'Personal Hub', path: '/hub', icon: Bookmark },
    { name: 'Admin & Moderation', path: '/admin', icon: ShieldAlert, badge: 'STAFF' },
    { name: 'Skill Assessment', path: '/onboarding', icon: Compass },
    { name: 'Profile & Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside
      className={`hidden lg:flex flex-col border-r border-border/80 bg-surface/75 backdrop-blur-xl transition-all duration-300 ease-in-out relative z-20 ${
        sidebarCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Collapse Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-6 w-6 h-6 rounded-full bg-surface-elevated border border-border text-text-secondary hover:text-text-primary flex items-center justify-center shadow-md z-30 transition-transform"
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Behavioral Health Quick Badge (when expanded) */}
      {!sidebarCollapsed && (
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
          <p className="text-[10px] text-text-muted mt-1.5 leading-tight">
            Low FOMO • High Stop-loss adherence
          </p>
        </div>
      )}

      {/* Nav Link Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Core Trading */}
        <div>
          {!sidebarCollapsed && (
            <div className="px-3 pb-1.5 text-[10px] font-mono uppercase tracking-wider text-text-muted">
              Market Engine
            </div>
          )}
          <nav className="space-y-1">
            {primaryNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all group ${
                    isActive
                      ? 'bg-primary/10 text-primary border border-primary/25 shadow-glow'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated/80'
                  } ${sidebarCollapsed ? 'justify-center px-0' : ''}`
                }
                title={sidebarCollapsed ? item.name : undefined}
              >
                <item.icon size={18} className="flex-shrink-0 transition-transform group-hover:scale-105" />
                {!sidebarCollapsed && (
                  <span className="flex-1 flex items-center justify-between">
                    <span>{item.name}</span>
                    {item.badge && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 font-semibold">
                        {item.badge}
                      </span>
                    )}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Intelligence, Web3 & Community */}
        <div>
          {!sidebarCollapsed && (
            <div className="px-3 pb-1.5 text-[10px] font-mono uppercase tracking-wider text-text-muted">
              Crypto, Forex & Forums
            </div>
          )}
          <nav className="space-y-1">
            {intelligenceNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all group ${
                    isActive
                      ? 'bg-primary/10 text-primary border border-primary/25 shadow-glow'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated/80'
                  } ${sidebarCollapsed ? 'justify-center px-0' : ''}`
                }
                title={sidebarCollapsed ? item.name : undefined}
              >
                <item.icon size={18} className="flex-shrink-0 transition-transform group-hover:scale-105" />
                {!sidebarCollapsed && (
                  <span className="flex-1 flex items-center justify-between">
                    <span>{item.name}</span>
                    {item.badge && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-secondary/20 text-secondary border border-secondary/30 font-semibold">
                        {item.badge}
                      </span>
                    )}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Education & Behavioral */}
        <div>
          {!sidebarCollapsed && (
            <div className="px-3 pb-1.5 text-[10px] font-mono uppercase tracking-wider text-text-muted">
              Learning & Psychology
            </div>
          )}
          <nav className="space-y-1">
            {educationNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all group ${
                    isActive
                      ? 'bg-secondary/10 text-secondary border border-secondary/25'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated/80'
                  } ${sidebarCollapsed ? 'justify-center px-0' : ''}`
                }
                title={sidebarCollapsed ? item.name : undefined}
              >
                <item.icon size={18} className="flex-shrink-0 transition-transform group-hover:scale-105" />
                {!sidebarCollapsed && (
                  <span className="flex-1 flex items-center justify-between">
                    <span>{item.name}</span>
                    {item.badge && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-surface-elevated text-text-secondary border border-border">
                        {item.badge}
                      </span>
                    )}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Utility / Account */}
        <div>
          {!sidebarCollapsed && (
            <div className="px-3 pb-1.5 text-[10px] font-mono uppercase tracking-wider text-text-muted">
              Preferences & System
            </div>
          )}
          <nav className="space-y-1">
            {utilityNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all group ${
                    isActive
                      ? 'bg-surface-elevated text-text-primary border border-border'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated/50'
                  } ${sidebarCollapsed ? 'justify-center px-0' : ''}`
                }
                title={sidebarCollapsed ? item.name : undefined}
              >
                <item.icon size={18} className="flex-shrink-0" />
                {!sidebarCollapsed && <span>{item.name}</span>}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      {/* SEBI Compliance Bottom Pill */}
      <div className="p-3 border-t border-border/60">
        {!sidebarCollapsed ? (
          <div className="p-2.5 rounded-xl bg-background/50 border border-border text-[10px] text-text-muted space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-warning font-mono">
              <ShieldCheck size={12} />
              <span>SEBI COMPLIANT</span>
            </div>
            <p className="leading-tight">
              100% Educational Simulation. No real money risk. No investment advice.
            </p>
          </div>
        ) : (
          <div className="flex justify-center" title="100% Educational Simulation">
            <ShieldCheck size={16} className="text-warning" />
          </div>
        )}
      </div>
    </aside>
  );
};
