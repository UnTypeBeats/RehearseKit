/**
 * Unit tests for Header component
 * Tests navigation, auth state display, login dialog, and status indicator
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Header } from '../header';
import { useAuth } from '@/contexts/auth-context';
import { usePathname } from 'next/navigation';
import { User } from '@/utils/auth';

// Mock dependencies
jest.mock('@/contexts/auth-context');
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

// Mock child components
jest.mock('@/components/auth/user-menu', () => ({
  UserMenu: () => <div data-testid="user-menu">UserMenu</div>,
}));

jest.mock('@/components/auth/login-dialog', () => ({
  LoginDialog: ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => (
    <div data-testid="login-dialog" data-open={open}>
      <button onClick={() => onOpenChange(false)}>Close Dialog</button>
    </div>
  ),
}));

describe('Header', () => {
  const mockUser: User = {
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

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock values
    (usePathname as jest.Mock).mockReturnValue('/');
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  });

  describe('Rendering', () => {
    it('should render the header component', () => {
      render(<Header />);

      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('should render the RehearseKit logo and brand name', () => {
      render(<Header />);

      expect(screen.getByText('RehearseKit')).toBeInTheDocument();
      const logo = screen.getByText('RehearseKit').parentElement;
      expect(logo).toHaveAttribute('href', '/');
    });

    it('should render navigation links', () => {
      render(<Header />);

      const homeLink = screen.getByRole('link', { name: /home/i });
      const jobsLink = screen.getByRole('link', { name: /jobs/i });

      expect(homeLink).toBeInTheDocument();
      expect(homeLink).toHaveAttribute('href', '/');
      expect(jobsLink).toBeInTheDocument();
      expect(jobsLink).toHaveAttribute('href', '/jobs');
    });

    it('should render operational status indicator', () => {
      render(<Header />);

      const statusText = screen.getByText('Operational');
      expect(statusText).toBeInTheDocument();

      // Check for the animated status dot
      const statusDot = statusText.previousElementSibling;
      expect(statusDot).toHaveClass('bg-kit-success', 'animate-pulse-slow');
    });

    it('should have sticky header styling', () => {
      render(<Header />);

      const header = screen.getByRole('banner');
      expect(header).toHaveClass('sticky', 'top-0', 'z-50');
    });
  });

  describe('Navigation State', () => {
    it('should highlight Home link when on home page', () => {
      (usePathname as jest.Mock).mockReturnValue('/');

      render(<Header />);

      const homeLink = screen.getByRole('link', { name: /home/i });
      expect(homeLink).toHaveClass('text-foreground');
      expect(homeLink).not.toHaveClass('text-foreground/60');
    });

    it('should highlight Jobs link when on jobs page', () => {
      (usePathname as jest.Mock).mockReturnValue('/jobs');

      render(<Header />);

      const jobsLink = screen.getByRole('link', { name: /jobs/i });
      expect(jobsLink).toHaveClass('text-foreground');
      expect(jobsLink).not.toHaveClass('text-foreground/60');
    });

    it('should dim non-active navigation links', () => {
      (usePathname as jest.Mock).mockReturnValue('/jobs');

      render(<Header />);

      const homeLink = screen.getByRole('link', { name: /home/i });
      expect(homeLink).toHaveClass('text-foreground/60');
    });

    it('should apply hover effect to navigation links', () => {
      render(<Header />);

      const homeLink = screen.getByRole('link', { name: /home/i });
      expect(homeLink).toHaveClass('hover:text-foreground/80');
    });

    it('should handle unknown pathname gracefully', () => {
      (usePathname as jest.Mock).mockReturnValue('/unknown-path');

      render(<Header />);

      const homeLink = screen.getByRole('link', { name: /home/i });
      const jobsLink = screen.getByRole('link', { name: /jobs/i });

      expect(homeLink).toHaveClass('text-foreground/60');
      expect(jobsLink).toHaveClass('text-foreground/60');
    });
  });

  describe('Authentication State - Loading', () => {
    it('should not render auth UI when loading', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: true,
      });

      render(<Header />);

      expect(screen.queryByText('Sign In')).not.toBeInTheDocument();
      expect(screen.queryByTestId('user-menu')).not.toBeInTheDocument();
    });

    it('should render logo and navigation during auth loading', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: true,
      });

      render(<Header />);

      expect(screen.getByText('RehearseKit')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
    });
  });

  describe('Authentication State - Not Authenticated', () => {
    it('should render Sign In button when not authenticated', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });

      render(<Header />);

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      expect(signInButton).toBeInTheDocument();
    });

    it('should not render UserMenu when not authenticated', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });

      render(<Header />);

      expect(screen.queryByTestId('user-menu')).not.toBeInTheDocument();
    });

    it('should render LogIn icon in Sign In button', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });

      render(<Header />);

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      const icon = signInButton.querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('h-4', 'w-4');
    });

    it('should have correct styling for Sign In button', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });

      render(<Header />);

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      expect(signInButton).toHaveClass('gap-2');
    });
  });

  describe('Authentication State - Authenticated', () => {
    it('should render UserMenu when authenticated', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
      });

      render(<Header />);

      expect(screen.getByTestId('user-menu')).toBeInTheDocument();
    });

    it('should not render Sign In button when authenticated', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
      });

      render(<Header />);

      expect(screen.queryByRole('button', { name: /sign in/i })).not.toBeInTheDocument();
    });
  });

  describe('Login Dialog', () => {
    it('should not show login dialog initially', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });

      render(<Header />);

      const loginDialog = screen.getByTestId('login-dialog');
      expect(loginDialog).toHaveAttribute('data-open', 'false');
    });

    it('should open login dialog when Sign In button is clicked', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });

      render(<Header />);

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      await userEvent.click(signInButton);

      await waitFor(() => {
        const loginDialog = screen.getByTestId('login-dialog');
        expect(loginDialog).toHaveAttribute('data-open', 'true');
      });
    });

    it('should close login dialog when onOpenChange is called with false', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });

      render(<Header />);

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      await userEvent.click(signInButton);

      await waitFor(() => {
        const loginDialog = screen.getByTestId('login-dialog');
        expect(loginDialog).toHaveAttribute('data-open', 'true');
      });

      const closeButton = screen.getByText('Close Dialog');
      await userEvent.click(closeButton);

      await waitFor(() => {
        const loginDialog = screen.getByTestId('login-dialog');
        expect(loginDialog).toHaveAttribute('data-open', 'false');
      });
    });

    it('should not render login dialog when authenticated', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
      });

      render(<Header />);

      const loginDialog = screen.getByTestId('login-dialog');
      expect(loginDialog).toHaveAttribute('data-open', 'false');
    });

    it('should allow opening and closing login dialog multiple times', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });

      render(<Header />);

      const signInButton = screen.getByRole('button', { name: /sign in/i });

      // Open first time
      await userEvent.click(signInButton);
      await waitFor(() => {
        expect(screen.getByTestId('login-dialog')).toHaveAttribute('data-open', 'true');
      });

      // Close
      const closeButton = screen.getByText('Close Dialog');
      await userEvent.click(closeButton);
      await waitFor(() => {
        expect(screen.getByTestId('login-dialog')).toHaveAttribute('data-open', 'false');
      });

      // Open second time
      await userEvent.click(signInButton);
      await waitFor(() => {
        expect(screen.getByTestId('login-dialog')).toHaveAttribute('data-open', 'true');
      });
    });
  });

  describe('Status Indicator', () => {
    it('should render status indicator with correct styling', () => {
      render(<Header />);

      const statusText = screen.getByText('Operational');
      const statusDot = statusText.previousElementSibling;

      expect(statusDot).toHaveClass('h-2', 'w-2', 'rounded-full', 'bg-kit-success', 'animate-pulse-slow');
    });

    it('should have title attribute on status dot', () => {
      render(<Header />);

      const statusText = screen.getByText('Operational');
      const statusDot = statusText.previousElementSibling;

      expect(statusDot).toHaveAttribute('title', 'All systems operational');
    });

    it('should hide status text on small screens', () => {
      render(<Header />);

      const statusText = screen.getByText('Operational');
      expect(statusText).toHaveClass('hidden', 'sm:inline');
    });

    it('should render status container with correct styling', () => {
      render(<Header />);

      const statusText = screen.getByText('Operational');
      const container = statusText.parentElement;

      expect(container).toHaveClass('flex', 'items-center', 'gap-2');
    });
  });

  describe('Responsive Design', () => {
    it('should hide Sign In text on small screens', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });

      render(<Header />);

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      const signInText = screen.getByText('Sign In');

      expect(signInText).toHaveClass('hidden', 'sm:inline');
    });

    it('should maintain icon visibility on all screen sizes', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });

      render(<Header />);

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      const icon = signInButton.querySelector('svg');

      expect(icon).toBeInTheDocument();
      expect(icon).not.toHaveClass('hidden');
    });
  });

  describe('Logo and Branding', () => {
    it('should render Music2 icon in logo', () => {
      render(<Header />);

      const logoLink = screen.getByText('RehearseKit').parentElement;
      const musicIcon = logoLink?.querySelector('svg');

      expect(musicIcon).toBeInTheDocument();
      expect(musicIcon).toHaveClass('h-6', 'w-6', 'text-kit-blue');
    });

    it('should render logo link with correct styling', () => {
      render(<Header />);

      const logoLink = screen.getByText('RehearseKit').parentElement;
      expect(logoLink).toHaveClass('flex', 'items-center', 'space-x-2');
    });

    it('should render brand name with correct styling', () => {
      render(<Header />);

      const brandName = screen.getByText('RehearseKit');
      expect(brandName).toHaveClass('font-bold', 'text-xl');
    });

    it('should link logo to home page', () => {
      render(<Header />);

      const logoLink = screen.getByText('RehearseKit').closest('a');
      expect(logoLink).toHaveAttribute('href', '/');
    });
  });

  describe('Layout and Container', () => {
    it('should render container with correct styling', () => {
      render(<Header />);

      const header = screen.getByRole('banner');
      const container = header.querySelector('.container');

      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('flex', 'h-16', 'items-center');
    });

    it('should have backdrop blur effect', () => {
      render(<Header />);

      const header = screen.getByRole('banner');
      expect(header).toHaveClass('backdrop-blur', 'bg-background/95');
    });

    it('should have border at the bottom', () => {
      render(<Header />);

      const header = screen.getByRole('banner');
      expect(header).toHaveClass('border-b');
    });
  });

  describe('User Interactions', () => {
    it('should be keyboard accessible for Sign In button', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });

      render(<Header />);

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      signInButton.focus();

      expect(signInButton).toHaveFocus();

      await userEvent.keyboard('{Enter}');

      await waitFor(() => {
        const loginDialog = screen.getByTestId('login-dialog');
        expect(loginDialog).toHaveAttribute('data-open', 'true');
      });
    });

    it('should be keyboard accessible for navigation links', () => {
      render(<Header />);

      const homeLink = screen.getByRole('link', { name: /home/i });
      homeLink.focus();

      expect(homeLink).toHaveFocus();
    });
  });

  describe('Edge Cases', () => {
    it('should handle auth state changing from unauthenticated to authenticated', () => {
      const { rerender } = render(<Header />);

      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.queryByTestId('user-menu')).not.toBeInTheDocument();

      (useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
      });

      rerender(<Header />);

      expect(screen.queryByRole('button', { name: /sign in/i })).not.toBeInTheDocument();
      expect(screen.getByTestId('user-menu')).toBeInTheDocument();
    });

    it('should handle auth state changing from authenticated to unauthenticated', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
      });

      const { rerender } = render(<Header />);

      expect(screen.getByTestId('user-menu')).toBeInTheDocument();

      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });

      rerender(<Header />);

      expect(screen.queryByTestId('user-menu')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should handle pathname changes', () => {
      (usePathname as jest.Mock).mockReturnValue('/');
      const { rerender } = render(<Header />);

      let homeLink = screen.getByRole('link', { name: /home/i });
      expect(homeLink).toHaveClass('text-foreground');

      (usePathname as jest.Mock).mockReturnValue('/jobs');
      rerender(<Header />);

      homeLink = screen.getByRole('link', { name: /home/i });
      const jobsLink = screen.getByRole('link', { name: /jobs/i });

      expect(homeLink).toHaveClass('text-foreground/60');
      expect(jobsLink).toHaveClass('text-foreground');
    });

    it('should handle loading state transitioning to authenticated', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: true,
      });

      const { rerender } = render(<Header />);

      expect(screen.queryByRole('button', { name: /sign in/i })).not.toBeInTheDocument();

      (useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
      });

      rerender(<Header />);

      expect(screen.getByTestId('user-menu')).toBeInTheDocument();
    });

    it('should handle loading state transitioning to unauthenticated', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: true,
      });

      const { rerender } = render(<Header />);

      expect(screen.queryByRole('button', { name: /sign in/i })).not.toBeInTheDocument();

      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });

      rerender(<Header />);

      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have semantic header element', () => {
      render(<Header />);

      const header = screen.getByRole('banner');
      expect(header.tagName).toBe('HEADER');
    });

    it('should have accessible navigation structure', () => {
      render(<Header />);

      const nav = screen.getByRole('navigation');
      expect(nav).toBeInTheDocument();
    });

    it('should have accessible links with proper text', () => {
      render(<Header />);

      const homeLink = screen.getByRole('link', { name: /home/i });
      const jobsLink = screen.getByRole('link', { name: /jobs/i });

      expect(homeLink).toHaveAccessibleName();
      expect(jobsLink).toHaveAccessibleName();
    });

    it('should have accessible button for Sign In', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });

      render(<Header />);

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      expect(signInButton).toHaveAccessibleName();
    });
  });

  describe('Integration', () => {
    it('should integrate with useAuth hook correctly', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
      });

      render(<Header />);

      expect(useAuth).toHaveBeenCalled();
      expect(screen.getByTestId('user-menu')).toBeInTheDocument();
    });

    it('should integrate with usePathname hook correctly', () => {
      (usePathname as jest.Mock).mockReturnValue('/jobs');

      render(<Header />);

      expect(usePathname).toHaveBeenCalled();

      const jobsLink = screen.getByRole('link', { name: /jobs/i });
      expect(jobsLink).toHaveClass('text-foreground');
    });

    it('should pass correct props to LoginDialog', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });

      render(<Header />);

      const loginDialog = screen.getByTestId('login-dialog');
      expect(loginDialog).toBeInTheDocument();
      expect(loginDialog).toHaveAttribute('data-open', 'false');
    });
  });
});
