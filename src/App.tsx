import React, { useState, useCallback, useEffect } from 'react';
import { useStore } from 'zustand';
import Toolbar from './components/Toolbar';
import TreeView from './components/TreeView';
import FormEditor from './components/FormEditor';
import StatusBar from './components/StatusBar';
import RawPreview from './components/RawPreview';
import ParseError from './components/ParseError';
import VersionHistory from './components/VersionHistory';
import DiffPreview from './components/DiffPreview';
import RecoveryDialog from './components/RecoveryDialog';
import DropZone from './components/DropZone';
import { useIPC } from './hooks/useIPC';
import { useAutosave } from './hooks/useAutosave';
import { useClipboardPaste } from './hooks/useClipboardPaste';
import { useDocumentStore, temporalStore } from './store/documentStore';
import './styles/index.css';

const App: React.FC = () => {
  useIPC();
  useAutosave();

  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const { diffPreview, noChangeToast, confirmSave, cancelDiffPreview, dismissNoChangeToast, openContent } = useDocumentStore();
  const { undo, redo } = useStore(temporalStore);

  useEffect(() => {
    // Only attach DOM keydown handlers when the Electron application menu is unavailable.
    // In Electron mode, the menu accelerator (`Ctrl+Z` / `Ctrl+Y`) consumes the keystroke before
    // it reaches the webContents and forwards it via the `menu:undo` / `menu:redo` IPC channel
    // handled by useIPC(). Adding a duplicate DOM listener here would fire undo/redo twice per
    // keystroke. In browser-only mode (no Electron, no menu) we still need the DOM listener.
    const hasElectronMenu =
      typeof window !== 'undefined' &&
      typeof window.electronAPI?.menu !== 'undefined';
    if (hasElectronMenu) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const handleOpenVersionHistory = useCallback(() => {
    setIsVersionHistoryOpen(true);
  }, []);

  const handleCloseVersionHistory = useCallback(() => {
    setIsVersionHistoryOpen(false);
  }, []);

  const handleFileDrop = useCallback((content: string, filePath: string) => {
    openContent(content, filePath);
  }, [openContent]);

  const handleClipboardPaste = useCallback((content: string) => {
    openContent(content);
  }, [openContent]);

  useClipboardPaste(handleClipboardPaste);

  return (
    <DropZone onFileDrop={handleFileDrop}>
      <div className="app-container">
        <Toolbar onVersionHistory={handleOpenVersionHistory} />
        <div className="main-content">
          <div className="left-panel">
            <TreeView />
          </div>
          <div className="center-panel">
            <FormEditor />
          </div>
          <div className="right-panel">
            <ParseError />
            <RawPreview />
          </div>
        </div>
        <StatusBar />

        <VersionHistory
          isOpen={isVersionHistoryOpen}
          onClose={handleCloseVersionHistory}
        />

        {diffPreview?.isOpen && (
          <DiffPreview
            pathChanges={diffPreview.pathChanges}
            textDiff={diffPreview.textDiff}
            onConfirm={confirmSave}
            onCancel={cancelDiffPreview}
          />
        )}

        {noChangeToast && (
          <div className="toast-overlay" onClick={dismissNoChangeToast}>
            <div className="toast">无变更</div>
          </div>
        )}

        <RecoveryDialog />
      </div>
    </DropZone>
  );
};

export default App;
