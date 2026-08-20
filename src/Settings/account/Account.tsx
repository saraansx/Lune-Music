import React, { useEffect, useState } from 'react';
import './Account.css';
import { useApi } from '../../context/ApiContext';
import { useLanguage } from '../../context/LanguageContext';

interface AccountProps {
    accessToken: string;
    cookies: any[];
}

const Account: React.FC<AccountProps> = ({ accessToken, cookies }) => {
    const { t } = useLanguage();
    const isGuest = !cookies?.some((c: any) => c.name === 'sp_dc');
    const [accountData, setAccountData] = useState<{ profile: any, attributes: any } | null>(null);
    const [loading, setLoading] = useState(!isGuest);

    const api = useApi();

    useEffect(() => {
        if (isGuest) {
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                setLoading(true);
                const [profile, attributes] = await Promise.all([
                    api.user.me(),
                    api.user.attributes().catch(() => null) 
                ]);
                setAccountData({ profile, attributes });
            } catch (err) {
                console.error('Failed to fetch user data:', err);
            } finally {
                setLoading(false);
            }
        };

        if (accessToken) {
            fetchData();
        }
    }, [api, accessToken, isGuest]);

    const handleLogout = async () => {
        try {
            await window.ipcRenderer?.invoke('logout');
            window.location.reload();
        } catch (err) {
            console.error('Logout failed:', err);
        }
    };

    return (
        <div className="settings-account-card">
            <div className="settings-account-header">
                <h2 className="settings-account-title">{t('settings.account')}</h2>
                <p className="settings-account-description">{t('settings.accountDesc')}</p>
            </div>
            
            <div className="account-content">
                {loading ? (
                    <div className="account-loading">{t('settings.loadingProfile')}</div>
                ) : isGuest ? (
                    <>
                        <div className="account-profile-section">
                            <div className="account-profile-info">
                                <div className="account-avatar-placeholder guest-avatar">
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                        <circle cx="12" cy="7" r="4"></circle>
                                    </svg>
                                </div>
                                <div className="account-details">
                                    <h3 className="account-name">Guest Mode</h3>
                                    <p className="account-status">Cloud Free Streaming</p>
                                </div>
                            </div>
                            
                            <button className="account-logout-btn" onClick={handleLogout}>
                                {t('settings.logOut')}
                            </button>
                        </div>

                        <div className="settings-disclaimer">
                            <div className="disclaimer-header">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="12" y1="8" x2="12" y2="12"></line>
                                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                </svg>
                                <span>{t('settings.disclaimer')}</span>
                            </div>
                            <p>{t('settings.disclaimerText')}</p>
                        </div>
                    </>
                ) : accountData ? (
                    <>
                        <div className="account-profile-section">
                            <div className="account-profile-info">
                                {accountData.profile.images && accountData.profile.images.length > 0 ? (
                                    <img 
                                        src={accountData.profile.images[0].url || accountData.profile.images[0].sources?.[0]?.url || accountData.profile.images[0]} 
                                        alt={accountData.profile.display_name} 
                                        className="account-avatar" 
                                    />
                                ) : (
                                    <div className="account-avatar-placeholder">
                                        {accountData.profile.display_name?.charAt(0)?.toUpperCase()}
                                    </div>
                                )}
                                <div className="account-details">
                                    <h3 className="account-name">{accountData.profile.display_name}</h3>
                                    <p className="account-status">
                                        {"Luniq Listener"}
                                    </p>
                                </div>
                            </div>
                            
                            <button className="account-logout-btn" onClick={handleLogout}>
                                {t('settings.logOut')}
                            </button>
                        </div>

                        <div className="settings-disclaimer">
                            <div className="disclaimer-header">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="12" y1="8" x2="12" y2="12"></line>
                                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                </svg>
                                <span>{t('settings.disclaimer')}</span>
                            </div>
                            <p>{t('settings.disclaimerText')}</p>
                        </div>
                    </>
                ) : (
                    <div className="account-error">
                        <p>{t('settings.couldNotLoad')}</p>
                        <button className="account-logout-btn" onClick={handleLogout}>
                            {t('settings.logOutAnyway')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Account;
