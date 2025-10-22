'use client';

/**
 * Authentication Context
 * Manages user authentication state and provides auth methods
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, AuthTokens, setTokens, clearTokens, getAccessToken, refreshAccessToken } from '@/utils/auth';
import { getApiUrl } from '@/utils/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (tokens: AuthTokens) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const apiUrl = getApiUrl();

  /**
   * Fetch current user profile
   */
  const fetchUser = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else if (response.status === 401) {
        // Token expired, try to refresh
        const refreshed = await refreshAccessToken(apiUrl);
        if (refreshed) {
          // Retry fetching user
          const retryResponse = await fetch(`${apiUrl}/api/auth/me`, {
            headers: {
              Authorization: `Bearer ${getAccessToken()}`,
            },
          });
          if (retryResponse.ok) {
            const userData = await retryResponse.json();
            setUser(userData);
          } else {
            clearTokens();
            setUser(null);
          }
        } else {
          clearTokens();
          setUser(null);
        }
      } else {
        clearTokens();
        setUser(null);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl]);

  /**
   * Initialize auth state on mount
   */
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  /**
   * Auto-refresh token before expiry
   */
  useEffect(() => {
    if (!user) return;

    // Refresh token every 20 hours (before 24h expiry)
    const refreshInterval = setInterval(async () => {
      await refreshAccessToken(apiUrl);
    }, 20 * 60 * 60 * 1000); // 20 hours

    return () => clearInterval(refreshInterval);
  }, [user, apiUrl]);

  /**
   * Login with tokens
   */
  const login = useCallback(async (tokens: AuthTokens) => {
    setTokens(tokens);
    await fetchUser();
  }, [fetchUser]);

  /**
   * Logout
   */
  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
    
    // Optionally call logout endpoint
    fetch(`${apiUrl}/api/auth/logout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getAccessToken()}`,
      },
    }).catch(() => {
      // Ignore errors
    });
  }, [apiUrl]);

  /**
   * Refresh user data
   */
  const refreshUser = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use auth context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
