import { ipcMain, dialog, app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import {
  handleFileOpen,
  handleFileSave,
  handleFileSaveAs,
  handleGetRecent,
  handleAutosaveWrite,
  handleAutosaveLoad,
  handleVersionList,
  handleVersionRestore,
} from './fileHandlers';

export function registerIpcHandlers(): void {
  ipcMain.handle('file:open', handleFileOpen);
  ipcMain.handle('file:save', async (_event, args) => {
    const { filePath, content } = args as { filePath: string; content: string };
    return handleFileSave(filePath, content);
  });
  ipcMain.handle('file:saveAs', async (_event, args) => {
    const { content, defaultPath } = args as { content: string; defaultPath?: string };
    return handleFileSaveAs(content, defaultPath);
  });
  ipcMain.handle('file:getRecent', handleGetRecent);
  ipcMain.handle('autosave:write', async (_event, args) => {
    const { filePath, content } = args as { filePath: string; content: string };
    return handleAutosaveWrite(filePath, content);
  });
  ipcMain.handle('autosave:load', async (_event, args) => {
    const { filePath } = args as { filePath: string };
    return handleAutosaveLoad(filePath);
  });
  ipcMain.handle('version:list', async (_event, args) => {
    const { filePath } = args as { filePath: string };
    return handleVersionList(filePath);
  });
  ipcMain.handle('version:restore', async (_event, args) => {
    const { filePath, versionId } = args as { filePath: string; versionId: string };
    return handleVersionRestore(filePath, versionId);
  });

  console.log('IPC handlers registered');
}
