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
  other: { label: "Other", color: "#9CA3AF" },
};

// Convert linear 0-100 to dB
const volumeToDB = (volume: number): string => {
  if (volume === 0) return "-∞";
  const db = 20 * Math.log10(volume / 100);
  return db >= 0 ? `+${db.toFixed(1)}` : db.toFixed(1);
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

  // Listen for other audio players and stop mixer
  useEffect(() => {
    const handleOtherAudioPlay = () => {
      if (isPlaying) {
        // Stop all sources
        Object.values(tracks).forEach(track => {
          track.sourceNode?.stop();
        });
        setIsPlaying(false);
        masterWavesurfer.current?.pause();
      }
    };

    window.addEventListener('audioplay', handleOtherAudioPlay);
    return () => window.removeEventListener('audioplay', handleOtherAudioPlay);
  }, [isPlaying, tracks]);

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
            waveColor: '#4B5563',
            progressColor: '#3B82F6',
            cursorColor: '#3B82F6',
            height: 120,
            normalize: true,
            barWidth: 2,
            barGap: 1,
            barRadius: 1,
            interact: true,
          });

          // Load vocals stem by default to show master mix waveform
          const stemUrl = `${apiUrl}/api/jobs/${jobId}/stems/vocals`;
          await masterWavesurfer.current.load(stemUrl);
          
          // Seek on click
          masterWavesurfer.current.on('interaction', () => {
            if (masterWavesurfer.current) {
              const seekTime = masterWavesurfer.current.getCurrentTime();
              setCurrentTime(seekTime);
            }
          });
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
      
      // Notify other audio players to stop
      window.dispatchEvent(new Event('audioplay'));

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
    
    // If playing, restart from current position with new mute state
    if (isPlaying) {
      const savedTime = currentTime;
      handlePlayPause(); // Stop
      setTimeout(() => {
        setCurrentTime(savedTime);
        setTimeout(() => handlePlayPause(), 10); // Restart
      }, 10);
    }
  };

  const handleSoloToggle = (stemType: StemType) => {
    setSoloed(prev => prev === stemType ? null : stemType);
    
    // If playing, restart from current position with new solo state
    if (isPlaying) {
      const savedTime = currentTime;
      handlePlayPause(); // Stop
      setTimeout(() => {
        setCurrentTime(savedTime);
        setTimeout(() => handlePlayPause(), 10); // Restart
      }, 10);
    }
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
    <Card className="bg-slate-950">
      <CardHeader className="border-b border-slate-800">
        <CardTitle className="text-slate-100">Stem Mixer</CardTitle>
        <CardDescription className="text-slate-400">
          Professional DAW-style mixer with vertical faders
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-6 bg-gradient-to-b from-slate-900 to-slate-950">
        {/* Master Waveform Display */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <span className="text-sm font-medium text-slate-300">
              {selectedChannel ? `${STEM_CONFIGS[selectedChannel].label}` : "Master Mix"}
            </span>
            <span className="text-xs font-mono text-slate-500 tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          <div className="bg-slate-950 rounded-lg p-4 border border-slate-800">
            <div ref={masterWaveformRef} className="w-full" />
          </div>
        </div>

        {/* Transport Controls */}
        <div className="flex items-center justify-center gap-3 py-3 bg-slate-900/50 rounded-lg border border-slate-800">
          <Button
            variant="outline"
            size="icon"
            onClick={handleReset}
            disabled={isLoading}
            className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          
          <Button
            size="lg"
            onClick={handlePlayPause}
            disabled={isLoading}
            className="w-32 bg-blue-600 hover:bg-blue-700"
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

        {/* Mixer Channels - DAW Style */}
        <div className="grid grid-cols-5 gap-3">
          {/* Individual Channel Strips */}
          {(["vocals", "drums", "bass", "other"] as StemType[]).map((stemType) => {
            const isSoloed = soloed === stemType;
            const isActive = selectedChannel === stemType;
            const effectiveMuted = muted[stemType] || (soloed !== null && !isSoloed);

            return (
              <div
                key={stemType}
                className={`flex flex-col items-stretch rounded-lg transition-all cursor-pointer
                  ${isActive 
                    ? 'bg-gradient-to-b from-slate-700 to-slate-800 ring-2 ring-blue-500' 
                    : 'bg-gradient-to-b from-slate-800 to-slate-900 hover:from-slate-750 hover:to-slate-850'
                  }
                  border border-slate-700`}
                onClick={() => handleChannelSelect(stemType)}
              >
                {/* Channel Header */}
                <div className="p-3 border-b border-slate-700 text-center">
                  <div
                    className="w-2 h-2 rounded-full mx-auto mb-2"
                    style={{ backgroundColor: STEM_CONFIGS[stemType].color, boxShadow: `0 0 8px ${STEM_CONFIGS[stemType].color}` }}
                  />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {STEM_CONFIGS[stemType].label}
                  </span>
                </div>

                {/* dB Meter Display */}
                <div className="px-3 py-2 text-center border-b border-slate-700/50">
                  <div className="text-[11px] font-mono font-bold text-green-400 tabular-nums">
                    {effectiveMuted ? "-∞" : volumeToDB(volumes[stemType])}
                  </div>
                  <div className="text-[9px] text-slate-500">dB</div>
                </div>

                {/* Vertical Fader with Scale */}
                <div className="px-2 py-4 flex-1 flex items-center justify-center">
                  <div className="relative flex items-center justify-center">
                    {/* dB Scale Markings */}
                    <div className="absolute -left-6 h-full flex flex-col justify-between text-[8px] text-slate-600 font-mono">
                      <span>10</span>
                      <span>0</span>
                      <span>-6</span>
                      <span>-12</span>
                      <span>-24</span>
                      <span>-∞</span>
                    </div>
                    
                    {/* Fader */}
                    <div className="h-56">
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
                  </div>
                </div>

                {/* Volume Readout */}
                <div className="px-2 py-2 text-center border-t border-slate-700/50">
                  <div className="text-xs font-mono font-bold text-slate-300 tabular-nums">
                    {effectiveMuted ? "---" : volumes[stemType]}
                  </div>
                </div>

                {/* Control Buttons */}
                <div className="p-2 space-y-1">
                  <button
                    className={`w-full h-7 rounded text-[10px] font-bold transition-all ${
                      isSoloed
                        ? 'bg-yellow-600 text-white shadow-lg shadow-yellow-600/50'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-200'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSoloToggle(stemType);
                    }}
                    disabled={isLoading}
                  >
                    S
                  </button>
                  <button
                    className={`w-full h-7 rounded text-[10px] font-bold transition-all ${
                      muted[stemType]
                        ? 'bg-red-600 text-white shadow-lg shadow-red-600/50'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-200'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMuteToggle(stemType);
                    }}
                    disabled={isLoading}
                  >
                    M
                  </button>
                </div>

                {/* Channel Name Tag */}
                <div 
                  className="px-2 py-1.5 text-center border-t border-slate-700"
                  style={{ backgroundColor: effectiveMuted ? '#1e293b' : `${STEM_CONFIGS[stemType].color}15` }}
                >
                  <span className="text-[10px] font-bold tracking-wide" style={{ color: STEM_CONFIGS[stemType].color }}>
                    {STEM_CONFIGS[stemType].label.toUpperCase()}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Master Channel Strip */}
          <div 
            className={`flex flex-col items-stretch rounded-lg transition-all cursor-pointer
              ${selectedChannel === null
                ? 'bg-gradient-to-b from-blue-700 to-blue-900 ring-2 ring-blue-400' 
                : 'bg-gradient-to-b from-slate-700 to-slate-800 hover:from-slate-650 hover:to-slate-750'
              }
              border-2 ${selectedChannel === null ? 'border-blue-500' : 'border-slate-600'}`}
            onClick={handleMasterClick}
          >
            {/* Master Header */}
            <div className="p-3 border-b border-slate-600 text-center">
              <div className="w-2 h-2 rounded-full mx-auto mb-2 bg-gradient-to-r from-purple-500 to-blue-500" style={{boxShadow: '0 0 8px rgba(147, 51, 234, 0.8)'}} />
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                Master
              </span>
            </div>

            {/* Master dB Display */}
            <div className="px-3 py-2 text-center border-b border-slate-600/50">
              <div className="text-[11px] font-mono font-bold text-blue-400 tabular-nums">
                {volumeToDB(volumes.master)}
              </div>
              <div className="text-[9px] text-slate-500">dB</div>
            </div>

            {/* Master Fader */}
            <div className="px-2 py-4 flex-1 flex items-center justify-center">
              <div className="relative flex items-center justify-center">
                {/* dB Scale */}
                <div className="absolute -left-6 h-full flex flex-col justify-between text-[8px] text-slate-600 font-mono">
                  <span>10</span>
                  <span>0</span>
                  <span>-6</span>
                  <span>-12</span>
                  <span>-24</span>
                  <span>-∞</span>
                </div>
                
                <div className="h-56">
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
              </div>
            </div>

            {/* Master Volume Readout */}
            <div className="px-2 py-2 text-center border-t border-slate-600/50">
              <div className="text-xs font-mono font-bold text-slate-200 tabular-nums">
                {volumes.master}
              </div>
            </div>

            {/* VU Meter Placeholder */}
            <div className="p-2">
              <div className="w-full h-12 bg-slate-950 rounded border border-slate-700 flex items-center justify-center">
                <div className="text-[9px] text-slate-600 font-bold">VU</div>
              </div>
            </div>

            {/* Master Label */}
            <div className="px-2 py-1.5 text-center border-t border-slate-600 bg-gradient-to-r from-purple-900/30 to-blue-900/30">
              <span className="text-[10px] font-bold text-blue-400 tracking-wide">
                MASTER
              </span>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-slate-400 animate-pulse">
              Initializing mixer...
            </div>
          </div>
        )}

        {/* Info */}
        {!isLoading && (
          <div className="space-y-1 text-[10px] text-slate-500 pt-4 border-t border-slate-800">
            <p className="text-center">
              <strong className="text-slate-400">TIP:</strong> Click channel to view waveform • S=Solo • M=Mute • Click master to return
            </p>
            <p className="text-center">
              Mix settings are for preview only • Download contains original stems
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
