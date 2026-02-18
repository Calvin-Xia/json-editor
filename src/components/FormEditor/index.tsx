import React from 'react';

const FormEditor: React.FC = () => {
  return (
    <div className="form-editor">
      <div className="form-header">
        <span className="form-title">📝 编辑器</span>
        <span className="form-path">当前路径: -</span>
      </div>
      <div className="form-content">
        <div className="form-placeholder">
          <span className="placeholder-icon">✏️</span>
          <span className="placeholder-text">表单编辑器占位</span>
          <span className="placeholder-hint">选择左侧节点进行编辑</span>
        </div>
      </div>
    </div>
  );
};

export default FormEditor;
