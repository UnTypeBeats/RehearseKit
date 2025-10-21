"use client";

import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { Play, Pause, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";

interface StemMixerProps {
  jobId: string;
  apiUrl: string;
}

type StemType = "vocals" | "drums" | "bass" | "other";

interface Stem {
  type: StemType;
  label: string;
  color: string;
  wavesurfer: WaveSurfer | null;
  volume: number;
  muted: boolean;
  isLoaded: boolean;
  error: boolean;
}

const STEM_CONFIGS: Record<StemType, { label: string; color: string }> = {
  vocals: { label: "Vocals", color: "#FF6B9D" },
  drums: { label: "Drums", color: "#FFA500" },
  bass: { label: "Bass", color: "#4169E1" },
  other: { label: "Other", color: "#808080" },
};

export function StemMixer({ jobId, apiUrl }: StemMixerProps) {
  const containerRefs = useRef<Record<StemType, HTMLDivElement | null>>({
    vocals: null,
    drums: null,
    bass: null,
    other: null,
  });

  const [stems, setStems] = useState<Record<StemType, Stem>>({
    vocals: { type: "vocals", ...STEM_CONFIGS.vocals, wavesurfer: null, volume: 80, muted: false, isLoaded: false, error: false },
    drums: { type: "drums", ...STEM_CONFIGS.drums, wavesurfer: null, volume: 80, muted: false, isLoaded: false, error: false },
    bass: { type: "bass", ...STEM_CONFIGS.bass, wavesurfer: null, volume: 80, muted: false, isLoaded: false, error: false },
    other: { type: "other", ...STEM_CONFIGS.other, wavesurfer: null, volume: 80, muted: false, isLoaded: false, error: false },
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [allStemsLoaded, setAllStemsLoaded] = useState(false);
  const [hasErrors, setHasErrors] = useState(false);

  // Initialize waveforms
  useEffect(() => {
    const initStems = async () => {
      const stemTypes: StemType[] = ["vocals", "drums", "bass", "other"];
      let loadedCount = 0;
      let errorCount = 0;
      
      for (const stemType of stemTypes) {
        const container = containerRefs.current[stemType];
        if (!container) continue;

        // Cleanup existing instance
        if (stems[stemType].wavesurfer) {
          stems[stemType].wavesurfer?.destroy();
        }

        // Create new WaveSurfer instance
        const ws = WaveSurfer.create({
          container,
          waveColor: `${STEM_CONFIGS[stemType].color}40`,
          progressColor: STEM_CONFIGS[stemType].color,
          height: 50,
          normalize: true,
          barWidth: 2,
          barGap: 1,
          barRadius: 2,
        });

        // Load audio
        const stemUrl = `${apiUrl}/api/jobs/${jobId}/stems/${stemType}`;
        
        try {
          await ws.load(stemUrl);

          // Set initial volume
          ws.setVolume(stems[stemType].volume / 100);

          // Update state
          setStems((prev) => ({
            ...prev,
            [stemType]: {
              ...prev[stemType],
              wavesurfer: ws,
              isLoaded: true,
              error: false,
            },
          }));

          loadedCount++;

          // Set duration from first loaded stem
          if (duration === 0) {
            ws.on("ready", () => {
              setDuration(ws.getDuration());
            });
          }

          // Sync time updates from any stem
          ws.on("audioprocess", (time) => {
            setCurrentTime(time);
          });

        } catch (error) {
          console.error(`Failed to load ${stemType}:`, error);
          errorCount++;
          setStems((prev) => ({
            ...prev,
            [stemType]: {
              ...prev[stemType],
              error: true,
            },
          }));
        }
      }

      if (loadedCount === 4) {
        setAllStemsLoaded(true);
      }
      
      if (errorCount > 0) {
        setHasErrors(true);
      }
    };

    initStems();

    // Cleanup
    return () => {
      Object.values(stems).forEach((stem) => {
        stem.wavesurfer?.destroy();
      });
    };
  }, [jobId, apiUrl]);

  // Sync playback across all stems
  const handlePlayPause = () => {
    Object.values(stems).forEach((stem) => {
      if (stem.isLoaded && !stem.muted && stem.wavesurfer) {
        stem.wavesurfer.playPause();
      }
    });
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    Object.values(stems).forEach((stem) => {
      if (stem.isLoaded) {
        stem.wavesurfer?.seekTo(0);
        if (isPlaying) {
          stem.wavesurfer?.pause();
        }
      }
    });
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const handleVolumeChange = (stemType: StemType, value: number[]) => {
    const newVolume = value[0];
    setStems((prev) => ({
      ...prev,
      [stemType]: {
        ...prev[stemType],
        volume: newVolume,
      },
    }));
    if (stems[stemType].isLoaded) {
      stems[stemType].wavesurfer?.setVolume(newVolume / 100);
    }
  };

  const handleMuteToggle = (stemType: StemType) => {
    const newMuted = !stems[stemType].muted;
    setStems((prev) => ({
      ...prev,
      [stemType]: {
        ...prev[stemType],
        muted: newMuted,
      },
    }));
    if (stems[stemType].isLoaded) {
      stems[stemType].wavesurfer?.setVolume(newMuted ? 0 : stems[stemType].volume / 100);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Show error message if stems aren't available
  if (hasErrors && !allStemsLoaded) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stem Mixer</CardTitle>
          <CardDescription>Preview and adjust individual stem volumes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-6 text-center space-y-3">
            <div className="text-muted-foreground">
              ⚠️ Stem files are not available for mixing
            </div>
            <p className="text-sm text-muted-foreground">
              This feature is only available for newly processed jobs.  
              Older jobs have stems archived in the download package only.
            </p>
            <p className="text-xs text-muted-foreground">
              💡 To use the stem mixer, create a new job or reprocess this one.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stem Mixer</CardTitle>
        <CardDescription>
          Preview and adjust individual stem volumes before downloading
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Transport Controls */}
        <div className="flex items-center justify-center gap-4 pb-4 border-b">
          <Button
            variant="outline"
            size="icon"
            onClick={handleReset}
            disabled={!allStemsLoaded}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          
          <Button
            size="lg"
            onClick={handlePlayPause}
            disabled={!allStemsLoaded}
            className="w-32"
          >
            {isPlaying ? (
              <>
                <Pause className="h-5 w-5 mr-2" />
                Pause
              </>
            ) : (
              <>
                <Play className="h-5 w-5 mr-2" />
                Play
              </>
            )}
          </Button>

          <div className="flex items-center gap-2 text-sm font-mono min-w-[100px]">
            <span>{formatTime(currentTime)}</span>
            <span className="text-muted-foreground">/</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Stem Channels */}
        <div className="space-y-6">
          {(["vocals", "drums", "bass", "other"] as StemType[]).map((stemType) => (
            <div key={stemType} className="space-y-3">
              {/* Channel Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: STEM_CONFIGS[stemType].color }}
                  />
                  <span className="font-semibold text-base">
                    {STEM_CONFIGS[stemType].label}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono w-12 text-right tabular-nums">
                    {stems[stemType].muted ? "MUTE" : `${stems[stemType].volume}%`}
                  </span>
                  <Button
                    variant={stems[stemType].muted ? "secondary" : "ghost"}
                    size="sm"
                    className="h-9 w-9 p-0"
                    onClick={() => handleMuteToggle(stemType)}
                    disabled={!stems[stemType].isLoaded}
                  >
                    {stems[stemType].muted ? (
                      <VolumeX className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Waveform Container */}
              <div className="bg-muted/30 rounded-md p-2">
                <div
                  ref={(el) => {
                    containerRefs.current[stemType] = el;
                  }}
                  className="w-full"
                />
              </div>

              {/* Volume Slider */}
              <div className="flex items-center gap-4">
                <VolumeX className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <Slider
                  value={[stems[stemType].muted ? 0 : stems[stemType].volume]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={(value) => handleVolumeChange(stemType, value)}
                  className="flex-1"
                  disabled={!stems[stemType].isLoaded}
                />
                <Volume2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </div>
            </div>
          ))}
        </div>

        {/* Loading State */}
        {!allStemsLoaded && !hasErrors && (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground animate-pulse">
              Loading stems for mixer...
            </div>
          </div>
        )}

        {/* Info */}
        {allStemsLoaded && (
          <div className="text-xs text-muted-foreground text-center pt-4 border-t">
            💡 <strong>Tip:</strong> Adjust volume sliders and use mute buttons to create your perfect mix. 
            Your settings are for preview only and won&apos;t affect the download.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
