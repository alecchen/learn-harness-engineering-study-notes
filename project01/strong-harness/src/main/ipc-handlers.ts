import { ipcMain, BrowserWindow, dialog } from 'electron';
import { IPC_CHANNELS } from '../shared/types';
import type { DocumentService } from '../services/DocumentService';
import type { IndexingService } from '../services/IndexingService';
import type { QaService } from '../services/QaService';

export interface ServiceContainer {
  documents: DocumentService;
  indexing: IndexingService;
  qa: QaService;
}

export function registerIpcHandlers({ documents, indexing, qa }: ServiceContainer): void {
  ipcMain.handle(IPC_CHANNELS.documentsList, () => documents.list());

  ipcMain.handle(IPC_CHANNELS.documentsImport, async () => {
    const options: Electron.OpenDialogOptions = {
      title: 'Import a document',
      properties: ['openFile'],
      filters: [{ name: 'Documents', extensions: ['txt', 'md'] }],
    };
    const owner = BrowserWindow.getFocusedWindow();
    const result = owner
      ? await dialog.showOpenDialog(owner, options)
      : await dialog.showOpenDialog(options);
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return documents.importDocument(result.filePaths[0]);
  });

  ipcMain.handle(IPC_CHANNELS.documentsGet, (_event, id: string) => documents.get(id));
  ipcMain.handle(IPC_CHANNELS.documentsDelete, (_event, id: string) => documents.delete(id));

  ipcMain.handle(IPC_CHANNELS.indexingStart, (_event, docId?: string) =>
    docId ? indexing.indexDocument(docId) : indexing.indexAll(),
  );
  ipcMain.handle(IPC_CHANNELS.indexingStatus, () => indexing.getStatus());
  ipcMain.handle(IPC_CHANNELS.indexingChunks, (_event, docId: string) => indexing.getChunks(docId));

  ipcMain.handle(IPC_CHANNELS.qaAsk, (_event, question: string) => qa.ask(question));
  ipcMain.handle(IPC_CHANNELS.qaHistory, () => qa.getHistory());
}
