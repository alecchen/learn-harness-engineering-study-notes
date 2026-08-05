export interface DocumentMeta {
  id: string;
  title: string;
  filename: string;
  size: number;
  importDate: string;
  indexed: boolean;
  chunkCount: number;
}

export interface DocumentDetail {
  meta: DocumentMeta;
  content: string;
}

export interface ImportResult {
  document: DocumentMeta;
}

export interface Chunk {
  id: string;
  docId: string;
  index: number;
  text: string;
  charCount: number;
  wordCount: number;
}

export interface Citation {
  docId: string;
  docTitle: string;
  chunkId: string;
  excerpt: string;
}

export interface QaResult {
  answer: string;
  citations: Citation[];
  confidence: number;
}

export interface QaHistoryEntry {
  question: string;
  answer: string;
  timestamp: string;
}

export type IndexStatusValue = 'idle' | 'indexing' | 'ready' | 'error';

export interface IndexStatus {
  status: IndexStatusValue;
  documentsIndexed: number;
  totalDocuments: number;
  lastActivity: string | null;
}

export type IndexStartResult =
  | { kind: 'document'; docId: string; chunkCount: number }
  | { kind: 'all'; indexed: number; total: number };

export interface IndexAllResult {
  indexed: number;
  total: number;
}

export const IPC_CHANNELS = {
  documentsList: 'documents:list',
  documentsImport: 'documents:import',
  documentsGet: 'documents:get',
  documentsDelete: 'documents:delete',
  indexingStart: 'indexing:start',
  indexingStatus: 'indexing:status',
  indexingChunks: 'indexing:chunks',
  qaAsk: 'qa:ask',
  qaHistory: 'qa:history',
} as const;
