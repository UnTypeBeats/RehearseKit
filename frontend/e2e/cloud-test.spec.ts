import { test, expect } from '@playwright/test';

test.describe('Cloud Frontend', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto('https://rehearsekit-frontend-748316872223.us-central1.run.app/');
    await expect(page).toHaveTitle(/RehearseKit/);
  });
  
  test('backend API is accessible', async ({ page }) => {
    const response = await page.request.get('https://rehearsekit-backend-748316872223.us-central1.run.app/api/health');
    expect(response.ok()).toBeTruthy();
    const health = await response.json();
    expect(health.status).toBe('healthy');
  });
});
