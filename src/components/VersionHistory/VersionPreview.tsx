import React, { useMemo } from 'react';
import { computeTextDiff } from '../../core/diff';

interface VersionPreviewProps {
  versionContent: string;
  currentContent: string;
}

const VersionPreview: React.FC<VersionPreviewProps> = ({ versionContent, currentContent }) => {
  const diffResult = useMemo(() => {
    return computeTextDiff(versionContent, currentContent);
  }, [versionContent, currentContent]);

  const stats = useMemo(() => {
    let added = 0;
    let removed = 0;
    for (const part of diffResult) {
      const lines = part.value.split('\n').length - 1;
      if (part.added) added += lines;
      if (part.removed) removed += lines;
    }
    return { added, removed };
  }, [diffResult]);

  return (
    <div className="version-preview-container">
      <div className="diff-stats">
        <span className="diff-stat-added">+{stats.added} 行新增</span>
        <span className="diff-stat-removed">-{stats.removed} 行删除</span>
      </div>
      <div className="version-preview-content">
        {diffResult.map((part, index) => {
          const lines = part.value.split('\n');
          if (lines[lines.length - 1] === '') {
            lines.pop();
          }

          return lines.map((line, lineIndex) => {
            let className = 'diff-line diff-line-unchanged';
            if (part.added) {
              className = 'diff-line diff-line-added';
            } else if (part.removed) {
              className = 'diff-line diff-line-removed';
            }

            const prefix = part.added ? '+ ' : part.removed ? '- ' : '  ';

            return (
              <div key={`${index}-${lineIndex}`} className={className}>
                {prefix}
                {line}
              </div>
            );
          });
        })}
      </div>
    </div>
  );
};

export default VersionPreview;
