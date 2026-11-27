import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, BookOpen, History, Globe, ArrowRight } from 'lucide-react';
import { Modal } from './Modal';
import { COURSE_MODULES, HISTORICAL_REPLAY_EVENTS } from '../../data/mockData';
import { api } from '../../services/api';
import { InstrumentMeta } from '../../types/markets';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [marketResults, setMarketResults] = useState<InstrumentMeta[]>([]);
  const [searchingMarkets, setSearchingMarkets] = useState(false);
  const navigate = useNavigate();

  const handleSelect = (path: string) => {
    navigate(path);
    onClose();
    setQuery('');
  };

  useEffect(() => {
    if (!isOpen) return;
    const q = query.trim();
    const timer = window.setTimeout(async () => {
      setSearchingMarkets(true);
      const res = await api.markets.search(q, undefined, 6);
      if (res.success && res.data?.results) {
        setMarketResults(res.data.results);
      }
      setSearchingMarkets(false);
    }, q ? 200 : 0);
    return () => window.clearTimeout(timer);
  }, [query, isOpen]);

  const filteredModules = COURSE_MODULES.filter(
    m => m.trackTitle.toLowerCase().includes(query.toLowerCase()) || m.description.toLowerCase().includes(query.toLowerCase())
  );

  const filteredEvents = HISTORICAL_REPLAY_EVENTS.filter(
    e => e.title.toLowerCase().includes(query.toLowerCase()) || e.subtitle.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="xl">
      <div className="space-y-4">
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search NSE stocks, curriculum lessons, crash replays, or tools..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-surface border border-border pl-10 pr-4 py-2.5 rounded-xl text-text-primary text-sm focus:outline-none focus:border-primary transition-colors placeholder:text-text-muted"
          />
        </div>

        <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-1">
          {/* Live Multi-Asset Market Search */}
          <div>
            <div className="text-xs font-semibold text-text-secondary mb-2 flex items-center gap-1.5">
              <Globe size={13} />
              <span>Stocks, Crypto &amp; Forex</span>
            </div>
            {searchingMarkets ? (
              <div className="p-3 text-xs text-text-secondary">Searching market providers...</div>
            ) : marketResults.length === 0 ? (
              <div className="p-3 text-xs text-text-secondary">No matching market instruments found.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {marketResults.slice(0, 6).map(item => (
                  <div
                    key={`${item.assetClass}-${item.symbol}`}
                    onClick={() => handleSelect(`/markets/${item.assetClass.toLowerCase()}/${encodeURIComponent(item.symbol)}`)}
                    className="p-2.5 rounded-xl bg-background hover:bg-surface-elevated border border-border hover:border-primary/40 cursor-pointer flex items-center justify-between group transition-all"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-text-primary group-hover:text-primary transition-colors">
                        {item.displaySymbol}
                      </div>
                      <div className="text-[11px] text-text-secondary truncate max-w-[160px]">{item.name}</div>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface border border-border text-text-secondary">
                      {item.assetClass} • {item.exchange}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Courses */}
          <div>
            <div className="text-xs font-semibold text-text-secondary mb-2 flex items-center gap-1.5">
              <BookOpen size={13} />
              <span>Learning Modules</span>
            </div>
            <div className="space-y-1.5">
              {filteredModules.slice(0, 3).map(mod => (
                <div
                  key={mod.id}
                  onClick={() => handleSelect('/learn')}
                  className="p-2.5 rounded-xl bg-background hover:bg-surface-elevated border border-border hover:border-primary/40 cursor-pointer flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                      <BookOpen size={14} />
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-text-primary group-hover:text-primary transition-colors">
                        {mod.trackTitle}
                      </div>
                      <div className="text-[11px] text-text-secondary truncate max-w-[280px]">
                        {mod.description}
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-text-secondary group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
              ))}
            </div>
          </div>

          {/* Market Replays */}
          <div>
            <div className="text-xs font-semibold text-text-secondary mb-2 flex items-center gap-1.5">
              <History size={13} />
              <span>Historical Crash Replays</span>
            </div>
            <div className="space-y-1.5">
              {filteredEvents.map(evt => (
                <div
                  key={evt.id}
                  onClick={() => handleSelect('/market-replay')}
                  className="p-2.5 rounded-xl bg-background hover:bg-surface-elevated border border-border hover:border-primary/40 cursor-pointer flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                      <History size={14} />
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-text-primary group-hover:text-primary transition-colors">
                        {evt.title}
                      </div>
                      <div className="text-[11px] text-text-secondary truncate max-w-[280px]">
                        {evt.subtitle}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-loss font-semibold tabular-nums">{evt.dropPercentage}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
