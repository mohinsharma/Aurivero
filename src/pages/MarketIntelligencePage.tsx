import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Coins,
  Globe,
  TrendingUp,
  TrendingDown,
  Search,
  ArrowRightLeft,
  Bookmark,
  Bell,
  Sparkles,
  Info,
  Clock,
  Layers,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { api } from '../services/api';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';

export const MarketIntelligencePage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'crypto' | 'forex' | 'converter'>('crypto');
  const [cryptoAssets, setCryptoAssets] = useState<any[]>([]);
  const [cryptoSummary, setCryptoSummary] = useState<any | null>(null);
  const [forexPairs, setForexPairs] = useState<any[]>([]);
  const [forexSummary, setForexSummary] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Timeframe for charts
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1D' | '7D' | '1M' | '1Y'>('7D');
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);

  // Currency Converter State
  const [fromCurr, setFromCurr] = useState<string>('USD');
  const [toCurr, setToCurr] = useState<string>('INR');
  const [convertAmount, setConvertAmount] = useState<number>(1000);
  const [convertedResult, setConvertedResult] = useState<any | null>(null);
  const [converting, setConverting] = useState<boolean>(false);

  // Watchlist alerts
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchCryptoData();
    fetchForexData();
    runConversion();
  }, []);

  const fetchCryptoData = async () => {
    setLoading(true);
    const res = await api.marketIntelligence.getCrypto(undefined, searchQuery || undefined);
    if (res.success && res.data) {
      setCryptoAssets(res.data.assets || []);
      setCryptoSummary(res.data.market_summary || null);
      if (!selectedAsset && res.data.assets?.length > 0) {
        setSelectedAsset(res.data.assets[0]);
      }
    }
    setLoading(false);
  };

  const fetchForexData = async () => {
    const res = await api.marketIntelligence.getForex(searchQuery || undefined);
    if (res.success && res.data) {
      setForexPairs(res.data.pairs || []);
      setForexSummary(res.data.macro_summary || null);
    }
  };

  const runConversion = async () => {
    setConverting(true);
    const res = await api.marketIntelligence.convertCurrency(fromCurr, toCurr, convertAmount);
    if (res.success && res.data) {
      setConvertedResult(res.data);
    }
    setConverting(false);
  };

  const handleAddToWatchlist = async (asset: any, type: 'CRYPTO' | 'FOREX', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const res = await api.personalization.addToWatchlist({
      asset_type: type,
      symbol: asset.symbol || asset.pair.replace('/', ''),
      name: asset.name || asset.pair,
      target_price: asset.price_usd || asset.rate,
      alert_enabled: true
    });
    if (res.success) {
      setActionSuccessMsg(`${asset.symbol || asset.pair} added to your personal watchlist!`);
      setTimeout(() => setActionSuccessMsg(null), 3000);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header Strip */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-surface via-surface-elevated to-surface border border-border/80 p-6 sm:p-8">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono font-semibold mb-3">
              <Coins size={14} className="text-primary" />
              FINANCIAL MARKET INTELLIGENCE
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight font-mono">
              Live Crypto & Forex Tracking Terminal
            </h1>
            <p className="text-text-secondary text-sm mt-1.5 max-w-2xl leading-relaxed">
              Transparent, mid-market pricing, order book depth, liquidity ratios, and macro exchange indicators. Strictly educational simulated quotes.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('converter')}
              className="font-mono text-xs"
            >
              <ArrowRightLeft size={13} className="mr-1.5 text-secondary" />
              Currency Converter
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/hub')}
              className="font-mono text-xs shadow-glow"
            >
              <Bookmark size={13} className="mr-1.5" />
              My Watchlists
            </Button>
          </div>
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/30 text-primary text-xs font-mono flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Macro Pulse Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-surface-elevated/70 border-border/70">
          <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">Total Crypto Cap</span>
          <div className="text-lg font-bold text-text-primary font-mono mt-1">
            ${cryptoSummary?.total_market_cap_usd || '2.58 Trillion'}
          </div>
          <span className="text-[11px] font-mono text-primary flex items-center gap-1 mt-0.5">
            <TrendingUp size={11} /> +2.4% 24h
          </span>
        </Card>

        <Card className="p-4 bg-surface-elevated/70 border-border/70">
          <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">BTC Dominance</span>
          <div className="text-lg font-bold text-text-primary font-mono mt-1">
            {cryptoSummary?.btc_dominance || 54.8}%
          </div>
          <span className="text-[11px] font-mono text-text-muted mt-0.5">Leading liquidity anchor</span>
        </Card>

        <Card className="p-4 bg-surface-elevated/70 border-border/70">
          <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">US Dollar Index (DXY)</span>
          <div className="text-lg font-bold text-text-primary font-mono mt-1">
            {forexSummary?.dxy_index || 104.18}
          </div>
          <span className="text-[11px] font-mono text-text-secondary mt-0.5">+0.12% Daily Trend</span>
        </Card>

        <Card className="p-4 bg-surface-elevated/70 border-border/70">
          <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">RBI Forex Reserves</span>
          <div className="text-lg font-bold text-text-primary font-mono mt-1">
            {forexSummary?.rbi_forex_reserves || '$652.8 Billion'}
          </div>
          <span className="text-[11px] font-mono text-primary mt-0.5">Shielding INR from volatility</span>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('crypto')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 ${
              activeTab === 'crypto'
                ? 'bg-primary text-white shadow-glow'
                : 'bg-surface-elevated text-text-secondary hover:text-text-primary border border-border/60'
            }`}
          >
            <Coins size={14} />
            Cryptocurrency Markets
          </button>

          <button
            onClick={() => setActiveTab('forex')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 ${
              activeTab === 'forex'
                ? 'bg-secondary text-white shadow-md'
                : 'bg-surface-elevated text-text-secondary hover:text-text-primary border border-border/60'
            }`}
          >
            <Globe size={14} />
            Forex Currency Pairs
          </button>

          <button
            onClick={() => setActiveTab('converter')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 ${
              activeTab === 'converter'
                ? 'bg-warning text-white font-bold shadow-md'
                : 'bg-surface-elevated text-text-secondary hover:text-text-primary border border-border/60'
            }`}
          >
            <ArrowRightLeft size={14} />
            Mid-Market FX Calculator
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-text-muted">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span>Real-time Simulated Feeds</span>
        </div>
      </div>

      {/* TAB 1: CRYPTOCURRENCY MARKETS */}
      {activeTab === 'crypto' && (
        <div className="space-y-6">
          {/* Spotlight Asset Interactive Chart Bar */}
          {selectedAsset && (
            <Card className="p-6 bg-surface-elevated border-border space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center font-bold text-primary text-sm font-mono">
                    {selectedAsset.symbol}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-text-primary font-mono">{selectedAsset.name}</h2>
                      <span className="text-xs font-mono text-text-muted">({selectedAsset.symbol})</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface border border-border text-primary font-semibold">
                        {selectedAsset.category}
                      </span>
                    </div>
                    <div className="text-xs text-text-muted mt-0.5 leading-snug">
                      {selectedAsset.description}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-2xl font-bold font-mono text-text-primary">
                      ${selectedAsset.price_usd?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs font-mono text-text-muted">
                      ₹{selectedAsset.price_inr?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => handleAddToWatchlist(selectedAsset, 'CRYPTO', e)}
                    className="font-mono text-xs"
                  >
                    <Bookmark size={13} className="mr-1.5 text-primary" />
                    Watchlist
                  </Button>
                </div>
              </div>

              {/* Sparkline & Range Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono pt-2">
                <div>
                  <span className="text-text-muted">24h High:</span>
                  <div className="text-text-primary font-bold">${selectedAsset.high_24h}</div>
                </div>
                <div>
                  <span className="text-text-muted">24h Low:</span>
                  <div className="text-text-primary font-bold">${selectedAsset.low_24h}</div>
                </div>
                <div>
                  <span className="text-text-muted">24h Volume:</span>
                  <div className="text-text-primary font-bold">${selectedAsset.volume_24h_usd}</div>
                </div>
                <div>
                  <span className="text-text-muted">Market Cap:</span>
                  <div className="text-text-primary font-bold">${selectedAsset.market_cap_usd}</div>
                </div>
              </div>

              {/* Timeframe selector */}
              <div className="flex items-center justify-between pt-3 border-t border-border/40 text-xs font-mono">
                <span className="text-text-muted">Chart Performance Horizon:</span>
                <div className="flex items-center gap-1.5">
                  {(['1D', '7D', '1M', '1Y'] as const).map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setSelectedTimeframe(tf)}
                      className={`px-2.5 py-1 rounded-lg transition-colors ${
                        selectedTimeframe === tf
                          ? 'bg-primary text-white font-bold'
                          : 'bg-surface text-text-muted hover:text-text-primary'
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Crypto Assets Table */}
          <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-surface-elevated/70 text-text-muted border-b border-border text-[11px] uppercase">
                <tr>
                  <th className="py-3 px-4"># Asset</th>
                  <th className="py-3 px-4">Price (USD)</th>
                  <th className="py-3 px-4">Price (INR)</th>
                  <th className="py-3 px-4">24h Change</th>
                  <th className="py-3 px-4">24h Volume</th>
                  <th className="py-3 px-4">Market Cap</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {cryptoAssets.map((asset, idx) => {
                  const isUp = asset.change_24h >= 0;
                  return (
                    <tr
                      key={asset.symbol}
                      onClick={() => setSelectedAsset(asset)}
                      className="hover:bg-surface-elevated/60 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <span className="text-text-muted w-4">{idx + 1}</span>
                          <div className="w-7 h-7 rounded-lg bg-surface-elevated border border-border flex items-center justify-center font-bold text-text-primary">
                            {asset.symbol.slice(0, 3)}
                          </div>
                          <div>
                            <div className="font-bold text-text-primary group-hover:text-primary transition-colors">
                              {asset.name}
                            </div>
                            <span className="text-[10px] text-text-muted">{asset.symbol}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-text-primary">
                        ${asset.price_usd?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-text-secondary">
                        ₹{asset.price_inr?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className={`py-3.5 px-4 font-bold ${isUp ? 'text-primary' : 'text-danger'}`}>
                        {isUp ? '+' : ''}{asset.change_24h}%
                      </td>
                      <td className="py-3.5 px-4 text-text-muted">${asset.volume_24h_usd}</td>
                      <td className="py-3.5 px-4 text-text-muted">${asset.market_cap_usd}</td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleAddToWatchlist(asset, 'CRYPTO', e)}
                          className="text-[11px] font-mono text-text-muted hover:text-primary"
                        >
                          + Watchlist
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: FOREX MARKETS */}
      {activeTab === 'forex' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {forexPairs.map((pair) => {
              const isUp = pair.change_percent >= 0;
              return (
                <Card
                  key={pair.pair}
                  variant="interactive"
                  className="p-5 border-border/70 hover:border-secondary/40 bg-surface/85 transition-all"
                >
                  <div className="flex items-center justify-between text-xs font-mono mb-2">
                    <span className="text-secondary font-bold text-sm">{pair.pair}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface border border-border text-text-muted">
                      {pair.session}
                    </span>
                  </div>

                  <div className="text-xl font-bold font-mono text-text-primary mt-1">
                    {pair.rate?.toFixed(4)}
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono mt-2 pt-2 border-t border-border/40">
                    <span className="text-text-muted">
                      Bid: <strong>{pair.bid}</strong>
                    </span>
                    <span className="text-text-muted">
                      Ask: <strong>{pair.ask}</strong>
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono mt-3">
                    <span className={`flex items-center gap-1 font-bold ${isUp ? 'text-primary' : 'text-danger'}`}>
                      {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {isUp ? '+' : ''}{pair.change_percent}%
                    </span>

                    <button
                      onClick={(e) => handleAddToWatchlist(pair, 'FOREX', e)}
                      className="text-[11px] font-mono text-text-muted hover:text-secondary"
                    >
                      + Alert
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: CURRENCY CONVERTER */}
      {activeTab === 'converter' && (
        <Card className="p-6 sm:p-8 bg-surface border-border max-w-2xl mx-auto space-y-6">
          <div>
            <h3 className="text-base font-bold text-text-primary font-mono flex items-center gap-2">
              <ArrowRightLeft size={16} className="text-secondary" />
              Mid-Market Institutional FX Converter
            </h3>
            <p className="text-xs text-text-muted mt-1">
              Convert between USD, INR, EUR, GBP, JPY, CAD, and digital assets using live mid-market midpoint pricing.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <label className="block text-text-muted mb-1">From Currency</label>
              <select
                value={fromCurr}
                onChange={(e) => setFromCurr(e.target.value)}
                className="w-full p-2.5 bg-surface-elevated border border-border rounded-xl text-text-primary"
              >
                <option value="USD">USD (US Dollar)</option>
                <option value="INR">INR (Indian Rupee)</option>
                <option value="EUR">EUR (Euro)</option>
                <option value="GBP">GBP (British Pound)</option>
                <option value="JPY">JPY (Japanese Yen)</option>
                <option value="BTC">BTC (Bitcoin)</option>
                <option value="ETH">ETH (Ethereum)</option>
              </select>
            </div>

            <div>
              <label className="block text-text-muted mb-1">To Currency</label>
              <select
                value={toCurr}
                onChange={(e) => setToCurr(e.target.value)}
                className="w-full p-2.5 bg-surface-elevated border border-border rounded-xl text-text-primary"
              >
                <option value="INR">INR (Indian Rupee)</option>
                <option value="USD">USD (US Dollar)</option>
                <option value="EUR">EUR (Euro)</option>
                <option value="GBP">GBP (British Pound)</option>
                <option value="JPY">JPY (Japanese Yen)</option>
                <option value="BTC">BTC (Bitcoin)</option>
                <option value="ETH">ETH (Ethereum)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-text-muted text-xs font-mono mb-1">Amount</label>
            <input
              type="number"
              min={1}
              value={convertAmount}
              onChange={(e) => setConvertAmount(Number(e.target.value) || 0)}
              className="w-full p-2.5 bg-surface-elevated border border-border rounded-xl text-text-primary text-xs font-mono"
            />
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={runConversion}
            disabled={converting}
            className="w-full font-mono text-xs"
          >
            {converting ? 'Fetching Quote...' : 'Calculate Mid-Market Midpoint'}
          </Button>

          {convertedResult && (
            <div className="p-4 rounded-xl bg-surface-elevated border border-primary/30 text-center space-y-1">
              <span className="text-xs font-mono text-text-muted">
                {convertedResult.original_amount} {convertedResult.from_currency} =
              </span>
              <div className="text-2xl font-bold font-mono text-primary">
                {convertedResult.converted_amount} {convertedResult.to_currency}
              </div>
              <div className="text-[11px] font-mono text-text-muted">
                Midpoint rate: 1 {convertedResult.from_currency} = {convertedResult.effective_rate} {convertedResult.to_currency}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
