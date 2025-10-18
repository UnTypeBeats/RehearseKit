"use client";

import { useEffect, useState } from "use";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { apiClient, type Job } from "@/lib/api";
import { JobProgressSocket, type JobProgressUpdate } from "@/lib/websocket";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Download, Clock, Music2, Gauge } from "lucide-react";
import { getStatusBadgeVariant } from "@/lib/utils";

export default function JobDetailPage() {
  const params = useParams();
  const jobId = params.id as string;
  const queryClient = useQueryClient();
  
  const { data: initialJob, isLoading, error } = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => apiClient.getJob(jobId),
  });

  const [job, setJob] = useState<Job | undefined>(initialJob);

  useEffect(() => {
    if (initialJob) {
      setJob(initialJob);
    }
  }, [initialJob]);

  useEffect(() => {
    if (!job || ["COMPLETED", "FAILED", "CANCELLED"].includes(job.status)) {
      return;
    }

    const socket = new JobProgressSocket(
      jobId,
      (update: JobProgressUpdate) => {
        setJob((prev) => prev ? {
          ...prev,
          status: update.status as Job["status"],
          progress_percent: update.progress_percent,
        } : undefined);

        if (update.status === "COMPLETED" || update.status === "FAILED") {
          queryClient.invalidateQueries({ queryKey: ["job", jobId] });
        }
      }
    );

    socket.connect();

    return () => {
      socket.disconnect();
    };
  }, [jobId, job?.status, queryClient]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <p className="text-muted-foreground">Job not found</p>
          <Button asChild variant="outline">
            <Link href="/jobs">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Jobs
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="icon">
            <Link href="/jobs">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{job.project_name}</h1>
            <p className="text-muted-foreground">Job ID: {job.id}</p>
          </div>
          <Badge variant={getStatusBadgeVariant(job.status)} className="text-sm">
            {job.status}
          </Badge>
        </div>

        {/* Progress Card */}
        {!["COMPLETED", "FAILED", "CANCELLED"].includes(job.status) && (
          <Card>
            <CardHeader>
              <CardTitle>Processing Progress</CardTitle>
              <CardDescription>Your audio is being processed</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={job.progress_percent} className="h-3" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Status: {job.status.toLowerCase().replace("_", " ")}
                </span>
                <span className="font-medium">{job.progress_percent}%</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Job Details */}
        <Card>
          <CardHeader>
            <CardTitle>Job Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Music2 className="h-4 w-4" />
                  <span className="text-sm">Source Type</span>
                </div>
                <p className="font-medium">
                  {job.input_type === "upload" ? "File Upload" : "YouTube"}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Gauge className="h-4 w-4" />
                  <span className="text-sm">Quality Mode</span>
                </div>
                <p className="font-medium capitalize">{job.quality_mode}</p>
              </div>

              {job.detected_bpm && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Music2 className="h-4 w-4" />
                    <span className="text-sm">Detected BPM</span>
                  </div>
                  <p className="font-medium">{job.detected_bpm.toFixed(1)}</p>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Created</span>
                </div>
                <p className="font-medium">
                  {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                </p>
              </div>

              {job.completed_at && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">Completed</span>
                  </div>
                  <p className="font-medium">
                    {formatDistanceToNow(new Date(job.completed_at), { addSuffix: true })}
                  </p>
                </div>
              )}
            </div>

            {job.input_url && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">YouTube URL</p>
                <a
                  href={job.input_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-kit-blue hover:underline break-all"
                >
                  {job.input_url}
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Error Message */}
        {job.status === "FAILED" && job.error_message && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{job.error_message}</p>
            </CardContent>
          </Card>
        )}

        {/* Download Section */}
        {job.status === "COMPLETED" && (
          <Card>
            <CardHeader>
              <CardTitle>Download Results</CardTitle>
              <CardDescription>
                Your processed audio files are ready
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" size="lg">
                <Download className="mr-2 h-5 w-5" />
                Download Complete Package
              </Button>
              <p className="text-xs text-muted-foreground mt-4 text-center">
                Includes all stems + Cubase project file (.cpr)
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

