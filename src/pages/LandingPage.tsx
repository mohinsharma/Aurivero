import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BrainCircuit,
  CandlestickChart,
  Check,
  Coins,
  Globe2,
  Layers,
  LineChart,
  Menu,
  ShieldCheck,
  TrendingUp,
  X,
} from 'lucide-react';
import { HeroDashboardMockup } from '../components/landing/HeroDashboardMockup';
import { BentoShowcase } from '../components/landing/BentoShowcase';
import { COMPARISON_ITEMS, FOOTER_COLUMNS } from '../components/landing/landingData';
import { AuriveroLogo } from '../components/common/AuriveroLogo';

const NAV_LINKS = [
  { label: 'Platform', href: '#platform' },
  { label: 'Features', href: '#features' },
  { label: 'Simulator', href: '#simulator' },
  { label: 'Pricing', href: '#pricing' },
];

const CORE_VALUES = [
  {
    icon: LineChart,
    title: 'Live Market Terminal',
    description:
      'Clean institutional charting paired with instant simulated order tickets and sub-second price updates.',
    to: '/simulator',
  },
  {
    icon: BrainCircuit,
    title: 'Smart Risk & Behavior Coach',
    description:
      'Track execution discipline, real win rate, and emotional tilt patterns automatically after every trade.',
    to: '/behavioral-insights',
  },
  {
    icon: ShieldCheck,
    title: 'Zero-Risk Paper Trading',
    description:
      'Stress-test entries, stops, and multi-asset strategies against real-time pricing before risking capital.',
    to: '/learn',
  },
];

const ECOSYSTEM_CLASSES = [
  { label: 'Equities', icon: TrendingUp },
  { label: 'Crypto', icon: Coins },
  { label: 'Forex', icon: Globe2 },
  { label: 'Indices', icon: Layers },
];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNewsletterSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newsletterEmail.trim()) return;
    setNewsletterSubscribed(true);
    setNewsletterEmail('');
  };

  return (
    <div className="min-h-screen bg-white text-[#0F172A] font-jakarta overflow-x-hidden antialiased selection:bg-[#2563EB]/15 selection:text-[#2563EB]">
      {/* A. Sticky Navigation Bar */}
      <header className="sticky top-0 z-50 px-4 sm:px-6 lg:px-8 pt-4 pb-2 pointer-events-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Left: Brand Logo + Name (outside glass pill) */}
          <Link
            to="/"
            className="pointer-events-auto flex items-center gap-2.5 rounded-lg px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            <AuriveroLogo size="sm" />
            <span className="font-bold text-lg tracking-tight text-[#0F172A]">Aurivero</span>
          </Link>

          {/* Center: Compact Transparent Glassmorphic Nav Pill ONLY */}
          <nav
            className="pointer-events-auto hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-full backdrop-blur-lg bg-white/25 border border-white/55 ring-1 ring-slate-900/5 shadow-sm"
            aria-label="Primary navigation"
          >
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-[#0F172A]/85 hover:text-[#0F172A] hover:bg-white/45 transition-colors rounded-full px-3.5 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Right: Log in + Start Trading CTA (outside glass pill) */}
          <div className="pointer-events-auto hidden md:flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/auth')}
              className="px-3.5 py-2 text-sm font-semibold text-[#475569] hover:text-[#0F172A] rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => navigate('/simulator')}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              <span>Start Trading</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {/* Mobile Drawer Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-drawer"
            className="pointer-events-auto md:hidden p-2 rounded-full text-[#0F172A] backdrop-blur-lg bg-white/40 hover:bg-white/70 border border-white/60 ring-1 ring-slate-900/5 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" aria-hidden="true" />
            ) : (
              <Menu className="w-5 h-5" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Accessible Mobile Drawer */}
        {mobileMenuOpen && (
          <div
            id="mobile-nav-drawer"
            className="pointer-events-auto md:hidden mt-2 max-w-7xl mx-auto rounded-2xl border border-white/80 ring-1 ring-slate-200/70 backdrop-blur-xl bg-white/90 px-4 py-5 space-y-4 shadow-xl"
          >
            <nav className="flex flex-col space-y-2" aria-label="Mobile navigation">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2.5 rounded-xl text-sm font-semibold text-[#0F172A] hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  {link.label}
                </a>
              ))}
            </nav>

            <div className="pt-3 border-t border-slate-200 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/auth');
                }}
                className="w-full py-2.5 px-4 rounded-full border border-slate-200 text-sm font-semibold text-[#0F172A] hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/simulator');
                }}
                className="w-full py-2.5 px-4 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold inline-flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                <span>Start Trading</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="-mt-[84px]">
        {/* B. Catchy Hero Section (Primary Focal Point) */}
        <section className="relative pt-28 sm:pt-36 pb-16 sm:pb-24 bg-[radial-gradient(ellipse_at_top,_#DBEAFE_0%,_#EEF2FF_42%,_#FFFFFF_82%)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 border border-slate-200/80 shadow-sm text-xs font-semibold text-[#0F172A] mb-6">
              <span className="w-2 h-2 rounded-full bg-[#10B981]" aria-hidden="true" />
              <span>Real-time Analytics &amp; Paper Trading</span>
            </div>

            <h1 className="max-w-4xl mx-auto text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#0F172A] leading-[1.12]">
              Master the markets, trade smarter —{' '}
              <span className="font-serif-accent italic font-normal text-5xl sm:text-6xl lg:text-[4.25rem] text-[#2563EB]">
                Effortlessly.
              </span>
            </h1>

            <p className="mt-6 max-w-2xl mx-auto text-base sm:text-lg text-[#475569] leading-relaxed">
              Practice institutional-grade execution with zero capital at risk, uncover behavioral
              biases in real time, and trade with complete market clarity.
            </p>

            {/* Dual Pill CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <button
                type="button"
                onClick={() => navigate('/simulator')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold shadow-md shadow-blue-600/20 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              >
                <span>Launch Terminal</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-white hover:bg-[#F8FAFC] text-[#0F172A] text-sm font-semibold border border-slate-200 shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              >
                <span>Explore Demo</span>
              </button>
            </div>

            {/* Centerpiece: Interactive Coded Dashboard Mockup */}
            <HeroDashboardMockup />
          </div>
        </section>

        {/* C. Trust & Ecosystem Bar */}
        <section
          className="py-10 bg-white border-y border-slate-200/70"
          aria-label="Supported market feeds and asset classes"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-[#475569] text-center md:text-left">
              Built for modern traders &amp; analysts
            </p>

            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
              {ECOSYSTEM_CLASSES.map(({ label, icon: Icon }) => (
                <div key={label} className="flex items-center gap-2 text-[#475569]">
                  <Icon className="w-4 h-4 text-[#0F172A]" aria-hidden="true" />
                  <span className="text-sm font-semibold text-[#0F172A]">{label}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 text-[#475569]">
                <CandlestickChart className="w-4 h-4 text-[#0F172A]" aria-hidden="true" />
                <span className="text-sm font-semibold text-[#0F172A]">Live Data Feeds</span>
              </div>
            </div>
          </div>
        </section>

        {/* D. 3-Column Core Value Row */}
        <section id="platform" className="py-20 sm:py-24 bg-white" aria-labelledby="core-value-heading">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto text-center mb-14">
              <h2
                id="core-value-heading"
                className="text-3xl sm:text-4xl font-bold tracking-tight text-[#0F172A]"
              >
                Where market clarity meets execution —{' '}
                <span className="font-serif-accent italic font-normal text-4xl sm:text-5xl text-[#2563EB]">
                  Flawlessly.
                </span>
              </h2>
              <p className="mt-4 text-base text-[#475569]">
                Designed to strip away terminal noise so every order reflects measured conviction,
                not guesswork.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {CORE_VALUES.map(({ icon: Icon, title, description, to }) => (
                <article
                  key={title}
                  className="rounded-2xl bg-white border border-slate-200 p-7 hover:border-blue-200 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center mb-5">
                      <Icon className="w-6 h-6" aria-hidden="true" />
                    </div>
                    <h3 className="text-lg font-bold text-[#0F172A]">{title}</h3>
                    <p className="mt-2.5 text-sm text-[#475569] leading-relaxed">{description}</p>
                  </div>

                  <div className="mt-6">
                    <Link
                      to={to}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#2563EB] hover:text-[#1D4ED8] rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                    >
                      <span>Learn more</span>
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* E. Bento Grid Feature Showcase */}
        <BentoShowcase />

        {/* F. Comparison & Transparent Access Section */}
        <section id="pricing" className="py-20 sm:py-24 bg-[#F8FAFC] border-t border-slate-200/70" aria-labelledby="comparison-heading">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white border border-slate-200 text-xs font-semibold text-[#0F172A] mb-4">
                <span className="text-[#2563EB] font-bold tabular-nums">₹0 / forever</span>
                <span className="text-[#475569]">• Full Paper Trading &amp; Behavior Coach</span>
              </div>

              <h2
                id="comparison-heading"
                className="text-3xl sm:text-4xl font-bold tracking-tight text-[#0F172A]"
              >
                Why choose Aurivero over legacy platforms
              </h2>
              <p className="mt-3 text-base text-[#475569]">
                Compare outdated, intimidating terminals against a focused workspace built for
                disciplined growth.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              {/* Left Column: Traditional Brokers / Cluttered Terminals */}
              <div className="rounded-3xl bg-white border border-slate-200 p-7 sm:p-9">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
                  Status Quo
                </p>
                <h3 className="mt-1 text-xl font-bold text-[#0F172A]">
                  Traditional Brokers / Cluttered Terminals
                </h3>

                <ul className="mt-7 space-y-4">
                  {COMPARISON_ITEMS.map((item) => (
                    <li key={item.legacy} className="flex items-start gap-3">
                      <span
                        className="mt-0.5 w-6 h-6 rounded-full bg-[#FEF2F2] text-[#EF4444] flex items-center justify-center shrink-0"
                        aria-hidden="true"
                      >
                        <X className="w-3.5 h-3.5" />
                      </span>
                      <span className="text-sm text-[#475569] leading-relaxed">{item.legacy}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Right Column: Highlighted Cobalt-Blue Aurivero Card */}
              <div className="rounded-3xl bg-[#2563EB] text-white p-7 sm:p-9 shadow-xl shadow-blue-600/15 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-blue-50">
                      Modern Workspace
                    </p>
                    <span className="px-3 py-1 rounded-full bg-white/15 text-white text-xs font-semibold">
                      Recommended
                    </span>
                  </div>
                  <h3 className="mt-1 text-xl font-bold text-white">Aurivero</h3>

                  <ul className="mt-7 space-y-4">
                    {COMPARISON_ITEMS.map((item) => (
                      <li key={item.aurivero} className="flex items-start gap-3">
                        <span
                          className="mt-0.5 w-6 h-6 rounded-full bg-white/20 text-white flex items-center justify-center shrink-0"
                          aria-hidden="true"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </span>
                        <span className="text-sm text-white/95 leading-relaxed font-medium">
                          {item.aurivero}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 pt-6 border-t border-white/20 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs text-blue-50">Paper Trading Tier</p>
                    <p className="text-lg font-bold text-white tabular-nums">₹0 / month</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/simulator')}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-white text-[#0F172A] hover:bg-blue-50 text-sm font-semibold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#2563EB]"
                  >
                    <span>Start Free Simulation</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* G. Pre-Footer CTA & Rounded Card Footer */}
        <section className="pt-20 pb-10 bg-gradient-to-b from-white via-[#EEF2FF] to-[#DBEAFE]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Pre-Footer CTA */}
            <div className="max-w-2xl mx-auto text-center pb-16">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0F172A]">
                Ready to Take Control of Your{' '}
                <span className="font-serif-accent italic font-normal text-4xl sm:text-5xl text-[#2563EB]">
                  Trades?
                </span>
              </h2>
              <p className="mt-4 text-base text-[#475569]">
                Open your simulated Aurivero terminal in seconds and build real trading discipline
                with zero risk.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
                <button
                  type="button"
                  onClick={() => navigate('/simulator')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold shadow-md shadow-blue-600/20 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                >
                  <span>Start Trading</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/auth')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-white hover:bg-[#F8FAFC] text-[#0F172A] text-sm font-semibold border border-slate-200 shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                >
                  <span>Create Free Account</span>
                </button>
              </div>
            </div>

            {/* Nested Crisp White Rounded Footer Container */}
            <footer className="rounded-3xl bg-white p-8 sm:p-10 shadow-sm border border-slate-200/70">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 pb-10 border-b border-slate-200">
                {/* Left: Brand Logo + Newsletter Signup */}
                <div className="lg:col-span-4 space-y-4">
                  <Link
                    to="/"
                    className="inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  >
                    <AuriveroLogo size="sm" />
                    <span className="font-bold text-lg tracking-tight text-[#0F172A]">
                      Aurivero
                    </span>
                  </Link>

                  <p className="text-sm text-[#475569] leading-relaxed max-w-sm">
                    From Latin <em className="font-serif-accent text-base text-[#0F172A]">Aurum</em> (gold) &amp;{' '}
                    <em className="font-serif-accent text-base text-[#0F172A]">Verus</em> (truth) — precision
                    Indian &amp; global market analytics and risk-free paper trading.
                  </p>

                  <form onSubmit={handleNewsletterSubmit} className="pt-2 max-w-sm">
                    <label htmlFor="newsletter-email" className="block text-xs font-semibold text-[#0F172A] mb-2">
                      Weekly market structure briefing
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        id="newsletter-email"
                        type="email"
                        required
                        value={newsletterEmail}
                        onChange={(e) => {
                          setNewsletterEmail(e.target.value);
                          if (newsletterSubscribed) setNewsletterSubscribed(false);
                        }}
                        placeholder="you@domain.com"
                        className="flex-1 min-w-0 px-4 py-2.5 rounded-full bg-[#F8FAFC] border border-slate-200 text-sm text-[#0F172A] placeholder:text-[#475569] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                      />
                      <button
                        type="submit"
                        className="px-5 py-2.5 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                      >
                        Subscribe
                      </button>
                    </div>
                    {newsletterSubscribed && (
                      <p className="mt-2 text-xs font-medium text-[#047857]" role="status">
                        Subscribed! Check your inbox for the next weekly briefing.
                      </p>
                    )}
                  </form>
                </div>

                {/* Right: 4 Organized Link Columns */}
                <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-8">
                  {FOOTER_COLUMNS.map((col) => (
                    <div key={col.title}>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A] mb-4">
                        {col.title}
                      </h3>
                      <ul className="space-y-2.5">
                        {col.links.map((item) => (
                          <li key={item.label}>
                            {item.to.startsWith('#') ? (
                              <a
                                href={item.to}
                                className="text-sm text-[#475569] hover:text-[#2563EB] transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                              >
                                {item.label}
                              </a>
                            ) : (
                              <Link
                                to={item.to}
                                className="text-sm text-[#475569] hover:text-[#2563EB] transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                              >
                                {item.label}
                              </Link>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* Subtle Legal / Risk-Disclaimer Bottom Bar */}
              <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#475569]">
                <p>
                  © {new Date().getFullYear()} Aurivero. Educational market analytics &amp; simulated
                  paper trading — not investment advice.
                </p>
                <p className="tabular-nums font-medium text-[#0F172A]">
                  Zero real-money execution • Simulated virtual capital
                </p>
              </div>
            </footer>
          </div>
        </section>
      </main>
    </div>
  );
};
