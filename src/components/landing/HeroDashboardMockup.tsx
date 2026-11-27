import React, { useState } from 'react';
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Compass,
  PieChart,
  ShieldCheck,
  Star,
  TrendingUp,
} from 'lucide-react';
import { HERO_TICKERS, TickerKey } from './landingData';

const TICKER_KEYS: TickerKey[] = ['BTC/USD', 'AAPL', 'NIFTY 50'];

export const HeroDashboardMockup: React.FC = () => {
  const [selectedTicker, setSelectedTicker] = useState<TickerKey>('BTC/USD');
  const current = HERO_TICKERS[selectedTicker];

  return (
    <div className="relative max-w-6xl mx-auto mt-12 sm:mt-16 pt-4 lg:pt-16 pb-4 lg:pb-12 lg:px-10">
      {/* Desktop Left Floating Micro-Card (anchored outside main chart & table bounds) */}
      <div
        className="hidden lg:flex items-center gap-3 bg-white rounded-2xl border border-slate-200/90 shadow-lg px-4 py-3 absolute left-0 xl:-left-2 bottom-0 z-20 max-w-[235px]"
        aria-label="Recent trade execution status"
      >
        <div className="w-9 h-9 rounded-xl bg-[#ECFDF5] text-[#10B981] flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[#0F172A] truncate">Order Filled • 12ms</p>
          <p className="text-xs text-[#475569] tabular-nums truncate">
            {current.key} • Risk 1.0% OK
          </p>
        </div>
      </div>

      {/* Desktop Right Floating Micro-Card (anchored cleanly above top-right corner with zero overlap) */}
      <div
        className="hidden lg:flex items-center gap-3 bg-white rounded-2xl border border-slate-200/90 shadow-lg px-4 py-3 absolute right-6 xl:right-8 top-0 z-20"
        aria-label="Platform trader rating"
      >
        <div className="flex items-center gap-0.5 text-amber-500" aria-hidden="true">
          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
        </div>
        <div>
          <p className="text-xs font-bold text-[#0F172A] tabular-nums">4.9 / 5 Rating</p>
          <p className="text-[11px] text-[#475569]">2,400+ Active Analysts</p>
        </div>
      </div>

      {/* Elevated White Dashboard Window */}
      <div className="rounded-2xl bg-white shadow-2xl shadow-slate-900/10 border border-slate-200/80 overflow-hidden text-left">
        {/* Browser / App Window Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5 bg-[#F8FAFC] border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300" aria-hidden="true" />
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300" aria-hidden="true" />
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300" aria-hidden="true" />
            <span className="ml-2 text-xs font-medium text-[#475569]">
              Aurivero Terminal • Live Paper Workspace
            </span>
          </div>

          {/* Clickable Ticker Switcher */}
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Select market ticker">
            {TICKER_KEYS.map((ticker) => {
              const active = ticker === selectedTicker;
              return (
                <button
                  key={ticker}
                  type="button"
                  onClick={() => setSelectedTicker(ticker)}
                  aria-pressed={active}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1 ${
                    active
                      ? 'bg-[#2563EB] text-white shadow-sm'
                      : 'bg-white text-[#475569] border border-slate-200 hover:border-slate-300 hover:text-[#0F172A]'
                  }`}
                >
                  {ticker}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Workspace Body */}
        <div className="grid grid-cols-1 md:grid-cols-12">
          {/* Mini Left Sidebar inside Dashboard Window */}
          <aside className="hidden md:flex md:col-span-3 flex-col justify-between bg-[#F8FAFC]/70 border-r border-slate-200 p-4 lg:pb-16">
            <div className="space-y-1">
              <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-[#475569]">
                Workspace
              </p>
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-blue-50 text-[#2563EB] text-xs font-semibold">
                <Activity className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Market Terminal</span>
              </div>
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[#475569] text-xs font-medium">
                <PieChart className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Portfolio & P&amp;L</span>
              </div>
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[#475569] text-xs font-medium">
                <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Behavior Coach</span>
              </div>
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[#475569] text-xs font-medium">
                <Compass className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Strategy Replay</span>
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-white border border-slate-200 p-3">
              <p className="text-[11px] font-medium text-[#475569]">Discipline Score</p>
              <p className="mt-1 text-base font-bold text-[#0F172A] tabular-nums">
                {current.disciplineScore}
              </p>
              <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full w-[92%] rounded-full bg-[#10B981]" />
              </div>
            </div>
          </aside>

          {/* Chart & Signals Content */}
          <div className="md:col-span-9 p-4 sm:p-6 space-y-5">
            {/* Ticker Header & Key Stats */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold text-[#0F172A]">{current.key}</h2>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[11px] font-semibold text-[#475569]">
                    {current.exchange}
                  </span>
                </div>
                <p className="text-xs text-[#475569] mt-0.5">{current.name}</p>
              </div>

              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                <div>
                  <p className="text-2xl font-bold text-[#0F172A] tabular-nums">{current.price}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#047857] text-xs font-semibold tabular-nums">
                      <TrendingUp className="w-3.5 h-3.5 text-[#10B981]" aria-hidden="true" />
                      {current.change}
                    </span>
                    <span className="text-xs text-[#475569]">24h Session</span>
                  </div>
                </div>

                <div className="hidden sm:grid grid-cols-3 gap-4 pl-4 border-l border-slate-200 text-xs">
                  <div>
                    <p className="text-[#475569]">High</p>
                    <p className="font-semibold text-[#0F172A] tabular-nums">{current.dayHigh}</p>
                  </div>
                  <div>
                    <p className="text-[#475569]">Low</p>
                    <p className="font-semibold text-[#0F172A] tabular-nums">{current.dayLow}</p>
                  </div>
                  <div>
                    <p className="text-[#475569]">Volume</p>
                    <p className="font-semibold text-[#0F172A] tabular-nums">{current.volume}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Smooth Inline SVG Area/Line Performance Chart */}
            <div className="rounded-xl border border-slate-200 bg-[#F8FAFC]/60 p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#0F172A]">
                  <BarChart3 className="w-4 h-4 text-[#2563EB]" aria-hidden="true" />
                  <span>Intraday Momentum Curve</span>
                </div>
                <span className="text-[11px] font-medium text-[#475569]">Simulated Live Feed</span>
              </div>

              <div className="w-full">
                <svg
                  viewBox="0 0 500 165"
                  className="w-full h-36 sm:h-44 overflow-visible"
                  role="img"
                  aria-label={`${current.key} performance line chart`}
                >
                  <defs>
                    <linearGradient id="auriveroChartFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563EB" stopOpacity="0.22" />
                      <stop offset="100%" stopColor="#2563EB" stopOpacity="0.01" />
                    </linearGradient>
                  </defs>
                  {/* Subtle horizontal gridlines */}
                  <line x1="0" y1="35" x2="500" y2="35" stroke="#E2E8F0" strokeDasharray="3 4" />
                  <line x1="0" y1="80" x2="500" y2="80" stroke="#E2E8F0" strokeDasharray="3 4" />
                  <line x1="0" y1="125" x2="500" y2="125" stroke="#E2E8F0" strokeDasharray="3 4" />

                  <path d={current.areaPath} fill="url(#auriveroChartFill)" />
                  <polyline
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={current.linePoints}
                  />
                  {/* End highlight dot */}
                  <circle cx="500" cy={current.linePoints.split(' ').pop()?.split(',')[1] || '24'} r="5" fill="#2563EB" />
                  <circle
                    cx="500"
                    cy={current.linePoints.split(' ').pop()?.split(',')[1] || '24'}
                    r="10"
                    fill="#2563EB"
                    fillOpacity="0.16"
                  />
                </svg>

                <div className="flex items-center justify-between text-[11px] text-[#475569] tabular-nums pt-1 px-1">
                  {current.timeLabels.map((label) => (
                    <span key={label}>{label}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Positions / Signals Table */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-[#F8FAFC] border-b border-slate-200">
                <span className="text-xs font-semibold text-[#0F172A]">
                  Recent Positions / Signals
                </span>
                <span className="text-[11px] font-medium text-[#475569]">Real-Time Audit</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200/80 text-[#475569] bg-white">
                      <th className="py-2.5 px-4 font-semibold">Instrument</th>
                      <th className="py-2.5 px-3 font-semibold">Side</th>
                      <th className="py-2.5 px-3 font-semibold hidden sm:table-cell">Entry</th>
                      <th className="py-2.5 px-3 font-semibold">Mark</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Unrealized P&amp;L</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {current.signals.map((row) => (
                      <tr key={row.symbol} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-2.5 px-4">
                          <span className="font-semibold text-[#0F172A]">{row.symbol}</span>
                          <span className="hidden sm:inline text-[#475569] ml-1.5">
                            · {row.assetClass}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                              row.side === 'LONG'
                                ? 'bg-[#ECFDF5] text-[#047857]'
                                : 'bg-[#FEF2F2] text-[#B91C1C]'
                            }`}
                          >
                            {row.side}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[#475569] tabular-nums hidden sm:table-cell">
                          {row.entry}
                        </td>
                        <td className="py-2.5 px-3 text-[#0F172A] font-medium tabular-nums">
                          {row.mark}
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right font-semibold tabular-nums ${
                            row.positive ? 'text-[#047857]' : 'text-[#B91C1C]'
                          }`}
                        >
                          {row.pnl}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              row.positive
                                ? 'bg-[#ECFDF5] text-[#047857]'
                                : 'bg-[#FEF2F2] text-[#B91C1C]'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                row.positive ? 'bg-[#10B981]' : 'bg-[#EF4444]'
                              }`}
                              aria-hidden="true"
                            />
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
