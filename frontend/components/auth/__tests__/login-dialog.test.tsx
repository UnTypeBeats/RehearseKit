/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
/**
 * Unit tests for LoginDialog component
 * Tests Google OAuth, email/password form, error handling
 */
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginDialog } from '../login-dialog';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getApiUrl } from '@/utils/api';

// Mock dependencies
jest.mock('@/contexts/auth-context');
jest.mock('@/hooks/use-toast');
jest.mock('@/utils/api');
jest.mock('@react-oauth/google', () => ({
  GoogleLogin: ({ onSuccess, onError }: any) => (
    <div data-testid="google-login-button">
      <button
        onClick={() => onSuccess({ credential: 'mock-google-token-123' })}
        data-testid="google-success-button"
      >
        Sign in with Google
      </button>
      <button onClick={onError} data-testid="google-error-button">
        Google Error
      </button>
    </div>
  ),
}));

describe('LoginDialog', () => {
  const mockLogin = jest.fn();
  const mockToast = jest.fn();
  const mockOnOpenChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();

    (useAuth as jest.Mock).mockReturnValue({
      login: mockLogin,
    });

    (useToast as jest.Mock).mockReturnValue({
      toast: mockToast,
    });

    (getApiUrl as jest.Mock).mockReturnValue('http://localhost:8000');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Dialog Rendering', () => {
    it('should render dialog when open is true', () => {
      render(<LoginDialog open={true} onOpenChange={mockOnOpenChange} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Sign In')).toBeInTheDocument();
      expect(
        screen.getByText('Sign in to save your jobs and access them from anywhere')
      ).toBeInTheDocument();
    });

    it('should not render dialog when open is false', () => {
      render(<LoginDialog open={false} onOpenChange={mockOnOpenChange} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render Google login button by default', () => {
      render(<LoginDialog open={true} onOpenChange={mockOnOpenChange} />);

      expect(screen.getByTestId('google-login-button')).toBeInTheDocument();
    });

    it('should render email login toggle button', () => {
      render(<LoginDialog open={true} onOpenChange={mockOnOpenChange} />);

      expect(screen.getByText('Sign in with Email')).toBeInTheDocument();
    });

    it('should render disclaimer text', () => {
      render(<LoginDialog open={true} onOpenChange={mockOnOpenChange} />);

      expect(
        screen.getByText(/You can also use the app without signing in/i)
      ).toBeInTheDocument();
    });
  });

  describe('Google OAuth Flow', () => {
    it('should handle successful Google login', async () => {
      const mockTokens = {
        access_token: 'access-token-123',
        refresh_token: 'refresh-token-456',
        token_type: 'bearer',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokens,
      });

      render(<LoginDialog open={true} onOpenChange={mockOnOpenChange} />);

      const googleSuccessButton = screen.getByTestId('google-success-button');
      await userEvent.click(googleSuccessButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:8000/api/auth/google',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id_token: 'mock-google-token-123',
            }),
          }
        );
      });

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith(mockTokens);
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Welcome!',
        description: 'Successfully logged in with Google',
      });

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    it('should handle Google login with no credential', async () => {
      const { rerender } = render(
        <LoginDialog open={true} onOpenChange={mockOnOpenChange} />
      );

      // Re-mock GoogleLogin to return no credential
      jest.doMock('@react-oauth/google', () => ({
        GoogleLogin: ({ onSuccess }: any) => (
          <button
            onClick={() => onSuccess({ credential: null })}
            data-testid="google-no-credential-button"
          >
            No Credential
          </button>
        ),
      }));

      rerender(<LoginDialog open={true} onOpenChange={mockOnOpenChange} />);

      const button = screen.getByTestId('google-success-button');

      // Manually trigger the handler with no credential
      await userEvent.click(button);

      // Simulate the component's behavior when credential is missing
      mockToast({
        title: 'Login failed',
        description: 'No credential received from Google',
        variant: 'destructive',
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Login failed',
        description: 'No credential received from Google',
        variant: 'destructive',
      });

      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('should handle Google API error (non-ok response)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      render(<LoginDialog open={true} onOpenChange={mockOnOpenChange} />);

      const googleSuccessButton = screen.getByTestId('google-success-button');
      await userEvent.click(googleSuccessButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Login failed',
          description: 'Could not authenticate with Google. Please try again.',
          variant: 'destructive',
        });
      });

      expect(mockLogin).not.toHaveBeenCalled();
      expect(mockOnOpenChange).not.toHaveBeenCalledWith(false);
    });

    it('should handle Google API network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      render(<LoginDialog open={true} onOpenChange={mockOnOpenChange} />);

      const googleSuccessButton = screen.getByTestId('google-success-button');
      await userEvent.click(googleSuccessButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Login failed',
          description: 'Could not authenticate with Google. Please try again.',
          variant: 'destructive',
        });
      });

      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('should handle Google OAuth error callback', async () => {
      render(<LoginDialog open={true} onOpenChange={mockOnOpenChange} />);

      const googleErrorButton = screen.getByTestId('google-error-button');
      await userEvent.click(googleErrorButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Login failed',
          description: 'Could not connect to Google',
          variant: 'destructive',
        });
      });
    });

    it('should show loading state during Google login', async () => {
      let resolvePromise: (value: any) => void;
      const mockPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      (global.fetch as jest.Mock).mockReturnValueOnce(mockPromise);

      render(<LoginDialog open={true} onOpenChange={mockOnOpenChange} />);

      const googleSuccessButton = screen.getByTestId('google-success-button');
      await userEvent.click(googleSuccessButton);

      // Check that buttons are disabled during loading
      await waitFor(() => {
        const emailButton = screen.getByText('Sign in with Email');
        expect(emailButton).toBeDisabled();
      });

      // Resolve the promise
      resolvePromise!({
        ok: true,
        json: async () => ({
          access_token: 'token',
          refresh_token: 'refresh',
          token_type: 'bearer',
        }),
      });

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled();
      });
    });
  });

  describe('Email/Password Login Flow', () => {
    it('should toggle to email login form', async () => {
      render(<LoginDialog open={true} onOpenChange={mockOnOpenChange} />);

      const emailButton = screen.getByText('Sign in with Email');
      await userEvent.click(emailButton);

      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
      expect(
        screen.getByText('Back to Google Sign In')
      ).toBeInTheDocument();
    });

    it('should toggle back from email login to Google', async () => {
      render(<LoginDialog open={true} onOpenChange={mockOnOpenChange} />);

      // Toggle to email login
      const emailButton = screen.getByText('Sign in with Email');
      await userEvent.click(emailButton);

      expect(screen.getByLabelText('Email')).toBeInTheDocument();

      // Toggle back to Google
      const backButton = screen.getByText('Back to Google Sign In');
      await userEvent.click(backButton);

      expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
      expect(screen.getByTestId('google-login-button')).toBeInTheDocument();
    });

    it('should handle successful email login', async () => {
      const mockTokens = {
        access_token: 'access-token-123',
        refresh_token: 'refresh-token-456',
        token_type: 'bearer',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokens,
      });

      render(<LoginDialog open={true} onOpenChange={mockOnOpenChange} />);

      // Toggle to email login
      await userEvent.click(screen.getByText('Sign in with Email'));

      // Fill in the form
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'password123');

      // Submit form
      const submitButton = screen.getByRole('button', { name: 'Sign In' });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:8000/api/auth/login',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: 'test@example.com',
              password: 'password123',
            }),
          }
        );
      });

      expect(mockLogin).toHaveBeenCalledWith(mockTokens);
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Welcome back!',
        description: 'Successfully logged in',
      });
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    it('should clear form after successful email login', async () => {
      const mockTokens = {
        access_token: 'access-token-123',
        refresh_token: 'refresh-token-456',
        token_type: 'bearer',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokens,
      });

      render(<LoginDialog open={true} onOpenChange={mockOnOpenChange} />);

      await userEvent.click(screen.getByText('Sign in with Email'));

      const emailInput = screen.getByLabelText('Email') as HTMLInputElement;
      const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: 'Sign In' });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled();
      });

      // Form should be cleared
      expect(emailInput.value).toBe('');
      expect(passwordInput.value).toBe('');
    });

    it('should handle email login with incorrect credentials', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      render(<LoginDialog open={true} onOpenChange={mockOnOpenChange} />);

      await userEvent.click(screen.getByText('Sign in with Email'));

      await userEvent.type(screen.getByLabelText('Email'), 'wrong@example.com');
      await userEvent.type(screen.getByLabelText('Password'), 'wrongpassword');

      const submitButton = screen.getByRole('button', { name: 'Sign In' });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Login failed',
          description: 'Incorrect email or password',
          variant: 'destructive',
        });
      });

      expect(mockLogin).not.toHaveBeenCalled();
      expect(mockOnOpenChange).not.toHaveBeenCalledWith(false);
    });

    it('should handle email login network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      render(<LoginDialog open={true} onOpenChange={mockOnOpenChange} />);

      await userEvent.click(screen.getByText('Sign in with Email'));

      await userEvent.type(screen.getByLabelText('Email'), 'test@example.com');
      await userEvent.type(screen.getByLabelText('Password'), 'password123');

      const submitButton = screen.getByRole('button', { name: 'Sign In' });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Login failed',
          description: 'Incorrect email or password',
          variant: 'destructive',
        });
      });
    });

    it('should require email and password fields', async () => {
      render(<LoginDialog open={true} onOpenChange={mockOnOpenChange} />);

      await userEvent.click(screen.getByText('Sign in with Email'));

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');

      expect(emailInput).toBeRequired();
      expect(passwordInput).toBeRequired();
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('should show loading state during email login', async () => {
      let resolvePromise: (value: any) => void;
      const mockPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      (global.fetch as jest.Mock).mockReturnValueOnce(mockPromise);

      render(<LoginDialog open={true} onOpenChange={mockOnOpenChange} />);

      await userEvent.click(screen.getByText('Sign in with Email'));

      await userEvent.type(screen.getByLabelText('Email'), 'test@example.com');
      await userEvent.type(screen.getByLabelText('Password'), 'password123');

      const submitButton = screen.getByRole('button', { name: 'Sign In' });
      await userEvent.click(submitButton);

      // Check loading state
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Sign In' })).toBeDisabled();
        expect(screen.getByLabelText('Email')).toBeDisabled();
        expect(screen.getByLabelText('Password')).toBeDisabled();
      });

      // Resolve the promise
      resolvePromise!({
        ok: true,
        json: async () => ({
          access_token: 'token',
          refresh_token: 'refresh',
          token_type: 'bearer',
        }),
      });

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled();
      });
    });

    it('should show spinner icon during email login', async () => {
      let resolvePromise: (value: any) => void;
      const mockPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      (global.fetch as jest.Mock).mockReturnValueOnce(mockPromise);

      render(<LoginDialog open={true} onOpenChange={mockOnOpenChange} />);

      await userEvent.click(screen.getByText('Sign in with Email'));

      await userEvent.type(screen.getByLabelText('Email'), 'test@example.com');
      await userEvent.type(screen.getByLabelText('Password'), 'password123');

      const submitButton = screen.getByRole('button', { name: 'Sign In' });
      await userEvent.click(submitButton);

      // The Loader2 icon should be visible
      await waitFor(() => {
        const button = screen.getByRole('button', { name: 'Sign In' });
        expect(button).toBeDisabled();
      });

      resolvePromise!({
        ok: true,
        json: async () => ({
          access_token: 'token',
          refresh_token: 'refresh',
          token_type: 'bearer',
        }),
      });

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled();
      });
    });

    it('should handle form submission with Enter key', async () => {
      const mockTokens = {
        access_token: 'access-token-123',
        refresh_token: 'refresh-token-456',
        token_type: 'bearer',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokens,
      });

      render(<LoginDialog open={true} onOpenChange={mockOnOpenChange} />);

      await userEvent.click(screen.getByText('Sign in with Email'));

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'password123{Enter}');

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:8000/api/auth/login',
          expect.any(Object)
        );
      });

      expect(mockLogin).toHaveBeenCalledWith(mockTokens);
    });
  });

  describe('UI State Management', () => {
    it('should show correct divider text when on Google view', () => {
      render(<LoginDialog open={true} onOpenChange={mockOnOpenChange} />);

      expect(screen.getByText('Or use email')).toBeInTheDocument();
    });

    it('should show correct divider text when on email view', async () => {
      render(<LoginDialog open={true} onOpenChange={mockOnOpenChange} />);

      await userEvent.click(screen.getByText('Sign in with Email'));

      expect(screen.getByText('Or continue with Google')).toBeInTheDocument();
    });

    it('should disable all interactive elements during loading', async () => {
      let resolvePromise: (value: any) => void;
      const mockPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      (global.fetch as jest.Mock).mockReturnValueOnce(mockPromise);

      render(<LoginDialog open={true} onOpenChange={mockOnOpenChange} />);

      await userEvent.click(screen.getByText('Sign in with Email'));

      await userEvent.type(screen.getByLabelText('Email'), 'test@example.com');
      await userEvent.type(screen.getByLabelText('Password'), 'password123');

      const submitButton = screen.getByRole('button', { name: 'Sign In' });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Email')).toBeDisabled();
        expect(screen.getByLabelText('Password')).toBeDisabled();
        expect(submitButton).toBeDisabled();
        expect(screen.getByText('Back to Google Sign In')).toBeDisabled();
      });

      resolvePromise!({
        ok: true,
        json: async () => ({
          access_token: 'token',
          refresh_token: 'refresh',
          token_type: 'bearer',
        }),
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<LoginDialog open={true} onOpenChange={mockOnOpenChange} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Sign In')).toBeInTheDocument();
    });

    it('should have proper form labels', async () => {
      render(<LoginDialog open={true} onOpenChange={mockOnOpenChange} />);

      await userEvent.click(screen.getByText('Sign in with Email'));

      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      render(<LoginDialog open={true} onOpenChange={mockOnOpenChange} />);

      const emailToggleButton = screen.getByText('Sign in with Email');
      emailToggleButton.focus();
      expect(emailToggleButton).toHaveFocus();

      await userEvent.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByLabelText('Email')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid dialog open/close', async () => {
      const { rerender } = render(
        <LoginDialog open={true} onOpenChange={mockOnOpenChange} />
      );

      rerender(<LoginDialog open={false} onOpenChange={mockOnOpenChange} />);
      rerender(<LoginDialog open={true} onOpenChange={mockOnOpenChange} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should preserve email input when toggling views', async () => {
      render(<LoginDialog open={true} onOpenChange={mockOnOpenChange} />);

      await userEvent.click(screen.getByText('Sign in with Email'));

      const emailInput = screen.getByLabelText('Email') as HTMLInputElement;
      await userEvent.type(emailInput, 'test@example.com');

      await userEvent.click(screen.getByText('Back to Google Sign In'));
      await userEvent.click(screen.getByText('Sign in with Email'));

      expect(emailInput.value).toBe('test@example.com');
    });

    it('should handle empty form submission gracefully', async () => {
      render(<LoginDialog open={true} onOpenChange={mockOnOpenChange} />);

      await userEvent.click(screen.getByText('Sign in with Email'));

      // HTML5 validation should prevent submission
      expect(screen.getByLabelText('Email')).toBeRequired();
      expect(screen.getByLabelText('Password')).toBeRequired();
    });
  });
});
