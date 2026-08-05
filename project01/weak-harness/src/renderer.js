/* global harness */
const $ = (id) => document.getElementById(id);

const els = {
  status: $('status'),
  docCount: $('doc-count'),
  docList: $('doc-list'),
  preview: $('preview'),
  previewMeta: $('preview-meta'),
  previewEmpty: $('preview-empty'),
  chat: $('chat'),
  chatForm: $('chat-form'),
  chatInput: $('chat-input'),
  chatHint: $('chat-hint'),
  scopeSelect: $('chat-scope'),
  btnOpen: $('btn-open'),
  btnPaste: $('btn-paste'),
  btnSend: $('btn-send'),
  btnStop: $('btn-stop'),
  dropOverlay: $('drop-overlay'),
  modal: $('modal'),
  pasteName: $('paste-name'),
  pasteText: $('paste-text'),
  modalCancel: $('modal-cancel'),
  modalAdd: $('modal-add'),
};

/* ---------- markdown rendering ---------- */

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeUrl(raw) {
  const url = raw.trim();
  return /^(https?|mailto):/i.test(url) ? url : null;
}

function inline(text) {
  let s = text;
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
  s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => {
    const u = safeUrl(url);
    return u ? `<a href="${escapeHtml(u)}">${alt || 'link'}</a>` : escapeHtml(alt || url);
  });
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
    const u = safeUrl(url);
    return u ? `<a href="${escapeHtml(u)}">${label}</a>` : label;
  });
  return s;
}

function mdToHtml(md) {
  const lines = escapeHtml(md).split('\n');
  const out = [];
  let inCode = false;
  let codeBuf = [];
  let listType = null;

  const flushList = () => {
    if (listType) {
      out.push(`</${listType}>`);
      listType = null;
    }
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trim = line.trim();

    if (trim.startsWith('```')) {
      if (inCode) {
        out.push(`<pre><code>${codeBuf.join('\n')}</code></pre>`);
        codeBuf = [];
        inCode = false;
      } else {
        flushList();
        inCode = true;
      }
      i++;
      continue;
    }
    if (inCode) {
      codeBuf.push(line);
      i++;
      continue;
    }
    if (trim === '') {
      out.push('');
      i++;
      continue;
    }

    const heading = trim.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushList();
      out.push(`<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`);
      i++;
      continue;
    }
    if (/^---+\s*$/.test(trim)) {
      flushList();
      out.push('<hr>');
      i++;
      continue;
    }
    if (trim.startsWith('&gt;')) {
      flushList();
      out.push(`<blockquote>${inline(trim.replace(/^&gt;\s?/, ''))}</blockquote>`);
      i++;
      continue;
    }
    const ul = trim.match(/^[-*+]\s+(.*)$/);
    if (ul) {
      if (listType !== 'ul') {
        flushList();
        out.push('<ul>');
        listType = 'ul';
      }
      out.push(`<li>${inline(ul[1])}</li>`);
      i++;
      continue;
    }
    const ol = trim.match(/^\d+\.\s+(.*)$/);
    if (ol) {
      if (listType !== 'ol') {
        flushList();
        out.push('<ol>');
        listType = 'ol';
      }
      out.push(`<li>${inline(ol[1])}</li>`);
      i++;
      continue;
    }
    if (/^\|.*\|$/.test(trim) && i + 1 < lines.length && /^\|[\s:|-]+\|$/.test(lines[i + 1].trim())) {
      flushList();
      const header = trim
        .slice(1, -1)
        .split('|')
        .map((c) => inline(c.trim()));
      out.push('<table><thead><tr>' + header.map((c) => `<th>${c}</th>`).join('') + '</tr></thead><tbody>');
      i += 2;
      while (i < lines.length && /^\|.*\|$/.test(lines[i].trim())) {
        const cells = lines[i]
          .trim()
          .slice(1, -1)
          .split('|')
          .map((c) => inline(c.trim()));
        out.push('<tr>' + cells.map((c) => `<td>${c}</td>`).join('') + '</tr>');
        i++;
      }
      out.push('</tbody></table>');
      continue;
    }

    flushList();
    out.push(`<p>${inline(line)}</p>`);
    i++;
  }
  if (inCode) out.push(`<pre><code>${codeBuf.join('\n')}</code></pre>`);
  flushList();
  return out.join('\n');
}

/* ---------- state ---------- */

const state = {
  docs: [],
  selectedId: null,
  conversation: [],
  busy: false,
  currentAnswerId: null,
};

const holders = new Map();

function fmtBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function extLabel(doc) {
  return (doc.ext || '').replace('.', '').toUpperCase() || 'TXT';
}

/* ---------- documents ---------- */

function renderDocList() {
  els.docList.innerHTML = '';
  els.docCount.textContent = state.docs.length ? `(${state.docs.length})` : '';
  for (const doc of state.docs) {
    const item = document.createElement('div');
    item.className = 'doc-item' + (doc.id === state.selectedId ? ' active' : '');
    item.innerHTML = `
      <span class="doc-icon">${escapeHtml(extLabel(doc))}</span>
      <span class="doc-name" title="${escapeHtml(doc.name)}">${escapeHtml(doc.name)}</span>
      <span class="doc-meta">${fmtBytes(doc.size)}</span>
      <button class="doc-remove" title="Remove">×</button>`;
    item.addEventListener('click', () => selectDoc(doc.id));
    item.querySelector('.doc-remove').addEventListener('click', (e) => {
      e.stopPropagation();
      removeDoc(doc.id);
    });
    els.docList.appendChild(item);
  }
  updateScopeSelect();
  updateChatHint();
}

function updateScopeSelect() {
  const prev = els.scopeSelect.value;
  els.scopeSelect.innerHTML = '';
  const all = document.createElement('option');
  all.value = '';
  all.textContent = 'All documents';
  els.scopeSelect.appendChild(all);
  for (const doc of state.docs) {
    const opt = document.createElement('option');
    opt.value = doc.id;
    opt.textContent = doc.name;
    els.scopeSelect.appendChild(opt);
  }
  els.scopeSelect.value = state.docs.some((d) => d.id === prev) ? prev : '';
}

function updateChatHint() {
  const scope = els.scopeSelect.value;
  if (scope) {
    const doc = state.docs.find((d) => d.id === scope);
    els.chatHint.textContent = doc ? `Searching: ${doc.name}` : '';
  } else if (state.docs.length) {
    els.chatHint.textContent = `Searching all ${state.docs.length} documents`;
  } else {
    els.chatHint.textContent = 'Open or paste a document first.';
  }
}

async function selectDoc(id) {
  state.selectedId = id;
  renderDocList();
  const doc = await harness.getDoc(id);
  if (!doc || id !== state.selectedId) return;
  els.previewEmpty.classList.add('hidden');
  els.previewMeta.classList.remove('hidden');
  els.previewMeta.innerHTML = `<span>${escapeHtml(doc.name)}</span><span class="ext">${doc.chars.toLocaleString()} chars</span>`;
  els.preview.innerHTML = mdToHtml(doc.text);
  els.preview.scrollTop = 0;
}

async function removeDoc(id) {
  const res = await harness.removeDoc(id);
  setDocs(res.docs);
}

function setDocs(docs) {
  state.docs = docs || [];
  if (state.selectedId && !state.docs.some((d) => d.id === state.selectedId)) {
    state.selectedId = null;
    els.preview.innerHTML = '';
    els.previewMeta.classList.add('hidden');
    els.previewEmpty.classList.remove('hidden');
  }
  renderDocList();
}

function flashFailures(failures) {
  if (!failures || !failures.length) return;
  els.status.textContent = `${failures.length} failed`;
  els.status.title = failures.map((f) => `${f.name}: ${f.error}`).join('\n');
}

/* ---------- chat ---------- */

function scrollChat() {
  els.chat.scrollTop = els.chat.scrollHeight;
}

function createAssistantBubble(answerId) {
  const msg = document.createElement('div');
  msg.className = 'msg assistant';
  msg.dataset.answerId = answerId;
  const bubble = document.createElement('div');
  bubble.className = 'bubble streaming';
  bubble.textContent = 'Thinking...';
  msg.appendChild(bubble);
  els.chat.appendChild(msg);

  const holder = {
    raw: '',
    finished: false,
    append(text) {
      if (this.raw === '') bubble.textContent = '';
      this.raw += text;
      bubble.textContent = this.raw;
      scrollChat();
    },
    finish(delta) {
      if (this.finished) return;
      this.finished = true;
      bubble.classList.remove('streaming');
      if (delta.stopped) {
        bubble.className = 'bubble notice';
        bubble.textContent = 'Stopped.';
        return;
      }
      bubble.innerHTML = this.raw ? mdToHtml(this.raw) : '<span class="notice">(no text)</span>';
      if (delta.model || (delta.usage && delta.usage.input != null)) {
        const meta = document.createElement('div');
        meta.className = 'msg-meta';
        let text = delta.model || '';
        if (delta.usage && delta.usage.input != null) {
          text += (text ? ' · ' : '') + `${delta.usage.input.toLocaleString()} in / ${delta.usage.output.toLocaleString()} out`;
        }
        meta.textContent = text;
        msg.appendChild(meta);
      }
      if (delta.sources && delta.sources.length) {
        const wrap = document.createElement('div');
        wrap.className = 'sources';
        for (const s of delta.sources) {
          const chip = document.createElement('button');
          chip.className = 'source-chip';
          chip.textContent = s.docName;
          chip.title = s.snippet;
          chip.addEventListener('click', () => selectDoc(s.docId));
          wrap.appendChild(chip);
        }
        msg.appendChild(wrap);
      }
      scrollChat();
    },
    setError(message) {
      if (this.finished) return;
      this.finished = true;
      bubble.classList.remove('streaming');
      bubble.classList.add('error');
      bubble.textContent = message || 'Something went wrong.';
      scrollChat();
    },
  };

  holders.set(answerId, holder);
  return holder;
}

function appendUserMessage(text) {
  const msg = document.createElement('div');
  msg.className = 'msg user';
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text;
  msg.appendChild(bubble);
  els.chat.appendChild(msg);
  scrollChat();
}

function setBusy(busy, answerId) {
  state.busy = busy;
  state.currentAnswerId = answerId || null;
  els.btnSend.disabled = busy;
  els.chatInput.disabled = busy;
  els.btnStop.classList.toggle('hidden', !busy);
  if (!busy) els.chatInput.focus();
}

async function ask() {
  const question = els.chatInput.value.trim();
  if (!question || state.busy) return;
  const answerId = 'a' + Math.random().toString(36).slice(2, 10);
  const history = state.conversation.slice(-12).map((m) => ({ role: m.role, content: m.content }));
  const docIds = els.scopeSelect.value ? [els.scopeSelect.value] : [];

  appendUserMessage(question);
  els.chatInput.value = '';
  const holder = createAssistantBubble(answerId);
  setBusy(true, answerId);

  const res = await harness.ask({ question, history, docIds, answerId });
  if (!res.ok && !holder.finished) holder.setError(res.error || 'Failed to get an answer.');
}

function handleDelta(d) {
  if (!d || !d.answerId) return;
  const holder = holders.get(d.answerId);
  if (!holder) return;
  if (d.type === 'text') {
    holder.append(d.text);
  } else if (d.type === 'done') {
    holder.finish(d);
    if (!d.stopped) {
      state.conversation.push({ role: 'assistant', content: holder.raw });
      if (state.conversation.length > 40) state.conversation.splice(0, state.conversation.length - 40);
    }
    holders.delete(d.answerId);
    setBusy(false);
  } else if (d.type === 'error') {
    holder.setError(d.message);
    holders.delete(d.answerId);
    setBusy(false);
  }
}

/* ---------- status ---------- */

async function refreshStatus() {
  const s = await harness.getStatus();
  els.status.classList.remove('ok', 'warn');
  if (s.probed && s.probed.ok) {
    els.status.classList.add('ok');
    els.status.textContent = 'LLM ready';
    els.status.title = 'The answer engine is reachable.';
  } else {
    els.status.classList.add('warn');
    els.status.textContent = 'LLM not configured';
    els.status.title = 'Set ANTHROPIC_API_KEY (or run `ant auth login`) so the app can answer questions.';
  }
  updateChatHint();
}

/* ---------- wiring ---------- */

async function openDialog() {
  const res = await harness.openDialog();
  setDocs(res.docs);
  flashFailures(res.failures);
  if (res.added && res.added.length) refreshStatus();
}

async function openPaths(paths) {
  if (!paths.length) return;
  const res = await harness.openPaths(paths);
  setDocs(res.docs);
  flashFailures(res.failures);
  if (res.added && res.added.length) refreshStatus();
}

function showModal() {
  els.modal.classList.remove('hidden');
  els.pasteText.value = '';
  els.pasteName.value = '';
  els.pasteText.focus();
}

function hideModal() {
  els.modal.classList.add('hidden');
}

async function addPasted() {
  const name = els.pasteName.value.trim();
  const text = els.pasteText.value;
  if (!text.trim()) return;
  const res = await harness.addText({ name, text });
  if (res.doc) {
    setDocs(res.docs);
    hideModal();
    selectDoc(res.doc.id);
    refreshStatus();
  }
}

function init() {
  els.btnOpen.addEventListener('click', openDialog);
  els.btnPaste.addEventListener('click', showModal);
  els.modalCancel.addEventListener('click', hideModal);
  els.modalAdd.addEventListener('click', addPasted);
  els.chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    ask();
  });
  els.chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      ask();
    }
  });
  els.btnStop.addEventListener('click', () => {
    if (state.currentAnswerId) harness.stop(state.currentAnswerId);
  });
  els.scopeSelect.addEventListener('change', updateChatHint);
  els.modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideModal();
  });

  harness.onDelta(handleDelta);
  harness.onMenuOpen(openDialog);

  let dragDepth = 0;
  window.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragDepth++;
    els.dropOverlay.classList.remove('hidden');
  });
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('dragleave', () => {
    dragDepth--;
    if (dragDepth <= 0) els.dropOverlay.classList.add('hidden');
  });
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    dragDepth = 0;
    els.dropOverlay.classList.add('hidden');
    const paths = [...e.dataTransfer.files].map((f) => harness.getPathForFile(f)).filter(Boolean);
    openPaths(paths);
  });

  setDocs([]);
  refreshStatus();
}

document.addEventListener('DOMContentLoaded', init);
