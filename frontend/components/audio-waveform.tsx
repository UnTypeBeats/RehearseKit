"use client";

import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { Play, Pause, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface AudioWaveformProps {
  audioUrl: string;
  onReady?: () => void;
  showControls?: boolean;
}

export function AudioWaveform({ audioUrl, onReady, showControls = true }: AudioWaveformProps) {
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

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

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        {/* Waveform */}
        <div ref={waveformRef} className="w-full" />

        {/* Controls */}
        {showControls && isReady && (
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

            {/* Volume icon (placeholder) */}
            <Volume2 className="h-4 w-4 text-muted-foreground ml-auto" />
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


