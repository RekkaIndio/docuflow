declare module '@/hooks/use-auth' {
  import type { ReactNode } from 'react';
  import type { User } from '@/lib/types';

  export const AuthProvider: ({ children }: { children: ReactNode }) => JSX.Element;

  export function useAuth(): {
    user: User | null;
    loading: boolean;
    signIn: (email: string, pass: string) => Promise<any>;
    signUp: (email: string, pass: string, name: string) => Promise<any>;
    signOut: () => Promise<void>;
  };
}
