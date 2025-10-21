"use client";

import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";
import { Play, Pause, Volume2, Scissors, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface AudioWaveformProps {
  audioUrl: string;
  onReady?: () => void;
  showControls?: boolean;
  enableTrimming?: boolean;
  onTrimChange?: (start: number, end: number) => void;
}

interface Region {
  id: string;
  start: number;
  end: number;
  drag: boolean;
  resize: boolean;
  color: string;
}

export function AudioWaveform({ audioUrl, onReady, showControls = true, enableTrimming = false, onTrimChange }: AudioWaveformProps) {
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const regionsPlugin = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isTrimMode, setIsTrimMode] = useState(false);
  const [trimStart, setTrimStart] = useState<number | null>(null);
  const [trimEnd, setTrimEnd] = useState<number | null>(null);

  // Spacebar play/pause handler
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isReady) {
        e.preventDefault();
        handlePlayPause();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isReady, isPlaying]);

  useEffect(() => {
    if (!waveformRef.current) return;

    // Cleanup previous instance if it exists
    if (wavesurfer.current) {
      try {
        if (wavesurfer.current.isPlaying()) {
          wavesurfer.current.pause();
        }
        wavesurfer.current.destroy();
      } catch {
        // Ignore cleanup errors (AbortError, etc.)
      }
      wavesurfer.current = null;
    }

    // Reset state for new file
    setIsPlaying(false);
    setIsReady(false);
    setCurrentTime(0);
    setDuration(0);

    // Initialize Regions Plugin
    regionsPlugin.current = RegionsPlugin.create();

    // Initialize WaveSurfer
    wavesurfer.current = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#7C3AED',  // Kit purple
      progressColor: '#2563EB',  // Kit blue
      cursorColor: '#2563EB',
      barWidth: 2,
      barRadius: 3,
      barGap: 2,
      height: 80,
      normalize: true,
      plugins: [regionsPlugin.current],
    });

    // Load audio with error handling for AbortError
    const loadPromise = wavesurfer.current.load(audioUrl);
    
    // Catch AbortError silently (happens in React StrictMode dev)
    if (loadPromise && typeof loadPromise.catch === 'function') {
      loadPromise.catch((error) => {
        if (error.name === 'AbortError') {
          // Expected in dev mode (React StrictMode)
          console.debug('WaveSurfer load aborted (expected in dev mode)');
        } else {
          console.error('WaveSurfer load error:', error);
        }
      });
    }

    // Event listeners
    wavesurfer.current.on('ready', () => {
      setIsReady(true);
      setDuration(wavesurfer.current?.getDuration() || 0);
      if (onReady) onReady();
    });

    wavesurfer.current.on('play', () => setIsPlaying(true));
    wavesurfer.current.on('pause', () => setIsPlaying(false));
    
    wavesurfer.current.on('audioprocess', (time) => {
      setCurrentTime(time);
    });

    wavesurfer.current.on('interaction', () => {
      setCurrentTime(wavesurfer.current?.getCurrentTime() || 0);
    });

    // Region event listeners
    regionsPlugin.current?.on('region-updated', (region: Region) => {
      setTrimStart(region.start);
      setTrimEnd(region.end);
      if (onTrimChange) {
        onTrimChange(region.start, region.end);
      }
    });

    regionsPlugin.current?.on('region-created', (region: Region) => {
      setTrimStart(region.start);
      setTrimEnd(region.end);
      if (onTrimChange) {
        onTrimChange(region.start, region.end);
      }
    });

    regionsPlugin.current?.on('region-removed', () => {
      setTrimStart(null);
      setTrimEnd(null);
    });

    // Cleanup
    return () => {
      if (wavesurfer.current) {
        const instance = wavesurfer.current;
        wavesurfer.current = null;
        
        // Use setTimeout to avoid React StrictMode double-invoke issues
        setTimeout(() => {
          try {
            if (instance.isPlaying && instance.isPlaying()) {
              instance.pause();
            }
            instance.destroy();
          } catch {
            // Silently ignore AbortError - this is expected in dev mode
          }
        }, 0);
      }
    };
  }, [audioUrl, onReady]);

  const handlePlayPause = () => {
    if (wavesurfer.current && isReady) {
      wavesurfer.current.playPause();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleTrimMode = () => {
    if (!regionsPlugin.current || !wavesurfer.current) return;

    if (isTrimMode) {
      // Disable trim mode - clear all regions
      regionsPlugin.current.clearRegions();
      setIsTrimMode(false);
      setTrimStart(null);
      setTrimEnd(null);
    } else {
      // Enable trim mode - enable drag selection
      setIsTrimMode(true);
      
      // Add initial region (full duration)
      const dur = wavesurfer.current.getDuration();
      regionsPlugin.current.addRegion({
        start: 0,
        end: dur,
        color: 'rgba(37, 99, 235, 0.2)', // blue with transparency
        drag: true,
        resize: true,
      });
    }
  };

  const clearTrimRegion = () => {
    if (!regionsPlugin.current) return;
    regionsPlugin.current.clearRegions();
    setTrimStart(null);
    setTrimEnd(null);
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        {/* Waveform */}
        <div ref={waveformRef} className="w-full" />

        {/* Controls */}
        {showControls && isReady && (
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              {/* Play/Pause */}
              <Button
                variant="outline"
                size="icon"
                onClick={handlePlayPause}
                className="flex-shrink-0"
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>

              {/* Time display */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-mono">{formatTime(currentTime)}</span>
                <span>/</span>
                <span className="font-mono">{formatTime(duration)}</span>
              </div>

              {/* Trim button */}
              {enableTrimming && (
                <Button
                  variant={isTrimMode ? "default" : "outline"}
                  size="sm"
                  onClick={toggleTrimMode}
                  className="ml-auto"
                >
                  <Scissors className="h-4 w-4 mr-2" />
                  {isTrimMode ? "Trimming" : "Trim"}
                </Button>
              )}

              {!enableTrimming && <Volume2 className="h-4 w-4 text-muted-foreground ml-auto" />}
            </div>

            {/* Trim region info */}
            {isTrimMode && trimStart !== null && trimEnd !== null && (
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 rounded-md border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Start:</span>{" "}
                    <span className="font-mono font-semibold">{formatTime(trimStart)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">End:</span>{" "}
                    <span className="font-mono font-semibold">{formatTime(trimEnd)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Duration:</span>{" "}
                    <span className="font-mono font-semibold">{formatTime(trimEnd - trimStart)}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearTrimRegion}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {isTrimMode && trimStart === null && (
              <div className="text-sm text-muted-foreground p-2 bg-muted rounded-md">
                💡 Drag the handles on the waveform to select the region you want to process
              </div>
            )}
          </div>
        )}

        {/* Loading state */}
        {!isReady && (
          <div className="flex items-center justify-center h-20">
            <div className="text-sm text-muted-foreground">Loading waveform...</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


