import { useEffect } from 'react';

export function useClipboardPaste(onPaste: (content: string) => void): void {
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const activeEl = document.activeElement;
      const isEditableField =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        activeEl?.getAttribute('contenteditable') === 'true';

      if (isEditableField) return;

      const text = e.clipboardData?.getData('text/plain');
      if (text && text.trim().length > 0) {
        onPaste(text);
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [onPaste]);
}
