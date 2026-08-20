import React, { createContext, useContext, useState, useEffect } from 'react';

export type AccentColor = 
  | 'slate' | 'zinc' | 'stone' | 'red' | 'orange' 
  | 'yellow' | 'green' | 'blue' | 'violet' | 'rose';

export interface CustomThemeExtension {
  id: string;
  name: string;
  author?: string;
  description?: string;
  version?: string;
  colors: {
    accent: string;
    bgPrimary?: string;
    bgSurface?: string;
    textMain?: string;
    textDim?: string;
    mesh1?: string;
    mesh2?: string;
    mesh3?: string;
    glassPanelBg?: string;
    glassCardBg?: string;
  };
  customCss?: string;
}

interface ExtractedPalette {
  primary: [number, number, number];
  secondary: [number, number, number];
  tertiary: [number, number, number];
}

export type LayoutDensity = 'comfortable' | 'compact';
export type BackgroundFit = 'cover' | 'contain' | 'fill';

interface ThemeContextType {
  accentColor: AccentColor;
  setAccentColor: (color: AccentColor) => void;
  activeThemeId: string;
  setActiveThemeId: (id: string) => void;
  customThemes: CustomThemeExtension[];
  loadCustomThemes: () => Promise<void>;
  applyCustomTheme: (theme: CustomThemeExtension | null) => void;
  layoutDensity: LayoutDensity;
  setLayoutDensity: (density: LayoutDensity) => void;
  dynamicColor: boolean;
  setDynamicColor: (v: boolean) => void;
  ambientGlow: boolean;
  setAmbientGlow: (v: boolean) => void;
  applyDynamicColor: (imageUrl: string) => void;
  isInApp: boolean;
  setIsInApp: (v: boolean) => void;
  customBackground: string | null;
  setCustomBackground: (image: string | null) => void;
  bgBlur: number;
  setBgBlur: (blur: number) => void;
  bgOpacity: number;
  setBgOpacity: (opacity: number) => void;
  bgFit: BackgroundFit;
  setBgFit: (fit: BackgroundFit) => void;
}


const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const ACCENT_COLORS: Record<AccentColor, { hex: string; rgb: string; mesh1: string; mesh2: string; mesh3: string }> = {
  slate:  { hex: '#64748b', rgb: '100, 116, 139', mesh1: '55, 68, 88',  mesh2: '40, 52, 70',  mesh3: '65, 78, 100' },
  zinc:   { hex: '#71717a', rgb: '113, 113, 122', mesh1: '60, 60, 68',  mesh2: '45, 45, 52',  mesh3: '70, 70, 78'  },
  stone:  { hex: '#78716c', rgb: '120, 113, 108', mesh1: '68, 62, 56',  mesh2: '52, 46, 40',  mesh3: '78, 72, 66'  },
  red:    { hex: '#dc2626', rgb: '220, 38, 38',   mesh1: '85, 30, 30',  mesh2: '65, 18, 18',  mesh3: '95, 42, 42'  },
  orange: { hex: '#f97316', rgb: '249, 115, 22',  mesh1: '85, 52, 20',  mesh2: '68, 38, 12',  mesh3: '95, 65, 32'  },
  yellow: { hex: '#eab308', rgb: '234, 179, 8',   mesh1: '80, 65, 18',  mesh2: '65, 50, 8',   mesh3: '90, 75, 28'  },
  green:  { hex: '#22c55e', rgb: '34, 197, 94',   mesh1: '28, 70, 42',  mesh2: '16, 52, 28',  mesh3: '42, 82, 55'  },
  blue:   { hex: '#0077f9', rgb: '0, 119, 249',   mesh1: '25, 60, 95',  mesh2: '15, 42, 75',  mesh3: '38, 75, 115' },
  violet: { hex: '#8b5cf6', rgb: '139, 92, 246',  mesh1: '60, 38, 90',  mesh2: '45, 24, 72',  mesh3: '72, 48, 105' },
  rose:   { hex: '#ec4899', rgb: '236, 72, 153',  mesh1: '85, 32, 65',  mesh2: '68, 20, 48',  mesh3: '95, 45, 75'  },
};

const extractPaletteFromImage = (imageUrl: string): Promise<ExtractedPalette> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const SIZE = 64;
        const canvas = document.createElement('canvas');
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('no ctx'));
        ctx.drawImage(img, 0, 0, SIZE, SIZE);
        const { data } = ctx.getImageData(0, 0, SIZE, SIZE);

        const buckets: { r: number; g: number; b: number; weight: number }[] = [];
        
        for (let i = 0; i < data.length; i += 4) {
          const pr = data[i], pg = data[i + 1], pb = data[i + 2];
          const lum = (pr + pg + pb) / 3;
          if (lum < 20 || lum > 240) continue;
          const maxC = Math.max(pr, pg, pb);
          const minC = Math.min(pr, pg, pb);
          const sat = maxC === 0 ? 0 : (maxC - minC) / maxC;
          
          const weight = 1 + sat * 5;
          buckets.push({ r: pr, g: pg, b: pb, weight });
        }

        if (buckets.length === 0) {
          return resolve({
            primary: [0, 119, 249],
            secondary: [25, 60, 95],
            tertiary: [38, 75, 115]
          });
        }

        // Sort by saturation and brightness
        buckets.sort((a, b) => b.weight - a.weight);

        const primaryRaw = buckets[0];
        const secondaryRaw = buckets[Math.floor(buckets.length * 0.35)] || primaryRaw;
        const tertiaryRaw = buckets[Math.floor(buckets.length * 0.7)] || secondaryRaw;

        const boostColor = (c: { r: number; g: number; b: number }): [number, number, number] => {
          let r = c.r, g = c.g, b = c.b;
          const avg = (r + g + b) / 3;
          const maxC = Math.max(r, g, b);
          const sat = maxC === 0 ? 0 : (maxC - Math.min(r, g, b)) / maxC;
          if (sat < 0.3) {
            const boost = 1.8;
            r = Math.min(255, Math.max(0, Math.round(r + (r - avg) * boost)));
            g = Math.min(255, Math.max(0, Math.round(g + (g - avg) * boost)));
            b = Math.min(255, Math.max(0, Math.round(b + (b - avg) * boost)));
          }
          const lum = (r + g + b) / 3;
          if (lum < 70 && lum > 0) {
            const factor = 70 / lum;
            r = Math.min(255, Math.round(r * factor));
            g = Math.min(255, Math.round(g * factor));
            b = Math.min(255, Math.round(b * factor));
          }
          return [r, g, b];
        };

        resolve({
          primary: boostColor(primaryRaw),
          secondary: boostColor(secondaryRaw),
          tertiary: boostColor(tertiaryRaw)
        });
      } catch (e) { reject(e); }
    };
    img.onerror = () => reject(new Error('image load failed'));
    img.src = imageUrl;
  });

let _rafId: number | null = null;

const animateToPalette = (
  from: ExtractedPalette,
  to: ExtractedPalette,
  ambientGlowEnabled: boolean,
  durationMs = 1200,
) => {
  if (_rafId !== null) cancelAnimationFrame(_rafId);
  const start = performance.now();
  const root = document.documentElement;
  const hex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');

  const tick = (now: number) => {
    const raw = Math.min((now - start) / durationMs, 1);
    const t = raw < 0.5 ? 4 * raw ** 3 : 1 - (-2 * raw + 2) ** 3 / 2;

    const lerpColor = (c1: [number, number, number], c2: [number, number, number]): [number, number, number] => [
      c1[0] + (c2[0] - c1[0]) * t,
      c1[1] + (c2[1] - c1[1]) * t,
      c1[2] + (c2[2] - c1[2]) * t,
    ];

    const p = lerpColor(from.primary, to.primary);
    const s = lerpColor(from.secondary, to.secondary);
    const tr = lerpColor(from.tertiary, to.tertiary);

    const hexColor = `#${hex(p[0])}${hex(p[1])}${hex(p[2])}`;
    root.style.setProperty('--accent', hexColor);
    root.style.setProperty('--accent-main', hexColor);
    root.style.setProperty('--accent-rgb', `${Math.round(p[0])}, ${Math.round(p[1])}, ${Math.round(p[2])}`);

    if (ambientGlowEnabled) {
      const mesh = `
        radial-gradient(at 0% 0%,   rgba(${Math.round(p[0])}, ${Math.round(p[1])}, ${Math.round(p[2])}, 0.38) 0, transparent 55%),
        radial-gradient(at 100% 0%, rgba(${Math.round(s[0])}, ${Math.round(s[1])}, ${Math.round(s[2])}, 0.32) 0, transparent 50%),
        radial-gradient(at 50% 100%,rgba(${Math.round(tr[0])}, ${Math.round(tr[1])}, ${Math.round(tr[2])}, 0.28) 0, transparent 60%)`;
      root.style.setProperty('--bg-mesh', mesh);
    }

    if (raw < 1) {
      _rafId = requestAnimationFrame(tick);
    } else {
      _rafId = null;
    }
  };
  _rafId = requestAnimationFrame(tick);
};

const hexToRgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

const parseRgbString = (str: string): [number, number, number] => {
  const parts = str.split(',').map(s => parseInt(s.trim(), 10));
  return parts.length === 3 && parts.every(n => !isNaN(n))
    ? [parts[0], parts[1], parts[2]]
    : [0, 119, 249];
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accentColor, setAccentColorState] = useState<AccentColor>('blue');
  const [activeThemeId, setActiveThemeIdState] = useState<string>(
    () => localStorage.getItem('luniq_active_theme_id') || 'default'
  );
  const [customThemes, setCustomThemes] = useState<CustomThemeExtension[]>([]);
  const [layoutDensity, setLayoutDensityState] = useState<LayoutDensity>('comfortable');
  const [dynamicColor, setDynamicColorState] = useState<boolean>(
    () => localStorage.getItem('luniq_dynamic_color') !== 'false',
  );
  const [ambientGlow, setAmbientGlowState] = useState<boolean>(
    () => localStorage.getItem('luniq_ambient_glow') !== 'false',
  );
  const [customBackground, setCustomBackgroundState] = useState<string | null>(
    () => localStorage.getItem('luniq_custom_background') || null
  );
  const [bgBlur, setBgBlurState] = useState<number>(
    () => parseInt(localStorage.getItem('luniq_bg_blur') || '10', 10)
  );
  const [bgOpacity, setBgOpacityState] = useState<number>(
    () => parseInt(localStorage.getItem('luniq_bg_opacity') || '50', 10)
  );
  const [bgFit, setBgFitState] = useState<BackgroundFit>(
    () => (localStorage.getItem('luniq_bg_fit') as BackgroundFit) || 'cover'
  );

  const [isInApp, setIsInApp] = useState(false);
  const currentPaletteRef = React.useRef<ExtractedPalette>({
    primary: [0, 119, 249],
    secondary: [25, 60, 95],
    tertiary: [38, 75, 115],
  });

  const customStyleElRef = React.useRef<HTMLStyleElement | null>(null);

  const loadCustomThemes = async () => {
    if (window.ipcRenderer) {
      try {
        const themes = await window.ipcRenderer.invoke('get-custom-themes');
        if (Array.isArray(themes)) {
          setCustomThemes(themes);
        }
      } catch (err) {
        console.warn('[Theme] Could not fetch custom themes from disk:', err);
      }
    }
  };

  const applyCustomTheme = (theme: CustomThemeExtension | null) => {
    const root = document.documentElement;

    if (!customStyleElRef.current) {
      const el = document.createElement('style');
      el.id = 'luniq-custom-theme-style';
      document.head.appendChild(el);
      customStyleElRef.current = el;
    }

    if (!theme) {
      setActiveThemeIdState('default');
      localStorage.setItem('luniq_active_theme_id', 'default');
      customStyleElRef.current.textContent = '';
      root.style.removeProperty('--bg-primary');
      root.style.removeProperty('--bg-surface');
      root.style.removeProperty('--text-main');
      root.style.removeProperty('--text-dim');
      root.style.removeProperty('--glass-panel-bg');
      root.style.removeProperty('--glass-card-bg');
      return;
    }

    setActiveThemeIdState(theme.id);
    localStorage.setItem('luniq_active_theme_id', theme.id);

    const c = theme.colors;
    if (c.accent) {
      root.style.setProperty('--accent', c.accent);
      root.style.setProperty('--accent-main', c.accent);
      const rgb = hexToRgb(c.accent);
      root.style.setProperty('--accent-rgb', `${rgb[0]}, ${rgb[1]}, ${rgb[2]}`);
    }
    if (c.bgPrimary) root.style.setProperty('--bg-primary', c.bgPrimary);
    if (c.bgSurface) root.style.setProperty('--bg-surface', c.bgSurface);
    if (c.textMain) root.style.setProperty('--text-main', c.textMain);
    if (c.textDim) root.style.setProperty('--text-dim', c.textDim);
    if (c.glassPanelBg) root.style.setProperty('--glass-panel-bg', c.glassPanelBg);
    if (c.glassCardBg) root.style.setProperty('--glass-card-bg', c.glassCardBg);

    if (ambientGlow && c.mesh1) {
      root.style.setProperty('--bg-mesh', `
        radial-gradient(at 0% 0%,   rgba(${c.mesh1}, 0.45) 0, transparent 55%),
        radial-gradient(at 100% 0%, rgba(${c.mesh2 || c.mesh1}, 0.40) 0, transparent 50%),
        radial-gradient(at 50% 100%,rgba(${c.mesh3 || c.mesh1}, 0.35) 0, transparent 60%)`);
    }

    if (theme.customCss && customStyleElRef.current) {
      customStyleElRef.current.textContent = theme.customCss;
    } else if (customStyleElRef.current) {
      customStyleElRef.current.textContent = '';
    }
  };

  useEffect(() => {
    loadCustomThemes();
    const savedColor = localStorage.getItem('luniq_accent_color') as AccentColor;
    if (savedColor && ACCENT_COLORS[savedColor]) setAccentColorState(savedColor);

    const savedDensity = localStorage.getItem('luniq_layout_density') as LayoutDensity;
    if (savedDensity) setLayoutDensityState(savedDensity);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (customBackground) {
      root.style.setProperty('--custom-bg-image', `url("${customBackground}")`);
      root.style.setProperty('--custom-bg-blur', `${bgBlur}px`);
      root.style.setProperty('--custom-bg-opacity', `${bgOpacity / 100}`);
      root.style.setProperty('--custom-bg-fit', bgFit);
      root.setAttribute('data-has-custom-bg', 'true');
    } else {
      root.style.removeProperty('--custom-bg-image');
      root.style.removeProperty('--custom-bg-blur');
      root.style.removeProperty('--custom-bg-opacity');
      root.style.removeProperty('--custom-bg-fit');
      root.removeAttribute('data-has-custom-bg');
    }
  }, [customBackground, bgBlur, bgOpacity, bgFit]);

  useEffect(() => {
    if (activeThemeId !== 'default' && customThemes.length > 0) {
      const matched = customThemes.find(t => t.id === activeThemeId);
      if (matched) {
        applyCustomTheme(matched);
        return;
      }
    }

    if (dynamicColor && isInApp) return;
    const theme = isInApp ? ACCENT_COLORS[accentColor] : ACCENT_COLORS['blue'];
    const root = document.documentElement;
    root.style.setProperty('--accent', theme.hex);
    root.style.setProperty('--accent-main', theme.hex);
    root.style.setProperty('--accent-rgb', theme.rgb);

    if (ambientGlow) {
      root.style.setProperty('--bg-mesh', `
        radial-gradient(at 0% 0%,   rgba(${theme.mesh1}, 0.45) 0, transparent 55%),
        radial-gradient(at 100% 0%, rgba(${theme.mesh2}, 0.40) 0, transparent 50%),
        radial-gradient(at 50% 100%,rgba(${theme.mesh3}, 0.35) 0, transparent 60%)`);
    } else {
      root.style.setProperty('--bg-mesh', 'none');
    }
    root.setAttribute('data-density', layoutDensity);
  }, [accentColor, layoutDensity, dynamicColor, ambientGlow, isInApp, activeThemeId, customThemes]);

  useEffect(() => {
    document.documentElement.setAttribute('data-density', layoutDensity);
  }, [layoutDensity]);

  const setAccentColor = (color: AccentColor) => {
    if (activeThemeId !== 'default') {
      applyCustomTheme(null);
    }
    setAccentColorState(color);
    localStorage.setItem('luniq_accent_color', color);
  };

  const setActiveThemeId = (id: string) => {
    if (id === 'default') {
      applyCustomTheme(null);
    } else {
      const t = customThemes.find(x => x.id === id);
      if (t) applyCustomTheme(t);
    }
  };

  const setLayoutDensity = (density: LayoutDensity) => {
    setLayoutDensityState(density);
    localStorage.setItem('luniq_layout_density', density);
  };

  const setCustomBackground = (image: string | null) => {
    setCustomBackgroundState(image);
    if (image) {
      localStorage.setItem('luniq_custom_background', image);
    } else {
      localStorage.removeItem('luniq_custom_background');
    }
  };

  const setBgBlur = (blur: number) => {
    setBgBlurState(blur);
    localStorage.setItem('luniq_bg_blur', String(blur));
  };

  const setBgOpacity = (opacity: number) => {
    setBgOpacityState(opacity);
    localStorage.setItem('luniq_bg_opacity', String(opacity));
  };

  const setBgFit = (fit: BackgroundFit) => {
    setBgFitState(fit);
    localStorage.setItem('luniq_bg_fit', fit);
  };

  const setDynamicColor = (v: boolean) => {
    setDynamicColorState(v);
    localStorage.setItem('luniq_dynamic_color', String(v));
    
    if (!v) {
      const theme = ACCENT_COLORS[accentColor];
      const targetPalette: ExtractedPalette = {
        primary: hexToRgb(theme.hex),
        secondary: parseRgbString(theme.mesh1),
        tertiary: parseRgbString(theme.mesh3)
      };
      animateToPalette(currentPaletteRef.current, targetPalette, ambientGlow);
      currentPaletteRef.current = targetPalette;
    }
  };

  const setAmbientGlow = (v: boolean) => {
    setAmbientGlowState(v);
    localStorage.setItem('luniq_ambient_glow', String(v));
    const root = document.documentElement;
    if (!v) {
      root.style.setProperty('--bg-mesh', 'none');
    } else {
      const p = currentPaletteRef.current;
      root.style.setProperty('--bg-mesh', `
        radial-gradient(at 0% 0%,   rgba(${p.primary[0]}, ${p.primary[1]}, ${p.primary[2]}, 0.38) 0, transparent 55%),
        radial-gradient(at 100% 0%, rgba(${p.secondary[0]}, ${p.secondary[1]}, ${p.secondary[2]}, 0.32) 0, transparent 50%),
        radial-gradient(at 50% 100%,rgba(${p.tertiary[0]}, ${p.tertiary[1]}, ${p.tertiary[2]}, 0.28) 0, transparent 60%)`);
    }
  };

  const applyDynamicColor = async (imageUrl: string) => {
    if (!imageUrl || !isInApp) return;
    try {
      const newPalette = await extractPaletteFromImage(imageUrl);
      animateToPalette(currentPaletteRef.current, newPalette, ambientGlow);
      currentPaletteRef.current = newPalette;
    } catch {
      // Fallback gracefully
    }
  };

  return (
    <ThemeContext.Provider value={{
      accentColor, setAccentColor,
      activeThemeId, setActiveThemeId,
      customThemes, loadCustomThemes, applyCustomTheme,
      layoutDensity, setLayoutDensity,
      dynamicColor, setDynamicColor,
      ambientGlow, setAmbientGlow,
      applyDynamicColor,
      isInApp, setIsInApp,
      customBackground, setCustomBackground,
      bgBlur, setBgBlur,
      bgOpacity, setBgOpacity,
      bgFit, setBgFit,
    }}>
      {children}
    </ThemeContext.Provider>
  );
};


export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
};
