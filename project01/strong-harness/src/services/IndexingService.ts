import { PersistenceService } from './PersistenceService';
import { DocumentService } from './DocumentService';
import { chunkText, countWords } from './chunking';
import type { Chunk, DocumentMeta, IndexAllResult, IndexStatus } from '../shared/types';

function toChunks(meta: DocumentMeta, content: string): Chunk[] {
  const parts = chunkText(content);
  return parts.map((text, index) => ({
    id: `${meta.id}-${index}`,
    docId: meta.id,
    index,
    text,
    charCount: text.length,
    wordCount: countWords(text),
  }));
}

export class IndexingService {
  private lastActivity: string | null = null;

  constructor(
    private readonly persistence: PersistenceService,
    private readonly documents: DocumentService,
  ) {}

  async indexDocument(docId: string): Promise<number> {
    const detail = await this.documents.get(docId);
    if (!detail) {
      throw new Error(`Document not found: ${docId}`);
    }

    const chunks = toChunks(detail.meta, detail.content);
    await this.persistence.writeJson(`chunks/${docId}.json`, chunks);
    await this.documents.setIndexed(docId, chunks.length);
    this.lastActivity = new Date().toISOString();
    return chunks.length;
  }

  async indexAll(): Promise<IndexAllResult> {
    const docs = await this.documents.list();
    let indexed = 0;
    for (const doc of docs) {
      if (!doc.indexed) {
        await this.indexDocument(doc.id);
        indexed += 1;
      }
    }
    return { indexed, total: docs.length };
  }

  async getChunks(docId: string): Promise<Chunk[]> {
    return this.persistence.readJson<Chunk[]>(`chunks/${docId}.json`, []);
  }

  async getAllChunks(): Promise<Chunk[]> {
    const docs = await this.documents.list();
    const all: Chunk[] = [];
    for (const doc of docs) {
      all.push(...(await this.getChunks(doc.id)));
    }
    return all;
  }

  async getStatus(): Promise<IndexStatus> {
    const docs = await this.documents.list();
    const indexedCount = docs.filter((d) => d.indexed).length;
    let status: IndexStatus['status'];
    if (docs.length === 0) {
      status = 'idle';
    } else if (indexedCount === docs.length) {
      status = 'ready';
    } else {
      status = 'indexing';
    }
    return {
      status,
      documentsIndexed: indexedCount,
      totalDocuments: docs.length,
      lastActivity: this.lastActivity,
    };
  }
}
