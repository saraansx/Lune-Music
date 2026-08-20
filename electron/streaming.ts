import { app } from 'electron';
import path from 'path';
import Store from 'electron-store';
import { YoutubeiAudio } from '../Plugin/youtubei-audio.js';
import { YtDlpAudio } from '../Plugin/yt-dlp-audio.js';
import { LavalinkAudio } from '../Plugin/lavalink-audio.js';
import { StoreSchema, schema } from './store.js';

export const youtubeiAudio = new YoutubeiAudio();
export const ytdlpAudio = new YtDlpAudio();

const store = new Store<StoreSchema>({ schema: schema as any });

export const lavalinkAudio = new LavalinkAudio({
    host: store.get('lavalinkHost') || '127.0.0.1',
    port: store.get('lavalinkPort') || 2333,
    password: store.get('lavalinkPassword') || 'youshallnotpass',
    secure: store.get('lavalinkSecure') || false,
});

let lastLoggedEngine: string | null = null;

export function getAudioEngine(): YoutubeiAudio | YtDlpAudio | LavalinkAudio {
    const isSpotifyLoggedIn = !!store.get('spotify_access_token');
    
    // In Guest Mode (no Spotify login): Lavalink is the default engine
    if (!isSpotifyLoggedIn) {
        if (lastLoggedEngine !== 'lavalink (guest)') {
            console.log('[Audio Engine] Guest mode active: Using Lavalink (with yt-dlp fallback)');
            lastLoggedEngine = 'lavalink (guest)';
        }
        return lavalinkAudio;
    }

    // In Spotify Login Mode: Use user-chosen / high-speed engine (default youtubei)
    const engine = store.get('audioEngine') || 'youtubei';
    if (engine !== lastLoggedEngine) {
        console.log(`[Audio Engine] Spotify logged-in mode active: ${engine}`);
        lastLoggedEngine = engine;
    }
    if (engine === 'lavalink') return lavalinkAudio;
    return engine === 'youtubei' ? youtubeiAudio : ytdlpAudio;
}

export function getFallbackEngine(): YoutubeiAudio | YtDlpAudio | LavalinkAudio {
    const isSpotifyLoggedIn = !!store.get('spotify_access_token');
    if (!isSpotifyLoggedIn) {
        // Fallback for guest mode if Lavalink is down: yt-dlp
        return ytdlpAudio;
    }
    const engine = store.get('audioEngine') || 'youtubei';
    if (engine === 'lavalink') return ytdlpAudio;
    return engine === 'ytdlp' ? youtubeiAudio : ytdlpAudio;
}

export const activeSearches = new Map<string, { 
    controller: AbortController; 
    promise: Promise<string>;
    requesters: Set<string>;
}>();
export const activeDownloads = new Map<string, AbortController>();

const ytCookiesPath = path.join(app.getPath('userData'), 'yt-cookies.txt');
youtubeiAudio.setCookiesPath(ytCookiesPath);
ytdlpAudio.setCookiesPath(ytCookiesPath);

