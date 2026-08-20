import axios from 'axios';
import crypto from 'crypto';
import type { SpotifyTokenResponse } from './types.js';

/**
 * Derives the TOTP secret from Spotify's ciphertext byte array.
 * Spotify XORs each byte with ((index % 33) + 9), concatenates the
 * decimal results into a string, then treats it as UTF-8 bytes.
 */
function deriveSecret(ciphertext: number[]): Buffer {
    const derived = ciphertext
        .map((byte, i) => byte ^ ((i % 33) + 9))
        .join('');
    return Buffer.from(derived, 'utf8');
}

/**
 * Standard RFC-6238 TOTP using HMAC-SHA1.
 */
function generateTOTP(secret: Buffer, timestampMs: number, stepSeconds = 30, digits = 6): string {
    const epoch = Math.floor(timestampMs / 1000);
    const counter = BigInt(Math.floor(epoch / stepSeconds));
    const counterBuf = Buffer.alloc(8);
    counterBuf.writeBigInt64BE(counter);

    const hmac = crypto.createHmac('sha1', secret);
    hmac.update(counterBuf);
    const hash = hmac.digest();

    const offset = hash[hash.length - 1]! & 0xf;
    const binary =
        ((hash[offset]! & 0x7f) << 24) |
        ((hash[offset + 1]! & 0xff) << 16) |
        ((hash[offset + 2]! & 0xff) << 8) |
        (hash[offset + 3]! & 0xff);

    return (binary % 10 ** digits).toString().padStart(digits, '0');
}

export interface SpotifySecrets {
    version: string;
    ciphertext: number[];
}

export class SpotifyAuthCore {
    /**
     * Live-updating secrets source maintained by the community.
     * Falls back to the secondary URL if the primary fails.
     */
    private secretsUrls = [
        'https://raw.githubusercontent.com/Thereallo1026/spotify-secrets/main/secrets.json',
        'https://gist.githubusercontent.com/saraansx/a622d4c1a12c36afdcf701201e9482a3/raw/nuance.json',
    ];

    async getLatestSecrets(): Promise<SpotifySecrets> {
        let lastError: any;
        for (const url of this.secretsUrls) {
            try {
                const response = await axios.get(url, { timeout: 8000 });
                const data = response.data;

                // Format 1: { "61": [bytes...], "62": [bytes...] }  (new format from Thereallo1026)
                if (typeof data === 'object' && !Array.isArray(data)) {
                    const versions = Object.keys(data).sort((a, b) => parseInt(b) - parseInt(a));
                    if (versions.length > 0) {
                        const version = versions[0]!;
                        const ciphertext = data[version];
                        if (Array.isArray(ciphertext)) {
                            return { version, ciphertext };
                        }
                    }
                }

                // Format 2: [{ "s": "BASE32...", "v": 61 }]  (old nuance.json format)
                // Fall through to next URL since this format is now unsupported
                console.warn('[SpotifyAuth] Secrets URL returned old format, trying next...');
                lastError = new Error('Unsupported secrets format at ' + url);
            } catch (err) {
                console.warn('[SpotifyAuth] Failed to fetch from', url, err);
                lastError = err;
            }
        }
        throw lastError ?? new Error('Could not fetch Spotify secrets from any source');
    }

    async getServerTime(): Promise<number> {
        const response = await axios.get('https://open.spotify.com/api/server-time', { timeout: 8000 });
        return response.data.serverTime;
    }

    async getAccessToken(spDc: string): Promise<SpotifyTokenResponse> {
        const secrets = await this.getLatestSecrets();
        const serverTime = await this.getServerTime();

        const secret = deriveSecret(secrets.ciphertext);
        const nowMs = Date.now();
        const serverMs = serverTime * 1000;

        // Spotify needs both a client-time TOTP and a server-time TOTP
        const totpClient = generateTOTP(secret, nowMs);
        const totpServer = generateTOTP(secret, serverMs);

        const url = new URL('https://open.spotify.com/api/token');
        url.searchParams.set('reason', 'transport');
        url.searchParams.set('productType', 'web-player');
        url.searchParams.set('totp', totpClient);
        url.searchParams.set('totpServer', totpServer);
        url.searchParams.set('totpVer', secrets.version);
        url.searchParams.set('sTime', serverTime.toString());
        url.searchParams.set('cTime', Math.floor(nowMs / 1000).toString());

        const response = await axios.get(url.toString(), {
            headers: {
                'Cookie': `sp_dc=${spDc}`,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Origin': 'https://open.spotify.com',
                'Referer': 'https://open.spotify.com/',
            },
            timeout: 10000,
        });

        if (!response.data || !response.data.accessToken) {
            throw new Error('Failed to retrieve access token from Spotify');
        }

        if (response.data.isAnonymous) {
            throw new Error('Spotify returned an anonymous token — sp_dc cookie may be invalid or expired');
        }

        return {
            accessToken: response.data.accessToken,
            accessTokenExpirationTimestampMs: response.data.accessTokenExpirationTimestampMs,
            isAnonymous: response.data.isAnonymous,
            clientId: response.data.clientId,
        };
    }
}
