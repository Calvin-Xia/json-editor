import React, { useEffect, useState } from 'react';
import { useDocumentStore } from '../../store/documentStore';
import { ParseStatus } from '../../types/document';

const StatusBar: React.FC = () => {
  const { document, parseStatus, error, setError } = useDocumentStore();
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (error) {
      setShowError(true);
      const timer = setTimeout(() => {
        setShowError(false);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, setError]);

  const getParseStatusText = (status: ParseStatus): string => {
    switch (status) {
      case 'idle':
        return '就绪';
      case 'parsing':
        return '解析中...';
      case 'success':
        return '解析成功';
      case 'error':
        return '解析失败';
      default:
        return '未知';
    }
  };

  const getParseStatusClass = (status: ParseStatus): string => {
    switch (status) {
      case 'success':
        return 'status-success';
      case 'error':
        return 'status-error';
      case 'parsing':
        return 'status-loading';
      default:
        return '';
    }
  };

  return (
    <>
      {showError && error && (
        <div className="error-toast" onClick={() => setShowError(false)}>
          <span className="error-toast-icon">⚠️</span>
          <span className="error-toast-message">{error}</span>
          <span className="error-toast-close">✕</span>
        </div>
      )}
      <div className="status-bar">
        <div className="status-left">
          <span className="status-item">
            <span className="status-label">文件:</span>
            <span className="status-value">
              {document?.filePath || '未打开'}
            </span>
          </span>
          <span className="status-divider">|</span>
          <span className="status-item">
            <span className="status-label">编码:</span>
            <span className="status-value">{document?.encoding || 'UTF-8'}</span>
          </span>
        </div>
        <div className="status-right">
          <span className="status-item">
            <span className={`status-indicator ${document?.isModified ? 'dirty' : ''}`}>
              {document?.isModified ? '● 已修改' : '○ 未修改'}
            </span>
          </span>
          <span className="status-divider">|</span>
          <span className="status-item">
            <span className={`parse-status ${getParseStatusClass(parseStatus)}`}>
              {getParseStatusText(parseStatus)}
            </span>
          </span>
        </div>
      </div>
    </>
  );
};

export default StatusBar;
