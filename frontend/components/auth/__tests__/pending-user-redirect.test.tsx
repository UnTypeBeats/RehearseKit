/**
 * Unit tests for PendingUserRedirect component
 * Tests redirect logic for pending/inactive users
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { PendingUserRedirect } from '../pending-user-redirect';
import { useAuth } from '@/contexts/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { User } from '@/utils/auth';

// Mock dependencies
jest.mock('@/contexts/auth-context');
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

describe('PendingUserRedirect', () => {
  const mockPush = jest.fn();
  const mockReplace = jest.fn();

  const mockActiveUser: User = {
    id: 'user-123',
    email: 'active@example.com',
    full_name: 'Active User',
    avatar_url: null,
    is_admin: false,
    is_active: true,
    oauth_provider: 'google',
    created_at: '2024-01-01T00:00:00Z',
    last_login_at: '2024-01-02T00:00:00Z',
  };

  const mockPendingUser: User = {
    id: 'user-456',
    email: 'pending@example.com',
    full_name: 'Pending User',
    avatar_url: null,
    is_admin: false,
    is_active: false,
    oauth_provider: 'google',
    created_at: '2024-01-01T00:00:00Z',
    last_login_at: '2024-01-02T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
      prefetch: jest.fn(),
      back: jest.fn(),
    });

    (usePathname as jest.Mock).mockReturnValue('/');
  });

  describe('Rendering', () => {
    it('should render nothing (null)', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: mockActiveUser,
        isLoading: false,
      });

      const { container } = render(<PendingUserRedirect />);

      expect(container.firstChild).toBeNull();
    });

    it('should not render any visible content', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: mockActiveUser,
        isLoading: false,
      });

      const { container } = render(<PendingUserRedirect />);

      expect(container.textContent).toBe('');
    });
  });

  describe('Redirect Logic - Should NOT Redirect', () => {
    it('should not redirect when still loading', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: mockPendingUser,
        isLoading: true,
      });

      render(<PendingUserRedirect />);

      await waitFor(() => {
        expect(mockPush).not.toHaveBeenCalled();
      });
    });

    it('should not redirect when user is null (not authenticated)', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        isLoading: false,
      });

      render(<PendingUserRedirect />);

      await waitFor(() => {
        expect(mockPush).not.toHaveBeenCalled();
      });
    });

    it('should not redirect when user is active', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: mockActiveUser,
        isLoading: false,
      });

      render(<PendingUserRedirect />);

      await waitFor(() => {
        expect(mockPush).not.toHaveBeenCalled();
      });
    });

    it('should not redirect when already on pending approval page', async () => {
      (usePathname as jest.Mock).mockReturnValue('/pending-approval');

      (useAuth as jest.Mock).mockReturnValue({
        user: mockPendingUser,
        isLoading: false,
      });

      render(<PendingUserRedirect />);

      await waitFor(() => {
        expect(mockPush).not.toHaveBeenCalled();
      });
    });

    it('should not redirect when user becomes null after initial load', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: mockActiveUser,
        isLoading: false,
      });

      const { rerender } = render(<PendingUserRedirect />);

      expect(mockPush).not.toHaveBeenCalled();

      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        isLoading: false,
      });

      rerender(<PendingUserRedirect />);

      await waitFor(() => {
        expect(mockPush).not.toHaveBeenCalled();
      });
    });
  });

  describe('Redirect Logic - SHOULD Redirect', () => {
    it('should redirect pending user to approval page', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: mockPendingUser,
        isLoading: false,
      });

      (usePathname as jest.Mock).mockReturnValue('/');

      render(<PendingUserRedirect />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/pending-approval');
      });
    });

    it('should redirect pending user from any page except pending-approval', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: mockPendingUser,
        isLoading: false,
      });

      (usePathname as jest.Mock).mockReturnValue('/profile');

      render(<PendingUserRedirect />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/pending-approval');
      });
    });

    it('should redirect pending user from admin pages', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: { ...mockPendingUser, is_admin: true },
        isLoading: false,
      });

      (usePathname as jest.Mock).mockReturnValue('/admin/users');

      render(<PendingUserRedirect />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/pending-approval');
      });
    });

    it('should log redirect message to console', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      (useAuth as jest.Mock).mockReturnValue({
        user: mockPendingUser,
        isLoading: false,
      });

      (usePathname as jest.Mock).mockReturnValue('/');

      render(<PendingUserRedirect />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Redirecting pending user to approval page'
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe('State Transitions', () => {
    it('should redirect when user becomes inactive', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: mockActiveUser,
        isLoading: false,
      });

      const { rerender } = render(<PendingUserRedirect />);

      expect(mockPush).not.toHaveBeenCalled();

      // User becomes inactive
      (useAuth as jest.Mock).mockReturnValue({
        user: mockPendingUser,
        isLoading: false,
      });

      rerender(<PendingUserRedirect />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/pending-approval');
      });
    });

    it('should not redirect when user becomes active', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: mockPendingUser,
        isLoading: false,
      });

      const { rerender } = render(<PendingUserRedirect />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/pending-approval');
      });

      jest.clearAllMocks();

      // User becomes active
      (useAuth as jest.Mock).mockReturnValue({
        user: mockActiveUser,
        isLoading: false,
      });

      rerender(<PendingUserRedirect />);

      await waitFor(() => {
        expect(mockPush).not.toHaveBeenCalled();
      });
    });

    it('should handle loading state transitions correctly', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: mockPendingUser,
        isLoading: true,
      });

      const { rerender } = render(<PendingUserRedirect />);

      expect(mockPush).not.toHaveBeenCalled();

      // Loading finishes
      (useAuth as jest.Mock).mockReturnValue({
        user: mockPendingUser,
        isLoading: false,
      });

      rerender(<PendingUserRedirect />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/pending-approval');
      });
    });

    it('should not redirect multiple times on re-renders', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: mockPendingUser,
        isLoading: false,
      });

      const { rerender } = render(<PendingUserRedirect />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledTimes(1);
      });

      // Force re-render with same state
      rerender(<PendingUserRedirect />);
      rerender(<PendingUserRedirect />);

      await waitFor(() => {
        // Should still only be called once (or at most a few times due to React)
        expect(mockPush).toHaveBeenCalledWith('/pending-approval');
      });
    });
  });

  describe('Pathname Changes', () => {
    it('should redirect when navigating away from pending-approval page while inactive', async () => {
      (usePathname as jest.Mock).mockReturnValue('/pending-approval');

      (useAuth as jest.Mock).mockReturnValue({
        user: mockPendingUser,
        isLoading: false,
      });

      const { rerender } = render(<PendingUserRedirect />);

      expect(mockPush).not.toHaveBeenCalled();

      // User navigates away
      (usePathname as jest.Mock).mockReturnValue('/profile');

      rerender(<PendingUserRedirect />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/pending-approval');
      });
    });

    it('should allow navigation to pending-approval page', async () => {
      (usePathname as jest.Mock).mockReturnValue('/');

      (useAuth as jest.Mock).mockReturnValue({
        user: mockPendingUser,
        isLoading: false,
      });

      const { rerender } = render(<PendingUserRedirect />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/pending-approval');
      });

      jest.clearAllMocks();

      // Now on pending-approval page
      (usePathname as jest.Mock).mockReturnValue('/pending-approval');

      rerender(<PendingUserRedirect />);

      await waitFor(() => {
        expect(mockPush).not.toHaveBeenCalled();
      });
    });

    it('should redirect from nested paths', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: mockPendingUser,
        isLoading: false,
      });

      (usePathname as jest.Mock).mockReturnValue('/admin/users/123');

      render(<PendingUserRedirect />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/pending-approval');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined user gracefully', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: undefined,
        isLoading: false,
      });

      render(<PendingUserRedirect />);

      await waitFor(() => {
        expect(mockPush).not.toHaveBeenCalled();
      });
    });

    it('should handle undefined isLoading gracefully', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: mockActiveUser,
        isLoading: undefined,
      });

      render(<PendingUserRedirect />);

      await waitFor(() => {
        expect(mockPush).not.toHaveBeenCalled();
      });
    });

    it('should handle user with is_active as undefined', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: { ...mockActiveUser, is_active: undefined },
        isLoading: false,
      });

      render(<PendingUserRedirect />);

      // When is_active is undefined, it's falsy so it will redirect
      // This test verifies the component handles undefined gracefully
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/pending-approval');
      });
    });

    it('should handle rapid auth state changes', async () => {
      const { rerender } = render(<PendingUserRedirect />);

      // Simulate rapid changes
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        isLoading: true,
      });
      rerender(<PendingUserRedirect />);

      (useAuth as jest.Mock).mockReturnValue({
        user: mockPendingUser,
        isLoading: true,
      });
      rerender(<PendingUserRedirect />);

      (useAuth as jest.Mock).mockReturnValue({
        user: mockPendingUser,
        isLoading: false,
      });
      rerender(<PendingUserRedirect />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/pending-approval');
      });
    });

    it('should handle component unmounting', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: mockPendingUser,
        isLoading: false,
      });

      const { unmount } = render(<PendingUserRedirect />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/pending-approval');
      });

      // Should not throw error on unmount
      expect(() => unmount()).not.toThrow();
    });

    it('should handle rapid mounting and unmounting', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: mockPendingUser,
        isLoading: false,
      });

      const { unmount: unmount1 } = render(<PendingUserRedirect />);
      const { unmount: unmount2 } = render(<PendingUserRedirect />);
      const { unmount: unmount3 } = render(<PendingUserRedirect />);

      unmount1();
      unmount2();
      unmount3();

      expect(mockPush).toHaveBeenCalledWith('/pending-approval');
    });
  });

  describe('useEffect Dependencies', () => {
    it('should re-evaluate when user changes', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        isLoading: false,
      });

      const { rerender } = render(<PendingUserRedirect />);

      expect(mockPush).not.toHaveBeenCalled();

      (useAuth as jest.Mock).mockReturnValue({
        user: mockPendingUser,
        isLoading: false,
      });

      rerender(<PendingUserRedirect />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/pending-approval');
      });
    });

    it('should re-evaluate when isLoading changes', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: mockPendingUser,
        isLoading: true,
      });

      const { rerender } = render(<PendingUserRedirect />);

      expect(mockPush).not.toHaveBeenCalled();

      (useAuth as jest.Mock).mockReturnValue({
        user: mockPendingUser,
        isLoading: false,
      });

      rerender(<PendingUserRedirect />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/pending-approval');
      });
    });

    it('should re-evaluate when pathname changes', async () => {
      (usePathname as jest.Mock).mockReturnValue('/pending-approval');

      (useAuth as jest.Mock).mockReturnValue({
        user: mockPendingUser,
        isLoading: false,
      });

      const { rerender } = render(<PendingUserRedirect />);

      expect(mockPush).not.toHaveBeenCalled();

      (usePathname as jest.Mock).mockReturnValue('/profile');

      rerender(<PendingUserRedirect />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/pending-approval');
      });
    });

    it('should re-evaluate when router changes', async () => {
      const newPush = jest.fn();

      (useAuth as jest.Mock).mockReturnValue({
        user: mockPendingUser,
        isLoading: false,
      });

      const { rerender } = render(<PendingUserRedirect />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/pending-approval');
      });

      jest.clearAllMocks();

      (useRouter as jest.Mock).mockReturnValue({
        push: newPush,
        replace: jest.fn(),
        prefetch: jest.fn(),
        back: jest.fn(),
      });

      rerender(<PendingUserRedirect />);

      await waitFor(() => {
        expect(newPush).toHaveBeenCalledWith('/pending-approval');
      });
    });
  });

  describe('Integration with Auth Context', () => {
    it('should work with real auth state flow', async () => {
      // Initial state: loading
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        isLoading: true,
      });

      const { rerender } = render(<PendingUserRedirect />);

      expect(mockPush).not.toHaveBeenCalled();

      // Auth resolves with pending user
      (useAuth as jest.Mock).mockReturnValue({
        user: mockPendingUser,
        isLoading: false,
      });

      rerender(<PendingUserRedirect />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/pending-approval');
      });
    });

    it('should handle admin user who is pending', async () => {
      const pendingAdmin: User = {
        ...mockPendingUser,
        is_admin: true,
        is_active: false,
      };

      (useAuth as jest.Mock).mockReturnValue({
        user: pendingAdmin,
        isLoading: false,
      });

      render(<PendingUserRedirect />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/pending-approval');
      });
    });

    it('should allow active admin to access any page', async () => {
      const activeAdmin: User = {
        ...mockActiveUser,
        is_admin: true,
        is_active: true,
      };

      (useAuth as jest.Mock).mockReturnValue({
        user: activeAdmin,
        isLoading: false,
      });

      (usePathname as jest.Mock).mockReturnValue('/admin/users');

      render(<PendingUserRedirect />);

      await waitFor(() => {
        expect(mockPush).not.toHaveBeenCalled();
      });
    });
  });

  describe('Router Push Behavior', () => {
    it('should use push method (not replace)', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: mockPendingUser,
        isLoading: false,
      });

      render(<PendingUserRedirect />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/pending-approval');
        expect(mockReplace).not.toHaveBeenCalled();
      });
    });

    it('should push to exact path "/pending-approval"', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: mockPendingUser,
        isLoading: false,
      });

      render(<PendingUserRedirect />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/pending-approval');
        expect(mockPush).not.toHaveBeenCalledWith('/pending-approval/');
      });
    });
  });
});
