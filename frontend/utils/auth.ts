/**
 * Authentication utilities
 * Token management, API calls, and auth state handling
 */
import Cookies from 'js-cookie';

const TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export interface User {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  is_active: boolean;
  oauth_provider: string | null;
  created_at: string;
  last_login_at: string | null;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

/**
 * Store authentication tokens
 */
export function setTokens(tokens: AuthTokens): void {
  // Store in cookies (more secure than localStorage)
  Cookies.set(TOKEN_KEY, tokens.access_token, {
    expires: 1, // 1 day
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
  
  Cookies.set(REFRESH_TOKEN_KEY, tokens.refresh_token, {
    expires: 7, // 7 days
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
}

/**
 * Get access token
 */
export function getAccessToken(): string | undefined {
  return Cookies.get(TOKEN_KEY);
}

/**
 * Get refresh token
 */
export function getRefreshToken(): string | undefined {
  return Cookies.get(REFRESH_TOKEN_KEY);
}

/**
 * Clear all auth tokens
 */
export function clearTokens(): void {
  Cookies.remove(TOKEN_KEY);
  Cookies.remove(REFRESH_TOKEN_KEY);
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

/**
 * Add auth header to request options
 */
export function getAuthHeaders(): Record<string, string> {
  const token = getAccessToken();
  if (!token) return {};
  
  return {
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(apiUrl: string): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  
  try {
    const response = await fetch(`${apiUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    
    if (!response.ok) {
      clearTokens();
      return false;
    }
    
    const tokens: AuthTokens = await response.json();
    setTokens(tokens);
    return true;
  } catch (error) {
    console.error('Error refreshing token:', error);
    clearTokens();
    return false;
  }
}

