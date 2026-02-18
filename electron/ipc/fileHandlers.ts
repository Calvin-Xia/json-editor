import { dialog, app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

const RECENT_FILES_KEY = 'recentFiles';
const MAX_RECENT_FILES = 10;

interface FileOpenResult {
  filePath: string;
  content: string;
  encoding: string;
}

interface AutosaveData {
  content: string;
  timestamp: number;
}

interface VersionInfo {
  id: string;
  timestamp: number;
  size: number;
}

function getRecentFilesStore(): string[] {
  const storePath = path.join(app.getPath('userData'), 'recent-files.json');
  try {
    if (fs.existsSync(storePath)) {
      const data = fs.readFileSync(storePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch {
    return [];
  }
  return [];
}

function saveRecentFilesStore(files: string[]): void {
  const storePath = path.join(app.getPath('userData'), 'recent-files.json');
  fs.writeFileSync(storePath, JSON.stringify(files, null, 2));
}

function addToRecentFiles(filePath: string): void {
  let recentFiles = getRecentFilesStore();
  recentFiles = recentFiles.filter((f) => f !== filePath);
  recentFiles.unshift(filePath);
  recentFiles = recentFiles.slice(0, MAX_RECENT_FILES);
  saveRecentFilesStore(recentFiles);
}

export async function handleFileOpen(): Promise<FileOpenResult | null> {
  const result = await dialog.showOpenDialog({
    title: '打开 JSON/JSON5 文件',
    filters: [
      { name: 'JSON Files', extensions: ['json', 'json5'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  addToRecentFiles(filePath);

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return {
      filePath,
      content,
      encoding: 'UTF-8',
    };
  } catch (error) {
    console.error('Failed to read file:', error);
    return null;
  }
}

export async function handleFileSave(filePath: string, content: string): Promise<boolean> {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  } catch (error) {
    console.error('Failed to save file:', error);
    return false;
  }
}

export async function handleFileSaveAs(
  content: string,
  defaultPath?: string
): Promise<string | null> {
  const result = await dialog.showSaveDialog({
    title: '另存为',
    defaultPath: defaultPath || 'untitled.json',
    filters: [
      { name: 'JSON Files', extensions: ['json', 'json5'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (result.canceled || !result.filePath) {
    return null;
  }

  try {
    fs.writeFileSync(result.filePath, content, 'utf-8');
    addToRecentFiles(result.filePath);
    return result.filePath;
  } catch (error) {
    console.error('Failed to save file:', error);
    return null;
  }
}

export async function handleGetRecent(): Promise<string[]> {
  return getRecentFilesStore();
}

export async function handleAutosaveWrite(filePath: string, content: string): Promise<boolean> {
  const tmpPath = `${filePath}.tmp`;
  try {
    fs.writeFileSync(tmpPath, content, 'utf-8');
    return true;
  } catch (error) {
    console.error('Failed to write autosave:', error);
    return false;
  }
}

export async function handleAutosaveLoad(filePath: string): Promise<AutosaveData | null> {
  const tmpPath = `${filePath}.tmp`;
  try {
    if (!fs.existsSync(tmpPath)) {
      return null;
    }
    const content = fs.readFileSync(tmpPath, 'utf-8');
    const stats = fs.statSync(tmpPath);
    return {
      content,
      timestamp: stats.mtime.getTime(),
    };
  } catch (error) {
    console.error('Failed to load autosave:', error);
    return null;
  }
}

function getVersionDir(filePath: string): string {
  return `${filePath}.versions`;
}

export async function handleVersionList(filePath: string): Promise<VersionInfo[]> {
  const versionDir = getVersionDir(filePath);
  try {
    if (!fs.existsSync(versionDir)) {
      return [];
    }
    const files = fs.readdirSync(versionDir);
    const versions: VersionInfo[] = files
      .filter((f) => f.endsWith('.json5') || f.endsWith('.json'))
      .map((f) => {
        const fullPath = path.join(versionDir, f);
        const stats = fs.statSync(fullPath);
        return {
          id: f,
          timestamp: stats.mtime.getTime(),
          size: stats.size,
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp);
    return versions;
  } catch (error) {
    console.error('Failed to list versions:', error);
    return [];
  }
}

export async function handleVersionRestore(filePath: string, versionId: string): Promise<string> {
  const versionDir = getVersionDir(filePath);
  const versionPath = path.join(versionDir, versionId);
  try {
    const content = fs.readFileSync(versionPath, 'utf-8');
    return content;
  } catch (error) {
    console.error('Failed to restore version:', error);
    throw error;
  }
}
