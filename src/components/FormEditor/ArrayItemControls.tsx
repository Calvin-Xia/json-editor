import React, { useCallback } from 'react';

interface ArrayItemControlsProps {
  index: number;
  totalCount: number;
  onDelete: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}

const ArrayItemControls: React.FC<ArrayItemControlsProps> = ({
  index,
  totalCount,
  onDelete,
  onMoveUp,
  onMoveDown,
}) => {
  const handleDelete = useCallback(() => {
    onDelete(index);
  }, [index, onDelete]);

  const handleMoveUp = useCallback(() => {
    onMoveUp(index);
  }, [index, onMoveUp]);

  const handleMoveDown = useCallback(() => {
    onMoveDown(index);
  }, [index, onMoveDown]);

  return (
    <div className="array-item-controls">
      <button
        className="btn-icon"
        title="上移"
        disabled={index === 0}
        onClick={handleMoveUp}
      >
        ↑
      </button>
      <button
        className="btn-icon"
        title="下移"
        disabled={index === totalCount - 1}
        onClick={handleMoveDown}
      >
        ↓
      </button>
      <button
        className="btn-icon btn-delete"
        title="删除"
        onClick={handleDelete}
      >
        ✕
      </button>
    </div>
  );
};

export default ArrayItemControls;
