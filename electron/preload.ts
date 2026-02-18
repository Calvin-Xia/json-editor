import { contextBridge, ipcRenderer } from 'electron';

export interface FileOpenResult {
  filePath: string;
  content: string;
  encoding: string;
}

export interface SaveResult {
  success: boolean;
  error?: string;
}

export interface AutosaveData {
  content: string;
  timestamp: number;
}

export interface VersionInfo {
  id: string;
  timestamp: number;
  size: number;
}

const electronAPI = {
  file: {
    open: (): Promise<FileOpenResult | null> => ipcRenderer.invoke('file:open'),
    save: (filePath: string, content: string): Promise<SaveResult> =>
      ipcRenderer.invoke('file:save', { filePath, content }),
    saveAs: (content: string, defaultPath?: string): Promise<string | null> =>
      ipcRenderer.invoke('file:saveAs', { content, defaultPath }),
    getRecent: (): Promise<string[]> => ipcRenderer.invoke('file:getRecent'),
  },
  autosave: {
    write: (filePath: string, content: string): Promise<boolean> =>
      ipcRenderer.invoke('autosave:write', { filePath, content }),
    load: (filePath: string): Promise<AutosaveData | null> =>
      ipcRenderer.invoke('autosave:load', { filePath }),
  },
  version: {
    list: (filePath: string): Promise<VersionInfo[]> =>
      ipcRenderer.invoke('version:list', { filePath }),
    restore: (filePath: string, versionId: string): Promise<string> =>
      ipcRenderer.invoke('version:restore', { filePath, versionId }),
  },
  menu: {
    onOpen: (callback: () => void) => {
      ipcRenderer.on('menu:open', callback);
      return () => ipcRenderer.removeListener('menu:open', callback);
    },
    onSave: (callback: () => void) => {
      ipcRenderer.on('menu:save', callback);
      return () => ipcRenderer.removeListener('menu:save', callback);
    },
    onSaveAs: (callback: () => void) => {
      ipcRenderer.on('menu:saveAs', callback);
      return () => ipcRenderer.removeListener('menu:saveAs', callback);
    },
    onUndo: (callback: () => void) => {
      ipcRenderer.on('menu:undo', callback);
      return () => ipcRenderer.removeListener('menu:undo', callback);
    },
    onRedo: (callback: () => void) => {
      ipcRenderer.on('menu:redo', callback);
      return () => ipcRenderer.removeListener('menu:redo', callback);
    },
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;
