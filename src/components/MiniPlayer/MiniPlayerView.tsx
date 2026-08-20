import React, { useState, useEffect } from 'react';
import './MiniPlayerView.css';
import { usePlayer } from '../../context/PlayerContext';
import { ALBUM_PLACEHOLDER } from '../../constants/assets';
import { formatSeconds } from '../../utils/format';

import { parseSyncedLyrics, LyricLine } from '../../services/lyrics/parser';
import { fetchLyricsSmart as fetchLyrics } from '../../services/lyricshelper';

interface MiniPlayerViewProps {
    onArtistSelect?: (id: string | null, name: string) => void;
}

const MiniPlayerView: React.FC<MiniPlayerViewProps> = ({ onArtistSelect }) => {
    const {
        currentTrack,
        isPlaying,
        setIsPlaying,
        handleNextTrack,
        handlePrevTrack,
    } = usePlayer();

    const initialDuration = currentTrack?.durationMs ? currentTrack.durationMs / 1000 : 0;
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(initialDuration);
    const [progress, setProgress] = useState(0);
    const [isFavorite, setIsFavorite] = useState(false);
    const [showLyricsMode, setShowLyricsMode] = useState(false);
    const [lyrics, setLyrics] = useState<LyricLine[]>([]);
    const [isSynced, setIsSynced] = useState(false);
    const [lyricsLoading, setLyricsLoading] = useState(false);

    useEffect(() => {
        if (!currentTrack) {
            setLyrics([]);
            return;
        }

        let isCancelled = false;
        const getLyrics = async () => {
            setLyricsLoading(true);
            setLyrics([]);
            setIsSynced(false);

            try {
                const data = await fetchLyrics(
                    currentTrack.name,
                    currentTrack.artist,
                    currentTrack.durationMs ? currentTrack.durationMs / 1000 : undefined,
                    undefined,
                    currentTrack.id
                );

                if (isCancelled) return;

                if (data) {
                    if (data.syncedLyrics) {
                        const mainLines = parseSyncedLyrics(data.syncedLyrics);
                        const romLines = data.romanizedLyrics ? parseSyncedLyrics(data.romanizedLyrics) : [];
                        const merged = mainLines.map(line => {
                            const matchingRom = romLines.find(r => Math.abs(r.time - line.time) < 0.8);
                            const hasNonLatin = /[^\x00-\x7F]/.test(line.text);
                            return {
                                ...line,
                                romanizedText: (hasNonLatin && matchingRom && matchingRom.text !== line.text) ? matchingRom.text : undefined
                            };
                        });
                        setLyrics(merged);
                        setIsSynced(true);
                    } else if (data.plainLyrics) {
                        const mainLines = data.plainLyrics.split('\n');
                        const romLines = data.romanizedLyrics ? data.romanizedLyrics.split('\n') : [];
                        const merged = mainLines.map((text, idx) => {
                            const matchingRom = romLines[idx];
                            const hasNonLatin = /[^\x00-\x7F]/.test(text);
                            return {
                                time: 0,
                                text,
                                romanizedText: (hasNonLatin && matchingRom && matchingRom !== text) ? matchingRom : undefined
                            };
                        });
                        setLyrics(merged);
                        setIsSynced(false);
                    }
                }
            } catch (err) {
                console.warn('[MiniPlayer] Failed to load lyrics:', err);
            } finally {
                if (!isCancelled) setLyricsLoading(false);
            }
        };

        getLyrics();
        return () => { isCancelled = true; };
    }, [currentTrack?.id]);

    let activeIndex = -1;
    if (isSynced && lyrics.length > 0) {
        for (let i = 0; i < lyrics.length; i++) {
            if (currentTime >= lyrics[i].time) {
                activeIndex = i;
            } else {
                break;
            }
        }
    }

    const currentLine = activeIndex >= 0 ? lyrics[activeIndex] : null;

    useEffect(() => {
        if (currentTrack?.durationMs) {
            setDuration(currentTrack.durationMs / 1000);
        }
    }, [currentTrack?.id, currentTrack?.durationMs]);

    useEffect(() => {
        const handleTimeUpdate = (e: Event) => {
            const customEvent = e as CustomEvent;
            if (customEvent.detail) {
                const cur = customEvent.detail.currentTime || 0;
                const dur = customEvent.detail.duration || (currentTrack?.durationMs ? currentTrack.durationMs / 1000 : 0);
                setCurrentTime(cur);
                if (dur > 0) {
                    setDuration(dur);
                    setProgress(Math.min(100, Math.max(0, (cur / dur) * 100)));
                }
            }
        };

        window.addEventListener('luniq:timeupdate', handleTimeUpdate);
        window.dispatchEvent(new CustomEvent('luniq:query-time'));

        return () => window.removeEventListener('luniq:timeupdate', handleTimeUpdate);
    }, [currentTrack?.durationMs]);

    useEffect(() => {
        if (!currentTrack?.id) {
            setIsFavorite(false);
            return;
        }
        window.ipcRenderer?.invoke('check-local-favorite', currentTrack.id)
            .then(fav => setIsFavorite(fav))
            .catch(() => {});
    }, [currentTrack?.id]);

    const handleTogglePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsPlaying(!isPlaying);
    };

    const handleNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        handleNextTrack();
    };

    const handlePrev = (e: React.MouseEvent) => {
        e.stopPropagation();
        handlePrevTrack(currentTime);
    };

    const handleToggleFavorite = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!currentTrack) return;
        try {
            if (isFavorite) {
                await window.ipcRenderer.invoke('remove-local-favorite', currentTrack.id);
                setIsFavorite(false);
            } else {
                await window.ipcRenderer.invoke('add-local-favorite', currentTrack);
                setIsFavorite(true);
            }
            window.dispatchEvent(new Event('luniq:favorites-update'));
        } catch (err) {
            console.error('[MiniPlayer] Toggle favorite error:', err);
        }
    };

    const handleExitMiniPlayer = (e: React.MouseEvent) => {
        e.stopPropagation();
        window.ipcRenderer?.invoke('exit-mini-player');
    };

    const handleCloseApp = (e: React.MouseEvent) => {
        e.stopPropagation();
        window.ipcRenderer?.invoke('close-window');
    };

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        if (!duration || duration <= 0) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const clickPos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const seekTime = clickPos * duration;
        
        window.dispatchEvent(new CustomEvent('luniq:request-seek', {
            detail: { time: seekTime }
        }));
    };

    return (
        <div className="mini-player-container">
            {/* Background Blur Artwork */}
            {currentTrack?.albumArt && (
                <div 
                    className="mini-player-bg" 
                    style={{ backgroundImage: `url(${currentTrack.albumArt})` }}
                />
            )}

            {/* Top Draggable Bar */}
            <div className="mini-player-drag-bar">
                <div className="mini-player-logo">LUNIQ</div>
                <div className="mini-player-window-actions">
                    <button 
                        className={`mini-win-btn ${showLyricsMode ? 'active' : ''}`}
                        onClick={() => setShowLyricsMode(!showLyricsMode)}
                        title={showLyricsMode ? "Show Track Info" : "Show Karaoke Lyrics"}
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 18V5l12-2v13"></path>
                            <circle cx="6" cy="18" r="3"></circle>
                            <circle cx="18" cy="16" r="3"></circle>
                        </svg>
                    </button>
                    <button 
                        className="mini-win-btn expand" 
                        onClick={handleExitMiniPlayer} 
                        title="Expand to Full Player"
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <polyline points="9 21 3 21 3 15"></polyline>
                            <line x1="21" y1="3" x2="14" y2="10"></line>
                            <line x1="3" y1="21" x2="10" y2="14"></line>
                        </svg>
                    </button>
                    <button 
                        className="mini-win-btn close" 
                        onClick={handleCloseApp} 
                        title="Close"
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="mini-player-content">
                {/* Album Thumbnail */}
                <div className="mini-art-wrapper" onClick={handleTogglePlay}>
                    <img 
                        src={currentTrack?.albumArt || ALBUM_PLACEHOLDER} 
                        alt="" 
                        className="mini-art-image" 
                    />
                    <div className="mini-art-overlay">
                        {isPlaying ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path>
                            </svg>
                        ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z"></path>
                            </svg>
                        )}
                    </div>
                </div>

                {/* Track Details & Controls */}
                <div className="mini-track-col">
                    <div className="mini-info-row">
                        {showLyricsMode ? (
                            <div className="mini-text-wrap mini-lyrics-wrap">
                                {lyricsLoading ? (
                                    <div className="mini-lyrics-active skeleton">Fetching lyrics...</div>
                                ) : currentLine ? (
                                    <div className="mini-lyrics-active" title={currentLine.text}>
                                        <span className="mini-lyrics-pill-icon">🎤</span> {currentLine.text}
                                    </div>
                                ) : (
                                    <div className="mini-lyrics-active idle">
                                        {currentTrack?.name || 'No Lyrics Available'}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="mini-text-wrap">
                                <div className="mini-track-title" title={currentTrack?.name || 'No Track Playing'}>
                                    {currentTrack?.name || 'No Track Playing'}
                                </div>
                                <div 
                                    className="mini-track-artist" 
                                    title={currentTrack?.artist || 'Unknown Artist'}
                                    onClick={() => currentTrack?.artists?.[0]?.id && onArtistSelect?.(currentTrack.artists[0].id, currentTrack.artists[0].name)}
                                >
                                    {currentTrack?.artist || 'Unknown Artist'}
                                </div>
                            </div>
                        )}

                        {currentTrack && !showLyricsMode && (
                            <button 
                                className={`mini-btn-fav ${isFavorite ? 'active' : ''}`}
                                onClick={handleToggleFavorite}
                                title={isFavorite ? "Remove from Favorites" : "Save to Favorites"}
                            >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                                </svg>
                            </button>
                        )}
                    </div>

                    {/* Compact Controls Row */}
                    <div className="mini-controls-row">
                        <div className="mini-time-text">
                            {formatSeconds(currentTime)} / {formatSeconds(duration)}
                        </div>

                        <div className="mini-actions">
                            <button className="mini-ctrl-btn" onClick={handlePrev} title="Previous Track">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"></path>
                                </svg>
                            </button>
                            <button className="mini-ctrl-btn play-main" onClick={handleTogglePlay} title={isPlaying ? "Pause" : "Play"}>
                                {isPlaying ? (
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path>
                                    </svg>
                                ) : (
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M8 5v14l11-7z"></path>
                                    </svg>
                                )}
                            </button>
                            <button className="mini-ctrl-btn" onClick={handleNext} title="Next Track">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Seamless Progress Scrubber */}
            <div className="mini-progress-track" onClick={handleSeek} title="Click to seek">
                <div 
                    className="mini-progress-bar" 
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
};

export default MiniPlayerView;
