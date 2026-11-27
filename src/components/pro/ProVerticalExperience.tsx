import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowUpRight,
  CandlestickChart,
  Compass,
  LayoutDashboard,
  MessageSquare,
  ShieldCheck,
  User,
  ShieldAlert,
} from 'lucide-react';
import { Skeleton } from '../common/Skeleton';

const MarketsPage = lazy(() =>
  import('../../pages/MarketsPage').then((m) => ({ default: m.MarketsPage }))
);
const LearningHubPage = lazy(() =>
  import('../../pages/LearningHubPage').then((m) => ({ default: m.LearningHubPage }))
);
const RiskCalculatorPage = lazy(() =>
  import('../../pages/RiskCalculatorPage').then((m) => ({ default: m.RiskCalculatorPage }))
);
const SimulatorPage = lazy(() =>
  import('../../pages/SimulatorPage').then((m) => ({ default: m.SimulatorPage }))
);
const NewsCommunityPage = lazy(() =>
  import('../../pages/NewsCommunityPage').then((m) => ({ default: m.NewsCommunityPage }))
);
const PersonalHubPage = lazy(() =>
  import('../../pages/PersonalHubPage').then((m) => ({ default: m.PersonalHubPage }))
);
const AdminPage = lazy(() =>
  import('../../pages/AdminPage').then((m) => ({ default: m.AdminPage }))
);

interface LazySectionProps {
  id: string;
  title: string;
  subtitle: string;
  fullRoute: string;
  fullLabel: string;
  forceMount?: boolean;
  children: React.ReactNode;
}

const SectionLoader: React.FC = () => (
  <div className="p-6 rounded-2xl bg-surface border border-border space-y-3">
    <Skeleton className="h-6 w-48" />
    <Skeleton className="h-32 w-full" />
  </div>
);

const LazySectionWrapper: React.FC<LazySectionProps> = ({
  id,
  title,
  subtitle,
  fullRoute,
  fullLabel,
  forceMount = false,
  children,
}) => {
  const [hasEntered, setHasEntered] = useState(forceMount);
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (forceMount) {
      setHasEntered(true);
      return;
    }
    if (hasEntered || !ref.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setHasEntered(true);
          observer.disconnect();
        }
      },
      { rootMargin: '280px 0px' }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [forceMount, hasEntered]);

  return (
    <section
      id={id}
      ref={ref}
      className="scroll-mt-24 pt-8 border-t border-border/70 space-y-5 animate-fadeIn"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5">{subtitle}</p>
        </div>
        <Link
          to={fullRoute}
          className="inline-flex items-center gap-1 text-xs font-mono text-gold hover:text-gold-hover shrink-0"
        >
          <span>{fullLabel}</span>
          <ArrowUpRight size={13} />
        </Link>
      </div>

      {hasEntered ? (
        <Suspense fallback={<SectionLoader />}>{children}</Suspense>
      ) : (
        <SectionLoader />
      )}
    </section>
  );
};

interface ProVerticalExperienceProps {
  dashboardContent: React.ReactNode;
}

export const ProVerticalExperience: React.FC<ProVerticalExperienceProps> = ({
  dashboardContent,
}) => {
  const [activeSection, setActiveSection] = useState<string>('section-dashboard');
  const [forcedSections, setForcedSections] = useState<Record<string, boolean>>({});
  const programmaticScrollRef = useRef<boolean>(false);

  // Show Administration section only when user is authorized admin
  const isAdminUser = (() => {
    try {
      const raw = localStorage.getItem('mindmark_user_role') || localStorage.getItem('aurivero_user_role');
      return raw?.toUpperCase() === 'ADMIN';
    } catch {
      return false;
    }
  })();

  const sections = [
    { id: 'section-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'section-market', label: 'Market', icon: Activity },
    { id: 'section-learning', label: 'Learning', icon: Compass },
    { id: 'section-risk', label: 'Risk & Analytics', icon: ShieldCheck },
    { id: 'section-trading', label: 'Trading', icon: CandlestickChart },
    { id: 'section-community', label: 'Community', icon: MessageSquare },
    { id: 'section-personal', label: 'Personal Hub', icon: User },
    ...(isAdminUser ? [{ id: 'section-admin', label: 'Admin', icon: ShieldAlert }] : []),
  ];

  useEffect(() => {
    const ids = sections.map((s) => s.id);
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (programmaticScrollRef.current) return;
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length > 0) {
          setActiveSection(visible[0].target.id);
        }
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: [0.1, 0.25, 0.5] }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [isAdminUser]);

  const scrollToSection = (id: string) => {
    setForcedSections((prev) => ({ ...prev, [id]: true }));
    setActiveSection(id);
    programmaticScrollRef.current = true;
    window.setTimeout(() => {
      const el = document.getElementById(id);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 30);
    window.setTimeout(() => {
      programmaticScrollRef.current = false;
    }, 700);
  };

  return (
    <div className="space-y-10 pb-16">
      {/* Smart Sticky Liquid Glass Section Navigation */}
      <div className="sticky top-2 z-20 rounded-2xl liquid-glass-gold px-2.5 py-2 shadow-glass">
        <nav
          aria-label="Pro Mode vertical sections"
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar"
        >
          {sections.map((sec) => {
            const Icon = sec.icon;
            const active = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => scrollToSection(sec.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all shrink-0 ${
                  active
                    ? 'bg-gold text-background shadow-gold'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated/70'
                }`}
              >
                <Icon size={13} />
                <span>{sec.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* 1. Dashboard (Default Landing Section) */}
      <section id="section-dashboard" className="scroll-mt-24">
        {dashboardContent}
      </section>

      {/* 2. Market */}
      <LazySectionWrapper
        id="section-market"
        title="Market Terminal"
        subtitle="Indian equities (NSE/BSE), global crypto, forex, heatmaps, and multi-factor screeners."
        fullRoute="/markets"
        fullLabel="Open Full Markets"
        forceMount={Boolean(forcedSections['section-market'])}
      >
        <MarketsPage />
      </LazySectionWrapper>

      {/* 3. Learning */}
      <LazySectionWrapper
        id="section-learning"
        title="Learning Studio"
        subtitle="Learning Overview, Scenario Lab, Daily Training, and Weekly Process Reports."
        fullRoute="/learning"
        fullLabel="Open Full Learning Studio"
        forceMount={Boolean(forcedSections['section-learning'])}
      >
        <LearningHubPage />
      </LazySectionWrapper>

      {/* 4. Risk & Analytics */}
      <LazySectionWrapper
        id="section-risk"
        title="Risk & Quantitative Analytics"
        subtitle="Correlated portfolio VaR/CVaR, N×N correlation matrix, ML volatility, and stress testing."
        fullRoute="/markets/risk"
        fullLabel="Open Full Risk & ML Lab"
        forceMount={Boolean(forcedSections['section-risk'])}
      >
        <RiskCalculatorPage />
      </LazySectionWrapper>

      {/* 5. Trading */}
      <LazySectionWrapper
        id="section-trading"
        title="Paper Trading Execution"
        subtitle="Order placement, position sizing, stop-loss controls, and order history."
        fullRoute="/simulator"
        fullLabel="Open Full Simulator"
        forceMount={Boolean(forcedSections['section-trading'])}
      >
        <SimulatorPage />
      </LazySectionWrapper>

      {/* 6. Community */}
      <LazySectionWrapper
        id="section-community"
        title="Financial Community & News"
        subtitle="Market news discussions, hot topics, and community forums."
        fullRoute="/news-community"
        fullLabel="Open Full Community"
        forceMount={Boolean(forcedSections['section-community'])}
      >
        <NewsCommunityPage />
      </LazySectionWrapper>

      {/* 7. Personal Hub */}
      <LazySectionWrapper
        id="section-personal"
        title="Personal Hub"
        subtitle="Profile, preferences, notifications, and workspace settings."
        fullRoute="/hub"
        fullLabel="Open Full Personal Hub"
        forceMount={Boolean(forcedSections['section-personal'])}
      >
        <PersonalHubPage />
      </LazySectionWrapper>

      {/* 8. Administration (Authorized Only) */}
      {isAdminUser && (
        <LazySectionWrapper
          id="section-admin"
          title="Administration"
          subtitle="Moderation, user management, and platform system controls."
          fullRoute="/admin"
          fullLabel="Open Full Admin"
          forceMount={Boolean(forcedSections['section-admin'])}
        >
          <AdminPage />
        </LazySectionWrapper>
      )}
    </div>
  );
};
