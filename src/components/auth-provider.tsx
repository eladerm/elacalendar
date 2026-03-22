
"use client";

import { createContext, useState, ReactNode, useCallback, useEffect } from 'react';
import type { User } from '@/lib/types';
import { useRouter, usePathname } from 'next/navigation';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (identifier: string, pass: string) => Promise<User | null>;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const publicRoutes = ['/login', '/forgot-password', '/reset-password'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const sessionUser = sessionStorage.getItem('user');
    if (sessionUser) {
      setUser(JSON.parse(sessionUser));
    }
    setLoading(false);
  }, []);
  
  useEffect(() => {
    if (loading) return;

    const isPublicRoute = publicRoutes.includes(pathname);

    if (user && isPublicRoute) {
      router.push('/');
    }
    
    if (!user && !isPublicRoute) {
      router.push('/login');
    }
  }, [user, loading, pathname, router]);

  const login = async (identifier: string, pass: string): Promise<User | null> => {
    const usersRef = collection(db, 'users');
    const identifierLower = identifier.toLowerCase();
    
    // We search by any of the identifiers and check that the status is NOT inactive
    const q = query(usersRef, where('employeeId', '==', identifier), limit(1));
    const q2 = query(usersRef, where('username', '==', identifierLower), limit(1));
    const q3 = query(usersRef, where('email', '==', identifierLower), limit(1));

    try {
        const querySnapshots = await Promise.all([getDocs(q), getDocs(q2), getDocs(q3)]);
        let foundUserDoc;

        for (const snapshot of querySnapshots) {
            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                const data = doc.data() as User;
                // Only allow login if user is not inactive
                if (data.status !== 'inactive') {
                    foundUserDoc = doc;
                    break;
                }
            }
        }

        if (foundUserDoc) {
            const userData = foundUserDoc.data() as User;
            if (userData.password === pass) {
                const finalUser: User = { ...userData, id: foundUserDoc.id };
                setUser(finalUser);
                sessionStorage.setItem('user', JSON.stringify(finalUser));
                router.push('/');
                return finalUser;
            }
        }
        return null;
    } catch (error) {
        console.error("Error during login:", error);
        return null;
    }
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('user');
    router.push('/login');
  };

  const updateUser = (data: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...data };
      setUser(updatedUser);
      sessionStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  if (loading && !user && !publicRoutes.includes(pathname)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted">
        <p>Cargando sesión...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}
