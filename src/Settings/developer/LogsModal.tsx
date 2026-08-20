import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import './LogsModal.css';

interface LogEntry {
    timestamp: string;
    type: 'info' | 'error';
    message: string;
}

interface LogsModalProps {
    onClose: () => void;
}

const LogsModal: React.FC<LogsModalProps> = ({ onClose }) => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isMaximized, setIsMaximized] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const lastScrollHeight = useRef(0);

    const fetchLogs = async () => {
        try {
            const data = await window.ipcRenderer.invoke('get-logs');
            setLogs(data);
        } catch (err) {
            console.error('Failed to fetch logs', err);
        }
    };

    useEffect(() => {
        
        fetchLogs();

        
        const handleNewLog = (_event: any, newLog: LogEntry) => {
            setLogs(prev => {
                const updated = [...prev, newLog];
                if (updated.length > 1000) updated.shift(); 
                return updated;
            });
        };

        window.ipcRenderer.on('new-log-entry', handleNewLog);

        return () => {
            window.ipcRenderer.off('new-log-entry', handleNewLog);
        };
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
            
            
            const wasAtBottom = (lastScrollHeight.current === 0) || (lastScrollHeight.current - scrollTop - clientHeight < 50);
            
            if (wasAtBottom) {
                scrollRef.current.scrollTop = scrollHeight;
            }
            lastScrollHeight.current = scrollHeight;
        }
    }, [logs]);

    return ReactDOM.createPortal(
        <div className="logs-modal-overlay">
            <div className={`logs-modal-window ${isMaximized ? 'maximized' : ''}`}>
                <div className="logs-modal-header">
                    <div className="logs-header-left">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                            <polyline points="13 2 13 9 20 9"></polyline>
                        </svg>
                        <span>System Logs</span>
                    </div>
                    <div className="logs-header-actions">
                        <button onClick={() => setIsMaximized(!isMaximized)} title="Maximize">
                            {isMaximized ? (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M4 14h10v10M20 10H10V0" />
                                </svg>
                            ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <polyline points="15 3 21 3 21 9"></polyline>
                                    <polyline points="9 21 3 21 3 15"></polyline>
                                    <line x1="21" y1="3" x2="14" y2="10"></line>
                                    <line x1="3" y1="21" x2="10" y2="14"></line>
                                </svg>
                            )}
                        </button>
                        <button onClick={onClose} title="Close" className="close-btn">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                </div>
                <div className="logs-content" ref={scrollRef}>
                    {logs.length === 0 ? (
                        <div className="no-logs">No logs captured yet.</div>
                    ) : (
                        logs.map((log, i) => (
                            <div key={i} className={`log-entry ${log.type}`}>
                                <span className="log-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                <span className="log-msg">{log.message}</span>
                            </div>
                        ))
                    )}
                </div>
                <div className="logs-footer">
                    <span>Total Logs: {logs.length}</span>
                    <div className="logs-footer-buttons">
                        <button onClick={() => {
                            const logsText = logs.map(l => `[${new Date(l.timestamp).toLocaleTimeString()}] [${l.type.toUpperCase()}] ${l.message}`).join('\n');
                            navigator.clipboard.writeText(logsText);
                            const btn = document.getElementById('copy-logs-btn');
                            if (btn) {
                                btn.innerText = 'Copied!';
                                setTimeout(() => btn.innerText = 'Copy All', 2000);
                            }
                        }} id="copy-logs-btn">Copy All</button>
                        <button onClick={async () => {
                            await window.ipcRenderer.invoke('clear-logs');
                            setLogs([]);
                        }}>Clear</button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default LogsModal;
