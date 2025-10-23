import { test, expect } from '@playwright/test';

/**
 * Pending Approval Page Tests
 * Tests that pending users are properly redirected and shown the approval page
 */

test.describe('Pending Approval Flow', () => {
  test('should redirect pending users to approval page', async ({ page }) => {
    // Mock authentication with pending user
    await page.route((url) => url.pathname === '/api/auth/me', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'pending-user-id',
          email: 'pending@example.com',
          full_name: 'Pending User',
          avatar_url: '',
          is_active: false, // Pending user
          is_admin: false,
          oauth_provider: 'google',
          created_at: '2025-10-22T00:00:00Z',
          last_login_at: '2025-10-22T10:00:00Z',
        }),
      });
    });

    await page.context().addCookies([
      {
        name: 'access_token',
        value: 'mock-token',
        domain: 'localhost',
        path: '/',
      },
      {
        name: 'refresh_token',
        value: 'mock-refresh-token',
        domain: 'localhost',
        path: '/',
      },
    ]);

    // Try to access home page
    await page.goto('/');

    // Should be redirected to pending approval page
    await expect(page).toHaveURL('/pending-approval');
  });

  test('should display pending approval message', async ({ page }) => {
    await page.route((url) => url.pathname === '/api/auth/me', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'pending-user-id',
          email: 'pending@example.com',
          full_name: 'Pending User',
          avatar_url: '',
          is_active: false,
          is_admin: false,
          oauth_provider: 'google',
          created_at: '2025-10-22T00:00:00Z',
          last_login_at: '2025-10-22T10:00:00Z',
        }),
      });
    });

    await page.context().addCookies([
      {
        name: 'access_token',
        value: 'mock-token',
        domain: 'localhost',
        path: '/',
      },
      {
        name: 'refresh_token',
        value: 'mock-refresh-token',
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('/pending-approval');

    // Check page title
    await expect(page.getByRole('heading', { name: /Account Pending Approval/i })).toBeVisible();

    // Check user email is displayed
    await expect(page.getByText('pending@example.com')).toBeVisible();

    // Check explanatory text
    await expect(page.getByText(/waiting for administrator approval/i)).toBeVisible();
    await expect(page.getByText(/review your account within 24-48 hours/i)).toBeVisible();
  });

  test('should show refresh and sign out buttons', async ({ page }) => {
    await page.route((url) => url.pathname === '/api/auth/me', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'pending-user-id',
          email: 'pending@example.com',
          full_name: 'Pending User',
          avatar_url: '',
          is_active: false,
          is_admin: false,
          oauth_provider: 'google',
          created_at: '2025-10-22T00:00:00Z',
          last_login_at: '2025-10-22T10:00:00Z',
        }),
      });
    });

    await page.context().addCookies([
      {
        name: 'access_token',
        value: 'mock-token',
        domain: 'localhost',
        path: '/',
      },
      {
        name: 'refresh_token',
        value: 'mock-refresh-token',
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('/pending-approval');

    // Check buttons are present
    await expect(page.getByRole('button', { name: 'Refresh Status' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();
  });

  test('should allow pending user to sign out', async ({ page }) => {
    await page.route((url) => url.pathname === '/api/auth/me', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'pending-user-id',
          email: 'pending@example.com',
          full_name: 'Pending User',
          avatar_url: '',
          is_active: false,
          is_admin: false,
          oauth_provider: 'google',
          created_at: '2025-10-22T00:00:00Z',
          last_login_at: '2025-10-22T10:00:00Z',
        }),
      });
    });

    // Also mock the logout endpoint
    await page.route((url) => url.pathname === '/api/auth/logout', (route) => {
      route.fulfill({ status: 200 });
    });

    await page.context().addCookies([
      {
        name: 'access_token',
        value: 'mock-token',
        domain: 'localhost',
        path: '/',
      },
      {
        name: 'refresh_token',
        value: 'mock-refresh-token',
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('/pending-approval');

    // Click sign out
    await page.getByRole('button', { name: 'Sign Out' }).click();

    // Check that tokens are cleared
    const cookies = await page.context().cookies();
    const accessToken = cookies.find(c => c.name === 'access_token');
    const refreshToken = cookies.find(c => c.name === 'refresh_token');
    expect(accessToken).toBeUndefined();
    expect(refreshToken).toBeUndefined();
  });

  test('should redirect approved users away from pending page', async ({ page }) => {
    // Mock active user (approved)
    await page.route((url) => url.pathname === '/api/auth/me', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'active-user-id',
          email: 'active@kossoy.com',
          full_name: 'Active User',
          avatar_url: '',
          is_active: true, // Active user
          is_admin: false,
          oauth_provider: 'google',
          created_at: '2025-01-01T00:00:00Z',
          last_login_at: '2025-10-22T10:00:00Z',
        }),
      });
    });

    await page.context().addCookies([
      {
        name: 'access_token',
        value: 'mock-token',
        domain: 'localhost',
        path: '/',
      },
      {
        name: 'refresh_token',
        value: 'mock-refresh-token',
        domain: 'localhost',
        path: '/',
      },
    ]);

    // Try to access pending approval page
    await page.goto('/pending-approval');

    // Should redirect to home
    await expect(page).toHaveURL('/');
  });

  test('should block pending users from creating jobs', async ({ page }) => {
    await page.route((url) => url.pathname === '/api/auth/me', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'pending-user-id',
          email: 'pending@example.com',
          full_name: 'Pending User',
          avatar_url: '',
          is_active: false,
          is_admin: false,
          oauth_provider: 'google',
          created_at: '2025-10-22T00:00:00Z',
          last_login_at: '2025-10-22T10:00:00Z',
        }),
      });
    });

    // Mock job creation attempt
    await page.route((url) => url.pathname === '/api/jobs/create', (route) => {
      route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          detail: 'Your account is pending approval. Please wait for an administrator to approve your account.',
        }),
      });
    });

    await page.context().addCookies([
      {
        name: 'access_token',
        value: 'mock-token',
        domain: 'localhost',
        path: '/',
      },
      {
        name: 'refresh_token',
        value: 'mock-refresh-token',
        domain: 'localhost',
        path: '/',
      },
    ]);

    // User should be redirected from homepage
    await page.goto('/');
    await expect(page).toHaveURL('/pending-approval');
  });
});
