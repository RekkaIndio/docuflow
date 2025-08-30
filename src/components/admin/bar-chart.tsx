import React from 'react';

interface BarChartProps {
  data: { name: string; value: number; color?: string }[];
  height?: number;
  showValues?: boolean;
  className?: string;
}

export default function BarChart({ data, height = 200, showValues = true, className = "" }: BarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center text-muted-foreground ${className}`} style={{ height }}>
        No data available
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value));
  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

  return (
    <div className={`space-y-2 ${className}`}>
      {data.map((item, index) => {
        const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
        const color = item.color || colors[index % colors.length];
        
        return (
          <div key={item.name} className="flex items-center space-x-3">
            <div className="w-20 text-sm text-muted-foreground truncate" title={item.name}>
              {item.name}
            </div>
            <div className="flex-1 relative">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-sm overflow-hidden">
                <div 
                  className="h-full transition-all duration-500 ease-in-out rounded-sm"
                  style={{ 
                    width: `${percentage}%`, 
                    backgroundColor: color 
                  }}
                />
              </div>
              {showValues && (
                <div className="absolute inset-0 flex items-center justify-end pr-2">
                  <span className="text-xs font-medium text-white mix-blend-difference">
                    {item.value}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}