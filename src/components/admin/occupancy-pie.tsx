"use client";
import React from 'react';

interface OccupancyPieProps {
  percent?: number | null; // 0..100, optional
  size?: number;
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
}

export default function OccupancyPie({ percent = null, size = 120, strokeWidth = 18, color = '#06b6d4', bgColor = '#e6eef0' }: OccupancyPieProps) {
  const hasValue = typeof percent === 'number';
  const clamped = hasValue ? Math.max(0, Math.min(100, percent as number)) : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (clamped / 100) * circumference;

  return (
    <div className="flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`translate(${size / 2}, ${size / 2}) rotate(-90)`}>
          <circle r={radius} fill="none" stroke={bgColor} strokeWidth={strokeWidth} />
          {hasValue ? (
            <circle
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circumference}`}
            />
          ) : (
            // muted ring when value is missing
            <circle r={radius} fill="none" stroke="#cbd5e1" strokeWidth={strokeWidth} strokeDasharray={`${circumference} ${circumference}`} />
          )}
        </g>
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize={size * 0.18} fontWeight={700} fill="#0f172a">
          {hasValue ? `${Math.round(clamped)}%` : '--'}
        </text>
      </svg>
    </div>
  );
}
