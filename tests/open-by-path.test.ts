import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Stub the 'electron' module so fileHandlers can call app.getPath() without an Electron runtime.
vi.mock('electron', () => ({
  app: {
    getPath: (_name: string) => os.tmpdir(),
  },
  dialog: {
    showOpenDialog: vi.fn(),
    showSaveDialog: vi.fn(),
    showMessageBox: vi.fn(),
  },
}));

let workDir: string;

beforeEach(() => {
  workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'json-editor-openbypath-'));
  // Pre-clear the recent-files store so each test starts fresh.
  try {
    const recentPath = path.join(os.tmpdir(), 'recent-files.json');
    if (fs.existsSync(recentPath)) fs.unlinkSync(recentPath);
  } catch { /* ignore */ }
});

afterEach(() => {
  try {
    fs.rmSync(workDir, { recursive: true, force: true });
  } catch { /* ignore */ }
});

describe('handleFileOpenByPath', () => {
  it('reads content and returns file info for an existing JSON file', async () => {
    const target = path.join(workDir, 'data.json');
    fs.writeFileSync(target, '{"k":1}', 'utf-8');
    const { handleFileOpenByPath } = await import('../electron/ipc/fileHandlers');
    const result = await handleFileOpenByPath(target);
    expect(result).not.toBeNull();
    expect(result!.filePath).toBe(target);
    expect(result!.content).toBe('{"k":1}');
    expect(result!.encoding).toBe('UTF-8');
  });

  it('returns null when the file does not exist', async () => {
    const { handleFileOpenByPath } = await import('../electron/ipc/fileHandlers');
    const result = await handleFileOpenByPath(path.join(workDir, 'missing.json'));
    expect(result).toBeNull();
  });

  it('returns null for a directory path', async () => {
    const { handleFileOpenByPath } = await import('../electron/ipc/fileHandlers');
    const result = await handleFileOpenByPath(workDir);
    expect(result).toBeNull();
  });

  it('returns null for empty path', async () => {
    const { handleFileOpenByPath } = await import('../electron/ipc/fileHandlers');
    expect(await handleFileOpenByPath('')).toBeNull();
  });

  it('rejects null-byte injection', async () => {
    const { handleFileOpenByPath } = await import('../electron/ipc/fileHandlers');
    const result = await handleFileOpenByPath('ok\u0000.json');
    expect(result).toBeNull();
  });

  it('marks file as recent after successful open', async () => {
    const target = path.join(workDir, 'data.json5');
    fs.writeFileSync(target, '{"k":1}', 'utf-8');
    const { handleFileOpenByPath, handleGetRecent } = await import('../electron/ipc/fileHandlers');
    await handleFileOpenByPath(target);
    const recent = await handleGetRecent();
    expect(recent).toContain(target);
  });
});
