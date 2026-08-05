import { PersistenceService } from './PersistenceService';
import { DocumentService } from './DocumentService';
import { IndexingService } from './IndexingService';
import type { Chunk, Citation, DocumentMeta, QaHistoryEntry, QaResult } from '../shared/types';

const MAX_HISTORY = 50;
const EXCERPT_LENGTH = 200;

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'if', 'then', 'else', 'for', 'of', 'to', 'in', 'on',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'it', 'its', 'this', 'that', 'these',
  'those', 'what', 'which', 'who', 'whom', 'with', 'from', 'by', 'at', 'as', 'do', 'does',
  'did', 'can', 'could', 'would', 'should', 'will', 'shall', 'may', 'might', 'how', 'when',
  'where', 'why', 'not', 'no', 'yes', 'so', 'up', 'down', 'about', 'into', 'over', 'under',
  'again', 'after', 'before', 'between', 'you', 'your', 'we', 'our', 'me', 'my', 'i',
]);

function extractKeywords(question: string): string[] {
  return question
    .toLowerCase()
    .split(/[^a-z0-9']+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

function scoreChunk(chunk: Chunk, keywords: string[]): number {
  const text = chunk.text.toLowerCase();
  return keywords.reduce((sum, kw) => sum + text.split(kw).length - 1, 0);
}

export class QaService {
  constructor(
    private readonly persistence: PersistenceService,
    private readonly documents: DocumentService,
    private readonly indexing: IndexingService,
  ) {}

  async ask(question: string): Promise<QaResult> {
    const chunks = await this.indexing.getAllChunks();
    const keywords = extractKeywords(question);

    let answer: string;
    let citations: Citation[] = [];
    let confidence: number;

    if (keywords.length === 0 || chunks.length === 0) {
      answer = 'No relevant content found in the document library.';
      confidence = 0.3;
    } else {
      const scored = chunks
        .map((chunk) => ({ chunk, score: scoreChunk(chunk, keywords) }))
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      if (scored.length > 0) {
        const docById = new Map((await this.documents.list()).map((d) => [d.id, d]));
        citations = scored.map(({ chunk }) => ({
          docId: chunk.docId,
          docTitle: (docById.get(chunk.docId) as DocumentMeta | undefined)?.title ?? chunk.docId,
          chunkId: chunk.id,
          excerpt: chunk.text.slice(0, EXCERPT_LENGTH),
        }));
        const best = scored[0].chunk;
        answer = best.text.length > 500 ? `${best.text.slice(0, 500)}...` : best.text;
        confidence = 0.85;
      } else {
        answer = 'No relevant content found in the document library.';
        confidence = 0.3;
      }
    }

    await this.appendHistory(question, answer);
    return { answer, citations, confidence };
  }

  async getHistory(): Promise<QaHistoryEntry[]> {
    return this.persistence.readJson<QaHistoryEntry[]>('qa-history.json', []);
  }

  private async appendHistory(question: string, answer: string): Promise<void> {
    const history = await this.getHistory();
    history.push({ question, answer, timestamp: new Date().toISOString() });
    await this.persistence.writeJson('qa-history.json', history.slice(-MAX_HISTORY));
  }
}
