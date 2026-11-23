import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, BookOpen, TrendingUp, History, Newspaper, Shield, ArrowRight } from 'lucide-react';
import { Modal } from './Modal';
import { POPULAR_INDIAN_STOCKS, COURSE_MODULES, HISTORICAL_REPLAY_EVENTS, MARKET_NEWS_ITEMS } from '../../data/mockData';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleSelect = (path: string) => {
    navigate(path);
    onClose();
    setQuery('');
  };

  const filteredStocks = POPULAR_INDIAN_STOCKS.filter(
    s => s.symbol.toLowerCase().includes(query.toLowerCase()) || s.name.toLowerCase().includes(query.toLowerCase())
  );

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
          {/* Quick Jump / Stocks */}
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-text-muted mb-2 flex items-center gap-1.5">
              <TrendingUp size={13} />
              <span>Stocks & Indices</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredStocks.slice(0, 4).map(stock => (
                <div
                  key={stock.symbol}
                  onClick={() => handleSelect('/simulator')}
                  className="p-2.5 rounded-lg bg-surface hover:bg-surface/80 border border-border/60 hover:border-primary/50 cursor-pointer flex items-center justify-between group transition-all"
                >
                  <div>
                    <div className="font-mono font-bold text-xs text-text-primary group-hover:text-primary transition-colors">
                      {stock.symbol}
                    </div>
                    <div className="text-[11px] text-text-muted truncate max-w-[140px]">{stock.name}</div>
                  </div>
                  <div className="text-right font-mono text-xs">
                    <div>₹{stock.price.toFixed(2)}</div>
                    <div className={`text-[10px] ${stock.change >= 0 ? 'text-primary' : 'text-danger'}`}>
                      {stock.change >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Courses */}
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-text-muted mb-2 flex items-center gap-1.5">
              <BookOpen size={13} />
              <span>Learning Modules</span>
            </div>
            <div className="space-y-1.5">
              {filteredModules.slice(0, 3).map(mod => (
                <div
                  key={mod.id}
                  onClick={() => handleSelect('/learn')}
                  className="p-2.5 rounded-lg bg-surface hover:bg-surface/80 border border-border/60 hover:border-secondary/50 cursor-pointer flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-md bg-secondary/10 text-secondary">
                      <BookOpen size={14} />
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-text-primary group-hover:text-secondary transition-colors">
                        {mod.trackTitle}
                      </div>
                      <div className="text-[11px] text-text-muted truncate max-w-[280px]">
                        {mod.description}
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-text-muted group-hover:text-secondary group-hover:translate-x-0.5 transition-all" />
                </div>
              ))}
            </div>
          </div>

          {/* Market Replays */}
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-text-muted mb-2 flex items-center gap-1.5">
              <History size={13} />
              <span>Historical Crash Replays</span>
            </div>
            <div className="space-y-1.5">
              {filteredEvents.map(evt => (
                <div
                  key={evt.id}
                  onClick={() => handleSelect('/market-replay')}
                  className="p-2.5 rounded-lg bg-surface hover:bg-surface/80 border border-border/60 hover:border-warning/50 cursor-pointer flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-md bg-warning/10 text-warning">
                      <History size={14} />
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-text-primary group-hover:text-warning transition-colors">
                        {evt.title}
                      </div>
                      <div className="text-[11px] text-text-muted truncate max-w-[280px]">
                        {evt.subtitle}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-danger font-semibold">{evt.dropPercentage}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
