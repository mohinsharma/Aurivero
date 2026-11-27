import React, { useState } from 'react';
import { CandlestickChart, Layers, ShieldCheck, Sparkles } from 'lucide-react';

const LAYERS = [
  {
    id: 'market',
    step: '01',
    title: 'Multi-Asset Market Engine',
    subtitle: 'NSE/BSE Equities · Crypto · Forex',
    detail:
      'Unified WebSocket streaming, IST market session awareness, NIFTY 50 heatmaps, and multi-factor screeners with explicit data freshness.',
    accent: 'border-primary/40 text-primary',
    icon: Layers,
  },
  {
    id: 'charting',
    step: '02',
    title: 'Pro Technical Charting',
    subtitle: 'Candlesticks · Indicators · Drawings',
    detail:
      'Institutional-grade Lightweight Charts workspace with clean interval vs. range separation, saved layouts, and zero decorative clutter.',
    accent: 'border-secondary/40 text-secondary',
    icon: CandlestickChart,
  },
  {
    id: 'risk',
    step: '03',
    title: 'Quantitative Risk & ML Lab',
    subtitle: 'Correlated VaR · CVaR · Walk-Forward ML',
    detail:
      'Portfolio-wide historical simulation VaR, N×N correlation matrices, marginal risk attribution, and out-of-sample ML volatility regimes.',
    accent: 'border-gold/50 text-gold',
    icon: ShieldCheck,
  },
  {
    id: 'mentor',
    step: '04',
    title: 'MINDMARK AI & Learning Studio',
    subtitle: 'Voice · Financial OCR · Socratic Scenarios',
    detail:
      'Floating finance-only AI mentor with speech input, chart OCR extraction, hidden-future historical drills, and 4-tier risk guardrails.',
    accent: 'border-primary/40 text-primary',
    icon: Sparkles,
  },
];

export const ExplodedArchitectureShowcase: React.FC = () => {
  const [selected, setSelected] = useState<string>('risk');
  const activeLayer = LAYERS.find((l) => l.id === selected) || LAYERS[2];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
      <div className="max-w-2xl space-y-2">
        <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-gold">
          Architectural Precision
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
          Four Intelligence Layers. One Unified Obsidian Workspace.
        </h2>
        <p className="text-sm text-text-secondary">
          Inspect each layer of Aurivero’s financial engine—engineered for clarity from live market ticks to risk-adjusted decisions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Exploded Interactive Stack */}
        <div className="lg:col-span-7 space-y-3">
          {LAYERS.map((layer, idx) => {
            const Icon = layer.icon;
            const isSelected = layer.id === selected;
            return (
              <button
                key={layer.id}
                type="button"
                onClick={() => setSelected(layer.id)}
                style={{
                  transform: isSelected ? 'translateX(10px)' : `translateX(${idx * 2}px)`,
                }}
                className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between gap-4 ${
                  isSelected
                    ? 'bg-surface-elevated border-gold/50 shadow-gold'
                    : 'bg-surface/80 border-border hover:border-text-muted/40'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <span className="text-xs font-mono text-gold font-bold">{layer.step}</span>
                  <div className={`w-9 h-9 rounded-xl bg-background border flex items-center justify-center ${layer.accent}`}>
                    <Icon size={17} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-text-primary">{layer.title}</div>
                    <div className="text-xs text-text-muted">{layer.subtitle}</div>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-text-muted hidden sm:inline">
                  {isSelected ? 'ACTIVE' : 'INSPECT'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Layer Detail Card */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-surface-elevated border border-gold/30 shadow-glass space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-gold uppercase tracking-wider">
              Layer {activeLayer.step}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-mono">
              PRODUCTION INTEGRATED
            </span>
          </div>
          <h3 className="text-xl font-bold text-text-primary">{activeLayer.title}</h3>
          <p className="text-sm text-text-secondary leading-relaxed">{activeLayer.detail}</p>
        </div>
      </div>
    </section>
  );
};
