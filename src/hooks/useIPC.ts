import { useEffect, useCallback } from 'react';
import { useStore } from 'zustand';
import { useDocumentStore, temporalStore } from '../store/documentStore';

export function useIPC(): void {
  const { openFile, saveFile, saveFileAs } = useDocumentStore();
  const { undo, redo } = useStore(temporalStore);

  useEffect(() => {
    // Guard: electronAPI is only available in Electron context (via preload script)
    if (!window.electronAPI?.menu) {
      console.warn('electronAPI not available - running in web-only mode');
      return;
    }

    const unsubscribers: (() => void)[] = [];

    const unsubscribeOpen = window.electronAPI.menu.onOpen(() => {
      openFile();
    });
    unsubscribers.push(unsubscribeOpen);

    const unsubscribeSave = window.electronAPI.menu.onSave(() => {
      saveFile();
    });
    unsubscribers.push(unsubscribeSave);

    const unsubscribeSaveAs = window.electronAPI.menu.onSaveAs(() => {
      saveFileAs();
    });
    unsubscribers.push(unsubscribeSaveAs);

    const unsubscribeUndo = window.electronAPI.menu.onUndo(() => {
      undo();
    });
    unsubscribers.push(unsubscribeUndo);

    const unsubscribeRedo = window.electronAPI.menu.onRedo(() => {
      redo();
    });
    unsubscribers.push(unsubscribeRedo);

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [openFile, saveFile, saveFileAs]);
}

export function useIpcInvoke<T>(
  channel: string,
  args?: unknown
): {
  data: T | null;
  error: Error | null;
  loading: boolean;
  invoke: () => Promise<T | null>;
} {
  const invoke = useCallback(async (): Promise<T | null> => {
    try {
      const result = await (window.electronAPI as unknown as Record<string, (...args: unknown[]) => Promise<T>>)[channel](args);
      return result;
    } catch (error) {
      console.error(`IPC invoke error for ${channel}:`, error);
      return null;
    }
  }, [channel, args]);

  return {
    data: null,
    error: null,
    loading: false,
    invoke,
  };
}
