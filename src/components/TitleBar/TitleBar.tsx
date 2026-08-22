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
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M5 12h14" /></svg>
                    </button>
                    <button className="control-btn" onClick={handleMaximize} title="Maximize">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="5" y="5" width="14" height="14" rx="2" /></svg>
                    </button>
                    <button className="control-btn close" onClick={handleClose} title="Close">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                </div>
            )}
        </div>
    );
};

export default TitleBar;

