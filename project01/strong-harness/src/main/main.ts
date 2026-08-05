import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { PersistenceService } from '../services/PersistenceService';
import { DocumentService } from '../services/DocumentService';
import { IndexingService } from '../services/IndexingService';
import { QaService } from '../services/QaService';
import { registerIpcHandlers } from './ipc-handlers';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Knowledge Base',
    backgroundColor: '#121417',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function initializeServices(): Promise<void> {
  const dataDir = path.join(app.getPath('userData'), 'knowledge-base-data');
  const persistence = new PersistenceService(dataDir);
  await persistence.init();

  const documents = new DocumentService(persistence);
  const indexing = new IndexingService(persistence, documents);
  const qa = new QaService(persistence, documents, indexing);

  registerIpcHandlers({ documents, indexing, qa });
}

app.whenReady().then(async () => {
  await initializeServices();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
