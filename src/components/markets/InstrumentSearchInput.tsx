import React, { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { api } from '../../services/api';
import { AssetClass, InstrumentMeta } from '../../types/markets';

interface InstrumentSearchInputProps {
  placeholder?: string;
  assetClassFilter?: AssetClass;
  onSelect: (item: InstrumentMeta) => void;
  className?: string;
  ariaLabel?: string;
}

export const InstrumentSearchInput: React.FC<InstrumentSearchInputProps> = ({
  placeholder = 'Search any stock (RELIANCE, AAPL), crypto (BTC), or forex (USD/INR)...',
  assetClassFilter,
  onSelect,
  className = '',
  ariaLabel = 'Search market instruments',
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<InstrumentMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      setLoading(true);
      const res = await api.markets.search(q, assetClassFilter, 10);
      if (res.success && res.data?.results) {
        setResults(res.data.results);
      }
      setLoading(false);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [query, assetClassFilter]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <Search
        size={16}
        aria-hidden="true"
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
      />
      <input
        type="search"
        role="combobox"
        aria-expanded={open && query.trim().length > 0}
        aria-label={ariaLabel}
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false);
        }}
        placeholder={placeholder}
        className="w-full bg-background/80 border border-border rounded-xl pl-10 pr-4 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
      />

      {open && query.trim().length > 0 && (
        <div
          role="listbox"
          className="absolute left-0 right-0 mt-2 rounded-xl border border-border bg-surface-elevated shadow-2xl z-40 max-h-72 overflow-y-auto divide-y divide-border/50"
        >
          {loading ? (
            <div className="p-3 text-xs font-mono text-text-muted">Searching instruments...</div>
          ) : results.length === 0 ? (
            <div className="p-3 text-xs text-text-muted">No matching instruments found.</div>
          ) : (
            results.map((item) => (
              <button
                key={`${item.assetClass}-${item.symbol}`}
                type="button"
                role="option"
                onClick={() => {
                  onSelect(item);
                  setQuery('');
                  setOpen(false);
                }}
                className="w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-surface text-left transition-colors focus:outline-none focus:bg-surface"
              >
                <div className="min-w-0">
                  <div className="font-mono font-bold text-xs text-text-primary">
                    {item.displaySymbol}
                  </div>
                  <div className="text-[11px] text-text-muted truncate">{item.name}</div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-background border border-border text-text-secondary flex-shrink-0 ml-2">
                  {item.assetClass} • {item.exchange}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
