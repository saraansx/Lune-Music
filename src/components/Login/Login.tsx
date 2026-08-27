
import './Login.css';

import { useState, useEffect, useRef } from 'react';
import mainLogo from '../../assets/Main.png';
import { useLanguage } from '../../context/LanguageContext';

interface LoginProps {
    onLoginSuccess: (credentials?: any) => void;
}

interface Meteor {
    x: number;
    y: number;
    length: number;
    speed: number;
    opacity: number;
    thickness: number;
    angle: number; // in radians
}

const Login = ({ onLoginSuccess }: LoginProps) => {
    const [isLoading, setIsLoading] = useState(false);
    const [isGuestLoading, setIsGuestLoading] = useState(false);
    const [isSuccessExiting, setIsSuccessExiting] = useState(false);
    const [appVersion, setAppVersion] = useState('1.0.0');
    const [error, setError] = useState<string | null>(null);
    const { t } = useLanguage();

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const isBusy = isLoading || isGuestLoading;
    const isBusyRef = useRef(isBusy);
    const isExitingRef = useRef(isSuccessExiting);

    useEffect(() => {
        isBusyRef.current = isBusy;
    }, [isBusy]);

    useEffect(() => {
        isExitingRef.current = isSuccessExiting;
    }, [isSuccessExiting]);

    useEffect(() => {
        window.ipcRenderer.invoke('get-app-version').then((v: any) => {
            if (v?.version) setAppVersion(v.version);
        });
    }, []);

    // ── High Performance Canvas Meteors Animation ──
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;

        let animationFrameId: number;
        let width = (canvas.width = window.innerWidth);
        let height = (canvas.height = window.innerHeight);

        const handleResize = () => {
            if (!canvas) return;
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', handleResize);

        const METEOR_COUNT = 28;
        const meteors: Meteor[] = [];

        const createMeteor = (initial = false): Meteor => {
            const angle = Math.PI / 4 + (Math.random() * 0.08 - 0.04); // ~45 deg diagonal
            return {
                x: Math.random() * (width + height * 0.6),
                y: initial ? Math.random() * height : -80 - Math.random() * 250,
                length: 45 + Math.random() * 60,
                speed: 0.8 + Math.random() * 1.4, // Slow, peaceful, elegant idle drift
                opacity: 0.12 + Math.random() * 0.45,
                thickness: 1 + Math.random() * 1.2,
                angle,
            };
        };

        for (let i = 0; i < METEOR_COUNT; i++) {
            meteors.push(createMeteor(true));
        }

        let globalOpacity = 1;
        let speedMultiplier = 1.0;
        let lengthMultiplier = 1.0;

        const render = () => {
            ctx.clearRect(0, 0, width, height);

            const busy = isBusyRef.current;
            const exiting = isExitingRef.current;

            // Smoothly ease speedMultiplier towards target (flow acceleration)
            const targetSpeedMult = busy ? 4.8 : 1.0;
            const targetLengthMult = busy ? 3.0 : 1.0;
            speedMultiplier += (targetSpeedMult - speedMultiplier) * 0.045; // Smooth exponential flow
            lengthMultiplier += (targetLengthMult - lengthMultiplier) * 0.045;

            if (exiting) {
                globalOpacity = Math.max(0, globalOpacity - 0.04);
            } else {
                globalOpacity = Math.min(1, globalOpacity + 0.03);
            }

            if (globalOpacity > 0) {
                ctx.save();
                ctx.globalAlpha = globalOpacity;

                for (let i = 0; i < meteors.length; i++) {
                    const m = meteors[i];

                    const currentSpeed = m.speed * speedMultiplier;
                    const currentLength = m.length * lengthMultiplier;

                    m.x -= Math.cos(m.angle) * currentSpeed;
                    m.y += Math.sin(m.angle) * currentSpeed;

                    const tailX = m.x + Math.cos(m.angle) * currentLength;
                    const tailY = m.y - Math.sin(m.angle) * currentLength;

                    // Dynamic luminous tail with flow transition
                    const grad = ctx.createLinearGradient(m.x, m.y, tailX, tailY);
                    grad.addColorStop(0, `rgba(255, 255, 255, ${m.opacity * (0.8 + 0.2 * Math.min(speedMultiplier / 2, 1))})`);
                    
                    const glowColor = speedMultiplier > 1.8 
                        ? `rgba(29, 185, 84, ${m.opacity * 0.85})` 
                        : `rgba(180, 215, 255, ${m.opacity * 0.55})`;
                    grad.addColorStop(0.25, glowColor);
                    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

                    ctx.strokeStyle = grad;
                    ctx.lineWidth = m.thickness * (1 + (speedMultiplier - 1) * 0.15);
                    ctx.lineCap = 'round';

                    ctx.beginPath();
                    ctx.moveTo(m.x, m.y);
                    ctx.lineTo(tailX, tailY);
                    ctx.stroke();

                    // Glowing head point
                    ctx.fillStyle = `rgba(255, 255, 255, ${m.opacity * 0.95})`;
                    ctx.beginPath();
                    ctx.arc(m.x, m.y, (m.thickness * (1 + (speedMultiplier - 1) * 0.15)) * 0.75, 0, Math.PI * 2);
                    ctx.fill();

                    // Reset meteor when it flies off screen
                    if (m.y > height + currentLength || m.x < -currentLength) {
                        meteors[i] = createMeteor(false);
                    }
                }
                ctx.restore();
            }

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    const triggerSuccess = (credentials: any) => {
        setIsSuccessExiting(true);
        setTimeout(() => {
            onLoginSuccess(credentials);
        }, 400);
    };

    const handleLogin = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await window.ipcRenderer.invoke('spotify-login');
            if (res && res.accessToken) {
                triggerSuccess(res);
            } else {
                setError(t('login.failed'));
                setIsLoading(false);
            }
        } catch (err: any) {
            console.error('Login failed:', err);
            setError(err.message || t('login.failed'));
            setIsLoading(false);
        }
    };

    const handleGuest = async () => {
        setIsGuestLoading(true);
        setError(null);
        try {
            const res = await window.ipcRenderer.invoke('spotify-guest-login');
            if (res && res.accessToken) {
                triggerSuccess(res);
            } else {
                setError(t('login.failed') || 'Guest login failed');
                setIsGuestLoading(false);
            }
        } catch (err: any) {
            console.error('Guest login failed:', err);
            setError(err.message || t('login.failed'));
            setIsGuestLoading(false);
        }
    };

    return (
        <main className={`login-scene ${isSuccessExiting ? 'scene-exiting' : ''}`}>
            <canvas ref={canvasRef} className="login-meteor-canvas" />
            <div className={`login-card ${isSuccessExiting ? 'card-exiting' : ''}`}>
                <div className="login-header">
                    <div className="moon-icon">
                        <img src={mainLogo} alt="Luniq" className="moon-img" draggable={false} />
                    </div>
                    <h1 className="brand-title">LUNIQ</h1>
                    <p className="brand-tagline">{t('login.tagline') || 'your music, reimagined'}</p>
                    <p className="brand-description">
                        {t('login.description')}
                    </p>
                </div>

                <div className="login-actions">
                    <button
                        className={`connect-btn spotify-primary-btn ${isLoading ? 'loading' : ''} ${error ? 'has-error' : ''}`}
                        onClick={handleLogin}
                        disabled={isBusy}
                    >
                        {isLoading ? (
                            <svg className="spinner-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                                <path d="M12 2a10 10 0 0 1 10 10" strokeOpacity="1" />
                            </svg>
                        ) : (
                            <svg className="btn-icon" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0m3.669 11.538a.5.5 0 0 1-.686.165c-1.879-1.147-4.243-1.407-7.028-.77a.499.499 0 0 1-.222-.973c3.048-.696 5.662-.397 7.77.892a.5.5 0 0 1 .166.686m.979-2.178a.624.624 0 0 1-.858.205c-2.15-1.321-5.428-1.704-7.972-.932a.625.625 0 0 1-.362-1.194c2.905-.881 6.517-.454 8.986 1.063a.624.624 0 0 1 .206.858m.084-2.268C10.154 5.56 5.9 5.419 3.438 6.166a.748.748 0 1 1-.434-1.432c2.825-.857 7.523-.692 10.492 1.07a.747.747 0 1 1-.764 1.288" />
                            </svg>
                        )}
                        <span>{isLoading ? t('login.connecting') : t('login.continueWithSpotify')}</span>
                    </button>

                    <button
                        className={`connect-btn guest-secondary-btn ${isGuestLoading ? 'loading' : ''}`}
                        onClick={handleGuest}
                        disabled={isBusy}
                    >
                        {isGuestLoading ? (
                            <svg className="spinner-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                                <path d="M12 2a10 10 0 0 1 10 10" strokeOpacity="1" />
                            </svg>
                        ) : (
                            <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

            <div className="login-footer">
                <span>V{appVersion}</span>
            </div>
        </main>
    );
};

export default Login;
