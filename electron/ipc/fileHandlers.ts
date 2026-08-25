import { dialog, app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

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
  try {
    const storePath = path.join(app.getPath('userData'), 'recent-files.json');
    const storeDir = path.dirname(storePath);
    if (!fs.existsSync(storeDir)) {
      fs.mkdirSync(storeDir, { recursive: true });
    }
    fs.writeFileSync(storePath, JSON.stringify(files, null, 2));
  } catch (error) {
    console.error('Failed to save recent files store:', error);
  }
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

/**
 * Open a file by absolute path (used by Recent Files). Does NOT show a dialog.
 * Validates the path exists and looks like a JSON file (by extension).
 */
export async function handleFileOpenByPath(filePath: string): Promise<FileOpenResult | null> {
  // Reject obviously bad inputs (null bytes) before they reach the FS layer
  if (!filePath || filePath.includes('\0')) {
    return null;
  }

  try {
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    addToRecentFiles(filePath);
    return {
      filePath,
      content,
      encoding: 'UTF-8',
    };
  } catch (error) {
    console.error('Failed to read file by path:', error);
    return null;
  }
}

interface SaveResult {
  success: boolean;
  error?: string;
}

function getErrorMessage(code: string | undefined): string {
  const errorMessages: Record<string, string> = {
    EPERM: '权限不足：请检查杀毒软件设置或以管理员身份运行应用',
    EACCES: '访问被拒绝：请检查文件权限设置',
    EBUSY: '文件被占用：请关闭其他正在使用此文件的程序',
    ENOENT: '文件不存在',
    ENOSPC: '磁盘空间不足',
    EROFS: '文件系统为只读',
  };
  return errorMessages[code || ''] || '保存失败，请稍后重试';
}

export async function handleFileSave(filePath: string, content: string): Promise<SaveResult> {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: '文件不存在' };
    }

    try {
      fs.accessSync(filePath, fs.constants.W_OK);
    } catch {
      return { success: false, error: '文件不可写，请检查文件权限或是否被其他程序占用' };
    }

    const stats = fs.statSync(filePath);
    if ((stats.mode & 0o200) === 0) {
      return { success: false, error: '文件为只读属性，请取消只读后重试' };
    }

    const tmpPath = `${filePath}.${Date.now()}.tmp`;

    try {
      fs.writeFileSync(tmpPath, content, 'utf-8');

      try {
        fs.renameSync(tmpPath, filePath);
        return { success: true };
      } catch {
        fs.copyFileSync(tmpPath, filePath);
        fs.unlinkSync(tmpPath);
        return { success: true };
      }
    } catch (writeError) {
      try {
        if (fs.existsSync(tmpPath)) {
          fs.unlinkSync(tmpPath);
        }
      } catch {}

      throw writeError;
    }
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    console.error('Failed to save file:', error);
    return { success: false, error: getErrorMessage(err.code) };
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

function getVersionExtension(filePath: string): string {
  return filePath.toLowerCase().endsWith('.json') ? '.json' : '.json5';
}

/**
 * Format a timestamp for use as a version filename (filesystem-safe).
 * Format: YYYYMMDD-HHmmss-mmm (local time, millisecond precision to avoid collisions).
 */
function formatVersionTimestamp(date: Date): string {
  const pad = (n: number, width = 2): string => String(n).padStart(width, '0');
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}` +
    `-${pad(date.getMilliseconds(), 3)}`
  );
}

/**
 * Keep only the most recent MAX_VERSIONS entries in the version directory.
 * Older entries are deleted (oldest first by mtime).
 */
const MAX_VERSIONS = 20;

function pruneOldVersions(versionDir: string): void {
  try {
    const files = fs.readdirSync(versionDir);
    const stats = files
      .filter((f) => f.endsWith('.json5') || f.endsWith('.json'))
      .map((f) => {
        const fullPath = path.join(versionDir, f);
        const stat = fs.statSync(fullPath);
        return { fullPath, mtime: stat.mtime.getTime() };
      })
      .sort((a, b) => b.mtime - a.mtime);

    if (stats.length <= MAX_VERSIONS) return;

    const toDelete = stats.slice(MAX_VERSIONS);
    for (const entry of toDelete) {
      try {
        fs.unlinkSync(entry.fullPath);
      } catch (error) {
        console.error(`Failed to delete old version ${entry.fullPath}:`, error);
      }
    }
  } catch (error) {
    console.error('Failed to prune old versions:', error);
  }
}

export async function handleVersionCreate(filePath: string, content: string): Promise<VersionInfo | null> {
  const versionDir = getVersionDir(filePath);

  // Validate filePath points to an existing regular file (versions only make sense for real files)
  try {
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    if (!fs.existsSync(versionDir)) {
      fs.mkdirSync(versionDir, { recursive: true });
    }

    const ext = getVersionExtension(filePath);
    const now = new Date();
    const id = `${formatVersionTimestamp(now)}${ext}`;
    const fullPath = path.join(versionDir, id);

    // Atomic write: write to .tmp then rename, so a crash mid-write doesn't corrupt the version history.
    const tmpPath = `${fullPath}.tmp`;
    fs.writeFileSync(tmpPath, content, 'utf-8');
    fs.renameSync(tmpPath, fullPath);

    pruneOldVersions(versionDir);

    const finalStats = fs.statSync(fullPath);
    return {
      id,
      timestamp: finalStats.mtime.getTime(),
      size: finalStats.size,
    };
  } catch (error) {
    console.error('Failed to create version:', error);
    return null;
  }
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

  // Prevent path traversal attacks
  if (versionId.includes('..') || versionId.includes('/') || versionId.includes('\\') || versionId.includes('\0')) {
    throw new Error('Invalid version ID');
  }

  const versionPath = path.join(versionDir, versionId);

  // Verify the resolved path is within the version directory
  const resolvedPath = path.resolve(versionPath);
  const resolvedDir = path.resolve(versionDir);
  if (!resolvedPath.startsWith(resolvedDir + path.sep) && resolvedPath !== resolvedDir) {
    throw new Error('Invalid version path');
  }

  try {
    const content = fs.readFileSync(versionPath, 'utf-8');
    return content;
  } catch (error) {
    console.error('Failed to restore version:', error);
    throw error;
  }
}
