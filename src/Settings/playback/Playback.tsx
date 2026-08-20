import React, { useState, useRef, useEffect } from 'react';
import './Playback.css';
import { useLanguage } from '../../context/LanguageContext';
import { usePlayback, AudioQuality, DownloadQuality, AudioEngine } from '../../context/PlaybackContext';

interface DropdownProps {
    label: string;
    subLabel: string;
    options: { value: string; label: string }[];
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
}

const CustomDropdown: React.FC<DropdownProps> = ({ label, subLabel, options, value, onChange, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const selectedOption = options.find(opt => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div 
            className="settings-row custom-dropdown-container" 
            ref={dropdownRef}
            style={{ position: 'relative', zIndex: isOpen ? 'var(--z-float)' : 'var(--z-base)' }}
        >
            <div className="row-info">
                <span className="row-label">{label}</span>
                <span className="row-sub">{subLabel}</span>
            </div>
            <div className={`dropdown-wrapper ${disabled ? 'disabled' : ''}`}>
                <button 
                    className={`dropdown-trigger ${isOpen ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
                    onClick={() => {
                        if (!disabled) setIsOpen(!isOpen);
                    }}
                    disabled={disabled}
                    style={disabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                >
                    <span>{selectedOption?.label || value}</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`chevron ${isOpen ? 'up' : ''}`}>
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </button>
                {isOpen && !disabled && (
                    <div className="dropdown-menu">
                        {options.map(option => (
                            <div 
                                key={option.value}
                                className={`dropdown-item ${option.value === value ? 'selected' : ''}`}
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                            >
                                {option.label}
                                {option.value === value && (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

interface PlaybackProps {
    accessToken?: string;
}

const Playback: React.FC<PlaybackProps> = ({ accessToken }) => {
    const { t } = useLanguage();
    const isSpotifyLoggedIn = !!accessToken;
    const { 
        audioQuality, setAudioQuality, 
        downloadQuality, setDownloadQuality,
        audioEngine, setAudioEngine,
        autoplayEnabled, setAutoplayEnabled,
        normalizeVolume, setNormalizeVolume,
        lowDataMode, setLowDataMode,
        monoAudio, setMonoAudio,
        audioDeviceId, setAudioDeviceId,
        playbackSpeed, setPlaybackSpeed,
        eqEnabled, setEqEnabled,
        spatialAudioEnabled, setSpatialAudioEnabled,
        spatialAudioMode, setSpatialAudioMode,
        spatialWidth, setSpatialWidth,
        spatialRoomSize, setSpatialRoomSize,
        spatialBassBoost, setSpatialBassBoost,
        spatialVocalClarity, setSpatialVocalClarity,
        spatialTubeWarmth, setSpatialTubeWarmth,
        gaplessEnabled, setGaplessEnabled,
        crossfadeDuration, setCrossfadeDuration
    } = usePlayback();

    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

    useEffect(() => {
        const fetchDevices = async () => {
            try {
                const allDevices = await navigator.mediaDevices.enumerateDevices();
                const audioOutputs = allDevices.filter(device => device.kind === 'audiooutput');
                setDevices(audioOutputs);
            } catch (err) {
                console.error('Failed to fetch audio output devices:', err);
            }
        };

        fetchDevices();
        
        
        navigator.mediaDevices.ondevicechange = fetchDevices;
        return () => {
            navigator.mediaDevices.ondevicechange = null;
        };
    }, []);

    const DEVICE_OPTIONS = devices.map(d => ({
        value: d.deviceId,
        label: d.label || (d.deviceId === 'default' ? 'Default' : `Device ${d.deviceId.slice(0, 5)}...`)
    }));

    if (DEVICE_OPTIONS.length === 0 || !DEVICE_OPTIONS.find(o => o.value === 'default')) {
        DEVICE_OPTIONS.unshift({ value: 'default', label: 'System Default' });
    }

    const AUDIO_QUALITIES: { value: AudioQuality; label: string }[] = [
        { value: '96', label: `96 ${t('playback.kbps')}` },
        { value: '128', label: `128 ${t('playback.kbps')}` },
        { value: '256', label: `256 ${t('playback.kbps')}` },
        { value: '320', label: `320 ${t('playback.kbps')}` }
    ];

    const AUDIO_ENGINES: { value: AudioEngine; label: string }[] = [
        { value: 'youtubei', label: t('playback.engineYoutubei') },
        { value: 'ytdlp', label: t('playback.engineYtdlp') },
        { value: 'lavalink', label: t('playback.engineLavalink') || 'Lavalink (Guest / Cloud)' }
    ];
    
    const DOWNLOAD_QUALITIES: { value: DownloadQuality; label: string }[] = [
        { value: '96', label: `96 ${t('playback.kbps')}` },
        { value: '128', label: `128 ${t('playback.kbps')}` },
        { value: '256', label: `256 ${t('playback.kbps')}` },
        { value: '320', label: `320 ${t('playback.kbps')}` }
    ];


    const SPEED_OPTIONS = [
        { value: '0.5', label: '0.5x' },
        { value: '0.75', label: '0.75x' },
        { value: '1', label: '1.0x (Normal)' },
        { value: '1.25', label: '1.25x' },
        { value: '1.5', label: '1.5x' },
        { value: '2', label: '2.0x' }
    ];

    return (
        <div className="settings-language-card" style={{ position: 'relative' }}>
            <div className="settings-account-header">
                <h2 className="settings-account-title">{t('playback.title')}</h2>
                <p className="settings-account-description">{t('playback.sub')}</p>
            </div>

            <div className="language-content">
                {isSpotifyLoggedIn && (
                    <CustomDropdown 
                        label={t('playback.audioEngine')}
                        subLabel={t('playback.audioEngineSub')}
                        options={AUDIO_ENGINES}
                        value={audioEngine}
                        onChange={(val) => setAudioEngine(val as AudioEngine)}
                    />
                )}

                <CustomDropdown 
                    label={t('playback.audioQuality')}
                    subLabel={t('playback.audioQualitySub')}
                    options={AUDIO_QUALITIES}
                    value={lowDataMode ? '96' : audioQuality}
                    onChange={(val) => setAudioQuality(val as AudioQuality)}
                    disabled={lowDataMode}
                />

                <CustomDropdown 
                    label={t('playback.downloadQuality')}
                    subLabel={t('playback.downloadQualitySub')}
                    options={DOWNLOAD_QUALITIES}
                    value={downloadQuality}
                    onChange={(val) => setDownloadQuality(val as DownloadQuality)}
                />

                <div className="settings-row" style={{ marginTop: '4px' }}>
                    <div className="row-info" style={{ gap: '4px' }}>
                        <span className="row-label">{t('playback.autoplay')}</span>
                        <span className="row-sub">{t('playback.autoplaySub')}</span>
                    </div>
                    <label className="luniq-switch">
                        <input 
                            type="checkbox" 
                            checked={autoplayEnabled} 
                            onChange={(e) => setAutoplayEnabled(e.target.checked)} 
                        />
                        <span className="luniq-switch-slider"></span>
                    </label>
                </div>

                <div className="settings-row" style={{ marginTop: '4px' }}>
                    <div className="row-info" style={{ gap: '4px' }}>
                        <span className="row-label">{t('playback.normalize')}</span>
                        <span className="row-sub">{t('playback.normalizeSub')}</span>
                    </div>
                    <label className="luniq-switch">
                        <input 
                            type="checkbox" 
                            checked={normalizeVolume} 
                            onChange={(e) => setNormalizeVolume(e.target.checked)} 
                        />
                        <span className="luniq-switch-slider"></span>
                    </label>
                </div>

                <div className="settings-row" style={{ marginTop: '4px' }}>
                    <div className="row-info" style={{ gap: '4px' }}>
                        <span className="row-label">{t('playback.lowData')}</span>
                        <span className="row-sub">{t('playback.lowDataSub')}</span>
                    </div>
                    <label className="luniq-switch">
                        <input 
                            type="checkbox" 
                            checked={lowDataMode} 
                            onChange={(e) => setLowDataMode(e.target.checked)} 
                        />
                        <span className="luniq-switch-slider"></span>
                    </label>
                </div>

                <div className="settings-row" style={{ marginTop: '4px' }}>
                    <div className="row-info" style={{ gap: '4px' }}>
                        <span className="row-label">{t('playback.mono') || 'Mono Audio'}</span>
                        <span className="row-sub">{t('playback.monoSub') || 'Combines the left and right audio channels into one.'}</span>
                    </div>
                    <label className="luniq-switch">
                        <input 
                            type="checkbox" 
                            checked={monoAudio} 
                            onChange={(e) => setMonoAudio(e.target.checked)} 
                        />
                        <span className="luniq-switch-slider"></span>
                    </label>
                </div>

                <div className="settings-row" style={{ marginTop: '4px' }}>
                    <div className="row-info" style={{ gap: '4px' }}>
                        <span className="row-label">{t('playback.equalizer') || 'Equalizer'}</span>
                        <span className="row-sub">{t('playback.equalizerSub') || 'Fine-tune your audio with custom frequency bands.'}</span>
                    </div>
                    <label className="luniq-switch">
                        <input 
                            type="checkbox" 
                            checked={eqEnabled} 
                            onChange={(e) => setEqEnabled(e.target.checked)} 
                        />
                        <span className="luniq-switch-slider"></span>
                    </label>
                </div>

                <div className="settings-row" style={{ marginTop: '4px' }}>
                    <div className="row-info" style={{ gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="row-label">{t('playback.gapless') || 'True Gapless Playback'}</span>
                            <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.1)', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>0ms Gap</span>
                        </div>
                        <span className="row-sub">{t('playback.gaplessSub') || 'Pre-buffers upcoming audio to eliminate silent pauses between consecutive album tracks.'}</span>
                    </div>
                    <label className="luniq-switch">
                        <input 
                            type="checkbox" 
                            checked={gaplessEnabled} 
                            onChange={(e) => setGaplessEnabled(e.target.checked)} 
                        />
                        <span className="luniq-switch-slider"></span>
                    </label>
                </div>

                <div className="settings-row" style={{ marginTop: '4px' }}>
                    <div className="row-info" style={{ gap: '4px' }}>
                        <span className="row-label">{t('playback.crossfade') || 'Audio Crossfade Matrix'}</span>
                        <span className="row-sub">{t('playback.crossfadeSub') || 'Seamlessly blend the ending of one song into the beginning of the next (0s to 12s).'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input 
                            type="range" 
                            min="0" 
                            max="12" 
                            step="1"
                            value={crossfadeDuration} 
                            onChange={(e) => setCrossfadeDuration(Number(e.target.value))}
                            style={{ width: '120px', accentColor: 'var(--accent-main)', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '13px', fontWeight: 600, minWidth: '42px', color: 'var(--accent-main)' }}>
                            {crossfadeDuration === 0 ? 'Off (0s)' : `${crossfadeDuration}s`}
                        </span>
                    </div>
                </div>

                <div className="settings-row" style={{ marginTop: '4px' }}>
                    <div className="row-info" style={{ gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="row-label">{t('playback.spatialAudio') || 'Luniq 3D Spatial Audio & Acoustic DSP'}</span>
                            <span style={{ fontSize: '10px', background: 'var(--accent-main)', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>DTS/HRIR</span>
                        </div>
                        <span className="row-sub">{t('playback.spatialAudioSub') || 'Binaural 3D room simulation, dynamic sub-bass, and acoustic impulse response convolution.'}</span>
                    </div>
                    <label className="luniq-switch">
                        <input 
                            type="checkbox" 
                            checked={spatialAudioEnabled} 
                            onChange={(e) => setSpatialAudioEnabled(e.target.checked)} 
                        />
                        <span className="luniq-switch-slider"></span>
                    </label>
                </div>

                {spatialAudioEnabled && (
                    <>
                        <CustomDropdown 
                            label={t('playback.spatialMode') || 'Acoustic Soundstage'}
                            subLabel={t('playback.spatialModeSub') || 'Choose binaural room model / DTS sound profile.'}
                            options={[
                                { value: 'dts3d', label: 'DTS:X 3D Headphone' },
                                { value: 'surround71', label: '7.1 Cinema Surround Sound' },
                                { value: 'audiophile', label: 'Audiophile Hi-Fi Reference' },
                                { value: 'concert', label: 'Concert Arena Hall' },
                                { value: 'studio', label: 'Mastering Studio' },
                                { value: 'club', label: 'Club Deep Bass' }
                            ]}
                            value={spatialAudioMode}
                            onChange={(val) => setSpatialAudioMode(val as any)}
                        />

                        <CustomDropdown 
                            label={t('playback.roomSize') || 'Virtual Acoustic Space'}
                            subLabel={t('playback.roomSizeSub') || 'Scale the physical acoustic dimension of the virtual room.'}
                            options={[
                                { value: 'small', label: 'Intimate Studio Room' },
                                { value: 'medium', label: 'Acoustic Living Room' },
                                { value: 'large', label: 'Cinema Theatre Space' },
                                { value: 'arena', label: 'Stadium Arena' }
                            ]}
                            value={spatialRoomSize}
                            onChange={(val) => setSpatialRoomSize(val as any)}
                        />

                        <div className="settings-row" style={{ marginTop: '4px' }}>
                            <div className="row-info" style={{ gap: '4px' }}>
                                <span className="row-label">{t('playback.soundstageWidth') || 'Soundstage Panoramic Width'}</span>
                                <span className="row-sub">{t('playback.soundstageWidthSub') || 'Expands the 3D stereo separation field (100% to 200%).'}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <input 
                                    type="range" 
                                    min="1.0" 
                                    max="2.0" 
                                    step="0.1"
                                    value={spatialWidth} 
                                    onChange={(e) => setSpatialWidth(Number(e.target.value))}
                                    style={{ width: '120px', accentColor: 'var(--accent-main)', cursor: 'pointer' }}
                                />
                                <span style={{ fontSize: '13px', fontWeight: 600, minWidth: '42px', color: 'var(--accent-main)' }}>{Math.round(spatialWidth * 100)}%</span>
                            </div>
                        </div>

                        <div className="settings-row" style={{ marginTop: '4px' }}>
                            <div className="row-info" style={{ gap: '4px' }}>
                                <span className="row-label">{t('playback.tubeWarmth') || 'Analog Vacuum Tube Warmth'}</span>
                                <span className="row-sub">{t('playback.tubeWarmthSub') || 'Emulates analog triode tube saturation and rich 2nd-order harmonics (inspired by ViPER4Android/JamesDSP).'}</span>
                            </div>
                            <label className="luniq-switch">
                                <input 
                                    type="checkbox" 
                                    checked={spatialTubeWarmth} 
                                    onChange={(e) => setSpatialTubeWarmth(e.target.checked)} 
                                />
                                <span className="luniq-switch-slider"></span>
                            </label>
                        </div>

                        <div className="settings-row" style={{ marginTop: '4px' }}>
                            <div className="row-info" style={{ gap: '4px' }}>
                                <span className="row-label">{t('playback.bassBoost') || 'Dynamic Sub-Bass Sculptor'}</span>
                                <span className="row-sub">{t('playback.bassBoostSub') || 'Enhance low-end punch without digital clipping (+0 to +12 dB).'}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <input 
                                    type="range" 
                                    min="0" 
                                    max="12" 
                                    step="1"
                                    value={spatialBassBoost} 
                                    onChange={(e) => setSpatialBassBoost(Number(e.target.value))}
                                    style={{ width: '120px', accentColor: 'var(--accent-main)', cursor: 'pointer' }}
                                />
                                <span style={{ fontSize: '13px', fontWeight: 600, minWidth: '42px', color: 'var(--accent-main)' }}>+{spatialBassBoost} dB</span>
                            </div>
                        </div>

                        <div className="settings-row" style={{ marginTop: '4px' }}>
                            <div className="row-info" style={{ gap: '4px' }}>
                                <span className="row-label">{t('playback.vocalClarity') || 'Vocal & Dialogue Clarity'}</span>
                                <span className="row-sub">{t('playback.vocalClaritySub') || 'Boost lyrical frequency presence in songs (+0 to +8 dB).'}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <input 
                                    type="range" 
                                    min="0" 
                                    max="8" 
                                    step="1"
                                    value={spatialVocalClarity} 
                                    onChange={(e) => setSpatialVocalClarity(Number(e.target.value))}
                                    style={{ width: '120px', accentColor: 'var(--accent-main)', cursor: 'pointer' }}
                                />
                                <span style={{ fontSize: '13px', fontWeight: 600, minWidth: '42px', color: 'var(--accent-main)' }}>+{spatialVocalClarity} dB</span>
                            </div>
                        </div>
                    </>
                )}

                <CustomDropdown 
                    label={t('playback.outputDevice') || 'Output Device'}
                    subLabel={t('playback.outputDeviceSub') || 'Choose which speakers or headphones to play music from.'}
                    options={DEVICE_OPTIONS}
                    value={audioDeviceId}
                    onChange={(val) => setAudioDeviceId(val)}
                />

                <CustomDropdown 
                    label={t('playback.speed') || 'Playback Speed'}
                    subLabel={t('playback.speedSub') || 'Adjust how fast the music plays.'}
                    options={SPEED_OPTIONS}
                    value={String(playbackSpeed)}
                    onChange={(val) => setPlaybackSpeed(parseFloat(val))}
                />
            </div>
        </div>
    );
};

export default Playback;
