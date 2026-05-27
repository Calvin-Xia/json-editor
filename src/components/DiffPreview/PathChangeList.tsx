import React from 'react';
import type { PathChange } from '../../core/diff';

const TYPE_LABELS: Record<PathChange['type'], string> = {
  added: '新增',
  removed: '删除',
  modified: '修改',
};

function formatValue(value: unknown): string {
  if (value === undefined) return '';
  if (value === null) return 'null';
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

interface PathChangeListProps {
  changes: PathChange[];
}

const PathChangeList: React.FC<PathChangeListProps> = ({ changes }) => {
  if (changes.length === 0) {
    return (
      <div className="diff-preview-empty">
        <span className="diff-preview-empty-icon">✓</span>
        <span className="diff-preview-empty-text">无路径变更</span>
      </div>
    );
  }

  return (
    <table className="path-change-table">
      <thead>
        <tr>
          <th>路径</th>
          <th>操作</th>
          <th>旧值 → 新值</th>
        </tr>
      </thead>
      <tbody>
        {changes.map((change) => (
          <tr key={change.path} className="path-change-row">
            <td>
              <span className="path-change-path">{change.path || '/'}</span>
            </td>
            <td>
              <span className={`change-type-badge ${change.type}`}>
                {TYPE_LABELS[change.type]}
              </span>
            </td>
            <td>
              {change.type === 'added' && (
                <span className="path-change-value added">
                  {formatValue(change.newValue)}
                </span>
              )}
              {change.type === 'removed' && (
                <span className="path-change-value removed">
                  {formatValue(change.oldValue)}
                </span>
              )}
              {change.type === 'modified' && (
                <>
                  <span className="path-change-value removed">
                    {formatValue(change.oldValue)}
                  </span>
                  <span className="path-change-arrow">→</span>
                  <span className="path-change-value added">
                    {formatValue(change.newValue)}
                  </span>
                </>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default PathChangeList;
