const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PDFParse } = require('pdf-parse');

const MAX_BYTES = 10 * 1024 * 1024;
const TEXT_EXTS = new Set(['.txt', '.md', '.markdown', '.json', '.csv', '.tsv', '.log', '.html', '.htm']);

function genId() {
  return crypto.randomBytes(8).toString('hex');
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function extractPdf(filePath) {
  const data = await fs.promises.readFile(filePath);
  const parse = new PDFParse({ data });
  try {
    const result = await parse.getText();
    return (result.text || '')
      .replace(/^-- \d+ of \d+ --\s*$/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  } finally {
    await parse.destroy().catch(() => {});
  }
}

async function extractText(filePath, ext) {
  if (ext === '.pdf') return extractPdf(filePath);
  const raw = await fs.promises.readFile(filePath, 'utf8');
  if (ext === '.html' || ext === '.htm') return stripHtml(raw);
  if (ext === '.json') {
    try {
      return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      return raw;
    }
  }
  return raw;
}

async function parseFile(filePath) {
  const name = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const stat = await fs.promises.stat(filePath);
  if (!stat.isFile()) throw new Error('Not a file');
  if (stat.size > MAX_BYTES) throw new Error(`File too large (${(stat.size / 1024 / 1024).toFixed(1)} MB, limit 10 MB)`);
  if (!TEXT_EXTS.has(ext) && ext !== '.pdf') throw new Error(`Unsupported type .${ext || '?'}`);
  const text = await extractText(filePath, ext);
  if (!text || !text.trim()) throw new Error('No extractable text found');
  return { id: genId(), name, path: filePath, ext, size: stat.size, chars: text.length, text };
}

class DocStore {
  constructor() {
    this.docs = new Map();
  }

  add(doc) {
    this.docs.set(doc.id, doc);
    return doc;
  }

  get(id) {
    return this.docs.get(id);
  }

  remove(id) {
    return this.docs.delete(id);
  }

  list() {
    return [...this.docs.values()];
  }

  summaries() {
    return this.list().map((d) => ({ id: d.id, name: d.name, ext: d.ext, size: d.size, chars: d.chars }));
  }
}

module.exports = { parseFile, extractText, DocStore, genId, stripHtml };
