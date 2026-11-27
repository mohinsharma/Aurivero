import React from 'react';
import { IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts';

export type DrawingToolType =
  | 'NONE'
  | 'TRENDLINE'
  | 'HORIZONTAL'
  | 'VERTICAL'
  | 'RAY'
  | 'RECTANGLE'
  | 'FIBONACCI'
  | 'PRICE_LABEL';

export interface SavedDrawing {
  id: string;
  tool_type: Exclude<DrawingToolType, 'NONE'>;
  points: { time: number; price: number }[];
  style?: { color?: string };
  label?: string | null;
}

interface ChartDrawingOverlayProps {
  chart: IChartApi | null;
  series: ISeriesApi<any> | null;
  drawings: SavedDrawing[];
  pendingPoints: { time: number; price: number }[];
  activeTool: DrawingToolType;
  width: number;
  height: number;
  renderTick: number;
}

const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

export const ChartDrawingOverlay: React.FC<ChartDrawingOverlayProps> = ({
  chart,
  series,
  drawings,
  pendingPoints,
  activeTool,
  width,
  height,
}) => {
  if (!chart || !series || width === 0 || height === 0) return null;

  const ts = chart.timeScale();
  const toXY = (pt: { time: number; price: number }) => {
    const x = ts.timeToCoordinate(pt.time as UTCTimestamp);
    const y = series.priceToCoordinate(pt.price);
    if (x === null || y === null) return null;
    return { x, y };
  };

  const renderShape = (
    d: { id: string; tool_type: string; points: { time: number; price: number }[]; style?: any; label?: string | null },
    isPending = false
  ) => {
    const color = d.style?.color || (isPending ? '#F5B942' : '#78A9FF');
    const p1 = d.points[0] ? toXY(d.points[0]) : null;
    const p2 = d.points[1] ? toXY(d.points[1]) : null;

    if (d.tool_type === 'HORIZONTAL' && d.points[0]) {
      const y = series.priceToCoordinate(d.points[0].price);
      if (y === null) return null;
      return (
        <g key={d.id}>
          <line x1={0} y1={y} x2={width} y2={y} stroke={color} strokeWidth={1.5} strokeDasharray="4 3" />
          <text x={8} y={y - 4} fill={color} fontSize={10} fontFamily="JetBrains Mono">
            {d.label || d.points[0].price.toFixed(2)}
          </text>
        </g>
      );
    }

    if (d.tool_type === 'VERTICAL' && d.points[0]) {
      const x = ts.timeToCoordinate(d.points[0].time as UTCTimestamp);
      if (x === null) return null;
      return <line key={d.id} x1={x} y1={0} x2={x} y2={height} stroke={color} strokeWidth={1.5} strokeDasharray="4 3" />;
    }

    if (d.tool_type === 'PRICE_LABEL' && p1) {
      return (
        <g key={d.id}>
          <circle cx={p1.x} cy={p1.y} r={4} fill={color} />
          <rect x={p1.x + 6} y={p1.y - 11} width={96} height={18} rx={4} fill="#1A2531" stroke={color} strokeWidth={1} />
          <text x={p1.x + 12} y={p1.y + 2} fill="#F3F6F8" fontSize={10} fontFamily="JetBrains Mono">
            {d.label || d.points[0].price.toFixed(2)}
          </text>
        </g>
      );
    }

    if (d.tool_type === 'TRENDLINE' && p1 && p2) {
      return (
        <g key={d.id}>
          <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={color} strokeWidth={2} />
          <circle cx={p1.x} cy={p1.y} r={3} fill={color} />
          <circle cx={p2.x} cy={p2.y} r={3} fill={color} />
        </g>
      );
    }

    if (d.tool_type === 'RAY' && p1 && p2) {
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const scale = dx === 0 && dy === 0 ? 1 : Math.max(width, height) / Math.max(1, Math.hypot(dx, dy));
      const ex = p1.x + dx * scale * 2;
      const ey = p1.y + dy * scale * 2;
      return (
        <g key={d.id}>
          <line x1={p1.x} y1={p1.y} x2={ex} y2={ey} stroke={color} strokeWidth={2} />
          <circle cx={p1.x} cy={p1.y} r={3} fill={color} />
        </g>
      );
    }

    if (d.tool_type === 'RECTANGLE' && p1 && p2) {
      const rx = Math.min(p1.x, p2.x);
      const ry = Math.min(p1.y, p2.y);
      const rw = Math.abs(p2.x - p1.x);
      const rh = Math.abs(p2.y - p1.y);
      return (
        <rect
          key={d.id}
          x={rx}
          y={ry}
          width={rw}
          height={rh}
          fill="rgba(120, 169, 255, 0.12)"
          stroke={color}
          strokeWidth={1.5}
        />
      );
    }

    if (d.tool_type === 'FIBONACCI' && p1 && p2) {
      const startP = d.points[0].price;
      const endP = d.points[1].price;
      const leftX = Math.min(p1.x, p2.x);
      const rightX = Math.max(p1.x, p2.x, leftX + 140);
      return (
        <g key={d.id}>
          {FIB_LEVELS.map((lvl) => {
            const p = startP + (endP - startP) * lvl;
            const y = series.priceToCoordinate(p);
            if (y === null) return null;
            return (
              <g key={lvl}>
                <line x1={leftX} y1={y} x2={rightX} y2={y} stroke="#F5B942" strokeWidth={1} strokeDasharray="3 3" />
                <text x={leftX + 4} y={y - 3} fill="#F5B942" fontSize={9} fontFamily="JetBrains Mono">
                  {(lvl * 100).toFixed(1)}% ({p.toFixed(2)})
                </text>
              </g>
            );
          })}
        </g>
      );
    }

    if (p1) {
      return <circle key={d.id} cx={p1.x} cy={p1.y} r={4} fill={color} />;
    }
    return null;
  };

  return (
    <svg
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none z-10"
    >
      {drawings.map((d) => renderShape(d))}
      {pendingPoints.length > 0 &&
        activeTool !== 'NONE' &&
        renderShape({ id: 'pending', tool_type: activeTool, points: pendingPoints }, true)}
    </svg>
  );
};
