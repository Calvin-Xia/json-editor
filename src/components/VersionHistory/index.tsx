import React, { useState, useEffect, useCallback } from 'react';
import type { VersionInfo } from '../../types/ipc';
import type { Document } from '../../types/document';
import { useFileOperations } from '../../hooks/useFileOperations';
import { useDocumentStore } from '../../store/documentStore';
import { parseJson5 } from '../../core/parser';
import VersionPreview from './VersionPreview';
import './VersionHistory.css';

interface VersionHistoryProps {
  isOpen: boolean;
  onClose: () => void;
}

type ViewMode = 'list' | 'preview';

const VersionHistory: React.FC<VersionHistoryProps> = ({ isOpen, onClose }) => {
  const { listVersions, restoreVersion } = useFileOperations();
  const document = useDocumentStore((state) => state.document);
  const setDocument = useDocumentStore((state) => state.setDocument);
  const setParseStatus = useDocumentStore((state) => state.setParseStatus);
  const setError = useDocumentStore((state) => state.setError);

  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<VersionInfo | null>(null);
  const [versionContent, setVersionContent] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showConfirm, setShowConfirm] = useState(false);

  const loadVersions = useCallback(async () => {
    if (!document?.filePath) return;
    setLoading(true);
    const result = await listVersions(document.filePath);
    setVersions(result);
    setLoading(false);
  }, [document?.filePath, listVersions]);

  useEffect(() => {
    if (isOpen && document?.filePath) {
      loadVersions();
      setSelectedVersion(null);
      setVersionContent(null);
      setViewMode('list');
      setShowConfirm(false);
    }
  }, [isOpen, document?.filePath, loadVersions]);

  const handleVersionClick = useCallback(
    async (version: VersionInfo) => {
      setSelectedVersion(version);
      const content = await restoreVersion(version.id);
      if (content !== null) {
        setVersionContent(content);
        setViewMode('preview');
      }
    },
    [restoreVersion]
  );

  const handleBackToList = useCallback(() => {
    setViewMode('list');
    setVersionContent(null);
  }, []);

  const handleRollbackClick = useCallback(() => {
    if (!selectedVersion || !versionContent) return;
    setShowConfirm(true);
  }, [selectedVersion, versionContent]);

  const handleConfirmRollback = useCallback(() => {
    if (!versionContent || !document?.filePath) return;

    const parseResult = parseJson5(versionContent);
    if (parseResult.success) {
      const restoredDoc: Document = {
        filePath: document.filePath,
        originalContent: versionContent,
        jsonNode: parseResult.node,
        parseError: null,
        isModified: true,
        encoding: document.encoding,
        format: document.format,
      };
      setDocument(restoredDoc);
      setParseStatus('success');
      setError(null);
    } else {
      const errorDoc: Document = {
        filePath: document.filePath,
        originalContent: versionContent,
        jsonNode: null,
        parseError: parseResult.error,
        isModified: true,
        encoding: document.encoding,
        format: document.format,
      };
      setDocument(errorDoc);
      setParseStatus('error');
      setError(parseResult.error.message);
    }

    setShowConfirm(false);
    onClose();
  }, [versionContent, document, setDocument, setParseStatus, setError, onClose]);

  const handleCancelRollback = useCallback(() => {
    setShowConfirm(false);
  }, []);

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const currentContent = document?.jsonNode
    ? document.originalContent
    : document?.originalContent ?? '';

  return (
    <>
      <div
        className={`version-history-overlay ${isOpen ? 'open' : ''}`}
        onClick={onClose}
      />
      <div className={`version-history-panel ${isOpen ? 'open' : ''}`}>
        <div className="version-history-header">
          <span className="version-history-title">版本历史</span>
          <button className="version-history-close" onClick={onClose} title="关闭">
            ×
          </button>
        </div>

        <div className="version-history-body">
          {viewMode === 'list' && (
            <div className="version-list-container">
              {loading && (
                <div className="version-list-loading">加载版本列表...</div>
              )}
              {!loading && versions.length === 0 && (
                <div className="version-list-empty">
                  <span className="version-list-empty-icon">📋</span>
                  <span className="version-list-empty-text">暂无历史版本</span>
                </div>
              )}
              {!loading &&
                versions.map((version, index) => (
                  <div
                    key={version.id}
                    className={`version-item ${
                      selectedVersion?.id === version.id ? 'selected' : ''
                    }`}
                    onClick={() => handleVersionClick(version)}
                  >
                    <div className="version-item-timeline">
                      <div className="version-item-dot" />
                      {index < versions.length - 1 && (
                        <div className="version-item-line" />
                      )}
                    </div>
                    <div className="version-item-info">
                      <div className="version-item-time">
                        {formatTimestamp(version.timestamp)}
                      </div>
                      <div className="version-item-meta">
                        {formatSize(version.size)}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {viewMode === 'preview' && selectedVersion && versionContent !== null && (
            <>
              <div className="version-preview-header">
                <span className="version-preview-title">
                  {formatTimestamp(selectedVersion.timestamp)} 的版本
                </span>
                <button
                  className="version-preview-back"
                  onClick={handleBackToList}
                >
                  ← 返回列表
                </button>
              </div>
              <VersionPreview
                versionContent={versionContent}
                currentContent={currentContent}
              />
            </>
          )}
        </div>

        <div className="version-history-footer">
          <button className="version-btn" onClick={onClose}>
            关闭
          </button>
          <button
            className="version-btn version-btn-danger"
            disabled={viewMode !== 'preview' || !versionContent}
            onClick={handleRollbackClick}
          >
            回滚到此版本
          </button>
        </div>

        {showConfirm && (
          <div className="version-confirm-overlay">
            <div className="version-confirm-dialog">
              <div className="version-confirm-title">确认回滚</div>
              <div className="version-confirm-message">
                确定要回滚到{' '}
                {selectedVersion
                  ? formatTimestamp(selectedVersion.timestamp)
                  : ''}
                {' '}的版本吗？当前未保存的修改将会丢失。
              </div>
              <div className="version-confirm-actions">
                <button
                  className="version-btn"
                  onClick={handleCancelRollback}
                >
                  取消
                </button>
                <button
                  className="version-btn version-btn-danger"
                  onClick={handleConfirmRollback}
                >
                  确认回滚
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default VersionHistory;
