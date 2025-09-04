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
  const computedFontSize = centerFontSize ?? size * 0.18;
  
  // Generate unique IDs for gradients
  const gradientId = `gradient-${Math.random().toString(36).substr(2, 9)}`;
  const centerGradientId = `center-gradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          {/* Radial gradient for the stroke */}
          {gradientColors && (
            <radialGradient id={gradientId} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={gradientColors.start} />
              <stop offset="100%" stopColor={gradientColors.end} />
            </radialGradient>
          )}
          {/* Radial gradient for the center - matches the stroke colors but darker */}
          <radialGradient id={centerGradientId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={gradientColors ? gradientColors.start : "#334155"} />
            <stop offset="100%" stopColor={gradientColors ? gradientColors.end : "#1e293b"} />
          </radialGradient>
        </defs>
        <g transform={`translate(${size / 2}, ${size / 2}) rotate(-90)`}>
          <circle r={radius} fill="none" stroke={bgColor} strokeWidth={strokeWidth} />
          {hasValue ? (
            <circle
              r={radius}
              fill="none"
              stroke={gradientColors ? `url(#${gradientId})` : color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circumference}`}
            />
          ) : (
            // muted ring when value is missing
            <circle r={radius} fill="none" stroke="#cbd5e1" strokeWidth={strokeWidth} strokeDasharray={`${circumference} ${circumference}`} />
          )}
        </g>
        {/* Center circle with gradient and blue border */}
        <circle
          cx="50%"
          cy="50%"
          r={radius - strokeWidth / 2}
          fill={`url(#${centerGradientId})`}
          stroke="#334155"
          strokeWidth="2"
        />
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          fontSize={computedFontSize}
          fontWeight={700}
          fill="#ffffff"
          className={centerClassName}
        >
          {hasValue ? `${Math.round(clamped)}%` : '--'}
        </text>
      </svg>
    </div>
  );
}
