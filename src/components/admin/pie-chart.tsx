import React from 'react';

interface PieChartProps {
  data: { name: string; value: number; color?: string }[];
  size?: number;
  showLegend?: boolean;
  className?: string;
}

export default function PieChart({ data, size = 200, showLegend = true, className = "" }: PieChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center text-muted-foreground ${className}`} style={{ width: size, height: size }}>
        No data available
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
  
  let currentAngle = 0;
  const center = size / 2;
  const radius = (size - 40) / 2;

  const segments = data.map((item, index) => {
    const percentage = total > 0 ? (item.value / total) * 100 : 0;
    const angle = (item.value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const color = item.color || colors[index % colors.length];

    // Calculate path for pie slice
    const startAngleRad = (startAngle - 90) * (Math.PI / 180);
    const endAngleRad = (endAngle - 90) * (Math.PI / 180);
    
    const x1 = center + radius * Math.cos(startAngleRad);
    const y1 = center + radius * Math.sin(startAngleRad);
    const x2 = center + radius * Math.cos(endAngleRad);
    const y2 = center + radius * Math.sin(endAngleRad);
    
    const largeArcFlag = angle > 180 ? 1 : 0;
    
    const pathData = [
      `M ${center} ${center}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ');

    return {
      ...item,
      color,
      percentage: percentage.toFixed(1),
      pathData,
    };
  });

  return (
    <div className={`flex items-start space-x-4 ${className}`}>
      <svg width={size} height={size} className="drop-shadow-sm">
        {segments.map((segment, index) => (
          <g key={index}>
            <path
              d={segment.pathData}
              fill={segment.color}
              stroke="white"
              strokeWidth="2"
              className="transition-opacity hover:opacity-80"
            />
          </g>
        ))}
      </svg>
      
      {showLegend && (
        <div className="space-y-2">
          {segments.map((segment, index) => (
            <div key={index} className="flex items-center space-x-2 text-sm">
              <div 
                className="w-3 h-3 rounded-sm" 
                style={{ backgroundColor: segment.color }}
              />
              <span className="text-muted-foreground">
                {segment.name}: {segment.percentage}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}