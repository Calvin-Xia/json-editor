import { create } from 'zustand';
import { temporal } from 'zundo';
import { JsonObjectNode, JsonArrayNode } from '@croct/json5-parser';
import type { JsonNode } from '@croct/json5-parser';
import { Document, ParseStatus, ParseError } from '../types/document';
import { parseJson5, serializeNode, setNodeValue, resolveNodeAtPath } from '../core/parser';
import type { JsonValue } from '../core/parser';
import { parsePath } from '../core/treeModel/pathUtils';
import {
  addObjectField,
  deleteObjectField,
  addArrayElement,
  deleteArrayElement,
  moveArrayElement,
} from '../core/parser/astOperations';
import type { JsonType } from '../core/parser/astOperations';
import { useTreeStore } from './treeStore';
import { computePathChanges, computeTextDiff } from '../core/diff';
import type { PathChange } from '../core/diff';
import type { Change } from 'diff';

export type DiffPreviewPendingType = 'save' | 'saveAs';

export interface DiffPreviewState {
  isOpen: boolean;
  pathChanges: PathChange[];
  textDiff: Change[];
  pendingType: DiffPreviewPendingType;
}

function findJsonNodeAtPath(root: JsonNode, path: string): JsonNode | null {
  if (path === '' || path === '/') {
    return root;
  }
  const segments = parsePath(path);
  let current: JsonNode = root;
  for (const segment of segments) {
    if (current instanceof JsonObjectNode) {
      const value = current.get(segment.value as string);
      if (value === undefined) return null;
      current = value;
    } else if (current instanceof JsonArrayNode) {
      const index = segment.value as number;
      if (index < 0 || index >= current.elements.length) return null;
      current = current.elements[index];
    } else {
      return null;
    }
  }
  return current;
}

interface DocumentStore {
  document: Document | null;
  parseStatus: ParseStatus;
  error: string | null;
  diffPreview: DiffPreviewState | null;
  noChangeToast: boolean;
  setDocument: (doc: Document | null) => void;
  setParseStatus: (status: ParseStatus) => void;
  setError: (error: string | null) => void;
  setModified: (modified: boolean) => void;
  openFile: () => Promise<void>;
  openContent: (content: string, filePath?: string) => void;
  saveFile: () => Promise<void>;
  saveFileAs: () => Promise<void>;
  confirmSave: () => Promise<void>;
  cancelDiffPreview: () => void;
  dismissNoChangeToast: () => void;
  updateNodeValue: (parentPath: string, key: string, value: JsonValue) => boolean;
  getSerializedContent: () => string | null;
  exportNodeFragment: (path: string) => Promise<boolean>;
  addField: (parentPath: string, key: string, type: JsonType) => boolean;
  deleteField: (parentPath: string, key: string) => boolean;
  addArrayItem: (parentPath: string, type: JsonType) => boolean;
  deleteArrayItem: (parentPath: string, index: number) => boolean;
  moveArrayItem: (parentPath: string, fromIndex: number, toIndex: number) => boolean;
}

type DocumentSnapshot = Document & { _snapshot?: string | null };
type PartialDoc = { document: DocumentSnapshot | null };

let _pendingSnapshot: string | null = null;

export const useDocumentStore = create<DocumentStore>()(
  temporal(
    (set, get) => ({
      document: null,
      parseStatus: 'idle',
      error: null,
      diffPreview: null,
      noChangeToast: false,

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

      openContent: (content: string, filePath?: string) => {
        try {
          set({ parseStatus: 'parsing', error: null });
          const parseResult = parseJson5(content);
          const format = filePath?.endsWith('.json5') ? 'json5' : 'json';

          if (parseResult.success) {
            const doc: Document = {
              filePath: filePath ?? null,
              originalContent: content,
              jsonNode: parseResult.node,
              parseError: null,
              isModified: false,
              encoding: 'UTF-8',
              format,
            };
            set({ document: doc, parseStatus: 'success' });
          } else {
            const doc: Document = {
              filePath: filePath ?? null,
              originalContent: content,
              jsonNode: null,
              parseError: parseResult.error as ParseError,
              isModified: false,
              encoding: 'UTF-8',
              format,
            };
            set({ document: doc, parseStatus: 'error', error: parseResult.error.message });
          }
        } catch (error) {
          set({ parseStatus: 'error', error: String(error) });
        }
      },

      saveFile: async () => {
        const { document } = get();
        if (!document?.filePath) return;

        const newContent = document.jsonNode
          ? serializeNode(document.jsonNode)
          : document.originalContent;
        const oldContent = document.originalContent;

        if (newContent === oldContent) {
          set({ noChangeToast: true });
          setTimeout(() => {
            set((state) => (state.noChangeToast ? { noChangeToast: false } : {}));
          }, 2000);
          return;
        }

        const pathChanges = computePathChanges(oldContent, newContent);
        const textDiff = computeTextDiff(oldContent, newContent);

        set({
          diffPreview: {
            isOpen: true,
            pathChanges,
            textDiff,
            pendingType: 'save',
          },
        });
      },

      saveFileAs: async () => {
        const { document } = get();
        if (!document) return;

        const newContent = document.jsonNode
          ? serializeNode(document.jsonNode)
          : document.originalContent;
        const oldContent = document.originalContent;

        if (newContent === oldContent) {
          set({ noChangeToast: true });
          setTimeout(() => {
            set((state) => (state.noChangeToast ? { noChangeToast: false } : {}));
          }, 2000);
          return;
        }

        const pathChanges = computePathChanges(oldContent, newContent);
        const textDiff = computeTextDiff(oldContent, newContent);

        set({
          diffPreview: {
            isOpen: true,
            pathChanges,
            textDiff,
            pendingType: 'saveAs',
          },
        });
      },

      confirmSave: async () => {
        const { document, diffPreview } = get();
        if (!document || !diffPreview) return;

        const pendingType = diffPreview.pendingType;
        set({ diffPreview: null });

        try {
          const content = document.jsonNode
            ? serializeNode(document.jsonNode)
            : document.originalContent;

          // Snapshot the previous on-disk content BEFORE we overwrite it, so users can roll back to it.
          // Skip when saving a brand-new file (no previous on-disk content to snapshot).
          const previousContent = document.originalContent;

          if (pendingType === 'save') {
            if (!document.filePath) return;
            const result = await window.electronAPI.file.save(document.filePath, content);
            if (result.success) {
              // Fire-and-forget version snapshot; failures here must not block the actual save.
              void window.electronAPI.version.create(document.filePath, previousContent)
                .catch((error) => {
                  console.error('Failed to snapshot version:', error);
                });
              set({ document: { ...document, isModified: false, originalContent: content } });
            } else {
              set({ error: result.error || '保存失败' });
            }
          } else {
            const newFilePath = await window.electronAPI.file.saveAs(content, document.filePath || undefined);
            if (newFilePath) {
              // Only snapshot when overwriting an existing file; for brand-new saveAs there is nothing to preserve.
              if (document.filePath) {
                void window.electronAPI.version.create(document.filePath, previousContent)
                  .catch((error) => {
                    console.error('Failed to snapshot version:', error);
                  });
              }
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
          }
        } catch (error) {
          set({ error: String(error) });
        }
      },

      cancelDiffPreview: () => {
        set({ diffPreview: null });
      },

      dismissNoChangeToast: () => {
        set({ noChangeToast: false });
      },

      updateNodeValue: (parentPath: string, key: string, value: JsonValue) => {
        const { document } = get();
        if (!document?.jsonNode) return false;

        try {
          _pendingSnapshot = serializeNode(document.jsonNode);
          const parentNode = resolveNodeAtPath(document.jsonNode, parentPath);
          if (!parentNode) return false;
          const success = setNodeValue(parentNode, key, value);
          if (success) {
            set({ document: { ...document, isModified: true } });
          }
          return success;
        } catch (error) {
          _pendingSnapshot = null;
          set({ error: String(error) });
          return false;
        }
      },

      getSerializedContent: () => {
        const { document } = get();
        if (!document?.jsonNode) return null;
        return serializeNode(document.jsonNode);
      },

      exportNodeFragment: async (path: string) => {
        const { document } = get();
        if (!document?.jsonNode) return false;
        try {
          const node = findJsonNodeAtPath(document.jsonNode, path);
          if (!node) return false;
          const serialized = serializeNode(node);
          await navigator.clipboard.writeText(serialized);
          return true;
        } catch {
          return false;
        }
      },

      addField: (parentPath: string, key: string, type: JsonType) => {
        const { document } = get();
        if (!document?.jsonNode) return false;

        try {
          const parentNode = resolveNodeAtPath(document.jsonNode, parentPath);
          if (!parentNode) return false;

          _pendingSnapshot = serializeNode(document.jsonNode);
          const success = addObjectField(parentNode, key, type);
          if (success) {
            set({ document: { ...document, isModified: true } });
            useTreeStore.getState().setTreeRoot(document.jsonNode);
          } else {
            _pendingSnapshot = null;
          }
          return success;
        } catch (error) {
          _pendingSnapshot = null;
          set({ error: String(error) });
          return false;
        }
      },

      deleteField: (parentPath: string, key: string) => {
        const { document } = get();
        if (!document?.jsonNode) return false;

        try {
          const parentNode = resolveNodeAtPath(document.jsonNode, parentPath);
          if (!parentNode) return false;

          _pendingSnapshot = serializeNode(document.jsonNode);
          const success = deleteObjectField(parentNode, key);
          if (success) {
            set({ document: { ...document, isModified: true } });
            useTreeStore.getState().setTreeRoot(document.jsonNode);
          } else {
            _pendingSnapshot = null;
          }
          return success;
        } catch (error) {
          _pendingSnapshot = null;
          set({ error: String(error) });
          return false;
        }
      },

      addArrayItem: (parentPath: string, type: JsonType) => {
        const { document } = get();
        if (!document?.jsonNode) return false;

        try {
          const parentNode = resolveNodeAtPath(document.jsonNode, parentPath);
          if (!parentNode) return false;

          _pendingSnapshot = serializeNode(document.jsonNode);
          const success = addArrayElement(parentNode, type);
          if (success) {
            set({ document: { ...document, isModified: true } });
            useTreeStore.getState().setTreeRoot(document.jsonNode);
          } else {
            _pendingSnapshot = null;
          }
          return success;
        } catch (error) {
          _pendingSnapshot = null;
          set({ error: String(error) });
          return false;
        }
      },

      deleteArrayItem: (parentPath: string, index: number) => {
        const { document } = get();
        if (!document?.jsonNode) return false;

        try {
          const parentNode = resolveNodeAtPath(document.jsonNode, parentPath);
          if (!parentNode) return false;

          _pendingSnapshot = serializeNode(document.jsonNode);
          const success = deleteArrayElement(parentNode, index);
          if (success) {
            set({ document: { ...document, isModified: true } });
            useTreeStore.getState().setTreeRoot(document.jsonNode);
          } else {
            _pendingSnapshot = null;
          }
          return success;
        } catch (error) {
          _pendingSnapshot = null;
          set({ error: String(error) });
          return false;
        }
      },

      moveArrayItem: (parentPath: string, fromIndex: number, toIndex: number) => {
        const { document } = get();
        if (!document?.jsonNode) return false;

        try {
          const parentNode = resolveNodeAtPath(document.jsonNode, parentPath);
          if (!parentNode) return false;

          _pendingSnapshot = serializeNode(document.jsonNode);
          const success = moveArrayElement(parentNode, fromIndex, toIndex);
          if (success) {
            set({ document: { ...document, isModified: true } });
            useTreeStore.getState().setTreeRoot(document.jsonNode);
          } else {
            _pendingSnapshot = null;
          }
          return success;
        } catch (error) {
          _pendingSnapshot = null;
          set({ error: String(error) });
          return false;
        }
      },
    }),
    {
      partialize: (state) => {
        const doc = state.document;
        const snapshot = _pendingSnapshot ?? (doc?.jsonNode ? serializeNode(doc.jsonNode) : null);
        _pendingSnapshot = null;
        return {
          document: doc
            ? ({ ...doc, _snapshot: snapshot, jsonNode: null } as DocumentSnapshot)
            : null,
        };
      },
      limit: 100,
      equality: (pastState, currentState) => {
        const p = pastState as PartialDoc;
        const c = currentState as PartialDoc;
        return p.document?._snapshot === c.document?._snapshot;
      },
    }
  ),
);

useDocumentStore.subscribe((state) => {
  const doc = state.document as DocumentSnapshot | null;
  if (doc?._snapshot && !doc.jsonNode) {
    const result = parseJson5(doc._snapshot);
    if (result.success) {
      useDocumentStore.temporal.getState().pause();
      useDocumentStore.setState({
        document: { ...doc, jsonNode: result.node, _snapshot: undefined } as Document,
      });
      useDocumentStore.temporal.getState().resume();
    }
  }
});

export const temporalStore = useDocumentStore.temporal;
