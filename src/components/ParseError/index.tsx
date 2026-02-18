import React from 'react';
import { useDocumentStore } from '../../store/documentStore';

const ParseError: React.FC = () => {
  const { document, parseStatus } = useDocumentStore();

  if (parseStatus !== 'error' || !document?.parseError) {
    return null;
  }

  const { line, column, message } = document.parseError;

  return (
    <div className="parse-error">
      <div className="parse-error-header">
        <span className="error-icon">⚠️</span>
        <span className="error-title">解析错误</span>
      </div>
      <div className="parse-error-details">
        <div className="error-location">
          <strong>位置:</strong> 第 {line} 行, 第 {column} 列
        </div>
        <div className="error-message">
          <strong>原因:</strong> {message}
        </div>
      </div>
      <div className="parse-error-hint">
        请检查文件内容是否为有效的 JSON/JSON5 格式
      </div>
    </div>
  );
};

export default ParseError;
