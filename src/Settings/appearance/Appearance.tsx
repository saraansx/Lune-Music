import React, { useState, useEffect } from 'react';
import './Appearance.css';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme, AccentColor, CustomThemeExtension } from '../../context/ThemeContext';

const PRESET_THEMES: CustomThemeExtension[] = [
    {
        id: 'midnight-oled',
        name: 'Midnight OLED',
        author: 'Luniq Team',
        description: 'True pure black backdrop with cyan highlights for OLED displays.',
        colors: {
            accent: '#06b6d4',
            bgPrimary: '#000000',
            bgSurface: '#050505',
            glassPanelBg: 'rgba(0, 0, 0, 0.85)',
            glassCardBg: 'rgba(255, 255, 255, 0.02)',
            mesh1: '6, 182, 212',
            mesh2: '8, 47, 73',
            mesh3: '14, 116, 144'
        }
    },
    {
        id: 'cyberpunk-neon',
        name: 'Cyberpunk Neon',
        author: 'Luniq Community',
        description: 'Vibrant neon purple and hot pink with glowing futuristic aura.',
        colors: {
            accent: '#f43f5e',
            bgPrimary: '#090514',
            bgSurface: '#120b24',
            glassPanelBg: 'rgba(18, 11, 36, 0.75)',
            glassCardBg: 'rgba(244, 63, 94, 0.04)',
            mesh1: '244, 63, 94',
            mesh2: '147, 51, 234',
            mesh3: '236, 72, 153'
        }
    },
    {
        id: 'emerald-forest',
        name: 'Emerald Forest',
        author: 'Luniq Community',
        description: 'Deep soothing forest greens and mint botanical glassmorphism.',
        colors: {
            accent: '#10b981',
            bgPrimary: '#030d07',
            bgSurface: '#07170e',
            glassPanelBg: 'rgba(7, 23, 14, 0.72)',
            glassCardBg: 'rgba(16, 185, 129, 0.03)',
            mesh1: '16, 185, 129',
            mesh2: '6, 78, 59',
            mesh3: '5, 150, 105'
        }
    }
];

const Appearance: React.FC = () => {
    const { t } = useLanguage();
    const {
        accentColor, setAccentColor,
        activeThemeId, setActiveThemeId,
        customThemes, loadCustomThemes, applyCustomTheme,
        layoutDensity, setLayoutDensity,
        dynamicColor, setDynamicColor,
        ambientGlow, setAmbientGlow,
        customBackground, setCustomBackground,
        bgBlur, setBgBlur,
        bgOpacity, setBgOpacity,
        bgFit, setBgFit,
    } = useTheme();

    const [importing, setImporting] = useState(false);
    const [importMsg, setImportMsg] = useState<string | null>(null);
    const [selectingBg, setSelectingBg] = useState(false);

    useEffect(() => {
        loadCustomThemes();
    }, []);

    const ACCENT_COLORS: { id: AccentColor; name: string; hex: string }[] = [
        { id: 'slate',  name: t('appearance.color.slate'),  hex: '#64748b' },
        { id: 'zinc',   name: t('appearance.color.zinc'),   hex: '#71717a' },
        { id: 'stone',  name: t('appearance.color.stone'),  hex: '#78716c' },
        { id: 'red',    name: t('appearance.color.red'),    hex: '#dc2626' },
        { id: 'orange', name: t('appearance.color.orange'), hex: '#f97316' },
        { id: 'yellow', name: t('appearance.color.yellow'), hex: '#eab308' },
        { id: 'green',  name: t('appearance.color.green'),  hex: '#22c55e' },
        { id: 'blue',   name: t('appearance.color.blue'),   hex: '#0077f9' },
        { id: 'violet', name: t('appearance.color.violet'), hex: '#8b5cf6' },
        { id: 'rose',   name: t('appearance.color.rose'),   hex: '#ec4899' },
    ];

    const allThemes = [
        ...PRESET_THEMES,
        ...customThemes.filter(ct => !PRESET_THEMES.some(pt => pt.id === ct.id))
    ];

    const handleSelectWallpaper = async () => {
        if (!window.ipcRenderer) return;
        setSelectingBg(true);
        try {
            const res = await window.ipcRenderer.invoke('select-background-image');
            if (res && res.success && res.dataUrl) {
                setCustomBackground(res.dataUrl);
            }
        } catch (err) {
            console.error('Failed to select wallpaper:', err);
        } finally {
            setSelectingBg(false);
        }
    };

    const handleRemoveWallpaper = () => {
        setCustomBackground(null);
    };

    const handleImportTheme = async () => {
        if (!window.ipcRenderer) return;
        setImporting(true);
        setImportMsg(null);
        try {
            const res = await window.ipcRenderer.invoke('import-theme-dialog');
            if (res && res.success && res.theme) {
                await loadCustomThemes();
                applyCustomTheme(res.theme);
                setImportMsg(`Installed "${res.theme.name}"!`);
                setTimeout(() => setImportMsg(null), 3000);
            } else if (res && res.error) {
                setImportMsg(`Error: ${res.error}`);
            }
        } catch (err: any) {
            setImportMsg(`Import failed: ${err.message}`);
        } finally {
            setImporting(false);
        }
    };

    const handleOpenThemesFolder = () => {
        window.ipcRenderer?.invoke('open-themes-folder');
    };

    const handleDeleteCustomTheme = async (themeId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.ipcRenderer) return;
        await window.ipcRenderer.invoke('delete-custom-theme', themeId);
        if (activeThemeId === themeId) {
            applyCustomTheme(null);
        }
        await loadCustomThemes();
    };

    return (
        <div className="settings-language-card">
            <div className="settings-account-header">
                <h2 className="settings-account-title">{t('appearance.title')}</h2>
                <p className="settings-account-description">{t('appearance.sub')}</p>
            </div>

            <div className="language-content">

                {/* Ambient Lighting Toggle */}
                <div className="settings-row dynamic-color-row">
                    <div className="row-info">
                        <span className="row-label" style={{ fontWeight: 400 }}>
                            {t('appearance.ambientGlowLabel') || 'Ambient Background Glow'}
                        </span>
                        <span className="row-sub">
                            {t('appearance.ambientGlowSub') || 'Bathes the application background in a smooth animated ambient mesh.'}
                        </span>
                    </div>
                    <button
                        className={`luniq-toggle ${ambientGlow ? 'on' : ''}`}
                        onClick={() => setAmbientGlow(!ambientGlow)}
                        aria-pressed={ambientGlow}
                        title={t('appearance.ambientGlowLabel') || 'Ambient Background Glow'}
                    >
                        <span className="luniq-toggle-thumb" />
                    </button>
                </div>

                {/* Dynamic Color Toggle */}
                <div className="settings-row dynamic-color-row">
                    <div className="row-info">
                        <span className="row-label" style={{ fontWeight: 400 }}>
                            {t('appearance.dynamicColorLabel')}
                        </span>
                        <span className="row-sub">{t('appearance.dynamicColorSub')}</span>
                    </div>
                    <button
                        className={`luniq-toggle ${dynamicColor ? 'on' : ''}`}
                        onClick={() => setDynamicColor(!dynamicColor)}
                        aria-pressed={dynamicColor}
                        title={t('appearance.dynamicColorLabel')}
                    >
                        <span className="luniq-toggle-thumb" />
                    </button>
                </div>

                {/* ── Custom Wallpaper Section ── */}
                <div className="settings-row wallpaper-section" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '16px' }}>
                    <div className="wallpaper-header-row" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <div className="row-info">
                            <span className="row-label" style={{ fontWeight: 500 }}>
                                Custom Background
                            </span>
                            <span className="row-sub">
                                Set a personal wallpaper or image backdrop beneath Luniq's glass panels.
                            </span>
                        </div>
                        <div className="wallpaper-actions" style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                            {customBackground && (
                                <button
                                    className="theme-action-btn secondary"
                                    onClick={handleRemoveWallpaper}
                                    title="Remove custom wallpaper"
                                    style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: '#f87171' }}
                                >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                    Remove Wallpaper
                                </button>
                            )}
                            <button
                                className="theme-action-btn"
                                onClick={handleSelectWallpaper}
                                disabled={selectingBg}
                                title="Select custom image from file"
                            >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                    <polyline points="21 15 16 10 5 21"></polyline>
                                </svg>
                                {customBackground ? 'Change Image' : 'Choose Image'}
                            </button>
                        </div>
                    </div>

                    {customBackground && (
                        <div className="wallpaper-controls-panel">
                            {/* Preview & Status */}
                            <div className="wallpaper-preview-box">
                                <img src={customBackground} alt="Wallpaper preview" className="wallpaper-preview-img" style={{ filter: `blur(${bgBlur / 4}px)`, opacity: bgOpacity / 100 }} />
                                <div className="wallpaper-preview-overlay">
                                    <span className="wallpaper-live-tag">Active Backdrop</span>
                                </div>
                            </div>

                            {/* Adjustment Controls */}
                            <div className="wallpaper-sliders-grid">
                                <div className="wallpaper-control-item">
                                    <div className="wallpaper-control-header">
                                        <span className="wallpaper-control-label">Backdrop Opacity</span>
                                        <span className="wallpaper-control-val">{bgOpacity}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="10"
                                        max="100"
                                        step="5"
                                        value={bgOpacity}
                                        onChange={(e) => setBgOpacity(Number(e.target.value))}
                                        className="wallpaper-range-slider"
                                    />
                                </div>

                                <div className="wallpaper-control-item">
                                    <div className="wallpaper-control-header">
                                        <span className="wallpaper-control-label">Blur Strength</span>
                                        <span className="wallpaper-control-val">{bgBlur}px</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="40"
                                        step="2"
                                        value={bgBlur}
                                        onChange={(e) => setBgBlur(Number(e.target.value))}
                                        className="wallpaper-range-slider"
                                    />
                                </div>

                                <div className="wallpaper-control-item" style={{ gridColumn: '1 / -1' }}>
                                    <div className="wallpaper-control-header">
                                        <span className="wallpaper-control-label">Image Fit</span>
                                    </div>
                                    <div className="wallpaper-fit-pills">
                                        {(['cover', 'contain', 'fill'] as const).map((fitMode) => (
                                            <button
                                                key={fitMode}
                                                className={`wallpaper-fit-btn ${bgFit === fitMode ? 'active' : ''}`}
                                                onClick={() => setBgFit(fitMode)}
                                            >
                                                {fitMode === 'cover' ? 'Fill Screen (Cover)' : fitMode === 'contain' ? 'Fit Screen (Contain)' : 'Stretch (Fill)'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>


                {/* Accent Colors */}
                <div
                    className={`settings-row accent-section ${dynamicColor ? 'accent-section--dimmed' : ''}`}
                    style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '16px' }}
                >
                    <div className="row-info">
                        <span className="row-label" style={{ fontWeight: 400 }}>
                            {t('appearance.accentLabel')}
                        </span>
                        <span className="row-sub">
                            {dynamicColor
                                ? t('appearance.accentSubDynamic')
                                : t('appearance.accentSub')}
                        </span>
                    </div>

                    <div className={`accent-color-grid ${dynamicColor ? 'accent-color-grid--disabled' : ''}`}>
                        {ACCENT_COLORS.map((color) => (
                            <button
                                key={color.id}
                                className={`accent-color-btn ${accentColor === color.id && activeThemeId === 'default' && !dynamicColor ? 'active' : ''}`}
                                onClick={() => {
                                    if (dynamicColor) return;
                                    setAccentColor(color.id);
                                }}
                                style={{ '--color-val': color.hex } as React.CSSProperties}
                                title={color.name}
                                disabled={dynamicColor}
                            >
                                <div className="accent-color-circle" style={{ backgroundColor: color.hex }}>
                                    {accentColor === color.id && activeThemeId === 'default' && !dynamicColor && (
                                        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    )}
                                </div>
                                <span className="accent-color-name">{color.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Theme Extensions & Community Presets ── */}
                <div className="settings-row theme-extensions-section" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '20px' }}>
                    <div className="theme-ext-header-row" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <div className="row-info">
                            <span className="row-label" style={{ fontWeight: 500 }}>
                                Theme Extensions
                            </span>
                            <span className="row-sub">
                                Customize Luniq with full UI theme packs, custom palettes, and community CSS.
                            </span>
                        </div>
                        <div className="theme-actions-wrap" style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                            {activeThemeId !== 'default' && (
                                <button 
                                    className="theme-action-btn secondary"
                                    onClick={() => applyCustomTheme(null)}
                                    title="Disable custom theme and restore default appearance"
                                    style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: '#f87171' }}
                                >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                    Turn Off Theme
                                </button>
                            )}
                            <button 
                                className="theme-action-btn"
                                onClick={handleImportTheme}
                                disabled={importing}
                                title="Import .json theme extension"
                            >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="17 8 12 3 7 8"></polyline>
                                    <line x1="12" y1="3" x2="12" y2="15"></line>
                                </svg>
                                Import Theme
                            </button>
                            <button 
                                className="theme-action-btn secondary"
                                onClick={() => loadCustomThemes()}
                                title="Refresh custom themes list"
                            >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                                </svg>
                                Refresh
                            </button>
                            <button 
                                className="theme-action-btn secondary"
                                onClick={handleOpenThemesFolder}
                                title="Open themes directory"
                            >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                                </svg>
                                Themes Folder
                            </button>
                        </div>
                    </div>

                    {importMsg && (
                        <div className="theme-import-banner" style={{ fontSize: '12px', color: 'var(--accent)', padding: '6px 12px', background: 'rgba(var(--accent-rgb), 0.1)', borderRadius: '6px', width: '100%' }}>
                            {importMsg}
                        </div>
                    )}

                    <div className="theme-cards-grid">
                        {/* Default Theme Card */}
                        <div 
                            className={`theme-card ${activeThemeId === 'default' ? 'active' : ''}`}
                            onClick={() => setActiveThemeId('default')}
                        >
                            <div className="theme-card-preview" style={{ background: '#06080c', borderColor: '#0077f9' }}>
                                <div className="theme-preview-sidebar" style={{ background: 'rgba(12, 15, 22, 0.62)' }} />
                                <div className="theme-preview-dot" style={{ background: '#0077f9' }} />
                            </div>
                            <div className="theme-card-details">
                                <span className="theme-card-title">Default Luniq Glass</span>
                                <span className="theme-card-author">Official</span>
                            </div>
                        </div>

                        {/* Presets & Custom Themes */}
                        {allThemes.map(theme => {
                            const isSelected = activeThemeId === theme.id;
                            const isPreset = PRESET_THEMES.some(p => p.id === theme.id);

                            return (
                                <div 
                                    key={theme.id}
                                    className={`theme-card ${isSelected ? 'active' : ''}`}
                                    onClick={() => applyCustomTheme(theme)}
                                >
                                    <div 
                                        className="theme-card-preview" 
                                        style={{ 
                                            background: theme.colors?.bgPrimary || '#06080c',
                                            borderColor: theme.colors?.accent || 'var(--accent)'
                                        }}
                                    >
                                        <div 
                                            className="theme-preview-sidebar" 
                                            style={{ background: theme.colors?.glassPanelBg || theme.colors?.bgSurface || 'rgba(255,255,255,0.05)' }} 
                                        />
                                        <div className="theme-preview-dot" style={{ background: theme.colors?.accent || 'var(--accent)' }} />
                                    </div>
                                    <div className="theme-card-details">
                                        <div className="theme-card-title-row">
                                            <span className="theme-card-title">{theme.name}</span>
                                            {!isPreset && (
                                                <button 
                                                    className="theme-delete-btn"
                                                    onClick={(e) => handleDeleteCustomTheme(theme.id, e)}
                                                    title="Delete custom theme"
                                                >
                                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                        <span className="theme-card-author">{theme.author || 'Custom'}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Density Settings */}
                <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '16px' }}>
                    <div className="row-info">
                        <span className="row-label" style={{ fontWeight: 400 }}>{t('appearance.densityLabel')}</span>
                        <span className="row-sub">{t('appearance.densitySub')}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                        <button
                            className={`density-toggle-btn ${layoutDensity === 'comfortable' ? 'active' : ''}`}
                            onClick={() => setLayoutDensity('comfortable')}
                        >
                            {t('appearance.comfortable')}
                        </button>
                        <button
                            className={`density-toggle-btn ${layoutDensity === 'compact' ? 'active' : ''}`}
                            onClick={() => setLayoutDensity('compact')}
                        >
                            {t('appearance.compact')}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Appearance;
