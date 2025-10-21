"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { apiClient, type Job } from "@/lib/api";
import { JobProgressSocket, type JobProgressUpdate } from "@/lib/websocket";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Download, Clock, Music2, Gauge, X, Trash2 } from "lucide-react";
import { getStatusBadgeVariant } from "@/lib/utils";
import { AudioWaveform } from "@/components/audio-waveform";
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

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;
  const queryClient = useQueryClient();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Smart API URL - adapts to current hostname
  const getApiUrl = () => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      
      // On HTTPS (rehearsekit.uk)
      if (window.location.protocol === 'https:') {
        return window.location.origin;
      }
      
      // On TrueNAS IP
      if (hostname === '10.0.0.155') {
        return 'http://10.0.0.155:30071';
      }
    }
    
    // Fallback for localhost/dev
    return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  };
  
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

  const handleCancel = async () => {
    try {
      const response = await fetch(`${getApiUrl()}/api/jobs/${jobId}/cancel`, {
        method: "POST",
      });

      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ["job", jobId] });
        setShowCancelDialog(false);
      }
    } catch (error) {
      console.error("Failed to cancel job:", error);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`${getApiUrl()}/api/jobs/${jobId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setShowDeleteDialog(false);
        router.push("/jobs");
      }
    } catch (error) {
      console.error("Failed to delete job:", error);
    }
  };

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
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            {/* Cancel button for in-progress jobs */}
            {!["COMPLETED", "FAILED", "CANCELLED"].includes(job.status) && (
              <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
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
            
            {/* Delete button for finished jobs */}
            {["COMPLETED", "FAILED", "CANCELLED"].includes(job.status) && (
              <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">
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

        {/* Source Audio Preview */}
        {job.source_file_path && (
          <Card>
            <CardHeader>
              <CardTitle>Source Audio</CardTitle>
              <CardDescription>
                {job.input_type === "upload" ? "Original uploaded file" : "Downloaded from YouTube"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* YouTube metadata */}
              {job.input_type === "youtube" && job.input_url && (
                <div className="flex items-start gap-3 pb-3 border-b">
                  <a 
                    href={job.input_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <img 
                      src={`https://img.youtube.com/vi/${job.input_url.split('v=')[1]?.split('&')[0]}/hqdefault.jpg`}
                      alt="YouTube thumbnail"
                      className="w-40 h-24 object-cover rounded hover:opacity-80 transition"
                    />
                  </a>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm mb-1">{job.project_name}</h4>
                    <a
                      href={job.input_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-kit-blue hover:underline break-all"
                    >
                      {job.input_url}
                    </a>
                  </div>
                </div>
              )}
              
              {/* Waveform */}
              <div>
                <AudioWaveform 
                  audioUrl={`${getApiUrl()}/api/jobs/${job.id}/source`}
                  showControls={true}
                />
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Press spacebar to play/pause
                </p>
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
                <>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm">Completed</span>
                    </div>
                    <p className="font-medium">
                      {formatDistanceToNow(new Date(job.completed_at), { addSuffix: true })}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm">Processing Time</span>
                    </div>
                    <p className="font-medium">
                      {(() => {
                        const start = new Date(job.created_at).getTime();
                        const end = new Date(job.completed_at).getTime();
                        const seconds = Math.floor((end - start) / 1000);
                        const minutes = Math.floor(seconds / 60);
                        const secs = seconds % 60;
                        return `${minutes}m ${secs}s`;
                      })()}
                    </p>
                  </div>
                </>
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
              <Button 
                className="w-full" 
                size="lg"
                onClick={() => {
                  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
                  window.open(`${apiUrl}/api/jobs/${job.id}/download`, "_blank");
                }}
              >
                <Download className="mr-2 h-5 w-5" />
                Download Complete Package
              </Button>
              <p className="text-xs text-muted-foreground mt-4 text-center">
                Includes all stems + DAWproject file
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

