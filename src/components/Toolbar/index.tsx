import React from 'react';
import { useDocumentStore } from '../../store/documentStore';

const Toolbar: React.FC = () => {
  const { openFile, saveFile, saveFileAs, document } = useDocumentStore();

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
    console.log('Undo clicked - placeholder');
  };

  const handleRedo = () => {
    console.log('Redo clicked - placeholder');
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
        <button className="toolbar-btn" onClick={handleUndo} title="撤销 (Ctrl+Z)">
          <span className="icon">↩️</span>
          <span>撤销</span>
        </button>
        <button className="toolbar-btn" onClick={handleRedo} title="重做 (Ctrl+Y)">
          <span className="icon">↪️</span>
          <span>重做</span>
        </button>
      </div>
      <div className="toolbar-center">
        <input
          type="text"
          className="search-input"
          placeholder="搜索字段..."
          onChange={(e) => console.log('Search:', e.target.value)}
        />
      </div>
      <div className="toolbar-right">
        <button className="toolbar-btn" onClick={handleSettings} title="设置">
          <span className="icon">⚙️</span>
          <span>设置</span>
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
