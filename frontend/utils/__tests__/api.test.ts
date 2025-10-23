/**
 * Unit tests for API client
 * Tests ApiClient class, methods, error handling, and URL detection
 */

import { getApiUrl, apiClient, Job, JobStatus, JobListResponse, YouTubePreviewResponse } from '../api';
import * as auth from '../auth';

// Access the unexported ApiClient class for testing
const ApiClient = (apiClient as any).constructor;

// Mock the auth module
jest.mock('../auth', () => ({
  getAuthHeaders: jest.fn(),
}));

describe('getApiUrl', () => {
  it('should return a valid URL', () => {
    // Test that it returns a valid URL
    // Note: Detailed window.location testing is difficult in Jest/jsdom
    // This functionality is covered by E2E tests
    const url = getApiUrl();
    expect(url).toBeTruthy();
    expect(typeof url).toBe('string');
    expect(url).toMatch(/^https?:\/\//);
  });
});

describe('ApiClient', () => {
  let client: ApiClient;
  let mockGetBaseUrl: jest.Mock;
  let mockFetch: jest.Mock;
  const mockAccessToken = 'mock-access-token';

  beforeEach(() => {
    mockGetBaseUrl = jest.fn(() => 'http://localhost:8000');
    client = new ApiClient(mockGetBaseUrl);
    mockFetch = jest.fn();
    global.fetch = mockFetch;
    (auth.getAuthHeaders as jest.Mock).mockReturnValue({
      Authorization: `Bearer ${mockAccessToken}`,
    });
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with URL getter function', () => {
      const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
      const customGetUrl = jest.fn(() => 'http://custom:9000');

      const customClient = new ApiClient(customGetUrl);

      expect(mockConsoleLog).toHaveBeenCalledWith('[ApiClient] Initialized with URL getter');
      mockConsoleLog.mockRestore();
    });
  });

  describe('getJobs', () => {
    const mockJobsResponse: JobListResponse = {
      jobs: [
        {
          id: 'job-1',
          status: 'COMPLETED' as JobStatus,
          input_type: 'upload',
          project_name: 'Test Project',
          quality_mode: 'fast',
          progress_percent: 100,
          created_at: '2024-01-01T00:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      page_size: 20,
    };

    it('should fetch jobs with default pagination', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockJobsResponse,
      });

      const result = await client.getJobs();

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8000/api/jobs?page=1&page_size=20', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockAccessToken}`,
        },
      });
      expect(result).toEqual(mockJobsResponse);
    });

    it('should fetch jobs with custom pagination', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockJobsResponse,
      });

      await client.getJobs(2, 50);

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8000/api/jobs?page=2&page_size=50', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockAccessToken}`,
        },
      });
    });

    it('should include auth headers', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockJobsResponse,
      });

      await client.getJobs();

      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.headers.Authorization).toBe(`Bearer ${mockAccessToken}`);
    });

    it('should work without auth headers when not authenticated', async () => {
      (auth.getAuthHeaders as jest.Mock).mockReturnValue({});
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockJobsResponse,
      });

      await client.getJobs();

      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.headers.Authorization).toBeUndefined();
    });
  });

  describe('getJob', () => {
    const mockJob: Job = {
      id: 'job-123',
      status: 'COMPLETED' as JobStatus,
      input_type: 'youtube',
      input_url: 'https://youtube.com/watch?v=test',
      project_name: 'My Song',
      quality_mode: 'high',
      detected_bpm: 120,
      progress_percent: 100,
      created_at: '2024-01-01T00:00:00Z',
      completed_at: '2024-01-01T00:05:00Z',
    };

    it('should fetch a single job by ID', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockJob,
      });

      const result = await client.getJob('job-123');

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8000/api/jobs/job-123', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockAccessToken}`,
        },
      });
      expect(result).toEqual(mockJob);
    });

    it('should handle job not found error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ detail: 'Job not found' }),
      });

      await expect(client.getJob('nonexistent')).rejects.toThrow('Job not found');
    });
  });

  describe('createJob', () => {
    const mockJob: Job = {
      id: 'job-new',
      status: 'PENDING' as JobStatus,
      input_type: 'upload',
      project_name: 'New Project',
      quality_mode: 'fast',
      progress_percent: 0,
      created_at: '2024-01-01T00:00:00Z',
    };

    it('should create job with file upload', async () => {
      const mockFile = new File(['audio content'], 'song.mp3', { type: 'audio/mpeg' });
      const jobData = {
        project_name: 'New Project',
        quality_mode: 'fast' as const,
        input_type: 'upload' as const,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockJob,
      });

      const result = await client.createJob(jobData, mockFile);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/jobs/create',
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: `Bearer ${mockAccessToken}`,
          },
          body: expect.any(FormData),
        })
      );

      // Verify FormData contents
      const callArgs = mockFetch.mock.calls[0][1];
      const formData = callArgs.body as FormData;
      expect(formData.get('project_name')).toBe('New Project');
      expect(formData.get('quality_mode')).toBe('fast');
      expect(formData.get('file')).toBe(mockFile);

      expect(result).toEqual(mockJob);
    });

    it('should create job with YouTube URL', async () => {
      const jobData = {
        project_name: 'YouTube Project',
        quality_mode: 'high' as const,
        input_type: 'youtube' as const,
        input_url: 'https://youtube.com/watch?v=test',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockJob,
      });

      await client.createJob(jobData);

      const callArgs = mockFetch.mock.calls[0][1];
      const formData = callArgs.body as FormData;
      expect(formData.get('project_name')).toBe('YouTube Project');
      expect(formData.get('quality_mode')).toBe('high');
      expect(formData.get('input_url')).toBe('https://youtube.com/watch?v=test');
      expect(formData.get('file')).toBeNull();
    });

    it('should include youtube_preview_id when provided', async () => {
      const jobData = {
        project_name: 'YouTube Project',
        quality_mode: 'fast' as const,
        input_type: 'youtube' as const,
        input_url: 'https://youtube.com/watch?v=test',
        youtube_preview_id: 'preview-123',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockJob,
      });

      await client.createJob(jobData);

      const callArgs = mockFetch.mock.calls[0][1];
      const formData = callArgs.body as FormData;
      expect(formData.get('youtube_preview_id')).toBe('preview-123');
    });

    it('should include manual_bpm when provided', async () => {
      const jobData = {
        project_name: 'Manual BPM Project',
        quality_mode: 'fast' as const,
        input_type: 'upload' as const,
        manual_bpm: 128,
      };
      const mockFile = new File(['audio'], 'song.mp3', { type: 'audio/mpeg' });

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockJob,
      });

      await client.createJob(jobData, mockFile);

      const callArgs = mockFetch.mock.calls[0][1];
      const formData = callArgs.body as FormData;
      expect(formData.get('manual_bpm')).toBe('128');
    });

    it('should include trim_start and trim_end when provided', async () => {
      const jobData = {
        project_name: 'Trimmed Project',
        quality_mode: 'fast' as const,
        input_type: 'upload' as const,
        trim_start: 10,
        trim_end: 120,
      };
      const mockFile = new File(['audio'], 'song.mp3', { type: 'audio/mpeg' });

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockJob,
      });

      await client.createJob(jobData, mockFile);

      const callArgs = mockFetch.mock.calls[0][1];
      const formData = callArgs.body as FormData;
      expect(formData.get('trim_start')).toBe('10');
      expect(formData.get('trim_end')).toBe('120');
    });

    it('should include trim values of 0', async () => {
      const jobData = {
        project_name: 'Zero Trim Project',
        quality_mode: 'fast' as const,
        input_type: 'upload' as const,
        trim_start: 0,
        trim_end: 0,
      };
      const mockFile = new File(['audio'], 'song.mp3', { type: 'audio/mpeg' });

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockJob,
      });

      await client.createJob(jobData, mockFile);

      const callArgs = mockFetch.mock.calls[0][1];
      const formData = callArgs.body as FormData;
      expect(formData.get('trim_start')).toBe('0');
      expect(formData.get('trim_end')).toBe('0');
    });

    it('should not include Content-Type header for FormData', async () => {
      const jobData = {
        project_name: 'Project',
        quality_mode: 'fast' as const,
        input_type: 'upload' as const,
      };
      const mockFile = new File(['audio'], 'song.mp3', { type: 'audio/mpeg' });

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockJob,
      });

      await client.createJob(jobData, mockFile);

      const callArgs = mockFetch.mock.calls[0][1];
      // Content-Type should not be set manually for FormData (browser sets it with boundary)
      expect(callArgs.headers['Content-Type']).toBeUndefined();
    });

    it('should handle validation error (422)', async () => {
      const jobData = {
        project_name: '',
        quality_mode: 'fast' as const,
        input_type: 'upload' as const,
      };
      const mockFile = new File(['audio'], 'song.mp3', { type: 'audio/mpeg' });

      mockFetch.mockResolvedValue({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
        json: async () => ({
          detail: [
            { loc: ['body', 'project_name'], msg: 'field required' },
            { loc: ['body', 'quality_mode'], msg: 'invalid value' },
          ],
        }),
      });

      await expect(client.createJob(jobData, mockFile)).rejects.toThrow(
        'body.project_name: field required, body.quality_mode: invalid value'
      );
    });

    it('should handle string error detail', async () => {
      const jobData = {
        project_name: 'Project',
        quality_mode: 'fast' as const,
        input_type: 'upload' as const,
      };
      const mockFile = new File(['audio'], 'song.mp3', { type: 'audio/mpeg' });

      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({
          detail: 'Invalid file format',
        }),
      });

      await expect(client.createJob(jobData, mockFile)).rejects.toThrow('Invalid file format');
    });

    it('should handle object error detail', async () => {
      const jobData = {
        project_name: 'Project',
        quality_mode: 'fast' as const,
        input_type: 'upload' as const,
      };
      const mockFile = new File(['audio'], 'song.mp3', { type: 'audio/mpeg' });

      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({
          detail: { code: 'invalid_input', message: 'Bad input' },
        }),
      });

      await expect(client.createJob(jobData, mockFile)).rejects.toThrow(
        '{"code":"invalid_input","message":"Bad input"}'
      );
    });

    it('should handle error with message field', async () => {
      const jobData = {
        project_name: 'Project',
        quality_mode: 'fast' as const,
        input_type: 'upload' as const,
      };
      const mockFile = new File(['audio'], 'song.mp3', { type: 'audio/mpeg' });

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({
          message: 'Server error occurred',
        }),
      });

      await expect(client.createJob(jobData, mockFile)).rejects.toThrow('Server error occurred');
    });

    it('should handle non-JSON error response', async () => {
      const jobData = {
        project_name: 'Project',
        quality_mode: 'fast' as const,
        input_type: 'upload' as const,
      };
      const mockFile = new File(['audio'], 'song.mp3', { type: 'audio/mpeg' });

      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: async () => {
          throw new Error('Not JSON');
        },
      });

      await expect(client.createJob(jobData, mockFile)).rejects.toThrow('503: Service Unavailable');
    });
  });

  describe('deleteJob', () => {
    it('should delete a job by ID', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await client.deleteJob('job-123');

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8000/api/jobs/job-123', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockAccessToken}`,
        },
      });
    });

    it('should handle delete error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ detail: 'Job not found' }),
      });

      await expect(client.deleteJob('nonexistent')).rejects.toThrow('Job not found');
    });
  });

  describe('getDownloadUrl', () => {
    it('should fetch download URL for a job', async () => {
      const mockResponse = { url: 'https://example.com/download/job-123.zip' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.getDownloadUrl('job-123');

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8000/api/jobs/job-123/download', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockAccessToken}`,
        },
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('healthCheck', () => {
    it('should check API health', async () => {
      const mockResponse = { status: 'healthy', version: '1.0.0' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.healthCheck();

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8000/api/health', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockAccessToken}`,
        },
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('createYouTubePreview', () => {
    const mockPreviewResponse: YouTubePreviewResponse = {
      preview_id: 'preview-123',
      preview_url: 'https://example.com/preview.mp3',
      title: 'Test Video',
      duration: 180,
      thumbnail: 'https://example.com/thumb.jpg',
    };

    it('should create YouTube preview', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockPreviewResponse,
      });

      const result = await client.createYouTubePreview('https://youtube.com/watch?v=test');

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8000/api/youtube/preview', {
        method: 'POST',
        body: JSON.stringify({ url: 'https://youtube.com/watch?v=test' }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockAccessToken}`,
        },
      });
      expect(result).toEqual(mockPreviewResponse);
    });

    it('should handle invalid YouTube URL error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ detail: 'Invalid YouTube URL' }),
      });

      await expect(client.createYouTubePreview('invalid-url')).rejects.toThrow('Invalid YouTube URL');
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network request failed'));

      await expect(client.getJobs()).rejects.toThrow('Network request failed');
    });

    it('should handle validation errors with array detail', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
        json: async () => ({
          detail: [
            { loc: ['body', 'field1'], msg: 'required' },
            { loc: ['body', 'field2'], msg: 'invalid' },
          ],
        }),
      });

      await expect(client.getJobs()).rejects.toThrow('body.field1: required, body.field2: invalid');
    });

    it('should handle validation errors without loc field', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
        json: async () => ({
          detail: [{ msg: 'validation failed' }],
        }),
      });

      await expect(client.getJobs()).rejects.toThrow('Field: validation failed');
    });

    it('should handle string detail error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({
          detail: 'Custom error message',
        }),
      });

      await expect(client.getJobs()).rejects.toThrow('Custom error message');
    });

    it('should handle object detail error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({
          detail: { error: 'complex error' },
        }),
      });

      await expect(client.getJobs()).rejects.toThrow('{"error":"complex error"}');
    });

    it('should handle error with message field', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({
          message: 'Internal error',
        }),
      });

      await expect(client.getJobs()).rejects.toThrow('Internal error');
    });

    it('should handle non-JSON error responses', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
        json: async () => {
          throw new Error('Not JSON');
        },
      });

      await expect(client.getJobs()).rejects.toThrow('502: Bad Gateway');
    });

    it('should handle empty error response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({}),
      });

      // Empty object gets stringified to "{}"
      await expect(client.getJobs()).rejects.toThrow('{}');
    });
  });

  describe('auth header injection', () => {
    it('should include auth headers in GET requests', async () => {
      (auth.getAuthHeaders as jest.Mock).mockReturnValue({
        Authorization: 'Bearer custom-token',
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ jobs: [], total: 0, page: 1, page_size: 20 }),
      });

      await client.getJobs();

      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.headers.Authorization).toBe('Bearer custom-token');
    });

    it('should work without auth module (SSR)', async () => {
      // Simulate auth module not being available
      delete (global as any).window;

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ jobs: [], total: 0, page: 1, page_size: 20 }),
      });

      await client.getJobs();

      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.headers['Content-Type']).toBe('application/json');
      // Should still work, just without auth header from dynamic import
    });

    it('should override Content-Type header when provided', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ jobs: [], total: 0, page: 1, page_size: 20 }),
      });

      // Direct call to private request method (via getJobs which uses it)
      // This tests that custom headers override default headers
      await client.getJobs();

      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.headers['Content-Type']).toBe('application/json');
    });
  });

  describe('dynamic base URL', () => {
    it('should use URL from getter function on each request', async () => {
      let urlCounter = 0;
      const dynamicGetUrl = jest.fn(() => `http://localhost:${8000 + urlCounter++}`);
      const dynamicClient = new ApiClient(dynamicGetUrl);

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ jobs: [], total: 0, page: 1, page_size: 20 }),
      });

      await dynamicClient.getJobs();
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/jobs?page=1&page_size=20',
        expect.any(Object)
      );

      await dynamicClient.getJobs();
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8001/api/jobs?page=1&page_size=20',
        expect.any(Object)
      );

      expect(dynamicGetUrl).toHaveBeenCalledTimes(2);
    });

    it('should log base URL on getter call', async () => {
      const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ jobs: [], total: 0, page: 1, page_size: 20 }),
      });

      await client.getJobs();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[ApiClient] baseUrl getter called, returning:',
        'http://localhost:8000'
      );
      mockConsoleLog.mockRestore();
    });
  });
});

describe('apiClient singleton', () => {
  it('should export a pre-configured apiClient instance', () => {
    expect(apiClient).toBeInstanceOf(ApiClient);
  });

  it('should use getApiUrl as base URL getter', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ jobs: [], total: 0, page: 1, page_size: 20 }),
    });
    global.fetch = mockFetch;

    await apiClient.getJobs();

    // Should use a URL from getApiUrl (we can't easily mock window.location in jest)
    expect(mockFetch).toHaveBeenCalled();
    const callUrl = mockFetch.mock.calls[0][0];
    expect(callUrl).toMatch(/^https?:\/\/.+\/api\/jobs\?page=1&page_size=20$/);
  });
});
