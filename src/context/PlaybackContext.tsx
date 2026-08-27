import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

export type AudioQuality = '96' | '128' | '256' | '320';
export type DownloadQuality = '96' | '128' | '256' | '320';
export type AudioFormat = 'mp4' | 'webm';
export type DownloadFormat = 'mp4' | 'webm';
export type AudioEngine = 'youtubei' | 'ytdlp' | 'lavalink';

interface PlaybackContextType {
  audioQuality: AudioQuality;
  setAudioQuality: (quality: AudioQuality) => void;
  downloadQuality: DownloadQuality;
  setDownloadQuality: (quality: DownloadQuality) => void;
  audioEngine: AudioEngine;
  setAudioEngine: (engine: AudioEngine) => void;
  audioFormat: AudioFormat;
  setAudioFormat: (format: AudioFormat) => void;
  downloadFormat: DownloadFormat;
  setDownloadFormat: (format: DownloadFormat) => void;
  autoplayEnabled: boolean;
  setAutoplayEnabled: (enabled: boolean) => void;
  normalizeVolume: boolean;
  setNormalizeVolume: (enabled: boolean) => void;
  lowDataMode: boolean;
  setLowDataMode: (enabled: boolean) => void;
  monoAudio: boolean;
  setMonoAudio: (enabled: boolean) => void;
  audioDeviceId: string;
  setAudioDeviceId: (deviceId: string) => void;
  playbackSpeed: number;
  setPlaybackSpeed: (speed: number) => void;
  volume: number;
  setVolume: (volume: number) => void;
  isMuted: boolean;
  setIsMuted: (isMuted: boolean) => void;
  eqEnabled: boolean;
  setEqEnabled: (enabled: boolean) => void;
  eqBands: number[];
  setEqBands: (bands: number[]) => void;
  spatialAudioEnabled: boolean;
  setSpatialAudioEnabled: (enabled: boolean) => void;
  spatialAudioMode: 'off' | 'audiophile' | 'studio';
  setSpatialAudioMode: (mode: 'off' | 'audiophile' | 'studio') => void;
  spatialWidth: number;
  setSpatialWidth: (width: number) => void;
  spatialRoomSize: 'small' | 'medium';
  setSpatialRoomSize: (size: 'small' | 'medium') => void;
  spatialBassBoost: number;
  setSpatialBassBoost: (boost: number) => void;
  spatialVocalClarity: number;
  setSpatialVocalClarity: (clarity: number) => void;
  spatialTubeWarmth: boolean;
  setSpatialTubeWarmth: (enabled: boolean) => void;
  gaplessEnabled: boolean;
  setGaplessEnabled: (enabled: boolean) => void;
  crossfadeDuration: number;
  setCrossfadeDuration: (seconds: number) => void;
}

const PlaybackContext = createContext<PlaybackContextType | undefined>(undefined);

export const PlaybackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [audioQuality, setAudioQualityState] = useState<AudioQuality>('320');
  const [downloadQuality, setDownloadQualityState] = useState<DownloadQuality>('320');
  const [audioEngine, setAudioEngineState] = useState<AudioEngine>('youtubei');
  const [audioFormat, setAudioFormatState] = useState<AudioFormat>('mp4');
  const [downloadFormat, setDownloadFormatState] = useState<DownloadFormat>('mp4');
  const [autoplayEnabled, setAutoplayEnabledState] = useState<boolean>(true);
  const [normalizeVolume, setNormalizeVolumeState] = useState<boolean>(false);
  const [lowDataMode, setLowDataModeState] = useState<boolean>(false);
  const [monoAudio, setMonoAudioState] = useState<boolean>(false);
  const [audioDeviceId, setAudioDeviceIdState] = useState<string>('default');
  const [playbackSpeed, setPlaybackSpeedState] = useState<number>(1.0);
  const [volume, setVolumeState] = useState<number>(0.8);
  const [isMuted, setIsMutedState] = useState<boolean>(false);
  const [eqEnabled, setEqEnabledState] = useState<boolean>(false);
  const [eqBands, setEqBandsState] = useState<number[]>([0, 0, 0, 0, 0]);
  const [spatialAudioEnabled, setSpatialAudioEnabledState] = useState<boolean>(false);
  const [spatialAudioMode, setSpatialAudioModeState] = useState<'off' | 'audiophile' | 'studio'>('audiophile');
  const [spatialWidth, setSpatialWidthState] = useState<number>(1.4);
  const [spatialRoomSize, setSpatialRoomSizeState] = useState<'small' | 'medium'>('medium');
  const [spatialBassBoost, setSpatialBassBoostState] = useState<number>(4);
  const [spatialVocalClarity, setSpatialVocalClarityState] = useState<number>(3);
  const [spatialTubeWarmth, setSpatialTubeWarmthState] = useState<boolean>(true);
  const [gaplessEnabled, setGaplessEnabledState] = useState<boolean>(true);
  const [crossfadeDuration, setCrossfadeDurationState] = useState<number>(0);

  const saveTimeoutRef = useRef<Record<string, any>>({});

  const debouncedSave = (key: string, value: any, delay = 500) => {
    if (saveTimeoutRef.current[key]) {
      clearTimeout(saveTimeoutRef.current[key]);
    }
    saveTimeoutRef.current[key] = setTimeout(async () => {
      try {
        await window.ipcRenderer?.invoke('set-setting', key, value);
        delete saveTimeoutRef.current[key];
      } catch (e) {}
    }, delay);
  };

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedAudio = await window.ipcRenderer?.invoke('get-setting', 'audioQuality');
        if (savedAudio !== null && savedAudio !== undefined) {
          setAudioQualityState(savedAudio);
        }
        
        const savedDownload = await window.ipcRenderer?.invoke('get-setting', 'downloadQuality');
        if (savedDownload !== null && savedDownload !== undefined) {
          setDownloadQualityState(savedDownload);
        }

        const savedAudioEngine = await window.ipcRenderer?.invoke('get-setting', 'audioEngine');
        if (savedAudioEngine !== null && savedAudioEngine !== undefined) {
          setAudioEngineState(savedAudioEngine);
        }

        const savedAudioFormat = await window.ipcRenderer?.invoke('get-setting', 'audioFormat');
        if (savedAudioFormat !== null && savedAudioFormat !== undefined) {
          setAudioFormatState(savedAudioFormat);
        }

        const savedDownloadFormat = await window.ipcRenderer?.invoke('get-setting', 'downloadFormat');
        if (savedDownloadFormat !== null && savedDownloadFormat !== undefined) {
          setDownloadFormatState(savedDownloadFormat);
        }

        const savedAutoplay = await window.ipcRenderer?.invoke('get-setting', 'autoplayEnabled');
        if (savedAutoplay !== null && savedAutoplay !== undefined) {
          setAutoplayEnabledState(savedAutoplay);
        }

        const savedNormalize = await window.ipcRenderer?.invoke('get-setting', 'normalizeVolume');
        if (savedNormalize !== null && savedNormalize !== undefined) {
          setNormalizeVolumeState(savedNormalize);
        }

        const savedLowData = await window.ipcRenderer?.invoke('get-setting', 'lowDataMode');
        if (savedLowData !== null && savedLowData !== undefined) {
          setLowDataModeState(savedLowData);
        }

        const savedMono = await window.ipcRenderer?.invoke('get-setting', 'monoAudio');
        if (savedMono !== null && savedMono !== undefined) {
          setMonoAudioState(savedMono);
        }

        const savedDeviceId = await window.ipcRenderer?.invoke('get-setting', 'audioDeviceId');
        if (savedDeviceId !== null && savedDeviceId !== undefined) {
          setAudioDeviceIdState(savedDeviceId);
        }

        const savedSpeed = await window.ipcRenderer?.invoke('get-setting', 'playbackSpeed');
        if (savedSpeed !== null && savedSpeed !== undefined) {
          setPlaybackSpeedState(savedSpeed);
        }

        const savedVolume = await window.ipcRenderer?.invoke('get-setting', 'volume');
        if (savedVolume !== null && savedVolume !== undefined) {
          setVolumeState(savedVolume);
        }

        const savedMuted = await window.ipcRenderer?.invoke('get-setting', 'isMuted');
        if (savedMuted !== null && savedMuted !== undefined) {
          setIsMutedState(savedMuted);
        }

        const savedEqEnabled = await window.ipcRenderer?.invoke('get-setting', 'eqEnabled');
        if (savedEqEnabled !== null && savedEqEnabled !== undefined) {
          setEqEnabledState(savedEqEnabled);
        }

        const savedEqBands = await window.ipcRenderer?.invoke('get-setting', 'eqBands');
        if (savedEqBands !== null && savedEqBands !== undefined) {
          setEqBandsState(savedEqBands);
        }

        const savedSpatial = await window.ipcRenderer?.invoke('get-setting', 'spatialAudioEnabled');
        if (savedSpatial !== null && savedSpatial !== undefined) {
          setSpatialAudioEnabledState(savedSpatial);
        }

        const savedSpatialMode = await window.ipcRenderer?.invoke('get-setting', 'spatialAudioMode');
        if (savedSpatialMode && ['off', 'audiophile', 'studio'].includes(savedSpatialMode)) {
          setSpatialAudioModeState(savedSpatialMode);
        } else if (savedSpatialMode) {
          setSpatialAudioModeState('audiophile');
        }

        const savedBass = await window.ipcRenderer?.invoke('get-setting', 'spatialBassBoost');
        if (savedBass !== null && savedBass !== undefined) {
          setSpatialBassBoostState(savedBass);
        }

        const savedVocal = await window.ipcRenderer?.invoke('get-setting', 'spatialVocalClarity');
        if (savedVocal !== null && savedVocal !== undefined) {
          setSpatialVocalClarityState(savedVocal);
        }

        const savedTube = await window.ipcRenderer?.invoke('get-setting', 'spatialTubeWarmth');
        if (savedTube !== null && savedTube !== undefined) {
          setSpatialTubeWarmthState(savedTube);
        }

        const savedWidth = await window.ipcRenderer?.invoke('get-setting', 'spatialWidth');
        if (savedWidth !== null && savedWidth !== undefined) {
          setSpatialWidthState(savedWidth);
        }

        const savedRoom = await window.ipcRenderer?.invoke('get-setting', 'spatialRoomSize');
        if (savedRoom && ['small', 'medium'].includes(savedRoom)) {
          setSpatialRoomSizeState(savedRoom);
        } else if (savedRoom) {
          setSpatialRoomSizeState('medium');
        }

        const savedGapless = await window.ipcRenderer?.invoke('get-setting', 'gaplessEnabled');
        if (savedGapless !== null && savedGapless !== undefined) {
          setGaplessEnabledState(savedGapless);
        }

        const savedCrossfade = await window.ipcRenderer?.invoke('get-setting', 'crossfadeDuration');
        if (savedCrossfade !== null && savedCrossfade !== undefined) {
          setCrossfadeDurationState(savedCrossfade);
        }
      } catch (e) {
        console.error('Failed to load playback settings from store:', e);
      }
    };
    loadSettings();
  }, []);

  const setAudioQuality = (quality: AudioQuality) => {
    setAudioQualityState(quality);
    debouncedSave('audioQuality', quality);
  };

  const setDownloadQuality = (quality: DownloadQuality) => {
    setDownloadQualityState(quality);
    debouncedSave('downloadQuality', quality);
  };

  const setAudioEngine = (engine: AudioEngine) => {
    setAudioEngineState(engine);
    debouncedSave('audioEngine', engine);
    console.log(`[Audio Engine] Switched to: ${engine}`);
  };

  const setAudioFormat = (format: AudioFormat) => {
    setAudioFormatState(format);
    debouncedSave('audioFormat', format);
  };

  const setDownloadFormat = (format: DownloadFormat) => {
    setDownloadFormatState(format);
    debouncedSave('downloadFormat', format);
  };

  const setAutoplayEnabled = (enabled: boolean) => {
    setAutoplayEnabledState(enabled);
    debouncedSave('autoplayEnabled', enabled);
  };

  const setNormalizeVolume = (enabled: boolean) => {
    setNormalizeVolumeState(enabled);
    debouncedSave('normalizeVolume', enabled);
  };

  const setLowDataMode = (enabled: boolean) => {
    setLowDataModeState(enabled);
    debouncedSave('lowDataMode', enabled);
  };

  const setMonoAudio = (enabled: boolean) => {
    setMonoAudioState(enabled);
    debouncedSave('monoAudio', enabled);
  };

  const setAudioDeviceId = (deviceId: string) => {
    setAudioDeviceIdState(deviceId);
    debouncedSave('audioDeviceId', deviceId); 
  };

  const setPlaybackSpeed = (speed: number) => {
    setPlaybackSpeedState(speed);
    debouncedSave('playbackSpeed', speed);
  };

  const setVolume = (v: number) => {
    setVolumeState(v);
    
    debouncedSave('volume', v, 300);
  };

  const setIsMuted = (muted: boolean) => {
    setIsMutedState(muted);
    debouncedSave('isMuted', muted);
  };

  const setEqEnabled = (enabled: boolean) => {
    setEqEnabledState(enabled);
    debouncedSave('eqEnabled', enabled);
  };

  const setEqBands = (bands: number[]) => {
    setEqBandsState(bands);
    debouncedSave('eqBands', bands);
  };

  const setSpatialAudioEnabled = (enabled: boolean) => {
    setSpatialAudioEnabledState(enabled);
    debouncedSave('spatialAudioEnabled', enabled);
  };

  const setSpatialAudioMode = (mode: 'off' | 'audiophile' | 'studio') => {
    setSpatialAudioModeState(mode);
    debouncedSave('spatialAudioMode', mode);
  };

  const setSpatialWidth = (width: number) => {
    setSpatialWidthState(width);
    debouncedSave('spatialWidth', width);
  };

  const setSpatialRoomSize = (size: 'small' | 'medium') => {
    setSpatialRoomSizeState(size);
    debouncedSave('spatialRoomSize', size);
  };

  const setSpatialBassBoost = (boost: number) => {
    setSpatialBassBoostState(boost);
    debouncedSave('spatialBassBoost', boost);
  };

  const setSpatialVocalClarity = (clarity: number) => {
    setSpatialVocalClarityState(clarity);
    debouncedSave('spatialVocalClarity', clarity);
  };

  const setSpatialTubeWarmth = (enabled: boolean) => {
    setSpatialTubeWarmthState(enabled);
    debouncedSave('spatialTubeWarmth', enabled);
  };

  const setGaplessEnabled = (enabled: boolean) => {
    setGaplessEnabledState(enabled);
    debouncedSave('gaplessEnabled', enabled);
  };

  const setCrossfadeDuration = (seconds: number) => {
    setCrossfadeDurationState(seconds);
    debouncedSave('crossfadeDuration', seconds);
  };

  return (
    <PlaybackContext.Provider value={{ 
        audioQuality, setAudioQuality, 
        downloadQuality, setDownloadQuality,
        audioEngine, setAudioEngine,
        audioFormat, setAudioFormat,
        downloadFormat, setDownloadFormat,
        autoplayEnabled, setAutoplayEnabled,
        normalizeVolume, setNormalizeVolume,
        lowDataMode, setLowDataMode,
        monoAudio, setMonoAudio,
        audioDeviceId, setAudioDeviceId,
        playbackSpeed, setPlaybackSpeed,
        volume, setVolume,
        isMuted, setIsMuted,
        eqEnabled, setEqEnabled,
        eqBands, setEqBands,
        spatialAudioEnabled, setSpatialAudioEnabled,
        spatialAudioMode, setSpatialAudioMode,
        spatialWidth, setSpatialWidth,
        spatialRoomSize, setSpatialRoomSize,
        spatialBassBoost, setSpatialBassBoost,
        spatialVocalClarity, setSpatialVocalClarity,
        spatialTubeWarmth, setSpatialTubeWarmth,
        gaplessEnabled, setGaplessEnabled,
        crossfadeDuration, setCrossfadeDuration
    }}>
      {children}
    </PlaybackContext.Provider>
  );
};

export const usePlayback = () => {
  const context = useContext(PlaybackContext);
  if (context === undefined) {
    throw new Error('usePlayback must be used within a PlaybackProvider');
  }
  return context;
};
