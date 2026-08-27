import { LyricData, fetchLyrics } from './lyrics/index';

/**
 * High-performance smart lyrics coordinator with 2-tier concurrent promise racing,
 * word-by-word syllable timing support, and in-memory/localStorage caching.
 */
export const fetchLyricsSmart = fetchLyrics;
export { fetchLyrics };
export type { LyricData };
