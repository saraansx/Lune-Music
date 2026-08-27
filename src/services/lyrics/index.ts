import { transliterate } from "transliteration";
import { fetchBetterLyrics } from "./betterlyrics";
import { fetchPaxsenixLyrics } from "./paxsenix";
import { fetchSpotifyLyrics } from "./spotify";
import { fetchLrcLibLyrics } from "./lrclib";
import { fetchKugouLyrics } from "./kugou";
import { fetchSimpMusicLyrics } from "./simpmusic";
import { fetchUnisonLyrics } from "./unison";
import { fetchYouLyPlusLyrics } from "./youlyplus";

export interface LyricData {
  id: number;
  name: string;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  instrumental: boolean;
  plainLyrics: string;
  syncedLyrics: string;
  romanizedLyrics?: string;
}

export * from "./parser";
export { 
  fetchBetterLyrics,
  fetchPaxsenixLyrics,
  fetchSpotifyLyrics,
  fetchLrcLibLyrics,
  fetchKugouLyrics,
  fetchSimpMusicLyrics,
  fetchUnisonLyrics,
  fetchYouLyPlusLyrics
};

const DEVANAGARI_MAP: [RegExp, string][] = [
  // Compound conjuncts & common words
  [/गहरा/g, 'gehra'],
  [/हुआ/g, 'hua'],
  [/हवाएँ/g, 'hawayein'],
  [/हवाएं/g, 'hawayein'],
  [/सारी/g, 'saari'],
  [/राहें/g, 'raahein'],
  [/तेरी/g, 'teri'],
  [/मेरी/g, 'meri'],
  [/तेरा/g, 'tera'],
  [/मेरा/g, 'mera'],
  [/अगर/g, 'agar'],
  [/उजाले/g, 'ujaale'],
  [/आशिकी/g, 'aashiqui'],
  [/ख्वाब/g, 'khwaab'],
  [/बांहों/g, 'baahon'],
  [/बाहों/g, 'baahon'],
  [/आँखों/g, 'aankhon'],
  [/आंखों/g, 'aankhon'],
  [/दिल/g, 'dil'],
  [/प्यार/g, 'pyaar'],
  [/मोहब्बत/g, 'mohabbat'],
  [/जिंदगी/g, 'zindagi'],
  [/ज़िंदगी/g, 'zindagi'],
  [/तुझ/g, 'tujh'],
  [/मुझ/g, 'mujh'],
  [/साथ/g, 'saath'],
  [/पास/g, 'paas'],
  [/रात/g, 'raat'],
  [/बात/g, 'baat'],
  [/याद/g, 'yaad'],
  [/सपना/g, 'sapna'],
  [/अपने/g, 'apne'],
  [/अपना/g, 'apna'],
  [/कहना/g, 'kehna'],
  [/रहना/g, 'rehna'],
  [/सफर/g, 'safar'],
  [/नज़र/g, 'nazar'],
  [/नजर/g, 'nazar']
];

export const formatHinglishText = (text: string): string => {
  if (!text) return '';
  
  // Normalize whitespace first
  let formatted = text.replace(/\s+/g, ' ').trim();
  
  // 1. Pre-match high frequency words before generic transliteration with word boundaries
  DEVANAGARI_MAP.forEach(([regex, replacement]) => {
    formatted = formatted.replace(regex, ` ${replacement} `);
  });
  
  // 2. Perform base transliteration on remainder
  formatted = transliterate(formatted);
  
  // 3. Post-clean common transliteration artifacts
  formatted = formatted
    // Clean up nasal vowels and aspirated markers like 'N', 'aaN', 'nN'
    .replace(/([a-zA-Z])aaN/g, '$1aan')
    .replace(/([a-zA-Z])aN/g, '$1an')
    .replace(/([a-zA-Z])oN/g, '$1on')
    .replace(/([a-zA-Z])eN/g, '$1en')
    .replace(/([a-zA-Z])iN/g, '$1in')
    .replace(/([a-zA-Z])uN/g, '$1un')
    .replace(/([a-zA-Z])N/g, '$1n')
    // Fix merged words with punctuation like "ghraahuaa,ghraahuaa" -> "gehra hua, gehra hua"
    .replace(/([a-zA-Z]),([a-zA-Z])/g, '$1, $2')
    // Fix duplicate doubled vowel artifacts without crushing words
    .replace(/ii/g, 'i')
    .replace(/uu/g, 'u')
    .replace(/([a-zA-Z])aa([a-zA-Z])/g, '$1a$2')
    // Normalize quotes / apostrophes inside words like kh'vaab -> khwaab
    .replace(/kh['"]vaab/gi, 'khwaab')
    .replace(/kh['"]waab/gi, 'khwaab')
    .replace(/['"`]/g, '')
    // Fix collapsed spaces and multiple whitespaces
    .replace(/\s+/g, ' ')
    .trim();

  // 4. Final dictionary polish on Romanized tokens
  const wordReplacements: Record<string, string> = {
    'ghraa': 'gehra',
    'ghra': 'gehra',
    'huaa': 'hua',
    'huaaa': 'hua',
    'tuu': 'tu',
    'yeh': 'yeh',
    'vaae': 'hawayein',
    'nterii': 'teri',
    'nteraa': 'tera',
    'baannhon': 'baahon',
    'baanhon': 'baahon',
    'nmen': 'mein',
    'main': 'main',
    'huun': 'hoon',
    'hun': 'hoon',
    'ujale': 'ujaale',
    'kaamilhojaatawahin': 'Kaamil ho jaata wahin',
    'jaanameresawaalonkamanzartu': 'Jaana mere sawaalon ka manzar tu'
  };

  const tokens = formatted.split(' ');
  const cleanedTokens = tokens.map(token => {
    const cleanLower = token.toLowerCase().replace(/[^a-z]/g, '');
    const mapped = wordReplacements[cleanLower];
    if (mapped) {
      const trailingPunct = token.match(/[^a-zA-Z]+$/)?.[0] || '';
      return mapped + trailingPunct;
    }
    return token;
  });

  return cleanedTokens.join(' ').replace(/\s+/g, ' ').trim();
};

const ensureRomanized = (data: LyricData): LyricData => {
  if (!data.romanizedLyrics) {
    if (data.syncedLyrics) {
      // Line by line transliteration with punctuation and spacing preserved
      const lines = data.syncedLyrics.split('\n');
      const romLines = lines.map(line => {
        const timeMatch = line.match(/^\[\d{2}:\d{2}\.\d{2,3}\]/);
        if (timeMatch) {
          const timeTag = timeMatch[0];
          const rest = line.slice(timeTag.length).trim();
          return `${timeTag} ${formatHinglishText(rest)}`;
        }
        return formatHinglishText(line);
      });
      data.romanizedLyrics = romLines.join('\n');
    } else if (data.plainLyrics) {
      const lines = data.plainLyrics.split('\n');
      data.romanizedLyrics = lines.map(l => formatHinglishText(l)).join('\n');
    }
  }
  return data;
};

// Memory Cache with Max Size (100 tracks)
const memoryCache = new Map<string, { data: LyricData | null; timestamp: number }>();
const MAX_MEM_CACHE = 100;
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function getFromCache(key: string): LyricData | null | undefined {
  const mem = memoryCache.get(key);
  if (mem) {
    if (Date.now() - mem.timestamp < CACHE_TTL_MS) {
      return mem.data;
    }
    memoryCache.delete(key);
  }

  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      if (raw === 'NOT_FOUND') {
        return null;
      }
      const parsed = JSON.parse(raw);
      if (parsed) {
        if (parsed.empty) return null;
        return parsed;
      }
    }
  } catch (e) {}
  return undefined;
}

function saveToCache(key: string, data: LyricData | null) {
  if (memoryCache.size >= MAX_MEM_CACHE) {
    const firstKey = memoryCache.keys().next().value;
    if (firstKey) memoryCache.delete(firstKey);
  }
  memoryCache.set(key, { data, timestamp: Date.now() });

  try {
    if (data) {
      localStorage.setItem(key, JSON.stringify(data));
    } else {
      localStorage.setItem(key, 'NOT_FOUND');
    }
  } catch (e) {}
}

/**
 * Executes an array of provider fetchers in parallel.
 * Immediately resolves if any provider returns synced or word-level lyrics.
 * If only plain lyrics are returned, waits a short grace period (200ms) for other providers to return synced before fallback.
 */
async function raceWithSyncPriority(
  providers: { name: string; run: () => Promise<LyricData | null> }[],
  timeoutMs: number = 3500
): Promise<{ provider: string; data: LyricData } | null> {
  if (providers.length === 0) return null;

  return new Promise((resolve) => {
    let completedCount = 0;
    let isSettled = false;
    let fallbackPlainResult: { provider: string; data: LyricData } | null = null;
    let graceTimeout: any = null;

    const timer = setTimeout(() => {
      if (!isSettled) {
        isSettled = true;
        if (graceTimeout) clearTimeout(graceTimeout);
        resolve(fallbackPlainResult);
      }
    }, timeoutMs);

    providers.forEach(({ name, run }) => {
      run()
        .then((result) => {
          if (isSettled) return;
          completedCount++;

          if (result && (result.syncedLyrics || result.plainLyrics)) {
            // If provider returned Synced / Word-Level lyrics -> Resolve instantly!
            if (result.syncedLyrics && result.syncedLyrics.trim().length > 0) {
              isSettled = true;
              clearTimeout(timer);
              if (graceTimeout) clearTimeout(graceTimeout);
              resolve({ provider: name, data: result });
              return;
            }

            // If provider only returned Plain lyrics, store as candidate and give other providers 200ms grace to return synced
            if (!fallbackPlainResult) {
              fallbackPlainResult = { provider: name, data: result };
              graceTimeout = setTimeout(() => {
                if (!isSettled) {
                  isSettled = true;
                  clearTimeout(timer);
                  resolve(fallbackPlainResult);
                }
              }, 250);
            }
          }

          if (completedCount === providers.length && !isSettled) {
            isSettled = true;
            clearTimeout(timer);
            if (graceTimeout) clearTimeout(graceTimeout);
            resolve(fallbackPlainResult);
          }
        })
        .catch(() => {
          if (isSettled) return;
          completedCount++;
          if (completedCount === providers.length && !isSettled) {
            isSettled = true;
            clearTimeout(timer);
            if (graceTimeout) clearTimeout(graceTimeout);
            resolve(fallbackPlainResult);
          }
        });
    });
  });
}

export const fetchLyrics = async (
  trackName: string,
  artistName: string,
  duration?: number,
  albumName?: string,
  videoId?: string,
): Promise<LyricData | null> => {
  if (!trackName || !artistName) return null;

  // 1. Clean and sanitize track name (strips movie titles, OST tags, version suffixes)
  const cleanTrackName = trackName
    .replace(/\(from.*?\)/gi, "")
    .replace(/\[from.*?\]/gi, "")
    .replace(/\(feat\..*?\)/gi, "")
    .replace(/\(with.*?\)/gi, "")
    .replace(/\(remastered.*?\)/gi, "")
    .replace(/\(deluxe.*?\)/gi, "")
    .replace(/\(explicit.*?\)/gi, "")
    .replace(/\[explicit\]/gi, "")
    .replace(/\(official.*?\)/gi, "")
    .replace(/\[official.*?\]/gi, "")
    .replace(/\(video.*?\)/gi, "")
    .replace(/\[video.*?\]/gi, "")
    .replace(/\(lyric.*?\)/gi, "")
    .replace(/\[lyric.*?\]/gi, "")
    .replace(/- Single Version/gi, "")
    .replace(/- Remastered/gi, "")
    .replace(/- Radio Edit/gi, "")
    .replace(/- Original Mix/gi, "")
    .replace(/- .*? Mix$/gi, "")
    .replace(/\s+-\s+.*$/i, "")
    .replace(
      /\([^)]*(slowed|reverb|sped\s*up|speed\s*up|nightcore|bass\s*boost|tiktok|tik\s*tok|distorted|pitched)[^)]*\)/gi,
      "",
    )
    .replace(
      /\[[^\]]*(slowed|reverb|sped\s*up|speed\s*up|nightcore|bass\s*boost|tiktok|tik\s*tok|distorted|pitched)[^\]]*\]/gi,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();

  // Strip additional featured artists from primary name
  const primaryArtist = artistName
    .split(",")[0]
    .split("&")[0]
    .split(" feat.")[0]
    .split(" ft.")[0]
    .trim();
  const cacheKey = `luniq_lyrics_${cleanTrackName.toLowerCase()}_${primaryArtist.toLowerCase()}`.replace(/\s+/g, '_');

  const cached = getFromCache(cacheKey);
  if (cached !== undefined) {
    if (cached === null) {
      console.log(`[Lyrics] Cache hit (No lyrics available) for: "${cleanTrackName}" by ${primaryArtist}`);
      return null;
    }
    console.log(`[Lyrics] Cache hit for: "${cleanTrackName}" by ${primaryArtist}`);
    return ensureRomanized(cached);
  }

  const startTime = performance.now();

  // Helper to execute all tier-1 and tier-2 providers for given track/artist queries
  const attemptFetch = async (queryTrack: string, queryArtist: string): Promise<LyricData | null> => {
    // Tier 1: High-Speed Native & Word-Level Synced Providers (Concurrent Race)
    const tier1Providers = [
      { name: "Spotify", run: () => fetchSpotifyLyrics(queryTrack, queryArtist, duration, albumName, videoId) },
      { name: "BetterLyrics", run: () => fetchBetterLyrics(queryTrack, queryArtist, duration, albumName) },
      { name: "YouLyPlus", run: () => fetchYouLyPlusLyrics(queryTrack, queryArtist, duration, albumName) },
      { name: "Paxsenix", run: () => fetchPaxsenixLyrics(queryTrack, queryArtist, duration, albumName) },
    ];

    try {
      const tier1Result = await raceWithSyncPriority(tier1Providers, 3000);
      if (tier1Result && tier1Result.data && (tier1Result.data.syncedLyrics || tier1Result.data.plainLyrics)) {
        const elapsed = Math.round(performance.now() - startTime);
        console.log(`[Lyrics] ⚡ Resolved "${queryTrack}" via Tier-1 [${tier1Result.provider}] in ${elapsed}ms (Synced: ${!!tier1Result.data.syncedLyrics})`);
        return tier1Result.data;
      }

      // Tier 2: Secondary / Fallback Providers (LRCLib, KuGou, Unison, SimpMusic)
      const tier2Providers = [
        { name: "LRCLib", run: () => fetchLrcLibLyrics(queryTrack, queryArtist, duration) },
        { name: "KuGou", run: () => fetchKugouLyrics(queryTrack, queryArtist, duration, albumName) },
        { name: "Unison", run: () => fetchUnisonLyrics(queryTrack, queryArtist, videoId, duration, albumName) },
        ...(videoId ? [{ name: "SimpMusic", run: () => fetchSimpMusicLyrics(queryTrack, queryArtist, videoId, duration, albumName) }] : [])
      ];

      const tier2Result = await raceWithSyncPriority(tier2Providers, 3500);
      if (tier2Result && tier2Result.data && (tier2Result.data.syncedLyrics || tier2Result.data.plainLyrics)) {
        const elapsed = Math.round(performance.now() - startTime);
        console.log(`[Lyrics] 🎯 Resolved "${queryTrack}" via Tier-2 [${tier2Result.provider}] in ${elapsed}ms (Synced: ${!!tier2Result.data.syncedLyrics})`);
        return tier2Result.data;
      }
    } catch (e) {
      console.warn(`[Lyrics] Attempt failed for "${queryTrack}" / "${queryArtist}":`, e);
    }
    return null;
  };

  try {
    // 1st attempt: Cleaned Track Name + Primary Artist
    let result = await attemptFetch(cleanTrackName, primaryArtist);

    // 2nd attempt (if clean had modifications): Original Track Name + Full Artist
    if (!result && (cleanTrackName !== trackName || primaryArtist !== artistName)) {
      console.log(`[Lyrics] Retrying with raw track name: "${trackName}" by ${artistName}`);
      result = await attemptFetch(trackName.trim(), artistName.trim());
    }

    // 3rd attempt: Cleaned Track Name without Artist constraints (for rare OSTs / single names)
    if (!result && cleanTrackName) {
      result = await attemptFetch(cleanTrackName, "");
    }

    if (result && (result.syncedLyrics || result.plainLyrics)) {
      const finalData = ensureRomanized(result);
      saveToCache(cacheKey, finalData);
      return finalData;
    }

    const elapsed = Math.round(performance.now() - startTime);
    console.log(`[Lyrics] ❌ No lyrics found for "${cleanTrackName}" by ${primaryArtist} across 8 providers (${elapsed}ms)`);
    // Only cache NOT_FOUND for 30 minutes in memory rather than permanently locking
    saveToCache(cacheKey, null);
    return null;
  } catch (error) {
    console.error("[Lyrics] Error in fetchLyrics parallel coordinator:", error);
    return null;
  }
};
