import React, { useEffect, useState } from 'react';
import './NowPlayingView.css';
import { useApi } from '../../context/ApiContext';
import { useLanguage } from '../../context/LanguageContext';

import { formatMonthlyListeners } from '../../utils/format';

interface ArtistInfo {
    name: string;
    image: string;
    monthlyListeners?: string;
    bio?: string;
    isVerified?: boolean;
}

import { usePlayer } from '../../context/PlayerContext';

const NowPlayingView: React.FC<{ 
    accessToken: string; 
    cookies: any; 
    isFullscreen?: boolean;
    onArtistSelect?: (id: string | null, name: string) => void;
    onPlaylistSelect?: (id: string, isAlbum?: boolean) => void;
}> = ({ accessToken, cookies: _cookies, isFullscreen, onArtistSelect, onPlaylistSelect }) => {
    const {
        currentTrack,
        showFullNowPlaying: isOpen,
        setShowFullNowPlaying,
        queue,
        shuffledQueue,
        isShuffle,
        handleTrackSelect
    } = usePlayer();

    const { t } = useLanguage();
    const api = useApi();
    const onClose = () => setShowFullNowPlaying(false);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen]);

    const [artistInfo, setArtistInfo] = useState<ArtistInfo | null>(null);


    const [canvasUrl, setCanvasUrl] = useState<string | null>(null);
    const [credits, setCredits] = useState<any[]>([]);
    const [creditFollowState, setCreditFollowState] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!currentTrack || !accessToken) return;

        const fetchInfo = async () => {
            setLoading(true);
            setArtistInfo(null);
            setCanvasUrl(null);
            setCredits([]);

            try {
                const gql = api;

                
                let artistId = currentTrack.artists?.[0]?.id;

                if (!artistId && currentTrack.id) {
                    
                    try {
                        const trackData = await gql.track.getTrack(currentTrack.id);
                        
                        if (trackData && trackData.firstArtist && trackData.firstArtist.items && trackData.firstArtist.items.length > 0) {
                            artistId = trackData.firstArtist.items[0].id; 
                        } else if (trackData && trackData.artists && trackData.artists.items && trackData.artists.items.length > 0) {
                            artistId = trackData.artists.items[0].id;
                        }
                    } catch (e) {
                        console.error("Failed to fetch track details for artist ID", e);
                    }
                }

                if (artistId) {
                    const artistData = await gql.artist.getArtist(artistId);
                    if (artistData) {
                        const profile = artistData.profile || {};
                        const stats = artistData.stats || {};
                        const visuals = artistData.visuals || {};

                        setArtistInfo({
                            name: profile.name || currentTrack.artist,
                            image: visuals.avatarImage?.sources?.[0]?.url || visuals.headerImage?.sources?.[0]?.url || '',
                            monthlyListeners: stats.monthlyListeners ? formatMonthlyListeners(stats.monthlyListeners) : undefined,
                            bio: profile.biography?.text || t('nowPlaying.noBio')
                        });
                    }
                }

                
                if (currentTrack.id) {
                    try {
                        const canvasData = await gql.track.getCanvas(currentTrack.id);
                        
                        const canvas = canvasData?.canvas || canvasData?.trackUnion?.canvas;
                        if (canvas && canvas.url) {
                            setCanvasUrl(canvas.url);
                        }
                    } catch (e) {
                        console.log("Track may not have a canvas available.");
                    }

                    try {
                        const creditsData = await gql.credits.getTrackCredits(currentTrack.id);
                        let contributors: any[] = [];
                        
                        const findCredits = (obj: any) => {
                            if (contributors.length > 0) return;
                            if (!obj || typeof obj !== 'object') return;
                            
                            if (obj.creditsTrait?.contributors?.items) {
                                contributors = obj.creditsTrait.contributors.items;
                                return;
                            }
                            if (Array.isArray(obj.roleCredits)) {
                                contributors = obj.roleCredits;
                                return;
                            }
                            Object.values(obj).forEach(findCredits);
                        };
                        
                        findCredits(creditsData);
                        
                        if (contributors.length > 0) {
                            let finalCredits: any[];
                            if (contributors[0].roleTitle) {
                                finalCredits = contributors;
                            } else {
                                const personGroups: Record<string, { uri?: string, roles: string[] }> = {};
                                contributors.forEach((c: any) => {
                                    const name = c.name;
                                    const role = c.role || c.roleGroup?.name || 'Other';
                                    if (!personGroups[name]) personGroups[name] = { uri: c.uri, roles: [] };
                                    if (!personGroups[name].roles.includes(role)) {
                                        personGroups[name].roles.push(role);
                                    }
                                });
                                
                                finalCredits = Object.entries(personGroups).map(([name, data]) => ({
                                    name,
                                    uri: data.uri,
                                    roles: data.roles
                                }));
                            }
                            setCredits(finalCredits);

                            const artistIds = finalCredits
                                .filter((p: any) => p.uri?.startsWith('spotify:artist:') && p.roles.some((r: string) => r.toLowerCase().includes('artist')))
                                .map((p: any) => p.uri.split(':')[2]);
                            if (artistIds.length > 0) {
                                try {
                                    const follows = await gql.user.isInLibrary(artistIds, { itemType: 'artist' });
                                    const state: Record<string, boolean> = {};
                                    artistIds.forEach((id: string, idx: number) => { state[id] = follows[idx]; });
                                    setCreditFollowState(state);
                                } catch (e) {
                                    console.error("Failed to fetch follow states for credits", e);
                                }
                            }
                        } else {
                            console.log("No credits found in response:", creditsData);
                        }
                    } catch (e) {
                        console.error("Failed to fetch track credits", e);
                    }
                }

            } catch (err) {
                console.error("NowPlaying fetch error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchInfo();
    }, [currentTrack?.id, accessToken]);


    const toggleCreditFollow = async (e: React.MouseEvent, person: any) => {
        e.stopPropagation();
        const artistId = person.uri?.split(':')[2];
        if (!artistId) return;
        const isFollowing = creditFollowState[artistId];
        try {
            if (isFollowing) {
                await api.artist.unfollow([artistId]);
            } else {
                await api.artist.follow([artistId]);
            }
            setCreditFollowState(prev => ({ ...prev, [artistId]: !isFollowing }));
        } catch (err) {
            console.error('[NowPlayingView] Failed to toggle follow:', err);
        }
    };

    const handleDescriptionClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const anchor = target.closest('a');
        if (anchor) {
            const href = anchor.getAttribute('href');
            if (href && href.startsWith('spotify:')) {
                e.preventDefault();
                const parts = href.split(':');
                const type = parts[1];
                const id = parts[2];
                if (type === 'playlist' || type === 'album') {
                    onPlaylistSelect?.(id, type === 'album');
                } else if (type === 'artist') {
                    onArtistSelect?.(id, '');                                         
                }
            }
        }
    };

    return (
        <div className={`now-playing-panel ${isFullscreen ? 'fullscreen' : ''} ${isFullscreen && isOpen ? 'open' : ''}`}>
            {isFullscreen && currentTrack && (
                <div 
                    className="fullscreen-bg" 
                    style={{ backgroundImage: `url(${currentTrack.albumArt})` }}
                />
            )}

            <div className="np-header">
                {isFullscreen && currentTrack ? (
                    <div className="np-header-track-info">
                        <div className="np-header-title" title={currentTrack.name}>{currentTrack.name}</div>
                        <div className="np-header-artist-container">
                            {currentTrack.artists && currentTrack.artists.length > 0 ? (
                                currentTrack.artists.map((artist: any, i: number, arr: any[]) => (
                                    <React.Fragment key={(artist.id || artist.name) + i}>
                                        <span 
                                            className="np-header-artist"
                                            onClick={() => onArtistSelect?.(artist.id, artist.name)}
                                            style={{ cursor: onArtistSelect ? 'pointer' : 'default' }}
                                        >
                                            {artist.name}
                                        </span>
                                        {i < arr.length - 1 && <span className="artist-separator">, </span>}
                                    </React.Fragment>
                                ))
                            ) : (
                                currentTrack.artist.split(', ').map((name: string, i: number, arr: string[]) => (
                                    <React.Fragment key={name + i}>
                                        <span 
                                            className="np-header-artist"
                                            onClick={() => onArtistSelect?.(null, name)}
                                            style={{ cursor: onArtistSelect ? 'pointer' : 'default' }}
                                        >
                                            {name}
                                        </span>
                                        {i < arr.length - 1 && <span className="artist-separator">, </span>}
                                    </React.Fragment>
                                ))
                            )}
                        </div>
                    </div>
                ) : (
                    <span className="np-header-title">
                        {currentTrack?.name || t('nowPlaying.title')}
                    </span>
                )}
            </div>


            {currentTrack ? (
                <div className={isFullscreen ? "fullscreen-content" : ""}>
                    <div className={isFullscreen ? "fullscreen-main-layout" : ""}>
                        <div className="np-visual-container">
                            {canvasUrl ? (
                                <video
                                    src={canvasUrl}
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    className="np-track-video"
                                />
                            ) : (
                                <img
                                    src={currentTrack.albumArt}
                                    alt={currentTrack.name}
                                    className="np-track-image"
                                />
                            )}
                        </div>
                        
                        <div className="np-details-column">
                            {!isFullscreen && (
                                <div className="np-track-info">
                                    <div className="np-track-title" title={currentTrack.name}>{currentTrack.name}</div>
                                    <div className="np-track-artist-container">
                                        {currentTrack.artists && currentTrack.artists.length > 0 ? (
                                            currentTrack.artists.map((artist: any, i: number, arr: any[]) => (
                                                <React.Fragment key={(artist.id || artist.name) + i}>
                                                    <span 
                                                        className="np-track-artist"
                                                        onClick={() => onArtistSelect?.(artist.id, artist.name)}
                                                        style={{ cursor: onArtistSelect ? 'pointer' : 'default' }}
                                                    >
                                                        {artist.name}
                                                    </span>
                                                    {i < arr.length - 1 && <span className="artist-separator">, </span>}
                                                </React.Fragment>
                                            ))
                                        ) : (
                                            currentTrack.artist.split(', ').map((name: string, i: number, arr: string[]) => (
                                                <React.Fragment key={name + i}>
                                                    <span 
                                                        className="np-track-artist"
                                                        onClick={() => onArtistSelect?.(null, name)}
                                                        style={{ cursor: onArtistSelect ? 'pointer' : 'default' }}
                                                    >
                                                        {name}
                                                    </span>
                                                    {i < arr.length - 1 && <span className="artist-separator">, </span>}
                                                </React.Fragment>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}



                            {}
                            <div className="np-section np-about-artist-section">
                                <div className="np-section-title">{t('nowPlaying.aboutArtist')}</div>
                                {loading ? (
                                    <div className="loading-skeleton" />
                                ) : artistInfo ? (
                                    <>
                                        {artistInfo.image && (
                                            <div className="np-artist-compact-card">
                                                <img src={artistInfo.image} alt={artistInfo.name} className="np-artist-avatar-full" />
                                                <div className="np-artist-compact-details">
                                                    <div className="np-artist-compact-name">{artistInfo.name}</div>
                                                    {artistInfo.monthlyListeners && (
                                                        <div className="np-monthly-listeners">
                                                            <span>{artistInfo.monthlyListeners} {t('nowPlaying.monthlyListeners')}</span>
                                                        </div>
                                                    )}
                                                    {currentTrack.albumName && (
                                                        <div 
                                                            className="np-artist-album-badge"
                                                            onClick={() => onPlaylistSelect?.(currentTrack.id, true)}
                                                            style={{ cursor: onPlaylistSelect ? 'pointer' : 'default' }}
                                                            title={currentTrack.albumName}
                                                        >
                                                            <img src={currentTrack.albumArt} alt="" className="np-badge-album-art" />
                                                            <span className="np-badge-album-title">{currentTrack.albumName}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        {artistInfo.bio && (
                                            <div
                                                className="np-artist-bio"
                                                dangerouslySetInnerHTML={{ __html: artistInfo.bio }}
                                                onClick={handleDescriptionClick}
                                            />
                                        )}
                                    </>
                                ) : (
                                    <div style={{ color: 'var(--text-dim)' }}>{t('nowPlaying.artistUnavailable')}</div>
                                )}
                            </div>



                            {credits.length > 0 && (
                                <div className="np-section np-spotify-credits-section">
                                    <div className="np-spotify-credits-header">
                                        <div className="np-section-title" style={{ marginBottom: 0 }}>{t('nowPlaying.credits')}</div>
                                    </div>
                                    <div className="np-spotify-credits-list">
                                        {credits.map((person, idx) => (
                                            <div key={idx} className="np-spotify-credit-item">
                                                <div className="np-spotify-credit-info">
                                                    <div className="np-spotify-credit-name" onClick={() => person.uri && person.uri.startsWith('spotify:artist:') ? onArtistSelect?.(person.uri.split(':')[2], person.name) : null} style={{ cursor: person.uri && person.uri.startsWith('spotify:artist:') ? 'pointer' : 'default' }}>{person.name}</div>
                                                    <div className="np-spotify-credit-roles">
                                                        {person.roles.join(' • ')}
                                                    </div>
                                                </div>
                                                {person.uri?.startsWith('spotify:artist:') && person.roles.some((r: string) => r.toLowerCase().includes('artist')) ? (
                                                    <button
                                                        className={`np-spotify-credit-follow${creditFollowState[person.uri.split(':')[2]] ? ' following' : ''}`}
                                                        onClick={(e) => toggleCreditFollow(e, person)}
                                                    >
                                                        {creditFollowState[person.uri.split(':')[2]] ? t('search.following') : t('search.follow')}
                                                    </button>
                                                ) : null}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {isFullscreen && (
                                <div className="np-section np-up-next-section">
                                    <div className="np-up-next-header">
                                        <div className="np-section-title" style={{ marginBottom: 0 }}>
                                            {t('queue.nextInQueue')}
                                        </div>
                                        {(isShuffle ? shuffledQueue : queue).length > 0 && (
                                            <span className="np-up-next-count">
                                                {(isShuffle ? shuffledQueue : queue).length} tracks
                                            </span>
                                        )}
                                    </div>

                                    <div className="np-up-next-list">
                                        {(isShuffle ? shuffledQueue : queue).length > 0 ? (
                                            (isShuffle ? shuffledQueue : queue).slice(0, 3).map((track, idx) => (
                                                <div 
                                                    key={(track.id || track.name) + idx} 
                                                    className="np-up-next-item"
                                                    onClick={() => handleTrackSelect(track, isShuffle ? shuffledQueue : queue, 'manual')}
                                                >
                                                    <img 
                                                        src={track.albumArt || ''} 
                                                        alt={track.name} 
                                                        className="np-up-next-art" 
                                                    />
                                                    <div className="np-up-next-info">
                                                        <div className="np-up-next-title" title={track.name}>{track.name}</div>
                                                        <div className="np-up-next-artist">{track.artist}</div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="np-up-next-empty">
                                                No upcoming tracks in queue
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (

                <div className="np-empty-state">
                    {t('nowPlaying.playTrack')}
                </div>
            )}

        </div>
    );
};

export default NowPlayingView;
