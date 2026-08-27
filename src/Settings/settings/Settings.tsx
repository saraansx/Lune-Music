import React, { useState } from 'react';
import './Settings.css';
import Account from '../account/Account';
import Language from '../language/Language';
import Appearance from '../appearance/Appearance';
import Playback from '../playback/Playback';
import Downloads from '../downloads/Downloads';
import Cache from '../cache/Cache';
import Desktop from '../desktop/Desktop';
import Developer from '../developer/Developer';
import Updates from '../updates/Updates';
import About from '../about/About';
import ListeningTime from '../listening/ListeningTime';
import { useLanguage } from '../../context/LanguageContext';

interface SettingsProps {
    accessToken: string;
    cookies: any[];
    isClosing?: boolean;
}

type SettingsTab = 'all' | 'listening' | 'playback' | 'appearance' | 'language' | 'desktop' | 'system';

const Settings: React.FC<SettingsProps> = ({ accessToken, cookies, isClosing = false }) => {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<SettingsTab>('all');

    const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
        {
            id: 'all',
            label: 'All Settings',
            icon: (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
            )
        },
        {
            id: 'listening',
            label: 'Listening Activity',
            icon: (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
            )
        },
        {
            id: 'playback',
            label: t('playback.title') || 'Playback & DSP',
            icon: (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                </svg>
            )
        },
        {
            id: 'appearance',
            label: t('appearance.title') || 'Appearance',
            icon: (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5"></circle>
                    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path>
                </svg>
            )
        },
        {
            id: 'language',
            label: t('langRegion.title') || 'Language & Region',
            icon: (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                </svg>
            )
        },
        {
            id: 'desktop',
            label: t('desktop.title') || 'Desktop & Window',
            icon: (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                    <line x1="8" y1="21" x2="16" y2="21"></line>
                    <line x1="12" y1="17" x2="12" y2="21"></line>
                </svg>
            )
        },
        {
            id: 'system',
            label: 'System & About',
            icon: (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
            )
        }
    ];

    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    return (
        <div className={`settings-container ${isClosing ? 'settings-closing' : 'settings-opening'}`}>
            <div className={`settings-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
                {/* Settings Sidebar */}
                <aside className="settings-sidebar">
                    <div className="settings-sidebar-header">
                        {!sidebarCollapsed && (
                            <div className="sidebar-brand-text">
                                <h2>{t('settings.settings')}</h2>
                            </div>
                        )}
                        <button 
                            className="sidebar-toggle-btn"
                            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="9" y1="3" x2="9" y2="21"></line>
                            </svg>
                        </button>
                    </div>

                    <nav className="settings-sidebar-nav">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                className={`settings-sidebar-item ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                                title={sidebarCollapsed ? tab.label : undefined}
                            >
                                <span className="tab-icon">{tab.icon}</span>
                                {!sidebarCollapsed && <span className="tab-label">{tab.label}</span>}
                            </button>
                        ))}
                    </nav>
                </aside>

                {/* Settings Main View */}
                <main className="settings-main-scroll">
                    <div className="settings-main-content">
                        {/* Dedicated Listening Activity View (Not shown in 'all' tab per user requirement) */}
                        {activeTab === 'listening' && (
                            <ListeningTime />
                        )}

                        {(activeTab === 'all' || activeTab === 'system') && (
                            <Account accessToken={accessToken} cookies={cookies} />
                        )}
                        
                        {(activeTab === 'all' || activeTab === 'language') && (
                            <Language />
                        )}
                        
                        {(activeTab === 'all' || activeTab === 'appearance') && (
                            <Appearance />
                        )}
                        
                        {(activeTab === 'all' || activeTab === 'playback') && (
                            <Playback accessToken={accessToken} />
                        )}
                        
                        {(activeTab === 'all' || activeTab === 'playback') && (
                            <Downloads />
                        )}
                        
                        {(activeTab === 'all' || activeTab === 'desktop') && (
                            <Desktop />
                        )}
                        
                        {(activeTab === 'all' || activeTab === 'system') && (
                            <>
                                <Cache />
                                <Developer />
                                <Updates />
                                <About />
                            </>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Settings;
