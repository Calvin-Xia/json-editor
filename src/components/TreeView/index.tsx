import React from 'react';

const TreeView: React.FC = () => {
  return (
    <div className="tree-view">
      <div className="tree-header">
        <span className="tree-title">📁 结构导航</span>
      </div>
      <div className="tree-content">
        <div className="tree-placeholder">
          <span className="placeholder-icon">📋</span>
          <span className="placeholder-text">树形导航占位</span>
          <span className="placeholder-hint">打开 JSON 文件后将显示结构</span>
        </div>
      </div>
    </div>
  );
};

export default TreeView;
