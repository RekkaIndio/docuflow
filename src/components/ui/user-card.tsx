import { User, Mail, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface UserCardProps {
  id?: string;
  name: string;
  email?: string;
  role?: string;
  avatarUrl?: string;
  createdAt?: string;
  className?: string;
  onClick?: () => void;
}

export function UserCard({
  id,
  name,
  email,
  role,
  avatarUrl,
  createdAt,
  className,
  onClick
}: UserCardProps) {
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
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <User className="w-5 h-5 text-gray-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{name}</p>
          {email && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Mail className="w-3 h-3" />
              <span className="truncate">{email}</span>
            </div>
          )}
          {role && (
            <Badge variant="outline" className="text-xs mt-1">
              {role}
            </Badge>
          )}
        </div>
        {createdAt && (
          <div className="flex items-center gap-1 text-xs text-gray-500 flex-shrink-0">
            <Calendar className="w-3 h-3" />
            <span>{new Date(createdAt).toLocaleDateString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}