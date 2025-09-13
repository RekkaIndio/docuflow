import { CheckSquare, Clock, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ActionCardProps {
  id?: string;
  title: string;
  description?: string;
  status?: 'pending' | 'completed' | 'overdue';
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
  className?: string;
  onClick?: () => void;
}

export function ActionCard({
  id,
  title,
  description,
  status = 'pending',
  dueDate,
  priority = 'medium',
  className,
  onClick
}: ActionCardProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          iconColor: 'text-green-600',
          badgeClass: 'bg-green-100 text-green-700',
          icon: CheckSquare,
          text: 'Completed'
        };
      case 'overdue':
        return {
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          iconColor: 'text-red-600',
          badgeClass: 'bg-red-100 text-red-700',
          icon: AlertCircle,
          text: 'Overdue'
        };
      default: // pending
        return {
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          iconColor: 'text-blue-600',
          badgeClass: 'bg-blue-100 text-blue-700',
          icon: Clock,
          text: 'Pending'
        };
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-yellow-600';
    }
  };

  const config = getStatusConfig(status);
  const IconComponent = config.icon;

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <div
      className={cn(
        "p-3 rounded-lg border hover:shadow-sm transition-shadow cursor-pointer",
        config.bgColor,
        config.borderColor,
        className
      )}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        <IconComponent className={cn("w-5 h-5 flex-shrink-0 mt-0.5", config.iconColor)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-sm truncate">{title}</p>
            <Badge className={cn("text-xs", config.badgeClass)}>
              {config.text}
            </Badge>
          </div>
          {description && (
            <p className="text-xs text-gray-600 mb-2">{description}</p>
          )}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            {dueDate && (
              <span>Due: {new Date(dueDate).toLocaleDateString()}</span>
            )}
            <span className={getPriorityColor(priority)}>
              {priority.charAt(0).toUpperCase() + priority.slice(1)} priority
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}