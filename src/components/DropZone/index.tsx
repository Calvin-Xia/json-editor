import React, { useState, useCallback, useRef } from 'react';
import './DropZone.css';

const ALLOWED_EXTENSIONS = ['.json', '.json5'];

interface DropZoneProps {
  onFileDrop: (content: string, filePath: string) => void;
  children: React.ReactNode;
}

const DropZone: React.FC<DropZoneProps> = ({ onFileDrop, children }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dragCounterRef = useRef(0);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showError = useCallback((message: string) => {
    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current);
    }
    setError(message);
    errorTimerRef.current = setTimeout(() => setError(null), 3000);
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounterRef.current = 0;

      const files = e.dataTransfer.files;
      if (files.length === 0) return;

      const file = files[0];
      const electronFile = file as File & { path?: string };
      const filePath = electronFile.path || file.name;

      const ext = filePath.toLowerCase().substring(filePath.lastIndexOf('.'));
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        showError(`不支持的文件类型：${ext}，请使用 .json 或 .json5 文件`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result;
        if (typeof content === 'string') {
          onFileDrop(content, filePath);
        }
      };
      reader.readAsText(file);
    },
    [onFileDrop, showError]
  );

  return (
    <div
      className="dropzone-wrapper"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}
      {isDragging && (
        <div className="dropzone-overlay">
          <div className="dropzone-overlay-content">
            <span className="dropzone-overlay-icon">📂</span>
            <span className="dropzone-overlay-text">拖放文件到此处</span>
            <span className="dropzone-overlay-hint">支持 .json 和 .json5 文件</span>
          </div>
        </div>
      )}
      {error && (
        <div className="dropzone-error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
};

export default DropZone;
