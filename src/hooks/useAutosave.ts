import { useEffect, useRef } from 'react';
import { useDocumentStore } from '../store/documentStore';
import { useFileOperations } from './useFileOperations';

const AUTOSAVE_DELAY_MS = 5000;
const AUTOSAVE_FILE_PATH_KEY = 'autosave:lastFilePath';

export function useAutosave() {
  const document = useDocumentStore((state) => state.document);
  const { writeAutosave } = useFileOperations();

  const lastSavedContentRef = useRef<string | null>(null);
  const prevFilePathRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const currentPath = document?.filePath ?? null;
    if (currentPath !== prevFilePathRef.current) {
      lastSavedContentRef.current = null;
      prevFilePathRef.current = currentPath;
    }
  }, [document?.filePath]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (document?.filePath && !document.isModified) {
      localStorage.removeItem(AUTOSAVE_FILE_PATH_KEY);
      lastSavedContentRef.current = null;
    }
  }, [document?.filePath, document?.isModified]);

  useEffect(() => {
    if (!document?.filePath || !document.isModified || !document.jsonNode) {
      return;
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(async () => {
      const content = useDocumentStore.getState().getSerializedContent();
      if (!content) return;

      if (content === lastSavedContentRef.current) return;

      const success = await writeAutosave(content);
      if (success) {
        lastSavedContentRef.current = content;
        localStorage.setItem(AUTOSAVE_FILE_PATH_KEY, document.filePath!);
      }
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [document, writeAutosave]);
}
