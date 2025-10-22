import { test, expect } from '@playwright/test';

test('test Google OAuth on production', async ({ page }) => {
  // Navigate to production site
  await page.goto('https://rehearsekit.uk/');
  
  // Wait for page to load
  await page.waitForLoadState('networkidle');
  
  // Check for Sign In button
  const signInButton = page.getByText('Sign In');
  await expect(signInButton).toBeVisible({ timeout: 10000 });
  
  // Click Sign In button
  await signInButton.click();
  
  // Wait for login dialog
  await page.waitForTimeout(2000);
  
  // Take screenshot
  await page.screenshot({ path: 'test-results/auth-dialog.png', fullPage: true });
  
  // Check console logs for Google Client ID
  const logs: string[] = [];
  page.on('console', msg => logs.push(msg.text()));
  
  // Wait a bit to collect logs
  await page.waitForTimeout(3000);
  
  console.log('Console logs:');
  console.log(logs.join('\n'));
  
  // Take final screenshot
  await page.screenshot({ path: 'test-results/auth-final.png', fullPage: true });
});

