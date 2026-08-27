import './TitleBar.css';

const TitleBar = () => {
    const isMac = window.ipcRenderer?.platform === 'darwin';

    const handleMinimize = () => {
        window.ipcRenderer.invoke('minimize-window');
    };

    const handleMaximize = () => {
        window.ipcRenderer.invoke('maximize-window');
    };

    const handleClose = () => {
        window.ipcRenderer.invoke('close-window');
    };

    return (
        <div className={`title-bar ${isMac ? 'is-mac' : ''}`}>
            <div className="app-title">LUNIQ</div>
            {!isMac && (
                <div className="window-controls">
                    <button className="control-btn" onClick={handleMinimize} title="Minimize">
                        <svg viewBox="0 0 10 1" fill="currentColor">
                            <rect width="10" height="1" />
                        </svg>
                    </button>
                    <button className="control-btn" onClick={handleMaximize} title="Maximize">
                        <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
                            <rect x="0.5" y="0.5" width="9" height="9" />
                        </svg>
                    </button>
                    <button className="control-btn close" onClick={handleClose} title="Close">
                        <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round">
                            <path d="M1 1L9 9M9 1L1 9" />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    );
};

export default TitleBar;

