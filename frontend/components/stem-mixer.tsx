"use client";

import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { Play, Pause, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";

interface StemMixerProps {
  jobId: string;
  apiUrl: string;
}

type StemType = "vocals" | "drums" | "bass" | "other";

interface AudioTrack {
  type: StemType;
  audioContext: AudioContext | null;
  sourceNode: AudioBufferSourceNode | null;
  gainNode: GainNode | null;
  buffer: AudioBuffer | null;
}

const STEM_CONFIGS: Record<StemType, { label: string; color: string }> = {
  vocals: { label: "Vocals", color: "#FF6B9D" },
  drums: { label: "Drums", color: "#FFA500" },
  bass: { label: "Bass", color: "#4169E1" },
  other: { label: "Other", color: "#808080" },
};

export function StemMixer({ jobId, apiUrl }: StemMixerProps) {
  const masterWaveformRef = useRef<HTMLDivElement>(null);
  const masterWavesurfer = useRef<WaveSurfer | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);

  const [tracks, setTracks] = useState<Record<StemType, AudioTrack>>({
    vocals: { type: "vocals", audioContext: null, sourceNode: null, gainNode: null, buffer: null },
    drums: { type: "drums", audioContext: null, sourceNode: null, gainNode: null, buffer: null },
    bass: { type: "bass", audioContext: null, sourceNode: null, gainNode: null, buffer: null },
    other: { type: "other", audioContext: null, sourceNode: null, gainNode: null, buffer: null },
  });

  const [volumes, setVolumes] = useState({
    vocals: 80,
    drums: 80,
    bass: 80,
    other: 80,
    master: 80,
  });

  const [muted, setMuted] = useState({
    vocals: false,
    drums: false,
    bass: false,
    other: false,
  });

  const [soloed, setSoloed] = useState<StemType | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<StemType | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasErrors, setHasErrors] = useState(false);

  // Initialize Audio Context and load stems
  useEffect(() => {
    const initAudio = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContext();
        audioContextRef.current = ctx;

        // Create master gain
        const masterGain = ctx.createGain();
        masterGain.connect(ctx.destination);
        masterGain.gain.value = 0.8;
        masterGainRef.current = masterGain;

        // Load all stems
        const stemTypes: StemType[] = ["vocals", "drums", "bass", "other"];
        let longestDuration = 0;

        for (const stemType of stemTypes) {
          try {
            const response = await fetch(`${apiUrl}/api/jobs/${jobId}/stems/${stemType}`);
            if (!response.ok) throw new Error(`Failed to load ${stemType}`);

            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

            // Track longest duration
            if (audioBuffer.duration > longestDuration) {
              longestDuration = audioBuffer.duration;
            }

            // Create gain node for this track
            const gainNode = ctx.createGain();
            gainNode.connect(masterGain);
            gainNode.gain.value = 0.8;

            setTracks(prev => ({
              ...prev,
              [stemType]: {
                ...prev[stemType],
                audioContext: ctx,
                gainNode,
                buffer: audioBuffer,
              },
            }));

          } catch (error) {
            console.error(`Error loading ${stemType}:`, error);
            setHasErrors(true);
          }
        }

        setDuration(longestDuration);
        
        // Initialize master waveform
        if (masterWaveformRef.current && longestDuration > 0) {
          masterWavesurfer.current = WaveSurfer.create({
            container: masterWaveformRef.current,
            waveColor: '#7C3AED40',
            progressColor: '#2563EB',
            cursorColor: '#2563EB',
            height: 100,
            normalize: true,
            barWidth: 2,
            barGap: 1,
            barRadius: 2,
            interact: false, // Read-only, just for visualization
          });

          // Load vocals stem by default to show master mix waveform
          const stemUrl = `${apiUrl}/api/jobs/${jobId}/stems/vocals`;
          await masterWavesurfer.current.load(stemUrl);
        }

        setIsLoading(false);

      } catch (error) {
        console.error("Failed to initialize audio:", error);
        setHasErrors(true);
        setIsLoading(false);
      }
    };

    initAudio();

    return () => {
      // Cleanup
      audioContextRef.current?.close();
      masterWavesurfer.current?.destroy();
    };
  }, [jobId, apiUrl]);

  // Playback control using Web Audio API for perfect sync
  const handlePlayPause = () => {
    if (!audioContextRef.current) return;

    if (isPlaying) {
      // Pause - stop all sources
      Object.values(tracks).forEach(track => {
        track.sourceNode?.stop();
      });
      setIsPlaying(false);
      masterWavesurfer.current?.pause();
    } else {
      // Play - create new sources for all tracks
      const ctx = audioContextRef.current;
      const startTime = ctx.currentTime;

      Object.entries(tracks).forEach(([stemType, track]) => {
        if (!track.buffer || !track.gainNode) return;

        const type = stemType as StemType;
        const isMuted = muted[type] || (soloed !== null && soloed !== type);

        if (!isMuted) {
          const source = ctx.createBufferSource();
          source.buffer = track.buffer;
          source.connect(track.gainNode);
          source.start(0, currentTime);

          // Update state
          setTracks(prev => ({
            ...prev,
            [type]: {
              ...prev[type],
              sourceNode: source,
            },
          }));

          // When source ends, update state
          source.onended = () => {
            if (isPlaying) {
              setIsPlaying(false);
              masterWavesurfer.current?.pause();
            }
          };
        }
      });

      setIsPlaying(true);
      masterWavesurfer.current?.play();

      // Update time
      const updateTime = () => {
        if (isPlaying && audioContextRef.current) {
          const elapsed = audioContextRef.current.currentTime - startTime + currentTime;
          setCurrentTime(Math.min(elapsed, duration));
          if (elapsed < duration) {
            requestAnimationFrame(updateTime);
          }
        }
      };
      requestAnimationFrame(updateTime);
    }
  };

  const handleReset = () => {
    if (isPlaying) {
      handlePlayPause(); // Stop playback
    }
    setCurrentTime(0);
    masterWavesurfer.current?.seekTo(0);
  };

  const handleVolumeChange = (stemType: StemType, value: number[]) => {
    const newVolume = value[0];
    setVolumes(prev => ({ ...prev, [stemType]: newVolume }));
    
    const track = tracks[stemType];
    if (track.gainNode) {
      track.gainNode.gain.value = newVolume / 100;
    }
  };

  const handleMasterVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolumes(prev => ({ ...prev, master: newVolume }));
    
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = newVolume / 100;
    }
  };

  const handleMuteToggle = (stemType: StemType) => {
    setMuted(prev => ({ ...prev, [stemType]: !prev[stemType] }));
  };

  const handleSoloToggle = (stemType: StemType) => {
    setSoloed(prev => prev === stemType ? null : stemType);
  };

  const handleChannelSelect = async (stemType: StemType) => {
    // Toggle selection - click again to deselect
    if (selectedChannel === stemType) {
      setSelectedChannel(null);
      // Go back to master (vocals) waveform
      if (masterWavesurfer.current) {
        const stemUrl = `${apiUrl}/api/jobs/${jobId}/stems/vocals`;
        masterWavesurfer.current.load(stemUrl);
      }
    } else {
      setSelectedChannel(stemType);
      // Update master waveform to show selected channel
      if (masterWavesurfer.current) {
        const stemUrl = `${apiUrl}/api/jobs/${jobId}/stems/${stemType}`;
        masterWavesurfer.current.load(stemUrl);
      }
    }
  };

  const handleMasterClick = () => {
    setSelectedChannel(null);
    // Show master (vocals) waveform
    if (masterWavesurfer.current) {
      const stemUrl = `${apiUrl}/api/jobs/${jobId}/stems/vocals`;
      masterWavesurfer.current.load(stemUrl);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Error state
  if (hasErrors) {
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
          DAW-style mixer with vertical faders and master waveform
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Master Waveform */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              {selectedChannel ? `${STEM_CONFIGS[selectedChannel].label} Channel` : "Master Mix"}
            </span>
            <span className="font-mono text-muted-foreground">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          <div className="bg-black/5 dark:bg-white/5 rounded-lg p-4">
            <div ref={masterWaveformRef} className="w-full" />
          </div>
        </div>

        {/* Transport Controls */}
        <div className="flex items-center justify-center gap-3 pb-4 border-b">
          <Button
            variant="outline"
            size="icon"
            onClick={handleReset}
            disabled={isLoading}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          
          <Button
            size="lg"
            onClick={handlePlayPause}
            disabled={isLoading}
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
        </div>

        {/* Channel Strips (DAW-style vertical faders) */}
        <div className="grid grid-cols-5 gap-4">
          {/* Individual Channel Strips */}
          {(["vocals", "drums", "bass", "other"] as StemType[]).map((stemType) => {
            const isSoloed = soloed === stemType;
            const isActive = selectedChannel === stemType;
            const effectiveMuted = muted[stemType] || (soloed !== null && !isSoloed);

            return (
              <div
                key={stemType}
                className={`flex flex-col items-center space-y-3 p-3 rounded-lg transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-100 dark:bg-blue-950 border-2 border-blue-500'
                    : 'bg-muted/30 border-2 border-transparent hover:bg-muted/50'
                }`}
                onClick={() => handleChannelSelect(stemType)}
              >
                {/* Channel Label */}
                <div className="text-center">
                  <div
                    className="w-3 h-3 rounded-full mx-auto mb-1"
                    style={{ backgroundColor: STEM_CONFIGS[stemType].color }}
                  />
                  <span className="text-xs font-semibold">
                    {STEM_CONFIGS[stemType].label}
                  </span>
                </div>

                {/* Vertical Volume Fader */}
                <div className="h-48 flex items-center">
                  <Slider
                    value={[effectiveMuted ? 0 : volumes[stemType]]}
                    min={0}
                    max={100}
                    step={1}
                    orientation="vertical"
                    onValueChange={(value) => handleVolumeChange(stemType, value)}
                    disabled={isLoading}
                    className="h-full"
                  />
                </div>

                {/* Volume Display */}
                <div className="text-xs font-mono font-bold tabular-nums min-w-[40px] text-center">
                  {effectiveMuted ? "---" : `${volumes[stemType]}`}
                </div>

                {/* Control Buttons */}
                <div className="flex flex-col gap-1 w-full">
                  <Button
                    variant={isSoloed ? "default" : "outline"}
                    size="sm"
                    className="w-full h-7 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSoloToggle(stemType);
                    }}
                    disabled={isLoading}
                  >
                    S
                  </Button>
                  <Button
                    variant={muted[stemType] ? "secondary" : "outline"}
                    size="sm"
                    className="w-full h-7 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMuteToggle(stemType);
                    }}
                    disabled={isLoading}
                  >
                    M
                  </Button>
                </div>
              </div>
            );
          })}

          {/* Master Channel Strip */}
          <div 
            className={`flex flex-col items-center space-y-3 p-3 rounded-lg transition-all cursor-pointer ${
              selectedChannel === null
                ? 'bg-gradient-to-b from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-950 border-2 border-blue-500'
                : 'bg-gradient-to-b from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 border-2 border-slate-400 dark:border-slate-600'
            }`}
            onClick={handleMasterClick}
          >
            {/* Master Label */}
            <div className="text-center">
              <div className="w-3 h-3 rounded-full mx-auto mb-1 bg-gradient-to-r from-purple-500 to-blue-500" />
              <span className="text-xs font-bold">MASTER</span>
            </div>

            {/* Vertical Master Fader */}
            <div className="h-48 flex items-center">
              <Slider
                value={[volumes.master]}
                min={0}
                max={100}
                step={1}
                orientation="vertical"
                onValueChange={handleMasterVolumeChange}
                disabled={isLoading}
                className="h-full"
              />
            </div>

            {/* Master Volume Display */}
            <div className="text-xs font-mono font-bold tabular-nums min-w-[40px] text-center">
              {volumes.master}
            </div>

            {/* VU Meter placeholder */}
            <div className="w-full h-14 bg-black/10 dark:bg-white/10 rounded flex items-end justify-center p-1">
              <div className="text-xs text-muted-foreground">VU</div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground animate-pulse">
              Loading mixer...
            </div>
          </div>
        )}

        {/* Info */}
        {!isLoading && (
          <div className="space-y-2 text-xs text-muted-foreground pt-4 border-t">
            <p className="text-center">
              💡 <strong>Click a channel</strong> to see its waveform above • <strong>S</strong> = Solo • <strong>M</strong> = Mute
            </p>
            <p className="text-center">
              Your mix settings are for preview only and won&apos;t affect the download.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
