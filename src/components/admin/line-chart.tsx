import React from 'react';

interface LineChartProps {
  data: { date: string; value: number }[];
  width?: number;
  height?: number;
  color?: string;
  showDots?: boolean;
  showGrid?: boolean;
  className?: string;
}

export default function LineChart({ 
  data, 
  width = 400, 
  height = 200, 
  color = '#3b82f6',
  showDots = true,
  showGrid = true,
  className = ""
}: LineChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center text-muted-foreground ${className}`} style={{ width, height }}>
        No data available
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const minValue = Math.min(...data.map(d => d.value), 0);
  const range = maxValue - minValue || 1;
  
  const padding = 20;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  
  const stepX = chartWidth / Math.max(1, data.length - 1);
  
  const points = data.map((point, index) => {
    const x = padding + index * stepX;
    const y = padding + chartHeight - ((point.value - minValue) / range) * chartHeight;
    return { x, y, value: point.value, date: point.date };
  });

  const pathData = points.map((point, index) => 
    `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
  ).join(' ');

  const areaPathData = `${pathData} L ${points[points.length - 1].x} ${height - padding} L ${padding} ${height - padding} Z`;

  const gridLines = [];
  if (showGrid) {
    // Horizontal grid lines
    for (let i = 0; i <= 4; i++) {
      const y = padding + (chartHeight / 4) * i;
      gridLines.push(
        <line
          key={`h-${i}`}
          x1={padding}
          y1={y}
          x2={width - padding}
          y2={y}
          stroke="currentColor"
          strokeOpacity="0.1"
          strokeWidth="1"
        />
      );
    }
    
    // Vertical grid lines (every 5th point)
    for (let i = 0; i < points.length; i += 5) {
      const x = points[i].x;
      gridLines.push(
        <line
          key={`v-${i}`}
          x1={x}
          y1={padding}
          x2={x}
          y2={height - padding}
          stroke="currentColor"
          strokeOpacity="0.1"
          strokeWidth="1"
        />
      );
    }
  }

  return (
    <div className={className}>
      <svg width={width} height={height} className="overflow-visible">
        {gridLines}
        
        {/* Area fill */}
        <path
          d={areaPathData}
          fill={color}
          fillOpacity="0.1"
        />
        
        {/* Line */}
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        
        {/* Data points */}
        {showDots && points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="3"
            fill={color}
            stroke="white"
            strokeWidth="2"
            className="hover:r-4 transition-all cursor-pointer"
          >
            <title>{`${point.date}: ${point.value}`}</title>
          </circle>
        ))}
      </svg>
      
      {/* X-axis labels */}
      <div className="flex justify-between text-xs text-muted-foreground mt-2" style={{ width }}>
        <span>{data[0]?.date}</span>
        <span>{data[Math.floor(data.length / 2)]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}