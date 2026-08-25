import React, { useState, useCallback, useMemo } from 'react';
import { useTreeStore, nodeCache } from '../../store/treeStore';
import { useDocumentStore } from '../../store/documentStore';
import { getNodeValue, resolveNodeAtPath } from '../../core/parser';
import type { JsonValue } from '../../core/parser';
import type { JsonType } from '../../core/parser/astOperations';
import { getParentPath } from '../../core/treeModel/pathUtils';
import AddFieldForm from './AddFieldForm';
import ArrayItemControls from './ArrayItemControls';
import ValueInput from './ValueInput';
import './FormEditor.css';

const TYPE_OPTIONS: { value: JsonType; label: string }[] = [
  { value: 'string', label: '字符串' },
  { value: 'number', label: '数字' },
  { value: 'boolean', label: '布尔' },
  { value: 'null', label: 'Null' },
  { value: 'object', label: '对象' },
  { value: 'array', label: '数组' },
];

const FormEditor: React.FC = () => {
  const {
    document,
    parseStatus,
    addField,
    deleteField,
    addArrayItem,
    deleteArrayItem,
    moveArrayItem,
    updateNodeValue,
    exportNodeFragment,
  } = useDocumentStore();
  const { selectedPath } = useTreeStore();

  const [showAddField, setShowAddField] = useState(false);
  const [showAddArrayMenu, setShowAddArrayMenu] = useState(false);
  const [exportToast, setExportToast] = useState<string | null>(null);

  const handleExportFragment = useCallback(
    async (path: string) => {
      const ok = await exportNodeFragment(path);
      if (ok) {
        setExportToast('已复制为 JSON 片段到剪贴板');
        setTimeout(() => setExportToast(null), 2000);
      } else {
        setExportToast('导出失败');
        setTimeout(() => setExportToast(null), 2000);
      }
    },
    [exportNodeFragment],
  );

  const selectedNode =
    selectedPath !== null ? nodeCache.findByPath(selectedPath) : null;

  const isObject = selectedNode?.kind === 'object';
  const isArray = selectedNode?.kind === 'array';
  const isContainer = isObject || isArray;
  const isPrimitive = selectedNode ? !isContainer : false;

  const currentValue = useMemo<JsonValue | null>(() => {
    if (!isPrimitive || !document?.jsonNode || !selectedNode || !selectedPath) return null;
    const parentPath = getParentPath(selectedPath);
    const parentNode = resolveNodeAtPath(document.jsonNode, parentPath);
    if (!parentNode) return null;
    return getNodeValue(parentNode, selectedNode.key) ?? null;
  }, [isPrimitive, document?.jsonNode, selectedNode, selectedPath]);

  const handleAddField = useCallback(
    (key: string, type: JsonType) => {
      if (selectedPath !== null) {
        addField(selectedPath, key, type);
        setShowAddField(false);
      }
    },
    [selectedPath, addField]
  );

  const handleDeleteField = useCallback(
    (key: string) => {
      if (selectedPath !== null) {
        deleteField(selectedPath, key);
      }
    },
    [selectedPath, deleteField]
  );

  const handleAddArrayItem = useCallback(
    (type: JsonType) => {
      if (selectedPath !== null) {
        addArrayItem(selectedPath, type);
        setShowAddArrayMenu(false);
      }
    },
    [selectedPath, addArrayItem]
  );

  const handleDeleteArrayItem = useCallback(
    (index: number) => {
      if (selectedPath !== null) {
        deleteArrayItem(selectedPath, index);
      }
    },
    [selectedPath, deleteArrayItem]
  );

  const handleMoveArrayItem = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (selectedPath !== null) {
        moveArrayItem(selectedPath, fromIndex, toIndex);
      }
    },
    [selectedPath, moveArrayItem]
  );

  const handleValueChange = useCallback((value: string | number | boolean | null) => {
    if (!selectedNode || !selectedPath) return;
    const parentPath = getParentPath(selectedPath);
    updateNodeValue(parentPath, selectedNode.key, value);
  }, [selectedNode, selectedPath, updateNodeValue]);

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
            <span className="placeholder-hint">
              打开文件并选择左侧节点进行编辑
            </span>
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
            <span className="placeholder-hint">
              点击左侧树形导航中的节点进行编辑
            </span>
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
          {isContainer && (
            <div className="info-row">
              <span className="info-label">子节点数</span>
              <span className="info-value">{selectedNode.children.length}</span>
            </div>
          )}
          {!isContainer && (
            <div className="info-row">
              <span className="info-label">值</span>
              <span className="info-value preview">
                {selectedNode.previewText}
              </span>
            </div>
          )}
          <div className="info-actions">
            <button
              className="export-fragment-btn"
              title="导出当前节点为 JSON 片段到剪贴板"
              onClick={() => handleExportFragment(selectedNode.path)}
            >
              📋 导出片段
            </button>
          </div>
        </div>

        {isObject && (
          <div className="children-section">
            <div className="children-header">
              <span className="children-title">字段列表</span>
            </div>
            <div className="children-list">
              {selectedNode.children.map((child) => (
                <div key={child.path} className="child-item">
                  <span className="child-key">{child.key}</span>
                  <span className="child-type-badge">{child.kind}</span>
                  <span className="child-preview">{child.previewText}</span>
                  <button
                    className="btn-icon btn-delete"
                    title="删除字段"
                    onClick={() => handleDeleteField(child.key)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            {showAddField ? (
              <AddFieldForm
                existingKeys={selectedNode.children.map((c) => c.key)}
                onConfirm={handleAddField}
                onCancel={() => setShowAddField(false)}
              />
            ) : (
              <button
                className="btn-add"
                onClick={() => setShowAddField(true)}
              >
                + 添加字段
              </button>
            )}
          </div>
        )}

        {isArray && (
          <div className="children-section">
            <div className="children-header">
              <span className="children-title">元素列表</span>
            </div>
            <div className="children-list">
              {selectedNode.children.map((child, index) => (
                <div key={child.path} className="child-item">
                  <span className="child-index">[{index}]</span>
                  <span className="child-type-badge">{child.kind}</span>
                  <span className="child-preview">{child.previewText}</span>
                  <ArrayItemControls
                    index={index}
                    totalCount={selectedNode.children.length}
                    onDelete={handleDeleteArrayItem}
                    onMoveUp={(i) => handleMoveArrayItem(i, i - 1)}
                    onMoveDown={(i) => handleMoveArrayItem(i, i + 1)}
                  />
                </div>
              ))}
            </div>
            {showAddArrayMenu ? (
              <div className="add-array-menu">
                <span className="add-array-label">选择类型:</span>
                <div className="type-options">
                  {TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      className="type-option-btn"
                      onClick={() => handleAddArrayItem(opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <button
                  className="btn-cancel-inline"
                  onClick={() => setShowAddArrayMenu(false)}
                >
                  取消
                </button>
              </div>
            ) : (
              <button
                className="btn-add"
                onClick={() => setShowAddArrayMenu(true)}
              >
                + 添加元素
              </button>
            )}
          </div>
        )}

        {isPrimitive && (
          <div className="value-editor-section">
            <div className="section-label">编辑值</div>
            <ValueInput
              value={currentValue as string | number | boolean | null}
              type={selectedNode.kind as 'string' | 'number' | 'boolean' | 'null'}
              onChange={handleValueChange}
            />
          </div>
        )}
      </div>
      {exportToast && <div className="form-toast">{exportToast}</div>}
    </div>
  );
};

export default FormEditor;
