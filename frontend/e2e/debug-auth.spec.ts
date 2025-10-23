import { test, expect } from '@playwright/test';

/**
 * Debug test to understand why mocking isn't working
 */

test('debug: check if route mocking works', async ({ page }) => {
  // Enable request logging
  page.on('request', request => console.log('>>>', request.method(), request.url()));
  page.on('response', response => console.log('<<<', response.status(), response.url()));

  // Mock the /api/auth/me endpoint
  await page.route((url) => url.pathname === '/api/auth/me', (route) => {
    console.log('[MOCK] Intercepted /api/auth/me request');
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'test-user-id',
        email: 'test@kossoy.com',
        full_name: 'Test User',
        avatar_url: '',
        is_active: true,
        is_admin: false,
        oauth_provider: 'google',
        created_at: '2025-01-01T00:00:00Z',
        last_login_at: '2025-10-22T10:00:00Z',
      }),
    });
  });

  // Set tokens BEFORE navigation
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
  await page.goto('/profile', { waitUntil: 'networkidle' });

  // Wait a bit
  await page.waitForTimeout(2000);

  // Take screenshot
  await page.screenshot({ path: 'debug-profile-page.png', fullPage: true });

  // Check page title
  await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible({ timeout: 5000 });
});
