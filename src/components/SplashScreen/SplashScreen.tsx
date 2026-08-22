import { useState, useEffect } from 'react';
import './SplashScreen.css';
import splashLogo from '../../assets/Splash.png';

interface SplashScreenProps {
    onFinished: () => void;
    duration?: number;
}

const SplashScreen = ({ onFinished, duration = 1800 }: SplashScreenProps) => {
    const [fadeOut, setFadeOut] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setFadeOut(true);
        }, duration);

        const finishTimer = setTimeout(() => {
            onFinished();
        }, duration + 550);

        return () => {
            clearTimeout(timer);
            clearTimeout(finishTimer);
        };
    }, [onFinished, duration]);

    return (
        <div className={`splash-screen ${fadeOut ? 'fade-out' : ''}`}>
            <div className="splash-logo-container">
                <div className="splash-logo-wrapper">
                    <img 
                        src={splashLogo} 
                        alt="Luniq Logo" 
                        className="splash-logo" 
                        draggable={false} 
                    />
                </div>
                <h1 className="splash-title">LUNIQ</h1>
                <p className="splash-subtitle">EXPERIENCE SOUND</p>
            </div>
            <div className="splash-loader">
                <div className="splash-loader-bar" />
                <div className="splash-loader-bar" />
                <div className="splash-loader-bar" />
                <div className="splash-loader-bar" />
                <div className="splash-loader-bar" />
            </div>
        </div>
    );
};

export default SplashScreen;

