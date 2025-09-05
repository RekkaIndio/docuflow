"use client";
import React from 'react';

interface OccupancyPieProps {
  percent?: number | null; // 0..100, optional
  size?: number;
  strokeWidth?: number;
  color?: string;
  gradientColors?: { start: string; end: string }; // New prop for gradient
  bgColor?: string;
  centerClassName?: string;
  centerFill?: string;
  centerFontSize?: number;
}
export default function OccupancyPie({ 
  percent = null, 
  size = 120, 
  strokeWidth = 18, 
  color = '#06b6d4', 
  gradientColors,
  bgColor = '#cbd5e1', 
  centerClassName, 
  centerFill = '#0f172a', 
  centerFontSize 
}: OccupancyPieProps) {
  const hasValue = typeof percent === 'number';
  const clamped = hasValue ? Math.max(0, Math.min(100, percent as number)) : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (clamped / 100) * circumference;
  // Use a slightly larger default font size for better consistency across cards
  const computedFontSize = centerFontSize ?? Math.round(size * 0.25);
  
  // Generate unique IDs for gradients
  const gradientId = `gradient-${Math.random().toString(36).substr(2, 9)}`;
  const centerGradientId = `center-gradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          {/* Linear gradient for the stroke (left->right) */}
          {gradientColors ? (
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={gradientColors.start} />
              <stop offset="100%" stopColor={gradientColors.end} />
            </linearGradient>
          ) : (
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={color} />
              <stop offset="100%" stopColor={color} />
            </linearGradient>
          )}
          {/* Radial gradient for the inner fill: darker center -> lighter edge (darker stops for better contrast) */}
          <radialGradient id={centerGradientId} cx="50%" cy="50%" r="50%">
            {/* Darker center extends further toward the edge for stronger contrast */}
            <stop offset="0%" stopColor={gradientColors ? gradientColors.end : color} stopOpacity="1" />
            <stop offset="55%" stopColor={gradientColors ? gradientColors.end : color} stopOpacity="0.98" />
            <stop offset="85%" stopColor={gradientColors ? gradientColors.start : color} stopOpacity="0.86" />
            <stop offset="100%" stopColor={gradientColors ? gradientColors.start : color} stopOpacity="0.72" />
          </radialGradient>
        </defs>

        {/* shift and rotate so stroke starts at top */}
        <g transform={`translate(${size / 2}, ${size / 2}) rotate(-90)`}>
          {/* background ring */}
          <circle r={radius} fill="none" stroke={bgColor} strokeWidth={strokeWidth} />
          {/* progress ring */}
          {hasValue ? (
            <circle
              r={radius}
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circumference}`}
              style={{ transition: 'stroke-dasharray 0.5s, stroke-dashoffset 0.5s' }}
            />
          ) : (
            <circle r={radius} fill="none" stroke="#cbd5e1" strokeWidth={strokeWidth} strokeDasharray={`${circumference} ${circumference}`} />
          )}
        </g>

        {/* Inner circle with radial gradient (darker center -> lighter edge). No dark border. */}
        <circle
          cx="50%"
          cy="50%"
          r={radius - strokeWidth / 2 - 2}
          fill={`url(#${centerGradientId})`}
        />

        {/* Center percentage - large white with drop shadow */}
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          fontSize={computedFontSize}
          fontWeight={700}
          fill="#ffffff"
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))' }}
          className={centerClassName}
        >
          {hasValue ? `${Math.round(clamped)}%` : '--'}
        </text>
      </svg>
    </div>
  );
}
