import React, { useMemo } from 'react';
import { useDocumentStore } from '../../store/documentStore';

const RawPreview: React.FC = () => {
  const { document, parseStatus } = useDocumentStore();

  const previewContent = useMemo(() => {
    if (!document) return '// 没有打开文件';
    if (parseStatus === 'error') {
      return `// 解析错误\n// ${document.parseError?.message || '未知错误'}\n// 行: ${document.parseError?.line}, 列: ${document.parseError?.column}\n\n${document.originalContent}`;
    }
    if (document.jsonNode) {
      return document.jsonNode.toString();
    }
    return document.originalContent;
  }, [document, parseStatus]);

  return (
    <div className="raw-preview">
      <div className="raw-preview-header">
        <h3>Raw 预览 (只读)</h3>
        {document && (
          <span className="format-badge">
            {document.format.toUpperCase()}
          </span>
        )}
      </div>
      <textarea
        className="raw-preview-content"
        value={previewContent}
        readOnly
        spellCheck={false}
      />
    </div>
  );
};

export default RawPreview;
