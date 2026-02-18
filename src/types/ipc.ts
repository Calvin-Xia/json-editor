export interface FileOpenResult {
  filePath: string;
  content: string;
  encoding: string;
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

export interface ElectronAPI {
  file: {
    open: () => Promise<FileOpenResult | null>;
    save: (filePath: string, content: string) => Promise<boolean>;
    saveAs: (content: string, defaultPath?: string) => Promise<string | null>;
    getRecent: () => Promise<string[]>;
  };
  autosave: {
    write: (filePath: string, content: string) => Promise<boolean>;
    load: (filePath: string) => Promise<AutosaveData | null>;
  };
  version: {
    list: (filePath: string) => Promise<VersionInfo[]>;
    restore: (filePath: string, versionId: string) => Promise<string>;
  };
  menu: {
    onOpen: (callback: () => void) => () => void;
    onSave: (callback: () => void) => () => void;
    onSaveAs: (callback: () => void) => () => void;
    onUndo: (callback: () => void) => () => void;
    onRedo: (callback: () => void) => () => void;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
