import React from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: LucideIcon;
  accent?: string;
  description?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function MetricCard({ 
  title, 
  value, 
  change, 
  changeType = 'neutral',
  icon: Icon,
  accent = 'text-primary',
  description,
  className = "",
  size = 'md'
}: MetricCardProps) {
  const sizeClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  };

  const textSizes = {
    sm: { title: 'text-sm', value: 'text-lg', change: 'text-xs' },
    md: { title: 'text-sm', value: 'text-2xl', change: 'text-sm' },
    lg: { title: 'text-base', value: 'text-3xl', change: 'text-sm' }
  };

  const getChangeColor = (type: string) => {
    switch (type) {
      case 'positive': return 'text-green-600 dark:text-green-400';
      case 'negative': return 'text-red-600 dark:text-red-400';
      default: return 'text-muted-foreground';
    }
  };

  const getChangeIcon = (type: string) => {
    switch (type) {
      case 'positive': return '↗';
      case 'negative': return '↘';
      default: return '→';
    }
  };

  return (
    <Card className={`transition-all hover:shadow-md ${className}`}>
      <CardContent className={sizeClasses[size]}>
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <div className="flex items-center space-x-2">
              {Icon && <Icon className={`w-4 h-4 ${accent}`} />}
              <p className={`font-medium text-muted-foreground ${textSizes[size].title}`}>
                {title}
              </p>
            </div>
            
            <p className={`font-bold ${textSizes[size].value}`}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            
            {change && (
              <div className={`flex items-center space-x-1 ${textSizes[size].change}`}>
                <span className={getChangeColor(changeType)}>
                  {getChangeIcon(changeType)} {change}
                </span>
              </div>
            )}
            
            {description && (
              <p className="text-xs text-muted-foreground mt-1">
                {description}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}