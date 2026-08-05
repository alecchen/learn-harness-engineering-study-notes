import { afterEach, describe, it, expect } from 'vitest';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { PersistenceService } from './PersistenceService';
import { DocumentService } from './DocumentService';
import { IndexingService } from './IndexingService';
import { QaService } from './QaService';

let tempDir: string | null = null;

async function createServices() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'knowledge-base-test-'));
  tempDir = dir;
  const persistence = new PersistenceService(dir);
  const documents = new DocumentService(persistence);
  const indexing = new IndexingService(persistence, documents);
  const qa = new QaService(persistence, documents, indexing);
  return { persistence, documents, indexing, qa };
}

afterEach(async () => {
  if (tempDir) {
    await fs.rm(tempDir, { recursive: true, force: true });
    tempDir = null;
  }
});

async function importSampleDoc(
  documents: DocumentService,
  filename: string,
  content: string,
): Promise<string> {
  const dir = tempDir;
  if (!dir) {
    throw new Error('tempDir not initialized');
  }
  const filePath = path.join(dir, filename);
  await fs.writeFile(filePath, content, 'utf-8');
  const result = await documents.importDocument(filePath);
  return result.document.id;
}

describe('document import', () => {
  it('imports a document and lists it with metadata', async () => {
    const { persistence, documents } = await createServices();
    await persistence.init();
    const id = await importSampleDoc(documents, 'notes.md', '# Notes\n\nHello world.');
    const list = await documents.list();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id, title: 'notes', filename: 'notes.md', indexed: false });
    expect(list[0].size).toBeGreaterThan(0);
    expect(list[0].importDate).toBeTruthy();
  });

  it('rejects files larger than the 10 MB limit', async () => {
    const { persistence, documents } = await createServices();
    await persistence.init();
    const filePath = path.join(tempDir as string, 'big.txt');
    await fs.writeFile(filePath, 'a'.repeat(10 * 1024 * 1024 + 1), 'utf-8');
    await expect(documents.importDocument(filePath)).rejects.toThrow('10 MB');
  });

  it('rejects unsupported file extensions', async () => {
    const { persistence, documents } = await createServices();
    await persistence.init();
    const filePath = path.join(tempDir as string, 'photo.png');
    await fs.writeFile(filePath, 'not an image', 'utf-8');
    await expect(documents.importDocument(filePath)).rejects.toThrow('Unsupported file type');
  });
});

describe('indexing', () => {
  it('indexes a document into chunks and updates metadata', async () => {
    const { persistence, documents, indexing } = await createServices();
    await persistence.init();
    const id = await importSampleDoc(
      documents,
      'science.md',
      'Photosynthesis is the process plants use.'.repeat(20),
    );

    const chunkCount = await indexing.indexDocument(id);
    const meta = (await documents.list())[0];
    expect(chunkCount).toBeGreaterThan(0);
    expect(meta.indexed).toBe(true);
    expect(meta.chunkCount).toBe(chunkCount);

    const chunks = await indexing.getChunks(id);
    expect(chunks).toHaveLength(chunkCount);
    expect(chunks[0]).toMatchObject({ docId: id, index: 0 });
  });

  it('reports idle status with no documents and ready when all indexed', async () => {
    const { persistence, documents, indexing } = await createServices();
    await persistence.init();
    expect((await indexing.getStatus()).status).toBe('idle');

    const id = await importSampleDoc(documents, 'a.txt', 'Content for indexing.');
    expect((await indexing.getStatus()).status).toBe('indexing');
    await indexing.indexDocument(id);
    expect((await indexing.getStatus()).status).toBe('ready');
  });
});

describe('question answering', () => {
  it('returns a grounded answer with citations when keywords match', async () => {
    const { persistence, documents, indexing, qa } = await createServices();
    await persistence.init();
    const id = await importSampleDoc(
      documents,
      'planets.md',
      'Jupiter is the largest planet in the solar system and has many moons.\n\nMars is known as the red planet.',
    );
    await indexing.indexDocument(id);

    const result = await qa.ask('What is the largest planet?');
    expect(result.confidence).toBe(0.85);
    expect(result.citations.length).toBeGreaterThan(0);
    expect(result.citations[0].docTitle).toBe('planets');
    expect(result.answer.toLowerCase()).toContain('jupiter');
  });

  it('returns low confidence when no chunk matches', async () => {
    const { persistence, documents, indexing, qa } = await createServices();
    await persistence.init();
    const id = await importSampleDoc(documents, 'b.txt', 'Unrelated content about cooking.');
    await indexing.indexDocument(id);

    const result = await qa.ask('quantum computing');
    expect(result.confidence).toBe(0.3);
    expect(result.citations).toHaveLength(0);
  });

  it('persists question history', async () => {
    const { persistence, documents, indexing, qa } = await createServices();
    await persistence.init();
    const id = await importSampleDoc(documents, 'c.txt', 'Mountains are tall landforms.');
    await indexing.indexDocument(id);

    await qa.ask('what are mountains');
    const history = await qa.getHistory();
    expect(history).toHaveLength(1);
    expect(history[0].question).toBe('what are mountains');
    expect(history[0].timestamp).toBeTruthy();
  });
});
