/// <reference types="vite/client" />

declare global {
    interface Window {
        ipcRenderer: {
            send: (channel: string, ...args: any[]) => void;
            on: (channel: string, func: (...args: any[]) => void) => (() => void);
            off: (channel: string, func: (...args: any[]) => void) => void;
            removeAllListeners: (channel: string) => void;
            invoke: <K extends import('./types/ipc').IPCChannelName>(
                channel: K,
                ...args: Parameters<import('./types/ipc').IPCChannels[K]>
            ) => ReturnType<import('./types/ipc').IPCChannels[K]>;
            platform?: string;
        };
        webkitAudioContext: typeof AudioContext;
    }
    interface HTMLAudioElement {
        setSinkId(deviceId: string): Promise<void>;
    }
}

export {};

