import * as fs from 'fs/promises';
import * as path from 'path';
import { PersistenceService } from './PersistenceService';
import type { DocumentDetail, DocumentMeta, ImportResult } from '../shared/types';

export const MAX_FILE_SIZE = 10 * 1024 * 1024;

const SUPPORTED_EXTENSIONS = new Set(['.txt', '.md']);

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export class DocumentService {
  constructor(private readonly persistence: PersistenceService) {}

  private get metaPath(): string {
    return 'documents-meta.json';
  }

  async list(): Promise<DocumentMeta[]> {
    return this.persistence.readJson<DocumentMeta[]>(this.metaPath, []);
  }

  async importDocument(filePath: string): Promise<ImportResult> {
    const ext = path.extname(filePath).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.has(ext)) {
      throw new Error(`Unsupported file type "${ext}". Only .txt and .md are supported.`);
    }

    const stat = await fs.stat(filePath);
    if (stat.size > MAX_FILE_SIZE) {
      throw new Error('File exceeds the 10 MB size limit.');
    }

    const content = await fs.readFile(filePath, 'utf-8');
    const filename = path.basename(filePath);
    const meta: DocumentMeta = {
      id: generateId(),
      title: path.basename(filePath, ext),
      filename,
      size: stat.size,
      importDate: new Date().toISOString(),
      indexed: false,
      chunkCount: 0,
    };

    const list = await this.list();
    list.push(meta);
    await this.persistence.writeJson(this.metaPath, list);
    await this.persistence.writeText(`content/${meta.id}.txt`, content);

    return { document: meta };
  }

  async get(id: string): Promise<DocumentDetail | null> {
    const meta = (await this.list()).find((d) => d.id === id);
    if (!meta) {
      return null;
    }
    const content = (await this.persistence.readText(`content/${id}.txt`)) ?? '';
    return { meta, content };
  }

  async delete(id: string): Promise<void> {
    const list = (await this.list()).filter((d) => d.id !== id);
    await this.persistence.writeJson(this.metaPath, list);
    await this.persistence.delete(`content/${id}.txt`);
    await this.persistence.delete(`chunks/${id}.json`);
  }

  async setIndexed(id: string, chunkCount: number): Promise<void> {
    const list = await this.list();
    const doc = list.find((d) => d.id === id);
    if (doc) {
      doc.indexed = true;
      doc.chunkCount = chunkCount;
      await this.persistence.writeJson(this.metaPath, list);
    }
  }
}
