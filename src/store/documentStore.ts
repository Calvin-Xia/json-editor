import { create } from 'zustand';
import { Document, ParseStatus } from '../types/document';

interface DocumentStore {
  document: Document | null;
  parseStatus: ParseStatus;
  error: string | null;
  setDocument: (doc: Document | null) => void;
  setParseStatus: (status: ParseStatus) => void;
  setError: (error: string | null) => void;
  setModified: (modified: boolean) => void;
  openFile: () => Promise<void>;
  saveFile: () => Promise<void>;
  saveFileAs: () => Promise<void>;
}

export const useDocumentStore = create<DocumentStore>((set, get) => ({
  document: null,
  parseStatus: 'idle',
  error: null,

  setDocument: (doc) => set({ document: doc }),
  setParseStatus: (status) => set({ parseStatus: status }),
  setError: (error) => set({ error }),

  setModified: (modified) => {
    const { document } = get();
    if (document) {
      set({ document: { ...document, isModified: modified } });
    }
  },

  openFile: async () => {
    try {
      set({ parseStatus: 'parsing', error: null });
      const result = await window.electronAPI.file.open();
      if (result) {
        const doc: Document = {
          filePath: result.filePath,
          originalContent: result.content,
          root: null,
          isModified: false,
          encoding: result.encoding,
          format: result.filePath.endsWith('.json5') ? 'json5' : 'json',
        };
        set({ document: doc, parseStatus: 'success' });
      } else {
        set({ parseStatus: 'idle' });
      }
    } catch (error) {
      set({ parseStatus: 'error', error: String(error) });
    }
  },

  saveFile: async () => {
    const { document } = get();
    if (!document?.filePath) return;

    try {
      const content = document.originalContent;
      await window.electronAPI.file.save(document.filePath, content);
      set({ document: { ...document, isModified: false } });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  saveFileAs: async () => {
    const { document } = get();
    if (!document) return;

    try {
      const content = document.originalContent;
      const newFilePath = await window.electronAPI.file.saveAs(content, document.filePath || undefined);
      if (newFilePath) {
        set({
          document: {
            ...document,
            filePath: newFilePath,
            isModified: false,
            format: newFilePath.endsWith('.json5') ? 'json5' : 'json',
          },
        });
      }
    } catch (error) {
      set({ error: String(error) });
    }
  },
}));
