import { test, expect } from '@playwright/test';

/**
 * Admin Dashboard Tests
 * Tests the admin user management functionality
 */

test.describe('Admin Dashboard', () => {
  test('should redirect non-admin users to home', async ({ page }) => {
    // Mock regular user
    await page.route((url) => url.pathname === '/api/auth/me', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'user-id',
          email: 'user@kossoy.com',
          full_name: 'Regular User',
          avatar_url: '',
          is_active: true,
          is_admin: false, // Not admin
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

    // Try to access admin page
    await page.goto('/admin/users');

    // Should redirect to home
    await expect(page).toHaveURL('/');
  });

  test('should display admin dashboard for admin users', async ({ page }) => {
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
          is_admin: true, // Admin user
          oauth_provider: 'google',
          created_at: '2025-01-01T00:00:00Z',
          last_login_at: '2025-10-22T10:00:00Z',
        }),
      });
    });

    // Mock stats endpoint
    await page.route((url) => url.pathname === '/api/admin/stats', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total_users: 10,
          active_users: 8,
          pending_users: 2,
          admin_users: 1,
          google_oauth_users: 9,
          email_users: 1,
        }),
      });
    });

    // Mock users list endpoint
    await page.route((url) => url.pathname.startsWith('/api/admin/users'), (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          users: [
            {
              id: 'user-1',
              email: 'user1@kossoy.com',
              full_name: 'User One',
              avatar_url: '',
              is_active: true,
              is_admin: false,
              oauth_provider: 'google',
              created_at: '2025-01-01T00:00:00Z',
              last_login_at: '2025-10-22T10:00:00Z',
            },
            {
              id: 'user-2',
              email: 'pending@example.com',
              full_name: 'Pending User',
              avatar_url: '',
              is_active: false,
              is_admin: false,
              oauth_provider: 'google',
              created_at: '2025-10-22T00:00:00Z',
              last_login_at: '2025-10-22T10:00:00Z',
            },
          ],
          total: 2,
          page: 1,
          page_size: 20,
          total_pages: 1,
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

    await page.goto('/admin/users');

    // Check page title
    await expect(page.getByRole('heading', { name: 'User Management' })).toBeVisible();

    // Check stats cards
    await expect(page.getByText('Total Users')).toBeVisible();
    await expect(page.getByText('Active Users')).toBeVisible();
    await expect(page.getByText('Pending Approval')).toBeVisible();

    // Verify the stats numbers are present (use more specific selectors)
    const statsCards = page.locator('.text-2xl.font-bold');
    await expect(statsCards).toHaveCount(4); // Total, Active, Pending, Admins
  });

  test('should display user list in table', async ({ page }) => {
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

    await page.route((url) => url.pathname === '/api/admin/stats', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total_users: 2,
          active_users: 1,
          pending_users: 1,
          admin_users: 1,
          google_oauth_users: 2,
          email_users: 0,
        }),
      });
    });

    await page.route((url) => url.pathname.startsWith('/api/admin/users'), (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          users: [
            {
              id: 'user-1',
              email: 'active@kossoy.com',
              full_name: 'Active User',
              avatar_url: '',
              is_active: true,
              is_admin: false,
              oauth_provider: 'google',
              created_at: '2025-01-01T00:00:00Z',
              last_login_at: '2025-10-22T10:00:00Z',
            },
            {
              id: 'user-2',
              email: 'pending@example.com',
              full_name: 'Pending User',
              avatar_url: '',
              is_active: false,
              is_admin: false,
              oauth_provider: 'google',
              created_at: '2025-10-22T00:00:00Z',
              last_login_at: '2025-10-22T10:00:00Z',
            },
          ],
          total: 2,
          page: 1,
          page_size: 20,
          total_pages: 1,
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

    await page.goto('/admin/users');

    // Wait for the table to load
    await page.waitForSelector('table', { timeout: 10000 });

    // Check table headers (using text content since they may not have proper roles)
    await expect(page.locator('th').filter({ hasText: 'User' })).toBeVisible();
    await expect(page.locator('th').filter({ hasText: 'Status' })).toBeVisible();
    await expect(page.locator('th').filter({ hasText: 'Role' })).toBeVisible();

    // Check user data in table (use more specific selectors to avoid stats card conflicts)
    await expect(page.locator('table').getByText('active@kossoy.com')).toBeVisible();
    await expect(page.locator('table').getByText('Active User')).toBeVisible();
    await expect(page.locator('table').getByText('pending@example.com')).toBeVisible();
    await expect(page.locator('table').getByText('Pending User')).toBeVisible();

    // Check status badges in table
    const tableBadges = page.locator('table td');
    await expect(tableBadges.filter({ hasText: 'Active' }).first()).toBeVisible();
    await expect(tableBadges.filter({ hasText: 'Pending' }).first()).toBeVisible();
  });

  test('should allow approving pending users', async ({ page }) => {
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

    await page.route((url) => url.pathname === '/api/admin/stats', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total_users: 1,
          active_users: 0,
          pending_users: 1,
          admin_users: 1,
          google_oauth_users: 1,
          email_users: 0,
        }),
      });
    });

    const pendingUser = {
      id: 'pending-user-id',
      email: 'pending@example.com',
      full_name: 'Pending User',
      avatar_url: '',
      is_active: false,
      is_admin: false,
      oauth_provider: 'google',
      created_at: '2025-10-22T00:00:00Z',
      last_login_at: '2025-10-22T10:00:00Z',
    };

    await page.route((url) => url.pathname.startsWith('/api/admin/users'), (route) => {
      if (route.request().url().includes('approve')) {
        // Approve endpoint
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'User pending@example.com has been approved',
            user: { ...pendingUser, is_active: true },
          }),
        });
      } else {
        // List endpoint
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            users: [pendingUser],
            total: 1,
            page: 1,
            page_size: 20,
            total_pages: 1,
          }),
        });
      }
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

    await page.goto('/admin/users');

    // Find pending user row and open actions menu
    const userRow = page.locator('tr', { has: page.getByText('pending@example.com') });
    await userRow.getByRole('button').first().click();

    // Click approve button
    await page.getByRole('menuitem', { name: /Approve User/i }).click();

    // Check success toast (use first() to handle duplicate toast elements)
    await expect(page.getByText(/has been approved/i).first()).toBeVisible();
  });

  test('should allow searching users', async ({ page }) => {
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

    await page.route((url) => url.pathname === '/api/admin/stats', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total_users: 1,
          active_users: 1,
          pending_users: 0,
          admin_users: 1,
          google_oauth_users: 1,
          email_users: 0,
        }),
      });
    });

    let searchQuery = '';
    await page.route((url) => url.pathname.startsWith('/api/admin/users'), (route) => {
      const url = new URL(route.request().url());
      searchQuery = url.searchParams.get('search') || '';

      const users = searchQuery
        ? [
            {
              id: 'search-result-id',
              email: 'found@kossoy.com',
              full_name: 'Found User',
              avatar_url: '',
              is_active: true,
              is_admin: false,
              oauth_provider: 'google',
              created_at: '2025-01-01T00:00:00Z',
              last_login_at: '2025-10-22T10:00:00Z',
            },
          ]
        : [];

      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          users,
          total: users.length,
          page: 1,
          page_size: 20,
          total_pages: 1,
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

    await page.goto('/admin/users');

    // Wait for page to load
    await page.waitForSelector('input[placeholder="Search users..."]', { timeout: 10000 });

    // Type in search box
    const searchInput = page.getByPlaceholder('Search users...');
    await searchInput.fill('found');

    // Click the search button (icon-only button next to search input)
    await searchInput.press('Enter');

    // Wait for API call
    await page.waitForTimeout(500);

    // Check that search was performed
    expect(searchQuery).toBe('found');
  });

  test('should allow filtering by status', async ({ page }) => {
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

    await page.route((url) => url.pathname === '/api/admin/stats', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total_users: 2,
          active_users: 1,
          pending_users: 1,
          admin_users: 1,
          google_oauth_users: 2,
          email_users: 0,
        }),
      });
    });

    let statusFilter = 'all';
    await page.route((url) => url.pathname.startsWith('/api/admin/users'), (route) => {
      const url = new URL(route.request().url());
      statusFilter = url.searchParams.get('status_filter') || 'all';

      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          users: [],
          total: 0,
          page: 1,
          page_size: 20,
          total_pages: 1,
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

    await page.goto('/admin/users');

    // Open filter dropdown and select "Pending"
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Pending' }).click();

    // Wait for API call
    await page.waitForTimeout(500);

    // Check that filter was applied
    expect(statusFilter).toBe('pending');
  });
});
