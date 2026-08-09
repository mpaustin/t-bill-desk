"use client";

import type { YieldPoint } from "@/lib/treasury";

export function YieldChart({ points }: { points: YieldPoint[] }) {
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

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[680px] w-full" role="img" aria-label="Treasury yield curve chart">
        <defs>
          <linearGradient id="curve-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#56d6c9" stopOpacity="0.23" />
            <stop offset="100%" stopColor="#56d6c9" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} stroke="#243342" strokeDasharray="4 6" />
            <text x={pad.left - 10} y={y(tick) + 4} fill="#70818e" fontSize="12" textAnchor="end">{tick.toFixed(1)}%</text>
          </g>
        ))}
        <polygon points={area} fill="url(#curve-fill)" />
        <polyline points={line} fill="none" stroke="#56d6c9" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => (
          <g key={point.term}>
            <circle cx={x(index)} cy={y(point.yield)} r="5" fill="#0b1118" stroke="#56d6c9" strokeWidth="2" />
            <text x={x(index)} y={height - 16} fill="#91a1ab" fontSize="12" textAnchor="middle">{point.term}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}
