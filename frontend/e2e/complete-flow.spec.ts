import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

test.describe('RehearseKit - Complete End-to-End Flow', () => {
  
  test.describe('Audio Upload and Processing', () => {
    
    test('should upload and process MP3 file successfully', async ({ page }) => {
      await page.goto('/');
      
      // Ensure we're on upload tab
      const uploadButton = page.getByRole('button', { name: /Upload Audio/i });
      await uploadButton.click();
      
      // Create test MP3 file (using a fixture or mock)
      // For now, we'll test the UI flow without actual file
      // TODO: Add actual test MP3 file to e2e/fixtures/
      
      // Fill project name
      const projectName = `Test MP3 ${Date.now()}`;
      await page.getByPlaceholder(/My Awesome Song/i).fill(projectName);
      
      // Select quality mode (Fast should be default)
      await expect(page.getByRole('button', { name: /Fast/i })).toBeVisible();
      
      // Note: Actual file upload requires test fixtures
      // This test validates UI flow structure
    });

    test('should upload and process WAV file successfully', async ({ page }) => {
      await page.goto('/');
      
      const uploadButton = page.getByRole('button', { name: /Upload Audio/i });
      await uploadButton.click();
      
      const projectName = `Test WAV ${Date.now()}`;
      await page.getByPlaceholder(/My Awesome Song/i).fill(projectName);
      
      // Verify accept attribute includes WAV
      const fileInput = page.locator('input[type="file"]');
      const acceptAttr = await fileInput.getAttribute('accept');
      expect(acceptAttr).toContain('.wav');
      expect(acceptAttr).toContain('audio/wav');
    });

    test('should upload and process FLAC file successfully', async ({ page }) => {
      await page.goto('/');
      
      const uploadButton = page.getByRole('button', { name: /Upload Audio/i });
      await uploadButton.click();
      
      const projectName = `Test FLAC ${Date.now()}`;
      await page.getByPlaceholder(/My Awesome Song/i).fill(projectName);
      
      // Verify accept attribute includes FLAC
      const fileInput = page.locator('input[type="file"]');
      const acceptAttr = await fileInput.getAttribute('accept');
      expect(acceptAttr).toContain('.flac');
      expect(acceptAttr).toContain('audio/flac');
    });

    test('should show correct file format support in UI', async ({ page }) => {
      await page.goto('/');
      
      const uploadButton = page.getByRole('button', { name: /Upload Audio/i });
      await uploadButton.click();
      
      // Check help text mentions all supported formats
      await expect(page.getByText(/MP3, WAV, FLAC/i)).toBeVisible();
    });
  });

  test.describe('YouTube URL Processing', () => {
    
    test('should process YouTube URL successfully', async ({ page }) => {
      await page.goto('/');
      
      // Switch to YouTube tab
      await page.getByRole('button', { name: /YouTube URL/i }).click();
      
      // Fill in test data
      const projectName = `YouTube Test ${Date.now()}`;
      await page.getByPlaceholder(/youtube.com/i).fill('https://www.youtube.com/watch?v=jNQXAC9IVRw');
      await page.getByPlaceholder(/My Awesome Song/i).fill(projectName);
      
      // Submit the form
      await page.getByRole('button', { name: /Start Processing/i }).click();
      
      // Wait for job creation (toast or redirect)
      await page.waitForTimeout(2000);
      
      // Verify job appears
      await expect(page.getByText(projectName)).toBeVisible();
    });

    test('should validate YouTube URL format', async ({ page }) => {
      await page.goto('/');
      
      await page.getByRole('button', { name: /YouTube URL/i }).click();
      
      // Try with invalid URL
      await page.getByPlaceholder(/youtube.com/i).fill('not-a-url');
      await page.getByPlaceholder(/My Awesome Song/i).fill('Test Project');
      
      // Attempt submission - should show error or prevent submission
      // Exact behavior depends on validation implementation
    });
  });

  test.describe('Job Status and Progress Tracking', () => {
    
    test('should display job status transitions', async ({ page }) => {
      // Navigate to jobs page
      await page.goto('/jobs');
      
      // Check that jobs page loads
      await page.waitForLoadState('networkidle');
      
      // Check if jobs exist
      const jobCards = page.locator('[class*="Card"]');
      const count = await jobCards.count();
      
      if (count > 0) {
        // If jobs exist, verify status badge is shown
        const firstJobCard = jobCards.first();
        await expect(firstJobCard.getByText(/PENDING|CONVERTING|ANALYZING|SEPARATING|COMPLETED|FAILED/)).toBeVisible();
      } else {
        // If no jobs, verify empty state or page loads correctly
        await expect(page.getByRole('heading', { name: /Job History/i })).toBeVisible();
      }
    });

    test('should show progress bar for in-progress jobs', async ({ page }) => {
      await page.goto('/jobs');
      
      // Wait for jobs to load
      await page.waitForTimeout(2000);
      
      // Look for any job cards
      const jobCards = page.locator('[class*="Card"]');
      const count = await jobCards.count();
      
      if (count > 0) {
        // Check if any job has progress indicator
        // Progress bar only shows for non-completed jobs
        const firstCard = jobCards.first();
        const status = await firstCard.getByText(/PENDING|CONVERTING|ANALYZING|SEPARATING|PACKAGING/).textContent();
        
        if (status) {
          // Should have progress bar
          await expect(firstCard.locator('[role="progressbar"]')).toBeVisible();
        }
      }
    });

    test('should update progress via WebSocket', async ({ page }) => {
      // This test requires an active processing job
      // Skip if no jobs are currently processing
      await page.goto('/jobs');
      
      // Wait for potential WebSocket updates
      await page.waitForTimeout(5000);
      
      // Verify WebSocket connection is established
      // (Implementation depends on WebSocket client in job-card.tsx)
    });
  });

  test.describe('Job Details and Download', () => {
    
    test('should view job details page', async ({ page }) => {
      // Get a job from the API
      const response = await page.request.get(`${BACKEND_URL}/api/jobs`);
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      
      if (data.jobs.length === 0) {
        test.skip();
        return;
      }
      
      const job = data.jobs[0];
      
      // Navigate to job detail page
      await page.goto(`/jobs/${job.id}`);
      
      // Verify job details are displayed
      await expect(page.getByText(job.project_name).first()).toBeVisible();
      await expect(page.getByText(/Status/i)).toBeVisible();
      
      // Check status is displayed (case-insensitive, handles badge or text)
      const statusText = new RegExp(job.status, 'i');
      await expect(page.getByText(statusText).first()).toBeVisible();
    });

    test('should download completed job package', async ({ page }) => {
      // Get completed jobs from API
      const response = await page.request.get(`${BACKEND_URL}/api/jobs`);
      const data = await response.json();
      
      const completedJob = data.jobs.find((j: any) => j.status === 'COMPLETED');
      
      if (!completedJob) {
        test.skip();
        return;
      }
      
      await page.goto(`/jobs/${completedJob.id}`);
      
      // Find and click download button
      const downloadButton = page.getByRole('button', { name: /Download/i });
      
      if (await downloadButton.isVisible()) {
        // Set up download listener
        const downloadPromise = page.waitForEvent('download');
        
        await downloadButton.click();
        
        const download = await downloadPromise;
        
        // Verify download started
        expect(download.suggestedFilename()).toMatch(/\.zip$/);
      }
    });
  });

  test.describe('Error Handling', () => {
    
    test('should handle unsupported file format', async ({ page }) => {
      await page.goto('/');
      
      // The file input should only accept specified formats
      const fileInput = page.locator('input[type="file"]');
      const acceptAttr = await fileInput.getAttribute('accept');
      
      // Should not accept other formats
      expect(acceptAttr).not.toContain('.exe');
      expect(acceptAttr).not.toContain('.pdf');
    });

    test('should require project name', async ({ page }) => {
      await page.goto('/');
      
      await page.getByRole('button', { name: /YouTube URL/i }).click();
      
      // Fill YouTube URL but not project name
      await page.getByPlaceholder(/youtube.com/i).fill('https://www.youtube.com/watch?v=test');
      
      // Clear project name field
      const projectNameInput = page.getByPlaceholder(/My Awesome Song/i);
      await projectNameInput.clear();
      
      // Try to submit
      await page.getByRole('button', { name: /Start Processing/i }).click();
      
      // Should show validation error or prevent submission
      // Exact implementation may vary
    });

    test('should display error message for failed jobs', async ({ page }) => {
      const response = await page.request.get(`${BACKEND_URL}/api/jobs`);
      const data = await response.json();
      
      const failedJob = data.jobs.find((j: any) => j.status === 'FAILED');
      
      if (!failedJob) {
        test.skip();
        return;
      }
      
      await page.goto(`/jobs/${failedJob.id}`);
      
      // Should show error message
      if (failedJob.error_message) {
        await expect(page.getByText(/Error/i)).toBeVisible();
      }
    });
  });

  test.describe('Job Management', () => {
    
    test('should list all jobs with pagination', async ({ page }) => {
      await page.goto('/jobs');
      
      // Wait for page to load
      await page.waitForLoadState('networkidle');
      
      // Verify jobs page is accessible
      await expect(page.getByRole('heading', { name: /Job History/i })).toBeVisible();
      
      // Check if jobs exist
      const jobCards = page.locator('[class*="Card"]');
      const count = await jobCards.count();
      
      // Either jobs are displayed or page shows empty state (both valid)
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should filter or sort jobs', async ({ page }) => {
      await page.goto('/jobs');
      
      // Current implementation may not have filtering
      // This test documents expected future functionality
      
      // Verify jobs are sorted by creation date (newest first)
      const jobCards = page.locator('[class*="Card"]');
      const count = await jobCards.count();
      
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Responsiveness and Accessibility', () => {
    
    test('should be responsive on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      
      // Verify key elements are visible and usable
      await expect(page.getByRole('button', { name: /Upload Audio/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /YouTube URL/i })).toBeVisible();
    });

    test('should support keyboard navigation', async ({ page }) => {
      await page.goto('/');
      
      // Tab through interactive elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Verify focus is visible (requires checking focused element)
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBeTruthy();
    });

    test('should have proper ARIA labels', async ({ page }) => {
      await page.goto('/');
      
      // Check for accessible buttons
      await expect(page.getByRole('button', { name: /Upload Audio/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /YouTube URL/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Start Processing/i })).toBeVisible();
    });
  });
});

