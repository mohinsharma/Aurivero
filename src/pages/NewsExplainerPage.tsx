import React, { useState } from 'react';
import {
  Newspaper,
  TrendingUp,
  TrendingDown,
  Info,
  Layers,
  ArrowRight,
  Filter,
  Sparkles,
  Search
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { MARKET_NEWS_ITEMS } from '../data/mockData';
import { MarketNewsItem } from '../types';

export const NewsExplainerPage: React.FC = () => {
  const [newsList] = useState<MarketNewsItem[]>(MARKET_NEWS_ITEMS);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [expandedNewsId, setExpandedNewsId] = useState<string>(MARKET_NEWS_ITEMS[0].id);

  const categories = ['All', 'Macro Economy', 'Policy', 'Global Signals'];

  const filteredNews = selectedCategory === 'All'
    ? newsList
    : newsList.filter(n => n.category === selectedCategory);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-surface border border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-primary font-semibold">
              Plain English Financial News
            </span>
            <Badge variant="primary" size="sm">No Financial Jargon</Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary mt-1">
            Market News Explainer & Impact Translator
          </h1>
          <p className="text-xs text-text-secondary mt-1 max-w-2xl leading-relaxed">
            Financial headlines are written in confusing jargon like "Repo Rate", "Yield Curve Inversion", and "Quantitative Tightening". We translate what they actually mean for your savings, loans, and stock portfolio.
          </p>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                selectedCategory === cat
                  ? 'bg-primary text-background font-semibold'
                  : 'bg-surface-elevated text-text-secondary hover:text-text-primary'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* News Feed List */}
      <div className="space-y-4">
        {filteredNews.map((item) => {
          const isExpanded = expandedNewsId === item.id;
          const isBullish = item.marketSentiment === 'Bullish';

          return (
            <Card
              key={item.id}
              variant="elevated"
              className={`p-5 transition-all ${isExpanded ? 'border-primary/40' : 'hover:border-text-secondary/40'}`}
            >
              <div
                className="cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3"
                onClick={() => setExpandedNewsId(isExpanded ? '' : item.id)}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono text-text-muted">{item.source} • {item.publishedAt}</span>
                    <Badge variant={isBullish ? 'primary' : 'neutral'} size="sm">
                      {item.marketSentiment}
                    </Badge>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface border border-border text-text-muted">
                      {item.category}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-text-primary">
                    {item.headline}
                  </h3>
                </div>

                <Button variant="ghost" size="sm" className="text-xs flex-shrink-0">
                  {isExpanded ? 'Hide Translation' : 'Read Plain English'}
                </Button>
              </div>

              {/* Translation Dropdown */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-border/50 space-y-4 animate-in fade-in duration-200">
                  {/* What it means */}
                  <div className="p-3.5 rounded-xl bg-surface border border-secondary/20">
                    <div className="flex items-center gap-1.5 text-xs font-mono text-secondary font-semibold">
                      <Sparkles size={14} /> Plain English Translation:
                    </div>
                    <p className="text-xs text-text-primary mt-1 leading-relaxed">
                      {item.plainEnglishTranslation}
                    </p>
                  </div>

                  {/* Why it matters */}
                  <div className="p-3.5 rounded-xl bg-surface border border-primary/20">
                    <div className="flex items-center gap-1.5 text-xs font-mono text-primary font-semibold">
                      <Info size={14} /> What This Means For You (The Individual):
                    </div>
                    <p className="text-xs text-text-primary mt-1 leading-relaxed">
                      {item.whyItMattersToYou}
                    </p>
                  </div>

                  {/* Impacted Sectors Grid */}
                  <div>
                    <h4 className="text-xs font-mono uppercase tracking-wider text-text-muted mb-2">
                      Sector Breakdown & Price Sensitivity
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {item.impactedSectors.map((sec, idx) => {
                        const isPos = sec.impact === 'positive';
                        const isNeg = sec.impact === 'negative';
                        return (
                          <div key={idx} className="p-3 rounded-lg bg-surface border border-border/60 text-xs">
                            <div className="flex items-center justify-between font-mono mb-1">
                              <span className="font-bold text-text-primary">{sec.name}</span>
                              <span className={`text-[10px] font-semibold ${
                                isPos ? 'text-primary' : isNeg ? 'text-danger' : 'text-text-muted'
                              }`}>
                                {sec.impact.toUpperCase()}
                              </span>
                            </div>
                            <p className="text-[11px] text-text-secondary leading-snug">
                              {sec.rationale}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};
