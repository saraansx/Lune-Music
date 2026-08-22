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
lavalinkAudio.setYtDlpEngine(ytdlpAudio);

let lastLoggedEngine: string | null = null;

export function getAudioEngine(): YoutubeiAudio | YtDlpAudio | LavalinkAudio {
    const engine = store.get('audioEngine') || 'youtubei';
    if (engine !== lastLoggedEngine) {
        console.log(`[Audio Engine] Active engine: ${engine}`);
        lastLoggedEngine = engine;
    }
    if (engine === 'lavalink') return lavalinkAudio;
    if (engine === 'ytdlp') return ytdlpAudio;
    return youtubeiAudio;
}

export function getFallbackEngine(): YoutubeiAudio | YtDlpAudio | LavalinkAudio {
    const engine = store.get('audioEngine') || 'youtubei';
    if (engine === 'youtubei') return ytdlpAudio;
    return youtubeiAudio;
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

