const { app, BrowserWindow, dialog, ipcMain, Menu } = require('electron');
const path = require('path');
const { parseFile, DocStore, genId } = require('./src/lib/documents');
const { buildIndex, retrieve } = require('./src/lib/retriever');
const qa = require('./src/lib/qa');

const store = new DocStore();
let index = [];
let win = null;
const activeAsks = new Map();

function rebuildIndex() {
  index = buildIndex(store.list());
}

function send(channel, payload) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
}

function createWindow() {
  win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 980,
    minHeight: 620,
    backgroundColor: '#f5f6f8',
    title: 'Doc Chat',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.loadFile(path.join(__dirname, 'src', 'index.html'));
  win.on('closed', () => {
    win = null;
  });
}

function buildMenu() {
  const template = [
    ...(process.platform === 'darwin' ? [{ role: 'appMenu' }] : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Documents...',
          accelerator: 'CmdOrCtrl+O',
          click: () => send('menu:open'),
        },
        { type: 'separator' },
        process.platform === 'darwin' ? { role: 'close' } : { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [{ role: 'reload' }, { role: 'toggleDevTools' }, { type: 'separator' }, { role: 'togglefullscreen' }],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function addPaths(filePaths) {
  const added = [];
  const failures = [];
  for (const filePath of filePaths) {
    try {
      const doc = await parseFile(filePath);
      store.add(doc);
      added.push({ id: doc.id, name: doc.name });
    } catch (err) {
      failures.push({ name: path.basename(filePath), error: err.message });
    }
  }
  if (added.length) rebuildIndex();
  return { added, failures, docs: store.summaries() };
}

function registerIpc() {
  ipcMain.handle('docs:open', async () => {
    const res = await dialog.showOpenDialog(win, {
      title: 'Open documents',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Documents', extensions: ['txt', 'md', 'markdown', 'json', 'csv', 'tsv', 'log', 'html', 'htm', 'pdf'] },
      ],
    });
    if (res.canceled || !res.filePaths.length) return { added: [], failures: [], docs: store.summaries() };
    return addPaths(res.filePaths);
  });

  ipcMain.handle('docs:openPaths', (_e, paths) => {
    const clean = Array.isArray(paths) ? paths.filter((p) => typeof p === 'string') : [];
    return addPaths(clean);
  });

  ipcMain.handle('docs:addText', (_e, payload) => {
    const text = payload && typeof payload.text === 'string' ? payload.text : '';
    const name =
      payload && typeof payload.name === 'string' && payload.name.trim()
        ? payload.name.trim()
        : 'Pasted note';
    if (!text.trim()) return { doc: null, docs: store.summaries() };
    const doc = {
      id: genId(),
      name,
      path: null,
      ext: '.txt',
      size: Buffer.byteLength(text),
      chars: text.length,
      text,
    };
    store.add(doc);
    rebuildIndex();
    return { doc: { id: doc.id, name: doc.name }, docs: store.summaries() };
  });

  ipcMain.handle('docs:remove', (_e, id) => {
    if (typeof id === 'string') store.remove(id);
    rebuildIndex();
    return { docs: store.summaries() };
  });

  ipcMain.handle('docs:list', () => store.summaries());

  ipcMain.handle('docs:get', (_e, id) => {
    const d = typeof id === 'string' ? store.get(id) : null;
    return d ? { id: d.id, name: d.name, text: d.text } : null;
  });

  ipcMain.handle('qa:status', async () => {
    const probed = await qa.probe();
    return { credentials: qa.hasCredentials(), probed, docs: store.summaries().length };
  });

  ipcMain.handle('qa:ask', async (_e, payload) => {
    const answerId = payload && typeof payload.answerId === 'string' ? payload.answerId : genId();
    const question = payload && typeof payload.question === 'string' ? payload.question.trim() : '';
    if (!question) return { answerId, ok: false, error: 'Empty question' };
    const history = Array.isArray(payload && payload.history)
      ? payload.history.filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      : [];
    const docIds = Array.isArray(payload && payload.docIds) ? payload.docIds.filter((x) => typeof x === 'string') : [];

    const passages = retrieve(question, index, docIds);
    if (!passages.length) {
      return {
        answerId,
        ok: false,
        error: 'No matching passages found in the loaded documents. Try loading more documents or rephrasing the question.',
      };
    }

    const onDelta = (text) => send('qa:delta', { answerId, type: 'text', text });
    let run;
    try {
      run = qa.ask({ question, history, passages, onDelta });
    } catch (err) {
      send('qa:delta', { answerId, type: 'error', reason: qa.classify(err), message: err.message });
      return { answerId, ok: false, reason: qa.classify(err) };
    }
    const { done, abort } = run;
    activeAsks.set(answerId, abort);
    try {
      const res = await done;
      send('qa:delta', {
        answerId,
        type: 'done',
        sources: passages.map((p) => ({
          docId: p.docId,
          docName: p.docName,
          snippet: p.snippet.slice(0, 240),
          score: Math.round(p.score * 100) / 100,
        })),
        model: res.model,
        usage: res.usage,
      });
      return { answerId, ok: true };
    } catch (err) {
      if (qa.classify(err) === 'aborted') {
        send('qa:delta', { answerId, type: 'done', stopped: true });
        return { answerId, ok: true, stopped: true };
      }
      send('qa:delta', { answerId, type: 'error', reason: qa.classify(err), message: err.message });
      return { answerId, ok: false, reason: qa.classify(err) };
    } finally {
      activeAsks.delete(answerId);
    }
  });

  ipcMain.handle('qa:stop', (_e, answerId) => {
    const abort = activeAsks.get(answerId);
    if (abort) abort();
    return true;
  });
}

app.whenReady().then(() => {
  buildMenu();
  registerIpc();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
