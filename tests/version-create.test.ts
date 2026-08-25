import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

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
let targetFile: string;

beforeEach(() => {
  workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'json-editor-version-'));
  targetFile = path.join(workDir, 'config.json5');
  fs.writeFileSync(targetFile, '{ "name": "v1" }', 'utf-8');
});

afterEach(() => {
  try {
    fs.rmSync(workDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
});

describe('handleVersionCreate', () => {
  it('should create a version file under <file>.versions/', async () => {
    const { handleVersionCreate } = await import('../electron/ipc/fileHandlers');
    const result = await handleVersionCreate(targetFile, '{ "name": "v1" }');

    expect(result).not.toBeNull();
    expect(result!.id).toMatch(/^\d{8}-\d{6}-\d{3}\.json5$/);
    expect(result!.size).toBeGreaterThan(0);
    expect(result!.timestamp).toBeGreaterThan(0);

    const versionDir = targetFile + '.versions';
    expect(fs.existsSync(versionDir)).toBe(true);
    expect(fs.readdirSync(versionDir)).toHaveLength(1);
  });

  it('should respect original .json extension in version filename', async () => {
    const jsonFile = path.join(workDir, 'config.json');
    fs.writeFileSync(jsonFile, '{}', 'utf-8');
    const { handleVersionCreate } = await import('../electron/ipc/fileHandlers');
    const result = await handleVersionCreate(jsonFile, '{}');
    expect(result!.id).toMatch(/\.json$/);
  });

  it('should return null when target file does not exist', async () => {
    const { handleVersionCreate } = await import('../electron/ipc/fileHandlers');
    const result = await handleVersionCreate(path.join(workDir, 'missing.json5'), '{}');
    expect(result).toBeNull();
  });

  it('should prune versions beyond MAX_VERSIONS (20), keeping the most recent', async () => {
    const { handleVersionCreate } = await import('../electron/ipc/fileHandlers');

    for (let i = 0; i < 25; i++) {
      if (i > 0) {
        await new Promise((r) => setTimeout(r, 5));
      }
      await handleVersionCreate(targetFile, JSON.stringify({ i }));
    }

    const versionDir = targetFile + '.versions';
    const remaining = fs.readdirSync(versionDir).filter(
      (f) => f.endsWith('.json5') || f.endsWith('.json'),
    );
    expect(remaining.length).toBe(20);

    let minI = Number.POSITIVE_INFINITY;
    for (const f of remaining) {
      const data = JSON.parse(fs.readFileSync(path.join(versionDir, f), 'utf-8'));
      if (typeof data.i === 'number' && data.i < minI) {
        minI = data.i;
      }
    }
    expect(minI).toBeGreaterThanOrEqual(5);
  });

  it('handleVersionCreate returns VersionInfo with required fields', async () => {
    const { handleVersionCreate } = await import('../electron/ipc/fileHandlers');
    const result = await handleVersionCreate(targetFile, 'test');
    expect(result).not.toBeNull();
    expect(typeof result!.id).toBe('string');
    expect(typeof result!.size).toBe('number');
    expect(typeof result!.timestamp).toBe('number');
  });

  it('multiple versions all land in the same versions directory', async () => {
    const { handleVersionCreate } = await import('../electron/ipc/fileHandlers');
    await handleVersionCreate(targetFile, 'a');
    await new Promise((r) => setTimeout(r, 5));
    await handleVersionCreate(targetFile, 'b');

    const versionDir = targetFile + '.versions';
    const files = fs.readdirSync(versionDir).filter(
      (f) => f.endsWith('.json5') || f.endsWith('.json'),
    );
    expect(files.length).toBeGreaterThanOrEqual(1);
  });

  it('created version file content matches input', async () => {
    const { handleVersionCreate } = await import('../electron/ipc/fileHandlers');
    const payload = '{ "snapshot": "data", "value": 42 }';
    await handleVersionCreate(targetFile, payload);

    const versionDir = targetFile + '.versions';
    const files = fs.readdirSync(versionDir);
    expect(files.length).toBe(1);
    const stored = fs.readFileSync(path.join(versionDir, files[0]), 'utf-8');
    expect(stored).toBe(payload);
  });
});
