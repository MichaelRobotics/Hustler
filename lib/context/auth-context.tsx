'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthenticatedUser } from '@/lib/middleware/simple-auth';

interface AuthContextType {
  user: AuthenticatedUser | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  hasAccess: boolean;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/user/profile', {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          setUser(null);
          return;
        }
        throw new Error(`Failed to fetch user: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setUser(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch user');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch user';
      setError(errorMessage);
      setUser(null);
      console.error('Error fetching user:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
    hasAccess: user?.accessLevel !== 'no_access',
    refetch: fetchUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
