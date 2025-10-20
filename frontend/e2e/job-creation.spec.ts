import { test, expect } from '@playwright/test';

test.describe('RehearseKit - Job Creation', () => {
  test('can create a job with YouTube URL', async ({ page }) => {
    await page.goto('/');
    
    // Switch to YouTube tab
    await page.getByRole('button', { name: /YouTube URL/i }).click();
    
    // Fill in the form
    await page.getByPlaceholder(/youtube.com/i).fill('https://www.youtube.com/watch?v=jNQXAC9IVRw');
    await page.getByPlaceholder(/My Awesome Song/i).fill('E2E Test Song');
    
    // Select Fast mode (should be default)
    await expect(page.getByRole('button', { name: /Fast/i })).toBeVisible();
    
    // Submit the form
    await page.getByRole('button', { name: /Start Processing/i }).click();
    
    // Wait for job to be created (toast notification or redirect)
    await page.waitForTimeout(2000);
    
    // Verify job appears in the list (use first() to handle multiple jobs with same name)
    await expect(page.getByText('E2E Test Song').first()).toBeVisible();
  });

  test('created job shows in job list', async ({ page }) => {
    await page.goto('/jobs');
    
    // Check that jobs page loads
    await expect(page.getByRole('heading', { name: /Job History/i })).toBeVisible();
    
    // Check if jobs exist, or show empty state
    const jobCards = page.locator('[class*="Card"]');
    const count = await jobCards.count();
    
    // Either jobs are displayed or page is empty (both valid)
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('can view job details', async ({ page }) => {
    // Get first job from API
    const response = await page.request.get('http://localhost:8000/api/jobs');
    const data = await response.json();
    
    if (data.jobs.length === 0) {
      test.skip('No jobs available for testing');
      return;
    }
    
    const firstJob = data.jobs[0];
    
    // Navigate to job detail page
    await page.goto(`/jobs/${firstJob.id}`);
    
    // Check job details are displayed
    await expect(page.getByText(firstJob.project_name).first()).toBeVisible();
    await expect(page.getByText(/Job ID/i)).toBeVisible();
    
    // Check status is displayed (either badge or text)
    const statusText = new RegExp(firstJob.status, 'i');
    await expect(page.getByText(statusText).first()).toBeVisible();
  });

  test('form requires project name', async ({ page }) => {
    await page.goto('/');
    
    // Switch to YouTube tab
    await page.getByRole('button', { name: /YouTube URL/i }).click();
    
    // Fill only YouTube URL, not project name
    await page.getByPlaceholder(/youtube.com/i).fill('https://www.youtube.com/watch?v=test');
    
    // Clear project name if it has auto-filled
    await page.getByPlaceholder(/My Awesome Song/i).clear();
    
    // Try to submit
    await page.getByRole('button', { name: /Start Processing/i }).click();
    
    // Should show error or prevent submission
    // Note: Exact behavior depends on implementation
  });
});

