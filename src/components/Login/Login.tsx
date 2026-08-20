
import './Login.css';

import { useState, useEffect } from 'react';
import mainLogo from '../../assets/Main.png';
import { useLanguage } from '../../context/LanguageContext';

interface LoginProps {
    onLoginSuccess: (credentials?: any) => void;
}

const Login = ({ onLoginSuccess }: LoginProps) => {
    const [isLoading, setIsLoading] = useState(false);
    const [isGuestLoading, setIsGuestLoading] = useState(false);
    const [appVersion, setAppVersion] = useState('1.0.0');
    const [error, setError] = useState<string | null>(null);
    const { t } = useLanguage();

    useEffect(() => {
        window.ipcRenderer.invoke('get-app-version').then((v: any) => {
            if (v?.version) setAppVersion(v.version);
        });
    }, []);

    const handleLogin = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await window.ipcRenderer.invoke('spotify-login');
            if (res && res.accessToken) {
                onLoginSuccess(res);
            } else {
                setError(t('login.failed'));
            }
        } catch (err: any) {
            console.error('Login failed:', err);
            setError(err.message || t('login.failed'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleGuest = async () => {
        setIsGuestLoading(true);
        setError(null);
        try {
            const res = await window.ipcRenderer.invoke('spotify-guest-login');
            if (res && res.accessToken) {
                onLoginSuccess(res);
            } else {
                setError(t('login.failed') || 'Guest login failed');
            }
        } catch (err: any) {
            console.error('Guest login failed:', err);
            setError(err.message || t('login.failed'));
        } finally {
            setIsGuestLoading(false);
        }
    };

    const isBusy = isLoading || isGuestLoading;

    return (
        <main className="login-scene">
            {}
            <div className="scene-bg" />

            {}
            <div className="login-center">
                {}
                <div className="moon-icon">
                    <img src={mainLogo} alt="Luniq" className="moon-img" draggable={false} />
                </div>

                {}
                <h1 className="brand-title">Luniq</h1>
                <p className="brand-tagline">{t('login.tagline')}</p>
                <p className="brand-description">
                    {t('login.description')}
                </p>

                {}
                <div className="line-sep" />

                {}
                <div className="login-actions">
                    <button
                        className={`connect-btn ${isLoading ? 'loading' : ''} ${error ? 'has-error' : ''}`}
                        onClick={handleLogin}
                        disabled={isBusy}
                    >
                        {isLoading ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                                <path d="M12 2a10 10 0 0 1 10 10" strokeOpacity="1" />
                            </svg>
                        ) : (
                            <svg viewBox="0 0 16 16" fill="currentColor">
                                <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0m3.669 11.538a.5.5 0 0 1-.686.165c-1.879-1.147-4.243-1.407-7.028-.77a.499.499 0 0 1-.222-.973c3.048-.696 5.662-.397 7.77.892a.5.5 0 0 1 .166.686m.979-2.178a.624.624 0 0 1-.858.205c-2.15-1.321-5.428-1.704-7.972-.932a.625.625 0 0 1-.362-1.194c2.905-.881 6.517-.454 8.986 1.063a.624.624 0 0 1 .206.858m.084-2.268C10.154 5.56 5.9 5.419 3.438 6.166a.748.748 0 1 1-.434-1.432c2.825-.857 7.523-.692 10.492 1.07a.747.747 0 1 1-.764 1.288" />
                            </svg>
                        )}
                        <span>{isLoading ? t('login.connecting') : t('login.continueWithSpotify')}</span>
                    </button>

                    <button
                        className={`connect-btn guest-btn ${isGuestLoading ? 'loading' : ''}`}
                        onClick={handleGuest}
                        disabled={isBusy}
                    >
                        {isGuestLoading ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                                <path d="M12 2a10 10 0 0 1 10 10" strokeOpacity="1" />
                            </svg>
                        ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                        )}
                        <span>{isGuestLoading ? t('login.connecting') : (t('login.continueAsGuest') || 'Continue as Guest')}</span>
                    </button>
                </div>

                {error && (
                    <div className="login-error-msg">
                        {error}
                    </div>
                )}
            </div>

            {}
            <div className="login-footer">
                <span>V{appVersion}</span>
            </div>
        </main>
    );
};

export default Login;
