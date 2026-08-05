import { useCallback, useEffect, useState } from 'react';
import type {
  Chunk,
  DocumentDetail,
  DocumentMeta,
  IndexStatus,
  QaHistoryEntry,
  QaResult,
} from '../shared/types';
import { DocumentList } from './components/DocumentList';
import { DocumentDetail as DocumentDetailView } from './components/DocumentDetail';
import { ImportPanel } from './components/ImportPanel';
import { QuestionPanel } from './components/QuestionPanel';
import { QaResponse } from './components/QaResponse';
import { StatusBar } from './components/StatusBar';
import { Welcome } from './components/Welcome';

const INITIAL_STATUS: IndexStatus = {
  status: 'idle',
  documentsIndexed: 0,
  totalDocuments: 0,
  lastActivity: null,
};

export function App() {
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DocumentDetail | null>(null);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [status, setStatus] = useState<IndexStatus>(INITIAL_STATUS);
  const [result, setResult] = useState<QaResult | null>(null);
  const [history, setHistory] = useState<QaHistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadDocuments = useCallback(async () => {
    setDocuments(await window.knowledgeBase.documents.list());
  }, []);

  const loadStatus = useCallback(async () => {
    setStatus(await window.knowledgeBase.indexing.status());
  }, []);

  const loadHistory = useCallback(async () => {
    setHistory(await window.knowledgeBase.qa.history());
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    const [doc, docChunks] = await Promise.all([
      window.knowledgeBase.documents.get(id),
      window.knowledgeBase.indexing.chunks(id),
    ]);
    setDetail(doc);
    setChunks(docChunks);
  }, []);

  const refresh = useCallback(async () => {
    setError(null);
    await Promise.all([loadDocuments(), loadStatus(), loadHistory()]);
    if (selectedId) {
      await loadDetail(selectedId);
    }
  }, [loadDocuments, loadStatus, loadHistory, loadDetail, selectedId]);

  useEffect(() => {
    void (async () => {
      try {
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    })();
  }, [refresh]);

  useEffect(() => {
    if (documents.length === 0 || status.documentsIndexed >= status.totalDocuments) {
      return;
    }
    void (async () => {
      try {
        await window.knowledgeBase.indexing.start();
        setStatus(await window.knowledgeBase.indexing.status());
        if (selectedId) {
          await loadDetail(selectedId);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    })();
  }, [documents.length, status.documentsIndexed, status.totalDocuments, selectedId, loadDetail]);

  const handleImport = async () => {
    setBusy(true);
    setError(null);
    try {
      const imported = await window.knowledgeBase.documents.import();
      if (imported) {
        await window.knowledgeBase.indexing.start(imported.document.id);
        await loadDocuments();
        await loadStatus();
        setSelectedId(imported.document.id);
        await loadDetail(imported.document.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const handleSelect = async (id: string) => {
    setSelectedId(id);
    try {
      await loadDetail(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await window.knowledgeBase.documents.delete(id);
      await Promise.all([loadDocuments(), loadStatus()]);
      if (selectedId === id) {
        setSelectedId(null);
        setDetail(null);
        setChunks([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleAsk = async (question: string) => {
    setBusy(true);
    setError(null);
    try {
      const answer = await window.knowledgeBase.qa.ask(question);
      setResult(answer);
      setHistory(await window.knowledgeBase.qa.history());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Knowledge Base</h1>
        <button className="btn" onClick={() => void refresh().catch(() => undefined)} disabled={busy}>
          Refresh
        </button>
      </header>
      {error && <div className="error-banner">{error}</div>}
      <div className="app-body">
        <aside className="sidebar">
          <ImportPanel onImport={() => void handleImport()} busy={busy} />
          <DocumentList
            documents={documents}
            selectedId={selectedId}
            onSelect={(id) => void handleSelect(id)}
            onDelete={(id) => void handleDelete(id)}
          />
        </aside>
        <main className="main">
          {selectedId && detail ? (
            <DocumentDetailView detail={detail} chunks={chunks} />
          ) : (
            <Welcome />
          )}
          <QaResponse result={result} history={history} />
        </main>
      </div>
      <QuestionPanel onAsk={(q) => void handleAsk(q)} busy={busy} />
      <StatusBar status={status} documentCount={documents.length} />
    </div>
  );
}
