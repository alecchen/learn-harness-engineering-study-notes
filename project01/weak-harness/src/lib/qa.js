const Anthropic = require('@anthropic-ai/sdk');

const MODEL = 'claude-opus-5';

const SYSTEM = [
  'You are a careful reading assistant. You answer questions strictly from the passages supplied in the user message.',
  '',
  'Rules:',
  '- Base every answer on the supplied passages. Do not rely on outside knowledge for facts about the documents.',
  '- When you use a passage, cite its source by name, like (report.pdf).',
  '- If the passages do not contain the answer, say so plainly instead of guessing.',
  '- Answer in the language the question is asked in. Be concise but complete.',
].join('\n');

function hasCredentials() {
  return Boolean(
    process.env.ANTHROPIC_API_KEY ||
      process.env.ANTHROPIC_AUTH_TOKEN ||
      process.env.ANTHROPIC_PROFILE
  );
}

let client;
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

function classify(err) {
  if (err && err.status) {
    if (err.status === 401) return 'authentication';
    if (err.status === 403) return 'permission';
    if (err.status === 404) return 'not-found';
    if (err.status === 429) return 'rate-limited';
    return `api-${err.status}`;
  }
  if (err && err.name === 'APIConnectionError') return 'connection';
  if (err && (err.name === 'APIUserAbortError' || err.name === 'AbortError')) return 'aborted';
  return 'unknown';
}

let probeCache = null;
let probeAt = 0;

async function probe() {
  if (probeCache && Date.now() - probeAt < 30000) return probeCache;
  try {
    await getClient().messages.create(
      { model: MODEL, max_tokens: 8, messages: [{ role: 'user', content: 'ping' }] },
      { timeout: 8000, maxRetries: 0 }
    );
    probeCache = { ok: true };
  } catch (err) {
    probeCache = { ok: false, reason: classify(err) };
  }
  probeAt = Date.now();
  return probeCache;
}

function buildMessages(question, history, passages) {
  const messages = [];
  for (const m of history.slice(-20)) {
    messages.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content) });
  }
  const context = passages
    .map((p, i) => `[${i + 1}] (source: ${p.docName})\n${p.snippet}`)
    .join('\n\n');
  const userContent = `The user's documents contain these passages. Answer the question using them.\n\n${context}\n\nQuestion: ${question}`;
  messages.push({ role: 'user', content: userContent });
  return messages;
}

function ask({ question, history, passages, onDelta }) {
  const messages = buildMessages(question, history, passages);
  const controller = new AbortController();
  const done = (async () => {
    const stream = await getClient().messages.create(
      {
        model: MODEL,
        max_tokens: 8192,
        system: SYSTEM,
        messages,
        stream: true,
      },
      { signal: controller.signal }
    );
    let text = '';
    let model = MODEL;
    let usage = null;
    for await (const event of stream) {
      if (event.type === 'message_start' && event.message && event.message.model) {
        model = event.message.model;
      }
      if (event.type === 'content_block_delta' && event.delta && event.delta.type === 'text_delta') {
        text += event.delta.text;
        onDelta(event.delta.text);
      }
      if (event.type === 'message_delta' && event.usage) {
        usage = event.usage;
      }
    }
    return {
      text,
      model,
      usage: {
        input: usage ? usage.input_tokens : 0,
        output: usage ? usage.output_tokens : 0,
      },
    };
  })();
  return { done, abort: () => controller.abort() };
}

module.exports = { MODEL, hasCredentials, classify, probe, ask, buildMessages };
