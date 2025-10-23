/**
 * Unit tests for ProcessingQueue component
 * Tests job list rendering, polling, React Query integration, loading and error states
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ProcessingQueue } from '../processing-queue';
import { useQuery } from '@tanstack/react-query';
import { Job, JobListResponse } from '@/utils/api';

// Mock dependencies
jest.mock('@tanstack/react-query');
jest.mock('@/utils/api', () => ({
  apiClient: {
    getJobs: jest.fn(),
  },
}));

// Mock JobCard component
jest.mock('../job-card', () => ({
  JobCard: ({ job }: { job: Job }) => (
    <div data-testid={`job-card-${job.id}`} data-status={job.status}>
      {job.project_name} - {job.status}
    </div>
  ),
}));

describe('ProcessingQueue', () => {
  const mockActiveJob: Job = {
    id: 'job-1',
    status: 'SEPARATING',
    input_type: 'upload',
    project_name: 'Active Job',
    quality_mode: 'fast',
    progress_percent: 50,
    created_at: '2024-01-01T00:00:00Z',
  };

  const mockCompletedJob: Job = {
    id: 'job-2',
    status: 'COMPLETED',
    input_type: 'youtube',
    project_name: 'Completed Job',
    quality_mode: 'high',
    progress_percent: 100,
    created_at: '2024-01-01T00:00:00Z',
    completed_at: '2024-01-01T01:00:00Z',
  };

  const mockFailedJob: Job = {
    id: 'job-3',
    status: 'FAILED',
    input_type: 'upload',
    project_name: 'Failed Job',
    quality_mode: 'fast',
    progress_percent: 30,
    error_message: 'Processing error',
    created_at: '2024-01-01T00:00:00Z',
  };

  const mockCancelledJob: Job = {
    id: 'job-4',
    status: 'CANCELLED',
    input_type: 'youtube',
    project_name: 'Cancelled Job',
    quality_mode: 'high',
    progress_percent: 20,
    created_at: '2024-01-01T00:00:00Z',
  };

  const mockPendingJob: Job = {
    id: 'job-5',
    status: 'PENDING',
    input_type: 'upload',
    project_name: 'Pending Job',
    quality_mode: 'fast',
    progress_percent: 0,
    created_at: '2024-01-01T00:00:00Z',
  };

  const mockJobListResponse: JobListResponse = {
    jobs: [mockActiveJob, mockCompletedJob],
    total: 2,
    page: 1,
    page_size: 20,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should render loading spinner when isLoading is true', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      const { container } = render(<ProcessingQueue />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('animate-spin', 'text-kit-blue');
    });

    it('should not render jobs when loading', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      render(<ProcessingQueue />);

      expect(screen.queryByText('Active Jobs')).not.toBeInTheDocument();
      expect(screen.queryByText('Completed Jobs')).not.toBeInTheDocument();
    });

    it('should render loading container with correct styling', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      const { container } = render(<ProcessingQueue />);

      const loadingContainer = container.querySelector('.animate-spin')?.parentElement;
      expect(loadingContainer).toHaveClass('flex', 'items-center', 'justify-center', 'p-12');
    });

    it('should use Loader2 icon for loading', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      const { container } = render(<ProcessingQueue />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toHaveClass('h-8', 'w-8');
    });
  });

  describe('Error State', () => {
    it('should render error message when error occurs', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Network error'),
      });

      render(<ProcessingQueue />);

      expect(screen.getByText('Failed to load jobs. Please try again later.')).toBeInTheDocument();
    });

    it('should not render jobs when error occurs', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Network error'),
      });

      render(<ProcessingQueue />);

      expect(screen.queryByText('Active Jobs')).not.toBeInTheDocument();
      expect(screen.queryByText('Completed Jobs')).not.toBeInTheDocument();
    });

    it('should render error container with correct styling', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Network error'),
      });

      render(<ProcessingQueue />);

      const errorContainer = screen.getByText('Failed to load jobs. Please try again later.').parentElement;
      expect(errorContainer).toHaveClass('text-center', 'p-12', 'text-muted-foreground');
    });
  });

  describe('Empty State', () => {
    it('should render empty message when no jobs exist', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: { jobs: [], total: 0, page: 1, page_size: 20 },
        isLoading: false,
        error: null,
      });

      render(<ProcessingQueue />);

      expect(screen.getByText('No jobs yet. Upload a file or paste a YouTube URL to get started.')).toBeInTheDocument();
    });

    it('should not render job sections when no jobs exist', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: { jobs: [], total: 0, page: 1, page_size: 20 },
        isLoading: false,
        error: null,
      });

      render(<ProcessingQueue />);

      expect(screen.queryByText('Active Jobs')).not.toBeInTheDocument();
      expect(screen.queryByText('Completed Jobs')).not.toBeInTheDocument();
    });

    it('should render empty state container with correct styling', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: { jobs: [], total: 0, page: 1, page_size: 20 },
        isLoading: false,
        error: null,
      });

      render(<ProcessingQueue />);

      const emptyContainer = screen.getByText('No jobs yet. Upload a file or paste a YouTube URL to get started.').parentElement;
      expect(emptyContainer).toHaveClass('text-center', 'p-12', 'text-muted-foreground');
    });

    it('should handle undefined jobs array gracefully', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: { total: 0, page: 1, page_size: 20 },
        isLoading: false,
        error: null,
      });

      render(<ProcessingQueue />);

      expect(screen.getByText('No jobs yet. Upload a file or paste a YouTube URL to get started.')).toBeInTheDocument();
    });
  });

  describe('Job List Rendering', () => {
    it('should render both active and completed jobs', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: mockJobListResponse,
        isLoading: false,
        error: null,
      });

      render(<ProcessingQueue />);

      expect(screen.getByText('Active Jobs')).toBeInTheDocument();
      expect(screen.getByText('Completed Jobs')).toBeInTheDocument();
      expect(screen.getByTestId('job-card-job-1')).toBeInTheDocument();
      expect(screen.getByTestId('job-card-job-2')).toBeInTheDocument();
    });

    it('should render only active jobs section when no completed jobs', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: { jobs: [mockActiveJob, mockPendingJob], total: 2, page: 1, page_size: 20 },
        isLoading: false,
        error: null,
      });

      render(<ProcessingQueue />);

      expect(screen.getByText('Active Jobs')).toBeInTheDocument();
      expect(screen.queryByText('Completed Jobs')).not.toBeInTheDocument();
      expect(screen.getByTestId('job-card-job-1')).toBeInTheDocument();
      expect(screen.getByTestId('job-card-job-5')).toBeInTheDocument();
    });

    it('should render only completed jobs section when no active jobs', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: { jobs: [mockCompletedJob, mockFailedJob], total: 2, page: 1, page_size: 20 },
        isLoading: false,
        error: null,
      });

      render(<ProcessingQueue />);

      expect(screen.queryByText('Active Jobs')).not.toBeInTheDocument();
      expect(screen.getByText('Completed Jobs')).toBeInTheDocument();
      expect(screen.getByTestId('job-card-job-2')).toBeInTheDocument();
      expect(screen.getByTestId('job-card-job-3')).toBeInTheDocument();
    });

    it('should render section headers with correct styling', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: mockJobListResponse,
        isLoading: false,
        error: null,
      });

      render(<ProcessingQueue />);

      const activeHeader = screen.getByText('Active Jobs');
      const completedHeader = screen.getByText('Completed Jobs');

      expect(activeHeader).toHaveClass('text-2xl', 'font-semibold');
      expect(completedHeader).toHaveClass('text-2xl', 'font-semibold');
    });

    it('should render job cards in grid layout', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: mockJobListResponse,
        isLoading: false,
        error: null,
      });

      const { container } = render(<ProcessingQueue />);

      const grids = container.querySelectorAll('.grid');
      expect(grids.length).toBeGreaterThan(0);

      grids.forEach(grid => {
        expect(grid).toHaveClass('gap-4');
      });
    });
  });

  describe('Job Status Classification', () => {
    it('should classify PENDING jobs as active', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: { jobs: [mockPendingJob], total: 1, page: 1, page_size: 20 },
        isLoading: false,
        error: null,
      });

      render(<ProcessingQueue />);

      expect(screen.getByText('Active Jobs')).toBeInTheDocument();
      expect(screen.queryByText('Completed Jobs')).not.toBeInTheDocument();
    });

    it('should classify CONVERTING jobs as active', () => {
      const convertingJob = { ...mockActiveJob, status: 'CONVERTING' as const };
      (useQuery as jest.Mock).mockReturnValue({
        data: { jobs: [convertingJob], total: 1, page: 1, page_size: 20 },
        isLoading: false,
        error: null,
      });

      render(<ProcessingQueue />);

      expect(screen.getByText('Active Jobs')).toBeInTheDocument();
      expect(screen.queryByText('Completed Jobs')).not.toBeInTheDocument();
    });

    it('should classify ANALYZING jobs as active', () => {
      const analyzingJob = { ...mockActiveJob, status: 'ANALYZING' as const };
      (useQuery as jest.Mock).mockReturnValue({
        data: { jobs: [analyzingJob], total: 1, page: 1, page_size: 20 },
        isLoading: false,
        error: null,
      });

      render(<ProcessingQueue />);

      expect(screen.getByText('Active Jobs')).toBeInTheDocument();
    });

    it('should classify SEPARATING jobs as active', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: { jobs: [mockActiveJob], total: 1, page: 1, page_size: 20 },
        isLoading: false,
        error: null,
      });

      render(<ProcessingQueue />);

      expect(screen.getByText('Active Jobs')).toBeInTheDocument();
    });

    it('should classify FINALIZING jobs as active', () => {
      const finalizingJob = { ...mockActiveJob, status: 'FINALIZING' as const };
      (useQuery as jest.Mock).mockReturnValue({
        data: { jobs: [finalizingJob], total: 1, page: 1, page_size: 20 },
        isLoading: false,
        error: null,
      });

      render(<ProcessingQueue />);

      expect(screen.getByText('Active Jobs')).toBeInTheDocument();
    });

    it('should classify PACKAGING jobs as active', () => {
      const packagingJob = { ...mockActiveJob, status: 'PACKAGING' as const };
      (useQuery as jest.Mock).mockReturnValue({
        data: { jobs: [packagingJob], total: 1, page: 1, page_size: 20 },
        isLoading: false,
        error: null,
      });

      render(<ProcessingQueue />);

      expect(screen.getByText('Active Jobs')).toBeInTheDocument();
    });

    it('should classify COMPLETED jobs as completed', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: { jobs: [mockCompletedJob], total: 1, page: 1, page_size: 20 },
        isLoading: false,
        error: null,
      });

      render(<ProcessingQueue />);

      expect(screen.queryByText('Active Jobs')).not.toBeInTheDocument();
      expect(screen.getByText('Completed Jobs')).toBeInTheDocument();
    });

    it('should classify FAILED jobs as completed', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: { jobs: [mockFailedJob], total: 1, page: 1, page_size: 20 },
        isLoading: false,
        error: null,
      });

      render(<ProcessingQueue />);

      expect(screen.queryByText('Active Jobs')).not.toBeInTheDocument();
      expect(screen.getByText('Completed Jobs')).toBeInTheDocument();
    });

    it('should classify CANCELLED jobs as completed', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: { jobs: [mockCancelledJob], total: 1, page: 1, page_size: 20 },
        isLoading: false,
        error: null,
      });

      render(<ProcessingQueue />);

      expect(screen.queryByText('Active Jobs')).not.toBeInTheDocument();
      expect(screen.getByText('Completed Jobs')).toBeInTheDocument();
    });
  });

  describe('React Query Integration', () => {
    it('should call useQuery with correct queryKey', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: mockJobListResponse,
        isLoading: false,
        error: null,
      });

      render(<ProcessingQueue />);

      expect(useQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['jobs'],
        })
      );
    });

    it('should configure polling with 5 second interval', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: mockJobListResponse,
        isLoading: false,
        error: null,
      });

      render(<ProcessingQueue />);

      expect(useQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          refetchInterval: 5000,
        })
      );
    });

    it('should call apiClient.getJobs with correct parameters in queryFn', async () => {
      const mockApiClient = require('@/utils/api').apiClient;
      mockApiClient.getJobs.mockResolvedValue(mockJobListResponse);

      (useQuery as jest.Mock).mockImplementation(({ queryFn }) => {
        queryFn();
        return {
          data: mockJobListResponse,
          isLoading: false,
          error: null,
        };
      });

      render(<ProcessingQueue />);

      expect(mockApiClient.getJobs).toHaveBeenCalledWith(1, 20);
    });

    it('should render data from React Query', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: mockJobListResponse,
        isLoading: false,
        error: null,
      });

      render(<ProcessingQueue />);

      expect(screen.getByTestId('job-card-job-1')).toBeInTheDocument();
      expect(screen.getByTestId('job-card-job-2')).toBeInTheDocument();
    });
  });

  describe('Multiple Jobs', () => {
    it('should render multiple active jobs', () => {
      const jobs = [mockActiveJob, mockPendingJob, { ...mockActiveJob, id: 'job-6', project_name: 'Another Active' }];
      (useQuery as jest.Mock).mockReturnValue({
        data: { jobs, total: 3, page: 1, page_size: 20 },
        isLoading: false,
        error: null,
      });

      render(<ProcessingQueue />);

      expect(screen.getByTestId('job-card-job-1')).toBeInTheDocument();
      expect(screen.getByTestId('job-card-job-5')).toBeInTheDocument();
      expect(screen.getByTestId('job-card-job-6')).toBeInTheDocument();
    });

    it('should render multiple completed jobs', () => {
      const jobs = [mockCompletedJob, mockFailedJob, mockCancelledJob];
      (useQuery as jest.Mock).mockReturnValue({
        data: { jobs, total: 3, page: 1, page_size: 20 },
        isLoading: false,
        error: null,
      });

      render(<ProcessingQueue />);

      expect(screen.getByTestId('job-card-job-2')).toBeInTheDocument();
      expect(screen.getByTestId('job-card-job-3')).toBeInTheDocument();
      expect(screen.getByTestId('job-card-job-4')).toBeInTheDocument();
    });

    it('should render jobs in both sections correctly', () => {
      const jobs = [mockActiveJob, mockPendingJob, mockCompletedJob, mockFailedJob];
      (useQuery as jest.Mock).mockReturnValue({
        data: { jobs, total: 4, page: 1, page_size: 20 },
        isLoading: false,
        error: null,
      });

      render(<ProcessingQueue />);

      expect(screen.getByText('Active Jobs')).toBeInTheDocument();
      expect(screen.getByText('Completed Jobs')).toBeInTheDocument();

      // Active jobs
      expect(screen.getByTestId('job-card-job-1')).toBeInTheDocument();
      expect(screen.getByTestId('job-card-job-5')).toBeInTheDocument();

      // Completed jobs
      expect(screen.getByTestId('job-card-job-2')).toBeInTheDocument();
      expect(screen.getByTestId('job-card-job-3')).toBeInTheDocument();
    });

    it('should maintain correct job order', () => {
      const jobs = [mockActiveJob, mockCompletedJob, mockPendingJob];
      (useQuery as jest.Mock).mockReturnValue({
        data: { jobs, total: 3, page: 1, page_size: 20 },
        isLoading: false,
        error: null,
      });

      render(<ProcessingQueue />);

      const activeSection = screen.getByText('Active Jobs').parentElement;
      const activeJobs = activeSection?.querySelectorAll('[data-testid^="job-card-"]');

      expect(activeJobs?.[0]).toHaveAttribute('data-testid', 'job-card-job-1');
      expect(activeJobs?.[1]).toHaveAttribute('data-testid', 'job-card-job-5');
    });
  });

  describe('Layout and Styling', () => {
    it('should render main container with correct spacing', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: mockJobListResponse,
        isLoading: false,
        error: null,
      });

      const { container } = render(<ProcessingQueue />);

      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass('space-y-6');
    });

    it('should render section containers with correct spacing', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: mockJobListResponse,
        isLoading: false,
        error: null,
      });

      render(<ProcessingQueue />);

      const activeSection = screen.getByText('Active Jobs').parentElement;
      const completedSection = screen.getByText('Completed Jobs').parentElement;

      expect(activeSection).toHaveClass('space-y-4');
      expect(completedSection).toHaveClass('space-y-4');
    });
  });

  describe('Edge Cases', () => {
    it('should handle data being undefined', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      });

      render(<ProcessingQueue />);

      expect(screen.getByText('No jobs yet. Upload a file or paste a YouTube URL to get started.')).toBeInTheDocument();
    });

    it('should handle null jobs array', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: { jobs: null, total: 0, page: 1, page_size: 20 },
        isLoading: false,
        error: null,
      });

      render(<ProcessingQueue />);

      expect(screen.getByText('No jobs yet. Upload a file or paste a YouTube URL to get started.')).toBeInTheDocument();
    });

    it('should handle jobs with missing optional fields', () => {
      const minimalJob: Job = {
        id: 'job-minimal',
        status: 'PENDING',
        input_type: 'upload',
        project_name: 'Minimal Job',
        quality_mode: 'fast',
        progress_percent: 0,
        created_at: '2024-01-01T00:00:00Z',
      };

      (useQuery as jest.Mock).mockReturnValue({
        data: { jobs: [minimalJob], total: 1, page: 1, page_size: 20 },
        isLoading: false,
        error: null,
      });

      render(<ProcessingQueue />);

      expect(screen.getByTestId('job-card-job-minimal')).toBeInTheDocument();
    });

    it('should handle transition from loading to data', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      const { rerender, container } = render(<ProcessingQueue />);

      expect(container.querySelector('.animate-spin')).toBeInTheDocument();

      (useQuery as jest.Mock).mockReturnValue({
        data: mockJobListResponse,
        isLoading: false,
        error: null,
      });

      rerender(<ProcessingQueue />);
      expect(container.querySelector('.animate-spin')).not.toBeInTheDocument();
      expect(screen.getByTestId('job-card-job-1')).toBeInTheDocument();
    });

    it('should handle transition from data to error', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: mockJobListResponse,
        isLoading: false,
        error: null,
      });

      const { rerender } = render(<ProcessingQueue />);
      expect(screen.getByTestId('job-card-job-1')).toBeInTheDocument();

      (useQuery as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Network error'),
      });

      rerender(<ProcessingQueue />);
      expect(screen.queryByTestId('job-card-job-1')).not.toBeInTheDocument();
      expect(screen.getByText('Failed to load jobs. Please try again later.')).toBeInTheDocument();
    });

    it('should handle transition from error to data', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Network error'),
      });

      const { rerender } = render(<ProcessingQueue />);
      expect(screen.getByText('Failed to load jobs. Please try again later.')).toBeInTheDocument();

      (useQuery as jest.Mock).mockReturnValue({
        data: mockJobListResponse,
        isLoading: false,
        error: null,
      });

      rerender(<ProcessingQueue />);
      expect(screen.queryByText('Failed to load jobs. Please try again later.')).not.toBeInTheDocument();
      expect(screen.getByTestId('job-card-job-1')).toBeInTheDocument();
    });

    it('should handle empty to non-empty transition', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: { jobs: [], total: 0, page: 1, page_size: 20 },
        isLoading: false,
        error: null,
      });

      const { rerender } = render(<ProcessingQueue />);
      expect(screen.getByText('No jobs yet. Upload a file or paste a YouTube URL to get started.')).toBeInTheDocument();

      (useQuery as jest.Mock).mockReturnValue({
        data: mockJobListResponse,
        isLoading: false,
        error: null,
      });

      rerender(<ProcessingQueue />);
      expect(screen.queryByText('No jobs yet. Upload a file or paste a YouTube URL to get started.')).not.toBeInTheDocument();
      expect(screen.getByTestId('job-card-job-1')).toBeInTheDocument();
    });
  });

  describe('JobCard Integration', () => {
    it('should pass correct job prop to JobCard', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: mockJobListResponse,
        isLoading: false,
        error: null,
      });

      render(<ProcessingQueue />);

      const jobCard = screen.getByTestId('job-card-job-1');
      expect(jobCard).toHaveAttribute('data-status', 'SEPARATING');
      expect(jobCard).toHaveTextContent('Active Job - SEPARATING');
    });

    it('should render JobCard for each job', () => {
      const jobs = [mockActiveJob, mockCompletedJob, mockFailedJob];
      (useQuery as jest.Mock).mockReturnValue({
        data: { jobs, total: 3, page: 1, page_size: 20 },
        isLoading: false,
        error: null,
      });

      render(<ProcessingQueue />);

      expect(screen.getByTestId('job-card-job-1')).toBeInTheDocument();
      expect(screen.getByTestId('job-card-job-2')).toBeInTheDocument();
      expect(screen.getByTestId('job-card-job-3')).toBeInTheDocument();
    });

    it('should use job.id as key for JobCard', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: mockJobListResponse,
        isLoading: false,
        error: null,
      });

      const { container } = render(<ProcessingQueue />);

      const activeGrid = screen.getByText('Active Jobs').nextElementSibling;
      const firstJobCard = activeGrid?.firstElementChild;

      expect(firstJobCard).toHaveAttribute('data-testid', 'job-card-job-1');
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily with same data', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: mockJobListResponse,
        isLoading: false,
        error: null,
      });

      const { rerender } = render(<ProcessingQueue />);

      const initialRender = screen.getByTestId('job-card-job-1');

      rerender(<ProcessingQueue />);

      const secondRender = screen.getByTestId('job-card-job-1');

      // Component should render same elements
      expect(initialRender).toBe(secondRender);
    });

    it('should handle large job lists efficiently', () => {
      const largeJobList = Array.from({ length: 100 }, (_, i) => ({
        ...mockActiveJob,
        id: `job-${i}`,
        project_name: `Job ${i}`,
      }));

      (useQuery as jest.Mock).mockReturnValue({
        data: { jobs: largeJobList, total: 100, page: 1, page_size: 100 },
        isLoading: false,
        error: null,
      });

      render(<ProcessingQueue />);

      expect(screen.getByText('Active Jobs')).toBeInTheDocument();
      expect(screen.getByTestId('job-card-job-0')).toBeInTheDocument();
      expect(screen.getByTestId('job-card-job-99')).toBeInTheDocument();
    });
  });
});
