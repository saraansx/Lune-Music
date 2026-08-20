import React, { useEffect, useState } from 'react';
import './FloatingLyrics.css';
import { usePlayer } from '../../context/PlayerContext';
import { parseSyncedLyrics, LyricLine } from '../../services/lyrics/parser';
import { fetchLyricsSmart as fetchLyrics } from '../../services/lyricshelper';
import { ALBUM_PLACEHOLDER } from '../../constants/assets';

interface FloatingLyricsProps {
    onClose?: () => void;
}

const FloatingLyrics: React.FC<FloatingLyricsProps> = ({ onClose }) => {
    const { 
        currentTrack, 
        isPlaying, 
        setIsPlaying, 
        handleNextTrack, 
        handlePrevTrack,
        setShowLyrics
    } = usePlayer();

    const [lyrics, setLyrics] = useState<LyricLine[]>([]);
    const [isSynced, setIsSynced] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [loading, setLoading] = useState(false);
    const [showControls, setShowControls] = useState(false);
    const [showRomanized, setShowRomanized] = useState(true);
    const [isClosing, setIsClosing] = useState(false);
    const [position, setPosition] = useState({ x: Math.max(20, window.innerWidth / 2 - 280), y: Math.max(20, window.innerHeight - 150) });
    const [isDragging, setIsDragging] = useState(false);
    const dragOffset = React.useRef({ x: 0, y: 0 });

    const handleClose = () => {
        if (isClosing) return;
        setIsClosing(true);
        setTimeout(() => {
            onClose?.();
        }, 280);
    };

    useEffect(() => {
        const handleTimeUpdate = (e: Event) => {
            const customEvent = e as CustomEvent;
            if (customEvent.detail && typeof customEvent.detail.currentTime === 'number') {
                setCurrentTime(customEvent.detail.currentTime);
            }
        };
        window.addEventListener('luniq:timeupdate', handleTimeUpdate);
        return () => window.removeEventListener('luniq:timeupdate', handleTimeUpdate);
    }, []);

    useEffect(() => {
        if (!currentTrack) {
            setLyrics([]);
            return;
        }

        let isCancelled = false;
        const getLyrics = async () => {
            setLoading(true);
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
                console.warn('[FloatingLyrics] Failed to fetch lyrics:', err);
            } finally {
                if (!isCancelled) setLoading(false);
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
    const nextLine = (activeIndex >= 0 && activeIndex + 1 < lyrics.length) ? lyrics[activeIndex + 1] : null;

    const handleMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return;
        setIsDragging(true);
        dragOffset.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        };
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            const newX = Math.max(10, Math.min(window.innerWidth - 340, e.clientX - dragOffset.current.x));
            const newY = Math.max(10, Math.min(window.innerHeight - 90, e.clientY - dragOffset.current.y));
            setPosition({ x: newX, y: newY });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    const handleTogglePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsPlaying(!isPlaying);
    };

    const handleOpenFullLyrics = (e: React.MouseEvent) => {
        e.stopPropagation();
        handleClose();
        setShowLyrics(true);
    };

    return (
        <div 
            className={`floating-lyrics-pill ${isDragging ? 'is-dragging' : ''} ${showControls ? 'has-controls' : ''} ${isClosing ? 'is-closing' : ''}`}
            style={{ 
                left: `${position.x}px`, 
                top: `${position.y}px` 
            }}
            onMouseDown={handleMouseDown}
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
        >
            <div className="floating-lyrics-glow" />

            {/* Left Track Mini Thumbnail & Quick Play */}
            <div className="floating-lyrics-left">
                <div className="floating-art-wrapper" onClick={handleTogglePlay} title={isPlaying ? "Pause" : "Play"}>
                    <img 
                        src={currentTrack?.albumArt || ALBUM_PLACEHOLDER} 
                        alt="" 
                        className="floating-album-art"
                        draggable={false}
                    />
                    <div className="floating-art-overlay">
                        {isPlaying ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                            </svg>
                        ) : (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        )}
                    </div>
                </div>
            </div>

            {/* Lyrics Content Display */}
            <div className="floating-lyrics-content">
                {loading ? (
                    <div className="floating-line-active skeleton">
                        <span className="floating-dot-pulse">Fetching lyrics...</span>
                    </div>
                ) : currentLine ? (
                    <>
                        <div className="floating-line-active" title={currentLine.text}>
                            {currentLine.text}
                            {showRomanized && currentLine.romanizedText && (
                                <span className="floating-line-rom">{currentLine.romanizedText}</span>
                            )}
                        </div>
                        {nextLine && (
                            <div className="floating-line-next" title={nextLine.text}>
                                {nextLine.text}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="floating-line-active idle">
                        <span className="floating-track-title">{currentTrack?.name || 'Luniq Music'}</span>
                        <span className="floating-track-artist"> • {currentTrack?.artist || 'Enjoy the music'}</span>
                    </div>
                )}
            </div>

            {/* Hover Action Strip */}
            <div className={`floating-lyrics-actions ${showControls ? 'visible' : ''}`}>
                <button 
                    className="floating-action-btn" 
                    onClick={(e) => { e.stopPropagation(); handlePrevTrack(); }} 
                    title="Previous Track"
                >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                    </svg>
                </button>
                <button 
                    className="floating-action-btn" 
                    onClick={(e) => { e.stopPropagation(); handleNextTrack(); }} 
                    title="Next Track"
                >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                    </svg>
                </button>
                <button 
                    className={`floating-action-btn ${showRomanized ? 'active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); setShowRomanized(!showRomanized); }}
                    title="Toggle Romanized Lyrics"
                >
                    <span style={{ fontSize: '10px', fontWeight: 700 }}>Aa</span>
                </button>
                <button 
                    className="floating-action-btn" 
                    onClick={handleOpenFullLyrics}
                    title="Open Full Lyrics"
                >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 3h6v6" />
                        <path d="M9 21H3v-6" />
                        <path d="M21 3l-7 7" />
                        <path d="M3 21l7-7" />
                    </svg>
                </button>
                <button 
                    className="floating-action-btn close-pill" 
                    onClick={(e) => { e.stopPropagation(); handleClose(); }}
                    title="Close Floating Lyrics"
                >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default FloatingLyrics;
