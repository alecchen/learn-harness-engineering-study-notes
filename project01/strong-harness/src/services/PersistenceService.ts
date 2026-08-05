import * as fs from 'fs/promises';
import * as path from 'path';

export class PersistenceService {
  private readonly dataDir: string;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
  }

  get dir(): string {
    return this.dataDir;
  }

  async init(): Promise<void> {
    await fs.mkdir(this.dataDir, { recursive: true });
  }

  private resolve(relPath: string): string {
    return path.join(this.dataDir, relPath);
  }

  async readJson<T>(relPath: string, fallback: T): Promise<T> {
    try {
      const raw = await fs.readFile(this.resolve(relPath), 'utf-8');
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  async writeJson(relPath: string, data: unknown): Promise<void> {
    const full = this.resolve(relPath);
    await fs.mkdir(path.dirname(full), { recursive: true });
    const tmp = `${full}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf-8');
    await fs.rename(tmp, full);
  }

  async readText(relPath: string): Promise<string | null> {
    try {
      return await fs.readFile(this.resolve(relPath), 'utf-8');
    } catch {
      return null;
    }
  }

  async writeText(relPath: string, content: string): Promise<void> {
    const full = this.resolve(relPath);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, content, 'utf-8');
  }

  async delete(relPath: string): Promise<void> {
    try {
      await fs.unlink(this.resolve(relPath));
    } catch {
      // Missing file is fine on delete.
    }
  }
}
