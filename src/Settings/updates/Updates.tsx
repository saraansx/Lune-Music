import React, { useState, useEffect } from 'react';
import './Updates.css';
import { useLanguage } from '../../context/LanguageContext';

const Updates: React.FC = () => {
    const { t } = useLanguage();
    const [autoUpdate, setAutoUpdate] = useState(true);
    const [autoUpdateYtdlp, setAutoUpdateYtdlp] = useState(true);

    
    useEffect(() => {
        const loadSettings = async () => {
            if (window.ipcRenderer) {
                const appSetting = await window.ipcRenderer.invoke('get-setting', 'autoUpdateApp');
                const ytdlpSetting = await window.ipcRenderer.invoke('get-setting', 'autoUpdateYtdlp');
                
                if (appSetting !== undefined) setAutoUpdate(appSetting);
                if (ytdlpSetting !== undefined) setAutoUpdateYtdlp(ytdlpSetting);
            }
        };
        loadSettings();
    }, []);

    
    const handleToggle = (newValue: boolean) => {
        setAutoUpdate(newValue);
        if (window.ipcRenderer) {
            window.ipcRenderer.invoke('set-setting', 'autoUpdateApp', newValue);
        }
    };

    
    const handleYtdlpToggle = (newValue: boolean) => {
        setAutoUpdateYtdlp(newValue);
        if (window.ipcRenderer) {
            window.ipcRenderer.invoke('set-setting', 'autoUpdateYtdlp', newValue);
        }
    };

    return (
        <div className="settings-language-card about-card">
            <div className="settings-account-header">
                <h2 className="settings-account-title">{t('updates.title') || 'Updates'}</h2>
                <p className="settings-account-description">{t('updates.sub') || 'Manage application updates and playback system optimizations.'}</p>
            </div>

            <div className="language-content">
                {/* App Auto-Update Toggle */}
                <div className="settings-row" onClick={() => handleToggle(!autoUpdate)} style={{ cursor: 'pointer' }}>
                    <div className="row-info">
                        <span className="row-label">{t('updates.autoUpdateLabel') || 'Auto-Update Luniq'}</span>
                        <span className="row-sub">{t('updates.autoUpdateSub') || 'Automatically download and install updates in the background.'}</span>
                    </div>
                    <label className="luniq-switch" onClick={(e) => e.stopPropagation()}>
                        <input 
                            type="checkbox" 
                            checked={autoUpdate}
                            onChange={(e) => handleToggle(e.target.checked)}
                        />
                        <span className="luniq-switch-slider"></span>
                    </label>
                </div>

                {/* App Manual Check Action */}
                <div className="settings-row">
                    <div className="row-info">
                        <span className="row-label">{t('updates.checkUpdate') || 'Check for Updates'}</span>
                        <span className="row-sub">
                            {autoUpdate 
                                ? (t('updates.managedByAuto') || 'Updates are managed automatically.')
                                : (t('updates.checkUpdateSub') || 'Manually check if a new version is available.')
                            }
                        </span>
                    </div>
                    {autoUpdate ? (
                        <span className="updates-status-badge">
                            <span className="status-dot"></span>
                            Automatic
                        </span>
                    ) : (
                        <button 
                            className="updates-action-btn"
                            onClick={() => window.ipcRenderer.invoke('check-app-update')}
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                            </svg>
                            <span>Check Now</span>
                        </button>
                    )}
                </div>

                {/* Driver / Engine Auto-Update Toggle */}
                <div className="settings-row" onClick={() => handleYtdlpToggle(!autoUpdateYtdlp)} style={{ cursor: 'pointer' }}>
                    <div className="row-info">
                        <span className="row-label">{t('updates.ytdlpLabel') || 'Update Playback Drivers'}</span>
                        <span className="row-sub">{t('updates.ytdlpSub') || 'Automatically keep the playback system optimized for the best experience.'}</span>
                    </div>
                    <label className="luniq-switch" onClick={(e) => e.stopPropagation()}>
                        <input 
                            type="checkbox" 
                            checked={autoUpdateYtdlp}
                            onChange={(e) => handleYtdlpToggle(e.target.checked)}
                        />
                        <span className="luniq-switch-slider"></span>
                    </label>
                </div>

                {/* Driver Manual Check Action */}
                <div className="settings-row">
                    <div className="row-info">
                        <span className="row-label">{t('updates.checkYtdlp') || 'Check for Driver Updates'}</span>
                        <span className="row-sub">
                            {autoUpdateYtdlp 
                                ? (t('updates.managedByAuto') || 'Updates are managed automatically.')
                                : (t('updates.checkYtdlpSub') || 'Ensure your playback engine is running the latest version.')
                            }
                        </span>
                    </div>
                    {autoUpdateYtdlp ? (
                        <span className="updates-status-badge">
                            <span className="status-dot"></span>
                            Automatic
                        </span>
                    ) : (
                        <button 
                            className="updates-action-btn"
                            onClick={() => window.ipcRenderer.send('check-ytdlp-update')}
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="23 4 23 10 17 10"></polyline>
                                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                            </svg>
                            <span>Update Drivers</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Updates;
