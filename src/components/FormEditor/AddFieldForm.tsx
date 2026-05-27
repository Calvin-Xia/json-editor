import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { JsonType } from '../../core/parser/astOperations';

interface AddFieldFormProps {
  existingKeys: string[];
  onConfirm: (key: string, type: JsonType) => void;
  onCancel: () => void;
}

const TYPE_OPTIONS: { value: JsonType; label: string }[] = [
  { value: 'string', label: '字符串' },
  { value: 'number', label: '数字' },
  { value: 'boolean', label: '布尔' },
  { value: 'null', label: 'Null' },
  { value: 'object', label: '对象' },
  { value: 'array', label: '数组' },
];

const AddFieldForm: React.FC<AddFieldFormProps> = ({ existingKeys, onConfirm, onCancel }) => {
  const [key, setKey] = useState('');
  const [type, setType] = useState<JsonType>('string');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleConfirm = useCallback(() => {
    const trimmed = key.trim();
    if (!trimmed) {
      setError('键名不能为空');
      return;
    }
    if (existingKeys.includes(trimmed)) {
      setError('键名已存在');
      return;
    }
    onConfirm(trimmed, type);
  }, [key, type, existingKeys, onConfirm]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleConfirm();
      } else if (e.key === 'Escape') {
        onCancel();
      }
    },
    [handleConfirm, onCancel]
  );

  return (
    <div className="add-field-form">
      <input
        ref={inputRef}
        type="text"
        className="add-field-input"
        placeholder="输入键名"
        value={key}
        onChange={(e) => {
          setKey(e.target.value);
          setError('');
        }}
        onKeyDown={handleKeyDown}
      />
      <select
        className="add-field-select"
        value={type}
        onChange={(e) => setType(e.target.value as JsonType)}
      >
        {TYPE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <div className="add-field-actions">
        <button className="btn-confirm" onClick={handleConfirm}>
          添加
        </button>
        <button className="btn-cancel" onClick={onCancel}>
          取消
        </button>
      </div>
      {error && <div className="add-field-error">{error}</div>}
    </div>
  );
};

export default AddFieldForm;
