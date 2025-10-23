import { test, expect } from '@playwright/test';

/**
 * User Profile Page Tests
 * Tests the user profile viewing and editing functionality
 */

test.describe('User Profile', () => {
  test('should redirect unauthenticated users to home', async ({ page }) => {
    // Try to access profile page without authentication
    await page.goto('/profile');

    // Should redirect to home
    await expect(page).toHaveURL('/');
  });

  test('should display user profile information for authenticated users', async ({ page }) => {
    // Mock the /api/auth/me endpoint FIRST
    await page.route((url) => url.pathname === '/api/auth/me', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-user-id',
          email: 'test@kossoy.com',
          full_name: 'Test User',
          avatar_url: 'https://example.com/avatar.jpg',
          is_active: true,
          is_admin: false,
          oauth_provider: 'google',
          created_at: '2025-01-01T00:00:00Z',
          last_login_at: '2025-10-22T10:00:00Z',
        }),
      });
    });

    // Set tokens in cookies
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

    // Navigate to profile page
    await page.goto('/profile');

    // Check page title (use exact match to avoid matching "Profile Information")
    await expect(page.getByRole('heading', { name: 'Profile', exact: true })).toBeVisible();

    // Check profile information is displayed (use first() to handle duplicates)
    await expect(page.getByText('test@kossoy.com').first()).toBeVisible();
    await expect(page.getByText('Test User').first()).toBeVisible();
    await expect(page.getByText('Google', { exact: false }).first()).toBeVisible();
  });

  test('should allow editing profile information', async ({ page }) => {
    const mockUser = {
      id: 'test-user-id',
      email: 'test@kossoy.com',
      full_name: 'Test User',
      avatar_url: '',
      is_active: true,
      is_admin: false,
      oauth_provider: 'google',
      created_at: '2025-01-01T00:00:00Z',
      last_login_at: '2025-10-22T10:00:00Z',
    };

    // Mock GET /api/auth/me
    await page.route((url) => url.pathname === '/api/auth/me', (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockUser),
        });
      }
    });

    // Set tokens in cookies
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

    await page.goto('/profile');

    // Click edit button
    await page.getByRole('button', { name: 'Edit Profile' }).click();

    // Update full name
    const nameInput = page.getByLabel('Full Name');
    await nameInput.fill('Updated Test User');

    // Update avatar URL
    const avatarInput = page.getByLabel('Avatar URL');
    await avatarInput.fill('https://example.com/new-avatar.jpg');

    // Mock PATCH /api/auth/me
    let updateCalled = false;
    await page.route((url) => url.pathname === '/api/auth/me', (route) => {
      if (route.request().method() === 'PATCH') {
        updateCalled = true;
        const body = route.request().postDataJSON();
        expect(body.full_name).toBe('Updated Test User');
        expect(body.avatar_url).toBe('https://example.com/new-avatar.jpg');

        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...mockUser,
            full_name: body.full_name,
            avatar_url: body.avatar_url,
          }),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockUser),
        });
      }
    });

    // Click save
    await page.getByRole('button', { name: /Save Changes/i }).click();

    // Check that update was called
    await page.waitForTimeout(500);
    expect(updateCalled).toBe(true);

    // Check toast notification (use first() to handle duplicate toast elements)
    await expect(page.getByText('Profile updated').first()).toBeVisible();
  });

  test('should show admin badge for admin users', async ({ page }) => {
    // Mock admin user
    await page.route((url) => url.pathname === '/api/auth/me', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'admin-id',
          email: 'admin@kossoy.com',
          full_name: 'Admin User',
          avatar_url: '',
          is_active: true,
          is_admin: true,
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

    await page.goto('/profile');

    // Check admin badge is visible (the badge shows with shield icon and "Admin" text)
    await expect(page.getByText('Admin', { exact: true }).first()).toBeVisible();
  });

  test('should display pending badge for inactive users', async ({ page }) => {
    // Mock pending user
    await page.route((url) => url.pathname === '/api/auth/me', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'pending-id',
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

    await page.goto('/profile');

    // Check pending badge is visible
    await expect(page.getByText('Pending Approval')).toBeVisible();
  });

  test('should handle cancel edit gracefully', async ({ page }) => {
    await page.route((url) => url.pathname === '/api/auth/me', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-id',
          email: 'test@kossoy.com',
          full_name: 'Original Name',
          avatar_url: '',
          is_active: true,
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

    await page.goto('/profile');

    // Click edit
    await page.getByRole('button', { name: 'Edit Profile' }).click();

    // Change name
    await page.getByLabel('Full Name').fill('Changed Name');

    // Click cancel
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Original name should be restored
    await expect(page.getByText('Original Name')).toBeVisible();

    // Edit form should be hidden
    await expect(page.getByLabel('Full Name')).not.toBeVisible();
  });
});
