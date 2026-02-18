import React from 'react';
import { useDocumentStore } from '../../store/documentStore';
import { ParseStatus } from '../../types/document';

const StatusBar: React.FC = () => {
  const { document, parseStatus } = useDocumentStore();

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
  );
};

export default StatusBar;
