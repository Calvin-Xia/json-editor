import React from 'react';
import { useStore } from 'zustand';
import { useDocumentStore, temporalStore } from '../../store/documentStore';
import { useTreeStore } from '../../store/treeStore';

interface ToolbarProps {
  onVersionHistory?: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ onVersionHistory }) => {
  const { openFile, saveFile, saveFileAs, document } = useDocumentStore();
  const { searchQuery, setSearchQuery } = useTreeStore();
  const { undo, redo, pastStates, futureStates } = useStore(temporalStore);

  const handleOpen = async () => {
    await openFile();
  };

  const handleSave = async () => {
    await saveFile();
  };

  const handleSaveAs = async () => {
    await saveFileAs();
  };

  const handleUndo = () => {
    undo();
  };

  const handleRedo = () => {
    redo();
  };

  const handleSettings = () => {
    console.log('Settings clicked - placeholder');
  };

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <button className="toolbar-btn" onClick={handleOpen} title="打开 (Ctrl+O)">
          <span className="icon">📂</span>
          <span>打开</span>
        </button>
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
