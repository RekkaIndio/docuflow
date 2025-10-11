"use client";
import React from 'react';

interface AuditDonutProps {
  completed: number;
  total: number;
  size?: number;
  strokeWidth?: number;
  completedColor?: string;
  incompleteColor?: string;
  ariaLabel?: string;
}

export default function AuditDonut({
  completed,
  total,
  size = 120,
  strokeWidth = 14,
  completedColor = '#34d399',
  incompleteColor = '#e5e7eb',
  ariaLabel
}: AuditDonutProps) {
  const clampedTotal = Math.max(0, total);
  const clampedCompleted = Math.min(Math.max(0, completed), clampedTotal);
  const percent = clampedTotal > 0 ? Math.round((clampedCompleted / clampedTotal) * 100) : 0;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const completedDash = (percent / 100) * circumference;
  const incompleteDash = circumference - completedDash;

  // simple unique id so multiple donuts can live on the same page
  const id = Math.random().toString(36).slice(2, 9);

  return (
    <div className="flex items-center gap-4" role="img" aria-label={ariaLabel ?? `Audits: ${completed} of ${total} completed`}> 
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <g transform={`translate(${size / 2}, ${size / 2}) rotate(-90)`}>
          <defs>
            <linearGradient id={`filled-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={completedColor} />
              <stop offset="100%" stopColor={completedColor} />
            </linearGradient>
          </defs>

          <circle r={radius} fill="none" stroke={incompleteColor} strokeWidth={strokeWidth} />

          {/* Completed segment */}
          <circle
            r={radius}
            fill="none"
            stroke={`url(#filled-${id})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${completedDash} ${incompleteDash}`}
            style={{ transition: 'stroke-dasharray 420ms ease 0s' }}
          />
        </g>

        {/* Inner label */}
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize={Math.round(size * 0.18)} fontWeight={700} fill="#ffffff">
          {clampedTotal > 0 ? `${clampedCompleted}/${clampedTotal}` : '--'}
        </text>

        {/* small percent label below */}
        <text x="50%" y={size * 0.72} dominantBaseline="middle" textAnchor="middle" fontSize={12} fill="#ffffff" fillOpacity="0.75">
          {clampedTotal > 0 ? `${percent}%` : ''}
        </text>
      </svg>

      {/* Simple legend */}
      <div className="flex flex-col text-sm">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full" style={{ background: completedColor }} aria-hidden />
          <span className="text-white font-medium">Completed</span>
          <span className="text-white/75 ml-2">{clampedCompleted}</span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className="w-3 h-3 rounded-full" style={{ background: incompleteColor }} aria-hidden />
          <span className="text-white font-medium">Incomplete</span>
          <span className="text-white/75 ml-2">{clampedTotal - clampedCompleted}</span>
        </div>
      </div>
    </div>
  );
}
