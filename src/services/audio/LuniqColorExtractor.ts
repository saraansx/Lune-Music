/**
 * Luniq Ultra-Fast Dynamic Color & Ambient Mesh Extractor (Color Thief 2.0 Engine)
 * 
 * Extracts primary vibrant, secondary atmospheric, and deep shadow palettes
 * directly from album artwork using an off-screen downsampled canvas (~2ms execution).
 */

export interface ExtractedPalette {
  primary: string; // Hex or rgb
  secondary: string;
  shadow: string;
  glowPrimary: string;
  glowSecondary: string;
}

const colorCache = new Map<string, ExtractedPalette>();

export function extractPaletteFromImage(imageUrl: string): Promise<ExtractedPalette> {
  if (colorCache.has(imageUrl)) {
    return Promise.resolve(colorCache.get(imageUrl)!);
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        if (!ctx) {
          resolve(getDefaultPalette());
          return;
        }

        // Downsample to 32x32 for ultra-fast calculation
        canvas.width = 32;
        canvas.height = 32;
        ctx.drawImage(img, 0, 0, 32, 32);

        const imageData = ctx.getImageData(0, 0, 32, 32).data;
        const colorBuckets: Array<{ r: number; g: number; b: number; count: number; sat: number; lum: number }> = [];

        for (let i = 0; i < imageData.length; i += 16) { // Step by 4 pixels (16 bytes)
          const r = imageData[i];
          const g = imageData[i + 1];
          const b = imageData[i + 2];
          const a = imageData[i + 3];

          if (a < 128) continue; // Ignore transparency

          // Calculate Luminance & Saturation
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const lum = (max + min) / 510;
          const delta = max - min;
          const sat = max === 0 ? 0 : delta / max;

          // Skip pure black and pure white
          if (lum > 0.08 && lum < 0.92) {
            colorBuckets.push({ r, g, b, count: 1, sat, lum });
          }
        }

        if (colorBuckets.length === 0) {
          resolve(getDefaultPalette());
          return;
        }

        // 1. Sort by saturation * lum balance to get primary vibrant color
        const sortedByVibrance = [...colorBuckets].sort((a, b) => {
          const scoreA = a.sat * 1.5 + (1 - Math.abs(a.lum - 0.5));
          const scoreB = b.sat * 1.5 + (1 - Math.abs(b.lum - 0.5));
          return scoreB - scoreA;
        });

        const primaryRaw = sortedByVibrance[0] || colorBuckets[0];
        
        // 2. Find a secondary color with distinct hue distance
        let secondaryRaw = sortedByVibrance.find(c => {
          const dist = Math.abs(c.r - primaryRaw.r) + Math.abs(c.g - primaryRaw.g) + Math.abs(c.b - primaryRaw.b);
          return dist > 90;
        }) || sortedByVibrance[Math.min(3, sortedByVibrance.length - 1)];

        const primary = `rgb(${primaryRaw.r}, ${primaryRaw.g}, ${primaryRaw.b})`;
        const secondary = `rgb(${secondaryRaw.r}, ${secondaryRaw.g}, ${secondaryRaw.b})`;
        const shadow = `rgba(${Math.floor(primaryRaw.r * 0.2)}, ${Math.floor(primaryRaw.g * 0.2)}, ${Math.floor(primaryRaw.b * 0.2)}, 0.9)`;
        const glowPrimary = `rgba(${primaryRaw.r}, ${primaryRaw.g}, ${primaryRaw.b}, 0.25)`;
        const glowSecondary = `rgba(${secondaryRaw.r}, ${secondaryRaw.g}, ${secondaryRaw.b}, 0.18)`;

        const palette: ExtractedPalette = {
          primary,
          secondary,
          shadow,
          glowPrimary,
          glowSecondary,
        };

        colorCache.set(imageUrl, palette);
        resolve(palette);
      } catch (err) {
        console.warn('[ColorExtractor] Extraction failed:', err);
        resolve(getDefaultPalette());
      }
    };

    img.onerror = () => {
      resolve(getDefaultPalette());
    };

    img.src = imageUrl;
  });
}

export function applyPaletteToDOM(palette: ExtractedPalette) {
  const root = document.documentElement;
  root.style.setProperty('--dynamic-glow-primary', palette.glowPrimary);
  root.style.setProperty('--dynamic-glow-secondary', palette.glowSecondary);
  root.style.setProperty('--dynamic-accent', palette.primary);
}

function getDefaultPalette(): ExtractedPalette {
  return {
    primary: '#0077f9',
    secondary: '#8a2be2',
    shadow: 'rgba(10, 10, 15, 0.9)',
    glowPrimary: 'rgba(0, 119, 249, 0.15)',
    glowSecondary: 'rgba(138, 43, 226, 0.12)',
  };
}
