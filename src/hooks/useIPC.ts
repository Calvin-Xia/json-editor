import { useEffect, useCallback } from 'react';
import { useDocumentStore } from '../store/documentStore';

export function useIPC(): void {
  const { openFile, saveFile, saveFileAs } = useDocumentStore();

  useEffect(() => {
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
      console.log('Undo from menu - placeholder');
    });
    unsubscribers.push(unsubscribeUndo);

    const unsubscribeRedo = window.electronAPI.menu.onRedo(() => {
      console.log('Redo from menu - placeholder');
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
