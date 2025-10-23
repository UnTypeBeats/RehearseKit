import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../auth-context';
import * as authUtils from '@/utils/auth';
import * as apiUtils from '@/utils/api';

// Mock dependencies
jest.mock('js-cookie');
jest.mock('@/utils/auth');
jest.mock('@/utils/api');

// Mock console.error to avoid noise in test output
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});
afterAll(() => {
  console.error = originalError;
});

describe('AuthContext', () => {
  const mockApiUrl = 'http://localhost:8000';
  const mockAccessToken = 'mock-access-token';
  const mockRefreshToken = 'mock-refresh-token';
  const mockUser: authUtils.User = {
    id: 'user-123',
    email: 'test@example.com',
    full_name: 'Test User',
    avatar_url: 'https://example.com/avatar.jpg',
    is_admin: false,
    is_active: true,
    oauth_provider: 'google',
    created_at: '2024-01-01T00:00:00Z',
    last_login_at: '2024-01-02T00:00:00Z',
  };
  const mockTokens: authUtils.AuthTokens = {
    access_token: mockAccessToken,
    refresh_token: mockRefreshToken,
    token_type: 'Bearer',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();

    // Setup default mocks
    (apiUtils.getApiUrl as jest.Mock).mockReturnValue(mockApiUrl);
    (authUtils.getAccessToken as jest.Mock).mockReturnValue(undefined);
    (authUtils.setTokens as jest.Mock).mockImplementation(() => {});
    (authUtils.clearTokens as jest.Mock).mockImplementation(() => {});
    (authUtils.refreshAccessToken as jest.Mock).mockResolvedValue(false);

    // Mock global fetch
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('useAuth hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      // Suppress console.error for this test
      const spy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');

      spy.mockRestore();
    });

    it('should return auth context when used within AuthProvider', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current).toHaveProperty('user');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('isAuthenticated');
      expect(result.current).toHaveProperty('login');
      expect(result.current).toHaveProperty('logout');
      expect(result.current).toHaveProperty('refreshUser');
    });
  });

  describe('Initial state', () => {
    it('should start with loading state and no user when no token exists', async () => {
      (authUtils.getAccessToken as jest.Mock).mockReturnValue(undefined);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Initial state - loading may complete synchronously when no token
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should fetch user on mount when token exists', async () => {
      (authUtils.getAccessToken as jest.Mock).mockReturnValue(mockAccessToken);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockUser,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(global.fetch).toHaveBeenCalledWith(`${mockApiUrl}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${mockAccessToken}`,
        },
      });
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe('User fetching', () => {
    it('should successfully fetch and set user when API returns 200', async () => {
      (authUtils.getAccessToken as jest.Mock).mockReturnValue(mockAccessToken);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockUser,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle 401 error and attempt token refresh', async () => {
      (authUtils.getAccessToken as jest.Mock)
        .mockReturnValueOnce(mockAccessToken)
        .mockReturnValueOnce('new-access-token');
      (authUtils.refreshAccessToken as jest.Mock).mockResolvedValue(true);

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUser,
        });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(authUtils.refreshAccessToken).toHaveBeenCalledWith(mockApiUrl);
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(result.current.user).toEqual(mockUser);
    });

    it('should clear tokens when refresh fails after 401', async () => {
      (authUtils.getAccessToken as jest.Mock).mockReturnValue(mockAccessToken);
      (authUtils.refreshAccessToken as jest.Mock).mockResolvedValue(false);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(authUtils.clearTokens).toHaveBeenCalled();
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should clear tokens when retry fetch fails after successful refresh', async () => {
      (authUtils.getAccessToken as jest.Mock).mockReturnValue(mockAccessToken);
      (authUtils.refreshAccessToken as jest.Mock).mockResolvedValue(true);
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(authUtils.clearTokens).toHaveBeenCalled();
      expect(result.current.user).toBeNull();
    });

    it('should clear tokens on non-401 error responses', async () => {
      (authUtils.getAccessToken as jest.Mock).mockReturnValue(mockAccessToken);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(authUtils.clearTokens).toHaveBeenCalled();
      expect(result.current.user).toBeNull();
    });

    it('should handle network errors gracefully', async () => {
      (authUtils.getAccessToken as jest.Mock).mockReturnValue(mockAccessToken);
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('login function', () => {
    it('should set tokens and fetch user on successful login', async () => {
      (authUtils.getAccessToken as jest.Mock).mockReturnValue(undefined);
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404 });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();

      // Now setup for login
      (authUtils.getAccessToken as jest.Mock).mockReturnValue(mockAccessToken);
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => mockUser });

      await act(async () => {
        await result.current.login(mockTokens);
      });

      expect(authUtils.setTokens).toHaveBeenCalledWith(mockTokens);

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should handle login failure when user fetch fails', async () => {
      (authUtils.getAccessToken as jest.Mock).mockReturnValue(mockAccessToken);
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: false, status: 404 }) // Initial mount
        .mockResolvedValueOnce({ ok: false, status: 500 }); // After login

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.login(mockTokens);
      });

      expect(authUtils.setTokens).toHaveBeenCalledWith(mockTokens);
      expect(authUtils.clearTokens).toHaveBeenCalled();
      expect(result.current.user).toBeNull();
    });
  });

  describe('logout function', () => {
    it('should clear tokens and user state', async () => {
      (authUtils.getAccessToken as jest.Mock).mockReturnValue(mockAccessToken);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockUser,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      act(() => {
        result.current.logout();
      });

      expect(authUtils.clearTokens).toHaveBeenCalled();
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should call logout endpoint', async () => {
      (authUtils.getAccessToken as jest.Mock).mockReturnValue(mockAccessToken);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockUser,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      (global.fetch as jest.Mock).mockClear();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      act(() => {
        result.current.logout();
      });

      // Wait for logout API call
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(`${mockApiUrl}/api/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${mockAccessToken}`,
          },
        });
      });
    });

    it('should ignore errors from logout endpoint', async () => {
      (authUtils.getAccessToken as jest.Mock).mockReturnValue(mockAccessToken);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockUser,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      act(() => {
        result.current.logout();
      });

      // Should not throw error
      expect(result.current.user).toBeNull();
      expect(authUtils.clearTokens).toHaveBeenCalled();
    });
  });

  describe('refreshUser function', () => {
    it('should refetch user data', async () => {
      (authUtils.getAccessToken as jest.Mock).mockReturnValue(mockAccessToken);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockUser,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      const updatedUser = { ...mockUser, full_name: 'Updated Name' };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => updatedUser,
      });

      await act(async () => {
        await result.current.refreshUser();
      });

      expect(result.current.user).toEqual(updatedUser);
    });

    it('should clear user on refresh failure', async () => {
      (authUtils.getAccessToken as jest.Mock).mockReturnValue(mockAccessToken);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockUser,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      });

      await act(async () => {
        await result.current.refreshUser();
      });

      expect(result.current.user).toBeNull();
    });
  });

  describe('Auto-refresh token', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should set up auto-refresh interval when user is logged in', async () => {
      (authUtils.getAccessToken as jest.Mock).mockReturnValue(mockAccessToken);
      (authUtils.refreshAccessToken as jest.Mock).mockResolvedValue(true);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockUser,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Wait for user to be loaded
      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      // Clear mock to verify refresh call
      (authUtils.refreshAccessToken as jest.Mock).mockClear();

      // Fast-forward time by 20 hours
      await act(async () => {
        jest.advanceTimersByTime(20 * 60 * 60 * 1000);
        // Allow promises to resolve
        await Promise.resolve();
      });

      expect(authUtils.refreshAccessToken).toHaveBeenCalledWith(mockApiUrl);
    });

    it('should refresh token multiple times at 20-hour intervals', async () => {
      (authUtils.getAccessToken as jest.Mock).mockReturnValue(mockAccessToken);
      (authUtils.refreshAccessToken as jest.Mock).mockResolvedValue(true);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockUser,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Wait for user to be loaded
      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      (authUtils.refreshAccessToken as jest.Mock).mockClear();

      // Fast-forward 20 hours - first refresh
      await act(async () => {
        jest.advanceTimersByTime(20 * 60 * 60 * 1000);
        await Promise.resolve();
      });

      expect(authUtils.refreshAccessToken).toHaveBeenCalledTimes(1);

      // Fast-forward another 20 hours - second refresh
      await act(async () => {
        jest.advanceTimersByTime(20 * 60 * 60 * 1000);
        await Promise.resolve();
      });

      expect(authUtils.refreshAccessToken).toHaveBeenCalledTimes(2);

      // Fast-forward another 20 hours - third refresh
      await act(async () => {
        jest.advanceTimersByTime(20 * 60 * 60 * 1000);
        await Promise.resolve();
      });

      expect(authUtils.refreshAccessToken).toHaveBeenCalledTimes(3);
    });

    it('should not set up auto-refresh when user is not logged in', async () => {
      (authUtils.getAccessToken as jest.Mock).mockReturnValue(undefined);

      renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(global.fetch).not.toHaveBeenCalled();
      });

      (authUtils.refreshAccessToken as jest.Mock).mockClear();

      // Fast-forward time by 20 hours
      act(() => {
        jest.advanceTimersByTime(20 * 60 * 60 * 1000);
      });

      // Should not call refresh
      expect(authUtils.refreshAccessToken).not.toHaveBeenCalled();
    });

    it('should clear interval when user logs out', async () => {
      (authUtils.getAccessToken as jest.Mock).mockReturnValue(mockAccessToken);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockUser,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      (authUtils.refreshAccessToken as jest.Mock).mockClear();

      // Logout
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      act(() => {
        result.current.logout();
      });

      // Fast-forward time - should not refresh after logout
      act(() => {
        jest.advanceTimersByTime(20 * 60 * 60 * 1000);
      });

      expect(authUtils.refreshAccessToken).not.toHaveBeenCalled();
    });

    it('should restart interval when user logs in', async () => {
      (authUtils.getAccessToken as jest.Mock).mockReturnValue(undefined);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // No interval should be set
      (authUtils.refreshAccessToken as jest.Mock).mockClear();
      act(() => {
        jest.advanceTimersByTime(20 * 60 * 60 * 1000);
      });
      expect(authUtils.refreshAccessToken).not.toHaveBeenCalled();

      // Login
      (authUtils.getAccessToken as jest.Mock).mockReturnValue(mockAccessToken);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockUser,
      });

      await act(async () => {
        await result.current.login(mockTokens);
      });

      (authUtils.refreshAccessToken as jest.Mock).mockClear();

      // Now interval should be active
      act(() => {
        jest.advanceTimersByTime(20 * 60 * 60 * 1000);
      });

      await waitFor(() => {
        expect(authUtils.refreshAccessToken).toHaveBeenCalled();
      });
    });
  });

  describe('isAuthenticated state', () => {
    it('should be false when user is null', async () => {
      (authUtils.getAccessToken as jest.Mock).mockReturnValue(undefined);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should be true when user is present', async () => {
      (authUtils.getAccessToken as jest.Mock).mockReturnValue(mockAccessToken);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockUser,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      expect(result.current.user).toEqual(mockUser);
    });

    it('should update when user state changes', async () => {
      (authUtils.getAccessToken as jest.Mock).mockReturnValue(mockAccessToken);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockUser,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      act(() => {
        result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('isLoading state', () => {
    it('should be true initially and false after user fetch completes', async () => {
      (authUtils.getAccessToken as jest.Mock).mockReturnValue(mockAccessToken);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockUser,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should be false after failed user fetch', async () => {
      (authUtils.getAccessToken as jest.Mock).mockReturnValue(mockAccessToken);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should be false when no token exists', async () => {
      (authUtils.getAccessToken as jest.Mock).mockReturnValue(undefined);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('Complex scenarios', () => {
    it('should handle login after initial mount with no user', async () => {
      (authUtils.getAccessToken as jest.Mock).mockReturnValue(undefined);
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404 });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();

      // Setup for login
      (authUtils.getAccessToken as jest.Mock).mockReturnValue(mockAccessToken);
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => mockUser });

      await act(async () => {
        await result.current.login(mockTokens);
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should handle multiple refreshUser calls', async () => {
      (authUtils.getAccessToken as jest.Mock).mockReturnValue(mockAccessToken);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockUser,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      const updates = [
        { ...mockUser, full_name: 'Update 1' },
        { ...mockUser, full_name: 'Update 2' },
        { ...mockUser, full_name: 'Update 3' },
      ];

      for (const update of updates) {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: async () => update,
        });

        await act(async () => {
          await result.current.refreshUser();
        });

        expect(result.current.user).toEqual(update);
      }
    });

    it('should handle token refresh during auto-refresh when user is still logged in', async () => {
      jest.useFakeTimers();

      (authUtils.getAccessToken as jest.Mock).mockReturnValue(mockAccessToken);
      (authUtils.refreshAccessToken as jest.Mock).mockResolvedValue(true);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockUser,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      (authUtils.refreshAccessToken as jest.Mock).mockClear();

      // Trigger auto-refresh
      act(() => {
        jest.advanceTimersByTime(20 * 60 * 60 * 1000);
      });

      await waitFor(() => {
        expect(authUtils.refreshAccessToken).toHaveBeenCalledWith(mockApiUrl);
      });

      // User should still be logged in
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);

      jest.useRealTimers();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty user response', async () => {
      (authUtils.getAccessToken as jest.Mock).mockReturnValue(mockAccessToken);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toEqual({});
      expect(result.current.isAuthenticated).toBe(true); // truthy check
    });

    it('should handle malformed JSON response', async () => {
      (authUtils.getAccessToken as jest.Mock).mockReturnValue(mockAccessToken);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();
    });

    it('should handle simultaneous login and refreshUser calls', async () => {
      (authUtils.getAccessToken as jest.Mock).mockReturnValue(undefined);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      (authUtils.getAccessToken as jest.Mock).mockReturnValue(mockAccessToken);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockUser,
      });

      // Call both simultaneously
      await act(async () => {
        await Promise.all([
          result.current.login(mockTokens),
          result.current.refreshUser(),
        ]);
      });

      expect(result.current.user).toEqual(mockUser);
    });
  });
});
