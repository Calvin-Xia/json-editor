import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from 'zustand';
import { useDocumentStore, temporalStore } from '../../store/documentStore';
import { useTreeStore } from '../../store/treeStore';
import { useFileOperations } from '../../hooks/useFileOperations';

interface ToolbarProps {
  onVersionHistory?: () => void;
}

interface RecentFileEntry {
  filePath: string;
  basename: string;
  dirname: string;
}

function splitPath(filePath: string): RecentFileEntry {
  // Handle both Windows and POSIX separators without pulling in path module (renderer).
  const lastSep = Math.max(filePath.lastIndexOf('\\'), filePath.lastIndexOf('/'));
  if (lastSep < 0) return { filePath, basename: filePath, dirname: '' };
  return {
    filePath,
    basename: filePath.substring(lastSep + 1),
    dirname: filePath.substring(0, lastSep),
  };
}

const Toolbar: React.FC<ToolbarProps> = ({ onVersionHistory }) => {
  const { openFile, saveFile, saveFileAs, document, openContent } = useDocumentStore();
  const { searchQuery, setSearchQuery } = useTreeStore();
  const { undo, redo, pastStates, futureStates } = useStore(temporalStore);
  const { getRecentFiles, openFileByPath } = useFileOperations();

  const [recentFiles, setRecentFiles] = useState<RecentFileEntry[]>([]);
  const [recentOpen, setRecentOpen] = useState(false);
  const recentMenuRef = useRef<HTMLDivElement | null>(null);

  const refreshRecent = useCallback(async () => {
    const list = await getRecentFiles();
    setRecentFiles(list.map(splitPath));
  }, [getRecentFiles]);

  // Refresh recent files on every successful open/save so the dropdown stays current.
  useEffect(() => {
    refreshRecent();
  }, [refreshRecent, document?.filePath]);

  // Close the dropdown when clicking outside. Use the alias `globalThis.document` so we don't
  // shadow the global with the store's `document` field that is destructured higher in this
  // component.
  useEffect(() => {
    if (!recentOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (!recentMenuRef.current?.contains(e.target as Node)) {
        setRecentOpen(false);
      }
    };
    globalThis.document.addEventListener('mousedown', handleClickOutside);
    return () => globalThis.document.removeEventListener('mousedown', handleClickOutside);
  }, [recentOpen]);

  const handleRecentClick = useCallback(
    async (filePath: string) => {
      setRecentOpen(false);
      const result = await openFileByPath(filePath);
      if (result) {
        openContent(result.content, result.filePath);
      }
    },
    [openFileByPath, openContent],
  );

  const handleOpen = async () => {
    await openFile();
    await refreshRecent();
  };

  const handleSave = async () => {
    await saveFile();
    await refreshRecent();
  };

  const handleSaveAs = async () => {
    await saveFileAs();
    await refreshRecent();
  };

  const handleUndo = () => {
    undo();
  };

  const handleRedo = () => {
    redo();
  };

  const handleSettings = () => {
    // Settings dialog is a deferred feature; intentionally a no-op for now.
    // TODO: surface a settings dialog when preferences are added (theme, indent size, etc.).
  };

  const hasRecentFiles = recentFiles.length > 0;

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <button className="toolbar-btn" onClick={handleOpen} title="打开 (Ctrl+O)">
          <span className="icon">📂</span>
          <span>打开</span>
        </button>
        <div className="toolbar-recent-wrapper" ref={recentMenuRef}>
          <button
            className="toolbar-btn toolbar-btn-recent"
            onClick={() => setRecentOpen((v) => !v)}
            disabled={!hasRecentFiles}
            title="最近打开的文件"
          >
            <span className="icon">🕘</span>
            <span>最近</span>
            <span className="caret">▾</span>
          </button>
          {recentOpen && hasRecentFiles && (
            <div className="recent-menu" role="menu">
              {recentFiles.map((entry) => (
                <button
                  key={entry.filePath}
                  className="recent-menu-item"
                  role="menuitem"
                  title={entry.filePath}
                  onClick={() => handleRecentClick(entry.filePath)}
                >
                  <span className="recent-basename">{entry.basename}</span>
                  {entry.dirname && (
                    <span className="recent-dirname">{entry.dirname}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          className="toolbar-btn"
          onClick={handleSave}
          disabled={!document?.filePath}
          title="保存 (Ctrl+S)"
        >
          <span className="icon">💾</span>
          <span>保存</span>
        </button>
        <button
          className="toolbar-btn"
          onClick={handleSaveAs}
          disabled={!document}
          title="另存为 (Ctrl+Shift+S)"
        >
          <span className="icon">📄</span>
          <span>另存为</span>
        </button>
        <div className="toolbar-divider"></div>
        <button className="toolbar-btn" onClick={handleUndo} disabled={pastStates.length === 0} title="撤销 (Ctrl+Z)">
          <span className="icon">↩️</span>
          <span>撤销</span>
        </button>
        <button className="toolbar-btn" onClick={handleRedo} disabled={futureStates.length === 0} title="重做 (Ctrl+Y)">
          <span className="icon">↪️</span>
          <span>重做</span>
        </button>
      </div>
      <div className="toolbar-center">
        <input
          type="text"
          className="search-input"
          placeholder="搜索字段..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <div className="toolbar-right">
        <button
          className="toolbar-btn"
          onClick={onVersionHistory}
          disabled={!document?.filePath}
          title="版本历史"
        >
          <span className="icon">🕐</span>
          <span>版本历史</span>
        </button>
        <div className="toolbar-divider"></div>
        <button className="toolbar-btn" onClick={handleSettings} title="设置">
          <span className="icon">⚙️</span>
          <span>设置</span>
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
