import React, { useEffect, useCallback, memo } from 'react';
import { useTreeStore } from '../../store/treeStore';
import { useDocumentStore } from '../../store/documentStore';
import type { TreeNode } from '../../types/treeModel';
import './TreeView.css';

interface TreeNodeItemProps {
  node: TreeNode;
  depth: number;
  expandedPaths: Set<string>;
  selectedPath: string | null;
  matchedPaths: Set<string>;
  visiblePaths: Set<string> | null;
  searchQuery: string;
  onToggleExpand: (path: string) => void;
  onSelectNode: (path: string) => void;
}

const TreeNodeItem: React.FC<TreeNodeItemProps> = memo(({
  node,
  depth,
  expandedPaths,
  selectedPath,
  matchedPaths,
  visiblePaths,
  searchQuery,
  onToggleExpand,
  onSelectNode,
}) => {
  const isExpanded = expandedPaths.has(node.path);
  const isSelected = selectedPath === node.path;
  const isMatched = matchedPaths.has(node.path);
  const hasChildren = node.children.length > 0;
  const isSearchMode = searchQuery.trim() !== '';

  if (isSearchMode && visiblePaths && !visiblePaths.has(node.path)) {
    return null;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectNode(node.path);
    if (hasChildren) {
      onToggleExpand(node.path);
    }
  };

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpand(node.path);
  };

  const getNodeIcon = () => {
    switch (node.kind) {
      case 'object':
        return isExpanded ? '📂' : '📁';
      case 'array':
        return isExpanded ? '📋' : '📑';
      case 'string':
        return '📝';
      case 'number':
        return '🔢';
      case 'boolean':
        return '✓✗';
      case 'null':
        return '∅';
      default:
        return '•';
    }
  };

  return (
    <div className="tree-node-container">
      <div 
        className={`tree-node ${isSelected ? 'selected' : ''} ${isMatched ? 'matched' : ''}`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleClick}
      >
        {hasChildren && (
          <span 
            className="expand-icon" 
            onClick={handleExpandClick}
          >
            {isExpanded ? '▼' : '▶'}
          </span>
        )}
        {!hasChildren && <span className="expand-placeholder" />}
        
        <span className="node-icon">{getNodeIcon()}</span>
        <span className={`node-key ${isMatched ? 'highlight' : ''}`}>{node.key}</span>
        {node.kind !== 'object' && node.kind !== 'array' && (
          <span className="node-preview">{node.previewText}</span>
        )}
        {(node.kind === 'object' || node.kind === 'array') && (
          <span className="node-count">{node.previewText}</span>
        )}
      </div>
      
      {isExpanded && hasChildren && (
        <div className="tree-children">
          {node.children.map((child) => (
            <TreeNodeItem 
              key={child.path} 
              node={child} 
              depth={depth + 1}
              expandedPaths={expandedPaths}
              selectedPath={selectedPath}
              matchedPaths={matchedPaths}
              visiblePaths={visiblePaths}
              searchQuery={searchQuery}
              onToggleExpand={onToggleExpand}
              onSelectNode={onSelectNode}
            />
          ))}
        </div>
      )}
    </div>
  );
});

TreeNodeItem.displayName = 'TreeNodeItem';

const TreeView: React.FC = () => {
  const { document, parseStatus } = useDocumentStore();
  const { 
    treeRoot,
    expandedPaths, 
    selectedPath, 
    matchedPaths,
    visiblePaths,
    searchQuery, 
    setSearchQuery, 
    expandAllNodes, 
    collapseAllNodes, 
    setTreeRoot,
    toggleNodeExpand,
    selectTreeNode
  } = useTreeStore();

  useEffect(() => {
    if (document?.jsonNode) {
      setTreeRoot(document.jsonNode);
    }
  }, [document?.jsonNode, setTreeRoot]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, [setSearchQuery]);

  if (parseStatus === 'idle' || !document) {
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
  }

  if (parseStatus === 'parsing') {
    return (
      <div className="tree-view">
        <div className="tree-header">
          <span className="tree-title">📁 结构导航</span>
        </div>
        <div className="tree-content">
          <div className="tree-loading">
            <span>解析中...</span>
          </div>
        </div>
      </div>
    );
  }

  if (parseStatus === 'error') {
    return (
      <div className="tree-view">
        <div className="tree-header">
          <span className="tree-title">📁 结构导航</span>
        </div>
        <div className="tree-content">
          <div className="tree-error">
            <span className="error-icon">⚠️</span>
            <span className="error-text">解析失败</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tree-view">
      <div className="tree-header">
        <span className="tree-title">📁 结构导航</span>
        <div className="tree-actions">
          <button 
            className="tree-action-btn" 
            onClick={expandAllNodes}
            title="展开全部"
          >
            ⊞
          </button>
          <button 
            className="tree-action-btn" 
            onClick={collapseAllNodes}
            title="折叠全部"
          >
            ⊟
          </button>
        </div>
      </div>
      
      <div className="tree-search">
        <input
          type="text"
          placeholder="搜索字段..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="search-input"
        />
      </div>
      
      <div className="tree-content">
        {treeRoot ? (
          <div className="tree-root">
            <TreeNodeItem 
              node={treeRoot} 
              depth={0}
              expandedPaths={expandedPaths}
              selectedPath={selectedPath}
              matchedPaths={matchedPaths}
              visiblePaths={visiblePaths}
              searchQuery={searchQuery}
              onToggleExpand={toggleNodeExpand}
              onSelectNode={selectTreeNode}
            />
          </div>
        ) : (
          <div className="tree-empty">
            <span>空文档</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TreeView;
