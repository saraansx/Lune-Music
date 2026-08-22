import { ipcRenderer, contextBridge } from 'electron'


const listenerMap = new Map<string, Map<any, any>>();


contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args;
    
    
    const wrapper = (event: any, ...args: any[]) => listener(event, ...args);
    
    
    if (!listenerMap.has(channel)) {
      listenerMap.set(channel, new Map());
    }
    listenerMap.get(channel)!.set(listener, wrapper);
    
    ipcRenderer.on(channel, wrapper);

    
    return () => {
      const currentWrapper = listenerMap.get(channel)?.get(listener);
      if (currentWrapper) {
        ipcRenderer.removeListener(channel, currentWrapper);
        listenerMap.get(channel)?.delete(listener);
      }
    };
  },
  
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, listener] = args;
    
    
    const wrapper = listenerMap.get(channel)?.get(listener);
    if (wrapper) {
      ipcRenderer.off(channel, wrapper);
      listenerMap.get(channel)!.delete(listener);
    }
  },

  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },

  removeAllListeners(channel: string) {
    ipcRenderer.removeAllListeners(channel);
    listenerMap.delete(channel);
  },
  platform: process.platform,
})
