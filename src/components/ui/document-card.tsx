import { FileText, CalendarClock, AlertTriangle, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { handleDocumentClick } from '@/lib/document-utils';

interface DocumentCardProps {
  id?: string;
  name: string;
  status?: 'current' | 'due-soon' | 'overdue' | 'updated';
  statusText?: string;
  subtitle?: string;
  className?: string;
  onClick?: () => void;
  url?: string;
  lastReviewed?: string;
  nextReviewRequired?: string;
}

export function DocumentCard({ 
  id,
  name, 
  status = 'current', 
  statusText, 
  subtitle,
  className,
  onClick,
  url,
  lastReviewed,
  nextReviewRequired
}: DocumentCardProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'due-soon':
        return {
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          iconColor: 'text-orange-600',
          badgeVariant: 'secondary' as const,
          badgeClass: 'bg-orange-100 text-orange-700 border-orange-300',
          icon: AlertTriangle,
          defaultText: '⚠️ Due Soon'
        };
      case 'overdue':
        return {
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          iconColor: 'text-red-600',
          badgeVariant: 'destructive' as const,
          badgeClass: 'bg-red-100 text-red-700 border-red-300',
          icon: AlertTriangle,
          defaultText: '🔴 Overdue'
        };
      case 'updated':
        return {
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          iconColor: 'text-blue-600',
          badgeVariant: 'secondary' as const,
          badgeClass: 'bg-blue-100 text-blue-700 border-blue-300',
          icon: FileText,
          defaultText: '📝 Updated'
        };
      default: // current
        return {
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          iconColor: 'text-green-600',
          badgeVariant: 'secondary' as const,
          badgeClass: 'bg-green-100 text-green-700 border-green-300',
          icon: CheckCircle,
          defaultText: '✅ Current'
        };
    }
  };

  const config = getStatusConfig(status);
  const IconComponent = config.icon;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      // Use provided ID or generate one from the name
      const documentId = id || name.replace(/\s+/g, '-').toLowerCase().replace(/[^a-z0-9-]/g, '');
      handleDocumentClick(documentId, name, url);
    }
  };

  return (
    <div className="space-y-2">
      <div 
        className={cn(
          "p-3 rounded-lg flex items-center justify-between cursor-pointer hover:shadow-sm transition-shadow",
          config.bgColor,
          config.borderColor,
          "border",
          className
        )}
        onClick={handleClick}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <IconComponent className={cn("w-4 h-4 flex-shrink-0", config.iconColor)} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate">{name}</p>
            {subtitle && (
              <p className="text-xs text-gray-500 truncate">{subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 ml-2">
          {statusText ? (
            <span className="text-xs text-gray-500">{statusText}</span>
          ) : (
            <Badge variant={config.badgeVariant} className={config.badgeClass}>
              {config.defaultText}
            </Badge>
          )}
        </div>
      </div>
      
      {/* Additional metadata */}
      {(lastReviewed || nextReviewRequired) && (
        <div className="text-xs text-gray-500 px-3">
          {lastReviewed && `Last reviewed: ${lastReviewed}`}
          {lastReviewed && nextReviewRequired && ' • '}
          {nextReviewRequired && `Next review required ${nextReviewRequired}`}
        </div>
      )}
    </div>
  );
}
