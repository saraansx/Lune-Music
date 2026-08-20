import fs from "fs";

export interface LavalinkNodeConfig {
  host: string;
  port: number;
  password?: string;
  secure?: boolean;
}

interface LavalinkTrackInfo {
  identifier: string;
  isSeekable: boolean;
  author: string;
  length: number;
  isStream: boolean;
  position: number;
  title: string;
  uri: string;
  artworkUrl?: string;
  isrc?: string;
  sourceName: string;
}

interface LavalinkTrack {
  encoded: string;
  info: LavalinkTrackInfo;
  pluginInfo?: any;
  userData?: any;
}

interface LavalinkLoadResult {
  loadType: "track" | "playlist" | "search" | "empty" | "error";
  data: any;
}

interface CacheEntry {
  url: string;
  expiresAt: number;
}

const DEFAULT_CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_CACHE_SIZE = 300;

export class LavalinkAudio {
  private config: LavalinkNodeConfig;
  private urlCache = new Map<string, CacheEntry>();

  constructor(config?: Partial<LavalinkNodeConfig>) {
    this.config = {
      host: config?.host || "us1.visihost.in",
      port: config?.port || 3059,
      password: config?.password || "aeronova",
      secure: config?.secure ?? false,
    };
  }

  public updateConfig(newConfig: Partial<LavalinkNodeConfig>) {
    this.config = { ...this.config, ...newConfig };
    console.log(`[Lavalink] Updated configuration: ${this.config.host}:${this.config.port} (secure: ${this.config.secure})`);
  }

  private getBaseUrl(): string {
    const protocol = this.config.secure ? "https" : "http";
    return `${protocol}://${this.config.host}:${this.config.port}`;
  }

  private getAuthHeaders(): Record<string, string> {
    return {
      Authorization: this.config.password || "aeronova",
      "Client-Name": "AeroNova/Luniq-Music",
      "Content-Type": "application/json",
    };
  }

  private getCacheKey(
    trackName: string,
    artistName: string,
    quality?: string,
    formatExt?: string,
  ): string {
    return `${trackName.toLowerCase().trim()}::${artistName.toLowerCase().trim()}::${quality || "default"}::${formatExt || "default"}`;
  }

  private getCachedUrl(key: string): string | null {
    const entry = this.urlCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.urlCache.delete(key);
      return null;
    }
    return entry.url;
  }

  public invalidateCachedUrl(
    trackName: string,
    artistName: string,
    quality?: string,
    formatExt?: string,
  ): void {
    const key = this.getCacheKey(trackName, artistName, quality, formatExt);
    if (this.urlCache.has(key)) {
      console.log(`[Lavalink] Invalidated cached URL for "${trackName}" by ${artistName}`);
      this.urlCache.delete(key);
    }
  }

  private setCachedUrl(key: string, url: string): void {
    if (this.urlCache.size >= MAX_CACHE_SIZE) {
      const firstKey = this.urlCache.keys().next().value;
      if (firstKey) this.urlCache.delete(firstKey);
    }
    this.urlCache.set(key, {
      url,
      expiresAt: Date.now() + DEFAULT_CACHE_TTL_MS,
    });
  }

  private async fetchLavalinkTracks(
    query: string,
    signal?: AbortSignal,
  ): Promise<LavalinkTrack[]> {
    const url = `${this.getBaseUrl()}/v4/loadtracks?identifier=${encodeURIComponent(query)}`;
    
    const res = await fetch(url, {
      method: "GET",
      headers: this.getAuthHeaders(),
      signal,
    });

    if (!res.ok) {
      throw new Error(`Lavalink loadtracks returned HTTP ${res.status}: ${res.statusText}`);
    }

    const json = (await res.json()) as LavalinkLoadResult;

    if (json.loadType === "track") {
      return [json.data as LavalinkTrack];
    } else if (json.loadType === "search") {
      return (json.data as LavalinkTrack[]) || [];
    } else if (json.loadType === "playlist") {
      return (json.data?.tracks as LavalinkTrack[]) || [];
    } else if (json.loadType === "error") {
      throw new Error(`Lavalink track load error: ${JSON.stringify(json.data)}`);
    }

    return [];
  }

  async getStreamUrl(
    trackName: any,
    artistName: any,
    quality?: string,
    formatExt?: string,
    signal?: AbortSignal,
    _isPriority: boolean = false,
    durationMs: number = 0,
  ): Promise<string> {
    const tName = typeof trackName === "string" ? trackName : trackName?.name || String(trackName || "unknown");
    const aName = typeof artistName === "string" ? artistName : artistName?.name || String(artistName || "unknown");

    const cacheKey = this.getCacheKey(tName, aName, quality, formatExt);
    const cached = this.getCachedUrl(cacheKey);
    if (cached) {
      console.log(`[Lavalink] Cache hit for "${tName}" by ${aName}`);
      return cached;
    }

    // Clean track title (strip extraneous tags like feat, remastered, version, etc. for cleaner search)
    const cleanTrackTitle = (title: string): string => {
      return title
        .replace(/[\(\[\{](feat|ft|with|remastered|remaster|explicit|clean|deluxe|anniversary|bonus track|edit|single version|mono|stereo)[\.\:\s][^\)\]\}]*[\)\]\}]/gi, '')
        .replace(/[\(\[\{](feat|ft|with|remastered|remaster|explicit|clean|deluxe|anniversary|bonus track|edit|single version|mono|stereo)[\)\]\}]/gi, '')
        .replace(/-\s*(remastered|remaster|single version|deluxe edition|bonus track|explicit|clean).*/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const cleanedTName = cleanTrackTitle(tName);
    const primaryArtist = aName.split(/[,&/]/)[0].trim();

    console.log(`[Lavalink] Resolving stream for "${tName}" (Cleaned: "${cleanedTName}") by ${aName} [Duration: ${durationMs}ms]`);

    // Prioritized search queries: Target YouTube Music official releases first
    const searchQueries = [
      `ytmsearch:${cleanedTName} ${primaryArtist}`,
      `ytmsearch:${tName} ${aName}`,
      `ytsearch:${cleanedTName} ${primaryArtist} Topic`,
      `ytsearch:${cleanedTName} ${primaryArtist} Official Audio`,
      `ytsearch:${cleanedTName} ${primaryArtist}`,
      `ytsearch:${tName} ${aName}`,
    ];

    let lastError: any = null;

    const penaltyKeywords = [
      "lofi", "lo-fi", "chill mix", "mix", "remix", "cover", "slowed", "reverb",
      "live", "acoustic", "karaoke", "tribute", "instrumental", "parody",
      "sped up", "speed up", "8d", "clean", "censored", "reaction", "mashup",
      "extended mix", "bass boosted", "nightcore", "edit", "music video",
      "official video", "official music video", "mv", "short film", "dialogue",
      "dialogues", "scene", "scenes", "teaser", "trailer", "full movie",
      "film version", "video song", "lyric video", "status", "shorts", "ringtone",
      "behind the scenes", "making of", "dance", "performance"
    ];

    const boostKeywords = [
      "official audio", "provided to youtube", "original mix", "topic", "auto-generated"
    ];

    const requestedLower = `${tName} ${aName}`.toLowerCase();

    const scoreLavalinkTrack = (track: LavalinkTrack, expectedDurationMs: number): number => {
      const title = (track.info.title || "").toLowerCase();
      const author = (track.info.author || "").toLowerCase();
      const source = (track.info.sourceName || "").toLowerCase();
      const length = track.info.length || 0;

      let score = 50;

      // 1. Source & Channel Authority
      if (source === "youtubemusic") {
        score += 90;
      }

      if (author.includes("topic") || author.includes("auto-generated") || author.includes("vevo") || author.includes("records") || author.includes("music")) {
        score += 70;
      }

      if (track.info.isrc) {
        score += 50;
      }

      for (const boost of boostKeywords) {
        if (title.includes(boost) || author.includes(boost)) score += 30;
      }

      // 2. Heavy Penalty Filtering (Lofi, Mixes, Covers, Edits, Slowed)
      for (const penalty of penaltyKeywords) {
        if ((title.includes(penalty) || author.includes(penalty)) && !requestedLower.includes(penalty)) {
          // Extremely heavy penalty: mixes, covers, and lofi versions get disqualified
          score -= 120;
        }
      }

      // 3. Exact Title & Artist Token Matching
      const cleanTokens = cleanedTName.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter((tok: string) => tok.length > 1);
      const artistTokens = primaryArtist.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter((tok: string) => tok.length > 1);
      
      let matchedTitleTokens = 0;
      for (const tok of cleanTokens) {
        if (title.includes(tok)) matchedTitleTokens++;
      }
      if (cleanTokens.length > 0) {
        const ratio = matchedTitleTokens / cleanTokens.length;
        if (ratio < 0.5) score -= 80; // If more than half the title tokens don't match, heavily penalize
        score += Math.round(ratio * 50);
      }

      let matchedArtistTokens = 0;
      for (const tok of artistTokens) {
        if (author.includes(tok) || title.includes(tok)) matchedArtistTokens++;
      }
      if (artistTokens.length > 0) {
        score += Math.round((matchedArtistTokens / artistTokens.length) * 40);
      }

      // 4. Strict Duration Matching (Studio masters match Spotify/Album duration within 2-4 seconds)
      if (expectedDurationMs > 0 && length > 0) {
        const diffSec = Math.abs(length - expectedDurationMs) / 1000;
        if (diffSec <= 2.5) {
          score += 70;
        } else if (diffSec <= 5) {
          score += 40;
        } else if (diffSec <= 10) {
          score += 15;
        } else if (diffSec > 25) {
          score -= 100; // Videos with dialogues/intros/outros or lofi extended loops
        } else if (diffSec > 12) {
          score -= 50;
        }
      }

      return score;
    };

    // Pool candidate tracks across all queries to find the globally highest scoring official track
    const candidateTracks: LavalinkTrack[] = [];

    for (const searchQuery of searchQueries) {
      if (signal?.aborted) {
        throw Object.assign(new Error("AbortError"), { name: "AbortError" });
      }

      try {
        const tracks = await this.fetchLavalinkTracks(searchQuery, signal);
        if (tracks && tracks.length > 0) {
          candidateTracks.push(...tracks);
          // If we got high-confidence tracks from ytmsearch, we have strong official candidates
          if (searchQuery.startsWith('ytmsearch:') && tracks.length >= 3) {
            break;
          }
        }
      } catch (err: any) {
        if (err.name === "AbortError" || signal?.aborted) throw err;
        lastError = err;
        console.warn(`[Lavalink] Query "${searchQuery}" failed:`, err.message || err);
      }
    }

    if (candidateTracks.length > 0) {
      // Deduplicate by identifier
      const seen = new Set<string>();
      const uniqueTracks = candidateTracks.filter(t => {
        if (!t?.info?.identifier || seen.has(t.info.identifier)) return false;
        seen.add(t.info.identifier);
        return true;
      });

      let bestTrack = uniqueTracks[0];
      let highestScore = -Infinity;

      for (const track of uniqueTracks) {
        const score = scoreLavalinkTrack(track, durationMs);
        if (score > highestScore) {
          highestScore = score;
          bestTrack = track;
        }
      }

      if (bestTrack.info.identifier) {
        const directYtUrl = `https://www.youtube.com/watch?v=${bestTrack.info.identifier}`;
        
        try {
          const YtDlpClass = (await import('./yt-dlp-audio.js')).YtDlpAudio;
          const ytEngine = new YtDlpClass();
          // Resolve directly using the selected bestTrack identifier
          const ytStreamUrl = await ytEngine.getStreamUrlByVideoId(
            bestTrack.info.identifier,
            quality,
            formatExt,
            signal,
            _isPriority,
          );
          if (ytStreamUrl) {
            this.setCachedUrl(cacheKey, ytStreamUrl);
            console.log(`[Lavalink] Successfully resolved "${tName}" by ${aName} -> "${bestTrack.info.title}" [Author: ${bestTrack.info.author}, Score: ${highestScore}] via yt-dlp direct target`);
            return ytStreamUrl;
          }
        } catch (ytErr) {
          console.warn(`[Lavalink] yt-dlp direct target resolution warning:`, ytErr);
        }

        this.setCachedUrl(cacheKey, directYtUrl);
        console.log(`[Lavalink] Successfully resolved "${tName}" by ${aName} -> "${bestTrack.info.title}" [Author: ${bestTrack.info.author}, Score: ${highestScore}]`);
        return directYtUrl;
      }
    }

    throw lastError || new Error(`Lavalink failed to resolve any audio streams for "${tName}" by ${aName}`);
  }

  async downloadTrack(
    trackName: string,
    artistName: string,
    localPath: string,
    downloadQuality: string,
    downloadFormat: string,
    onProgress: (progress: number) => void,
    signal: AbortSignal,
  ): Promise<string> {
    const streamUrl = await this.getStreamUrl(
      trackName,
      artistName,
      downloadQuality,
      downloadFormat,
      signal,
      true,
    );

    const res = await fetch(streamUrl, {
      headers: this.getAuthHeaders(),
      signal,
    });

    if (!res.ok) {
      throw new Error(`Failed to download track from Lavalink: HTTP ${res.status}`);
    }

    const totalBytes = parseInt(res.headers.get("content-length") || "0", 10);
    let receivedBytes = 0;

    const fileStream = fs.createWriteStream(localPath);

    if (res.body) {
      const reader = res.body.getReader();
      while (true) {
        if (signal.aborted) {
          fileStream.close();
          try { await fs.promises.unlink(localPath); } catch {}
          throw Object.assign(new Error("AbortError"), { name: "AbortError" });
        }

        const { done, value } = await reader.read();
        if (done) break;

        fileStream.write(Buffer.from(value));
        receivedBytes += value.length;

        if (totalBytes > 0) {
          onProgress(Math.min(100, Math.round((receivedBytes / totalBytes) * 100)));
        }
      }
    }

    await new Promise<void>((resolve, reject) => {
      fileStream.end();
      fileStream.on("finish", () => resolve());
      fileStream.on("error", (err) => reject(err));
    });

    onProgress(100);
    return localPath;
  }

  async clearCache(): Promise<void> {
    this.urlCache.clear();
    console.log("[Lavalink] In-memory URL cache cleared.");
  }
}
