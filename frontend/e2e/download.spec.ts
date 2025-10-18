import { test, expect } from '@playwright/test';

test.describe('RehearseKit - Download Functionality', () => {
  test('completed job has download button', async ({ page }) => {
    // First, get a completed job from the API
    const response = await page.request.get('http://localhost:8000/api/jobs');
    const data = await response.json();
    
    const completedJob = data.jobs.find((job: any) => job.status === 'COMPLETED');
    
    if (!completedJob) {
      test.skip('No completed jobs available for testing');
      return;
    }
    
    // Navigate to homepage
    await page.goto('/');
    
    // Find the completed job card
    const jobCard = page.getByText(completedJob.project_name).first();
    await expect(jobCard).toBeVisible();
    
    // Check for download button
    const downloadButton = page.getByRole('button', { name: /Download/i }).first();
    await expect(downloadButton).toBeVisible();
  });

  test('download button triggers file download', async ({ page }) => {
    // Get a completed job
    const response = await page.request.get('http://localhost:8000/api/jobs');
    const data = await response.json();
    
    const completedJob = data.jobs.find((job: any) => job.status === 'COMPLETED');
    
    if (!completedJob) {
      test.skip('No completed jobs available for testing');
      return;
    }
    
    // Navigate to homepage
    await page.goto('/');
    
    // Set up download listener
    const downloadPromise = page.waitForEvent('download');
    
    // Click download button
    const downloadButton = page.getByRole('button', { name: /Download/i }).first();
    await downloadButton.click();
    
    // Wait for download to start
    const download = await downloadPromise;
    
    // Verify download filename
    expect(download.suggestedFilename()).toContain('RehearseKit.zip');
    
    // Cancel download (we don't need to actually download)
    await download.cancel();
  });

  test('job detail page download works', async ({ page }) => {
    // Get a completed job
    const response = await page.request.get('http://localhost:8000/api/jobs');
    const data = await response.json();
    
    const completedJob = data.jobs.find((job: any) => job.status === 'COMPLETED');
    
    if (!completedJob) {
      test.skip('No completed jobs available for testing');
      return;
    }
    
    // Navigate to job detail page
    await page.goto(`/jobs/${completedJob.id}`);
    
    // Check download section is visible
    await expect(page.getByText(/Download Results/i)).toBeVisible();
    await expect(page.getByText(/Your processed audio files are ready/i)).toBeVisible();
    
    // Check download button exists
    const downloadButton = page.getByRole('button', { name: /Download Complete Package/i });
    await expect(downloadButton).toBeVisible();
    
    // Set up download listener
    const downloadPromise = page.waitForEvent('download');
    
    // Click download
    await downloadButton.click();
    
    // Verify download starts
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('RehearseKit.zip');
    
    await download.cancel();
  });

  test('download endpoint returns correct file', async ({ page }) => {
    // Get a completed job
    const response = await page.request.get('http://localhost:8000/api/jobs');
    const data = await response.json();
    
    const completedJob = data.jobs.find((job: any) => job.status === 'COMPLETED');
    
    if (!completedJob) {
      test.skip('No completed jobs available');
      return;
    }
    
    // Test direct download endpoint
    const downloadResponse = await page.request.get(
      `http://localhost:8000/api/jobs/${completedJob.id}/download`
    );
    
    expect(downloadResponse.ok()).toBeTruthy();
    expect(downloadResponse.headers()['content-type']).toBe('application/zip');
    expect(parseInt(downloadResponse.headers()['content-length'])).toBeGreaterThan(1000000); // At least 1MB
  });
});

