import React, { useState } from 'react';
import { Bell, Globe, PieChart, Sliders } from 'lucide-react';
import { GLOBAL_ASSET_PILLS, ORDER_BOOK_ALERTS, PORTFOLIO_RANGES } from './landingData';

export const BentoShowcase: React.FC = () => {
  const [portfolioRange, setPortfolioRange] = useState<'7D' | '30D' | 'YTD'>('30D');
  const [accountBalance, setAccountBalance] = useState<number>(500000);
  const [riskPercent, setRiskPercent] = useState<number>(1.5);
  const [stopDistance, setStopDistance] = useState<number>(2.0);

  const portfolio = PORTFOLIO_RANGES[portfolioRange];
  const maxLoss = (accountBalance * riskPercent) / 100;
  const recommendedPosition = maxLoss / (stopDistance / 100);

  return (
    <section
      id="features"
      className="py-20 sm:py-24 bg-white"
      aria-labelledby="bento-showcase-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center mb-14">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[#2563EB] text-xs font-semibold mb-4">
            Built-In Quantitative Edge
          </span>
          <h2
            id="bento-showcase-heading"
            className="text-3xl sm:text-4xl font-bold tracking-tight text-[#0F172A]"
          >
            Everything you need to size, monitor, and refine —{' '}
            <span className="font-serif-accent italic font-normal text-4xl sm:text-5xl text-[#2563EB]">
              Precisely.
            </span>
          </h2>
          <p className="mt-4 text-base text-[#475569]">
            Institutional portfolio attribution, live depth alerts, and interactive risk guardrails in
            one uncluttered workspace.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1: Real-Time Portfolio & P&L Breakdown */}
          <article className="rounded-3xl bg-[#F8FAFC] border border-slate-200 p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center">
                    <PieChart className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#0F172A]">
                      Real-Time Portfolio &amp; P&amp;L Breakdown
                    </h3>
                    <p className="text-xs text-[#475569]">
                      Track cumulative equity growth and risk-adjusted profit factor.
                    </p>
                  </div>
                </div>

                <div
                  className="inline-flex rounded-full bg-white border border-slate-200 p-1"
                  role="group"
                  aria-label="Portfolio performance timeframe"
                >
                  {(['7D', '30D', 'YTD'] as const).map((range) => (
                    <button
                      key={range}
                      type="button"
                      onClick={() => setPortfolioRange(range)}
                      aria-pressed={portfolioRange === range}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                        portfolioRange === range
                          ? 'bg-[#2563EB] text-white'
                          : 'text-[#475569] hover:text-[#0F172A]'
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 rounded-2xl bg-white border border-slate-200 p-5">
                <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
                  <div>
                    <p className="text-xs font-medium text-[#475569]">Simulated Equity</p>
                    <p className="text-2xl sm:text-3xl font-bold text-[#0F172A] tabular-nums mt-0.5">
                      {portfolio.total}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-full bg-[#ECFDF5] text-[#047857] text-xs font-semibold tabular-nums">
                      {portfolio.delta}
                    </span>
                    <div className="text-right text-xs">
                      <p className="text-[#475569]">Win Rate</p>
                      <p className="font-bold text-[#0F172A] tabular-nums">{portfolio.winRate}</p>
                    </div>
                  </div>
                </div>

                {/* Mini Bar Chart */}
                <div
                  className="grid grid-cols-7 gap-2 sm:gap-3 items-end h-28 pt-2"
                  aria-label="Portfolio performance bar breakdown"
                >
                  {portfolio.bars.map((height, idx) => (
                    <div key={portfolio.labels[idx]} className="flex flex-col items-center gap-1.5 h-full justify-end">
                      <div className="w-full bg-slate-100 rounded-lg h-full flex items-end overflow-hidden">
                        <div
                          className={`w-full rounded-lg transition-all duration-300 ${
                            idx === portfolio.bars.length - 1 ? 'bg-[#2563EB]' : 'bg-blue-200'
                          }`}
                          style={{ height: `${height}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-medium text-[#475569]">
                        {portfolio.labels[idx]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </article>

          {/* Card 2: Order Book & Priority Alerts */}
          <article className="rounded-3xl bg-[#F8FAFC] border border-slate-200 p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center">
                  <Bell className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#0F172A]">
                    Order Book &amp; Priority Alerts
                  </h3>
                  <p className="text-xs text-[#475569]">
                    Instant breakout triggers, bid/ask walls, and automated stop guards.
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl bg-white border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                {ORDER_BOOK_ALERTS.map((item) => (
                  <div
                    key={item.pair}
                    className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 hover:bg-[#F8FAFC] transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#0F172A] truncate">{item.pair}</p>
                      <p className="text-xs text-[#475569]">{item.type}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-semibold text-[#0F172A] tabular-nums">
                        {item.level}
                      </span>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold tabular-nums ${
                          item.positive
                            ? 'bg-[#ECFDF5] text-[#047857]'
                            : 'bg-[#FEF2F2] text-[#B91C1C]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </article>

          {/* Card 3: Interactive Risk / Position Size Calculator */}
          <article
            id="simulator"
            className="rounded-3xl bg-[#F8FAFC] border border-slate-200 p-6 sm:p-8 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center">
                  <Sliders className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#0F172A]">
                    Interactive Position Size Calculator
                  </h3>
                  <p className="text-xs text-[#475569]">
                    Cap downside before every entry with dynamic real-time sizing.
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl bg-white border border-slate-200 p-5 space-y-5">
                {/* Account Balance Slider */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <label htmlFor="calc-account-balance" className="font-semibold text-[#0F172A]">
                      Account Balance
                    </label>
                    <span className="font-bold text-[#2563EB] tabular-nums">
                      ₹{accountBalance.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <input
                    id="calc-account-balance"
                    type="range"
                    min={50000}
                    max={2500000}
                    step={25000}
                    value={accountBalance}
                    onChange={(e) => setAccountBalance(Number(e.target.value))}
                    className="w-full accent-[#2563EB] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
                  />
                </div>

                {/* Risk % Slider */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <label htmlFor="calc-risk-percent" className="font-semibold text-[#0F172A]">
                      Risk Per Trade (%)
                    </label>
                    <span className="font-bold text-[#2563EB] tabular-nums">
                      {riskPercent.toFixed(2)}%
                    </span>
                  </div>
                  <input
                    id="calc-risk-percent"
                    type="range"
                    min={0.25}
                    max={5}
                    step={0.25}
                    value={riskPercent}
                    onChange={(e) => setRiskPercent(Number(e.target.value))}
                    className="w-full accent-[#2563EB] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
                  />
                </div>

                {/* Stop Distance Pills */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <span className="text-xs font-semibold text-[#475569]">Stop-Loss Distance</span>
                  <div className="flex items-center gap-1.5" role="group" aria-label="Stop-loss percentage">
                    {[1, 2, 3, 5].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setStopDistance(pct)}
                        aria-pressed={stopDistance === pct}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                          stopDistance === pct
                            ? 'bg-[#2563EB] text-white'
                            : 'bg-[#F8FAFC] text-[#475569] border border-slate-200 hover:text-[#0F172A]'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dynamic Outputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                  <div className="rounded-xl bg-[#F8FAFC] border border-slate-200 p-3.5">
                    <p className="text-xs text-[#475569]">Recommended Position</p>
                    <p className="mt-1 text-xl font-bold text-[#0F172A] tabular-nums">
                      ₹{Math.round(recommendedPosition).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#FEF2F2] border border-red-200/70 p-3.5">
                    <p className="text-xs text-[#B91C1C] font-medium">Max Loss Cap</p>
                    <p className="mt-1 text-xl font-bold text-[#B91C1C] tabular-nums">
                      -₹{maxLoss.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </article>

          {/* Card 4: Asset Coverage Pill Card */}
          <article className="rounded-3xl bg-[#F8FAFC] border border-slate-200 p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center">
                    <Globe className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#0F172A]">55+ Global Assets</h3>
                    <p className="text-xs text-[#475569]">
                      Unified feeds across US &amp; Indian equities, major FX pairs, crypto, and
                      global indices.
                    </p>
                  </div>
                </div>
                <span className="shrink-0 px-3 py-1 rounded-full bg-[#ECFDF5] text-[#047857] text-xs font-semibold tabular-nums">
                  4 Asset Classes
                </span>
              </div>

              <div className="mt-6 rounded-2xl bg-white border border-slate-200 p-5">
                <div className="flex flex-wrap gap-2.5">
                  {GLOBAL_ASSET_PILLS.map((asset) => (
                    <div
                      key={asset.symbol}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F8FAFC] border border-slate-200 text-xs"
                    >
                      <span className="font-bold text-[#0F172A]">{asset.symbol}</span>
                      <span className="text-[#475569]">{asset.category}</span>
                    </div>
                  ))}
                  <div className="inline-flex items-center px-3 py-2 rounded-xl bg-blue-50 border border-blue-200 text-xs font-semibold text-[#2563EB]">
                    + 43 More Instruments
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-[#475569]">
                  <span>Zero brokerage simulation fees</span>
                  <span className="font-semibold text-[#0F172A] tabular-nums">
                    Sub-second price sync
                  </span>
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
};
