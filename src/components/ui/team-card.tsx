import { Users, UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TeamCardProps {
  id?: string;
  name: string;
  memberCount?: number;
  description?: string;
  className?: string;
  onClick?: () => void;
}

export function TeamCard({
  id,
  name,
  memberCount = 0,
  description,
  className,
  onClick
}: TeamCardProps) {
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <div
      className={cn(
        "p-3 rounded-lg border border-gray-200 bg-white hover:shadow-sm transition-shadow cursor-pointer",
        className
      )}
      onClick={handleClick}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
          <Users className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{name}</p>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <UserPlus className="w-3 h-3" />
            <span>{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
          </div>
          {description && (
            <p className="text-xs text-gray-600 mt-1 truncate">{description}</p>
          )}
        </div>
        <Badge variant="secondary" className="text-xs">
          Team
        </Badge>
      </div>
    </div>
  );
}