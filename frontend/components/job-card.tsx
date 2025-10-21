"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Download, ExternalLink, Clock, Music, X, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { type Job } from "@/lib/api";
import { JobProgressSocket, type JobProgressUpdate } from "@/lib/websocket";
import { getStatusBadgeVariant } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

// Helper function to get user-friendly status messages
function getStatusMessage(status: string, progress: number): string {
  switch (status) {
    case "PENDING":
      return "Queued for processing...";
    case "CONVERTING":
      return "Converting audio to WAV format...";
    case "ANALYZING":
      return "Analyzing tempo and detecting BPM...";
    case "SEPARATING":
      if (progress < 40) return "Loading AI model...";
      if (progress < 70) return "Separating stems with AI (this takes 2-5 minutes)...";
      return "Finalizing stem separation...";
    case "FINALIZING":
      return "Embedding metadata into stems...";
    case "PACKAGING":
      return "Creating download package...";
    default:
      return "Processing...";
  }
}

// Helper function to get detailed status information
function getStatusDetails(status: string): string {
  switch (status) {
    case "PENDING":
      return "Your job is in the queue and will start soon";
    case "CONVERTING":
      return "Converting to 24-bit/48kHz professional format";
    case "ANALYZING":
      return "Using librosa to detect tempo and beats";
    case "SEPARATING":
      return "Using Demucs AI to separate vocals, drums, bass, and other instruments";
    case "FINALIZING":
      return "Adding tempo information to each stem file";
    case "PACKAGING":
      return "Bundling stems and creating DAWproject file";
    default:
      return "";
  }
}

interface JobCardProps {
  job: Job;
}

export function JobCard({ job: initialJob }: JobCardProps) {
  const [job, setJob] = useState(initialJob);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
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
    // Download from backend API
    // Use smart URL detection - same logic as api.ts
    const apiUrl = typeof window !== 'undefined' && window.location.protocol === 'https:'
      ? window.location.origin  // For https://rehearsekit.uk -> /api/jobs/{id}/download
      : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000");
    
    const downloadUrl = `${apiUrl}/api/jobs/${job.id}/download`;
    
    try {
      // Fetch + Blob method - most compatible with strict browsers like Brave
      const response = await fetch(downloadUrl);
      
      if (!response.ok) {
        console.error('Download failed:', response.status);
        return;
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${job.project_name}_RehearseKit.zip`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      // Fallback to direct navigation
      window.location.href = downloadUrl;
    }
  };

  const handleCancel = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/api/jobs/${job.id}/cancel`, {
        method: "POST",
      });

      if (response.ok) {
        setJob((prev) => ({ ...prev, status: "CANCELLED" }));
        queryClient.invalidateQueries({ queryKey: ["jobs"] });
        setShowCancelDialog(false);
      } else {
        console.error("Failed to cancel job");
      }
    } catch (error) {
      console.error("Error canceling job:", error);
    }
  };

  const handleDelete = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/api/jobs/${job.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ["jobs"] });
        setShowDeleteDialog(false);
      } else {
        console.error("Failed to delete job");
      }
    } catch (error) {
      console.error("Error deleting job:", error);
    }
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
        {/* Progress Bar with Status Message */}
        {!["COMPLETED", "FAILED", "CANCELLED"].includes(job.status) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-kit-purple">
                {getStatusMessage(job.status, job.progress_percent)}
              </span>
              <span className="text-xs text-muted-foreground">
                {job.progress_percent}%
              </span>
            </div>
            <Progress value={job.progress_percent} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {getStatusDetails(job.status)}
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
          
          {/* Cancel button for in-progress jobs */}
          {!["COMPLETED", "FAILED", "CANCELLED"].includes(job.status) && (
            <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel Job</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to cancel &ldquo;{job.project_name}&rdquo;? 
                    This will stop the processing and cannot be undone.
                    Progress will be lost and you&apos;ll need to start over.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep Processing</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Cancel Job
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          
          {/* Download button for completed jobs */}
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
          
          {/* Delete button for finished or cancelled jobs */}
          {["COMPLETED", "FAILED", "CANCELLED"].includes(job.status) && (
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Job</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete &ldquo;{job.project_name}&rdquo;? 
                    This will permanently remove the job and all associated files.
                    Downloaded files on your computer will not be affected.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep Job</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete Permanently
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

