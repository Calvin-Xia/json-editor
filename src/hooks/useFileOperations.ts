import { useCallback } from 'react';
import { useDocumentStore } from '../store/documentStore';
import { FileOpenResult, VersionInfo, AutosaveData } from '../types/ipc';

export function useFileOperations() {
  const { document, setParseStatus, setError, setModified } = useDocumentStore();

  const openFile = useCallback(async (): Promise<FileOpenResult | null> => {
    try {
      setParseStatus('parsing');
      const result = await window.electronAPI.file.open();
      if (result) {
        return result;
      }
      setParseStatus('idle');
      return null;
    } catch (error) {
      setError(String(error));
      setParseStatus('error');
      return null;
    }
  }, [setParseStatus, setError]);

  const saveFile = useCallback(
    async (content: string): Promise<boolean> => {
      if (!document?.filePath) return false;

      try {
        const result = await window.electronAPI.file.save(document.filePath, content);
        if (result.success) {
          setModified(false);
        } else {
          setError(result.error || '保存失败');
        }
        return result.success;
      } catch (error) {
        setError(String(error));
        return false;
      }
    },
    [document?.filePath, setModified, setError]
  );

  const saveFileAs = useCallback(
    async (content: string, defaultPath?: string): Promise<string | null> => {
      try {
        const filePath = await window.electronAPI.file.saveAs(content, defaultPath);
        return filePath;
      } catch (error) {
        setError(String(error));
        return null;
      }
    },
    [setError]
  );

  const getRecentFiles = useCallback(async (): Promise<string[]> => {
    try {
      return await window.electronAPI.file.getRecent();
    } catch (error) {
      console.error('Failed to get recent files:', error);
      return [];
    }
  }, []);

  const writeAutosave = useCallback(
    async (content: string): Promise<boolean> => {
      if (!document?.filePath) return false;

      try {
        return await window.electronAPI.autosave.write(document.filePath, content);
      } catch (error) {
        console.error('Failed to write autosave:', error);
        return false;
      }
    },
    [document?.filePath]
  );

  const loadAutosave = useCallback(async (filePath: string): Promise<AutosaveData | null> => {
    try {
      return await window.electronAPI.autosave.load(filePath);
    } catch (error) {
      console.error('Failed to load autosave:', error);
      return null;
    }
  }, []);

  const listVersions = useCallback(async (filePath: string): Promise<VersionInfo[]> => {
    try {
      return await window.electronAPI.version.list(filePath);
    } catch (error) {
      console.error('Failed to list versions:', error);
      return [];
    }
  }, []);

  const restoreVersion = useCallback(
    async (versionId: string): Promise<string | null> => {
      if (!document?.filePath) return null;

      try {
        return await window.electronAPI.version.restore(document.filePath, versionId);
      } catch (error) {
        console.error('Failed to restore version:', error);
        return null;
      }
    },
    [document?.filePath]
  );

  return {
    openFile,
    saveFile,
    saveFileAs,
    getRecentFiles,
    writeAutosave,
    loadAutosave,
    listVersions,
    restoreVersion,
  };
}
