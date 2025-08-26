import React from 'react';

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
}

export default function Sparkline({ values, width = 120, height = 32, stroke = '#3b82f6', fill = 'rgba(59,130,246,0.12)' }: SparklineProps) {
  if (!values || values.length === 0) return <svg width={width} height={height} />;
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const step = width / Math.max(1, values.length - 1);

  const points = values.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / (max - min || 1)) * height;
    return `${x},${y}`;
  }).join(' ');

  const areaPath = `M0,${height} L${points} L${width},${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <path d={areaPath} fill={fill} />
      <polyline points={points} fill="none" stroke={stroke} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
