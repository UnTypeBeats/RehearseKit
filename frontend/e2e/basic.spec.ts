import { test, expect } from '@playwright/test';

test.describe('RehearseKit - Basic Functionality', () => {
  test('homepage loads correctly', async ({ page }) => {
    await page.goto('/');
    
    // Check title
    await expect(page).toHaveTitle(/RehearseKit/);
    
    // Check main heading
    await expect(page.getByRole('heading', { name: /Your Complete Rehearsal Toolkit/i })).toBeVisible();
    
    // Check features are displayed
    await expect(page.getByText(/Stem Separation/i)).toBeVisible();
    await expect(page.getByText(/Tempo Detection/i)).toBeVisible();
    await expect(page.getByText(/DAW Integration/i)).toBeVisible();
  });

  test('can switch between upload and youtube tabs', async ({ page }) => {
    await page.goto('/');
    
    // Default should be Upload FLAC
    const uploadButton = page.getByRole('button', { name: /Upload FLAC/i });
    await expect(uploadButton).toBeVisible();
    
    // Click YouTube URL tab
    const youtubeButton = page.getByRole('button', { name: /YouTube URL/i });
    await youtubeButton.click();
    
    // YouTube input should be visible
    await expect(page.getByPlaceholder(/youtube.com/i)).toBeVisible();
  });

  test('form validation works', async ({ page }) => {
    await page.goto('/');
    
    // Click YouTube tab
    await page.getByRole('button', { name: /YouTube URL/i }).click();
    
    // Try to submit without filling fields
    const submitButton = page.getByRole('button', { name: /Start Processing/i });
    await submitButton.click();
    
    // Should show error (toast notification)
    // Note: This might need adjustment based on actual error handling
  });

  test('backend API is accessible', async ({ page }) => {
    const response = await page.request.get('http://localhost:8000/api/health');
    expect(response.ok()).toBeTruthy();
    
    const health = await response.json();
    expect(health.status).toBe('healthy');
    expect(health.database).toBe('healthy');
    expect(health.redis).toBe('healthy');
  });

  test('jobs page loads', async ({ page }) => {
    await page.goto('/jobs');
    
    await expect(page.getByRole('heading', { name: /Job History/i })).toBeVisible();
  });
});

