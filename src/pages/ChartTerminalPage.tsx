import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Columns,
  FunctionSquare,
  GitCompare,
  Layout,
  Minus,
  MousePointer,
  Plus,
  Save,
  Square,
  Tag,
  TrendingUp,
  Trash2,
} from 'lucide-react';
import { api } from '../services/api';
import { AssetClass } from '../types/markets';
import { DrawingToolType } from '../components/markets/ChartDrawingOverlay';
import {
  CustomIndicatorDef,
  TerminalChartPane,
  TerminalPaneConfig,
} from '../components/markets/TerminalChartPane';
import { tokenizeExpression } from '../utils/customIndicatorParser';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';

const DEFAULT_LEFT: TerminalPaneConfig = {
  assetClass: 'STOCK',
  symbol: 'RELIANCE',
  timeframe: '1d',
  range: '1Y',
  chartType: 'CANDLE',
  logScale: false,
};

const DEFAULT_RIGHT: TerminalPaneConfig = {
  assetClass: 'CRYPTO',
  symbol: 'BTCUSDT',
  timeframe: '1d',
  range: '1Y',
  chartType: 'CANDLE',
  logScale: false,
};

export const ChartTerminalPage: React.FC = () => {
  const navigate = useNavigate();

  const [dualMode, setDualMode] = useState(false);
  const [syncTimeframe, setSyncTimeframe] = useState(true);
  const [syncRange, setSyncRange] = useState(true);
  const [normalizedComparison, setNormalizedComparison] = useState(false);

  const [leftConfig, setLeftConfig] = useState<TerminalPaneConfig>(DEFAULT_LEFT);
  const [rightConfig, setRightConfig] = useState<TerminalPaneConfig>(DEFAULT_RIGHT);
  const [syncedLogicalRange, setSyncedLogicalRange] = useState<{ from: number; to: number } | null>(null);

  const [activeTool, setActiveTool] = useState<DrawingToolType>('NONE');

  // Comparison instruments
  const [compSymbol, setCompSymbol] = useState('TCS');
  const [compClass, setCompClass] = useState<AssetClass>('STOCK');
  const [comparisons, setComparisons] = useState<{ assetClass: AssetClass; symbol: string; color: string }[]>([
    { assetClass: 'STOCK', symbol: 'TCS', color: '#78A9FF' },
  ]);

  // Custom Indicators
  const [customIndicators, setCustomIndicators] = useState<CustomIndicatorDef[]>([]);
  const [activeCustomIds, setActiveCustomIds] = useState<string[]>([]);
  const [showBuilder, setShowBuilder] = useState(false);
  const [indName, setIndName] = useState('');
  const [indExpr, setIndExpr] = useState('sma(close, 10) - sma(close, 30)');
  const [indColor, setIndColor] = useState('#F5B942');
  const [indPane, setIndPane] = useState<'OVERLAY' | 'SEPARATE'>('SEPARATE');
  const [indError, setIndError] = useState<string | null>(null);

  // Layouts
  const [layouts, setLayouts] = useState<{ id: string; name: string; layout: any }[]>([]);
  const [showLayouts, setShowLayouts] = useState(false);
  const [layoutName, setLayoutName] = useState('');

  useEffect(() => {
    api.charts.listCustomIndicators().then((res) => {
      if (res.success && res.data?.indicators) setCustomIndicators(res.data.indicators);
    });
    api.charts.listLayouts().then((res) => {
      if (res.success && res.data?.layouts) setLayouts(res.data.layouts);
    });
  }, []);

  const handleLeftChange = (next: TerminalPaneConfig) => {
    setLeftConfig(next);
    if (dualMode && syncTimeframe && next.timeframe !== leftConfig.timeframe) {
      setRightConfig((r) => ({ ...r, timeframe: next.timeframe, range: next.range }));
    }
  };

  const handleRightChange = (next: TerminalPaneConfig) => {
    setRightConfig(next);
    if (dualMode && syncTimeframe && next.timeframe !== rightConfig.timeframe) {
      setLeftConfig((l) => ({ ...l, timeframe: next.timeframe, range: next.range }));
    }
  };

  const handleCreateCustomIndicator = async (e: React.FormEvent) => {
    e.preventDefault();
    setIndError(null);
    try {
      tokenizeExpression(indExpr);
    } catch (err: any) {
      setIndError(err.message || 'Invalid expression.');
      return;
    }
    const res = await api.charts.createCustomIndicator({
      name: indName.trim() || 'Custom Formula',
      expression: indExpr.trim(),
      color: indColor,
      pane: indPane,
    });
    if (res.success && res.data?.indicator) {
      const created: CustomIndicatorDef = res.data.indicator;
      setCustomIndicators((prev) => [created, ...prev]);
      setActiveCustomIds((prev) => [...prev, created.id]);
      setIndName('');
      setShowBuilder(false);
    }
  };

  const handleSaveLayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!layoutName.trim()) return;
    const res = await api.charts.saveLayout({
      name: layoutName.trim(),
      layout: { dualMode, syncTimeframe, syncRange, normalizedComparison, leftConfig, rightConfig },
    });
    if (res.success && res.data?.layout) {
      setLayouts((prev) => [res.data.layout, ...prev]);
      setLayoutName('');
    }
  };

  const tools: { id: DrawingToolType; label: string; icon: React.ReactNode }[] = [
    { id: 'NONE', label: 'Cursor', icon: <MousePointer size={15} /> },
    { id: 'TRENDLINE', label: 'Trendline', icon: <TrendingUp size={15} /> },
    { id: 'HORIZONTAL', label: 'Horizontal', icon: <Minus size={15} /> },
    { id: 'VERTICAL', label: 'Vertical', icon: <Columns size={15} /> },
    { id: 'RAY', label: 'Ray', icon: <TrendingUp size={15} className="rotate-12" /> },
    { id: 'RECTANGLE', label: 'Rectangle', icon: <Square size={15} /> },
    { id: 'FIBONACCI', label: 'Fib Retrace', icon: <Layout size={15} /> },
    { id: 'PRICE_LABEL', label: 'Price Label', icon: <Tag size={15} /> },
  ];

  return (
    <div className="space-y-4 pb-10">
      {/* Top Terminal Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface border border-border rounded-2xl px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/markets')}
            className="p-1.5 rounded-lg border border-border hover:bg-surface-elevated text-text-secondary hover:text-text-primary"
            title="Back to Markets"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-extrabold text-text-primary">
              Pro Charting Terminal
            </h1>
            <p className="text-[11px] text-text-muted">
              Multi-asset technical analysis • Persisted drawings, custom formulas & layouts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant={dualMode ? 'primary' : 'outline'}
            icon={<Columns size={14} />}
            onClick={() => setDualMode((d) => !d)}
          >
            {dualMode ? 'Dual Split' : 'Single View'}
          </Button>

          {dualMode && (
            <>
              <button
                onClick={() => setSyncTimeframe((s) => !s)}
                className={`px-2.5 py-1.5 rounded-lg text-xs border font-mono ${
                  syncTimeframe ? 'bg-primary/15 text-primary border-primary/30' : 'text-text-muted border-border'
                }`}
              >
                Sync TF
              </button>
              <button
                onClick={() => setSyncRange((s) => !s)}
                className={`px-2.5 py-1.5 rounded-lg text-xs border font-mono ${
                  syncRange ? 'bg-primary/15 text-primary border-primary/30' : 'text-text-muted border-border'
                }`}
              >
                Sync Axis
              </button>
            </>
          )}

          <Button
            size="sm"
            variant={normalizedComparison ? 'secondary' : 'outline'}
            icon={<GitCompare size={14} />}
            onClick={() => setNormalizedComparison((c) => !c)}
          >
            Compare %
          </Button>

          <Button
            size="sm"
            variant="outline"
            icon={<FunctionSquare size={14} />}
            onClick={() => setShowBuilder(true)}
          >
            Custom Indicator
          </Button>

          <Button
            size="sm"
            variant="outline"
            icon={<Save size={14} />}
            onClick={() => setShowLayouts(true)}
          >
            Layouts
          </Button>
        </div>
      </div>

      {/* Normalized % Comparison Bar */}
      {normalizedComparison && (
        <Card className="p-3 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-text-secondary">
            <strong className="text-secondary">Normalized % Performance Mode:</strong> Compares percentage change from start of visible range.
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {comparisons.map((c, idx) => (
              <span
                key={`${c.assetClass}-${c.symbol}-${idx}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background border border-border text-xs font-mono"
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                {c.symbol}
                <button
                  onClick={() => setComparisons((prev) => prev.filter((_, i) => i !== idx))}
                  className="text-text-muted hover:text-danger"
                >
                  ×
                </button>
              </span>
            ))}
            <select
              value={compClass}
              onChange={(e) => setCompClass(e.target.value as AssetClass)}
              className="bg-background border border-border rounded-lg px-2 py-1 text-xs"
            >
              <option value="STOCK">STOCK</option>
              <option value="CRYPTO">CRYPTO</option>
              <option value="FOREX">FOREX</option>
            </select>
            <input
              type="text"
              value={compSymbol}
              onChange={(e) => setCompSymbol(e.target.value.toUpperCase())}
              placeholder="Symbol (e.g. TCS, ETHUSDT)"
              className="w-36 bg-background border border-border rounded-lg px-2 py-1 text-xs font-mono"
            />
            <Button
              size="sm"
              icon={<Plus size={13} />}
              onClick={() => {
                if (!compSymbol.trim()) return;
                const palette = ['#78A9FF', '#F5B942', '#C084FC'];
                setComparisons((prev) => [
                  ...prev.slice(0, 2),
                  {
                    assetClass: compClass,
                    symbol: compSymbol.trim(),
                    color: palette[prev.length % palette.length],
                  },
                ]);
              }}
            >
              Add
            </Button>
          </div>
        </Card>
      )}

      {/* Workspace: Left Drawing Toolbar + Chart Area */}
      <div className="flex gap-3">
        {/* Drawing Tools Rail */}
        <div className="hidden sm:flex flex-col gap-1.5 p-2 rounded-2xl border border-border bg-surface h-fit">
          {tools.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTool(t.id)}
              title={t.label}
              className={`p-2 rounded-xl flex items-center justify-center transition-colors ${
                activeTool === t.id
                  ? 'bg-primary text-white'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
              }`}
            >
              {t.icon}
            </button>
          ))}
        </div>

        {/* Charts Grid */}
        <div className={`flex-1 grid gap-4 ${dualMode ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1'}`}>
          <TerminalChartPane
            config={leftConfig}
            onConfigChange={handleLeftChange}
            activeTool={activeTool}
            onToolComplete={() => setActiveTool('NONE')}
            customIndicators={customIndicators}
            activeCustomIds={activeCustomIds}
            comparisonInstruments={comparisons}
            normalizedComparison={normalizedComparison}
            height={dualMode ? 430 : 520}
            onVisibleRangeChange={(r) => dualMode && syncRange && setSyncedLogicalRange(r)}
          />

          {dualMode && (
            <TerminalChartPane
              config={rightConfig}
              onConfigChange={handleRightChange}
              activeTool={activeTool}
              onToolComplete={() => setActiveTool('NONE')}
              customIndicators={customIndicators}
              activeCustomIds={activeCustomIds}
              height={430}
              syncedRange={syncRange ? syncedLogicalRange : null}
            />
          )}
        </div>
      </div>

      {/* Custom Indicator Builder Modal */}
      <Modal
        isOpen={showBuilder}
        onClose={() => setShowBuilder(false)}
        title="Custom Technical Indicator Builder"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <form onSubmit={handleCreateCustomIndicator} className="space-y-3">
            <div>
              <label className="text-xs text-text-secondary block mb-1">Indicator Name</label>
              <input
                type="text"
                value={indName}
                onChange={(e) => setIndName(e.target.value)}
                placeholder="e.g., Fast-Slow Spread"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-text-primary"
              />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">
                Safe Formula Expression
              </label>
              <input
                type="text"
                value={indExpr}
                onChange={(e) => setIndExpr(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs font-mono text-text-primary"
              />
              <p className="text-[11px] text-text-muted mt-1">
                Fields: <code>open, high, low, close, volume, pct_change</code> • Functions:{' '}
                <code>sma(x,n), ema(x,n), wma(x,n), abs(x), min(a,b), max(a,b), if(cond,a,b)</code>
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div>
                <label className="text-xs text-text-secondary block mb-1">Color</label>
                <input
                  type="color"
                  value={indColor}
                  onChange={(e) => setIndColor(e.target.value)}
                  className="h-8 w-14 rounded bg-background border border-border"
                />
              </div>
              <div>
                <label className="text-xs text-text-secondary block mb-1">Placement</label>
                <select
                  value={indPane}
                  onChange={(e) => setIndPane(e.target.value as 'OVERLAY' | 'SEPARATE')}
                  className="bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-text-primary"
                >
                  <option value="OVERLAY">Price Overlay</option>
                  <option value="SEPARATE">Separate Oscillator Pane</option>
                </select>
              </div>
            </div>
            {indError && <div className="text-xs text-danger">{indError}</div>}
            <Button type="submit" size="sm">
              Save & Apply Indicator
            </Button>
          </form>

          {customIndicators.length > 0 && (
            <div className="pt-3 border-t border-border space-y-2">
              <div className="text-xs font-mono text-text-muted uppercase">Saved Indicators</div>
              {customIndicators.map((ci) => {
                const enabled = activeCustomIds.includes(ci.id);
                return (
                  <div
                    key={ci.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-surface border border-border text-xs"
                  >
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) =>
                          setActiveCustomIds((prev) =>
                            e.target.checked ? [...prev, ci.id] : prev.filter((id) => id !== ci.id)
                          )
                        }
                      />
                      <span className="font-semibold text-text-primary">{ci.name}</span>
                      <code className="text-[11px] text-text-muted">{ci.expression}</code>
                    </label>
                    <button
                      onClick={async () => {
                        await api.charts.deleteCustomIndicator(ci.id);
                        setCustomIndicators((prev) => prev.filter((x) => x.id !== ci.id));
                      }}
                      className="text-text-muted hover:text-danger"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>

      {/* Saved Layouts Modal */}
      <Modal
        isOpen={showLayouts}
        onClose={() => setShowLayouts(false)}
        title="Chart Layouts"
        maxWidth="md"
      >
        <div className="space-y-4">
          <form onSubmit={handleSaveLayout} className="flex gap-2">
            <input
              type="text"
              value={layoutName}
              onChange={(e) => setLayoutName(e.target.value)}
              placeholder="Layout name (e.g., NIFTY + BTC Dual)"
              className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-text-primary"
            />
            <Button type="submit" size="sm">
              Save Current
            </Button>
          </form>
          <div className="space-y-2">
            {layouts.map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between p-2.5 rounded-lg bg-surface border border-border text-xs"
              >
                <button
                  onClick={() => {
                    if (l.layout.leftConfig) setLeftConfig(l.layout.leftConfig);
                    if (l.layout.rightConfig) setRightConfig(l.layout.rightConfig);
                    if (l.layout.dualMode !== undefined) setDualMode(l.layout.dualMode);
                    setShowLayouts(false);
                  }}
                  className="font-semibold text-text-primary hover:text-primary text-left"
                >
                  {l.name}
                </button>
                <button
                  onClick={async () => {
                    await api.charts.deleteLayout(l.id);
                    setLayouts((prev) => prev.filter((x) => x.id !== l.id));
                  }}
                  className="text-text-muted hover:text-danger"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
};
