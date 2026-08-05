import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/types';
import type {
  Chunk,
  DocumentDetail,
  DocumentMeta,
  ImportResult,
  IndexStartResult,
  IndexStatus,
  QaHistoryEntry,
  QaResult,
} from '../shared/types';

const api = {
  documents: {
    list: (): Promise<DocumentMeta[]> => ipcRenderer.invoke(IPC_CHANNELS.documentsList),
    import: (): Promise<ImportResult | null> => ipcRenderer.invoke(IPC_CHANNELS.documentsImport),
    get: (id: string): Promise<DocumentDetail | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.documentsGet, id),
    delete: (id: string): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.documentsDelete, id),
  },
  indexing: {
    start: (docId?: string): Promise<IndexStartResult> =>
      ipcRenderer.invoke(IPC_CHANNELS.indexingStart, docId),
    status: (): Promise<IndexStatus> => ipcRenderer.invoke(IPC_CHANNELS.indexingStatus),
    chunks: (docId: string): Promise<Chunk[]> => ipcRenderer.invoke(IPC_CHANNELS.indexingChunks, docId),
  },
  qa: {
    ask: (question: string): Promise<QaResult> => ipcRenderer.invoke(IPC_CHANNELS.qaAsk, question),
    history: (): Promise<QaHistoryEntry[]> => ipcRenderer.invoke(IPC_CHANNELS.qaHistory),
  },
};

contextBridge.exposeInMainWorld('knowledgeBase', api);

export type KnowledgeBaseApi = typeof api;
