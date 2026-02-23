import React from 'react';
import { useTreeStore, nodeCache } from '../../store/treeStore';
import { useDocumentStore } from '../../store/documentStore';
import './FormEditor.css';

const FormEditor: React.FC = () => {
  const { document, parseStatus } = useDocumentStore();
  const { selectedPath } = useTreeStore();

  const selectedNode = selectedPath !== null
    ? nodeCache.findByPath(selectedPath)
    : null;

  if (parseStatus === 'idle' || !document) {
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
            <span className="placeholder-hint">打开文件并选择左侧节点进行编辑</span>
          </div>
        </div>
      </div>
    );
  }

  if (parseStatus === 'error') {
    return (
      <div className="form-editor">
        <div className="form-header">
          <span className="form-title">📝 编辑器</span>
          <span className="form-path">当前路径: -</span>
        </div>
        <div className="form-content">
          <div className="form-error">
            <span className="error-icon">⚠️</span>
            <span className="error-text">文件解析失败，无法编辑</span>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedNode) {
    return (
      <div className="form-editor">
        <div className="form-header">
          <span className="form-title">📝 编辑器</span>
          <span className="form-path">当前路径: -</span>
        </div>
        <div className="form-content">
          <div className="form-placeholder">
            <span className="placeholder-icon">👈</span>
            <span className="placeholder-text">请选择节点</span>
            <span className="placeholder-hint">点击左侧树形导航中的节点进行编辑</span>
          </div>
        </div>
      </div>
    );
  }

  const displayPath = selectedNode.path === '' ? 'root' : selectedNode.path;

  return (
    <div className="form-editor">
      <div className="form-header">
        <span className="form-title">📝 编辑器</span>
        <span className="form-path">当前路径: {displayPath}</span>
      </div>
      <div className="form-content">
        <div className="node-info-panel">
          <div className="info-row">
            <span className="info-label">路径</span>
            <span className="info-value">{displayPath}</span>
          </div>
          <div className="info-row">
            <span className="info-label">键名</span>
            <span className="info-value">{selectedNode.key}</span>
          </div>
          <div className="info-row">
            <span className="info-label">类型</span>
            <span className="info-value type-badge">{selectedNode.kind}</span>
          </div>
          {(selectedNode.kind === 'object' || selectedNode.kind === 'array') && (
            <div className="info-row">
              <span className="info-label">子节点数</span>
              <span className="info-value">{selectedNode.children.length}</span>
            </div>
          )}
          {selectedNode.kind !== 'object' && selectedNode.kind !== 'array' && (
            <div className="info-row">
              <span className="info-label">值</span>
              <span className="info-value preview">{selectedNode.previewText}</span>
            </div>
          )}
        </div>
        
        <div className="editor-placeholder">
          <span className="placeholder-text">编辑功能开发中...</span>
          <span className="placeholder-hint">后续版本将支持在此处编辑节点值</span>
        </div>
      </div>
    </div>
  );
};

export default FormEditor;
