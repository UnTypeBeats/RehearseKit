"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Download, ExternalLink, Clock, Music } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { type Job } from "@/lib/api";
import { JobProgressSocket, type JobProgressUpdate } from "@/lib/websocket";
import { getStatusBadgeVariant } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

interface JobCardProps {
  job: Job;
}

export function JobCard({ job: initialJob }: JobCardProps) {
  const [job, setJob] = useState(initialJob);
  const queryClient = useQueryClient();

  useEffect(() => {
    setJob(initialJob);
  }, [initialJob]);

  useEffect(() => {
    // Only connect WebSocket for active jobs
    if (["COMPLETED", "FAILED", "CANCELLED"].includes(job.status)) {
      return;
    }

    const socket = new JobProgressSocket(
      job.id,
      (update: JobProgressUpdate) => {
        setJob((prev) => ({
          ...prev,
          status: update.status as Job["status"],
          progress_percent: update.progress_percent,
        }));

        // Invalidate query when job completes
        if (update.status === "COMPLETED" || update.status === "FAILED") {
          queryClient.invalidateQueries({ queryKey: ["jobs"] });
        }
      },
      (error) => {
        console.error("WebSocket error:", error);
      }
    );

    socket.connect();

    return () => {
      socket.disconnect();
    };
  }, [job.id, job.status, queryClient]);

  const handleDownload = async () => {
    // This will be implemented with the download endpoint
    window.open(`/api/jobs/${job.id}/download`, "_blank");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Music className="h-5 w-5 text-kit-blue" />
              {job.project_name}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
            </div>
          </div>
          <Badge variant={getStatusBadgeVariant(job.status)}>
            {job.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        {!["COMPLETED", "FAILED", "CANCELLED"].includes(job.status) && (
          <div className="space-y-2">
            <Progress value={job.progress_percent} className="h-2" />
            <p className="text-xs text-muted-foreground text-right">
              {job.progress_percent}%
            </p>
          </div>
        )}

        {/* Job Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Source</p>
            <p className="font-medium">{job.input_type === "upload" ? "File Upload" : "YouTube"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Quality</p>
            <p className="font-medium capitalize">{job.quality_mode}</p>
          </div>
          {job.detected_bpm && (
            <div>
              <p className="text-muted-foreground">Detected BPM</p>
              <p className="font-medium">{job.detected_bpm.toFixed(1)}</p>
            </div>
          )}
        </div>

        {/* Error Message */}
        {job.status === "FAILED" && job.error_message && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {job.error_message}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            asChild
          >
            <Link href={`/jobs/${job.id}`}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Details
            </Link>
          </Button>
          {job.status === "COMPLETED" && (
            <Button
              size="sm"
              className="flex-1"
              onClick={handleDownload}
            >
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

