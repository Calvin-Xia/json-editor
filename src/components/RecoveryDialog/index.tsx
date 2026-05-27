import React, { useState, useEffect, useCallback } from 'react';
import { useDocumentStore } from '../../store/documentStore';
import type { AutosaveData } from '../../types/ipc';
import './RecoveryDialog.css';

const AUTOSAVE_FILE_PATH_KEY = 'autosave:lastFilePath';

const RecoveryDialog: React.FC = () => {
  const openContent = useDocumentStore((state) => state.openContent);

  const [visible, setVisible] = useState(false);
  const [recoveryData, setRecoveryData] = useState<AutosaveData | null>(null);
  const [recoveryFilePath, setRecoveryFilePath] = useState<string | null>(null);

  useEffect(() => {
    // Guard: electronAPI is only available in Electron context
    if (!window.electronAPI?.autosave) {
      return;
    }

    const storedPath = localStorage.getItem(AUTOSAVE_FILE_PATH_KEY);
    if (!storedPath) return;

    const checkAutosave = async () => {
      try {
        const data = await window.electronAPI.autosave.load(storedPath);
        if (data && data.content) {
          setRecoveryData(data);
          setRecoveryFilePath(storedPath);
          setVisible(true);
        } else {
          localStorage.removeItem(AUTOSAVE_FILE_PATH_KEY);
        }
      } catch (error) {
        console.error('Failed to check autosave:', error);
        localStorage.removeItem(AUTOSAVE_FILE_PATH_KEY);
      }
    };

    checkAutosave();
  }, []);

  const handleRecover = useCallback(() => {
    if (recoveryData && recoveryFilePath) {
      openContent(recoveryData.content, recoveryFilePath);
      useDocumentStore.getState().setModified(true);
    }
    localStorage.removeItem(AUTOSAVE_FILE_PATH_KEY);
    setVisible(false);
    setRecoveryData(null);
    setRecoveryFilePath(null);
  }, [recoveryData, recoveryFilePath, openContent]);

  const handleIgnore = useCallback(async () => {
    if (recoveryFilePath && window.electronAPI?.autosave) {
      await window.electronAPI.autosave.write(recoveryFilePath, '');
    }
    localStorage.removeItem(AUTOSAVE_FILE_PATH_KEY);
    setVisible(false);
    setRecoveryData(null);
    setRecoveryFilePath(null);
  }, [recoveryFilePath]);

  if (!visible || !recoveryData) {
    return null;
  }

  return (
    <div className="recovery-overlay">
      <div className="recovery-dialog">
        <div className="recovery-icon">⚠️</div>
        <h3 className="recovery-title">检测到未保存的编辑</h3>
        <p className="recovery-message">
          检测到未保存的编辑，是否恢复？
          <span className="recovery-timestamp">
            自动保存时间：{new Date(recoveryData.timestamp).toLocaleString()}
          </span>
        </p>
        <div className="recovery-actions">
          <button
            className="recovery-btn recovery-btn--recover"
            onClick={handleRecover}
          >
            恢复
          </button>
          <button
            className="recovery-btn recovery-btn--ignore"
            onClick={handleIgnore}
          >
            忽略
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecoveryDialog;
