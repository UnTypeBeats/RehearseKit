import { test, expect } from '@playwright/test';

// Skip cloud tests - GCP deployment removed
test.skip('can create job on cloud', async ({ page }) => {
  await page.goto('https://rehearsekit-frontend-748316872223.us-central1.run.app/');
  
  // Switch to YouTube tab
  await page.getByRole('button', { name: /YouTube URL/i }).click();
  
  // Fill form
  await page.getByPlaceholder(/youtube.com/i).fill('https://www.youtube.com/watch?v=test');
  await page.getByPlaceholder(/My Awesome Song/i).fill('Playwright Test');
  
  // Try to submit
  await page.getByRole('button', { name: /Start Processing/i }).click();
  
  // Wait for response
  await page.waitForTimeout(3000);
  
  // Check if error or success
  const errorVisible = await page.getByText(/Error creating job/i).isVisible().catch(() => false);
  const successVisible = await page.getByText(/Job created successfully/i).isVisible().catch(() => false);
  
  console.log('Error visible:', errorVisible);
  console.log('Success visible:', successVisible);
});
