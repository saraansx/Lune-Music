import React, { useState, useEffect } from 'react';
import './ListeningTime.css';

interface ArtistStat {
    artist: string;
    seconds: number;
    tracksCount: number;
}

interface DailyStat {
    date: string;
    seconds: number;
}

interface ListeningStats {
    totalSeconds: number;
    todaySeconds: number;
    topArtists: ArtistStat[];
    dailyHistory: DailyStat[];
}

function formatDuration(totalSeconds: number): { primary: string; secondary: string } {
    if (!totalSeconds || totalSeconds <= 0) {
        return { primary: '0m', secondary: '0 total minutes' };
    }

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (hours > 0) {
        return {
            primary: `${hours}h ${minutes}m`,
            secondary: `${Math.round(totalSeconds / 60).toLocaleString()} minutes total`
        };
    }
    return {
        primary: `${minutes}m`,
        secondary: `${totalSeconds}s total`
    };
}

function formatDayLabel(dateStr: string): string {
    try {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            return date.toLocaleDateString(undefined, { weekday: 'short' });
        }
    } catch (_) {}
    return dateStr;
}

const ListeningTime: React.FC = () => {
    const [stats, setStats] = useState<ListeningStats>({
        totalSeconds: 0,
        todaySeconds: 0,
        topArtists: [],
        dailyHistory: []
    });

    const loadStats = async () => {
        if (!window.ipcRenderer) return;
        try {
            const res = await window.ipcRenderer.invoke('get-listening-stats');
            if (res) {
                setStats(res);
            }
        } catch (err) {
            console.error('Failed to load listening stats:', err);
        }
    };

    useEffect(() => {
        loadStats();
        // Live auto-refresh stats while settings view is mounted
        const interval = setInterval(loadStats, 10000);
        return () => clearInterval(interval);
    }, []);

    const totalFmt = formatDuration(stats.totalSeconds);
    const todayFmt = formatDuration(stats.todaySeconds);

    const maxDailySeconds = Math.max(...stats.dailyHistory.map(d => d.seconds), 60);

    return (
        <div className="listening-time-view">
            <div className="settings-account-header">
                <h2 className="settings-account-title">Listening Activity</h2>
                <p className="settings-account-description">
                    Accurate, hardware-verified playback metrics tracked locally in real-time.
                </p>
            </div>

            {/* Key Metric Overview Cards */}
            <div className="metrics-grid">
                <div className="metric-card">
                    <div className="metric-header">
                        <span className="metric-label">All-Time Listening</span>
                        <div className="metric-icon-wrap">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                        </div>
                    </div>
                    <div className="metric-value">{totalFmt.primary}</div>
                    <div className="metric-sub">{totalFmt.secondary}</div>
                </div>

                <div className="metric-card">
                    <div className="metric-header">
                        <span className="metric-label">Today's Session</span>
                        <div className="metric-icon-wrap">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                            </svg>
                        </div>
                    </div>
                    <div className="metric-value">{todayFmt.primary}</div>
                    <div className="metric-sub">{todayFmt.secondary}</div>
                </div>
            </div>

            {/* Weekly Daily Activity Bar Distribution */}
            <div className="stats-section-card">
                <div className="stats-card-header">
                    <span className="stats-card-title">Last 7 Days Activity</span>
                    <span className="stats-card-subtitle">Playback duration per day</span>
                </div>

                {stats.dailyHistory.length === 0 ? (
                    <div className="stats-empty-state">
                        <span>No historical playback recorded yet. Play music to log stats.</span>
                    </div>
                ) : (
                    <div className="activity-chart">
                        {stats.dailyHistory.map((item) => {
                            const heightPercent = Math.min(100, Math.max(8, (item.seconds / maxDailySeconds) * 100));
                            const minutes = Math.round(item.seconds / 60);

                            return (
                                <div key={item.date} className="chart-bar-column" title={`${item.date}: ${minutes} mins`}>
                                    <div className="chart-bar-track">
                                        <div 
                                            className="chart-bar-fill"
                                            style={{ height: `${heightPercent}%` }}
                                        />
                                    </div>
                                    <span className="chart-bar-time">{minutes > 0 ? `${minutes}m` : '0m'}</span>
                                    <span className="chart-bar-label">{formatDayLabel(item.date)}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Top Artists Ranked List */}
            <div className="stats-section-card">
                <div className="stats-card-header">
                    <span className="stats-card-title">Top Artists by Duration</span>
                    <span className="stats-card-subtitle">Real-time accumulated listening time</span>
                </div>

                {stats.topArtists.length === 0 ? (
                    <div className="stats-empty-state">
                        <span>No artist records found. Start streaming songs to calculate trends.</span>
                    </div>
                ) : (
                    <div className="top-artists-list">
                        {stats.topArtists.map((artist, idx) => {
                            const artistFmt = formatDuration(artist.seconds);
                            const percent = Math.min(100, Math.max(5, (artist.seconds / (stats.totalSeconds || 1)) * 100));

                            return (
                                <div key={artist.artist} className="top-artist-row">
                                    <span className="artist-rank">{idx + 1}</span>
                                    <div className="artist-info-col">
                                        <div className="artist-meta-line">
                                            <span className="artist-name">{artist.artist}</span>
                                            <span className="artist-time-tag">{artistFmt.primary}</span>
                                        </div>
                                        <div className="artist-progress-track">
                                            <div 
                                                className="artist-progress-fill" 
                                                style={{ width: `${percent}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ListeningTime;
