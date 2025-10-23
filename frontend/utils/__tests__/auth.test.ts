import Cookies from 'js-cookie';
import {
  setTokens,
  getAccessToken,
  getRefreshToken,
  clearTokens,
  isAuthenticated,
  getAuthHeaders,
  refreshAccessToken,
  AuthTokens,
} from '../auth';

// Mock js-cookie
jest.mock('js-cookie');

describe('auth utils', () => {
  const mockAccessToken = 'mock-access-token';
  const mockRefreshToken = 'mock-refresh-token';
  const mockTokens: AuthTokens = {
    access_token: mockAccessToken,
    refresh_token: mockRefreshToken,
    token_type: 'Bearer',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
  });

  describe('setTokens', () => {
    it('should set both access and refresh tokens in cookies', () => {
      setTokens(mockTokens);

      expect(Cookies.set).toHaveBeenCalledWith('access_token', mockAccessToken, {
        expires: 1,
        secure: false,
        sameSite: 'lax',
      });
      expect(Cookies.set).toHaveBeenCalledWith('refresh_token', mockRefreshToken, {
        expires: 7,
        secure: false,
        sameSite: 'lax',
      });
    });

    it('should use secure cookies in production', () => {
      process.env.NODE_ENV = 'production';
      setTokens(mockTokens);

      expect(Cookies.set).toHaveBeenCalledWith('access_token', mockAccessToken, {
        expires: 1,
        secure: true,
        sameSite: 'lax',
      });
    });
  });

  describe('getAccessToken', () => {
    it('should return access token from cookies', () => {
      (Cookies.get as jest.Mock).mockReturnValue(mockAccessToken);

      const token = getAccessToken();

      expect(Cookies.get).toHaveBeenCalledWith('access_token');
      expect(token).toBe(mockAccessToken);
    });

    it('should return undefined when no access token exists', () => {
      (Cookies.get as jest.Mock).mockReturnValue(undefined);

      const token = getAccessToken();

      expect(token).toBeUndefined();
    });
  });

  describe('getRefreshToken', () => {
    it('should return refresh token from cookies', () => {
      (Cookies.get as jest.Mock).mockReturnValue(mockRefreshToken);

      const token = getRefreshToken();

      expect(Cookies.get).toHaveBeenCalledWith('refresh_token');
      expect(token).toBe(mockRefreshToken);
    });

    it('should return undefined when no refresh token exists', () => {
      (Cookies.get as jest.Mock).mockReturnValue(undefined);

      const token = getRefreshToken();

      expect(token).toBeUndefined();
    });
  });

  describe('clearTokens', () => {
    it('should remove both access and refresh tokens', () => {
      clearTokens();

      expect(Cookies.remove).toHaveBeenCalledWith('access_token');
      expect(Cookies.remove).toHaveBeenCalledWith('refresh_token');
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when access token exists', () => {
      (Cookies.get as jest.Mock).mockReturnValue(mockAccessToken);

      expect(isAuthenticated()).toBe(true);
    });

    it('should return false when no access token exists', () => {
      (Cookies.get as jest.Mock).mockReturnValue(undefined);

      expect(isAuthenticated()).toBe(false);
    });
  });

  describe('getAuthHeaders', () => {
    it('should return headers with Bearer token when authenticated', () => {
      (Cookies.get as jest.Mock).mockReturnValue(mockAccessToken);

      const headers = getAuthHeaders();

      expect(headers).toEqual({
        Authorization: `Bearer ${mockAccessToken}`,
      });
    });

    it('should return empty object when not authenticated', () => {
      (Cookies.get as jest.Mock).mockReturnValue(undefined);

      const headers = getAuthHeaders();

      expect(headers).toEqual({});
    });
  });

  describe('refreshAccessToken', () => {
    const mockApiUrl = 'http://localhost:8000';

    beforeEach(() => {
      global.fetch = jest.fn();
    });

    it('should refresh access token successfully', async () => {
      const newTokens: AuthTokens = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        token_type: 'Bearer',
      };
      (Cookies.get as jest.Mock).mockReturnValue(mockRefreshToken);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => newTokens,
      });

      const result = await refreshAccessToken(mockApiUrl);

      expect(global.fetch).toHaveBeenCalledWith(`${mockApiUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: mockRefreshToken }),
      });
      expect(Cookies.set).toHaveBeenCalledTimes(2); // Both tokens
      expect(result).toBe(true);
    });

    it('should return false when no refresh token available', async () => {
      (Cookies.get as jest.Mock).mockReturnValue(undefined);

      const result = await refreshAccessToken(mockApiUrl);

      expect(result).toBe(false);
    });

    it('should return false and clear tokens when refresh fails', async () => {
      (Cookies.get as jest.Mock).mockReturnValue(mockRefreshToken);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
      });

      const result = await refreshAccessToken(mockApiUrl);

      expect(result).toBe(false);
      expect(Cookies.remove).toHaveBeenCalledWith('access_token');
      expect(Cookies.remove).toHaveBeenCalledWith('refresh_token');
    });

    it('should handle network errors', async () => {
      (Cookies.get as jest.Mock).mockReturnValue(mockRefreshToken);
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await refreshAccessToken(mockApiUrl);

      expect(result).toBe(false);
      expect(Cookies.remove).toHaveBeenCalledWith('access_token');
      expect(Cookies.remove).toHaveBeenCalledWith('refresh_token');
    });
  });
});
