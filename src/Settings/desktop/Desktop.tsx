import React, { useState, useRef, useEffect } from 'react';
import '../language/Language.css'; 
import './Desktop.css';
import { useLanguage } from '../../context/LanguageContext';

interface DropdownProps {
    label: string;
    subLabel: string;
    options: { value: string; label: string }[];
    value: string;
    onChange: (value: string) => void;
}

const CustomDropdown: React.FC<DropdownProps> = ({ label, subLabel, options, value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const selectedOption = options.find(opt => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div 
            className="settings-row custom-dropdown-container" 
            ref={dropdownRef}
            style={{ position: 'relative', zIndex: isOpen ? 'var(--z-float)' : 'var(--z-base)' }}
        >
            <div className="row-info">
                <span className="row-label">{label}</span>
                <span className="row-sub">{subLabel}</span>
            </div>
            <div className="dropdown-wrapper">
                <button 
                    className={`dropdown-trigger ${isOpen ? 'active' : ''}`}
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <span>{selectedOption?.label}</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`chevron ${isOpen ? 'up' : ''}`}>
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </button>
                {isOpen && (
                    <div className="dropdown-menu">
                        {options.map(option => (
                            <div 
                                key={option.value}
                                className={`dropdown-item ${option.value === value ? 'selected' : ''}`}
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                            >
                                {option.label}
                                {option.value === value && (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const Desktop: React.FC = () => {
    const { t } = useLanguage();
    const [closeBehavior, setCloseBehavior] = useState('minimize'); 
    const [discordRPC, setDiscordRPC] = useState(true); 
    const [floatingLyricsEnabled, setFloatingLyricsEnabled] = useState(true);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const savedBehavior = await window.ipcRenderer?.invoke('get-setting', 'closeBehavior');
                if (savedBehavior) setCloseBehavior(savedBehavior);

                const savedRPC = await window.ipcRenderer?.invoke('get-setting', 'discordRPC');
                if (savedRPC !== undefined) setDiscordRPC(savedRPC);

                const savedLyrics = await window.ipcRenderer?.invoke('get-setting', 'floatingLyricsEnabled');
                if (savedLyrics !== undefined) setFloatingLyricsEnabled(savedLyrics);
            } catch (err) {
                console.warn('Failed to load settings', err);
            }
        };
        loadSettings();
    }, []);

    const handleBehaviorChange = async (val: string) => {
        setCloseBehavior(val);
        try {
            await window.ipcRenderer?.invoke('set-setting', 'closeBehavior', val);
        } catch (err) {
            console.warn('Failed to save closeBehavior setting', err);
        }
    };

    const handleDiscordRPCChange = async (val: boolean) => {
        setDiscordRPC(val);
        try {
            await window.ipcRenderer?.invoke('set-setting', 'discordRPC', val);
        } catch (err) {
            console.warn('Failed to save discordRPC setting', err);
        }
    };

    const handleFloatingLyricsChange = async (val: boolean) => {
        setFloatingLyricsEnabled(val);
        try {
            await window.ipcRenderer?.invoke('set-setting', 'floatingLyricsEnabled', val);
            if (!val) {
                await window.ipcRenderer?.invoke('toggle-floating-lyrics', false);
            }
        } catch (err) {
            console.warn('Failed to save floatingLyricsEnabled setting', err);
        }
    };

    const behaviorOptions = [
        { value: 'close', label: t('desktop.closeApp') || 'Close App' },
        { value: 'minimize', label: t('desktop.minimizeToTray') || 'Minimize to Tray' },
    ];

    return (
        <div className="settings-language-card desktop-card" style={{ position: 'relative' }}>
            <div className="settings-account-header">
                <h2 className="settings-account-title">{t('desktop.title') || 'Desktop'}</h2>
                <p className="settings-account-description">{t('desktop.sub') || 'Manage desktop integration and window behavior.'}</p>
            </div>

            <div className="language-content">
                <CustomDropdown 
                    label={t('desktop.closeBehavior') || 'Close Behavior'}
                    subLabel={t('desktop.closeBehaviorSub') || 'Choose what happens when you click the close button.'}
                    options={behaviorOptions}
                    value={closeBehavior}
                    onChange={handleBehaviorChange}
                />

                <div className="settings-row" style={{ marginTop: '4px' }}>
                    <div className="row-info" style={{ gap: '4px' }}>
                        <span className="row-label">{t('desktop.discordRPC') || 'Discord Rich Presence'}</span>
                        <span className="row-sub">{t('desktop.discordRPCSub') || 'Show the currently playing song on your Discord profile.'}</span>
                    </div>
                    <label className="luniq-switch">
                        <input 
                            type="checkbox" 
                            checked={discordRPC} 
                            onChange={(e) => handleDiscordRPCChange(e.target.checked)} 
                        />
                        <span className="luniq-switch-slider"></span>
                    </label>
                </div>

                <div className="settings-row" style={{ marginTop: '4px' }}>
                    <div className="row-info" style={{ gap: '4px' }}>
                        <span className="row-label">{t('desktop.floatingLyrics') || 'Floating Desktop Lyrics'}</span>
                        <span className="row-sub">{t('desktop.floatingLyricsSub') || 'Display a floating, always-on-top glass karaoke pill over other apps and games.'}</span>
                    </div>
                    <label className="luniq-switch">
                        <input 
                            type="checkbox" 
                            checked={floatingLyricsEnabled} 
                            onChange={(e) => handleFloatingLyricsChange(e.target.checked)} 
                        />
                        <span className="luniq-switch-slider"></span>
                    </label>
                </div>
            </div>
        </div>
    );
};

export default Desktop;
