import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export function estimateProcessingTime(durationSeconds: number, quality: "fast" | "high"): number {
  // Fast mode: ~2x real-time, High mode: ~5x real-time
  const multiplier = quality === "fast" ? 2 : 5;
  return durationSeconds * multiplier;
}

export function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    PENDING: "text-muted-foreground",
    CONVERTING: "text-kit-warning",
    ANALYZING: "text-kit-warning",
    SEPARATING: "text-kit-purple",
    FINALIZING: "text-kit-warning",
    PACKAGING: "text-kit-warning",
    COMPLETED: "text-kit-success",
    FAILED: "text-kit-error",
    CANCELLED: "text-muted-foreground",
  };
  return statusColors[status] || "text-muted-foreground";
}

export function getStatusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    PENDING: "outline",
    CONVERTING: "secondary",
    ANALYZING: "secondary",
    SEPARATING: "default",
    FINALIZING: "secondary",
    PACKAGING: "secondary",
    COMPLETED: "default",
    FAILED: "destructive",
    CANCELLED: "outline",
  };
  return statusVariants[status] || "outline";
}

