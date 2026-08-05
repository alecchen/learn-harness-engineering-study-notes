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

declare global {
  interface Window {
    knowledgeBase: {
      documents: {
        list(): Promise<DocumentMeta[]>;
        import(): Promise<ImportResult | null>;
        get(id: string): Promise<DocumentDetail | null>;
        delete(id: string): Promise<void>;
      };
      indexing: {
        start(docId?: string): Promise<IndexStartResult>;
        status(): Promise<IndexStatus>;
        chunks(docId: string): Promise<Chunk[]>;
      };
      qa: {
        ask(question: string): Promise<QaResult>;
        history(): Promise<QaHistoryEntry[]>;
      };
    };
  }
}

export {};
