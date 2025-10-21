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
    vocals: { type: "vocals", ...STEM_CONFIGS.vocals, wavesurfer: null, volume: 80, muted: false },
    drums: { type: "drums", ...STEM_CONFIGS.drums, wavesurfer: null, volume: 80, muted: false },
    bass: { type: "bass", ...STEM_CONFIGS.bass, wavesurfer: null, volume: 80, muted: false },
    other: { type: "other", ...STEM_CONFIGS.other, wavesurfer: null, volume: 80, muted: false },
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Initialize waveforms
  useEffect(() => {
    const initStems = async () => {
      const stemTypes: StemType[] = ["vocals", "drums", "bass", "other"];
      
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
          waveColor: STEM_CONFIGS[stemType].color,
          progressColor: STEM_CONFIGS[stemType].color,
          height: 60,
          normalize: true,
          barWidth: 2,
          barGap: 1,
        });

        // Load audio
        const stemUrl = `${apiUrl}/api/jobs/${jobId}/stems/${stemType}`;
        await ws.load(stemUrl);

        // Set initial volume
        ws.setVolume(stems[stemType].volume / 100);

        // Update state
        setStems((prev) => ({
          ...prev,
          [stemType]: {
            ...prev[stemType],
            wavesurfer: ws,
          },
        }));

        // Set duration from first loaded stem
        ws.on("ready", () => {
          if (duration === 0) {
            setDuration(ws.getDuration());
          }
        });

        // Sync time updates
        ws.on("audioprocess", (time) => {
          setCurrentTime(time);
        });
      }

      setIsReady(true);
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
      if (!stem.muted && stem.wavesurfer) {
        stem.wavesurfer.playPause();
      }
    });
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    Object.values(stems).forEach((stem) => {
      stem.wavesurfer?.seekTo(0);
    });
    setCurrentTime(0);
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
    stems[stemType].wavesurfer?.setVolume(newVolume / 100);
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
    stems[stemType].wavesurfer?.setVolume(newMuted ? 0 : stems[stemType].volume / 100);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

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
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={handleReset}
            disabled={!isReady}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          
          <Button
            size="lg"
            onClick={handlePlayPause}
            disabled={!isReady}
            className="w-24"
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

          <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono">
            <span>{formatTime(currentTime)}</span>
            <span>/</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Stem Controls */}
        <div className="space-y-4">
          {(["vocals", "drums", "bass", "other"] as StemType[]).map((stemType) => (
            <div key={stemType} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: STEM_CONFIGS[stemType].color }}
                  />
                  <span className="font-medium text-sm">
                    {STEM_CONFIGS[stemType].label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-8 text-right">
                    {stems[stemType].muted ? "0%" : `${stems[stemType].volume}%`}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleMuteToggle(stemType)}
                  >
                    {stems[stemType].muted ? (
                      <VolumeX className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Waveform */}
              <div
                ref={(el) => (containerRefs.current[stemType] = el)}
                className="w-full opacity-60 hover:opacity-100 transition-opacity"
              />

              {/* Volume Slider */}
              <Slider
                value={[stems[stemType].muted ? 0 : stems[stemType].volume]}
                min={0}
                max={100}
                step={1}
                onValueChange={(value) => handleVolumeChange(stemType, value)}
                className="w-full"
                disabled={!isReady}
              />
            </div>
          ))}
        </div>

        {/* Loading State */}
        {!isReady && (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">
              Loading stems...
            </div>
          </div>
        )}

        {/* Info */}
        {isReady && (
          <div className="text-xs text-muted-foreground text-center pt-4 border-t">
            💡 Tip: Adjust volume sliders to create your perfect mix. Your settings are for preview only and won&apos;t affect the download.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

