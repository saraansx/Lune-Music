import { useState, useEffect, useRef } from 'react';
import './SearchView.css';
import { useApi, useYtApi } from '../../context/ApiContext';
import { usePlayer } from '../../context/PlayerContext';
import { useLanguage } from '../../context/LanguageContext';
import { normalizeTrack, LuniqTrack } from '../../types/track';
import { formatDuration } from '../../utils/format';
import { ARTIST_PLACEHOLDER, ALBUM_PLACEHOLDER } from '../../constants/assets';
import { usePlayback } from '../../context/PlaybackContext';
import { DownloadIndicator } from '../DownloadIndicator/DownloadIndicator';

interface SearchViewProps {
    query: string;
    accessToken: string;
    cookies: any[];
    onTrackViewSelect: (track: any) => void;
    onArtistSelect: (id: string) => void;
    onPlaylistSelect: (id: string, isAlbum?: boolean) => void;
}


const SearchView = ({
    query,
    accessToken: _accessToken,
    cookies: _cookies,
    onTrackViewSelect,
    onArtistSelect,
    onPlaylistSelect
}: SearchViewProps) => {
    const { 
        handleTrackSelect: onTrackSelect,
        handleAddToQueue: onAddToQueue,
        handlePlayNext: onPlayNext
    } = usePlayer();
    const { lowDataMode } = usePlayback();
    const { t } = useLanguage();
    const [results, setResults] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState('all');
    const [followingState, setFollowingState] = useState<Record<string, boolean>>({});
    
    
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const sentinelRef = useRef<HTMLDivElement>(null);
    const lastQueryRef = useRef(query);
    
    
    const [menuTrackId, setMenuTrackId] = useState<string | null>(null);
    const [menuPosition, setMenuPosition] = useState<{ x: number, y: number, isBottom: boolean } | null>(null);
    const [menuFavoriteState, setMenuFavoriteState] = useState<boolean | null>(null);
    const [menuDownloadState, setMenuDownloadState] = useState<boolean | null>(null);
    const [localPlaylists, setLocalPlaylists] = useState<any[]>([]);
    const [trackPlaylists, setTrackPlaylists] = useState<string[]>([]);
    const [showPlaylistSubmenu, setShowPlaylistSubmenu] = useState(false);
    const trackMenuRef = useRef<HTMLDivElement>(null);

    const api = useApi();
    const ytApi = useYtApi();

    useEffect(() => {
        const fetchResults = async () => {
            const isNewQuery = query !== lastQueryRef.current;
            lastQueryRef.current = query;

            if (isNewQuery) {
                setResults(null);
                setOffset(0);
                setHasMore(true);
            }
            
            setLoading(true);
            setError(null);

            try {
                if (activeFilter === 'all') {
                    const [res, ytRes] = await Promise.all([
                        api.search.all(query, { limit: 40, topResults: 5 }),
                        ytApi.search.query(query).catch(() => [])
                    ]);
                    
                    if (res && ytRes && ytRes.length > 0) {
                        res.tracks = [...res.tracks, ...ytRes] as any;
                    }
                    
                    setResults(res);
                } else {
                    let res: any;
                    let ytRes: any = [];
                    switch (activeFilter) {
                        case 'songs':
                            [res, ytRes] = await Promise.all([
                                api.search.tracks(query, { limit: 50 }),
                                ytApi.search.query(query).catch(() => [])
                            ]);
                            setResults((prev: any) => ({ ...prev, tracks: [...res.items, ...ytRes] }));
                            break;
                        case 'artists':
                            res = await api.search.artists(query, { limit: 50 });
                            setResults((prev: any) => ({ ...prev, artists: res.items }));
                            break;
                        case 'albums':
                            res = await api.search.albums(query, { limit: 50 });
                            setResults((prev: any) => ({ ...prev, albums: res.items }));
                            break;
                        case 'playlists':
                            res = await api.search.playlists(query, { limit: 50 });
                            setResults((prev: any) => ({ ...prev, playlists: res.items }));
                            break;
                    }
                }

                
                
                
            } catch (err: any) {
                console.error('Search View error:', err);
                setError(err.message || 'An error occurred while searching');
            } finally {
                setLoading(false);
            }
        };

        if (query) {
            fetchResults();
        }
    }, [query, api, activeFilter]);

    const loadMore = async () => {
        if (isLoadingMore || !hasMore || activeFilter === 'all') return;
        
        setIsLoadingMore(true);
        try {
            let res: any;
            const limit = 50;
            
            switch (activeFilter) {
                case 'songs':
                    res = await api.search.tracks(query, { offset, limit });
                    if (res.items.length > 0) {
                        setResults((prev: any) => ({
                            ...prev,
                            tracks: [...(prev?.tracks || []), ...res.items]
                        }));
                    }
                    break;
                case 'artists':
                    res = await api.search.artists(query, { offset, limit });
                    if (res.items.length > 0) {
                        setResults((prev: any) => ({
                            ...prev,
                            artists: [...(prev?.artists || []), ...res.items]
                        }));
                    }
                    break;
                case 'albums':
                    res = await api.search.albums(query, { offset, limit });
                    if (res.items.length > 0) {
                        setResults((prev: any) => ({
                            ...prev,
                            albums: [...(prev?.albums || []), ...res.items]
                        }));
                    }
                    break;
                case 'playlists':
                    res = await api.search.playlists(query, { offset, limit });
                    if (res.items.length > 0) {
                        setResults((prev: any) => ({
                            ...prev,
                            playlists: [...(prev?.playlists || []), ...res.items]
                        }));
                    }
                    break;
            }
            
            if (res) {
                setOffset(res.offset);
                if (!res.items.length || res.items.length < limit || res.offset >= res.total) {
                    setHasMore(false);
                }
            } else {
                setHasMore(false);
            }
        } catch (err) {
            console.error('Failed to load more results:', err);
            setHasMore(false);
        } finally {
            setIsLoadingMore(false);
        }
    };

    useEffect(() => {
        if (!sentinelRef.current || activeFilter === 'all') return;

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && hasMore && !isLoadingMore && !loading) {
                loadMore();
            }
        }, { threshold: 0.1 });

        observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [hasMore, isLoadingMore, loading, activeFilter, offset]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuTrackId && trackMenuRef.current && !trackMenuRef.current.contains(event.target as Node) && !(event.target as HTMLElement).closest('.luniq-dropdown')) {
                setMenuTrackId(null);
                setMenuPosition(null);
                setShowPlaylistSubmenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [menuTrackId]);

    
    

    if (error) {
        return (
            <div className="search-view-container">
                <div className="search-error-card">
                    <div className="search-error-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                    </div>
                    <h2>{error.includes('expired') || error.includes('401') ? t('searchView.sessionExpired') : t('searchView.searchUnavailable')}</h2>
                    <p>{error.includes('expired') || error.includes('401') ? t('searchView.sessionExpiredDesc') : error}</p>
                    <div className="search-error-actions">
                        <button onClick={() => window.location.reload()} className="search-retry-btn">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" /></svg>
                            {t('searchView.refreshApp')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const { tracks, artists, albums, playlists } = results || {};

    
    const topResult = tracks?.[0] || artists?.[0] || albums?.[0] || playlists?.[0];
    const hasResults = !!(topResult || tracks?.length || artists?.length || albums?.length || playlists?.length);

    const toggleFollow = async (e: React.MouseEvent, artistId: string) => {
        e.stopPropagation();
        const isFollowing = followingState[artistId];
        try {
            if (isFollowing) {
                await api.artist.unfollow([artistId]);
            } else {
                await api.artist.follow([artistId]);
            }
            setFollowingState(prev => ({ ...prev, [artistId]: !isFollowing }));
        } catch (err) {
            console.error('Error toggling follow:', err);
        }
    };

    const handlePlayButtonClick = async (e: React.MouseEvent, item: any) => {
        e.stopPropagation();
        const uriType = item.uri?.split(':')?.[1];
        const isTrack = item.objectType === 'Track' || uriType === 'track';
        const isArtist = item.objectType === 'Artist' || uriType === 'artist';
        const isAlbum = item.objectType === 'Album' || uriType === 'album';

        const playAsTrack = () => {
            if (!onTrackSelect) return;
            onTrackSelect(normalizeTrack(item, lowDataMode), tracks || []);
        };

        if (isTrack) {
            playAsTrack();
            return;
        }

        try {
            const id = item.uri?.split(':').pop() || item.id;
            
            if (isArtist) {
                const artistOverview = await api.artist.getArtist(id);
                const topTracks = (artistOverview?.discography?.topTracks?.items || [])
                    .map((item: any) => normalizeTrack(item.track, lowDataMode))
                    .filter((t: any) => t && t.id);

                if (topTracks.length > 0 && onTrackSelect) {
                    onTrackSelect(topTracks[0], topTracks);
                }
                return;
            } else if (isAlbum) {
                const albumData = await api.album.getAlbum(id);
                const trackItems = albumData?.tracksV2?.items || albumData?.tracks?.items || albumData?.tracks || [];
                const coverUrl = albumData?.coverArt?.sources?.[0]?.url
                                || albumData?.images?.items?.[0]?.sources?.[0]?.url
                                || albumData?.images?.[0]?.url || item.images?.[0]?.url || '';
                
                const mapped = trackItems.map((tItem: any) => {
                    const track = tItem.track || tItem;
                    if (!track) return null;
                    const normalized = normalizeTrack(track, lowDataMode);
                    if (!normalized.albumArt || normalized.albumArt.includes('data:image/svg')) normalized.albumArt = coverUrl;
                    if (!normalized.albumName) normalized.albumName = albumData.name;
                    return normalized;
                }).filter((t: any) => t !== null);
                
                if (mapped.length > 0 && onTrackSelect) {
                    onTrackSelect(mapped[0], mapped);
                } else {
                    playAsTrack();
                }
                return;
            } else {
                const data = await api.playlist.getPlaylist(id);
                if (!data?.content?.items?.length) {
                    playAsTrack();
                    return;
                }

                const tracks = (data.content?.items || [])
                    .map((trackItem: any) => {
                        const trackData = trackItem.itemV2?.data;
                        if (!trackData) return null;
                        return normalizeTrack(trackData, lowDataMode);
                    })
                    .filter((t: any): t is LuniqTrack => t !== null);

                if (tracks.length > 0 && onTrackSelect) {
                    onTrackSelect(tracks[0], tracks);
                } else {
                    playAsTrack();
                }
            }
        } catch (err) {
            console.error('Failed to play collection:', err);
            playAsTrack();
        }
    };

    const handleTrackMenuClick = async (e: React.MouseEvent, track: any) => {
        e.preventDefault();
        e.stopPropagation();
        const normalized = normalizeTrack(track, lowDataMode);
        if (menuTrackId === normalized.id) {
            setMenuTrackId(null);
            setMenuPosition(null);
            setShowPlaylistSubmenu(false);
        } else {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const menuHeight = 400;
            const isBottom = spaceBelow < menuHeight;
            
            setMenuPosition({ x: rect.right, y: isBottom ? rect.top : rect.bottom, isBottom });
            setMenuTrackId(normalized.id);
            setMenuFavoriteState(null);
            setMenuDownloadState(null);
            setShowPlaylistSubmenu(false);

            try {
                const [isFav, isDownloaded, playlists, trackLists] = await Promise.all([
                    window.ipcRenderer.invoke('check-local-favorite', normalized.id),
                    window.ipcRenderer.invoke('check-is-downloaded', normalized.id),
                    window.ipcRenderer.invoke('get-playlists'),
                    window.ipcRenderer.invoke('get-track-playlists', normalized.id)
                ]);
                setMenuFavoriteState(isFav);
                setMenuDownloadState(isDownloaded);
                setLocalPlaylists(playlists);
                setTrackPlaylists(trackLists);
            } catch (err) {
                console.error("Failed to load menu states", err);
            }
        }
    };

    const handleToggleFavorite = async (track: LuniqTrack) => {
        try {
            if (menuFavoriteState) {
                await window.ipcRenderer.invoke('remove-local-favorite', track.id);
                setMenuFavoriteState(false);
            } else {
                await window.ipcRenderer.invoke('add-local-favorite', track);
                setMenuFavoriteState(true);
            }
            window.dispatchEvent(new Event('luniq:playlist-update'));
        } catch (e) {
            console.error("Failed to toggle favorite", e);
        }
    };

    const handleToggleDownload = async (track: LuniqTrack) => {
        try {
            if (menuDownloadState) {
                const success = await window.ipcRenderer.invoke('remove-download', track.id);
                if (success) setMenuDownloadState(false);
            } else {
                const success = await window.ipcRenderer.invoke('download-track', track);
                if (success) setMenuDownloadState(true);
            }
        } catch (e) {
            console.error("Failed to toggle download", e);
        }
    };

    const handleTogglePlaylistTrack = async (playlistId: string, track: LuniqTrack) => {
        try {
            const isInPlaylist = trackPlaylists.includes(playlistId);
            if (isInPlaylist) {
                await window.ipcRenderer.invoke('remove-track-from-playlist', { playlistId, trackId: track.id });
                setTrackPlaylists(prev => prev.filter(id => id !== playlistId));
            } else {
                await window.ipcRenderer.invoke('add-track-to-playlist', { playlistId, track });
                setTrackPlaylists(prev => [...prev, playlistId]);
            }
            window.dispatchEvent(new Event('luniq:playlist-update'));
        } catch (e) {
            console.error("Failed to toggle playlist track", e);
        }
    };



    return (
        <div className="search-view-container">
            <div className="search-filters">
                <button className={`search-filter-pill ${activeFilter === 'all' ? 'active' : ''}`} onClick={() => setActiveFilter('all')}>{t('searchView.all')}</button>
                <button className={`search-filter-pill ${activeFilter === 'songs' ? 'active' : ''}`} onClick={() => setActiveFilter('songs')}>{t('searchView.songs')}</button>
                <button className={`search-filter-pill ${activeFilter === 'artists' ? 'active' : ''}`} onClick={() => setActiveFilter('artists')}>{t('searchView.artists')}</button>
                <button className={`search-filter-pill ${activeFilter === 'albums' ? 'active' : ''}`} onClick={() => setActiveFilter('albums')}>{t('searchView.albums')}</button>
                <button className={`search-filter-pill ${activeFilter === 'playlists' ? 'active' : ''}`} onClick={() => setActiveFilter('playlists')}>{t('searchView.playlists')}</button>
            </div>
            
            {loading && !results ? (
                <div className="luniq-loading-container">
                    <div className="luniq-loading-animation">
                        <div className="bar bar1"></div>
                        <div className="bar bar2"></div>
                        <div className="bar bar3"></div>
                    </div>
                    <span style={{ marginTop: '16px', fontWeight: 500, letterSpacing: '0.5px', opacity: 0.6 }}>{t('home.loading')}</span>
                </div>
            ) : !hasResults ? (
                <div className="luniq-loading-container" style={{ minHeight: '300px' }}>
                    <div className="search-no-results-icon" style={{ opacity: 0.2, marginBottom: '24px' }}>
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>
                    </div>
                    <span style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-main)' }}>{t('searchView.noResultsFor')} "{query}"</span>
                    <span style={{ marginTop: '8px', color: 'var(--text-dim)', fontSize: '14px' }}>{t('searchView.tryAgain')}</span>
                </div>
            ) : (
                <>
                    {activeFilter === 'all' && (
                <>
                    <div className="search-grid">
                        <div className="top-result-section">
                            <h2>{t('searchView.topResult')}</h2>
                            {topResult && (
                                <div className="top-result-card" onClick={() => {
                                    const uriType = topResult.uri?.split(':')?.[1];
                                    const isTrack = topResult.objectType === 'Track' || uriType === 'track' || (!topResult.objectType && !uriType);
                                    const isArtist = topResult.objectType === 'Artist' || uriType === 'artist';
                                    const isAlbum = topResult.objectType === 'Album' || uriType === 'album';

                                    if (isTrack) {
                                        onTrackViewSelect(normalizeTrack(topResult, lowDataMode));
                                    } else if (isArtist) {
                                        onArtistSelect(topResult.uri?.split(':').pop() || topResult.id);
                                    } else {
                                        onPlaylistSelect(topResult.uri?.split(':').pop() || topResult.id, isAlbum);
                                    }
                                }}>
                                    <div className="card-image-wrapper">
                                        <img 
                                            src={topResult.images?.[0]?.url || topResult.album?.images?.[0]?.url || (topResult.objectType === 'Artist' ? ARTIST_PLACEHOLDER : ALBUM_PLACEHOLDER)} 
                                            alt={topResult.name} 
                                            className={`top-result-image ${topResult.objectType === 'Artist' ? 'artist' : ''}`}
                                            loading="lazy"
                                        />
                                        <div className="play-button" onClick={(e) => handlePlayButtonClick(e, topResult)}>
                                            <svg height="24" width="24" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M7.05 3.606l13.49 7.788a.7.7 0 010 1.212L7.05 20.394A.7.7 0 016 19.788V4.212a.7.7 0 011.05-.606z"></path>
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="top-result-info">
                                        <div className="top-result-type">
                                            {topResult.objectType === 'Artist' ? t('searchView.artist') : 
                                             topResult.objectType === 'Album' ? t('searchView.album') : 
                                             topResult.objectType === 'Playlist' ? t('searchView.playlists') : 
                                             t('search.song')}
                                        </div>
                                        <div className="top-result-name">{topResult.name}</div>
                                        <div className="top-result-details">
                                            {topResult.artists && (
                                                <span className="top-result-artist">{topResult.artists.map((a: any) => a.name).join(', ')}</span>
                                            )}
                                            {topResult.album && (
                                                <span className="top-result-album"> • {topResult.album.name}</span>
                                            )}
                                            {topResult.duration_ms > 0 && (
                                                <span className="top-result-duration"> • {formatDuration(topResult.duration_ms)}</span>
                                            )}
                                        </div>
                                    </div>
                                    {topResult.objectType === 'Artist' && (
                                        <button 
                                            className={`search-follow-btn ${followingState[topResult.id] ? 'following' : ''}`}
                                            onClick={(e) => toggleFollow(e, topResult.id)}
                                        >
                                            {(followingState[topResult.id] ? t('search.following') : t('search.follow')).toUpperCase()}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="songs-section">
                            <div className="section-header">
                                <h2>{t('searchView.songs')}</h2>
                                <button className="see-all-btn" onClick={() => setActiveFilter('songs')}>{t('searchView.seeAll')}</button>
                            </div>
                            <div className="songs-list">
                                {tracks?.slice(0, 4).map((track: any) => {
                                    const normalized = normalizeTrack(track, lowDataMode);
                                    return (
                                        <div 
                                            key={track.id} 
                                            className={`song-item ${menuTrackId === track.id ? 'menu-open' : ''}`} 
                                            onClick={() => onTrackSelect?.(normalized, tracks || [normalized])}
                                            onContextMenu={(e) => handleTrackMenuClick(e, track)}
                                        >
                                            <img src={track.album?.images?.[0]?.url || ALBUM_PLACEHOLDER} alt={track.name} className="song-img" loading="lazy" />
                                            <div className="song-info">
                                                <div className="song-name" style={{ display: 'flex', alignItems: 'center' }}>
                                                    {track.name}
                                                    <DownloadIndicator trackId={normalized.id} />
                                                </div>
                                                <div className="song-artists">{track.artists?.map((a: any) => a.name).join(', ')}</div>
                                            </div>
                                            <div className="song-duration-and-menu" ref={menuTrackId === normalized.id ? trackMenuRef : null}>
                                                <div className="song-duration">{formatDuration(track.duration_ms)}</div>
                                                <button className="song-more-btn" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleTrackMenuClick(e, track); }}>
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                        <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
                                                    </svg>
                                                </button>
                                                
                                                {menuTrackId === normalized.id && (
                                                    <div 
                                                        className={`luniq-dropdown ${menuPosition?.isBottom ? 'open-up' : 'open-down'}`}
                                                        style={menuPosition ? {
                                                            position: 'fixed',
                                                            top: menuPosition.isBottom ? 'auto' : `${menuPosition.y + 8}px`,
                                                            bottom: menuPosition.isBottom ? `${window.innerHeight - menuPosition.y + 8}px` : 'auto',
                                                            right: `${window.innerWidth - menuPosition.x}px`,
                                                            left: 'auto',
                                                            zIndex: 9999
                                                        } : {}}
                                                    >
                                                        <button className="luniq-dropdown-item" onClick={(e) => { e.stopPropagation(); onPlayNext?.(normalized); setMenuTrackId(null); }}>
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M13 12H3M13 6H3M13 18H3" />
                                                                <path d="M17 8l5 4-5 4V8z" />
                                                            </svg>
                                                            {t('search.playNext')}
                                                        </button>
                                                        <button className="luniq-dropdown-item" onClick={(e) => { e.stopPropagation(); onAddToQueue?.(normalized); setMenuTrackId(null); }}>
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                                                            {t('search.addToQueue')}
                                                        </button>
                                                        <button className="luniq-dropdown-item" onClick={(e) => { e.stopPropagation(); handleToggleFavorite(normalized); setMenuTrackId(null); }}>
                                                            {menuFavoriteState ? (
                                                                <><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg> {t('search.removeFromFavorites')}</>
                                                            ) : (
                                                                <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.84-8.84 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg> {t('search.saveToFavorites')}</>
                                                            )}
                                                        </button>
                                                        <button className="luniq-dropdown-item" onClick={(e) => { e.stopPropagation(); handleToggleDownload(normalized); setMenuTrackId(null); }}>
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                                            {menuDownloadState ? t('search.removeDownload') : t('search.download')}
                                                        </button>
                                                        <div className="luniq-dropdown-divider" />
                                                        <button className={`luniq-dropdown-item ${showPlaylistSubmenu ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setShowPlaylistSubmenu(!showPlaylistSubmenu); }}>
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M8 6h13M8 12h13M8 18h5" />
                                                                <path d="M3 6h.01M3 12h.01M3 18h.01" />
                                                                <path d="M16 18h6M19 15v6" />
                                                            </svg>
                                                            {t('search.addToLocalPlaylist')}
                                                        </button>
                                                        {showPlaylistSubmenu && (
                                                            <div className="luniq-submenu">
                                                                {localPlaylists.map(p => (
                                                                    <button key={p.id} className={`luniq-dropdown-item ${trackPlaylists.includes(p.id) ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); handleTogglePlaylistTrack(p.id, normalized); }}>
                                                                        {p.name}
                                                                        {trackPlaylists.includes(p.id) && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ marginLeft: 'auto' }}><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {artists?.length > 0 && (
                        <div className="carousel-section">
                            <div className="section-header">
                                <h2>{t('searchView.artists')}</h2>
                                <button className="see-all-btn" onClick={() => setActiveFilter('artists')}>{t('searchView.seeAll')}</button>
                            </div>
                            <div className="carousel-grid">
                                {artists.slice(0, 8).map((artist: any) => (
                                    <div key={artist.id} className="carousel-item" onClick={() => onArtistSelect(artist.id)}>
                                        <div className="card-image-wrapper">
                                            <img src={artist.images?.[0]?.url || ARTIST_PLACEHOLDER} alt={artist.name} className="carousel-img artist" loading="lazy" />
                                            <div className="play-button" onClick={(e) => handlePlayButtonClick(e, artist)}>
                                                <svg height="24" width="24" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M7.05 3.606l13.49 7.788a.7.7 0 010 1.212L7.05 20.394A.7.7 0 016 19.788V4.212a.7.7 0 011.05-.606z"></path>
                                                </svg>
                                            </div>
                                        </div>
                                        <div className="carousel-name">{artist.name}</div>
                                        <div className="carousel-meta">{t('searchView.artist')}</div>
                                        <button 
                                            className={`search-follow-btn compact ${followingState[artist.id] ? 'following' : ''}`}
                                            onClick={(e) => toggleFollow(e, artist.id)}
                                        >
                                            {followingState[artist.id] ? t('search.following') : t('search.follow')}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {albums?.length > 0 && (
                        <div className="carousel-section">
                            <div className="section-header">
                                <h2>{t('searchView.albums')}</h2>
                                <button className="see-all-btn" onClick={() => setActiveFilter('albums')}>{t('searchView.seeAll')}</button>
                            </div>
                            <div className="carousel-grid">
                                {albums.slice(0, 8).map((album: any) => (
                                    <div key={album.id} className="carousel-item" onClick={() => onPlaylistSelect(album.id, true)}>
                                        <div className="card-image-wrapper">
                                            <img src={album.images?.[0]?.url || ALBUM_PLACEHOLDER} alt={album.name} className="carousel-img" loading="lazy" />
                                            <div className="play-button" onClick={(e) => handlePlayButtonClick(e, album)}>
                                                <svg height="24" width="24" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M7.05 3.606l13.49 7.788a.7.7 0 010 1.212L7.05 20.394A.7.7 0 016 19.788V4.212a.7.7 0 011.05-.606z"></path>
                                                </svg>
                                            </div>
                                        </div>
                                        <div className="carousel-name">{album.name}</div>
                                        <div className="carousel-meta">{album.release_date} • {t('searchView.album')}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {playlists?.length > 0 && (
                        <div className="carousel-section">
                            <div className="section-header">
                                <h2>{t('searchView.playlists')}</h2>
                                <button className="see-all-btn" onClick={() => setActiveFilter('playlists')}>{t('searchView.seeAll')}</button>
                            </div>
                            <div className="carousel-grid">
                                {playlists.slice(0, 8).map((playlist: any) => (
                                    <div key={playlist.id} className="carousel-item" onClick={() => onPlaylistSelect(playlist.id)}>
                                        <div className="card-image-wrapper">
                                            <img src={playlist.images?.[0]?.url || ALBUM_PLACEHOLDER} alt={playlist.name} className="carousel-img" loading="lazy" />
                                            <div className="play-button" onClick={(e) => handlePlayButtonClick(e, playlist)}>
                                                <svg height="24" width="24" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M7.05 3.606l13.49 7.788a.7.7 0 010 1.212L7.05 20.394A.7.7 0 016 19.788V4.212a.7.7 0 011.05-.606z"></path>
                                                </svg>
                                            </div>
                                        </div>
                                        <div className="carousel-name">{playlist.name}</div>
                                        <div className="carousel-meta">{t('searchView.by')} {playlist.owner?.display_name}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {activeFilter === 'songs' ? (
                <div className="songs-section">
                    <h2>{t('searchView.tracks')}</h2>
                    <div className="songs-list">
                        {tracks?.map((track: any) => {
                            const normalized = normalizeTrack(track, lowDataMode);
                            return (
                                <div 
                                    key={track.id} 
                                    className={`song-item ${menuTrackId === track.id ? 'menu-open' : ''}`} 
                                    onClick={() => onTrackSelect?.(normalized, tracks || [normalized])}
                                    onContextMenu={(e) => handleTrackMenuClick(e, track)}
                                >
                                    <img src={track.album?.images?.[0]?.url || ALBUM_PLACEHOLDER} alt={track.name} className="song-img" loading="lazy" />
                                    <div className="song-info">
                                        <div className="song-name" style={{ display: 'flex', alignItems: 'center' }}>
                                            {track.name}
                                            <DownloadIndicator trackId={normalized.id} />
                                        </div>
                                        <div className="song-artists">{track.artists?.map((a: any) => a.name).join(', ')}</div>
                                    </div>
                                    <div className="song-duration-and-menu" ref={menuTrackId === normalized.id ? trackMenuRef : null}>
                                        <div className="song-duration">{formatDuration(track.duration_ms)}</div>
                                        <button className="song-more-btn" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleTrackMenuClick(e, track); }}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
                                            </svg>
                                        </button>
                                        
                                        {menuTrackId === normalized.id && (
                                            <div 
                                                className={`luniq-dropdown ${menuPosition?.isBottom ? 'open-up' : 'open-down'}`}
                                                style={menuPosition ? {
                                                    position: 'fixed',
                                                    top: menuPosition.isBottom ? 'auto' : `${menuPosition.y + 8}px`,
                                                    bottom: menuPosition.isBottom ? `${window.innerHeight - menuPosition.y + 8}px` : 'auto',
                                                    right: `${window.innerWidth - menuPosition.x}px`,
                                                    left: 'auto',
                                                    zIndex: 9999
                                                } : {}}
                                            >
                                                <button className="luniq-dropdown-item" onClick={(e) => { e.stopPropagation(); onPlayNext?.(normalized); setMenuTrackId(null); }}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M13 12H3M13 6H3M13 18H3" />
                                                        <path d="M17 8l5 4-5 4V8z" />
                                                    </svg>
                                                    {t('search.playNext')}
                                                </button>
                                                <button className="luniq-dropdown-item" onClick={(e) => { e.stopPropagation(); onAddToQueue?.(normalized); setMenuTrackId(null); }}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                                                    {t('search.addToQueue')}
                                                </button>
                                                <button className="luniq-dropdown-item" onClick={(e) => { e.stopPropagation(); handleToggleFavorite(normalized); setMenuTrackId(null); }}>
                                                    {menuFavoriteState ? (
                                                        <><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg> {t('search.removeFromFavorites')}</>
                                                    ) : (
                                                        <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.84-8.84 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg> {t('search.saveToFavorites')}</>
                                                    )}
                                                </button>
                                                <button className="luniq-dropdown-item" onClick={(e) => { e.stopPropagation(); handleToggleDownload(normalized); setMenuTrackId(null); }}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                                    {menuDownloadState ? t('search.removeDownload') : t('search.download')}
                                                </button>
                                                <div className="luniq-dropdown-divider" />
                                                <button className={`luniq-dropdown-item ${showPlaylistSubmenu ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setShowPlaylistSubmenu(!showPlaylistSubmenu); }}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M8 6h13M8 12h13M8 18h5" />
                                                        <path d="M3 6h.01M3 12h.01M3 18h.01" />
                                                        <path d="M16 18h6M19 15v6" />
                                                    </svg>
                                                    {t('search.addToLocalPlaylist')}
                                                </button>
                                                {showPlaylistSubmenu && (
                                                    <div className="luniq-submenu">
                                                        {localPlaylists.map(p => (
                                                            <button key={p.id} className={`luniq-dropdown-item ${trackPlaylists.includes(p.id) ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); handleTogglePlaylistTrack(p.id, normalized); }}>
                                                                {p.name}
                                                                {trackPlaylists.includes(p.id) && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ marginLeft: 'auto' }}><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : activeFilter !== 'all' && (
                <div className="carousel-grid">
                    {activeFilter === 'artists' && artists?.map((artist: any) => (
                        <div key={artist.id} className="carousel-item" onClick={() => onArtistSelect(artist.id)}>
                            <div className="card-image-wrapper">
                                <img src={artist.images?.[0]?.url || ARTIST_PLACEHOLDER} alt={artist.name} className="carousel-img artist" loading="lazy" />
                                <div className="play-button" onClick={(e) => handlePlayButtonClick(e, artist)}>
                                    <svg height="24" width="24" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M7.05 3.606l13.49 7.788a.7.7 0 010 1.212L7.05 20.394A.7.7 0 016 19.788V4.212a.7.7 0 011.05-.606z"></path>
                                    </svg>
                                </div>
                            </div>
                            <div className="carousel-name">{artist.name}</div>
                            <div className="carousel-meta">{t('searchView.artist')}</div>
                            <button 
                                className={`search-follow-btn compact ${followingState[artist.id] ? 'following' : ''}`}
                                onClick={(e) => toggleFollow(e, artist.id)}
                            >
                                {followingState[artist.id] ? t('search.following') : t('search.follow')}
                            </button>
                        </div>
                    ))}
                    {activeFilter === 'albums' && albums?.map((album: any) => (
                         <div key={album.id} className="carousel-item" onClick={() => onPlaylistSelect(album.id, true)}>
                             <div className="card-image-wrapper">
                                <img src={album.images?.[0]?.url || 'placeholder.png'} alt={album.name} className="carousel-img" loading="lazy" />
                                <div className="play-button" onClick={(e) => handlePlayButtonClick(e, album)}>
                                    <svg height="24" width="24" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M7.05 3.606l13.49 7.788a.7.7 0 010 1.212L7.05 20.394A.7.7 0 016 19.788V4.212a.7.7 0 011.05-.606z"></path>
                                    </svg>
                                </div>
                             </div>
                             <div className="carousel-name">{album.name}</div>
                             <div className="carousel-meta">{album.release_date} • {t('searchView.album')}</div>
                         </div>
                    ))}
                    {activeFilter === 'playlists' && playlists?.map((playlist: any) => (
                        <div key={playlist.id} className="carousel-item" onClick={() => onPlaylistSelect(playlist.id)}>
                            <div className="card-image-wrapper">
                                <img src={playlist.images?.[0]?.url || 'placeholder.png'} alt={playlist.name} className="carousel-img" loading="lazy" />
                                <div className="play-button" onClick={(e) => handlePlayButtonClick(e, playlist)}>
                                    <svg height="24" width="24" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M7.05 3.606l13.49 7.788a.7.7 0 010 1.212L7.05 20.394A.7.7 0 016 19.788V4.212a.7.7 0 011.05-.606z"></path>
                                    </svg>
                                </div>
                            </div>
                            <div className="carousel-name">{playlist.name}</div>
                            <div className="carousel-meta">{t('searchView.by')} {playlist.owner?.display_name}</div>
                        </div>
                    ))}
                </div>
            )}
                </>
            )}

            {}
            {activeFilter !== 'all' && hasMore && (
                <div ref={sentinelRef} className="search-load-more" style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
                    {isLoadingMore && (
                        <div className="luniq-loading-animation small">
                            <div className="bar bar1"></div>
                            <div className="bar bar2"></div>
                            <div className="bar bar3"></div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchView;
