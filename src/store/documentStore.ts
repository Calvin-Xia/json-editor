import { create } from 'zustand';
import { Document, ParseStatus, ParseError } from '../types/document';
import { parseJson5, serializeNode, setNodeValue } from '../core/parser';
import type { JsonValue } from '../core/parser';

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
  updateNodeValue: (key: string, value: JsonValue) => boolean;
  getSerializedContent: () => string | null;
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
        const parseResult = parseJson5(result.content);
        
        if (parseResult.success) {
          const doc: Document = {
            filePath: result.filePath,
            originalContent: result.content,
            root: null,
            jsonNode: parseResult.node,
            parseError: null,
            isModified: false,
            encoding: result.encoding,
            format: result.filePath.endsWith('.json5') ? 'json5' : 'json',
          };
          set({ document: doc, parseStatus: 'success' });
        } else {
          const doc: Document = {
            filePath: result.filePath,
            originalContent: result.content,
            root: null,
            jsonNode: null,
            parseError: parseResult.error as ParseError,
            isModified: false,
            encoding: result.encoding,
            format: result.filePath.endsWith('.json5') ? 'json5' : 'json',
          };
          set({ document: doc, parseStatus: 'error', error: parseResult.error.message });
        }
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
      const content = document.jsonNode 
        ? serializeNode(document.jsonNode) 
        : document.originalContent;
      const result = await window.electronAPI.file.save(document.filePath, content);
      if (result.success) {
        set({ document: { ...document, isModified: false, originalContent: content } });
      } else {
        set({ error: result.error || '保存失败' });
      }
    } catch (error) {
      set({ error: String(error) });
    }
  },

  saveFileAs: async () => {
    const { document } = get();
    if (!document) return;

    try {
      const content = document.jsonNode 
        ? serializeNode(document.jsonNode) 
        : document.originalContent;
      const newFilePath = await window.electronAPI.file.saveAs(content, document.filePath || undefined);
      if (newFilePath) {
        set({
          document: {
            ...document,
            filePath: newFilePath,
            isModified: false,
            originalContent: content,
            format: newFilePath.endsWith('.json5') ? 'json5' : 'json',
          },
        });
      }
    } catch (error) {
      set({ error: String(error) });
    }
  },

  updateNodeValue: (key: string, value: JsonValue) => {
    const { document } = get();
    if (!document?.jsonNode) return false;

    try {
      const success = setNodeValue(document.jsonNode, key, value);
      if (success) {
        set({ document: { ...document, isModified: true } });
      }
      return success;
    } catch (error) {
      set({ error: String(error) });
      return false;
    }
  },

  getSerializedContent: () => {
    const { document } = get();
    if (!document?.jsonNode) return null;
    return serializeNode(document.jsonNode);
  },
}));
