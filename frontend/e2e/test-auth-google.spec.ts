import { test, expect } from '@playwright/test';

test('capture Google OAuth client ID on production', async ({ page }) => {
  const consoleLogs: string[] = [];
  
  // Capture console logs
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(text);
    console.log('[Browser Console]:', text);
  });
  
  // Navigate to production site
  await page.goto('https://rehearsekit.uk/');
  
  // Wait for page to load
  await page.waitForLoadState('networkidle');
  
  console.log('\n=== Console logs after page load ===');
  
  // Click Sign In button
  await page.getByText('Sign In').click();
  
  // Wait for login dialog and Google button to load
  await page.waitForTimeout(3000);
  
  console.log('\n=== Console logs after dialog opened ===');
  
  // Check for Google OAuth errors in console
  const googleErrors = consoleLogs.filter(log => 
    log.includes('GSI_LOGGER') || 
    log.includes('client_id') || 
    log.includes('Google Client ID') ||
    log.includes('GOOGLE_CLIENT_ID')
  );
  
  console.log('\n=== Google OAuth related logs ===');
  console.log(googleErrors.join('\n'));
  
  // Take screenshot
  await page.screenshot({ path: 'test-results/google-oauth-state.png', fullPage: true });
  
  console.log('\n=== All console logs ===');
  console.log(consoleLogs.join('\n'));
});

