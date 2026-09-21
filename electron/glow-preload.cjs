const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('glowAPI', {
    onTick: (callback) => {
        const listener = (event, data) => callback(data);
        ipcRenderer.on('glow-tick', listener);
        return () => ipcRenderer.removeListener('glow-tick', listener);
    },
    onState: (callback) => {
        const listener = (event, data) => callback(data);
        ipcRenderer.on('glow-state', listener);
        return () => ipcRenderer.removeListener('glow-state', listener);
    }
});
