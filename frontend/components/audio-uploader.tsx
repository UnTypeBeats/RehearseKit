"use client";

import { useState, useRef } from "react";
import { Upload, Youtube, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { apiClient } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AudioWaveform } from "@/components/audio-waveform";

export function AudioUploader() {
  const [inputType, setInputType] = useState<"upload" | "youtube">("upload");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [projectName, setProjectName] = useState("");
  const [qualityMode, setQualityMode] = useState<"fast" | "high">("fast");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  
  // YouTube preview state
  const [youtubePreviewId, setYoutubePreviewId] = useState<string | null>(null);
  const [youtubeTitle, setYoutubeTitle] = useState<string>("");
  const [youtubeThumbnail, setYoutubeThumbnail] = useState<string | null>(null);
  const [isLoadingYouTube, setIsLoadingYouTube] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast} = useToast();
  const queryClient = useQueryClient();

  // Fetch YouTube preview
  const fetchYouTube = async () => {
    if (!youtubeUrl) {
      toast({
        title: "Missing URL",
        description: "Please enter a YouTube URL",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingYouTube(true);
    
    try {
      const preview = await apiClient.createYouTubePreview(youtubeUrl);
      
      setYoutubePreviewId(preview.preview_id);
      setYoutubeTitle(preview.title);
      setYoutubeThumbnail(preview.thumbnail || null);
      
      // Use smart URL - same as API calls
      const baseUrl = typeof window !== 'undefined' && window.location.protocol === 'https:'
        ? window.location.origin
        : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000");
      
      setAudioPreviewUrl(`${baseUrl}${preview.preview_url}`);
      
      // Auto-fill project name if empty
      if (!projectName) {
        setProjectName(preview.title);
      }
      
      toast({
        title: "YouTube audio loaded",
        description: `Ready to process: ${preview.title}`,
      });
    } catch (error) {
      toast({
        title: "Failed to load YouTube audio",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoadingYouTube(false);
    }
  };

  const createJobMutation = useMutation({
    mutationFn: async () => {
      if (inputType === "upload" && !file) {
        throw new Error("Please select a file");
      }
      if (inputType === "youtube" && !youtubePreviewId) {
        throw new Error("Please fetch YouTube audio first");
      }
      if (!projectName) {
        throw new Error("Please enter a project name");
      }

      return apiClient.createJob(
        {
          project_name: projectName,
          quality_mode: qualityMode,
          input_type: inputType,
          input_url: inputType === "youtube" ? youtubeUrl : undefined,
          youtube_preview_id: inputType === "youtube" ? youtubePreviewId! : undefined,
        },
        inputType === "upload" ? file! : undefined
      );
    },
    onSuccess: () => {
      toast({
        title: "Job created successfully",
        description: "Your audio is being processed. You can monitor progress below.",
      });
      // Reset form
      setFile(null);
      setYoutubeUrl("");
      setProjectName("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      // Invalidate jobs query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Job creation error:", error);
      toast({
        title: "Error creating job",
        description: errorMessage || "An unexpected error occurred",
        variant: "destructive",
      });
    },
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    const fileName = droppedFile?.name.toLowerCase() || "";
    const isValidFormat = fileName.endsWith(".flac") || fileName.endsWith(".mp3") || fileName.endsWith(".wav");
    
    if (droppedFile && isValidFormat) {
      setFile(droppedFile);
      setInputType("upload");
      if (!projectName) {
        // Remove extension from filename to suggest project name
        const nameWithoutExt = droppedFile.name.replace(/\.(flac|mp3|wav)$/i, "");
        setProjectName(nameWithoutExt);
      }
      
      // Create preview URL for waveform
      const previewUrl = URL.createObjectURL(droppedFile);
      setAudioPreviewUrl(previewUrl);
    } else {
      toast({
        title: "Invalid file",
        description: "Please upload MP3, WAV, or FLAC files only",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setInputType("upload");
      if (!projectName) {
        setProjectName(selectedFile.name.replace(/\.(flac|mp3|wav)$/i, ""));
      }
      
      // Create preview URL for waveform
      const previewUrl = URL.createObjectURL(selectedFile);
      setAudioPreviewUrl(previewUrl);
    }
  };

  return (
    <div className="space-y-6">
      {/* Input Type Selector */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant={inputType === "upload" ? "default" : "outline"}
          onClick={() => setInputType("upload")}
          className="flex-1"
        >
          <Upload className="mr-2 h-4 w-4" />
          Upload Audio
        </Button>
        <Button
          type="button"
          variant={inputType === "youtube" ? "default" : "outline"}
          onClick={() => setInputType("youtube")}
          className="flex-1"
        >
          <Youtube className="mr-2 h-4 w-4" />
          YouTube URL
        </Button>
      </div>

      {/* File Upload Area */}
      {inputType === "upload" && (
        <Card
          className={`border-2 border-dashed transition-colors ${
            isDragging ? "border-kit-blue bg-kit-blue/5" : "border-muted"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <CardContent className="flex flex-col items-center justify-center p-12">
            <Upload className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-2">
              Drag and drop your audio file here (MP3, WAV, FLAC), or click to browse
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".flac,.mp3,.wav,audio/mpeg,audio/wav,audio/flac"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              Browse Files
            </Button>
            {file && (
              <p className="mt-4 text-sm font-medium text-kit-blue">
                Selected: {file.name}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* YouTube URL Input */}
      {inputType === "youtube" && !youtubePreviewId && (
        <div className="space-y-3">
          <label htmlFor="youtube-url" className="text-sm font-medium">
            YouTube URL
          </label>
          <div className="flex gap-2">
            <Input
              id="youtube-url"
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              disabled={isLoadingYouTube}
              className="flex-1"
            />
            <Button
              type="button"
              onClick={fetchYouTube}
              disabled={!youtubeUrl || isLoadingYouTube}
            >
              {isLoadingYouTube ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Fetching...
                </>
              ) : (
                "Fetch Audio"
              )}
            </Button>
          </div>
          {isLoadingYouTube && (
            <p className="text-xs text-muted-foreground">
              Downloading YouTube audio... This may take 10-30 seconds.
            </p>
          )}
        </div>
      )}

      {/* YouTube Preview Card */}
      {inputType === "youtube" && youtubePreviewId && (
        <Card className="border-kit-blue">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              {youtubeThumbnail && (
                <img 
                  src={youtubeThumbnail} 
                  alt={youtubeTitle}
                  className="w-32 h-20 object-cover rounded"
                />
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-sm">{youtubeTitle}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  YouTube video loaded and ready to process
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audio Preview Waveform */}
      {audioPreviewUrl && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Audio Preview</label>
          <AudioWaveform audioUrl={audioPreviewUrl} showControls={true} />
        </div>
      )}

      {/* Project Name */}
      <div className="space-y-2">
        <label htmlFor="project-name" className="text-sm font-medium">
          Project Name
        </label>
        <Input
          id="project-name"
          placeholder="My Awesome Song"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
        />
      </div>

      {/* Quality Mode */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Processing Quality</label>
        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant={qualityMode === "fast" ? "default" : "outline"}
            onClick={() => setQualityMode("fast")}
            className="flex-col h-auto py-3"
          >
            <span className="font-semibold">Fast</span>
            <span className="text-xs opacity-80">~5 min for 3-min song</span>
          </Button>
          <Button
            type="button"
            variant={qualityMode === "high" ? "default" : "outline"}
            onClick={() => setQualityMode("high")}
            className="flex-col h-auto py-3"
          >
            <span className="font-semibold">High Quality</span>
            <span className="text-xs opacity-80">~15 min for 3-min song</span>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {qualityMode === "fast" 
            ? "Good quality, faster processing. Best for quick rehearsal prep." 
            : "Best quality separation. Better for production or detailed study."}
        </p>
      </div>

      {/* Submit Button */}
      <Button
        className="w-full"
        size="lg"
        onClick={() => createJobMutation.mutate()}
        disabled={
          createJobMutation.isPending ||
          (inputType === "upload" && !file) ||
          (inputType === "youtube" && !youtubePreviewId)
        }
      >
        {createJobMutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating Job...
          </>
        ) : (
          "Start Processing"
        )}
      </Button>
      
      {inputType === "youtube" && !youtubePreviewId && (
        <p className="text-xs text-center text-muted-foreground">
          Click &ldquo;Fetch Audio&rdquo; first to preview YouTube video
        </p>
      )}
    </div>
  );
}

