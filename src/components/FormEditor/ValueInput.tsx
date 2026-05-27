import React, { useState, useEffect, useRef, useCallback } from 'react';
import './ValueInput.css';

interface ValueInputProps {
  value: string | number | boolean | null;
  type: 'string' | 'number' | 'boolean' | 'null';
  onChange: (value: string | number | boolean | null) => void;
  disabled?: boolean;
}

const DEBOUNCE_MS = 300;

const ValueInput: React.FC<ValueInputProps> = ({ value, type, onChange, disabled = false }) => {
  if (type === 'null') {
    return (
      <div className="value-input value-input--null">
        <span className="value-input__null-display">null</span>
      </div>
    );
  }

  if (type === 'boolean') {
    return (
      <div className="value-input value-input--boolean">
        <select
          className="value-input__select"
          value={value === true ? 'true' : 'false'}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value === 'true')}
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      </div>
    );
  }

  if (type === 'number') {
    return <NumberInput value={value as number} onChange={onChange} disabled={disabled} />;
  }

  return <StringInput value={value as string} onChange={onChange} disabled={disabled} />;
};

const StringInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}> = ({ value, onChange, disabled }) => {
  const [localValue, setLocalValue] = useState(String(value));
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalValue(String(value));
  }, [value]);

  const flushValue = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    onChange(localValue);
  }, [localValue, onChange]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      onChange(newValue);
    }, DEBOUNCE_MS);
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      flushValue();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      setLocalValue(String(value));
    }
  }, [flushValue, value]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className="value-input value-input--string">
      <input
        type="text"
        className="value-input__text"
        value={localValue}
        disabled={disabled}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
};

const NumberInput: React.FC<{
  value: number;
  onChange: (value: number) => void;
  disabled: boolean;
}> = ({ value, onChange, disabled }) => {
  const [localValue, setLocalValue] = useState(String(value));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLocalValue(String(value));
    setError(null);
  }, [value]);

  const validateAndCommit = useCallback(() => {
    const trimmed = localValue.trim();
    if (trimmed === '' || trimmed === 'NaN') {
      setError('请输入有效的数字');
      return;
    }
    const num = Number(trimmed);
    if (Number.isNaN(num)) {
      setError('请输入有效的数字');
      return;
    }
    setError(null);
    onChange(num);
  }, [localValue, onChange]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    setError(null);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      validateAndCommit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setLocalValue(String(value));
      setError(null);
    }
  }, [validateAndCommit, value]);

  const handleBlur = useCallback(() => {
    validateAndCommit();
  }, [validateAndCommit]);

  return (
    <div className="value-input value-input--number">
      <input
        type="text"
        className={`value-input__text${error ? ' value-input__text--error' : ''}`}
        value={localValue}
        disabled={disabled}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
      />
      {error && <span className="value-input__error">{error}</span>}
    </div>
  );
};

export default ValueInput;
