import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pause, Play, TrendingDown, TrendingUp } from 'lucide-react';
import { api } from '../../services/api';
import { AssetClass, DataFreshnessStatus, NormalizedQuote } from '../../types/markets';
import { formatInstrumentPrice } from './formatters';

interface IndianSessionInfo {
  state: string;
  label: string;
  isOpen: boolean;
  istTime: string;
  istDate: string;
}

function getIstTimeString() {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date());
}

export const LiveMarketTicker: React.FC = () => {
  const navigate = useNavigate();
  const [indices, setIndices] = useState<NormalizedQuote[]>([]);
  const [crypto, setCrypto] = useState<NormalizedQuote[]>([]);
  const [forex, setForex] = useState<NormalizedQuote[]>([]);
  const [session, setSession] = useState<IndianSessionInfo | null>(null);
  const [istTime, setIstTime] = useState<string>(getIstTimeString);
  const [paused, setPaused] = useState<boolean>(false);
  const [flashMap, setFlashMap] = useState<Record<string, 'up' | 'down'>>({});
  const prevPricesRef = useRef<Record<string, number>>({});

  const triggerFlash = useCallback((symbol: string, newPrice?: number | null) => {
    if (newPrice === null || newPrice === undefined) return;
    const prev = prevPricesRef.current[symbol];
    prevPricesRef.current[symbol] = newPrice;
    if (prev !== undefined && newPrice !== prev) {
      const dir = newPrice > prev ? 'up' : 'down';
      setFlashMap((m) => ({ ...m, [symbol]: dir }));
      window.setTimeout(() => {
        setFlashMap((m) => {
          const copy = { ...m };
          delete copy[symbol];
          return copy;
        });
      }, 900);
    }
  }, []);

  const fetchTickerSnapshot = useCallback(async () => {
    const res = await api.markets.getTicker();
    if (res.success && res.data) {
      const nextIdx: NormalizedQuote[] = res.data.indices || [];
      const nextCrp: NormalizedQuote[] = res.data.crypto || [];
      const nextFx: NormalizedQuote[] = res.data.forex || [];
      setIndices(nextIdx);
      setCrypto(nextCrp);
      setForex(nextFx);
      if (res.data.indianSession) setSession(res.data.indianSession);

      [...nextIdx, ...nextCrp, ...nextFx].forEach((q) => {
        if (q.price !== undefined && q.price !== null) {
          triggerFlash(q.symbol, q.price);
        }
      });
    }
  }, [triggerFlash]);

  // Initial snapshot + 45s polling for delayed stocks/FX (no fake price simulation)
  useEffect(() => {
    fetchTickerSnapshot();
    const poll = window.setInterval(fetchTickerSnapshot, 45000);
    const clock = window.setInterval(() => setIstTime(getIstTimeString()), 1000);
    return () => {
      window.clearInterval(poll);
      window.clearInterval(clock);
    };
  }, [fetchTickerSnapshot]);

  // Real-time Binance WebSocket subscriptions for BTCUSDT & ETHUSDT (shared backend upstream)
  useEffect(() => {
    const symbols = ['BTCUSDT', 'ETHUSDT'];
    const sockets: WebSocket[] = [];
    let disposed = false;

    symbols.forEach((sym) => {
      const connect = () => {
        if (disposed) return;
        const ws = new WebSocket(api.markets.getWsUrl('CRYPTO', sym));
        ws.onmessage = (evt) => {
          if (disposed) return;
          try {
            const msg = JSON.parse(evt.data);
            if (msg.type === 'TICK' && typeof msg.price === 'number') {
              triggerFlash(sym, msg.price);
              setCrypto((prev) =>
                prev.map((c) => {
                  if (c.symbol !== sym) return c;
                  const prevClose = c.previousClose || c.open || c.price || msg.price;
                  const pct = prevClose ? ((msg.price - prevClose) / prevClose) * 100 : c.changePercent;
                  return {
                    ...c,
                    price: msg.price,
                    changePercent: pct !== undefined && pct !== null ? Number(pct.toFixed(2)) : c.changePercent,
                    status: msg.status as DataFreshnessStatus,
                    providerTimestamp: msg.providerTimestamp,
                  };
                })
              );
            }
          } catch {
            // Ignore malformed keepalive frames
          }
        };
        ws.onclose = () => {
          if (!disposed) {
            window.setTimeout(connect, 5000);
          }
        };
        sockets.push(ws);
      };
      connect();
    });

    return () => {
      disposed = true;
      sockets.forEach((s) => s.close());
    };
  }, [triggerFlash]);

  const nseStatusLabel =
    session?.state === 'MARKET_OPEN'
      ? 'DELAYED'
      : session?.state === 'PRE_OPEN'
        ? 'PRE-OPEN'
        : session?.state === 'HOLIDAY'
          ? 'HOLIDAY'
          : 'CLOSED';

  const statusBadgeClass =
    session?.state === 'MARKET_OPEN'
      ? 'text-warning'
      : session?.state === 'PRE_OPEN'
        ? 'text-secondary'
        : 'text-text-muted';

  const renderQuoteItem = (q: NormalizedQuote, labelOverride?: string) => {
    const pct = q.changePercent ?? 0;
    const isUp = pct >= 0;
    const flash = flashMap[q.symbol];
    const flashCls =
      flash === 'up' ? 'ticker-flash-up' : flash === 'down' ? 'ticker-flash-down' : '';

    return (
      <button
        key={q.symbol}
        type="button"
        onClick={() =>
          navigate(`/markets/${q.assetClass.toLowerCase()}/${encodeURIComponent(q.symbol)}`)
        }
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-surface-elevated/80 transition-colors whitespace-nowrap focus:outline-none focus:ring-1 focus:ring-primary ${flashCls}`}
      >
        <span className="text-text-muted font-medium">
          {labelOverride || q.displaySymbol}:
        </span>
        <span className="font-semibold text-text-primary text-tabular">
          {q.symbol === 'INDIAVIX'
            ? q.price !== null && q.price !== undefined
              ? q.price.toFixed(2)
              : '—'
            : formatInstrumentPrice(q.price, q.assetClass as AssetClass, q.currency, q.extra?.decimals)}
        </span>
        {q.changePercent !== null && q.changePercent !== undefined && (
          <span
            className={`inline-flex items-center gap-0.5 text-[10px] font-semibold text-tabular ${
              isUp ? 'text-primary' : 'text-danger'
            }`}
          >
            {isUp ? <TrendingUp size={10} aria-hidden="true" /> : <TrendingDown size={10} aria-hidden="true" />}
            <span>
              {isUp ? '▲ +' : '▼ '}
              {pct.toFixed(2)}%
            </span>
          </span>
        )}
      </button>
    );
  };

  const renderSequence = (isDuplicate = false) => (
    <div
      className="flex items-center gap-4 px-4 flex-shrink-0"
      aria-hidden={isDuplicate ? 'true' : undefined}
    >
      {/* 1. NSE / BSE STATUS */}
      <span className={`inline-flex items-center gap-1.5 font-semibold whitespace-nowrap ${statusBadgeClass}`}>
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            session?.isOpen ? 'bg-warning' : 'bg-text-muted'
          }`}
        />
        NSE/BSE {nseStatusLabel}
      </span>

      {/* 2. NIFTY 50, SENSEX, BANK NIFTY, INDIA VIX */}
      {indices.map((idx) => renderQuoteItem(idx))}

      <span className="h-3 w-px bg-border/70 flex-shrink-0" aria-hidden="true" />

      {/* 3. CRYPTO (LIVE) */}
      <span className="inline-flex items-center gap-1.5 text-primary font-semibold whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        CRYPTO {crypto[0]?.status || 'LIVE'}
      </span>
      {crypto.map((c) =>
        renderQuoteItem(c, c.symbol === 'BTCUSDT' ? 'BTC/USD' : c.symbol === 'ETHUSDT' ? 'ETH/USD' : c.displaySymbol)
      )}

      <span className="h-3 w-px bg-border/70 flex-shrink-0" aria-hidden="true" />

      {/* 4. FOREX */}
      <span className="text-secondary font-semibold whitespace-nowrap">
        FOREX {forex[0]?.status === 'MARKET_CLOSED' ? 'CLOSED' : 'DELAYED'}
      </span>
      {forex.map((fx) => renderQuoteItem(fx))}
    </div>
  );

  return (
    <div
      className="flex items-center justify-between border-b border-border/50 bg-background/70 text-[11px] font-mono text-text-secondary h-8 px-2 sm:px-4 gap-2 overflow-hidden"
      role="region"
      aria-label="Live market ticker"
    >
      {/* Left-to-Right Infinite Marquee Viewport */}
      <div className="ticker-wrap flex-1 min-w-0 overflow-hidden flex items-center h-full">
        {indices.length === 0 && crypto.length === 0 ? (
          <span className="text-text-muted px-2">Loading live market feed...</span>
        ) : (
          <div className="ticker-track items-center" data-paused={paused ? 'true' : 'false'}>
            {renderSequence(false)}
            {renderSequence(true)}
          </div>
        )}
      </div>

      {/* Fixed Right Section: IST Clock & Pause/Resume Control (Never Clipped) */}
      <div className="flex items-center gap-2 flex-shrink-0 pl-2 border-l border-border/60 bg-background/70">
        <span className="hidden md:inline-flex items-center gap-1.5 text-text-primary whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
          <span>{istTime} IST</span>
          <span className="text-text-muted hidden xl:inline">(09:15–15:30)</span>
        </span>
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-pressed={paused}
          aria-label={paused ? 'Resume market ticker' : 'Pause market ticker'}
          title={paused ? 'Resume ticker' : 'Pause ticker'}
          className="p-1 rounded hover:bg-surface-elevated text-text-secondary hover:text-text-primary transition-colors focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {paused ? <Play size={12} /> : <Pause size={12} />}
        </button>
      </div>
    </div>
  );
};
