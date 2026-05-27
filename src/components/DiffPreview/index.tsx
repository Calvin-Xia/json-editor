import React, { useState, useEffect, useCallback } from 'react';
import type { PathChange } from '../../core/diff';
import type { Change } from 'diff';
import PathChangeList from './PathChangeList';
import TextDiffView from './TextDiffView';
import './DiffPreview.css';

type TabType = 'paths' | 'text';

interface DiffPreviewProps {
  pathChanges: PathChange[];
  textDiff: Change[];
  onConfirm: () => void;
  onCancel: () => void;
}

const DiffPreview: React.FC<DiffPreviewProps> = ({
  pathChanges,
  textDiff,
  onConfirm,
  onCancel,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('paths');

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    },
    [onCancel],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  return (
    <div className="diff-preview-overlay" onClick={handleOverlayClick}>
      <div className="diff-preview-modal" role="dialog" aria-modal="true">
        <div className="diff-preview-header">
          <span className="diff-preview-title">保存预览</span>
          <button
            className="diff-preview-close"
            onClick={onCancel}
            aria-label="关闭"
          >
            ×
          </button>
        </div>

        <div className="diff-preview-tabs">
          <button
            className={`diff-preview-tab ${activeTab === 'paths' ? 'active' : ''}`}
            onClick={() => setActiveTab('paths')}
          >
            路径变更
            <span className="diff-preview-tab-count">{pathChanges.length}</span>
          </button>
          <button
            className={`diff-preview-tab ${activeTab === 'text' ? 'active' : ''}`}
            onClick={() => setActiveTab('text')}
          >
            文本差异
          </button>
        </div>

        <div className="diff-preview-content">
          {activeTab === 'paths' ? (
            <PathChangeList changes={pathChanges} />
          ) : (
            <TextDiffView changes={textDiff} />
          )}
        </div>

        <div className="diff-preview-footer">
          <button
            className="diff-preview-btn diff-preview-btn-cancel"
            onClick={onCancel}
          >
            取消
          </button>
          <button
            className="diff-preview-btn diff-preview-btn-confirm"
            onClick={onConfirm}
          >
            确认保存
          </button>
        </div>
      </div>
    </div>
  );
};

export default DiffPreview;
