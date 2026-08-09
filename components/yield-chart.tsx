"use client";

import { useState } from "react";
import type { YieldPoint } from "@/lib/treasury";

export function YieldChart({ points }: { points: YieldPoint[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const width = 900;
  const height = 300;
  const pad = { top: 28, right: 20, bottom: 42, left: 48 };
  const values = points.map((point) => point.yield);
  const min = Math.floor(Math.min(...values) - 0.25);
  const max = Math.ceil(Math.max(...values) + 0.25);
  const x = (index: number) => pad.left + (index / Math.max(points.length - 1, 1)) * (width - pad.left - pad.right);
  const y = (value: number) => pad.top + ((max - value) / (max - min)) * (height - pad.top - pad.bottom);
  const line = points.map((point, index) => `${x(index)},${y(point.yield)}`).join(" ");
  const area = `${pad.left},${height - pad.bottom} ${line} ${x(points.length - 1)},${height - pad.bottom}`;
  const ticks = [min, min + (max - min) / 2, max];
  const hoveredPoint = hoveredIndex === null ? null : points[hoveredIndex];
  const tooltipWidth = 138;
  const tooltipHeight = 30;
  const tooltipX = hoveredIndex === null ? 0 : Math.min(Math.max(x(hoveredIndex) - tooltipWidth / 2, pad.left), width - pad.right - tooltipWidth);
  const tooltipY = hoveredPoint ? Math.max(y(hoveredPoint.yield) - tooltipHeight - 12, pad.top) : 0;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[680px] w-full" role="img" aria-label="Treasury yield curve chart">
        <defs>
          <linearGradient id="curve-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#00c805" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#00c805" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} stroke="#505050" strokeDasharray="4 6" />
            <text x={pad.left - 10} y={y(tick) + 4} fill="#a3adb5" fontSize="12" textAnchor="end">{tick.toFixed(1)}%</text>
          </g>
        ))}
        <polygon points={area} fill="url(#curve-fill)" />
        <polyline points={line} fill="none" stroke="#00c805" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => (
          <g key={point.term} onMouseEnter={() => setHoveredIndex(index)} onMouseLeave={() => setHoveredIndex(null)}>
            <circle cx={x(index)} cy={y(point.yield)} r="5" fill="#000000" stroke="#00c805" strokeWidth="2" aria-label={`${point.term} Treasury yield ${point.yield.toFixed(2)}%`}>
              <title>{`${point.term} Treasury: ${point.yield.toFixed(2)}%`}</title>
            </circle>
            <text x={x(index)} y={height - 16} fill="#b3bdc4" fontSize="12" textAnchor="middle">{point.term}</text>
          </g>
        ))}
        {hoveredPoint && hoveredIndex !== null && (
          <g pointerEvents="none">
            <rect x={tooltipX} y={tooltipY} width={tooltipWidth} height={tooltipHeight} rx="6" fill="#000000" stroke="#00c805" />
            <text x={tooltipX + tooltipWidth / 2} y={tooltipY + 19} fill="#f5f7f8" fontSize="12" textAnchor="middle">{`${hoveredPoint.term} · ${hoveredPoint.yield.toFixed(2)}%`}</text>
          </g>
        )}
      </svg>
    </div>
  );
}
