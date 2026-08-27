import { useState, useEffect } from 'react';
import './SplashScreen.css';
import splashLogo from '../../assets/Splash.png';

interface SplashScreenProps {
    onFinished: () => void;
    duration?: number;
}

const SplashScreen = ({ onFinished, duration = 1600 }: SplashScreenProps) => {
    const [fadeOut, setFadeOut] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setFadeOut(true);
        }, duration);

        const finishTimer = setTimeout(() => {
            onFinished();
        }, duration + 400);

        return () => {
            clearTimeout(timer);
            clearTimeout(finishTimer);
        };
    }, [onFinished, duration]);

    return (
        <div className={`splash-screen ${fadeOut ? 'fade-out' : ''}`}>
            <div className="splash-content">
                <div className="splash-logo-wrapper">
                    <img 
                        src={splashLogo} 
                        alt="Luniq" 
                        className="splash-logo" 
                        draggable={false} 
                    />
                </div>
                <div className="splash-brand">
                    <span className="splash-title">LUNIQ</span>
                    <span className="splash-subtitle">MUSIC PLAYER</span>
                </div>
            </div>
        </div>
    );
};

export default SplashScreen;

