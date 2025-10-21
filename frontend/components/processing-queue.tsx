"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/utils/api";
import { JobCard } from "./job-card";
import { Loader2 } from "lucide-react";

export function ProcessingQueue() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => apiClient.getJobs(1, 20),
    refetchInterval: 5000, // Poll every 5 seconds
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-kit-blue" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-12 text-muted-foreground">
        <p>Failed to load jobs. Please try again later.</p>
      </div>
    );
  }

  const jobs = data?.jobs || [];
  const activeJobs = jobs.filter(
    (job) => !["COMPLETED", "FAILED", "CANCELLED"].includes(job.status)
  );
  const completedJobs = jobs.filter((job) =>
    ["COMPLETED", "FAILED", "CANCELLED"].includes(job.status)
  );

  if (jobs.length === 0) {
    return (
      <div className="text-center p-12 text-muted-foreground">
        <p>No jobs yet. Upload a file or paste a YouTube URL to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {activeJobs.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Active Jobs</h2>
          <div className="grid gap-4">
            {activeJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </div>
      )}

      {completedJobs.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Completed Jobs</h2>
          <div className="grid gap-4">
            {completedJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

