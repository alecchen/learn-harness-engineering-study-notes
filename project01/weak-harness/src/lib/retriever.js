const CHUNK_SIZE = 600;
const STOP = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'for', 'with', 'is', 'are', 'was', 'were',
  'be', 'been', 'being', 'at', 'by', 'from', 'as', 'it', 'its', 'this', 'that', 'these', 'those', 'i',
  'you', 'he', 'she', 'we', 'they', 'my', 'your', 'our', 'their', 'what', 'which', 'who', 'whom',
  'whose', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other',
  'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'can', 'will',
  'just', 'should', 'now', 'about', 'into', 'over', 'then', 'there', 'them', 'out', 'up', 'down', 'if',
  'has', 'have', 'had', 'do', 'does', 'did', 'would', 'could', 'may', 'might', 'must', 'us', 'me', 'him',
  'her', 'them', 'which', 'also', 'etc', 'via',
]);

function tokenize(text) {
  return text.toLowerCase().match(/[a-z0-9]+/g) || [];
}

function chunkParagraph(para) {
  const sentences = para.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [para];
  const out = [];
  let buf = '';
  for (const raw of sentences) {
    const s = raw.trim();
    if (!s) continue;
    if (buf && (buf + ' ' + s).length > CHUNK_SIZE) {
      out.push(buf.trim());
      buf = s;
    } else {
      buf = buf ? buf + ' ' + s : s;
    }
  }
  if (buf) out.push(buf.trim());
  return out;
}

function chunkText(text) {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter((p) => p.length > 0);
  const chunks = [];
  let buf = '';
  for (const para of paragraphs) {
    const parts = para.length > CHUNK_SIZE * 1.5 ? chunkParagraph(para) : [para];
    for (const part of parts) {
      if (buf && (buf + ' ' + part).length > CHUNK_SIZE) {
        chunks.push(buf.trim());
        buf = part;
      } else {
        buf = buf ? buf + ' ' + part : part;
      }
    }
  }
  if (buf) chunks.push(buf.trim());
  return chunks;
}

function buildIndex(docs) {
  const entries = [];
  for (const doc of docs) {
    for (const text of chunkText(doc.text)) {
      const tf = new Map();
      for (const t of tokenize(text)) tf.set(t, (tf.get(t) || 0) + 1);
      entries.push({ docId: doc.id, docName: doc.name, text, tf });
    }
  }
  return entries;
}

function retrieve(question, entries, docIds, topK = 6) {
  const qTokens = [...new Set(tokenize(question).filter((t) => t.length > 1 && !STOP.has(t)))];
  if (!qTokens.length) return [];
  const n = entries.length;
  const df = new Map();
  for (const e of entries) for (const t of e.tf.keys()) df.set(t, (df.get(t) || 0) + 1);
  const scored = [];
  for (const e of entries) {
    if (docIds && docIds.length && !docIds.includes(e.docId)) continue;
    let score = 0;
    for (const t of qTokens) {
      const f = e.tf.get(t) || 0;
      if (!f) continue;
      score += Math.sqrt(f) * (Math.log((n + 1) / (1 + (df.get(t) || 0))) + 1);
    }
    if (score > 0) scored.push({ docId: e.docId, docName: e.docName, snippet: e.text, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

module.exports = { chunkText, buildIndex, retrieve, tokenize };
