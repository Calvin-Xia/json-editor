import React, { useState } from 'react';
import { useDocumentStore } from '../../store/documentStore';
import type { JsonValue } from '../../core/parser';

const ModifyDemo: React.FC = () => {
  const { document, updateNodeValue, parseStatus } = useDocumentStore();
  const [key, setKey] = useState('version');
  const [value, setValue] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleModify = () => {
    if (!key.trim()) {
      setErrorMsg('请输入键名');
      return;
    }
    
    setErrorMsg(null);
    
    let parsedValue: JsonValue;
    try {
      parsedValue = JSON.parse(value) as JsonValue;
    } catch {
      parsedValue = value;
    }
    
    const success = updateNodeValue(key.trim(), parsedValue);
    if (!success) {
      setErrorMsg('修改失败，请检查键名是否存在');
    }
  };

  if (!document || parseStatus !== 'success') {
    return null;
  }

  return (
    <div className="modify-demo">
      <h4>修改演示</h4>
      <div className="modify-demo-form">
        <div className="form-row">
          <label>键名:</label>
          <input
            type="text"
            value={key}
            onChange={(e) => {
              setKey(e.target.value);
              setErrorMsg(null);
            }}
            placeholder="例如: version"
          />
        </div>
        <div className="form-row">
          <label>值:</label>
          <input
            type="text"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setErrorMsg(null);
            }}
            placeholder="例如: 1.0.0 或 &quot;hello&quot;"
          />
        </div>
        {errorMsg && <div className="error-tip">{errorMsg}</div>}
        <button onClick={handleModify} className="modify-btn">
          修改
        </button>
      </div>
      <p className="hint">
        提示: 输入键名和新值，点击修改按钮更新 JSON 内容
      </p>
    </div>
  );
};

export default ModifyDemo;
