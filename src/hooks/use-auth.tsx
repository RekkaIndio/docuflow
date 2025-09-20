
'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { User } from '@/lib/types';
import { createUserInFirestore } from '@/lib/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<any>;
  signUp: (email: string, pass: string, name: string) => Promise<any>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const { uid, email, displayName, photoURL } = firebaseUser;
        // Basic user fields from Firebase auth; then hydrate with server-side user doc
        const basicUser = { id: uid, email, name: displayName, avatarUrl: photoURL };
        setUser(basicUser);
        try { if (typeof window !== 'undefined') (window as any).__USER__ = basicUser; } catch (e) {}

        // Keep loading true until server-side hydration completes so components
        // relying on user.organisationId don't fire premature admin requests.
        (async () => {
          try {
            const resp = await fetch(`/api/users/${uid}`);
            if (resp && resp.ok) {
              const serverUser = await resp.json();
              const merged = ({ ...(basicUser as any), ...(serverUser || {}) } as any);
              setUser(merged);
              try { if (typeof window !== 'undefined') (window as any).__USER__ = merged; } catch (e) {}
            }
          } catch (e) {
            // ignore hydration failures
          } finally {
            setLoading(false);
          }
        })();
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signIn = (email: string, pass: string) => {
    return signInWithEmailAndPassword(auth, email, pass);
  };

  const signUp = async (email: string, pass: string, name: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const firebaseUser = userCredential.user;
    
    await updateProfile(firebaseUser, { displayName: name });
    
    const newUser: User = {
        id: firebaseUser.uid,
        name: name,
        email: email,
        avatarUrl: null
    };
    await createUserInFirestore(newUser);
    // Hydrate with server-side fields (organisationId, role, etc.)
    try {
      const resp = await fetch(`/api/users/${newUser.id}`);
      if (resp && resp.ok) {
        const serverUser = await resp.json();
        setUser({ ...(newUser as any), ...(serverUser || {}) });
      } else {
        setUser(newUser);
      }
    } catch (e) {
      setUser(newUser);
    }
    return userCredential;
  };

  const signOut = () => {
    if (typeof document !== 'undefined') {
      // clear cookie
      document.cookie = 'isAdmin=; Path=/; Max-Age=0';
    }
    return firebaseSignOut(auth);
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};
