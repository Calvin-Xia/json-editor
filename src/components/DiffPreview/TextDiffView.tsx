import React from 'react';
import type { Change } from 'diff';

interface TextDiffViewProps {
  changes: Change[];
}

const TextDiffView: React.FC<TextDiffViewProps> = ({ changes }) => {
  if (changes.length === 0) {
    return (
      <div className="diff-preview-empty">
        <span className="diff-preview-empty-icon">✓</span>
        <span className="diff-preview-empty-text">无文本差异</span>
      </div>
    );
  }

  let lineNum = 0;

  return (
    <div className="text-diff-view">
      {changes.map((change, changeIdx) => {
        const lines = change.value.endsWith('\n')
          ? change.value.slice(0, -1).split('\n')
          : change.value.split('\n');

        return lines.map((line, lineIdx) => {
          lineNum += 1;
          const key = `${changeIdx}-${lineIdx}`;
          const lineClass = change.added
            ? 'added'
            : change.removed
              ? 'removed'
              : 'context';

          return (
            <div key={key} className={`text-diff-line ${lineClass}`}>
              <span className="text-diff-gutter">{lineNum}</span>
              <span className="text-diff-marker">
                {change.added ? '+' : change.removed ? '-' : ' '}
              </span>
              <span className="text-diff-text">{line}</span>
            </div>
          );
        });
      })}
    </div>
  );
};

export default TextDiffView;
